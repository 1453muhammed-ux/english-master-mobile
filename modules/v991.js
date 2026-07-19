/* WordPilot v9.9.1 — Admin Center Phase 1: role-aware access, secure routing and responsive management shell. */
const WP991_ADMIN_ROLES=Object.freeze({
  owner:{label:'Sistem Sahibi',feedbackRead:true,feedbackManage:true,contentManage:true,auditRead:true},
  admin:{label:'Yönetici',feedbackRead:true,feedbackManage:true,contentManage:true,auditRead:true},
  support:{label:'Destek',feedbackRead:true,feedbackManage:true,contentManage:false,auditRead:false},
  editor:{label:'İçerik Editörü',feedbackRead:true,feedbackManage:false,contentManage:true,auditRead:false},
  viewer:{label:'Görüntüleyici',feedbackRead:true,feedbackManage:false,contentManage:false,auditRead:true}
});
let wp991AdminContext={checked:false,allowed:false,role:'',active:false,data:null,error:''};
let wp991NavBase=null,wp991AdminPanel='overview',wp991AdminBusy=false;

function wp991RoleConfig(role=wp991AdminContext.role){return WP991_ADMIN_ROLES[role]||null}
function wp991Can(capability){return !!wp991AdminContext.allowed&&!!wp991RoleConfig()?.[capability]}
function wp991RoleLabel(role=wp991AdminContext.role){return wp991RoleConfig(role)?.label||'Yetkisiz'}
function wp991Initials(name){return String(name||'WP').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'WP'}
function wp991AdminAllowed(data){return !!data&&data.active!==false&&Object.prototype.hasOwnProperty.call(WP991_ADMIN_ROLES,String(data.role||'').toLowerCase())}
function wp991AdminMessage(){
  if(!authUser)return 'Yönetim Merkezi için önce hesabınızla giriş yapın.';
  if(wp991AdminContext.error)return 'Yönetici yetkisi doğrulanamadı. Firebase bağlantısını kontrol edin.';
  return 'Bu hesap aktif bir WordPilot yönetici rolüne sahip değil.';
}
function wp991FormatDate(value){
  const date=value?.toDate?.()||value instanceof Date&&value||null;
  return date?new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short'}).format(date):'Tarih bekleniyor';
}
function wp991CategoryLabel(category){return ({idea:'Öneri',bug:'Hata',content:'İçerik',conversation:'Conversation Coach',other:'Diğer'})[category]||'Diğer'}

