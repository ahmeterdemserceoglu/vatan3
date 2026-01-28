/**
 * Activity Log System
 * Tracks user actions for security and audit purposes
 */

import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    limit,
    getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

export type ActivityType =
    | 'login'           // Kullanıcı giriş yaptı
    | 'logout'          // Kullanıcı çıkış yaptı
    | 'board_create'    // Pano oluşturdu
    | 'board_delete'    // Pano sildi
    | 'board_join'      // Panoya katıldı
    | 'board_leave'     // Panodan ayrıldı
    | 'board_transfer'  // Pano sahipliği devredildi
    | 'note_create'     // Not oluşturdu
    | 'note_delete'     // Not sildi
    | 'note_edit'       // Not düzenledi
    | 'comment_create'  // Yorum yaptı
    | 'comment_delete'  // Yorum sildi
    | 'message_send'    // Mesaj gönderdi
    | 'message_delete'  // Mesaj sildi
    | 'assignment_create' // Ödev oluşturdu
    | 'assignment_submit' // Ödev teslim etti
    | 'member_remove'   // Üye çıkardı
    | 'settings_change' // Ayar değiştirdi
    | 'profile_update'  // Profil güncelledi
    | 'admin_action'    // Genel admin eylemi
    | 'system_update'   // Sistem güncellemesi
    | 'audit_log';      // Önemli denetim kaydı

export interface ActivityLog {
    id: string;
    userId: string;
    userName: string;
    type: ActivityType;
    description: string;
    metadata?: {
        boardId?: string;
        boardTitle?: string;
        noteId?: string;
        noteTitle?: string;
        targetUserId?: string;
        targetUserName?: string;
        ip?: string;
        userAgent?: string;
        [key: string]: any;
    };
    createdAt: Date;
}

/**
 * Log an activity
 */
export async function logActivity(data: {
    userId: string;
    userName: string;
    type: ActivityType;
    description: string;
    metadata?: ActivityLog['metadata'];
}): Promise<string> {
    const activityData = {
        ...data,
        createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'activityLogs'), activityData);
    return docRef.id;
}

/**
 * Get activity logs for a specific board
 */
export function subscribeToBoardActivityLogs(
    boardId: string,
    callback: (logs: ActivityLog[]) => void,
    maxLogs: number = 50
) {
    const q = query(
        collection(db, 'activityLogs'),
        where('metadata.boardId', '==', boardId),
        orderBy('createdAt', 'desc'),
        limit(maxLogs)
    );

    return onSnapshot(q, (snapshot) => {
        const logs: ActivityLog[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as ActivityLog);
        });
        callback(logs);
    });
}

/**
 * Get activity logs for a specific user
 */
export function subscribeToUserActivityLogs(
    userId: string,
    callback: (logs: ActivityLog[]) => void,
    maxLogs: number = 50
) {
    const q = query(
        collection(db, 'activityLogs'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(maxLogs)
    );

    return onSnapshot(q, (snapshot) => {
        const logs: ActivityLog[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as ActivityLog);
        });
        callback(logs);
    });
}

/**
 * Get recent activity logs for a board (one-time fetch)
 */
export async function getBoardActivityLogs(
    boardId: string,
    maxLogs: number = 50
): Promise<ActivityLog[]> {
    const q = query(
        collection(db, 'activityLogs'),
        where('metadata.boardId', '==', boardId),
        orderBy('createdAt', 'desc'),
        limit(maxLogs)
    );

    const snapshot = await getDocs(q);
    const logs: ActivityLog[] = [];

    snapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        } as ActivityLog);
    });

    return logs;
}

/**
 * Get activity type label in Turkish/English
 */
export function getActivityTypeLabel(type: ActivityType, language: 'tr' | 'en'): string {
    const labels: Record<ActivityType, { tr: string; en: string }> = {
        login: { tr: 'Giriş yaptı', en: 'Logged in' },
        logout: { tr: 'Çıkış yaptı', en: 'Logged out' },
        board_create: { tr: 'Pano oluşturdu', en: 'Created board' },
        board_delete: { tr: 'Pano sildi', en: 'Deleted board' },
        board_join: { tr: 'Panoya katıldı', en: 'Joined board' },
        board_leave: { tr: 'Panodan ayrıldı', en: 'Left board' },
        board_transfer: { tr: 'Pano sahipliğini devretti', en: 'Transferred board ownership' },
        note_create: { tr: 'Not oluşturdu', en: 'Created note' },
        note_delete: { tr: 'Not sildi', en: 'Deleted note' },
        note_edit: { tr: 'Not düzenledi', en: 'Edited note' },
        comment_create: { tr: 'Yorum yaptı', en: 'Commented' },
        comment_delete: { tr: 'Yorum sildi', en: 'Deleted comment' },
        message_send: { tr: 'Mesaj gönderdi', en: 'Sent message' },
        message_delete: { tr: 'Mesaj sildi', en: 'Deleted message' },
        assignment_create: { tr: 'Ödev oluşturdu', en: 'Created assignment' },
        assignment_submit: { tr: 'Ödev teslim etti', en: 'Submitted assignment' },
        member_remove: { tr: 'Üye çıkardı', en: 'Removed member' },
        settings_change: { tr: 'Ayar değiştirdi', en: 'Changed settings' },
        profile_update: { tr: 'Profil güncelledi', en: 'Updated profile' },
        admin_action: { tr: 'Yönetici eylemi', en: 'Admin action' },
        system_update: { tr: 'Sistem güncellemesi', en: 'System update' },
        audit_log: { tr: 'Denetim kaydı', en: 'Audit log' },
    };

    return labels[type]?.[language] || type;
}

/**
 * Get activity icon name (for lucide-react icons)
 */
export function getActivityIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
        login: 'LogIn',
        logout: 'LogOut',
        board_create: 'Plus',
        board_delete: 'Trash2',
        board_join: 'UserPlus',
        board_leave: 'UserMinus',
        board_transfer: 'Crown',
        note_create: 'StickyNote',
        note_delete: 'Trash2',
        note_edit: 'Edit',
        comment_create: 'MessageSquare',
        comment_delete: 'Trash2',
        message_send: 'Send',
        message_delete: 'Trash2',
        assignment_create: 'BookOpen',
        assignment_submit: 'CheckCircle',
        member_remove: 'UserMinus',
        settings_change: 'Settings',
        profile_update: 'User',
        admin_action: 'ShieldAlert',
        system_update: 'RefreshCw',
        audit_log: 'ClipboardCheck',
    };

    return icons[type] || 'Activity';
}
