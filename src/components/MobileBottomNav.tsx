'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, MessageSquare, Bell, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { haptic } from '@/lib/native';
import { ImpactStyle } from '@capacitor/haptics';

interface MobileBottomNavProps {
    unreadNotifications?: number;
    unreadMessages?: number;
    onProfileClick: () => void;
    onMessageClick: () => void;
}

export function MobileBottomNav({
    unreadNotifications = 0,
    unreadMessages = 0,
    onProfileClick,
    onMessageClick
}: MobileBottomNavProps) {
    const pathname = usePathname();
    const { t } = useTranslation();

    const navItems = [
        {
            label: t('dashboard.myBoards'),
            icon: LayoutGrid,
            href: '/dashboard',
            active: pathname === '/dashboard'
        },
        {
            label: 'Mesajlar',
            icon: MessageSquare,
            href: '/messages',
            badge: unreadMessages,
            active: pathname === '/messages'
        },
        {
            label: 'Paylaş',
            icon: Plus,
            href: '/board/new',
            primary: true
        },
        {
            label: t('notifications.notificationTitle'),
            icon: Bell,
            href: '/notifications',
            badge: unreadNotifications,
            active: pathname === '/notifications'
        },
        {
            label: 'Profil',
            icon: User,
            href: '/profil',
            active: pathname === '/profil'
        }
    ];

    return (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-stone-200 px-6 py-3 z-[60] pb-safe">
            <div className="flex items-center justify-between max-w-md mx-auto">
                {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const content = (
                        <div className={cn(
                            "flex flex-col items-center gap-1 relative",
                            item.active ? "text-stone-900" : "text-stone-400",
                            item.primary && "scale-110"
                        )}>
                            {item.primary ? (
                                <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center -translate-y-4 shadow-lg shadow-stone-900/20 active:scale-95 transition-transform">
                                    <Plus size={24} className="text-white" />
                                </div>
                            ) : (
                                <>
                                    <Icon size={22} strokeWidth={item.active ? 2.5 : 2} />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    );

                    return (
                        <Link
                            key={idx}
                            href={item.href || '#'}
                            onClick={() => haptic.impact(ImpactStyle.Light)}
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
