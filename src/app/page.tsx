'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { FileText, Users, Palette, ArrowRight, Sparkles, Activity, Shield, Cpu, Code } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Home() {
    const { user, isLoading } = useStore();
    const router = useRouter();
    const { t, language } = useTranslation();

    useEffect(() => {
        if (!isLoading && user) {
            router.push('/dashboard');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-stone-200 border-t-[#1c1917] rounded-full animate-spin" />
                    <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.3em] font-mono">{t('common.loading')}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafaf9] selection:bg-[#1c1917] selection:text-white overflow-hidden">
            {/* Hero Section */}
            <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 relative">

                {/* Technical Aesthetic Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-[0.03] overflow-hidden -z-10">
                    <div className="absolute inset-0" style={{ backgroundSize: '40px 40px', backgroundImage: 'radial-gradient(#1c1917 1px, transparent 1px)' }} />
                </div>

                <div className="text-center animate-in fade-in slide-in-from-bottom-6 duration-1000 relative">

                    {/* Software-Induced Animated Logo Core */}
                    <div className="relative w-40 h-40 mx-auto mb-12">
                        {/* Technical Crosshairs */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <div className="w-full h-px bg-[#1c1917]" />
                            <div className="absolute h-full w-px bg-[#1c1917]" />
                            <div className="w-4/5 h-4/5 border border-[#1c1917] rounded-full" />
                        </div>

                        {/* Orbiting Ring with Nodes */}
                        <div className="absolute inset-0 border-[0.5px] border-stone-200 rounded-full animate-[spin_12s_linear_infinite]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-400 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]" />
                        </div>
                        <div className="absolute inset-4 border-[0.5px] border-stone-100 rounded-full animate-[spin_8s_linear_infinite_reverse]">
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-stone-300 rounded-full" />
                        </div>

                        {/* Pulse Ring */}
                        <div className="absolute inset-[-12px] border-[0.5px] border-[#1c1917]/5 rounded-[3rem] animate-ping opacity-10" />

                        {/* Core Logo Box - The System Identity */}
                        <div className="absolute inset-6 bg-[#1c1917] rounded-[2rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] flex items-center justify-center overflow-hidden group">
                            {/* Internal Technical Grid */}
                            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundSize: '10px 10px', backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)' }} />

                            <svg viewBox="0 0 100 100" className="w-16 h-16 relative z-10 transition-transform group-hover:scale-110 duration-700">
                                <path
                                    d="M75 35 C 75 15, 25 15, 25 50 C 25 85, 75 85, 75 65"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="animate-logo-draw"
                                />
                                {/* High-tech Scanning Bar */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-full w-full animate-scan-y" />
                            </svg>

                            {/* Decorative Data Points */}
                            <div className="absolute top-4 left-4 w-1 h-1 bg-white/40 rounded-full" />
                            <div className="absolute top-4 right-4 w-1 h-1 bg-white/40 rounded-full" />
                        </div>


                    </div>

                    {/* Headline Group */}
                    <div className="space-y-6 mb-14">

                        <h1 className="text-6xl md:text-9xl font-black text-[#1c1917] tracking-tighter leading-[0.8] uppercase">
                            Colla<br />
                            <span className="text-transparent" style={{ WebkitTextStroke: '2px #1c1917' }}>bo</span>
                        </h1>
                    </div>

                    <p className="text-lg md:text-xl text-stone-500 mb-14 max-w-xl mx-auto leading-relaxed font-medium tracking-tight">
                        {language === 'tr'
                            ? 'Sınıfınız için yazılımsal düzeyde optimize edilmiş işbirliği altyapısı. Notlar paylaşın, fikirler geliştirin, güvenle inşa edin.'
                            : 'Software-optimized collaboration infrastructure for your classroom. Share notes, develop ideas, build with confidence.'}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <Link
                            href="/auth/login"
                            className="inline-flex items-center justify-center gap-4 px-12 py-5 bg-[#1c1917] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-stone-800 transition-all duration-500 shadow-2xl shadow-stone-900/20 hover:-translate-y-1 active:translate-y-0 relative overflow-hidden group"
                        >
                            <span className="relative z-10">{t('common.login')}</span>
                            <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                        </Link>
                        <Link
                            href="/auth/register"
                            className="inline-flex items-center justify-center gap-4 px-12 py-5 bg-white text-[#1c1917] rounded-2xl font-black border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all duration-500 shadow-lg shadow-stone-200/50 uppercase tracking-widest text-xs"
                        >
                            {t('common.register')}
                            <Sparkles size={18} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="max-w-5xl mx-auto px-6 pb-28">
                <div className="grid md:grid-cols-3 gap-10">
                    {/* Feature 1 */}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-2xl shadow-stone-200/50 hover:shadow-black/5 hover:border-stone-200 transition-all duration-500 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-stone-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700 opacity-20" />

                        <div className="w-16 h-16 bg-[#1c1917]/5 rounded-2xl flex items-center justify-center mb-8 relative group-hover:bg-[#1c1917] transition-all duration-500">
                            <FileText size={28} className="text-[#1c1917] group-hover:text-white transition-colors" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border border-stone-200 rounded-lg flex items-center justify-center">
                                <Code size={8} className="text-stone-400" />
                            </div>
                        </div>

                        <h3 className="font-bold text-2xl text-[#1c1917] mb-4 tracking-tight">
                            {language === 'tr' ? 'Veri Senkronu' : 'Data Sync'}
                        </h3>
                        <p className="text-stone-500 leading-relaxed font-medium text-sm">
                            {language === 'tr'
                                ? 'Fikirlerinizi ve notlarınızı anında tüm cihazlarınızda güvenli bir şekilde senkronize edin.'
                                : 'Instantly synchronize your ideas and notes securely across all your devices.'}
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-2xl shadow-stone-200/50 hover:shadow-black/5 hover:border-stone-200 transition-all duration-500 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-stone-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700 opacity-20" />

                        <div className="w-16 h-16 bg-[#1c1917]/5 rounded-2xl flex items-center justify-center mb-8 relative group-hover:bg-[#1c1917] transition-all duration-500">
                            <Users size={28} className="text-[#1c1917] group-hover:text-white transition-colors" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border border-stone-200 rounded-lg flex items-center justify-center">
                                <Cpu size={8} className="text-stone-400" />
                            </div>
                        </div>

                        <h3 className="font-bold text-2xl text-[#1c1917] mb-4 tracking-tight">
                            {language === 'tr' ? 'Mimari İşbirliği' : 'Arch Collaboration'}
                        </h3>
                        <p className="text-stone-500 leading-relaxed font-medium text-sm">
                            {language === 'tr'
                                ? 'Ekibinizle teknik işbirliği ağları oluşturun ve fikirlerinizi canlı yayına alın.'
                                : 'Build technical collaboration networks with your team and take your ideas live.'}
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-2xl shadow-stone-200/50 hover:shadow-black/5 hover:border-stone-200 transition-all duration-500 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-stone-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700 opacity-20" />

                        <div className="w-16 h-16 bg-[#1c1917]/5 rounded-2xl flex items-center justify-center mb-8 relative group-hover:bg-[#1c1917] transition-all duration-500">
                            <Palette size={28} className="text-[#1c1917] group-hover:text-white transition-colors" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border border-stone-200 rounded-lg flex items-center justify-center">
                                <Shield size={8} className="text-stone-400" />
                            </div>
                        </div>

                        <h3 className="font-bold text-2xl text-[#1c1917] mb-4 tracking-tight">
                            {language === 'tr' ? 'Gelişmiş Stil' : 'Advanced Style'}
                        </h3>
                        <p className="text-stone-500 leading-relaxed font-medium text-sm">
                            {language === 'tr'
                                ? 'Modern ve minimalist arayüz mimarisi ile yaratıcılığınızı teknik düzeye taşıyın.'
                                : 'Elevate your creativity with modern and minimalist interface architecture.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-stone-200 bg-white py-12">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-stone-900 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                                <span className="text-white font-bold text-xl">C</span>
                            </div>
                            <span className="text-sm font-black tracking-widest uppercase text-[#1c1917]">Collabo</span>
                        </div>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.3em] font-mono">
                            {language === 'tr'
                                ? '©Tüm hakları saklıdır.'
                                : '©All rights reserved.'}
                        </p>
                    </div>
                </div>
            </footer>

            <style jsx>{`
                @keyframes logo-draw {
                    from { stroke-dasharray: 0 300; stroke-dashoffset: 0; }
                    to { stroke-dasharray: 300 0; stroke-dashoffset: 0; }
                }
                .animate-logo-draw {
                    animation: logo-draw 3s ease-out forwards;
                }
                @keyframes scan-y {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translateY(2500%); opacity: 0; }
                }
                .animate-scan-y {
                    animation: scan-y 4s linear infinite;
                }
            `}</style>
        </div>
    );
}
