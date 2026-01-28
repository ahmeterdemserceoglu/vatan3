'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Board } from '@/types';
import BackHeader from '@/components/BackHeader';
import { Search, Loader2, Trash2, Layout, Eye, X, Globe, Lock, ShieldAlert, Calendar, Users, FileText, MessageSquare, User as UserIcon } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

export default function BoardsPage() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

    const fetchBoards = async (isInitial = false) => {
        setLoading(true);
        try {
            let q;
            if (searchTerm) {
                q = query(
                    collection(db, 'boards'),
                    where('title', '>=', searchTerm),
                    where('title', '<=', searchTerm + '\uf8ff'),
                    limit(20)
                );
            } else {
                if (isInitial) {
                    q = query(collection(db, 'boards'), orderBy('createdAt', 'desc'), limit(20));
                } else if (lastDoc) {
                    q = query(collection(db, 'boards'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(20));
                } else {
                    setLoading(false);
                    return;
                }
            }

            const snapshot = await getDocs(q);
            const newBoards = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
                } as Board;
            });

            if (isInitial || searchTerm) {
                setBoards(newBoards);
            } else {
                setBoards(prev => [...prev, ...newBoards]);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === 20);
        } catch (error) {
            console.error('Fetch boards error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLastDoc(null);
        const timeoutId = setTimeout(() => {
            fetchBoards(true);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleDelete = async (boardId: string) => {
        if (!confirm('DİKKAT: Bu panoyu silmek geri alınamaz! Pano ve içindeki tüm notlar silinecek. Emin misiniz?')) return;

        try {
            await deleteDoc(doc(db, 'boards', boardId));
            setBoards(boards.filter(b => b.id !== boardId));
            if (selectedBoard?.id === boardId) setSelectedBoard(null);
        } catch (error) {
            alert('Silme başarısız: ' + error);
        }
    };

    // --- ANLIK GÜNCELLEME MANTIĞI (togglePrivacy) ---
    const togglePrivacy = async (board: Board) => {
        if (!confirm(`Bu panoyu ${board.isPublic ? 'GİZLİ' : 'HERKESE AÇIK'} yapmak istiyor musunuz?`)) return;

        const oldStatus = board.isPublic;
        const newStatus = !oldStatus;

        // 1. Arayüzü ANINDA güncelle (Optimistic Update)
        const updateState = (b: Board) => b.id === board.id ? { ...b, isPublic: newStatus } : b;
        setBoards(prev => prev.map(updateState));
        if (selectedBoard?.id === board.id) setSelectedBoard(prev => prev ? ({ ...prev, isPublic: newStatus }) : null);

        try {
            // 2. Arka planda kaydet
            await updateDoc(doc(db, 'boards', board.id), {
                isPublic: newStatus
            });
        } catch (error: any) {
            // 3. Hata olursa geri al
            const revertState = (b: Board) => b.id === board.id ? { ...b, isPublic: oldStatus } : b;
            setBoards(prev => prev.map(revertState));
            if (selectedBoard?.id === board.id) setSelectedBoard(prev => prev ? ({ ...prev, isPublic: oldStatus }) : null);

            console.error('Gizlilik güncelleme hatası:', error);
            alert('Güncelleme başarısız: ' + (error.message || error));
        }
    };

    // --- ANLIK GÜNCELLEME MANTIĞI (updateBoardPermission) ---
    const updateBoardPermission = async (field: string, value: any) => {
        if (!selectedBoard) return;

        const oldPermissions = { ...selectedBoard.permissions };

        // 1. Arayüzü ANINDA güncelle
        const getUpdatedBoard = (b: Board) => {
            if (b.id !== selectedBoard.id) return b;
            const currentPerms = b.permissions || {
                whoCanAddNotes: 'members',
                whoCanComment: 'everyone',
                whoCanChat: 'everyone',
                allowFileDownload: true,
                requireMemberApproval: false
            };
            return {
                ...b,
                permissions: { ...currentPerms, [field]: value }
            } as Board;
        };

        setBoards(prev => prev.map(getUpdatedBoard));
        setSelectedBoard(prev => prev ? getUpdatedBoard(prev) : null);

        try {
            // 2. Arka planda kaydet
            const boardRef = doc(db, 'boards', selectedBoard.id);
            await updateDoc(boardRef, {
                [`permissions.${field}`]: value
            });
        } catch (err: any) {
            // 3. Hata olursa geri al
            const revertBoard = (b: Board) => {
                if (b.id !== selectedBoard.id) return b;
                return { ...b, permissions: oldPermissions } as Board;
            };
            setBoards(prev => prev.map(revertBoard));
            setSelectedBoard(prev => prev ? revertBoard(prev) : null);
            alert('Güncelleme hatası: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-black text-stone-100 pb-20">
            <BackHeader title="Panolar" />

            <div className="p-4 bg-stone-900/50 backdrop-blur-md sticky top-[65px] z-40 border-b border-stone-800">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                    <input
                        type="text"
                        placeholder="Pano adı ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            <div className="p-4 space-y-3">
                {boards.map((board) => (
                    <div key={board.id} className="bg-stone-900 border border-stone-800 p-4 rounded-xl flex items-center justify-between group active:scale-[0.99] transition-all">
                        <div
                            className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer"
                            onClick={() => setSelectedBoard(board)}
                        >
                            <div className="w-12 h-12 rounded-lg bg-stone-800 flex items-center justify-center shrink-0 border border-stone-700 overflow-hidden relative">
                                {board.backgroundImage ? (
                                    <img src={board.backgroundImage} className="w-full h-full object-cover" alt="" />
                                ) : board.backgroundGradient ? (
                                    <div className="w-full h-full" style={{ background: board.backgroundGradient }} />
                                ) : (
                                    <div className="w-full h-full" style={{ backgroundColor: board.backgroundColor || '#333' }} />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <Layout size={18} className="text-white drop-shadow-md" />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-sm truncate">{board.title}</h3>
                                <p className="text-xs text-stone-500 truncate">Sahibi: {board.ownerName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400 flex items-center gap-1">
                                        <Users size={8} /> {board.members?.length || 0}
                                    </span>
                                    {board.isPublic ? (
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Globe size={8} /> Genel
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-stone-700/50 text-stone-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Lock size={8} /> Özel
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelectedBoard(board)}
                                className="p-2 bg-stone-800 text-stone-400 hover:text-white rounded-lg transition-colors"
                            >
                                <Eye size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(board.id)}
                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-indigo-500" />
                    </div>
                )}

                {!loading && hasMore && !searchTerm && (
                    <button
                        onClick={() => fetchBoards(false)}
                        className="w-full py-4 text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors"
                    >
                        Daha fazla yükle
                    </button>
                )}
            </div>

            {selectedBoard && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center">
                    <div className="bg-stone-900 w-full max-w-lg rounded-t-3xl border-t border-stone-700 max-h-[85vh] overflow-y-auto">
                        <div className="sticky top-0 bg-stone-900/95 backdrop-blur-md p-4 border-b border-stone-800 flex items-center justify-between z-10">
                            <h2 className="font-bold text-lg">Pano Detayı</h2>
                            <button onClick={() => setSelectedBoard(null)} className="p-2 text-stone-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-0">
                            <div className="h-32 relative w-full overflow-hidden">
                                {selectedBoard.backgroundImage ? (
                                    <img src={selectedBoard.backgroundImage} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full" style={{
                                        background: selectedBoard.backgroundGradient || selectedBoard.backgroundColor || '#333'
                                    }} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent flex items-end p-6">
                                    <h3 className="text-2xl font-bold text-white shadow-sm">{selectedBoard.title}</h3>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-stone-800/50 p-4 rounded-xl">
                                        <Users className="text-indigo-400 mb-2" size={20} />
                                        <p className="text-2xl font-bold">{selectedBoard.members?.length || 0}</p>
                                        <p className="text-xs text-stone-500">Üye Sayısı</p>
                                    </div>
                                    <div className="bg-stone-800/50 p-4 rounded-xl">
                                        <Calendar className="text-emerald-400 mb-2" size={20} />
                                        <p className="text-sm font-medium mt-1">{formatDate(selectedBoard.createdAt)}</p>
                                        <p className="text-xs text-stone-500">Oluşturulma</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-stone-800/30 rounded-xl border border-stone-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center">
                                                <UserIcon size={20} className="text-stone-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-stone-500">Pano Sahibi</p>
                                                <p className="font-medium">{selectedBoard.ownerName}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-stone-800/30 rounded-xl border border-stone-800">
                                        <div className="flex items-center gap-3">
                                            {selectedBoard.isPublic ? (
                                                <Globe size={20} className="text-emerald-500" />
                                            ) : (
                                                <Lock size={20} className="text-amber-500" />
                                            )}
                                            <div>
                                                <p className="font-medium">{selectedBoard.isPublic ? 'Herkese Açık' : 'Gizli Pano'}</p>
                                                <p className="text-xs text-stone-500">
                                                    {selectedBoard.isPublic ? 'Linki olan herkes erişebilir' : 'Sadece davetli üyeler erişebilir'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => togglePrivacy(selectedBoard)}
                                            className="px-3 py-1.5 text-xs font-medium bg-stone-700 hover:bg-stone-600 rounded-lg transition-colors"
                                        >
                                            Değiştir
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider px-1">Yetki Yönetimi</h3>
                                    <div className="bg-stone-800/30 rounded-xl border border-stone-800 divide-y divide-stone-800">
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-sm text-stone-300">Not Ekleme</p>
                                                <p className="text-xs text-stone-500">Kimler not ekleyebilir?</p>
                                            </div>
                                            <select
                                                value={selectedBoard.permissions?.whoCanAddNotes || 'members'}
                                                onChange={(e) => updateBoardPermission('whoCanAddNotes', e.target.value)}
                                                className="bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="members">Sadece Üyeler</option>
                                                <option value="everyone">Herkes</option>
                                            </select>
                                        </div>

                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-sm text-stone-300">Yorum Yapma</p>
                                                <p className="text-xs text-stone-500">Kimler yorum yapabilir?</p>
                                            </div>
                                            <select
                                                value={selectedBoard.permissions?.whoCanComment || 'everyone'}
                                                onChange={(e) => updateBoardPermission('whoCanComment', e.target.value)}
                                                className="bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="members">Sadece Üyeler</option>
                                                <option value="everyone">Herkes</option>
                                            </select>
                                        </div>

                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-sm text-stone-300">Sohbet</p>
                                                <p className="text-xs text-stone-500">Kimler sohbet edebilir?</p>
                                            </div>
                                            <select
                                                value={selectedBoard.permissions?.whoCanChat || 'everyone'}
                                                onChange={(e) => updateBoardPermission('whoCanChat', e.target.value)}
                                                className="bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="members">Sadece Üyeler</option>
                                                <option value="everyone">Herkes</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-stone-800">
                                    <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <ShieldAlert size={12} /> Tehlikeli Bölge
                                    </p>
                                    <button
                                        onClick={() => handleDelete(selectedBoard.id)}
                                        className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={20} />
                                        Panoyu Kalıcı Olarak Sil
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
