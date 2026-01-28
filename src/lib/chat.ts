import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    limit,
    deleteDoc,
    doc,
    setDoc,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Message } from '@/types';

// Maximum messages to load initially
const MESSAGE_LIMIT = 50;

export async function sendMessage(
    boardId: string,
    senderId: string,
    senderName: string,
    senderPhoto: string | null | undefined,
    content: string,
    replyTo?: {
        replyToId: string;
        replyToAuthor: string;
        replyToContent: string;
    }
) {
    const messageData = {
        boardId,
        senderId,
        senderName,
        senderPhoto: senderPhoto || null,
        content,
        type: 'text' as const,
        createdAt: serverTimestamp(),
        ...(replyTo && {
            replyToId: replyTo.replyToId,
            replyToAuthor: replyTo.replyToAuthor,
            replyToContent: replyTo.replyToContent,
        }),
    };
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    return docRef.id;
}

// Send audio message
export async function sendAudioMessage(
    boardId: string,
    senderId: string,
    senderName: string,
    senderPhoto: string | null | undefined,
    audioUrl: string,
    audioDuration: number
) {
    const messageData = {
        boardId,
        senderId,
        senderName,
        senderPhoto: senderPhoto || null,
        content: '🎤 Ses mesajı',
        type: 'audio' as const,
        audioUrl,
        audioDuration,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    return docRef.id;
}

// Send image or video message
export async function sendMediaMessage(
    boardId: string,
    senderId: string,
    senderName: string,
    senderPhoto: string | null | undefined,
    type: 'image' | 'video',
    mediaUrl: string,
    content: string = ''
) {
    const messageData = {
        boardId,
        senderId,
        senderName,
        senderPhoto: senderPhoto || null,
        content: content,
        type: type,
        [type === 'image' ? 'imageUrl' : 'videoUrl']: mediaUrl,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    return docRef.id;
}

// Send generic file message (PDF, Doc, etc.)
export async function sendFileMessage(
    boardId: string,
    senderId: string,
    senderName: string,
    senderPhoto: string | null | undefined,
    fileUrl: string,
    fileName: string,
    fileType?: string
) {
    const messageData = {
        boardId,
        senderId,
        senderName,
        senderPhoto: senderPhoto || null,
        content: `📄 ${fileName}`,
        type: 'file' as const,
        fileUrl,
        fileName,
        fileType,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    return docRef.id;
}

export function subscribeToBoardMessages(boardId: string, callback: (messages: Message[]) => void) {
    const q = query(
        collection(db, 'messages'),
        where('boardId', '==', boardId),
        orderBy('createdAt', 'asc'),
        // limit(MESSAGE_LIMIT) // Optional: limit history for performance
    );

    return onSnapshot(q, (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as Message);
        });
        callback(messages);
    });
}

export async function deleteMessage(messageId: string) {
    await deleteDoc(doc(db, 'messages', messageId));
}

// Notify all board members when a teacher sends a chat message
export async function notifyTeacherMessage(
    messageId: string,
    boardId: string,
    boardTitle: string,
    teacherId: string,
    teacherName: string,
    members: string[] // Array of member user IDs
): Promise<void> {
    try {
        const { createNotification } = await import('./notifications');

        // Send notification to each member (except the teacher)
        for (const memberId of members) {
            if (memberId === teacherId) continue;

            await createNotification({
                userId: memberId,
                type: 'teacher_message',
                title: 'Öğretmeniniz mesaj yazdı',
                message: `${teacherName} sohbete mesaj gönderdi 💬`,
                fromUserId: teacherId,
                fromUserName: teacherName,
                boardId,
                boardTitle,
                messageId,
            });
        }
    } catch (error) {
        console.error('Teacher message notification error:', error);
    }
}
// Set typing status (debounced on client side)
export async function setTypingStatus(
    boardId: string,
    userId: string,
    userName: string,
    isTyping: boolean
) {
    // We use a composite key for the document to easily update/delete
    const docId = `${boardId}_${userId}`;
    const docRef = doc(db, 'typing', docId);

    if (isTyping) {
        await setDoc(docRef, {
            boardId,
            userId,
            userName,
            timestamp: serverTimestamp(),
        });
    } else {
        await deleteDoc(docRef);
    }
}

// Subscribe to active typers
export function subscribeToTypingStatus(boardId: string, callback: (typers: string[]) => void) {
    // Query typing indicators for this board
    // We can't filter by time easily without composite index challenges in generic setups,
    // so we'll filter on client side or just show all who have a recent timestamp.
    // However, since we delete the doc on stop, existence is enough + client side timeout check.
    const q = query(
        collection(db, 'typing'),
        where('boardId', '==', boardId)
    );

    return onSnapshot(q, (snapshot) => {
        const typers: string[] = [];
        const now = Date.now();
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Check if timestamp is valid and recent (e.g. within last 10 seconds)
            // FireStore timestamp to millis
            const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : 0;
            if (now - timestamp < 10000) {
                typers.push(data.userName);
            }
        });
        callback(typers);
    });
}

// --- MESSAGE PINNING ---

export async function pinMessage(messageId: string, pinnedBy: string) {
    const { updateDoc, serverTimestamp } = await import('firebase/firestore');
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
        isPinned: true,
        pinnedBy,
        pinnedAt: serverTimestamp()
    });
}

export async function unpinMessage(messageId: string) {
    const { updateDoc, deleteField } = await import('firebase/firestore');
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
        isPinned: false,
        pinnedBy: deleteField(),
        pinnedAt: deleteField()
    });
}

// --- MESSAGE EDITING ---

export async function updateMessage(messageId: string, newContent: string) {
    const { updateDoc, serverTimestamp } = await import('firebase/firestore');
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
        content: newContent,
        isEdited: true,
        editedAt: serverTimestamp()
    });
}

// --- CLEAR ALL MESSAGES ---

export async function clearAllMessages(boardId: string): Promise<{ deleted: number }> {
    // Get all messages for this board
    const q = query(
        collection(db, 'messages'),
        where('boardId', '==', boardId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { deleted: 0 };
    }

    // Use batch delete for better performance (max 500 per batch)
    const batchSize = 500;
    let deleted = 0;

    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + batchSize);

        chunk.forEach(docSnapshot => {
            batch.delete(docSnapshot.ref);
        });

        await batch.commit();
        deleted += chunk.length;
    }

    return { deleted };
}

