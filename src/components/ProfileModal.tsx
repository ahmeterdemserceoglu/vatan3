'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Camera, Loader2, Check, User, Bell, BellRing, Lock, Trash2, Eye, EyeOff, AlertTriangle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { updateUserProfile, updateNotificationPreferences, getNotificationPreferences, changePassword, deleteAccount, getUserWithLastSeen, updateLastSeen } from '@/lib/auth';
import { uploadProfilePhoto } from '@/lib/supabase';
import { Avatar } from './Avatar';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { usePushNotification } from '@/hooks/usePushNotification';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, setUser } = useStore();
    const { t, language } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { permission, isSupported, isLoading: pushLoading, requestPermission } = usePushNotification();

    const router = useRouter();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showNotifSettings, setShowNotifSettings] = useState(false);

    // Password change states
    const [showPasswordChange, setShowPasswordChange] = useState(false);
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

    // Load notification preferences and last seen
    useEffect(() => {
        if (user && isOpen) {
            getNotificationPreferences(user.uid).then(setNotifPrefs);
            getUserWithLastSeen(user.uid).then((data) => {
                if (data?.lastSeen) {
                    setLastSeen(new Date(data.lastSeen));
                }
            });
            // Update last seen on modal open
            updateLastSeen(user.uid);
        }
    }, [user, isOpen]);

    // Toggle a notification preference
    const toggleNotifPref = async (key: keyof typeof notifPrefs) => {
        if (!user) return;
        const newPrefs = { ...notifPrefs, [key]: !notifPrefs[key] };
        setNotifPrefs(newPrefs);
        await updateNotificationPreferences(user.uid, newPrefs);
    };

    if (!isOpen || !user) return null;

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError(language === 'tr' ? 'Sadece resim dosyaları yüklenebilir' : 'Only image files can be uploaded');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError(language === 'tr' ? 'Dosya boyutu 5MB\'dan küçük olmalı' : 'File size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setError(null);

        // Create local preview
        const localPreviewUrl = URL.createObjectURL(file);
        setPhotoURL(localPreviewUrl);

        try {
            const url = await uploadProfilePhoto(user.uid, file);
            setPhotoURL(url);
            // Revoke local URL to free memory
            URL.revokeObjectURL(localPreviewUrl);
        } catch (err: any) {
            setError(err.message || (language === 'tr' ? 'Fotoğraf yüklenemedi' : 'Failed to upload photo'));
            // Revert back to original photo on error
            setPhotoURL(user.photoURL || '');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!displayName.trim()) {
            setError(language === 'tr' ? 'İsim boş olamaz' : 'Name cannot be empty');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await updateUserProfile(user.uid, {
                displayName: displayName.trim(),
                photoURL: photoURL || null,
            });

            // Update local state
            setUser({
                ...user,
                displayName: displayName.trim(),
                photoURL: photoURL || null,
            });

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1000);
        } catch (err: any) {
            setError(err.message || (language === 'tr' ? 'Profil güncellenemedi' : 'Failed to update profile'));
        } finally {
            setIsSaving(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async () => {
        setPasswordError(null);

        // Validate new password
        if (newPassword.length < 8) {
            setPasswordError(language === 'tr' ? 'Şifre en az 8 karakter olmalıdır' : 'Password must be at least 8 characters');
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            setPasswordError(language === 'tr' ? 'Şifre en az bir büyük harf içermelidir' : 'Password must contain at least one uppercase letter');
            return;
        }
        if (!/[a-z]/.test(newPassword)) {
            setPasswordError(language === 'tr' ? 'Şifre en az bir küçük harf içermelidir' : 'Password must contain at least one lowercase letter');
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            setPasswordError(language === 'tr' ? 'Şifre en az bir rakam içermelidir' : 'Password must contain at least one number');
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
            setTimeout(() => {
                setPasswordSuccess(false);
                setShowPasswordChange(false);
            }, 2000);
        } catch (err: unknown) {
            const errorCode = (err as { code?: string })?.code;
            if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
                setPasswordError(language === 'tr' ? 'Mevcut şifre yanlış' : 'Current password is incorrect');
            } else if (errorCode === 'auth/too-many-requests') {
                setPasswordError(language === 'tr' ? 'Çok fazla deneme. Lütfen bekleyin.' : 'Too many attempts. Please wait.');
            } else {
                setPasswordError(language === 'tr' ? 'Şifre değiştirilemedi' : 'Failed to change password');
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    // Handle account deletion
    const handleDeleteAccount = async () => {
        setDeleteError(null);
        setIsDeleting(true);

        try {
            await deleteAccount(deletePassword);
            // Redirect to home page after deletion
            router.push('/');
        } catch (err: unknown) {
            const errorCode = (err as { code?: string })?.code;
            if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
                setDeleteError(language === 'tr' ? 'Şifre yanlış' : 'Password is incorrect');
            } else {
                setDeleteError(language === 'tr' ? 'Hesap silinemedi' : 'Failed to delete account');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    // Format last seen date
    const formatLastSeen = (date: Date | null) => {
        if (!date) return null;
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return language === 'tr' ? 'Az önce' : 'Just now';
        if (minutes < 60) return language === 'tr' ? `${minutes} dakika önce` : `${minutes} minutes ago`;
        if (hours < 24) return language === 'tr' ? `${hours} saat önce` : `${hours} hours ago`;
        if (days < 7) return language === 'tr' ? `${days} gün önce` : `${days} days ago`;
        return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50 shrink-0">
                    <h2 className="text-lg font-bold text-stone-800">
                        {language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Profile Photo */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="relative group">
                                <Avatar
                                    src={photoURL}
                                    name={displayName}
                                    size="2xl"
                                    className={cn(
                                        "ring-8 ring-stone-100 shadow-inner transition-opacity",
                                        isUploading && "opacity-50"
                                    )}
                                />
                                {isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full animate-in fade-in">
                                        <Loader2 size={32} className="text-white animate-spin drop-shadow-md" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className={cn(
                                    "absolute bottom-0 right-0 p-2 bg-stone-800 text-white rounded-full",
                                    "hover:bg-stone-700 transition-colors shadow-lg",
                                    "disabled:opacity-50"
                                )}
                            >
                                {isUploading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Camera size={16} />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-stone-400">
                            {language === 'tr' ? 'Fotoğraf değiştirmek için tıklayın' : 'Click to change photo'}
                        </p>
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            {language === 'tr' ? 'İsim' : 'Name'}
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-all"
                            placeholder={language === 'tr' ? 'Adınız' : 'Your name'}
                        />
                    </div>

                    {/* Email (readonly) */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            {language === 'tr' ? 'E-posta' : 'Email'}
                        </label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 text-stone-500 cursor-not-allowed"
                        />
                    </div>

                    {/* Role (readonly) */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                            {language === 'tr' ? 'Rol' : 'Role'}
                        </label>
                        <div className="px-4 py-3 border border-stone-200 rounded-xl bg-stone-50">
                            <span className={cn(
                                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                                user.role === 'admin'
                                    ? "bg-red-100 text-red-700"
                                    : user.role === 'teacher'
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-blue-100 text-blue-700"
                            )}>
                                <User size={14} />
                                {user.role === 'admin'
                                    ? (language === 'tr' ? 'Sistem Yetkilisi' : 'System Admin')
                                    : user.role === 'teacher'
                                        ? (language === 'tr' ? 'Öğretmen' : 'Teacher')
                                        : (language === 'tr' ? 'Öğrenci' : 'Student')
                                }
                            </span>
                        </div>
                    </div>

                    {/* Push Notifications */}
                    {isSupported && (
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        permission === 'granted' ? "bg-emerald-100" : "bg-indigo-100"
                                    )}>
                                        {permission === 'granted' ? (
                                            <BellRing size={20} className="text-emerald-600" />
                                        ) : (
                                            <Bell size={20} className="text-indigo-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-stone-800">
                                            {language === 'tr' ? 'Push Bildirimler' : 'Push Notifications'}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                            {permission === 'granted'
                                                ? (language === 'tr' ? 'Tarayıcı bildirimleri aktif' : 'Browser notifications active')
                                                : permission === 'denied'
                                                    ? (language === 'tr' ? 'Tarayıcı ayarlarından engellendi' : 'Blocked in browser settings')
                                                    : (language === 'tr' ? 'Anlık bildirimler almak için etkinleştirin' : 'Enable to receive instant notifications')}
                                        </p>
                                    </div>
                                </div>
                                {permission === 'default' && (
                                    <button
                                        onClick={requestPermission}
                                        disabled={pushLoading}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {pushLoading ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Bell size={14} />
                                        )}
                                        {language === 'tr' ? 'Etkinleştir' : 'Enable'}
                                    </button>
                                )}
                                {permission === 'granted' && (
                                    <Check size={20} className="text-emerald-600" />
                                )}
                                {permission === 'denied' && (
                                    <X size={20} className="text-red-500" />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notification Preferences */}
                    <div>
                        <button
                            onClick={() => setShowNotifSettings(!showNotifSettings)}
                            className="w-full flex items-center justify-between px-4 py-3 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Bell size={18} className="text-stone-500" />
                                <span className="font-medium text-stone-700">
                                    {language === 'tr' ? 'Bildirim Tercihleri' : 'Notification Preferences'}
                                </span>
                            </div>
                            <span className={cn(
                                "text-xs transition-transform duration-200",
                                showNotifSettings ? "rotate-180" : ""
                            )}>▼</span>
                        </button>

                        {showNotifSettings && (
                            <div className="mt-3 space-y-2 p-4 bg-stone-50 rounded-xl border border-stone-200 animate-in slide-in-from-top-2 duration-200">
                                {[
                                    { key: 'comment_reply', label: language === 'tr' ? 'Yorum yanıtları' : 'Comment replies' },
                                    { key: 'mention', label: language === 'tr' ? '@bahsetmeler' : '@mentions' },
                                    { key: 'reaction', label: language === 'tr' ? 'Tepkiler' : 'Reactions' },
                                    { key: 'like', label: language === 'tr' ? 'Beğeniler' : 'Likes' },
                                    { key: 'teacher_post', label: language === 'tr' ? 'Öğretmen paylaşımları' : 'Teacher posts' },
                                    { key: 'teacher_message', label: language === 'tr' ? 'Öğretmen mesajları' : 'Teacher messages' },
                                    { key: 'member_joined', label: language === 'tr' ? 'Yeni üye katılımları' : 'New member joins' },
                                ].map((item) => (
                                    <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer hover:bg-stone-100 rounded-lg px-2 -mx-2 transition-colors">
                                        <span className="text-sm text-stone-600">{item.label}</span>
                                        <button
                                            onClick={() => toggleNotifPref(item.key as keyof typeof notifPrefs)}
                                            className={cn(
                                                "relative w-10 h-6 rounded-full transition-colors duration-200",
                                                notifPrefs[item.key as keyof typeof notifPrefs]
                                                    ? "bg-emerald-500"
                                                    : "bg-stone-300"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                                                    notifPrefs[item.key as keyof typeof notifPrefs] ? "translate-x-4" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </label>
                                ))}
                                <p className="text-xs text-stone-400 mt-2 pt-2 border-t border-stone-200">
                                    {language === 'tr'
                                        ? 'Kapatılan bildirimler size gönderilmeyecek.'
                                        : 'Disabled notifications will not be sent to you.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Password Change Section */}
                    <div>
                        <button
                            onClick={() => setShowPasswordChange(!showPasswordChange)}
                            className="w-full flex items-center justify-between px-4 py-3 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Lock size={18} className="text-stone-500" />
                                <span className="font-medium text-stone-700">
                                    {language === 'tr' ? 'Şifre Değiştir' : 'Change Password'}
                                </span>
                            </div>
                            <span className={cn(
                                "text-xs transition-transform duration-200",
                                showPasswordChange ? "rotate-180" : ""
                            )}>▼</span>
                        </button>

                        {showPasswordChange && (
                            <div className="mt-3 space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-200 animate-in slide-in-from-top-2 duration-200">
                                {/* Current Password */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-600 mb-1">
                                        {language === 'tr' ? 'Mevcut Şifre' : 'Current Password'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 pr-10 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                        >
                                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-600 mb-1">
                                        {language === 'tr' ? 'Yeni Şifre' : 'New Password'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 pr-10 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {/* Password strength indicators */}
                                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                                        <span className={cn("flex items-center gap-1", newPassword.length >= 8 ? "text-green-600" : "text-stone-400")}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", newPassword.length >= 8 ? "bg-green-500" : "bg-stone-300")} />
                                            {language === 'tr' ? '8+ karakter' : '8+ characters'}
                                        </span>
                                        <span className={cn("flex items-center gap-1", /[A-Z]/.test(newPassword) ? "text-green-600" : "text-stone-400")}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", /[A-Z]/.test(newPassword) ? "bg-green-500" : "bg-stone-300")} />
                                            {language === 'tr' ? 'Büyük harf' : 'Uppercase'}
                                        </span>
                                        <span className={cn("flex items-center gap-1", /[a-z]/.test(newPassword) ? "text-green-600" : "text-stone-400")}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", /[a-z]/.test(newPassword) ? "bg-green-500" : "bg-stone-300")} />
                                            {language === 'tr' ? 'Küçük harf' : 'Lowercase'}
                                        </span>
                                        <span className={cn("flex items-center gap-1", /[0-9]/.test(newPassword) ? "text-green-600" : "text-stone-400")}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", /[0-9]/.test(newPassword) ? "bg-green-500" : "bg-stone-300")} />
                                            {language === 'tr' ? 'Rakam' : 'Number'}
                                        </span>
                                    </div>
                                </div>

                                {/* Confirm New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-600 mb-1">
                                        {language === 'tr' ? 'Yeni Şifre (Tekrar)' : 'Confirm New Password'}
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        className={cn(
                                            "w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-all",
                                            confirmNewPassword && newPassword !== confirmNewPassword
                                                ? "border-red-300 bg-red-50"
                                                : confirmNewPassword && newPassword === confirmNewPassword
                                                    ? "border-green-300 bg-green-50"
                                                    : "border-stone-200"
                                        )}
                                        placeholder="••••••••"
                                    />
                                    {confirmNewPassword && newPassword !== confirmNewPassword && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match'}
                                        </p>
                                    )}
                                </div>

                                {/* Password Error/Success */}
                                {passwordError && (
                                    <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                                        {passwordError}
                                    </p>
                                )}
                                {passwordSuccess && (
                                    <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
                                        <Check size={16} />
                                        {language === 'tr' ? 'Şifre başarıyla değiştirildi!' : 'Password changed successfully!'}
                                    </p>
                                )}

                                {/* Change Password Button */}
                                <button
                                    onClick={handlePasswordChange}
                                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                                    className="w-full py-2.5 bg-stone-800 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {isChangingPassword ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Lock size={16} />
                                    )}
                                    {language === 'tr' ? 'Şifreyi Değiştir' : 'Change Password'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Last Seen Info */}
                    {lastSeen && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                            <Clock size={18} className="text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-stone-700">
                                    {language === 'tr' ? 'Son Giriş' : 'Last Seen'}
                                </p>
                                <p className="text-xs text-stone-500">
                                    {formatLastSeen(lastSeen)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Delete Account Section */}
                    <div className="pt-4 border-t border-stone-200">
                        <button
                            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                            className="w-full flex items-center justify-between px-4 py-3 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-red-600"
                        >
                            <div className="flex items-center gap-2">
                                <Trash2 size={18} />
                                <span className="font-medium">
                                    {language === 'tr' ? 'Hesabı Sil' : 'Delete Account'}
                                </span>
                            </div>
                            <span className={cn(
                                "text-xs transition-transform duration-200",
                                showDeleteConfirm ? "rotate-180" : ""
                            )}>▼</span>
                        </button>

                        {showDeleteConfirm && (
                            <div className="mt-3 p-4 bg-red-50 rounded-xl border border-red-200 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex items-start gap-3 mb-4">
                                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-medium text-red-700">
                                            {language === 'tr' ? 'Bu işlem geri alınamaz!' : 'This action cannot be undone!'}
                                        </p>
                                        <p className="text-sm text-red-600 mt-1">
                                            {language === 'tr'
                                                ? 'Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.'
                                                : 'Your account and all your data will be permanently deleted.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-red-700 mb-1">
                                        {language === 'tr' ? 'Onaylamak için şifrenizi girin' : 'Enter your password to confirm'}
                                    </label>
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-red-300 rounded-lg bg-white focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {deleteError && (
                                    <p className="text-sm text-red-600 bg-red-100 px-3 py-2 rounded-lg mb-4">
                                        {deleteError}
                                    </p>
                                )}

                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting || !deletePassword}
                                    className="w-full py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                    {language === 'tr' ? 'Hesabımı Kalıcı Olarak Sil' : 'Permanently Delete My Account'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    {/* Success Message */}
                    {success && (
                        <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg flex items-center gap-2">
                            <Check size={16} />
                            {language === 'tr' ? 'Profil güncellendi!' : 'Profile updated!'}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 border border-stone-200 text-stone-600 font-medium rounded-xl hover:bg-stone-100 transition-colors"
                    >
                        {language === 'tr' ? 'İptal' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isUploading}
                        className="flex-1 py-3 px-4 bg-stone-800 text-white font-medium rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <Check size={18} />
                                {language === 'tr' ? 'Kaydet' : 'Save'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
