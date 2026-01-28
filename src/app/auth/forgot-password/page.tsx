'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordReset } from '@/lib/auth';
import { ArrowLeft, Mail, CheckCircle, Database, ShieldCheck, Cpu } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function ForgotPasswordPage() {
    const { language } = useTranslation();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await sendPasswordReset(email);
            setSuccess(true);
        } catch (err: unknown) {
            console.error('Password reset error:', err);
            const errorCode = (err as { code?: string })?.code;

            if (errorCode === 'auth/user-not-found') {
                setError(language === 'tr'
                    ? 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.'
                    : 'No user found with this email address.');
            } else if (errorCode === 'auth/invalid-email') {
                setError(language === 'tr'
                    ? 'Geçersiz e-posta adresi.'
                    : 'Invalid email address.');
            } else if (errorCode === 'auth/too-many-requests') {
                setError(language === 'tr'
                    ? 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.'
                    : 'Too many attempts. Please try again later.');
            } else {
                setError(language === 'tr'
                    ? 'Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin.'
                    : 'Failed to send password reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf9] px-4 text-[#1c1917]">
            {/* Technical Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
                <div className="absolute top-0 left-0 w-full h-full border-[0.5px] border-[#1c1917]" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #1c1917 1px, transparent 1px), linear-gradient(to bottom, #1c1917 1px, transparent 1px)' }} />
            </div>

            <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Back Link */}
                <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-800 text-xs font-bold uppercase tracking-widest mb-10 transition-all group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    {language === 'tr' ? 'GİRİŞE DÖN' : 'BACK TO LOGIN'}
                </Link>

                {success ? (
                    <div className="bg-white border border-stone-200 rounded-[2.5rem] p-10 shadow-2xl shadow-stone-200/50 text-center animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4">
                            {language === 'tr' ? 'E-posta Gönderildi' : 'Email Sent'}
                        </h1>
                        <p className="text-stone-500 text-sm font-medium leading-relaxed mb-8">
                            {language === 'tr'
                                ? `Şifre sıfırlama bağlantısı ${email} adresine gönderildi. Lütfen gelen kutunuzu kontrol edin.`
                                : `Password reset link has been sent to ${email}. Please check your inbox.`}
                        </p>
                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    setSuccess(false);
                                    setEmail('');
                                }}
                                className="w-full py-4 bg-stone-100 text-[#1c1917] rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-200 transition-all active:scale-[0.98]"
                            >
                                {language === 'tr' ? 'FARKLI E-POSTA DENE' : 'TRY ANOTHER EMAIL'}
                            </button>
                            <Link
                                href="/auth/login"
                                className="block w-full py-4 bg-[#1c1917] text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition-all active:scale-[0.98] shadow-lg shadow-black/10"
                            >
                                {language === 'tr' ? 'GİRİŞ SAYFASINA DÖN' : 'BACK TO LOGIN'}
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header Section */}
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="relative w-20 h-20 mb-6 group">
                                <div className="absolute inset-0 bg-amber-500 rounded-2xl rotate-3 shadow-2xl transition-transform group-hover:rotate-6 duration-500" />
                                <div className="absolute inset-0 bg-white border-2 border-amber-500 rounded-2xl -rotate-3 transition-transform group-hover:-rotate-6 duration-500 flex items-center justify-center overflow-hidden">
                                    <Mail size={32} className="text-amber-500" />
                                </div>
                            </div>

                            <h1 className="text-3xl font-bold tracking-tighter mb-2 uppercase italic">
                                {language === 'tr' ? 'Şifre Kurtarma' : 'Recovery'}
                            </h1>
                            <p className="text-stone-500 text-sm font-medium">
                                {language === 'tr' ? 'Güvenlik anahtarınızı sıfırlayın' : 'Reset your security key'}
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs font-bold border border-red-100 flex items-center gap-3 animate-in shake duration-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                {error}
                            </div>
                        )}

                        {/* Form Card */}
                        <div className="bg-white border border-stone-200 rounded-[2.5rem] p-8 shadow-2xl shadow-stone-200/50">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                                        {language === 'tr' ? 'E-POSTA ADRESİ' : 'EMAIL ADDRESS'}
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

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-[#1c1917] text-white rounded-2xl font-bold uppercase tracking-[0.1em] hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-stone-900/10 active:scale-[0.98] mt-4 flex items-center justify-center gap-3 group"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {language === 'tr' ? 'BAĞLANTIYI GÖNDER' : 'SEND RESET LINK'}
                                            <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 pt-8 border-t border-stone-100 text-center">
                                <p className="text-stone-400 text-xs font-bold flex flex-col gap-2">
                                    <span className="uppercase tracking-widest">{language === 'tr' ? 'HATIRLADINIZ MI?' : 'REMEMBER?'}</span>
                                    <Link href="/auth/login" className="text-[#1c1917] text-sm hover:underline tracking-tight">
                                        {language === 'tr' ? 'Giriş paneline dönün' : 'Back to login panel'}
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* Footer Technical Ibares */}

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

