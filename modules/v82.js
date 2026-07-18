/* WordPilot v8.2.0 Tester Beta
   Route-panel repair, professional mobile course grid and direct library range navigation. */
const WP82_VERSION='9.1.0';
const WP82_PAGE_SIZE=50;
let wp82LibraryPage=1;
let wp82LibraryRange={start:null,end:null};
let wp82LastCourse=activeCourse;

const WP82_ROUTE_LABELS={
  academy:['Ders','A1–C2 Akademi ve yapılandırılmış öğrenme yolu'],
  games:['Quiz','Oyunlar, yazma, dinleme ve kelime pratiği'],
  stories:['Hikâye','Reader ve derecelendirilmiş okuma alanı'],
  speak:['Konuş','Telaffuz ve Conversation Coach alanı'],
  collections:['Tekrar','Zamanı gelenler ve kişisel listeler'],
  progress:['İlerleme','Analiz, Pilot Puanı ve lig durumu']
};

function wp82ApplyBrand(){
  const version=$('.version');if(version)version.textContent='v9.1.0 · Tester Beta';
  document.documentElement.dataset.wpVersion='9.1.0';
  const group=$('#groupFilter');
  if(group){
    const first=group.options[0];
    if(first)first.textContent=activeCourse==='en'?'2000 kartın tümü':`Tüm ${COURSES[activeCourse]?.name||''} kayıtları`;
  }
  const allRange=document.querySelector('input[name="rangeType"][value="all"]')?.closest('.radio-card')?.querySelector('small');
  if(allRange)allRange.textContent=activeCourse==='en'?'2000 kartın tamamı':'Seçilen kaynağın tamamı';
  wp82RefreshRangeLimits();
  const microsoft=$('#wp81MicrosoftSignIn');if(microsoft){microsoft.hidden=true;microsoft.disabled=true}
  const authLead=$('#authSignedOut>div small');if(authLead)authLead.textContent='Google ile veya herhangi bir e-posta adresiyle (Hotmail/Outlook dahil) hesap oluşturabilirsin.';
  const cloud=$('#cloudNoteText');if(cloud)cloud.innerHTML='<b>Bulut senkronizasyonu</b><br>Google veya e-posta hesabı bağlandığında ilerleme cihazlar arasında eşitlenir.';
  const academySmall=document.querySelector('[data-dashboard-tab="academy"] small');if(academySmall)academySmall.textContent='102 ders · A1–C2';
  const storiesSmall=document.querySelector('[data-dashboard-tab="stories"] small');if(storiesSmall)storiesSmall.textContent='102 hikâye · Reader 2.0';
}

function wp82RefreshRangeLimits(){
  const max=Math.max(1,Number(words?.length)||Number(COURSES[activeCourse]?.displayCount)||2000);
  ['setupStart','setupEnd','wp82RangeStart','wp82RangeEnd'].forEach(id=>{const input=$('#'+id);if(input)input.max=String(max)});
  const note=$('#wp82RangeMax');if(note)note.textContent=`1–${max} arasından istediğin kartları doğrudan aç.`;
}

function wp82ArrangeRoutePanels(){
  const hub=$('.learning-hub');if(!hub)return;
  let stage=$('#wp82RouteStage');
  if(!stage){
    stage=document.createElement('section');stage.id='wp82RouteStage';stage.className='wp82-route-stage';
    stage.innerHTML='<div class="wp82-route-stage-head"><div><p class="eyebrow">SEÇİLEN ÇALIŞMA ALANI</p><h3 id="wp82RouteTitle">Ders</h3><p id="wp82RouteDescription">A1–C2 Akademi ve yapılandırılmış öğrenme yolu</p></div><span id="wp82RouteBadge">Açık</span></div><div id="wp82RoutePanels" class="wp82-route-panels"></div>';
    hub.after(stage);
  }else if(hub.nextElementSibling!==stage){hub.after(stage)}
  const panelRoot=$('#wp82RoutePanels');
  document.querySelectorAll('[data-dashboard-panel]').forEach(panel=>{if(panel.parentElement!==panelRoot)panelRoot.appendChild(panel)});
  const current=(typeof wp510ValidTab==='function'?wp510ValidTab(wp510DashboardTab):wp510DashboardTab)||'academy';
  const info=WP82_ROUTE_LABELS[current]||WP82_ROUTE_LABELS.academy;
  $('#wp82RouteTitle').textContent=info[0];$('#wp82RouteDescription').textContent=info[1];
  stage.dataset.activeRoute=current;
  document.querySelectorAll('[data-dashboard-panel]').forEach(panel=>{
    const active=panel.dataset.dashboardPanel===current;panel.hidden=!active;panel.classList.toggle('active',active);
  });
  const quick=$('#wp81QuickPractice');if(quick&&stage.nextElementSibling!==quick)stage.after(quick);
}

