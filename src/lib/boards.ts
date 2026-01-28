import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Board, Note, BoardMemberActivity } from '@/types';

export async function createBoard(
    title: string,
    ownerId: string,
    ownerName: string,
    options: Partial<Board> = {}
): Promise<string> {
    const boardData = {
        title,
        ownerId,
        ownerName,
        description: options.description || '',
        backgroundColor: options.backgroundColor || '#f5f5f4',
        backgroundGradient: options.backgroundGradient || '',
        backgroundImage: options.backgroundImage || '',
        backgroundType: options.backgroundType || 'color',
        isPublic: options.isPublic ?? true,
        allowAnonymous: options.allowAnonymous ?? false,
        permissions: options.permissions || {
            whoCanAddNotes: 'everyone',
            whoCanComment: 'everyone',
            whoCanChat: 'everyone',
            allowFileDownload: true,
            requireMemberApproval: false
        },
        members: [], // Initialize empty members list
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'boards'), boardData);
    return docRef.id;
}

export async function getBoard(boardId: string): Promise<Board | null> {
    const docSnap = await getDoc(doc(db, 'boards', boardId));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Board;
}

export async function getUserBoards(userId: string): Promise<Board[]> {
    const q = query(
        collection(db, 'boards'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Board));
}

export async function getJoinedBoards(userId: string): Promise<Board[]> {
    const q = query(
        collection(db, 'boards'),
        where('members', 'array-contains', userId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Board));
}

// Realtime subscription for user's own boards
export function subscribeToUserBoards(
    userId: string,
    callback: (boards: Board[]) => void
): () => void {
    const q = query(
        collection(db, 'boards'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const boards = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Board));
        callback(boards);
    }, (error) => {
        console.warn('User boards subscription error:', error.message);
        // Return empty array on permission error
        callback([]);
    });
}

// Realtime subscription for joined boards
export function subscribeToJoinedBoards(
    userId: string,
    callback: (boards: Board[]) => void
): () => void {
    const q = query(
        collection(db, 'boards'),
        where('members', 'array-contains', userId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const boards = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Board));
        callback(boards);
    }, (error) => {
        console.warn('Joined boards subscription error:', error.message);
        // Return empty array on permission error
        callback([]);
    });
}

// Realtime subscription for ALL boards (Admin only)
export function subscribeToAllBoards(
    callback: (boards: Board[]) => void
): () => void {
    const q = query(
        collection(db, 'boards'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const boards = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Board));
        callback(boards);
    }, (error) => {
        console.warn('All boards subscription error:', error.message);
        // This will only work if Firestore rules allow it for the user
        callback([]);
    });
}

export async function joinBoard(
    boardId: string,
    userId: string,
    userName: string,
    boardTitle: string,
    existingMembers: string[],
    ownerId: string,
    board?: Board // Optional board for permission check
): Promise<'joined' | 'pending'> {
    // Üyelik onayı gerekli mi kontrol et
    const requiresApproval = board?.permissions?.requireMemberApproval ?? false;

    if (requiresApproval) {
        // Onay gerekliyse pendingMembers'a ekle
        await updateDoc(doc(db, 'boards', boardId), {
            'permissions.pendingMembers': arrayUnion(userId),
            updatedAt: serverTimestamp(),
        });

        // Owner'a bildirim gönder
        try {
            const { createNotification } = await import('./notifications');
            await createNotification({
                userId: ownerId,
                type: 'member_request',
                title: 'Yeni üyelik isteği!',
                message: `${userName} "${boardTitle}" panosuna katılmak istiyor.`,
                fromUserId: userId,
                fromUserName: userName,
                boardId,
                boardTitle,
                requestingUserId: userId,
            });
        } catch (error) {
            console.error('Member request notification error:', error);
        }

        return 'pending';
    }

    // Normal katılım
    await updateDoc(doc(db, 'boards', boardId), {
        members: arrayUnion(userId),
        updatedAt: serverTimestamp(),
    });

    // Record join date in member activity
    await setMemberJoinedDate(boardId, userId, userName);

    // Notify all existing members (including owner) about the new member
    try {
        const { createNotification } = await import('./notifications');

        // Combine members and owner for notification
        const allMembersToNotify = [...existingMembers];
        if (ownerId && !allMembersToNotify.includes(ownerId)) {
            allMembersToNotify.push(ownerId);
        }

        for (const memberId of allMembersToNotify) {
            if (memberId === userId) continue; // Don't notify self

            await createNotification({
                userId: memberId,
                type: 'member_joined',
                title: 'Yeni üye katıldı!',
                message: `${userName} "${boardTitle}" panosuna katıldı. Ona merhaba de!`,
                fromUserId: userId,
                fromUserName: userName,
                boardId,
                boardTitle,
            });
        }
    } catch (error) {
        console.error('Member joined notification error:', error);
    }

    return 'joined';
}

