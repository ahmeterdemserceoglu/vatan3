'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Conversation, DirectMessage, User } from '@/types';
import {
    subscribeToUserConversations,
    subscribeToDirectMessages,
    sendDirectMessage,
    markConversationAsRead,
    getOrCreateConversation,
    updateDirectMessage,
    deleteDirectMessage,
    reactToDirectMessage,
    setTypingStatus,
    toggleBlockUser,
    clearConversationMessages,
    togglePinDirectMessage,
    subscribeToPinnedMessages,
    updateConversationPresence,
    togglePinConversation,
    toggleEncryption,
    searchMessagesGlobal
} from '@/lib/conversations';
import { searchUsers } from '@/lib/auth';
import {
    Search, Send, MessageSquare, ArrowLeft, Loader2, Plus,
    CheckCheck, MoreVertical, Paperclip, Image as ImageIcon,
    Download, ExternalLink, Mic, Smile, Trash2, Edit2, Reply,
    ShieldAlert, Users, Pin, Grid, Settings, LogOut, ChevronRight, X,
    Play, Square, Info, File, Video, CheckCircle2, XCircle,
    Lock, Unlock, PinOff, History, Search as SearchIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { useTranslation } from '@/hooks/useTranslation';
import { uploadToSupabase } from '@/lib/supabase';
import { Header } from '@/components/Header';

function MessagesContent() {
    const { user } = useStore();
    const { t, language } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Core states
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Search states
    const [convSearch, setConvSearch] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showUserSearch, setShowUserSearch] = useState(false);

    // Feature states
    const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);
    const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
    const [messageLimit, setMessageLimit] = useState(50);
    const [showInfo, setShowInfo] = useState(false);
    const [showMobileInfo, setShowMobileInfo] = useState(false);
    const [showMediaGallery, setShowMediaGallery] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);

    // Global search state
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState<{ conversationId: string; conversationName: string; message: DirectMessage }[]>([]);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);

    // Conversation context menu
    const [convMenuOpen, setConvMenuOpen] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const globalSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial load & Conversations subscription
    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToUserConversations(user.uid, (data) => {
            setConversations(data);

            // If there's a conversation ID in URL, select it
            const convIdFromUrl = searchParams.get('id');
            if (convIdFromUrl && !activeConv) {
                const found = data.find(c => c.id === convIdFromUrl);
                if (found) setActiveConv(found);
            }
        });
        return () => unsub();
    }, [user, searchParams, activeConv]);

    // Update presence
    useEffect(() => {
        if (!user) return;
        updateConversationPresence(user.uid);
        const interval = setInterval(() => updateConversationPresence(user.uid), 30000);
        return () => clearInterval(interval);
    }, [user]);

    // Messages subscription
    useEffect(() => {
        if (!activeConv || !user) {
            setMessages([]);
            return;
        }

        const unsub = subscribeToDirectMessages(activeConv.id, messageLimit, (msgs) => {
            const sorted = [...msgs].reverse();
            setMessages(sorted);
            markConversationAsRead(activeConv.id, user.uid);
        });

        // Check if blocked
        setIsBlocked(activeConv.blockedBy?.includes(user.uid) || false);

        return () => unsub();
    }, [activeConv, user, messageLimit]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Filter conversations
    const filteredConversations = useMemo(() => {
        if (!convSearch.trim()) return conversations;
        const query = convSearch.toLowerCase();
        return conversations.filter(c => {
            if (c.isGroup) return c.groupName?.toLowerCase().includes(query);
            const otherId = c.participants.find(p => p !== user?.uid);
            const other = otherId ? c.participantDetails[otherId] : null;
            return other?.displayName?.toLowerCase().includes(query);
        });
    }, [conversations, convSearch, user]);

    // Get media messages for gallery
    const mediaMessages = useMemo(() => {
        return messages.filter(m => m.type === 'image' || m.type === 'video' || m.type === 'file');
    }, [messages]);

    // Global user search
    useEffect(() => {
        if (globalSearch.length < 2) {
            setSearchResults([]);
            return;
        }
        const delay = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchUsers(globalSearch);
                setSearchResults(results.filter(u => u.uid !== user?.uid));
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [globalSearch, user]);

    const handleStartChat = async (targetUser: User) => {
        if (!user) return;
        try {
            const convId = await getOrCreateConversation(user, targetUser);
            const existing = conversations.find(c => c.id === convId);
            if (existing) {
                setActiveConv(existing);
            }
            setShowUserSearch(false);
            setGlobalSearch('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user || !activeConv || isSending || !newMessage.trim()) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            await sendDirectMessage(
                activeConv.id,
                user.uid,
                content,
                'text',
                undefined,
                replyTo ? { id: replyTo.id, author: activeConv.participantDetails[replyTo.senderId]?.displayName || '', content: replyTo.content } : undefined
            );
            setReplyTo(null);
            setTypingStatus(activeConv.id, user.uid, false);
        } catch (err) {
            console.error(err);
            setNewMessage(content);
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !activeConv) return;

        setIsUploading(true);
        try {
            const url = await uploadToSupabase(file);

            let type: DirectMessage['type'] = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            const mediaData: Partial<DirectMessage> = {};
            if (type === 'image') mediaData.imageUrl = url;
            else if (type === 'video') mediaData.videoUrl = url;
            else if (type === 'audio') mediaData.audioUrl = url;
            else {
                mediaData.fileUrl = url;
                mediaData.fileName = file.name;
            }

            await sendDirectMessage(
                activeConv.id,
                user.uid,
                type === 'file' ? `📎 ${file.name}` : (type === 'image' ? '📷 Görsel' : type === 'video' ? '🎥 Video' : '🎵 Ses'),
                type,
                mediaData
            );
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleBlockUser = async () => {
        if (!activeConv || !user) return;
        const confirmed = confirm(
            isBlocked
                ? (language === 'tr' ? 'Engeli kaldırmak istiyor musunuz?' : 'Do you want to unblock this user?')
                : (language === 'tr' ? 'Bu kullanıcıyı engellemek istiyor musunuz?' : 'Do you want to block this user?')
        );
        if (confirmed) {
            await toggleBlockUser(activeConv.id, user.uid);
            setIsBlocked(!isBlocked);
            setShowMobileInfo(false);
            setShowInfo(false);
        }
    };

    const handleClearChat = async () => {
        if (!activeConv) return;
        const confirmed = confirm(language === 'tr' ? 'Tüm mesajları silmek istediğinize emin misiniz?' : 'Are you sure you want to delete all messages?');
        if (confirmed) {
            await clearConversationMessages(activeConv.id);
            setShowMobileInfo(false);
            setShowInfo(false);
        }
    };

    const getOtherParticipant = (conv: Conversation) => {
        if (conv.isGroup) return null;
        const otherId = conv.participants.find(p => p !== user?.uid);
        return otherId ? { id: otherId, ...conv.participantDetails[otherId] } : null;
    };

    const renderMessageContent = (msg: DirectMessage) => {
        switch (msg.type) {
            case 'image':
                return (
                    <div className="relative">
                        <img
                            src={msg.imageUrl}
                            alt="Görsel"
                            className="max-w-[250px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                    </div>
                );
            case 'video':
                return (
                    <video
                        src={msg.videoUrl}
                        controls
                        className="max-w-[300px] rounded-xl"
                    />
                );
            case 'audio':
                return (
                    <audio src={msg.audioUrl} controls className="max-w-[250px]" />
                );
            case 'file':
                return (
                    <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
                    >
                        <File size={24} className="text-stone-500" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">{msg.fileName || 'Dosya'}</p>
                            <p className="text-xs text-stone-500">{language === 'tr' ? 'İndirmek için tıkla' : 'Click to download'}</p>
                        </div>
                        <Download size={18} className="text-stone-400" />
                    </a>
                );
            default:
                return <span>{msg.content}</span>;
        }
    };

    // Info Panel Content (shared between desktop sidebar and mobile modal)
    const InfoPanelContent = () => (
        <>
            <div className="p-6 md:p-8 text-center border-b border-stone-100 bg-stone-50/30">
                <Avatar
                    src={activeConv?.isGroup ? undefined : getOtherParticipant(activeConv!)?.photoURL}
                    name={activeConv?.isGroup ? activeConv?.groupName : (getOtherParticipant(activeConv!)?.displayName || '?')}
                    size="2xl"
                    className="mx-auto mb-4"
                />
                <h3 className="text-lg font-bold text-stone-900">
                    {activeConv?.isGroup ? activeConv?.groupName : getOtherParticipant(activeConv!)?.displayName}
                </h3>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">
                    {activeConv?.isGroup ? 'GRUP SOHBETİ' : 'BİREYSEL SOHBET'}
                </p>
                {isBlocked && (
                    <div className="mt-3 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-full inline-block">
                        {language === 'tr' ? 'ENGELLENDİ' : 'BLOCKED'}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {/* Actions */}
                <div>
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">
                        {language === 'tr' ? 'Eylemler' : 'Actions'}
                    </h4>
                    <div className="space-y-1">
                        <button
                            onClick={() => setShowMediaGallery(true)}
                            className="w-full flex items-center gap-3 p-3 text-sm font-bold text-stone-700 hover:bg-stone-50 rounded-xl transition-colors"
                        >
                            <Grid size={18} className="text-stone-400" />
                            {language === 'tr' ? 'Medya Galerisi' : 'Media Gallery'}
                            {mediaMessages.length > 0 && (
                                <span className="ml-auto text-xs bg-stone-100 px-2 py-0.5 rounded-full text-stone-500">
                                    {mediaMessages.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={handleClearChat}
                            className="w-full flex items-center gap-3 p-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <Trash2 size={18} />
                            {language === 'tr' ? 'Sohbeti Temizle' : 'Clear Chat'}
                        </button>
                        {!activeConv?.isGroup && (
                            <button
                                onClick={handleBlockUser}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 text-sm font-bold rounded-xl transition-colors",
                                    isBlocked
                                        ? "text-green-600 hover:bg-green-50"
                                        : "text-red-600 hover:bg-red-50"
                                )}
                            >
                                {isBlocked ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                                {isBlocked
                                    ? (language === 'tr' ? 'Engeli Kaldır' : 'Unblock User')
                                    : (language === 'tr' ? 'Engelle' : 'Block User')
                                }
                            </button>
                        )}
                    </div>
                </div>

                {/* Members for groups */}
                {activeConv?.isGroup && (
                    <div>
                        <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">
                            {language === 'tr' ? 'Üyeler' : 'Members'}
                        </h4>
                        <div className="space-y-2">
                            {activeConv.participants.map(pId => {
                                const details = activeConv.participantDetails[pId];
                                return (
                                    <div key={pId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition-colors">
                                        <Avatar src={details?.photoURL} name={details?.displayName || '?'} size="sm" />
                                        <span className="text-sm font-bold text-stone-700">{details?.displayName}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    if (!user) return null;

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden pb-16 md:pb-0">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                {/* Conversations Sidebar */}
                <div className={cn(
                    "w-full md:w-[360px] lg:w-[380px] bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col transition-all",
                    activeConv && "hidden md:flex"
                )}>
                    {/* Sidebar Header */}
                    <div className="p-5 bg-white border-b border-slate-100">
                        <div className="flex items-center justify-between mb-5">
                            <h1 className="text-xl font-bold text-slate-900">{language === 'tr' ? 'Mesajlar' : 'Messages'}</h1>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowGlobalSearch(true)}
                                    className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                                    title={language === 'tr' ? 'Tüm Mesajlarda Ara' : 'Search All Messages'}
                                >
                                    <History size={18} />
                                </button>
                                <button
                                    onClick={() => setShowUserSearch(true)}
                                    className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={convSearch}
                                onChange={(e) => setConvSearch(e.target.value)}
                                placeholder={language === 'tr' ? 'Sohbetlerde ara...' : 'Search chats...'}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 transition-all text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 h-full">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                    <MessageSquare size={28} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-medium">{language === 'tr' ? 'Henüz mesaj yok' : 'No messages yet'}</p>
                                <p className="text-xs text-slate-300 mt-1">{language === 'tr' ? 'Yeni bir sohbet başlatın' : 'Start a new conversation'}</p>
                            </div>
                        ) : (
                            // Sort: pinned first, then by last update
                            [...filteredConversations]
                                .sort((a, b) => {
                                    const aPinned = a.pinnedBy?.includes(user!.uid) ? 1 : 0;
                                    const bPinned = b.pinnedBy?.includes(user!.uid) ? 1 : 0;
                                    return bPinned - aPinned;
                                })
                                .map((conv) => {
                                    const other = getOtherParticipant(conv);
                                    const lastMsg = conv.lastMessage;
                                    const lastSenderId = conv.lastMessageSenderId;
                                    const isUnread = conv.unreadCount?.[user.uid] > 0;

                                    // Check online status for 1:1 conversations
                                    const lastSeenRaw = other?.lastSeen;
                                    const lastSeenTime = lastSeenRaw
                                        ? (typeof lastSeenRaw === 'object' && 'toDate' in lastSeenRaw
                                            ? (lastSeenRaw as any).toDate().getTime()
                                            : new Date(lastSeenRaw as any).getTime())
                                        : 0;
                                    const isOnline = !conv.isGroup && lastSeenTime && (Date.now() - lastSeenTime < 120000);

                                    // Check if someone is typing (exclude current user)
                                    const typingUsers = Object.entries(conv.typing || {})
                                        .filter(([id, isTyping]) => isTyping && id !== user?.uid)
                                        .map(([id]) => conv.participantDetails[id]?.displayName || 'Birisi');
                                    const isTyping = typingUsers.length > 0;
                                    const typingText = conv.isGroup
                                        ? (typingUsers.length === 1
                                            ? `${typingUsers[0]} ${language === 'tr' ? 'yazıyor' : 'is typing'}...`
                                            : `${typingUsers.length} ${language === 'tr' ? 'kişi yazıyor' : 'people typing'}...`)
                                        : (language === 'tr' ? 'yazıyor...' : 'is typing...');

                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => setActiveConv(conv)}
                                            className={cn(
                                                "w-full flex items-center gap-3.5 p-4 hover:bg-slate-50/80 transition-all border-b border-slate-100/60 group relative",
                                                activeConv?.id === conv.id && "bg-gradient-to-r from-indigo-50/80 to-purple-50/50 border-l-2 border-l-indigo-500"
                                            )}
                                        >
                                            <div className="relative">
                                                <Avatar
                                                    src={conv.isGroup ? undefined : other?.photoURL}
                                                    name={conv.isGroup ? conv.groupName : (other?.displayName || '?')}
                                                    size="md"
                                                />
                                                {/* Online status indicator */}
                                                {!conv.isGroup && (
                                                    <span
                                                        className={cn(
                                                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                                                            isOnline
                                                                ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                                                                : "bg-slate-300"
                                                        )}
                                                        title={isOnline
                                                            ? (language === 'tr' ? 'Çevrimiçi' : 'Online')
                                                            : (language === 'tr' ? 'Çevrimdışı' : 'Offline')
                                                        }
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <h3 className={cn("font-semibold text-slate-900 truncate", isUnread && "text-indigo-600 font-bold")}>
                                                            {conv.isGroup ? conv.groupName : (other?.displayName || 'Unknown')}
                                                        </h3>
                                                        {conv.pinnedBy?.includes(user!.uid) && (
                                                            <Pin size={12} className="text-amber-500 flex-shrink-0" />
                                                        )}
                                                        {conv.isEncrypted && (
                                                            <Lock size={12} className="text-green-500 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                        {conv.updatedAt && (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConvMenuOpen(convMenuOpen === conv.id ? null : conv.id);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                                        >
                                                            <MoreVertical size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    {isTyping ? (
                                                        <div className="flex items-center gap-1.5 text-[13px] text-green-600 font-medium">
                                                            <span className="flex gap-0.5">
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                            </span>
                                                            <span className="italic truncate">{typingText}</span>
                                                        </div>
                                                    ) : (
                                                        <p className={cn(
                                                            "text-[13px] truncate",
                                                            isUnread ? "text-slate-800 font-medium" : "text-slate-500"
                                                        )}>
                                                            {lastSenderId === user.uid && <span className="text-slate-400">Sen: </span>}{lastMsg || (language === 'tr' ? 'Sohbeti başlat' : 'Start chat')}
                                                        </p>
                                                    )}
                                                    {isUnread && (
                                                        <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
                                                            <span className="text-[10px] text-white font-bold">{conv.unreadCount[user.uid]}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Context Menu */}
                                            {convMenuOpen === conv.id && (
                                                <div
                                                    className="absolute right-2 top-14 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-30 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={async () => {
                                                            await togglePinConversation(conv.id, user!.uid);
                                                            setConvMenuOpen(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        {conv.pinnedBy?.includes(user!.uid) ? (
                                                            <>
                                                                <PinOff size={14} className="text-amber-500" />
                                                                {language === 'tr' ? 'Sabitlemeyi Kaldır' : 'Unpin'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Pin size={14} className="text-amber-500" />
                                                                {language === 'tr' ? 'Sabitle' : 'Pin'}
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await toggleEncryption(conv.id, user!.uid);
                                                            setConvMenuOpen(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                                    >
                                                        {conv.isEncrypted ? (
                                                            <>
                                                                <Unlock size={14} className="text-green-500" />
                                                                {language === 'tr' ? 'Şifrelemeyi Kapat' : 'Disable Encryption'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock size={14} className="text-green-500" />
                                                                {language === 'tr' ? 'E2E Şifreleme' : 'E2E Encryption'}
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col bg-white overflow-hidden relative",
                    !activeConv && "hidden md:flex items-center justify-center"
                )}>
                    {activeConv ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveConv(null)}
                                        className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <Avatar
                                        src={activeConv.isGroup ? undefined : getOtherParticipant(activeConv)?.photoURL}
                                        name={activeConv.isGroup ? activeConv.groupName : (getOtherParticipant(activeConv)?.displayName || '?')}
                                        size="md"
                                    />
                                    <div>
                                        <h2 className="font-semibold text-slate-900 leading-tight">
                                            {activeConv.isGroup ? activeConv.groupName : (getOtherParticipant(activeConv)?.displayName || '...')}
                                        </h2>
                                        {(() => {
                                            // Check typing status
                                            const typingUsers = Object.entries(activeConv.typing || {})
                                                .filter(([id, isTyping]) => isTyping && id !== user?.uid)
                                                .map(([id]) => activeConv.participantDetails[id]?.displayName || 'Birisi');
                                            const isTypingConv = typingUsers.length > 0;

                                            if (isTypingConv) {
                                                const typingTextHeader = activeConv.isGroup
                                                    ? (typingUsers.length === 1
                                                        ? `${typingUsers[0]} ${language === 'tr' ? 'yazıyor' : 'is typing'}...`
                                                        : `${typingUsers.length} ${language === 'tr' ? 'kişi yazıyor' : 'people typing'}...`)
                                                    : (language === 'tr' ? 'yazıyor...' : 'is typing...');
                                                return (
                                                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                                        <span className="flex gap-0.5">
                                                            <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </span>
                                                        <span className="italic">{typingTextHeader}</span>
                                                    </div>
                                                );
                                            }

                                            // Check online status for 1:1
                                            if (!activeConv.isGroup) {
                                                const other = getOtherParticipant(activeConv);
                                                const lastSeenRaw = other?.lastSeen;
                                                const lastSeenTime = lastSeenRaw
                                                    ? (typeof lastSeenRaw === 'object' && 'toDate' in lastSeenRaw
                                                        ? (lastSeenRaw as any).toDate().getTime()
                                                        : new Date(lastSeenRaw as any).getTime())
                                                    : 0;
                                                const isOnlineHeader = lastSeenTime && (Date.now() - lastSeenTime < 120000);

                                                return (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <span className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            isOnlineHeader ? "bg-green-500" : "bg-slate-300"
                                                        )} />
                                                        {isOnlineHeader
                                                            ? (language === 'tr' ? 'Çevrimiçi' : 'Online')
                                                            : (language === 'tr' ? 'Çevrimdışı' : 'Offline')
                                                        }
                                                    </div>
                                                );
                                            }

                                            // Group: show member count
                                            return (
                                                <p className="text-xs text-slate-500">
                                                    {`${activeConv.participants.length} ${language === 'tr' ? 'Üye' : 'Members'}`}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Mobile Info Button */}
                                    <button
                                        onClick={() => setShowMobileInfo(true)}
                                        className="lg:hidden p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                                    >
                                        <Info size={20} />
                                    </button>
                                    {/* Desktop Info Button */}
                                    <button
                                        onClick={() => setShowInfo(!showInfo)}
                                        className={cn("hidden lg:flex p-2.5 rounded-xl transition-all", showInfo ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100")}
                                    >
                                        <Info size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-white custom-scrollbar">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
                                            <MessageSquare size={28} className="text-indigo-400" />
                                        </div>
                                        <p className="text-slate-500 font-medium">{language === 'tr' ? 'Henüz mesaj yok' : 'No messages yet'}</p>
                                        <p className="text-slate-400 text-sm mt-1">{language === 'tr' ? 'İlk mesajı siz gönderin!' : 'Send the first message!'}</p>
                                    </div>
                                )}
                                {messages.map((msg, idx) => {
                                    const isOwn = msg.senderId === user.uid;

                                    return (
                                        <div key={msg.id} className={cn(
                                            "flex flex-col",
                                            isOwn ? "items-end" : "items-start"
                                        )}>
                                            <div className={cn(
                                                "max-w-[85%] md:max-w-[70%] group relative",
                                                isOwn ? "text-right" : "text-left"
                                            )}>
                                                {/* Reply Context */}
                                                {msg.replyToId && (
                                                    <div className={cn(
                                                        "mb-[-12px] pb-3 px-3 pt-2 bg-slate-100/80 rounded-t-2xl border-l-4 border-indigo-400 text-xs italic",
                                                        isOwn ? "mr-2 ml-4" : "ml-2 mr-4"
                                                    )}>
                                                        <p className="font-semibold text-indigo-600 mb-0.5">{msg.replyToAuthor}</p>
                                                        <p className="truncate text-slate-500">{msg.replyToContent}</p>
                                                    </div>
                                                )}

                                                <div className={cn(
                                                    "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                                                    isOwn
                                                        ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-tr-sm shadow-lg shadow-slate-200"
                                                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm shadow-sm"
                                                )}>
                                                    {renderMessageContent(msg)}
                                                    <div className={cn(
                                                        "text-[10px] mt-1.5 font-medium flex items-center gap-1.5",
                                                        isOwn ? "text-white/50 justify-end" : "text-slate-400"
                                                    )}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isOwn && msg.isRead && <CheckCheck size={12} className="text-blue-400" />}
                                                    </div>
                                                </div>

                                                {/* Actions Overlay */}
                                                <div className={cn(
                                                    "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex gap-1 z-20",
                                                    isOwn ? "right-full mr-2" : "left-full ml-2"
                                                )}>
                                                    <button onClick={() => setReplyTo(msg)} className="p-1.5 bg-white shadow-md border border-stone-100 rounded-full text-stone-400 hover:text-stone-900">
                                                        <Reply size={14} />
                                                    </button>
                                                    {isOwn && (
                                                        <button onClick={() => deleteDirectMessage(activeConv.id, msg.id)} className="p-1.5 bg-white shadow-md border border-stone-100 rounded-full text-stone-400 hover:text-red-500">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-3 md:p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 pb-4 md:pb-4">
                                {replyTo && (
                                    <div className="mb-3 px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-indigo-600">
                                                {activeConv.participantDetails[replyTo.senderId]?.displayName} {language === 'tr' ? "'e yanıt" : 'reply'}
                                            </p>
                                            <p className="text-xs text-slate-600 truncate mt-0.5">{replyTo.content}</p>
                                        </div>
                                        <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white/50 rounded-lg transition-all">
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                                <form onSubmit={handleSend} className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="p-3 text-slate-400 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-50"
                                    >
                                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                                    </button>
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setNewMessage(value);

                                                // Clear typing timeout
                                                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

                                                // If message is empty or only whitespace, immediately stop typing
                                                if (!value.trim()) {
                                                    setTypingStatus(activeConv.id, user.uid, false);
                                                } else {
                                                    // Set typing and auto-clear after 2 seconds
                                                    setTypingStatus(activeConv.id, user.uid, true);
                                                    typingTimeoutRef.current = setTimeout(() => setTypingStatus(activeConv.id, user.uid, false), 2000);
                                                }
                                            }}
                                            placeholder={language === 'tr' ? 'Bir mesaj yazın...' : 'Type a message...'}
                                            className="w-full px-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:ring-2 focus:ring-indigo-200 focus:bg-white focus:border-indigo-300 transition-all text-sm placeholder:text-slate-400"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || isSending}
                                        className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl hover:from-slate-700 hover:to-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-200 active:scale-95"
                                    >
                                        {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center h-full bg-white">
                            <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                <MessageSquare size={32} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                                {language === 'tr' ? 'Mesajlaşmaya Başla' : 'Start Messaging'}
                            </h2>
                            <p className="text-slate-500 max-w-sm mb-6">
                                {language === 'tr' ? 'Soldaki listeden birini seçin veya yeni bir sohbet başlatın.' : 'Select someone from the list on the left to start a conversation.'}
                            </p>
                            <button
                                onClick={() => setShowUserSearch(true)}
                                className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={20} />
                                {language === 'tr' ? 'Yeni Sohbet' : 'New Chat'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Info Sidebar (Desktop) */}
                {showInfo && activeConv && (
                    <div className="w-[300px] bg-white border-l border-stone-200 animate-in slide-in-from-right duration-300 hidden lg:flex flex-col">
                        <InfoPanelContent />
                    </div>
                )}
            </div>

            {/* Mobile Info Modal */}
            {showMobileInfo && activeConv && (
                <div className="fixed inset-0 z-[200] lg:hidden">
                    <div
                        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowMobileInfo(false)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                            <h3 className="font-bold text-stone-900">{language === 'tr' ? 'Sohbet Bilgileri' : 'Chat Info'}</h3>
                            <button onClick={() => setShowMobileInfo(false)} className="p-2 text-stone-400 hover:text-stone-900">
                                <X size={24} />
                            </button>
                        </div>
                        <InfoPanelContent />
                    </div>
                </div>
            )}

            {/* Media Gallery Modal */}
            {showMediaGallery && activeConv && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 md:p-6 border-b border-stone-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-stone-900">{language === 'tr' ? 'Medya Galerisi' : 'Media Gallery'}</h3>
                            <button onClick={() => setShowMediaGallery(false)} className="p-2 text-stone-400 hover:text-stone-900">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-4 md:p-6 overflow-y-auto max-h-[60vh]">
                            {mediaMessages.length === 0 ? (
                                <div className="text-center py-12 text-stone-400">
                                    <Grid size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>{language === 'tr' ? 'Henüz medya yok' : 'No media yet'}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {mediaMessages.map(msg => (
                                        <div key={msg.id} className="aspect-square rounded-xl overflow-hidden bg-stone-100 relative group">
                                            {msg.type === 'image' && (
                                                <img
                                                    src={msg.imageUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={() => window.open(msg.imageUrl, '_blank')}
                                                />
                                            )}
                                            {msg.type === 'video' && (
                                                <div className="w-full h-full flex items-center justify-center bg-stone-800 cursor-pointer" onClick={() => window.open(msg.videoUrl, '_blank')}>
                                                    <Play size={32} className="text-white" />
                                                </div>
                                            )}
                                            {msg.type === 'file' && (
                                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center p-4 hover:bg-stone-200 transition-colors">
                                                    <File size={32} className="text-stone-400 mb-2" />
                                                    <p className="text-xs text-stone-600 text-center truncate w-full">{msg.fileName}</p>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Chat Modal */}
            {showUserSearch && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-stone-900">{language === 'tr' ? 'Yeni Sohbet Başlat' : 'Start New Chat'}</h3>
                            <button onClick={() => setShowUserSearch(false)} className="p-2 text-stone-400 hover:text-stone-900"><X size={24} /></button>
                        </div>
                        <div className="p-6 flex flex-col h-[500px]">
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                <input
                                    type="text"
                                    value={globalSearch}
                                    onChange={(e) => setGlobalSearch(e.target.value)}
                                    placeholder={language === 'tr' ? 'İsim veya e-posta ile ara...' : 'Search by name or email...'}
                                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all text-sm font-medium"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                                {isSearching ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-stone-400" /></div>
                                ) : searchResults.length === 0 && globalSearch.length >= 2 ? (
                                    <div className="text-center py-8 text-stone-400 text-sm">{language === 'tr' ? 'Kullanıcı bulunamadı' : 'No users found'}</div>
                                ) : (
                                    searchResults.map(u => (
                                        <button
                                            key={u.uid}
                                            onClick={() => handleStartChat(u)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 rounded-2xl transition-all border border-transparent hover:border-stone-100 group"
                                        >
                                            <Avatar src={u.photoURL} name={u.displayName} size="md" />
                                            <div className="text-left flex-1">
                                                <p className="font-bold text-stone-900 group-hover:text-indigo-600 transition-colors">{u.displayName}</p>
                                                <p className="text-xs text-stone-500">{u.email}</p>
                                            </div>
                                            <ChevronRight size={18} className="text-stone-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Search Modal */}
            {showGlobalSearch && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={language === 'tr' ? 'Tüm mesajlarda ara...' : 'Search all messages...'}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                    value={globalSearchQuery}
                                    onChange={(e) => {
                                        const query = e.target.value;
                                        setGlobalSearchQuery(query);

                                        // Clear previous timeout
                                        if (globalSearchTimeoutRef.current) {
                                            clearTimeout(globalSearchTimeoutRef.current);
                                        }

                                        // Clear results if query is too short
                                        if (query.length < 2) {
                                            setGlobalSearchResults([]);
                                            setIsGlobalSearching(false);
                                            return;
                                        }

                                        // Debounced search - 400ms delay
                                        setIsGlobalSearching(true);
                                        globalSearchTimeoutRef.current = setTimeout(async () => {
                                            if (!user) return;
                                            try {
                                                const results = await searchMessagesGlobal(user.uid, query);
                                                setGlobalSearchResults(results);
                                            } catch (err) {
                                                console.error(err);
                                            }
                                            setIsGlobalSearching(false);
                                        }, 400);
                                    }}
                                    autoFocus
                                />
                                {isGlobalSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={16} />
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowGlobalSearch(false);
                                    setGlobalSearchQuery('');
                                    setGlobalSearchResults([]);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
                            {globalSearchResults.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {globalSearchResults.map((result, idx) => (
                                        <button
                                            key={`${result.conversationId}-${result.message.id}-${idx}`}
                                            onClick={() => {
                                                const conv = conversations.find(c => c.id === result.conversationId);
                                                if (conv) {
                                                    setActiveConv(conv);
                                                    setShowGlobalSearch(false);
                                                    setGlobalSearchQuery('');
                                                    setGlobalSearchResults([]);
                                                }
                                            }}
                                            className="w-full p-4 hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {result.conversationName}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {result.message.createdAt?.toLocaleDateString?.() || ''}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 line-clamp-2">
                                                {result.message.content}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            ) : globalSearchQuery.length >= 2 && !isGlobalSearching ? (
                                <div className="text-center py-12 px-6">
                                    <SearchIcon size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-500 font-medium">
                                        {language === 'tr' ? 'Sonuç bulunamadı' : 'No results found'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {language === 'tr' ? 'Farklı bir arama terimi deneyin' : 'Try a different search term'}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-12 px-6">
                                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-500 font-medium">
                                        {language === 'tr' ? 'Tüm sohbetlerde ara' : 'Search across all chats'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {language === 'tr' ? 'En az 2 karakter girin ve Ara butonuna tıklayın' : 'Enter at least 2 characters and click Search'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-[#f0f2f5]">
                <Loader2 size={32} className="text-stone-400 animate-spin" />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}
