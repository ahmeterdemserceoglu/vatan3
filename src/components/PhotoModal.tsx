'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PhotoModalProps {
    src: string;
    name?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PhotoModal({ src, name, isOpen, onClose }: PhotoModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEscape);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            {/* Close button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-10"
            >
                <X size={24} />
            </button>

            {/* Instagram-style circular photo - Compact */}
            <div
                className="flex flex-col items-center gap-4 animate-in zoom-in-75 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Profile Photo - Compact Circle */}
                <div className="relative">
                    {/* Gradient ring around photo */}
                    <div className="absolute -inset-1 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 rounded-full opacity-90" />

                    {/* Photo container - Smaller sizes */}
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-3 border-black aspect-square">
                        <img
                            src={src}
                            alt={name || 'Profile Photo'}
                            className="w-full h-full object-cover object-center aspect-square"
                        />
                    </div>
                </div>

                {/* Name */}
                {name && (
                    <div className="text-center">
                        <p className="text-white text-xl sm:text-2xl font-bold drop-shadow-lg">{name}</p>
                    </div>
                )}
            </div>
        </div>
    );

    // Use portal to render modal at document body level
    return createPortal(modalContent, document.body);
}
