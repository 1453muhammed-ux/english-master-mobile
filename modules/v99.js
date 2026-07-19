/* WordPilot v9.9.2 — UX Reset foundation with Admin & Feedback Center Phase 2. */
const WP99_META=Object.freeze({
  version:'9.9.2',
  label:'v9.9.2 · Feedback Center',
  title:'WordPilot 9.9.2 · Admin & Feedback Center',
  description:'WordPilot v9.9.2 — profesyonel Admin & Feedback Center, rol tabanlı yönetim ve kayıt geçmişi.',
  academy:{totalLessons:102,enLessons:48,ruLessons:54,totalReadings:48,enReadings:18,ruReadings:30},
  reader:{stories:114},
  phraseLab:240,
  words:{en:5000,ru:1500,uz:1000,tr:5000},
  concepts:5000
});
window.WP_APP_META=WP99_META;
const WP99_CORE_COURSES=new Set(['en','ru','uz','tr']);
let wp99Observer=null,wp99ShowAllLanguages=false,wp99IsAdmin=false,wp99FeedbackRows=[];

function wp99Icon(name){
  const icons={
    academy:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.2 12 5l9 5.2-9 5.2-9-5.2Z"/><path d="M6.5 12.5v4.1c2.8 2.2 8.2 2.2 11 0v-4.1M21 10v6"/></svg>',
    words:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12H7.5A2.5 2.5 0 0 1 5 16.5v-12Z"/><path d="M8 8h7M8 11h7M8 14h4M5 16.5A2.5 2.5 0 0 1 7.5 14H19"/></svg>',
    reader:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21V5.5Z"/></svg>',
    speak:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/></svg>',
    review:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 8.2A7 7 0 0 1 18.7 7M17.8 15.8A7 7 0 0 1 5.3 17"/></svg>',
    progress:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    tools:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>',
    profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>'
  };
  return icons[name]||icons.tools;
}
function wp99ActiveView(){return document.querySelector('.view.active')?.id?.replace(/^view-/,'')||'dashboard'}
function wp99CourseReady(course=activeCourse){return Number(WP99_META.words[course]||(typeof wp96BankReady==='function'?wp96BankReady(course):1000))}
function wp99CourseSubtitle(id){
  if(id==='en')return '5000 kelime · A1–C2 öğrenme sistemi';
  if(id==='ru')return '1500 kelime · A1–C2 Akademi';
  if(id==='uz')return '1000 kelime · Quiz ve Reader';
  if(id==='tr')return '5000 Türkçe anlam desteği';
  return `${wp96AlignedReady?.(id)||1000} ortak kavram çevirisi`;
}
function wp99SetText(node,text){if(node&&node.textContent!==text)node.textContent=text}

function wp99ApplyMeta(){
  document.documentElement.dataset.wpVersion=WP99_META.version;
  document.documentElement.classList.add('wp99-reset');
  if(document.title!==WP99_META.title)document.title=WP99_META.title;
  const meta=document.querySelector('meta[name="description"]');if(meta&&meta.content!==WP99_META.description)meta.content=WP99_META.description;
  document.querySelectorAll('.version').forEach(node=>{wp99SetText(node,WP99_META.label);node.setAttribute('role','button');node.setAttribute('tabindex','0');node.title='Yenilikler ve araçlar'});
  if(window.WORDPILOT_SECURITY)window.WORDPILOT_SECURITY.appVersion=WP99_META.version;
  const summary=document.querySelector('#activeCourseSummary');if(summary){const name=COURSES[activeCourse]?.name||activeCourse;wp99SetText(summary,`${name} · ${wp99CourseReady(activeCourse)} hazır kayıt`)}
  document.querySelectorAll('.course-card[data-course]').forEach(card=>{const id=card.dataset.course,small=card.querySelector('small');if(small)wp99SetText(small,wp99CourseSubtitle(id))});
  const hero=document.querySelector('.academy-dashboard-hero');if(hero){
    const badges=hero.querySelectorAll('.academy-dashboard-badges span');
    if(badges[0])wp99SetText(badges[0],`${WP99_META.academy.totalLessons} toplam ders`);
    if(badges[1])wp99SetText(badges[1],`${WP99_META.academy.enLessons} English + ${WP99_META.academy.ruLessons} Русский`);
    if(badges[2])wp99SetText(badges[2],`${WP99_META.academy.totalReadings} ders okuması`);
  }
  const storyProgress=document.querySelector('#storyProgressText');if(storyProgress&&/0\s*\/\s*0/.test(storyProgress.textContent||''))wp99SetText(storyProgress,`0 / ${WP99_META.reader.stories} tamamlandı`);
  const onboardingEye=document.querySelector('.wp71-onboarding-brand .eyebrow');if(onboardingEye)wp99SetText(onboardingEye,'WORDPILOT 9.9');
  const legalTitle=document.querySelector('.wp71-legal-note b');if(legalTitle){const ui=wp71LanguageProfile?.ui||'tr';wp99SetText(legalTitle,({tr:'Ticari temiz içerik',en:'Commercial clean content',ru:'Коммерчески чистый контент',uz:'Tijoriy toza kontent'})[ui]||'Commercial clean content')}
}

