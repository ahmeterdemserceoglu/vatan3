'use client';

import { Section } from '@/types';
import { X, ArrowRight, Layout } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface MoveNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (targetSectionId: string) => void;
    sections: Section[];
    currentSectionId: string;
    title?: string;
}

export function MoveNoteModal({ isOpen, onClose, onSubmit, sections, currentSectionId, title }: MoveNoteModalProps) {
    const { t, language } = useTranslation();

    if (!isOpen) return null;

    // Filter out current section
    const availableSections = sections.filter(s => s.id !== currentSectionId);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <Layout size={20} className="text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-stone-800">
                            {title || (language === 'tr' ? 'Notu Taşı' : 'Move Note')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-stone-400 hover:bg-stone-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {availableSections.length === 0 ? (
                        <p className="text-stone-500 text-center py-4">
                            {language === 'tr' ? 'Taşınabilecek başka bölüm yok.' : 'No other sections to move to.'}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {availableSections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => onSubmit(section.id)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border border-stone-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors group text-left"
                                >
                                    <span className="font-medium text-stone-700 group-hover:text-indigo-700 truncate mr-2">{section.title}</span>
                                    <ArrowRight size={16} className="text-stone-300 group-hover:text-indigo-500 shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