function wp991AdminShellMarkup(){return `
  <section id="view-admin" class="view wp991-admin-view" aria-label="WordPilot Yönetim Merkezi">
    <div class="wp991-admin-shell">
      <button class="wp991-admin-scrim" type="button" data-wp991-menu-close aria-label="Yönetim menüsünü kapat"></button>
      <aside class="wp991-admin-sidebar" aria-label="Yönetim Merkezi menüsü">
        <div class="wp991-admin-brand"><span>W</span><div><b>WordPilot</b><small>Yönetim Merkezi</small></div><em>9.9.1</em></div>
        <nav class="wp991-admin-nav">
          <button class="active" type="button" data-wp991-admin-tab="overview"><span>⌂</span><div><b>Genel Bakış</b><small>Sistem ve kuyruk özeti</small></div></button>
          <button type="button" data-wp991-admin-tab="feedback"><span>◫</span><div><b>Feedback</b><small>Mevcut gelen kutusu</small></div><em id="wp991FeedbackNavCount">0</em></button>
          <button type="button" data-wp991-admin-tab="content"><span>◇</span><div><b>Content Center</b><small>Altyapı hazırlığı</small></div><i>Aşama 4</i></button>
          <button type="button" data-wp991-admin-tab="history"><span>↺</span><div><b>İşlem Geçmişi</b><small>Audit altyapısı</small></div><i>Aşama 5</i></button>
        </nav>
        <div class="wp991-admin-sidebar-foot">
          <div class="wp991-admin-person"><span id="wp991AdminAvatar">WP</span><div><b id="wp991AdminName">Yönetici</b><small id="wp991AdminEmail">Yetki kontrol ediliyor</small></div></div>
          <div class="wp991-admin-role"><span>Rol</span><b id="wp991AdminRole">Kontrol ediliyor</b></div>
          <button type="button" data-wp991-return><span>←</span> WordPilot’a dön</button>
        </div>
      </aside>

      <div class="wp991-admin-workspace">
        <header class="wp991-admin-topbar">
          <button class="wp991-admin-menu-button" type="button" data-wp991-menu-open aria-label="Yönetim menüsünü aç">☰</button>
          <div><small>YÖNETİM MERKEZİ</small><h1 id="wp991AdminPageTitle">Genel Bakış</h1></div>
          <div class="wp991-admin-top-actions">
            <span id="wp991AdminAccessBadge" class="wp991-access-badge checking">Yetki kontrol ediliyor</span>
            <button id="wp991AdminRefresh" class="secondary" type="button">Yenile</button>
            <button class="secondary wp991-return-desktop" type="button" data-wp991-return>WordPilot’a dön</button>
          </div>
        </header>

        <div id="wp991AdminNotice" class="wp991-admin-notice" hidden></div>

        <div class="wp991-admin-content">
          <section class="wp991-admin-panel active" data-wp991-admin-panel="overview">
            <div class="wp991-admin-welcome">
              <div><p class="eyebrow">v9.9.1 · AŞAMA 1</p><h2>Admin altyapısı hazır</h2><p>Rol tabanlı erişim, güvenli yönlendirme ve masaüstü/mobil yönetim kabuğu bu sürümde tamamlandı.</p></div>
              <div class="wp991-admin-live"><span></span><b id="wp991AdminLiveText">Firebase bekleniyor</b><small id="wp991AdminLiveSub">Hesap ve yetki kontrolü</small></div>
            </div>

            <section class="wp991-overview-metrics" aria-label="Feedback özeti">
              <button type="button" data-wp991-overview-filter="new"><span>Yeni</span><b id="wp991OverviewNew">0</b><small>işlem bekliyor</small></button>
              <button type="button" data-wp991-overview-filter="reviewing"><span>İnceleniyor</span><b id="wp991OverviewReview">0</b><small>aktif değerlendirme</small></button>
              <button type="button" data-wp991-overview-filter="planned"><span>Planlandı</span><b id="wp991OverviewPlanned">0</b><small>yol haritasında</small></button>
              <button type="button" data-wp991-overview-filter="done"><span>Tamamlandı</span><b id="wp991OverviewDone">0</b><small>sonuçlandırıldı</small></button>
            </section>

            <div class="wp991-overview-grid">
              <section class="panel wp991-readiness-card">
                <div class="wp991-card-heading"><div><p class="eyebrow">SİSTEM HAZIRLIĞI</p><h2>Aşama 1 bileşenleri</h2></div><span id="wp991ReadinessScore">0/4</span></div>
                <div class="wp991-check-list">
                  <article data-wp991-check="auth"><span>✓</span><div><b>Firebase Authentication</b><small>Oturum ve kullanıcı kimliği</small></div><em>Kontrol</em></article>
                  <article data-wp991-check="registry"><span>✓</span><div><b>Admin koleksiyonu</b><small>Rol ve aktiflik kaydı</small></div><em>Kontrol</em></article>
                  <article data-wp991-check="routing"><span>✓</span><div><b>Güvenli yönlendirme</b><small>Yetkisiz admin ekranı engeli</small></div><em>Hazır</em></article>
                  <article data-wp991-check="responsive"><span>✓</span><div><b>Responsive yönetim kabuğu</b><small>Masaüstü, tablet ve telefon</small></div><em>Hazır</em></article>
                </div>
              </section>

              <section class="panel wp991-next-card">
                <p class="eyebrow">SONRAKİ UYGULAMA</p><h2>Aşama 2 · Feedback Yönetimi</h2><p>Arama, gelişmiş filtreler, öncelik, atama, kullanıcı yanıtı ve detay ekranı bu kabuğun içine eklenecek.</p>
                <button class="secondary wide" type="button" data-wp991-admin-tab="feedback">Mevcut gelen kutusunu aç</button>
                <div class="wp991-scope-note"><b>Bu sürümde korunur</b><span>Mevcut feedback kayıtları ve temel durum güncelleme özelliği çalışmaya devam eder.</span></div>
              </section>
            </div>

            <section class="panel wp991-recent-card">
              <div class="wp991-card-heading"><div><p class="eyebrow">SON KAYITLAR</p><h2>Feedback ön izlemesi</h2></div><button class="text-link" type="button" data-wp991-admin-tab="feedback">Tümünü aç →</button></div>
              <div id="wp991RecentFeedback" class="wp991-recent-feedback"><div class="wp99-admin-empty">Kayıtlar yükleniyor…</div></div>
            </section>
          </section>

          <section class="wp991-admin-panel" data-wp991-admin-panel="feedback" hidden>
            <div class="wp991-panel-heading"><div><p class="eyebrow">FEEDBACK CENTER</p><h2>Öneri ve hata gelen kutusu</h2><p>v9.9’daki güvenli gelen kutusu korunmuştur. Profesyonel detay ve atama akışı Aşama 2’de eklenecek.</p></div><span id="wp99AdminCount">0 kayıt</span></div>
            <section class="wp99-admin-metrics">
              <article><span>Yeni</span><b id="wp99AdminNew">0</b></article><article><span>İnceleniyor</span><b id="wp99AdminReview">0</b></article><article><span>Planlandı</span><b id="wp99AdminPlanned">0</b></article><article><span>Tamamlandı</span><b id="wp99AdminDone">0</b></article>
            </section>
            <section class="panel wp99-admin-controls"><label>Durum<select id="wp99FeedbackFilter"><option value="all">Tümü</option><option value="new">Yeni</option><option value="reviewing">İnceleniyor</option><option value="planned">Planlandı</option><option value="done">Tamamlandı</option><option value="rejected">Kapatıldı</option></select></label><span id="wp991FeedbackPermission">Yetki kontrol ediliyor</span></section>
            <div id="wp99FeedbackList" class="wp99-feedback-list"><div class="wp99-admin-empty">Yönetici yetkisi kontrol ediliyor…</div></div>
          </section>

          <section class="wp991-admin-panel" data-wp991-admin-panel="content" hidden>
            <div class="wp991-placeholder-hero"><span>◇</span><p class="eyebrow">CONTENT CENTER</p><h2>İçerik yönetim kabuğu hazır</h2><p>Kelime, Reader, Academy ve Conversation Coach içeriklerinin güvenli override sistemi Aşama 4’te bu alana bağlanacak.</p></div>
            <div class="wp991-placeholder-grid"><article><b>İçerik kataloğu</b><small>Tür, dil ve kimliğe göre arama</small></article><article><b>Düzeltme taslakları</b><small>Eski ve yeni içerik karşılaştırması</small></article><article><b>Yayınlama güvenliği</b><small>Ön izleme, revizyon ve geri alma</small></article></div>
          </section>

          <section class="wp991-admin-panel" data-wp991-admin-panel="history" hidden>
            <div class="wp991-placeholder-hero"><span>↺</span><p class="eyebrow">AUDIT CENTER</p><h2>İşlem geçmişi için ayrılmış alan</h2><p>Yönetici hareketleri, durum değişiklikleri ve içerik revizyonları Aşama 5’te zaman çizelgesi olarak gösterilecek.</p></div>
            <div class="wp991-audit-preview"><article><span>1</span><div><b>Kim işlem yaptı?</b><small>Firebase UID, ad ve yönetici rolü</small></div></article><article><span>2</span><div><b>Ne değişti?</b><small>Eski değer, yeni değer ve işlem türü</small></div></article><article><span>3</span><div><b>Ne zaman?</b><small>Sunucu zamanı ve sürüm bilgisi</small></div></article></div>
          </section>
        </div>
      </div>
    </div>
  </section>`}