function wp99BuildDashboard(){
  const hub=document.querySelector('.learning-hub');if(!hub)return;
  hub.removeAttribute('data-course');hub.removeAttribute('data-promoted');hub.removeAttribute('aria-labelledby');
  if(!hub.dataset.wp99){
    hub.dataset.wp99='1';hub.className='learning-hub wp99-home-hub';
    hub.innerHTML=`
      <div class="wp99-home-head"><div><p class="eyebrow">BUGÜNÜN PLANI</p><h2>Şimdi neye devam edeceksin?</h2><p>En çok kullanılan dört yol burada; rapor ve tekrarlar aşağıdaki kısa bağlantılarda.</p></div><span class="wp99-focus-badge">Odaklı ana sayfa</span></div>
      <div class="wp99-primary-grid">
        <button type="button" class="wp99-primary-card" data-wp99-route="academy"><span class="wp99-icon">${wp99Icon('academy')}</span><div><small>KALDIĞIN YERDEN</small><b>Derse devam et</b><p id="wp99AcademyHint">A1–C2 Academy rotanı aç</p></div><em>→</em></button>
        <button type="button" class="wp99-primary-card" data-wp99-route="session"><span class="wp99-icon">${wp99Icon('words')}</span><div><small>AKTİF KELİME SETİ</small><b id="wp99SessionTitle">Kelime setimi çalış</b><p id="wp99SessionHint">5 kelime seç ve bütün oyunlarda koru</p></div><em>→</em></button>
        <button type="button" class="wp99-primary-card" data-wp99-route="stories"><span class="wp99-icon">${wp99Icon('reader')}</span><div><small>BAĞIMSIZ KÜTÜPHANE</small><b>Reader Pro’da oku</b><p>${WP99_META.reader.stories} metin · sözlük · cümle laboratuvarı</p></div><em>→</em></button>
        <button type="button" class="wp99-primary-card" data-wp99-route="ai"><span class="wp99-icon">${wp99Icon('speak')}</span><div><small>KONUŞMA PRATİĞİ</small><b>Conversation Coach</b><p>Senaryo, düzeltme ve yerel konuşma akışı</p></div><em>→</em></button>
      </div>
      <div class="wp99-secondary-row">
        <button type="button" data-wp99-route="adaptive">${wp99Icon('review')}<span><b>Tekrar bekleyenler</b><small id="wp99ReviewHint">Kişisel tekrar kuyruğunu aç</small></span></button>
        <button type="button" data-wp99-route="progress">${wp99Icon('progress')}<span><b>İlerlememi gör</b><small>PP, doğruluk ve lig özeti</small></span></button>
        <button type="button" data-wp99-route="tools">${wp99Icon('tools')}<span><b>Araçlar ve yenilikler</b><small>Kavram Atlası ve sürüm notları</small></span></button>
      </div>`;
  }
  wp99RefreshDashboard();
}
function wp99RefreshDashboard(){
  const set=typeof wp97ActiveSet==='function'?wp97ActiveSet():null,title=document.querySelector('#wp99SessionTitle'),hint=document.querySelector('#wp99SessionHint');
  if(set&&set.ids?.length){wp99SetText(title,`${set.ids.length} kelimelik sete devam et`);wp99SetText(hint,`${COURSES[set.course]?.name||set.course} · ${typeof wp97DirectionLabel==='function'?wp97DirectionLabel(set):'çalışma rotası'}`)}
  else{wp99SetText(title,'Kelime setimi oluştur');wp99SetText(hint,'5 kelime seç ve bütün oyunlarda koru')}
  const reviewCount=state?.history?new Set([...(typeof reviewIds==='function'?reviewIds():[]),...(typeof wrongIds==='function'?wrongIds():[])]).size:0;
  wp99SetText(document.querySelector('#wp99ReviewHint'),reviewCount?`${reviewCount} kayıt tekrar bekliyor`:'Tekrar kuyruğun temiz');
  const academyHint=document.querySelector('#wp99AcademyHint');if(academyHint){const course=activeCourse==='ru'?'Русский':activeCourse==='en'?'English':COURSES[activeCourse]?.name||activeCourse;wp99SetText(academyHint,`${course} Academy rotanı aç`)}
  wp99BuildSnapshot();
}
function wp99BuildSnapshot(){
  const hub=document.querySelector('.wp99-home-hub');if(!hub)return;let box=document.querySelector('#wp99Snapshot');if(!box){hub.insertAdjacentHTML('afterend',`<section id="wp99Snapshot" class="wp99-snapshot"><div class="wp99-snapshot-copy"><p class="eyebrow">BUGÜNKÜ DURUM</p><h2>Kısa özet</h2></div><div class="wp99-metrics"><article><span>Bugün</span><b id="wp99TodayMetric">0 / 20</b><small>çalışma</small></article><article><span>Seri</span><b id="wp99StreakMetric">0 gün</b><small>devamlılık</small></article><article><span>Tekrar</span><b id="wp99ReviewMetric">0</b><small>bekleyen kayıt</small></article></div></section>`);box=document.querySelector('#wp99Snapshot')}
  const today=Number(state?.stats?.todayAnswers||0),goal=Number(profile?.goal||20),streak=Number(state?.stats?.streak||0),review=state?.history?new Set([...(typeof reviewIds==='function'?reviewIds():[]),...(typeof wrongIds==='function'?wrongIds():[])]).size:0;
  wp99SetText(document.querySelector('#wp99TodayMetric'),`${today} / ${goal}`);wp99SetText(document.querySelector('#wp99StreakMetric'),`${streak} gün`);wp99SetText(document.querySelector('#wp99ReviewMetric'),String(review));
}

