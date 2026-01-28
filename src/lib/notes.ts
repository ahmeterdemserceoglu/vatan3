import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    runTransaction,
    getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Note, NOTE_COLORS } from '@/types';

export async function createNote(
    boardId: string,
    sectionId: string,
    authorId: string,
    authorName: string,
    authorPhotoURL: string | null | undefined,
    content: string,
    type: 'text' | 'image' | 'link' | 'file' | 'poll' | 'audio' | 'video' = 'text',
    options: Partial<Note> = {}
): Promise<string> {
    const noteData = {
        boardId,
        sectionId,
        authorId,
        authorName,
        authorPhotoURL: authorPhotoURL || '',
        content,
        type,
        imageUrl: options.imageUrl || '',
        linkUrl: options.linkUrl || '',
        linkTitle: options.linkTitle || '',
        linkDescription: options.linkDescription || '', // New
        linkDomain: options.linkDomain || '',           // New
        fileUrl: options.fileUrl || '',
        fileName: options.fileName || '',
        fileType: options.fileType || '',
        files: options.files || [], // Çoklu dosya desteği
        audioUrl: options.audioUrl || '',
        audioDuration: options.audioDuration || 0,
        // Video support
        videoUrl: options.videoUrl || '',
        videoDuration: options.videoDuration || 0,
        videoThumbnail: options.videoThumbnail || '',
        isPinned: options.isPinned || false,
        pollOptions: options.pollOptions || [],
        pollVotes: {}, // Initialize empty map
        reactions: {},
        color: options.color || NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        positionX: options.positionX ?? Math.random() * 500,
        positionY: options.positionY ?? Math.random() * 300,
        width: options.width || 250,
        height: options.height || 200,
        commentCount: 0,
        likes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'notes'), noteData);
    return docRef.id;
}

