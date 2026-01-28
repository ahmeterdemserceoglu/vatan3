'use client';

import { useState, useEffect } from 'react';
import { Comment } from '@/types';
import { addComment, deleteComment, subscribeToNoteComments } from '@/lib/sections';
import { useStore } from '@/store/useStore';
import { formatDate } from '@/lib/utils';
import { Send, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';

interface NoteCommentsProps {
    noteId: string;
    boardId: string;
}

export function NoteComments({ noteId, boardId }: NoteCommentsProps) {
    const { user } = useStore();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToNoteComments(noteId, (data) => {
            setComments(data);
        });
        return () => unsubscribe();
    }, [noteId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;

        setIsLoading(true);
        try {
            await addComment(noteId, boardId, user.uid, user.displayName, user.photoURL, newComment.trim());
            setNewComment('');
        } catch (error) {
            console.error('Yorum eklenemedi:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Yorumu silmek istediğinize emin misiniz?')) return;
        try {
            await deleteComment(commentId);
        } catch (error) {
            console.error('Yorum silinemedi:', error);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-stone-200/50">
            <h4 className="text-xs font-semibold text-stone-500 mb-3 uppercase tracking-wider">
                Yorumlar ({comments.length})
            </h4>

            {/* Comment List */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">Henüz yorum yok.</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2 group">
                            <Avatar
                                src={comment.authorPhotoURL}
                                name={comment.authorName}
                                size="xs"
                            />
                            <div className="flex-1">
                                <div className="bg-stone-50 p-2 rounded-lg rounded-tl-none">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-stone-700">
                                            {comment.authorName}
                                        </span>
                                        <span className="text-[10px] text-stone-400">
                                            {formatDate(comment.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-stone-600 break-words">{comment.content}</p>
                                </div>
                                {(user?.uid === comment.authorId || user?.role === 'teacher' || user?.role === 'admin') && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="text-[10px] text-stone-400 hover:text-red-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Sil
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Comment Form */}
            {user && (
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Yorum yap..."
                        className="w-full pl-3 pr-10 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-400"
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 disabled:opacity-50 transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </form>
            )}
        </div>
    );
}
