'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/Header';
import { NoteCard } from '@/components/NoteCard';
import { AddNoteModal } from '@/components/AddNoteModal';
import { AddSectionModal } from '@/components/AddSectionModal';
import { Section } from '@/components/Section';
import { CommentsDrawer } from '@/components/CommentsDrawer';
import { MembersModal } from '@/components/MembersModal';
import { ChatDrawer } from '@/components/ChatDrawer';
import { FileManagerModal } from '@/components/FileManagerModal';
import { LeaveBoardModal } from '@/components/LeaveBoardModal';
import { MoveNoteModal } from '@/components/MoveNoteModal';
import { getBoard, subscribeToBoardNotes, subscribeToBoard, joinBoard, leaveBoard } from '@/lib/boards';
import { subscribeToBoardSections, createSection } from '@/lib/sections';
import { TrashBinModal } from '@/components/TrashBinModal';
import { getUsersByIds } from '@/lib/auth';
import { createNote, notifyTeacherPost, updateNote, deleteMultipleNotes } from '@/lib/notes';
import { createNotification, createMentionNotifications } from '@/lib/notifications';
import { uploadToSupabase } from '@/lib/supabase';
import { Board, Note, Section as SectionType, User } from '@/types';
import { Plus, Share2, Settings, Copy, Check, Layout, Users, UserPlus, LogOut, MessageCircle, FolderOpen, Search, Filter, X, FileText, Image, BarChart, Mic, Type, Link as LinkIcon, ClipboardList, Trash2, CheckSquare, Square, Loader2, Upload } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { startPresenceHeartbeat, subscribeToPresence, PresenceData } from '@/lib/presence';
import { Avatar } from '@/components/Avatar';

import { checkAndSendDueReminders } from '@/lib/assignments';
import { useToast } from '@/components/ToastProvider';
import { logActivity } from '@/lib/activityLog';
import { cn } from '@/lib/utils';
import { ADMIN_EMAIL } from '@/lib/constants';
import { haptic, nativeShare } from '@/lib/native';
import { ImpactStyle } from '@capacitor/haptics';


