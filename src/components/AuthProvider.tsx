'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { onAuthChange, getCurrentUser } from '@/lib/auth';
import { User } from '@/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setLoading } = useStore();

    useEffect(() => {
        let unsubscribeProfile = () => { };

        // Handle Redirect Result (For Mobile/Google Sign-In)
        const handleRedirect = async () => {
            try {
                const { getRedirectResult } = await import('firebase/auth');
                const { auth, db } = await import('@/lib/firebase');
                const { doc, getDoc, setDoc } = await import('firebase/firestore');

                const result = await getRedirectResult(auth);
                if (result?.user) {
                    console.log('Redirect sign-in successful, processing user...');
                    const firebaseUser = result.user;

                    // Set session cookie
                    const token = await firebaseUser.getIdToken();
                    document.cookie = `session=${token}; path=/; max-age=604800; Secure; SameSite=Strict`;

                    // Check if user exists
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (!userDoc.exists()) {
                        // Create new user in Firestore
                        const userData = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            displayName: firebaseUser.displayName || 'Google User',
                            photoURL: firebaseUser.photoURL,
                            role: 'student',
                            createdAt: new Date(),
                        };
                        await setDoc(userDocRef, userData);
                        console.log('New user created from redirect');
                    }
                }
            } catch (err: any) {
                // Ignore "no redirect result" error, it's expected on normal page loads
                if (err.code !== 'auth/null-user') {
                    console.error('Redirect sign-in error:', err);
                }
            }
        };
        handleRedirect();

        const unsubscribeAuth = onAuthChange(async (firebaseUser) => {
            if (firebaseUser) {
                // 1. IMMEDIATE: Set basic user info to unblock UI instantly
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || 'Kullanıcı',
                    role: 'student',
                    createdAt: new Date(),
                });

                setLoading(false);

                // 2. REAL-TIME PROFILE SYNC: Listen for changes (including isSuspended)
                const { doc, onSnapshot, updateDoc, serverTimestamp } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');

                // 3. IP & STATUS UPDATE
                const updateStatus = async () => {
                    try {
                        const ipRes = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipRes.json();
                        await updateDoc(doc(db, 'users', firebaseUser.uid), {
                            ipAddress: ipData.ip,
                            lastSeen: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                    } catch (err) {
                        console.error('Status update failed:', err);
                    }
                };
                updateStatus();

                unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snapshot) => {
                    if (snapshot.exists()) {
                        const userProfile = snapshot.data() as User;

                        // Check if account is suspended
                        if (userProfile.isSuspended) {
                            if (window.location.pathname !== '/suspended') {
                                window.location.href = '/suspended';
                            }
                        }

                        // Force upgrade for specific email
                        if (userProfile.email === 'ahmeterdemserceoglo@gmail.com' && userProfile.role !== 'admin') {
                            const { updateDoc } = await import('firebase/firestore');
                            await updateDoc(doc(db, 'users', userProfile.uid), { role: 'admin' });
                            userProfile.role = 'admin';
                        }

                        setUser(userProfile);
                    }
                });
            } else {
                setUser(null);
                setLoading(false);
                unsubscribeProfile();
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeProfile();
        };
    }, [setUser, setLoading]);

    return <>{children}</>;
}
