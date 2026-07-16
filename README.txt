WORDPILOT v5.0.0

WordPilot; English, Русский ve O‘zbekcha kurslarını aynı uygulamada sunan, Firebase senkronizasyonlu ve çevrimdışı çalışabilen bir PWA dil öğrenme platformudur.

V5.0 İLE GELENLER
- Temizlenen Boşluk Doldurma, Cümle Tamamlama ve Cümle Sıralama kartları
- Her aktif kurs için ayrı lig, XP ve doğruluk sıralaması
- Cihazın doğal seslerini kullanan çok dilli TTS ve yavaş dinleme
- İngilizce, Rusça ve Özbekçe için telaffuz laboratuvarı
- 18 özgün A1–A2 hikâye, seslendirme, çeviri ve metin soruları
- Yanlışlar, tekrar zamanı ve zorluk durumuna göre adaptif günlük plan
- Dil, oyun, okuma ve telaffuz verilerini gösteren profesyonel istatistik paneli
- V5 verilerinin mevcut Firebase kurs kaydı içinde çoklu cihaz senkronizasyonu
- Yerel konuşma koçu ve güvenli Cloud Function üzerinden gerçek AI desteği için hazır altyapı
- PWA kurulumu: mağazaya yüklemeden telefon ve bilgisayara uygulama olarak eklenebilir
- CSP, güvenlik başlıkları, App Check hazırlığı, Firestore kuralları, AI hız sınırı ve kopyalama caydırıcısı

VERİLER KORUNDU
- localStorage anahtarı: wordpilot_v34
- English: 5.488 kayıt
- Русский: 1.000 kayıt
- O‘zbekcha: 137 kayıt
- Google giriş, Firebase ilerleme, profil, genel XP ve eski kurs ilerlemeleri korunur.

ÖNEMLİ GÜVENLİK NOTU
Tarayıcıya gönderilen statik HTML, JavaScript ve JSON dosyaları F12’den tamamen gizlenemez. V5 mevcut siteyi güçlendirir ve toplu kopyalamayı caydırır. Kelime dosyalarını gerçekten toplu indirmeye karşı korumak için sonraki güvenlik aşamasında içeriklerin statik Hosting’den kaldırılıp giriş + Firebase App Check isteyen bir backend üzerinden parça parça sunulması gerekir.

GERÇEK AI MODU
Yerel koç hemen çalışır. Gerçek bulut AI modu; Firebase Blaze, Cloud Functions, App Check ve OPENAI_API_KEY Secret etkinleştirildikten sonra security-config.js içindeki aiEnabled değeri true yapılarak açılır. Gizli API anahtarı hiçbir zaman ön yüz dosyalarına yazılmamalıdır.

Canlı test: https://wordpilot-7a574.web.app/?wpbuild=5.0.0
