import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Notification } from '@/types';

// Create a notification
export async function createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
    // Don't notify yourself
    if (data.userId === data.fromUserId) return '';

    // Remove undefined values (Firebase doesn't accept undefined)
    const cleanData: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
            cleanData[key] = value;
        }
    });

    const notificationData = {
        ...cleanData,
        isRead: false,
        createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);

    // Send push notification via API (fire and forget - don't await)
    sendPushNotification({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        boardId: data.boardId,
        noteId: data.noteId,
        commentId: data.commentId,
        messageId: data.messageId,
        fromUserName: data.fromUserName,
        notificationId: docRef.id,
    }).catch(err => console.error('[Push] Failed to send push notification:', err));

    return docRef.id;
}

// Send push notification via API route
async function sendPushNotification(data: {
    userId: string;
    type: string;
    title?: string;
    message?: string;
    boardId?: string;
    noteId?: string;
    commentId?: string;
    messageId?: string;
    fromUserName?: string;
    notificationId: string;
}): Promise<void> {
    // Only run on client side
    if (typeof window === 'undefined') {
        console.log('[Push] Skipping push notification on server side');
        return;
    }

    try {
        const token = await auth.currentUser?.getIdToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/send-push`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[Push] API error:', errorData);
        }
    } catch (error) {
    }
}



// Subscribe to user's notifications
export function subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
) {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Notification[];
        callback(notifications);
    }, (error) => {
        console.warn('Notifications subscription error:', error.message);
        callback([]);
    });
}

// Mark notification as read
export async function markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
    });
}

// Mark all notifications as read
export async function markAllAsRead(userId: string): Promise<void> {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { isRead: true });
    });

    await batch.commit();
}

// Delete a notification
export async function deleteNotification(notificationId: string): Promise<void> {
    await deleteDoc(doc(db, 'notifications', notificationId));
}

// Get unread count
export function subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
) {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.size);
    }, (error) => {
        console.warn('Unread count subscription error:', error.message);
        callback(0);
    });
}

// Helper: Parse @mentions from text
export function parseMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
    }
    return mentions;
}

// Helper: Create mention notifications
export async function createMentionNotifications(
    text: string,
    members: { uid: string; displayName: string; role?: string }[],
    fromUserId: string,
    fromUserName: string,
    boardId: string,
    boardTitle: string,
    noteId?: string,
    commentId?: string,
    messageId?: string
): Promise<void> {
    const textLower = text.toLowerCase();
    const notifiedUserIds = new Set<string>();

    // 1. Group Mentions
    if (textLower.includes('@everyone')) {
        for (const member of members) {
            if (member.uid !== fromUserId && !notifiedUserIds.has(member.uid)) {
                await createNotification({
                    userId: member.uid,
                    type: 'mention',
                    title: '@everyone ile etiketlendiniz',
                    message: `${fromUserName}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
                    fromUserId,
                    fromUserName,
                    boardId,
                    boardTitle,
                    noteId,
                    commentId,
                    messageId,
                });
                notifiedUserIds.add(member.uid);
            }
        }
    }

    if (textLower.includes('@teacher')) {
        for (const member of members) {
            if (member.uid !== fromUserId &&
                (member.role === 'teacher' || member.role === 'admin') &&
                !notifiedUserIds.has(member.uid)) {
                await createNotification({
                    userId: member.uid,
                    type: 'mention',
                    title: '@teacher ile etiketlendiniz',
                    message: `${fromUserName}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
                    fromUserId,
                    fromUserName,
                    boardId,
                    boardTitle,
                    noteId,
                    commentId,
                    messageId,
                });
                notifiedUserIds.add(member.uid);
            }
        }
    }

    if (textLower.includes('@student')) {
        for (const member of members) {
            if (member.uid !== fromUserId && member.role === 'student' && !notifiedUserIds.has(member.uid)) {
                await createNotification({
                    userId: member.uid,
                    type: 'mention',
                    title: '@student ile etiketlendiniz',
                    message: `${fromUserName}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
                    fromUserId,
                    fromUserName,
                    boardId,
                    boardTitle,
                    noteId,
                    commentId,
                    messageId,
                });
                notifiedUserIds.add(member.uid);
            }
        }
    }

    // 2. Individual Mentions
    for (const member of members) {
        if (!member.displayName || member.uid === fromUserId || notifiedUserIds.has(member.uid)) continue;

        const mentionTag = `@${member.displayName.toLowerCase()}`;
        if (textLower.includes(mentionTag)) {
            await createNotification({
                userId: member.uid,
                type: 'mention',
                title: 'Senden bahsedildi',
                message: `${fromUserName} senden bahsetti: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
                fromUserId,
                fromUserName,
                boardId,
                boardTitle,
                noteId,
                commentId,
                messageId,
            });
            notifiedUserIds.add(member.uid);
        }
    }
}
