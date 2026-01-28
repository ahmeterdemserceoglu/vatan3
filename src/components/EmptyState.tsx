'use client';

import { ReactNode } from 'react';
import {
    FolderOpen,
    MessageSquare,
    Bell,
    Users,
    FileText,
    Search,
    Inbox,
    Calendar,
    ClipboardList,
    StickyNote,
    Sparkles
} from 'lucide-react';

interface EmptyStateProps {
    type?: 'default' | 'board' | 'notes' | 'chat' | 'notifications' | 'members' | 'files' | 'search' | 'assignments' | 'comments';
    title?: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

// SVG Illustrations as components
const Illustrations = {
    default: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
                <linearGradient id="emptyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e7e5e4" />
                    <stop offset="100%" stopColor="#d6d3d1" />
                </linearGradient>
                <linearGradient id="emptyGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fafaf9" />
                    <stop offset="100%" stopColor="#f5f5f4" />
                </linearGradient>
            </defs>
            {/* Background circle */}
            <circle cx="100" cy="100" r="80" fill="url(#emptyGrad2)" />
            {/* Floating elements */}
            <rect x="60" y="70" width="80" height="60" rx="8" fill="url(#emptyGrad1)" className="animate-pulse" />
            <circle cx="75" cy="90" r="8" fill="#a8a29e" opacity="0.5" />
            <rect x="90" y="85" width="40" height="6" rx="3" fill="#a8a29e" opacity="0.4" />
            <rect x="90" y="95" width="30" height="6" rx="3" fill="#a8a29e" opacity="0.3" />
            <rect x="90" y="105" width="35" height="6" rx="3" fill="#a8a29e" opacity="0.25" />
            {/* Sparkle effects */}
            <circle cx="50" cy="50" r="3" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '2s' }} />
            <circle cx="150" cy="60" r="2" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            <circle cx="145" cy="140" r="2.5" fill="#fbbf24" className="animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
        </svg>
    ),

    board: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
                <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef3c7" />
                    <stop offset="100%" stopColor="#fcd34d" />
                </linearGradient>
            </defs>
            {/* Board background */}
            <rect x="30" y="40" width="140" height="120" rx="12" fill="#f5f5f4" stroke="#e7e5e4" strokeWidth="2" />
            {/* Columns */}
            <rect x="40" y="55" width="35" height="95" rx="6" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="1" />
            <rect x="82" y="55" width="35" height="95" rx="6" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="1" />
            <rect x="124" y="55" width="35" height="95" rx="6" fill="#fafaf9" stroke="#e7e5e4" strokeWidth="1" />
            {/* Note cards with animation */}
            <rect x="45" y="65" width="25" height="20" rx="4" fill="url(#boardGrad)" className="animate-pulse" style={{ animationDelay: '0s' }} />
            <rect x="87" y="65" width="25" height="25" rx="4" fill="#dbeafe" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
            <rect x="129" y="65" width="25" height="18" rx="4" fill="#d1fae5" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
            <rect x="45" y="90" width="25" height="15" rx="4" fill="#fce7f3" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
            {/* Plus icon hint */}
            <circle cx="100" cy="170" r="12" fill="#1c1917" />
            <path d="M95 170 H105 M100 165 V175" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),

    notes: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Floating sticky notes */}
            <g className="animate-bounce" style={{ animationDuration: '3s' }}>
                <rect x="40" y="60" width="50" height="50" rx="6" fill="#fef3c7" transform="rotate(-5 65 85)" />
                <rect x="45" y="70" width="30" height="4" rx="2" fill="#a8a29e" opacity="0.5" transform="rotate(-5 60 72)" />
                <rect x="45" y="78" width="25" height="4" rx="2" fill="#a8a29e" opacity="0.4" transform="rotate(-5 57 80)" />
            </g>
            <g className="animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
                <rect x="100" y="50" width="55" height="55" rx="6" fill="#dbeafe" transform="rotate(3 127 77)" />
                <rect x="108" y="62" width="35" height="4" rx="2" fill="#a8a29e" opacity="0.5" transform="rotate(3 125 64)" />
                <rect x="108" y="70" width="28" height="4" rx="2" fill="#a8a29e" opacity="0.4" transform="rotate(3 122 72)" />
                <rect x="108" y="78" width="32" height="4" rx="2" fill="#a8a29e" opacity="0.3" transform="rotate(3 124 80)" />
            </g>
            <g className="animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                <rect x="60" y="115" width="45" height="45" rx="6" fill="#d1fae5" transform="rotate(2 82 137)" />
                <rect x="68" y="125" width="25" height="4" rx="2" fill="#a8a29e" opacity="0.5" transform="rotate(2 80 127)" />
                <rect x="68" y="133" width="20" height="4" rx="2" fill="#a8a29e" opacity="0.4" transform="rotate(2 78 135)" />
            </g>
            {/* Pencil */}
            <g transform="translate(130, 120) rotate(45)">
                <rect x="0" y="0" width="8" height="40" rx="2" fill="#fbbf24" />
                <polygon points="0,40 4,50 8,40" fill="#1c1917" />
                <rect x="0" y="0" width="8" height="6" rx="2" fill="#f5f5f4" />
            </g>
        </svg>
    ),

    chat: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Chat bubbles */}
            <g className="animate-pulse" style={{ animationDuration: '2s' }}>
                <path d="M40 70 Q40 55 55 55 H110 Q125 55 125 70 V100 Q125 115 110 115 H70 L55 130 V115 H55 Q40 115 40 100 Z" fill="#e7e5e4" />
                <rect x="55" y="70" width="50" height="6" rx="3" fill="#a8a29e" opacity="0.6" />
                <rect x="55" y="82" width="40" height="6" rx="3" fill="#a8a29e" opacity="0.5" />
                <rect x="55" y="94" width="45" height="6" rx="3" fill="#a8a29e" opacity="0.4" />
            </g>
            <g className="animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                <path d="M160 100 Q160 85 145 85 H95 Q80 85 80 100 V125 Q80 140 95 140 H130 L145 155 V140 H145 Q160 140 160 125 Z" fill="#1c1917" />
                <rect x="95" y="100" width="45" height="5" rx="2.5" fill="white" opacity="0.8" />
                <rect x="95" y="110" width="35" height="5" rx="2.5" fill="white" opacity="0.6" />
                <rect x="95" y="120" width="40" height="5" rx="2.5" fill="white" opacity="0.4" />
            </g>
            {/* Typing indicator */}
            <g transform="translate(50, 150)">
                <circle cx="0" cy="0" r="4" fill="#a8a29e" className="animate-bounce" style={{ animationDuration: '0.6s' }} />
                <circle cx="12" cy="0" r="4" fill="#a8a29e" className="animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.1s' }} />
                <circle cx="24" cy="0" r="4" fill="#a8a29e" className="animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }} />
            </g>
        </svg>
    ),

    notifications: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Bell */}
            <g transform="translate(100, 100)">
                <path
                    d="M0 -50 C-25 -50 -40 -30 -40 0 V20 H-50 V30 H50 V20 H40 V0 C40 -30 25 -50 0 -50"
                    fill="#e7e5e4"
                    stroke="#d6d3d1"
                    strokeWidth="2"
                />
                <ellipse cx="0" cy="35" rx="12" ry="8" fill="#e7e5e4" stroke="#d6d3d1" strokeWidth="2" />
                <circle cx="0" cy="-50" r="6" fill="#d6d3d1" />
            </g>
            {/* ZZZ */}
            <g className="animate-pulse" style={{ animationDuration: '2s' }}>
                <text x="130" y="60" fontSize="20" fontWeight="bold" fill="#a8a29e" opacity="0.6">Z</text>
                <text x="145" y="45" fontSize="16" fontWeight="bold" fill="#a8a29e" opacity="0.4">Z</text>
                <text x="158" y="32" fontSize="12" fontWeight="bold" fill="#a8a29e" opacity="0.3">Z</text>
            </g>
            {/* Notification badge (empty) */}
            <circle cx="135" cy="85" r="12" fill="white" stroke="#e7e5e4" strokeWidth="2" strokeDasharray="4 2" />
        </svg>
    ),

    search: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Magnifying glass */}
            <circle cx="85" cy="85" r="40" fill="none" stroke="#e7e5e4" strokeWidth="8" />
            <line x1="115" y1="115" x2="155" y2="155" stroke="#e7e5e4" strokeWidth="10" strokeLinecap="round" />
            {/* Sparkles around */}
            <circle cx="85" cy="85" r="25" fill="#fafaf9" />
            <text x="75" y="93" fontSize="24" fill="#a8a29e">?</text>
            {/* Floating question marks */}
            <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                <text x="40" y="50" fontSize="14" fill="#d6d3d1">?</text>
            </g>
            <g className="animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}>
                <text x="140" y="60" fontSize="12" fill="#d6d3d1">?</text>
            </g>
            <g className="animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.6s' }}>
                <text x="50" y="160" fontSize="10" fill="#d6d3d1">?</text>
            </g>
        </svg>
    ),

    assignments: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Clipboard */}
            <rect x="50" y="40" width="100" height="130" rx="8" fill="#f5f5f4" stroke="#e7e5e4" strokeWidth="2" />
            <rect x="70" y="30" width="60" height="20" rx="6" fill="#1c1917" />
            <circle cx="100" cy="40" r="6" fill="#f5f5f4" />
            {/* Checklist items */}
            <g className="animate-pulse" style={{ animationDuration: '2s' }}>
                <rect x="65" y="65" width="14" height="14" rx="3" fill="none" stroke="#d6d3d1" strokeWidth="2" />
                <rect x="85" y="68" width="50" height="8" rx="4" fill="#e7e5e4" />
            </g>
            <g className="animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}>
                <rect x="65" y="90" width="14" height="14" rx="3" fill="none" stroke="#d6d3d1" strokeWidth="2" />
                <rect x="85" y="93" width="40" height="8" rx="4" fill="#e7e5e4" />
            </g>
            <g className="animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.6s' }}>
                <rect x="65" y="115" width="14" height="14" rx="3" fill="none" stroke="#d6d3d1" strokeWidth="2" />
                <rect x="85" y="118" width="55" height="8" rx="4" fill="#e7e5e4" />
            </g>
            <g className="animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.9s' }}>
                <rect x="65" y="140" width="14" height="14" rx="3" fill="none" stroke="#d6d3d1" strokeWidth="2" />
                <rect x="85" y="143" width="35" height="8" rx="4" fill="#e7e5e4" />
            </g>
        </svg>
    ),

    files: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Folder back */}
            <path d="M30 70 H70 L80 55 H170 V160 Q170 170 160 170 H40 Q30 170 30 160 Z" fill="#e7e5e4" />
            {/* Folder front */}
            <path d="M30 80 H170 V160 Q170 170 160 170 H40 Q30 170 30 160 Z" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="2" />
            {/* Empty folder icon */}
            <g transform="translate(100, 125)" className="animate-pulse">
                <circle cx="0" cy="0" r="20" fill="none" stroke="#d6d3d1" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="-8" y1="0" x2="8" y2="0" stroke="#d6d3d1" strokeWidth="2" strokeLinecap="round" />
            </g>
        </svg>
    ),

    members: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Central user */}
            <circle cx="100" cy="80" r="25" fill="#e7e5e4" />
            <circle cx="100" cy="70" r="12" fill="#d6d3d1" />
            <ellipse cx="100" cy="95" rx="18" ry="12" fill="#d6d3d1" />
            {/* Left user (faded) */}
            <g opacity="0.5" className="animate-pulse" style={{ animationDuration: '2s' }}>
                <circle cx="50" cy="100" r="18" fill="#e7e5e4" />
                <circle cx="50" cy="92" r="8" fill="#d6d3d1" />
                <ellipse cx="50" cy="108" rx="12" ry="8" fill="#d6d3d1" />
            </g>
            {/* Right user (faded) */}
            <g opacity="0.5" className="animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                <circle cx="150" cy="100" r="18" fill="#e7e5e4" />
                <circle cx="150" cy="92" r="8" fill="#d6d3d1" />
                <ellipse cx="150" cy="108" rx="12" ry="8" fill="#d6d3d1" />
            </g>
            {/* Connection lines (dashed) */}
            <line x1="75" y1="90" x2="68" y2="95" stroke="#d6d3d1" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="125" y1="90" x2="132" y2="95" stroke="#d6d3d1" strokeWidth="2" strokeDasharray="4 4" />
            {/* Plus hint */}
            <circle cx="100" cy="150" r="15" fill="#fafaf9" stroke="#d6d3d1" strokeWidth="2" />
            <line x1="93" y1="150" x2="107" y2="150" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" />
            <line x1="100" y1="143" x2="100" y2="157" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),

    comments: () => (
        <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Comment bubble outline */}
            <path
                d="M40 50 Q40 35 55 35 H145 Q160 35 160 50 V110 Q160 125 145 125 H80 L55 150 V125 H55 Q40 125 40 110 Z"
                fill="none"
                stroke="#e7e5e4"
                strokeWidth="3"
                strokeDasharray="8 4"
            />
            {/* Lines placeholder */}
            <g className="animate-pulse" opacity="0.4">
                <rect x="55" y="55" width="90" height="8" rx="4" fill="#d6d3d1" />
                <rect x="55" y="72" width="70" height="8" rx="4" fill="#d6d3d1" />
                <rect x="55" y="89" width="80" height="8" rx="4" fill="#d6d3d1" />
            </g>
            {/* Sparkle hint */}
            <g transform="translate(145, 40)">
                <Sparkles size={20} className="text-amber-400" />
            </g>
        </svg>
    ),
};

