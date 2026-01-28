import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getDocs,
    Timestamp,
    increment,
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Section, Comment } from '@/types';

// --- SECTIONS ---

export async function createSection(boardId: string, title: string, order: number) {
    const sectionData = {
        boardId,
        title,
        order,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'sections'), sectionData);
    return docRef.id;
}

export async function updateSection(sectionId: string, title: string) {
    const sectionRef = doc(db, 'sections', sectionId);
    await updateDoc(sectionRef, { title });
}

export async function deleteSection(sectionId: string) {
    // Note: Ideally, we should also delete all notes within this section
    // or move them to another section. For now, we just delete the section.
    await deleteDoc(doc(db, 'sections', sectionId));
}

export async function toggleSectionPin(sectionId: string, isPinned: boolean) {
    const sectionRef = doc(db, 'sections', sectionId);
    await updateDoc(sectionRef, { isPinned });
}

export function subscribeToBoardSections(boardId: string, callback: (sections: Section[]) => void) {
    const q = query(
        collection(db, 'sections'),
        where('boardId', '==', boardId),
        orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const sections: Section[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            sections.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as Section);
        });
        callback(sections);
    });
}

// --- COMMENTS ---

export async function addComment(
    noteId: string,
    boardId: string,
    authorId: string,
    authorName: string,
    authorPhotoURL: string | null | undefined,
    content: string,
    replyTo?: {
        replyToId: string;
        replyToAuthor: string;
        replyToContent: string;
    }
): Promise<string> {
    const commentData = {
        noteId,
        boardId,
        authorId,
        authorName,
        authorPhotoURL: authorPhotoURL || '',
        content,
        createdAt: serverTimestamp(),
        ...(replyTo && {
            replyToId: replyTo.replyToId,
            replyToAuthor: replyTo.replyToAuthor,
            replyToContent: replyTo.replyToContent,
        }),
    };
    const docRef = await addDoc(collection(db, 'comments'), commentData);

    // Increment comment count on note
    const noteRef = doc(db, 'notes', noteId);
    await updateDoc(noteRef, {
        commentCount: increment(1)
    });

    return docRef.id; // Return the new comment ID
}

export function subscribeToNoteComments(noteId: string, callback: (comments: Comment[]) => void) {
    const q = query(
        collection(db, 'comments'),
        where('noteId', '==', noteId),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const comments: Comment[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            comments.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as Comment);
        });
        callback(comments);
    });
}

export async function deleteComment(commentId: string) {
    // Get comment to find noteId
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (commentSnap.exists()) {
        const noteId = commentSnap.data().noteId;

        await deleteDoc(commentRef);

        // Decrement comment count (ensure it doesn't go below 0)
        if (noteId) {
            const noteRef = doc(db, 'notes', noteId);
            const noteSnap = await getDoc(noteRef);

            if (noteSnap.exists()) {
                const currentCount = noteSnap.data().commentCount || 0;
                if (currentCount > 0) {
                    await updateDoc(noteRef, {
                        commentCount: increment(-1)
                    });
                }
            }
        }
    }
}

// --- COMMENT LIKES ---

export async function likeComment(commentId: string, userId: string) {
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (commentSnap.exists()) {
        const currentLikes = commentSnap.data().likes || [];
        if (!currentLikes.includes(userId)) {
            await updateDoc(commentRef, {
                likes: [...currentLikes, userId]
            });
        }
    }
}

export async function unlikeComment(commentId: string, userId: string) {
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (commentSnap.exists()) {
        const currentLikes = commentSnap.data().likes || [];
        await updateDoc(commentRef, {
            likes: currentLikes.filter((id: string) => id !== userId)
        });
    }
}
