import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider } from '@/components/ToastProvider';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { SecurityGuard } from '@/components/SecurityGuard';
import { OfflineDetector } from './offline/page';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { PushNotificationInitializer } from '@/components/PushNotificationInitializer';
import { NavigationManager } from '@/components/NavigationManager';
import { MaintenanceGuard } from '@/components/MaintenanceGuard';

export const metadata: Metadata = {
    title: 'Collabo - Sınıf İşbirliği Platformu',
    description: 'Öğretmen ve öğrenciler için interaktif, gerçek zamanlı işbirliği platformu.',
    manifest: '/manifest.json',
    icons: {
        icon: '/icon-192.png',
        apple: '/icon-192.png',
    },
    openGraph: {
        title: 'Collabo',
    },
};

export const viewport: Viewport = {
    themeColor: '#ffffff',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="tr">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            </head>
            <body className="min-h-screen bg-gray-50">
                <AuthProvider>
                    <MaintenanceGuard>
                        <SecurityGuard />
                        <ToastProvider>
                            <NavigationManager />
                            <OfflineDetector>
                                {children}
                            </OfflineDetector>
                            <PWAInstallButton />
                            <CookieConsentBanner />
                            <PushNotificationInitializer />
                        </ToastProvider>
                    </MaintenanceGuard>
                </AuthProvider>

                {/* Service Worker Registration */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            if ('serviceWorker' in navigator) {
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js', { scope: '/' })
                                        .then(function(reg) {
                                            console.log('[PWA] Service Worker registered:', reg.scope);
                                        })
                                        .catch(function(err) {
                                            console.error('[PWA] Service Worker failed:', err);
                                        });
                                });
                            }
                        `,
                    }}
                />
            </body>
        </html>
    );
}
