import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile,
    onAuthStateChanged,
    User as FirebaseUser,
    reauthenticateWithCredential,
    updatePassword as firebaseUpdatePassword,
    deleteUser as firebaseDeleteUser,
    EmailAuthProvider,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    browserPopupRedirectResolver,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, query, collection, orderBy, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '@/types';
import { Capacitor } from '@capacitor/core';

export async function signUp(
    email: string,
    password: string,
    displayName: string,
    role: 'teacher' | 'student' | 'admin'
): Promise<User> {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(firebaseUser, { displayName });

    const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        role,
        createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);

    // Set session cookie
    const token = await firebaseUser.getIdToken();
    document.cookie = `session=${token}; path=/; max-age=604800; Secure; SameSite=Strict`;

    return userData;
}

export async function signIn(email: string, password: string): Promise<User> {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (!userDoc.exists()) {
        throw new Error('Kullanıcı verisi bulunamadı');
    }

    // Set session cookie
    const token = await firebaseUser.getIdToken();
    document.cookie = `session=${token}; path=/; max-age=604800; Secure; SameSite=Strict`;

    return userDoc.data() as User;
}

export async function signInWithGoogle(): Promise<User | void> {
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined' || (typeof window !== 'undefined' && Capacitor.isNativePlatform());
    const isMobileBrowser = !isCapacitor && (/Android|webOS|iPhone|iPad|Ipod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        // We only use standard Firebase Auth. 
        // Note: This will be hidden on Native Mobile per UI logic.
        try {
            // Include the resolver in popup as well to be consistent
            const { user: firebaseUser } = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
            return await finalizeUserLogin(firebaseUser);
        } catch (popupError: any) {
            console.error('Popup Error:', popupError);
            if (isMobileBrowser || popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/operation-not-supported-in-this-environment') {
                console.log('Switching to Redirect...');
                await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
                return;
            }
            throw popupError;
        }
    } catch (error) {
        console.error('Google Sign-In Error:', error);
        throw error;
    }
}

async function finalizeUserLogin(firebaseUser: FirebaseUser): Promise<User> {
    const token = await firebaseUser.getIdToken();
    document.cookie = `session=${token}; path=/; max-age=604800; Secure; SameSite=Strict`;

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
        const userData: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'Google User',
            photoURL: firebaseUser.photoURL,
            role: 'student',
            createdAt: new Date(),
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        return userData;
    }
    return userDoc.data() as User;
}

// Result handler for redirect logins
export async function handleRedirectResult(): Promise<User | null> {
    try {
        const isCapacitor = typeof (window as any).Capacitor !== 'undefined' || (typeof window !== 'undefined' && Capacitor.isNativePlatform());
        if (isCapacitor) return null;

        const result = await getRedirectResult(auth, browserPopupRedirectResolver);
        if (result?.user) {
            const firebaseUser = result.user;
            const token = await firebaseUser.getIdToken();
            document.cookie = `session=${token}; path=/; max-age=604800; Secure; SameSite=Strict`;

            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (!userDoc.exists()) {
                const userData: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email!,
                    displayName: firebaseUser.displayName || 'Google User',
                    photoURL: firebaseUser.photoURL,
                    role: 'student',
                    createdAt: new Date(),
                };
                await setDoc(doc(db, 'users', firebaseUser.uid), userData);
                return userData;
            }
            return userDoc.data() as User;
        }
        return null;
    } catch (error) {
        console.error('Redirect Result Error:', error);
        throw error;
    }
}

export async function sendPasswordReset(email: string): Promise<void> {
    await firebaseSendPasswordResetEmail(auth, email);
}

export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
    // Remove session cookie
    document.cookie = 'session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export async function getCurrentUser(firebaseUser: FirebaseUser): Promise<User | null> {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) return null;
    return userDoc.data() as User;
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
    if (!userIds || userIds.length === 0) return [];

    // Firestore 'in' query supports up to 30 items per query
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 30) {
        chunks.push(userIds.slice(i, i + 30));
    }

    const allUsers: User[] = [];
    for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('uid', 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => allUsers.push(doc.data() as User));
    }

    return allUsers;
}

export async function updateUserProfile(
    userId: string,
    updates: { displayName?: string; photoURL?: string | null }
): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await setDoc(userRef, filteredUpdates, { merge: true });
    if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
            displayName: updates.displayName || auth.currentUser.displayName,
            photoURL: updates.photoURL || auth.currentUser.photoURL,
        });
    }
}

export async function updateNotificationPreferences(
    userId: string,
    preferences: any
): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { notificationPreferences: preferences }, { merge: true });
}

export async function getNotificationPreferences(userId: string): Promise<any> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const data = userDoc.data();
    const defaults = {
        comment_reply: true,
        mention: true,
        new_comment: true,
        reaction: true,
        like: true,
        teacher_post: true,
        teacher_message: true,
        member_joined: true,
    };
    return { ...defaults, ...(data?.notificationPreferences || {}) };
}

export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('Kullanıcı oturumu bulunamadı');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await firebaseUpdatePassword(user, newPassword);
}

export async function deleteAccount(password: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('Kullanıcı oturumu bulunamadı');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    const userRef = doc(db, 'users', user.uid);
    await deleteDoc(userRef);
    await firebaseDeleteUser(user);
}

export async function updateLastSeen(userId: string): Promise<void> {
    if (typeof document !== 'undefined' && !document.hasFocus()) return;
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { lastSeen: new Date() }, { merge: true });
}

export async function getUserWithLastSeen(userId: string): Promise<any> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    return userDoc.data();
}

export async function searchUsers(searchTerm: string): Promise<User[]> {
    if (!searchTerm || searchTerm.length < 2) return [];
    const searchLower = searchTerm.toLowerCase();

    // Use a more targeted query: order by displayName and start at the search term
    // This reduces the number of documents read compared to fetching 100 random users
    const q = query(
        collection(db, 'users'),
        orderBy('displayName'),
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff'),
        limit(20)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        lastSeen: doc.data().lastSeen?.toDate?.() || doc.data().lastSeen,
    } as User));
}

export const logoutUser = signOut;
