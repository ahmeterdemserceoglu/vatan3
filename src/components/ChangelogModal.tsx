import { X, CheckCircle2, Calendar } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
    const { t, language } = useTranslation();

    if (!isOpen) return null;

    const changes = [
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Kategori Görünümü & Taşıma' : 'Category View & Move',
            description: language === 'tr'
                ? 'Ödevler artık kategorilere göre gruplandırılmış accordion görünümde! Kategorileri açıp kapatabilir, ödevleri kategoriler arasında sürükleyerek taşıyabilirsiniz.'
                : 'Assignments are now grouped by category in an accordion view! Expand/collapse categories and drag assignments between them.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Ödev Sıralama (Sürükle-Bırak)' : 'Assignment Reordering (Drag & Drop)',
            description: language === 'tr'
                ? 'Öğretmenler artık ödevleri sürükle-bırak ile sıralayabilir! Sol taraftaki tutamacı kullanarak ödevleri istediğiniz sıraya getirin.'
                : 'Teachers can now reorder assignments with drag and drop! Use the handle on the left to arrange assignments in your preferred order.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Ödev Takvim Görünümü' : 'Assignment Calendar View',
            description: language === 'tr'
                ? 'Ödevlerinizi artık takvim üzerinde görüntüleyin! Aylık navigasyon, renk kodlu ödev/hatırlatma gösterimi ve tıklayarak detaya gitme.'
                : 'View your assignments on a calendar! Monthly navigation, color-coded assignments/reminders, and click to view details.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Öğrenci İlerleme Takibi' : 'Student Progress Tracking',
            description: language === 'tr'
                ? 'Öğretmenler artık öğrenci ilerlemelerini takip edebilir! Teslim, notlu, geç teslim sayıları, ortalama puan ve CSV dışa aktarma.'
                : 'Teachers can now track student progress! Submission counts, graded counts, late submissions, average scores, and CSV export.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'İntihal Kontrolü' : 'Plagiarism Detection',
            description: language === 'tr'
                ? 'Öğretmenler teslimleri intihal için kontrol edebilir! Benzerlik oranı hesaplama ve uyarı rozeti görünümü.'
                : 'Teachers can check submissions for plagiarism! Similarity score calculation and warning badge display.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Dosya Önizleme' : 'File Preview',
            description: language === 'tr'
                ? 'Resim ve PDF dosyalarını modal içinde önizleyin! Göz ikonu ile hızlı erişim, diğer dosyalar için indirme linki.'
                : 'Preview images and PDF files in a modal! Quick access with eye icon, download link for other files.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Toplu İşlemler' : 'Bulk Operations',
            description: language === 'tr'
                ? 'Birden fazla ödevi aynı anda seçin ve toplu kapatma veya silme işlemi yapın!'
                : 'Select multiple assignments at once and perform bulk close or delete operations!'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Geç Teslim Cezası' : 'Late Submission Penalty',
            description: language === 'tr'
                ? 'Ödevlere geç teslim izni ve yüzdelik puan kesintisi ayarı ekleyin. Geç teslimler otomatik işaretlenir.'
                : 'Add late submission permission and percentage penalty to assignments. Late submissions are automatically marked.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Teslim Düzenleme' : 'Submission Editing',
            description: language === 'tr'
                ? 'Öğrenciler teslimlerini düzenleyebilir! Mevcut dosyaları silme, yeni dosya ekleme ve içerik güncelleme.'
                : 'Students can edit their submissions! Remove existing files, add new files, and update content.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'Gelişmiş Filtreleme' : 'Advanced Filtering',
            description: language === 'tr'
                ? 'Ödevleri duruma, tipe, tarihe ve kategoriye göre filtreleyin! Arama çubuğu ile başlık/açıklama araması.'
                : 'Filter assignments by status, type, date, and category! Search bar for title/description search.'
        },
        {
            date: '22.12.2024',
            title: language === 'tr' ? 'CSV Dışa Aktarma' : 'CSV Export',
            description: language === 'tr'
                ? 'Teslimleri ve öğrenci ilerlemesini CSV formatında dışa aktarın! Excel ile uyumlu.'
                : 'Export submissions and student progress to CSV format! Excel compatible.'
        },
        {
            date: '17.12.2024',
            title: language === 'tr' ? 'Akıllı Bildirim Sistemi' : 'Smart Notification System',
            description: language === 'tr'
                ? 'Chat açıkken öğretmen mesajları için bildirim almayacaksınız. Zaten sohbettesiniz!'
                : 'No more notifications for teacher messages when chat is already open. You\'re already there!'
        },
        {
            date: '17.12.2024',
            title: language === 'tr' ? 'Rich Text Editor' : 'Rich Text Editor',
            description: language === 'tr'
                ? 'Not oluştururken artık zengin metin özellikleri kullanabilirsiniz! Kalın, italik, altı çizili, başlıklar, listeler, alıntı, kod bloğu ve link.'
                : 'Now you can use rich text features when creating notes! Bold, italic, underline, headings, lists, quotes, code blocks, and links.'
        },
        {
            date: '17.12.2024',
            title: language === 'tr' ? 'Takvim Görünümü' : 'Calendar View',
            description: language === 'tr'
                ? 'Ödevleri artık takvim üzerinde görüntüleyebilirsiniz! Aylık takvim, ödev/hatırlatma renkleri ve tarih filtreleme.'
                : 'View assignments on a calendar! Monthly view, homework/reminder color coding, and date filtering.'
        },
        {
            date: '17.12.2024',
            title: language === 'tr' ? 'Aktivite Geçmişi' : 'Activity Log',
            description: language === 'tr'
                ? 'Pano ayarlarından tüm aktiviteleri görüntüleyin ve PDF olarak indirin. Kim ne zaman ne yaptı?'
                : 'View all activities from board settings and download as PDF. Track who did what and when!'
        },
        {
            date: '17.12.2024',
            title: language === 'tr' ? 'Ödev Geribildirim Sistemi' : 'Assignment Feedback System',
            description: language === 'tr'
                ? 'Öğretmenler artık öğrenci ödevlerine not ve yorum verebilir. Öğrenciler bildirim alır.'
                : 'Teachers can now grade and comment on student submissions. Students get notified.'
        },
        {
            date: '17.12.2024',
            title: language === 'tr' ? 'Spam Koruması' : 'Spam Protection',
            description: language === 'tr'
                ? 'Çok hızlı mesaj gönderme ve aynı mesajı tekrarlama engellenecek. Rate limiting aktif.'
                : 'Prevents rapid message sending and duplicate messages. Rate limiting is now active.'
        },
        {
            date: '17.12.2024',
            title: language === 'tr' ? 'Toplu Dosya Yükleme' : 'Bulk File Upload',
            description: language === 'tr'
                ? 'Artık notlara, ödevlere ve teslimlerinize birden fazla dosya aynı anda yükleyebilirsiniz! PDF, Word, Excel, resim ve daha fazlası.'
                : 'You can now upload multiple files at once to notes, assignments, and submissions! PDFs, Word, Excel, images, and more.'
        },
        {
            date: '16.12.2024',
            title: language === 'tr' ? 'Push Bildirimleri' : 'Push Notifications',
            description: language === 'tr'
                ? 'Tarayıcı kapalıyken bile bildirim alın! PWA desteği ile cihazınıza push bildirimleri gönderin.'
                : 'Get notifications even when browser is closed! PWA support brings push notifications to your device.'
        },
        {
            date: '16.12.2025',
            title: language === 'tr' ? 'Gelişmiş Sohbet Deneyimi' : 'Enhanced Chat Experience',
            description: language === 'tr'
                ? 'Sohbet açıldığında otomatik olarak en son mesaja kayar. Artık aşağı elle kaydırmanıza gerek yok!'
                : 'Chat now auto-scrolls to the latest message when opened. No more manual scrolling needed!'
        },
        {
            date: '16.12.2025',
            title: language === 'tr' ? 'Link Önizleme İyileştirmeleri' : 'Link Preview Improvements',
            description: language === 'tr'
                ? 'Önizleme yüklenemese bile linkler temiz bir kartla gösteriliyor. Konsol hataları düzeltildi.'
                : 'Links now display with a clean card even if preview fails. Console errors fixed.'
        },
        {
            date: '14.12.2025',
            title: language === 'tr' ? 'Grup Etiketleri' : 'Group Mentions',
            description: language === 'tr'
                ? '@everyone, @student ve @teacher etiketleriyle tek seferde tüm gruba bildirim gönderin!'
                : 'Use @everyone, @student, @teacher to notify entire groups at once!'
        },
        {
            date: '14.12.2025',
            title: language === 'tr' ? 'Ödev Hatırlatıcı' : 'Assignment Reminder',
            description: language === 'tr'
                ? 'Teslim tarihine 1 gün kala otomatik bildirim alın. Bir daha ödev kaçırmayın!'
                : 'Get automatic reminders 1 day before the due date. Never miss an assignment!'
        },
        {
            date: '14.12.2025',
            title: language === 'tr' ? 'Ödev Sistemi' : 'Assignment System',
            description: language === 'tr'
                ? 'Öğretmenler ödev oluşturabilir, öğrenciler teslim edebilir. Yeni ödev atandığında bildirim alın.'
                : 'Teachers can create assignments, students can submit. Get notified when new assignments are posted.'
        },
        {
            date: '14.12.2025',
            title: language === 'tr' ? 'Bildirim Sesi' : 'Notification Sound',
            description: language === 'tr'
                ? 'Yeni bildirimler geldiğinde artık sesli uyarı alacaksınız.'
                : 'You will now receive an audio alert when new notifications arrive.'
        },
        {
            date: '14.12.2025',
            title: language === 'tr' ? 'Video & Ses Dosyası Desteği' : 'Video & Audio File Support',
            description: language === 'tr'
                ? 'Dosya olarak MP4, MP3, WAV gibi video ve ses dosyaları yükleyebilir, doğrudan not kartı üzerinde oynatabilirsiniz.'
                : 'Upload MP4, MP3, WAV video and audio files. Play them directly on the note card.'
        },
        {
            date: '14.12.2025',
            title: language === 'tr' ? 'Sohbet Medya Desteği' : 'Chat Media Support',
            description: language === 'tr'
                ? 'Artık sohbet penceresinden resim ve video dosyaları gönderebilirsiniz.'
                : 'You can now send image and video files directly from the chat window.'
        },
        {
            date: '14.12.2025',
            title: language === 'tr' ? 'Pano Görünüm Modları' : 'Board Layout Modes',
            description: language === 'tr'
                ? 'Panonuzu ister klasik yatay modda, ister dikey (Kanban) modda görüntüleyin.'
                : 'View your board in classic horizontal mode or vertical (Kanban) mode.'
        },
        {
            date: '13.12.2025',
            title: language === 'tr' ? 'Not Taşıma Özelliği' : 'Move Note Feature',
            description: language === 'tr'
                ? 'Notları bölümler arasında taşımak artık daha kolay. Menüden "Taşı" seçeneğini kullanın.'
                : 'Moving notes between sections is easier. Use the "Move" option from the menu.'
        },
        {
            date: '13.12.2025',
            title: language === 'tr' ? 'Bölüm Sabitleme' : 'Pin Sections',
            description: language === 'tr'
                ? 'Öğretmenler artık önemli bölümleri panonun en başına sabitleyebilir.'
                : 'Teachers can now pin important sections to the start of the board.'
        },
        {
            date: '12.12.2025',
            title: language === 'tr' ? 'Gelişmiş Sohbet' : 'Advanced Chat',
            description: language === 'tr'
                ? 'Sesli mesaj gönderme, yazıyor göstergesi ve @etiketleme özellikleri eklendi.'
                : 'Voice messages, typing indicators, and @mentions added.'
        },
        {
            date: '10.12.2025',
            title: language === 'tr' ? 'Bağlantı Önizlemeleri' : 'Link Previews',
            description: language === 'tr'
                ? 'Eklenen linkler artık zengin içerikli kartlar olarak görünüyor.'
                : 'Added links now appear as rich content cards.'
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-stone-800">
                                {language === 'tr' ? 'Yenilikler & Güncellemeler' : 'What\'s New'}
                            </h2>

                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 custom-scrollbar">
                    <div className="relative border-l-2 border-stone-200 ml-3 space-y-8">
                        {changes.map((item, index) => (
                            <div key={index} className="relative pl-8">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 w-fit px-2 py-0.5 rounded-full">
                                        {item.date}
                                    </span>
                                    <h3 className="text-base font-bold text-stone-800 mt-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-stone-600 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>


                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100 bg-stone-50">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors shadow-sm active:scale-[0.99]"
                    >
                        {language === 'tr' ? 'Harika!' : 'Awesome!'}
                    </button>
                </div>
            </div>
        </div>
    );
}
