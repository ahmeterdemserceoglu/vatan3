'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
    className,
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse'
}: SkeletonProps) {
    const baseClasses = 'bg-stone-200';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: '',
        rounded: 'rounded-xl'
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'skeleton-wave',
        none: ''
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={cn(
                baseClasses,
                variantClasses[variant],
                animationClasses[animation],
                className
            )}
            style={style}
        />
    );
}

// Preset Skeleton Components
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn("space-y-2", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    height={14}
                    className={i === lines - 1 ? "w-3/4" : "w-full"}
                />
            ))}
        </div>
    );
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
    return (
        <Skeleton
            variant="circular"
            width={size}
            height={size}
            className={className}
        />
    );
}

export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn("p-4 rounded-xl border border-stone-200 bg-white", className)}>
            <div className="flex items-center gap-3 mb-4">
                <SkeletonAvatar size={40} />
                <div className="flex-1">
                    <Skeleton variant="text" height={14} className="w-24 mb-2" />
                    <Skeleton variant="text" height={10} className="w-16" />
                </div>
            </div>
            <SkeletonText lines={3} />
        </div>
    );
}

export function SkeletonLinkPreview({ className }: { className?: string }) {
    return (
        <div className={cn("border border-stone-200 rounded-xl overflow-hidden bg-stone-50", className)}>
            {/* Image placeholder */}
            <Skeleton variant="rectangular" className="h-32 w-full" />
            {/* Content */}
            <div className="p-3">
                <Skeleton variant="text" height={10} className="w-20 mb-2" />
                <Skeleton variant="text" height={14} className="w-full mb-2" />
                <Skeleton variant="text" height={12} className="w-3/4" />
            </div>
        </div>
    );
}

export function SkeletonMessage({ className }: { className?: string }) {
    return (
        <div className={cn("flex gap-2", className)}>
            <SkeletonAvatar size={32} />
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <Skeleton variant="text" height={12} className="w-20" />
                    <Skeleton variant="text" height={10} className="w-12" />
                </div>
                <Skeleton variant="rounded" height={40} className="w-3/4" />
            </div>
        </div>
    );
}
