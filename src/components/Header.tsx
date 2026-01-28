'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { User } from '@/types';
import { signOut } from '@/lib/auth';
import { LogOut, Plus, LayoutGrid, Globe, Columns, Rows, Sparkles, MessageSquare, Menu, Bell, Shield } from 'lucide-react';
import { ChangelogModal } from './ChangelogModal';
import { Avatar } from './Avatar';
import { useTranslation } from '@/hooks/useTranslation';
import { PWAInstallButtonCompact } from './PWAInstallButton';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMenu } from './MobileMenu';
import { NotificationDropdown } from './NotificationDropdown';
import { usePermissions } from '@/hooks/usePermissions';


interface HeaderProps {
    boardMembers?: User[];
    boardTitle?: string;
    showTrashBinAccess?: boolean;
    onShowTrashBin?: () => void;
}

export function Header({ boardMembers, boardTitle, showTrashBinAccess, onShowTrashBin }: HeaderProps) {
    const { user, unreadDMCount, setUnreadDMCount, unreadNotificationCount } = useStore();
    const { isAdmin } = usePermissions();
    const router = useRouter();
    const { t, language, toggleLanguage } = useTranslation();
    const [showChangelog, setShowChangelog] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Subscribe to DM unread counts
    useEffect(() => {
        if (!user) return;

        const { subscribeToUserConversations } = require('@/lib/conversations');
        const unsub = subscribeToUserConversations(user.uid, (conversations: any[]) => {
            const count = conversations.reduce((acc, conv) => acc + (conv.unreadCount[user.uid] || 0), 0);
            setUnreadDMCount(count);
        });

        return () => unsub();
    }, [user, setUnreadDMCount]);

    // Subscribe to notification unread count
    useEffect(() => {
        if (!user) return;

        const { subscribeToUnreadCount } = require('@/lib/notifications');
        const unsub = subscribeToUnreadCount(user.uid, (count: number) => {
            useStore.getState().setUnreadNotificationCount(count);
        });

        return () => unsub();
    }, [user]);

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <>
            <header className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50 shrink-0 pt-safe">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    {/* Left Section: Logo & Changelog */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
                            <div className="w-8 h-8 sm:w-9 h-9 bg-stone-900 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                                <span className="text-white font-bold text-lg sm:text-xl">C</span>
                            </div>
                            <span className="font-black text-lg sm:text-xl tracking-tighter text-stone-900 uppercase">Collabo</span>
                        </Link>

                        {/* What's New Button - Hidden on Mobile */}
                        <button
                            onClick={() => setShowChangelog(true)}
                            className="hidden sm:flex p-2 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative group"
                            title={language === 'tr' ? 'Yenilikler' : 'What\'s New'}
                        >
                            <Sparkles size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="hidden sm:block">
                            <PWAInstallButtonCompact />
                        </div>
                    </div>

                    {/* Navigation */}
                    {user && (
                        <nav className="flex items-center gap-1 sm:gap-2">
                            {/* Primary Desktop Nav */}
                            <div className="hidden sm:flex items-center gap-2 mr-2 pr-2 border-r border-stone-100">
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2 px-3 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                                >
                                    <LayoutGrid size={18} />
                                    <span className="text-sm font-medium">{t('dashboard.myBoards')}</span>
                                </Link>
                                <Link
                                    href="/board/new"
                                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors shadow-sm"
                                >
                                    <Plus size={18} />
                                    <span className="text-sm font-medium">
                                        {language === 'tr' ? 'Yeni Pano' : 'New Board'}
                                    </span>
                                </Link>
                                {user.role === 'admin' && (
                                    <Link
                                        href="/admin/roles"
                                        className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                                        title={language === 'tr' ? 'Yetki Yönetimi' : 'Role Management'}
                                    >
                                        <Shield size={18} />
                                        <span className="text-sm font-bold uppercase tracking-tight hidden lg:inline">
                                            {language === 'tr' ? 'Yetkiler' : 'Roles'}
                                        </span>
                                    </Link>
                                )}
                            </div>

                            {/* Utility Nav - Hidden on mobile */}
                            <div className="hidden md:flex items-center gap-1.5 px-1">
                                <button
                                    onClick={useStore.getState().toggleLayout}
                                    className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                                    title={language === 'tr' ? 'Görünümü Değiştir' : 'Switch Layout'}
                                >
                                    {useStore.getState().layout === 'horizontal' ? <Columns size={18} /> : <Rows size={18} />}
                                </button>

                                <button
                                    onClick={toggleLanguage}
                                    className="flex items-center gap-1.5 px-2 py-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
                                    title={language === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
                                >
                                    <Globe size={16} />
                                    <span className="text-xs font-bold uppercase">{language}</span>
                                </button>
                            </div>

                            {/* Notifications & Messages */}
                            <div className="flex items-center gap-0.5 sm:gap-1">
                                {/* Messages */}
                                <Link
                                    href="/messages"
                                    className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors relative"
                                    title={language === 'tr' ? 'Mesajlar' : 'Messages'}
                                >
                                    <MessageSquare size={20} />
                                    {unreadDMCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                            {unreadDMCount > 99 ? '99+' : unreadDMCount}
                                        </span>
                                    )}
                                </Link>

                                {/* Notifications */}
                                <NotificationDropdown />
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setShowMenu(true)}
                                className="sm:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors ml-1"
                            >
                                <Menu size={24} />
                            </button>

                            {/* User Info (Desktop) */}
                            <div className="hidden sm:flex items-center gap-2 sm:gap-3 ml-1 sm:ml-2 pl-2 sm:pl-4 border-l border-stone-200">
                                <div className="flex items-center gap-2">
                                    <Avatar
                                        src={user.photoURL}
                                        name={user.displayName}
                                        size="sm"
                                        clickable={true} // Opens photo modal
                                    />
                                    <Link
                                        href="/profil"
                                        className="hidden lg:block cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        <p className="text-sm font-semibold text-stone-800 leading-tight">{user.displayName}</p>
                                        <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
                                            {user.role === 'admin'
                                                ? t('board.admin')
                                                : (user.role === 'teacher' ? t('board.teacher') : t('board.student'))}
                                        </p>
                                    </Link>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="hidden sm:flex p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title={t('common.logout')}
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </nav>
                    )}
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            {user && (
                <MobileBottomNav
                    unreadNotifications={unreadNotificationCount}
                    unreadMessages={unreadDMCount}
                    onProfileClick={() => router.push('/profil')}
                    onMessageClick={() => router.push('/messages')}
                />
            )}

            {/* Changelog Modal */}
            <ChangelogModal
                isOpen={showChangelog}
                onClose={() => setShowChangelog(false)}
            />



            {/* Mobile Menu Drawer */}
            <MobileMenu
                isOpen={showMenu}
                onClose={() => setShowMenu(false)}
                onShowChangelog={() => setShowChangelog(true)}
                onShowProfile={() => router.push('/profil')}
                showTrashBinAccess={showTrashBinAccess}
                onShowTrashBin={onShowTrashBin}
            />
        </>
    );
}
