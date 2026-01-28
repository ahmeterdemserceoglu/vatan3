'use client';

import { useState, useEffect, memo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Hammer, AlertCircle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';

// Memo kullanarak gereksiz render'ları önleyip performansı artırıyoruz
export const MaintenanceGuard = memo(({ children }: { children: React.ReactNode }) => {
    const [maintenance, setMaintenance] = useState({ active: false, message: '' });
    const { user, isLoading } = useStore();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Uygulama ömrü boyunca SADECE 1 KEZ çalışır.
        const unsub = onSnapshot(doc(db, 'systemConfig', 'settings'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setMaintenance({
                    active: data.maintenanceMode || false,
                    message: data.maintenanceMessage || 'Sistem şu an bakımda.'
                });
            }
            setIsChecking(false);
        }, (error) => {
            console.error("Bakım kontrolü hatası:", error);
            setIsChecking(false);
        });

        return () => unsub();
    }, []);

    // Adminler her zaman erişebilir (Modu kapatabilmek için şart)
    const isAdmin = user?.role === 'admin';

    // Veri gelene kadar ana uygulamayı göster (Beyaz ekranı önlemek için)
    if (isChecking) return <>{children}</>;

    // Bakım aktifse ve kullanıcı admin değilse HER ŞEYİ (Login dahil) engelle
    if (maintenance.active && !isAdmin) {
        return (
            <div className="fixed inset-0 z-[99999] bg-[#fafaf9] flex items-center justify-center p-6 text-center">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                <div className="max-w-md w-full space-y-8 relative">
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-amber-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-amber-500/40">
                            <Hammer size={48} className="text-white" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Bakımdayız</h1>
                        <p className="text-stone-500 font-medium px-6 text-lg">
                            {maintenance.message}
                        </p>
                    </div>

                    <div className="bg-white border-2 border-stone-100 p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 flex items-center gap-4 text-left mx-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Tahmini Dönüş</p>
                            <p className="text-sm font-bold text-stone-800 tracking-tight">Çalışmalar hızla tamamlanıyor.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
});

MaintenanceGuard.displayName = 'MaintenanceGuard';
