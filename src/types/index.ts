export interface User {
    uid: string;
    email: string;
    displayName: string;
    role: 'teacher' | 'student' | 'admin';
    photoURL?: string | null;
    createdAt: Date;
    lastSeen?: Date; // For online status tracking
    notificationPreferences?: {
        comment_reply: boolean;
        mention: boolean;
        new_comment: boolean;
        reaction: boolean;
        like: boolean;
        teacher_post: boolean;
        teacher_message: boolean;
        member_joined: boolean;
    };
    privacySettings?: {
        readReceipts: boolean;
        showOnlineStatus: boolean;
    };
    isSuspended?: boolean;
    suspensionReason?: string;
    suspendedAt?: Date | any;
    ipAddress?: string;
}

// Board member activity tracking (boards/{boardId}/memberActivity/{userId})
export interface BoardMemberActivity {
    userId: string;
    lastActiveAt: Date;
    displayName?: string;
    joinedAt?: Date;        // Panoya katılma tarihi
    noteCount?: number;     // Eklenen not sayısı
    commentCount?: number;  // Yapılan yorum sayısı
    messageCount?: number;  // Gönderilen mesaj sayısı
}

export interface Board {
    id: string;
    title: string;
    description?: string;
    ownerId: string;
    ownerName: string;
    members: string[]; // List of user IDs who joined the board
    backgroundColor: string;
    backgroundGradient?: string;
    backgroundImage?: string;
    backgroundType?: 'color' | 'gradient' | 'image';
    isPublic: boolean;
    allowAnonymous: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Gizlilik & İzin Ayarları
    permissions?: {
        // Yorum izinleri: everyone = linki olan herkes, members = sadece üyeler
        whoCanComment: 'everyone' | 'members';
        // Not ekleme izinleri  
        whoCanAddNotes: 'everyone' | 'members';
        // Chat izinleri: everyone = linki olan herkes, members = sadece üyeler
        whoCanChat: 'everyone' | 'members';
        // Dosya indirme izni
        allowFileDownload: boolean;
        // Üyelik onayı sistemi
        requireMemberApproval: boolean;
        pendingMembers?: string[]; // Onay bekleyen üye ID'leri
    };
    isDeleted?: boolean;
    deletedAt?: Date;
    expiresAt?: Date;
}

export interface Section {
    id: string;
    boardId: string;
    title: string;
    order: number;
    isPinned?: boolean; // Teachers can pin sections to top
    createdAt: Date;
}

