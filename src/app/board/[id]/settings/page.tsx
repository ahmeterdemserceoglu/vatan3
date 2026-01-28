'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/Header';
import { getBoard, updateBoard, deleteBoard } from '@/lib/boards';
import { Board, BOARD_COLORS, BOARD_GRADIENTS, BOARD_IMAGES } from '@/types';
import { cn } from '@/lib/utils';
import { Trash2, ArrowLeft, Shield, MessageSquare, FileText, Download, UserCheck, Users, Lock, Unlock, Globe, UsersRound, GraduationCap, Eye, EyeOff, StickyNote, MessageCircle, Clock, History, Palette, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import { CloudinaryUploadWidget } from '@/components/CloudinaryUploadWidget';
import { useTranslation } from '@/hooks/useTranslation';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { DeleteBoardModal } from '@/components/DeleteBoardModal';
import { logActivity } from '@/lib/activityLog';

export default function BoardSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoading } = useStore();
    const { t, language } = useTranslation();
    const [board, setBoard] = useState<Board | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [backgroundColor, setBackgroundColor] = useState('');
    const [backgroundGradient, setBackgroundGradient] = useState('');
    const [backgroundImage, setBackgroundImage] = useState('');
    const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'image'>('color');
    const [isPublic, setIsPublic] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // İzin Ayarları State'leri
    const [whoCanComment, setWhoCanComment] = useState<'everyone' | 'members'>('everyone');
    const [whoCanAddNotes, setWhoCanAddNotes] = useState<'everyone' | 'members'>('members');
    const [whoCanChat, setWhoCanChat] = useState<'everyone' | 'members'>('everyone');
    const [allowFileDownload, setAllowFileDownload] = useState(true);
    const [requireMemberApproval, setRequireMemberApproval] = useState(false);

    // Activity Log Modal
    const [showActivityLog, setShowActivityLog] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const boardId = params.id as string;

    useEffect(() => {
        if (!isLoading) {
            loadBoard();
        }
    }, [boardId, isLoading, user?.uid]);

    const loadBoard = async () => {
        try {
            const boardData = await getBoard(boardId);
            if (!boardData) {
                router.push('/dashboard');
                return;
            }

            // Owner veya öğretmenler/adminler ayarlara erişebilir
            const isOwner = boardData.ownerId === user?.uid;
            const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

            if (!isOwner && !isTeacher && !isLoading) {
                router.push(`/board/${boardId}`);
                return;
            }
            setBoard(boardData);
            setTitle(boardData.title);
            setDescription(boardData.description || '');
            setBackgroundColor(boardData.backgroundColor);
            setBackgroundGradient(boardData.backgroundGradient || '');
            setBackgroundImage(boardData.backgroundImage || '');
            setBackgroundType(boardData.backgroundType || (boardData.backgroundImage ? 'image' : 'color'));
            setIsPublic(boardData.isPublic);

            // İzin ayarlarını yükle
            if (boardData.permissions) {
                setWhoCanComment(boardData.permissions.whoCanComment || 'everyone');
                setWhoCanAddNotes(boardData.permissions.whoCanAddNotes || 'members');
                setWhoCanChat(boardData.permissions.whoCanChat || 'everyone');
                setAllowFileDownload(boardData.permissions.allowFileDownload ?? true);
                setRequireMemberApproval(boardData.permissions.requireMemberApproval || false);
            }
        } catch (error) {
            console.error('Board load failed:', error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!board) return;

        setIsSaving(true);
        try {
            await updateBoard(boardId, {
                title,
                description,
                backgroundColor,
                backgroundGradient,
                backgroundImage,
                backgroundType,
                isPublic,
                permissions: {
                    whoCanComment,
                    whoCanAddNotes,
                    whoCanChat,
                    allowFileDownload,
                    requireMemberApproval,
                    pendingMembers: board.permissions?.pendingMembers || [],
                }
            });

            // Log activity
            if (user) {
                await logActivity({
                    userId: user.uid,
                    userName: user.displayName || 'Anonymous',
                    type: 'settings_change',
                    description: language === 'tr' ? 'Pano ayarlarını güncelledi' : 'Updated board settings',
                    metadata: {
                        boardId,
                        boardTitle: title
                    }
                });
            }

            router.push(`/board/${boardId}`);
        } catch (error) {
            console.error('Board update failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteSuccess = () => {
        router.push('/dashboard');
    };

    if (!board) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-2xl mx-auto px-4 py-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft size={18} />
                    {t('common.back')}
                </button>

                <h1 className="text-2xl font-bold mb-6">
                    {language === 'tr' ? 'Pano Ayarları' : 'Board Settings'}
                </h1>

                <form onSubmit={handleSave} className="bg-white rounded-xl p-6 shadow-sm space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('board.title')}</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('board.description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Appearance / Background Customization */}
                    <div className="space-y-6 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <Palette size={20} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {language === 'tr' ? 'Pano Görünümü' : 'Board Appearance'}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {language === 'tr' ? 'Panonuzun arka planını özelleştirin' : 'Customize your board background'}
                                </p>
                            </div>
                        </div>

                        {/* Background Type Toggles */}
                        <div className="flex p-1 bg-gray-100 rounded-xl w-full max-w-sm">
                            {(['color', 'gradient', 'image'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setBackgroundType(type)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                        backgroundType === type
                                            ? "bg-white text-indigo-600 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                    )}
                                >
                                    {type === 'color' && <Palette size={14} />}
                                    {type === 'gradient' && <Sparkles size={14} />}
                                    {type === 'image' && <ImageIcon size={14} />}
                                    {type === 'color' ? (language === 'tr' ? 'Renk' : 'Color') :
                                        type === 'gradient' ? (language === 'tr' ? 'Gradient' : 'Gradient') :
                                            (language === 'tr' ? 'Resim' : 'Image')}
                                </button>
                            ))}
                        </div>

                        {/* Color Picker */}
                        {backgroundType === 'color' && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex flex-wrap items-center gap-3">
                                    {BOARD_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setBackgroundColor(color)}
                                            className={cn(
                                                'w-12 h-12 rounded-xl border-2 transition-all shadow-sm',
                                                backgroundColor === color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105'
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                    <div className="relative group">
                                        <input
                                            type="color"
                                            value={backgroundColor || '#f5f5f4'}
                                            onChange={(e) => setBackgroundColor(e.target.value)}
                                            className={cn(
                                                "w-12 h-12 rounded-xl cursor-pointer border-2 transition-all appearance-none shadow-sm",
                                                !BOARD_COLORS.includes(backgroundColor) ? 'border-indigo-500 scale-110' : 'border-gray-200 hover:scale-105'
                                            )}
                                            title={language === 'tr' ? 'Özel renk seç' : 'Pick custom color'}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {language === 'tr'
                                        ? 'Hazır renklerden seçin veya özel bir renk belirleyin.'
                                        : 'Choose from presets or pick a custom color.'}
                                </p>
                            </div>
                        )}

                        {/* Gradient Picker */}
                        {backgroundType === 'gradient' && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    {BOARD_GRADIENTS.map((grad, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setBackgroundGradient(grad)}
                                            className={cn(
                                                'aspect-[4/3] rounded-xl border-2 transition-all shadow-sm',
                                                backgroundGradient === grad ? 'border-indigo-500 scale-105 shadow-md' : 'border-transparent hover:scale-102'
                                            )}
                                            style={{ backgroundImage: grad }}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {language === 'tr'
                                        ? 'Profesyonel görünüm için şık renk geçişleri kullanın.'
                                        : 'Use sleek color transitions for a professional look.'}
                                </p>
                            </div>
                        )}

                        {/* Image Picker */}
                        {backgroundType === 'image' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                {/* Preset Images */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {BOARD_IMAGES.map((img, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setBackgroundImage(img)}
                                            className={cn(
                                                'aspect-video rounded-xl border-2 transition-all shadow-sm overflow-hidden relative group',
                                                backgroundImage === img ? 'border-indigo-500 scale-105 shadow-md' : 'border-transparent hover:scale-102'
                                            )}
                                        >
                                            <img src={img} alt="preset" className="w-full h-full object-cover" />
                                            {backgroundImage === img && (
                                                <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                                                    <Check size={20} className="text-indigo-600 bg-white rounded-full p-0.5" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Image Upload */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 space-y-3">
                                    {backgroundImage && !BOARD_IMAGES.includes(backgroundImage) && (
                                        <div className="relative aspect-video w-full max-w-xs rounded-lg overflow-hidden border border-gray-200 mb-3 shadow-sm mx-auto">
                                            <img src={backgroundImage} alt="custom" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setBackgroundImage('')}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center">
                                        <CloudinaryUploadWidget
                                            onUploadSuccess={(url) => setBackgroundImage(url)}
                                            uploadPreset="board_background"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2">
                                            {language === 'tr' ? 'Veya kendi yüksek kaliteli görselinizi yükleyin' : 'Or upload your own high-quality image'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                            />
                            <div>
                                <span className="font-medium">
                                    {language === 'tr' ? 'Herkese Açık' : 'Public'}
                                </span>
                                <p className="text-sm text-gray-500">
                                    {language === 'tr'
                                        ? 'Linki olan herkes panoyu görebilir'
                                        : 'Anyone with the link can view the board'}
                                </p>
                            </div>
                        </label>
                    </div>
                </form>

                {/* Gizlilik & İzinler Bölümü */}
                <div className="mt-8 bg-white rounded-xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                        <Shield size={20} className="text-gray-700" />
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {language === 'tr' ? 'Gizlilik & İzinler' : 'Privacy & Permissions'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {language === 'tr' ? 'Panoya erişim ve izinleri yönetin' : 'Manage board access and permissions'}
                            </p>
                        </div>
                    </div>

                    {/* Yorum İzinleri */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={16} className="text-gray-600" />
                            <label className="block text-sm font-medium text-gray-700">
                                {language === 'tr' ? 'Yorum Yapma İzni' : 'Comment Permission'}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            {language === 'tr' ? 'Notlara kimler yorum yapabilir?' : 'Who can comment on notes?'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'everyone', icon: Globe, label: language === 'tr' ? 'Linki Olan Herkes' : 'Everyone with Link' },
                                { value: 'members', icon: UsersRound, label: language === 'tr' ? 'Sadece Üyeler' : 'Members Only' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setWhoCanComment(option.value as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                        whoCanComment === option.value
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                                    )}
                                >
                                    <option.icon size={16} />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Not Ekleme İzinleri */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <StickyNote size={16} className="text-gray-600" />
                            <label className="block text-sm font-medium text-gray-700">
                                {language === 'tr' ? 'Not Ekleme İzni' : 'Note Adding Permission'}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            {language === 'tr' ? 'Panoya kimler not ekleyebilir?' : 'Who can add notes to the board?'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'everyone', icon: Globe, label: language === 'tr' ? 'Linki Olan Herkes' : 'Everyone with Link' },
                                { value: 'members', icon: UsersRound, label: language === 'tr' ? 'Sadece Üyeler' : 'Members Only' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setWhoCanAddNotes(option.value as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                        whoCanAddNotes === option.value
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                                    )}
                                >
                                    <option.icon size={16} />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat İzinleri */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <MessageCircle size={16} className="text-gray-600" />
                            <label className="block text-sm font-medium text-gray-700">
                                {language === 'tr' ? 'Chat Yazma İzni' : 'Chat Permission'}
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            {language === 'tr' ? 'Sohbete kimler mesaj yazabilir?' : 'Who can send messages in the chat?'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'everyone', icon: Globe, label: language === 'tr' ? 'Linki Olan Herkes' : 'Everyone with Link' },
                                { value: 'members', icon: UsersRound, label: language === 'tr' ? 'Sadece Üyeler' : 'Members Only' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setWhoCanChat(option.value as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                        whoCanChat === option.value
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                                    )}
                                >
                                    <option.icon size={16} />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dosya İndirme İzni */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allowFileDownload}
                                onChange={(e) => setAllowFileDownload(e.target.checked)}
                                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <Download size={16} className="text-gray-600" />
                                    <span className="font-medium">
                                        {language === 'tr' ? 'Dosya İndirme' : 'File Download'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {language === 'tr' ? 'Kullanıcılar dosyaları indirebilir' : 'Users can download files'}
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Üyelik Onayı */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={requireMemberApproval}
                                onChange={(e) => setRequireMemberApproval(e.target.checked)}
                                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <UserCheck size={16} className="text-gray-600" />
                                    <span className="font-medium">
                                        {language === 'tr' ? 'Üyelik Onayı Gerekli' : 'Member Approval Required'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {language === 'tr' ? 'Yeni üyeler panoya katılmadan önce onay gerekir' : 'New members require approval before joining'}
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Kaydet Butonu */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        {isSaving
                            ? (language === 'tr' ? 'Kaydediliyor...' : 'Saving...')
                            : (language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes')}
                    </button>
                </div>

                {/* Aktivite Geçmişi Bölümü */}
                <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                                <History size={20} className="text-stone-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {language === 'tr' ? 'Aktivite Geçmişi' : 'Activity History'}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {language === 'tr'
                                        ? 'Pano üzerindeki tüm aktiviteleri görüntüle ve raporla'
                                        : 'View and report all activities on the board'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowActivityLog(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200 transition-colors"
                        >
                            <Clock size={16} />
                            {language === 'tr' ? 'Geçmişi Görüntüle' : 'View History'}
                        </button>
                    </div>
                </div>

                {/* Activity Log Modal */}
                <ActivityLogModal
                    isOpen={showActivityLog}
                    onClose={() => setShowActivityLog(false)}
                    boardId={boardId}
                    boardTitle={board?.title || ''}
                />

                <div className="mt-8 bg-red-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-red-700 mb-2">
                        {language === 'tr' ? 'Tehlikeli Bölge' : 'Danger Zone'}
                    </h3>
                    <p className="text-red-600 text-sm mb-4">
                        {language === 'tr'
                            ? 'Bu panoyu sildiğinizde tüm notlar da kalıcı olarak silinecektir.'
                            : 'When you delete this board, all notes will also be permanently deleted.'}
                    </p>
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Trash2 size={18} />
                        {language === 'tr' ? 'Panoyu Sil' : 'Delete Board'}
                    </button>
                </div>

                {/* Delete Board Modal */}
                <DeleteBoardModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    boardId={boardId}
                    boardTitle={board?.title || ''}
                    onDeleteSuccess={handleDeleteSuccess}
                />
            </main>
        </div>
    );
}
