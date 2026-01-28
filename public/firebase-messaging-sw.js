// Firebase Cloud Messaging Service Worker
// Bu dosya push notification almak için gerekli

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config - production config
firebase.initializeApp({
    apiKey: "AIzaSyA0sXDfYkkR8_F8S4yFX5ODakc2hN-5pxw",
    authDomain: "vatan2-92413.firebaseapp.com",
    projectId: "vatan2-92413",
    storageBucket: "vatan2-92413.firebasestorage.app",
    messagingSenderId: "668976940913",
    appId: "1:668976940913:web:b1a5a78f0c82d2de72e6e0"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Mantar Pano';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.message || 'Yeni bildiriminiz var',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.data?.notificationId || 'default',
        data: {
            url: payload.data?.url || '/',
            notificationId: payload.data?.notificationId,
            boardId: payload.data?.boardId,
        },
        vibrate: [100, 50, 100],
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Görüntüle'
            },
            {
                action: 'close',
                title: 'Kapat'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    if (event.action === 'close') {
        return;
    }

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if already open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.focus();
                        client.navigate(urlToOpen);
                        return;
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Activate immediately
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(clients.claim());
});