function wp99ApplyCourseSelector(){
  const section=document.querySelector('.course-selector-section'),grid=section?.querySelector('.course-selector-grid');if(!section||!grid)return;
  grid.classList.toggle('wp99-core-only',!wp99ShowAllLanguages);
  grid.querySelectorAll('.course-card[data-course]').forEach(card=>card.classList.toggle('wp99-extra-language',!WP99_CORE_COURSES.has(card.dataset.course)));
  let btn=section.querySelector('#wp99LanguageToggle');if(!btn){btn=document.createElement('button');btn.id='wp99LanguageToggle';btn.type='button';btn.className='wp99-language-toggle';section.querySelector('.course-selector-head')?.appendChild(btn)}
  wp99SetText(btn,wp99ShowAllLanguages?'Yalnızca ana dilleri göster':'Tüm dilleri göster');
}
function wp99ApplyNavigation(){
  const desktop=[...document.querySelectorAll('.desktop-top-nav button')];
  const defs=[['dashboard','Ana Sayfa'],['academy','Akademi'],['library','Kelimeler'],['stories','Reader'],['progress','İlerleme']];
  defs.forEach((d,i)=>{const btn=desktop[i];if(!btn)return;btn.removeAttribute('data-action');btn.dataset.nav=d[0];wp99SetText(btn,d[1])});
  desktop.slice(defs.length).forEach(btn=>btn.remove());
  const footer=document.querySelector('.footer-links');if(footer&&!footer.dataset.wp99){footer.dataset.wp99='1';footer.innerHTML='<button data-nav="academy">Akademi</button><button data-nav="library">Kelimeler</button><button data-nav="stories">Reader Pro</button><button data-nav="tools">Araçlar ve yenilikler</button><a href="legal.html#privacy">Gizlilik</a><a href="legal.html#terms">Kullanım koşulları</a><a href="legal.html#copyright">Telif ve içerik</a>'}
  const bottom=document.querySelector('.bottom-nav'),bottomNeedsReset=bottom&&(!bottom.dataset.wp99||bottom.querySelectorAll('button').length!==5||!bottom.querySelector('[data-nav="academy"]')||!bottom.querySelector('[data-nav="stories"]')||!bottom.querySelector('[data-action="open-profile"]')||bottom.querySelector('[data-nav="academy"] small')?.textContent!=='Akademi'||bottom.querySelector('[data-nav="stories"] small')?.textContent!=='Reader');if(bottomNeedsReset){bottom.dataset.wp99='1';bottom.innerHTML=`
    <button data-nav="dashboard" class="active"><span>${wp99Icon('home')}</span><small>Ana Sayfa</small></button>
    <button data-nav="academy"><span>${wp99Icon('academy')}</span><small>Akademi</small></button>
    <button data-nav="library" class="study-main"><span>${wp99Icon('words')}</span><small>Kelimeler</small></button>
    <button data-nav="stories"><span>${wp99Icon('reader')}</span><small>Reader</small></button>
    <button data-action="open-profile"><span>${wp99Icon('profile')}</span><small>Profil</small></button>`}
}