const defaultContent: Record<string, { icon: typeof FolderOpen; title: { tr: string; en: string }; description: { tr: string; en: string } }> = {
    default: {
        icon: Inbox,
        title: { tr: 'Henüz içerik yok', en: 'No content yet' },
        description: { tr: 'Burada gösterilecek bir şey yok', en: 'Nothing to show here' },
    },
    board: {
        icon: StickyNote,
        title: { tr: 'Henüz pano yok', en: 'No boards yet' },
        description: { tr: 'İlk panonuzu oluşturarak başlayın', en: 'Get started by creating your first board' },
    },
    notes: {
        icon: StickyNote,
        title: { tr: 'Henüz not yok', en: 'No notes yet' },
        description: { tr: 'Bu bölümde henüz not bulunmuyor', en: 'No notes in this section yet' },
    },
    chat: {
        icon: MessageSquare,
        title: { tr: 'Henüz mesaj yok', en: 'No messages yet' },
        description: { tr: 'Sohbeti başlatın!', en: 'Start the conversation!' },
    },
    notifications: {
        icon: Bell,
        title: { tr: 'Bildirim yok', en: 'No notifications' },
        description: { tr: 'Tüm bildirimleri gördünüz', en: 'You\'re all caught up' },
    },
    members: {
        icon: Users,
        title: { tr: 'Henüz üye yok', en: 'No members yet' },
        description: { tr: 'Panoyu paylaşarak üye davet edin', en: 'Share the board to invite members' },
    },
    files: {
        icon: FolderOpen,
        title: { tr: 'Henüz dosya yok', en: 'No files yet' },
        description: { tr: 'Dosyalar buraya eklenecek', en: 'Files will appear here' },
    },
    search: {
        icon: Search,
        title: { tr: 'Sonuç bulunamadı', en: 'No results found' },
        description: { tr: 'Farklı anahtar kelimeler deneyin', en: 'Try different keywords' },
    },
    assignments: {
        icon: ClipboardList,
        title: { tr: 'Ödev yok', en: 'No assignments' },
        description: { tr: 'Henüz ödev atanmamış', en: 'No assignments have been assigned yet' },
    },
    comments: {
        icon: MessageSquare,
        title: { tr: 'Henüz yorum yok', en: 'No comments yet' },
        description: { tr: 'İlk yorumu siz yapın!', en: 'Be the first to comment!' },
    },
};

