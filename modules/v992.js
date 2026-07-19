/* WordPilot v9.9.2 — Admin & Feedback Center Phase 2.
   Full admin shell, reliable role discovery, searchable feedback inbox,
   detail workflow, assignment, notes, public replies, tags and immutable history. */
const WP992_VERSION='9.9.2';
const WP992_ADMIN_ROLES=Object.freeze({
  owner:{label:'Sistem Sahibi',feedbackRead:true,feedbackManage:true,contentManage:true,auditRead:true},
  admin:{label:'Yönetici',feedbackRead:true,feedbackManage:true,contentManage:true,auditRead:true},
  support:{label:'Destek',feedbackRead:true,feedbackManage:true,contentManage:false,auditRead:true},
  editor:{label:'İçerik Editörü',feedbackRead:true,feedbackManage:false,contentManage:true,auditRead:false},
  viewer:{label:'Görüntüleyici',feedbackRead:true,feedbackManage:false,contentManage:false,auditRead:true}
});
const WP992_STATUSES=Object.freeze({
  new:{label:'Yeni',group:'open'},
  reviewing:{label:'İnceleniyor',group:'open'},
  planned:{label:'Planlandı',group:'open'},
  in_progress:{label:'Üzerinde çalışılıyor',group:'open'},
  resolved:{label:'Tamamlandı',group:'closed'},
  closed:{label:'Kapatıldı',group:'closed'},
  done:{label:'Tamamlandı',group:'closed',legacy:true},
  rejected:{label:'Kapatıldı',group:'closed',legacy:true}
});
const WP992_PRIORITIES=Object.freeze({
  low:'Düşük',normal:'Normal',high:'Yüksek',critical:'Kritik'
});
let wp992AdminContext={checked:false,allowed:false,role:'',active:false,data:null,error:''};
let wp992AdminPanel='overview',wp992SelectedId='',wp992HistoryRows=[],wp992Busy=false;
let wp992NavBase=null,wp992AuthUnsubscribe=null,wp992RetryTimer=null;

