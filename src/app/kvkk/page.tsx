'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Scale, FileText, Lock } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function KVKKPage() {
    const { language } = useTranslation();

    return (
        <div className="min-h-screen bg-[#fafaf9] px-4 py-20 text-[#1c1917]">
            <div className="max-w-3xl mx-auto">
                {/* Back Link */}
                <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-800 text-xs font-bold uppercase tracking-widest mb-12 transition-all group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    {language === 'tr' ? 'KAYIT SAYFASINA DÖN' : 'BACK TO REGISTER'}
                </Link>

                <div className="bg-white border border-stone-200 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-stone-200/50">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-16 h-16 bg-[#1c1917] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-stone-900/10">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tighter uppercase italic">
                                {language === 'tr' ? 'Hukuki Metinler' : 'Legal Terms'}
                            </h1>
                            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">
                                {language === 'tr' ? 'Kullanım Koşulları ve KVKK' : 'Terms of Use & Privacy'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-12">
                        {/* Section 1 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-[#1c1917]">
                                <Scale size={20} />
                                <h2 className="text-xl font-bold italic uppercase tracking-tight">
                                    {language === 'tr' ? '1. Kullanım Koşulları' : '1. Terms of Use'}
                                </h2>
                            </div>
                            <div className="text-stone-600 text-sm leading-relaxed space-y-4 font-medium">
                                <p>
                                    {language === 'tr'
                                        ? 'Bu platform, eğitimciler ve öğrenciler arasında etkileşimi artırmak amacıyla tasarlanmış bir dijital pano sistemidir. Sisteme kayıt olan tüm kullanıcılar, platformu etik kurallar çerçevesinde kullanmayı taahhüt eder.'
                                        : 'This platform is a digital board system designed to increase interaction between educators and students. All registered users commit to using the platform within ethical rules.'}
                                </p>
                                <p>
                                    {language === 'tr'
                                        ? 'Paylaşılan içeriklerin sorumluluğu tamamen paylaşan kullanıcıya aittir. Yasa dışı, hakaret içeren veya telif haklarını ihlal eden içeriklerin paylaşımı yasaktır.'
                                        : 'The responsibility for shared content belongs entirely to the sharing user. It is forbidden to share illegal, offensive, or copyright-infringing content.'}
                                </p>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-[#1c1917]">
                                <FileText size={20} />
                                <h2 className="text-xl font-bold italic uppercase tracking-tight">
                                    {language === 'tr' ? '2. KVKK Aydınlatma Metni' : '2. Privacy & PDPL'}
                                </h2>
                            </div>
                            <div className="text-stone-600 text-sm leading-relaxed space-y-4 font-medium">
                                <p>
                                    {language === 'tr'
                                        ? 'Kişisel verileriniz (ad, soyad, e-posta), sadece platformun temel işlevlerini yerine getirebilmesi ve size daha iyi bir deneyim sunulabilmesi amacıyla işlenmektedir.'
                                        : 'Your personal data (name, surname, email) is processed only for the platform to perform its basic functions and to provide you with a better experience.'}
                                </p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>{language === 'tr' ? 'Verileriniz üçüncü şahıslarla reklam amaçlı paylaşılmaz.' : 'Your data is not shared with third parties for advertising purposes.'}</li>
                                    <li>{language === 'tr' ? 'Şifreleriniz modern şifreleme yöntemleri ile korunmaktadır.' : 'Your passwords are protected with modern encryption methods.'}</li>
                                    <li>{language === 'tr' ? 'Dilediğiniz zaman hesabınızı ve tüm verilerinizi silebilirsiniz.' : 'You can delete your account and all your data at any time.'}</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-[#1c1917]">
                                <Lock size={20} />
                                <h2 className="text-xl font-bold italic uppercase tracking-tight">
                                    {language === 'tr' ? '3. Güvenlik' : '3. Security'}
                                </h2>
                            </div>
                            <div className="text-stone-600 text-sm leading-relaxed font-medium">
                                <p>
                                    {language === 'tr'
                                        ? 'Sistemimiz Google Firebase altyapısını kullanarak dünya standartlarında güvenlik sağlar. Verileriniz şifrelenmiş tüneller üzerinden iletilir ve güvenli sunucularda saklanır.'
                                        : 'Our system provides world-class security using Google Firebase infrastructure. Your data is transmitted through encrypted tunnels and stored on secure servers.'}
                                </p>
                            </div>
                        </section>
                    </div>

                    <div className="mt-16 pt-8 border-t border-stone-100 flex justify-between items-center text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                        <span>© 2024 Vatan3 System</span>
                        <span>V.1.0.4-SECURE</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
