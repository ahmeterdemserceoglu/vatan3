'use client';

import { useState, useEffect } from 'react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { PushNotificationPrompt } from './PushNotificationButton';
import { useStore } from '@/store/useStore';

export function PushNotificationInitializer() {
    const { user } = useStore();
    const { permission, isSupported } = usePushNotification();
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Only show if user is logged in, push is supported, and permission is still default
        if (!user || !isSupported || permission !== 'default') {
            setShowPrompt(false);
            return;
        }

        // Check if user dismissed it recently (wait 3 days before showing again)
        const lastDismissed = localStorage.getItem('push-prompt-dismissed');
        const now = Date.now();
        const threeDays = 3 * 24 * 60 * 60 * 1000;

        if (!lastDismissed || now - parseInt(lastDismissed) > threeDays) {
            // Delay showing by 5 seconds so it's not the first thing they see
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [user, isSupported, permission]);

    if (!showPrompt) return null;

    return (
        <PushNotificationPrompt
            onDismiss={() => {
                setShowPrompt(false);
                localStorage.setItem('push-prompt-dismissed', Date.now().toString());
            }}
        />
    );
}