function wp992RoleConfig(role=wp992AdminContext.role){return WP992_ADMIN_ROLES[role]||null}
function wp992Can(capability){return !!wp992AdminContext.allowed&&!!wp992RoleConfig()?.[capability]}
function wp992RoleLabel(role=wp992AdminContext.role){return wp992RoleConfig(role)?.label||'Yetkisiz'}
function wp992Initials(name){return String(name||'WP').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'WP'}
function wp992StatusKey(status){return status==='done'?'resolved':status==='rejected'?'closed':WP992_STATUSES[status]?status:'new'}
function wp992StatusLabel(status){return WP992_STATUSES[status]?.label||WP992_STATUSES[wp992StatusKey(status)]?.label||'Yeni'}
function wp992PriorityKey(priority){return Object.prototype.hasOwnProperty.call(WP992_PRIORITIES,priority)?priority:'normal'}
function wp992CategoryLabel(category){return ({idea:'Öneri',bug:'Hata',content:'İçerik',conversation:'Conversation Coach',other:'Diğer'})[category]||'Diğer'}
function wp992FormatDate(value){const date=value?.toDate?.()||value instanceof Date&&value||null;return date?new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short'}).format(date):'Tarih bekleniyor'}
function wp992AdminName(){const user=fbAuth?.currentUser||authUser;return user?accountDisplayName(profile?.name,user):'Yönetici hesabı'}
function wp992AdminAllowed(data){const role=String(data?.role||'').trim().toLowerCase();return !!data&&data.active!==false&&Object.prototype.hasOwnProperty.call(WP992_ADMIN_ROLES,role)}
function wp992Message(){
  const user=fbAuth?.currentUser||authUser;
  if(!user)return 'Yönetim Merkezi için önce hesabınızla giriş yapın.';
  if(wp992AdminContext.error)return 'Yönetici yetkisi doğrulanamadı. Firebase bağlantısını ve Firestore Rules kurallarını kontrol edin.';
  return 'Bu hesap aktif bir WordPilot yönetici rolüne sahip değil.';
}
function wp992Text(selector,text){wp99SetText(document.querySelector(selector),String(text))}
function wp992FieldText(value){if(Array.isArray(value))return value.join(', ');if(value===null||value===undefined||value==='')return '—';return String(value)}

function wp992ShellMarkup(){return `
<section id="view-admin" class="view wp991-admin-view" aria-label="WordPilot Yönetim Merkezi">
  <div class="wp991-admin-shell">
    <button class="wp991-admin-scrim" type="button" data-wp992-menu-close aria-label="Yönetim menüsünü kapat"></button>
    <aside class="wp991-admin-sidebar" aria-label="Yönetim Merkezi menüsü">
      <div class="wp991-admin-brand"><span>W</span><div><b>WordPilot</b><small>Yönetim Merkezi</small></div><em>9.9.2</em></div>
      <nav class="wp991-admin-nav">
        <button class="active" type="button" data-wp992-admin-tab="overview"><span>⌂</span><div><b>Genel Bakış</b><small>Feedback ve sistem özeti</small></div></button>
        <button type="button" data-wp992-admin-tab="feedback"><span>◫</span><div><b>Feedback Center</b><small>Öneri ve hata yönetimi</small></div><em id="wp992FeedbackNavCount">0</em></button>
        <button type="button" data-wp992-admin-tab="content"><span>◇</span><div><b>Content Center</b><small>İçerik altyapısı</small></div><i>Aşama 4</i></button>
        <button type="button" data-wp992-admin-tab="history"><span>↺</span><div><b>Genel İşlem Geçmişi</b><small>Merkezi audit ekranı</small></div><i>Aşama 5</i></button>
      </nav>
      <div class="wp991-admin-sidebar-foot">
        <div class="wp991-admin-person"><span id="wp992AdminAvatar">WP</span><div><b id="wp992AdminName">Yönetici</b><small id="wp992AdminEmail">Yetki kontrol ediliyor</small></div></div>
        <div class="wp991-admin-role"><span>Rol</span><b id="wp992AdminRole">Kontrol ediliyor</b></div>
        <button type="button" data-wp992-return><span>←</span> WordPilot’a dön</button>
      </div>
    </aside>
    <div class="wp991-admin-workspace">
      <header class="wp991-admin-topbar">
        <button class="wp991-admin-menu-button" type="button" data-wp992-menu-open aria-label="Yönetim menüsünü aç">☰</button>
        <div><small>YÖNETİM MERKEZİ</small><h1 id="wp992AdminPageTitle">Genel Bakış</h1></div>
        <div class="wp991-admin-top-actions">
          <span id="wp992AdminAccessBadge" class="wp991-access-badge checking">Yetki kontrol ediliyor</span>
          <button id="wp992AdminRefresh" class="secondary" type="button">Yenile</button>
          <button class="secondary wp991-return-desktop" type="button" data-wp992-return>WordPilot’a dön</button>
        </div>
      </header>
      <div id="wp992AdminNotice" class="wp991-admin-notice" hidden></div>
      <div class="wp991-admin-content">
        <section class="wp991-admin-panel active" data-wp992-admin-panel="overview">
          <div class="wp991-admin-welcome">
            <div><p class="eyebrow">v9.9.2 · AŞAMA 2</p><h2>Feedback yönetimi tek merkezde</h2><p>Arama, filtre, öncelik, atama, kullanıcı yanıtı, yönetici notu ve kayıt geçmişi güvenli bir iş akışında birleşti.</p></div>
            <div class="wp991-admin-live"><span></span><b id="wp992AdminLiveText">Firebase bekleniyor</b><small id="wp992AdminLiveSub">Hesap ve yetki kontrolü</small></div>
          </div>
          <section class="wp991-overview-metrics" aria-label="Feedback özeti">
            <button type="button" data-wp992-overview-status="new"><span>Yeni</span><b id="wp992OverviewNew">0</b><small>işlem bekliyor</small></button>
            <button type="button" data-wp992-overview-status="reviewing"><span>İnceleniyor</span><b id="wp992OverviewReview">0</b><small>değerlendiriliyor</small></button>
            <button type="button" data-wp992-overview-status="in_progress"><span>Çalışılıyor</span><b id="wp992OverviewProgress">0</b><small>aktif işlem</small></button>
            <button type="button" data-wp992-overview-status="resolved"><span>Tamamlandı</span><b id="wp992OverviewResolved">0</b><small>sonuçlandırıldı</small></button>
          </section>
          <div class="wp991-overview-grid">
            <section class="panel wp992-queue-card">
              <div class="wp991-card-heading"><div><p class="eyebrow">ÖNCELİKLİ KUYRUK</p><h2>Dikkat isteyen kayıtlar</h2></div><span id="wp992UrgentCount">0 kayıt</span></div>
              <div id="wp992UrgentFeedback" class="wp991-recent-feedback"><div class="wp99-admin-empty">Kayıtlar yükleniyor…</div></div>
            </section>
            <section class="panel wp992-summary-card">
              <p class="eyebrow">YÖNETİM ÖZETİ</p><h2>Bugünkü görünüm</h2>
              <div class="wp992-summary-lines"><button type="button" data-wp992-assignment-filter="mine"><span>Bana atanan</span><b id="wp992MineCount">0</b></button><button type="button" data-wp992-assignment-filter="unassigned"><span>Atanmamış</span><b id="wp992UnassignedCount">0</b></button><button type="button" data-wp992-priority-filter="critical"><span>Kritik</span><b id="wp992CriticalCount">0</b></button></div>
              <button class="secondary wide" type="button" data-wp992-admin-tab="feedback">Feedback Center’ı aç</button>
            </section>
          </div>
          <section class="panel wp991-recent-card">
            <div class="wp991-card-heading"><div><p class="eyebrow">SON KAYITLAR</p><h2>En yeni feedbackler</h2></div><button class="text-link" type="button" data-wp992-admin-tab="feedback">Tümünü aç →</button></div>
            <div id="wp992RecentFeedback" class="wp991-recent-feedback"><div class="wp99-admin-empty">Kayıtlar yükleniyor…</div></div>
          </section>
        </section>

        <section class="wp991-admin-panel" data-wp992-admin-panel="feedback" hidden>
          <div class="wp991-panel-heading"><div><p class="eyebrow">FEEDBACK CENTER</p><h2>Öneri ve hata yönetimi</h2><p>Kayıtları filtreleyin, detayını açın ve tüm işlemleri tek ekrandan yönetin.</p></div><span id="wp992FeedbackCount">0 kayıt</span></div>
          <section class="wp992-feedback-metrics">
            <button type="button" data-wp992-metric-status="new"><span>Yeni</span><b id="wp992MetricNew">0</b></button>
            <button type="button" data-wp992-metric-status="reviewing"><span>İnceleniyor</span><b id="wp992MetricReview">0</b></button>
            <button type="button" data-wp992-metric-status="planned"><span>Planlandı</span><b id="wp992MetricPlanned">0</b></button>
            <button type="button" data-wp992-metric-status="in_progress"><span>Çalışılıyor</span><b id="wp992MetricProgress">0</b></button>
            <button type="button" data-wp992-metric-status="resolved"><span>Tamamlandı</span><b id="wp992MetricResolved">0</b></button>
            <button type="button" data-wp992-metric-status="closed"><span>Kapatıldı</span><b id="wp992MetricClosed">0</b></button>
          </section>
          <section class="panel wp992-feedback-toolbar">
            <label class="wp992-search"><span>Ara</span><input id="wp992FeedbackSearch" type="search" placeholder="Başlık, mesaj, kullanıcı veya takip kodu"></label>
            <label><span>Durum</span><select id="wp992StatusFilter"><option value="all">Tümü</option><option value="new">Yeni</option><option value="reviewing">İnceleniyor</option><option value="planned">Planlandı</option><option value="in_progress">Üzerinde çalışılıyor</option><option value="resolved">Tamamlandı</option><option value="closed">Kapatıldı</option></select></label>
            <label><span>Kategori</span><select id="wp992CategoryFilter"><option value="all">Tümü</option><option value="idea">Öneri</option><option value="bug">Hata</option><option value="content">İçerik</option><option value="conversation">Conversation Coach</option><option value="other">Diğer</option></select></label>
            <label><span>Öncelik</span><select id="wp992PriorityFilter"><option value="all">Tümü</option><option value="critical">Kritik</option><option value="high">Yüksek</option><option value="normal">Normal</option><option value="low">Düşük</option></select></label>
            <label><span>Atama</span><select id="wp992AssignmentFilter"><option value="all">Tümü</option><option value="mine">Bana atanan</option><option value="unassigned">Atanmamış</option></select></label>
            <button id="wp992ClearFilters" class="secondary" type="button">Temizle</button>
          </section>
          <div class="wp992-feedback-workbench">
            <section class="wp992-feedback-list-panel"><div id="wp992FeedbackList" class="wp992-feedback-list"><div class="wp99-admin-empty">Yetki kontrol ediliyor…</div></div></section>
            <aside id="wp992FeedbackDetail" class="wp992-feedback-detail" aria-label="Feedback detayı"><div class="wp992-detail-empty"><span>◫</span><h3>Bir kayıt seçin</h3><p>Bildirim ayrıntıları ve yönetim işlemleri burada açılır.</p></div></aside>
          </div>
        </section>

        <section class="wp991-admin-panel" data-wp992-admin-panel="content" hidden>
          <div class="wp991-placeholder-hero"><span>◇</span><p class="eyebrow">CONTENT CENTER</p><h2>İçerik yönetim alanı hazır</h2><p>Kelime, Reader, Academy ve Conversation Coach içeriklerinin güvenli override sistemi Aşama 4’te bu alana bağlanacak.</p></div>
          <div class="wp991-placeholder-grid"><article><b>İçerik kataloğu</b><small>Tür, dil ve kimliğe göre arama</small></article><article><b>Düzeltme taslakları</b><small>Eski ve yeni içerik karşılaştırması</small></article><article><b>Yayınlama güvenliği</b><small>Ön izleme, sürüm ve geri alma</small></article></div>
        </section>
        <section class="wp991-admin-panel" data-wp992-admin-panel="history" hidden>
          <div class="wp991-placeholder-hero"><span>↺</span><p class="eyebrow">AUDIT CENTER</p><h2>Merkezi işlem geçmişi için ayrılmış alan</h2><p>Her feedback kaydının kendi geçmişi Aşama 2’de aktiftir. Tüm yönetici hareketlerini birleştiren genel ekran Aşama 5’te açılacak.</p></div>
          <div class="wp991-audit-preview"><article><span>1</span><div><b>Kim işlem yaptı?</b><small>Firebase UID, ad ve yönetici rolü</small></div></article><article><span>2</span><div><b>Ne değişti?</b><small>Eski değer, yeni değer ve işlem türü</small></div></article><article><span>3</span><div><b>Ne zaman?</b><small>Sunucu zamanı ve sürüm bilgisi</small></div></article></div>
        </section>
      </div>
    </div>
  </div>
</section>`}

function wp992EnsureAdminShell(){
  const current=document.querySelector('#view-admin');
  if(current?.classList.contains('wp992-admin-view'))return;
  current?.remove();
  document.querySelector('main')?.insertAdjacentHTML('beforeend',wp992ShellMarkup());
  document.querySelector('#view-admin')?.classList.add('wp992-admin-view');
  wp992RenderIdentity();
}
function wp992EnsureProfileEntry(){
  const form=document.querySelector('#profileForm');if(!form)return null;
  let links=document.querySelector('#wp99ProfileLinks');
  if(!links){form.insertAdjacentHTML('afterend','<div id="wp99ProfileLinks" class="wp99-profile-links"></div>');links=document.querySelector('#wp99ProfileLinks')}
  let button=document.querySelector('#wp99AdminOpen');
  if(!button){links.insertAdjacentHTML('beforeend','<button id="wp99AdminOpen" type="button" class="secondary wp992-admin-entry" data-nav="admin" data-close="profileDialog" hidden>🛡 Yönetim Merkezi</button>');button=document.querySelector('#wp99AdminOpen')}
  button.textContent='🛡 Yönetim Merkezi';button.hidden=!wp992AdminContext.allowed;
  return button;
}
function wp992RenderNotice(message='',type='info'){const node=document.querySelector('#wp992AdminNotice');if(!node)return;node.hidden=!message;node.className=`wp991-admin-notice ${type}`;node.textContent=message}
function wp992RenderIdentity(){
  wp992EnsureProfileEntry();
  const user=fbAuth?.currentUser||authUser,name=wp992AdminName();
  wp992Text('#wp992AdminName',name);wp992Text('#wp992AdminEmail',user?.email||'Giriş yapılmadı');wp992Text('#wp992AdminAvatar',wp992Initials(name));wp992Text('#wp992AdminRole',wp992RoleLabel());
  const badge=document.querySelector('#wp992AdminAccessBadge');if(badge){badge.className='wp991-access-badge '+(wp992AdminContext.allowed?'ok':wp992AdminContext.checked?'denied':'checking');badge.textContent=wp992AdminContext.allowed?`${wp992RoleLabel()} · Aktif`:wp992AdminContext.checked?'Erişim yok':'Yetki kontrol ediliyor'}
  if(wp992AdminContext.allowed){wp992Text('#wp992AdminLiveText','Yönetim bağlantısı aktif');wp992Text('#wp992AdminLiveSub',`${wp992RoleLabel()} yetkisi doğrulandı`)}
  else if(!user){wp992Text('#wp992AdminLiveText','Hesap girişi gerekli');wp992Text('#wp992AdminLiveSub','Profil ekranından giriş yapın')}
  else if(wp992AdminContext.checked){wp992Text('#wp992AdminLiveText','Yönetici kaydı bulunamadı');wp992Text('#wp992AdminLiveSub','admins/<UID> belgesini kontrol edin')}
}

async function wp992CheckAdminAccess(options={}){
  wp992EnsureAdminShell();wp992EnsureProfileEntry();
  const user=fbAuth?.currentUser||authUser;
  if(!user||!fbDb){
    wp992AdminContext={checked:!!user,allowed:false,role:'',active:false,data:null,error:user&&!fbDb?'firebase-not-ready':''};wp99IsAdmin=false;wp992RenderIdentity();
    if(user&&!fbDb&&options.retry!==false){clearTimeout(wp992RetryTimer);wp992RetryTimer=setTimeout(()=>wp992CheckAdminAccess({retry:false}),700)}
    if(wp99ActiveView()==='admin'&&!user)wp992ExitAdmin();return false;
  }
  try{
    const doc=await fbDb.collection('admins').doc(user.uid).get(),data=doc.exists?(doc.data()||{}):null,role=String(data?.role||'').trim().toLowerCase(),allowed=doc.exists&&wp992AdminAllowed(data);
    authUser=user;wp992AdminContext={checked:true,allowed,role:allowed?role:'',active:allowed,data,error:''};wp99IsAdmin=allowed;wp992RenderIdentity();
    if(!allowed){wp992RenderNotice(wp992Message(),'warning');if(wp99ActiveView()==='admin')wp992ExitAdmin();return false}
    wp992RenderNotice('','info');if(wp992Can('feedbackRead')&&options.load!==false)await wp992LoadFeedback();return true;
  }catch(error){
    console.warn('WordPilot admin access',error);wp992AdminContext={checked:true,allowed:false,role:'',active:false,data:null,error:String(error?.code||error?.message||error)};wp99IsAdmin=false;wp992RenderIdentity();wp992RenderNotice(wp992Message(),'error');if(wp99ActiveView()==='admin')wp992ExitAdmin();return false;
  }
}
function wp992ExitAdmin(){document.querySelector('.wp991-admin-shell')?.classList.remove('menu-open');document.documentElement.classList.remove('wp991-admin-open');if(typeof wp992NavBase==='function')wp992NavBase('dashboard');else nav('dashboard')}
function wp992SelectPanel(panel='overview'){
  const valid=['overview','feedback','content','history'];panel=valid.includes(panel)?panel:'overview';wp992AdminPanel=panel;
  const titles={overview:'Genel Bakış',feedback:'Feedback Center',content:'Content Center',history:'Genel İşlem Geçmişi'};
  document.querySelectorAll('[data-wp992-admin-panel]').forEach(node=>{const active=node.dataset.wp992AdminPanel===panel;node.hidden=!active;node.classList.toggle('active',active)});
  document.querySelectorAll('[data-wp992-admin-tab]').forEach(node=>node.classList.toggle('active',node.dataset.wp992AdminTab===panel));wp992Text('#wp992AdminPageTitle',titles[panel]);document.querySelector('.wp991-admin-shell')?.classList.remove('menu-open');window.scrollTo({top:0,behavior:'smooth'});
  if(panel==='feedback'&&wp992AdminContext.allowed&&!wp99FeedbackRows.length)wp992LoadFeedback();
}
function wp992InstallNavGuard(){
  if(nav?.wp992Guard)return;wp992NavBase=nav;
  nav=function(name){name=name||'dashboard';if(name==='admin'){if(!wp992AdminContext.checked){wp992CheckAdminAccess().then(ok=>{if(ok)nav('admin')});return}if(!wp992AdminContext.allowed){toast(wp992Message());if(!(fbAuth?.currentUser||authUser))setTimeout(()=>openProfile(),120);return}}
    const result=wp992NavBase(name);document.documentElement.classList.toggle('wp991-admin-open',name==='admin');if(name==='admin'){wp992EnsureAdminShell();wp992SelectPanel(wp992AdminPanel);wp992RenderIdentity()}return result};nav.wp992Guard=true;
}

function wp992Counts(){const c={new:0,reviewing:0,planned:0,in_progress:0,resolved:0,closed:0,critical:0,mine:0,unassigned:0};const uid=(fbAuth?.currentUser||authUser)?.uid||'';wp99FeedbackRows.forEach(row=>{const status=wp992StatusKey(row.status);if(c[status]!==undefined)c[status]++;const priority=wp992PriorityKey(row.priority);if(priority==='critical')c.critical++;if(row.assignedTo===uid)c.mine++;if(!row.assignedTo)c.unassigned++});return c}
function wp992UpdateMetrics(){
  const c=wp992Counts();[['#wp992OverviewNew',c.new],['#wp992OverviewReview',c.reviewing],['#wp992OverviewProgress',c.in_progress],['#wp992OverviewResolved',c.resolved],['#wp992MetricNew',c.new],['#wp992MetricReview',c.reviewing],['#wp992MetricPlanned',c.planned],['#wp992MetricProgress',c.in_progress],['#wp992MetricResolved',c.resolved],['#wp992MetricClosed',c.closed],['#wp992FeedbackNavCount',c.new],['#wp992MineCount',c.mine],['#wp992UnassignedCount',c.unassigned],['#wp992CriticalCount',c.critical]].forEach(([s,v])=>wp992Text(s,v));
}
function wp992Filters(){return {search:(document.querySelector('#wp992FeedbackSearch')?.value||'').trim().toLocaleLowerCase('tr-TR'),status:document.querySelector('#wp992StatusFilter')?.value||'all',category:document.querySelector('#wp992CategoryFilter')?.value||'all',priority:document.querySelector('#wp992PriorityFilter')?.value||'all',assignment:document.querySelector('#wp992AssignmentFilter')?.value||'all'}}
function wp992FilteredRows(){
  const f=wp992Filters(),uid=(fbAuth?.currentUser||authUser)?.uid||'';return wp99FeedbackRows.filter(row=>{
    const status=wp992StatusKey(row.status),priority=wp992PriorityKey(row.priority),hay=[row.subject,row.message,row.name,row.email,row.ticket,row.id,row.publicReply,row.internalNote,(row.tags||[]).join(' ')].join(' ').toLocaleLowerCase('tr-TR');
    return (!f.search||hay.includes(f.search))&&(f.status==='all'||status===f.status)&&(f.category==='all'||row.category===f.category)&&(f.priority==='all'||priority===f.priority)&&(f.assignment==='all'||(f.assignment==='mine'&&row.assignedTo===uid)||(f.assignment==='unassigned'&&!row.assignedTo));
  })
}
function wp992ListItem(row){
  const status=wp992StatusKey(row.status),priority=wp992PriorityKey(row.priority),selected=row.id===wp992SelectedId;
  return `<button type="button" class="wp992-feedback-row ${selected?'selected':''}" data-wp992-feedback-id="${esc(row.id)}"><span class="wp992-priority-dot ${priority}" title="${esc(WP992_PRIORITIES[priority])}"></span><div class="wp992-feedback-row-main"><div><span class="wp99-feedback-status ${esc(status)}">${esc(wp992StatusLabel(status))}</span><span class="wp992-category-badge">${esc(wp992CategoryLabel(row.category))}</span></div><b>${esc(row.subject||'Başlıksız')}</b><p>${esc(row.message||'')}</p><small>${esc(row.ticket||row.id)} · ${esc(wp992FormatDate(row.createdAt))}</small></div><div class="wp992-feedback-row-side"><em class="wp992-priority ${priority}">${esc(WP992_PRIORITIES[priority])}</em><span>${row.assignedTo?`👤 ${esc(row.assignedName||'Yönetici')}`:'Atanmamış'}</span></div></button>`
}
function wp992RenderList(){
  wp992EnsureAdminShell();wp992UpdateMetrics();const rows=wp992FilteredRows(),host=document.querySelector('#wp992FeedbackList');if(!host)return;wp992Text('#wp992FeedbackCount',`${rows.length} kayıt`);
  if(!rows.length){host.innerHTML='<div class="wp99-admin-empty"><b>Bu filtrede kayıt yok.</b><span>Filtreleri temizleyerek tüm kayıtları görüntüleyin.</span></div>';return}
  host.innerHTML=rows.map(wp992ListItem).join('');
}
function wp992PreviewButton(row){const status=wp992StatusKey(row.status);return `<button type="button" data-wp992-preview-id="${esc(row.id)}"><span class="wp99-feedback-status ${esc(status)}">${esc(wp992StatusLabel(status))}</span><div><b>${esc(row.subject||'Başlıksız')}</b><small>${esc(row.ticket||row.id)} · ${esc(wp992CategoryLabel(row.category))}</small></div><em>${esc(wp992FormatDate(row.createdAt))}</em></button>`}
function wp992RenderOverview(){
  wp992UpdateMetrics();const recent=document.querySelector('#wp992RecentFeedback'),urgent=document.querySelector('#wp992UrgentFeedback');if(recent){const rows=wp99FeedbackRows.slice(0,5);recent.innerHTML=rows.length?rows.map(wp992PreviewButton).join(''):'<div class="wp99-admin-empty">Henüz feedback kaydı yok.</div>'}
  if(urgent){const rows=wp99FeedbackRows.filter(r=>['critical','high'].includes(wp992PriorityKey(r.priority))&&!['resolved','closed'].includes(wp992StatusKey(r.status))).slice(0,5);urgent.innerHTML=rows.length?rows.map(wp992PreviewButton).join(''):'<div class="wp99-admin-empty">Yüksek öncelikli açık kayıt yok.</div>';wp992Text('#wp992UrgentCount',`${rows.length} kayıt`)}
}
async function wp992LoadFeedback(){
  if(!wp992AdminContext.allowed||!wp992Can('feedbackRead')||!fbDb)return false;const host=document.querySelector('#wp992FeedbackList');if(host)host.innerHTML='<div class="wp99-admin-empty">Feedback kayıtları yükleniyor…</div>';wp992Busy=true;
  try{const snap=await fbDb.collection('feedback').orderBy('createdAt','desc').limit(200).get();wp99FeedbackRows=snap.docs.map(doc=>({id:doc.id,...doc.data()}));wp992RenderList();wp992RenderOverview();if(wp992SelectedId){const row=wp99FeedbackRows.find(x=>x.id===wp992SelectedId);if(row)wp992RenderDetail(row);else wp992CloseDetail()}return true}
  catch(error){console.error('WordPilot feedback inbox',error);if(host)host.innerHTML='<div class="wp99-admin-empty"><b>Gelen kutusu açılamadı.</b><span>Firestore Rules ve admins/&lt;Firebase UID&gt; rol kaydını kontrol edin.</span></div>';wp992RenderNotice('Feedback kayıtları yüklenemedi. Firestore yetkilerini kontrol edin.','error');return false}
  finally{wp992Busy=false}
}
function wp992TechnicalRows(row){return [['Uygulama sürümü',row.appVersion],['Gönderildiği ekran',row.view||row.page],['Hedef dil',row.targetLanguage],['Arayüz dili',row.uiLanguage],['Ekran',row.viewport],['Tarayıcı',row.userAgent],['Kullanıcı UID',row.uid]].map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(wp992FieldText(v))}</b></div>`).join('')}
function wp992HistoryMarkup(){
  if(!wp992HistoryRows.length)return '<div class="wp992-history-empty">Henüz yönetim işlemi kaydedilmemiş.</div>';
  return wp992HistoryRows.map(item=>`<article><span>${esc(wp992Initials(item.actorName||'WP'))}</span><div><b>${esc(item.actorName||'Yönetici')} · ${esc(item.actorRole||'')}</b><small>${esc(wp992FormatDate(item.createdAt))}</small><p>${(item.changes||[]).map(change=>`${esc(change.label||change.field||'Alan')}: <strong>${esc(wp992FieldText(change.from))}</strong> → <strong>${esc(wp992FieldText(change.to))}</strong>`).join('<br>')||esc(item.action||'Kayıt güncellendi')}</p></div></article>`).join('')
}
function wp992RenderDetail(row){
  const host=document.querySelector('#wp992FeedbackDetail');if(!host)return;const canManage=wp992Can('feedbackManage'),status=wp992StatusKey(row.status),priority=wp992PriorityKey(row.priority),tags=Array.isArray(row.tags)?row.tags.join(', '):'';host.dataset.assignedTo=row.assignedTo||'';host.dataset.assignedName=row.assignedName||'';
  host.innerHTML=`<div class="wp992-detail-head"><div><span class="wp99-feedback-status ${esc(status)}">${esc(wp992StatusLabel(status))}</span><small>${esc(row.ticket||row.id)}</small><h3>${esc(row.subject||'Başlıksız')}</h3></div><button type="button" data-wp992-detail-close aria-label="Detayı kapat">×</button></div>
  <div class="wp992-detail-scroll">
    <section class="wp992-user-message"><div class="wp992-user-line"><span>${esc(wp992Initials(row.name||'K'))}</span><div><b>${esc(row.name||'Kullanıcı')}</b><small>${esc(row.email||'E-posta yok')} · ${esc(wp992FormatDate(row.createdAt))}</small></div></div><p>${esc(row.message||'')}</p></section>
    <section class="wp992-detail-section"><div class="wp992-section-title"><h4>Yönetim</h4><span id="wp992AssignmentText">${row.assignedTo?`Atanan: ${esc(row.assignedName||'Yönetici')}`:'Atanmamış'}</span></div>
      <div class="wp992-admin-fields"><label>Durum<select id="wp992DetailStatus" ${canManage?'':'disabled'}><option value="new" ${status==='new'?'selected':''}>Yeni</option><option value="reviewing" ${status==='reviewing'?'selected':''}>İnceleniyor</option><option value="planned" ${status==='planned'?'selected':''}>Planlandı</option><option value="in_progress" ${status==='in_progress'?'selected':''}>Üzerinde çalışılıyor</option><option value="resolved" ${status==='resolved'?'selected':''}>Tamamlandı</option><option value="closed" ${status==='closed'?'selected':''}>Kapatıldı</option></select></label><label>Öncelik<select id="wp992DetailPriority" ${canManage?'':'disabled'}><option value="low" ${priority==='low'?'selected':''}>Düşük</option><option value="normal" ${priority==='normal'?'selected':''}>Normal</option><option value="high" ${priority==='high'?'selected':''}>Yüksek</option><option value="critical" ${priority==='critical'?'selected':''}>Kritik</option></select></label></div>
      <div class="wp992-assignment-actions"><button class="secondary" type="button" data-wp992-assign-me ${canManage?'':'disabled'}>Bana ata</button><button class="secondary" type="button" data-wp992-unassign ${canManage?'':'disabled'}>Atamayı kaldır</button></div>
    </section>
    <section class="wp992-detail-section"><label class="wp992-textarea-label"><span>Kullanıcıya gösterilecek yanıt</span><small>Tamamlandı veya Kapatıldı durumunda zorunludur.</small><textarea id="wp992PublicReply" maxlength="2000" ${canManage?'':'disabled'} placeholder="Kullanıcıya açıklayıcı ve nazik bir sonuç yazın.">${esc(row.publicReply||'')}</textarea></label></section>
    <section class="wp992-detail-section"><label class="wp992-textarea-label"><span>Yalnızca admin notu</span><small>Bu metin normal kullanıcıya gösterilmez.</small><textarea id="wp992InternalNote" maxlength="3000" ${canManage?'':'disabled'} placeholder="İnceleme notları, teknik ayrıntılar veya sonraki adımlar.">${esc(row.internalNote||'')}</textarea></label><label class="wp992-tags-label"><span>Etiketler</span><input id="wp992Tags" maxlength="240" ${canManage?'':'disabled'} value="${esc(tags)}" placeholder="ör. mobil, rusça, coach"></label></section>
    <details class="wp992-technical"><summary>Teknik bağlam</summary><div>${wp992TechnicalRows(row)}</div></details>
    <section class="wp992-detail-section wp992-history"><div class="wp992-section-title"><h4>İşlem geçmişi</h4><span>${wp992HistoryRows.length} kayıt</span></div><div id="wp992HistoryList">${wp992HistoryMarkup()}</div></section>
  </div>
  <div class="wp992-detail-actions"><span id="wp992DetailPermission">${canManage?'Değişiklik yapabilirsiniz.':'Bu rol salt okunurdur.'}</span><button id="wp992SaveFeedback" type="button" ${canManage?'':'disabled'}>Değişiklikleri kaydet</button></div>`;
  host.classList.add('open');document.querySelector('.wp992-feedback-workbench')?.classList.add('detail-open');
}
async function wp992OpenDetail(id){const row=wp99FeedbackRows.find(x=>x.id===id);if(!row)return;wp992SelectedId=id;wp992HistoryRows=[];wp992RenderList();wp992RenderDetail(row);await wp992LoadHistory(id);wp992RenderDetail(row)}
function wp992CloseDetail(){wp992SelectedId='';wp992HistoryRows=[];const host=document.querySelector('#wp992FeedbackDetail');if(host){host.classList.remove('open');host.innerHTML='<div class="wp992-detail-empty"><span>◫</span><h3>Bir kayıt seçin</h3><p>Bildirim ayrıntıları ve yönetim işlemleri burada açılır.</p></div>'}document.querySelector('.wp992-feedback-workbench')?.classList.remove('detail-open');wp992RenderList()}
async function wp992LoadHistory(id){
  if(!fbDb||!wp992Can('feedbackRead'))return;try{const snap=await fbDb.collection('feedback').doc(id).collection('history').orderBy('createdAt','desc').limit(40).get();wp992HistoryRows=snap.docs.map(doc=>({id:doc.id,...doc.data()}))}catch(error){console.warn('Feedback history',error);wp992HistoryRows=[]}
}
function wp992ParseTags(value){return [...new Set(String(value||'').split(',').map(x=>x.trim().toLocaleLowerCase('tr-TR')).filter(Boolean))].slice(0,10)}
function wp992ChangeLabel(field){return ({status:'Durum',priority:'Öncelik',assignedTo:'Atama',publicReply:'Kullanıcı yanıtı',internalNote:'Admin notu',tags:'Etiketler'})[field]||field}
async function wp992SaveFeedback(){
  if(!wp992Can('feedbackManage')||!fbDb||!wp992SelectedId){toast('Bu işlem için feedback yönetim yetkisi gerekir.');return}
  const row=wp99FeedbackRows.find(x=>x.id===wp992SelectedId);if(!row)return;const detail=document.querySelector('#wp992FeedbackDetail'),status=document.querySelector('#wp992DetailStatus')?.value||'new',priority=document.querySelector('#wp992DetailPriority')?.value||'normal',publicReply=(document.querySelector('#wp992PublicReply')?.value||'').trim(),internalNote=(document.querySelector('#wp992InternalNote')?.value||'').trim(),tags=wp992ParseTags(document.querySelector('#wp992Tags')?.value),assignedTo=detail?.dataset.assignedTo||'',assignedName=detail?.dataset.assignedName||'';
  if(['resolved','closed'].includes(status)&&publicReply.length<3){toast('Tamamlanan veya kapatılan kayıt için kullanıcıya açık bir yanıt yazın.');document.querySelector('#wp992PublicReply')?.focus();return}
  const before={status:wp992StatusKey(row.status),priority:wp992PriorityKey(row.priority),assignedTo:row.assignedTo||'',publicReply:row.publicReply||'',internalNote:row.internalNote||'',tags:Array.isArray(row.tags)?row.tags:[]};const after={status,priority,assignedTo,publicReply,internalNote,tags};const changes=[];
  Object.keys(after).forEach(field=>{const a=Array.isArray(after[field])?JSON.stringify(after[field]):String(after[field]??''),b=Array.isArray(before[field])?JSON.stringify(before[field]):String(before[field]??'');if(a!==b)changes.push({field,label:wp992ChangeLabel(field),from:before[field],to:after[field]})});
  if(!changes.length){toast('Kaydedilecek bir değişiklik yok.');return}
  const button=document.querySelector('#wp992SaveFeedback');if(button){button.disabled=true;button.textContent='Kaydediliyor…'}
  try{
    const server=window.firebase.firestore.FieldValue.serverTimestamp(),ref=fbDb.collection('feedback').doc(row.id),historyRef=ref.collection('history').doc(),batch=fbDb.batch();
    batch.update(ref,{status,priority,assignedTo,assignedName,publicReply,internalNote,tags,updatedAt:server,adminUid:(fbAuth?.currentUser||authUser).uid});
    batch.set(historyRef,{action:'feedback_updated',changes,actorUid:(fbAuth?.currentUser||authUser).uid,actorName:wp992AdminName(),actorRole:wp992RoleLabel(),appVersion:WP992_VERSION,createdAt:server});await batch.commit();
    Object.assign(row,{status,priority,assignedTo,assignedName,publicReply,internalNote,tags,updatedAt:new Date(),adminUid:(fbAuth?.currentUser||authUser).uid});toast('Feedback kaydı güncellendi.');await wp992LoadHistory(row.id);wp992RenderList();wp992RenderOverview();wp992RenderDetail(row);
  }catch(error){console.error('Feedback update',error);toast('Değişiklikler kaydedilemedi. Firestore yetkilerini kontrol edin.')}finally{const current=document.querySelector('#wp992SaveFeedback');if(current){current.disabled=!wp992Can('feedbackManage');current.textContent='Değişiklikleri kaydet'}}
}
function wp992AssignMe(){if(!wp992Can('feedbackManage'))return;const detail=document.querySelector('#wp992FeedbackDetail'),user=fbAuth?.currentUser||authUser;if(!detail||!user)return;detail.dataset.assignedTo=user.uid;detail.dataset.assignedName=wp992AdminName();wp992Text('#wp992AssignmentText',`Atanan: ${wp992AdminName()}`)}
function wp992Unassign(){if(!wp992Can('feedbackManage'))return;const detail=document.querySelector('#wp992FeedbackDetail');if(!detail)return;detail.dataset.assignedTo='';detail.dataset.assignedName='';wp992Text('#wp992AssignmentText','Atanmamış')}
function wp992ClearFilters(){['#wp992FeedbackSearch','#wp992StatusFilter','#wp992CategoryFilter','#wp992PriorityFilter','#wp992AssignmentFilter'].forEach((selector,index)=>{const node=document.querySelector(selector);if(node)node.value=index===0?'':'all'});wp992RenderList()}
function wp992ApplyQuickFilter(type,value){wp992SelectPanel('feedback');if(type==='status'){const node=document.querySelector('#wp992StatusFilter');if(node)node.value=value}if(type==='assignment'){const node=document.querySelector('#wp992AssignmentFilter');if(node)node.value=value}if(type==='priority'){const node=document.querySelector('#wp992PriorityFilter');if(node)node.value=value}wp992RenderList()}

function wp992ApplyVersion(){
  document.documentElement.dataset.wpVersion=WP992_VERSION;document.documentElement.classList.add('wp99-reset','wp991-admin-center','wp992-feedback-center');document.title='WordPilot 9.9.2 · Admin & Feedback Center';
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='WordPilot v9.9.2 — profesyonel Admin & Feedback Center, rol tabanlı yönetim, detay iş akışı ve kayıt geçmişi.';
  document.querySelectorAll('.version').forEach(node=>wp99SetText(node,'v9.9.2 · Feedback Center'));if(window.WORDPILOT_SECURITY)window.WORDPILOT_SECURITY.appVersion=WP992_VERSION;if(window.WP_APP_META)window.WP_APP_META={...window.WP_APP_META,version:WP992_VERSION,label:'v9.9.2 · Feedback Center',title:document.title,description:meta?.content||''};
}
function wp992BindAuth(){
  if(wp992AuthUnsubscribe||!fbAuth)return;wp992AuthUnsubscribe=fbAuth.onAuthStateChanged(()=>setTimeout(()=>wp992CheckAdminAccess(),650));
}
function setupV992Events(){
  wp992ApplyVersion();wp992EnsureAdminShell();wp992EnsureProfileEntry();wp992InstallNavGuard();
  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-wp992-admin-tab]');if(tab){wp992SelectPanel(tab.dataset.wp992AdminTab);return}
    const row=event.target.closest('[data-wp992-feedback-id]');if(row){wp992OpenDetail(row.dataset.wp992FeedbackId);return}
    const preview=event.target.closest('[data-wp992-preview-id]');if(preview){wp992SelectPanel('feedback');wp992OpenDetail(preview.dataset.wp992PreviewId);return}
    const metric=event.target.closest('[data-wp992-metric-status]');if(metric){wp992ApplyQuickFilter('status',metric.dataset.wp992MetricStatus);return}
    const overview=event.target.closest('[data-wp992-overview-status]');if(overview){wp992ApplyQuickFilter('status',overview.dataset.wp992OverviewStatus);return}
    const assignment=event.target.closest('[data-wp992-assignment-filter]');if(assignment){wp992ApplyQuickFilter('assignment',assignment.dataset.wp992AssignmentFilter);return}
    const priority=event.target.closest('[data-wp992-priority-filter]');if(priority){wp992ApplyQuickFilter('priority',priority.dataset.wp992PriorityFilter);return}
    if(event.target.closest('[data-wp992-detail-close]')){wp992CloseDetail();return}
    if(event.target.closest('[data-wp992-assign-me]')){wp992AssignMe();return}
    if(event.target.closest('[data-wp992-unassign]')){wp992Unassign();return}
    if(event.target.closest('#wp992SaveFeedback')){wp992SaveFeedback();return}
    if(event.target.closest('#wp992ClearFilters')){wp992ClearFilters();return}
    if(event.target.closest('[data-wp992-menu-open]')){document.querySelector('.wp991-admin-shell')?.classList.add('menu-open');return}
    if(event.target.closest('[data-wp992-menu-close]')){document.querySelector('.wp991-admin-shell')?.classList.remove('menu-open');return}
    if(event.target.closest('[data-wp992-return]')){wp992ExitAdmin();return}
    if(event.target.closest('#wp992AdminRefresh')){if(!wp992Busy)wp992CheckAdminAccess();return}
    if(event.target.closest('[data-action="open-profile"],#profileBtn,[data-nav="profile"]'))setTimeout(()=>{wp992EnsureProfileEntry();wp992CheckAdminAccess({load:false})},180);
  },true);
  document.addEventListener('input',event=>{if(event.target.id==='wp992FeedbackSearch')wp992RenderList()});
  document.addEventListener('change',event=>{if(['wp992StatusFilter','wp992CategoryFilter','wp992PriorityFilter','wp992AssignmentFilter'].includes(event.target.id))wp992RenderList()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(document.querySelector('.wp992-feedback-detail.open'))wp992CloseDetail();else document.querySelector('.wp991-admin-shell')?.classList.remove('menu-open')}});
  window.addEventListener('popstate',()=>setTimeout(()=>document.documentElement.classList.toggle('wp991-admin-open',wp99ActiveView()==='admin'),80));
}
async function wp992AfterInit(){
  wp992ApplyVersion();wp992EnsureAdminShell();wp992EnsureProfileEntry();wp992InstallNavGuard();wp992BindAuth();await wp992CheckAdminAccess();
  setTimeout(()=>{wp992ApplyVersion();wp992EnsureProfileEntry();wp992RenderIdentity();wp992BindAuth()},900);
}

/* Replace the v9.9 starter admin functions while preserving the current feedback submit flow. */
wp99EnsureAdminView=wp992EnsureAdminShell;
wp99CheckAdmin=wp992CheckAdminAccess;
wp99LoadFeedback=wp992LoadFeedback;
wp99RenderFeedback=wp992RenderList;
wp99UpdateFeedbackStatus=function(id){wp992OpenDetail(id)};
wp99FeedbackStatusLabel=wp992StatusLabel;
