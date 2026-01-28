'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';

export default function BackButtonHandler() {
    const router = useRouter();

    useEffect(() => {
        const handleBackButton = async () => {
            App.addListener('backButton', ({ canGoBack }) => {
                if (canGoBack) {
                    window.history.back();
                } else {
                    App.exitApp();
                }
            });
        };

        handleBackButton();

        return () => {
            App.removeAllListeners();
        };
    }, [router]);

    return null;
}
