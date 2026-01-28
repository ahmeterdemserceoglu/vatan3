import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/firebase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload profile photo to Supabase Storage
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Delete existing avatar first (if any)
    await supabase.storage
        .from('profiles')
        .remove([filePath]);

    const { data, error } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true // Overwrite if exists
        });

    if (error) {
        console.error('Profile photo upload error:', error);
        throw new Error('Profil fotoğrafı yüklenemedi: ' + error.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

    // Add timestamp to bust cache
    return `${urlData.publicUrl}?t=${Date.now()}`;
}

// Upload file to Supabase Storage
export async function uploadToSupabase(file: File): Promise<string> {
    // Orijinal dosya adını temizle (URL-safe yap)
    const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Özel karakterleri _ ile değiştir
        .replace(/_+/g, '_'); // Birden fazla _ varsa tek _ yap

    // Benzersizlik için başına timestamp ekle
    const fileName = `${Date.now()}_${sanitizedName}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
        .from('board-files')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Dosya yüklenemedi (${file.name}): ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('board-files')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

// Upload multiple files with concurrency limit
export async function uploadMultipleToSupabase(
    files: File[],
    concurrency: number = 5,
    onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
    const results: string[] = [];
    const total = files.length;
    let completed = 0;

    // Split files into chunks
    for (let i = 0; i < files.length; i += concurrency) {
        const chunk = files.slice(i, i + concurrency);
        const chunkPromises = chunk.map(async (file) => {
            const url = await uploadToSupabase(file);
            completed++;
            if (onProgress) onProgress(completed, total);
            return url;
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
    }

    return results;
}

// Check if URL is from Supabase
export function isSupabaseUrl(url: string): boolean {
    return url.includes('supabase.co/storage');
}

// Delete file from Supabase Storage
export async function deleteFromSupabase(url: string): Promise<void> {
    if (!isSupabaseUrl(url)) return;

    try {
        // Extract file path from URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/board-files/uploads/filename.ext
        const urlParts = url.split('/board-files/');
        if (urlParts.length < 2) return;

        const filePath = urlParts[1];

        const { error } = await supabase.storage
            .from('board-files')
            .remove([filePath]);

        if (error) {
            console.error('Supabase delete error:', error);
        }
    } catch (error) {
        console.error('Failed to delete from Supabase:', error);
    }
}

// Check if URL is from Cloudinary
export function isCloudinaryUrl(url: string): boolean {
    return url.includes('cloudinary.com');
}

// Delete file from Cloudinary (requires API route)
export async function deleteFromCloudinary(url: string): Promise<void> {
    if (!isCloudinaryUrl(url)) return;

    try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
            console.error('No authenticated user found for deletion');
            return;
        }

        // Extract public_id from URL
        // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/filename.ext
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        if (!match) return;

        const publicId = match[1];

        // Call our API route to delete from Cloudinary
        await fetch('/api/cloudinary-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ publicId }),
        });
    } catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
    }
}

// Delete file from any storage (auto-detect)
export async function deleteFileFromStorage(url: string): Promise<void> {
    if (!url) return;

    if (isSupabaseUrl(url)) {
        await deleteFromSupabase(url);
    } else if (isCloudinaryUrl(url)) {
        await deleteFromCloudinary(url);
    }
}
