WORDPILOT v7.1.0 — COMMERCIAL CLEAN ALPHA

Canlı kontrol adresi (dağıtımdan sonra):
https://wordpilot-7a574.web.app/?wpbuild=7.1.0

Bu paket, V7.0 kişisel çalışma arşivinden ayrı ticari temiz geliştirme dalıdır.
Eski İngilizce 5488 kayıt bu pakette yayımlanmaz. Public words.json dosyası 120 adet
WordPilot tarafından sıfırdan hazırlanmış, kayıt bazında SHA-256 hash taşıyan clean-room
kavramdan oluşur.

ANA YENİLİKLER
- Arayüz dili, açıklama dili ve hedef dil birbirinden ayrıldı.
- English, Türkçe, Русский ve O‘zbekcha arasında 12 öğrenme yönü için altyapı kuruldu.
- İspanyolca, Almanca, Fransızca, İtalyanca, Portekizce, Japonca, Korece ve Çince roadmap kaydı eklendi.
- Conversation Coach 2.0 ana ekranda ön plana alındı.
- 12 senaryo x 6 soru = hedef dil başına 72 yönlendirilmiş yerel konuşma sorusu eklendi.
- Aynı soruyu tekrar etmeme, konuşma geçmişi, seviye ve üç düzeltme modu eklendi.
- Hata türü, düzeltilmiş cümle, açıklama, doğal alternatif, not ve puan kartları eklendi.
- Cloud AI Function; hedef dil, açıklama dili, düzeltme modu ve son 20 mesajı kullanacak şekilde güncellendi.
- WordPilot Junior için veri mimarisi/deneyim alanı ayrıldı; V8 öncesinde aktif değildir.
- İngilizce/Türkçe Academy ve Reader, ticari içerik denetimi tamamlanana kadar Commercial Clean dalında kapalıdır.

ÖNEMLİ DURUM
- Bu sürüm Demo 1.0 değildir; V7.1 Commercial Clean Alpha'dır.
- security-config.js içinde aiEnabled ve voiceTranscriptionEnabled varsayılan olarak false kalır.
- Gerçek bulut AI için Firebase Functions dağıtımı, OPENAI_API_KEY secret ve maliyet limitleri gerekir.
- 120 clean-room kaydın review_status alanı "editorial-review-required" durumundadır.
- Rusça ve Özbekçe mevcut WordPilot içerikleri Türkçe açıklama yönünde korunur.
  Diğer açıklama dillerinde ilk aşamada 120 bağlantılı kavram çekirdeği kullanılır.

İÇERİK DOSYALARI
- clean_concepts_v71.json: dört dil bağlantılı özgün kavram grafiği
- language_registry_v71.json: aktif ve planlanan diller
- content_manifest_v71.json: ticari dal ve denetim politikası
- words.json: geriye uyumlu 120 kayıtlık temiz İngilizce paketi

Mevcut kullanıcı ilerleme anahtarı korunur: wordpilot_v34
TXT kaynak dosyaları veya Diziyle Öğren içerikleri bu dağıtım paketine dahil değildir.
