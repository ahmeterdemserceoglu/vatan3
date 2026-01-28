'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LightboxProps {
    isOpen: boolean;
    onClose: () => void;
    src: string;
    alt?: string;
    images?: string[]; // For gallery mode
    initialIndex?: number;
    allowDownload?: boolean;
}

export function Lightbox({
    isOpen,
    onClose,
    src,
    alt = 'Image',
    images,
    initialIndex = 0,
    allowDownload = true
}: LightboxProps) {
    const [scale, setScale] = useState(1);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isLoading, setIsLoading] = useState(true);

    const isGallery = images && images.length > 1;
    const currentSrc = isGallery ? images[currentIndex] : src;

    // Reset scale when image changes
    useEffect(() => {
        setScale(1);
        setIsLoading(true);
    }, [currentSrc]);

    // Reset index when opened
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setScale(1);
        }
    }, [isOpen, initialIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    if (isGallery) goToPrev();
                    break;
                case 'ArrowRight':
                    if (isGallery) goToNext();
                    break;
                case '+':
                case '=':
                    zoomIn();
                    break;
                case '-':
                    zoomOut();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isGallery, currentIndex]);

    const zoomIn = useCallback(() => {
        setScale(prev => Math.min(prev + 0.25, 3));
    }, []);

    const zoomOut = useCallback(() => {
        setScale(prev => Math.max(prev - 0.25, 0.5));
    }, []);

    const goToPrev = useCallback(() => {
        if (!images) return;
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    }, [images]);

    const goToNext = useCallback(() => {
        if (!images) return;
        setCurrentIndex(prev => (prev + 1) % images.length);
    }, [images]);

    const handleDownload = useCallback(() => {
        const link = document.createElement('a');
        link.href = currentSrc;
        link.download = alt || 'image';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [currentSrc, alt]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
                <X size={24} />
            </button>

            {/* Controls */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <button
                    onClick={zoomOut}
                    disabled={scale <= 0.5}
                    className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-50"
                >
                    <ZoomOut size={18} />
                </button>
                <span className="text-white text-sm font-medium min-w-[50px] text-center">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    onClick={zoomIn}
                    disabled={scale >= 3}
                    className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-50"
                >
                    <ZoomIn size={18} />
                </button>
                {allowDownload && (
                    <>
                        <div className="w-px h-4 bg-white/30" />
                        <button
                            onClick={handleDownload}
                            className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <Download size={18} />
                        </button>
                    </>
                )}
            </div>

            {/* Gallery Navigation */}
            {isGallery && (
                <>
                    <button
                        onClick={goToPrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <ChevronRight size={24} />
                    </button>

                    {/* Gallery Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
                        {currentIndex + 1} / {images.length}
                    </div>
                </>
            )}

            {/* Image Container - Compact size for better preview */}
            <div
                className="relative max-w-[70vw] max-h-[70vh] sm:max-w-[60vw] sm:max-h-[60vh] overflow-hidden rounded-xl shadow-2xl bg-black/20"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Loading Spinner */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                )}

                {/* Image */}
                <img
                    src={currentSrc}
                    alt={alt}
                    className={cn(
                        "max-w-[70vw] max-h-[70vh] sm:max-w-[60vw] sm:max-h-[60vh] object-contain transition-all duration-200 select-none rounded-xl",
                        isLoading ? "opacity-0" : "opacity-100 animate-in zoom-in-95 duration-200"
                    )}
                    style={{ transform: `scale(${scale})` }}
                    onLoad={() => setIsLoading(false)}
                    draggable={false}
                />
            </div>
        </div>
    );
}
