import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

export function formatDate(date: any): string {
    if (!date) return '';

    // Handle Firestore Timestamp (has toDate method)
    if (typeof date.toDate === 'function') {
        date = date.toDate();
    }
    // Handle seconds timestamp
    else if (typeof date === 'object' && date.seconds) {
        date = new Date(date.seconds * 1000);
    }
    // Handle string or number
    else if (typeof date === 'string' || typeof date === 'number') {
        date = new Date(date);
    }

    // Check if valid date
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Relative time for last 24 hours
    if (diffInSeconds < 60) {
        return 'az önce';
    } else if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        return `${mins} dk önce`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} sa önce`;
    }

    try {
        return new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    } catch (e) {
        console.error('Date formatting error:', e);
        return '';
    }
}
