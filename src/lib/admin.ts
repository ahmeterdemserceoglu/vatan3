import { db } from './firebase';
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    setDoc,
    Timestamp,
    getDoc,
    where
} from 'firebase/firestore';
import { User, Board } from '@/types';

/**
 * Fetch all users in the system (Admin only)
 */
export async function getAllUsers(): Promise<User[]> {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            uid: doc.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            lastSeen: data.lastSeen instanceof Timestamp ? data.lastSeen.toDate() : data.lastSeen,
            suspendedAt: data.suspendedAt instanceof Timestamp ? data.suspendedAt.toDate() : data.suspendedAt,
            isSuspended: data.isSuspended || false, // Ensure isSuspended is always a boolean
            suspensionReason: data.suspensionReason || null, // Ensure suspensionReason is present
        } as User;
    });
}

/**
 * Update a user's role (Admin only)
 */
export async function setUserRole(userId: string, role: 'teacher' | 'student' | 'admin'): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        role,
        updatedAt: Timestamp.now()
    });
}

/**
 * Get the global dynamic permissions config
 */
export async function getRolePermissions(): Promise<any> {
    const docRef = doc(db, 'system', 'permissions');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data();
    }

    // Default config if not exists
    const defaultConfig = {
        teacher: {
            canDeleteNotes: true,
            canDeleteComments: true,
            canManageSections: true,
            canPinNotes: true,
            canLockComments: true,
            canCreateAssignments: true,
            canGradeAssignments: true,
        },
        student: {
            canDeleteNotes: false,
            canDeleteComments: false,
            canManageSections: false,
            canPinNotes: false,
            canLockComments: false,
            canCreateAssignments: false,
            canGradeAssignments: false,
        }
    };

    // Auto-create default config
    await setDoc(docRef, defaultConfig);
    return defaultConfig;
}

/**
 * Update global dynamic permissions config
 */
export async function updateRolePermissions(config: any): Promise<void> {
    const docRef = doc(db, 'system', 'permissions');
    await setDoc(docRef, config, { merge: true });
}

/**
 * Toggle user suspension (Admin only)
 */
export async function toggleUserSuspension(userId: string, isSuspended: boolean, reason?: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        isSuspended,
        suspensionReason: isSuspended ? (reason || 'No reason provided') : null,
        suspendedAt: isSuspended ? Timestamp.now() : null,
        updatedAt: Timestamp.now()
    });
}

/**
 * Fetch all boards owned by a specific user
 */
export async function getUserBoards(userId: string): Promise<Board[]> {
    const q = query(collection(db, 'boards'), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : doc.data().createdAt,
    } as Board));
}
/**
 * Fetch all boards in the system (Admin only)
 */
export async function getAllBoards(): Promise<Board[]> {
    const q = query(collection(db, 'boards'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : doc.data().createdAt,
    } as Board));
}
