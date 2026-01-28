'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { Capacitor } from '@capacitor/core';

export function NavigationManager() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Only run on client and if running in Capacitor native app
        const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

        const handleNativeBack = async () => {
            if (!isNative) return;

            try {
                const { App } = await import('@capacitor/app');

                App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
                    // Check for open modals/drawers via a global class or state
                    const hasOpenModal = document.querySelector('.fixed.inset-0.z-\\[100\\]') ||
                        document.querySelector('.fixed.inset-0.z-\\[9999\\]') ||
                        document.querySelector('.fixed.inset-0.bg-stone-900\\/60');

                    if (hasOpenModal) {
                        // If there's an open modal, we want to close it.
                        // Since we can't easily trigger the close function from here without global state,
                        // we can simulate a click on the backdrop.
                        const backdrop = document.querySelector('.fixed.inset-0.bg-stone-900\\/60') as HTMLElement;
                        if (backdrop) {
                            backdrop.click();
                            return;
                        }
                    }

                    if (canGoBack) {
                        window.history.back();
                    } else {
                        // If at the root and no modal, maybe show an alert or just exit
                        // App.exitApp(); // Uncomment if you want to exit immediately
                    }
                });
            } catch (err) {
                console.warn('[Nav] Capacitor App plugin not found, falling back to browser behavior');
            }
        };

        handleNativeBack();

        // Browser PopState fix for PWAs (Gestures)
        const handlePopState = (event: PopStateEvent) => {
            const hasOpenModal = document.querySelector('.fixed.inset-0.bg-stone-900\\/60');
            if (hasOpenModal) {
                // If modal is open, prevent navigation and close modal
                const backdrop = document.querySelector('.fixed.inset-0.bg-stone-900\\/60') as HTMLElement;
                if (backdrop) {
                    backdrop.click();
                    // We need to re-push the state to keep the user on the current page if they hit back again
                    // window.history.pushState(null, '', window.location.href);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [pathname]);

    return null; // This component doesn't render anything
}