export interface Note {
    id: string;
    boardId: string;
    sectionId: string; // Added sectionId
    authorId: string;
    authorName: string;
    authorPhotoURL?: string | null;
    content: string;
    type: 'text' | 'image' | 'link' | 'file' | 'poll' | 'audio' | 'video';
    imageUrl?: string;
    linkUrl?: string;
    linkTitle?: string;
    linkDescription?: string; // New: OG Description
    linkDomain?: string;      // New: e.g. youtube.com
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    // Multiple files support
    files?: { url: string; name: string; type?: string }[];
    audioUrl?: string;
    audioDuration?: number;
    // Video support
    videoUrl?: string;
    videoDuration?: number;
    videoThumbnail?: string;
    isPinned?: boolean;
    isLocked?: boolean;
    isDeleted?: boolean;
    deletedAt?: Date;
    expiresAt?: Date;
    pollOptions?: string[];
    pollVotes?: { [optionIndex: number]: string[] };
    reactions?: { [emoji: string]: string[] };
    color: string;
    positionX?: number; // Made optional as grid layout might not use it
    positionY?: number; // Made optional
    width?: number;     // Made optional
    height?: number;    // Made optional
    commentCount?: number;
    likes: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Comment {
    id: string;
    noteId: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string | null;
    content: string;
    createdAt: Date;
    // Reply fields
    replyToId?: string;
    replyToAuthor?: string;
    replyToContent?: string;
    // Like fields
    likes?: string[]; // Array of user IDs who liked this comment
}

export interface Message {
    id: string;
    boardId: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string | null;
    content: string;
    createdAt: Date;
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    // Media fields
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    audioDuration?: number; // For audio only
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    // Reply fields
    replyToId?: string;
    replyToAuthor?: string;
    replyToContent?: string;
    // Pin fields - Teachers can pin important messages
    isPinned?: boolean;
    pinnedBy?: string;
    pinnedAt?: Date;
    // Edit fields
    isEdited?: boolean;
    editedAt?: Date;
}

export interface Conversation {
    id: string; // Typically sorted_uid1_sorted_uid2
    participants: string[];
    participantDetails: {
        [userId: string]: {
            displayName: string;
            photoURL?: string | null;
            lastSeen?: Date | string;
        }
    };
    lastMessage?: string;
    lastMessageAt?: Date;
    lastMessageSenderId?: string;
    unreadCount: {
        [userId: string]: number;
    };
    typing?: {
        [userId: string]: boolean;
    };
    blockedBy?: string[]; // Array of user IDs who blocked the other person
    pinnedBy?: string[]; // Array of user IDs who pinned this conversation
    isEncrypted?: boolean; // E2E encryption enabled
    updatedAt: Date;
    createdAt: Date;
    // Group fields
    isGroup?: boolean;
    groupName?: string;
    groupImage?: string;
    createdBy?: string;
    admins?: string[];
}

export interface LinkPreview {
    url: string;
    title?: string;
    description?: string;
    image?: string;
}

export interface DirectMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    fileUrl?: string;
    fileName?: string;
    createdAt: Date;
    isRead: boolean;
    // Reply fields
    replyToId?: string;
    replyToAuthor?: string;
    replyToContent?: string;
    // Edit fields
    isEdited?: boolean;
    editedAt?: Date | string;
    isPinned?: boolean;
    // Reactions
    reactions?: { [emoji: string]: string[] };
    // Forwarding
    isForwarded?: boolean;
    originalSenderName?: string;
    // Link Preview
    linkPreview?: LinkPreview;
}

export interface Notification {
    id: string;
    userId: string; // Who receives the notification
    type:
    | 'comment_reply'
    | 'mention'
    | 'new_comment'
    | 'reaction'
    | 'like'
    | 'note'
    | 'announcement'
    | 'teacher_post'
    | 'teacher_message'
    | 'member_joined'
    | 'member_request'      // Üyelik isteği - Onay bekliyor
    | 'member_rejected'     // Üyelik isteği reddedildi
    | 'new_assignment'      // Legacy - keep for backwards compatibility
    | 'assignment_due'      // Legacy - keep for backwards compatibility
    | 'homework_assigned'   // Ödevlendirme - Yeni ödev atandığında
    | 'homework_reminder'   // Ödev Hatırlatma - Teslim tarihi yaklaştığında
    | 'assignment_graded'   // Ödev Değerlendirildi - Not/geribildirim verildiğinde
    | 'assignment_feedback' // Ödev Geribildirimi - Öğretmen yorum yaptığında
    | 'direct_message';
    title: string;
    message: string;
    fromUserId: string;
    fromUserName: string;
    boardId: string;
    boardTitle?: string;
    noteId?: string;
    commentId?: string;
    messageId?: string;
    assignmentId?: string;
    assignmentTitle?: string;
    dueDate?: Date;
    // Üyelik isteği için
    requestingUserId?: string;  // Katılmak isteyen kullanıcı ID'si
    isRead: boolean;
    createdAt: Date;
}

export const NOTE_COLORS = [
    '#fef3c7', // amber
    '#fce7f3', // pink
    '#dbeafe', // blue
    '#d1fae5', // green
    '#f3e8ff', // purple
    '#fed7aa', // orange
    '#e0e7ff', // indigo
    '#fecaca', // red
];

export const BOARD_COLORS = [
    '#f5f5f4', // stone
    '#fef3c7', // amber
    '#dbeafe', // blue
    '#d1fae5', // green
    '#f3e8ff', // purple
    '#fce7f3', // pink
];

export const BOARD_GRADIENTS = [
    'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', // Mist
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Acid
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Synthwave
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', // Blue Sky
    'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)', // Pastel
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Deep Purple
    'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)', // Bright Blue
    'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)', // Green
    'linear-gradient(to right, #fa709a 0%, #fee140 100%)', // Sunset
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Lavender
];