function wp991EnsureAdminShell(){
  const current=document.querySelector('#view-admin');
  if(current?.classList.contains('wp991-admin-view'))return;
  current?.remove();
  document.querySelector('main')?.insertAdjacentHTML('beforeend',wp991AdminShellMarkup());
  wp991RenderAdminIdentity();
}

function wp991RenderAdminIdentity(){
  wp991EnsureAdminShell();
  const name=authUser?accountDisplayName(profile?.name,authUser):'Yönetici hesabı';
  wp99SetText(document.querySelector('#wp991AdminName'),name);
  wp99SetText(document.querySelector('#wp991AdminEmail'),authUser?.email||'Giriş yapılmadı');
  wp99SetText(document.querySelector('#wp991AdminAvatar'),wp991Initials(name));
  wp99SetText(document.querySelector('#wp991AdminRole'),wp991RoleLabel());
  const badge=document.querySelector('#wp991AdminAccessBadge');
  if(badge){
    badge.className='wp991-access-badge '+(wp991AdminContext.allowed?'ok':wp991AdminContext.checked?'denied':'checking');
    badge.textContent=wp991AdminContext.allowed?`${wp991RoleLabel()} · Aktif`:wp991AdminContext.checked?'Erişim yok':'Yetki kontrol ediliyor';
  }
  const live=document.querySelector('#wp991AdminLiveText'),sub=document.querySelector('#wp991AdminLiveSub');
  if(wp991AdminContext.allowed){wp99SetText(live,'Yönetim bağlantısı aktif');wp99SetText(sub,`${wp991RoleLabel()} yetkisi doğrulandı`)}
  else if(!authUser){wp99SetText(live,'Hesap girişi gerekli');wp99SetText(sub,'Profil ekranından giriş yapın')}
  else if(wp991AdminContext.checked){wp99SetText(live,'Yönetici kaydı bulunamadı');wp99SetText(sub,'admins/<UID> belgesini kontrol edin')}
  const open=document.querySelector('#wp99AdminOpen');if(open){open.hidden=!wp991AdminContext.allowed;open.textContent='🛡 Yönetim Merkezi'}
  wp991UpdateReadiness();
}