export default function BoardPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading, layout, setActiveChatBoardId } = useStore();
    const { t, language } = useTranslation();
    const { showPermissionError } = useToast();
    const [board, setBoard] = useState<Board | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [sections, setSections] = useState<SectionType[]>([]);
    const [loadingBoard, setLoadingBoard] = useState(true);

    // Modal states
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [showAddSectionModal, setShowAddSectionModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showFileManager, setShowFileManager] = useState(false);
    const [showTrashBin, setShowTrashBin] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [activeCommentNote, setActiveCommentNote] = useState<Note | null>(null);
    const [showChat, setShowChat] = useState(false);
    const [showLeaveBoardModal, setShowLeaveBoardModal] = useState(false);


    // Highlight states for notifications
    const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
    const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
    const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);

    // Members logic
    const [members, setMembers] = useState<User[]>([]);
    const [copied, setCopied] = useState(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Toplu silme (bulk delete) sistemi
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Drag and Drop State
    const [isDraggingOverBoard, setIsDraggingOverBoard] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<PresenceData[]>([]);

    const boardId = params.id as string;
    const isOwner = user?.uid === board?.ownerId;
    const isMember = !!(user && board?.members?.includes(user.uid));
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    // İzin tabanlı erişim kontrolü
    const permissions = board?.permissions;

    // Not ekleme izni kontrolü
    const canAddNote = (() => {
        if (!user) return false;
        if (isOwner || isTeacher) return true; // Owner ve öğretmenler her zaman ekleyebilir

        const whoCanAdd = permissions?.whoCanAddNotes || 'members';
        if (whoCanAdd === 'everyone') return true;
        if (whoCanAdd === 'members') return isMember;
        return false;
    })();

    // Yorum yapma izni kontrolü
    const canComment = (() => {
        if (!user) return false;
        if (isOwner || isTeacher) return true;

        const whoCanComment = permissions?.whoCanComment || 'everyone';
        if (whoCanComment === 'everyone') return true;
        if (whoCanComment === 'members') return isMember;
        return false;
    })();

    // Chat yazma izni kontrolü
    const canChat = (() => {
        if (!user) return false;
        if (isOwner || isTeacher) return true;

        const whoCanChat = permissions?.whoCanChat || 'everyone';
        if (whoCanChat === 'everyone') return true;
        if (whoCanChat === 'members') return isMember;
        return false;
    })();

    // Dosya indirme izni
    const canDownloadFiles = permissions?.allowFileDownload ?? true;

    // Genel düzenleme izni (eski mantık korunuyor, ama artık canAddNote'u kullanıyoruz)
    const canEdit = isOwner || isTeacher || isMember;

    // Access denied state
    const [accessDenied, setAccessDenied] = useState(false);

    // Move Note Modal Logic
    const [showMoveNoteModal, setShowMoveNoteModal] = useState(false);
    const [noteToMove, setNoteToMove] = useState<Note | null>(null);

    const handleMoveNote = (note: Note) => {
        setNoteToMove(note);
        setShowMoveNoteModal(true);
    };

    // Move All Notes Logic
    const [showMoveAllModal, setShowMoveAllModal] = useState(false);
    const [moveAllSourceSectionId, setMoveAllSourceSectionId] = useState<string | null>(null);
    const [notesToMoveAll, setNotesToMoveAll] = useState<Note[]>([]);

    const handleOpenMoveAllModal = (sectionId: string, notes: Note[]) => {
        setMoveAllSourceSectionId(sectionId);
        setNotesToMoveAll(notes);
        setShowMoveAllModal(true);
    };

    const confirmMoveAllNotes = async (targetSectionId: string) => {
        if (!moveAllSourceSectionId || notesToMoveAll.length === 0) return;
        try {
            const movePromises = notesToMoveAll.map(note => updateNote(note.id, { sectionId: targetSectionId }));
            await Promise.all(movePromises);
            setShowMoveAllModal(false);
            setMoveAllSourceSectionId(null);
            setNotesToMoveAll([]);
        } catch (error) {
            console.error('Notlar toplu taşınamadı:', error);
        }
    };

    const confirmMoveNote = async (targetSectionId: string) => {
        if (!noteToMove) return;
        try {
            await updateNote(noteToMove.id, { sectionId: targetSectionId });
            setShowMoveNoteModal(false);
            setNoteToMove(null);
        } catch (error) {
            console.error('Not taşınamadı:', error);
        }
    };

    useEffect(() => {
        if (!boardId) return;

        const handleError = (error: Error) => {
            if (error.message?.includes('permission-denied') || error.message?.includes('Missing or insufficient permissions')) {
                setAccessDenied(true);
                setLoadingBoard(false);
            }
        };

        // Optimized subscriptions with error handling
        const unsubBoard = subscribeToBoard(boardId, (updatedBoard) => {
            if (updatedBoard) {
                setBoard(updatedBoard);
                setAccessDenied(false);
            } else {
                // Board doesn't exist
                setBoard(null);
            }
            setLoadingBoard(false);
        }, handleError);

        const unsubNotes = subscribeToBoardNotes(boardId, (newNotes) => {
            setNotes(newNotes);
        }, handleError);

        const unsubSections = subscribeToBoardSections(boardId, (newSections) => {
            setSections(newSections);
        });

        return () => {
            unsubBoard();
            unsubNotes();
            unsubSections();
        };
    }, [boardId]);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!board) return;
            try {
                const memberIds = board.members || [];
                const idsToFetch = Array.from(new Set([...memberIds, board.ownerId])); // Include owner
                if (idsToFetch.length > 0) {
                    const users = await getUsersByIds(idsToFetch);
                    setMembers(users);
                } else {
                    setMembers([]);
                }
            } catch (error) {
                console.error('Üyeler yüklenemedi:', error);
            }
        };

        fetchMembers();
    }, [board?.members, board?.ownerId]);

    // Track chat open state globally for notification filtering
    useEffect(() => {
        if (showChat) {
            setActiveChatBoardId(boardId);
        } else {
            setActiveChatBoardId(null);
        }

        // Cleanup on unmount
        return () => {
            setActiveChatBoardId(null);
        };
    }, [showChat, boardId, setActiveChatBoardId]);

    // Start presence heartbeat when user is viewing the board
    useEffect(() => {
        if (!user || !boardId) return;

        // Start heartbeat and get cleanup function
        const cleanup = startPresenceHeartbeat(
            boardId,
            user.uid,
            user.displayName,
            user.photoURL || undefined
        );

        // Subscribe to presence
        const unsubPresence = subscribeToPresence(boardId, (users) => {
            // Sort to keep current user first or consistent order
            const sortedUsers = [...users].sort((a, b) => {
                if (a.userId === user.uid) return -1;
                if (b.userId === user.uid) return 1;
                return a.displayName.localeCompare(b.displayName);
            });
            setOnlineUsers(sortedUsers);
        });

        // Cleanup on unmount or when boardId/user changes
        return () => {
            cleanup();
            unsubPresence();
        };
    }, [user, boardId]);

    // Update member activity when user views the board
    useEffect(() => {
        if (!user || !boardId) return;

        // Import dynamically to avoid circular dependencies
        import('@/lib/boards').then(({ updateMemberActivity }) => {
            updateMemberActivity(boardId, user.uid, user.displayName);
        });
    }, [user, boardId]);

    // Check for due assignments and send reminders
    useEffect(() => {
        if (!user || !board || isTeacher) return;

        // Only check once when board loads
        checkAndSendDueReminders(user.uid, boardId, board.title);
    }, [user, board, boardId]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;

            // Ignore if typing in an input/textarea or contenteditable (RichTextEditor)
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target.isContentEditable ||
                target.closest('[contenteditable="true"]')
            ) {
                // Allow Escape to blur potentially
                if (e.key === 'Escape') {
                    target.blur();
                }
                return;
            }

            // Ignore if any modal is open
            const anyModalOpen = showAddNoteModal || showAddSectionModal || showShareModal ||
                showMembersModal || showFileManager || showTrashBin || showChat || showMoveNoteModal ||
                activeCommentNote !== null;

            if (anyModalOpen) return;

            // 'N' for New Note
            if (e.key.toLowerCase() === 'n' && (isOwner || isMember || user?.role === 'teacher' || user?.role === 'admin')) {
                e.preventDefault();
                // Open modal for first section or active one
                const targetSectionId = activeSectionId || sections[0]?.id;
                if (targetSectionId) {
                    handleOpenAddNoteModal(targetSectionId);
                }
            }

            // '/' or 'Main Cmd+F' for Search
            if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'f')) {
                e.preventDefault();
                const searchInput = document.querySelector('input[placeholder="Notlarda ara..."]') as HTMLInputElement;
                searchInput?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOwner, isMember, user, sections, activeSectionId, showAddNoteModal, showAddSectionModal, showShareModal, showMembersModal, showFileManager, showChat, showMoveNoteModal, activeCommentNote]);


    // Handle notification navigation params
    useEffect(() => {
        if (!notes.length) return;

        const openNoteId = searchParams.get('openNote');
        const openChat = searchParams.get('openChat');
        const highlightComment = searchParams.get('highlightComment');
        const highlightNote = searchParams.get('highlightNote');

        if (openChat === 'true') {
            setShowChat(true);
            const highlightMessage = searchParams.get('highlightMessage');
            if (highlightMessage) {
                setHighlightMessageId(highlightMessage);
            }
            // Clear params after handling
            router.replace(`/board/${boardId}`, { scroll: false });
        } else if (highlightNote) {
            // For like/reaction: just highlight the note card (don't open comments)
            setHighlightNoteId(highlightNote);

            // Scroll to the note after a short delay
            setTimeout(() => {
                const noteElement = document.getElementById(`note-${highlightNote}`);
                if (noteElement) {
                    noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);

            // Clear highlight after animation
            setTimeout(() => {
                setHighlightNoteId(null);
            }, 3000);

            // Clear params after handling
            router.replace(`/board/${boardId}`, { scroll: false });
        } else if (openNoteId) {
            // Find the note and open comments drawer
            const note = notes.find(n => n.id === openNoteId);
            if (note) {
                setActiveCommentNote(note);
                if (highlightComment) {
                    setHighlightCommentId(highlightComment);
                }
            }
            // Clear params after handling
            router.replace(`/board/${boardId}`, { scroll: false });
        }
    }, [notes, searchParams, boardId, router]);

    /* loadBoard removed as subscribeToBoard handles it */


    // Filter notes by search query and type
    const filteredNotes = useMemo(() => {
        let result = [...notes].filter(n => !n.isDeleted);

        // Filter by type
        if (filterType !== 'all') {
            result = result.filter(note => note.type === filterType);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(note =>
                note.content.toLowerCase().includes(query) ||
                note.authorName.toLowerCase().includes(query) ||
                note.linkTitle?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [notes, searchQuery, filterType]);

    // Group notes by section and sort
    const notesBySection = useMemo(() => {
        const grouped: Record<string, Note[]> = {};

        // Use a sorted copy of filtered notes
        const sortedNotes = [...filteredNotes].sort((a, b) => {
            // Priority 1: Pinned status
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;

            // Priority 2: Creation Date (Newest first)
            const getSeconds = (date: any) => {
                if (!date) return 0;
                if (date.seconds) return date.seconds; // Timestamp
                if (date instanceof Date) return Math.floor(date.getTime() / 1000);
                return 0;
            };

            const dateA = getSeconds(a.createdAt);
            const dateB = getSeconds(b.createdAt);
            return dateB - dateA;
        });

        sortedNotes.forEach(note => {
            const secId = note.sectionId || 'uncategorized';
            if (!grouped[secId]) grouped[secId] = [];
            grouped[secId].push(note);
        });
        return grouped;
    }, [filteredNotes]);

    // Sort sections: pinned first, then by order
    const sortedSections = useMemo(() => {
        return [...sections].sort((a, b) => {
            // Priority 1: Pinned sections come first
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            // Priority 2: Original order
            return a.order - b.order;
        });
    }, [sections]);

    const handleAddSection = async (title: string) => {
        if (!board) return;
        try {
            // Calculate order based on existing sections
            const order = sections.length > 0
                ? Math.max(...sections.map(s => s.order)) + 1
                : 0;

            haptic.impact(ImpactStyle.Light);
            await createSection(boardId, title, order);
        } catch (error) {
            console.error('Bölüm oluşturulamadı:', error);
        }
    };

    const handleOpenAddNoteModal = (sectionId: string) => {
        if (!canAddNote) {
            showPermissionError(
                language === 'tr'
                    ? 'Not ekleme izniniz yok'
                    : 'You don\'t have permission to add notes'
            );
            return;
        }
        setActiveSectionId(sectionId);
        setShowAddNoteModal(true);
    };

    const handleOpenComments = (note: Note) => {
        setActiveCommentNote(note);
    };

    const handleJoin = async () => {
        if (!user || !board) {
            router.push('/auth/login');
            return;
        }
        try {
            const result = await joinBoard(
                boardId,
                user.uid,
                user.displayName,
                board.title,
                board.members || [],
                board.ownerId,
                board
            );

            if (result === 'pending') {
                showPermissionError(
                    language === 'tr'
                        ? 'Üyelik isteğiniz gönderildi. Onay bekleniyor...'
                        : 'Your membership request has been sent. Awaiting approval...'
                );
            }
        } catch (error) {
            console.error('Panoya katılınamadı:', error);
        }
    };

    const handleLeave = () => {
        if (!user) return;
        setShowLeaveBoardModal(true);
    };

    const handleLeaveSuccess = () => {
        router.push('/dashboard');
    };

    const handleAddNote = async (data: {
        content: string;
        type: 'text' | 'image' | 'link' | 'file' | 'poll' | 'audio' | 'video';
        color: string;
        imageUrl?: string;
        linkUrl?: string;
        linkTitle?: string;
        linkDescription?: string;
        linkDomain?: string;
        pollOptions?: string[];
        audioUrl?: string;
        audioDuration?: number;
        videoUrl?: string;
        videoDuration?: number;
        videoThumbnail?: string;
        files?: { url: string; name: string; type?: string }[];
        sectionId?: string;
    }) => {
        // Use the sectionId from passed data (from modal selector) OR fallback to active/first
        const targetSectionId = data.sectionId || activeSectionId;

        if (!user || !board || !targetSectionId) return;

        try {
            const noteId = await createNote(
                board.id,
                targetSectionId,
                user.uid,
                user.displayName,
                user.photoURL,
                data.content,
                data.type,
                {
                    color: data.color,
                    imageUrl: data.imageUrl,
                    linkUrl: data.linkUrl,
                    linkTitle: data.linkTitle,
                    linkDescription: data.linkDescription,
                    linkDomain: data.linkDomain,
                    fileUrl: data.type === 'file' ? data.imageUrl : undefined,
                    files: data.files, // Çoklu dosya desteği
                    pollOptions: data.pollOptions,
                    audioUrl: data.audioUrl,
                    audioDuration: data.audioDuration,
                    videoUrl: data.videoUrl,
                    videoDuration: data.videoDuration,
                    videoThumbnail: data.videoThumbnail,
                    isPinned: false,
                }
            );

            haptic.impact(ImpactStyle.Medium);
            // Close modal IMMEDIATELY
            setShowAddNoteModal(false);
            setActiveSectionId(null);
            setDroppedFiles([]); // Clear dropped files

            // Run notifications and activity logging in the BACKGROUND
            const backgroundTasks = async () => {
                try {
                    if (isTeacher && board.members && board.members.length > 0) {
                        const allMembers = [...board.members];
                        if (board.ownerId && !allMembers.includes(board.ownerId)) {
                            allMembers.push(board.ownerId);
                        }
                        await notifyTeacherPost(
                            noteId,
                            board.id,
                            board.title,
                            user.uid,
                            user.displayName,
                            allMembers
                        );
                    } else if (board.ownerId && board.ownerId !== user.uid) {
                        // Student post: Only notify the board owner to save quota
                        // Other members will see it in their board feed anyway
                        await createNotification({
                            userId: board.ownerId,
                            type: 'note',
                            title: language === 'tr' ? 'Yeni Not Eklendi' : 'New Note Added',
                            message: `${user.displayName} panoda yeni bir not paylaştı`,
                            fromUserId: user.uid,
                            fromUserName: user.displayName,
                            boardId: board.id,
                            boardTitle: board.title,
                            noteId: noteId,
                        });
                    }

                    // Handle mentions in note content
                    if (members.length > 0) {
                        await createMentionNotifications(
                            data.content,
                            members.map(m => ({ uid: m.uid, displayName: m.displayName, role: m.role })),
                            user.uid,
                            user.displayName,
                            board.id,
                            board.title,
                            noteId
                        );
                    }

                    await logActivity({
                        userId: user.uid,
                        userName: user.displayName,
                        type: 'note_create',
                        description: `"${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}" notu oluşturdu`,
                        metadata: {
                            boardId: board.id,
                            boardTitle: board.title,
                        }
                    });
                } catch (bgError) {
                    console.error('Background tasks error:', bgError);
                }
            };

            backgroundTasks();

        } catch (error) {
            console.error('Not eklenemedi:', error);
        }
    };

    const handleCopyLink = async () => {
        haptic.impact(ImpactStyle.Light);
        const url = window.location.href;

        const shared = await nativeShare({
            title: board?.title || 'Collabo Board',
            text: language === 'tr' ? `${board?.title} panosuna katıl!` : `Join the ${board?.title} board!`,
            url,
            dialogTitle: language === 'tr' ? 'Panoyu Paylaş' : 'Share Board'
        });

        if (!shared) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Toplu silme fonksiyonları
    const toggleNoteSelection = (noteId: string) => {
        setSelectedNotes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(noteId)) {
                newSet.delete(noteId);
            } else {
                newSet.add(noteId);
            }
            return newSet;
        });
        haptic.impact(ImpactStyle.Light);
    };

    const selectAllNotes = () => {
        const allNoteIds = new Set(notes.map(n => n.id));
        setSelectedNotes(allNoteIds);
    };

    const clearSelection = () => {
        setSelectedNotes(new Set());
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedNotes(new Set());
    };

    const handleBulkDelete = async () => {
        if (selectedNotes.size === 0) return;

        const confirmText = language === 'tr'
            ? `${selectedNotes.size} notu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
            : `Are you sure you want to delete ${selectedNotes.size} notes? This action cannot be undone.`;

        if (!confirm(confirmText)) return;

        setIsDeleting(true);
        try {
            const result = await deleteMultipleNotes(Array.from(selectedNotes));

            if (result.failed > 0) {
                alert(language === 'tr'
                    ? `${result.success} not silindi, ${result.failed} not silinemedi.`
                    : `${result.success} notes deleted, ${result.failed} failed.`);
            }

            // Log activity
            if (result.success > 0 && user && board) {
                await logActivity({
                    userId: user.uid,
                    userName: user.displayName,
                    type: 'note_delete',
                    description: `${result.success} not sildi`,
                    metadata: {
                        boardId: board.id,
                        boardTitle: board.title,
                    }
                }).catch(console.error);
            }

            exitSelectionMode();
        } catch (error) {
            console.error('Toplu silme hatası:', error);
            alert(language === 'tr' ? 'Notlar silinemedi.' : 'Failed to delete notes.');
        } finally {
            setIsDeleting(false);
        }
    };


    // DRAG AND DROP HANDLERS
    const handleBoardDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canAddNote || isUploading) return;
        setIsDraggingOverBoard(true);
    };

    const handleBoardDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if leaving the main container
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingOverBoard(false);
    };

    const handleBoardDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverBoard(false);

        if (!canAddNote || !user || !board) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // File size check
        const MAX_SIZE = 50 * 1024 * 1024;
        const largeFiles = files.filter(f => f.size > MAX_SIZE);
        if (largeFiles.length > 0) {
            alert(language === 'tr'
                ? `Bazı dosyalar 50MB sınırını aşıyor: ${largeFiles.map(f => f.name).join(', ')}`
                : `Some files exceed the 50MB limit: ${largeFiles.map(f => f.name).join(', ')}`
            );
            return;
        }

        // Pass files to modal instead of uploading immediately
        setDroppedFiles(files);

        // Set default section if none active (usually first section)
        if (!activeSectionId && sections.length > 0) {
            setActiveSectionId(sections[0].id);
        }

        setShowAddNoteModal(true);
    };

    if (isLoading || loadingBoard) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                    <p className="text-stone-500 text-sm">
                        {language === 'tr' ? 'Pano yükleniyor...' : 'Loading board...'}
                    </p>
                </div>
            </div>
        );
    }

    // Access Denied or Deleted Screen
    if (accessDenied || (!board && !loadingBoard) || board?.isDeleted) {
        const isTrash = board?.isDeleted;
        const isNotFound = (!board && !loadingBoard && !accessDenied) || isTrash;

        return (
            <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-6 text-[#1c1917]">
                <div className="w-full max-w-xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">

                    {/* Code-Driven Animated Icon */}
                    <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
                        {/* Technical Background Elements */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                            <div className="w-full h-full border border-[#1c1917] rounded-full scale-150" />
                            <div className="absolute w-full h-px bg-[#1c1917]" />
                            <div className="absolute h-full w-px bg-[#1c1917]" />
                        </div>

                        {/* Animated SVG */}
                        {isNotFound ? (
                            <div className="relative z-10 p-12 bg-stone-100 rounded-[3rem] shadow-xl border border-stone-200 animate-bounce-subtle">
                                <Trash2 size={80} className="text-stone-400" strokeWidth={1.5} />
                            </div>
                        ) : (
                            <svg
                                viewBox="0 0 100 100"
                                className="w-48 h-48 relative z-10"
                                style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.08))' }}
                            >
                                <defs>
                                    <linearGradient id="lockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#262626" />
                                        <stop offset="100%" stopColor="#525252" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M30 45 V30 C30 18.9543 38.9543 10 50 10 C61.0457 10 70 18.9543 70 30 V45"
                                    fill="none"
                                    stroke="url(#lockGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                />
                                <rect x="25" y="45" width="50" height="40" rx="10" fill="url(#lockGradient)" />
                                <g className="animate-pulse">
                                    <circle cx="50" cy="62" r="4" fill="#fafaf9" />
                                    <rect x="48" y="65" width="4" height="8" rx="2" fill="#fafaf9" />
                                </g>
                            </svg>
                        )}

                        <div className="absolute w-32 h-32 border-2 border-[#1c1917]/10 rounded-[2rem] animate-ping duration-[3s]" />
                    </div>

                    {/* Content Section */}
                    <div className="text-center space-y-8 relative z-10">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1c1917]/5 rounded-full mb-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isNotFound ? "bg-stone-400" : "bg-red-500")} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1c1917]/60">
                                    {isNotFound
                                        ? (language === 'tr' ? 'Bulunamadı' : 'Not Found')
                                        : (language === 'tr' ? 'Güvenli Bölge' : 'Secure Zone')
                                    }
                                </span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-[#1c1917]">
                                {isNotFound ? (
                                    <>
                                        {language === 'tr' ? 'Bu Pano' : 'This Board'}{' '}
                                        <span className="font-bold">{language === 'tr' ? 'Silinmiş' : 'Deleted'}</span>
                                    </>
                                ) : (
                                    <>
                                        {language === 'tr' ? 'Bu Pano' : 'This Board is'}{' '}
                                        <span className="font-bold">{language === 'tr' ? 'Özel' : 'Private'}</span>
                                    </>
                                )}
                            </h2>
                        </div>

                        <p className="text-base text-[#1c1917]/60 max-w-sm mx-auto leading-relaxed font-normal">
                            {isNotFound ? (
                                language === 'tr'
                                    ? `Ulaşmaya çalıştığınız pano silinmiş veya hiç var olmamış olabilir. Bir hata olduğunu düşünüyorsanız ${ADMIN_EMAIL} adresine e-posta gönderin.`
                                    : `The board you are trying to reach may have been deleted or never existed. If you think this is a mistake, please contact ${ADMIN_EMAIL}.`
                            ) : (
                                user
                                    ? (language === 'tr'
                                        ? "Görüntülemeye çalıştığınız içerik sadece belirli üyeler için şifrelenmiştir."
                                        : "The content you are trying to view is encrypted for specific members only.")
                                    : (language === 'tr'
                                        ? "Erişim sağlamak için dijital kimliğinizle giriş yapmanız gerekiyor."
                                        : "You need to log in with your digital identity to gain access.")
                            )}
                        </p>

                        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                            {!user ? (
                                <button
                                    onClick={() => router.push('/auth/login')}
                                    className="w-full sm:w-auto px-10 py-4 bg-[#1c1917] text-[#fafaf9] rounded-2xl font-semibold hover:bg-[#262626] transition-all duration-300 shadow-2xl hover:shadow-black/20 active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    {t('common.login')}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="w-full sm:w-auto px-10 py-4 bg-[#1c1917] text-[#fafaf9] rounded-2xl font-semibold hover:bg-[#262626] transition-all duration-300 shadow-2xl hover:shadow-black/20 active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    {language === 'tr' ? 'Panolarım' : 'My Boards'}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                            )}

                            <button
                                onClick={() => router.push('/')}
                                className="w-full sm:w-auto px-10 py-4 border-2 border-[#1c1917]/10 text-[#1c1917]/80 rounded-2xl font-semibold hover:bg-black/5 hover:border-transparent transition-all duration-300 active:scale-[0.98]"
                            >
                                {language === 'tr' ? 'Ana Sayfa' : 'Home'}
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Status Text */}
                    <div className="mt-20 px-6 py-2 bg-stone-100 rounded-full border border-stone-200">
                        <div className="flex items-center gap-4 text-[10px] font-bold tracking-tighter text-stone-500 uppercase">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                                AES-256
                            </span>
                            <span className="w-px h-3 bg-stone-300" />
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                {language === 'tr' ? 'GÜVENLİ BAĞLANTI' : 'ENCRYPTED'}
                            </span>
                        </div>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes lock-shackle {
                        0% { stroke-dashoffset: 100; transform: translateY(2px); }
                        100% { stroke-dashoffset: 0; transform: translateY(0); }
                    }
                    @keyframes scan {
                        0% { transform: translateY(0); opacity: 0; }
                        50% { opacity: 0.5; }
                        100% { transform: translateY(30px); opacity: 0; }
                    }
                    .animate-lock-shackle {
                        animation: lock-shackle 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    }
                    .animate-scan {
                        animation: scan 2s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    if (!board) return null;

    return (
        <div
            className="min-h-screen flex flex-col transition-all duration-500 overflow-x-hidden relative"
            style={{
                backgroundColor: board.backgroundType === 'gradient' ? undefined : board.backgroundColor,
                backgroundImage: board.backgroundType === 'gradient'
                    ? board.backgroundGradient
                    : board.backgroundType === 'image' && board.backgroundImage
                        ? `url(${board.backgroundImage})`
                        : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat'
            }}
            onDragOver={handleBoardDragOver}
            onDragLeave={handleBoardDragLeave}
            onDrop={handleBoardDrop}
        >
            {/* Drag Overlay */}
            {isDraggingOverBoard && (
                <div className="fixed inset-0 z-50 bg-stone-900/10 backdrop-blur-[2px] border-4 border-dashed border-stone-400 flex items-center justify-center pointer-events-none animate-in fade-in duration-200 m-4 rounded-3xl">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-600">
                            <Upload size={40} />
                        </div>
                        <p className="text-xl font-bold text-stone-800">
                            {language === 'tr' ? 'Dosyaları Buraya Bırakın' : 'Drop Files Here'}
                        </p>
                        <p className="text-stone-500">
                            {language === 'tr' ? 'Yüklemek için bırakın' : 'Release to upload'}
                        </p>
                    </div>
                </div>
            )}

            {/* Upload Loading Overlay */}
            {isUploading && (
                <div className="fixed inset-0 z-50 bg-stone-900/20 backdrop-blur-[1px] flex items-center justify-center cursor-wait">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
                        <Loader2 size={32} className="animate-spin text-stone-800" />
                        <p className="text-lg font-medium text-stone-800">
                            {language === 'tr' ? 'Dosyalar yükleniyor...' : 'Uploading files...'}
                        </p>
                    </div>
                </div>
            )}


            <Header
                boardMembers={members}
                boardTitle={board?.title}
                showTrashBinAccess={isOwner || isTeacher || user?.role === 'admin'}
                onShowTrashBin={() => setShowTrashBin(true)}
            />

            <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 overflow-hidden pb-24 sm:pb-8">
                {/* Board Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">{board.title}</h1>
                        {board.description && (
                            <p className="text-stone-600 mt-1 sm:mt-2 max-w-2xl text-sm sm:text-base">{board.description}</p>
                        )}
                    </div>
                    <div className="flex gap-5 items-center overflow-x-auto no-scrollbar pb-4 sm:pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                        <button
                            onClick={() => setShowMembersModal(true)}
                            className="flex items-center gap-2 px-4 h-11 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-all shadow-sm shrink-0 whitespace-nowrap group"
                        >
                            <Users size={18} className="text-stone-400 group-hover:text-indigo-500 transition-colors" />
                            <span className="hidden sm:inline font-medium">
                                {t('board.members')} ({members.length})
                            </span>

                            {onlineUsers.length > 0 && (
                                <div className="flex items-center gap-2 ml-1 pl-3 border-l border-stone-100">
                                    <div className="flex -space-x-2">
                                        {onlineUsers.slice(0, 3).map((onlineUser) => (
                                            <Avatar
                                                key={onlineUser.userId}
                                                src={onlineUser.photoURL}
                                                name={onlineUser.displayName}
                                                size="xs"
                                                className="ring-2 ring-white"
                                                clickable={false}
                                            />
                                        ))}
                                    </div>
                                    {onlineUsers.length > 3 && (
                                        <span className="text-[10px] font-bold text-stone-400">
                                            +{onlineUsers.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </button>

                        <button
                            onClick={() => setShowFileManager(true)}
                            className="flex items-center gap-2 px-4 h-11 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-all shadow-sm shrink-0 whitespace-nowrap"
                        >
                            <FolderOpen size={18} />
                            <span className="hidden sm:inline font-medium">{t('board.files')}</span>
                        </button>

                        <button
                            onClick={() => setShowChat(true)}
                            className="flex items-center gap-2 px-4 h-11 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-all shadow-sm shrink-0 whitespace-nowrap"
                        >
                            <MessageCircle size={18} />
                            <span className="hidden sm:inline font-medium">{t('board.chat')}</span>
                        </button>

                        <button
                            onClick={() => router.push(`/board/${boardId}/assignments`)}
                            className="flex items-center gap-2 px-4 h-11 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-all shadow-sm shrink-0 whitespace-nowrap"
                        >
                            <ClipboardList size={18} />
                            <span className="hidden sm:inline font-medium">{language === 'tr' ? 'Ödevler' : 'Assignments'}</span>
                        </button>

                        {user && !isOwner && !isMember && (
                            <button
                                onClick={handleJoin}
                                className="flex items-center gap-2 px-4 h-11 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-all shadow-sm shrink-0 whitespace-nowrap"
                            >
                                <UserPlus size={18} />
                                <span className="hidden sm:inline font-medium">{t('board.join')}</span>
                            </button>
                        )}

                        <button
                            onClick={() => setShowShareModal(true)}
                            className="flex items-center gap-2 px-4 h-11 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-all shadow-sm shrink-0 whitespace-nowrap"
                        >
                            <Share2 size={18} />
                            <span className="hidden sm:inline font-medium">{t('common.share')}</span>
                        </button>

                        {(isOwner || isTeacher) && (
                            <button
                                onClick={() => setShowTrashBin(true)}
                                className="flex items-center gap-2 px-4 h-11 bg-white border border-stone-200 rounded-xl hover:bg-red-50 text-stone-600 hover:text-red-500 transition-all shadow-sm shrink-0 whitespace-nowrap group"
                                title={language === 'tr' ? 'Pano Çöp Kutusu' : 'Board Trash Bin'}
                            >
                                <Trash2 size={18} className="text-stone-400 group-hover:text-red-500" />
                                <span className="text-sm font-semibold hidden lg:inline">
                                    {language === 'tr' ? 'Pano Çöp Kutusu' : 'Board Trash Bin'}
                                </span>
                                <span className="text-sm font-semibold lg:hidden">
                                    {language === 'tr' ? 'Çöp Kutusu' : 'Trash'}
                                </span>
                            </button>
                        )}
                        {(isOwner || isTeacher) && (
                            <button
                                onClick={() => setShowAddSectionModal(true)}
                                className="flex items-center gap-2 px-4 h-11 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-all shadow-sm shrink-0 whitespace-nowrap"
                            >
                                <Layout size={18} />
                                <span className="hidden sm:inline font-medium">{t('board.addSection')}</span>
                            </button>
                        )}
                        {(isOwner || user?.role === 'admin') && (
                            <button
                                onClick={() => router.push(`/board/${boardId}/settings`)}
                                className="flex items-center justify-center w-11 h-11 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-all shadow-sm shrink-0"
                                title={t('common.settings')}
                            >
                                <Settings size={18} />
                            </button>
                        )}
                        {user && isMember && !isOwner && (
                            <button
                                onClick={handleLeave}
                                className="flex items-center justify-center w-11 h-11 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 shrink-0"
                                title={t('board.leave')}
                            >
                                <LogOut size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="mb-6 flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            placeholder={t('board.searchNotes')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors shadow-sm ${showFilters || filterType !== 'all'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                    >
                        <Filter size={16} />
                        <span>{t('common.filter')}</span>
                        {filterType !== 'all' && (
                            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">1</span>
                        )}
                    </button>

                    {/* Toplu Silme Butonu - Sadece Öğretmenler */}
                    {isTeacher && !selectionMode && (
                        <button
                            onClick={() => setSelectionMode(true)}
                            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 bg-white rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                        >
                            <Trash2 size={16} />
                            <span>{language === 'tr' ? 'Toplu Sil' : 'Bulk Delete'}</span>
                        </button>
                    )}
                </div>

                {/* Seçim Modu Araç Çubuğu */}
                {selectionMode && (
                    <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Trash2 size={20} className="text-red-600" />
                                <div>
                                    <h4 className="font-semibold text-red-800">
                                        {language === 'tr' ? 'Seçim Modu' : 'Selection Mode'}
                                    </h4>
                                    <p className="text-sm text-red-600">
                                        {selectedNotes.size > 0
                                            ? (language === 'tr'
                                                ? `${selectedNotes.size} not seçildi`
                                                : `${selectedNotes.size} note${selectedNotes.size > 1 ? 's' : ''} selected`)
                                            : (language === 'tr'
                                                ? 'Silmek istediğiniz notları seçin'
                                                : 'Select notes to delete')
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={selectAllNotes}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-colors"
                                >
                                    <CheckSquare size={14} />
                                    {language === 'tr' ? 'Tümünü Seç' : 'Select All'}
                                </button>
                                {selectedNotes.size > 0 && (
                                    <button
                                        onClick={clearSelection}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                                    >
                                        {language === 'tr' ? 'Temizle' : 'Clear'}
                                    </button>
                                )}
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={selectedNotes.size === 0 || isDeleting}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isDeleting ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                    {language === 'tr' ? 'Sil' : 'Delete'} ({selectedNotes.size})
                                </button>
                                <button
                                    onClick={exitSelectionMode}
                                    className="p-1.5 text-stone-500 hover:text-stone-700 hover:bg-white rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter Options */}
                {showFilters && (
                    <div className="mb-6 p-4 bg-white rounded-xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-stone-700">
                                {language === 'tr' ? 'Not Türü' : 'Note Type'}
                            </span>
                            {filterType !== 'all' && (
                                <button
                                    onClick={() => setFilterType('all')}
                                    className="text-xs text-indigo-600 hover:underline"
                                >
                                    {language === 'tr' ? 'Filtreyi Temizle' : 'Clear Filter'}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'all', label: language === 'tr' ? 'Tümü' : 'All', icon: null },
                                { value: 'text', label: t('note.text'), icon: Type },
                                { value: 'file', label: t('note.file'), icon: FileText },
                                { value: 'image', label: t('note.image'), icon: Image },
                                { value: 'link', label: t('note.link'), icon: LinkIcon },
                                { value: 'poll', label: t('note.poll'), icon: BarChart },
                                { value: 'audio', label: t('note.audio'), icon: Mic },
                            ].map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setFilterType(value)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === value
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                        }`}
                                >
                                    {Icon && <Icon size={14} />}
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search Results Info */}
                {(searchQuery || filterType !== 'all') && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-stone-500">
                        <span>
                            {language === 'tr'
                                ? `${filteredNotes.length} not bulundu`
                                : `${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''} found`}
                            {searchQuery && (language === 'tr' ? ` "${searchQuery}" için` : ` for "${searchQuery}"`)}
                            {filterType !== 'all' && (language === 'tr' ? ` (${filterType} türünde)` : ` (type: ${filterType})`)}
                        </span>
                    </div>
                )}

                {/* Sections List */}
                <div className={layout === 'vertical'
                    ? "flex overflow-x-auto h-[calc(100vh-250px)] items-start gap-6 pb-6 pt-6 px-4 custom-scrollbar snap-x"
                    : "space-y-2 pb-20"
                }>
                    {sections.length === 0 && !notesBySection['uncategorized'] ? (
                        <div className="text-center py-20 bg-white/60 rounded-2xl border border-stone-200/50 backdrop-blur-sm mx-auto max-w-lg">
                            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Layout size={32} className="text-stone-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-stone-800 mb-2">
                                {language === 'tr' ? 'Henüz bölüm yok' : 'No sections yet'}
                            </h3>
                            <p className="text-stone-500 mb-6">
                                {language === 'tr'
                                    ? 'İçerik eklemek için önce bir bölüm oluşturun'
                                    : 'Create a section first to add content'}
                            </p>
                            {(isOwner || isTeacher) && (
                                <button
                                    onClick={() => setShowAddSectionModal(true)}
                                    className="inline-flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-lg hover:bg-stone-700 transition-colors font-medium"
                                >
                                    <Plus size={18} />
                                    {t('board.addSection')}
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Render Uncategorized Notes if any (Legacy Support) */}
                            {notesBySection['uncategorized']?.length > 0 && (
                                <Section
                                    section={{
                                        id: 'uncategorized',
                                        boardId: boardId,
                                        title: t('board.uncategorized'),
                                        order: -1,
                                        createdAt: new Date(),
                                    }}
                                    notes={notesBySection['uncategorized']}
                                    canEdit={canEdit}
                                    canAddNote={canAddNote}
                                    isOwner={isOwner}
                                    boardTitle={board.title}
                                    highlightNoteId={highlightNoteId}
                                    onAddNote={handleOpenAddNoteModal}
                                    onOpenComments={handleOpenComments}
                                    onMoveNote={handleMoveNote}
                                    onMoveAll={handleOpenMoveAllModal}
                                    selectionMode={selectionMode}
                                    selectedNotes={selectedNotes}
                                    onToggleSelect={toggleNoteSelection}
                                    canDownloadFiles={canDownloadFiles}
                                />
                            )}

                            {/* Render Sections */}
                            {sortedSections.map((section) => (
                                <Section
                                    key={section.id}
                                    section={section}
                                    notes={notesBySection[section.id] || []}
                                    canEdit={canEdit}
                                    canAddNote={canAddNote}
                                    isOwner={isOwner}
                                    boardTitle={board.title}
                                    highlightNoteId={highlightNoteId}
                                    onAddNote={handleOpenAddNoteModal}
                                    onOpenComments={handleOpenComments}
                                    onMoveNote={handleMoveNote}
                                    onMoveAll={handleOpenMoveAllModal}
                                    selectionMode={selectionMode}
                                    selectedNotes={selectedNotes}
                                    onToggleSelect={toggleNoteSelection}
                                    canDownloadFiles={canDownloadFiles}
                                />
                            ))}
                        </>
                    )}
                </div>
            </main>

            {/* Modals */}
            {showAddNoteModal && (
                <AddNoteModal
                    onClose={() => {
                        setShowAddNoteModal(false);
                        setActiveSectionId(null);
                        setDroppedFiles([]);
                    }}
                    onSubmit={handleAddNote}
                    sections={droppedFiles.length > 0 ? sections : undefined}
                    defaultSectionId={activeSectionId}
                    initialFiles={droppedFiles}
                />
            )}

            {showAddSectionModal && (
                <AddSectionModal
                    onClose={() => setShowAddSectionModal(false)}
                    onSubmit={handleAddSection}
                />
            )}

            {showMoveNoteModal && noteToMove && (
                <MoveNoteModal
                    isOpen={showMoveNoteModal}
                    onClose={() => {
                        setShowMoveNoteModal(false);
                        setNoteToMove(null);
                    }}
                    onSubmit={confirmMoveNote}
                    sections={sections}
                    currentSectionId={noteToMove.sectionId || 'uncategorized'}
                />
            )}

            {showMoveAllModal && moveAllSourceSectionId && (
                <MoveNoteModal
                    isOpen={showMoveAllModal}
                    onClose={() => {
                        setShowMoveAllModal(false);
                        setMoveAllSourceSectionId(null);
                        setNotesToMoveAll([]);
                    }}
                    onSubmit={confirmMoveAllNotes}
                    sections={sections}
                    currentSectionId={moveAllSourceSectionId}
                    title={language === 'tr' ? 'Tüm Notları Taşı' : 'Move All Notes'}
                />
            )}

            {showShareModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-matte-lg border border-stone-200">
                        <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('board.shareBoard')}</h2>
                        <p className="text-stone-500 text-sm mb-4">
                            {language === 'tr'
                                ? 'Bu linki paylaşarak diğer kişilerin panoya erişmesini sağlayabilirsiniz.'
                                : 'Share this link to allow others to access this board.'}
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={typeof window !== 'undefined' ? window.location.href : ''}
                                readOnly
                                className="flex-1 px-3 py-2.5 border border-stone-200 rounded-lg bg-stone-50 text-sm text-stone-600"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors font-medium"
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                {copied ? t('common.copied') : t('common.copy')}
                            </button>
                        </div>
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="w-full mt-4 py-2.5 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 font-medium transition-colors"
                        >
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            )}

            {/* Comments Drawer */}
            {activeCommentNote && (
                <CommentsDrawer
                    note={activeCommentNote}
                    isOpen={!!activeCommentNote}
                    onClose={() => {
                        setActiveCommentNote(null);
                        setHighlightCommentId(null);
                    }}
                    members={members}
                    boardTitle={board.title}
                    initialHighlightCommentId={highlightCommentId}
                    canComment={canComment}
                />
            )}

            <ChatDrawer
                boardId={boardId}
                isOpen={showChat}
                onClose={() => {
                    setShowChat(false);
                    setHighlightMessageId(null);
                }}
                members={members}
                boardTitle={board.title}
                initialHighlightMessageId={highlightMessageId}
                canChat={canChat}
                ownerId={board.ownerId}
            />

            {showMembersModal && (
                <MembersModal
                    isOpen={showMembersModal}
                    onClose={() => setShowMembersModal(false)}
                    members={members}
                    ownerId={board.ownerId}
                    boardId={boardId}
                    board={board}
                    currentUserId={user?.uid}
                    isTeacher={isTeacher}
                />
            )}

            {showFileManager && (
                <FileManagerModal
                    isOpen={showFileManager}
                    onClose={() => setShowFileManager(false)}
                    notes={notes}
                />
            )}

            {showTrashBin && (
                <TrashBinModal
                    isOpen={showTrashBin}
                    onClose={() => setShowTrashBin(false)}
                    mode="board"
                    boardId={boardId}
                />
            )}

            {/* Leave Board Modal */}
            {user && board && (
                <LeaveBoardModal
                    isOpen={showLeaveBoardModal}
                    onClose={() => setShowLeaveBoardModal(false)}
                    boardId={boardId}
                    boardTitle={board.title}
                    userId={user.uid}
                    onLeaveSuccess={handleLeaveSuccess}
                />
            )}


        </div>
    );
}
