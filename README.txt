WordPilot v9.9.0 — UX Reset & Navigation

Bu paket, v9.8 Reader Pro ve v9.7 Smart Word Session özelliklerini koruyarak uygulamanın ana sayfasını ve gezinme yapısını sadeleştirir.

Ana kapsam:
- 5000 İngilizce kelime ve 5000 ortak Concept ID rotası
- 1500 Rusça ve 1000 Özbekçe kayıt
- 102 Academy dersi: 48 English + 54 Русский
- 48 Academy Ders Okuması: 18 English + 30 Русский
- 114 bağımsız Reader Pro metni
- 240 incelenmiş Phrase Lab kaydı
- Conversation Coach Pro
- Smart Word Session ve Reader Pro bağlantısı

v9.9.0 UX Reset:
- Ana sayfa dört net başlangıç yoluna indirildi: Academy, aktif kelime seti, Reader Pro ve Conversation Coach.
- Tekrar, ilerleme ve yardımcı araçlar ikincil bağlantılara taşındı.
- Masaüstü üst menüsü Ana Sayfa, Akademi, Kelimeler, Reader ve İlerleme olarak düzenlendi.
- Mobil alt menü Ana Sayfa, Akademi, Kelimeler, Reader ve Profil olarak düzenlendi.
- Masaüstünde gereksiz mobil alt menü kaldırıldı.
- Mobil üst çubuktaki sürüm, dil çifti ve yüzen öneri düğmesi gizlenerek taşma ve kalabalık giderildi.
- Ana sayfada yalnızca dört ana dil gösterilir; diğer diller “Tüm dilleri göster” ile açılır.
- Reader Pro ile Academy’ye bağlı Ders Okumaları açık biçimde ayrıldı.
- Academy Ders Okumaları ekranı ilk metni otomatik açar; seviye ve toplam metin sayısını gösterir.
- Ortak Concept ID karşılaştırması Kelimeler ekranının üstünden kaldırılarak Kavram Atlası aracına taşındı.
- Ürün yol haritası ana sayfadan kaldırıldı; Araçlar ve Yenilikler ekranına taşındı.
- Sürüm, kelime, ders, okuma ve Phrase Lab sayıları WP_APP_META üzerinden merkezileştirildi.

Öneri ve yönetici gelen kutusu:
- Kullanıcı önerileri Firestore `feedback` koleksiyonuna takip kodu, ekran, sürüm ve cihaz bilgileriyle kaydedilir.
- Kullanıcı Profil veya Araçlar ekranından öneri/hata formunu açabilir.
- Yönetici gelen kutusu yalnızca Firestore `admins/<Firebase UID>` belgesi bulunan hesaplarda görünür.
- Yönetici önerileri Yeni, İnceleniyor, Planlandı, Tamamlandı veya Reddedildi durumlarına taşıyabilir.

Yayın kurulumu:
1. Site dosyalarını Firebase Hosting veya GitHub deposuna yükleyin.
2. Güncel `firestore.rules` dosyasını Firebase’de yayımlayın.
3. Yönetici hesabı için Firestore’da `admins/<Firebase UID>` belgesi oluşturun. Örnek alan: `role: "owner"`.
4. İlk dağıtımdan sonra masaüstü ve telefonda ana sayfa, Academy Ders Okumaları, Reader Pro, öneri formu ve yönetici yetkisini kontrol edin.

İçerik notu:
- 1–1000 incelenmiş temel çekirdektir.
- 1001–3000 kaynak kontrollü beta katmanıdır.
- 3001–5000 editör denetimi süren beta katmanıdır.
- Eksik hedef dil karşılıkları hazırmış gibi gösterilmez.
