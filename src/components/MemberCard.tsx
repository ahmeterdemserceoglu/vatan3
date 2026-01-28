'use client';

import { useState, useRef, useEffect } from 'react';
import { User } from '@/types';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { Mail, Calendar, Shield, GraduationCap, Clock, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface MemberCardProps {
    member: User;
    isOnline?: boolean;
    lastSeen?: Date;
    isOwner?: boolean;
    children?: React.ReactNode;
    className?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function MemberCard({
    member,
    isOnline = false,
    lastSeen,
    isOwner = false,
    children,
    className,
    placement = 'top'
}: MemberCardProps) {
    const { language } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<any>(undefined); // debug change

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, 300); // 300ms delay before showing
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    // Calculate position
    useEffect(() => {
        if (isVisible && triggerRef.current && cardRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const cardRect = cardRef.current.getBoundingClientRect();

            let top = 0;
            let left = 0;

            switch (placement) {
                case 'top':
                    top = triggerRect.top - cardRect.height - 8;
                    left = triggerRect.left + (triggerRect.width / 2) - (cardRect.width / 2);
                    break;
                case 'bottom':
                    top = triggerRect.bottom + 8;
                    left = triggerRect.left + (triggerRect.width / 2) - (cardRect.width / 2);
                    break;
                case 'left':
                    top = triggerRect.top + (triggerRect.height / 2) - (cardRect.height / 2);
                    left = triggerRect.left - cardRect.width - 8;
                    break;
                case 'right':
                    top = triggerRect.top + (triggerRect.height / 2) - (cardRect.height / 2);
                    left = triggerRect.right + 8;
                    break;
            }

            // Keep within viewport
            const padding = 16;
            top = Math.max(padding, Math.min(top, window.innerHeight - cardRect.height - padding));
            left = Math.max(padding, Math.min(left, window.innerWidth - cardRect.width - padding));

            setPosition({ top, left });
        }
    }, [isVisible, placement]);

    const formatLastSeen = (date?: Date) => {
        if (!date) return null;

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return language === 'tr' ? 'Az önce' : 'Just now';
        if (diffMins < 60) return language === 'tr' ? `${diffMins} dk önce` : `${diffMins}m ago`;
        if (diffHours < 24) return language === 'tr' ? `${diffHours} sa önce` : `${diffHours}h ago`;
        return language === 'tr' ? `${diffDays} gün önce` : `${diffDays}d ago`;
    };

    const formatJoinDate = (date?: Date) => {
        if (!date) return null;
        return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn("inline-block cursor-pointer", className)}
            >
                {children}
            </div>

            {/* Hover Card */}
            {isVisible && (
                <div
                    ref={cardRef}
                    className="fixed z-[100] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: position.top, left: position.left }}
                >
                    <div className="bg-white rounded-xl shadow-xl border border-stone-200 p-4 min-w-[260px] pointer-events-auto">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                            <div className="relative">
                                <Avatar
                                    src={member.photoURL}
                                    name={member.displayName}
                                    size="lg"
                                />
                                {/* Online indicator */}
                                <div
                                    className={cn(
                                        "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white",
                                        isOnline ? "bg-emerald-500" : "bg-stone-400"
                                    )}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-stone-800 truncate">
                                        {member.displayName}
                                    </h4>
                                    {isOwner && (
                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">
                                            {language === 'tr' ? 'SAHİP' : 'OWNER'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                                    {member.role === 'admin' ? (
                                        <>
                                            <Shield size={12} className="text-red-500" />
                                            <span className="text-red-600 font-bold uppercase tracking-wider text-[10px]">
                                                {language === 'tr' ? 'Sistem Yetkilisi' : 'System Admin'}
                                            </span>
                                        </>
                                    ) : member.role === 'teacher' ? (
                                        <>
                                            <GraduationCap size={12} />
                                            <span>{language === 'tr' ? 'Öğretmen' : 'Teacher'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Shield size={12} />
                                            <span>{language === 'tr' ? 'Öğrenci' : 'Student'}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-stone-100 mb-3" />

                        {/* Details */}
                        <div className="space-y-2">
                            {/* Online Status */}
                            <div className="flex items-center gap-2 text-xs">
                                <div
                                    className={cn(
                                        "w-2 h-2 rounded-full",
                                        isOnline ? "bg-emerald-500" : "bg-stone-400"
                                    )}
                                />
                                <span className={isOnline ? "text-emerald-600 font-medium" : "text-stone-500"}>
                                    {isOnline
                                        ? (language === 'tr' ? 'Çevrimiçi' : 'Online')
                                        : (language === 'tr' ? 'Çevrimdışı' : 'Offline')
                                    }
                                </span>
                                {!isOnline && lastSeen && (
                                    <span className="text-stone-400">
                                        · {formatLastSeen(lastSeen)}
                                    </span>
                                )}
                            </div>

                            {/* Email (if available) */}
                            {member.email && (
                                <div className="flex items-center gap-2 text-xs text-stone-500">
                                    <Mail size={12} />
                                    <span className="truncate">{member.email}</span>
                                </div>
                            )}

                            {/* Join Date */}
                            {member.createdAt && (
                                <div className="flex items-center gap-2 text-xs text-stone-500">
                                    <Calendar size={12} />
                                    <span>
                                        {language === 'tr' ? 'Katılım: ' : 'Joined: '}
                                        {formatJoinDate(member.createdAt)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
