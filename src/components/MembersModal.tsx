'use client';

import { useEffect, useState, useMemo } from 'react';
import { User, BoardMemberActivity, Board } from '@/types';
import { X, Search, Filter, ChevronDown, MoreVertical, UserMinus, FileText, MessageCircle, StickyNote, Calendar, Clock, Crown, ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { Avatar } from './Avatar';
import { subscribeToPresence } from '@/lib/presence';
import { subscribeToBoardMemberActivity, removeMember, getMemberStats, transferBoardOwnership } from '@/lib/boards';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activityLog';
import { useStore } from '@/store/useStore';

interface MembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: User[];
    ownerId: string;
    boardId: string;
    board?: Board;
    currentUserId?: string;
    isTeacher?: boolean;
}

type FilterType = 'all' | 'teachers' | 'students';
type SortType = 'name' | 'lastActive' | 'joinDate';

interface MemberStats {
    noteCount: number;
    commentCount: number;
    messageCount: number;
}

export function MembersModal({
    isOpen,
    onClose,
    members,
    ownerId,
    boardId,
    board,
    currentUserId,
    isTeacher = false
}: MembersModalProps) {
    const { t, language } = useTranslation();
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [memberActivities, setMemberActivities] = useState<Map<string, BoardMemberActivity>>(new Map());

    // Search, Filter, Sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [sortType, setSortType] = useState<SortType>('name');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Profile view state
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [selectedMemberStats, setSelectedMemberStats] = useState<MemberStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Action menu state
    const [actionMenuMember, setActionMenuMember] = useState<string | null>(null);

    const isOwner = currentUserId === ownerId;
    const canManageMembers = isOwner || isTeacher;

    // Subscribe to presence updates
    useEffect(() => {
        if (!isOpen || !boardId) return;

        const unsubscribe = subscribeToPresence(boardId, (presenceData) => {
            const onlineIds = new Set(presenceData.map(p => p.userId));
            setOnlineUsers(onlineIds);
        });

        return () => unsubscribe();
    }, [isOpen, boardId]);

    // Subscribe to member activity updates
    useEffect(() => {
        if (!isOpen || !boardId) return;

        const unsubscribe = subscribeToBoardMemberActivity(boardId, (activities) => {
            const activityMap = new Map<string, BoardMemberActivity>();
            activities.forEach(a => {
                activityMap.set(a.userId, a);
            });
            setMemberActivities(activityMap);
        });

        return () => unsubscribe();
    }, [isOpen, boardId]);

    // Load stats when member profile is opened
    useEffect(() => {
        if (!selectedMember || !boardId) return;

        setLoadingStats(true);
        getMemberStats(boardId, selectedMember.uid)
            .then(stats => {
                setSelectedMemberStats(stats);
            })
            .catch(err => {
                console.error('Error loading stats:', err);
                setSelectedMemberStats({ noteCount: 0, commentCount: 0, messageCount: 0 });
            })
            .finally(() => setLoadingStats(false));
    }, [selectedMember, boardId]);

    // Filter and sort members
    const filteredAndSortedMembers = useMemo(() => {
        let result = [...members];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m =>
                m.displayName.toLowerCase().includes(query) ||
                m.email?.toLowerCase().includes(query)
            );
        }

        // Apply role filter
        switch (filterType) {
            case 'teachers':
                result = result.filter(m => m.role === 'teacher' || m.role === 'admin');
                break;
            case 'students':
                result = result.filter(m => m.role === 'student');
                break;
        }

        // Apply sorting
        switch (sortType) {
            case 'name':
                result.sort((a, b) => a.displayName.localeCompare(b.displayName));
                break;
            case 'lastActive':
                result.sort((a, b) => {
                    const aTime = memberActivities.get(a.uid)?.lastActiveAt?.getTime() || 0;
                    const bTime = memberActivities.get(b.uid)?.lastActiveAt?.getTime() || 0;
                    return bTime - aTime; // Most recent first
                });
                break;
            case 'joinDate':
                result.sort((a, b) => {
                    const aTime = memberActivities.get(a.uid)?.joinedAt?.getTime() || 0;
                    const bTime = memberActivities.get(b.uid)?.joinedAt?.getTime() || 0;
                    return bTime - aTime; // Most recent first
                });
                break;
        }

        return result;
    }, [members, searchQuery, filterType, sortType, memberActivities]);

    const onlineCount = members.filter(m => onlineUsers.has(m.uid)).length;

    // Format relative time for last active
    const formatLastActive = (date: Date | undefined): string => {
        if (!date || date.getTime() === 0) {
            return t('members.neverActive');
        }

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) {
            return t('time.justNow');
        } else if (diffMins < 60) {
            return `${diffMins} ${t('time.minutesAgo')}`;
        } else if (diffHours < 24) {
            return `${diffHours} ${t('time.hoursAgo')}`;
        } else {
            return `${diffDays} ${t('time.daysAgo')}`;
        }
    };

    const formatDate = (date: Date | undefined): string => {
        if (!date) return '-';
        return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    // Handle member actions
    const handleTransferOwnership = async (userId: string, name: string) => {
        const confirmText = language === 'tr'
            ? `Pano sahipliğini "${name}" adlı kullanıcıya devretmek istediğinize emin misiniz? Bu işlemden sonra panoyu yönetme yetkiniz kısıtlanacaktır.`
            : `Are you sure you want to transfer board ownership to "${name}"? You will lose full administrative control of this board.`;

        if (!confirm(confirmText)) return;

        try {
            await transferBoardOwnership(boardId, userId, name, currentUserId!);

            // Audit Log
            if (currentUserId) {
                const currentUser = members.find(m => m.uid === currentUserId);
                await logActivity({
                    userId: currentUserId,
                    userName: currentUser?.displayName || 'Sahip',
                    type: 'board_transfer',
                    description: `Pano sahipliğini "${name}" kullanıcısına devretti.`,
                    metadata: {
                        boardId,
                        boardTitle: board?.title,
                        targetUserId: userId,
                        targetUserName: name
                    }
                });
            }

            setActionMenuMember(null);
            setSelectedMember(null);
        } catch (error) {
            console.error('Error transferring ownership:', error);
            alert(language === 'tr' ? 'Sahiplik devredilemedi.' : 'Failed to transfer ownership.');
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm(t('members.removeConfirm'))) return;
        const member = members.find(m => m.uid === userId);
        try {
            await removeMember(boardId, userId);

            // Audit Log
            if (currentUserId) {
                const currentUser = members.find(m => m.uid === currentUserId);
                await logActivity({
                    userId: currentUserId,
                    userName: currentUser?.displayName || 'Yönetici',
                    type: 'member_remove',
                    description: `"${member?.displayName || 'Bir kullanıcı'}" kullanıcısını panodan çıkardı.`,
                    metadata: {
                        boardId,
                        boardTitle: board?.title,
                        targetUserId: userId,
                        targetUserName: member?.displayName
                    }
                });
            }

            setActionMenuMember(null);
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    if (!isOpen) return null;

    // Member Profile Modal
    if (selectedMember) {
        const activity = memberActivities.get(selectedMember.uid);
        const isOnline = onlineUsers.has(selectedMember.uid);

        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm shadow-matte-lg border border-stone-200 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                        <h2 className="text-lg font-bold text-stone-800">{t('members.viewProfile')}</h2>
                        <button
                            onClick={() => setSelectedMember(null)}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Profile Content */}
                    <div className="p-6">
                        {/* Avatar & Name */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="relative mb-3">
                                <Avatar
                                    src={selectedMember.photoURL}
                                    name={selectedMember.displayName}
                                    size="xl"
                                />
                                <span
                                    className={cn(
                                        "absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white",
                                        isOnline ? "bg-emerald-500" : "bg-stone-300"
                                    )}
                                />
                            </div>
                            <h3 className="text-xl font-bold text-stone-800">{selectedMember.displayName}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                                {selectedMember.uid === ownerId && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                        {t('board.owner')}
                                    </span>
                                )}
                                {selectedMember.role === 'teacher' && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                        {t('board.teacher')}
                                    </span>
                                )}
                                {selectedMember.role === 'admin' && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                                        {t('board.admin')}
                                    </span>
                                )}
                                {selectedMember.role === 'student' && (
                                    <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">
                                        {t('board.student')}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-stone-400 mt-1">
                                {isOnline ? (
                                    <span className="text-emerald-500 font-medium">{t('members.online')}</span>
                                ) : (
                                    <span>{t('members.lastActive')}: {formatLastActive(activity?.lastActiveAt)}</span>
                                )}
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="bg-stone-50 rounded-xl p-3 text-center">
                                <StickyNote size={18} className="mx-auto text-stone-400 mb-1" />
                                <p className="text-lg font-bold text-stone-800">
                                    {loadingStats ? '...' : selectedMemberStats?.noteCount || 0}
                                </p>
                                <p className="text-xs text-stone-500">{t('members.notes')}</p>
                            </div>
                            <div className="bg-stone-50 rounded-xl p-3 text-center">
                                <MessageCircle size={18} className="mx-auto text-stone-400 mb-1" />
                                <p className="text-lg font-bold text-stone-800">
                                    {loadingStats ? '...' : selectedMemberStats?.commentCount || 0}
                                </p>
                                <p className="text-xs text-stone-500">{t('members.comments')}</p>
                            </div>
                            <div className="bg-stone-50 rounded-xl p-3 text-center">
                                <FileText size={18} className="mx-auto text-stone-400 mb-1" />
                                <p className="text-lg font-bold text-stone-800">
                                    {loadingStats ? '...' : selectedMemberStats?.messageCount || 0}
                                </p>
                                <p className="text-xs text-stone-500">{t('members.messages')}</p>
                            </div>
                        </div>

                        {/* Join Date */}
                        {activity?.joinedAt && (
                            <div className="flex items-center gap-2 text-sm text-stone-500 justify-center">
                                <Calendar size={14} />
                                <span>{t('members.joinedOn')}: {formatDate(activity.joinedAt)}</span>
                            </div>
                        )}

                        {/* Management Actions */}
                        {canManageMembers && selectedMember.uid !== ownerId && selectedMember.uid !== currentUserId && (
                            <div className="mt-6 pt-4 border-t border-stone-100">
                                <button
                                    onClick={() => handleRemoveMember(selectedMember.uid)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <UserMinus size={16} />
                                    {t('members.removeMember')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-matte-lg border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-stone-100 bg-stone-50">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-lg font-bold text-stone-800">{t('members.boardMembers')}</h2>
                            <p className="text-xs text-stone-500">
                                {language === 'tr'
                                    ? `${members.length} üye • ${onlineCount} çevrimiçi`
                                    : `${members.length} member${members.length !== 1 ? 's' : ''} • ${onlineCount} online`}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            placeholder={t('members.searchMembers')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Filter & Sort */}
                    <div className="flex gap-2 mt-3">
                        {/* Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
                                className={cn(
                                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors border",
                                    filterType !== 'all'
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                                )}
                            >
                                <Filter size={14} />
                                <span>{t('common.filter')}</span>
                                <ChevronDown size={14} />
                            </button>
                            {showFilterMenu && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 min-w-[140px] py-1">
                                    {(['all', 'teachers', 'students'] as FilterType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => { setFilterType(type); setShowFilterMenu(false); }}
                                            className={cn(
                                                "w-full px-3 py-2 text-left text-sm hover:bg-stone-50 transition-colors",
                                                filterType === type ? "bg-indigo-50 text-indigo-600" : "text-stone-600"
                                            )}
                                        >
                                            {t(`members.filter${type.charAt(0).toUpperCase() + type.slice(1)}` as any)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                            >
                                <Clock size={14} />
                                <span>{t('members.sortBy')}</span>
                                <ChevronDown size={14} />
                            </button>
                            {showSortMenu && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 min-w-[140px] py-1">
                                    {(['name', 'lastActive', 'joinDate'] as SortType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => { setSortType(type); setShowSortMenu(false); }}
                                            className={cn(
                                                "w-full px-3 py-2 text-left text-sm hover:bg-stone-50 transition-colors",
                                                sortType === type ? "bg-indigo-50 text-indigo-600" : "text-stone-600"
                                            )}
                                        >
                                            {t(`members.sort${type.charAt(0).toUpperCase() + type.slice(1)}` as any)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="overflow-y-auto p-2 scroll-smooth flex-1">
                    {filteredAndSortedMembers.length === 0 ? (
                        <div className="text-center py-8 text-stone-400">
                            <p>{searchQuery ? (language === 'tr' ? 'Sonuç bulunamadı' : 'No results found') : t('members.noMembers')}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredAndSortedMembers.map((member) => {
                                const isOnline = onlineUsers.has(member.uid);
                                const activity = memberActivities.get(member.uid);

                                return (
                                    <div
                                        key={member.uid}
                                        className="flex items-center gap-3 p-3 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer group"
                                        onClick={() => setSelectedMember(member)}
                                    >
                                        <div className="relative">
                                            <Avatar
                                                src={member.photoURL}
                                                name={member.displayName}
                                                size="md"
                                            />
                                            <span
                                                className={cn(
                                                    "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                                                    isOnline ? "bg-emerald-500" : "bg-stone-300"
                                                )}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-stone-800 truncate">{member.displayName}</p>
                                                {member.uid === ownerId && (
                                                    <span className="text-[11px] text-stone-900 font-bold uppercase tracking-wider">
                                                        {t('board.owner')}
                                                    </span>
                                                )}
                                                {member.role === 'teacher' && (
                                                    <span className="text-[11px] text-stone-900 font-bold uppercase tracking-wider">
                                                        {t('board.teacher')}
                                                    </span>
                                                )}
                                                {member.role === 'admin' && (
                                                    <span className="text-[11px] text-red-600 font-bold uppercase tracking-wider">
                                                        {t('board.admin')}
                                                    </span>
                                                )}
                                                {member.role === 'student' && (
                                                    <span className="text-[11px] text-stone-900 font-bold uppercase tracking-wider">
                                                        {t('board.student')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-400 truncate">
                                                {isOnline ? (
                                                    <span className="text-emerald-500 font-medium">{t('members.online')}</span>
                                                ) : (
                                                    <span>{t('members.lastActive')}: {formatLastActive(activity?.lastActiveAt)}</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Quick Action Menu for Managers */}
                                        {canManageMembers && member.uid !== ownerId && member.uid !== currentUserId && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActionMenuMember(actionMenuMember === member.uid ? null : member.uid);
                                                    }}
                                                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {actionMenuMember === member.uid && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-20 min-w-[160px] py-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveMember(member.uid);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                        >
                                                            <UserMinus size={14} />
                                                            {t('members.removeMember')}
                                                        </button>

                                                        {/* Ownership Transfer Action - Owners and Admins Only */}
                                                        {isOwner && (
                                                            <div className="border-t border-stone-100 my-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleTransferOwnership(member.uid, member.displayName);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50"
                                                                >
                                                                    <Crown size={14} />
                                                                    {language === 'tr' ? 'Sahibi Yap' : 'Make Owner'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
