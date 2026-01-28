'use client';

import { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2, AlertOctagon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { deleteBoard } from '@/lib/boards';
import { useToast } from './ToastProvider';
import { logActivity } from '@/lib/activityLog';
import { useStore } from '@/store/useStore';

interface DeleteBoardModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    boardTitle: string;
    onDeleteSuccess?: () => void;
}

export function DeleteBoardModal({
    isOpen,
    onClose,
    boardId,
    boardTitle,
    onDeleteSuccess
}: DeleteBoardModalProps) {
    const { user } = useStore();
    const { t, language } = useTranslation();
    const { showToast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmText, setConfirmText] = useState('');

    // Confirmation text the user must type
    const requiredConfirmText = language === 'tr' ? 'SİL' : 'DELETE';
    const isConfirmed = confirmText.toUpperCase() === requiredConfirmText;

    const handleDelete = async () => {
        if (!isConfirmed) return;

        setIsDeleting(true);
        setError(null);

        try {
            await deleteBoard(boardId);

            // Audit Log
            if (user) {
                await logActivity({
                    userId: user.uid,
                    userName: user.displayName,
                    type: 'board_delete',
                    description: `"${boardTitle}" panosunu sildi.`,
                    metadata: { boardId, boardTitle }
                });
            }

            showToast(
                language === 'tr'
                    ? 'Pano başarıyla silindi'
                    : 'Board deleted successfully',
                'success'
            );
            onDeleteSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error deleting board:', err);
            const errorMessage = language === 'tr'
                ? 'Pano silinirken bir hata oluştu'
                : 'An error occurred while deleting the board';
            setError(errorMessage);
            showToast(errorMessage, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        setConfirmText('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative p-6 pb-4 border-b border-stone-100">
                    {/* Danger gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-100 via-red-50 to-orange-50 opacity-80" />

                    <div className="relative flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {/* Icon Container with Glow Effect */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
                                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
                                    <Trash2 size={26} className="text-white" />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-red-800">
                                    {language === 'tr' ? 'Panoyu Sil' : 'Delete Board'}
                                </h2>
                                <p className="text-sm text-red-600 mt-0.5 font-medium">
                                    {language === 'tr' ? 'Bu işlem geri alınamaz!' : 'This action cannot be undone!'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleClose}
                            disabled={isDeleting}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-white/80 rounded-xl transition-all duration-200 disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Critical Warning Box */}
                    <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertOctagon size={20} className="text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-red-800">
                                {language === 'tr' ? 'Kritik Uyarı!' : 'Critical Warning!'}
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                                {language === 'tr'
                                    ? 'Bu panoyu silmek üzeresiniz. Tüm notlar, yorumlar ve dosyalar kalıcı olarak silinecek.'
                                    : 'You are about to delete this board. All notes, comments, and files will be permanently deleted.'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Board Info Card */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1.5">
                            {language === 'tr' ? 'Silinecek Pano' : 'Board to be deleted'}
                        </p>
                        <p className="text-lg font-bold text-stone-800 truncate">
                            {boardTitle}
                        </p>
                    </div>

                    {/* What will be deleted */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                            {language === 'tr' ? 'Silinecekler:' : 'Will be deleted:'}
                        </p>
                        <ul className="space-y-2 text-sm text-stone-600">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {language === 'tr' ? 'Tüm notlar ve içerikleri' : 'All notes and their contents'}
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {language === 'tr' ? 'Tüm yorumlar' : 'All comments'}
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {language === 'tr' ? 'Tüm sohbet mesajları' : 'All chat messages'}
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                {language === 'tr' ? 'Üyelik ve erişim kayıtları' : 'Membership and access records'}
                            </li>
                        </ul>
                    </div>

                    {/* Confirmation Input */}
                    <div className="space-y-2 pt-2">
                        <label className="block text-sm font-medium text-stone-700">
                            {language === 'tr'
                                ? `Onaylamak için "${requiredConfirmText}" yazın:`
                                : `Type "${requiredConfirmText}" to confirm:`
                            }
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={requiredConfirmText}
                            disabled={isDeleting}
                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-stone-50"
                            autoComplete="off"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-2 flex gap-3 bg-stone-50/50">
                    <button
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 bg-white text-stone-700 font-semibold rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors duration-200 disabled:opacity-50"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting || !isConfirmed}
                        className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${isConfirmed
                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30 hover:shadow-red-500/50'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>{language === 'tr' ? 'Siliniyor...' : 'Deleting...'}</span>
                            </>
                        ) : (
                            <>
                                <Trash2 size={18} />
                                <span>{language === 'tr' ? 'Panoyu Sil' : 'Delete Board'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
