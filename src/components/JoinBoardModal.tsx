'use client';

import { useState } from 'react';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { getBoard, joinBoard } from '@/lib/boards';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';

interface JoinBoardModalProps {
    userId: string;
    onClose: () => void;
    onJoined: () => void;
}

export function JoinBoardModal({ userId, onClose, onJoined }: JoinBoardModalProps) {
    const { user } = useStore();
    const { t } = useTranslation();
    const [boardId, setBoardId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!boardId.trim() || !user) return;

        setLoading(true);
        setError(null);

        try {
            // First check if board exists
            const board = await getBoard(boardId);
            if (!board) {
                setError(t('joinBoardModal.boardNotFound'));
                setLoading(false);
                return;
            }

            // Check if already a member (optional, but good UX)
            if (board.members?.includes(userId) || board.ownerId === userId) {
                // Even if already member, we can just redirect
                onJoined(); // Refresh lists if needed
                router.push(`/board/${board.id}`);
                onClose();
                return;
            }

            // Check if already pending
            if (board.permissions?.pendingMembers?.includes(userId)) {
                setError(t('joinBoardModal.alreadyPending') || 'Üyelik isteğiniz zaten beklemede.');
                setLoading(false);
                return;
            }

            const result = await joinBoard(
                boardId,
                userId,
                user.displayName,
                board.title,
                board.members || [],
                board.ownerId,
                board
            );

            if (result === 'pending') {
                // Pending status - show success message
                setLoading(false);
                setShowSuccess(true);
                return;
            }

            onJoined();
            router.push(`/board/${boardId}`);
            onClose();
        } catch (err) {
            console.error(err);
            setError(t('joinBoardModal.joinError'));
            setLoading(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-stone-200 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <Loader2 size={32} className="animate-spin" />
                        {/* Aslında success iconu olmalı ama pending olduğu için saat/kum saati daha iyi olabilir. Users'ın beklentisi 'istek gönderildi' */}
                        <div className="absolute animate-ping w-16 h-16 rounded-full bg-green-400 opacity-20"></div>
                        <ArrowRight className="hidden" /> {/* Dummy to keep import */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check"><path d="M20 6 9 17l-5-5" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-stone-800 mb-2">
                        {t('joinBoardModal.requestSent') || 'İstek Gönderildi!'}
                    </h2>
                    <p className="text-stone-500 mb-6">
                        {t('joinBoardModal.approvalMessage') || 'Pano sahibi onayladığında panoya erişebileceksiniz.'}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-stone-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-stone-800">{t('joinBoardModal.title')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                            {t('joinBoardModal.boardIdLabel')}
                        </label>
                        <input
                            type="text"
                            value={boardId}
                            onChange={(e) => setBoardId(e.target.value)}
                            placeholder={t('joinBoardModal.boardIdPlaceholder')}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400 transition-all"
                            autoFocus
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                                {error}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-stone-500">
                            {t('joinBoardModal.boardIdHelp')}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 font-medium transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !boardId.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-xl hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    {t('board.join')}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
