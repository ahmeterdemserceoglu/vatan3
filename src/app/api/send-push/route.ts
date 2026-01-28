/**
 * API Route: Send Push Notification via FCM
 * 
 * This endpoint is called when a notification is created in Firestore
 * to send a push notification to the user's device even when browser is closed
 */

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin';

// Notification type mapping for titles
const notificationTitles: Record<string, { tr: string; en: string }> = {
    comment: { tr: 'Yeni Yorum', en: 'New Comment' },
    reply: { tr: 'Yanıt Aldın', en: 'New Reply' },
    mention: { tr: 'Senden Bahsedildi', en: 'You were mentioned' },
    note: { tr: 'Yeni Not', en: 'New Note' },
    like: { tr: 'Beğeni', en: 'Like' },
    message: { tr: 'Yeni Mesaj', en: 'New Message' },
    assignment: { tr: 'Yeni Ödev', en: 'New Assignment' },
    assignment_graded: { tr: 'Ödev Notlandırıldı', en: 'Assignment Graded' },
    assignment_submitted: { tr: 'Ödev Teslim Edildi', en: 'Assignment Submitted' },
    board_join_request: { tr: 'Katılım İsteği', en: 'Join Request' },
    board_join_approved: { tr: 'İstek Onaylandı', en: 'Request Approved' },
    board_join_rejected: { tr: 'İstek Reddedildi', en: 'Request Rejected' },
    announcement: { tr: 'Duyuru', en: 'Announcement' },
    teacher_post: { tr: 'Öğretmeninden Yeni Not', en: 'New Note from Teacher' },
};

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        try {
            await admin.auth().verifyIdToken(token);
        } catch (authError) {
            console.log('Auth verification failed:', authError);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await request.json();
        const { userId, type, title, message, boardId, noteId, commentId, messageId, fromUserName, notificationId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Get user's FCM token from Firestore
        const db = admin.firestore();
        const tokenDoc = await db.collection('fcmTokens').doc(userId).get();

        if (!tokenDoc.exists) {
            console.log('[Push API] No FCM token found for user:', userId);
            return NextResponse.json({ success: false, reason: 'no_token' });
        }

        const tokenData = tokenDoc.data();
        const fcmToken = tokenData?.token;

        if (!fcmToken) {
            console.log('[Push API] Empty FCM token for user:', userId);
            return NextResponse.json({ success: false, reason: 'empty_token' });
        }

        // Build the URL for the notification
        let url = '/';
        if (boardId) {
            url = `/pano/${boardId}`;

            // Add query parameters for specific navigation
            const params = new URLSearchParams();
            if (noteId && commentId) {
                params.set('openComments', noteId);
                params.set('highlightComment', commentId);
            } else if (messageId) {
                params.set('openChat', 'true');
                params.set('highlightMessage', messageId);
            } else if (noteId) {
                params.set('highlightNote', noteId);
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }

        // Get notification title
        const titles = notificationTitles[type] || { tr: 'Bildirim', en: 'Notification' };

        // Create the FCM message
        const fcmMessage: admin.messaging.Message = {
            token: fcmToken,
            notification: {
                title: title || titles.tr,
                body: message || 'Yeni bildiriminiz var',
            },
            data: {
                notificationId: notificationId || '',
                type: type || 'note',
                url: url,
                boardId: boardId || '',
                noteId: noteId || '',
                commentId: commentId || '',
                messageId: messageId || '',
                fromUserName: fromUserName || '',
                click_action: url,
            },
            webpush: {
                notification: {
                    title: title || titles.tr,
                    body: message || 'Yeni bildiriminiz var',
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: notificationId || 'notification', // Prevents duplicate notifications
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: url,
                },
            },
        };

        // Send the notification
        const messaging = admin.messaging();
        const response = await messaging.send(fcmMessage);

        return NextResponse.json({ success: true, messageId: response });
    } catch (error: any) {
        console.error('[Push API] Error sending push notification:', error);

        // If the token is invalid, we should clean it up
        if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
        ) {
            // Token cleanup would happen here
            return NextResponse.json({ success: false, reason: 'invalid_token', error: error.message });
        }

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
