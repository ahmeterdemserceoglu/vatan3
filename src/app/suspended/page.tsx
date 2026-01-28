'use client';

import { ShieldAlert, LogOut, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { logoutUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ADMIN_EMAIL, getMailtoLink } from '@/lib/constants';

export default function SuspendedPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const handleLogout = async () => {
        await logoutUser();
        router.push('/auth/login');
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert size={40} className="text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-stone-900 mb-2">
                    Hesabınız Askıya Alındı
                </h1>

                <p className="text-stone-500 mb-8 leading-relaxed">
                    Güvenlik politikalarımız veya kullanım şartları ihlali nedeniyle hesabınıza erişim yönetici tarafından kısıtlanmıştır.
                </p>

                <div className="bg-stone-50 rounded-2xl p-4 mb-8 text-left border border-stone-100">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Info size={14} /> Ne yapabilirsiniz?
                    </h3>
                    <ul className="text-sm text-stone-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-stone-400 mt-2 shrink-0" />
                            <span>Bir hata olduğunu düşünüyorsanız <strong>{ADMIN_EMAIL}</strong> adresine e-posta gönderin.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-stone-400 mt-2 shrink-0" />
                            <span>Kullanım şartlarını tekrar gözden geçirin.</span>
                        </li>
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => window.location.href = getMailtoLink('Hesap Askıya Alınma Başvurusu')}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-stone-900 text-white rounded-xl font-semibold hover:bg-stone-800 transition-all"
                    >
                        <MessageCircle size={18} />
                        Destek Ekibiyle İletişime Geç
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-semibold hover:bg-stone-50 transition-all"
                    >
                        <LogOut size={18} />
                        Çıkış Yap
                    </button>
                </div>

                <p className="mt-8 text-xs text-stone-400">
                    © {new Date().getFullYear()} Collabo Security Systems
                </p>
            </div>
        </div>
    );
}

function Info({ size }: { size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}
