WORDPILOT v9.9.2 — ADMIN & FEEDBACK CENTER
==========================================

Bu paket WordPilot v9.9.0 temiz kaynak yapısı üzerine hazırlanmış tam sürümdür.
Eski sürüm klasörünün üzerine dosya eklemek yerine bu klasörü ayrı kullanın.

ÖNEMLİ DOSYALAR
- index.html: uygulamanın ana sayfası
- modules/v992.js: Admin & Feedback Center Aşama 2
- style.css: ana ve responsive tasarım
- firestore.rules: v9.9.2 güvenlik kuralları
- firebase.json: Hosting ve Firestore dağıtım ayarları
- .firebaserc: wordpilot-7a574 proje seçimi
- DEPLOY_WORDPILOT.cmd: Windows için kolay dağıtım
- YUKLEME_ADIMLARI.txt: kısa yükleme rehberi

ADMIN BELGESİ
Firestore > admins > Firebase Authentication UID

role: owner
active: true
displayName: Muhammed Aslan

Desteklenen roller:
owner, admin, support, editor, viewer

DAĞITIM
DEPLOY_WORDPILOT.cmd dosyasına çift tıklayın veya terminalde:

firebase deploy --only firestore:rules,hosting

Canlı adres:
https://wordpilot-7a574.web.app
