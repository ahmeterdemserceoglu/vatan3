'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/Header';
import { createBoard } from '@/lib/boards';
import { BOARD_COLORS, BOARD_GRADIENTS, BOARD_IMAGES } from '@/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, FileText, Shield, Globe, Lock, UserPlus, PenTool, Palette, Plus, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewBoardPage() {
    const { user } = useStore();
    const router = useRouter();
    const { t, language } = useTranslation();

    // Board Basic Info
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [backgroundColor, setBackgroundColor] = useState(BOARD_COLORS[0]);
    const [backgroundGradient, setBackgroundGradient] = useState(BOARD_GRADIENTS[0]);
    const [backgroundImage, setBackgroundImage] = useState(BOARD_IMAGES[0]);
    const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'image'>('color');

    // Privacy & Permissions
    const [isPublic, setIsPublic] = useState(true); // true = Herkese Açık, false = Gizli (Sadece Üyeler)
    const [requireApproval, setRequireApproval] = useState(false); // Üyelik onayı gereksin mi?
    const [whoCanEdit, setWhoCanEdit] = useState<'everyone' | 'members'>('members'); // Kimler not ekleyebilir?
    const [whoCanComment, setWhoCanComment] = useState<'everyone' | 'members'>('members');

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const boardId = await createBoard(title, user.uid, user.displayName, {
                description,
                backgroundColor,
                backgroundGradient,
                backgroundImage,
                backgroundType,
                isPublic,
                permissions: {
                    whoCanAddNotes: whoCanEdit,
                    whoCanComment: whoCanComment,
                    whoCanChat: 'everyone',
                    allowFileDownload: true,
                    requireMemberApproval: requireApproval,
                }
            });
            router.push(`/board/${boardId}`);
        } catch (error) {
            console.error('Board creation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        router.push('/auth/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <Header />
            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm mb-6 transition-colors"
                >
                    <ArrowLeft size={16} />
                    {t('common.back')}
                </button>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white">
                        <Plus size={20} />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-800">{t('createBoardModal.title')}</h1>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column: Form Inputs */}
                    <div className="lg:col-span-7 space-y-10">
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-stone-200">
                                <FileText size={18} className="text-stone-900" />
                                <h2 className="font-bold text-stone-900 text-sm uppercase tracking-widest">
                                    {language === 'tr' ? 'Temel Bilgiler' : 'Basic Info'}
                                </h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
                                        {t('createBoardModal.boardTitle')}
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={language === 'tr' ? 'Pano adını giriniz...' : 'Enter board title...'}
                                        className="w-full px-0 py-2 bg-transparent border-b border-stone-200 text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-stone-900 transition-colors font-medium text-xl"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
                                        {t('createBoardModal.description')}
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder={language === 'tr' ? 'Kısa bir açıklama yazın...' : 'Write a short description...'}
                                        rows={2}
                                        className="w-full px-0 py-2 bg-transparent border-b border-stone-200 text-stone-700 placeholder:text-stone-300 focus:outline-none focus:border-stone-900 resize-none transition-colors"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-stone-200">
                                <Shield size={18} className="text-stone-900" />
                                <h2 className="font-bold text-stone-900 text-sm uppercase tracking-widest">
                                    {language === 'tr' ? 'Ayarlar' : 'Settings'}

                                </h2>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsPublic(true)}
                                            className={cn(
                                                "p-6 rounded-xl border-2 text-left transition-all",
                                                isPublic
                                                    ? "border-stone-900 bg-stone-900 text-white shadow-lg"
                                                    : "border-stone-100 hover:border-stone-200 bg-white text-stone-900"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <Globe size={18} />
                                                <span className="font-bold">
                                                    {language === 'tr' ? 'Herkese Açık' : 'Public'}
                                                </span>
                                            </div>
                                            <p className={cn("text-xs leading-relaxed opacity-60", isPublic ? "text-stone-100" : "text-stone-500")}>
                                                {language === 'tr' ? 'Bağlantısı olan herkes görüntüleyebilir.' : 'Anyone with the link can view.'}
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsPublic(false)}
                                            className={cn(
                                                "p-6 rounded-xl border-2 text-left transition-all",
                                                !isPublic
                                                    ? "border-stone-900 bg-stone-900 text-white shadow-lg"
                                                    : "border-stone-100 hover:border-stone-200 bg-white text-stone-900"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <Lock size={18} />
                                                <span className="font-bold">
                                                    {language === 'tr' ? 'Özel' : 'Private'}
                                                </span>
                                            </div>
                                            <p className={cn("text-xs leading-relaxed opacity-60", !isPublic ? "text-stone-100" : "text-stone-500")}>
                                                {language === 'tr' ? 'Sadece onaylı üyeler erişebilir.' : 'Only approved members can access.'}
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-4 border-b border-stone-50">
                                        <div className="flex items-center gap-4">
                                            <UserPlus size={18} className="text-stone-400" />
                                            <div>
                                                <p className="font-bold text-stone-900 text-sm">
                                                    {language === 'tr' ? 'Onay Sistemi' : 'Approval System'}
                                                </p>
                                                <p className="text-xs text-stone-500">
                                                    {language === 'tr' ? 'Yeni üyelikler onaya düşsün.' : 'New members require approval.'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setRequireApproval(!requireApproval)}
                                            className={cn(
                                                "w-10 h-5 rounded-full transition-all relative inline-flex items-center px-1",
                                                requireApproval ? "bg-stone-900" : "bg-stone-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "bg-white w-3 h-3 rounded-full transition-transform",
                                                requireApproval ? "translate-x-5" : "translate-x-0"
                                            )} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-4 border-b border-stone-50">
                                        <div className="flex items-center gap-4">
                                            <PenTool size={18} className="text-stone-400" />
                                            <div>
                                                <p className="font-bold text-stone-900 text-sm">
                                                    {language === 'tr' ? 'Yetki' : 'Permission'}
                                                </p>
                                                <p className="text-xs text-stone-500">
                                                    {language === 'tr' ? 'Kimler not paylaşabilir?' : 'Who can share notes?'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {[
                                                { id: 'everyone', label: language === 'tr' ? 'HERKES' : 'ALL' },
                                                { id: 'members', label: language === 'tr' ? 'ÜYELER' : 'MEMBERS' }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setWhoCanEdit(opt.id as any)}
                                                    className={cn(
                                                        "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all border",
                                                        whoCanEdit === opt.id
                                                            ? "bg-stone-900 border-stone-900 text-white"
                                                            : "bg-white border-stone-200 text-stone-400 hover:text-stone-900"
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Preview & Palette */}
                    <div className="lg:col-span-5 space-y-10">
                        <section className="space-y-4">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest text-center">
                                {language === 'tr' ? 'Önizleme' : 'Preview'}
                            </label>

                            <div className="relative aspect-[4/3] w-full bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center p-8 overflow-hidden">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                    style={{ backgroundImage: `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

                                <div
                                    className="relative w-full max-w-[200px] aspect-square shadow-2xl p-6 flex flex-col justify-between transition-all duration-500 overflow-hidden"
                                    style={{
                                        backgroundColor: backgroundType === 'gradient' ? undefined : backgroundColor,
                                        backgroundImage: backgroundType === 'gradient'
                                            ? backgroundGradient
                                            : backgroundType === 'image'
                                                ? `url(${backgroundImage})`
                                                : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] pointer-events-none" />
                                    <div className="relative z-10 w-1.5 h-1.5 rounded-full bg-stone-900/10 mx-auto" />

                                    <div className="relative z-10 space-y-2">
                                        <h3 className="font-bold text-stone-900 line-clamp-2 text-base leading-tight">
                                            {title || (language === 'tr' ? 'Başlık...' : 'Title...')}
                                        </h3>
                                        <p className="text-stone-900/60 text-xs line-clamp-3 leading-snug">
                                            {description || (language === 'tr' ? 'Açıklama...' : 'Description...')}
                                        </p>
                                    </div>

                                    <div className="relative z-10 flex items-center gap-2 opacity-30 mt-4">
                                        {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                                        <div className="h-px flex-1 bg-stone-900" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex p-1 bg-white border border-stone-200 rounded-xl w-full mb-6">
                                {(['color', 'gradient', 'image'] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setBackgroundType(type)}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all",
                                            backgroundType === type
                                                ? "bg-stone-900 text-white shadow-md"
                                                : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                                        )}
                                    >
                                        {type === 'color' && <Palette size={12} />}
                                        {type === 'gradient' && <Sparkles size={12} />}
                                        {type === 'image' && <ImageIcon size={12} />}
                                        {type === 'color' ? (language === 'tr' ? 'RENK' : 'COLOR') :
                                            type === 'gradient' ? (language === 'tr' ? 'GRADIENT' : 'GRADIENT') :
                                                (language === 'tr' ? 'RESİM' : 'IMAGE')}
                                    </button>
                                ))}
                            </div>

                            {/* Color Selection */}
                            {backgroundType === 'color' && (
                                <div className="flex flex-wrap justify-center gap-3 animate-in fade-in duration-300">
                                    {BOARD_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setBackgroundColor(color)}
                                            className={cn(
                                                'w-8 h-8 rounded-full border-2 transition-all',
                                                backgroundColor === color
                                                    ? 'border-stone-900 scale-125'
                                                    : 'border-transparent hover:scale-110'
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                    <div className="relative w-8 h-8">
                                        <input
                                            type="color"
                                            value={backgroundColor}
                                            onChange={(e) => setBackgroundColor(e.target.value)}
                                            className={cn(
                                                "w-full h-full rounded-full cursor-pointer border-2 appearance-none shadow-sm",
                                                !BOARD_COLORS.includes(backgroundColor) ? "border-stone-900 scale-125" : "border-stone-200"
                                            )}
                                            style={{ padding: 0 }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Gradient Selection */}
                            {backgroundType === 'gradient' && (
                                <div className="grid grid-cols-5 gap-2 animate-in fade-in duration-300">
                                    {BOARD_GRADIENTS.map((grad, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setBackgroundGradient(grad)}
                                            className={cn(
                                                'aspect-square rounded-lg border-2 transition-all',
                                                backgroundGradient === grad
                                                    ? 'border-stone-900 scale-110 shadow-md'
                                                    : 'border-transparent hover:scale-105'
                                            )}
                                            style={{ backgroundImage: grad }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Image Selection */}
                            {backgroundType === 'image' && (
                                <div className="grid grid-cols-4 gap-2 animate-in fade-in duration-300">
                                    {BOARD_IMAGES.map((img, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setBackgroundImage(img)}
                                            className={cn(
                                                'aspect-video rounded-lg border-2 transition-all relative overflow-hidden',
                                                backgroundImage === img
                                                    ? 'border-stone-900 scale-105 shadow-md'
                                                    : 'border-transparent hover:scale-102'
                                            )}
                                        >
                                            <img src={img} alt="preset" className="w-full h-full object-cover" />
                                            {backgroundImage === img && (
                                                <div className="absolute inset-0 bg-stone-900/20 flex items-center justify-center">
                                                    <Check size={14} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="space-y-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading || !title.trim()}
                                className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-stone-900/10"
                            >
                                {loading ? t('createBoardModal.creating') : (language === 'tr' ? 'PANOYU OLUŞTUR' : 'CREATE BOARD')}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="w-full py-4 bg-transparent text-stone-400 rounded-xl font-bold hover:text-stone-900 transition-all text-sm"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
