'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Message, User } from '@/types';
import { sendMessage, sendAudioMessage, subscribeToBoardMessages, deleteMessage, notifyTeacherMessage, setTypingStatus, subscribeToTypingStatus, sendMediaMessage, sendFileMessage, pinMessage, unpinMessage, updateMessage, clearAllMessages } from '@/lib/chat';
import { subscribeToBoardSections } from '@/lib/sections';
import { useStore } from '@/store/useStore';
import { uploadToSupabase } from '@/lib/supabase';
import { Send, X, MessageCircle, Trash2, Reply, CornerUpLeft, Mic, Square, Play, Pause, Loader2, Image, Video, Paperclip, Pin, Search, Edit2, Check, ArrowDown, FileText, Layout, PanelLeft, PanelRight, Settings, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createNotification, createMentionNotifications } from '@/lib/notifications';
import { useTranslation } from '@/hooks/useTranslation';
import { Avatar } from './Avatar';
import { MentionText } from './MentionText';

interface ChatDrawerProps {
    boardId: string;
    isOpen: boolean;
    onClose: () => void;
    members?: User[];
    boardTitle?: string;
    initialHighlightMessageId?: string | null;
    canChat?: boolean;
    ownerId?: string; // Board owner ID for clear chat permission
}

export function ChatDrawer({ boardId, isOpen, onClose, members = [], boardTitle = '', initialHighlightMessageId = null, canChat = true, ownerId }: ChatDrawerProps) {
    const { user } = useStore();
    const { t, language } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string; type: string }[]>([]);

    // Search state
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Message[]>([]);

    // Edit message state
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editContent, setEditContent] = useState('');

    // Typing state
    const [typers, setTypers] = useState<string[]>([]);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Mention autocomplete state
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const touchStartX = useRef(0);
    const touchCurrentX = useRef(0);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Audio playback state
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // New messages indicator (when user is scrolled up)
    const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
    const [newMessagesCount, setNewMessagesCount] = useState(0);

    // Clear chat state
    const [isClearingChat, setIsClearingChat] = useState(false);

    // Section autocomplete state
    const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
    const [showSectionMentions, setShowSectionMentions] = useState(false);
    const [sectionQuery, setSectionQuery] = useState('');
    const [sectionStartIndex, setSectionStartIndex] = useState(-1);

    // Chat position state
    const [chatPosition, setChatPosition] = useState<'left' | 'right'>('right');
    const [showSettings, setShowSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Load chat position from localStorage
    useEffect(() => {
        const savedPosition = localStorage.getItem('chat-position');
        if (savedPosition === 'left' || savedPosition === 'right') {
            setChatPosition(savedPosition);
        }
    }, []);

    // Toggle chat position
    const toggleChatPosition = () => {
        const newPosition = chatPosition === 'right' ? 'left' : 'right';
        setChatPosition(newPosition);
        localStorage.setItem('chat-position', newPosition);
        setShowSettings(false);
    };

    // Close settings dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial load and subscription for sections
    useEffect(() => {
        if (!boardId) return;
        const unsub = subscribeToBoardSections(boardId, (data) => {
            setSections(data.map(s => ({ id: s.id, title: s.title })));
        });
        return () => unsub();
    }, [boardId]);

    const filteredSpecialMentions = useMemo(() => {
        if (!mentionQuery) return [];
        const query = mentionQuery.toLowerCase();
        const specials = [
            { uid: 'everyone', displayName: 'everyone', label: language === 'tr' ? 'Herkese Bildir' : 'Notify Everyone', role: 'special' },
            { uid: 'student', displayName: 'student', label: language === 'tr' ? 'Öğrencilere Bildir' : 'Notify Students', role: 'special' },
            { uid: 'teacher', displayName: 'teacher', label: language === 'tr' ? 'Öğretmenlere Bildir' : 'Notify Teachers', role: 'special' }
        ];
        return specials.filter(s => s.displayName.toLowerCase().includes(query));
    }, [mentionQuery, language]);

    const mentionSuggestions = useMemo(() => {
        if (!mentionQuery) return members.slice(0, 5); // Default show 5
        const query = mentionQuery.toLowerCase();
        return members.filter(member =>
            member.displayName.toLowerCase().includes(query)
        );
    }, [members, mentionQuery]);

    const filteredSections = useMemo(() => {
        if (!sectionQuery) return sections;
        const query = sectionQuery.toLowerCase();
        return sections.filter(section =>
            section.title.toLowerCase().includes(query)
        );
    }, [sections, sectionQuery]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const selectionStart = e.target.selectionStart;

        // Check for mentions (@)
        const lastAt = value.lastIndexOf('@', selectionStart - 1);
        if (lastAt !== -1 && lastAt >= selectionStart - 20) { // Look back 20 chars max
            const query = value.slice(lastAt + 1, selectionStart);
            if (!query.includes(' ')) {
                setMentionStartIndex(lastAt);
                setMentionQuery(query);
                setShowMentions(true);
                setShowSectionMentions(false); // Close other dropdown
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }

        // Check for sections (#)
        const lastHash = value.lastIndexOf('#', selectionStart - 1);
        if (lastHash !== -1 && lastHash >= selectionStart - 20) {
            const query = value.slice(lastHash + 1, selectionStart);
            // Allow spaces in section query but limit length to avoid false positives
            if (query.length < 30) {
                setSectionStartIndex(lastHash);
                setSectionQuery(query);
                setShowSectionMentions(true);
                setShowMentions(false); // Close other dropdown
            } else {
                setShowSectionMentions(false);
            }
        } else {
            setShowSectionMentions(false);
        }

        if (editingMessage) {
            setEditContent(value);
        } else {
            setNewMessage(value);

            // Handle typing status
            if (!typingTimeoutRef.current && user) {
                setTypingStatus(boardId, user.uid, user.displayName, true);
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (user) {
                    setTypingStatus(boardId, user.uid, user.displayName, false);
                    typingTimeoutRef.current = null;
                }
            }, 2000);
        }
    };

    const handleSelectMention = (member: User | { uid: string, displayName: string }) => {
        if (mentionStartIndex === -1) return;

        const textToUse = editingMessage ? editContent : newMessage;
        const before = textToUse.slice(0, mentionStartIndex);
        const after = textToUse.slice(inputRef.current?.selectionStart || textToUse.length);
        const newValue = `${before}@${member.displayName} ${after}`;

        if (editingMessage) {
            setEditContent(newValue);
        } else {
            setNewMessage(newValue);
        }
        setShowMentions(false);

        // Reset focus
        setTimeout(() => {
            if (inputRef.current) {
                const newCursorPos = mentionStartIndex + member.displayName.length + 2; // @ + space
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleSelectSection = (sectionTitle: string) => {
        if (sectionStartIndex === -1) return;

        const textToUse = editingMessage ? editContent : newMessage;
        const before = textToUse.slice(0, sectionStartIndex);
        const after = textToUse.slice(inputRef.current?.selectionStart || textToUse.length);
        // Replace spaces with hyphens is common, or keep original title?
        // User asked for tagging system. Let's keep original title but prefixed with #
        const newValue = `${before}#${sectionTitle} ${after}`;

        if (editingMessage) {
            setEditContent(newValue);
        } else {
            setNewMessage(newValue);
        }
        setShowSectionMentions(false);

        // Reset focus
        setTimeout(() => {
            if (inputRef.current) {
                const newCursorPos = sectionStartIndex + sectionTitle.length + 2; // # + space
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    // Helper to scroll to section
    const scrollToSection = (sectionId: string) => {
        const el = document.getElementById(`section-${sectionId}`);
        if (el) {
            // Close drawer on mobile if covering? Maybe not needed as chat is side drawer
            // Just scroll
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add highlight class momentarily
            el.classList.add('ring-4', 'ring-indigo-400', 'ring-opacity-50');
            setTimeout(() => {
                el.classList.remove('ring-4', 'ring-indigo-400', 'ring-opacity-50');
            }, 2000);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Use 50MB limit consistent with AddNoteModal
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert(language === 'tr' ? 'Dosya boyutu 50MB\'dan büyük olamaz.' : 'File size cannot exceed 50MB.');
            return;
        }

        // Allowed extensions whitelist
        const allowedExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
            'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'
        ];

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || !allowedExtensions.includes(extension)) {
            alert(language === 'tr'
                ? 'Bu dosya türü güvenlik nedeniyle desteklenmemektedir.'
                : 'This file type is not supported for security reasons.');
            return;
        }

        const preview = URL.createObjectURL(file);
        setPendingFiles(prev => [...prev, {
            file,
            preview,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
        }]);
        e.target.value = '';
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    const preview = URL.createObjectURL(file);
                    setPendingFiles(prev => [...prev, { file, preview, type: 'image' }]);
                }
            }
        }
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview);
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const linkify = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        // Special group mentions
        const specialMentionsList = ['@everyone', '@student', '@teacher'];
        const getSpecialMentionClass = (mention: string) => {
            const lower = mention.toLowerCase();
            if (lower === '@everyone') return 'text-indigo-400 font-semibold';
            if (lower === '@student') return 'text-emerald-400 font-semibold';
            if (lower === '@teacher') return 'text-amber-400 font-semibold';
            return null;
        };

        // Helper to highlight mentions using members list
        const highlightMentions = (str: string, keyPrefix: string): React.ReactNode[] => {
            let result: React.ReactNode[] = [];
            let remaining = str;
            let idx = 0;

            // Build list of all mentions to search for
            const allMentions = [
                ...specialMentionsList.map(s => ({ tag: s, isSpecial: true })),
                ...members.filter(m => m.displayName).map(m => ({ tag: `@${m.displayName}`, isSpecial: false }))
            ];

            while (remaining.length > 0) {
                let earliestMatch: { index: number; tag: string; isSpecial: boolean } | null = null;

                for (const mention of allMentions) {
                    const foundIdx = remaining.toLowerCase().indexOf(mention.tag.toLowerCase());
                    if (foundIdx !== -1 && (earliestMatch === null || foundIdx < earliestMatch.index)) {
                        earliestMatch = {
                            index: foundIdx,
                            tag: remaining.substring(foundIdx, foundIdx + mention.tag.length),
                            isSpecial: mention.isSpecial
                        };
                    }
                }

                if (earliestMatch) {
                    if (earliestMatch.index > 0) {
                        result.push(<span key={`${keyPrefix}-t-${idx++}`}>{remaining.substring(0, earliestMatch.index)}</span>);
                    }

                    const specialClass = getSpecialMentionClass(earliestMatch.tag);
                    const mentionClass = specialClass || "text-blue-400 underline decoration-blue-400/50 font-medium";

                    result.push(
                        <span key={`${keyPrefix}-m-${idx++}`} className={mentionClass}>
                            {earliestMatch.tag}
                        </span>
                    );
                    remaining = remaining.substring(earliestMatch.index + earliestMatch.tag.length);
                } else {
                    result.push(<span key={`${keyPrefix}-r-${idx++}`}>{remaining}</span>);
                    break;
                }
            }
            return result;
        };

        // Helper to highlight sections (#SectionName)
        const highlightSections = (str: string, keyPrefix: string): React.ReactNode[] => {
            let result: React.ReactNode[] = [];
            let remaining = str;
            let idx = 0;

            // Create matchers for all sections
            const allSections = sections.map(s => ({
                tag: `#${s.title}`,
                id: s.id
            })).sort((a, b) => b.tag.length - a.tag.length);

            while (remaining.length > 0) {
                let earliestMatch: { index: number; tag: string; id: string } | null = null;

                for (const section of allSections) {
                    const foundIdx = remaining.toLowerCase().indexOf(section.tag.toLowerCase());
                    if (foundIdx !== -1 && (earliestMatch === null || foundIdx < earliestMatch.index)) {
                        earliestMatch = {
                            index: foundIdx,
                            tag: remaining.substring(foundIdx, foundIdx + section.tag.length),
                            id: section.id
                        };
                    }
                }

                if (earliestMatch) {
                    if (earliestMatch.index > 0) {
                        const preText = remaining.substring(0, earliestMatch.index);
                        result.push(...highlightMentions(preText, `${keyPrefix}-pre-${idx}`));
                    }

                    result.push(
                        <button
                            key={`${keyPrefix}-s-${idx++}`}
                            onClick={(e) => { e.stopPropagation(); scrollToSection(earliestMatch!.id); }}
                            className="bg-pink-100 text-pink-600 font-bold px-1.5 py-0.5 rounded text-xs hover:bg-pink-200 transition-colors mx-0.5 inline-flex items-center gap-0.5"
                        >
                            # {earliestMatch.tag.substring(1)}
                        </button>
                    );
                    remaining = remaining.substring(earliestMatch.index + earliestMatch.tag.length);
                } else {
                    result.push(...highlightMentions(remaining, `${keyPrefix}-rem-${idx}`));
                    break;
                }
            }
            return result;
        };

        // First split by URLs
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={`url-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                        {part}
                    </a>
                );
            }
            // For non-URL parts, highlight sections first
            return highlightSections(part, `p-${i}`);
        });
    };
    // Special group mentions


    // Subscribe to typing status
    useEffect(() => {
        if (!isOpen || !user) return;
        const unsubscribe = subscribeToTypingStatus(boardId, (activeTypers) => {
            // Filter out own name
            setTypers(activeTypers.filter(name => name !== user.displayName));
        });
        return () => unsubscribe();
    }, [boardId, isOpen, user]);

    // Cleanup typing status on close
    useEffect(() => {
        if (!isOpen && user) {
            setTypingStatus(boardId, user.uid, user.displayName, false);
        }
    }, [isOpen, user, boardId]);

    // Scroll to bottom immediately when chat opens
    useEffect(() => {
        if (isOpen && !initialHighlightMessageId) {
            // Use instant scroll on open for immediate positioning
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
            }, 50);
        }
    }, [isOpen, initialHighlightMessageId]);

    // Subscribe to messages
    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToBoardMessages(boardId, (data) => {
            const wasEmpty = messages.length === 0;
            const hasNewMessage = data.length > messages.length;
            const newMessageCount = data.length - messages.length;

            // Check if user is near bottom before updating messages
            const container = messagesContainerRef.current;
            const isNearBottom = container
                ? (container.scrollHeight - container.scrollTop - container.clientHeight) < 100
                : true;

            // Check if the new message is from current user
            const lastMessage = data[data.length - 1];
            const isOwnMessage = lastMessage?.senderId === user?.uid;

            setMessages(data);

            // Only auto-scroll if:
            // 1. First load (wasEmpty)
            // 2. User is near bottom
            // 3. It's user's own message
            if (!initialHighlightMessageId && (wasEmpty || (hasNewMessage && (isNearBottom || isOwnMessage)))) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: wasEmpty ? 'instant' : 'smooth' });
                }, 100);
                // Clear badge when auto-scrolling
                setShowNewMessagesBadge(false);
                setNewMessagesCount(0);
            } else if (hasNewMessage && !isNearBottom && !isOwnMessage) {
                // Show new messages badge
                setShowNewMessagesBadge(true);
                setNewMessagesCount(prev => prev + newMessageCount);
            }
        });
        return () => unsubscribe();
    }, [boardId, isOpen, user?.uid]);

    // Handle initial highlight - only once per initialHighlightMessageId
    const hasHighlightedRef = useRef<string | null>(null);

    useEffect(() => {
        // Skip if no highlight ID, no messages, not open, or already processed this specific ID
        if (!initialHighlightMessageId || messages.length === 0 || !isOpen) return;
        if (hasHighlightedRef.current === initialHighlightMessageId) return;

        // Mark as processed
        hasHighlightedRef.current = initialHighlightMessageId;
        setHighlightedMessageId(initialHighlightMessageId);

        setTimeout(() => {
            const element = document.getElementById(`msg-${initialHighlightMessageId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);

        setTimeout(() => {
            setHighlightedMessageId(null);
        }, 3000);
    }, [initialHighlightMessageId, messages.length, isOpen]);

    // Auto-scroll
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowNewMessagesBadge(false);
        setNewMessagesCount(0);
    };

    // Scroll to specific message and highlight
    const scrollToMessage = (messageId: string) => {
        const messageElement = document.getElementById(`msg-${messageId}`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(messageId);
            setTimeout(() => setHighlightedMessageId(null), 1500);
        }
    };

    // Swipe to Reply handlers
    const handleTouchStart = useCallback((e: React.TouchEvent, msg: Message) => {
        touchStartX.current = e.touches[0].clientX;
        touchCurrentX.current = e.touches[0].clientX;
        setSwipingMessageId(msg.id);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swipingMessageId) return;
        touchCurrentX.current = e.touches[0].clientX;
        const diff = touchStartX.current - touchCurrentX.current;
        // Only allow left swipe, max 80px
        if (diff > 0) {
            setSwipeOffset(Math.min(diff, 80));
        }
    }, [swipingMessageId]);

    const handleTouchEnd = useCallback((msg: Message) => {
        if (swipeOffset > 50) {
            // Trigger reply
            handleReplyClick(msg);
        }
        setSwipeOffset(0);
        setSwipingMessageId(null);
    }, [swipeOffset]);

    // Handle Reply Click
    const handleReplyClick = (msg: Message) => {
        setReplyTo(msg);
        inputRef.current?.focus();
    };

    // Cancel Reply
    const cancelReply = () => setReplyTo(null);

    // Send Message
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || (!newMessage.trim() && pendingFiles.length === 0)) return;

        const content = newMessage.trim();
        const currentPendingFiles = [...pendingFiles];
        setNewMessage('');
        setPendingFiles([]);
        setIsLoading(true);

        // Clear typing status immediately on send
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTypingStatus(boardId, user.uid, user.displayName, false);

        try {
            let lastMessageId = '';

            // Handle pending files
            if (currentPendingFiles.length > 0) {
                for (let i = 0; i < currentPendingFiles.length; i++) {
                    const { file, type } = currentPendingFiles[i];
                    const url = await uploadToSupabase(file);

                    // Attach the message content to the FIRST media message, or send separate text if no files
                    const messageContent = i === 0 ? content : '';

                    if (type === 'image' || type === 'video') {
                        lastMessageId = await sendMediaMessage(
                            boardId,
                            user.uid,
                            user.displayName,
                            user.photoURL,
                            type as 'image' | 'video',
                            url,
                            messageContent
                        );
                    } else {
                        lastMessageId = await sendFileMessage(
                            boardId,
                            user.uid,
                            user.displayName,
                            user.photoURL,
                            url,
                            file.name,
                            file.type
                        );
                        // If there was content and this is the first file, send a separate text message for content
                        // because sendFileMessage doesn't support custom content currently
                        if (i === 0 && content) {
                            lastMessageId = await sendMessage(
                                boardId,
                                user.uid,
                                user.displayName,
                                user.photoURL,
                                content,
                                replyTo ? {
                                    replyToId: replyTo.id,
                                    replyToAuthor: replyTo.senderName,
                                    replyToContent: replyTo.content.slice(0, 100),
                                } : undefined
                            );
                        }
                    }
                }
            } else {
                // Text only message
                lastMessageId = await sendMessage(
                    boardId,
                    user.uid,
                    user.displayName,
                    user.photoURL,
                    content,
                    replyTo ? {
                        replyToId: replyTo.id,
                        replyToAuthor: replyTo.senderName,
                        replyToContent: replyTo.content.slice(0, 100),
                    } : undefined
                );
            }

            const finalMessageId = lastMessageId;

            // Send notification if replying to someone
            if (replyTo && replyTo.senderId !== user.uid) {
                await createNotification({
                    userId: replyTo.senderId,
                    type: 'comment_reply',
                    title: 'Mesajına yanıt geldi',
                    message: `${user.displayName}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                    fromUserId: user.uid,
                    fromUserName: user.displayName,
                    boardId: boardId,
                    messageId: finalMessageId, // Link to the new reply
                });
            }

            // Check for @mentions and send notifications
            if (members.length > 0) {
                // Handle special group mentions
                const lowerContent = content.toLowerCase();

                if (lowerContent.includes('@everyone')) {
                    // Notify everyone except sender
                    for (const member of members) {
                        if (member.uid !== user.uid) {
                            await createNotification({
                                userId: member.uid,
                                type: 'mention',
                                title: '@everyone ile etiketlendiniz',
                                message: `${user.displayName}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                                fromUserId: user.uid,
                                fromUserName: user.displayName,
                                boardId: boardId,
                                boardTitle: boardTitle,
                                messageId: finalMessageId,
                            });
                        }
                    }
                } else if (lowerContent.includes('@student')) {
                    // Notify only students
                    for (const member of members) {
                        if (member.uid !== user.uid && member.role === 'student') {
                            await createNotification({
                                userId: member.uid,
                                type: 'mention',
                                title: '@student ile etiketlendiniz',
                                message: `${user.displayName}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                                fromUserId: user.uid,
                                fromUserName: user.displayName,
                                boardId: boardId,
                                boardTitle: boardTitle,
                                messageId: finalMessageId,
                            });
                        }
                    }
                } else if (lowerContent.includes('@teacher')) {
                    // Notify only teachers
                    for (const member of members) {
                        if (member.uid !== user.uid && (member.role === 'teacher' || member.role === 'admin')) {
                            await createNotification({
                                userId: member.uid,
                                type: 'mention',
                                title: '@teacher ile etiketlendiniz',
                                message: `${user.displayName}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                                fromUserId: user.uid,
                                fromUserName: user.displayName,
                                boardId: boardId,
                                boardTitle: boardTitle,
                                messageId: finalMessageId,
                            });
                        }
                    }
                } else {
                    // Regular individual mentions
                    await createMentionNotifications(
                        content,
                        members,
                        user.uid,
                        user.displayName,
                        boardId,
                        boardTitle,
                        undefined, // noteId
                        undefined, // commentId
                        finalMessageId // Pass messageId for highlighting
                    );
                }
            }

            // If the user is a teacher or admin, notify all board members
            if ((user.role === 'teacher' || user.role === 'admin') && members.length > 0) {
                await notifyTeacherMessage(
                    finalMessageId,
                    boardId,
                    boardTitle,
                    user.uid,
                    user.displayName,
                    members.map(m => m.uid)
                );
            }

            setReplyTo(null);
        } catch (error) {
            console.error('Mesaj gönderilemedi:', error);
            alert(language === 'tr' ? 'Mesaj gönderilirken hata oluştu.' : 'Failed to send message.');
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };

    // Start recording
    const startRecording = async () => {
        try {
            startTimeRef.current = Date.now();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Try supported mime types
            let options = {};
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options = { mimeType: 'audio/webm;codecs=opus' };
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                options = { mimeType: 'audio/webm' };
            } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                options = { mimeType: 'audio/ogg;codecs=opus' };
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const endTime = Date.now();
                const duration = Math.max(1, Math.round((endTime - startTimeRef.current) / 1000));
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                await uploadAndSendAudio(audioBlob, duration);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Update recording time for UI
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Mikrofon erişimi reddedildi:', error);
            alert(language === 'tr' ? 'Mikrofon erişimi gerekli' : 'Microphone access required');
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }
    };

    // Upload audio to Supabase and send message
    const uploadAndSendAudio = async (audioBlob: Blob, duration: number) => {
        if (!user) return;
        setIsUploadingAudio(true);

        try {
            // Convert Blob to File for uploadToSupabase consistency
            const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });

            // Use Supabase instead of Cloudinary
            const url = await uploadToSupabase(audioFile);

            await sendAudioMessage(
                boardId,
                user.uid,
                user.displayName,
                user.photoURL,
                url,
                duration
            );

            scrollToBottom();
        } catch (error) {
            console.error('Ses yüklenemedi:', error);
            alert(language === 'tr' ? 'Ses kaydı gönderilemedi.' : 'Failed to send voice message.');
        } finally {
            setIsUploadingAudio(false);
            setRecordingTime(0);
        }
    };

    // Format recording time
    const formatAudioDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Play/Pause audio
    const toggleAudio = (messageId: string, audioUrl: string) => {
        if (playingAudioId === messageId) {
            audioRef.current?.pause();
            setPlayingAudioId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(audioUrl);
            audio.onended = () => setPlayingAudioId(null);
            audio.play();
            audioRef.current = audio;
            setPlayingAudioId(messageId);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
        try {
            await deleteMessage(messageId);
        } catch (error) {
            console.error('Mesaj silinemedi:', error);
        }
    };

    // Clear all chat messages (board owner only)
    const handleClearChat = async () => {
        const canClear = user?.uid === ownerId || user?.role === 'teacher' || user?.role === 'admin';
        if (!user || !canClear) return;

        const confirmText = language === 'tr'
            ? 'Tüm sohbet mesajlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
            : 'Are you sure you want to delete all chat messages? This cannot be undone.';

        if (!confirm(confirmText)) return;

        setIsClearingChat(true);
        try {
            const result = await clearAllMessages(boardId);
            console.log(`${result.deleted} mesaj silindi.`);
        } catch (error) {
            console.error('Sohbet temizlenemedi:', error);
            alert(language === 'tr' ? 'Sohbet temizlenirken bir hata oluştu.' : 'Failed to clear chat.');
        } finally {
            setIsClearingChat(false);
        }
    };

    const handlePinMessage = async (msg: Message) => {
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return;
        try {
            if (msg.isPinned) {
                await unpinMessage(msg.id);
            } else {
                await pinMessage(msg.id, user.uid);
            }
        } catch (error) {
            console.error('Pin hatası:', error);
        }
    };

    // Get pinned messages
    const pinnedMessages = useMemo(() => {
        return messages.filter(m => m.isPinned).sort((a, b) => {
            const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [messages]);

    // Search functionality
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const results = messages.filter(m =>
            m.content.toLowerCase().includes(lowerQuery) ||
            m.senderName.toLowerCase().includes(lowerQuery)
        );
        setSearchResults(results);
    }, [messages]);

    const handleSearchResultClick = useCallback((messageId: string) => {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        scrollToMessage(messageId);
    }, []);

    // Edit message functionality
    const handleEditMessage = useCallback((msg: Message) => {
        setEditingMessage(msg);
        setEditContent(msg.content);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingMessage(null);
        setEditContent('');
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingMessage || !editContent.trim()) return;
        try {
            await updateMessage(editingMessage.id, editContent.trim());
            setEditingMessage(null);
            setEditContent('');
        } catch (error) {
            console.error('Mesaj düzenleme hatası:', error);
        }
    }, [editingMessage, editContent]);

    // Focus search input when opened
    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showSearch]);

    // Handle input blur (stop typing)
    const handleInputBlur = () => {
        if (user) {
            setTypingStatus(boardId, user.uid, user.displayName, false);
        }
    };



    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (replyTo) {
                    cancelReply();
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, replyTo]);

    // Format Helpers
    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const getDayLabel = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (isSameDay(date, today)) return 'Bugün';
        if (isSameDay(date, yesterday)) return 'Dün';
        return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(date);
    };

    // Message Grouping
    const groupedMessages: { label?: string; msgs: Message[] }[] = [];
    let lastDate: Date | null = null;
    let currentGroup: { label?: string; msgs: Message[] } | null = null;

    messages.forEach((msg) => {
        const msgDate = msg.createdAt;
        if (!lastDate || !isSameDay(lastDate, msgDate)) {
            if (currentGroup) groupedMessages.push(currentGroup);
            currentGroup = {
                label: getDayLabel(msgDate),
                msgs: [msg]
            };
        } else if (currentGroup) {
            currentGroup.msgs.push(msg);
        }
        lastDate = msgDate;
    });
    if (currentGroup) groupedMessages.push(currentGroup);


    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90] transition-opacity"
                    onClick={onClose}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
                />
            )}

            {/* Chat Drawer */}
            <div
                className={cn(
                    "fixed top-0 h-full w-full max-w-sm sm:max-w-md bg-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out flex flex-col font-sans pb-safe pt-safe",
                    chatPosition === 'left' ? "left-0" : "right-0",
                    isOpen
                        ? 'translate-x-0'
                        : chatPosition === 'left'
                            ? '-translate-x-full invisible'
                            : 'translate-x-full invisible'
                )}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
                {/* Header */}
                <div className="p-4 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <MessageCircle size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-800">{t('chat.boardChat')}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                showSearch
                                    ? "bg-indigo-100 text-indigo-600"
                                    : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                            )}
                        >
                            <Search size={18} />
                        </button>

                        {/* Settings Dropdown */}
                        <div className="relative" ref={settingsRef}>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={cn(
                                    "p-2 rounded-full transition-colors",
                                    showSettings
                                        ? "bg-stone-100 text-stone-600"
                                        : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                                )}
                            >
                                <Settings size={18} />
                            </button>

                            {showSettings && (
                                <div className={cn(
                                    "absolute top-full mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150",
                                    chatPosition === 'left' ? "left-0" : "right-0"
                                )}>
                                    <button
                                        onClick={toggleChatPosition}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                                    >
                                        <ArrowLeftRight size={16} className="text-stone-400" />
                                        <span>{chatPosition === 'right' ? (language === 'tr' ? 'Sola Taşı' : 'Move to Left') : (language === 'tr' ? 'Sağa Taşı' : 'Move to Right')}</span>
                                    </button>

                                    {/* Clear Chat Button - Board Owner or Teacher/Admin Only */}
                                    {(user?.uid === ownerId || user?.role === 'teacher' || user?.role === 'admin') && messages.length > 0 && (
                                        <>
                                            <div className="h-px bg-stone-100 my-1 mx-2" />
                                            <button
                                                onClick={() => {
                                                    handleClearChat();
                                                    setShowSettings(false);
                                                }}
                                                disabled={isClearingChat}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                            >
                                                {isClearingChat ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                                <span>{language === 'tr' ? 'Sohbeti Temizle' : 'Clear Chat'}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Search Panel */}
                {showSearch && (
                    <div className="border-b border-stone-200 bg-stone-50 p-3 animate-in slide-in-from-top duration-200">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder={language === 'tr' ? 'Mesajlarda ara...' : 'Search messages...'}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                <p className="text-xs text-stone-500 mb-1">
                                    {searchResults.length} {language === 'tr' ? 'sonuç bulundu' : 'results found'}
                                </p>
                                {searchResults.map(msg => (
                                    <button
                                        key={msg.id}
                                        onClick={() => handleSearchResultClick(msg.id)}
                                        className="w-full text-left p-2 bg-white rounded-lg border border-stone-100 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-stone-700">{msg.senderName}</span>
                                            <span className="text-[10px] text-stone-400">{formatTime(msg.createdAt)}</span>
                                        </div>
                                        <p className="text-xs text-stone-600 line-clamp-2">{msg.content}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                        {searchQuery && searchResults.length === 0 && (
                            <p className="text-xs text-stone-400 mt-2 text-center">
                                {language === 'tr' ? 'Sonuç bulunamadı' : 'No results found'}
                            </p>
                        )}
                    </div>
                )}

                {/* Pinned Messages Section */}
                {pinnedMessages.length > 0 && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Pin size={14} className="text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700">
                                {language === 'tr' ? 'Sabitlenmiş Mesajlar' : 'Pinned Messages'} ({pinnedMessages.length})
                            </span>
                        </div>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                            {pinnedMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors group/pinned"
                                    onClick={() => scrollToMessage(msg.id)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-amber-800 truncate">{msg.senderName}</p>
                                        <p className="text-xs text-stone-600 truncate">
                                            {msg.type === 'audio' ? '🎤 Ses mesajı' : msg.content}
                                        </p>
                                    </div>
                                    {(user?.role === 'teacher' || user?.role === 'admin') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePinMessage(msg); }}
                                            className="p-1 text-amber-600 hover:text-red-500 opacity-0 group-hover/pinned:opacity-100 transition-opacity"
                                            title={language === 'tr' ? 'Sabitlemeyi kaldır' : 'Unpin'}
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages Area */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-stone-50 custom-scrollbar">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-stone-400 opacity-60">
                            <MessageCircle size={48} className="mb-2" />
                            <p>{t('chat.noMessages')}</p>
                        </div>
                    ) : (
                        groupedMessages.map((group, groupIdx) => (
                            <div key={groupIdx} className="space-y-4">
                                {/* Date Separator */}
                                <div className="flex justify-center sticky top-2 z-0">
                                    <span className="bg-stone-200/80 backdrop-blur-sm text-stone-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-white/50">
                                        {group.label}
                                    </span>
                                </div>

                                {/* Messages in Group */}
                                {group.msgs.map((msg, i) => {
                                    const isMe = user?.uid === msg.senderId;
                                    const isSequence = i > 0 && group.msgs[i - 1].senderId === msg.senderId;
                                    const isHighlighted = highlightedMessageId === msg.id;
                                    const isSwiping = swipingMessageId === msg.id;

                                    return (
                                        <div
                                            key={msg.id}
                                            id={`msg-${msg.id}`}
                                            className={cn(
                                                "flex w-full group/msg animate-in fade-in slide-in-from-bottom-2 duration-300 relative overflow-hidden",
                                                isMe ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            {/* Swipe Reply Indicator - Fixed on right */}
                                            <div
                                                className={cn(
                                                    "absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full text-white transition-all",
                                                    isSwiping && swipeOffset > 30 ? "opacity-100 scale-100" : "opacity-0 scale-75"
                                                )}
                                            >
                                                <Reply size={16} />
                                            </div>

                                            {/* Message Content - This moves on swipe */}
                                            <div
                                                className={cn(
                                                    "flex max-w-[80%] md:max-w-[75%] gap-2",
                                                    isMe ? "flex-row-reverse" : "flex-row"
                                                )}
                                                onTouchStart={(e) => handleTouchStart(e, msg)}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={() => handleTouchEnd(msg)}
                                                style={{
                                                    transform: isSwiping ? `translateX(-${swipeOffset}px)` : 'translateX(0)',
                                                    transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
                                                }}
                                            >
                                                {/* Avatar */}
                                                {!isMe && !isSequence ? (
                                                    <div className="shrink-0">
                                                        <Avatar
                                                            src={msg.senderPhoto}
                                                            name={msg.senderName}
                                                            size="sm"
                                                        />
                                                    </div>
                                                ) : !isMe ? (
                                                    <div className="w-8 shrink-0" />
                                                ) : null}

                                                {/* Bubble */}
                                                <div className={cn(
                                                    "flex flex-col relative",
                                                    isMe ? "items-end" : "items-start"
                                                )}>
                                                    {!isSequence && !isMe && (
                                                        <span className="text-[10px] text-stone-500 ml-1 mb-1 font-medium">
                                                            {msg.senderName}
                                                        </span>
                                                    )}

                                                    <div className={cn(
                                                        "px-3 py-2 shadow-sm relative text-sm leading-relaxed min-w-[80px] transition-all duration-500",
                                                        isMe
                                                            ? "text-white rounded-2xl rounded-tr-none"
                                                            : "text-stone-800 border rounded-2xl rounded-tl-none",
                                                        isHighlighted
                                                            ? "bg-sky-400 border-sky-300"
                                                            : isMe
                                                                ? "bg-indigo-600 hover:bg-indigo-700"
                                                                : "bg-white border-stone-200 hover:border-stone-300"
                                                    )}>
                                                        {/* Replied Message Preview - Inside Bubble (WhatsApp Style) */}
                                                        {msg.replyToContent && msg.replyToId && (
                                                            <div
                                                                onClick={(e) => { e.stopPropagation(); scrollToMessage(msg.replyToId!); }}
                                                                className={cn(
                                                                    "mb-2 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] border-l-2 max-w-[220px] overflow-hidden",
                                                                    isMe
                                                                        ? "bg-indigo-500/30 border-l-white/50 hover:bg-indigo-500/40"
                                                                        : "bg-stone-100 border-l-indigo-400 hover:bg-stone-200"
                                                                )}
                                                            >
                                                                <div className={cn("font-semibold text-[10px] mb-0.5 truncate", isMe ? "text-indigo-200" : "text-indigo-600")}>
                                                                    {msg.replyToAuthor}
                                                                </div>
                                                                <div className={cn("truncate", isMe ? "text-indigo-100/80" : "text-stone-500")}>
                                                                    {msg.replyToContent}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Message Content */}
                                                        {msg.type === 'audio' && msg.audioUrl ? (
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => toggleAudio(msg.id, msg.audioUrl!)}
                                                                    className={cn(
                                                                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                                        isMe
                                                                            ? "bg-white/20 hover:bg-white/30"
                                                                            : "bg-indigo-100 hover:bg-indigo-200"
                                                                    )}
                                                                >
                                                                    {playingAudioId === msg.id ? (
                                                                        <Pause size={18} className={isMe ? "text-white" : "text-indigo-600"} />
                                                                    ) : (
                                                                        <Play size={18} className={isMe ? "text-white" : "text-indigo-600"} />
                                                                    )}
                                                                </button>
                                                                <div className="flex-1">
                                                                    <div className={cn(
                                                                        "h-1 rounded-full w-24 sm:w-32",
                                                                        isMe ? "bg-white/30" : "bg-stone-200"
                                                                    )}>
                                                                        <div
                                                                            className={cn(
                                                                                "h-full rounded-full transition-all",
                                                                                isMe ? "bg-white" : "bg-indigo-500",
                                                                                playingAudioId === msg.id ? "animate-pulse" : ""
                                                                            )}
                                                                            style={{ width: playingAudioId === msg.id ? '100%' : '0%' }}
                                                                        />
                                                                    </div>
                                                                    <span className={cn(
                                                                        "text-[10px] mt-1 block",
                                                                        isMe ? "text-indigo-100" : "text-stone-400"
                                                                    )}>
                                                                        {msg.audioDuration ? formatAudioDuration(msg.audioDuration) : '0:00'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : msg.type === 'image' && msg.imageUrl ? (
                                                            <div className="space-y-1">
                                                                <div className="rounded-lg overflow-hidden border border-white/20 cursor-pointer w-full max-w-[240px]" onClick={() => window.open(msg.imageUrl, '_blank')}>
                                                                    <img
                                                                        src={msg.imageUrl}
                                                                        alt="Chat attachment"
                                                                        className="w-full h-auto object-cover max-h-[200px]"
                                                                        loading="lazy"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                </div>
                                                                {msg.content && <p className="break-words whitespace-pre-wrap mt-1 text-sm">{linkify(msg.content)}</p>}
                                                            </div>
                                                        ) : msg.type === 'video' && msg.videoUrl ? (
                                                            <div className="space-y-1">
                                                                <div className="rounded-lg overflow-hidden border border-white/20 w-full max-w-[280px]">
                                                                    <video src={msg.videoUrl} controls className="w-full max-h-[200px] bg-black" />
                                                                </div>
                                                                {msg.content && <p className="break-words whitespace-pre-wrap mt-1 text-sm">{linkify(msg.content)}</p>}
                                                            </div>
                                                        ) : msg.type === 'file' && msg.fileUrl ? (
                                                            <div className="space-y-2 py-1">
                                                                {/* Audio player for MP3 files */}
                                                                {(msg.fileName?.toLowerCase().endsWith('.mp3') || msg.fileUrl.toLowerCase().split('?')[0].endsWith('.mp3')) ? (
                                                                    <div className={cn(
                                                                        "flex items-center gap-3 p-3 rounded-xl border mb-2",
                                                                        isMe ? "bg-white/10 border-white/20" : "bg-stone-50 border-stone-200"
                                                                    )}>
                                                                        <button
                                                                            onClick={() => toggleAudio(msg.id, msg.fileUrl!)}
                                                                            className={cn(
                                                                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0",
                                                                                isMe
                                                                                    ? "bg-white/20 hover:bg-white/30"
                                                                                    : "bg-indigo-100 hover:bg-indigo-200"
                                                                            )}
                                                                        >
                                                                            {playingAudioId === msg.id ? (
                                                                                <Pause size={18} className={isMe ? "text-white" : "text-indigo-600"} />
                                                                            ) : (
                                                                                <Play size={18} className={isMe ? "text-white" : "text-indigo-600"} />
                                                                            )}
                                                                        </button>
                                                                        <div className="flex-1 min-w-0 pr-1">
                                                                            <p className={cn("text-xs font-bold truncate mb-1", isMe ? "text-white" : "text-stone-800")}>
                                                                                {msg.fileName || 'Audio File'}
                                                                            </p>
                                                                            <div className={cn(
                                                                                "h-1 rounded-full w-full",
                                                                                isMe ? "bg-white/30" : "bg-stone-200"
                                                                            )}>
                                                                                <div
                                                                                    className={cn(
                                                                                        "h-full rounded-full transition-all",
                                                                                        isMe ? "bg-white" : "bg-indigo-500",
                                                                                        playingAudioId === msg.id ? "animate-pulse" : ""
                                                                                    )}
                                                                                    style={{ width: playingAudioId === msg.id ? '100%' : '0%' }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : null}

                                                                <a
                                                                    href={msg.fileUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={cn(
                                                                        "flex items-center gap-3 p-2.5 rounded-xl border transition-all active:scale-[0.98]",
                                                                        isMe
                                                                            ? "bg-white/10 border-white/20 hover:bg-white/20"
                                                                            : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                                                        isMe ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
                                                                    )}>
                                                                        <FileText size={20} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 pr-2">
                                                                        <p className={cn("text-xs font-bold truncate max-w-[160px] sm:max-w-[200px]", isMe ? "text-white" : "text-stone-800")}>
                                                                            {msg.fileName || 'Document'}
                                                                        </p>
                                                                        <p className={cn("text-[10px] uppercase opacity-60", isMe ? "text-white" : "text-stone-500")}>
                                                                            {msg.fileName?.split('.').pop() || 'FILE'}
                                                                        </p>
                                                                    </div>
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div className="break-words whitespace-pre-wrap">{linkify(msg.content)}</div>
                                                        )}

                                                        {/* Time and Actions Row */}
                                                        <div className={cn(
                                                            "flex items-center gap-2 mt-1",
                                                            isMe ? "justify-end" : "justify-start"
                                                        )}>
                                                            {/* Reply Button - Always visible but subtle */}
                                                            <button
                                                                onClick={() => handleReplyClick(msg)}
                                                                className={cn(
                                                                    "text-[10px] flex items-center gap-0.5 transition-colors",
                                                                    isMe
                                                                        ? "text-indigo-200/60 hover:text-white"
                                                                        : "text-stone-400 hover:text-indigo-600"
                                                                )}
                                                            >
                                                                <Reply size={10} />
                                                                <span>Yanıtla</span>
                                                            </button>

                                                            {/* Edit Button - Only for own text messages */}
                                                            {user?.uid === msg.senderId && msg.type === 'text' && (
                                                                <button
                                                                    onClick={() => handleEditMessage(msg)}
                                                                    className={cn(
                                                                        "text-[10px] transition-colors flex items-center gap-0.5",
                                                                        isMe
                                                                            ? "text-indigo-200/60 hover:text-white"
                                                                            : "text-stone-400 hover:text-indigo-600"
                                                                    )}
                                                                    title={language === 'tr' ? 'Düzenle' : 'Edit'}
                                                                >
                                                                    <Edit2 size={10} />
                                                                </button>
                                                            )}

                                                            {/* Delete Button */}
                                                            {(user?.uid === msg.senderId || user?.role === 'teacher' || user?.role === 'admin') && (
                                                                <button
                                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                                    className={cn(
                                                                        "text-[10px] transition-colors",
                                                                        isMe
                                                                            ? "text-indigo-200/60 hover:text-red-300"
                                                                            : "text-stone-400 hover:text-red-500"
                                                                    )}
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            )}

                                                            {/* Pin Button - Teachers only */}
                                                            {(user?.role === 'teacher' || user?.role === 'admin') && (
                                                                <button
                                                                    onClick={() => handlePinMessage(msg)}
                                                                    className={cn(
                                                                        "text-[10px] transition-colors flex items-center gap-0.5",
                                                                        msg.isPinned
                                                                            ? "text-amber-500"
                                                                            : isMe
                                                                                ? "text-indigo-200/60 hover:text-amber-300"
                                                                                : "text-stone-400 hover:text-amber-500"
                                                                    )}
                                                                    title={msg.isPinned
                                                                        ? (language === 'tr' ? 'Sabitlemeyi kaldır' : 'Unpin')
                                                                        : (language === 'tr' ? 'Sabitle' : 'Pin')}
                                                                >
                                                                    <Pin size={10} fill={msg.isPinned ? 'currentColor' : 'none'} />
                                                                </button>
                                                            )}

                                                            {/* Edited indicator */}
                                                            {msg.isEdited && (
                                                                <span className={cn(
                                                                    "text-[9px] italic",
                                                                    isMe ? "text-indigo-200/50" : "text-stone-400/70"
                                                                )}>
                                                                    {language === 'tr' ? 'düzenlendi' : 'edited'}
                                                                </span>
                                                            )}

                                                            {/* Time */}
                                                            <span className={cn(
                                                                "text-[9px] opacity-70",
                                                                isMe ? "text-indigo-100" : "text-stone-400"
                                                            )}>
                                                                {formatTime(msg.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* New Messages Badge */}
                {showNewMessagesBadge && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all animate-in slide-in-from-bottom duration-300"
                    >
                        <ArrowDown size={16} />
                        <span className="text-sm font-medium">
                            {newMessagesCount > 0
                                ? (language === 'tr'
                                    ? `${newMessagesCount} Yeni Mesaj`
                                    : `${newMessagesCount} New Message${newMessagesCount > 1 ? 's' : ''}`)
                                : (language === 'tr' ? 'Yeni Mesajlar' : 'New Messages')
                            }
                        </span>
                    </button>
                )}

                {/* Footer Input */}
                <div className="p-4 bg-white border-t border-stone-200 z-10">
                    {user && canChat ? (
                        <div>
                            {/* Edit Message Preview */}
                            {editingMessage && (
                                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center gap-2 text-xs text-amber-700 min-w-0">
                                        <Edit2 size={14} className="shrink-0" />
                                        <span className="font-semibold shrink-0">
                                            {language === 'tr' ? 'Mesajı düzenle' : 'Edit message'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={handleCancelEdit}
                                            className="p-1 text-amber-400 hover:text-amber-600 shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Reply Preview */}
                            {replyTo && !editingMessage && (
                                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-2 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center gap-2 text-xs text-indigo-700 min-w-0">
                                        <CornerUpLeft size={14} className="shrink-0" />
                                        <span className="font-semibold shrink-0">{replyTo.senderName}</span>
                                        <span className="truncate text-indigo-500">{replyTo.content}</span>
                                    </div>
                                    <button onClick={cancelReply} className="p-1 text-indigo-400 hover:text-indigo-600 shrink-0">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            {/* Pending Files Preview */}
                            {pendingFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-3 bg-stone-50 border border-stone-100 rounded-xl mb-2 animate-in slide-in-from-bottom-2 duration-200">
                                    {pendingFiles.map((pf, idx) => (
                                        <div key={idx} className="relative group/pending w-16 h-16 sm:w-20 sm:h-20">
                                            {pf.type === 'image' ? (
                                                <img
                                                    src={pf.preview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover rounded-lg border border-stone-200"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-stone-100 rounded-lg flex flex-col items-center justify-center border border-stone-200 gap-1">
                                                    <FileText size={20} className="text-stone-400" />
                                                    <span className="text-[8px] text-stone-500 uppercase font-bold truncate px-1 max-w-full">
                                                        {pf.file.name.split('.').pop()}
                                                    </span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removePendingFile(idx)}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/pending:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <form onSubmit={handleSend} className="relative flex items-center gap-2 p-1">
                                {typers.length > 0 && (
                                    <div className="absolute bottom-full left-0 w-full px-4 pb-2 z-20 pointer-events-none">
                                        <div className="bg-white/95 backdrop-blur-sm border border-stone-200 shadow-md rounded-full py-2 px-4 inline-flex items-center gap-2.5 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                            <div className="flex gap-1 items-end h-4">
                                                <span className="typing-dot w-2 h-2 bg-indigo-500 rounded-full"></span>
                                                <span className="typing-dot w-2 h-2 bg-indigo-500 rounded-full"></span>
                                                <span className="typing-dot w-2 h-2 bg-indigo-500 rounded-full"></span>
                                            </div>
                                            <span className="text-xs font-medium text-stone-600">
                                                {typers.length === 1
                                                    ? (language === 'tr' ? `${typers[0]} yazıyor...` : `${typers[0]} is typing...`)
                                                    : (language === 'tr' ? `${typers.length} kişi yazıyor...` : `${typers.length} people typing...`)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 relative flex items-end gap-2">
                                    {/* Attachment Button */}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="chat-file-upload"
                                            className="hidden"
                                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                                            onChange={handleFileSelect}
                                            disabled={isUploading}
                                        />
                                        <label
                                            htmlFor="chat-file-upload"
                                            className={cn(
                                                "p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                                                isUploading
                                                    ? "bg-stone-100 text-stone-300 cursor-not-allowed"
                                                    : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
                                            )}
                                        >
                                            {isUploading ? (
                                                <Loader2 size={20} className="animate-spin" />
                                            ) : (
                                                <Paperclip size={20} />
                                            )}
                                        </label>
                                    </div>

                                    {/* Mention Autocomplete Dropdown */}
                                    {(showMentions || showSectionMentions) && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-64 overflow-y-auto">
                                            {/* Sections Autocomplete */}
                                            {showSectionMentions && filteredSections.length > 0 && (
                                                <>
                                                    <div className="p-2 border-b border-stone-100 bg-pink-50">
                                                        <span className="text-xs text-pink-600 font-bold flex items-center gap-1">
                                                            <Layout size={12} />
                                                            Bölümler
                                                        </span>
                                                    </div>
                                                    {filteredSections.map((section) => (
                                                        <button
                                                            key={section.id}
                                                            type="button"
                                                            onClick={() => handleSelectSection(section.title)}
                                                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-stone-50 transition-colors text-left"
                                                        >
                                                            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-xs ring-1 ring-stone-200">
                                                                #
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-stone-700">{section.title}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </>
                                            )}

                                            {/* Special Group Mentions */}
                                            {showMentions && filteredSpecialMentions.length > 0 && (
                                                <>
                                                    <div className="p-2 border-b border-stone-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                                                        <span className="text-xs text-indigo-600 font-semibold">Grup Etiketleri</span>
                                                    </div>
                                                    {filteredSpecialMentions.map((special) => (
                                                        <button
                                                            key={special.uid}
                                                            type="button"
                                                            onClick={() => handleSelectMention(special)}
                                                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-stone-50 transition-colors text-left"
                                                        >
                                                            <div className={cn(
                                                                "w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs",
                                                                special.uid === 'everyone' ? "bg-indigo-500" :
                                                                    special.uid === 'student' ? "bg-emerald-500" :
                                                                        "bg-amber-500"
                                                            )}>
                                                                @
                                                            </div>
                                                            <div>
                                                                <p className={cn(
                                                                    "text-sm font-semibold",
                                                                    special.uid === 'everyone' ? "text-indigo-600" :
                                                                        special.uid === 'student' ? "text-emerald-600" :
                                                                            "text-amber-600"
                                                                )}>@{special.displayName}</p>
                                                                <p className="text-xs text-stone-400">{special.label}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </>
                                            )}

                                            {/* Regular Members */}
                                            {mentionSuggestions.length > 0 && (
                                                <>
                                                    <div className="p-2 border-b border-stone-100 bg-stone-50">
                                                        <span className="text-xs text-stone-500 font-medium">Üyeler</span>
                                                    </div>
                                                    {mentionSuggestions.map((member) => (
                                                        <button
                                                            key={member.uid}
                                                            type="button"
                                                            onClick={() => handleSelectMention(member)}
                                                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 transition-colors text-left"
                                                        >
                                                            <Avatar
                                                                src={member.photoURL}
                                                                name={member.displayName}
                                                                size="sm"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-medium text-stone-700">{member.displayName}</p>
                                                                <p className="text-xs text-stone-400">
                                                                    {member.role === 'admin'
                                                                        ? (language === 'tr' ? 'Sistem Yetkilisi' : 'System Admin')
                                                                        : member.role === 'teacher'
                                                                            ? (language === 'tr' ? 'Öğretmen' : 'Teacher')
                                                                            : (language === 'tr' ? 'Üye' : 'Member')}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <textarea
                                        ref={inputRef}
                                        value={editingMessage ? editContent : newMessage}
                                        onPaste={handlePaste}
                                        onChange={(e) => {
                                            if (editingMessage) {
                                                setEditContent(e.target.value);
                                            } else {
                                                handleInputChange(e);
                                            }
                                        }}
                                        onBlur={editingMessage ? undefined : handleInputBlur}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                                                e.preventDefault();
                                                if (editingMessage) {
                                                    handleSaveEdit();
                                                } else {
                                                    handleSend(e);
                                                }
                                            }
                                            if (e.key === 'Escape') {
                                                if (editingMessage) {
                                                    handleCancelEdit();
                                                } else if (showMentions) {
                                                    setShowMentions(false);
                                                } else if (showSectionMentions) {
                                                    setShowSectionMentions(false);
                                                }
                                            }
                                        }}
                                        placeholder={editingMessage
                                            ? (language === 'tr' ? 'Mesajı düzenle...' : 'Edit message...')
                                            : replyTo
                                                ? (language === 'tr' ? `${replyTo.senderName}'a yanıt...` : `Reply to ${replyTo.senderName}...`)
                                                : t('chat.messagePlaceholder')}
                                        className={cn(
                                            "w-full px-4 py-3 border-0 ring-1 rounded-xl focus:ring-2 transition-all text-sm resize-none max-h-32 min-h-[48px] custom-scrollbar",
                                            editingMessage
                                                ? "bg-amber-50 ring-amber-200 focus:ring-amber-500 focus:bg-white"
                                                : "bg-stone-50 ring-stone-200 focus:ring-indigo-500 focus:bg-white"
                                        )}
                                        rows={1}
                                    />
                                </div>
                                {/* Send or Record Button */}
                                {editingMessage ? (
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="p-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all flex items-center justify-center h-[48px] w-[48px]"
                                        >
                                            <X size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveEdit}
                                            disabled={!editContent.trim()}
                                            className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center h-[48px] w-[48px]"
                                        >
                                            <Check size={20} />
                                        </button>
                                    </div>
                                ) : newMessage.trim() ? (
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center h-[48px] w-[48px]"
                                    >
                                        <Send size={20} />
                                    </button>
                                ) : isRecording ? (
                                    <button
                                        type="button"
                                        onClick={stopRecording}
                                        className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-md transition-all animate-pulse flex items-center justify-center h-[48px] min-w-[48px] gap-2"
                                    >
                                        <Square size={16} fill="white" />
                                        <span className="text-xs font-mono">{formatAudioDuration(recordingTime)}</span>
                                    </button>
                                ) : isUploadingAudio ? (
                                    <div className="p-3 bg-indigo-600 text-white rounded-xl flex items-center justify-center h-[48px] w-[48px]">
                                        <Loader2 size={20} className="animate-spin" />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={startRecording}
                                        className="p-3 bg-stone-200 text-stone-600 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center h-[48px] w-[48px]"
                                        title={language === 'tr' ? 'Ses kaydı' : 'Voice message'}
                                    >
                                        <Mic size={20} />
                                    </button>
                                )}
                            </form>
                        </div>
                    ) : user && !canChat ? (
                        <div className="text-center p-3 bg-amber-50 rounded-lg border border-dashed border-amber-200">
                            <p className="text-sm text-amber-600">
                                {language === 'tr' ? 'Sohbete mesaj yazma izniniz yok' : 'You don\'t have permission to send messages'}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center p-3 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                            <p className="text-sm text-stone-500">{t('chat.loginToChat')}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}


