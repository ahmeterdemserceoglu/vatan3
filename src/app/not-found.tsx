'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100 to-stone-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Illustration */}
                <div className="w-64 h-64 mx-auto mb-8">
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                        <defs>
                            <linearGradient id="grad404" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1c1917" />
                                <stop offset="100%" stopColor="#44403c" />
                            </linearGradient>
                            <filter id="shadow404" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#1c1917" floodOpacity="0.15" />
                            </filter>
                        </defs>

                        {/* Background decorative circles */}
                        <circle cx="150" cy="150" r="120" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="2" />
                        <circle cx="150" cy="150" r="100" fill="none" stroke="#e7e5e4" strokeWidth="1" strokeDasharray="8 4" className="animate-spin" style={{ animationDuration: '60s' }} />

                        {/* 404 Text */}
                        <text x="150" y="165" textAnchor="middle" fontSize="72" fontWeight="900" fill="url(#grad404)" filter="url(#shadow404)">
                            404
                        </text>

                        {/* Lost astronaut */}
                        <g transform="translate(220, 80)" className="animate-bounce" style={{ animationDuration: '3s' }}>
                            {/* Helmet */}
                            <circle cx="0" cy="0" r="18" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="2" />
                            <circle cx="0" cy="0" r="12" fill="#1c1917" opacity="0.3" />
                            <ellipse cx="-3" cy="-3" rx="4" ry="3" fill="white" opacity="0.6" />
                            {/* Body */}
                            <ellipse cx="0" cy="28" rx="12" ry="16" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="2" />
                            {/* Arms */}
                            <line x1="-12" y1="22" x2="-22" y2="15" stroke="#d6d3d1" strokeWidth="4" strokeLinecap="round" />
                            <line x1="12" y1="22" x2="22" y2="30" stroke="#d6d3d1" strokeWidth="4" strokeLinecap="round" />
                            {/* Legs */}
                            <line x1="-5" y1="44" x2="-8" y2="58" stroke="#d6d3d1" strokeWidth="4" strokeLinecap="round" />
                            <line x1="5" y1="44" x2="10" y2="56" stroke="#d6d3d1" strokeWidth="4" strokeLinecap="round" />
                        </g>

                        {/* Stars */}
                        <circle cx="60" cy="70" r="2" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '2s' }} />
                        <circle cx="240" cy="200" r="2.5" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                        <circle cx="80" cy="220" r="1.5" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                        <circle cx="200" cy="60" r="2" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }} />

                        {/* Planet rings */}
                        <g transform="translate(70, 200)">
                            <circle cx="0" cy="0" r="20" fill="#fef3c7" />
                            <ellipse cx="0" cy="0" rx="32" ry="8" fill="none" stroke="#fcd34d" strokeWidth="3" transform="rotate(-15)" />
                        </g>
                    </svg>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-8">
                    <h1 className="text-3xl font-bold text-stone-800">
                        Sayfa Bulunamadı
                    </h1>
                    <p className="text-stone-500 text-lg">
                        Aradığınız sayfa uzayda kaybolmuş gibi görünüyor. Belki silinmiş veya hiç var olmamış olabilir.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                        <Home size={18} />
                        Ana Sayfa
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-stone-700 rounded-xl font-medium border border-stone-200 hover:bg-stone-50 transition-all duration-200"
                    >
                        <ArrowLeft size={18} />
                        Geri Dön
                    </button>
                </div>

                {/* Search suggestion */}
                <div className="mt-12 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-3 text-stone-500">
                        <Search size={20} />
                        <span className="text-sm">
                            Bir pano mu arıyorsunuz? Dashboard'dan panolarınıza ulaşabilirsiniz.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
