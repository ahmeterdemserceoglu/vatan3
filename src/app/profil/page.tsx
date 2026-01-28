'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Camera, Loader2, Check, User, Bell,
    Lock, Trash2, Globe, LogOut, BellRing,
    Eye, EyeOff, AlertTriangle, Clock, Edit3,
    Users, MessageSquare, BookOpen, Award, ChevronRight, X,
    Calendar, Activity, Shield, Zap, TrendingUp, LayoutDashboard
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '@/store/useStore';
import {
    updateUserProfile, updateNotificationPreferences,
    getNotificationPreferences, signOut, changePassword,
    deleteAccount, getUserWithLastSeen, updateLastSeen
} from '@/lib/auth';
import { uploadProfilePhoto } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';
import { usePushNotification } from '@/hooks/usePushNotification';

type TabType = 'about' | 'courses' | 'details' | 'settings' | 'security';

export default function ProfilePage() {
    const { user, setUser } = useStore();
    const { t, language, toggleLanguage } = useTranslation();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { permission, isSupported, isLoading: pushLoading, requestPermission } = usePushNotification();

    const [activeTab, setActiveTab] = useState<TabType>('about');
    const [isEditing, setIsEditing] = useState(false);

    // Form states
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showNotifSettings, setShowNotifSettings] = useState(false);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');

    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Account deletion states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Last seen state
    const [lastSeen, setLastSeen] = useState<Date | null>(null);
    const [notifPrefs, setNotifPrefs] = useState<{
        comment_reply: boolean;
        mention: boolean;
        new_comment: boolean;
        reaction: boolean;
        like: boolean;
        teacher_post: boolean;
        teacher_message: boolean;
        member_joined: boolean;
    }>({
        comment_reply: true,
        mention: true,
        new_comment: true,
        reaction: true,
        like: true,
        teacher_post: true,
        teacher_message: true,
        member_joined: true,
    });

    // User statistics state
    const [userStats, setUserStats] = useState({
        boardCount: 0,
        joinedBoardCount: 0,
        messageCount: 0,
        commentCount: 0,
        createdAt: null as Date | null,
        lastSeen: null as Date | null,
        loginCount: 0,
        isLoading: true,
    });

    // Fetch user statistics (optimized to reduce Firestore queries)
    const fetchUserStats = async (userId: string) => {
        try {
            // Get boards created by user
            const boardsQuery = query(collection(db, 'boards'), where('createdBy', '==', userId));
            const boardsSnap = await getDocs(boardsQuery);
            const boardCount = boardsSnap.size;

            // Get boards user is member of
            const joinedQuery = query(collection(db, 'boards'), where('members', 'array-contains', userId));
            const joinedSnap = await getDocs(joinedQuery);
            const joinedBoardCount = joinedSnap.size;

            // Note: Message count is disabled to reduce Firestore quota usage
            // In the future, consider storing message counts in user document

            setUserStats(prev => ({
                ...prev,
                boardCount,
                joinedBoardCount,
                messageCount: 0, // Disabled for performance
                isLoading: false,
            }));
        } catch (err) {
            console.error('Error fetching user stats:', err);
            setUserStats(prev => ({ ...prev, isLoading: false }));
        }
    };

    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        setDisplayName(user.displayName || '');
        setPhotoURL(user.photoURL || '');

        // Parallel fetch for non-critical data
        Promise.all([
            getNotificationPreferences(user.uid),
            getUserWithLastSeen(user.uid)
        ]).then(([prefs, seenData]) => {
            if (prefs) setNotifPrefs(prefs);
            if (seenData?.lastSeen) setLastSeen(new Date(seenData.lastSeen));
            if (seenData?.createdAt) {
                setUserStats(prev => ({
                    ...prev,
                    createdAt: seenData.createdAt?.toDate ? seenData.createdAt.toDate() : new Date(seenData.createdAt),
                }));
            }
        });

        updateLastSeen(user.uid);
    }, [user?.uid, router]);

    // Stats fetching disabled for performance - showing account info only
    // if (user && activeTab === 'details' && userStats.isLoading) {
    //     fetchUserStats(user.uid);
    // }

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) {
            setError(language === 'tr' ? 'Sadece resim dosyaları yüklenebilir' : 'Only image files can be uploaded');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError(language === 'tr' ? 'Dosya boyutu 5MB\'dan küçük olmalı' : 'File size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setError(null);

        const localPreviewUrl = URL.createObjectURL(file);
        setPhotoURL(localPreviewUrl);

        try {
            const url = await uploadProfilePhoto(user.uid, file);
            setPhotoURL(url);
            URL.revokeObjectURL(localPreviewUrl);

            await updateUserProfile(user.uid, {
                displayName: displayName.trim(),
                photoURL: url,
            });
            setUser({ ...user, photoURL: url });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err: any) {
            setError(err.message || (language === 'tr' ? 'Fotoğraf yüklenemedi' : 'Failed to upload photo'));
            setPhotoURL(user.photoURL || '');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user || !editFirstName.trim()) {
            setError(language === 'tr' ? 'İsim boş olamaz' : 'Name cannot be empty');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const newDisplayName = `${editFirstName.trim()} ${editLastName.trim()}`.trim();
            await updateUserProfile(user.uid, {
                displayName: newDisplayName,
                photoURL: photoURL || null,
            });

            setUser({
                ...user,
                displayName: newDisplayName,
                photoURL: photoURL || null,
            });

            setSuccess(true);
            setIsEditing(false);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || (language === 'tr' ? 'Profil güncellenemedi' : 'Failed to update profile'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const handlePasswordChange = async () => {
        setPasswordError(null);
        if (newPassword.length < 8) {
            setPasswordError(language === 'tr' ? 'Şifre en az 8 karakter olmalıdır' : 'Password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPasswordError(language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match');
            return;
        }

        setIsChangingPassword(true);
        try {
            await changePassword(currentPassword, newPassword);
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (err: any) {
            setPasswordError(err.message || (language === 'tr' ? 'Şifre değiştirilemedi' : 'Failed to change password'));
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteError(null);
        setIsDeleting(true);
        try {
            await deleteAccount(deletePassword);
            router.push('/');
        } catch (err: any) {
            setDeleteError(err.message || (language === 'tr' ? 'Hesap silinemedi' : 'Failed to delete account'));
        } finally {
            setIsDeleting(false);
        }
    };

    const formatLastSeen = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Memoize name parts correctly
    const { firstName, lastName } = useMemo(() => {
        const parts = (user?.displayName || '').trim().split(' ');
        if (parts.length === 1) return { firstName: parts[0], lastName: '' };
        return {
            firstName: parts.slice(0, -1).join(' '),
            lastName: parts[parts.length - 1]
        };
    }, [user?.displayName]);

    // Initialize edit states when opening edit mode & Handle Back Button
    useEffect(() => {
        if (isEditing) {
            setEditFirstName(firstName);
            setEditLastName(lastName);

            // Push history state to handle back gesture
            window.history.pushState({ profileEdit: true }, '');
            const handlePopState = () => setIsEditing(false);
            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.profileEdit) window.history.back();
            };
        }
    }, [isEditing, firstName, lastName]);

    // Handle Back Button for Delete Confirmation
    useEffect(() => {
        if (showDeleteConfirm) {
            window.history.pushState({ deleteConfirm: true }, '');
            const handlePopState = () => setShowDeleteConfirm(false);
            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.deleteConfirm) window.history.back();
            };
        }
    }, [showDeleteConfirm]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
            <Header />

            <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 pb-28 sm:pb-8">
                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-sm border border-[#dee2e6] p-8 mb-8">
                    <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                        {/* Avatar Section */}
                        <div className="relative group">
                            <Avatar
                                src={photoURL}
                                name={displayName}
                                size="2xl"
                                className={cn(
                                    "w-32 h-32 md:w-40 md:h-40 ring-1 ring-stone-100 shadow-sm transition-opacity",
                                    isUploading && "opacity-50"
                                )}
                            />
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-full animate-in fade-in">
                                    <Loader2 size={32} className="text-stone-400 animate-spin" />
                                </div>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="absolute bottom-1 right-1 p-2.5 bg-white border border-stone-200 text-stone-600 rounded-full hover:bg-stone-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <Camera size={18} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Name & Last Seen */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-bold text-[#212529] tracking-tight uppercase mb-2">
                                {user.displayName}
                            </h1>

                        </div>
                    </div>


                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-8 border-b border-[#dee2e6] mb-8 overflow-x-auto scrollbar-none px-2">
                    {[
                        { id: 'about', label: language === 'tr' ? 'Hakkımda' : 'About Me' },

                        { id: 'details', label: language === 'tr' ? 'Daha Fazla' : 'More Details' },
                        { id: 'settings', label: language === 'tr' ? 'Ayarlar' : 'Settings' },
                        { id: 'security', label: language === 'tr' ? 'Güvenlik' : 'Security' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                "pb-4 text-sm font-semibold whitespace-nowrap transition-all relative",
                                activeTab === tab.id
                                    ? "text-red-600"
                                    : "text-[#6c757d] hover:text-[#212529]"
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {activeTab === 'about' && (
                        <div className="bg-white rounded-xl shadow-sm border border-[#dee2e6] p-8 relative">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="absolute top-6 right-8 p-2 text-stone-400 hover:text-stone-900 transition-colors rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-200"
                            >
                                <Edit3 size={20} />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 pr-12">
                                <div>
                                    <h4 className="text-[11px] font-bold text-[#adb5bd] uppercase tracking-widest mb-1.5">{language === 'tr' ? 'İlk ad' : 'First name'}</h4>
                                    <p className="text-sm font-bold text-[#495057] uppercase">{firstName}</p>
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-bold text-[#adb5bd] uppercase tracking-widest mb-1.5">{language === 'tr' ? 'Soyadı' : 'Last name'}</h4>
                                    <p className="text-sm font-bold text-[#495057] uppercase">{lastName}</p>
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-bold text-[#adb5bd] uppercase tracking-widest mb-1.5">{language === 'tr' ? 'E-posta adresi' : 'Email address'}</h4>
                                    <p className="text-sm font-bold text-[#495057]">{user.email}</p>
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-bold text-[#adb5bd] uppercase tracking-widest mb-1.5">{language === 'tr' ? 'Ülke' : 'Country'}</h4>
                                    <p className="text-sm font-bold text-[#495057]">Türkiye</p>
                                </div>
                            </div>

                            {/* Edit Overlay */}
                            {isEditing && (
                                <div className="absolute inset-0 bg-white rounded-xl p-8 flex flex-col z-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-lg font-bold text-stone-900">{language === 'tr' ? 'Bilgileri Düzenle' : 'Edit Info'}</h3>
                                        <button onClick={() => setIsEditing(false)} className="p-2 text-stone-400 hover:text-stone-900">
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <div className="space-y-6 max-w-md">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">
                                                    {language === 'tr' ? 'Ad' : 'First Name'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editFirstName}
                                                    onChange={(e) => setEditFirstName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all text-stone-900 font-medium"
                                                    placeholder={language === 'tr' ? 'Adınız' : 'First Name'}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">
                                                    {language === 'tr' ? 'Soyad' : 'Last Name'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editLastName}
                                                    onChange={(e) => setEditLastName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all text-stone-900 font-medium"
                                                    placeholder={language === 'tr' ? 'Soyadınız' : 'Last Name'}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-4">
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="flex-1 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : (language === 'tr' ? 'Kaydet' : 'Save')}
                                            </button>
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all"
                                            >
                                                {language === 'tr' ? 'İptal' : 'Cancel'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="bg-white rounded-xl shadow-sm border border-[#dee2e6] p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Calendar size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-stone-900">{language === 'tr' ? 'Hesap Bilgileri' : 'Account Info'}</h3>
                                    <p className="text-xs text-stone-500 font-medium">{language === 'tr' ? 'Hesabınız hakkında detaylar' : 'Details about your account'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calendar size={16} className="text-stone-400" />
                                        <span className="text-xs font-bold text-stone-400 uppercase">{language === 'tr' ? 'Katılım Tarihi' : 'Join Date'}</span>
                                    </div>
                                    <p className="text-lg font-bold text-stone-800">
                                        {userStats.createdAt
                                            ? userStats.createdAt.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                                            : '-'}
                                    </p>
                                </div>

                                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Clock size={16} className="text-stone-400" />
                                        <span className="text-xs font-bold text-stone-400 uppercase">{language === 'tr' ? 'Son Görülme' : 'Last Seen'}</span>
                                    </div>
                                    <p className="text-lg font-bold text-stone-800">
                                        {lastSeen
                                            ? lastSeen.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : (language === 'tr' ? 'Şu an aktif' : 'Currently active')}
                                    </p>
                                </div>

                                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Shield size={16} className="text-stone-400" />
                                        <span className="text-xs font-bold text-stone-400 uppercase">{language === 'tr' ? 'Hesap Türü' : 'Account Type'}</span>
                                    </div>
                                    <p className="text-lg font-bold text-stone-800 capitalize">
                                        {user?.role === 'admin' ? (language === 'tr' ? 'Yönetici' : 'Admin') :
                                            user?.role === 'teacher' ? (language === 'tr' ? 'Öğretmen' : 'Teacher') :
                                                (language === 'tr' ? 'Öğrenci' : 'Student')}
                                    </p>
                                </div>

                                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Activity size={16} className="text-stone-400" />
                                        <span className="text-xs font-bold text-stone-400 uppercase">{language === 'tr' ? 'Hesap Durumu' : 'Account Status'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <p className="text-lg font-bold text-emerald-600">{language === 'tr' ? 'Aktif' : 'Active'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="bg-white rounded-xl shadow-sm border border-[#dee2e6] p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Bell size={20} />
                                </div>
                                <h3 className="font-bold text-stone-900">{language === 'tr' ? 'Bildirim Ayarları' : 'Notification Settings'}</h3>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { key: 'comment_reply', label: language === 'tr' ? 'Yorum yanıtları' : 'Comment replies' },
                                    { key: 'mention', label: language === 'tr' ? '@bahsetmeler' : '@mentions' },
                                    { key: 'reaction', label: language === 'tr' ? 'Tepkiler' : 'Reactions' },
                                    { key: 'like', label: language === 'tr' ? 'Beğeniler' : 'Likes' },
                                    { key: 'teacher_post', label: language === 'tr' ? 'Öğretmen paylaşımları' : 'Teacher posts' },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                                        <span className="text-sm font-bold text-stone-700">{item.label}</span>
                                        <button
                                            onClick={async () => {
                                                if (!user) return;
                                                const newPrefs = { ...notifPrefs, [item.key]: !notifPrefs[item.key as keyof typeof notifPrefs] };
                                                setNotifPrefs(newPrefs);
                                                await updateNotificationPreferences(user.uid, newPrefs);
                                            }}
                                            className={cn("relative w-11 h-6 rounded-full transition-colors", notifPrefs[item.key as keyof typeof notifPrefs] ? "bg-emerald-500" : "bg-stone-300")}
                                        >
                                            <span className={cn("absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform", notifPrefs[item.key as keyof typeof notifPrefs] ? "translate-x-5" : "translate-x-0")} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-[#dee2e6] p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Lock size={20} /></div>
                                    <h3 className="font-bold text-stone-900">{language === 'tr' ? 'Şifre Değiştir' : 'Change Password'}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-400 uppercase">{language === 'tr' ? 'Yeni Şifre' : 'New Password'}</label>
                                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-stone-400 uppercase">{language === 'tr' ? 'Tekrar' : 'Confirm'}</label>
                                        <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl" />
                                    </div>
                                </div>
                                <button onClick={handlePasswordChange} className="w-full py-3 bg-stone-900 text-white font-bold rounded-xl">{language === 'tr' ? 'Güncelle' : 'Update'}</button>
                            </div>

                            <button onClick={() => setShowDeleteConfirm(true)} className="w-full p-6 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 flex items-center justify-between group">
                                <span>{language === 'tr' ? 'Hesabımı Kalıcı Olarak Sil' : 'Delete My Account Permanently'}</span>
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>
            </main >

            {/* Global Modals for Delete Confirm, Success etc can go here if needed */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200">
                        <div className="p-8">
                            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-2">{language === 'tr' ? 'Emin misiniz?' : 'Are you sure?'}</h3>
                            <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                                {language === 'tr' ? 'Hesabınızı sildiğinizde; oluşturduğunuz veya katıldığınız panolar, tüm mesajlarınız ve dosyalarınız geri getirilemez şekilde silinecektir.' : 'When you delete your account; boards you created or joined, all your messages and files will be permanently deleted.'}
                            </p>

                            <div className="mb-8">
                                <label className="block text-xs font-bold text-stone-400 uppercase mb-2">{language === 'tr' ? 'Şifreyle onaylayın' : 'Confirm with password'}</label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-400"
                                    placeholder="••••••••"
                                />
                                {deleteError && <p className="text-red-500 text-xs mt-2 font-bold">{deleteError}</p>}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting || !deletePassword}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
                                >
                                    {isDeleting ? <Loader2 size={18} className="animate-spin m-auto" /> : (language === 'tr' ? 'Sil' : 'Delete')}
                                </button>
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(null); }}
                                    className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all"
                                >
                                    {language === 'tr' ? 'İptal' : 'Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast (Global Style) */}
            {
                success && !isEditing && (
                    <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-4 slide-in-from-right-4">
                        <div className="bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                <Check size={18} />
                            </div>
                            <span className="font-bold text-sm tracking-tight">{language === 'tr' ? 'Profil başarıyla güncellendi!' : 'Profile updated successfully!'}</span>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Helper Component for Stats Cards to reduce duplication and improve performance
function StatsCard({ icon, color, value, label }: { icon: React.ReactNode, color: string, value: number, label: string }) {
    const colors: Record<string, string> = {
        indigo: 'from-indigo-50 to-purple-50 border-indigo-100 text-indigo-600 bg-indigo-100',
        emerald: 'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-600 bg-emerald-100',
        orange: 'from-orange-50 to-amber-50 border-orange-100 text-orange-600 bg-orange-100',
        pink: 'from-pink-50 to-rose-50 border-pink-100 text-pink-600 bg-pink-100'
    };

    const colorClasses = colors[color] || colors.indigo;
    const parts = colorClasses.split(' ');

    return (
        <div className={cn("text-center p-6 bg-gradient-to-br rounded-2xl border transition-transform hover:scale-[1.02]", parts.slice(0, 3).join(' '))}>
            <div className={cn("w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center", parts.slice(3).join(' '))}>
                {icon}
            </div>
            <p className={cn("text-3xl font-black", parts[3])}>{value}</p>
            <p className="text-xs font-bold text-stone-500 mt-1 uppercase tracking-tight">{label}</p>
        </div>
    );
}
