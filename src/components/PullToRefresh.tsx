'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
    children: ReactNode;
    onRefresh: () => Promise<void>;
    disabled?: boolean;
    threshold?: number; // pixels to pull before triggering refresh
    className?: string;
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export function PullToRefresh({
    children,
    onRefresh,
    disabled = false,
    threshold = 80,
    className = ''
}: PullToRefreshProps) {
    const [state, setState] = useState<RefreshState>('idle');
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (disabled || state === 'refreshing') return;

        const container = containerRef.current;
        if (!container) return;

        // Only activate if scrolled to top
        if (container.scrollTop > 0) return;

        startY.current = e.touches[0].clientY;
        currentY.current = startY.current;
    }, [disabled, state]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (disabled || state === 'refreshing') return;
        if (startY.current === 0) return;

        const container = containerRef.current;
        if (!container || container.scrollTop > 0) {
            startY.current = 0;
            setPullDistance(0);
            setState('idle');
            return;
        }

        currentY.current = e.touches[0].clientY;
        const diff = currentY.current - startY.current;

        if (diff > 0) {
            e.preventDefault();
            // Apply resistance - pull distance decreases as you pull more
            const resistance = 0.5;
            const distance = Math.min(diff * resistance, threshold * 1.5);
            setPullDistance(distance);

            if (distance >= threshold) {
                setState('ready');
            } else {
                setState('pulling');
            }
        }
    }, [disabled, state, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (disabled) return;

        if (state === 'ready') {
            setState('refreshing');
            setPullDistance(threshold * 0.6);

            try {
                await onRefresh();
            } catch (error) {
                console.error('Refresh failed:', error);
            }

            setState('idle');
        }

        setPullDistance(0);
        startY.current = 0;
    }, [disabled, state, threshold, onRefresh]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    const progress = Math.min(pullDistance / threshold, 1);
    const rotation = progress * 180;

    return (
        <div
            ref={containerRef}
            className={`relative overflow-auto ${className}`}
            style={{ touchAction: state === 'idle' ? 'auto' : 'none' }}
        >
            {/* Pull Indicator */}
            <div
                className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-50 transition-opacity duration-200"
                style={{
                    top: pullDistance - 50,
                    opacity: pullDistance > 10 ? 1 : 0,
                }}
            >
                <div
                    className={`
                        w-12 h-12 rounded-full bg-white shadow-lg border border-stone-200 
                        flex items-center justify-center transition-all duration-300
                        ${state === 'ready' ? 'bg-stone-800 border-stone-800' : ''}
                        ${state === 'refreshing' ? 'bg-stone-800 border-stone-800' : ''}
                    `}
                >
                    {state === 'refreshing' ? (
                        <RefreshCw
                            size={22}
                            className="text-white animate-spin"
                        />
                    ) : state === 'ready' ? (
                        <RefreshCw
                            size={22}
                            className="text-white"
                        />
                    ) : (
                        <ArrowDown
                            size={22}
                            className="text-stone-600 transition-transform duration-150"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        />
                    )}
                </div>
            </div>

            {/* Content with pull effect */}
            <div
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: state === 'idle' ? 'transform 0.3s ease-out' : 'none',
                }}
            >
                {children}
            </div>

            {/* Pull hint text */}
            {state === 'pulling' && pullDistance > 20 && (
                <div
                    className="absolute left-0 right-0 text-center pointer-events-none z-40"
                    style={{ top: pullDistance / 2 - 10 }}
                >
                    <span className="text-xs font-medium text-stone-400">
                        {progress < 1 ? 'Yenilemek için çekin' : 'Bırakın'}
                    </span>
                </div>
            )}
        </div>
    );
}
