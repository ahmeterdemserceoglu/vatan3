'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import type { Notification as AppNotification } from '@/types';
import {
    subscribeToNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '@/lib/notifications';
import {
    CheckCheck, X, BellRing, UserCog, ArrowLeft, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Header } from '@/components/Header';
import { approveMember, rejectMember, getBoard } from '@/lib/boards';

type NotificationTab = 'all' | 'unread' | 'requests' | 'academic';

export default function NotificationsPage() {
    const { user, setUnreadNotificationCount } = useStore();
    const { t, language } = useTranslation();
    const router = useRouter();

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [activeTab, setActiveTab] = useState<NotificationTab>('all');
    const [isLoading, setIsLoading] = useState(true);

    // Member request modal state
    const [memberRequestModal, setMemberRequestModal] = useState<{
        isOpen: boolean;
        notification: AppNotification | null;
        userName: string;
        loading: boolean;
    }>({ isOpen: false, notification: null, userName: '', loading: false });

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = subscribeToNotifications(user.uid, (data) => {
            setNotifications(data);
            setUnreadNotificationCount(data.filter(n => !n.isRead).length);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid, setUnreadNotificationCount]);

    const filteredNotifications = useMemo(() => {
        switch (activeTab) {
            case 'unread':
                return notifications.filter(n => !n.isRead);
            case 'requests':
                return notifications.filter(n => n.type === 'member_request');
            case 'academic':
                return notifications.filter(n =>
                    ['homework_assigned', 'new_assignment', 'homework_reminder', 'assignment_due', 'assignment_graded', 'teacher_post'].includes(n.type)
                );
            default:
                return notifications;
        }
    }, [notifications, activeTab]);

    const handleMarkAllRead = async () => {
        if (user?.uid) {
            await markAllAsRead(user.uid);
        }
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        if (notification.type === 'member_request') {
            setMemberRequestModal({
                isOpen: true,
                notification,
                userName: notification.fromUserName,
                loading: false,
            });
            return;
        }

        // Assignment related notifications - go to assignments page
        const assignmentTypes = ['homework_assigned', 'homework_reminder', 'assignment_due', 'assignment_graded', 'new_assignment', 'member_joined'];
        if (notification.boardId && notification.assignmentId && assignmentTypes.includes(notification.type)) {
            router.push(`/board/${notification.boardId}/assignments?highlight=${notification.assignmentId}`);
            return;
        }

        // Teacher message or chat - open chat with highlight
        if (notification.boardId && notification.type === 'teacher_message') {
            let url = `/board/${notification.boardId}?openChat=true`;
            if (notification.messageId) {
                url += `&highlightMessage=${notification.messageId}`;
            }
            router.push(url);
            return;
        }

        // Chat mentions and replies - open chat
        if (notification.boardId && !notification.noteId && (notification.type === 'mention' || notification.type === 'comment_reply')) {
            let url = `/board/${notification.boardId}?openChat=true`;
            if (notification.messageId) {
                url += `&highlightMessage=${notification.messageId}`;
            }
            router.push(url);
            return;
        }

        // Note highlight
        if (notification.boardId && notification.noteId) {
            router.push(`/board/${notification.boardId}?highlightNote=${notification.noteId}`);
            return;
        }

        // Default: just go to board
        if (notification.boardId) {
            router.push(`/board/${notification.boardId}`);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
            <Header />

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 shadow-sm transition-all">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-stone-900 tracking-tight leading-tight">
                                {language === 'tr' ? 'Bildirim Merkezi' : 'Notification Center'}
                            </h1>
                            <p className="text-sm text-stone-500 font-medium">
                                {notifications.filter(n => !n.isRead).length} {language === 'tr' ? 'okunmamış bildiriminiz var' : 'unread notifications'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleMarkAllRead}
                            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 font-bold text-sm rounded-xl hover:bg-stone-50 transition-all shadow-sm flex items-center gap-2"
                        >
                            <CheckCheck size={18} />
                            {language === 'tr' ? 'Tümünü Oku' : 'Mark All Read'}
                        </button>

                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-stone-200">
                        {[
                            { id: 'all', label: language === 'tr' ? 'Tümü' : 'All' },
                            { id: 'unread', label: language === 'tr' ? 'Okunmamış' : 'Unread' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as NotificationTab)}
                                className={cn(
                                    "py-2.5 px-6 rounded-xl text-sm font-bold transition-all",
                                    activeTab === tab.id
                                        ? "bg-stone-900 text-white shadow-lg"
                                        : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-stone-400" size={32} /></div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-sm">
                            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <BellRing size={32} className="text-stone-200" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-2">{language === 'tr' ? 'Bildirim yok' : 'No notifications'}</h3>
                            <p className="text-stone-500 max-w-xs mx-auto">
                                {language === 'tr' ? 'Burada her şey güncel görünüyor.' : 'Everything looks up to date here.'}
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={cn(
                                    "w-full bg-white rounded-2xl border border-stone-200 p-4 md:p-6 text-left transition-all hover:shadow-md hover:border-stone-300 group",
                                    !n.isRead && "bg-indigo-50/10 border-indigo-100"
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h4 className={cn(
                                            "font-bold text-stone-900 leading-tight",
                                            !n.isRead && "text-indigo-900"
                                        )}>
                                            {n.title}
                                        </h4>
                                        <span className="text-[10px] font-medium text-stone-400 shrink-0">
                                            {formatDate(n.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-stone-600 leading-relaxed mb-3">
                                        {n.message}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {n.boardTitle && (
                                                <div className="px-2.5 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                                    {n.boardTitle}
                                                </div>
                                            )}
                                            {!n.isRead && (
                                                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                                                    {language === 'tr' ? 'Yeni' : 'New'}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                            className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </main>

            {/* Member Request Modal (Shared with Dropdown logic) */}
            {memberRequestModal.isOpen && memberRequestModal.notification && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200">
                        <div className="p-8">
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-100">
                                <UserCog size={28} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-2">{language === 'tr' ? 'Panoya Katılım İsteği' : 'Board Join Request'}</h3>
                            <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                                <span className="font-bold text-stone-900">{memberRequestModal.userName}</span>,
                                <span className="font-bold text-indigo-600 ml-1">{memberRequestModal.notification.boardTitle}</span> panosuna katılmak istiyor.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={async () => {
                                        const { notification } = memberRequestModal;
                                        if (!notification?.requestingUserId || !notification.boardId) return;
                                        setMemberRequestModal(p => ({ ...p, loading: true }));
                                        try {
                                            const board = await getBoard(notification.boardId);
                                            await approveMember(notification.boardId, notification.requestingUserId, notification.fromUserName, board?.title || '', user.uid, user.displayName);
                                            await deleteNotification(notification.id);
                                            setMemberRequestModal({ isOpen: false, notification: null, userName: '', loading: false });
                                        } catch (err) { console.error(err); }
                                    }}
                                    className="flex-1 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                                >
                                    {language === 'tr' ? 'Onayla' : 'Approve'}
                                </button>
                                <button
                                    onClick={async () => {
                                        const { notification } = memberRequestModal;
                                        if (!notification?.requestingUserId || !notification.boardId) return;
                                        setMemberRequestModal(p => ({ ...p, loading: true }));
                                        try {
                                            await rejectMember(notification.boardId, notification.requestingUserId);
                                            await deleteNotification(notification.id);
                                            setMemberRequestModal({ isOpen: false, notification: null, userName: '', loading: false });
                                        } catch (err) { console.error(err); }
                                    }}
                                    className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-all active:scale-95"
                                >
                                    {language === 'tr' ? 'Reddet' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