function wp991UpdateReadiness(){
  const checks={auth:!!authUser&&!!fbAuth,registry:wp991AdminContext.allowed,routing:true,responsive:true};
  let score=0;Object.entries(checks).forEach(([key,ok])=>{const row=document.querySelector(`[data-wp991-check="${key}"]`);if(!row)return;row.classList.toggle('ready',ok);row.classList.toggle('waiting',!ok);const em=row.querySelector('em');if(em)em.textContent=ok?'Hazır':'Bekliyor';if(ok)score++});
  wp99SetText(document.querySelector('#wp991ReadinessScore'),`${score}/4`);
}

function wp991RenderNotice(message='',type='info'){
  const notice=document.querySelector('#wp991AdminNotice');if(!notice)return;
  notice.hidden=!message;notice.className=`wp991-admin-notice ${type}`;notice.textContent=message;
}

async function wp991CheckAdminAccess(){
  wp991EnsureAdminShell();wp99IsAdmin=false;wp991AdminContext={checked:false,allowed:false,role:'',active:false,data:null,error:''};wp991RenderAdminIdentity();
  if(!authUser||!fbDb){wp991AdminContext.checked=true;wp991RenderAdminIdentity();wp991RenderNotice(wp991AdminMessage(),'warning');if(wp99ActiveView()==='admin')wp991ExitAdmin();return false}
  try{
    const doc=await fbDb.collection('admins').doc(authUser.uid).get(),data=doc.exists?doc.data()||{}:null,rawRole=String(data?.role||'').trim(),role=rawRole.toLowerCase(),allowed=doc.exists&&rawRole===role&&wp991AdminAllowed(data);
    wp991AdminContext={checked:true,allowed,role:allowed?role:'',active:allowed,data,error:''};wp99IsAdmin=allowed;wp991RenderAdminIdentity();
    if(!allowed){wp991RenderNotice(wp991AdminMessage(),'warning');if(wp99ActiveView()==='admin')wp991ExitAdmin();return false}
    wp991RenderNotice('', 'info');
    if(wp991Can('feedbackRead'))await wp991LoadFeedback();
    return true;
  }catch(error){
    console.warn('Admin access check',error);wp991AdminContext={checked:true,allowed:false,role:'',active:false,data:null,error:String(error?.code||error?.message||error)};wp99IsAdmin=false;wp991RenderAdminIdentity();wp991RenderNotice(wp991AdminMessage(),'error');if(wp99ActiveView()==='admin')wp991ExitAdmin();return false;
  }
}

