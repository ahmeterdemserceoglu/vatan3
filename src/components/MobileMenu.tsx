'use client';

import React from 'react';
import Link from 'next/link';
import {
    X,
    Globe,
    Columns,
    Rows,
    Sparkles,
    LogOut,
    ChevronRight,
    UserCircle,
    MessageSquare,
    Bell,
    Trash2,
    Shield
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/hooks/useTranslation';
import { signOut } from '@/lib/auth';
import { Avatar } from './Avatar';
interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onShowChangelog: () => void;
    onShowProfile: () => void;
    showTrashBinAccess?: boolean;
    onShowTrashBin?: () => void;
}

export function MobileMenu({ isOpen, onClose, onShowChangelog, onShowProfile, showTrashBinAccess, onShowTrashBin }: MobileMenuProps) {
    const { user, layout, toggleLayout } = useStore();
    const { t, language, toggleLanguage } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] sm:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Content */}
            <div className="absolute top-0 right-0 bottom-0 w-[80%] max-w-sm bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col pt-safe">
                {/* Header */}
                <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-stone-900">{t('common.menu')}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-stone-400 hover:text-stone-900">
                        <X size={24} />
                    </button>
                </div>

                {/* User Info */}
                {user && (
                    <div className="p-6 bg-stone-50/50">
                        <div className="flex items-center gap-4 mb-4">
                            <Avatar src={user.photoURL} name={user.displayName} size="lg" clickable={true} />
                            <div>
                                <p className="font-bold text-stone-900 text-lg leading-tight">{user.displayName}</p>
                                <p className="text-sm text-stone-500">
                                    {user.role === 'admin'
                                        ? t('board.admin')
                                        : (user.role === 'teacher' ? t('board.teacher') : t('board.student'))}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                onShowProfile();
                                onClose();
                            }}
                            className="w-full py-2.5 px-4 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-between"
                        >
                            <span className="flex items-center gap-2">
                                <UserCircle size={18} className="text-stone-400" />
                                {language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}
                            </span>
                            <ChevronRight size={16} className="text-stone-300" />
                        </button>
                    </div>
                )}

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <section>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">{t('common.settings')}</p>
                        <div className="space-y-1">
                            <button
                                onClick={toggleLanguage}
                                className="w-full p-4 rounded-xl flex items-center justify-between hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Globe size={22} className="text-stone-500" />
                                    <div className="text-left">
                                        <p className="font-semibold text-stone-800 text-sm">{language === 'tr' ? 'Dil / Language' : 'Language / Dil'}</p>
                                        <p className="text-xs text-stone-400">{language === 'tr' ? 'Türkçe' : 'English'}</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-stone-300" />
                            </button>

                            <button
                                onClick={toggleLayout}
                                className="w-full p-4 rounded-xl flex items-center justify-between hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {layout === 'horizontal' ? <Columns size={22} className="text-stone-500" /> : <Rows size={22} className="text-stone-500" />}
                                    <div className="text-left">
                                        <p className="font-semibold text-stone-800 text-sm">{language === 'tr' ? 'Görünüm' : 'Layout'}</p>
                                        <p className="text-xs text-stone-400">{layout === 'horizontal' ? (language === 'tr' ? 'Dikey' : 'Vertical') : (language === 'tr' ? 'Yatay' : 'Horizontal')}</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-stone-300" />
                            </button>
                        </div>
                    </section>

                    <section>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">{t('notifications.notificationTitle')}</p>
                        <div className="space-y-1">
                            <Link
                                href="/messages"
                                onClick={onClose}
                                className="w-full p-4 rounded-xl flex items-center gap-3 hover:bg-stone-50 transition-colors"
                            >
                                <MessageSquare size={22} className="text-stone-500" />
                                <p className="font-semibold text-stone-800 text-sm">{language === 'tr' ? 'Mesajlar' : 'Messages'}</p>
                            </Link>
                            <Link
                                href="/notifications"
                                onClick={onClose}
                                className="w-full p-4 rounded-xl flex items-center gap-3 hover:bg-stone-50 transition-colors"
                            >
                                <Bell size={22} className="text-stone-500" />
                                <p className="font-semibold text-stone-800 text-sm">{language === 'tr' ? 'Bildirimler' : 'Notifications'}</p>
                            </Link>
                        </div>
                    </section>

                    <section>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Collabo</p>
                        <div className="space-y-1">
                            {showTrashBinAccess && onShowTrashBin && (
                                <button
                                    onClick={() => { onShowTrashBin(); onClose(); }}
                                    className="w-full p-4 rounded-xl flex items-center gap-3 hover:bg-stone-50 transition-colors text-red-600"
                                >
                                    <Trash2 size={22} />
                                    <p className="font-semibold text-sm">{language === 'tr' ? 'Çöp Kutusu' : 'Trash Bin'}</p>
                                </button>
                            )}
                            {user?.role === 'admin' && (
                                <Link
                                    href="/admin/roles"
                                    onClick={onClose}
                                    className="w-full p-4 rounded-xl flex items-center gap-3 hover:bg-stone-50 transition-colors text-indigo-600"
                                >
                                    <Shield size={22} />
                                    <p className="font-semibold text-sm">{language === 'tr' ? 'Yetki Yönetimi' : 'Role Management'}</p>
                                </Link>
                            )}
                            <button
                                onClick={() => { onShowChangelog(); onClose(); }}
                                className="w-full p-4 rounded-xl flex items-center gap-3 hover:bg-stone-50 transition-colors"
                            >
                                <Sparkles size={22} className="text-stone-500" />
                                <p className="font-semibold text-stone-800 text-sm">{language === 'tr' ? 'Yenilikler' : 'What\'s New'}</p>
                            </button>
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-stone-100">
                    <button
                        onClick={() => signOut()}
                        className="w-full p-4 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-red-100 transition-colors"
                    >
                        <LogOut size={20} />
                        {t('common.logout')}
                    </button>
                    <p className="text-center text-[10px] text-stone-400 mt-6 font-medium">
                        Collabo v1.0.0 • Ahmet Serçe
                    </p>
                </div>
            </div>
        </div>
    );
}
