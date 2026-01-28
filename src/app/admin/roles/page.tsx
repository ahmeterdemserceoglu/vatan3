'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { Header } from '@/components/Header';
import { getAllUsers, setUserRole, getRolePermissions, updateRolePermissions, toggleUserSuspension, getUserBoards, getAllBoards } from '@/lib/admin';
import { User, Board } from '@/types';
import {
    Search,
    Shield,
    User as UserIcon,
    GraduationCap,
    Users,
    Loader2,
    Save,
    AlertCircle,
    Info,
    Layout,
    Ban,
    History,
    LayoutGrid,
    Globe,
    ChevronRight,
    MessageSquare,
    ExternalLink,
    ArrowUpAz,
    ArrowDownAz,
    Clock,
    Award
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/components/ToastProvider';
import { cn } from '@/lib/utils';

export default function RoleManagementPage() {
    const { isAdmin, isLoading: loadingPermissions } = usePermissions();
    const { t, language } = useTranslation();
    const { showToast } = useToast();
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // Permission Settings State
    const [roleConfigs, setRoleConfigs] = useState<any>(null);
    const [savingConfigs, setSavingConfigs] = useState(false);

    // Advanced User Management State
    const [selectedUserBoards, setSelectedUserBoards] = useState<{ userId: string; boards: Board[] } | null>(null);
    const [loadingBoards, setLoadingBoards] = useState(false);
    const [boardCounts, setBoardCounts] = useState<{ [userId: string]: number }>({});
    const [sortBy, setSortBy] = useState<'name' | 'name-reverse' | 'boards' | 'last-seen'>('name');

    useEffect(() => {
        if (!loadingPermissions && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, loadingPermissions, router]);

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedUsers, fetchedConfigs, allBoards] = await Promise.all([
                getAllUsers(),
                getRolePermissions(),
                getAllBoards()
            ]);

            // Calculate board counts
            const counts: { [userId: string]: number } = {};
            allBoards.forEach(board => {
                counts[board.ownerId] = (counts[board.ownerId] || 0) + 1;
            });

            setUsers(fetchedUsers);
            setRoleConfigs(fetchedConfigs);
            setBoardCounts(counts);
        } catch (error) {
            console.error('Error loading admin data:', error);
            showToast(t('common.error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: 'teacher' | 'student' | 'admin') => {
        setUpdatingUserId(userId);
        try {
            await setUserRole(userId, newRole);
            setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole } : u));
            showToast(t('admin.roleUpdated'), 'success');
        } catch (error) {
            console.error('Error updating role:', error);
            showToast(t('common.error'), 'error');
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleToggleSuspension = async (user: User) => {
        const isBanning = !user.isSuspended;
        const confirmMsg = isBanning
            ? (language === 'tr' ? `${user.displayName} kullanıcısını askıya almak istediğinize emin misiniz?` : `Are you sure you want to suspend ${user.displayName}?`)
            : (language === 'tr' ? `${user.displayName} kullanıcısının engelini kaldırmak istediğinize emin misiniz?` : `Are you sure you want to unsuspend ${user.displayName}?`);

        if (!confirm(confirmMsg)) return;

        try {
            await toggleUserSuspension(user.uid, isBanning);
            setUsers(users.map(u => u.uid === user.uid ? { ...u, isSuspended: isBanning } : u));
            showToast(isBanning ? t('admin.userSuspended') : t('admin.userUnsuspended'), 'success');
        } catch (error) {
            console.error('Error toggling suspension:', error);
            showToast(t('common.error'), 'error');
        }
    };

    const handleViewBoards = async (user: User) => {
        setLoadingBoards(true);
        try {
            const boards = await getUserBoards(user.uid);
            setSelectedUserBoards({ userId: user.uid, boards });
        } catch (error) {
            console.error('Error fetching user boards:', error);
            showToast(t('common.error'), 'error');
        } finally {
            setLoadingBoards(false);
        }
    };

    const handleUpdatePermission = (role: string, permission: string, value: boolean) => {
        setRoleConfigs({
            ...roleConfigs,
            [role]: {
                ...roleConfigs[role],
                [permission]: value
            }
        });
    };

    const handleSavePermissions = async () => {
        setSavingConfigs(true);
        try {
            await updateRolePermissions(roleConfigs);
            showToast(t('admin.permissionsSaved'), 'success');
        } catch (error) {
            console.error('Error saving permissions:', error);
            showToast(t('common.error'), 'error');
        } finally {
            setSavingConfigs(false);
        }
    };

    const filteredUsers = useMemo(() => {
        let result = searchQuery.trim()
            ? users.filter(u =>
                u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : [...users];

        // Apply sorting
        return result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return (a.displayName || '').localeCompare(b.displayName || '');
                case 'name-reverse':
                    return (b.displayName || '').localeCompare(a.displayName || '');
                case 'boards':
                    return (boardCounts[b.uid] || 0) - (boardCounts[a.uid] || 0);
                case 'last-seen':
                    const dateA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
                    const dateB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
                    return dateB - dateA;
                default:
                    return 0;
            }
        });
    }, [users, searchQuery, sortBy, boardCounts]);

    if (loadingPermissions || !isAdmin) return null;

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            <Header />

            <main className="flex-1 overflow-y-auto pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
                    {/* Simplified Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-stone-800">{t('admin.title')}</h1>
                            <p className="text-stone-500 mt-1">
                                {language === 'tr' ? 'Sistem yetkilerini ve kullanıcı rollerini buradan yönetin' : 'Manage system permissions and user roles from here'}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2 shadow-sm">
                                <span className="text-xs font-bold text-stone-400 px-1">{language === 'tr' ? 'SIRALA:' : 'SORT:'}</span>
                                <select
                                    className="bg-transparent border-none text-sm py-2 pl-1 pr-3 focus:ring-0 text-stone-600 font-medium"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                >
                                    <option value="name">{language === 'tr' ? 'Ad (A-Z)' : 'Name (A-Z)'}</option>
                                    <option value="name-reverse">{language === 'tr' ? 'Ad (Z-A)' : 'Name (Z-A)'}</option>
                                    <option value="boards">{language === 'tr' ? 'En Çok Pano' : 'Most Boards'}</option>
                                    <option value="last-seen">{language === 'tr' ? 'Son Giriş' : 'Last Seen'}</option>
                                </select>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={t('admin.searchPlaceholder')}
                                    className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 w-full sm:w-64 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleSavePermissions}
                                disabled={savingConfigs}
                                className="flex items-center justify-center gap-2 px-6 py-2 bg-stone-800 text-white rounded-lg text-sm font-semibold hover:bg-stone-700 transition-all disabled:opacity-50 shadow-sm"
                            >
                                {savingConfigs ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                {t('admin.saveAll')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Users Section */}
                        <div className="lg:col-span-12 xl:col-span-5 flex flex-col h-fit bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users size={20} className="text-stone-400" />
                                    <h2 className="font-semibold text-stone-800">{t('admin.tabs.users')}</h2>
                                </div>
                                <span className="px-2.5 py-0.5 bg-stone-100 text-stone-600 rounded-full text-xs font-medium border border-stone-200">
                                    {filteredUsers.length}
                                </span>
                            </div>

                            <div className="divide-y divide-stone-50 max-h-[600px] overflow-y-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center p-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-stone-400 gap-3">
                                        <AlertCircle size={32} strokeWidth={1.5} />
                                        <p className="text-sm font-medium">{t('admin.noUsers')}</p>
                                    </div>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <div key={u.uid} className={cn(
                                            "p-4 hover:bg-stone-50 transition-colors group relative",
                                            u.isSuspended && "bg-red-50/30"
                                        )}>
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Avatar src={u.photoURL} name={u.displayName} size="sm" />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-stone-800 text-sm truncate leading-tight">{u.displayName}</p>
                                                                {u.isSuspended && (
                                                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase">
                                                                        {language === 'tr' ? 'ASKIDA' : 'SUSPENDED'}
                                                                    </span>
                                                                )}
                                                                {boardCounts[u.uid] > 0 && (
                                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded border border-amber-100">
                                                                        <LayoutGrid size={10} />
                                                                        {boardCounts[u.uid]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-stone-400 truncate mt-0.5">{u.email}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {(['student', 'teacher', 'admin'] as const).map((role) => (
                                                            <button
                                                                key={role}
                                                                onClick={() => handleUpdateRole(u.uid, role)}
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded text-[10px] font-bold transition-all border uppercase",
                                                                    u.role === role
                                                                        ? (role === 'admin' ? "bg-red-50 border-red-200 text-red-600" : role === 'teacher' ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-stone-800 border-stone-800 text-white")
                                                                        : "bg-white border-stone-100 text-stone-300 hover:border-stone-200 hover:text-stone-600"
                                                                )}
                                                            >
                                                                {role[0].toUpperCase()}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-stone-400 border-t border-stone-50 pt-3">
                                                    <div className="flex items-center gap-1.5" title={language === 'tr' ? 'Son Görülme' : 'Last Seen'}>
                                                        <History size={14} className="text-stone-300" />
                                                        {u.lastSeen ? (new Date(u.lastSeen)).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '---'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5" title="IP Address">
                                                        <Globe size={14} className="text-stone-300" />
                                                        {u.ipAddress || '0.0.0.0'}
                                                    </div>

                                                    <div className="flex items-center gap-1 ml-auto">
                                                        <button
                                                            onClick={() => handleViewBoards(u)}
                                                            disabled={loadingBoards}
                                                            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                                                            title={language === 'tr' ? 'Panoları Gör' : 'View Boards'}
                                                        >
                                                            <LayoutGrid size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleSuspension(u)}
                                                            className={cn(
                                                                "p-1.5 rounded-lg transition-colors",
                                                                u.isSuspended
                                                                    ? "text-red-600 bg-red-50 hover:bg-red-100"
                                                                    : "text-stone-400 hover:text-red-600 hover:bg-red-50"
                                                            )}
                                                            title={u.isSuspended ? (language === 'tr' ? 'Engeli Kaldır' : 'Unsuspend') : (language === 'tr' ? 'Engelle' : 'Suspend')}
                                                        >
                                                            <Ban size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Boards Peek list */}
                                                {selectedUserBoards?.userId === u.uid && (
                                                    <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{language === 'tr' ? 'SAHİP OLDUĞU PANOLAR' : 'OWNED BOARDS'}</span>
                                                            <button onClick={() => setSelectedUserBoards(null)} className="text-stone-400 hover:text-stone-600">
                                                                <ChevronRight size={14} className="rotate-90" />
                                                            </button>
                                                        </div>
                                                        {selectedUserBoards.boards.length === 0 ? (
                                                            <p className="text-[10px] text-stone-400 italic">{language === 'tr' ? 'Pano bulunamadı.' : 'No boards found.'}</p>
                                                        ) : (
                                                            <ul className="space-y-1">
                                                                {selectedUserBoards.boards.map(b => (
                                                                    <li key={b.id} className="flex items-center justify-between text-[11px]">
                                                                        <span className="text-stone-600 truncate mr-2">{b.title}</span>
                                                                        <a href={`/board/${b.id}`} target="_blank" className="text-blue-500 hover:underline flex items-center gap-0.5">
                                                                            <ExternalLink size={10} />
                                                                            {language === 'tr' ? 'Git' : 'Go'}
                                                                        </a>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Permissions Section */}
                        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Teacher Permissions */}
                                <div className="bg-white rounded-xl border border-stone-200 shadow-sm h-fit overflow-hidden">
                                    <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
                                        <GraduationCap size={20} className="text-stone-400" />
                                        <h2 className="font-semibold text-stone-800">{t('admin.teacherPermissions')}</h2>
                                    </div>
                                    <div className="p-6 space-y-3">
                                        {roleConfigs ? Object.keys(roleConfigs.teacher).map(perm => (
                                            <PermissionToggle
                                                key={perm}
                                                label={perm}
                                                value={roleConfigs.teacher[perm]}
                                                onChange={(val) => handleUpdatePermission('teacher', perm, val)}
                                                t={t}
                                            />
                                        )) : <div className="text-center text-stone-400 text-sm py-4">Yükleniyor...</div>}
                                    </div>
                                </div>

                                {/* Student Permissions */}
                                <div className="bg-white rounded-xl border border-stone-200 shadow-sm h-fit overflow-hidden">
                                    <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
                                        <UserIcon size={20} className="text-stone-400" />
                                        <h2 className="font-semibold text-stone-800">{t('admin.studentPermissions')}</h2>
                                    </div>
                                    <div className="p-6 space-y-3">
                                        {roleConfigs ? Object.keys(roleConfigs.student).map(perm => (
                                            <PermissionToggle
                                                key={perm}
                                                label={perm}
                                                value={roleConfigs.student[perm]}
                                                onChange={(val) => handleUpdatePermission('student', perm, val)}
                                                t={t}
                                            />
                                        )) : <div className="text-center text-stone-400 text-sm py-4">Yükleniyor...</div>}
                                    </div>
                                </div>
                            </div>

                            {/* Info Card */}
                            <div className="bg-stone-100/50 border border-stone-200 rounded-xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-white border border-stone-200 rounded-lg flex items-center justify-center shrink-0">
                                        <Info size={20} className="text-stone-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-stone-800 mb-1">{t('admin.importantNote')}</h3>
                                        <p className="text-sm text-stone-500 leading-relaxed">
                                            {t('admin.noteDescription')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function PermissionToggle({ label, value, onChange, t }: { label: string, value: boolean, onChange: (val: boolean) => void, t: any }) {
    const translatedLabel = t(`admin.permissionLabels.${label}`);
    const formattedLabel = translatedLabel !== `admin.permissionLabels.${label}`
        ? translatedLabel
        : label.replace(/([A-Z])/g, ' $1').replace(/^can /, '').trim();

    return (
        <div
            onClick={() => onChange(!value)}
            className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                value
                    ? "bg-stone-50 border-stone-200 shadow-sm"
                    : "bg-white border-stone-100 opacity-60 hover:opacity-100"
            )}
        >
            <span className="text-sm font-medium text-stone-700 truncate pr-2">
                {formattedLabel}
            </span>
            <div className={cn(
                "w-9 h-5 rounded-full relative transition-colors p-0.5",
                value ? "bg-stone-800" : "bg-stone-200"
            )}>
                <div className={cn(
                    "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                    value ? "translate-x-4" : "translate-x-0"
                )} />
            </div>
        </div>
    );
}