function wp991ExitAdmin(){
  document.querySelector('.wp991-admin-shell')?.classList.remove('menu-open');document.documentElement.classList.remove('wp991-admin-open');
  if(typeof wp991NavBase==='function')wp991NavBase('dashboard');else nav('dashboard');
}

function wp991SelectAdminPanel(panel='overview'){
  const valid=['overview','feedback','content','history'];panel=valid.includes(panel)?panel:'overview';wp991AdminPanel=panel;
  const titles={overview:'Genel Bakış',feedback:'Feedback Center',content:'Content Center',history:'İşlem Geçmişi'};
  document.querySelectorAll('[data-wp991-admin-panel]').forEach(node=>{const active=node.dataset.wp991AdminPanel===panel;node.hidden=!active;node.classList.toggle('active',active)});
  document.querySelectorAll('.wp991-admin-nav [data-wp991-admin-tab]').forEach(node=>node.classList.toggle('active',node.dataset.wp991AdminTab===panel));
  wp99SetText(document.querySelector('#wp991AdminPageTitle'),titles[panel]);
  document.querySelector('.wp991-admin-shell')?.classList.remove('menu-open');
  window.scrollTo({top:0,behavior:'smooth'});
  if(panel==='feedback'&&wp991AdminContext.allowed&&!wp99FeedbackRows.length)wp991LoadFeedback();
}

function wp991FeedbackCounts(){const counts={new:0,reviewing:0,planned:0,done:0,rejected:0};wp99FeedbackRows.forEach(x=>{const key=x.status||'new';if(Object.prototype.hasOwnProperty.call(counts,key))counts[key]++});return counts}
function wp991UpdateFeedbackMetrics(){
  const c=wp991FeedbackCounts();
  [['#wp99AdminNew',c.new],['#wp99AdminReview',c.reviewing],['#wp99AdminPlanned',c.planned],['#wp99AdminDone',c.done],['#wp991OverviewNew',c.new],['#wp991OverviewReview',c.reviewing],['#wp991OverviewPlanned',c.planned],['#wp991OverviewDone',c.done],['#wp991FeedbackNavCount',c.new]].forEach(([selector,value])=>wp99SetText(document.querySelector(selector),String(value)));
}
function wp991RenderRecentFeedback(){
  const host=document.querySelector('#wp991RecentFeedback');if(!host)return;
  const rows=wp99FeedbackRows.slice(0,5);if(!rows.length){host.innerHTML='<div class="wp99-admin-empty">Henüz feedback kaydı yok.</div>';return}
  host.innerHTML=rows.map(row=>`<button type="button" data-wp991-open-feedback="${esc(row.status||'all')}"><span class="wp99-feedback-status ${esc(row.status||'new')}">${esc(wp99FeedbackStatusLabel(row.status||'new'))}</span><div><b>${esc(row.subject||'Başlıksız')}</b><small>${esc(row.ticket||row.id)} · ${esc(wp991CategoryLabel(row.category))}</small></div><em>${esc(wp991FormatDate(row.createdAt))}</em></button>`).join('');
}

