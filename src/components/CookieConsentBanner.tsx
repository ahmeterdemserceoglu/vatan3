'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, Settings } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie-consent-v1';

export function CookieConsentBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = (type: 'all' | 'necessary') => {
        localStorage.setItem(COOKIE_CONSENT_KEY, type);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none">
            <div className="max-w-md mx-auto pointer-events-auto">
                {/* Main compact banner */}
                <div
                    className="bg-stone-900 text-white rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                        animation: 'slideUp 0.4s ease-out',
                    }}
                >
                    <div className="p-4">
                        {/* Header row */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                <Cookie size={16} className="text-amber-400" />
                            </div>
                            <span className="font-medium text-sm">Çerez Kullanımı</span>
                            <button
                                onClick={() => handleAccept('necessary')}
                                className="ml-auto p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={16} className="text-stone-400" />
                            </button>
                        </div>

                        {/* Description */}
                        <p className="text-stone-400 text-xs leading-relaxed mb-4">
                            Deneyiminizi geliştirmek için çerezler kullanıyoruz.{' '}
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-stone-300 underline hover:text-white transition-colors"
                            >
                                {showDetails ? 'Gizle' : 'Detaylar'}
                            </button>
                        </p>

                        {/* Expandable details */}
                        {showDetails && (
                            <div className="mb-4 p-3 bg-stone-800/50 rounded-xl text-xs text-stone-400 space-y-2">
                                <div className="flex justify-between">
                                    <span>🔒 Gerekli</span>
                                    <span className="text-green-400">Her zaman aktif</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>📊 Analitik</span>
                                    <span>Site kullanımı</span>
                                </div>
                                <a href="/kvkk" className="block text-stone-300 hover:text-white mt-2">
                                    Gizlilik Politikası →
                                </a>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAccept('necessary')}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                Sadece Gerekli
                            </button>
                            <button
                                onClick={() => handleAccept('all')}
                                className="flex-1 px-4 py-2.5 text-sm font-medium bg-white text-stone-900 rounded-xl hover:bg-stone-100 transition-all"
                            >
                                Kabul Et
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
