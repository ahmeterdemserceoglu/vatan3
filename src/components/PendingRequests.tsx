import { useState, useEffect } from 'react';
import { Board, User } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Check, X, Clock, User as UserIcon, Loader2 } from 'lucide-react';
import { approveMember, rejectMember } from '@/lib/boards';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface PendingRequest {
    boardId: string;
    boardTitle: string;
    userId: string;
    user?: User; // Fetched user data
    loading: boolean;
}

interface PendingRequestsProps {
    boards: Board[];
    onActionComplete: () => void;
}

export function PendingRequests({ boards, onActionComplete }: PendingRequestsProps) {
    const { t, language } = useTranslation();
    const { user: currentUser } = useStore();
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, [boards]);

    const loadRequests = async () => {
        setLoading(true);
        const allRequests: PendingRequest[] = [];

        // 1. Collect all pending member IDs from all boards
        for (const board of boards) {
            if (board.permissions?.requireMemberApproval && board.permissions.pendingMembers?.length) {
                for (const userId of board.permissions.pendingMembers) {
                    allRequests.push({
                        boardId: board.id,
                        boardTitle: board.title,
                        userId: userId,
                        loading: true,
                    });
                }
            }
        }

        // 2. Initial state with loading true
        setRequests(allRequests);

        // 3. Fetch user details for each request
        const loadedRequests = await Promise.all(
            allRequests.map(async (req) => {
                try {
                    const userDoc = await getDoc(doc(db, 'users', req.userId));
                    if (userDoc.exists()) {
                        return { ...req, user: userDoc.data() as User, loading: false };
                    }
                } catch (error) {
                    console.error('Error fetching user:', error);
                }
                return { ...req, loading: false };
            })
        );

        setRequests(loadedRequests);
        setLoading(false);
    };

    const handleApprove = async (req: PendingRequest) => {
        if (!currentUser || processingId) return;
        setProcessingId(req.userId + req.boardId); // Unique key combo

        try {
            await approveMember(
                req.boardId,
                req.userId,
                req.user?.displayName || 'Unknown User',
                req.boardTitle,
                currentUser.uid,
                currentUser.displayName
            );
            // Remove from local list immediately for UI responsiveness
            setRequests(prev => prev.filter(r => !(r.boardId === req.boardId && r.userId === req.userId)));
            onActionComplete(); // Refresh parent data
        } catch (error) {
            console.error('Approve failed:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (req: PendingRequest) => {
        if (!currentUser || processingId) return;
        setProcessingId(req.userId + req.boardId);

        try {
            await rejectMember(
                req.boardId,
                req.userId,
                req.boardTitle,
                currentUser.uid,
                currentUser.displayName
            );
            setRequests(prev => prev.filter(r => !(r.boardId === req.boardId && r.userId === req.userId)));
            onActionComplete();
        } catch (error) {
            console.error('Reject failed:', error);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading && requests.length === 0) return null;
    if (requests.length === 0) return null;

    return (
        <section className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-4 px-1">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Clock size={18} />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-stone-800">
                        {language === 'tr' ? 'Bekleyen İstekler' : 'Pending Requests'}
                    </h2>
                    <p className="text-xs text-stone-500">
                        {language === 'tr'
                            ? `${requests.length} öğrenci onay bekliyor`
                            : `${requests.length} students waiting for approval`}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.map((req, index) => (
                    <div
                        key={`${req.boardId}-${req.userId}`}
                        className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-colors"
                    >
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden border border-stone-100">
                                {req.user?.photoURL ? (
                                    <Image
                                        src={req.user.photoURL}
                                        alt={req.user.displayName}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="text-stone-400" size={20} />
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-stone-800">
                                    {req.user?.displayName || 'Unknown User'}
                                </h3>
                                <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                                    {req.boardTitle}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleReject(req)}
                                disabled={processingId === req.userId + req.boardId}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title={language === 'tr' ? 'Reddet' : 'Reject'}
                            >
                                <X size={18} />
                            </button>
                            <button
                                onClick={() => handleApprove(req)}
                                disabled={processingId === req.userId + req.boardId}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-green-600 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
                                title={language === 'tr' ? 'Onayla' : 'Approve'}
                            >
                                {processingId === req.userId + req.boardId ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Check size={18} />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