// Üyelik isteğini onayla (Owner veya Öğretmen)
export async function approveMember(
    boardId: string,
    userId: string,
    userName: string,
    boardTitle: string,
    approverId: string,
    approverName?: string
): Promise<void> {
    // pendingMembers'dan çıkar ve members'a ekle
    await updateDoc(doc(db, 'boards', boardId), {
        'permissions.pendingMembers': arrayRemove(userId),
        members: arrayUnion(userId),
        updatedAt: serverTimestamp(),
    });

    // Kullanıcıya bildirim gönder
    try {
        const { createNotification } = await import('./notifications');
        await createNotification({
            userId: userId,
            type: 'member_joined',
            title: 'Üyelik onaylandı! 🎉',
            message: `"${boardTitle}" panosuna katılım isteğiniz onaylandı. Artık panoya erişebilirsiniz!`,
            fromUserId: approverId,
            fromUserName: approverName || 'Yönetici',
            boardId,
            boardTitle,
        });
    } catch (error) {
        console.error('Member approved notification error:', error);
    }
}

// Üyelik isteğini reddet
export async function rejectMember(
    boardId: string,
    userId: string,
    boardTitle?: string,
    rejecterId?: string,
    rejecterName?: string
): Promise<void> {
    // pendingMembers'dan çıkar
    await updateDoc(doc(db, 'boards', boardId), {
        'permissions.pendingMembers': arrayRemove(userId),
        updatedAt: serverTimestamp(),
    });

    // Kullanıcıya red bildirimi gönder
    if (boardTitle && rejecterId) {
        try {
            const { createNotification } = await import('./notifications');
            await createNotification({
                userId: userId,
                type: 'member_rejected',
                title: 'Üyelik İsteği Reddedildi',
                message: `"${boardTitle}" panosuna katılım isteğiniz reddedildi.`,
                fromUserId: rejecterId,
                fromUserName: rejecterName || 'Yönetici',
                boardId,
                boardTitle,
            });
        } catch (error) {
            console.error('Member rejected notification error:', error);
        }
    }
}

export async function leaveBoard(boardId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'boards', boardId), {
        members: arrayRemove(userId),
        updatedAt: serverTimestamp(),
    });
}

export async function updateBoard(boardId: string, updates: Partial<Board>): Promise<void> {
    await updateDoc(doc(db, 'boards', boardId), {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Transfer ownership of a board to another user
 */
export async function transferBoardOwnership(
    boardId: string,
    newOwnerId: string,
    newOwnerName: string,
    oldOwnerId: string
): Promise<void> {
    const boardRef = doc(db, 'boards', boardId);

    // 1. Update board with new owner info
    // Also add the old owner to the members list so they don't lose access
    await updateDoc(boardRef, {
        ownerId: newOwnerId,
        ownerName: newOwnerName,
        members: arrayUnion(oldOwnerId),
        updatedAt: serverTimestamp(),
    });

    // 2. Remove new owner from members list since they are now the owner
    await updateDoc(boardRef, {
        members: arrayRemove(newOwnerId)
    });

    // 3. Notify the new owner
    try {
        const { createNotification } = await import('./notifications');
        await createNotification({
            userId: newOwnerId,
            type: 'mention',
            title: 'Pano sahipliği devredildi! 👑',
            message: `Artık bu panonun sahibisiniz. Tüm yönetim yetkilerine sahipsiniz.`,
            fromUserId: oldOwnerId,
            fromUserName: 'Sistem',
            boardId,
        });
    } catch (error) {
        console.error('Ownership transfer notification error:', error);
    }
}

export async function deleteBoard(boardId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);

    await updateDoc(doc(db, 'boards', boardId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        expiresAt: expiresAt,
        updatedAt: serverTimestamp(),
    });
}

export async function permanentlyDeleteBoard(boardId: string): Promise<void> {
    // Delete all notes in the board first
    const notesQuery = query(collection(db, 'notes'), where('boardId', '==', boardId));
    const notesSnapshot = await getDocs(notesQuery);

    const { permanentlyDeleteNote } = await import('./notes');
    const deletePromises = notesSnapshot.docs.map((doc) => permanentlyDeleteNote(doc.id));
    await Promise.all(deletePromises);

    await deleteDoc(doc(db, 'boards', boardId));
}

export async function restoreBoard(boardId: string): Promise<void> {
    await updateDoc(doc(db, 'boards', boardId), {
        isDeleted: false,
        deletedAt: null,
        expiresAt: null,
        updatedAt: serverTimestamp(),
    });
}

export function subscribeToBoardNotes(
    boardId: string,
    callback: (notes: Note[]) => void,
    onError?: (error: Error) => void
) {
    const q = query(
        collection(db, 'notes'),
        where('boardId', '==', boardId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Note[];
        callback(notes);
    }, (error) => {
        console.error('Notes subscription error:', error);
        onError?.(error);
    });
}

export function subscribeToBoard(
    boardId: string,
    callback: (board: Board | null) => void,
    onError?: (error: Error) => void
) {
    return onSnapshot(doc(db, 'boards', boardId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as Board);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Board subscription error:', error);
        onError?.(error);
    });
}

// ============================================
// MEMBER ACTIVITY TRACKING
// ============================================



/**
 * Update a member's last active time on a board.
 * Call this when a user opens a board page.
 */
export async function updateMemberActivity(
    boardId: string,
    userId: string,
    displayName?: string
): Promise<void> {
    const activityRef = doc(db, 'boards', boardId, 'memberActivity', userId);
    await setDoc(activityRef, {
        userId,
        lastActiveAt: serverTimestamp(),
        displayName: displayName || null,
    }, { merge: true });
}

/**
 * Subscribe to all member activities for a board.
 * Returns the last active time for each member.
 */
export function subscribeToBoardMemberActivity(
    boardId: string,
    callback: (activities: BoardMemberActivity[]) => void
): () => void {
    const activitiesRef = collection(db, 'boards', boardId, 'memberActivity');

    return onSnapshot(activitiesRef, (snapshot) => {
        const activities: BoardMemberActivity[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                userId: doc.id,
                lastActiveAt: data.lastActiveAt?.toDate?.() || new Date(0),
                displayName: data.displayName,
                joinedAt: data.joinedAt?.toDate?.(),
                noteCount: data.noteCount || 0,
                commentCount: data.commentCount || 0,
                messageCount: data.messageCount || 0,
            };
        });
        callback(activities);
    });
}

