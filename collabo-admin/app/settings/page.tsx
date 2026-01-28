'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, signOut, sendPasswordReset } from '@/lib/auth';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';
import BackHeader from '@/components/BackHeader';
import { LogOut, User as UserIcon, Shield, Lock, Hammer, Save, ChevronRight } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState('Daha iyi bir deneyim için sistem güncelleniyor.');

    useEffect(() => {
        const fetchUser = async () => {
            if (auth.currentUser) {
                const userData = await getCurrentUser(auth.currentUser);
                setUser(userData);
            }
        };
        fetchUser();

        // Admin panelinde de senkronize kalmak için dinleyici
        return onSnapshot(doc(db, 'systemConfig', 'settings'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setMaintenanceMode(data.maintenanceMode || false);
                setMaintenanceMessage(data.maintenanceMessage || 'Daha iyi bir deneyim için sistem güncelleniyor.');
            }
        });
    }, []);

    const toggleMaintenance = async (newMode: boolean) => {
        // Optimistic update
        const prevMode = maintenanceMode;
        setMaintenanceMode(newMode);

        try {
            await setDoc(doc(db, 'systemConfig', 'settings'), {
                maintenanceMode: newMode,
                maintenanceMessage: maintenanceMessage,
                updatedBy: user?.displayName || 'Admin',
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error: any) {
            setMaintenanceMode(prevMode);
            console.error('Bakım modu hatası:', error);
            // Hata detayını kullanıcıya göster (Örn: Quota Exceeded veya Permission Denied)
            alert('Hata Oluştu: ' + error.message);
        }
    };

    const saveMessage = async () => {
        try {
            await setDoc(doc(db, 'systemConfig', 'settings'), {
                maintenanceMessage: maintenanceMessage,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert('Mesaj güncellendi.');
        } catch (e) {
            alert('Hata oluştu.');
        }
    };

    return (
        <div className="min-h-screen bg-black text-stone-100">
            <BackHeader title="Ayarlar" />
            <div className="p-4 space-y-6">

                {/* Bakım Kartı */}
                <div className="bg-stone-900 border border-stone-800 rounded-[2rem] p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                maintenanceMode ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "bg-stone-800 text-stone-500"
                            )}>
                                <Hammer size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-lg leading-tight">Bakım Modu</p>
                                <p className="text-xs text-stone-500 mt-1">{maintenanceMode ? 'Şu an aktif' : 'Şu an kapalı'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleMaintenance(!maintenanceMode)}
                            className={cn(
                                "relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300",
                                maintenanceMode ? "bg-amber-500" : "bg-stone-800"
                            )}
                        >
                            <span className={cn(
                                "inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300",
                                maintenanceMode ? "translate-x-7" : "translate-x-1"
                            )} />
                        </button>
                    </div>

                    {maintenanceMode && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="relative group">
                                <textarea
                                    value={maintenanceMessage}
                                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                                    className="w-full bg-black border border-stone-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-amber-500/50 h-24 resize-none"
                                />
                                <button onClick={saveMessage} className="absolute bottom-3 right-3 p-2 bg-amber-500 text-black rounded-xl hover:scale-105 active:scale-90 transition-all">
                                    <Save size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-800">
                    <button onClick={() => signOut()} className="w-full p-5 flex items-center justify-between hover:bg-stone-800/30 transition-colors">
                        <div className="flex items-center gap-3 text-red-500">
                            <LogOut size={18} />
                            <p className="font-semibold text-sm">Çıkış Yap</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
