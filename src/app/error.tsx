'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-stone-50 to-orange-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Illustration */}
                <div className="w-64 h-64 mx-auto mb-8">
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                        <defs>
                            <linearGradient id="errorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="100%" stopColor="#dc2626" />
                            </linearGradient>
                        </defs>

                        {/* Background */}
                        <circle cx="150" cy="150" r="120" fill="#fef2f2" stroke="#fecaca" strokeWidth="2" />

                        {/* Broken gear 1 */}
                        <g transform="translate(100, 120)" className="animate-spin" style={{ animationDuration: '8s' }}>
                            <path d="M0,-35 L8,-32 L10,-22 L18,-18 L28,-22 L32,-15 L26,-8 L28,2 L38,8 L36,18 L26,18 L20,28 L22,38 L14,40 L8,32 L-2,34 L-8,42 L-18,38 L-18,28 L-28,22 L-38,26 L-42,16 L-32,10 L-34,0 L-42,-8 L-36,-18 L-26,-16 L-20,-26 L-24,-36 L-14,-40 L-8,-30 L2,-32 Z"
                                fill="#e7e5e4" stroke="#d6d3d1" strokeWidth="2" />
                            <circle cx="0" cy="0" r="12" fill="#fafaf9" stroke="#d6d3d1" strokeWidth="2" />
                        </g>

                        {/* Broken gear 2 */}
                        <g transform="translate(190, 160)" className="animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                            <path d="M0,-25 L6,-23 L8,-16 L14,-13 L22,-16 L25,-10 L20,-5 L22,3 L30,7 L28,15 L20,15 L15,22 L17,30 L10,32 L6,25 L-2,27 L-6,34 L-14,30 L-14,22 L-22,17 L-30,20 L-34,12 L-25,8 L-27,0 L-34,-6 L-28,-14 L-20,-12 L-15,-20 L-18,-28 L-10,-32 L-6,-24 L2,-25 Z"
                                fill="#fecaca" stroke="#f87171" strokeWidth="2" />
                            <circle cx="0" cy="0" r="8" fill="#fef2f2" stroke="#f87171" strokeWidth="2" />
                        </g>

                        {/* Lightning bolt - error symbol */}
                        <g transform="translate(140, 80)">
                            <path d="M20,0 L5,35 L15,35 L0,70 L35,25 L22,25 L40,0 Z"
                                fill="url(#errorGrad)"
                                className="animate-pulse"
                                style={{ animationDuration: '1s' }} />
                        </g>

                        {/* Sparks */}
                        <circle cx="80" cy="100" r="3" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '1s' }} />
                        <circle cx="220" cy="120" r="2" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }} />
                        <circle cx="140" cy="220" r="2.5" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '0.8s', animationDelay: '0.4s' }} />

                        {/* Error code */}
                        <text x="150" y="270" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#a8a29e">
                            ERROR
                        </text>
                    </svg>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        <AlertTriangle size={16} />
                        Bir Hata Oluştu
                    </div>
                    <h1 className="text-3xl font-bold text-stone-800">
                        Beklenmeyen Bir Sorun
                    </h1>
                    <p className="text-stone-500 text-lg">
                        Bir şeyler yanlış gitti. Endişelenmeyin, teknik ekibimiz durumdan haberdar.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-stone-400 font-mono bg-stone-100 px-3 py-1.5 rounded-lg inline-block">
                            Hata Kodu: {error.digest}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                        <RefreshCw size={18} />
                        Tekrar Dene
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-stone-700 rounded-xl font-medium border border-stone-200 hover:bg-stone-50 transition-all duration-200"
                    >
                        <Home size={18} />
                        Ana Sayfa
                    </Link>
                </div>

                {/* Support info */}
                <div className="mt-12 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm text-left">
                    <h3 className="font-medium text-stone-700 mb-2">Bu hatayı görmeye devam mı ediyorsunuz?</h3>
                    <ul className="text-sm text-stone-500 space-y-1">
                        <li>• Sayfayı yenilemeyi deneyin</li>
                        <li>• Tarayıcı önbelleğini temizleyin</li>
                        <li>• Birkaç dakika sonra tekrar deneyin</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
