'use client';

import { useState } from 'react';
import { Loader2, UploadCloud, Cloud, Database, X, File as FileIcon } from 'lucide-react';
import { uploadToSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface CloudinaryUploadWidgetProps {
    onUploadSuccess: (url: string) => void;
    uploadPreset?: string;
    // Yeni prop'lar - toplu yükleme için
    multiple?: boolean;
    onMultipleUploadSuccess?: (urls: { url: string; name: string; type?: string }[]) => void;
}

// File size limit for Cloudinary (10MB)
const CLOUDINARY_LIMIT = 10 * 1024 * 1024;
// Maximum file size for Supabase (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface UploadingFile {
    file: File;
    progress: 'pending' | 'uploading' | 'done' | 'error';
    url?: string;
    target?: 'cloudinary' | 'supabase';
}

export function CloudinaryUploadWidget({
    onUploadSuccess,
    uploadPreset = 'section',
    multiple = false,
    onMultipleUploadSuccess
}: CloudinaryUploadWidgetProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadTarget, setUploadTarget] = useState<'cloudinary' | 'supabase' | null>(null);

    // Toplu yükleme için state'ler
    const [pendingFiles, setPendingFiles] = useState<UploadingFile[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string; type?: string }[]>([]);

    // Cloudinary Settings
    const CLOUD_NAME = 'dqgx6wpbt';

    const allowedTypes = [
        'image/',
        'video/',
        'audio/',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    const isFileAllowed = (file: File) => {
        return file.type.startsWith('image/') ||
            file.type.startsWith('video/') ||
            file.type.startsWith('audio/') ||
            allowedTypes.includes(file.type);
    };

    // Upload to Cloudinary
    const uploadToCloudinary = async (file: File, preset: string): Promise<string> => {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const sanitizedName = fileNameWithoutExt
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_+/g, '_');
        const publicId = `${Date.now()}_${sanitizedName}`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);
        formData.append('public_id', publicId);

        let resourceType = 'auto';
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            resourceType = 'video';
        }

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error('Cloudinary yükleme başarısız oldu');
        }

        const data = await response.json();
        return data.secure_url;
    };

    // Tek dosya yükleme handler'ı
    const handleSingleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isFileAllowed(file)) {
            setError('Desteklenmeyen dosya formatı. (Desteklenenler: Resim, Video, Ses, PDF, Word, Excel, PowerPoint)');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('Dosya boyutu 50MB\'dan küçük olmalıdır.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            let url: string;

            if (file.size <= CLOUDINARY_LIMIT) {
                setUploadTarget('cloudinary');
                url = await uploadToCloudinary(file, uploadPreset);
            } else {
                setUploadTarget('supabase');
                url = await uploadToSupabase(file);
            }

            onUploadSuccess(url);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Dosya yüklenirken bir hata oluştu.');
        } finally {
            setUploading(false);
            setUploadTarget(null);
        }
    };

    // Çoklu dosya seçme handler'ı
    const handleMultipleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Dosyaları filtrele
        const validFiles: File[] = [];
        for (const file of files) {
            if (!isFileAllowed(file)) {
                setError(`"${file.name}" desteklenmeyen format.`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                setError(`"${file.name}" dosyası 50MB'dan büyük.`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        // Yükleme başlat
        setUploading(true);
        setError(null);

        const newUploadedFiles: { url: string; name: string; type?: string }[] = [...uploadedFiles];

        for (const file of validFiles) {
            try {
                let url: string;

                if (file.size <= CLOUDINARY_LIMIT) {
                    setUploadTarget('cloudinary');
                    url = await uploadToCloudinary(file, uploadPreset);
                } else {
                    setUploadTarget('supabase');
                    url = await uploadToSupabase(file);
                }

                newUploadedFiles.push({ url, name: file.name, type: file.type });
            } catch (err: any) {
                console.error(`${file.name} yüklenemedi:`, err);
                setError(`"${file.name}" yüklenemedi.`);
            }
        }

        setUploadedFiles(newUploadedFiles);
        setUploading(false);
        setUploadTarget(null);

        // Callback'i çağır
        if (onMultipleUploadSuccess && newUploadedFiles.length > 0) {
            onMultipleUploadSuccess(newUploadedFiles);
        }

        // Input'u temizle
        e.target.value = '';
    };

    // Yüklenen dosyayı kaldır
    const removeUploadedFile = (index: number) => {
        const newFiles = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(newFiles);
        if (onMultipleUploadSuccess) {
            onMultipleUploadSuccess(newFiles);
        }
    };

    // Dosya uzantısına göre renk belirleme
    const getFileColor = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'bg-purple-100 text-purple-600';
        if (ext === 'pdf') return 'bg-rose-100 text-rose-600';
        if (['doc', 'docx'].includes(ext)) return 'bg-blue-100 text-blue-600';
        if (['xls', 'xlsx'].includes(ext)) return 'bg-emerald-100 text-emerald-600';
        if (['ppt', 'pptx'].includes(ext)) return 'bg-orange-100 text-orange-600';
        if (['mp3', 'wav', 'ogg', 'webm'].includes(ext)) return 'bg-pink-100 text-pink-600';
        if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'bg-indigo-100 text-indigo-600';
        return 'bg-stone-100 text-stone-600';
    };

    // Çoklu yükleme UI'ı
    if (multiple) {
        return (
            <div className="space-y-3">
                {/* Yükleme Alanı */}
                <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center hover:bg-stone-50 transition-colors">
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2 text-stone-500">
                            <div className="relative">
                                <Loader2 size={24} className="animate-spin" />
                                {uploadTarget === 'supabase' && (
                                    <Database size={12} className="absolute -bottom-1 -right-1 text-emerald-500" />
                                )}
                                {uploadTarget === 'cloudinary' && (
                                    <Cloud size={12} className="absolute -bottom-1 -right-1 text-blue-500" />
                                )}
                            </div>
                            <span className="text-sm">
                                {uploadTarget === 'supabase'
                                    ? 'Büyük dosya yükleniyor (Supabase)...'
                                    : 'Dosyalar yükleniyor...'}
                            </span>
                        </div>
                    ) : (
                        <>
                            <input
                                type="file"
                                id="multi-file-upload"
                                className="hidden"
                                multiple
                                accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.mp4,.wav,.webm,.ogg,.mov"
                                onChange={handleMultipleFileChange}
                            />
                            <label
                                htmlFor="multi-file-upload"
                                className="cursor-pointer flex flex-col items-center gap-2"
                            >
                                <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-500">
                                    <UploadCloud size={20} />
                                </div>
                                <div className="text-sm">
                                    <span className="font-semibold text-stone-700">Dosya Seç</span>
                                    <span className="text-stone-400"> veya sürükle bırak</span>
                                </div>
                                <p className="text-xs text-stone-400 mt-1">
                                    Birden fazla dosya seçebilirsiniz (Max 50MB/dosya)
                                </p>
                                <p className="text-[10px] text-stone-300">
                                    ≤10MB: Cloudinary • &gt;10MB: Supabase
                                </p>
                            </label>
                        </>
                    )}
                    {error && (
                        <p className="text-xs text-red-500 mt-2">{error}</p>
                    )}
                </div>

                {/* Yüklenen Dosyalar Listesi */}
                {uploadedFiles.length > 0 && (
                    <div className="space-y-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <p className="text-xs font-medium text-stone-500 mb-2">
                            {uploadedFiles.length} dosya yüklendi
                        </p>
                        {uploadedFiles.map((file, idx) => {
                            const ext = file.name.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';
                            return (
                                <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-stone-100">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold",
                                        getFileColor(file.name)
                                    )}>
                                        {ext}
                                    </div>
                                    <span className="text-sm text-stone-700 truncate flex-1">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeUploadedFile(idx)}
                                        className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // Tek dosya yükleme UI'ı (mevcut davranış)
    return (
        <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center hover:bg-stone-50 transition-colors">
            {uploading ? (
                <div className="flex flex-col items-center gap-2 text-stone-500">
                    <div className="relative">
                        <Loader2 size={24} className="animate-spin" />
                        {uploadTarget === 'supabase' && (
                            <Database size={12} className="absolute -bottom-1 -right-1 text-emerald-500" />
                        )}
                        {uploadTarget === 'cloudinary' && (
                            <Cloud size={12} className="absolute -bottom-1 -right-1 text-blue-500" />
                        )}
                    </div>
                    <span className="text-sm">
                        {uploadTarget === 'supabase'
                            ? 'Büyük dosya yükleniyor (Supabase)...'
                            : 'Yükleniyor...'}
                    </span>
                </div>
            ) : (
                <>
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.mp4,.wav,.webm,.ogg,.mov"
                        onChange={handleSingleFileChange}
                    />
                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                    >
                        <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-500">
                            <UploadCloud size={20} />
                        </div>
                        <div className="text-sm">
                            <span className="font-semibold text-stone-700">Dosya Seç</span>
                            <span className="text-stone-400"> veya sürükle bırak</span>
                        </div>
                        <p className="text-xs text-stone-400 mt-1">
                            Resim, Video, Ses, PDF, Word, Excel, PPT (Max 50MB)
                        </p>
                        <p className="text-[10px] text-stone-300">
                            ≤10MB: Cloudinary • &gt;10MB: Supabase
                        </p>
                    </label>
                </>
            )}
            {error && (
                <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
        </div>
    );
}