export async function updateNote(noteId: string, updates: Partial<Note>): Promise<void> {
    await updateDoc(doc(db, 'notes', noteId), {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteNote(noteId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    await updateDoc(doc(db, 'notes', noteId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        expiresAt: expiresAt,
        updatedAt: serverTimestamp(),
    });
}

export async function permanentlyDeleteNote(noteId: string): Promise<void> {
    // First, get the note to find attached files
    const noteRef = doc(db, 'notes', noteId);
    const noteDoc = await getDoc(noteRef);

    if (noteDoc.exists()) {
        const noteData = noteDoc.data() as Note;

        // Import storage delete function
        const { deleteFileFromStorage } = await import('./supabase');

        // Delete attached files from storage
        const filesToDelete = [
            noteData.imageUrl,
            noteData.fileUrl,
            noteData.audioUrl,
            // Çoklu dosyalar
            ...(noteData.files?.map(f => f.url) || []),
        ].filter(Boolean);

        // Delete each file
        for (const url of filesToDelete) {
            if (url) {
                deleteFileFromStorage(url).catch(err =>
                    console.error('File deletion failed:', err)
                );
            }
        }
    }

    // Delete the note document
    await deleteDoc(noteRef);
}

export async function restoreNote(noteId: string): Promise<void> {
    await updateDoc(doc(db, 'notes', noteId), {
        isDeleted: false,
        deletedAt: null,
        expiresAt: null,
        updatedAt: serverTimestamp(),
    });
}

// Toplu not silme fonksiyonu - Soft Delete
export async function deleteMultipleNotes(noteIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    for (const noteId of noteIds) {
        try {
            await updateDoc(doc(db, 'notes', noteId), {
                isDeleted: true,
                deletedAt: serverTimestamp(),
                expiresAt: expiresAt,
                updatedAt: serverTimestamp(),
            });
            success++;
        } catch (error) {
            console.error(`Failed to soft delete note ${noteId}:`, error);
            failed++;
        }
    }

    return { success, failed };
}

export async function likeNote(
    noteId: string,
    userId: string,
    userName: string,
    noteAuthorId: string,
    boardId: string,
    boardTitle?: string
): Promise<void> {
    await updateDoc(doc(db, 'notes', noteId), {
        likes: arrayUnion(userId),
    });

    // Send notification to note author (if not self and authorId is valid)
    if (noteAuthorId && noteAuthorId.trim() !== '' && noteAuthorId !== userId) {
        try {
            const { createNotification } = await import('./notifications');
            await createNotification({
                userId: noteAuthorId,
                type: 'like',
                title: 'Notun beğenildi',
                message: `${userName} notunu beğendi`,
                fromUserId: userId,
                fromUserName: userName,
                boardId,
                boardTitle,
                noteId,
            });
        } catch (error) {
            console.error('Like notification error:', error);
        }
    }
}

export async function unlikeNote(noteId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'notes', noteId), {
        likes: arrayRemove(userId),
    });
}

// POLL VOTING
export async function votePoll(noteId: string, optionIndex: number, userId: string): Promise<void> {
    const noteRef = doc(db, 'notes', noteId);

    await runTransaction(db, async (transaction) => {
        const noteDoc = await transaction.get(noteRef);
        if (!noteDoc.exists()) throw "Note does not exist!";

        const data = noteDoc.data() as Note;
        const currentVotes = data.pollVotes || {};

        // Remove user from all other options
        Object.keys(currentVotes).forEach(key => {
            const idx = Number(key);
            if (currentVotes[idx]?.includes(userId)) {
                currentVotes[idx] = currentVotes[idx].filter(uid => uid !== userId);
            }
        });

        // Add user to selected option
        if (!currentVotes[optionIndex]) currentVotes[optionIndex] = [];
        if (!currentVotes[optionIndex].includes(userId)) {
            currentVotes[optionIndex].push(userId);
        } else {
            // Toggle off if already voted same? No, usually poll UI allows switching, 
            // but clicking same again usually does nothing or unchecks.
            // Let's assume re-clicking unchecks for now to allow "unvote".
            currentVotes[optionIndex] = currentVotes[optionIndex].filter(uid => uid !== userId);
        }

        transaction.update(noteRef, { pollVotes: currentVotes });
    });
}

// REACTION TOGGLING
export async function toggleReaction(
    noteId: string,
    emoji: string,
    userId: string,
    userName: string,
    noteAuthorId: string,
    boardId: string,
    boardTitle?: string
): Promise<void> {
    const noteRef = doc(db, 'notes', noteId);
    let didAddReaction = false;

    await runTransaction(db, async (transaction) => {
        const noteDoc = await transaction.get(noteRef);
        if (!noteDoc.exists()) throw "Note does not exist!";

        const data = noteDoc.data() as Note;
        const currentReactions = data.reactions || {};

        let usersWhoReacted = currentReactions[emoji] || [];

        if (usersWhoReacted.includes(userId)) {
            // Remove reaction
            usersWhoReacted = usersWhoReacted.filter(uid => uid !== userId);
        } else {
            // Add reaction
            usersWhoReacted.push(userId);
            didAddReaction = true;
        }

        // Clean up empty arrays to keep DB clean (optional but good)
        if (usersWhoReacted.length === 0) {
            delete currentReactions[emoji];
        } else {
            currentReactions[emoji] = usersWhoReacted;
        }

        transaction.update(noteRef, { reactions: currentReactions });
    });

    // Send notification if we added a reaction (not removed), author is valid, and not self
    if (didAddReaction && noteAuthorId && noteAuthorId.trim() !== '' && noteAuthorId !== userId) {
        try {
            const { createNotification } = await import('./notifications');
            await createNotification({
                userId: noteAuthorId,
                type: 'reaction',
                title: 'Notuna tepki geldi',
                message: `${userName} notuna ${emoji} tepkisi bıraktı`,
                fromUserId: userId,
                fromUserName: userName,
                boardId,
                boardTitle,
                noteId,
            });
        } catch (error) {
            console.error('Reaction notification error:', error);
        }
    }
}

export async function togglePin(noteId: string, isPinned: boolean): Promise<void> {
    await updateDoc(doc(db, 'notes', noteId), {
        isPinned,
        updatedAt: serverTimestamp(),
    });
}

export async function toggleLockComments(noteId: string, isLocked: boolean): Promise<void> {
    await updateDoc(doc(db, 'notes', noteId), {
        isLocked,
        updatedAt: serverTimestamp(),
    });
}

// Notify all board members when a teacher posts
export async function notifyTeacherPost(
    noteId: string,
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
                type: 'teacher_post',
                title: 'Öğretmeniniz post paylaştı',
                message: `${teacherName} yeni bir post paylaştı `,
                fromUserId: teacherId,
                fromUserName: teacherName,
                boardId,
                boardTitle,
                noteId,
            });
        }
    } catch (error) {
        console.error('Teacher post notification error:', error);
    }
}
