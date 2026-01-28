import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Haptic feedback wrapper
 */
export const haptic = {
    async impact(style: ImpactStyle = ImpactStyle.Light) {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.impact({ style });
            } catch (e) {
                console.warn('Haptic impact failed', e);
            }
        }
    },
    async notification(type: NotificationType = NotificationType.Success) {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.notification({ type });
            } catch (e) {
                console.warn('Haptic notification failed', e);
            }
        }
    },
    async vibrate() {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.vibrate();
            } catch (e) {
                console.warn('Vibration failed', e);
            }
        }
    }
};

/**
 * Native share wrapper
 */
export const nativeShare = async (options: { title: string; text: string; url: string; dialogTitle?: string }) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const canShare = await Share.canShare();
            if (canShare.value) {
                await Share.share({
                    title: options.title,
                    text: options.text,
                    url: options.url,
                    dialogTitle: options.dialogTitle || options.title,
                });
                return true;
            }
        } catch (e) {
            console.warn('Native share failed', e);
        }
    }

    // Fallback: Copy to clipboard if native share fails or not supported
    try {
        await navigator.clipboard.writeText(options.url);
        return false; // Indicates it used fallback
    } catch (e) {
        return false;
    }
};
