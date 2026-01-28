'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BackHeader from '@/components/BackHeader';
import { Search, Loader2, Activity, LogIn, LogOut, PlusSquare, Trash2, StickyNote, UserPlus, Filter } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface ActivityLog {
    id: string;
    type: string;
    description: string;
    createdAt: any;
    userName?: string;
    userId?: string;
}

export default function ActivityPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const fetchLogs = async (isInitial = false) => {
        setLoading(true);
        try {
            let q;
            // Karmaşık sorgular için Firestore index gerekebilir.
            // Şimdilik sadece basit sıralama ve filtreleme yapalım.

            const constraints: any[] = [orderBy('createdAt', 'desc')];

            if (typeFilter !== 'all') {
                constraints.unshift(where('type', '==', typeFilter));
            }

            if (isInitial) {
                constraints.push(limit(30));
                q = query(collection(db, 'activityLogs'), ...constraints);
            } else if (lastDoc) {
                constraints.push(startAfter(lastDoc));
                constraints.push(limit(30));
                q = query(collection(db, 'activityLogs'), ...constraints);
            } else {
                setLoading(false);
                return;
            }

            const snapshot = await getDocs(q);
            const newLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
            })) as ActivityLog[];

            // Client-side search for simplicity (Firestore text search is limited)
            // Not: Bu sadece çekilen veriyi filtreler, tüm veritabanında aramaz. 
            // Gerçek bir admin panelinde Algolia veya benzeri gerekir.
            const filteredLogs = searchTerm
                ? newLogs.filter(l => l.description.toLowerCase().includes(searchTerm.toLowerCase()) || l.userName?.toLowerCase().includes(searchTerm.toLowerCase()))
                : newLogs;

            if (isInitial) {
                setLogs(filteredLogs);
            } else {
                setLogs(prev => [...prev, ...filteredLogs]);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === 30);
        } catch (error) {
            console.error('Fetch logs error:', error);
            // Index hatası olursa konsola düşer, linki verir.
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLastDoc(null);
        fetchLogs(true);
    }, [typeFilter]); // Search term is handle client-side for this chunk or we debounce reload

    // Helper to get dynamic icon
    const getActivityIcon = (type: string) => {
        const iconMap: Record<string, keyof typeof LucideIcons> = {
            'login': 'LogIn',
            'logout': 'LogOut',
            'board_create': 'PlusSquare',
            'board_delete': 'Trash2',
            'note_create': 'StickyNote',
            'member_join': 'UserPlus',
            'default': 'Activity'
        };
        const iconName = iconMap[type] || 'Activity';
        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Activity;
        return <IconComponent size={18} />;
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'login': 'Giriş',
            'logout': 'Çıkış',
            'board_create': 'Pano Oluşturma',
            'board_delete': 'Pano Silme',
            'note_create': 'Not Ekleme',
            'member_join': 'Üye Katılımı',
        };
        return labels[type] || type;
    };

    return (
        <div className="min-h-screen bg-black text-stone-100 pb-20">
            <BackHeader title="Sistem Logları" />

            {/* Filters */}
            <div className="p-4 bg-stone-900/50 backdrop-blur-md sticky top-[65px] z-40 border-b border-stone-800 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                    <input
                        type="text"
                        placeholder="Loglarda ara (Kullanıcı, işlem)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {[
                        { id: 'all', label: 'Tümü' },
                        { id: 'login', label: 'Girişler' },
                        { id: 'board_create', label: 'Pano: Yeni' },
                        { id: 'board_delete', label: 'Pano: Silindi' },
                        { id: 'note_create', label: 'Notlar' },
                    ].map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setTypeFilter(filter.id)}
                            className={cn(
                                "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                                typeFilter === filter.id
                                    ? "bg-indigo-500 border-indigo-500 text-white"
                                    : "bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-3">
                {logs.map((log) => (
                    <div key={log.id} className="bg-stone-900 border border-stone-800 p-4 rounded-xl flex items-start gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1",
                            "bg-stone-800 text-stone-400"
                        )}>
                            {getActivityIcon(log.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider bg-stone-800 px-1.5 py-0.5 rounded">
                                    {getTypeLabel(log.type)}
                                </span>
                                <span className="text-[10px] text-stone-500 whitespace-nowrap ml-2">
                                    {formatDate(log.createdAt)}
                                </span>
                            </div>
                            <p className="text-sm text-stone-200 leading-snug">
                                <span className="text-indigo-400 font-semibold">{log.userName || 'Bilinmeyen'}</span> {log.description.replace(log.userName || '', '').trim()}
                            </p>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-indigo-500" />
                    </div>
                )}

                {!loading && logs.length === 0 && (
                    <div className="text-center text-stone-500 py-10">
                        <Activity size={40} className="mx-auto mb-3 opacity-20" />
                        Kayıt bulunamadı.
                    </div>
                )}

                {!loading && hasMore && (
                    <button
                        onClick={() => fetchLogs()}
                        className="w-full py-4 text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors"
                    >
                        Daha fazla yükle
                    </button>
                )}
            </div>
        </div>
    );
}
