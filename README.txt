WORDPILOT v4.1.0

Canlı proje:
- https://wordpilot-7a574.web.app
- https://wordpilot-7a574.web.app/?wpbuild=4.1.0

Kurslar:
- English: words.json ve mevcut kullanıcı ilerleme anahtarları değiştirilmedi.
- Русский: 500 kontrollü A1 kelime ve ifade; vurgulu Kiril, Türkçe okunuş, anlam, örnek, çeviri, tür, konu ve CEFR alanları.
- O‘zbekcha: mevcut 137 A1 kaydı değiştirilmedi.

v4.1 yenilikleri:
- 10 konuya ayrılmış Rusça A1 kütüphanesi
- 33 harflik Kiril Alfabesi Akademisi
- Harfi dinle-seç ve Kiril-okunuş eşleştirme oyunları
- Rusça cümle sıralama oyunu
- Mevcut boşluk doldurma, dinlediğini yazma, çeviri ve eşleştirme modlarının Rusça veriyle çalışması
- Yeni Rusça veri şemasını eski oyun motoruna güvenle bağlayan uyumluluk katmanı
- v4.0 localStorage anahtarı (wordpilot_v34), Firebase kurs şeması, Google giriş, ortak XP/lig ve çevrimdışı kullanım korunur.

GitHub / Firebase Hosting yükleme:
1. ZIP içeriğini GitHub deposunun köküne çıkarın.
2. Dosyaları commit edip push edin.
3. Firebase CLI ile:
   firebase deploy --only hosting --project wordpilot-7a574
4. Eski önbellek görülürse:
   https://wordpilot-7a574.web.app/reset-cache.html

Not:
- Dil bilgisi yolu ve diyalog paketleri planlandığı şekilde v4.2 kapsamındadır.
