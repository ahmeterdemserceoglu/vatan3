import {
    doc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Presence collection for tracking online users per board
const PRESENCE_TIMEOUT = 60000; // 60 seconds - consider offline after this

export interface PresenceData {
    userId: string;
    displayName: string;
    photoURL?: string | null;
    boardId: string;
    lastSeen: Date;
}

// Update user presence on a board
export async function updatePresence(
    boardId: string,
    userId: string,
    displayName: string,
    photoURL?: string | null
): Promise<void> {
    // Optimization: Don't write if the user isn't even looking at the tab
    if (typeof document !== 'undefined' && !document.hasFocus()) return;

    const presenceRef = doc(db, 'presence', `${boardId}_${userId}`);
    await setDoc(presenceRef, {
        userId: userId,
        displayName,
        photoURL: photoURL || null,
        boardId,
        lastSeen: serverTimestamp(),
    });
}

// Remove user presence (when leaving board)
export async function removePresence(boardId: string, userId: string): Promise<void> {
    const presenceRef = doc(db, 'presence', `${boardId}_${userId}`);
    await deleteDoc(presenceRef);
}

// Subscribe to online users on a board
export function subscribeToPresence(
    boardId: string,
    callback: (onlineUsers: PresenceData[]) => void
): () => void {
    const q = query(
        collection(db, 'presence'),
        where('boardId', '==', boardId)
    );

    return onSnapshot(q, (snapshot) => {
        const now = Date.now();
        const onlineUsers: PresenceData[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            const lastSeen = data.lastSeen instanceof Timestamp
                ? data.lastSeen.toMillis()
                : Date.now();

            // Only include users seen within the timeout period
            if (now - lastSeen < PRESENCE_TIMEOUT) {
                onlineUsers.push({
                    userId: data.userId,
                    displayName: data.displayName,
                    photoURL: data.photoURL,
                    boardId: data.boardId,
                    lastSeen: new Date(lastSeen),
                });
            }
        });

        callback(onlineUsers);
    });
}

// Heartbeat function to keep presence alive
export function startPresenceHeartbeat(
    boardId: string,
    userId: string,
    displayName: string,
    photoURL?: string | null,
    intervalMs: number = 45000 // Increased to 45 seconds to save quota
): () => void {
    // Initial presence update
    updatePresence(boardId, userId, displayName, photoURL);

    // Set up heartbeat interval
    const intervalId = setInterval(() => {
        updatePresence(boardId, userId, displayName, photoURL);
    }, intervalMs);

    // Immediately update on focus or visibility change to keep it responsive
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            updatePresence(boardId, userId, displayName, photoURL);
        }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    // Return cleanup function
    return () => {
        clearInterval(intervalId);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        removePresence(boardId, userId).catch(() => { });
    };
}
