'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSModal, setShowIOSModal] = useState(false);

    useEffect(() => {
        console.log('[PWA] Checking install status...');

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('[PWA] App is already running in standalone mode');
            setIsInstalled(true);
            return;
        }

        // iOS detection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Check if dismissed recently
        const dismissedAt = localStorage.getItem('pwa-banner-dismissed');
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            const oneDay = 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedTime < oneDay) {
                return; // Don't show for 24 hours after dismissal
            }
        }

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('[PWA] beforeinstallprompt event fired!');
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);

            // Show banner after 5 seconds
            setTimeout(() => {
                console.log('[PWA] Showing install banner');
                setShowBanner(true);
            }, 5000);
        };

        // Listen for app installed
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setShowBanner(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // For iOS, show banner after delay
        if (isIOSDevice && !window.matchMedia('(display-mode: standalone)').matches) {
            setTimeout(() => {
                setIsInstallable(true);
                setShowBanner(true);
            }, 5000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (isIOS) {
            setShowIOSModal(true);
            return;
        }

        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
        } catch (error) {
            console.error('Install error:', error);
        }

        setDeferredPrompt(null);
        setShowBanner(false);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    };

    // Don't render if installed or not installable
    if (isInstalled || !isInstallable) return null;

    return (
        <>
            {/* Floating Install Banner */}
            {showBanner && (
                <div className="fixed bottom-24 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-gradient-to-r from-stone-800 to-stone-900 rounded-2xl shadow-2xl p-4 text-white border border-stone-700">
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                {isIOS ? <Smartphone size={24} /> : <Download size={24} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm mb-0.5">Uygulamayı Yükle</h3>
                                <p className="text-xs text-stone-300 leading-relaxed">
                                    Collabo&apos;yu ana ekranınıza ekleyin, daha hızlı erişin!
                                </p>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                            >
                                <X size={18} className="text-stone-400" />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleDismiss}
                                className="flex-1 py-2 text-xs font-medium text-stone-400 hover:text-white transition-colors"
                            >
                                Daha Sonra
                            </button>
                            <button
                                onClick={handleInstall}
                                className="flex-1 py-2 bg-white text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={14} />
                                Yükle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* iOS Installation Modal */}
            {showIOSModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Smartphone size={32} className="text-stone-600" />
                            </div>
                            <h2 className="text-xl font-bold text-stone-800 mb-2">
                                iOS&apos;ta Yükleme
                            </h2>
                            <p className="text-sm text-stone-500 mb-6">
                                Safari&apos;de aşağıdaki adımları izleyin:
                            </p>

                            <div className="space-y-3 text-left">
                                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">1</div>
                                    <p className="text-sm text-stone-700">
                                        Alt kısımdaki <span className="font-semibold">Paylaş</span> butonuna tıklayın
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">2</div>
                                    <p className="text-sm text-stone-700">
                                        <span className="font-semibold">&quot;Ana Ekrana Ekle&quot;</span> seçeneğini bulun
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">3</div>
                                    <p className="text-sm text-stone-700">
                                        <span className="font-semibold">&quot;Ekle&quot;</span> butonuna basın
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-stone-50 border-t border-stone-100">
                            <button
                                onClick={() => setShowIOSModal(false)}
                                className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-900 transition-colors"
                            >
                                Anladım
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Compact button version for header
export function PWAInstallButtonCompact() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
        } catch (error) {
            console.error('Install error:', error);
        }

        setDeferredPrompt(null);
    };

    if (isInstalled) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                <CheckCircle2 size={14} />
                Yüklendi
            </div>
        );
    }

    if (!isInstallable) return null;

    return (
        <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-white rounded-full text-xs font-medium hover:bg-stone-900 transition-colors"
        >
            <Download size={14} />
            Yükle
        </button>
    );
}
