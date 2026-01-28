'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PhotoModal } from './PhotoModal';

interface AvatarProps {
    src?: string | null;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
    onClick?: () => void;
    clickable?: boolean; // Enable photo preview on click
}

const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-24 h-24 text-2xl',
    '2xl': 'w-32 h-32 text-4xl',
};

export function Avatar({ src, name, size = 'md', className, onClick, clickable = true }: AvatarProps) {
    const [hasError, setHasError] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const initial = name?.charAt(0).toUpperCase() || '?';

    // Check if the URL is valid and not empty
    const hasValidPhoto = src && src.trim() !== '' && !src.includes('undefined');

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (clickable && hasValidPhoto && !hasError) {
            setShowPhotoModal(true);
        }
    };

    const isClickable = (onClick || (clickable && hasValidPhoto && !hasError));

    return (
        <>
            <div
                className={cn(
                    'rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 aspect-square',
                    'bg-gradient-to-br from-stone-200 to-stone-300',
                    sizeClasses[size],
                    isClickable && 'cursor-pointer hover:ring-2 hover:ring-stone-400 hover:ring-offset-1 transition-all active:scale-95',
                    className
                )}
                onClick={handleClick}
            >
                {hasValidPhoto && !hasError ? (
                    <img
                        src={src!}
                        alt={name || 'Avatar'}
                        className="w-full h-full object-cover object-center aspect-square"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <span className="font-semibold text-stone-600">
                        {initial}
                    </span>
                )}
            </div>

            {/* Photo Preview Modal */}
            {hasValidPhoto && (
                <PhotoModal
                    src={src!}
                    name={name}
                    isOpen={showPhotoModal}
                    onClose={() => setShowPhotoModal(false)}
                />
            )}
        </>
    );
}
