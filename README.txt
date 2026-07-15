WORDPILOT v3.6.3

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
