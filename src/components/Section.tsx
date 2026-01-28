'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { updateSection, deleteSection, toggleSectionPin } from '@/lib/sections';
import { NoteCard } from './NoteCard';
import { Note, Section as SectionType } from '@/types';
import { MoreVertical, Edit2, Trash2, Plus, Check, X, Pin, CheckCircle, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface SectionProps {
    section: SectionType;
    notes: Note[];
    canEdit: boolean;
    canAddNote: boolean;
    isOwner?: boolean;
    boardTitle?: string;
    highlightNoteId?: string | null;
    onAddNote: (sectionId: string) => void;
    onOpenComments: (note: Note) => void;
    onMoveNote?: (note: Note) => void;
    onMoveAll?: (sectionId: string, notes: Note[]) => void;
    // Toplu silme için seçim modu
    selectionMode?: boolean;
    selectedNotes?: Set<string>;
    onToggleSelect?: (noteId: string) => void;
    // Dosya indirme izni
    canDownloadFiles?: boolean;
}

export function Section({ section, notes, canEdit, canAddNote, isOwner, boardTitle, highlightNoteId, onAddNote, onOpenComments, onMoveNote, onMoveAll, selectionMode, selectedNotes, onToggleSelect, canDownloadFiles = true }: SectionProps) {
    const { user, layout } = useStore();
    const { t, language } = useTranslation();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(section.title);
    const [showMenu, setShowMenu] = useState(false);

    // Only Owner or Teacher can manage (edit/delete) sections
    const canManageSection = isOwner || user?.role === 'teacher' || user?.role === 'admin';

    const handleUpdateTitle = async () => {
        if (!title.trim() || title === section.title) {
            setIsEditingTitle(false);
            setTitle(section.title);
            return;
        }
        try {
            await updateSection(section.id, title);
            setIsEditingTitle(false);
        } catch (error) {
            console.error('Bölüm güncellenemedi:', error);
        }
    };

    const handleDeleteSection = async () => {
        const confirmText = language === 'tr'
            ? 'Bu bölümü ve içindeki TÜM NOTLARI silmek istediğinize emin misiniz?'
            : 'Are you sure you want to delete this section and ALL NOTES inside?';
        if (!confirm(confirmText)) return;
        try {
            await deleteSection(section.id);
        } catch (error) {
            console.error('Bölüm silinemedi:', error);
        }
    };

    const handlePinSection = async () => {
        try {
            await toggleSectionPin(section.id, !section.isPinned);
            setShowMenu(false);
        } catch (error) {
            console.error('Bölüm sabitlenemedi:', error);
        }
    };

    return (
        <div id={`section-${section.id}`} className={`animate-in slide-in-from-bottom-5 duration-500 relative transition-all ${layout === 'vertical'
            ? 'w-[350px] flex-shrink-0 h-full bg-stone-100/50 rounded-xl p-3 flex flex-col max-h-[calc(100vh-180px)]'
            : 'w-full mb-10'
            } ${section.isPinned ? 'ring-2 ring-amber-400/50 rounded-xl bg-amber-50/30 p-4' : ''}`}>
            {/* Pinned Badge */}
            {section.isPinned && (
                <div className="absolute -top-3 left-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg z-10">
                    <Pin size={12} fill="currentColor" />
                    {t('section.pinned')}
                </div>
            )}
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4 pl-1">
                <div className="flex-1 mr-4">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-xl font-bold bg-white/50 border border-stone-300 rounded px-2 py-1 text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 w-full max-w-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateTitle();
                                    if (e.key === 'Escape') {
                                        setIsEditingTitle(false);
                                        setTitle(section.title);
                                    }
                                }}
                            />
                            <button
                                onClick={handleUpdateTitle}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                                <Check size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditingTitle(false);
                                    setTitle(section.title);
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <h2 className="text-xl font-bold text-stone-800 flex items-center gap-3">
                            {section.title}
                            <div className="h-px bg-stone-200 flex-1 ml-4" />
                        </h2>
                    )}
                </div>

                {/* Section Actions */}
                <div className="flex items-center gap-2">
                    {canManageSection && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-200/50 rounded-lg transition-colors"
                            >
                                <MoreVertical size={20} />
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-matte-lg border border-stone-200 py-1 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            onClick={() => {
                                                setIsEditingTitle(true);
                                                setShowMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
                                        >
                                            <Edit2 size={14} />
                                            {language === 'tr' ? 'Başlığı Düzenle' : 'Edit Title'}
                                        </button>
                                        <button
                                            onClick={handlePinSection}
                                            className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-amber-50 flex items-center gap-2"
                                        >
                                            <Pin size={14} className={section.isPinned ? 'fill-amber-500 text-amber-500' : ''} />
                                            {section.isPinned ? t('section.unpinSection') : t('section.pinSection')}
                                        </button>
                                        {notes.length > 0 && onMoveAll && (
                                            <button
                                                onClick={() => {
                                                    onMoveAll(section.id, notes);
                                                    setShowMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
                                            >
                                                <ArrowRightLeft size={14} />
                                                {language === 'tr' ? 'Tümünü Taşı' : 'Move All'}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleDeleteSection}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} />
                                            {t('section.deleteSection')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {canAddNote && (
                        <button
                            onClick={() => onAddNote(section.id)}
                            className="p-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors shadow-matte"
                            title={language === 'tr' ? 'Yeni Not Ekle' : 'Add New Note'}
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Scroll Area - Dynamic based on layout */}
            <div className={`flex gap-4 snap-x scroll-smooth custom-scrollbar ${layout === 'vertical'
                ? 'flex-col py-4 px-3 h-full overflow-y-auto'
                : 'flex-row overflow-x-auto overflow-y-visible pb-6 pt-4 px-1'
                }`}>
                {notes.map((note) => {
                    const isSelected = selectedNotes?.has(note.id) || false;

                    return (
                        <div
                            key={note.id}
                            id={`note-${note.id}`}
                            className={`flex-shrink-0 snap-start overflow-visible relative ${layout === 'vertical' ? 'w-full' : 'w-[300px]'}`}
                        >
                            {/* Seçim Modu Overlay */}
                            {selectionMode && (
                                <div
                                    onClick={() => onToggleSelect?.(note.id)}
                                    className={`absolute inset-0 z-10 cursor-pointer rounded-xl border-3 transition-all ${isSelected
                                        ? 'border-red-500 bg-red-500/10'
                                        : 'border-transparent hover:border-red-300 hover:bg-red-50/50'
                                        }`}
                                >
                                    {/* Checkbox */}
                                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white border-2 border-stone-300'
                                        }`}>
                                        {isSelected && <Check size={14} strokeWidth={3} />}
                                    </div>
                                </div>
                            )}
                            <NoteCard
                                note={note}
                                canEdit={canEdit && !selectionMode}
                                className={layout === 'vertical' ? "w-full" : "h-full"}
                                onOpenComments={selectionMode ? () => { } : onOpenComments}
                                boardTitle={boardTitle}
                                isHighlighted={highlightNoteId === note.id}
                                onMove={selectionMode ? undefined : onMoveNote}
                                canDownloadFiles={canDownloadFiles}
                            />
                        </div>
                    );
                })}

                {notes.length === 0 && (
                    <div className={`flex-shrink-0 flex items-center justify-center border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50 text-stone-400 ${layout === 'vertical' ? 'w-full h-[100px]' : 'w-[300px] min-h-[150px]'}`}>
                        <p className="text-sm">{t('board.noNotesInSection')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
