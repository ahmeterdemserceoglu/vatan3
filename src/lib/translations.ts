export type Language = 'tr' | 'en';

export const translations = {
    // Common / General
    common: {
        loading: { tr: 'Yükleniyor...', en: 'Loading...' },
        save: { tr: 'Kaydet', en: 'Save' },
        cancel: { tr: 'İptal', en: 'Cancel' },
        delete: { tr: 'Sil', en: 'Delete' },
        edit: { tr: 'Düzenle', en: 'Edit' },
        close: { tr: 'Kapat', en: 'Close' },
        confirm: { tr: 'Onayla', en: 'Confirm' },
        back: { tr: 'Geri', en: 'Back' },
        next: { tr: 'İleri', en: 'Next' },
        submit: { tr: 'Gönder', en: 'Submit' },
        search: { tr: 'Ara', en: 'Search' },
        filter: { tr: 'Filtrele', en: 'Filter' },
        all: { tr: 'Tümü', en: 'All' },
        yes: { tr: 'Evet', en: 'Yes' },
        no: { tr: 'Hayır', en: 'No' },
        or: { tr: 'veya', en: 'or' },
        and: { tr: 've', en: 'and' },
        copy: { tr: 'Kopyala', en: 'Copy' },
        copied: { tr: 'Kopyalandı!', en: 'Copied!' },
        download: { tr: 'İndir', en: 'Download' },
        share: { tr: 'Paylaş', en: 'Share' },
        settings: { tr: 'Ayarlar', en: 'Settings' },
        profile: { tr: 'Profil', en: 'Profile' },
        logout: { tr: 'Çıkış Yap', en: 'Logout' },
        login: { tr: 'Giriş Yap', en: 'Login' },
        register: { tr: 'Kayıt Ol', en: 'Register' },
        you: { tr: 'Sen', en: 'You' },
    },

    // Header
    header: {
        myBoards: { tr: 'Panolarım', en: 'My Boards' },
        notifications: { tr: 'Bildirimler', en: 'Notifications' },
        markAllRead: { tr: 'Tümünü Okundu İşaretle', en: 'Mark All as Read' },
        noNotifications: { tr: 'Henüz bildirim yok', en: 'No notifications yet' },
        justNow: { tr: 'Şimdi', en: 'Just now' },
    },

    // Auth
    auth: {
        welcomeBack: { tr: 'Tekrar Hoş Geldiniz', en: 'Welcome Back' },
        signInToContinue: { tr: 'Devam etmek için giriş yapın', en: 'Sign in to continue' },
        signInWithGoogle: { tr: 'Google ile Giriş Yap', en: 'Sign in with Google' },
        signInWithEmail: { tr: 'E-posta ile Giriş Yap', en: 'Sign in with Email' },
        email: { tr: 'E-posta', en: 'Email' },
        password: { tr: 'Şifre', en: 'Password' },
        forgotPassword: { tr: 'Şifremi Unuttum', en: 'Forgot Password?' },
        noAccount: { tr: 'Hesabınız yok mu?', en: "Don't have an account?" },
        hasAccount: { tr: 'Zaten hesabınız var mı?', en: 'Already have an account?' },
        createAccount: { tr: 'Hesap Oluştur', en: 'Create Account' },
        displayName: { tr: 'Görünen Ad', en: 'Display Name' },
    },

    // Dashboard / Home
    dashboard: {
        welcome: { tr: 'Hoş Geldiniz', en: 'Welcome' },
        myBoards: { tr: 'Panolarım', en: 'My Boards' },
        joinedBoards: { tr: 'Katıldığım Panolar', en: 'Joined Boards' },
        createBoard: { tr: 'Pano Oluştur', en: 'Create Board' },
        joinBoard: { tr: 'Panoya Katıl', en: 'Join Board' },
        noBoards: { tr: 'Henüz pano oluşturmadınız', en: "You haven't created any boards yet" },
        noJoinedBoards: { tr: 'Henüz bir panoya katılmadınız', en: "You haven't joined any boards yet" },
        createFirstBoard: { tr: 'İlk panonuzu oluşturun', en: 'Create your first board' },
        boardsYouOwn: { tr: 'Sahip olduğunuz panolar', en: 'Boards you own' },
        boardsYouJoined: { tr: 'Üye olduğunuz panolar', en: 'Boards you joined' },
    },

    // Board
    board: {
        title: { tr: 'Pano Başlığı', en: 'Board Title' },
        description: { tr: 'Açıklama', en: 'Description' },
        members: { tr: 'Üyeler', en: 'Members' },
        owner: { tr: 'Sahip', en: 'Owner' },
        teacher: { tr: 'Öğretmen', en: 'Teacher' },
        student: { tr: 'Öğrenci', en: 'Student' },
        admin: { tr: 'Sistem Yetkilisi', en: 'System Admin' },
        member: { tr: 'Üye', en: 'Member' },
        join: { tr: 'Katıl', en: 'Join' },
        leave: { tr: 'Ayrıl', en: 'Leave' },
        leaveConfirm: { tr: 'Panodan ayrılmak istediğinize emin misiniz?', en: 'Are you sure you want to leave this board?' },
        leaveSuccess: { tr: 'Panodan başarıyla ayrıldınız', en: 'You have successfully left the board' },
        leaveError: { tr: 'Panodan ayrılırken bir hata oluştu', en: 'An error occurred while leaving the board' },
        deleteBoard: { tr: 'Panoyu Sil', en: 'Delete Board' },
        deleteSuccess: { tr: 'Pano başarıyla silindi', en: 'Board deleted successfully' },
        deleteError: { tr: 'Pano silinirken bir hata oluştu', en: 'An error occurred while deleting the board' },
        shareBoard: { tr: 'Panoyu Paylaş', en: 'Share Board' },
        copyLink: { tr: 'Linki Kopyala', en: 'Copy Link' },
        boardId: { tr: 'Pano ID', en: 'Board ID' },
        addSection: { tr: 'Bölüm Ekle', en: 'Add Section' },
        addNote: { tr: 'Not Ekle', en: 'Add Note' },
        chat: { tr: 'Sohbet', en: 'Chat' },
        files: { tr: 'Dosyalar', en: 'Files' },
        uncategorized: { tr: 'Genel (Kategorisiz)', en: 'General (Uncategorized)' },
        noNotesInSection: { tr: 'Bu bölümde henüz not yok', en: 'No notes in this section yet' },
        searchNotes: { tr: 'Notlarda ara...', en: 'Search notes...' },
        filterByType: { tr: 'Türe göre filtrele', en: 'Filter by type' },
        boardNotFound: { tr: 'Pano bulunamadı', en: 'Board not found' },
        noAccess: { tr: 'Bu panoya erişim izniniz yok', en: "You don't have access to this board" },
    },

    // Notes
    note: {
        addNote: { tr: 'Not Ekle', en: 'Add Note' },
        editNote: { tr: 'Notu Düzenle', en: 'Edit Note' },
        deleteNote: { tr: 'Notu Sil', en: 'Delete Note' },
        deleteConfirm: { tr: 'Bu notu silmek istediğinize emin misiniz?', en: 'Are you sure you want to delete this note?' },
        content: { tr: 'İçerik', en: 'Content' },
        contentPlaceholder: { tr: 'Notunuzu buraya yazın...', en: 'Write your note here...' },
        color: { tr: 'Renk', en: 'Color' },
        type: { tr: 'Tür', en: 'Type' },
        text: { tr: 'Metin', en: 'Text' },
        image: { tr: 'Görsel', en: 'Image' },
        link: { tr: 'Link', en: 'Link' },
        file: { tr: 'Dosya', en: 'File' },
        poll: { tr: 'Anket', en: 'Poll' },
        audio: { tr: 'Ses', en: 'Audio' },
        pin: { tr: 'Sabitle', en: 'Pin' },
        unpin: { tr: 'Sabitlemeyi Kaldır', en: 'Unpin' },
        pinned: { tr: 'Sabitlendi', en: 'Pinned' },
        readMore: { tr: 'Devamını Oku', en: 'Read More' },
        comments: { tr: 'Yorumlar', en: 'Comments' },
        noComments: { tr: 'Henüz yorum yok', en: 'No comments yet' },
        addComment: { tr: 'Yorum ekle...', en: 'Add a comment...' },
        reply: { tr: 'Yanıtla', en: 'Reply' },
        like: { tr: 'Beğen', en: 'Like' },
        liked: { tr: 'Beğenildi', en: 'Liked' },
        vote: { tr: 'Oy Ver', en: 'Vote' },
        votes: { tr: 'oy', en: 'votes' },
        totalVotes: { tr: 'toplam oy', en: 'total votes' },
        imageUrl: { tr: 'Görsel URL', en: 'Image URL' },
        linkUrl: { tr: 'Link URL', en: 'Link URL' },
        pollOptions: { tr: 'Anket Seçenekleri', en: 'Poll Options' },
        addOption: { tr: 'Seçenek Ekle', en: 'Add Option' },
        optionPlaceholder: { tr: 'Seçenek', en: 'Option' },
        record: { tr: 'Kaydet', en: 'Record' },
        stopRecording: { tr: 'Kaydı Durdur', en: 'Stop Recording' },
        uploadFile: { tr: 'Dosya Yükle', en: 'Upload File' },
        uploading: { tr: 'Yükleniyor...', en: 'Uploading...' },
    },

    // Sections
    section: {
        addSection: { tr: 'Bölüm Ekle', en: 'Add Section' },
        sectionTitle: { tr: 'Bölüm Başlığı', en: 'Section Title' },
        deleteSection: { tr: 'Bölümü Sil', en: 'Delete Section' },
        deleteConfirm: { tr: 'Bu bölümü silmek istediğinize emin misiniz? İçindeki tüm notlar da silinecek.', en: 'Are you sure you want to delete this section? All notes inside will also be deleted.' },
        editSection: { tr: 'Bölümü Düzenle', en: 'Edit Section' },
        pinSection: { tr: 'Bölümü Sabitle', en: 'Pin Section' },
        unpinSection: { tr: 'Sabitlemeyi Kaldır', en: 'Unpin Section' },
        pinned: { tr: 'Sabitlendi', en: 'Pinned' },
    },

    // Chat
    chat: {
        boardChat: { tr: 'Pano Sohbeti', en: 'Board Chat' },
        noMessages: { tr: 'Henüz mesaj yok. Sohbeti başlat!', en: 'No messages yet. Start the conversation!' },
        messagePlaceholder: { tr: 'Mesaj yazın... (@ile bahset)', en: 'Type a message... (@mention)' },
        replyTo: { tr: 'Yanıt:', en: 'Reply to:' },
        deleteMessage: { tr: 'Bu mesajı silmek istediğinize emin misiniz?', en: 'Are you sure you want to delete this message?' },
        today: { tr: 'Bugün', en: 'Today' },
        yesterday: { tr: 'Dün', en: 'Yesterday' },
        loginToChat: { tr: 'Sohbete katılmak için giriş yapmalısınız.', en: 'You must log in to join the chat.' },
    },

    // Calendar
    calendar: {
        calendarView: { tr: 'Takvim', en: 'Calendar' },
        listView: { tr: 'Liste', en: 'List' },
        noEventsToday: { tr: 'Bugün etkinlik yok', en: 'No events today' },
        noEventsThisMonth: { tr: 'Bu ay etkinlik yok', en: 'No events this month' },
        eventsOn: { tr: 'Etkinlikler:', en: 'Events on:' },
        monthNames: {
            tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
            en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        },
        dayNames: {
            tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
    },

    // Members Modal
    members: {
        boardMembers: { tr: 'Pano Üyeleri', en: 'Board Members' },
        noMembers: { tr: 'Henüz üye yok', en: 'No members yet' },
        inviteMembers: { tr: 'Üye Davet Et', en: 'Invite Members' },
        shareToInvite: { tr: 'Pano ID\'sini paylaşarak üye davet edin', en: 'Share the Board ID to invite members' },
        lastActive: { tr: 'Son aktif', en: 'Last active' },
        online: { tr: 'Çevrimiçi', en: 'Online' },
        neverActive: { tr: 'Henüz aktif olmadı', en: 'Never active' },
        // Search & Filter
        searchMembers: { tr: 'Üye ara...', en: 'Search members...' },
        filterAll: { tr: 'Tümü', en: 'All' },
        filterTeachers: { tr: 'Öğretmenler', en: 'Teachers' },
        filterStudents: { tr: 'Öğrenciler', en: 'Students' },
        // Sort
        sortBy: { tr: 'Sırala', en: 'Sort by' },
        sortName: { tr: 'İsim (A-Z)', en: 'Name (A-Z)' },
        sortLastActive: { tr: 'Son aktif', en: 'Last active' },
        sortJoinDate: { tr: 'Katılma tarihi', en: 'Join date' },
        // Profile
        viewProfile: { tr: 'Profili Görüntüle', en: 'View Profile' },
        joinedOn: { tr: 'Katılma tarihi', en: 'Joined on' },
        notes: { tr: 'not', en: 'notes' },
        comments: { tr: 'yorum', en: 'comments' },
        messages: { tr: 'mesaj', en: 'messages' },
        activity: { tr: 'Aktivite', en: 'Activity' },
        noActivity: { tr: 'Henüz aktivite yok', en: 'No activity yet' },
        // Management
        removeMember: { tr: 'Üyeyi Çıkar', en: 'Remove Member' },
        removeConfirm: { tr: 'Bu üyeyi panodan çıkarmak istediğinize emin misiniz?', en: 'Are you sure you want to remove this member from the board?' },
    },

    // Join Board Modal
    joinBoardModal: {
        title: { tr: 'Panoya Katıl', en: 'Join Board' },
        boardIdLabel: { tr: 'Pano ID', en: 'Board ID' },
        boardIdPlaceholder: { tr: 'Örn: 7y8d9f...', en: 'E.g.: 7y8d9f...' },
        boardIdHelp: { tr: 'Katılmak istediğiniz panonun ID\'sini girin. Pano sahibiyle iletişime geçerek bu ID\'yi öğrenebilirsiniz.', en: 'Enter the ID of the board you want to join. Contact the board owner to get this ID.' },
        boardNotFound: { tr: 'Pano bulunamadı. Lütfen ID\'yi kontrol edin.', en: 'Board not found. Please check the ID.' },
        joinError: { tr: 'Panoya katılırken bir hata oluştu.', en: 'An error occurred while joining the board.' },
        requestSent: { tr: 'İstek Gönderildi!', en: 'Request Sent!' },
        approvalMessage: { tr: 'Pano sahibi onayladığında panoya erişebileceksiniz.', en: 'You will be able to access the board once the owner approves.' },
        alreadyPending: { tr: 'Üyelik isteğiniz zaten beklemede.', en: 'Your join request is already pending.' },
    },

    // Create Board Modal
    createBoardModal: {
        title: { tr: 'Yeni Pano Oluştur', en: 'Create New Board' },
        boardTitle: { tr: 'Pano Başlığı', en: 'Board Title' },
        boardTitlePlaceholder: { tr: 'Panonuzun adı', en: 'Name of your board' },
        description: { tr: 'Açıklama (İsteğe bağlı)', en: 'Description (Optional)' },
        descriptionPlaceholder: { tr: 'Panonuz hakkında kısa bir açıklama', en: 'A brief description about your board' },
        backgroundColor: { tr: 'Arkaplan Rengi', en: 'Background Color' },
        create: { tr: 'Oluştur', en: 'Create' },
        creating: { tr: 'Oluşturuluyor...', en: 'Creating...' },
    },

    // Notifications
    notifications: {
        notificationTitle: { tr: 'Bildirimler', en: 'Notifications' },
        markAllRead: { tr: 'Tümünü Okundu İşaretle', en: 'Mark All as Read' },
        noNotifications: { tr: 'Henüz bildirim yok', en: 'No notifications yet' },
        // Notification types
        commentReply: { tr: 'Yorumuna yanıt geldi', en: 'Someone replied to your comment' },
        mention: { tr: 'Senden bahsedildi', en: 'You were mentioned' },
        newComment: { tr: 'Yeni yorum', en: 'New comment' },
        reaction: { tr: 'Notuna tepki geldi', en: 'Someone reacted to your note' },
        like: { tr: 'Notun beğenildi', en: 'Your note was liked' },
        teacherPost: { tr: 'Öğretmeniniz post paylaştı', en: 'Your teacher shared a post' },
        teacherMessage: { tr: 'Öğretmeniniz mesaj yazdı', en: 'Your teacher sent a message' },
        memberJoined: { tr: 'Yeni üye katıldı!', en: 'New member joined!' },
        memberJoinedMessage: { tr: 'panosuna katıldı. Ona merhaba de!', en: 'joined the board. Say hello!' },
        likeMessage: { tr: 'notunu beğendi', en: 'liked your note' },
        reactionMessage: { tr: 'notuna tepki bıraktı', en: 'reacted to your note' },
        teacherPostMessage: { tr: 'yeni bir post paylaştı', en: 'shared a new post' },
        teacherMessageText: { tr: 'sohbete mesaj gönderdi', en: 'sent a message to chat' },
    },

    // Reactions
    reactions: {
        like: { tr: 'Beğen', en: 'Like' },
        love: { tr: 'Sev', en: 'Love' },
        funny: { tr: 'Komik', en: 'Funny' },
        wow: { tr: 'Süper', en: 'Wow' },
        congrats: { tr: 'Tebrik', en: 'Congrats' },
    },

    // File Manager
    fileManager: {
        title: { tr: 'Dosya Yöneticisi', en: 'File Manager' },
        noFiles: { tr: 'Henüz dosya yok', en: 'No files yet' },
        allFiles: { tr: 'Tüm Dosyalar', en: 'All Files' },
    },

    // Errors
    errors: {
        somethingWentWrong: { tr: 'Bir şeyler yanlış gitti', en: 'Something went wrong' },
        tryAgain: { tr: 'Tekrar deneyin', en: 'Try again' },
        networkError: { tr: 'Ağ hatası', en: 'Network error' },
        unauthorized: { tr: 'Yetkisiz erişim', en: 'Unauthorized access' },
        notFound: { tr: 'Bulunamadı', en: 'Not found' },
    },

    // Time
    time: {
        justNow: { tr: 'Şimdi', en: 'Just now' },
        minutesAgo: { tr: 'dk önce', en: 'min ago' },
        hoursAgo: { tr: 'sa önce', en: 'hr ago' },
        daysAgo: { tr: 'gün önce', en: 'days ago' },
    },
    // Admin & Role Management
    admin: {
        title: { tr: 'Sistem Yetki Yönetimi', en: 'System Role Management' },
        description: { tr: 'Kullanıcı rollerini atayın ve yetki seviyelerini belirleyin.', en: 'Assign user roles and define permission levels.' },
        tabs: {
            users: { tr: 'Kullanıcılar', en: 'Users' },
            permissions: { tr: 'Yetki Ayarları', en: 'Permission Config' },
        },
        searchPlaceholder: { tr: 'Kullanıcı ara...', en: 'Search users...' },
        userCount: { tr: 'KULLANICI', en: 'USERS' },
        noUsers: { tr: 'Kullanıcı bulunamadı', en: 'No users found' },
        saveAll: { tr: 'TÜMÜNÜ KAYDET', en: 'SAVE ALL CONFIGS' },
        importantNote: { tr: 'Önemli Not', en: 'Important Note' },
        noteDescription: { tr: 'Buradaki ayarlar sistem genelindeki yetki seviyelerini değiştirir. Admin her zaman tam yetkiye sahiptir.', en: 'These settings change system-wide permission levels. Admins always have full permissions.' },
        teacherPermissions: { tr: 'Öğretmen Yetkileri', en: 'Teacher Permissions' },
        studentPermissions: { tr: 'Öğrenci Yetkileri', en: 'Student Permissions' },
        roleUpdated: { tr: 'Rol başarıyla güncellendi', en: 'Role updated successfully' },
        permissionsSaved: { tr: 'Yetkiler başarıyla kaydedildi', en: 'Permissions saved successfully' },
        permissionLabels: {
            canDeleteNotes: { tr: 'Tüm Notları Silebilir', en: 'Can Delete All Notes' },
            canDeleteComments: { tr: 'Tüm Yorumları Silebilir', en: 'Can Delete All Comments' },
            canManageSections: { tr: 'Bölümleri Yönetebilir (Ekle/Sil)', en: 'Can Manage Sections (Add/Delete)' },
            canPinNotes: { tr: 'Notları Sabitleyebilir', en: 'Can Pin Notes' },
            canLockComments: { tr: 'Yorumları Kilitleyebilir', en: 'Can Lock Comments' },
            canCreateAssignments: { tr: 'Ödev Oluşturabilir', en: 'Can Create Assignments' },
            canGradeAssignments: { tr: 'Ödevleri Notlandırabilir', en: 'Can Grade Assignments' },
        }
    },
} as const;

// Helper type for translation keys
export type TranslationKeys = typeof translations;
