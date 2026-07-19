WordPilot v9.9.1 — Admin & Feedback Center · Aşama 1

Bu paket WordPilot v9.9.0 UX Reset sürümünü temel alır. Smart Word Session, Reader Pro, Conversation Coach ve mevcut feedback kayıt akışı korunmuştur.

Aşama 1 tamamlananlar:
- Firestore `admins/<Firebase UID>` belgesindeki role ve active alanlarını doğrulayan yönetici erişimi
- Desteklenen roller: owner, admin, support, editor, viewer
- Yetkisiz kullanıcıların Admin ekranına doğrudan yönlendirilmesini engelleyen güvenli nav guard
- Profil ekranında yalnızca aktif yöneticiye görünen “Yönetim Merkezi” düğmesi
- Masaüstü için sol menülü profesyonel Admin Center kabuğu
- Telefon ve tablette açılır yönetim menüsü
- Genel Bakış, Feedback, Content Center ve İşlem Geçmişi ekran iskeletleri
- Mevcut feedback gelen kutusunun yeni kabuk içinde korunması
- Rol bazlı feedback durum değiştirme kontrolü
- Güncellenmiş Firestore Rules ve servis çalışanı önbelleği

Firebase admin belgesi örneği:
admins/<Firebase UID>
{
  role: "owner",
  active: true,
  displayName: "Ece Aslan"
}

Geriye uyumluluk:
- `active` alanı bulunmayan eski admin belgeleri aktif kabul edilir.
- `role: "owner"` biçimindeki mevcut belge çalışmaya devam eder.

Dağıtım:
1. Paket içindeki site dosyalarını Firebase Hosting’e yükleyin.
2. `firebase deploy --only firestore:rules,hosting` komutunu çalıştırın.
3. Dağıtımdan sonra uygulamaya yönetici hesabıyla giriş yapın.
4. Profil → Yönetim Merkezi yolunu kontrol edin.
5. Telefon görünümünde hamburger menüsünü ve WordPilot’a dönüş düğmesini test edin.
