'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, limit, orderBy, query, onSnapshot, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthChange, getCurrentUser, signOut } from '@/lib/auth';
import { User } from '@/types';
import {
  Users, Layout, Activity, Settings, LogOut, ArrowRight, Loader2,
  User as UserIcon, PlusSquare, Trash2, StickyNote, UserPlus,
  LogIn, ShieldCheck, Zap, Globe, Cpu, Bell, Hammer,
  Send, ChevronRight, BarChart3, TrendingUp, AlertTriangle
} from 'lucide-react';
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

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ users: 0, boards: 0, logs: 0, notifications: 0 });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [systemHealth, setSystemHealth] = useState({ cpu: 12, ram: 45, latency: 18 });
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      try {
        if (authUser) {
          const userData = await getCurrentUser(authUser);
          if (userData?.role === 'admin') {
            setUser(userData);
            subscribeToActivityLogs();
            subscribeToSystemConfig();
          } else {
            setError('Yetkisiz giriş: Sadece adminler girebilir.');
            await signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error(e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
      const interval = setInterval(() => {
        fetchStats();
        // Simulate real-time system health changes
        setSystemHealth({
          cpu: Math.floor(Math.random() * 20) + 5,
          ram: Math.floor(Math.random() * 10) + 40,
          latency: Math.floor(Math.random() * 15) + 12
        });
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const { getCountFromServer } = await import('firebase/firestore');
      const usersSnap = await getCountFromServer(collection(db, 'users'));
      const boardsSnap = await getCountFromServer(collection(db, 'boards'));
      const logsSnap = await getCountFromServer(collection(db, 'activityLogs'));
      const notifsSnap = await getCountFromServer(collection(db, 'notifications'));

      setStats({
        users: usersSnap.data().count,
        boards: boardsSnap.data().count,
        logs: logsSnap.data().count,
        notifications: notifsSnap.data().count
      });
    } catch (e) {
      console.error('Stats fetch error:', e);
    }
  };

  const subscribeToActivityLogs = () => {
    const q = query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      })) as ActivityLog[];
      setActivities(logs);
    });
  };

  const subscribeToSystemConfig = () => {
    return onSnapshot(doc(db, 'systemConfig', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        setMaintenanceMode(snapshot.data().maintenanceMode || false);
      }
    });
  };

  const toggleMaintenance = async () => {
    const newMode = !maintenanceMode;
    setMaintenanceMode(newMode);
    try {
      await setDoc(doc(db, 'systemConfig', 'settings'), {
        maintenanceMode: newMode,
        updatedAt: serverTimestamp(),
        updatedBy: user?.displayName || 'Admin'
      }, { merge: true });
    } catch (e) {
      setMaintenanceMode(!newMode);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'announcement',
        title: 'Sistem Duyurusu',
        message: broadcastMessage,
        fromUserId: user?.uid,
        fromUserName: user?.displayName || 'Admin',
        isRead: false,
        createdAt: serverTimestamp()
      });
      setBroadcastMessage('');
      setShowBroadcast(false);
      alert('Duyuru tüm kullanıcılara gönderildi!');
    } catch (e) {
      alert('Hata oluştu.');
    }
  };

  // Activity Chart Simulation Data
  const chartData = useMemo(() => {
    return [30, 45, 35, 60, 55, 80, 70, 90, 85, 95].map((val, i) => ({
      h: val,
      x: i * 10
    }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-indigo-500 animate-pulse" size={24} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        {/* Abstract background shapes */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" />

        <div className="w-full max-w-md glass p-8 rounded-[2.5rem] relative z-10 border-white/5">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-3xl flex items-center justify-center transform rotate-6 shadow-2xl shadow-indigo-500/40 group hover:rotate-12 transition-transform duration-500">
              <ShieldCheck size={40} className="text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-center text-white mb-2 tracking-tight">COLLABO<span className="text-indigo-500">ADMIN</span></h1>
          <p className="text-stone-500 text-center mb-10 text-sm font-medium">Lütfen kimlik bilgilerinizi doğrulayın</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs mb-6 flex items-center gap-3">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={async (e) => {
            e.preventDefault();
            const email = (e.target as any).email.value;
            const password = (e.target as any).password.value;
            try {
              setLoading(true);
              const { signIn } = await import('@/lib/auth');
              await signIn(email, password);
            } catch (err: any) {
              setError('Giriş başarısız: ' + err.message);
              setLoading(false);
            }
          }} className="space-y-4">
            <div className="relative group">
              <input
                name="email"
                type="email"
                placeholder="E-posta"
                className="w-full bg-stone-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-stone-900 transition-all font-medium text-sm"
                required
              />
            </div>
            <div className="relative group">
              <input
                name="password"
                type="password"
                placeholder="Şifre"
                className="w-full bg-stone-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-stone-900 transition-all font-medium text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-5 rounded-[1.5rem] transition-all active:scale-[0.98] shadow-xl shadow-indigo-500/20 mt-4 flex items-center justify-center gap-2"
            >
              Paneli Aç <ChevronRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020202] text-stone-100 p-5 pb-24 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent -z-10 pointer-events-none" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -z-10 animate-float" />

      {/* Top Navigation */}
      <nav className="flex items-center justify-between mb-10 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">COLLABO <span className="text-stone-500 font-medium">ADMIN</span></h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Sistem Aktif</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowBroadcast(true)}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-stone-400 hover:text-white transition-colors relative"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-black" />
          </button>
          <Link href="/settings" className="group">
            <div className="flex items-center gap-3 glass pl-2 pr-4 py-1.5 rounded-full hover:bg-white/5 transition-all">
              <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-stone-800 flex items-center justify-center text-xs font-bold">{user.displayName?.[0]}</div>
                )}
              </div>
              <span className="text-xs font-bold hidden sm:block">{user.displayName}</span>
            </div>
          </Link>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">

        {/* Left Column: Stats & Performance */}
        <div className="lg:col-span-8 space-y-6">

          {/* Main Hero Card with Chart */}
          <section className="glass rounded-[2.5rem] p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-500/10 transition-colors duration-700" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">Genel Bakış</p>
                <h2 className="text-4xl font-black text-white tracking-tight">Sistem <br />Performansı</h2>
              </div>

              <div className="flex gap-4">
                {[
                  { label: 'Kullanıcılar', val: stats.users, icon: Users, color: 'text-indigo-400' },
                  { label: 'Panolar', val: stats.boards, icon: Layout, color: 'text-purple-400' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white/5 rounded-2xl p-4 min-w-[120px]">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon size={14} className={s.color} />
                      <span className="text-[10px] font-bold text-stone-500 uppercase">{s.label}</span>
                    </div>
                    <p className="text-2xl font-black text-white">{s.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Activity Chart */}
            <div className="h-48 w-full flex items-end gap-1 px-2 relative">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 group/bar relative">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500/40 to-indigo-500 rounded-t-lg transition-all duration-1000 ease-out hover:from-indigo-400 hover:to-indigo-300"
                    style={{ height: `${d.h}%` }}
                  />
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 glass px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity">
                    {d.h}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 px-2">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                <span key={day} className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{day}</span>
              ))}
            </div>
          </section>

          {/* Quick Actions Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Kullanıcılar', link: '/users', color: 'indigo', icon: Users, count: stats.users },
              { name: 'Panolar', link: '/boards', color: 'purple', icon: Layout, count: stats.boards },
              { name: 'Loglar', link: '/activity', color: 'amber', icon: Activity, count: stats.logs },
              { name: 'Ayarlar', link: '/settings', color: 'stone', icon: Settings, count: null }
            ].map((action, i) => (
              <Link
                key={i}
                href={action.link}
                className="glass rounded-3xl p-6 hover:bg-white/5 transition-all group active:scale-95"
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500",
                  `bg-${action.color}-500/20 text-${action.color}-500`
                )}>
                  <action.icon size={24} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{action.name}</h3>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tight">
                  {action.count !== null ? `${action.count} Kayıt` : 'Sistem'}
                </p>
              </Link>
            ))}
          </section>

          {/* Activity Feed */}
          <section className="glass rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Son Aktiviteler</h3>
                <p className="text-xs text-stone-500">Sistem üzerinde gerçekleşen son olaylar</p>
              </div>
              <Link href="/activity" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">Tümünü Gör</Link>
            </div>

            <div className="divide-y divide-white/5">
              {activities.length > 0 ? (
                activities.slice(0, 5).map((log) => {
                  const iconMap: any = {
                    'login': 'LogIn', 'logout': 'LogOut', 'board_create': 'PlusSquare',
                    'board_delete': 'Trash2', 'note_create': 'StickyNote', 'member_join': 'UserPlus', 'default': 'Activity'
                  };
                  const iconName = iconMap[log.type] || iconMap['default'];
                  const IconComp = (LucideIcons as any)[iconName] || LucideIcons.Activity;

                  return (
                    <div key={log.id} className="p-6 flex items-start gap-4 hover:bg-white/[0.02] transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-stone-900 border border-white/5 flex items-center justify-center shrink-0 text-stone-500 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                        <IconComp size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-300 leading-snug">
                          <span className="text-white font-bold">{log.userName}</span> {log.description.replace(log.userName || '', '').trim()}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Globe size={10} className="text-stone-600" />
                          <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{formatDate(log.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center text-stone-600 font-bold uppercase tracking-widest text-xs">Aktivite Yok</div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: System Health & Maintenance */}
        <div className="lg:col-span-4 space-y-6">

          {/* Health Stats */}
          <section className="glass rounded-[2rem] p-8">
            <h3 className="text-lg font-black text-white mb-6">Sistem Sağlığı</h3>
            <div className="space-y-6">
              {[
                { label: 'CPU Kullanımı', val: systemHealth.cpu, color: 'indigo', icon: Cpu },
                { label: 'Sunucu Belleği', val: systemHealth.ram, color: 'purple', icon: Zap },
                { label: 'API Gecikme', val: systemHealth.latency, unit: 'ms', color: 'emerald', icon: Globe }
              ].map((h, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded bg-${h.color}-500/10 flex items-center justify-center`}>
                        <h.icon size={12} className={`text-${h.color}-500`} />
                      </div>
                      <span className="text-xs font-bold text-stone-400">{h.label}</span>
                    </div>
                    <span className="text-xs font-black text-white">{h.val}{h.unit || '%'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000", `bg-${h.color}-500`)}
                      style={{ width: h.unit ? `${(h.val / 100) * 100}%` : `${h.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Maintenance Toggle */}
          <section className={cn(
            "rounded-[2rem] p-8 transition-all duration-500 border overflow-hidden relative",
            maintenanceMode
              ? "bg-amber-500/10 border-amber-500/20"
              : "glass border-transparent"
          )}>
            {maintenanceMode && (
              <div className="absolute top-0 right-0 p-4 animate-pulse">
                <AlertTriangle size={32} className="text-amber-500/20" />
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700",
                maintenanceMode ? "bg-amber-500 text-black shadow-lg shadow-amber-500/40" : "bg-stone-800 text-stone-500"
              )}>
                <Hammer size={24} />
              </div>
              <button
                onClick={toggleMaintenance}
                className={cn(
                  "relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-500 px-1",
                  maintenanceMode ? "bg-amber-500" : "bg-stone-800"
                )}
              >
                <div className={cn(
                  "w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-500 transform",
                  maintenanceMode ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

            <h3 className="text-lg font-black text-white mb-1">Bakım Modu</h3>
            <p className="text-xs text-stone-500 font-medium leading-relaxed">
              {maintenanceMode
                ? "Sistem şu an tüm kullanıcılar için kapalı. Sadece yöneticiler erişebilir."
                : "Sistem aktif. Tüm kullanıcılar uygulamaya normal şekilde erişebilir."}
            </p>
          </section>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-[2rem] p-6">
              <TrendingUp size={24} className="text-emerald-500 mb-4" />
              <p className="text-[10px] font-black text-stone-500 uppercase mb-1">Aktivite</p>
              <h4 className="text-xl font-black text-white">+{stats.logs}</h4>
            </div>
            <div className="glass rounded-[2rem] p-6">
              <Bell size={24} className="text-indigo-500 mb-4" />
              <p className="text-[10px] font-black text-stone-500 uppercase mb-1">Bildirim</p>
              <h4 className="text-xl font-black text-white">{stats.notifications}</h4>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full glass rounded-[1.5rem] p-4 flex items-center justify-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-black uppercase tracking-widest">Oturumu Kapat</span>
          </button>
        </div>
      </div>

      {/* Broadcast Modal Overlay */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass w-full max-w-xl rounded-[2.5rem] p-10 border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl -mr-10 -mt-10" />

            <button onClick={() => setShowBroadcast(false)} className="absolute top-6 right-6 text-stone-500 hover:text-white transition-colors">
              <Trash2 size={24} />
            </button>

            <div className="w-16 h-16 bg-indigo-600/20 text-indigo-500 rounded-3xl flex items-center justify-center mb-8">
              <Send size={28} />
            </div>

            <h2 className="text-3xl font-black text-white mb-2 leading-tight">Sistem <br />Duyurusu Gönder</h2>
            <p className="text-stone-400 text-sm mb-8">Bu mesaj anında tüm kullanıcıların bildirim merkezinde görünecektir.</p>

            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Mesajınızı buraya yazın..."
              className="w-full h-40 bg-stone-900/50 border border-white/5 rounded-3xl p-6 text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-none mb-6 font-medium"
            />

            <button
              onClick={sendBroadcast}
              className="w-full bg-white text-black font-black py-5 rounded-[1.5rem] hover:bg-indigo-500 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl"
            >
              Herkesle Paylaş <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-12 text-center pb-10">
        <p className="text-[10px] font-black text-stone-700 uppercase tracking-[0.2em]">Collabo Admin Core v2.4.0 • Realtime Engine Alpha</p>
      </footer>
    </main>
  );
}