/**
 * Get member activity for a single user on a board
 */
export async function getMemberActivity(
    boardId: string,
    userId: string
): Promise<BoardMemberActivity | null> {
    const activityRef = doc(db, 'boards', boardId, 'memberActivity', userId);
    const docSnap = await getDoc(activityRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
        userId: docSnap.id,
        lastActiveAt: data.lastActiveAt?.toDate?.() || new Date(0),
        displayName: data.displayName,
        joinedAt: data.joinedAt?.toDate?.(),
        noteCount: data.noteCount || 0,
        commentCount: data.commentCount || 0,
        messageCount: data.messageCount || 0,
    };
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

/**
 * Remove a member from the board (Owner/Teacher only)
 */
export async function removeMember(
    boardId: string,
    userId: string
): Promise<void> {
    await updateDoc(doc(db, 'boards', boardId), {
        members: arrayRemove(userId),
        updatedAt: serverTimestamp(),
    });

    // Also delete their activity data
    try {
        await deleteDoc(doc(db, 'boards', boardId, 'memberActivity', userId));
    } catch (e) {
        // Activity may not exist, ignore
    }
}

/**
 * Get member statistics for a board (count of notes, comments, messages)
 */
export async function getMemberStats(
    boardId: string,
    userId: string
): Promise<{ noteCount: number; commentCount: number; messageCount: number }> {
    const [notesSnapshot, commentsSnapshot, messagesSnapshot] = await Promise.all([
        getDocs(query(
            collection(db, 'notes'),
            where('boardId', '==', boardId),
            where('authorId', '==', userId)
        )),
        getDocs(query(
            collection(db, 'comments'),
            where('boardId', '==', boardId),
            where('authorId', '==', userId)
        )),
        getDocs(query(
            collection(db, 'messages'),
            where('boardId', '==', boardId),
            where('senderId', '==', userId)
        ))
    ]);

    return {
        noteCount: notesSnapshot.size,
        commentCount: commentsSnapshot.size,
        messageCount: messagesSnapshot.size,
    };
}

/**
 * Update member activity with joined date (call when user first joins)
 */
export async function setMemberJoinedDate(
    boardId: string,
    userId: string,
    displayName?: string
): Promise<void> {
    const activityRef = doc(db, 'boards', boardId, 'memberActivity', userId);
    const docSnap = await getDoc(activityRef);

    // Only set joinedAt if it doesn't exist
    if (!docSnap.exists() || !docSnap.data()?.joinedAt) {
        await setDoc(activityRef, {
            userId,
            joinedAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
            displayName: displayName || null,
        }, { merge: true });
    }
}

