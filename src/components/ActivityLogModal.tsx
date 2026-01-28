'use client';

import { useState, useEffect } from 'react';
import { X, Download, Calendar, Clock, Filter, FileText, User, StickyNote, MessageSquare, BookOpen, Settings, LogIn, LogOut, Trash2, Edit, Send, UserPlus, UserMinus, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { ActivityLog, ActivityType, getBoardActivityLogs, getActivityTypeLabel } from '@/lib/activityLog';
import { Timestamp } from 'firebase/firestore';

interface ActivityLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    boardTitle: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';

export function ActivityLogModal({ isOpen, onClose, boardId, boardTitle }: ActivityLogModalProps) {
    const { language } = useTranslation();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<DateFilter>('week');
    const [isDownloading, setIsDownloading] = useState(false);

    // Load logs
    useEffect(() => {
        if (!isOpen || !boardId) return;

        const loadLogs = async () => {
            setLoading(true);
            try {
                const fetchedLogs = await getBoardActivityLogs(boardId, 200);
                setLogs(fetchedLogs);
            } catch (error) {
                console.error('Failed to load activity logs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadLogs();
    }, [isOpen, boardId]);

    // Filter logs by date
    const filteredLogs = logs.filter(log => {
        const now = new Date();
        const logDate = log.createdAt;

        switch (dateFilter) {
            case 'today':
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return logDate >= today;
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return logDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return logDate >= monthAgo;
            default:
                return true;
        }
    });

    // Get icon for activity type
    const getIcon = (type: ActivityType) => {
        const iconProps = { size: 14 };
        switch (type) {
            case 'login': return <LogIn {...iconProps} className="text-emerald-500" />;
            case 'logout': return <LogOut {...iconProps} className="text-stone-400" />;
            case 'board_create': return <FileText {...iconProps} className="text-blue-500" />;
            case 'board_delete': return <Trash2 {...iconProps} className="text-red-500" />;
            case 'board_join': return <UserPlus {...iconProps} className="text-emerald-500" />;
            case 'board_leave': return <UserMinus {...iconProps} className="text-orange-500" />;
            case 'note_create': return <StickyNote {...iconProps} className="text-amber-500" />;
            case 'note_delete': return <Trash2 {...iconProps} className="text-red-500" />;
            case 'note_edit': return <Edit {...iconProps} className="text-blue-500" />;
            case 'comment_create': return <MessageSquare {...iconProps} className="text-indigo-500" />;
            case 'comment_delete': return <Trash2 {...iconProps} className="text-red-500" />;
            case 'message_send': return <Send {...iconProps} className="text-blue-500" />;
            case 'message_delete': return <Trash2 {...iconProps} className="text-red-500" />;
            case 'assignment_create': return <BookOpen {...iconProps} className="text-emerald-600" />;
            case 'assignment_submit': return <CheckCircle {...iconProps} className="text-emerald-500" />;
            case 'member_remove': return <UserMinus {...iconProps} className="text-red-500" />;
            case 'settings_change': return <Settings {...iconProps} className="text-stone-500" />;
            case 'profile_update': return <User {...iconProps} className="text-blue-500" />;
            default: return <Clock {...iconProps} className="text-stone-400" />;
        }
    };

    // Format date
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    // Download as PDF
    const handleDownloadPDF = async () => {
        setIsDownloading(true);

        try {
            // Create a simple text content for now (can be enhanced with proper PDF library)
            const filterLabel = {
                today: language === 'tr' ? 'Bugün' : 'Today',
                week: language === 'tr' ? 'Son 1 Hafta' : 'Last Week',
                month: language === 'tr' ? 'Son 1 Ay' : 'Last Month',
                all: language === 'tr' ? 'Tümü' : 'All',
            }[dateFilter];

            let content = `${language === 'tr' ? 'AKTİVİTE RAPORU' : 'ACTIVITY REPORT'}\n`;
            content += `${'='.repeat(50)}\n\n`;
            content += `${language === 'tr' ? 'Pano' : 'Board'}: ${boardTitle}\n`;
            content += `${language === 'tr' ? 'Tarih Aralığı' : 'Date Range'}: ${filterLabel}\n`;
            content += `${language === 'tr' ? 'Rapor Tarihi' : 'Report Date'}: ${formatDate(new Date())}\n`;
            content += `${language === 'tr' ? 'Toplam Kayıt' : 'Total Records'}: ${filteredLogs.length}\n\n`;
            content += `${'-'.repeat(50)}\n\n`;

            filteredLogs.forEach((log, index) => {
                content += `${index + 1}. [${formatDate(log.createdAt)}]\n`;
                content += `   ${language === 'tr' ? 'Kullanıcı' : 'User'}: ${log.userName}\n`;
                content += `   ${language === 'tr' ? 'Aksiyon' : 'Action'}: ${getActivityTypeLabel(log.type, language)}\n`;
                content += `   ${language === 'tr' ? 'Açıklama' : 'Description'}: ${log.description}\n\n`;
            });

            // Create and download file
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aktivite-raporu-${boardTitle}-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to generate report:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-matte-lg border border-stone-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-slate-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                                <Clock size={20} className="text-stone-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-stone-800">
                                    {language === 'tr' ? 'Aktivite Geçmişi' : 'Activity History'}
                                </h2>
                                <p className="text-xs text-stone-500">{boardTitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center justify-between mt-4 gap-3">
                        {/* Date Filter */}
                        <div className="flex bg-stone-100 rounded-lg p-0.5">
                            {([
                                { value: 'today', label: { tr: 'Bugün', en: 'Today' } },
                                { value: 'week', label: { tr: '1 Hafta', en: '1 Week' } },
                                { value: 'month', label: { tr: '1 Ay', en: '1 Month' } },
                                { value: 'all', label: { tr: 'Tümü', en: 'All' } },
                            ] as { value: DateFilter; label: { tr: string; en: string } }[]).map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setDateFilter(filter.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        dateFilter === filter.value
                                            ? "bg-white text-stone-800 shadow-sm"
                                            : "text-stone-500 hover:text-stone-700"
                                    )}
                                >
                                    {filter.label[language]}
                                </button>
                            ))}
                        </div>

                        {/* Download Button */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading || filteredLogs.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Download size={16} />
                            {isDownloading
                                ? (language === 'tr' ? 'İndiriliyor...' : 'Downloading...')
                                : (language === 'tr' ? 'Rapor İndir' : 'Download Report')
                            }
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-3 border-stone-300 border-t-indigo-500 rounded-full" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-stone-400">
                            <Clock size={48} className="mx-auto mb-3 opacity-50" />
                            <p>{language === 'tr' ? 'Bu dönemde aktivite bulunamadı.' : 'No activity found for this period.'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-stone-50 transition-colors">
                                    {/* Icon */}
                                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 mt-0.5">
                                        {getIcon(log.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-stone-800 text-sm">{log.userName}</span>
                                            <span className="text-xs text-stone-400">•</span>
                                            <span className="text-xs text-stone-500">
                                                {getActivityTypeLabel(log.type, language)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-stone-600 mt-0.5">{log.description}</p>
                                        <p className="text-xs text-stone-400 mt-1">{formatDate(log.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-stone-100 bg-stone-50 text-center text-xs text-stone-500">
                    {language === 'tr'
                        ? `${filteredLogs.length} kayıt gösteriliyor`
                        : `Showing ${filteredLogs.length} records`
                    }
                </div>
            </div>
        </div>
    );
}