export function EmptyState({
    type = 'default',
    title,
    description,
    action,
    className = ''
}: EmptyStateProps) {
    const content = defaultContent[type] || defaultContent.default;
    const Illustration = Illustrations[type as keyof typeof Illustrations] || Illustrations.default;

    // Detect language from document or default to 'tr'
    const lang = typeof document !== 'undefined'
        ? (document.documentElement.lang === 'en' ? 'en' : 'tr')
        : 'tr';

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
            {/* Illustration */}
            <div className="w-40 h-40 mb-6">
                <Illustration />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-stone-700 mb-2">
                {title || content.title[lang]}
            </h3>

            {/* Description */}
            <p className="text-sm text-stone-500 max-w-xs mb-6">
                {description || content.description[lang]}
            </p>

            {/* Action */}
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
}

// Pre-configured empty states for convenience
export function EmptyBoardState({ action }: { action?: ReactNode }) {
    return <EmptyState type="board" action={action} />;
}

export function EmptyNotesState({ action }: { action?: ReactNode }) {
    return <EmptyState type="notes" action={action} />;
}

export function EmptyChatState() {
    return <EmptyState type="chat" />;
}

export function EmptyNotificationsState() {
    return <EmptyState type="notifications" />;
}

export function EmptySearchState({ query }: { query?: string }) {
    return (
        <EmptyState
            type="search"
            description={query ? `"${query}" için sonuç bulunamadı` : undefined}
        />
    );
}

export function EmptyFilesState({ action }: { action?: ReactNode }) {
    return <EmptyState type="files" action={action} />;
}

export function EmptyMembersState({ action }: { action?: ReactNode }) {
    return <EmptyState type="members" action={action} />;
}

export function EmptyAssignmentsState({ action }: { action?: ReactNode }) {
    return <EmptyState type="assignments" action={action} />;
}

export function EmptyCommentsState() {
    return <EmptyState type="comments" />;
}
