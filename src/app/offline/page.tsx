'use client';

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';

export function OfflinePage() {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = async () => {
        setIsRetrying(true);

        // Simüle edilmiş bekleme
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Sayfayı yenile
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-stone-50 to-gray-100 flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Illustration */}
                <div className="w-72 h-72 mx-auto mb-8">
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                        <defs>
                            <linearGradient id="offlineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#64748b" />
                                <stop offset="100%" stopColor="#475569" />
                            </linearGradient>
                            <filter id="offlineShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#64748b" floodOpacity="0.2" />
                            </filter>
                            <clipPath id="cloudClip">
                                <path d="M60,160 C30,160 10,140 10,110 C10,80 30,60 60,60 C65,40 85,25 110,25 C145,25 175,50 180,85 C220,85 250,110 250,145 C250,180 220,200 185,200 L60,200 C30,200 10,180 10,160 Z" />
                            </clipPath>
                        </defs>

                        {/* Background */}
                        <rect width="300" height="300" fill="#f8fafc" rx="20" />

                        {/* Cloud with "no signal" effect */}
                        <g filter="url(#offlineShadow)">
                            {/* Cloud shape */}
                            <path
                                d="M70,170 C40,170 20,145 20,115 C20,85 45,65 75,65 C82,42 105,25 135,25 C175,25 205,55 210,95 C245,98 270,125 270,155 C270,188 242,210 205,210 L70,210 Z"
                                fill="url(#offlineGrad)"
                                opacity="0.2"
                            />
                            <path
                                d="M70,170 C40,170 20,145 20,115 C20,85 45,65 75,65 C82,42 105,25 135,25 C175,25 205,55 210,95 C245,98 270,125 270,155 C270,188 242,210 205,210 L70,210 Z"
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="3"
                                strokeDasharray="8 4"
                                className="animate-pulse"
                            />
                        </g>

                        {/* WiFi icon with X */}
                        <g transform="translate(150, 130)">
                            {/* WiFi arcs */}
                            <path d="M-50,-20 Q0,-60 50,-20" fill="none" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
                            <path d="M-35,-5 Q0,-35 35,-5" fill="none" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
                            <path d="M-20,10 Q0,-10 20,10" fill="none" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
                            <circle cx="0" cy="25" r="8" fill="#cbd5e1" />

                            {/* X overlay */}
                            <g stroke="#ef4444" strokeWidth="8" strokeLinecap="round">
                                <line x1="-30" y1="-25" x2="30" y2="35" className="animate-pulse" />
                                <line x1="30" y1="-25" x2="-30" y2="35" className="animate-pulse" />
                            </g>
                        </g>

                        {/* Disconnected cable illustration */}
                        <g transform="translate(50, 240)">
                            {/* Left plug */}
                            <rect x="0" y="0" width="30" height="20" rx="4" fill="#64748b" />
                            <rect x="30" y="5" width="15" height="10" rx="2" fill="#94a3b8" />
                            <line x1="7" y1="5" x2="7" y2="15" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                            <line x1="17" y1="5" x2="17" y2="15" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                        </g>

                        <g transform="translate(200, 240)">
                            {/* Right plug */}
                            <rect x="20" y="0" width="30" height="20" rx="4" fill="#64748b" />
                            <rect x="5" y="5" width="15" height="10" rx="2" fill="#94a3b8" />
                            <circle cx="10" cy="10" r="3" fill="#64748b" />
                            <circle cx="17" cy="10" r="3" fill="#64748b" />
                        </g>

                        {/* Spark effects between plugs */}
                        <g className="animate-ping" style={{ animationDuration: '1.5s' }}>
                            <circle cx="120" cy="250" r="3" fill="#fbbf24" />
                        </g>
                        <g className="animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.3s' }}>
                            <circle cx="140" cy="245" r="2" fill="#fbbf24" />
                        </g>
                        <g className="animate-ping" style={{ animationDuration: '2s', animationDelay: '0.6s' }}>
                            <circle cx="160" cy="252" r="2.5" fill="#fbbf24" />
                        </g>
                        <g className="animate-ping" style={{ animationDuration: '1.6s', animationDelay: '0.9s' }}>
                            <circle cx="180" cy="248" r="2" fill="#fbbf24" />
                        </g>
                    </svg>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                        <WifiOff size={16} />
                        Çevrimdışı
                    </div>
                    <h1 className="text-3xl font-bold text-stone-800">
                        İnternet Bağlantısı Yok
                    </h1>
                    <p className="text-stone-500 text-lg">
                        Görünüşe göre internet bağlantınız kesilmiş. Bağlantınızı kontrol edip tekrar deneyin.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mx-auto"
                    >
                        <RefreshCw size={20} className={isRetrying ? 'animate-spin' : ''} />
                        {isRetrying ? 'Bağlanıyor...' : 'Tekrar Dene'}
                    </button>
                </div>

                {/* Tips */}
                <div className="mt-12 p-5 bg-white rounded-2xl border border-stone-200 shadow-sm text-left">
                    <h3 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
                        <CloudOff size={18} className="text-slate-500" />
                        Bağlantı İpuçları
                    </h3>
                    <ul className="text-sm text-stone-500 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                            WiFi'ın açık ve bağlı olduğundan emin olun
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                            Mobil verinin açık olduğunu kontrol edin
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                            Uçak modunun kapalı olduğundan emin olun
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                            Modemi/router'ı yeniden başlatmayı deneyin
                        </li>
                    </ul>
                </div>

                {/* Offline status indicator */}
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-stone-400">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    Çevrimdışı modda
                </div>
            </div>
        </div>
    );
}

// Hook to detect online/offline status
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Initial check
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

// Wrapper component that shows offline page when disconnected
export function OfflineDetector({ children }: { children: React.ReactNode }) {
    const isOnline = useOnlineStatus();

    if (!isOnline) {
        return <OfflinePage />;
    }

    return <>{children}</>;
}

// Default export for page usage
export default function OfflinePageRoute() {
    return <OfflinePage />;
}
