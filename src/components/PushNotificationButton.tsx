'use client';

import { Bell, BellOff, BellRing, Loader2, Check, X } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface PushNotificationButtonProps {
    variant?: 'default' | 'compact' | 'banner';
    className?: string;
}

export function PushNotificationButton({ variant = 'default', className }: PushNotificationButtonProps) {
    const { permission, isSupported, isLoading, requestPermission, error } = usePushNotification();
    const { language } = useTranslation();

    // Not supported
    if (!isSupported) {
        if (variant === 'compact') return null;
        return (
            <div className={cn("flex items-center gap-2 text-stone-400 text-sm", className)}>
                <BellOff size={16} />
                <span>{language === 'tr' ? 'Desteklenmiyor' : 'Not supported'}</span>
            </div>
        );
    }

    // Already granted
    if (permission === 'granted') {
        if (variant === 'compact') {
            return (
                <div className={cn("flex items-center gap-1.5 text-emerald-600 text-xs", className)}>
                    <Check size={14} />
                    <span>{language === 'tr' ? 'Bildirimler aktif' : 'Notifications on'}</span>
                </div>
            );
        }
        return (
            <div className={cn("flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm", className)}>
                <BellRing size={16} />
                <span>{language === 'tr' ? 'Push bildirimler aktif' : 'Push notifications enabled'}</span>
            </div>
        );
    }

    // Denied
    if (permission === 'denied') {
        if (variant === 'compact') {
            return (
                <div className={cn("flex items-center gap-1.5 text-red-500 text-xs", className)}>
                    <X size={14} />
                    <span>{language === 'tr' ? 'Bildirimler kapalı' : 'Notifications off'}</span>
                </div>
            );
        }
        return (
            <div className={cn("flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm", className)}>
                <BellOff size={16} />
                <span>{language === 'tr'
                    ? 'Bildirimler tarayıcı ayarlarından engellendi'
                    : 'Notifications blocked in browser settings'}</span>
            </div>
        );
    }

    // Banner variant - Show full prompt
    if (variant === 'banner') {
        return (
            <div className={cn(
                "flex items-center justify-between gap-4 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white shadow-lg",
                className
            )}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Bell size={20} />
                    </div>
                    <div>
                        <p className="font-medium">
                            {language === 'tr' ? 'Bildirimleri Aç' : 'Enable Notifications'}
                        </p>
                        <p className="text-sm text-white/80">
                            {language === 'tr'
                                ? 'Yeni ödevler ve mesajlardan anında haberdar ol'
                                : 'Get instant updates on new assignments and messages'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={requestPermission}
                    disabled={isLoading}
                    className="shrink-0 px-4 py-2 bg-white text-indigo-600 font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <BellRing size={16} />
                    )}
                    {language === 'tr' ? 'İzin Ver' : 'Allow'}
                </button>
            </div>
        );
    }

    // Default button
    return (
        <button
            onClick={requestPermission}
            disabled={isLoading}
            className={cn(
                "flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium",
                className
            )}
        >
            {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
            ) : (
                <Bell size={18} />
            )}
            <span>
                {language === 'tr' ? 'Bildirimleri Aç' : 'Enable Notifications'}
            </span>
        </button>
    );
}

// Floating notification prompt - shows once per session if not granted
export function PushNotificationPrompt({ onDismiss }: { onDismiss: () => void }) {
    const { permission, isSupported, isLoading, requestPermission } = usePushNotification();
    const { language } = useTranslation();

    // Don't show if not supported, already granted, or already denied
    if (!isSupported || permission !== 'default') {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shrink-0">
                        <Bell size={24} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-800 mb-0.5">
                            {language === 'tr' ? 'Bildirimleri Etkinleştir' : 'Enable Notifications'}
                        </h3>
                        <p className="text-sm text-stone-500 mb-3">
                            {language === 'tr'
                                ? 'Yeni ödev, mesaj ve yorumlardan anında haberdar ol.'
                                : 'Get instant updates on new assignments, messages and comments.'}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={requestPermission}
                                disabled={isLoading}
                                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {isLoading ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <BellRing size={14} />
                                )}
                                {language === 'tr' ? 'Etkinleştir' : 'Enable'}
                            </button>
                            <button
                                onClick={onDismiss}
                                className="px-3 py-2 text-stone-500 text-sm font-medium rounded-lg hover:bg-stone-100 transition-colors"
                            >
                                {language === 'tr' ? 'Sonra' : 'Later'}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