function wp99EnsureToolsView(){
  if(!document.querySelector('#view-tools')){
    document.querySelector('main')?.insertAdjacentHTML('beforeend',`<section id="view-tools" class="view wp99-tools-view"><div class="section-title"><div><p class="eyebrow">WORDPILOT ARAÇLARI</p><h1>Kavram Atlası ve yenilikler</h1><p class="muted">Ana öğrenme ekranlarını kalabalıklaştırmayan yardımcı araçlar burada.</p></div><button class="secondary" type="button" data-nav="dashboard">← Ana sayfa</button></div><div class="wp99-tools-layout"><section id="wp99ConceptAtlasHost"></section><aside class="wp99-tools-side"><section class="panel wp99-whats-new"><p class="eyebrow">V9.9 · TAMAMLANDI</p><h2>UX Reset & Navigation</h2><ul><li>Sade ana sayfa ve dört net başlangıç yolu</li><li>Reader Pro ile Ders Okumalarının ayrılması</li><li>Merkezi sürüm ve içerik sayıları</li><li>Kavram Atlasının ayrı araca taşınması</li><li>Güvenli öneri ve yönetici gelen kutusu altyapısı</li></ul></section><section class="panel wp99-roadmap"><p class="eyebrow">SIRADAKİ ADIMLAR</p><h2>Yayın öncesi yol</h2><div><span><b>Beta testi</b><small>Telefon, tablet ve masaüstü görev testleri</small></span><em>sırada</em></div><div><span><b>Premium ve bulut</b><small>Beta akışı netleşince ödeme ve abonelik</small></span><em>sonra</em></div><div><span><b>v10.0</b><small>Android/iOS ticari sürüm adayı</small></span><em>hedef</em></div></section><button class="wp99-feedback-link" type="button" data-wp99-feedback><span>💡</span><div><b>Öneri veya hata gönder</b><small>Mesajın cihaz ve ekran bilgisiyle güvenli gelen kutusuna gider.</small></div><em>→</em></button></aside></div></section>`)
  }
  const mapper=document.querySelector('#wp96ConceptMapper'),host=document.querySelector('#wp99ConceptAtlasHost');if(mapper&&host&&mapper.parentElement!==host)host.appendChild(mapper);
  const libraryActions=document.querySelector('.library-study-actions');if(libraryActions&&!document.querySelector('#wp99AtlasButton'))libraryActions.insertAdjacentHTML('afterbegin','<button id="wp99AtlasButton" class="secondary" type="button" data-nav="tools">Kavram Atlası</button>');
  const form=document.querySelector('#profileForm');if(form&&!document.querySelector('#wp99ProfileLinks'))form.insertAdjacentHTML('afterend','<div id="wp99ProfileLinks" class="wp99-profile-links"><button type="button" class="secondary" data-nav="tools" data-close="profileDialog">Yenilikler ve araçlar</button><button type="button" class="secondary" data-nav="progress" data-close="profileDialog">İlerleme ve lig</button><button type="button" class="secondary" data-wp99-feedback data-close="profileDialog">Öneri veya hata gönder</button><button id="wp99AdminOpen" type="button" class="secondary" data-nav="admin" data-close="profileDialog" hidden>Yönetici gelen kutusu</button></div>');
}

