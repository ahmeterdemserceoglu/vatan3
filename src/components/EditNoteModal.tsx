'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Note } from '@/types';
import { X, Save, Trash2, Upload, FileText, Loader2, Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { updateNote } from '@/lib/notes';
import { uploadToSupabase, uploadMultipleToSupabase, deleteFileFromStorage } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { RichTextEditor } from './RichTextEditor';

interface EditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note;
}

export function EditNoteModal({ isOpen, onClose, note }: EditNoteModalProps) {
    const { t, language } = useTranslation();
    const [content, setContent] = useState(note.content);
    const [existingFiles, setExistingFiles] = useState<{ url: string; name: string; type?: string }[]>([]);
    const [filesToDelete, setFilesToDelete] = useState<string[]>([]); // URLs to delete
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Normalize legacy files into existingFiles
        const normalized: { url: string; name: string; type?: string }[] = [...(note.files || [])];

        // Add single fields if not already in files array (matching by URL)
        const existingUrls = new Set(normalized.map(f => f.url));

        if (note.imageUrl && !existingUrls.has(note.imageUrl)) {
            normalized.push({ url: note.imageUrl, name: note.imageUrl.split('/').pop() || (language === 'tr' ? 'Resim' : 'Image'), type: 'image' });
        }
        if (note.fileUrl && !existingUrls.has(note.fileUrl)) {
            normalized.push({ url: note.fileUrl, name: note.fileUrl.split('/').pop() || (language === 'tr' ? 'Dosya' : 'File') });
        }
        if (note.audioUrl && !existingUrls.has(note.audioUrl)) {
            normalized.push({ url: note.audioUrl, name: note.audioUrl.split('/').pop() || (language === 'tr' ? 'Ses' : 'Audio'), type: 'audio' });
        }

        setExistingFiles(normalized);
    }, [note, language]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // 50MB Limit Kontrolü
        const MAX_SIZE = 50 * 1024 * 1024;
        const largeFiles = files.filter(f => f.size > MAX_SIZE);
        if (largeFiles.length > 0) {
            alert(language === 'tr'
                ? `Bazı dosyalar 50MB sınırını aşıyor: ${largeFiles.map(f => f.name).join(', ')}`
                : `Some files exceed the 50MB limit: ${largeFiles.map(f => f.name).join(', ')}`
            );
            return;
        }

        setPendingFiles(prev => [...prev, ...files]);
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // 50MB Limit Kontrolü
        const MAX_SIZE = 50 * 1024 * 1024;
        const largeFiles = files.filter(f => f.size > MAX_SIZE);
        if (largeFiles.length > 0) {
            alert(language === 'tr'
                ? `Bazı dosyalar 50MB sınırını aşıyor: ${largeFiles.map(f => f.name).join(', ')}`
                : `Some files exceed the 50MB limit: ${largeFiles.map(f => f.name).join(', ')}`
            );
            return;
        }

        setPendingFiles(prev => [...prev, ...files]);
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const markFileForDeletion = (url: string) => {
        setExistingFiles(prev => prev.filter(f => f.url !== url));
        setFilesToDelete(prev => [...prev, url]);
    };

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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Delete marked files from storage
            for (const url of filesToDelete) {
                try {
                    await deleteFileFromStorage(url);
                } catch (e) {
                    console.error('Failed to delete file:', url, e);
                    // Continue even if delete fails
                }
            }

            // 2. Upload new files
            let newUploadedFiles: { url: string; name: string; type?: string }[] = [];
            if (pendingFiles.length > 0) {
                setUploadProgress({ completed: 0, total: pendingFiles.length });

                // Batch upload with concurrency limit (5)
                const urls = await uploadMultipleToSupabase(
                    pendingFiles,
                    5,
                    (completed, total) => setUploadProgress({ completed, total })
                );

                newUploadedFiles = urls.map((url, idx) => ({
                    url,
                    name: pendingFiles[idx].name,
                    type: pendingFiles[idx].type
                }));
            }

            // 3. Combine existing (not deleted) and new files
            const finalFiles = [...existingFiles, ...newUploadedFiles];

            // 4. Update Note
            const updates: Partial<Note> = {
                content,
                updatedAt: new Date() as any // Client side date for immediate feel, serverTimestamp in lib usually overrides
            };

            if (finalFiles.length > 0) {
                updates.files = finalFiles;

                // If it's an image type, set the first image as imageUrl
                const firstImage = finalFiles.find(f => f.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(f.name.split('.').pop()?.toLowerCase() || ''));
                if (firstImage) {
                    updates.imageUrl = firstImage.url;
                }

                if (note.type === 'text') {
                    updates.type = 'file';
                }
            } else {
                updates.files = [];
                // Clear single fields if all files removed
                updates.imageUrl = '';
                updates.fileUrl = '';
                updates.audioUrl = '';

                if (note.type === 'file') {
                    updates.type = 'text';
                }
            }
            // If all files removed and it was 'file', maybe revert to 'text'?
            if (finalFiles.length === 0 && note.type === 'file') {
                updates.type = 'text';
            }

            await updateNote(note.id, updates);
            onClose();

        } catch (error) {
            console.error('Update failed:', error);
            alert(language === 'tr' ? 'Güncelleme sırasında bir hata oluştu.' : 'An error occurred while updating.');
        } finally {
            setIsSaving(false);
        }
    };



    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
                    <h2 className="text-lg font-semibold text-stone-800">
                        {language === 'tr' ? 'Notu Düzenle' : 'Edit Note'}
                    </h2>
                    <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">

                    {/* Text Editor */}
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-2">
                            {language === 'tr' ? 'İçerik' : 'Content'}
                        </label>
                        <RichTextEditor
                            content={content}
                            onChange={setContent}
                            placeholder={language === 'tr' ? 'Not içeriği...' : 'Note content...'}
                            minHeight="120px"
                        />
                    </div>

                    {/* File Management */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "space-y-3 rounded-xl transition-all",
                            isDragging && "bg-indigo-50/50 ring-2 ring-indigo-500 ring-dashed p-3"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-stone-600">
                                {language === 'tr' ? 'Dosyalar' : 'Files'}
                            </label>
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-medium transition-colors">
                                <Upload size={14} />
                                <span>{language === 'tr' ? 'Dosya Ekle' : 'Add File'}</span>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.rar"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </label>
                        </div>

                        <div className="space-y-2">
                            {/* Existing Files */}
                            {existingFiles.map((file, idx) => (
                                <div key={`existing-${idx}`} className="flex items-center gap-3 p-2 bg-stone-50 rounded-lg border border-stone-200 group">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold", getFileColor(file.name))}>
                                        {file.name.split('.').pop()?.toUpperCase().slice(0, 4)}
                                    </div>
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-stone-700 truncate flex-1 hover:underline">
                                        {file.name}
                                    </a>
                                    <button
                                        onClick={() => markFileForDeletion(file.url)}
                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title={language === 'tr' ? 'Sil' : 'Delete'}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            {/* Pending Files with Preview */}
                            {pendingFiles.map((file, idx) => (
                                <div key={`pending-${idx}`} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg border border-amber-200 border-dashed group">
                                    {file.type.startsWith('image/') ? (
                                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt="preview"
                                                className="w-full h-full object-cover"
                                                onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                            />
                                        </div>
                                    ) : (
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold", getFileColor(file.name))}>
                                            {file.name.split('.').pop()?.toUpperCase().slice(0, 4)}
                                        </div>
                                    )}
                                    <span className="text-sm text-stone-700 truncate flex-1">
                                        {file.name} <span className="text-amber-600 text-[10px] font-bold ml-1">({language === 'tr' ? 'YENİ' : 'NEW'})</span>
                                    </span>
                                    <button
                                        onClick={() => removePendingFile(idx)}
                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}

                            {existingFiles.length === 0 && pendingFiles.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50 text-stone-400 text-sm">
                                    {language === 'tr' ? 'Dosya yok' : 'No files attached'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-stone-100 bg-stone-50 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-stone-200 rounded-lg text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                        disabled={isSaving}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-2.5 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {uploadProgress.total > 0 && uploadProgress.completed < uploadProgress.total
                                    ? (language === 'tr'
                                        ? `Yükleniyor (${uploadProgress.completed}/${uploadProgress.total})`
                                        : `Uploading (${uploadProgress.completed}/${uploadProgress.total})`)
                                    : (language === 'tr' ? 'Kaydediliyor...' : 'Saving...')}
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                {t('common.save')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