function wp991RenderFeedback(){
  wp991EnsureAdminShell();const filter=document.querySelector('#wp99FeedbackFilter')?.value||'all',rows=filter==='all'?wp99FeedbackRows:wp99FeedbackRows.filter(x=>(x.status||'new')===filter),host=document.querySelector('#wp99FeedbackList');if(!host)return;
  wp991UpdateFeedbackMetrics();wp991RenderRecentFeedback();wp99SetText(document.querySelector('#wp99AdminCount'),`${rows.length} kayıt`);
  const permission=document.querySelector('#wp991FeedbackPermission');if(permission)permission.textContent=wp991Can('feedbackManage')?'Durum yönetimi açık':'Salt okunur erişim';
  if(!rows.length){host.innerHTML='<div class="wp99-admin-empty">Bu filtrede kayıt yok.</div>';return}
  const canManage=wp991Can('feedbackManage');
  host.innerHTML=rows.map(row=>`<article class="wp99-feedback-item"><header><div><span class="wp99-feedback-status ${esc(row.status||'new')}">${esc(wp99FeedbackStatusLabel(row.status||'new'))}</span><b>${esc(row.subject||'Başlıksız')}</b><small>${esc(row.ticket||row.id)} · ${esc(wp991FormatDate(row.createdAt))}</small></div><select data-wp99-feedback-status="${esc(row.id)}" ${canManage?'':'disabled title="Bu rol durum değiştiremez"'}><option value="new" ${row.status==='new'?'selected':''}>Yeni</option><option value="reviewing" ${row.status==='reviewing'?'selected':''}>İnceleniyor</option><option value="planned" ${row.status==='planned'?'selected':''}>Planlandı</option><option value="done" ${row.status==='done'?'selected':''}>Tamamlandı</option><option value="rejected" ${row.status==='rejected'?'selected':''}>Kapatıldı</option></select></header><p>${esc(row.message||'')}</p><footer><span><b>${esc(row.name||'Kullanıcı')}</b> · ${esc(row.email||'')}</span><span>${esc(wp991CategoryLabel(row.category))} · ${esc(row.targetLanguage||'')} · ${esc(row.view||row.page||'')}</span><span>${esc(row.viewport||'')} · v${esc(row.appVersion||'')}</span></footer></article>`).join('');
}

async function wp991LoadFeedback(){
  if(!wp991AdminContext.allowed||!wp991Can('feedbackRead')||!fbDb)return;
  const host=document.querySelector('#wp99FeedbackList');if(host)host.innerHTML='<div class="wp99-admin-empty">Öneriler yükleniyor…</div>';wp991AdminBusy=true;
  try{const snap=await fbDb.collection('feedback').orderBy('createdAt','desc').limit(100).get();wp99FeedbackRows=snap.docs.map(doc=>({id:doc.id,...doc.data()}));wp991RenderFeedback()}
  catch(error){console.error('Feedback inbox',error);if(host)host.innerHTML='<div class="wp99-admin-empty"><b>Gelen kutusu açılamadı.</b><span>Firestore Rules ve admins/&lt;Firebase UID&gt; rol kaydını kontrol edin.</span></div>';wp991RenderNotice('Feedback kayıtları yüklenemedi. Firestore yetkilerini kontrol edin.','error')}
  finally{wp991AdminBusy=false}
}

async function wp991UpdateFeedbackStatus(id,status){
  if(!wp991Can('feedbackManage')||!fbDb){toast('Bu yönetici rolü feedback durumunu değiştiremez.');wp991RenderFeedback();return}
  if(!['new','reviewing','planned','done','rejected'].includes(status))return;
  try{await fbDb.collection('feedback').doc(id).update({status,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp(),adminUid:authUser.uid});const row=wp99FeedbackRows.find(x=>x.id===id);if(row)row.status=status;wp991RenderFeedback();toast('Feedback durumu güncellendi.')}
  catch(error){console.error(error);toast('Durum güncellenemedi.');wp991LoadFeedback()}
}

