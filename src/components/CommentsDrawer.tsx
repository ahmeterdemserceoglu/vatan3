'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Comment, User } from '@/types';
import { addComment, deleteComment, subscribeToNoteComments, likeComment, unlikeComment } from '@/lib/sections';
import { useStore } from '@/store/useStore';
import { formatDate } from '@/lib/utils';
import { Send, X, MessageSquare, Reply, CornerUpLeft, Trash2, Heart } from 'lucide-react';
import { Note } from '@/types';
import { cn } from '@/lib/utils';
import { createNotification, createMentionNotifications } from '@/lib/notifications';
import { useTranslation } from '@/hooks/useTranslation';
import { Avatar } from './Avatar';
import { MentionText } from './MentionText';

interface CommentsDrawerProps {
    note: Note;
    isOpen: boolean;
    onClose: () => void;
    members?: User[];
    boardTitle?: string;
    initialHighlightCommentId?: string | null;
    canComment?: boolean;
}

export function CommentsDrawer({ note, isOpen, onClose, members = [], boardTitle = '', initialHighlightCommentId = null, canComment = true }: CommentsDrawerProps) {
    const { user } = useStore();
    const { t, language } = useTranslation();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
    const [swipingCommentId, setSwipingCommentId] = useState<string | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    // Mention autocomplete state
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const touchStartX = useRef(0);
    const touchCurrentX = useRef(0);

    // Special mentions
    const specialMentions = [
        { uid: 'everyone', displayName: 'everyone', label: language === 'tr' ? 'Herkese Bildirim' : 'Notify Everyone' },
        { uid: 'student', displayName: 'student', label: language === 'tr' ? 'Öğrencilere Bildirim' : 'Notify Students' },
        { uid: 'teacher', displayName: 'teacher', label: language === 'tr' ? 'Öğretmenlere/Adminlere Bildirim' : 'Notify Teachers/Admins' }
    ];

    const filteredSpecialMentions = specialMentions.filter(m =>
        !mentionQuery || m.displayName.toLowerCase().startsWith(mentionQuery.toLowerCase())
    );

    // Filter board members based on mention query
    const mentionSuggestions = members.filter(m => {
        if (!m?.displayName) return false;
        if (!mentionQuery) return true; // Show all members if no query
        return m.displayName.toLowerCase().startsWith(mentionQuery.toLowerCase());
    }).slice(0, 5);

    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = subscribeToNoteComments(note.id, (data) => {
            setComments(data);
        });
        return () => unsubscribe();
    }, [note.id, isOpen]);

    // Handle initial highlight from notification navigation
    useEffect(() => {
        if (initialHighlightCommentId && comments.length > 0 && isOpen) {
            // Set highlight
            setHighlightedCommentId(initialHighlightCommentId);

            // Scroll to the comment
            setTimeout(() => {
                const element = document.getElementById(`comment-${initialHighlightCommentId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);

            // Clear highlight after animation
            setTimeout(() => {
                setHighlightedCommentId(null);
            }, 3000);
        }
    }, [initialHighlightCommentId, comments, isOpen]);

    const handleReplyClick = (comment: Comment) => {
        setReplyTo(comment);
        inputRef.current?.focus();
    };

    const cancelReply = () => setReplyTo(null);

    // Scroll to specific comment and highlight
    const scrollToComment = (commentId: string) => {
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
            commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedCommentId(commentId);
            setTimeout(() => setHighlightedCommentId(null), 1500);
        }
    };

    // Swipe to Reply handlers
    const handleTouchStart = useCallback((e: React.TouchEvent, comment: Comment) => {
        touchStartX.current = e.touches[0].clientX;
        touchCurrentX.current = e.touches[0].clientX;
        setSwipingCommentId(comment.id);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swipingCommentId) return;
        touchCurrentX.current = e.touches[0].clientX;
        const diff = touchStartX.current - touchCurrentX.current;
        if (diff > 0) {
            setSwipeOffset(Math.min(diff, 80));
        }
    }, [swipingCommentId]);

    const handleTouchEnd = useCallback((comment: Comment) => {
        if (swipeOffset > 50) {
            handleReplyClick(comment);
        }
        setSwipeOffset(0);
        setSwipingCommentId(null);
    }, [swipeOffset]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;

        setIsLoading(true);
        try {
            // Get the new comment ID
            const newCommentId = await addComment(
                note.id,
                note.boardId,
                user.uid,
                user.displayName,
                user.photoURL,
                newComment.trim(),
                replyTo ? {
                    replyToId: replyTo.id,
                    replyToAuthor: replyTo.authorName,
                    replyToContent: replyTo.content.slice(0, 80),
                } : undefined
            );

            // Track if we have already notified the post owner to avoid duplicates
            let postOwnerNotified = false;

            // Send notification if replying to someone
            if (replyTo && replyTo.authorId !== user.uid) {
                if (replyTo.authorId === note.authorId) {
                    postOwnerNotified = true;
                }

                await createNotification({
                    userId: replyTo.authorId,
                    type: 'comment_reply',
                    title: language === 'tr' ? 'Yorumunuza yanıt geldi' : 'Reply to your comment',
                    message: `${user.displayName}: "${newComment.trim().substring(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
                    fromUserId: user.uid,
                    fromUserName: user.displayName,
                    boardId: note.boardId,
                    noteId: note.id,
                    commentId: newCommentId, // Link to the new reply comment
                });
            }

            // Check for @mentions and send notifications
            if (members.length > 0) {
                const lowerContent = newComment.trim().toLowerCase();
                let targetMembers = members.map(m => ({ uid: m.uid, displayName: m.displayName }));

                if (lowerContent.includes('@everyone')) {
                    // Notify everyone except sender
                    for (const member of members) {
                        if (member.uid !== user.uid) {
                            if (member.uid === note.authorId) postOwnerNotified = true;

                            await createNotification({
                                userId: member.uid,
                                type: 'mention',
                                title: language === 'tr' ? '@everyone ile etiketlendiniz' : 'You were mentioned via @everyone',
                                message: `${user.displayName}: "${newComment.trim().substring(0, 50)}${newComment.trim().length > 50 ? '...' : ''}"`,
                                fromUserId: user.uid,
                                fromUserName: user.displayName,
                                boardId: note.boardId,
                                boardTitle: boardTitle,
                                noteId: note.id,
                                commentId: newCommentId,
                            });
                        }
                    }
                } else if (lowerContent.includes('@student')) {
                    // Notify only students
                    for (const member of members) {
                        if (member.uid !== user.uid && member.role === 'student') {
                            if (member.uid === note.authorId) postOwnerNotified = true;

                            await createNotification({
                                userId: member.uid,
                                type: 'mention',
                                title: language === 'tr' ? '@student ile etiketlendiniz' : 'You were mentioned via @student',
                                message: `${user.displayName}: "${newComment.trim().substring(0, 50)}${newComment.trim().length > 50 ? '...' : ''}"`,
                                fromUserId: user.uid,
                                fromUserName: user.displayName,
                                boardId: note.boardId,
                                boardTitle: boardTitle,
                                noteId: note.id,
                                commentId: newCommentId,
                            });
                        }
                    }
                } else if (lowerContent.includes('@teacher')) {
                    // Notify only teachers
                    for (const member of members) {
                        if (member.uid !== user.uid && (member.role === 'teacher' || member.role === 'admin')) {
                            if (member.uid === note.authorId) postOwnerNotified = true;

                            await createNotification({
                                userId: member.uid,
                                type: 'mention',
                                title: language === 'tr' ? '@teacher ile etiketlendiniz' : 'You were mentioned via @teacher',
                                message: `${user.displayName}: "${newComment.trim().substring(0, 50)}${newComment.trim().length > 50 ? '...' : ''}"`,
                                fromUserId: user.uid,
                                fromUserName: user.displayName,
                                boardId: note.boardId,
                                boardTitle: boardTitle,
                                noteId: note.id,
                                commentId: newCommentId,
                            });
                        }
                    }
                } else {
                    // Regular individual mentions
                    // Check if we are mentioning the post owner
                    const ownerMember = members.find(m => m.uid === note.authorId);
                    if (ownerMember && ownerMember.uid !== user.uid) {
                        const mentionTag = `@${ownerMember.displayName.toLowerCase()}`;
                        if (lowerContent.includes(mentionTag)) {
                            postOwnerNotified = true;
                        }
                    }

                    await createMentionNotifications(
                        newComment.trim(),
                        targetMembers,
                        user.uid,
                        user.displayName,
                        note.boardId,
                        boardTitle,
                        note.id,
                        newCommentId // Pass commentId for highlighting
                    );
                }
            }

            // NEW: If post owner is someone else and hasn't been notified yet (via reply or mention)
            if (note.authorId !== user.uid && !postOwnerNotified) {
                await createNotification({
                    userId: note.authorId,
                    type: 'new_comment',
                    title: language === 'tr' ? 'Gönderine yorum yapıldı' : 'Comment on your post',
                    message: `${user.displayName}: "${newComment.trim().substring(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
                    fromUserId: user.uid,
                    fromUserName: user.displayName,
                    boardId: note.boardId,
                    noteId: note.id,
                    commentId: newCommentId,
                });
            }

            setNewComment('');
            setReplyTo(null);
        } catch (error) {
            console.error('Yorum eklenemedi:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        const confirmText = language === 'tr'
            ? 'Yorumu silmek istediğinize emin misiniz?'
            : 'Are you sure you want to delete this comment?';
        if (!confirm(confirmText)) return;
        try {
            await deleteComment(commentId);
        } catch (error) {
            console.error('Yorum silinemedi:', error);
        }
    };

    // Handle like/unlike comment
    const handleLikeComment = async (comment: Comment) => {
        if (!user) return;
        try {
            const isLiked = comment.likes?.includes(user.uid);
            if (isLiked) {
                await unlikeComment(comment.id, user.uid);
            } else {
                await likeComment(comment.id, user.uid);

                // Send notification to comment author (if not liking own comment)
                if (comment.authorId !== user.uid) {
                    await createNotification({
                        userId: comment.authorId,
                        type: 'like',
                        title: language === 'tr' ? 'Yorumunuz beğenildi' : 'Your comment was liked',
                        message: `${user.displayName} ${language === 'tr' ? 'yorumunuzu beğendi' : 'liked your comment'}: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
                        fromUserId: user.uid,
                        fromUserName: user.displayName,
                        boardId: note.boardId,
                        noteId: note.id,
                        commentId: comment.id, // Link to the liked comment
                    });
                }
            }
        } catch (error) {
            console.error('Beğeni hatası:', error);
        }
    };

    // Handle text input and detect @ mentions
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        setNewComment(value);

        // Find last @ before cursor
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            // Check if there's a space after @ (means mention ended)
            if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
                setShowMentions(true);
                setMentionQuery(textAfterAt);
                setMentionStartIndex(lastAtIndex);
                return;
            }
        }

        setShowMentions(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
    };

    // Handle selecting a mention from the dropdown
    const handleSelectMention = (member: { displayName: string }) => {
        if (mentionStartIndex === -1) return;

        const beforeMention = newComment.substring(0, mentionStartIndex);
        const afterMention = newComment.substring(mentionStartIndex + mentionQuery.length + 1);
        const newText = `${beforeMention}@${member.displayName} ${afterMention}`;

        setNewComment(newText);
        setShowMentions(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
        inputRef.current?.focus();
    };

    // Close on escape key
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

            {/* Drawer */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out flex flex-col pb-safe",
                    isOpen ? 'translate-x-0' : 'translate-x-full invisible'
                )}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
                {/* Header */}
                <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="text-stone-500" size={20} />
                        <h3 className="font-semibold text-stone-800">{t('note.comments')}</h3>
                        <span className="bg-stone-200 text-stone-600 text-xs px-2 py-0.5 rounded-full font-medium">
                            {comments.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Note Context (Small preview of what we are commenting on) */}
                <div className="p-4 bg-stone-50/50 border-b border-stone-100 text-sm text-stone-600 italic border-l-4 border-l-stone-300 mx-4 mt-4 rounded-r-lg">
                    <div className="line-clamp-2">
                        {note.content || (language === 'tr' ? '(Görsel/Link)' : '(Image/Link)')}
                    </div>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-10 text-stone-400">
                            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                                {language === 'tr'
                                    ? <>Henüz yorum yok.<br />Ilk yorumu sen yaz!</>
                                    : <>No comments yet.<br />Be the first to comment!</>}
                            </p>
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const isHighlighted = highlightedCommentId === comment.id;
                            const isSwiping = swipingCommentId === comment.id;
                            return (
                                <div
                                    key={comment.id}
                                    id={`comment-${comment.id}`}
                                    className="relative overflow-hidden"
                                >
                                    {/* Swipe Reply Indicator */}
                                    <div
                                        className={cn(
                                            "absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full text-white transition-all",
                                            isSwiping && swipeOffset > 30 ? "opacity-100 scale-100" : "opacity-0 scale-75"
                                        )}
                                    >
                                        <Reply size={16} />
                                    </div>

                                    <div className="flex gap-3 group"
                                        onTouchStart={(e) => handleTouchStart(e, comment)}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={() => handleTouchEnd(comment)}
                                        style={{
                                            transform: isSwiping ? `translateX(-${swipeOffset}px)` : 'translateX(0)',
                                            transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
                                        }}
                                    >
                                        <Avatar
                                            src={comment.authorPhotoURL}
                                            name={comment.authorName}
                                            size="sm"
                                        />
                                        <div className="flex-1">
                                            <div className={cn(
                                                "p-3 rounded-2xl rounded-tl-none border transition-all duration-500",
                                                isHighlighted
                                                    ? "bg-sky-200 border-sky-300"
                                                    : "bg-stone-50 border-stone-100"
                                            )}>
                                                {/* Replied Comment Preview - Inside Bubble */}
                                                {comment.replyToContent && comment.replyToId && (
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); scrollToComment(comment.replyToId!); }}
                                                        className="mb-2 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] border-l-2 bg-stone-100 border-l-indigo-400 hover:bg-stone-200 max-w-[200px] overflow-hidden"
                                                    >
                                                        <div className="font-semibold text-[10px] mb-0.5 text-indigo-600 truncate">
                                                            {comment.replyToAuthor}
                                                        </div>
                                                        <div className="truncate text-stone-500">
                                                            {comment.replyToContent}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-stone-800">
                                                        {comment.authorName}
                                                    </span>
                                                    <span className="text-[10px] text-stone-400">
                                                        {formatDate(comment.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-stone-600 break-words leading-relaxed">
                                                    <MentionText text={comment.content} members={members} />
                                                </p>

                                                {/* Actions Row - Inside Bubble */}
                                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-stone-100">
                                                    {/* Like Button */}
                                                    <button
                                                        onClick={() => handleLikeComment(comment)}
                                                        className={cn(
                                                            "text-[10px] transition-colors flex items-center gap-1",
                                                            comment.likes?.includes(user?.uid || '')
                                                                ? "text-rose-500"
                                                                : "text-stone-400 hover:text-rose-500"
                                                        )}
                                                    >
                                                        <Heart
                                                            size={12}
                                                            fill={comment.likes?.includes(user?.uid || '') ? 'currentColor' : 'none'}
                                                        />
                                                        {(comment.likes?.length || 0) > 0 && (
                                                            <span className="font-medium">{comment.likes?.length}</span>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleReplyClick(comment)}
                                                        className="text-[10px] text-stone-400 hover:text-indigo-600 transition-colors flex items-center gap-0.5"
                                                    >
                                                        <Reply size={10} />
                                                        <span>{t('note.reply')}</span>
                                                    </button>
                                                    {(user?.uid === comment.authorId || user?.role === 'teacher' || user?.role === 'admin') && (
                                                        <button
                                                            onClick={() => handleDelete(comment.id)}
                                                            className="text-[10px] text-stone-400 hover:text-red-500 transition-colors flex items-center gap-0.5"
                                                        >
                                                            <Trash2 size={10} />
                                                            <span>{t('common.delete')}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer / Input */}
                <div className="p-4 border-t border-stone-200 bg-white">
                    {user && canComment ? (
                        <div>
                            {/* Reply Preview */}
                            {replyTo && (
                                <div className="flex items-center justify-between bg-stone-100 border border-stone-200 rounded-lg px-3 py-2 mb-2 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center gap-2 text-xs text-stone-600 min-w-0">
                                        <CornerUpLeft size={14} className="shrink-0" />
                                        <span className="font-semibold shrink-0">{replyTo.authorName}</span>
                                        <span className="truncate text-stone-400">{replyTo.content}</span>
                                    </div>
                                    <button onClick={cancelReply} className="p-1 text-stone-400 hover:text-stone-600 shrink-0">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
                                <div className="relative flex-1">
                                    {/* Mention Autocomplete Dropdown */}
                                    {showMentions && (filteredSpecialMentions.length > 0 || mentionSuggestions.length > 0) && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-64 overflow-y-auto w-full min-w-[250px]">
                                            {/* Special Group Mentions */}
                                            {filteredSpecialMentions.length > 0 && (
                                                <>
                                                    <div className="p-2 border-b border-stone-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                                                        <span className="text-xs text-indigo-600 font-semibold">
                                                            {language === 'tr' ? 'Grup Etiketleri' : 'Group Mentions'}
                                                        </span>
                                                    </div>
                                                    {filteredSpecialMentions.map((special) => (
                                                        <button
                                                            key={special.uid}
                                                            type="button"
                                                            onClick={() => handleSelectMention(special)}
                                                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-stone-50 transition-colors text-left"
                                                        >
                                                            <div className={cn(
                                                                "w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0",
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

                                            {mentionSuggestions.length > 0 && (
                                                <>
                                                    <div className="p-2 border-b border-stone-100 bg-stone-50">
                                                        <span className="text-xs text-stone-500 font-medium">
                                                            {t('board.members')}
                                                        </span>
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
                                                                    {member.role === 'teacher' || member.role === 'admin'
                                                                        ? (member.role === 'admin' ? t('board.admin') : t('board.teacher'))
                                                                        : t('board.member')}
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
                                        value={newComment}
                                        onChange={handleInputChange}
                                        placeholder={replyTo
                                            ? (language === 'tr'
                                                ? `${replyTo.authorName}'a yanıt...`
                                                : `Reply to ${replyTo.authorName}...`)
                                            : (language === 'tr'
                                                ? "Yorum yap... (@ile bahset)"
                                                : "Add a comment... (@mention)")}
                                        className="w-full pl-4 pr-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent placeholder:text-stone-400 resize-none custom-scrollbar"
                                        rows={2}
                                        style={{ minHeight: '50px', maxHeight: '100px' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                                                e.preventDefault();
                                                handleSubmit(e);
                                            }
                                            if (e.key === 'Escape' && showMentions) {
                                                setShowMentions(false);
                                            }
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || isLoading}
                                    className="p-3 bg-stone-800 text-white rounded-full hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-matte mb-1"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    ) : user && !canComment ? (
                        <div className="text-center p-3 bg-amber-50 rounded-lg border border-dashed border-amber-200">
                            <p className="text-sm text-amber-600">
                                {language === 'tr' ? 'Yorum yapma izniniz yok' : 'You don\'t have permission to comment'}
                            </p>
                        </div>
                    ) : (
                        <p className="text-center text-sm text-stone-500">
                            {language === 'tr'
                                ? 'Yorum yapmak için giriş yapmalısınız.'
                                : 'You must log in to comment.'}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
