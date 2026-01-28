'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import type { Notification as AppNotification } from '@/types';
import { subscribeToNotifications, markAsRead, markAllAsRead, deleteNotification } from '@/lib/notifications';
import { ArrowRight, Bell, Check, CheckCheck, Trash2, MessageSquare, AtSign, Heart, X, BellRing, FileText, GraduationCap, UserPlus, ClipboardList, BookOpen, AlarmClock, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

import { approveMember, rejectMember, getBoard } from '@/lib/boards';

export function NotificationDropdown() {
    const { user, activeChatBoardId, setUnreadNotificationCount } = useStore();
    const { t, language } = useTranslation();
    const router = useRouter();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prevNotificationsRef = useRef<AppNotification[]>([]);

    // Member request modal state
    const [memberRequestModal, setMemberRequestModal] = useState<{
        isOpen: boolean;
        notification: AppNotification | null;
        userName: string;
        loading: boolean;
    }>({ isOpen: false, notification: null, userName: '', loading: false });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Request push notification permission
    useEffect(() => {
        if ('Notification' in window) {
            setPushPermission(window.Notification.permission);
        }
    }, []);

    const requestPushPermission = async () => {
        if ('Notification' in window) {
            const permission = await window.Notification.requestPermission();
            setPushPermission(permission);
        }
    };

    // Play notification sound
    const playNotificationSound = () => {
        try {
            // Base64 encoded simple notification beep
            const beepSound = "new-notification-011-364050.mp3";

            const audio = new Audio(beepSound);
            audio.volume = 0.5;
            audio.play().catch(e => {
                // Fallback to Web Audio API if Audio element fails
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            });
        } catch (e) {
            console.log('Could not play notification sound:', e);
        }
    };


    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = subscribeToNotifications(user.uid, (data) => {
            setUnreadNotificationCount(data.filter(n => !n.isRead).length);
            // Check for new notifications
            const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
            const newNotifications = data.filter(n => !prevIds.has(n.id) && !n.isRead);

            // Auto-mark teacher_message notifications as read if chat is open for that board
            // Also filter them from alerts
            const notificationsToMarkAsRead: string[] = [];
            const notificationsToAlert = newNotifications.filter(n => {
                // If it's a teacher message and the user is viewing that board's chat
                if (n.type === 'teacher_message' && n.boardId && n.boardId === activeChatBoardId) {
                    // Mark as read automatically
                    notificationsToMarkAsRead.push(n.id);
                    return false;
                }
                return true;
            });

            // Mark filtered notifications as read
            notificationsToMarkAsRead.forEach(id => {
                markAsRead(id).catch(console.error);
            });

            // Play sound only ONCE if there are new notifications (that aren't filtered)
            if (notificationsToAlert.length > 0) {
                playNotificationSound();
            }

            // Show browser notification for each new one (without playing sound again)
            notificationsToAlert.forEach(n => {
                // Only show browser popup, sound already played once above
                if (pushPermission === 'granted' && !document.hasFocus()) {
                    const browserNotif = new window.Notification(n.title, {
                        body: n.message,
                        icon: '/icon-192.png',
                        tag: n.id,
                    });

                    browserNotif.onclick = () => {
                        window.focus();
                        if (n.boardId) {
                            router.push(`/board/${n.boardId}`);
                        }
                        browserNotif.close();
                    };
                }
            });

            prevNotificationsRef.current = data;

            // Also filter the displayed notifications - hide teacher messages for active chat board
            const filteredData = data.filter(n => {
                if (n.type === 'teacher_message' && n.boardId && n.boardId === activeChatBoardId && !n.isRead) {
                    return false;
                }
                return true;
            });
            setNotifications(filteredData);
        });

        return () => unsubscribe();
    }, [user?.uid, pushPermission, activeChatBoardId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        // Member request special handling - open approval modal
        if (notification.type === 'member_request' && notification.requestingUserId) {
            setMemberRequestModal({
                isOpen: true,
                notification,
                userName: notification.fromUserName,
                loading: false,
            });
            setIsOpen(false);
            return;
        }

        // Navigate to the board/note with query params for highlighting
        if (notification.boardId) {
            let url = `/board/${notification.boardId}`;
            const params = new URLSearchParams();

            // Add type-specific params
            if (notification.type === 'comment_reply' && notification.noteId) {
                params.set('openNote', notification.noteId);
                if (notification.commentId) {
                    params.set('highlightComment', notification.commentId);
                }
            } else if (notification.type === 'mention') {
                if (notification.noteId) {
                    params.set('openNote', notification.noteId);
                } else {
                    params.set('openChat', 'true');
                    if (notification.messageId) {
                        params.set('highlightMessage', notification.messageId);
                    }
                }
            } else if ((notification.type === 'like' || notification.type === 'reaction') && notification.noteId) {
                // For like/reaction: if commentId exists, open comments and highlight that comment
                if (notification.commentId) {
                    params.set('openNote', notification.noteId);
                    params.set('highlightComment', notification.commentId);
                } else {
                    // Otherwise just highlight the note card
                    params.set('highlightNote', notification.noteId);
                }
            } else if (notification.type === 'teacher_post' && notification.noteId) {
                // For teacher post: scroll to and highlight the note card
                params.set('highlightNote', notification.noteId);
            } else if (notification.type === 'teacher_message') {
                // For teacher message: open chat and highlight the message
                params.set('openChat', 'true');
                if (notification.messageId) {
                    params.set('highlightMessage', notification.messageId);
                }
            }
            // For chat message replies
            if (notification.type === 'comment_reply' && !notification.noteId) {
                params.set('openChat', 'true');
                if (notification.messageId) {
                    params.set('highlightMessage', notification.messageId);
                }
            }
            // Ödev bildirimleri için ödev sayfasına git
            const assignmentTypes = ['homework_assigned', 'new_assignment', 'homework_reminder', 'assignment_due', 'assignment_graded', 'assignment_feedback'];
            if (notification.assignmentId && assignmentTypes.includes(notification.type)) {
                router.push(`/board/${notification.boardId}/assignments?highlight=${notification.assignmentId}`);
                setIsOpen(false);
                return;
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            router.push(url);
        }
        setIsOpen(false);
    };

    const handleMarkAllRead = async () => {
        if (user?.uid) {
            await markAllAsRead(user.uid);
        }
    };

    const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        await deleteNotification(notificationId);
    };

    // Handle member approval
    const handleApproveMember = async () => {
        const { notification } = memberRequestModal;
        if (!notification?.requestingUserId || !notification.boardId || !user) return;

        setMemberRequestModal(prev => ({ ...prev, loading: true }));

        try {
            const board = await getBoard(notification.boardId);
            await approveMember(
                notification.boardId,
                notification.requestingUserId,
                notification.fromUserName,
                board?.title || notification.boardTitle || '',
                user.uid,
                user.displayName
            );
            await deleteNotification(notification.id);
            setMemberRequestModal({ isOpen: false, notification: null, userName: '', loading: false });
        } catch (error) {
            console.error('Approve member error:', error);
            setMemberRequestModal(prev => ({ ...prev, loading: false }));
        }
    };

    // Handle member rejection
    const handleRejectMember = async () => {
        const { notification } = memberRequestModal;
        if (!notification?.requestingUserId || !notification.boardId) return;

        setMemberRequestModal(prev => ({ ...prev, loading: true }));

        try {
            await rejectMember(notification.boardId, notification.requestingUserId);
            await deleteNotification(notification.id);
            setMemberRequestModal({ isOpen: false, notification: null, userName: '', loading: false });
        } catch (error) {
            console.error('Reject member error:', error);
            setMemberRequestModal(prev => ({ ...prev, loading: false }));
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Şimdi';
        if (minutes < 60) return `${minutes}dk`;
        if (hours < 24) return `${hours}sa`;
        if (days < 7) return `${days}g`;
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'comment_reply':
                return <MessageSquare size={16} className="text-blue-500" />;
            case 'mention':
                return <AtSign size={16} className="text-purple-500" />;
            case 'new_comment':
                return <MessageSquare size={16} className="text-emerald-500" />;
            case 'reaction':
                return <Heart size={16} className="text-amber-500" />;
            case 'like':
                return <Heart size={16} className="text-rose-500" />;
            case 'teacher_post':
                return <GraduationCap size={16} className="text-indigo-500" />;
            case 'teacher_message':
                return <GraduationCap size={16} className="text-teal-500" />;
            case 'member_joined':
                return <UserPlus size={16} className="text-green-500" />;
            case 'member_request':
                return <UserCog size={16} className="text-amber-500" />;
            // Ödevlendirme - Yeni ödev atandığında (Yeşil/Mavi tema)
            case 'homework_assigned':
            case 'new_assignment': // Legacy support
                return <BookOpen size={16} className="text-emerald-600" />;
            // Ödev Hatırlatma - Teslim tarihi yaklaştığında (Turuncu/Kırmızı tema)
            case 'homework_reminder':
            case 'assignment_due': // Legacy support
                return <AlarmClock size={16} className="text-orange-500" />;
            // Ödev Değerlendirildi - Not/geribildirim
            case 'assignment_graded':
            case 'assignment_feedback':
                return <ClipboardList size={16} className="text-blue-600" />;
            default:
                return <Bell size={16} className="text-stone-400" />;
        }
    };

    if (!user) return null;

    return (
        <div ref={dropdownRef} className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
                        <h3 className="font-semibold text-stone-800">{t('notifications.notificationTitle')}</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                <CheckCheck size={14} />
                                {t('notifications.markAllRead')}
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10 text-stone-400">
                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">{t('notifications.noNotifications')}</p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                // Ödev bildirimleri için özel stil
                                const isHomeworkAssigned = notification.type === 'homework_assigned' || notification.type === 'new_assignment';
                                const isHomeworkReminder = notification.type === 'homework_reminder' || notification.type === 'assignment_due';

                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors border-b border-stone-50 group",
                                            !notification.isRead && "bg-indigo-50/50",
                                            // Ödevlendirme için yeşil arka plan
                                            !notification.isRead && isHomeworkAssigned && "bg-emerald-50/60",
                                            // Hatırlatma için turuncu arka plan
                                            !notification.isRead && isHomeworkReminder && "bg-orange-50/60"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                            isHomeworkAssigned ? "bg-emerald-50 border-emerald-200" :
                                                isHomeworkReminder ? "bg-orange-50 border-orange-200" :
                                                    "bg-white border-stone-200"
                                        )}>
                                            {getIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm truncate",
                                                    !notification.isRead ? "font-semibold text-stone-800" : "text-stone-600",
                                                    !notification.isRead && isHomeworkAssigned && "text-emerald-800",
                                                    !notification.isRead && isHomeworkReminder && "text-orange-800"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-stone-400 shrink-0">
                                                    {formatDate(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-xs truncate mt-0.5",
                                                isHomeworkAssigned ? "text-emerald-600" :
                                                    isHomeworkReminder ? "text-orange-600" :
                                                        "text-stone-500"
                                            )}>
                                                {notification.message}
                                            </p>
                                            {notification.boardTitle && (
                                                <p className="text-[10px] text-stone-400 mt-1">
                                                    {notification.boardTitle}
                                                </p>
                                            )}
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => handleDelete(e, notification.id)}
                                            className="p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-stone-100 bg-stone-50">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/notifications');
                            }}
                            className="w-full py-2 text-sm text-stone-600 hover:text-indigo-600 hover:bg-stone-100 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 group"
                        >
                            {language === 'tr' ? 'Tüm bildirimleri gör' : 'View all notifications'}
                            <div className="w-4 h-4 rounded-full bg-stone-200 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                <ArrowRight size={10} className="text-stone-500 group-hover:text-indigo-600" />
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Member Request Approval Modal */}
            {memberRequestModal.isOpen && memberRequestModal.notification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <UserCog size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800">
                                        {language === 'tr' ? 'Üyelik İsteği' : 'Membership Request'}
                                    </h3>
                                    <p className="text-xs text-stone-500">
                                        {memberRequestModal.notification.boardTitle}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMemberRequestModal({ isOpen: false, notification: null, userName: '', loading: false })}
                                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="bg-stone-50 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                                    {memberRequestModal.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-stone-800 text-lg">{memberRequestModal.userName}</p>
                                    <p className="text-sm text-stone-500">
                                        {language === 'tr' ? 'Panoya katılmak istiyor' : 'Wants to join the board'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleRejectMember}
                                disabled={memberRequestModal.loading}
                                className="flex-1 px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={18} />
                                {language === 'tr' ? 'Reddet' : 'Reject'}
                            </button>
                            <button
                                onClick={handleApproveMember}
                                disabled={memberRequestModal.loading}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                {language === 'tr' ? 'Onayla' : 'Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
