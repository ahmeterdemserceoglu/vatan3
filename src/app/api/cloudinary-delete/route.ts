import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import admin from '@/lib/firebase-admin';

// Cloudinary credentials (add these to your environment variables)
const CLOUDINARY_CLOUD_NAME = 'dqgx6wpbt';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '291278175254389';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'zzvidJcQeb01r45O0UbYVvH1oRk';

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
            console.error('Auth verification failed:', authError);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const { publicId } = await request.json();

        if (!publicId) {
            return NextResponse.json({ error: 'publicId required' }, { status: 400 });
        }

        // If API credentials are not set, skip deletion (graceful fallback)
        if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
            console.warn('Cloudinary API credentials not set, skipping deletion');
            return NextResponse.json({ success: true, skipped: true });
        }

        const timestamp = Math.round(Date.now() / 1000);

        // Generate signature for Cloudinary API
        const signatureString = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

        // Try to delete as image first, then as raw if it fails
        const resourceTypes = ['image', 'raw', 'video'];

        for (const resourceType of resourceTypes) {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        public_id: publicId,
                        signature,
                        api_key: CLOUDINARY_API_KEY,
                        timestamp,
                    }),
                }
            );

            const data = await response.json();

            if (data.result === 'ok') {
                return NextResponse.json({ success: true, resourceType });
            }
        }

        return NextResponse.json({ success: true, message: 'File may not exist or already deleted' });
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
