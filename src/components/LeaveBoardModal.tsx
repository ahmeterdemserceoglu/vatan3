'use client';

import { useState } from 'react';
import { X, LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { leaveBoard } from '@/lib/boards';
import { useToast } from './ToastProvider';

interface LeaveBoardModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    boardTitle: string;
    userId: string;
    onLeaveSuccess?: () => void;
}

export function LeaveBoardModal({
    isOpen,
    onClose,
    boardId,
    boardTitle,
    userId,
    onLeaveSuccess
}: LeaveBoardModalProps) {
    const { t, language } = useTranslation();
    const { showToast } = useToast();
    const [isLeaving, setIsLeaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLeave = async () => {
        setIsLeaving(true);
        setError(null);

        try {
            await leaveBoard(boardId, userId);
            showToast(t('board.leaveSuccess'), 'success');
            onLeaveSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error leaving board:', err);
            const errorMessage = t('board.leaveError');
            setError(errorMessage);
            showToast(errorMessage, 'error');
        } finally {
            setIsLeaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative p-6 pb-4 border-b border-stone-100">
                    {/* Decorative gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 opacity-60" />

                    <div className="relative flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {/* Icon Container with Glow Effect */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-400 rounded-2xl blur-lg opacity-30 animate-pulse" />
                                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                                    <LogOut size={26} className="text-white" />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-stone-800">
                                    {t('board.leave')}
                                </h2>
                                <p className="text-sm text-stone-500 mt-0.5">
                                    {language === 'tr' ? 'Bu işlem geri alınamaz' : 'This action cannot be undone'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            disabled={isLeaving}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all duration-200 disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Warning Box */}
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle size={20} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-800">
                                {language === 'tr' ? 'Dikkat!' : 'Warning!'}
                            </p>
                            <p className="text-sm text-amber-700 mt-1">
                                {t('board.leaveConfirm')}
                            </p>
                        </div>
                    </div>

                    {/* Board Info Card */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1.5">
                            {language === 'tr' ? 'Ayrılacağınız Pano' : 'Board you will leave'}
                        </p>
                        <p className="text-lg font-semibold text-stone-800 truncate">
                            {boardTitle}
                        </p>
                    </div>

                    {/* What will happen info */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                            {language === 'tr' ? 'Ayrıldığınızda:' : 'When you leave:'}
                        </p>
                        <ul className="space-y-2 text-sm text-stone-600">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                {language === 'tr'
                                    ? 'Bu panoya erişiminiz kaldırılacak'
                                    : 'Your access to this board will be removed'
                                }
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                {language === 'tr'
                                    ? 'Üye listesinden çıkarılacaksınız'
                                    : 'You will be removed from the member list'
                                }
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                {language === 'tr'
                                    ? 'Tekrar katılmak için yeniden davet gerekir'
                                    : 'You will need to be re-invited to rejoin'
                                }
                            </li>
                        </ul>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-2 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLeaving}
                        className="flex-1 px-4 py-3 bg-stone-100 text-stone-700 font-semibold rounded-xl hover:bg-stone-200 transition-colors duration-200 disabled:opacity-50"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleLeave}
                        disabled={isLeaving}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLeaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>{language === 'tr' ? 'Ayrılıyor...' : 'Leaving...'}</span>
                            </>
                        ) : (
                            <>
                                <LogOut size={18} />
                                <span>{t('board.leave')}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
