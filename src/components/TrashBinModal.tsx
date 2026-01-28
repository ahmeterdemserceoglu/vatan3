'use client';

import { useState, useEffect } from 'react';
import {
    Trash2, RotateCcw, X, AlertCircle, Calendar,
    FileText, Layout, Loader2, Eye
} from 'lucide-react';
import { NoteCard } from './NoteCard';
import { Note, Board } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { restoreNote, permanentlyDeleteNote } from '@/lib/notes';
import { restoreBoard, permanentlyDeleteBoard } from '@/lib/boards';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/components/ToastProvider';
import { formatDate, cn } from '@/lib/utils';

interface TrashBinModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'board' | 'system';
    boardId?: string; // Required for 'board' mode
}

export function TrashBinModal({ isOpen, onClose, mode, boardId }: TrashBinModalProps) {
    const { language } = useTranslation();
    const { showToast } = useToast();
    const [notes, setNotes] = useState<Note[]>([]);
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [previewNote, setPreviewNote] = useState<Note | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        let unsub: () => void;

        if (mode === 'board' && boardId) {
            const q = query(
                collection(db, 'notes'),
                where('boardId', '==', boardId),
                where('isDeleted', '==', true),
                orderBy('deletedAt', 'desc')
            );
            unsub = onSnapshot(q, (snapshot) => {
                setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
                setLoading(false);
            });
        } else {
            const q = query(
                collection(db, 'boards'),
                where('isDeleted', '==', true),
                orderBy('deletedAt', 'desc')
            );
            unsub = onSnapshot(q, (snapshot) => {
                setBoards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
                setLoading(false);
            });
        }

        return () => unsub?.();
    }, [isOpen, mode, boardId]);

    const handleRestore = async (item: Note | Board) => {
        setActionLoading(item.id);
        try {
            if (mode === 'board') {
                await restoreNote(item.id);
            } else {
                await restoreBoard(item.id);
            }
            showToast(language === 'tr' ? 'Başarıyla geri yüklendi' : 'Restored successfully', 'success');
        } catch (error) {
            console.error('Restore error:', error);
            showToast(language === 'tr' ? 'Hata oluştu' : 'Error occurred', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (item: Note | Board) => {
        if (!confirm(language === 'tr' ? 'Bu öğe kalıcı olarak silinecektir. Emin misiniz?' : 'This item will be permanently deleted. Are you sure?')) {
            return;
        }

        setActionLoading(item.id);
        try {
            if (mode === 'board') {
                await permanentlyDeleteNote(item.id);
            } else {
                await permanentlyDeleteBoard(item.id);
            }
            showToast(language === 'tr' ? 'Kalıcı olarak silindi' : 'Permanently deleted', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            showToast(language === 'tr' ? 'Hata oluştu' : 'Error occurred', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    const items = mode === 'board' ? notes : boards;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                            <Trash2 size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-800">
                                {mode === 'board'
                                    ? (language === 'tr' ? 'Pano Çöp Kutusu' : 'Board Trash Bin')
                                    : (language === 'tr' ? 'Sistem Çöp Kutusu' : 'System Trash Bin')}
                            </h2>
                            <p className="text-xs text-stone-500 mt-0.5">
                                {language === 'tr'
                                    ? 'Silinen öğeler 10 gün sonra kalıcı olarak temizlenir.'
                                    : 'Deleted items are permanently cleared after 10 days.'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                        <X size={20} className="text-stone-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-stone-50/20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-400">
                            <Loader2 size={32} className="animate-spin" />
                            <p className="text-sm">{language === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-4">
                            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center shadow-inner">
                                <Trash2 size={32} />
                            </div>
                            <p className="text-sm font-medium">
                                {language === 'tr' ? 'Çöp kutusu boş' : 'Trash bin is empty'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => {
                                const isNote = 'content' in item;
                                const expiresAt = (item as any).expiresAt?.toDate?.() || (item as any).expiresAt;

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4 hover:border-stone-300 transition-all shadow-sm group"
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                            isNote ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                                        )}>
                                            {isNote ? <FileText size={20} /> : <Layout size={20} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-stone-800 text-sm truncate">
                                                {isNote
                                                    ? (item.content.replace(/<[^>]+>/g, '').substring(0, 50) || (language === 'tr' ? 'Metin yok' : 'No text'))
                                                    : (item as Board).title}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <div className="flex items-center gap-1 text-[10px] text-stone-400">
                                                    <Calendar size={12} />
                                                    <span>
                                                        {language === 'tr' ? 'Silinme:' : 'Deleted:'} {formatDate(item.deletedAt)}
                                                    </span>
                                                </div>
                                                {expiresAt && (
                                                    <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                                                        <AlertCircle size={10} />
                                                        <span>
                                                            {language === 'tr' ? 'Kalıcı Silinme:' : 'Permanent Delete:'} {formatDate(expiresAt)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {isNote && (
                                                <button
                                                    onClick={() => setPreviewNote(item as Note)}
                                                    className="p-2 text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title={language === 'tr' ? 'Önizle' : 'Preview'}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRestore(item)}
                                                disabled={!!actionLoading}
                                                className="p-2 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all title"
                                                title={language === 'tr' ? 'Geri Yükle' : 'Restore'}
                                            >
                                                {actionLoading === item.id ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                disabled={!!actionLoading}
                                                className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title={language === 'tr' ? 'Kalıcı Olarak Sil' : 'Delete Permanently'}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
                    >
                        {language === 'tr' ? 'Kapat' : 'Close'}
                    </button>
                </div>
            </div>

            {/* Note Preview Overlay */}
            {previewNote && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-300">
                        {/* Close button for preview */}
                        <button
                            onClick={() => setPreviewNote(null)}
                            className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20 group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
                            <NoteCard
                                note={previewNote}
                                canEdit={false}
                                onOpenComments={() => { }}
                                canDownloadFiles={false}
                            />
                        </div>

                        <div className="mt-6 flex justify-center gap-3">
                            <button
                                onClick={() => { handleRestore(previewNote); setPreviewNote(null); }}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                            >
                                <RotateCcw size={18} />
                                {language === 'tr' ? 'Geri Yükle' : 'Restore'}
                            </button>
                            <button
                                onClick={() => setPreviewNote(null)}
                                className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all"
                            >
                                {language === 'tr' ? 'Kapat' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
