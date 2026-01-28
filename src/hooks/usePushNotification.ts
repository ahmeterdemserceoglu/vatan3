'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '@/store/useStore';

// VAPID key for web push - Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BMr3sLiKZ74RtaxNX9eZCLwscKkKH1KLAJN5nMaiuKUMu3Wvaho9ZH_RPj85gwef8OXOE-ttSmcGM4MPqvuzWEE';

interface UsePushNotificationReturn {
    permission: NotificationPermission | 'unsupported';
    isSupported: boolean;
    isLoading: boolean;
    token: string | null;
    requestPermission: () => Promise<boolean>;
    error: string | null;
}


// Check if running in Capacitor native app
const isCapacitor = typeof window !== 'undefined' && Capacitor.isNativePlatform();

export function usePushNotification(): UsePushNotificationReturn {
    const { user } = useStore();
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [supported, setSupported] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Save token to Firestore
    const saveTokenToFirestore = useCallback(async (fcmToken: string, platform: string) => {
        if (!user) return;

        try {
            await setDoc(doc(db, 'fcmTokens', `${user.uid}_${platform}`), {
                token: fcmToken,
                userId: user.uid,
                createdAt: new Date(),
                userAgent: navigator.userAgent,
                platform: platform,
            });
            console.log(`[Push] Token saved for ${platform}`);
        } catch (err) {
            console.error('[Push] Error saving token:', err);
        }
    }, [user]);

    // Native Capacitor Push Notifications
    const initCapacitorPush = useCallback(async () => {
        if (!isCapacitor || !user) return null;

        try {
            const { PushNotifications } = await import('@capacitor/push-notifications');

            // Request permission
            const permStatus = await PushNotifications.requestPermissions();

            if (permStatus.receive === 'granted') {
                setPermission('granted');

                // Register for push notifications
                await PushNotifications.register();

                // Listen for registration success
                PushNotifications.addListener('registration', async (tokenData) => {
                    console.log('[Push] Native token:', tokenData.value);
                    setToken(tokenData.value);
                    await saveTokenToFirestore(tokenData.value, 'android');
                });

                // Listen for registration error
                PushNotifications.addListener('registrationError', (err) => {
                    console.error('[Push] Registration error:', err);
                    setError('Bildirim kaydı başarısız');
                });

                // Listen for push notifications received
                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('[Push] Notification received:', notification);
                    // Show a local notification or update UI
                });

                // Listen for notification action (tap)
                PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    console.log('[Push] Notification action:', action);
                    // Navigate to specific page based on notification data
                    const data = action.notification.data;
                    if (data?.url) {
                        window.location.href = data.url;
                    }
                });

                return true;
            } else {
                setPermission('denied');
                return false;
            }
        } catch (err) {
            console.error('[Push] Capacitor push error:', err);
            setError('Bildirim servisi başlatılamadı');
            return false;
        }
    }, [user, saveTokenToFirestore]);

    // Web Push Notifications (Firebase Messaging)
    const initWebPush = useCallback(async () => {
        if (isCapacitor || !user) return null;

        try {
            const { getMessaging, getToken, onMessage, isSupported: checkSupported } = await import('firebase/messaging');

            const messagingSupported = await checkSupported();
            const notificationSupported = 'Notification' in window;
            const swSupported = 'serviceWorker' in navigator;

            if (!messagingSupported || !notificationSupported || !swSupported) {
                setPermission('unsupported');
                return null;
            }

            setSupported(true);
            setPermission(Notification.permission);

            if (Notification.permission === 'granted') {
                // Register service worker
                await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                const registration = await navigator.serviceWorker.ready;

                const messaging = getMessaging();
                const currentToken = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration,
                });

                if (currentToken) {
                    setToken(currentToken);
                    await saveTokenToFirestore(currentToken, 'web');

                    // Listen for foreground messages
                    onMessage(messaging, (payload) => {
                        console.log('[Push] Foreground message:', payload);

                        if (Notification.permission === 'granted' && payload.notification) {
                            const notification = new Notification(
                                payload.notification.title || 'Collabo',
                                {
                                    body: payload.notification.body,
                                    icon: '/icon-192.png',
                                    tag: payload.data?.notificationId || 'foreground',
                                    data: payload.data,
                                }
                            );

                            notification.onclick = () => {
                                window.focus();
                                if (payload.data?.url) {
                                    window.location.href = payload.data.url;
                                }
                                notification.close();
                            };
                        }
                    });

                    return currentToken;
                }
            }

            return null;
        } catch (err) {
            console.error('[Push] Web push error:', err);
            return null;
        }
    }, [user, saveTokenToFirestore]);

    // Initialize push notifications
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);

            if (isCapacitor) {
                setSupported(true);
                await initCapacitorPush();
            } else {
                await initWebPush();
            }

            setIsLoading(false);
        };

        if (user) {
            init();
        } else {
            setIsLoading(false);
        }
    }, [user, initCapacitorPush, initWebPush]);

    // Request permission handler
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!supported && !isCapacitor) {
            setError('Tarayıcınız push bildirimleri desteklemiyor');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (isCapacitor) {
                const result = await initCapacitorPush();
                setIsLoading(false);
                return !!result;
            } else {
                const result = await Notification.requestPermission();
                setPermission(result);

                if (result === 'granted') {
                    const token = await initWebPush();
                    setIsLoading(false);
                    return !!token;
                } else if (result === 'denied') {
                    setError('Bildirim izni reddedildi');
                }

                setIsLoading(false);
                return false;
            }
        } catch (err) {
            console.error('[Push] Permission request failed:', err);
            setError('Bildirim izni istenemedi');
            setIsLoading(false);
            return false;
        }
    }, [supported, initCapacitorPush, initWebPush]);

    return {
        permission,
        isSupported: supported || isCapacitor,
        isLoading,
        token,
        requestPermission,
        error,
    };
}

// Utility to remove FCM token (for logout)
export async function removeFCMToken(userId: string): Promise<void> {
    try {
        // Remove both web and android tokens
        await deleteDoc(doc(db, 'fcmTokens', `${userId}_web`));
        await deleteDoc(doc(db, 'fcmTokens', `${userId}_android`));
        console.log('[Push] Tokens removed for user:', userId);
    } catch (err) {
        console.error('[Push] Error removing tokens:', err);
    }
}

// Utility to get user's FCM tokens
export async function getUserFCMTokens(userId: string): Promise<string[]> {
    const tokens: string[] = [];

    try {
        const webDoc = await getDoc(doc(db, 'fcmTokens', `${userId}_web`));
        if (webDoc.exists()) {
            tokens.push(webDoc.data().token);
        }

        const androidDoc = await getDoc(doc(db, 'fcmTokens', `${userId}_android`));
        if (androidDoc.exists()) {
            tokens.push(androidDoc.data().token);
        }
    } catch (err) {
        console.error('[Push] Error getting user tokens:', err);
    }

    return tokens;
}
