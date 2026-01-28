'use client';

import Link from 'next/link';
import { Home, ArrowLeft, ShieldX, Lock, Mail } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { ADMIN_EMAIL } from '@/lib/constants';

interface ForbiddenPageProps {
    title?: string;
    description?: string;
    showBackButton?: boolean;
}

export function ForbiddenPage({
    title,
    description,
    showBackButton = true
}: ForbiddenPageProps) {
    const { language } = useTranslation();

    const defaultTitle = language === 'tr' ? 'Erişim Engellendi' : 'Access Denied';
    const defaultDescription = language === 'tr'
        ? `Bu sayfaya erişim izniniz bulunmuyor. Eğer bu bir hata olduğunu düşünüyorsanız, ${ADMIN_EMAIL} adresine e-posta gönderin.`
        : `You do not have permission to access this page. If you believe this is an error, please contact ${ADMIN_EMAIL}.`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-stone-50 to-amber-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Illustration */}
                <div className="w-64 h-64 mx-auto mb-8">
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                        <defs>
                            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#ea580c" />
                            </linearGradient>
                            <filter id="shieldShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#f97316" floodOpacity="0.25" />
                            </filter>
                        </defs>

                        {/* Background circles */}
                        <circle cx="150" cy="150" r="120" fill="#fff7ed" stroke="#fed7aa" strokeWidth="2" />
                        <circle cx="150" cy="150" r="100" fill="none" stroke="#fed7aa" strokeWidth="1" strokeDasharray="4 4" />

                        {/* Shield */}
                        <g filter="url(#shieldShadow)" transform="translate(150, 140)">
                            <path
                                d="M0,-70 L50,-55 L50,10 C50,45 25,70 0,85 C-25,70 -50,45 -50,10 L-50,-55 Z"
                                fill="url(#shieldGrad)"
                                className="animate-pulse"
                                style={{ animationDuration: '2s' }}
                            />
                            {/* X mark on shield */}
                            <g stroke="white" strokeWidth="6" strokeLinecap="round">
                                <line x1="-18" y1="-10" x2="18" y2="25" />
                                <line x1="18" y1="-10" x2="-18" y2="25" />
                            </g>
                        </g>

                        {/* Lock icons floating */}
                        <g transform="translate(70, 80)" className="animate-bounce" style={{ animationDuration: '2s' }}>
                            <rect x="-12" y="0" width="24" height="18" rx="4" fill="#fcd34d" />
                            <path d="M-6,0 V-8 C-6,-14 6,-14 6,-8 V0" fill="none" stroke="#fcd34d" strokeWidth="4" />
                        </g>

                        <g transform="translate(230, 100)" className="animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                            <rect x="-10" y="0" width="20" height="15" rx="3" fill="#fed7aa" />
                            <path d="M-5,0 V-6 C-5,-11 5,-11 5,-6 V0" fill="none" stroke="#fed7aa" strokeWidth="3" />
                        </g>

                        {/* 403 text */}
                        <text x="150" y="260" textAnchor="middle" fontSize="32" fontWeight="900" fill="#1c1917" opacity="0.1">
                            403
                        </text>

                        {/* Warning triangles */}
                        <g transform="translate(60, 200)" className="animate-pulse" style={{ animationDuration: '1.5s' }}>
                            <polygon points="0,-12 10,8 -10,8" fill="#fbbf24" />
                            <text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1c1917">!</text>
                        </g>
                        <g transform="translate(240, 190)" className="animate-pulse" style={{ animationDuration: '1.8s', animationDelay: '0.3s' }}>
                            <polygon points="0,-10 8,6 -8,6" fill="#fbbf24" />
                            <text x="0" y="3" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1c1917">!</text>
                        </g>
                    </svg>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                        <ShieldX size={16} />
                        403 Forbidden
                    </div>
                    <h1 className="text-3xl font-bold text-stone-800">
                        {title || defaultTitle}
                    </h1>
                    <p className="text-stone-500 text-lg">
                        {description || defaultDescription}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                        <Home size={18} />
                        {language === 'tr' ? 'Panolarım' : 'My Boards'}
                    </Link>
                    {showBackButton && (
                        <button
                            onClick={() => window.history.back()}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-stone-700 rounded-xl font-medium border border-stone-200 hover:bg-stone-50 transition-all duration-200"
                        >
                            <ArrowLeft size={18} />
                            {language === 'tr' ? 'Geri Dön' : 'Go Back'}
                        </button>
                    )}
                </div>

                {/* Help info */}
                <div className="mt-12 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm text-left">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Lock size={18} className="text-orange-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-stone-700 mb-1">
                                {language === 'tr' ? 'Neden bu sayfayı görüyorum?' : 'Why am I seeing this?'}
                            </h3>
                            <p className="text-sm text-stone-500">
                                {language === 'tr'
                                    ? 'Bu sayfa sadece belirli kullanıcılar için erişilebilir. Eğer bir panoya katılmak istiyorsanız, pano sahibinden davet almanız gerekebilir.'
                                    : 'This page is only accessible to certain users. If you want to join a board, you may need to get an invitation from the board owner.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Default export for direct page usage
export default function Forbidden() {
    return <ForbiddenPage />;
}
