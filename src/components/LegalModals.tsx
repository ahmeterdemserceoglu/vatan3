'use client';

import { X } from 'lucide-react';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'tr' | 'en';
}

// Gizlilik Politikası Modal
export function PrivacyModal({ isOpen, onClose, language }: LegalModalProps) {
    if (!isOpen) return null;

    const content = language === 'tr' ? {
        title: 'Gizlilik Politikası',
        lastUpdate: 'Son Güncelleme: 15 Aralık 2025',
        sections: [
            {
                title: '1. Veri Sorumlusu',
                content: `Collabo ("Platform"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla hareket etmektedir. Bu Gizlilik Politikası, Platform tarafından toplanan, işlenen ve saklanan kişisel verilere ilişkin uygulamaları açıklamaktadır.`
            },
            {
                title: '2. Toplanan Kişisel Veriler',
                content: `Platform üzerinden aşağıdaki kişisel veriler toplanmaktadır:

• Kimlik Bilgileri: Ad, soyad, kullanıcı adı
• İletişim Bilgileri: E-posta adresi
• Hesap Bilgileri: Şifre (şifrelenmiş halde), profil fotoğrafı
• Kullanım Verileri: Platform üzerindeki aktiviteler, paylaşılan içerikler, mesajlar
• Teknik Veriler: IP adresi, tarayıcı bilgisi, cihaz bilgisi, çerez verileri`
            },
            {
                title: '3. Kişisel Verilerin İşlenme Amaçları',
                content: `Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:

• Platform hizmetlerinin sunulması ve iyileştirilmesi
• Kullanıcı hesaplarının oluşturulması ve yönetilmesi
• İletişim ve bildirim gönderimi
• Yasal yükümlülüklerin yerine getirilmesi
• Platform güvenliğinin sağlanması
• Kullanıcı deneyiminin kişiselleştirilmesi`
            },
            {
                title: '4. Kişisel Verilerin Aktarılması',
                content: `Kişisel verileriniz, KVKK'nın 8. ve 9. maddelerinde belirtilen şartlara uygun olarak:

• Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına
• Hizmet sağlayıcılarımıza (bulut depolama, hosting vb.)
• Açık rızanız dahilinde üçüncü taraflara

aktarılabilmektedir. Yurt dışına veri aktarımı, KVKK'nın 9. maddesi kapsamında gerekli güvenlik önlemleri alınarak gerçekleştirilmektedir.`
            },
            {
                title: '5. Kişisel Verilerin Saklanma Süresi',
                content: `Kişisel verileriniz, işleme amaçlarının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen zamanaşımı süreleri dahilinde saklanmaktadır. Hesap silme talebiniz üzerine verileriniz makul süre içinde silinecek veya anonimleştirilecektir.`
            },
            {
                title: '6. Veri Güvenliği',
                content: `Platform, kişisel verilerinizin güvenliğini sağlamak için:

• SSL/TLS şifreleme protokolleri
• Güvenli veri depolama sistemleri
• Erişim kontrolü mekanizmaları
• Düzenli güvenlik güncellemeleri

gibi teknik ve idari tedbirler uygulamaktadır.`
            },
            {
                title: '7. KVKK Kapsamındaki Haklarınız',
                content: `KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:

• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• İşlenmişse buna ilişkin bilgi talep etme
• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme
• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme
• Eksik veya yanlış işlenmişse düzeltilmesini isteme
• KVKK'nın 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme
• Düzeltme, silme veya yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme
• İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme
• Kanuna aykırı işleme sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme

Bu haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.`
            },
            {
                title: '8. Çerezler (Cookies)',
                content: `Platform, kullanıcı deneyimini iyileştirmek ve hizmetlerini sunmak için çerezler kullanmaktadır. Tarayıcı ayarlarınızdan çerez tercihlerinizi yönetebilirsiniz.`
            },
            {
                title: '9. İletişim',
                content: `Gizlilik politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz.

Türkiye Cumhuriyeti Anayasası'nın 20. maddesi ve 6698 sayılı KVKK kapsamında kişisel verilerinizin korunması taahhüdümüzdür.`
            }
        ]
    } : {
        title: 'Privacy Policy',
        lastUpdate: 'Last Updated: December 15, 2025',
        sections: [
            {
                title: '1. Data Controller',
                content: `Collabo ("Platform") acts as the data controller under the Turkish Personal Data Protection Law No. 6698 ("KVKK"). This Privacy Policy explains the practices regarding personal data collected, processed, and stored by the Platform.`
            },
            {
                title: '2. Personal Data Collected',
                content: `The following personal data is collected through the Platform:

• Identity Information: Name, surname, username
• Contact Information: Email address
• Account Information: Password (encrypted), profile photo
• Usage Data: Activities on the platform, shared content, messages
• Technical Data: IP address, browser information, device information, cookie data`
            },
            {
                title: '3. Purposes of Processing',
                content: `Your personal data is processed for the following purposes:

• Providing and improving Platform services
• Creating and managing user accounts
• Communication and notification delivery
• Fulfilling legal obligations
• Ensuring Platform security
• Personalizing user experience`
            },
            {
                title: '4. Data Transfers',
                content: `Your personal data may be transferred in accordance with Articles 8 and 9 of KVKK:

• To authorized public institutions when legally required
• To our service providers (cloud storage, hosting, etc.)
• To third parties with your explicit consent

International data transfers are carried out with necessary security measures under Article 9 of KVKK.`
            },
            {
                title: '5. Data Retention Period',
                content: `Your personal data is stored for the duration required by processing purposes and within the statute of limitations prescribed by relevant legislation. Upon your account deletion request, your data will be deleted or anonymized within a reasonable time.`
            },
            {
                title: '6. Data Security',
                content: `The Platform implements technical and administrative measures to ensure the security of your personal data:

• SSL/TLS encryption protocols
• Secure data storage systems
• Access control mechanisms
• Regular security updates`
            },
            {
                title: '7. Your Rights Under KVKK',
                content: `Under Article 11 of KVKK, you have the following rights:

• To learn whether your personal data is processed
• To request information if processed
• To learn the purpose of processing and whether it is used accordingly
• To know third parties to whom data is transferred
• To request correction if incomplete or incorrect
• To request deletion or destruction under Article 7 conditions
• To request notification of corrections/deletions to third parties
• To object to results arising from automated analysis
• To claim compensation for damages due to unlawful processing

Contact us to exercise these rights.`
            },
            {
                title: '8. Cookies',
                content: `The Platform uses cookies to improve user experience and provide services. You can manage your cookie preferences through your browser settings.`
            },
            {
                title: '9. Contact',
                content: `For questions about our privacy policy, please contact us.

We are committed to protecting your personal data under Article 20 of the Constitution of the Republic of Turkey and KVKK No. 6698.`
            }
        ]
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-200">
                    <div>
                        <h2 className="text-xl font-bold text-stone-800">{content.title}</h2>
                        <p className="text-sm text-stone-500 mt-1">{content.lastUpdate}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {content.sections.map((section, index) => (
                        <div key={index}>
                            <h3 className="font-semibold text-stone-800 mb-2">{section.title}</h3>
                            <p className="text-sm text-stone-600 whitespace-pre-line leading-relaxed">
                                {section.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-200">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors font-medium"
                    >
                        {language === 'tr' ? 'Anladım' : 'I Understand'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Kullanım Şartları Modal
export function TermsModal({ isOpen, onClose, language }: LegalModalProps) {
    if (!isOpen) return null;

    const content = language === 'tr' ? {
        title: 'Kullanım Şartları',
        lastUpdate: 'Son Güncelleme: 15 Aralık 2025',
        sections: [
            {
                title: '1. Sözleşmenin Konusu ve Taraflar',
                content: `İşbu Kullanım Şartları ("Sözleşme"), Collabo platformunu ("Platform") kullanan gerçek veya tüzel kişiler ("Kullanıcı") ile Platform arasındaki hukuki ilişkiyi düzenlemektedir.

Bu Sözleşme, 6098 sayılı Türk Borçlar Kanunu ve 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun hükümlerine tabidir.`
            },
            {
                title: '2. Hizmetin Tanımı',
                content: `Platform, eğitim amaçlı dijital bir işbirliği ve içerik paylaşım hizmeti sunmaktadır. Kullanıcılar, Platform üzerinden:

• Dijital panolar oluşturabilir
• Not, dosya ve içerik paylaşabilir
• Diğer kullanıcılarla iletişim kurabilir
• Ödev ve görev yönetimi yapabilir`
            },
            {
                title: '3. Üyelik ve Hesap Güvenliği',
                content: `• Kullanıcı, kayıt sırasında doğru ve güncel bilgi vermekle yükümlüdür.
• Hesap bilgilerinin gizliliği Kullanıcı'nın sorumluluğundadır.
• Hesabın yetkisiz kullanımından Kullanıcı sorumludur.
• Platform, şüpheli hesapları askıya alma veya sonlandırma hakkını saklı tutar.
• 18 yaşından küçük Kullanıcılar, veli/vasi onayı ile Platform'u kullanabilir.`
            },
            {
                title: '4. Kullanıcı Yükümlülükleri',
                content: `Kullanıcı, Platform'u kullanırken:

• Türkiye Cumhuriyeti Anayasası ve yürürlükteki mevzuata uygun davranacaktır.
• Üçüncü kişilerin haklarını ihlal etmeyecektir.
• Telif hakkı, ticari marka veya fikri mülkiyet haklarını ihlal eden içerik paylaşmayacaktır.
• Yasadışı, zararlı, tehdit edici, taciz edici, iftira niteliğinde veya müstehcen içerik paylaşmayacaktır.
• Spam, virüs veya zararlı yazılım yaymayacaktır.
• Platform'un teknik altyapısına zarar verecek eylemlerden kaçınacaktır.
• Başka kullanıcıların kişisel verilerini izinsiz toplamayacaktır.`
            },
            {
                title: '5. İçerik Hakları ve Sorumluluk',
                content: `• Kullanıcı tarafından paylaşılan içeriklerin tüm sorumluluğu Kullanıcı'ya aittir.
• Platform, kullanıcı içeriklerini denetleme yükümlülüğü taşımamaktadır (5651 sayılı Kanun).
• Platform, yasalara aykırı içerikleri kaldırma hakkını saklı tutar.
• Kullanıcı, paylaştığı içerikler üzerindeki hakları Platform'a devretmemektedir.
• Platform'a yüklenen içerikler için Kullanıcı, Platform'un hizmet sunumu için gerekli lisansı vermektedir.`
            },
            {
                title: '6. Fikri Mülkiyet Hakları',
                content: `• Platform'un tasarımı, logosu, yazılımı ve tüm içerikleri fikri mülkiyet hakları kapsamında korunmaktadır.
• 5846 sayılı Fikir ve Sanat Eserleri Kanunu hükümleri uygulanır.
• Platform içeriklerinin izinsiz kopyalanması, dağıtılması veya değiştirilmesi yasaktır.`
            },
            {
                title: '7. Sorumluluk Sınırlaması',
                content: `• Platform, hizmetlerin kesintisiz veya hatasız olacağını garanti etmemektedir.
• Platform, kullanıcı içeriklerinden kaynaklanan zararlardan sorumlu değildir.
• Platform, üçüncü taraf hizmetlerinden kaynaklanan aksaklıklardan sorumlu tutulamaz.
• Mücbir sebep hallerinde Platform'un sorumluluğu bulunmamaktadır.
• Platform'un sorumluluğu, Türk Borçlar Kanunu'nun emredici hükümleri saklı kalmak kaydıyla, hizmet bedeli ile sınırlıdır.`
            },
            {
                title: '8. Hesap Sonlandırma',
                content: `• Kullanıcı, hesabını dilediği zaman kapatabilir.
• Platform, bu Sözleşme'yi ihlal eden hesapları askıya alabilir veya sonlandırabilir.
• Hesap sonlandırılması halinde, yasal saklama yükümlülükleri hariç, veriler silinecektir.`
            },
            {
                title: '9. Değişiklikler',
                content: `Platform, bu Sözleşme'yi önceden bildirim yaparak değiştirme hakkını saklı tutar. Değişiklikler, Platform üzerinde yayınlandığı tarihte yürürlüğe girer. Değişikliklerden sonra Platform'u kullanmaya devam etmeniz, değişiklikleri kabul ettiğiniz anlamına gelir.`
            },
            {
                title: '10. Uyuşmazlık Çözümü',
                content: `İşbu Sözleşme'den doğan uyuşmazlıklarda:

• Türkiye Cumhuriyeti hukuku uygulanır.
• İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
• Tüketici işlemlerinde 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümleri saklıdır.
• Arabuluculuk yoluna başvuru teşvik edilmektedir.`
            },
            {
                title: '11. Yürürlük',
                content: `Bu Sözleşme, Kullanıcı'nın Platform'a kayıt olması veya Platform'u kullanmaya başlaması ile yürürlüğe girer ve hesap kapatılana kadar geçerliliğini korur.

İşbu Sözleşme, Türkiye Cumhuriyeti Anayasası'nın sözleşme özgürlüğüne ilişkin 48. maddesi ve Türk Borçlar Kanunu hükümleri çerçevesinde düzenlenmiştir.`
            }
        ]
    } : {
        title: 'Terms of Use',
        lastUpdate: 'Last Updated: December 15, 2025',
        sections: [
            {
                title: '1. Subject and Parties',
                content: `These Terms of Use ("Agreement") regulate the legal relationship between Collabo platform ("Platform") and natural or legal persons using the Platform ("User").

This Agreement is subject to Turkish Code of Obligations No. 6098 and Law on Regulation of Electronic Commerce No. 6563.`
            },
            {
                title: '2. Service Description',
                content: `The Platform provides a digital collaboration and content sharing service for educational purposes. Users can:

• Create digital boards
• Share notes, files, and content
• Communicate with other users
• Manage assignments and tasks`
            },
            {
                title: '3. Membership and Account Security',
                content: `• Users are obligated to provide accurate and current information during registration.
• Confidentiality of account information is the User's responsibility.
• Users are responsible for unauthorized use of their accounts.
• Platform reserves the right to suspend or terminate suspicious accounts.
• Users under 18 may use the Platform with parental/guardian consent.`
            },
            {
                title: '4. User Obligations',
                content: `When using the Platform, Users shall:

• Comply with the Constitution of the Republic of Turkey and applicable legislation.
• Not violate the rights of third parties.
• Not share content infringing copyright, trademark, or intellectual property rights.
• Not share illegal, harmful, threatening, harassing, defamatory, or obscene content.
• Not distribute spam, viruses, or malicious software.
• Avoid actions that may damage the Platform's technical infrastructure.
• Not collect personal data of other users without permission.`
            },
            {
                title: '5. Content Rights and Liability',
                content: `• Users are fully responsible for content they share.
• Platform has no obligation to monitor user content (Law No. 5651).
• Platform reserves the right to remove illegal content.
• Users do not transfer rights over shared content to the Platform.
• Users grant Platform necessary license for service provision.`
            },
            {
                title: '6. Intellectual Property Rights',
                content: `• Platform's design, logo, software, and all content are protected under intellectual property rights.
• Law on Intellectual and Artistic Works No. 5846 applies.
• Unauthorized copying, distribution, or modification of Platform content is prohibited.`
            },
            {
                title: '7. Limitation of Liability',
                content: `• Platform does not guarantee uninterrupted or error-free services.
• Platform is not responsible for damages arising from user content.
• Platform cannot be held liable for third-party service disruptions.
• Platform has no liability in force majeure situations.
• Platform's liability is limited to service fees, subject to mandatory provisions of Turkish Code of Obligations.`
            },
            {
                title: '8. Account Termination',
                content: `• Users may close their accounts at any time.
• Platform may suspend or terminate accounts violating this Agreement.
• Upon termination, data will be deleted except for legal retention obligations.`
            },
            {
                title: '9. Modifications',
                content: `Platform reserves the right to modify this Agreement with prior notice. Changes take effect upon publication on the Platform. Continued use after changes constitutes acceptance.`
            },
            {
                title: '10. Dispute Resolution',
                content: `For disputes arising from this Agreement:

• Law of the Republic of Turkey applies.
• Istanbul Courts and Enforcement Offices have jurisdiction.
• Consumer Protection Law No. 6502 provisions are reserved for consumer transactions.
• Mediation is encouraged.`
            },
            {
                title: '11. Effectiveness',
                content: `This Agreement enters into force upon User's registration or use of the Platform and remains valid until account closure.

This Agreement is drafted in accordance with Article 48 of the Constitution of the Republic of Turkey regarding freedom of contract and provisions of the Turkish Code of Obligations.`
            }
        ]
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-200">
                    <div>
                        <h2 className="text-xl font-bold text-stone-800">{content.title}</h2>
                        <p className="text-sm text-stone-500 mt-1">{content.lastUpdate}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {content.sections.map((section, index) => (
                        <div key={index}>
                            <h3 className="font-semibold text-stone-800 mb-2">{section.title}</h3>
                            <p className="text-sm text-stone-600 whitespace-pre-line leading-relaxed">
                                {section.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-200">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors font-medium"
                    >
                        {language === 'tr' ? 'Anladım' : 'I Understand'}
                    </button>
                </div>
            </div>
        </div>
    );
}
