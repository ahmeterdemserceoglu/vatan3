'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface AddSectionModalProps {
    onClose: () => void;
    onSubmit: (title: string) => Promise<void>;
}

export function AddSectionModal({ onClose, onSubmit }: AddSectionModalProps) {
    const { t, language } = useTranslation();
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            await onSubmit(title);
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-matte-lg relative">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-stone-800 mb-6">{t('section.addSection')}</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-600 mb-2">
                            {t('section.sectionTitle')}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={language === 'tr' ? 'Örn: Hafta 1 Konuları' : 'E.g: Week 1 Topics'}
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-stone-200 rounded-lg text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="flex-1 py-2.5 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading
                                ? (language === 'tr' ? 'Ekleniyor...' : 'Adding...')
                                : (language === 'tr' ? 'Ekle' : 'Add')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