function wp82OpenRoute(tab,{scroll=true}={}){
  tab=typeof wp510ValidTab==='function'?wp510ValidTab(tab):tab;
  if(typeof wp510SetDashboardTab==='function')wp510SetDashboardTab(tab,{scroll:false,save:true});
  wp82ArrangeRoutePanels();
  const info=WP82_ROUTE_LABELS[tab]||WP82_ROUTE_LABELS.academy;
  if($('#wp82RouteTitle'))$('#wp82RouteTitle').textContent=info[0];
  if($('#wp82RouteDescription'))$('#wp82RouteDescription').textContent=info[1];
  if(scroll){
    const stage=$('#wp82RouteStage');
    requestAnimationFrame(()=>setTimeout(()=>stage?.scrollIntoView({behavior:'smooth',block:'start'}),60));
  }
}

function wp82EnsureLibraryTools(){
  const filters=$('#view-library .filters');if(!filters||$('#wp82LibraryRange'))return;
  filters.insertAdjacentHTML('afterend',`<section id="wp82LibraryRange" class="panel wp82-library-range">
    <div class="wp82-library-range-copy"><p class="eyebrow">KART NUMARASIYLA GİT</p><b>Özel aralığı doğrudan göster</b><small id="wp82RangeMax">1–2000 arasından istediğin kartları doğrudan aç.</small></div>
    <form id="wp82LibraryRangeForm" class="wp82-library-range-form">
      <label>Başlangıç<input id="wp82RangeStart" type="number" min="1" max="2000" value="1" inputmode="numeric"></label>
      <span>—</span>
      <label>Bitiş<input id="wp82RangeEnd" type="number" min="1" max="2000" value="50" inputmode="numeric"></label>
      <button class="primary" type="submit">Aralığı göster</button>
      <button id="wp82ClearRange" class="secondary" type="button" hidden>Tüm listeye dön</button>
    </form>
    <div class="wp82-range-presets" aria-label="Hızlı kart aralıkları">
      <button type="button" data-wp82-range="1-50">1–50</button><button type="button" data-wp82-range="51-100">51–100</button><button type="button" data-wp82-range="101-200">101–200</button><button type="button" data-wp82-range="951-1000">951–1000</button><button type="button" data-wp82-range="1001-1050">1001–1050</button><button type="button" data-wp82-range="1951-2000">1951–2000</button>
    </div>
  </section>
  <nav id="wp82LibraryPagination" class="wp82-library-pagination panel" aria-label="Kelime listesi sayfaları">
    <button id="wp82PrevPage" class="secondary" type="button">← Önceki 50</button>
    <div><b id="wp82PageInfo">Sayfa 1 / 1</b><small id="wp82VisibleInfo">1–50 gösteriliyor</small></div>
    <button id="wp82NextPage" class="secondary" type="button">Sonraki 50 →</button>
  </nav>`);
  $('#loadMore').hidden=true;
  wp82RefreshRangeLimits();
}

function wp82NormalizeRange(start,end){
  const max=Math.max(1,words.length||2000);let a=Number(start),b=Number(end);
  if(!Number.isFinite(a)||!Number.isFinite(b))return null;
  a=Math.max(1,Math.min(max,Math.round(a)));b=Math.max(1,Math.min(max,Math.round(b)));if(a>b)[a,b]=[b,a];return {start:a,end:b};
}
function wp82SetLibraryRange(start,end){
  const range=wp82NormalizeRange(start,end);if(!range){toast('Geçerli bir başlangıç ve bitiş numarası yaz.');return}
  wp82LibraryRange=range;wp82LibraryPage=1;
  $('#wp82RangeStart').value=String(range.start);$('#wp82RangeEnd').value=String(range.end);$('#wp82ClearRange').hidden=false;
  renderWords(true);requestAnimationFrame(()=>$('#wordList')?.scrollIntoView({behavior:'smooth',block:'start'}));
}
function wp82ClearLibraryRange(){
  wp82LibraryRange={start:null,end:null};wp82LibraryPage=1;const clear=$('#wp82ClearRange');if(clear)clear.hidden=true;renderWords(true);
}

const wp82FilteredWordsBase=filteredWords;
filteredWords=function(){
  let list=wp82FilteredWordsBase();const {start,end}=wp82LibraryRange;
  if(Number.isFinite(start)&&Number.isFinite(end))list=list.filter(w=>Number(w.id)>=start&&Number(w.id)<=end);
  return list;
};

