'use client';

import { useMemo, useState } from 'react';
import { Note } from '@/types';
import { X, FolderOpen, Image, FileText, FileSpreadsheet, Presentation, File, Download, ExternalLink, ChevronDown, ChevronRight, Loader2, Square, CheckSquare, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    notes: Note[];
}

interface FileItem {
    url: string;
    name: string;
    noteId: string;
    authorName: string;
    createdAt: any;
    extension: string;
}

type CategoryKey = 'images' | 'pdfs' | 'word' | 'excel' | 'presentations' | 'media' | 'other';

export function FileManagerModal({ isOpen, onClose, notes }: FileManagerModalProps) {
    const { t, language } = useTranslation();
    const [expandedCategories, setExpandedCategories] = useState<Set<CategoryKey>>(new Set(['images', 'pdfs']));
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const CATEGORIES: Record<CategoryKey, {
        label: string;
        icon: any;
        extensions: string[];
        color: string;
        bgColor: string;
    }> = {
        images: {
            label: language === 'tr' ? 'Resimler' : 'Images',
            icon: Image,
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'],
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50 border-emerald-100'
        },
        pdfs: {
            label: language === 'tr' ? 'PDF Dosyaları' : 'PDF Files',
            icon: FileText,
            extensions: ['pdf'],
            color: 'text-rose-600',
            bgColor: 'bg-rose-50 border-rose-100'
        },
        word: {
            label: language === 'tr' ? 'Word Belgeleri' : 'Word Documents',
            icon: FileText,
            extensions: ['doc', 'docx'],
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 border-blue-100'
        },
        excel: {
            label: language === 'tr' ? 'Excel Tabloları' : 'Excel Spreadsheets',
            icon: FileSpreadsheet,
            extensions: ['xls', 'xlsx', 'csv'],
            color: 'text-green-600',
            bgColor: 'bg-green-50 border-green-100'
        },
        presentations: {
            label: language === 'tr' ? 'Sunumlar' : 'Presentations',
            icon: Presentation,
            extensions: ['ppt', 'pptx'],
            color: 'text-orange-600',
            bgColor: 'bg-orange-50 border-orange-100'
        },
        media: {
            label: language === 'tr' ? 'Medya (Ses/Video)' : 'Media (Audio/Video)',
            icon: Archive, // Using Archive or maybe Mic/Play? Mic is good for audio.
            extensions: ['mp3', 'wav', 'ogg', 'mp4', 'mov', 'webm', 'm4a', 'aac'],
            color: 'text-purple-600',
            bgColor: 'bg-purple-50 border-purple-100'
        },
        other: {
            label: language === 'tr' ? 'Diğer Dosyalar' : 'Other Files',
            icon: File,
            extensions: [],
            color: 'text-stone-600',
            bgColor: 'bg-stone-50 border-stone-100'
        },
    };

    // Extract files from notes and categorize them
    const categorizedFiles = useMemo(() => {
        const files: Record<CategoryKey | 'media', FileItem[]> = {
            images: [],
            pdfs: [],
            word: [],
            excel: [],
            presentations: [],
            media: [], // Added for audio/video
            other: [],
        };

        notes.forEach(note => {
            // 1. Gather all potential files from this note
            const noteFiles: { url: string; name: string }[] = [];

            // Add legacy single file fields
            if (note.imageUrl) noteFiles.push({ url: note.imageUrl, name: note.imageUrl.split('/').pop() || (language === 'tr' ? 'Resim' : 'Image') });
            if (note.fileUrl) noteFiles.push({ url: note.fileUrl, name: note.fileUrl.split('/').pop() || (language === 'tr' ? 'Dosya' : 'File') });
            if (note.audioUrl) noteFiles.push({ url: note.audioUrl, name: note.audioUrl.split('/').pop() || (language === 'tr' ? 'Ses' : 'Audio') });

            // Add new multi-file array
            if (note.files && Array.isArray(note.files)) {
                note.files.forEach(f => {
                    noteFiles.push({ url: f.url, name: f.name });
                });
            }

            // 2. Process and categorize each file
            noteFiles.forEach(f => {
                const urlPath = f.url.split('?')[0];
                const ext = urlPath.split('.').pop()?.toLowerCase() || '';

                const fileItem: FileItem = {
                    url: f.url,
                    name: f.name,
                    noteId: note.id,
                    authorName: note.authorName || 'Anonymous',
                    createdAt: note.createdAt,
                    extension: ext,
                };

                // Find matching category
                let matched = false;

                for (const [key, category] of Object.entries(CATEGORIES)) {
                    if (key === 'other') continue;
                    if (category.extensions.includes(ext)) {
                        files[key as CategoryKey].push(fileItem);
                        matched = true;
                        break;
                    }
                }

                // If no match, put in other
                if (!matched && ext) {
                    files.other.push(fileItem);
                }
            });
        });

        return files;
    }, [notes, language]);

    const totalFiles = useMemo(() => {
        return Object.values(categorizedFiles).reduce((sum, arr) => sum + arr.length, 0);
    }, [categorizedFiles]);

    const toggleCategory = (key: CategoryKey | 'media') => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            const k = key as any;
            if (next.has(k)) {
                next.delete(k);
            } else {
                next.add(k);
            }
            return next;
        });
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
    };

    const getDownloadUrl = (url: string) => {
        if (!url.includes('cloudinary')) return url;
        return url.replace('/upload/', '/upload/fl_attachment/');
    };

    // Toggle file selection
    const toggleFileSelection = (fileUrl: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(fileUrl)) {
                next.delete(fileUrl);
            } else {
                next.add(fileUrl);
            }
            return next;
        });
    };

    // Select/deselect all files
    const toggleSelectAll = () => {
        const allFiles = Object.values(categorizedFiles).flat();
        if (selectedFiles.size === allFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(allFiles.map(f => f.url)));
        }
    };

    // Download selected files as ZIP
    const handleBulkDownload = async () => {
        if (selectedFiles.size === 0) return;

        setIsDownloading(true);
        setDownloadProgress(0);

        try {
            const zip = new JSZip();
            const filesToDownload = Object.values(categorizedFiles)
                .flat()
                .filter(f => selectedFiles.has(f.url));

            let completed = 0;

            for (const file of filesToDownload) {
                try {
                    const response = await fetch(file.url);
                    const blob = await response.blob();
                    zip.file(file.name, blob);
                } catch (err) {
                    console.error(`Failed to download: ${file.name}`, err);
                }
                completed++;
                setDownloadProgress(Math.round((completed / filesToDownload.length) * 100));
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const timestamp = new Date().toISOString().slice(0, 10);
            saveAs(zipBlob, `pano-dosyalari-${timestamp}.zip`);

            setSelectedFiles(new Set());
        } catch (error) {
            console.error('Bulk download error:', error);
            alert(language === 'tr' ? 'Dosyalar indirilemedi.' : 'Failed to download files.');
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <FolderOpen size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-stone-800">
                                {language === 'tr' ? 'Dosya Yöneticisi' : 'File Manager'}
                            </h2>
                            <p className="text-xs text-stone-400">
                                {language === 'tr'
                                    ? `${totalFiles} dosya bulundu`
                                    : `${totalFiles} file${totalFiles !== 1 ? 's' : ''} found`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Bulk Actions Bar */}
                {totalFiles > 0 && (
                    <div className="flex items-center justify-between px-5 py-3 bg-stone-50 border-b border-stone-200">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
                        >
                            {selectedFiles.size === Object.values(categorizedFiles).flat().length ? (
                                <CheckSquare size={18} className="text-indigo-600" />
                            ) : (
                                <Square size={18} />
                            )}
                            <span>
                                {language === 'tr'
                                    ? (selectedFiles.size > 0 ? `${selectedFiles.size} seçili` : 'Tümünü seç')
                                    : (selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select all')}
                            </span>
                        </button>

                        <button
                            onClick={handleBulkDownload}
                            disabled={selectedFiles.size === 0 || isDownloading}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                selectedFiles.size > 0
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-stone-200 text-stone-400 cursor-not-allowed"
                            )}
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>{downloadProgress}%</span>
                                </>
                            ) : (
                                <>
                                    <Archive size={16} />
                                    <span>{language === 'tr' ? 'ZIP İndir' : 'Download ZIP'}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {totalFiles === 0 ? (
                        <div className="text-center py-12 text-stone-400">
                            <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
                            <p>
                                {language === 'tr'
                                    ? 'Bu panoda henüz dosya yok.'
                                    : 'No files in this board yet.'}
                            </p>
                        </div>
                    ) : (
                        Object.entries(CATEGORIES).map(([key, category]) => {
                            const files = categorizedFiles[key as CategoryKey];
                            if (files.length === 0) return null;

                            const isExpanded = expandedCategories.has(key as CategoryKey);
                            const Icon = category.icon;

                            return (
                                <div key={key} className="border border-stone-200 rounded-xl overflow-hidden">
                                    {/* Category Header */}
                                    <button
                                        onClick={() => toggleCategory(key as CategoryKey)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 transition-colors",
                                            category.bgColor
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={20} className={category.color} />
                                            <span className={cn("font-medium", category.color)}>{category.label}</span>
                                            <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full text-stone-500">
                                                {files.length}
                                            </span>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown size={18} className="text-stone-400" />
                                        ) : (
                                            <ChevronRight size={18} className="text-stone-400" />
                                        )}
                                    </button>

                                    {/* File List */}
                                    {isExpanded && (
                                        <div className="divide-y divide-stone-100 bg-white">
                                            {files.map((file, idx) => (
                                                <div
                                                    key={`${file.noteId}-${idx}`}
                                                    className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors group"
                                                >
                                                    <div className="flex-1 min-w-0 flex items-center gap-3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.url); }}
                                                            className="shrink-0 text-stone-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            {selectedFiles.has(file.url) ? (
                                                                <CheckSquare size={18} className="text-indigo-600" />
                                                            ) : (
                                                                <Square size={18} />
                                                            )}
                                                        </button>
                                                        <div className="min-w-0">
                                                            <p className="text-sm text-stone-700 truncate font-medium">
                                                                {file.name}
                                                            </p>
                                                            <p className="text-[10px] text-stone-400">
                                                                {file.authorName} • {formatDate(file.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <a
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title={language === 'tr' ? 'Görüntüle' : 'View'}
                                                        >
                                                            <ExternalLink size={16} />
                                                        </a>
                                                        <a
                                                            href={getDownloadUrl(file.url)}
                                                            download
                                                            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title={language === 'tr' ? 'İndir' : 'Download'}
                                                        >
                                                            <Download size={16} />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
