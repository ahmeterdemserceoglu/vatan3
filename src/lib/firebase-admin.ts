/**
 * Firebase Admin SDK initialization for server-side operations
 * Used for sending FCM push notifications from API routes
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin only once
if (!admin.apps.length) {
    // For Vercel, we use environment variables for the service account
    // You need to add FIREBASE_SERVICE_ACCOUNT_KEY in Vercel environment variables
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sakarya30-76810',
            });
            console.log('[Firebase Admin] Initialized with service account');
        } catch (error) {
            console.error('[Firebase Admin] Error parsing service account:', error);
            // Fallback to default credentials (for local development)
            admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sakarya30-76810',
            });
        }
    } else {
        // For local development without service account
        console.warn('[Firebase Admin] No service account found, using default credentials');
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sakarya30-76810',
        });
    }
}

export const adminDb = admin.firestore();
export const adminMessaging = admin.messaging();
export default admin;
