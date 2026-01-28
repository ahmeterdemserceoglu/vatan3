'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import BackHeader from '@/components/BackHeader';
import { Search, Loader2, Ban, CheckCircle, User as UserIcon, Shield, GraduationCap, Mail, Calendar, Eye, X } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'student' | 'admin'>('all');

    const fetchUsers = async (isInitial = false) => {
        setLoading(true);
        try {
            let q;

            if (searchTerm) {
                q = query(
                    collection(db, 'users'),
                    where('displayName', '>=', searchTerm),
                    where('displayName', '<=', searchTerm + '\uf8ff'),
                    limit(30)
                );
            } else if (roleFilter !== 'all') {
                // Not: orderBy('createdAt') removed to prevent "Index required" error on Firestore.
                // We will sort the fetched batch client-side. Pagination might not be perfectly chronological across batches, 
                // but it ensures the app works without creating custom indexes manually.
                if (isInitial) {
                    q = query(collection(db, 'users'), where('role', '==', roleFilter), limit(30));
                } else if (lastDoc) {
                    q = query(collection(db, 'users'), where('role', '==', roleFilter), startAfter(lastDoc), limit(30));
                } else {
                    setLoading(false);
                    return;
                }
            } else {
                if (isInitial) {
                    q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(30));
                } else if (lastDoc) {
                    q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(30));
                } else {
                    setLoading(false);
                    return;
                }
            }

            const snapshot = await getDocs(q);
            const newUsers = snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User));

            // Client-side sort for the batch
            if (roleFilter !== 'all') {
                newUsers.sort((a, b) => {
                    const dateA = new Date(a.createdAt as any).getTime();
                    const dateB = new Date(b.createdAt as any).getTime();
                    return dateB - dateA;
                });
            }

            if (isInitial || searchTerm) {
                setUsers(newUsers);
            } else {
                setUsers(prev => [...prev, ...newUsers]);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === 30);
        } catch (error) {
            console.error('Users fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLastDoc(null);
        const timeoutId = setTimeout(() => {
            fetchUsers(true);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, roleFilter]);

    const handleSuspend = async (userId: string, currentStatus: boolean) => {
        if (!confirm(currentStatus ? 'Kullanıcının yasağını kaldırmak istiyor musunuz?' : 'Kullanıcıyı yasaklamak istiyor musunuz?')) return;

        const newStatus = !currentStatus;

        // Optimistic Update
        const updateState = (u: User) => u.uid === userId ? { ...u, isSuspended: newStatus } : u;
        setUsers(prev => prev.map(updateState));
        if (selectedUser?.uid === userId) setSelectedUser(prev => prev ? ({ ...prev, isSuspended: newStatus }) : null);

        try {
            await updateDoc(doc(db, 'users', userId), {
                isSuspended: newStatus,
                suspendedAt: newStatus ? new Date() : null
            });
        } catch (error) {
            // Revert on error
            const revertState = (u: User) => u.uid === userId ? { ...u, isSuspended: currentStatus } : u;
            setUsers(prev => prev.map(revertState));
            if (selectedUser?.uid === userId) setSelectedUser(prev => prev ? ({ ...prev, isSuspended: currentStatus }) : null);
            alert('İşlem başarısız: ' + error);
        }
    };

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'teacher' | 'student') => {
        if (!confirm(`Kullanıcının rolünü ${newRole.toUpperCase()} olarak değiştirmek istediğinize emin misiniz?`)) return;

        const oldRole = selectedUser?.uid === userId ? selectedUser.role : 'student';

        // Optimistic Update
        const updateState = (u: User) => u.uid === userId ? { ...u, role: newRole } : u;
        setUsers(prev => prev.map(updateState));
        if (selectedUser?.uid === userId) setSelectedUser(prev => prev ? ({ ...prev, role: newRole }) : null);

        try {
            await updateDoc(doc(db, 'users', userId), {
                role: newRole
            });
        } catch (error) {
            // Revert on error
            const revertState = (u: User) => u.uid === userId ? { ...u, role: oldRole as any } : u;
            setUsers(prev => prev.map(revertState));
            if (selectedUser?.uid === userId) setSelectedUser(prev => prev ? ({ ...prev, role: oldRole as any }) : null);
            alert('İşlem başarısız: ' + error);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded flex items-center gap-1"><Shield size={10} />ADMIN</span>;
            case 'teacher':
                return <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1"><GraduationCap size={10} />ÖĞRT</span>;
            default:
                return <span className="text-[10px] bg-stone-700/50 text-stone-400 px-1.5 py-0.5 rounded">ÖĞR</span>;
        }
    };

    return (
        <div className="min-h-screen bg-black text-stone-100 pb-20">
            <BackHeader title="Kullanıcılar" />

            {/* Search & Filter */}
            <div className="p-4 bg-stone-900/50 backdrop-blur-md sticky top-[65px] z-40 border-b border-stone-800 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                    <input
                        type="text"
                        placeholder="İsim ile ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>

                {/* Role Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {(['all', 'teacher', 'student', 'admin'] as const).map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={cn(
                                "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                                roleFilter === role
                                    ? "bg-indigo-500 text-white"
                                    : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                            )}
                        >
                            {role === 'all' ? 'Tümü' : role === 'teacher' ? 'Öğretmen' : role === 'student' ? 'Öğrenci' : 'Admin'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users List */}
            <div className="p-4 space-y-3">
                {users.map((user) => (
                    <div
                        key={user.uid}
                        className={cn(
                            "bg-stone-900 border p-4 rounded-xl flex items-center justify-between transition-all",
                            user.isSuspended ? "border-red-500/30 bg-red-500/5" : "border-stone-800"
                        )}
                    >
                        <div
                            className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer"
                            onClick={() => setSelectedUser(user)}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2",
                                user.isSuspended ? "border-red-500/50 bg-red-500/10" : "border-stone-700 bg-stone-800"
                            )}>
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <UserIcon size={24} className="text-stone-500" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-sm truncate">{user.displayName}</h3>
                                    {getRoleBadge(user.role)}
                                    {user.isSuspended && (
                                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">YASAK</span>
                                    )}
                                </div>
                                <p className="text-xs text-stone-500 truncate">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setSelectedUser(user)}
                                className="p-2 bg-stone-800 text-stone-400 hover:text-white rounded-lg transition-colors"
                            >
                                <Eye size={18} />
                            </button>
                            <button
                                onClick={() => handleSuspend(user.uid, !!user.isSuspended)}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    user.isSuspended
                                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                )}
                            >
                                {user.isSuspended ? <CheckCircle size={18} /> : <Ban size={18} />}
                            </button>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-indigo-500" size={28} />
                    </div>
                )}

                {!loading && users.length === 0 && (
                    <div className="text-center text-stone-500 py-16">
                        <UserIcon size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Kullanıcı bulunamadı.</p>
                    </div>
                )}

                {!loading && hasMore && !searchTerm && (
                    <button
                        onClick={() => fetchUsers()}
                        className="w-full py-4 text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors"
                    >
                        Daha fazla yükle
                    </button>
                )}
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center">
                    <div className="bg-stone-900 w-full max-w-lg rounded-t-3xl border-t border-stone-700 max-h-[85vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-stone-900/95 backdrop-blur-md p-4 border-b border-stone-800 flex items-center justify-between">
                            <h2 className="font-bold text-lg">Kullanıcı Detayı</h2>
                            <button onClick={() => setSelectedUser(null)} className="p-2 text-stone-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="p-6">
                            <div className="flex flex-col items-center mb-6">
                                <div className={cn(
                                    "w-24 h-24 rounded-full flex items-center justify-center border-4 mb-4",
                                    selectedUser.isSuspended ? "border-red-500/50 bg-red-500/10" : "border-indigo-500/50 bg-stone-800"
                                )}>
                                    {selectedUser.photoURL ? (
                                        <img src={selectedUser.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <UserIcon size={40} className="text-stone-500" />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold">{selectedUser.displayName}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    {getRoleBadge(selectedUser.role)}
                                    {selectedUser.isSuspended && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">YASAKLI</span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-stone-800/50 rounded-xl p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Shield size={20} className="text-indigo-400" />
                                        <div>
                                            <p className="text-xs text-stone-500">Kullanıcı Rolü</p>
                                            <p className="text-sm font-medium uppercase">{selectedUser.role}</p>
                                        </div>
                                    </div>
                                    <select
                                        value={selectedUser.role}
                                        onChange={(e) => handleRoleChange(selectedUser.uid, e.target.value as any)}
                                        className="bg-stone-900 border border-stone-700 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option value="student">Öğrenci</option>
                                        <option value="teacher">Öğretmen</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div className="bg-stone-800/50 rounded-xl p-4 flex items-center gap-3">
                                    <Mail size={20} className="text-stone-500" />
                                    <div>
                                        <p className="text-xs text-stone-500">E-posta</p>
                                        <p className="text-sm font-medium">{selectedUser.email}</p>
                                    </div>
                                </div>

                                <div className="bg-stone-800/50 rounded-xl p-4 flex items-center gap-3">
                                    <Calendar size={20} className="text-stone-500" />
                                    <div>
                                        <p className="text-xs text-stone-500">Kayıt Tarihi</p>
                                        <p className="text-sm font-medium">{formatDate(selectedUser.createdAt)}</p>
                                    </div>
                                </div>

                                {selectedUser.lastSeen && (
                                    <div className="bg-stone-800/50 rounded-xl p-4 flex items-center gap-3">
                                        <Eye size={20} className="text-stone-500" />
                                        <div>
                                            <p className="text-xs text-stone-500">Son Görülme</p>
                                            <p className="text-sm font-medium">{formatDate(selectedUser.lastSeen)}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedUser.isSuspended && selectedUser.suspensionReason && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                        <p className="text-xs text-red-400 mb-1">Yasaklama Sebebi</p>
                                        <p className="text-sm">{selectedUser.suspensionReason}</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={() => handleSuspend(selectedUser.uid, !!selectedUser.isSuspended)}
                                    className={cn(
                                        "w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                                        selectedUser.isSuspended
                                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                            : "bg-red-500 text-white hover:bg-red-600"
                                    )}
                                >
                                    {selectedUser.isSuspended ? <CheckCircle size={20} /> : <Ban size={20} />}
                                    {selectedUser.isSuspended ? 'Yasağı Kaldır' : 'Kullanıcıyı Yasakla'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