function wp99PatchAcademy(){
  const strip=document.querySelector('#wp63ResourceStrip');if(strip){const reading=strip.querySelector('[data-nav="academy-readings"]');if(reading){wp99SetText(reading.querySelector('b'),'Ders Okumaları');const count=activeCourse==='ru'?WP99_META.academy.ruReadings:WP99_META.academy.enReadings;wp99SetText(reading.querySelector('small'),`${count} metin · yalnızca Academy derslerine bağlı`);wp99SetText(reading.querySelector('em'),'DERS')}}
  wp99SetText(document.querySelector('#academyReadingsBtn'),'Ders okumalarını aç');
  const readerSection=document.querySelector('#view-stories .section-title');if(readerSection&&!document.querySelector('#wp99ReaderIdentity'))readerSection.querySelector('div')?.insertAdjacentHTML('beforeend',`<div id="wp99ReaderIdentity" class="wp99-identity-chips"><span>Bağımsız Reader Pro</span><span>${WP99_META.reader.stories} metin</span><span>Smart Word Session bağlantısı</span></div>`);
}
function wp99InstallAcademyReadingPatch(){
  if(typeof wp60RenderReadings==='function'&&!wp60RenderReadings.wp99){const base=wp60RenderReadings;wp60RenderReadings=function(){const rows=wp60Readings();if(!rows.some(r=>r.id===wp60Reading?.id))wp60Reading=null;const out=base();const course=wp60Data?.courses?.[wp60Course]?.name||wp60Course;wp99SetText(document.querySelector('#academyReadingTitle'),`${course} · ${wp60Level} Ders Okumaları`);const title=document.querySelector('#view-academy-readings .section-title>div');if(title){let meta=title.querySelector('#wp99AcademyReadingMeta');if(!meta){title.insertAdjacentHTML('beforeend','<div id="wp99AcademyReadingMeta" class="wp99-identity-chips"></div>');meta=title.querySelector('#wp99AcademyReadingMeta')}const total=wp60Course==='ru'?WP99_META.academy.ruReadings:WP99_META.academy.enReadings;meta.innerHTML=`<span>${wp60Level}: ${rows.length} metin</span><span>Bu dilde: ${total} metin</span><span>Reader Pro’dan ayrı ders içeriği</span>`}if(rows.length&&!wp60Reading)wp60ShowReading(rows[0].id);return out};wp60RenderReadings.wp99=true}
  if(typeof wp60ShowReading==='function'&&!wp60ShowReading.wp99){const base=wp60ShowReading;wp60ShowReading=function(id){const out=base(id);document.querySelectorAll('#academyReadingList [data-academy-reading]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.academyReading===String(id)));const head=document.querySelector('#academyReadingReader .academy-reading-head .eyebrow');if(head&&!/DERS OKUMASI/.test(head.textContent))head.textContent=`DERS OKUMASI · ${head.textContent}`;return out};wp60ShowReading.wp99=true}
}

function wp99RemoveLegacyHome(){
  ['#wp81QuickPractice','#wp712FeedbackCard','#wp81FeedbackPanel','#wp96RoutePanel','#wp61Roadmap'].forEach(sel=>document.querySelectorAll(sel).forEach(node=>node.remove()));
  if(typeof wp61RenderRoadmap==='function')wp61RenderRoadmap=function(){document.querySelector('#wp61Roadmap')?.remove()};
  if(typeof wp96EnsureRoutePanel==='function')wp96EnsureRoutePanel=function(){document.querySelector('#wp96RoutePanel')?.remove()};
  if(typeof wp81EnsureQuickPractice==='function')wp81EnsureQuickPractice=function(){document.querySelector('#wp81QuickPractice')?.remove()};
  if(typeof wp81EnsureFeedbackActions==='function')wp81EnsureFeedbackActions=function(){document.querySelector('#wp81FeedbackPanel')?.remove()};
}

function wp99Ticket(){const d=new Date(),date=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;return `WP-${date}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}
function wp99InstallFeedbackSubmit(){
  if(typeof wp712SubmitFeedback!=='function'||wp712SubmitFeedback.wp99)return;
  wp712SubmitFeedback=async function(){
    const t=wp712Text(),status=document.querySelector('#wp712FeedbackStatus'),category=document.querySelector('#wp712FeedbackCategory').value,subject=document.querySelector('#wp712FeedbackSubject').value.trim(),message=document.querySelector('#wp712FeedbackMessage').value.trim();status.className='wp712-feedback-status';
    const draft={category,subject,message,updatedAt:new Date().toISOString()};localStorage.setItem(`${STORE}:feedback_draft`,JSON.stringify(draft));
    if(!authUser||!fbDb){status.textContent=t.login;status.classList.add('error');return}
    const submit=document.querySelector('#wp712FeedbackForm [type="submit"]');submit.disabled=true;const ticket=wp99Ticket(),view=wp99ActiveView(),viewport=`${window.innerWidth}x${window.innerHeight}`;
    try{await fbDb.collection('feedback').add({uid:authUser.uid,name:accountDisplayName(profile?.name,authUser),email:authUser.email||'',category,subject,message,uiLanguage:wp71LanguageProfile.ui||wp71Support(),targetLanguage:activeCourse,appVersion:WP99_META.version,page:location.pathname,view,ticket,viewport,userAgent:String(navigator.userAgent||'').slice(0,300),status:'new',createdAt:window.firebase.firestore.FieldValue.serverTimestamp()});localStorage.removeItem(`${STORE}:feedback_draft`);document.querySelector('#wp712FeedbackForm').reset();status.textContent=`${t.sent} Takip kodu: ${ticket}`;status.classList.add('ok');setTimeout(()=>wp99LoadFeedback(),300)}
    catch(error){console.error('Feedback submit error',error);status.textContent=t.error;status.classList.add('error')}
    finally{submit.disabled=false}
  };wp712SubmitFeedback.wp99=true;
}

function wp99EnsureAdminView(){
  if(document.querySelector('#view-admin'))return;
  document.querySelector('main')?.insertAdjacentHTML('beforeend',`<section id="view-admin" class="view wp99-admin-view"><div class="section-title"><div><p class="eyebrow">YÖNETİCİ MERKEZİ</p><h1>Öneri ve hata gelen kutusu</h1><p class="muted">Yalnızca Firestore’daki admins koleksiyonunda yetkilendirilen hesaplar görebilir.</p></div><div class="wp99-admin-head-actions"><button id="wp99FeedbackRefresh" class="secondary" type="button">Yenile</button><button class="secondary" type="button" data-nav="dashboard">← Ana sayfa</button></div></div><section class="wp99-admin-metrics"><article><span>Yeni</span><b id="wp99AdminNew">0</b></article><article><span>İnceleniyor</span><b id="wp99AdminReview">0</b></article><article><span>Planlandı</span><b id="wp99AdminPlanned">0</b></article><article><span>Tamamlandı</span><b id="wp99AdminDone">0</b></article></section><section class="panel wp99-admin-controls"><label>Durum<select id="wp99FeedbackFilter"><option value="all">Tümü</option><option value="new">Yeni</option><option value="reviewing">İnceleniyor</option><option value="planned">Planlandı</option><option value="done">Tamamlandı</option><option value="rejected">Reddedildi</option></select></label><span id="wp99AdminCount">0 kayıt</span></section><div id="wp99FeedbackList" class="wp99-feedback-list"><div class="wp99-admin-empty">Yönetici yetkisi kontrol ediliyor…</div></div></section>`)
}
function wp99FeedbackStatusLabel(status){return ({new:'Yeni',reviewing:'İnceleniyor',planned:'Planlandı',done:'Tamamlandı',rejected:'Reddedildi'})[status]||status}
function wp99RenderFeedback(){
  const filter=document.querySelector('#wp99FeedbackFilter')?.value||'all',rows=filter==='all'?wp99FeedbackRows:wp99FeedbackRows.filter(x=>x.status===filter),host=document.querySelector('#wp99FeedbackList');if(!host)return;
  const counts={new:0,reviewing:0,planned:0,done:0};wp99FeedbackRows.forEach(x=>{if(counts[x.status]!==undefined)counts[x.status]++});
  wp99SetText(document.querySelector('#wp99AdminNew'),String(counts.new));wp99SetText(document.querySelector('#wp99AdminReview'),String(counts.reviewing));wp99SetText(document.querySelector('#wp99AdminPlanned'),String(counts.planned));wp99SetText(document.querySelector('#wp99AdminDone'),String(counts.done));wp99SetText(document.querySelector('#wp99AdminCount'),`${rows.length} kayıt`);
  if(!rows.length){host.innerHTML='<div class="wp99-admin-empty">Bu filtrede kayıt yok.</div>';return}
  host.innerHTML=rows.map(row=>{const date=row.createdAt?.toDate?.()||null,when=date?new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short'}).format(date):'Tarih bekleniyor';return `<article class="wp99-feedback-item"><header><div><span class="wp99-feedback-status ${esc(row.status||'new')}">${esc(wp99FeedbackStatusLabel(row.status||'new'))}</span><b>${esc(row.subject||'Başlıksız')}</b><small>${esc(row.ticket||row.id)} · ${esc(when)}</small></div><select data-wp99-feedback-status="${esc(row.id)}"><option value="new" ${row.status==='new'?'selected':''}>Yeni</option><option value="reviewing" ${row.status==='reviewing'?'selected':''}>İnceleniyor</option><option value="planned" ${row.status==='planned'?'selected':''}>Planlandı</option><option value="done" ${row.status==='done'?'selected':''}>Tamamlandı</option><option value="rejected" ${row.status==='rejected'?'selected':''}>Reddedildi</option></select></header><p>${esc(row.message||'')}</p><footer><span><b>${esc(row.name||'Kullanıcı')}</b> · ${esc(row.email||'')}</span><span>${esc(row.category||'other')} · ${esc(row.targetLanguage||'')} · ${esc(row.view||row.page||'')}</span><span>${esc(row.viewport||'')} · v${esc(row.appVersion||'')}</span></footer></article>`}).join('');
}
async function wp99CheckAdmin(){
  wp99EnsureAdminView();wp99IsAdmin=false;const open=document.querySelector('#wp99AdminOpen');if(open)open.hidden=true;
  if(!authUser||!fbDb){const host=document.querySelector('#wp99FeedbackList');if(host)host.innerHTML='<div class="wp99-admin-empty">Yönetici gelen kutusu için hesapla giriş yap.</div>';return false;}
  try{const doc=await fbDb.collection('admins').doc(authUser.uid).get();wp99IsAdmin=doc.exists;if(open)open.hidden=!wp99IsAdmin;if(wp99IsAdmin)await wp99LoadFeedback();else{const host=document.querySelector('#wp99FeedbackList');if(host)host.innerHTML='<div class="wp99-admin-empty">Bu hesap yönetici olarak tanımlanmamış.</div>'}return wp99IsAdmin}catch(error){console.warn('Admin check',error);return false}
}
async function wp99LoadFeedback(){
  if(!wp99IsAdmin||!fbDb)return;const host=document.querySelector('#wp99FeedbackList');if(host)host.innerHTML='<div class="wp99-admin-empty">Öneriler yükleniyor…</div>';
  try{const snap=await fbDb.collection('feedback').orderBy('createdAt','desc').limit(100).get();wp99FeedbackRows=snap.docs.map(doc=>({id:doc.id,...doc.data()}));wp99RenderFeedback()}
  catch(error){console.error('Feedback inbox',error);if(host)host.innerHTML='<div class="wp99-admin-empty"><b>Gelen kutusu açılamadı.</b><span>Firestore’da admins/&lt;Firebase UID&gt; belgesini oluşturup yeni firestore.rules dosyasını yayımla.</span></div>'}
}
async function wp99UpdateFeedbackStatus(id,status){if(!wp99IsAdmin||!fbDb)return;try{await fbDb.collection('feedback').doc(id).update({status,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp(),adminUid:authUser.uid});const row=wp99FeedbackRows.find(x=>x.id===id);if(row)row.status=status;wp99RenderFeedback();toast('Öneri durumu güncellendi.')}catch(error){console.error(error);toast('Durum güncellenemedi.')}}

function wp99OpenRoute(route){
  if(route==='session'){const set=typeof wp97ActiveSet==='function'?wp97ActiveSet():null;if(set)wp97OpenHub();else{nav('library');toast('5 kelime seçip “Seçilenlere çalış” düğmesini kullan.')}return}
  if(route==='tools'){wp99EnsureToolsView();nav('tools');return}
  nav(route);
}
function wp99ApplyShell(){
  wp99ApplyMeta();wp99RemoveLegacyHome();wp99BuildDashboard();wp99ApplyCourseSelector();wp99ApplyNavigation();wp99EnsureToolsView();wp99EnsureAdminView();wp99PatchAcademy();
}
function wp99InstallVersionLocks(){
  if(typeof wp96FixStaticTruth==='function')wp96FixStaticTruth=wp99ApplyMeta;
  if(typeof wp97ApplyVersion==='function')wp97ApplyVersion=wp99ApplyMeta;
  if(typeof wp98ApplyVersion==='function')wp98ApplyVersion=wp99ApplyMeta;
}
function setupV99Events(){
  wp99InstallVersionLocks();wp99InstallAcademyReadingPatch();wp99InstallFeedbackSubmit();wp99ApplyShell();
  document.addEventListener('click',event=>{
    const route=event.target.closest('[data-wp99-route]');if(route){wp99OpenRoute(route.dataset.wp99Route);return}
    if(event.target.closest('#wp99LanguageToggle')){wp99ShowAllLanguages=!wp99ShowAllLanguages;wp99ApplyCourseSelector();return}
    if(event.target.closest('[data-wp99-feedback]')){wp712OpenFeedback();return}
    const version=event.target.closest('.version');if(version){wp99OpenRoute('tools');return}
    if(event.target.closest('#wp99FeedbackRefresh')){wp99LoadFeedback();return}
  },true);
  document.addEventListener('keydown',event=>{if(event.target.closest('.version')&&['Enter',' '].includes(event.key)){event.preventDefault();wp99OpenRoute('tools')}});
  document.addEventListener('change',event=>{if(event.target.id==='wp99FeedbackFilter'){wp99RenderFeedback();return}if(event.target.matches('[data-wp99-feedback-status]'))wp99UpdateFeedbackStatus(event.target.dataset.wp99FeedbackStatus,event.target.value)});
}
async function wp99AfterInit(){
  wp99InstallVersionLocks();wp99InstallAcademyReadingPatch();wp99InstallFeedbackSubmit();wp99ApplyShell();
  setTimeout(()=>{wp99ApplyShell();wp99RefreshDashboard();wp99CheckAdmin()},400);
  setTimeout(wp99ApplyShell,1200);
  if(fbAuth)fbAuth.onAuthStateChanged(()=>setTimeout(wp99CheckAdmin,350));
  if(wp99Observer)wp99Observer.disconnect();wp99Observer=new MutationObserver(()=>{clearTimeout(wp99Observer._timer);wp99Observer._timer=setTimeout(wp99ApplyShell,180)});wp99Observer.observe(document.body,{childList:true,subtree:true});
}