function wp991InstallNavGuard(){
  if(nav?.wp991Guard)return;wp991NavBase=nav;
  nav=function(name){
    name=name||'dashboard';
    if(name==='admin'){
      if(!wp991AdminContext.checked){wp991CheckAdminAccess().then(ok=>{if(ok)nav('admin')});return}
      if(!wp991AdminContext.allowed){toast(wp991AdminMessage());if(!authUser)setTimeout(()=>openProfile(),120);return}
    }
    const result=wp991NavBase(name);document.documentElement.classList.toggle('wp991-admin-open',name==='admin');
    if(name==='admin'){wp991EnsureAdminShell();wp991SelectAdminPanel(wp991AdminPanel);wp991RenderAdminIdentity()}
    return result;
  };
  nav.wp991Guard=true;
}

function wp991ApplyVersion(){
  document.documentElement.dataset.wpVersion='9.9.1';document.documentElement.classList.add('wp991-admin-center');
  document.title='WordPilot 9.9.1 · Admin & Feedback Center';
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='WordPilot v9.9.1 — rol tabanlı Admin Center, güvenli yönetici erişimi ve responsive yönetim ekranları.';
  document.querySelectorAll('.version').forEach(node=>wp99SetText(node,'v9.9.1 · Admin Center'));
  if(window.WORDPILOT_SECURITY)window.WORDPILOT_SECURITY.appVersion='9.9.1';
  if(window.WP_APP_META)window.WP_APP_META={...window.WP_APP_META,version:'9.9.1',label:'v9.9.1 · Admin Center',title:document.title,description:meta?.content||''};
}

function setupV991Events(){
  wp991ApplyVersion();wp991EnsureAdminShell();wp991InstallNavGuard();
  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-wp991-admin-tab]');if(tab){wp991SelectAdminPanel(tab.dataset.wp991AdminTab);return}
    const overview=event.target.closest('[data-wp991-overview-filter]');if(overview){const filter=document.querySelector('#wp99FeedbackFilter');if(filter)filter.value=overview.dataset.wp991OverviewFilter;wp991SelectAdminPanel('feedback');wp991RenderFeedback();return}
    const recent=event.target.closest('[data-wp991-open-feedback]');if(recent){const filter=document.querySelector('#wp99FeedbackFilter');if(filter)filter.value=recent.dataset.wp991OpenFeedback||'all';wp991SelectAdminPanel('feedback');wp991RenderFeedback();return}
    if(event.target.closest('[data-wp991-menu-open]')){document.querySelector('.wp991-admin-shell')?.classList.add('menu-open');return}
    if(event.target.closest('[data-wp991-menu-close]')){document.querySelector('.wp991-admin-shell')?.classList.remove('menu-open');return}
    if(event.target.closest('[data-wp991-return]')){wp991ExitAdmin();return}
    if(event.target.closest('#wp991AdminRefresh')){if(!wp991AdminBusy)wp991CheckAdminAccess();return}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelector('.wp991-admin-shell')?.classList.remove('menu-open')});
  window.addEventListener('popstate',()=>setTimeout(()=>document.documentElement.classList.toggle('wp991-admin-open',wp99ActiveView()==='admin'),80));
}

async function wp991AfterInit(){
  wp991ApplyVersion();wp991EnsureAdminShell();wp991InstallNavGuard();await wp991CheckAdminAccess();
  setTimeout(()=>{wp991ApplyVersion();wp991RenderAdminIdentity()},900);
}

/* Replace the v9.9 starter admin functions while preserving the existing feedback data flow. */
wp99EnsureAdminView=wp991EnsureAdminShell;
wp99CheckAdmin=wp991CheckAdminAccess;
wp99LoadFeedback=wp991LoadFeedback;
wp99RenderFeedback=wp991RenderFeedback;
wp99UpdateFeedbackStatus=wp991UpdateFeedbackStatus;