function wp82WordRow(w,selected){
  const st=statusOf(w.id),isWrong=state.history[w.id]?.needsReview===true,isSelected=selected.has(w.id);
  const statusButton=(key,label)=>`<button type="button" class="quick-status ${st===key?'active '+key:''}" data-list-status="${key}" data-word-id="${w.id}" aria-pressed="${st===key}"><span>${st===key?'✓':'□'}</span>${label}</button>`;
  const flagButton=(key,icon,label)=>`<button type="button" class="quick-flag ${flagOf(w.id,key)?'active '+key:''}" data-list-flag="${key}" data-word-id="${w.id}" title="${label}" aria-pressed="${flagOf(w.id,key)}">${icon}</button>`;
  return `<article class="word-row ${isSelected?'selected-word':''} ${flagOf(w.id,'ignored')?'ignored-word':''}">
    <div class="word-id-wrap"><button type="button" class="word-select ${isSelected?'active':''}" data-select-word="${w.id}" title="Çalışma için seç">${isSelected?'✓':'+'}</button><span class="word-id">#${w.id}</span></div>
    <div class="word-main"><b>${esc(w.english)} <span class="word-level-badge">${cefr(w)}</span></b><small>${esc(w.pronunciation||'Okunuş bilgisi yok')}</small></div>
    <div class="word-meaning word-meaning-list rated-lines">${ratedLinesHtml(w.meaning||'')}${isWrong?'<small class="wrong-note">Yanlış listesinde</small>':''}</div>
    <div class="word-status-toggles">${statusButton('learn','Öğren')}${statusButton('memorized','Ezber')}${statusButton('hard','Zor')}</div>
    <div class="word-flag-toggles">${flagButton('favorite','⭐','Favori')}${flagButton('veryHard','🔥','Çok zor')}${flagButton('ignored','🚫','Tekrar gösterme')}</div>
    <div class="word-actions"><button class="word-action" data-speak="${esc(w.english)}" title="Dinle">🔊</button><button class="word-action" data-info="${w.id}" title="Bilgi">ℹ️</button></div>
  </article>`;
}

const wp82RenderWordsBase=renderWords;
renderWords=function(reset=false){
  if(!$('#wp82LibraryPagination'))return wp82RenderWordsBase(reset);
  if(reset)wp82LibraryPage=1;
  const arr=filteredWords(),selected=selectedIds(),totalPages=Math.max(1,Math.ceil(arr.length/WP82_PAGE_SIZE));
  wp82LibraryPage=Math.max(1,Math.min(totalPages,wp82LibraryPage));
  const from=(wp82LibraryPage-1)*WP82_PAGE_SIZE,to=Math.min(arr.length,from+WP82_PAGE_SIZE),visible=arr.slice(from,to);
  const count=$('#resultCount');if(count)count.textContent=arr.length?`${arr.length} kayıt · ${from+1}–${to}`:'0';
  $('#wordList').innerHTML=visible.map(w=>wp82WordRow(w,selected)).join('')||'<div class="panel">Aramana veya seçtiğin aralığa uygun kelime bulunamadı.</div>';
  const pageInfo=$('#wp82PageInfo'),visibleInfo=$('#wp82VisibleInfo'),prev=$('#wp82PrevPage'),next=$('#wp82NextPage'),pagination=$('#wp82LibraryPagination');
  if(pageInfo)pageInfo.textContent=`Sayfa ${wp82LibraryPage} / ${totalPages}`;
  if(visibleInfo)visibleInfo.textContent=arr.length?`${from+1}–${to} gösteriliyor · toplam ${arr.length}`:'Gösterilecek kayıt yok';
  if(prev)prev.disabled=wp82LibraryPage<=1;if(next)next.disabled=wp82LibraryPage>=totalPages;
  if(pagination)pagination.hidden=arr.length<=WP82_PAGE_SIZE;
  $('#loadMore').hidden=true;updateSelectedControls();
};

const wp82UpdateCourseUIBase=updateCourseUI;
updateCourseUI=function(){
  const out=wp82UpdateCourseUIBase();
  if(wp82LastCourse!==activeCourse){wp82LastCourse=activeCourse;wp82LibraryRange={start:null,end:null};wp82LibraryPage=1}
  setTimeout(()=>{wp82ApplyBrand();wp82ArrangeRoutePanels();},0);return out;
};

function setupV82Events(){
  document.addEventListener('click',event=>{
    const hubTab=event.target.closest('.learning-hub-tabs [data-dashboard-tab]');if(hubTab){setTimeout(()=>wp82OpenRoute(hubTab.dataset.dashboardTab,{scroll:true}),0);return}
    const preset=event.target.closest('[data-wp82-range]');if(preset){const [a,b]=preset.dataset.wp82Range.split('-').map(Number);wp82SetLibraryRange(a,b);return}
    if(event.target.closest('#wp82ClearRange')){wp82ClearLibraryRange();return}
    if(event.target.closest('#wp82PrevPage')){wp82LibraryPage=Math.max(1,wp82LibraryPage-1);renderWords();$('#wordList')?.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(event.target.closest('#wp82NextPage')){wp82LibraryPage+=1;renderWords();$('#wordList')?.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(event.target.closest('.course-card[data-course]')){wp82LibraryRange={start:null,end:null};wp82LibraryPage=1;setTimeout(()=>{wp82ApplyBrand();wp82ArrangeRoutePanels();renderWords(true)},350)}
  },true);
  document.addEventListener('submit',event=>{
    if(event.target.id!=='wp82LibraryRangeForm')return;event.preventDefault();wp82SetLibraryRange($('#wp82RangeStart').value,$('#wp82RangeEnd').value);
  });
  window.addEventListener('resize',()=>{clearTimeout(setupV82Events._resize);setupV82Events._resize=setTimeout(wp82ArrangeRoutePanels,120)});
}

function wp82AfterInit(){
  wp82EnsureLibraryTools();wp82ApplyBrand();wp82ArrangeRoutePanels();renderWords(true);
  const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(()=>{wp82ApplyBrand();wp82ArrangeRoutePanels();},120)});
  observer.observe(document.body,{childList:true,subtree:true});
}
