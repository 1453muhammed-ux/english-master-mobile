WORDPILOT v3.6.6

GitHub Pages yükleme:
1. ZIP dosyasını bilgisayarda açın.
2. İçindeki tüm dosyaları mevcut GitHub depo köküne yükleyin.
3. Aynı adlı dosyaların üzerine yazın.
4. ZIP dosyasının kendisini GitHub’a yüklemeyin.

Bu sürümde:
- Google hesabındaki kelime durumları, seçilenler, yanlışlar, favoriler, çok zorlar, puanlar ve istatistikler Firebase ile eşitlenir.
- Eski v3.4/v3.5 yerel kayıt anahtarı korunur; sayfa yenileme ve sürüm yükleme ilerlemeyi sıfırlamaz.
- Misafir ilerlemesi ilk Google girişinde kullanıcı onayıyla hesaba aktarılabilir.
- WordPilot Ligi bugün, hafta, ay ve toplam puana göre ayrı sıralanır.
- Dünya ligi ve arkadaş koduyla oluşturulan arkadaş ligi vardır.
- Profilde puan, ezber, öğrenme, zor, yanlış, seri, doğruluk ve oturum sayısı görünür.
- Kelimelere Favori, Çok Zor ve Tekrar Gösterme işaretleri eklenmiştir.
- Favoriler, Çok Zorlar, Ezberlenmeyenler, Yanlışlar ve listeden seçilenlerle çalışma seçenekleri vardır.
- Her gün aynı 20 kelimeden oluşan “Bugünün 20 Kelimesi” bölümü eklenmiştir.
- Süre, yanlış, ipucu ve art arda doğru seri sistemine göre puanlama yapılır.
- Günlük/haftalık/aylık rapor, son 7 gün grafiği ve rozetler eklenmiştir.
- Çevrimdışı paket ana sayfa, oyun dosyaları, simgeler ve words.json verisini tarayıcı önbelleğine kaydeder.
- PDF dosyaları ZIP içinde değildir; ana sayfadaki Google Drive bağlantısından açılır.


v3.6.1 düzeltmeleri:
- Kelime kütüphanesinde tek anlam yerine bütün Türkçe anlamlar satır satır gösterilir.
- Kelime bilgi penceresinde anlam, eş anlam ve zıt anlam kullanım yıldızları Excel dosyasındaki biçimiyle görünür.
- Bir aralıkta bütün kelimeler ezberlendiyse genel hata yerine bunu açıklayan tebrik mesajı gösterilir.


v3.6.3 düzeltmeleri ve tasarım güncellemesi:
- Lig dünya sıralaması Firestore gerçek zamanlı dinleyiciyle güncellenir; kullanıcının kendi puanı beklemeden görünür.
- Google hesabı bağlı kullanıcılar artık Misafir yerine Google profil adıyla; ad yoksa e-posta kullanıcı adıyla gösterilir.
- Ana sayfaya masaüstü üst menüsü, 6000 kelime/çalışma modu bilgi şeridi, Günün Kelimesi, Nasıl Çalışır, WordPilot avantajları ve profesyonel alt bilgi eklendi.
- Mevcut words.json, localStorage anahtarı ve Firebase kullanıcı verileri korunmuştur.


v3.6.4 düzeltmeleri:
- Masaüstü tarayıcılarda eski sürümün önbellekten kalmasını önlemek için HTML, CSS, JavaScript ve Service Worker sürüm adresleri eşitlendi.
- Yeni Service Worker beklemeden etkinleşir ve eski WordPilot önbelleklerini temizler.
- Google hesabı bağlıyken profil başlığında Misafir yerine Google adı gösterilir.
- Firebase hataları artık yanlışlıkla yalnızca internet hatası olarak gösterilmez; izin, oturum, kota ve veri hataları ayrılır.
- İnternet geri geldiğinde ilerleme ve lig puanı otomatik yeniden eşitlenir.


v3.6.5 düzeltmeleri:
- Firestore'un kabul etmediği iç içe dizi kayıt yapısı kaldırıldı; kelime durumları ve geçmiş nesne dizileriyle güvenli biçimde eşitlenir.
- Eski v2 bulut kayıtları okunmaya devam eder; yeni kayıtlar v3 biçiminde yazılır.
- Firestore tanımsız alanları güvenli biçimde atlar.
- Google hesabı bağlıyken profil başlığı ve ad alanı anında Google adıyla güncellenir.
- Eski Service Worker/önbellek yalnızca bir kez temizlenir; localStorage ve ilerleme kayıtları silinmez.
- reset-cache.html, masaüstünde eski sürüm kalırsa ilerlemeyi silmeden uygulama önbelleğini yeniler.


v3.6.6 düzeltmeleri:
- Chrome'da eski app.js/style.css dosyasının kalmaması için sürümlü yeni dosya adları kullanılır.
- Firebase ilerleme verisi Firestore'a güvenli JSON metni olarak yazılır.
- update-366.html eski Service Worker ve Cache Storage kayıtlarını ilerlemeyi silmeden temizler.
