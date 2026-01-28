'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/Header';
import { subscribeToUserBoards, subscribeToJoinedBoards, subscribeToAllBoards, deleteBoard } from '@/lib/boards';
import { Board } from '@/types';
import { JoinBoardModal } from '@/components/JoinBoardModal';
import { Plus, Trash2, ExternalLink, Users, LayoutGrid, UserCheck, Settings } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { PrivacyModal, TermsModal } from '@/components/LegalModals';
import { PendingRequests } from '@/components/PendingRequests';
import { DeleteBoardModal } from '@/components/DeleteBoardModal';
import { TrashBinModal } from '@/components/TrashBinModal';

export default function DashboardPage() {
    const { user, isLoading } = useStore();
    const { t, language } = useTranslation();
    const [boards, setBoards] = useState<Board[]>([]);
    const [joinedBoards, setJoinedBoards] = useState<Board[]>([]);
    const [allBoards, setAllBoards] = useState<Board[]>([]); // For admin
    const [loadingBoards, setLoadingBoards] = useState(true);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showTrashBin, setShowTrashBin] = useState(false);
    const [boardToDelete, setBoardToDelete] = useState<{ id: string; title: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, isLoading, router]);

    // Realtime subscription to user's boards
    useEffect(() => {
        if (!user) return;

        setLoadingBoards(true);

        // Subscribe to user's own boards
        const unsubOwned = subscribeToUserBoards(user.uid, (ownedBoards) => {
            setBoards(ownedBoards.filter(b => !b.isDeleted));
            setLoadingBoards(false);
        });

        // Subscribe to joined boards
        const unsubJoined = subscribeToJoinedBoards(user.uid, (memberBoards) => {
            setJoinedBoards(memberBoards.filter(b => !b.isDeleted));
        });

        // Subscribe to ALL boards if admin
        let unsubAll = () => { };
        if (user.role === 'admin') {
            unsubAll = subscribeToAllBoards((boards) => {
                setAllBoards(boards.filter(b => !b.isDeleted));
            });
        }

        return () => {
            unsubOwned();
            unsubJoined();
            unsubAll();
        };
    }, [user]);

    const handleDelete = (boardId: string, boardTitle: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setBoardToDelete({ id: boardId, title: boardTitle });
        setShowDeleteModal(true);
    };

    const handleDeleteSuccess = () => {
        if (boardToDelete) {
            setBoards(boards.filter((b) => b.id !== boardToDelete.id));
        }
        setBoardToDelete(null);
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                    <p className="text-stone-500 text-sm">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    const BoardCard = ({ board, isOwner }: { board: Board, isOwner: boolean }) => (
        <Link
            href={`/board/${board.id}`}
            className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-matte-md transition-all duration-200 group flex flex-col h-full"
            style={{ borderLeftColor: board.backgroundColor, borderLeftWidth: 4 }}
        >
            <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg text-stone-800 group-hover:text-stone-600 transition-colors">
                    {board.title}
                </h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {(isOwner || user?.role === 'admin') && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/board/${board.id}/settings`);
                            }}
                            className="p-1.5 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                            title={t('common.settings')}
                        >
                            <Settings size={18} />
                        </button>
                    )}
                    {isOwner && (
                        <button
                            onClick={(e) => handleDelete(board.id, board.title, e)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title={language === 'tr' ? 'Panoyu Sil' : 'Delete Board'}
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>
            {board.description && (
                <p className="text-stone-500 text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
                    {board.description}
                </p>
            )}
            <div className="flex items-center gap-4 text-xs text-stone-400 mt-auto pt-2">
                <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    {board.isPublic
                        ? (language === 'tr' ? 'Herkese Açık' : 'Public')
                        : (language === 'tr' ? 'Özel' : 'Private')}
                </span>
                {!isOwner && (
                    <span className="flex items-center gap-1.5 text-stone-500">
                        <UserCheck size={14} />
                        {t('board.member')}
                    </span>
                )}
                <span className="flex items-center gap-1.5 ml-auto">
                    <ExternalLink size={14} />
                    {language === 'tr' ? 'Aç' : 'Open'}
                </span>
            </div>
        </Link>
    );

    return (
        <div className="h-screen bg-stone-50 flex flex-col overflow-hidden">
            <Header
                showTrashBinAccess={user?.role === 'admin'}
                onShowTrashBin={() => setShowTrashBin(true)}
            />
            <main className="flex-1 overflow-y-auto pb-24 sm:pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 w-full">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-stone-800">{t('dashboard.myBoards')}</h1>
                            <p className="text-stone-500 mt-1">
                                {language === 'tr' ? 'Tüm panolarınızı buradan yönetin' : 'Manage all your boards from here'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => setShowTrashBin(true)}
                                    className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-stone-200 rounded-lg hover:bg-red-50 text-stone-600 hover:text-red-500 transition-colors shadow-sm h-10 sm:h-auto"
                                    title={language === 'tr' ? 'Sistem Çöp Kutusu' : 'System Trash Bin'}
                                >
                                    <Trash2 size={20} className="text-stone-400" />
                                    <span className="text-sm font-semibold hidden md:inline">{language === 'tr' ? 'Çöp Kutusu' : 'Trash Bin'}</span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="flex items-center gap-2 bg-white border border-stone-200 text-stone-600 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-stone-50 transition-colors font-medium shadow-sm h-10 sm:h-auto"
                                title={t('dashboard.joinBoard')}
                            >
                                <UserCheck size={20} className="text-stone-400" />
                                <span className="text-sm hidden md:inline">{t('dashboard.joinBoard')}</span>
                            </button>
                            <Link
                                href="/board/new"
                                className="flex items-center gap-2 bg-stone-800 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-stone-700 transition-colors font-medium shadow-sm h-10 sm:h-auto"
                                title={t('dashboard.createBoard')}
                            >
                                <Plus size={20} />
                                <span className="text-sm hidden md:inline">{t('dashboard.createBoard')}</span>
                            </Link>
                        </div>
                    </div>

                    {loadingBoards ? (
                        <div className="flex justify-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-3 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                                <p className="text-stone-500 text-sm">{t('common.loading')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {boards.length > 0 && (
                                <PendingRequests boards={boards} onActionComplete={() => { }} />
                            )}
                            <section>
                                <h2 className="text-lg font-semibold text-stone-700 mb-4 px-1">
                                    {language === 'tr' ? 'Oluşturduğum Panolar' : 'Boards I Created'}
                                </h2>
                                {boards.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 shadow-matte">
                                        <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <LayoutGrid size={24} className="text-stone-400" />
                                        </div>
                                        <h3 className="text-base font-semibold text-stone-800 mb-1">
                                            {t('dashboard.noBoards')}
                                        </h3>
                                        <p className="text-stone-500 text-sm mb-4">
                                            {t('dashboard.createFirstBoard')}
                                        </p>
                                        <Link
                                            href="/board/new"
                                            className="inline-flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors text-sm font-medium"
                                        >
                                            <Plus size={16} />
                                            {t('dashboard.createBoard')}
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="board-grid">
                                        {boards.map((board) => (
                                            <BoardCard key={board.id} board={board} isOwner={true} />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {joinedBoards.length > 0 && (
                                <section>
                                    <h2 className="text-lg font-semibold text-stone-700 mb-4 px-1">
                                        {t('dashboard.joinedBoards')}
                                    </h2>
                                    <div className="board-grid">
                                        {joinedBoards.map((board) => (
                                            <BoardCard key={board.id} board={board} isOwner={false} />
                                        ))}
                                    </div>
                                </section>
                            )}

                        </div>
                    )}
                </div>
            </main>

            <div className="hidden sm:block shrink-0 z-50 bg-white py-4 border-t border-stone-200">
                <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setShowPrivacyModal(true)} className="text-sm font-semibold text-stone-500 hover:text-stone-800 transition-colors">
                        {language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
                    </button>
                    <span className="text-stone-300">|</span>
                    <button onClick={() => setShowTermsModal(true)} className="text-sm font-semibold text-stone-500 hover:text-stone-800 transition-colors">
                        {language === 'tr' ? 'Kullanım Şartları' : 'Terms of Use'}
                    </button>
                    <span className="text-stone-300">|</span>
                    <span className="text-sm text-stone-400">© {new Date().getFullYear()} Collabo @Designed by Ahmet Serçe</span>
                </div>
            </div>

            {showJoinModal && user && (
                <JoinBoardModal
                    userId={user.uid}
                    onClose={() => setShowJoinModal(false)}
                    onJoined={() => { }}
                />
            )}

            <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} language={language} />
            <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} language={language} />

            {boardToDelete && (
                <DeleteBoardModal
                    isOpen={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setBoardToDelete(null);
                    }}
                    boardId={boardToDelete.id}
                    boardTitle={boardToDelete.title}
                    onDeleteSuccess={handleDeleteSuccess}
                />
            )}

            {showTrashBin && (
                <TrashBinModal
                    isOpen={showTrashBin}
                    onClose={() => setShowTrashBin(false)}
                    mode="system"
                />
            )}
        </div>
    );
}
