'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, handleRedirectResult } from '@/lib/auth';
import { useStore } from '@/store/useStore';
import { ArrowLeft, User, Mail, Lock, ShieldCheck, Fingerprint, Database, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

export default function RegisterPage() {
    const { t, language } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [acceptedKVKK, setAcceptedKVKK] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setUser } = useStore();

    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    useEffect(() => {
        const checkRedirect = async () => {
            if (isNative) return;
            try {
                const user = await handleRedirectResult();
                if (user) {
                    setUser(user);
                    router.push('/dashboard');
                }
            } catch (err: any) {
                console.error("Redirect check failed:", err);
            }
        };
        checkRedirect();
    }, [setUser, router, isNative]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError(language === 'tr' ? 'Şifre en az 6 karakter olmalıdır' : 'Password must be at least 6 characters');
            return;
        }

        if (!acceptedKVKK) {
            setError(language === 'tr' ? 'Lütfen Kullanım Koşulları ve KVKK metnini kabul edin' : 'Please accept Terms of Use and PDPL (KVKK)');
            return;
        }

        setLoading(true);

        try {
            const user = await signUp(email, password, displayName, 'student');
            setUser(user);
            window.location.href = '/dashboard';
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : (language === 'tr' ? 'Kayıt oluşturulamadı' : 'Registration failed');
            setError(errorMessage);
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true); // Re-use loading or add googleLoading
        try {
            const { signInWithGoogle } = await import('@/lib/auth');
            const user = await signInWithGoogle();
            if (user) {
                setUser(user);
                window.location.href = '/dashboard';
            }
        } catch (err: any) {
            setError(err.message || (language === 'tr' ? 'Google ile giriş başarısız' : 'Google login failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf9] px-4 py-12 text-[#1c1917]">
            {/* Technical Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
                <div className="absolute top-0 left-0 w-full h-full border-[0.5px] border-[#1c1917]" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #1c1917 1px, transparent 1px), linear-gradient(to bottom, #1c1917 1px, transparent 1px)' }} />
            </div>

            <div className="w-full max-w-[480px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-800 text-xs font-bold uppercase tracking-widest mb-10 transition-all group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    {language === 'tr' ? 'GERİ DÖN' : 'BACK TO HOME'}
                </Link>

                {/* Header / Logo Section */}
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="relative w-20 h-20 mb-6 group">
                        <div className="absolute inset-0 bg-[#1c1917] rounded-2xl -rotate-3 shadow-2xl transition-transform group-hover:-rotate-6 duration-500" />
                        <div className="absolute inset-0 bg-white border-2 border-[#1c1917] rounded-2xl rotate-3 transition-transform group-hover:rotate-6 duration-500 flex items-center justify-center overflow-hidden">
                            <Fingerprint size={32} className="text-[#1c1917]" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tighter mb-2 uppercase italic">{t('common.register')}</h1>

                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs font-bold border border-red-100 flex items-center gap-3 animate-in shake duration-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        {error}
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-white border border-stone-200 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-stone-200/50">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                                {t('auth.displayName')}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#1c1917] transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-[#1c1917]/10 transition-all font-medium text-sm"
                                    placeholder={language === 'tr' ? 'Adınız Soyadınız' : 'Full Name'}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                                {t('auth.email')}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#1c1917] transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-[#1c1917]/10 transition-all font-medium text-sm"
                                    placeholder="name@provider.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                                    {t('auth.password')}
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#1c1917] transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-[#1c1917]/10 transition-all font-medium text-sm"
                                        placeholder="••••••••"
                                        minLength={6}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                                    {language === 'tr' ? 'TEKRAR' : 'CONFIRM'}
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#1c1917] transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-[#1c1917]/10 transition-all font-medium text-sm"
                                        placeholder="••••••••"
                                        minLength={6}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* KVKK & Terms */}
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={acceptedKVKK}
                                        onChange={(e) => setAcceptedKVKK(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-5 h-5 border-2 border-stone-200 rounded-lg transition-all peer-checked:bg-[#1c1917] peer-checked:border-[#1c1917] group-hover:border-[#1c1917]" />
                                    <CheckCircle size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-[11px] text-stone-500 font-medium leading-relaxed">
                                    {language === 'tr' ? (
                                        <>
                                            <Link href="/kvkk" className="text-[#1c1917] font-bold hover:underline">Kullanım Koşulları</Link> ve <Link href="/kvkk" className="text-[#1c1917] font-bold hover:underline">KVKK Aydınlatma Metni</Link>'ni okudum, kabul ediyorum.
                                        </>
                                    ) : (
                                        <>
                                            I have read and agree to the <Link href="/kvkk" className="text-[#1c1917] font-bold hover:underline">Terms of Use</Link> and <Link href="/kvkk" className="text-[#1c1917] font-bold hover:underline">PDPL (KVKK)</Link> privacy policy.
                                        </>
                                    )}
                                </span>
                            </label>
                        </div>

                        {/* Note */}
                        <div className="bg-[#1c1917]/5 p-4 rounded-2xl text-[10px] text-stone-500 font-bold uppercase tracking-wider flex items-start gap-3">
                            <ShieldCheck size={16} className="text-[#1c1917] shrink-0" />
                            <p className="leading-relaxed">
                                {language === 'tr'
                                    ? 'VARAYILAN ROL: ÖĞRENCİ. YÖNETİCİ KONTROL PANELİNDEN YETKİ DEĞİŞTİRİLEBİLİR.'
                                    : 'DEFAULT ROLE: STUDENT. PERMISSIONS CAN BE ELEVATED VIA ADMIN CONSOLE.'}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#1c1917] text-white rounded-2xl font-bold uppercase tracking-[0.1em] hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-stone-900/10 active:scale-[0.98] mt-4 flex items-center justify-center gap-3 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {t('common.register')}
                                    <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        {!isNative && (
                            <>
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-stone-100"></span>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                                        <span className="bg-white px-4 text-stone-400">
                                            {language === 'tr' ? 'VEYA' : 'OR'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleSignIn}
                                    disabled={loading}
                                    className="w-full py-4 bg-white border-2 border-stone-200 text-stone-800 rounded-2xl font-bold uppercase tracking-[0.1em] hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm group"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span className="text-xs">{language === 'tr' ? 'GOOGLE İLE HIZLI KAYIT' : 'QUICK REGISTER WITH GOOGLE'}</span>
                                </button>
                            </>
                        )}
                    </form>

                    {/* Login Link */}
                    <div className="mt-8 pt-8 border-t border-stone-100 text-center">
                        <p className="text-stone-400 text-xs font-bold flex flex-col gap-2">
                            <span className="uppercase tracking-widest">{t('auth.hasAccount')}</span>
                            <Link href="/auth/login" className="text-[#1c1917] text-sm hover:underline tracking-tight">
                                {language === 'tr' ? 'Mevcut bir kimlik ile giriş yapın' : 'Sign in with an existing identity'}
                            </Link>
                        </p>
                    </div>
                </div>

            </div>

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
}

