'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Note } from '@/types';
import { useStore } from '@/store/useStore';
import { deleteNote, likeNote, unlikeNote, votePoll, toggleReaction, togglePin } from '@/lib/notes';
import {
    Heart, Trash2, Edit2, X, ExternalLink, MessageSquare,
    MoreVertical, Copy, Download, FileText, FileSpreadsheet,
    Presentation, File, Smile, ThumbsUp, Star, PartyPopper, Pin, Play, Pause, Volume2,
    Link, Image as ImageIcon, Lock, Unlock, Check, ArrowRightLeft, Loader2,
    Video, AlertTriangle
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import { Avatar } from './Avatar';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from './ToastProvider';
import { Lightbox } from './Lightbox';
import { SkeletonLinkPreview } from './Skeleton';
import { RichTextContent } from './RichTextEditor';
import { EditNoteModal } from './EditNoteModal';
import { toggleLockComments } from '@/lib/notes';
import { haptic, nativeShare } from '@/lib/native';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';

interface NoteCardProps {
    note: Note;
    canEdit: boolean;
    className?: string;
    onOpenComments: (note: Note) => void;
    boardTitle?: string;
    isHighlighted?: boolean;
    canDownloadFiles?: boolean;
}

// Pastel color mapping for matte look (slightly darker for visibility)
const noteColors: Record<string, string> = {
    '#fef3c7': 'bg-amber-100 border-amber-300/60',      // amber/yellow
    '#dbeafe': 'bg-blue-100 border-blue-300/60',        // blue
    '#dcfce7': 'bg-green-100 border-green-300/60',      // green (old)
    '#d1fae5': 'bg-emerald-100 border-emerald-300/60',  // green (new from NOTE_COLORS)
    '#fce7f3': 'bg-pink-100 border-pink-300/60',        // pink
    '#f3e8ff': 'bg-purple-100 border-purple-300/60',    // purple
    '#ffedd5': 'bg-orange-100 border-orange-300/60',    // orange (old)
    '#fed7aa': 'bg-orange-200 border-orange-300/60',    // orange (new from NOTE_COLORS)
    '#e0e7ff': 'bg-indigo-100 border-indigo-300/60',    // indigo
    '#fecaca': 'bg-red-100 border-red-300/60',          // red
    '#ffffff': 'bg-white border-stone-200',             // default white
};

// Reactions array removed as it was unused

// Premium Reaction Configuration (labels will be translated in component)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REACTION_CONFIG: Record<string, { icon: any, color: string, label: string }> = {
    '👍': { icon: ThumbsUp, color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'Like' },
    '❤️': { icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-100', label: 'Love' },
    '😂': { icon: Smile, color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'Funny' },
    '😮': { icon: Star, color: 'text-purple-600 bg-purple-50 border-purple-100', label: 'Wow' },
    '👏': { icon: PartyPopper, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'Congrats' },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NoteCard({ note, canEdit, className, onOpenComments, boardTitle, isHighlighted, onMove, canDownloadFiles = true }: NoteCardProps & { onMove?: (note: Note) => void }) {
    const { user } = useStore();
    const { t, language } = useTranslation();
    const { showPermissionError, showToast } = useToast();
    const [showEditModal, setShowEditModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [menuRect, setMenuRect] = useState<{ top: number; right: number; bottom: number } | null>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showFileDownloadMenu, setShowFileDownloadMenu] = useState(false);
    const [showFilePreviewMenu, setShowFilePreviewMenu] = useState(false);
    const [showFullContentModal, setShowFullContentModal] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    // Allow fallback to 0, then update from metadata
    const [duration, setDuration] = useState(note.audioDuration || 0);
    const [mediaImageError, setMediaImageError] = useState(false);
    const [linkImageError, setLinkImageError] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Link Preview State for existing notes
    const [previewData, setPreviewData] = useState<{
        title?: string;
        description?: string;
        image?: string;
        domain?: string;
    }>({});
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(false);

    // Fetch Link Preview if missing (for legacy notes)
    useEffect(() => {
        if (note.type === 'link' && note.linkUrl && !note.linkDescription && !note.linkDomain) {
            setPreviewLoading(true);
            setPreviewError(false);
            const fetchPreview = async () => {
                try {
                    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(note.linkUrl!)}`);
                    const data = await res.json();

                    // Check if API returned error flag (even with 200 OK)
                    if (data.error) {
                        setPreviewError(true);
                        // Still set domain for nicer fallback display
                        setPreviewData({
                            domain: data.hostname || undefined,
                        });
                    } else {
                        setPreviewData({
                            title: data.title,
                            description: data.description,
                            image: data.image,
                            domain: data.hostname,
                        });
                    }
                } catch {
                    // Silently handle preview errors - will show default link
                    setPreviewError(true);
                } finally {
                    setPreviewLoading(false);
                }
            };
            fetchPreview();
        }
    }, [note.type, note.linkUrl, note.linkDescription, note.linkDomain, note.id]);


    // Derived States
    const isLiked = user ? note.likes?.includes(user.uid) : false;
    const isOwner = user?.uid === note.authorId;
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    // Handle Body Scroll Lock & Back Button
    useEffect(() => {
        if (showMenu) {
            // Lock body scroll
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';

            // Push a fake state to the history so 'Back' closes the menu
            window.history.pushState({ menuOpen: true }, '');

            const handleClose = () => {
                setShowMenu(false);
                setShowFileDownloadMenu(false);
                setShowFilePreviewMenu(false);

                if (window.history.state?.menuOpen) {
                    window.history.back();
                }
            };

            const handlePopState = () => {
                setShowMenu(false);
                setShowFileDownloadMenu(false);
                setShowFilePreviewMenu(false);
            };

            window.addEventListener('resize', handleClose);
            window.addEventListener('popstate', handlePopState);

            return () => {
                document.body.style.overflow = originalStyle;
                window.removeEventListener('resize', handleClose);
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [showMenu]);

    // Handle Back Button for Delete Confirmation
    useEffect(() => {
        if (showDeleteConfirm) {
            window.history.pushState({ deleteNoteConfirm: true }, '');
            const handlePopState = () => setShowDeleteConfirm(false);
            window.addEventListener('popstate', handlePopState);
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = originalStyle;
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.deleteNoteConfirm) window.history.back();
            };
        }
    }, [showDeleteConfirm]);
    const canDelete = isOwner || isTeacher;
    // Move permission same as delete/edit for now: Owner or Teacher
    const canMove = isOwner || isTeacher;

    const colorClasses = noteColors[note.color] || 'bg-white border-stone-200';

    // Poll Stats
    const totalVotes = note.pollVotes ? Object.values(note.pollVotes).reduce((acc, curr) => acc + curr.length, 0) : 0;
    const userVoteIndex = note.pollVotes
        ? Object.entries(note.pollVotes).find(([, votes]) => votes.includes(user?.uid || ''))?.[0]
        : undefined;

    // Content Handling
    const attachmentUrl = note.imageUrl || note.linkUrl;
    // Check for multiple files
    const hasMultipleFiles = note.files && note.files.length > 0;
    // hasAnyAttachment removed as it was unused
    // All downloadable files (single + multiple)
    const allFiles = [
        ...(attachmentUrl ? [{ url: attachmentUrl, name: note.fileName || 'Ek Dosya' }] : []),
        ...(note.files || [])
    ];
    // Show "Read More" if content is longer than 300 characters
    const isLongContent = note.content && note.content.length > 300;

    // --- Actions ---

    const handleLike = async () => {
        if (!user) return;
        haptic.impact(ImpactStyle.Light);
        try {
            if (isLiked) {
                await unlikeNote(note.id, user.uid);
            } else {
                await likeNote(
                    note.id,
                    user.uid,
                    user.displayName,
                    note.authorId,
                    note.boardId,
                    boardTitle
                );
            }
        } catch (error) { console.error('Beğeni hatası:', error); }
    };

    const handleDelete = () => {
        haptic.impact(ImpactStyle.Medium);
        setShowDeleteConfirm(true);
        setShowMenu(false);
    };

    const confirmDelete = async () => {
        haptic.notification(NotificationType.Warning);
        setIsDeleting(true);
        setShowDeleteConfirm(false);
        try {
            await deleteNote(note.id);
            showToast(language === 'tr' ? 'Not silindi' : 'Note deleted', 'success');
        } catch (error) {
            console.error('Silme hatası:', error);
            setIsDeleting(false);
            showToast(language === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
        }
    };

    const handleCopyText = () => {
        navigator.clipboard.writeText(note.content);
        setShowMenu(false);
    };

    const handleVote = async (optionIndex: number) => {
        if (!user) return;
        try {
            await votePoll(note.id, optionIndex, user.uid);
        } catch (error) { console.error('Oy verme hatası:', error); }
    };

    const handleReaction = async (emoji: string) => {
        if (!user) return;
        try {
            await toggleReaction(
                note.id,
                emoji,
                user.uid,
                user.displayName,
                note.authorId,
                note.boardId,
                boardTitle
            );
        } catch (error) { console.error('Tepki hatası:', error); }
    };

    const handlePin = async () => {
        haptic.impact(ImpactStyle.Light);
        try {
            await togglePin(note.id, !note.isPinned);
            setShowMenu(false);
            showToast(note.isPinned ? (language === 'tr' ? 'Sabitleme kaldırıldı' : 'Unpinned') : (language === 'tr' ? 'Not sabitlendi' : 'Note pinned'), 'success');
        } catch (error) {
            console.error('Error pinning:', error);
            showToast(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred', 'error');
        }
    };

    const handleToggleLock = async () => {
        try {
            await toggleLockComments(note.id, !note.isLocked);
            setShowMenu(false);
            showToast(note.isLocked ? (language === 'tr' ? 'Not kilidi açıldı' : 'Note unlocked') : (language === 'tr' ? 'Not kilitlendi' : 'Note locked'), 'success');
        } catch (error) {
            console.error('Error locking:', error);
            showToast(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred', 'error');
        }
    };

    const handleCopyNoteLink = async () => {
        try {
            const url = `${window.location.origin}${window.location.pathname}?highlightNote=${note.id}#note-${note.id}`;
            const shared = await nativeShare({
                title: language === 'tr' ? 'Notu Paylaş' : 'Share Note',
                text: note.content.substring(0, 100),
                url,
                dialogTitle: language === 'tr' ? 'Notu Paylaş' : 'Share Note'
            });

            setShowMenu(false);
            if (!shared) {
                showToast(language === 'tr' ? 'Not bağlantısı kopyalandı' : 'Note link copied', 'success');
            }
        } catch (err) {
            console.error('Failed to share:', err);
            showToast(language === 'tr' ? 'İşlem başarısız' : 'Failed to share', 'error');
        }
    };

    const handleExportAsImage = async () => {
        if (!cardRef.current) return;
        setIsExporting(true);
        setShowMenu(false);

        // Show preparing toast
        showToast(language === 'tr' ? 'Resim hazırlanıyor...' : 'Preparing image...', 'info');

        try {
            // Give a tiny bit of time for the menu to close fully
            await new Promise(resolve => setTimeout(resolve, 150));
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                backgroundColor: '#ffffff',
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                }
            });
            const link = document.createElement('a');
            link.download = `note-${note.id}.png`;
            link.href = dataUrl;
            link.click();
            showToast(language === 'tr' ? 'Resim başarıyla indirildi' : 'Image downloaded successfully', 'success');
        } catch (err) {
            console.error('Export failed:', err);
            showToast(language === 'tr' ? 'Dışa aktarma başarısız oldu' : 'Export failed', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadAllAsZip = async () => {
        if (allFiles.length < 2 || isZipping) return;

        setIsZipping(true);
        const zip = new JSZip();
        const toast = showPermissionError; // We can use toast to show progress if needed, but showPermissionError might not be suitable for progress.

        try {
            const usedNames = new Set<string>();
            const downloadPromises = allFiles.map(async (file) => {
                try {
                    const response = await fetch(file.url);
                    if (!response.ok) throw new Error(`Failed to fetch ${file.name}`);
                    const blob = await response.blob();

                    let name = file.name || `file_${Math.random().toString(36).substring(7)}`;
                    // Simple collision avoidance
                    let finalName = name;
                    let counter = 1;
                    while (usedNames.has(finalName)) {
                        const parts = name.split('.');
                        if (parts.length > 1) {
                            const ext = parts.pop();
                            finalName = `${parts.join('.')}_(${counter}).${ext}`;
                        } else {
                            finalName = `${name}_(${counter})`;
                        }
                        counter++;
                    }
                    usedNames.add(finalName);

                    zip.file(finalName, blob);
                } catch (error) {
                    console.error(`Error downloading ${file.name}:`, error);
                }
            });

            await Promise.all(downloadPromises);

            if (usedNames.size === 0) {
                throw new Error('No files could be downloaded');
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const zipName = `note_${note.id.substring(0, 8)}_files.zip`;
            saveAs(content, zipName);
            setShowMenu(false);
        } catch (error) {
            console.error('ZIP error:', error);
            showPermissionError(
                language === 'tr'
                    ? 'ZIP oluşturulurken bir hata oluştu. Lütfen tek tek indirmeyi deneyin.'
                    : 'Error creating ZIP. Please try downloading files individually.'
            );
        } finally {
            setIsZipping(false);
        }
    };

    // Helper URLs
    const getUrlWithOptimization = (url: string | undefined) => {
        if (!url || !url.includes('cloudinary')) return url || '';
        return url.replace('/upload/', '/upload/q_auto,f_auto/');
    };
    const getDownloadUrl = (url: string | undefined) => {
        if (!url) return '';
        if (!url.includes('cloudinary')) return url;
        return url.replace('/upload/', '/upload/fl_attachment/');
    };

    if (isDeleting) return null;

    return (
        <>
            <div
                ref={cardRef}
                id={`note-${note.id}`}
                className={cn(
                    "rounded-xl p-5 border shadow-matte hover:shadow-matte-md transition-all duration-200 flex flex-col h-full group relative overflow-visible",
                    colorClasses,
                    note.isPinned && "border-amber-400 ring-1 ring-amber-400 shadow-md",
                    isHighlighted && "animate-highlight-pulse ring-2 ring-blue-400",
                    isExporting && "shadow-none scale-100", // Added for export
                    className
                )}>
                {/* Pinned Indicator - z-[100] to appear above everything */}
                {note.isPinned && (
                    <div className="absolute -top-3 -right-3 bg-amber-400 text-white p-2 rounded-full shadow-lg z-[100] -rotate-45 pointer-events-none">
                        <Pin size={16} fill="currentColor" />
                    </div>
                )}

                <div className="flex items-center gap-2 mb-3 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                            src={note.authorPhotoURL}
                            name={note.authorName}
                            size="sm"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-700 truncate leading-tight">{note.authorName}</p>
                            <p className="text-[10px] text-stone-400 font-medium leading-tight">
                                {note.createdAt ? formatDate(note.createdAt) : ''}
                            </p>
                        </div>
                    </div>

                    {note.isLocked && (
                        <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-white/80 border border-stone-200/50 rounded-full shadow-sm" title={language === 'tr' ? 'Yorumlar Kapalı' : 'Comments Locked'}>
                            <Lock size={10} className="text-stone-500" />
                            <span className="text-[9px] font-black text-stone-500 uppercase tracking-tighter">LOCKED</span>
                        </div>
                    )}

                    <div className="flex-1" /> {/* Spacer to push menu to the right */}

                    <div className="relative shrink-0">
                        <button
                            ref={menuButtonRef}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className={cn(
                                "p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 rounded-lg transition-colors group-hover:opacity-100",
                                showMenu ? "opacity-100 bg-stone-100" : "opacity-100 md:opacity-0"
                            )}
                        >
                            <MoreVertical size={16} />
                        </button>

                        {showMenu && typeof document !== 'undefined' && createPortal(
                            <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4">
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[-1] animate-in fade-in duration-300"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(false);
                                        setShowFileDownloadMenu(false);
                                        setShowFilePreviewMenu(false);
                                    }}
                                />

                                {/* Modal / Bottom Sheet Container */}
                                <div
                                    className={cn(
                                        "bg-white overflow-y-auto custom-scrollbar shadow-[0_25px_70px_rgba(0,0,0,0.4)] transition-all duration-300",
                                        // Mobile: Bottom Sheet
                                        "fixed bottom-0 left-0 right-0 rounded-t-[32px] p-6 max-h-[85vh] animate-in slide-in-from-bottom duration-500 md:relative md:bottom-auto md:left-auto md:right-auto md:translate-x-0",
                                        // PC: Centered Modal (Stable)
                                        "md:rounded-[24px] md:p-6 md:w-full md:max-w-md md:max-h-[90vh] md:animate-in md:zoom-in-95 md:fade-in"
                                    )}
                                >
                                    {/* Handle Line - Only for aesthetic consistency */}
                                    <div className="w-12 h-1 bg-stone-100 rounded-full mx-auto mb-6" />

                                    {/* --- General Actions --- */}
                                    <div className="space-y-1">
                                        <button
                                            onClick={handleCopyText}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 rounded-lg transition-all"
                                        >
                                            <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                                                <Copy size={18} className="text-stone-500 md:size-4" />
                                            </div>
                                            <span>{language === 'tr' ? 'Metni Kopyala' : 'Copy Text'}</span>
                                        </button>

                                        <button
                                            onClick={handleCopyNoteLink}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 md:hover:bg-stone-100/50 rounded-xl md:rounded-lg transition-all active:scale-95 md:active:scale-100 group/item"
                                        >
                                            <div className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-stone-100 flex items-center justify-center shrink-0 group-hover/item:bg-white md:group-hover/item:bg-indigo-50 transition-colors">
                                                <Link size={20} className="text-stone-500 md:size-4 group-hover/item:text-indigo-600 transition-colors" />
                                            </div>
                                            <span>{language === 'tr' ? 'Bağlantıyı Kopyala' : 'Copy Link'}</span>
                                        </button>

                                        <button
                                            onClick={handleExportAsImage}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 md:hover:bg-stone-100/50 rounded-xl md:rounded-lg transition-all active:scale-95 md:active:scale-100 group/item"
                                        >
                                            <div className="w-10 h-10 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-stone-100 flex items-center justify-center shrink-0 group-hover/item:bg-white md:group-hover/item:bg-emerald-50 transition-colors">
                                                <ImageIcon size={20} className="text-stone-500 md:size-4 group-hover/item:text-emerald-600 transition-colors" />
                                            </div>
                                            <span>{language === 'tr' ? 'Resim Olarak İndir' : 'Export as Image'}</span>
                                        </button>
                                    </div>

                                    <div className="my-3 border-t border-stone-100 md:my-1.5" />

                                    {/* --- File Actions --- */}
                                    <div className="space-y-1">
                                        {allFiles.length > 0 && (
                                            <>
                                                {/* Preview */}
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (allFiles.length === 1) {
                                                                window.open(allFiles[0].url, '_blank');
                                                                setShowMenu(false);
                                                            } else {
                                                                setShowFilePreviewMenu(!showFilePreviewMenu);
                                                            }
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 rounded-lg transition-all justify-between"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                                                                <ExternalLink size={18} className="text-stone-500 md:size-4" />
                                                            </div>
                                                            <span>{language === 'tr' ? 'Eki Önizle' : 'Preview Attachment'}</span>
                                                        </div>
                                                        {allFiles.length > 1 && (
                                                            <span className="bg-stone-200 text-stone-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                                {allFiles.length}
                                                            </span>
                                                        )}
                                                    </button>

                                                    {showFilePreviewMenu && allFiles.length > 1 && (
                                                        <div className="md:absolute md:right-full md:top-0 md:mr-2 bg-stone-50 md:bg-white rounded-xl shadow-lg md:shadow-2xl border border-stone-200/60 p-1.5 z-[60] min-w-[220px] max-w-full mt-2 md:mt-0 animate-in fade-in slide-in-from-right-2 duration-200">
                                                            <div className="px-3 py-2 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100 mb-1">
                                                                {language === 'tr' ? 'Dosya Seç' : 'Select File'}
                                                            </div>
                                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                {allFiles.map((file, idx) => {
                                                                    const ext = file.name.split('.').pop()?.toLowerCase() || '';
                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => {
                                                                                window.open(file.url, '_blank');
                                                                                setShowFilePreviewMenu(false);
                                                                                setShowMenu(false);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 px-2 py-2 hover:bg-stone-100 md:hover:bg-stone-50 rounded-lg transition-colors text-left group"
                                                                        >
                                                                            <div className="w-8 h-8 bg-white md:bg-stone-100 rounded-lg flex items-center justify-center text-[8px] font-black text-stone-500 shrink-0 group-hover:bg-white transition-colors border border-stone-100 group-hover:border-stone-200">
                                                                                {ext.toUpperCase().slice(0, 3)}
                                                                            </div>
                                                                            <span className="text-[11px] font-bold text-stone-700 truncate flex-1">
                                                                                {file.name}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Download */}
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!canDownloadFiles) {
                                                                setShowMenu(false);
                                                                showPermissionError(language === 'tr' ? 'Dosya indirme izniniz yok' : 'No download permission');
                                                                return;
                                                            }
                                                            if (allFiles.length === 1) {
                                                                const link = document.createElement('a');
                                                                link.href = getDownloadUrl(allFiles[0].url);
                                                                if (!allFiles[0].url?.includes('cloudinary')) link.target = '_blank';
                                                                link.click();
                                                                setShowMenu(false);
                                                            } else {
                                                                setShowFileDownloadMenu(!showFileDownloadMenu);
                                                            }
                                                        }}
                                                        disabled={!canDownloadFiles && allFiles.length > 0}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold transition-all rounded-lg justify-between",
                                                            canDownloadFiles ? "text-stone-600 hover:text-stone-900 hover:bg-stone-100/50" : "text-stone-300 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                                                                <Download size={18} className={canDownloadFiles ? "text-stone-500 md:size-4" : "text-stone-300 md:size-4"} />
                                                            </div>
                                                            <span>{language === 'tr' ? 'Eki İndir' : 'Download Attachment'}</span>
                                                        </div>
                                                        {allFiles.length > 1 && canDownloadFiles && (
                                                            <span className="bg-stone-200 text-stone-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                                {allFiles.length}
                                                            </span>
                                                        )}
                                                    </button>

                                                    {showFileDownloadMenu && allFiles.length > 1 && (
                                                        <div className="md:absolute md:right-full md:top-0 md:mr-2 bg-stone-50 md:bg-white rounded-xl shadow-lg md:shadow-2xl border border-stone-200/60 p-1.5 z-[60] min-w-[220px] max-w-full mt-2 md:mt-0 animate-in fade-in slide-in-from-right-2 duration-200">
                                                            <div className="px-3 py-2 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100 mb-1">
                                                                {language === 'tr' ? 'İndirilecek Dosya' : 'File to Download'}
                                                            </div>
                                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                {allFiles.map((file, idx) => {
                                                                    const ext = file.name.split('.').pop()?.toLowerCase() || '';
                                                                    return (
                                                                        <a
                                                                            key={idx}
                                                                            href={getDownloadUrl(file.url)}
                                                                            target={file.url?.includes('cloudinary') ? undefined : "_blank"}
                                                                            rel="noopener noreferrer"
                                                                            onClick={() => {
                                                                                setShowFileDownloadMenu(false);
                                                                                setShowMenu(false);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 px-2 py-2 hover:bg-stone-100 md:hover:bg-stone-50 rounded-lg transition-colors text-left group"
                                                                        >
                                                                            <div className="w-8 h-8 bg-white md:bg-stone-100 rounded-lg flex items-center justify-center text-[8px] font-black text-stone-500 shrink-0 group-hover:bg-white transition-colors border border-stone-100 group-hover:border-stone-200">
                                                                                {ext.toUpperCase().slice(0, 3)}
                                                                            </div>
                                                                            <span className="text-[11px] font-bold text-stone-700 truncate flex-1">
                                                                                {file.name}
                                                                            </span>
                                                                            <Download size={14} className="text-stone-300 md:size-3 group-hover:text-emerald-500 transition-colors" />
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ZIP Download */}
                                                {allFiles.length > 1 && canDownloadFiles && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadAllAsZip();
                                                        }}
                                                        disabled={isZipping}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 rounded-lg transition-all group/zip"
                                                    >
                                                        <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                                                            <Download size={18} className={cn("text-stone-500 md:size-4 transition-transform", isZipping ? "animate-bounce" : "group-hover/zip:-translate-y-0.5")} />
                                                        </div>
                                                        <span>
                                                            {isZipping
                                                                ? (language === 'tr' ? 'Hazırlanıyor...' : 'Preparing...')
                                                                : (language === 'tr' ? 'Tümünü ZIP İndir' : 'Download All as ZIP')}
                                                        </span>
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="my-3 border-t border-stone-100 md:my-1.5" />

                                    {/* --- Management Actions --- */}
                                    <div className="space-y-1">
                                        {isTeacher && (
                                            <button onClick={handlePin} className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 rounded-lg transition-all">
                                                <div className={cn("w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors", note.isPinned ? "bg-amber-100" : "bg-stone-100")}>
                                                    <Pin size={18} className={cn(note.isPinned ? "fill-amber-500 text-amber-500" : "text-stone-500", "md:size-4")} />
                                                </div>
                                                <span>{note.isPinned ? (language === 'tr' ? 'Sabitlemeyi Kaldır' : 'Unpin') : (language === 'tr' ? 'Sabitle' : 'Pin')}</span>
                                            </button>
                                        )}

                                        {(isOwner || isTeacher) && (
                                            <button onClick={() => { setShowEditModal(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 rounded-lg transition-all">
                                                <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                                                    <Edit2 size={18} className="text-stone-500 md:size-4" />
                                                </div>
                                                <span>{language === 'tr' ? 'Düzenle' : 'Edit'}</span>
                                            </button>
                                        )}

                                        {canMove && onMove && (
                                            <button onClick={() => { onMove(note); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 rounded-lg transition-all">
                                                <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                                                    <ArrowRightLeft size={18} className="text-stone-500 md:size-4" />
                                                </div>
                                                <span>{language === 'tr' ? 'Taşı' : 'Move'}</span>
                                            </button>
                                        )}

                                        {isTeacher && (
                                            <button onClick={handleToggleLock} className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 rounded-lg transition-all">
                                                <div className={cn("w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors", note.isLocked ? "bg-stone-800" : "bg-stone-100")}>
                                                    {note.isLocked ? <Unlock size={18} className="text-white md:size-4" /> : <Lock size={18} className="text-stone-500 md:size-4" />}
                                                </div>
                                                <span>{note.isLocked ? (language === 'tr' ? 'Kilidi Aç' : 'Unlock Comments') : (language === 'tr' ? 'Yorumları Kilitle' : 'Lock Comments')}</span>
                                            </button>
                                        )}
                                    </div>

                                    {canDelete && (
                                        <>
                                            <div className="my-3 border-t border-stone-100 md:my-1.5" />
                                            <button onClick={handleDelete} className="w-full flex items-center gap-3 px-3 py-2 text-sm md:text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all mb-4 md:mb-0">
                                                <div className="w-9 h-9 md:w-8 md:h-8 rounded-lg bg-red-100/50 flex items-center justify-center shrink-0">
                                                    <Trash2 size={18} className="text-red-600 md:size-4" />
                                                </div>
                                                <span>{language === 'tr' ? 'Sil' : 'Delete'}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>
                </div>

                {/* --- BODY --- */}
                <div className="flex-1 min-h-0 flex flex-col gap-3 relative">
                    {/* Content Display */}
                    {true && (
                        <>
                            {/* 1. Polls */}
                            {note.type === 'poll' && note.pollOptions && (
                                <div className="space-y-2 mb-2">
                                    {note.pollOptions.map((option, idx) => {
                                        const votes = note.pollVotes?.[idx]?.length || 0;
                                        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                        const isVoted = userVoteIndex === idx.toString();
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleVote(idx)}
                                                disabled={!user}
                                                className={cn(
                                                    "w-full relative h-8 rounded-lg border text-xs font-medium overflow-hidden transition-all text-left group/poll",
                                                    isVoted ? "border-indigo-500 ring-1 ring-indigo-500" : "border-stone-200 hover:border-stone-400"
                                                )}
                                            >
                                                <div
                                                    className={cn("absolute top-0 left-0 h-full transition-all duration-500", isVoted ? "bg-indigo-100" : "bg-stone-100")}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                                                    <span className="truncate pr-2 text-stone-700">{option}</span>
                                                    <span className="text-stone-500 text-[10px] tabular-nums">{percentage}% ({votes})</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    <div className="text-right text-[10px] text-stone-400">
                                        {language === 'tr'
                                            ? `Toplam ${totalVotes} oy`
                                            : `Total ${totalVotes} votes`}
                                    </div>
                                </div>
                            )}

                            {/* 2. Link Card Preview */}
                            {note.type === 'link' && note.linkUrl && (
                                previewLoading && !note.linkDescription && !note.linkDomain ? (
                                    <SkeletonLinkPreview className="mb-3" />
                                ) : previewError && !note.linkDescription && !note.linkDomain ? (
                                    <a
                                        href={note.linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block mb-3 border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50 hover:bg-stone-100 transition-colors group/link-card shadow-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="p-3">
                                            <div className="text-[10px] text-stone-400 uppercase font-bold mb-1.5 flex items-center gap-1.5 tracking-wider">
                                                <ExternalLink size={10} />
                                                {previewData.domain || (() => {
                                                    try {
                                                        return new URL(note.linkUrl!).hostname.replace('www.', '');
                                                    } catch {
                                                        return 'WEBSITE';
                                                    }
                                                })()}
                                            </div>
                                            <h3 className="text-sm font-bold text-stone-800 line-clamp-2 leading-snug">
                                                {note.linkUrl}
                                            </h3>
                                        </div>
                                    </a>
                                ) : (
                                    <a
                                        href={note.linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block mb-3 border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50 hover:bg-stone-100 transition-colors group/link-card shadow-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {(note.imageUrl || previewData.image) && !linkImageError && (
                                            <div className="h-32 w-full overflow-hidden bg-stone-200 relative border-b border-stone-100">
                                                <img
                                                    src={getUrlWithOptimization(note.imageUrl || previewData.image)}
                                                    alt="Link Preview"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/link-card:scale-105"
                                                    onError={() => setLinkImageError(true)}
                                                />
                                            </div>
                                        )}
                                        <div className="p-3">
                                            <div className="text-[10px] text-stone-400 uppercase font-bold mb-1.5 flex items-center gap-1.5 tracking-wider">
                                                <ExternalLink size={10} />
                                                {note.linkDomain || previewData.domain || 'WEBSITE'}
                                            </div>
                                            <h3 className="text-sm font-bold text-stone-800 line-clamp-2 leading-snug mb-1.5">
                                                {note.linkTitle || previewData.title || note.linkUrl}
                                            </h3>
                                            {(note.linkDescription || previewData.description) && (
                                                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed opacity-80">
                                                    {note.linkDescription || previewData.description}
                                                </p>
                                            )}
                                        </div>
                                    </a>
                                )
                            )}

                            {/* 3. Media Attachment (Images/Files) */}
                            {attachmentUrl && note.type !== 'link' && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const ext = attachmentUrl.split('.').pop()?.toLowerCase().split('?')[0] || '';
                                        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
                                        const isImageFile = note.type === 'image' || imageExtensions.includes(ext);
                                        if (isImageFile) {
                                            setShowLightbox(true);
                                        } else {
                                            window.open(attachmentUrl, '_blank');
                                        }
                                    }}
                                    className="relative group/media cursor-pointer rounded-xl overflow-hidden aspect-video flex items-center justify-center transition-all hover:scale-[1.01] mb-2"
                                >
                                    {(() => {
                                        const ext = attachmentUrl.split('.').pop()?.toLowerCase().split('?')[0] || '';
                                        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
                                        const isImageFile = note.type === 'image' || imageExtensions.includes(ext);

                                        if (isImageFile && !mediaImageError) {
                                            return (
                                                <>
                                                    <img
                                                        src={getUrlWithOptimization(attachmentUrl)}
                                                        alt="Ek"
                                                        className="w-full h-full object-cover border border-stone-200 rounded-xl"
                                                        onError={() => setMediaImageError(true)}
                                                    />
                                                    {/* Zoom overlay on hover */}
                                                    <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/20 transition-colors flex items-center justify-center">
                                                        <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity shadow-lg">
                                                            <ExternalLink size={18} className="text-stone-700" />
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        }

                                        // Resim yüklenemezse veya resim dosyası değilse dosya kutusunu göster
                                        // File Preview Tile - Flat Design
                                        return (
                                            <div className="w-full h-full">
                                                {(() => {
                                                    // 0. Audio Files - Inline Player
                                                    const audioExtensions = ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac'];
                                                    if (audioExtensions.includes(ext)) {
                                                        return (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100 border border-purple-200 rounded-xl p-4"
                                                            >
                                                                <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                                                                    <Volume2 size={28} className="text-white" />
                                                                </div>
                                                                <span className="text-xs font-bold text-purple-600 mb-3">{ext.toUpperCase()} SES</span>
                                                                <audio
                                                                    controls
                                                                    className="w-full max-w-[200px] h-8"
                                                                    style={{ filter: 'hue-rotate(270deg)' }}
                                                                >
                                                                    <source src={attachmentUrl} type={`audio/${ext === 'mp3' ? 'mpeg' : ext}`} />
                                                                </audio>
                                                            </div>
                                                        );
                                                    }

                                                    // 0.5 Video Files - Inline Player
                                                    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
                                                    if (videoExtensions.includes(ext)) {
                                                        return (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-full h-full flex items-center justify-center bg-stone-900 rounded-xl overflow-hidden"
                                                            >
                                                                <video
                                                                    controls
                                                                    className="w-full h-full object-contain"
                                                                    preload="metadata"
                                                                >
                                                                    <source src={attachmentUrl} type={`video/${ext === 'mov' ? 'quicktime' : ext}`} />
                                                                </video>
                                                            </div>
                                                        );
                                                    }

                                                    // 1. PDF with Thumbnail (Cloudinary)
                                                    if (ext === 'pdf' && attachmentUrl.includes('cloudinary')) {
                                                        return (
                                                            <div className="relative w-full h-full bg-stone-100 rounded-xl border border-stone-200 overflow-hidden">
                                                                <div className="absolute inset-0 flex items-center justify-center text-stone-300 z-0">
                                                                    <FileText size={48} />
                                                                </div>
                                                                <img
                                                                    src={attachmentUrl.replace(/\.pdf$/i, '.jpg')}
                                                                    alt="PDF Önizleme"
                                                                    className="w-full h-full object-contain relative z-10"
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                />
                                                                {/* Overlay Label */}
                                                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded shadow-sm z-20">
                                                                    PDF
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // 2. Generic File Tiles
                                                    let tileStyle = "bg-stone-50 text-stone-500 border-stone-200";
                                                    let IconComponent = File;
                                                    let label = ext.toUpperCase();

                                                    if (ext === 'pdf') {
                                                        tileStyle = "bg-rose-50 text-rose-600 border-rose-100";
                                                        IconComponent = FileText;
                                                    } else if (['doc', 'docx'].includes(ext)) {
                                                        tileStyle = "bg-blue-50 text-blue-600 border-blue-100";
                                                        IconComponent = FileText;
                                                        label = 'WORD';
                                                    } else if (['xls', 'xlsx'].includes(ext)) {
                                                        tileStyle = "bg-emerald-50 text-emerald-600 border-emerald-100";
                                                        IconComponent = FileSpreadsheet;
                                                        label = 'EXCEL';
                                                    } else if (['ppt', 'pptx'].includes(ext)) {
                                                        tileStyle = "bg-orange-50 text-orange-600 border-orange-100";
                                                        IconComponent = Presentation;
                                                        label = 'SUNUM';
                                                    }

                                                    return (
                                                        <div className={cn(
                                                            "w-full h-full flex flex-col items-center justify-center border rounded-xl transition-colors",
                                                            tileStyle
                                                        )}>
                                                            <IconComponent size={40} strokeWidth={1.5} />
                                                            <span className="mt-2 text-xs font-bold tracking-wider opacity-90">{label}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* 3.5 Çoklu Dosyalar Listesi */}
                            {note.type === 'file' && note.files && note.files.length > 0 && (
                                <div className="mb-3 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-medium text-stone-500">
                                            {language === 'tr' ? `${note.files.length} dosya` : `${note.files.length} file(s)`}
                                        </p>
                                    </div>
                                    {note.files.map((file, idx) => {
                                        const ext = file.name.split('.').pop()?.toLowerCase() || '';
                                        const extLabel = ext.toUpperCase().slice(0, 4);

                                        // Dosya renk ve ikon belirleme
                                        let colorClass = 'bg-stone-100 text-stone-600';
                                        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) colorClass = 'bg-purple-100 text-purple-600';
                                        else if (ext === 'pdf') colorClass = 'bg-rose-100 text-rose-600';
                                        else if (['doc', 'docx'].includes(ext)) colorClass = 'bg-blue-100 text-blue-600';
                                        else if (['xls', 'xlsx'].includes(ext)) colorClass = 'bg-emerald-100 text-emerald-600';
                                        else if (['ppt', 'pptx'].includes(ext)) colorClass = 'bg-orange-100 text-orange-600';
                                        else if (['mp3', 'wav', 'ogg', 'webm'].includes(ext)) colorClass = 'bg-pink-100 text-pink-600';
                                        else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) colorClass = 'bg-indigo-100 text-indigo-600';
                                        else if (['zip', 'rar', '7z'].includes(ext)) colorClass = 'bg-amber-100 text-amber-600';

                                        return (
                                            <a
                                                key={idx}
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-3 p-2.5 bg-white/70 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors group/file"
                                            >
                                                <div className={cn(
                                                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold",
                                                    colorClass
                                                )}>
                                                    {extLabel}
                                                </div>
                                                <span className="text-sm text-stone-700 truncate flex-1 group-hover/file:text-stone-900">
                                                    {file.name}
                                                </span>
                                                {canDownloadFiles ? (
                                                    <Download size={14} className="text-stone-400 shrink-0 group-hover/file:text-stone-600" />
                                                ) : (
                                                    <ExternalLink size={14} className="text-stone-400 shrink-0 group-hover/file:text-stone-600" />
                                                )}
                                            </a>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 3. Audio Player */}
                            {note.type === 'audio' && note.audioUrl && (
                                <div className="mb-3 bg-stone-100/50 rounded-xl p-3 border border-stone-200 flex items-center gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (audioRef.current) {
                                                if (isPlaying) {
                                                    audioRef.current.pause();
                                                } else {
                                                    audioRef.current.play();
                                                }
                                            }
                                        }}
                                        className="w-10 h-10 rounded-full bg-stone-800 text-white flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all shadow-md"
                                    >
                                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-1" fill="currentColor" />}
                                    </button>

                                    <div className="flex-1 space-y-1">
                                        {/* Waveform placeholder */}
                                        <div className="h-8 flex items-center gap-0.5 opacity-50">
                                            {[...Array(20)].map((_, i) => (
                                                <div key={i} className={cn("w-1 rounded-full transition-all duration-300", isPlaying ? "bg-stone-800 animate-pulse" : "bg-stone-400")} style={{ height: isPlaying ? Math.max(20, Math.random() * 100) + '%' : Math.max(20, Math.random() * 60) + '%', animationDelay: i * 0.05 + 's' }}></div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-[10px] text-stone-500 font-medium tabular-nums">
                                            <span id={`time-${note.id}`}>00:00</span>
                                            <span>
                                                {(() => {
                                                    const mins = Math.floor(duration / 60);
                                                    const secs = Math.floor(duration % 60);
                                                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Audio Element */}
                                    <audio
                                        ref={audioRef}
                                        src={note.audioUrl}
                                        preload="metadata"
                                        onLoadedMetadata={(e) => {
                                            if (duration === 0) {
                                                setDuration(e.currentTarget.duration);
                                            }
                                        }}
                                        onPlay={() => setIsPlaying(true)}
                                        onPause={() => setIsPlaying(false)}
                                        onEnded={() => setIsPlaying(false)}
                                        onTimeUpdate={(e) => {
                                            const audio = e.currentTarget;
                                            const timeDisplay = document.getElementById(`time-${note.id}`);
                                            if (timeDisplay) {
                                                const mins = Math.floor(audio.currentTime / 60);
                                                const secs = Math.floor(audio.currentTime % 60);
                                                timeDisplay.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* 3.5. Video Player */}
                            {note.type === 'video' && note.videoUrl && (
                                <div
                                    className="mb-3 rounded-xl overflow-hidden border border-indigo-200 bg-stone-900"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <video
                                        controls
                                        className="w-full aspect-video object-contain"
                                        preload="metadata"
                                        poster={note.videoThumbnail}
                                    >
                                        <source src={note.videoUrl} type="video/webm" />
                                        <source src={note.videoUrl} type="video/mp4" />
                                        {language === 'tr' ? 'Tarayıcınız video desteklemiyor.' : 'Your browser does not support video.'}
                                    </video>
                                    {note.videoDuration && (
                                        <div className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-between">
                                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                <Video size={12} />
                                                {language === 'tr' ? 'Video Notu' : 'Video Note'}
                                            </span>
                                            <span className="text-xs font-mono text-white/80">
                                                {Math.floor(note.videoDuration / 60)}:{(note.videoDuration % 60).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 4. Text Content */}
                            {note.content && (
                                <div className="flex-1 min-h-0 relative">
                                    <div className={cn(
                                        "prose prose-sm prose-stone max-w-none break-words leading-relaxed",
                                        note.type === 'poll' && "font-bold",
                                        // If content is long, clamp it to fit the card visually
                                        isLongContent ? "line-clamp-[12]" : ""
                                    )}>
                                        {/* Check if content is HTML (from Rich Text Editor) or plain text/markdown */}
                                        {/<[^>]+>/.test(note.content) ? (
                                            <RichTextContent content={note.content} />
                                        ) : (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {note.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>

                                    {/* Read More Trigger */}
                                    {isLongContent && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowFullContentModal(true); }}
                                            className="mt-1 text-xs font-bold text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 hover:underline decoration-stone-300 underline-offset-2 transition-all"
                                        >
                                            {t('note.readMore')}...
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* 4. Reactions List */}
                            {note.reactions && Object.keys(note.reactions).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                                    {Object.entries(note.reactions).map(([emoji, userIds]) => {
                                        if (!userIds || userIds.length === 0) return null;
                                        const hasReacted = userIds.includes(user?.uid || '');
                                        const config = REACTION_CONFIG[emoji];
                                        const Icon = config?.icon;

                                        if (!Icon) {
                                            return (
                                                <button
                                                    key={emoji}
                                                    onClick={() => !note.isLocked && handleReaction(emoji)}
                                                    disabled={note.isLocked}
                                                    className={cn(
                                                        "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors",
                                                        hasReacted ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white/50 border-stone-200 text-stone-600 hover:bg-stone-50",
                                                        note.isLocked && "cursor-not-allowed opacity-70"
                                                    )}
                                                >
                                                    <span>{emoji}</span>
                                                    <span className="font-bold">{userIds.length}</span>
                                                </button>
                                            );
                                        }

                                        return (
                                            <button
                                                key={emoji}
                                                onClick={() => !note.isLocked && handleReaction(emoji)}
                                                disabled={note.isLocked}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border transition-all hover:scale-105 active:scale-95 font-semibold",
                                                    hasReacted
                                                        ? config.color + " ring-1 ring-offset-1 ring-offset-transparent ring-black/5"
                                                        : "bg-white/60 border-stone-200 text-stone-500 hover:bg-stone-50",
                                                    note.isLocked && "cursor-not-allowed opacity-70"
                                                )}
                                                title={config.label}
                                            >
                                                <Icon size={12} fill={hasReacted ? "currentColor" : "none"} strokeWidth={2.5} />
                                                <span>{userIds.length}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )
                    }
                </div >

                {/* --- FOOTER --- */}
                < div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-200/50 shrink-0" >
                    <div className="flex items-center gap-1">
                        {/* Reaction Picker */}
                        <div className="relative group/reaction">
                            <button
                                disabled={note.isLocked}
                                className={cn(
                                    "p-1.5 text-stone-400 transition-colors rounded-lg",
                                    note.isLocked ? "opacity-30 cursor-not-allowed" : "hover:text-amber-500 hover:bg-amber-50"
                                )}
                            >
                                <Smile size={18} />
                            </button>
                            {!note.isLocked && (
                                <div className="absolute bottom-full left-0 mb-2 p-1.5 bg-white rounded-full shadow-xl border border-stone-200 flex gap-1 invisible opacity-0 group-hover/reaction:visible group-hover/reaction:opacity-100 transition-all duration-200 z-50 origin-bottom-left scale-95 group-hover/reaction:scale-100">
                                    {Object.entries(REACTION_CONFIG).map(([emoji, config]) => {
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReaction(emoji)}
                                                className="w-9 h-9 flex items-center justify-center text-stone-500 hover:scale-110 active:scale-95 transition-transform rounded-full hover:bg-stone-50"
                                                title={config.label}
                                            >
                                                <Icon size={18} className={config.color.split(' ')[0]} />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Like Button */}
                        <button
                            onClick={handleLike}
                            disabled={note.isLocked}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors",
                                isLiked ? "text-red-500 bg-red-50" : "text-stone-400 hover:text-red-400 hover:bg-stone-50",
                                note.isLocked && "opacity-50 cursor-not-allowed grayscale"
                            )}
                        >
                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                            <span className="text-xs font-medium tabular-nums">{note.likes?.length || 0}</span>
                        </button>
                    </div>

                    {/* Comments Button */}
                    <button
                        onClick={() => !note.isLocked && onOpenComments(note)}
                        disabled={note.isLocked && !isTeacher}
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-1.5 text-stone-400 hover:text-stone-600 rounded-lg transition-colors",
                            !note.isLocked && "hover:bg-stone-50",
                            note.isLocked && !isTeacher && "opacity-40 cursor-not-allowed",
                            note.isLocked && isTeacher && "opacity-80 hover:bg-stone-50"
                        )}
                    >
                        {note.isLocked ? <Lock size={14} className="text-stone-400" /> : <MessageSquare size={16} />}
                        <span className="text-xs font-medium tabular-nums">
                            {note.commentCount || 0} {language === 'tr' ? 'Yorum' : 'Comments'}
                            {note.isLocked && <span className="ml-1 text-[10px] font-black opacity-60">LOCKED</span>}
                        </span>
                    </button>
                </div >
            </div >

            {/* --- READ MORE MODAL --- */}
            {
                showFullContentModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
                        onClick={() => setShowFullContentModal(false)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200 cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50/80">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-stone-200 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-bold text-stone-600">{note.authorName?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-800 text-sm">{note.authorName}</h3>
                                        <p className="text-[10px] text-stone-500">{note.createdAt ? formatDate(note.createdAt) : ''}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowFullContentModal(false)} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-5 overflow-y-auto custom-scrollbar bg-white">
                                {/* Compact Media */}
                                {attachmentUrl && (
                                    <div className="mb-4 rounded-lg overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center">
                                        {note.type === 'image' ? (
                                            <img
                                                src={attachmentUrl}
                                                alt="Detay görsel"
                                                className="max-w-full max-h-[40vh] object-contain"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <a href={attachmentUrl} target="_blank" className="flex flex-col items-center gap-2 py-8 text-stone-500 hover:text-indigo-600 transition-colors">
                                                <FileText size={48} strokeWidth={1.5} />
                                                <span className="text-sm font-semibold underline underline-offset-4">Dosyayı Görüntüle</span>
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Full Text */}
                                <div className="prose prose-sm prose-stone max-w-none">
                                    {/* Check if content is HTML (from Rich Text Editor) or plain text/markdown */}
                                    {/<[^>]+>/.test(note.content) ? (
                                        <RichTextContent content={note.content} />
                                    ) : (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {note.content}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
                                <button
                                    onClick={() => setShowFullContentModal(false)}
                                    className="px-4 py-1.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors shadow-sm"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Lightbox for Image Preview */}
            <Lightbox
                isOpen={showLightbox}
                onClose={() => setShowLightbox(false)}
                src={attachmentUrl || ''}
                alt={note.content || 'Image'}
                allowDownload={canDownloadFiles}
            />
            {/* Edit Note Modal */}
            <EditNoteModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                note={note}
            />

            {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
            {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowDeleteConfirm(false)}
                    />

                    {/* Modal Content */}
                    <div className="bg-white rounded-[24px] p-6 w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-500">
                            <AlertTriangle size={24} />
                        </div>

                        <h3 className="text-lg font-bold text-stone-900 mb-2">
                            {language === 'tr' ? 'Notu Sil?' : 'Delete Note?'}
                        </h3>
                        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                            {language === 'tr'
                                ? 'Bu notu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
                                : 'Are you sure you want to delete this note? This action cannot be undone.'}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-colors"
                            >
                                {language === 'tr' ? 'İptal' : 'Cancel'}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
                            >
                                {language === 'tr' ? 'Evet, Sil' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