export const BOARD_IMAGES = [
    // Organized & Office
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=2000', // MacBook & Notebook
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000', // White Office

    // Abstract & Texture
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=2000', // Dark & Fluid
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000', // Blue Abstract
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=2000', // Gradient Mesh

    // Nature & Calm
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=2000', // Misty Mountains
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000', // Calm Beach
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=2000', // Yosemite
    'https://images.unsplash.com/photo-1501854140884-074cf2b2c3af?auto=format&fit=crop&q=80&w=2000', // Forest

    // Dark & Moody
    'https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=2000', // Dark Purple Gradient
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000', // Space/Tech
    'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80&w=2000', // Midnight
];

// Assignment System
export type AssignmentType = 'homework' | 'reminder'; // 'homework' = Ödevlendirme (teslim gerekli), 'reminder' = Hatırlatma (sadece bilgilendirme)

// Rubric (Değerlendirme Kriterleri) Sistemi
export interface RubricCriterion {
    id: string;
    title: string;           // Kriter başlığı (örn: "İçerik Kalitesi")
    description?: string;    // Kriter açıklaması
    maxPoints: number;       // Bu kriter için maksimum puan
    levels?: {               // İsteğe bağlı seviye tanımları
        points: number;
        description: string;
    }[];
}

export interface Rubric {
    id: string;
    name: string;
    description?: string;
    criteria: RubricCriterion[];
    totalPoints: number;
    createdBy: string;
    createdAt: Date;
    boardId?: string;        // Panoya özel rubrik
    isTemplate?: boolean;    // Şablon olarak kullanılabilir mi
}

// Kriter bazlı puanlama
export interface CriterionGrade {
    criterionId: string;
    points: number;
    comment?: string;
}

export interface Assignment {
    id: string;
    boardId: string;
    title: string;
    description: string;
    createdBy: string;
    createdByName: string;
    dueDate: Date;
    createdAt: Date;
    updatedAt?: Date;
    attachmentUrl?: string;
    attachmentName?: string;
    // Multiple attachments support
    attachments?: { url: string; name: string; type?: string }[];
    maxPoints: number;        // Artık zorunlu, varsayılan 100
    status: 'active' | 'closed';
    assignmentType: AssignmentType; // Ödevlendirme veya Hatırlatma
    allowLateSubmission: boolean;   // Geç teslime izin ver (varsayılan: true)
    lateSubmissionPenalty?: number; // Geç teslim puan kesintisi yüzdesi (örn: 10 = %10)
    rubricId?: string;              // Bağlı rubrik ID'si
    rubric?: Rubric;                // Inline rubrik (denormalized)
    category?: string;              // Kategori/etiket
    tags?: string[];                // Çoklu etiket
    order?: number;                 // Sıralama için (drag-and-drop)
}

export interface AssignmentSubmission {
    id: string;
    assignmentId: string;
    boardId: string;
    studentId: string;
    studentName: string;
    studentPhotoURL?: string | null;
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    // Multiple attachments support
    attachments?: { url: string; name: string; type?: string }[];
    submittedAt: Date;
    updatedAt?: Date;
    isLate?: boolean;             // Geç teslim işareti
    grade?: number;
    feedback?: string;
    gradedAt?: Date;
    gradedBy?: string;
    gradedByName?: string;
    // Kriter bazlı puanlama
    criterionGrades?: CriterionGrade[];
    // İntihal kontrolü - Gelişmiş
    plagiarismScore?: number;     // 0-1 benzerlik oranı
    plagiarismCheckedAt?: Date;
    plagiarismResult?: {          // Detaylı intihal sonuçları
        overallScore: number;
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        jaccardScore: number;
        ngramScore: number;
        cosineScore: number;
        lcsScore: number;
        sentenceScore: number;
        wordFrequencyScore: number;
        analysisDetails: {
            totalWords: number;
            uniqueWords: number;
            totalSentences: number;
            averageWordLength: number;
            vocabularyRichness: number;
            commonPhraseCount: number;
            suspiciousPatterns: string[];
        };
    };
    similarSubmissions?: {        // Benzer teslimler
        submissionId: string;
        studentName: string;
        similarity: number;
        matchedPhrases?: string[];
    }[];
}

