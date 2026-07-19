/* WordPilot v9.6.0 — Unified 5000 Concept Route and interface consistency. */
const WP96_VERSION='9.6.0';
const WP96_LABEL='v9.6.0 · Unified Concept Route';
const WP96_ROUTE_COUNT=5000;
const WP96_ALIGNED_READY={en:5000,tr:5000,ru:1000,uz:1000,es:1000,de:1000,fr:1000,it:1000,pt:1000,ja:1000,ko:1000,zh:1000};
const WP96_BANK_READY={en:5000,tr:1000,ru:1500,uz:1000,es:1000,de:1000,fr:1000,it:1000,pt:1000,ja:1000,ko:1000,zh:1000};
const WP96_LANG_NAMES={en:'English',tr:'Türkçe',ru:'Русский',uz:'O‘zbekcha',es:'Español',de:'Deutsch',fr:'Français',it:'Italiano',pt:'Português',ja:'日本語',ko:'한국어',zh:'中文'};
let wp96ConceptMaster=null,wp96ConceptIndex=1,wp96Observer=null;

function wp96Set(node,text){if(node&&node.textContent!==text)node.textContent=text}
function wp96AlignedReady(id=activeCourse){return Number(WP96_ALIGNED_READY[id]||0)}
function wp96BankReady(id=activeCourse){return Number(WP96_BANK_READY[id]||wp96AlignedReady(id))}
function wp96CourseSubtitle(id){
  const aligned=wp96AlignedReady(id),bank=wp96BankReady(id);
  if(id==='en')return `5000 ortak kavram rotası · 5000 İngilizce hazır`;
  if(id==='tr')return `5000 ortak kavram rotası · 5000 Türkçe destek anlamı hazır`;
  if(id==='ru')return `5000 ortak kavram rotası · 1000 eşleşmiş + 500 ek Rusça`;
  if(id==='uz')return `5000 ortak kavram rotası · 1000 Özbekçe hazır`;
  return `5000 ortak kavram rotası · ${aligned} çeviri hazır`;
}
function wp96ApplyCourseRegistry(){
  Object.keys(WP96_ALIGNED_READY).forEach(id=>{
    if(!COURSES[id]&&typeof WP711_META!=='undefined'&&WP711_META[id]){
      const m=WP711_META[id];COURSES[id]={id,name:m.native,short:m.short,flag:m.flag,file:'clean_concepts_v711.json',voice:m.voice,voiceAlt:m.voice,targetLabel:m.name.toUpperCase()};
      if(!COURSE_IDS.includes(id))COURSE_IDS.push(id);
    }
    if(COURSES[id]){
      COURSES[id].routeCount=WP96_ROUTE_COUNT;
      COURSES[id].alignedCount=wp96AlignedReady(id);
      COURSES[id].displayCount=wp96BankReady(id);
      COURSES[id].actualCount=wp96BankReady(id);
      COURSES[id].countLabel=wp96CourseSubtitle(id);
    }
  });
}
function wp96EnsureAllCourseCards(){
  const grid=document.querySelector('.course-selector-grid');if(!grid)return;
  if(grid.querySelectorAll('[data-course]').length<12&&typeof wp711RenderCourseCards==='function')wp711RenderCourseCards();
  grid.querySelectorAll('.course-card[data-course]').forEach(card=>{
    const id=card.dataset.course;if(!WP96_ALIGNED_READY.hasOwnProperty(id))return;
    wp96Set(card.querySelector('small'),wp96CourseSubtitle(id));
    card.dataset.routeCount=String(WP96_ROUTE_COUNT);
    card.dataset.readyCount=String(wp96AlignedReady(id));
  });
}
function wp96EnsureRoutePanel(){
  const host=document.querySelector('.course-selector-section');if(!host||document.querySelector('#wp96RoutePanel'))return;
  host.insertAdjacentHTML('afterend',`<section id="wp96RoutePanel" class="wp96-route-panel panel"><div class="wp96-route-copy"><p class="eyebrow">ORTAK KAVRAM SİSTEMİ</p><h2>Her dilde aynı 1–5000 kavram sırası</h2><p>Bir kavramın numarası bütün dillerde aynıdır. Hazır olmayan çeviriler uydurulmaz; “hazırlanıyor” olarak işaretlenir.</p></div><div class="wp96-route-stats"><span><b>5000</b><small>ortak kavram</small></span><span><b id="wp96ActiveReady">0</b><small>bu dilde hazır</small></span><span><b id="wp96ActivePending">0</b><small>inceleme bekliyor</small></span></div><button id="wp96OpenMap" class="primary" type="button">Kavram haritasını aç</button></section>`);
}
function wp96EnsureMapper(){
  const library=document.querySelector('#view-library');if(!library||document.querySelector('#wp96ConceptMapper'))return;
  const filters=library.querySelector('.filters');if(!filters)return;
  filters.insertAdjacentHTML('beforebegin',`<section id="wp96ConceptMapper" class="wp96-concept-mapper panel"><div class="wp96-mapper-head"><div><p class="eyebrow">1–5000 ORTAK KAVRAM HARİTASI</p><h2>Aynı numarayı bütün dillerde karşılaştır</h2><p>CEFR ortak başlangıç etiketiyle gelir; her dil için ayrı seviye düzeltmesi yapılabilecek biçimde saklanır.</p></div><div class="wp96-mapper-controls"><button id="wp96ConceptPrev" type="button" class="secondary" aria-label="Önceki kavram">←</button><label>Kavram no<input id="wp96ConceptInput" type="number" min="1" max="5000" value="1"></label><button id="wp96ConceptNext" type="button" class="secondary" aria-label="Sonraki kavram">→</button><button id="wp96ConceptShow" type="button" class="primary">Göster</button></div></div><div id="wp96ConceptResult" class="wp96-concept-result"><p>Bir kavram numarası seç.</p></div></section>`);
}
async function wp96LoadMaster(){
  if(wp96ConceptMaster)return wp96ConceptMaster;
  const response=await fetch(`concept_master_v96.json?v=${WP96_VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error('concept_master_v96.json');
  wp96ConceptMaster=await response.json();return wp96ConceptMaster;
}
function wp96CoverageBadge(status){return status==='reviewed'?'Hazır':status==='beta'?'Beta':'Hazırlanıyor'}
function wp96TermChip(id,term,status){const meta=typeof WP711_META!=='undefined'?WP711_META[id]:null;return `<span class="wp96-term-chip ${status}"><i>${meta?.flag||''}</i><b>${esc(meta?.native||WP96_LANG_NAMES[id]||id)}</b><em>${term?esc(term):'—'}</em><small>${wp96CoverageBadge(status)}</small></span>`}
async function wp96ShowConcept(rank=wp96ConceptIndex){
  rank=Math.max(1,Math.min(WP96_ROUTE_COUNT,Number(rank)||1));wp96ConceptIndex=rank;const input=document.querySelector('#wp96ConceptInput');if(input)input.value=String(rank);
  const box=document.querySelector('#wp96ConceptResult');if(box)box.innerHTML='<p>Kavram yükleniyor…</p>';
  try{
    const list=await wp96LoadMaster(),row=list[rank-1];if(!row)throw new Error('Kavram bulunamadı');
    const target=activeCourse,term=row.terms?.[target]||'',status=row.coverage?.[target]?.status||'missing';
    const chips=Object.keys(WP96_ALIGNED_READY).map(id=>wp96TermChip(id,row.terms?.[id]||'',row.coverage?.[id]?.status||'missing')).join('');
    const targetName=typeof WP711_META!=='undefined'?(WP711_META[target]?.native||target):target;
    if(box)box.innerHTML=`<div class="wp96-concept-primary"><span class="wp96-rank">#${rank}</span><div><p class="eyebrow">${esc(row.cefr_global||'CEFR bekliyor')} · ${esc(row.concept_id)}</p><h3>${esc(row.english||'—')}</h3><p><b>Türkçe:</b> ${esc(row.turkish||'—')}</p><p class="wp96-target-line ${status}"><b>${esc(targetName)}:</b> ${term?esc(term):'Bu dilde çeviri henüz onaylanmadı.'}</p></div><span class="wp96-status ${status}">${wp96CoverageBadge(status)}</span></div><div class="wp96-term-grid">${chips}</div><div class="wp96-concept-actions">${term?'<button id="wp96OpenReadyWord" class="primary" type="button">Bu karşılığı kütüphanede aç</button>':'<button class="secondary" type="button" disabled>Çeviri incelemesi bekleniyor</button>'}<small>Eksik hedef dil karşılığı yerine İngilizce kelime gösterilip kullanıcı yanıltılmaz.</small></div>`;
    const open=document.querySelector('#wp96OpenReadyWord');if(open)open.onclick=()=>{const search=document.querySelector('#searchInput');if(search){search.value=term;document.querySelector('#groupFilter').value='';document.querySelector('#levelFilter').value='';document.querySelector('#statusFilter').value='';if(typeof renderWords==='function')renderWords(true);search.scrollIntoView({behavior:'smooth',block:'center'})}};
  }catch(error){if(box)box.innerHTML=`<p>Kavram haritası yüklenemedi: ${esc(String(error.message||error))}</p>`}
}
function wp96UpdateRouteStats(){
  wp96Set(document.querySelector('#wp96ActiveReady'),String(wp96AlignedReady(activeCourse)));
  wp96Set(document.querySelector('#wp96ActivePending'),String(WP96_ROUTE_COUNT-wp96AlignedReady(activeCourse)));
}
function wp96FixStaticTruth(){
  document.documentElement.dataset.wpVersion=WP96_VERSION;document.title='WordPilot 9.6 · Unified 5000 Concept Route · Reader 3.0';
  document.querySelectorAll('.version').forEach(n=>wp96Set(n,WP96_LABEL));
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='WordPilot v9.6.0 — 12 dilde aynı 1–5000 kavram sırası, dürüst çeviri kapsamı, Conversation Coach Pro ve Reader 3.0.';
  wp96Set(document.querySelector('#proofWordCount'),'5000');wp96Set(document.querySelector('#proofWordLabel'),'ortak kavram rotası');
  wp96Set(document.querySelector('#activeCourseSummary'),`${COURSES[activeCourse]?.name||activeCourse} · 5000 ortak kavram · ${wp96AlignedReady(activeCourse)} hazır`);
  const russian=document.querySelector('#russianTools .eyebrow');if(russian)wp96Set(russian,'РУССКИЙ · AKADEMİ VE EK KELİME BANKASI');
  const russianP=document.querySelector('#russianTools .russian-tools-head p:not(.eyebrow)');if(russianP)wp96Set(russianP,'1000 ortak kavram eşleşmesi + 500 ek Rusça kayıt, A1–C2 Akademi, fiil ve sertifika laboratuvarları.');
  document.querySelectorAll('.collection-card[data-collection="phrases"] small').forEach(n=>wp96Set(n,'240 incelenmiş konuşma kalıbı, kolokasyon, phrasal verb ve deyim'));
  const accountTool=[...document.querySelectorAll('.tool-card small')].find(n=>/Google, Microsoft/i.test(n.textContent||''));if(accountTool)wp96Set(accountTool,'Google, e-posta ve profil ayarları');
  const authCopy=document.querySelector('#authSignedOut small');if(authCopy)wp96Set(authCopy,'Google veya herhangi bir e-posta adresini kullanabilirsin. Hotmail ve Outlook adresleri e-posta yöntemiyle çalışır.');
  const routeHint=document.querySelector('#wp82RangeMax');if(routeHint)wp96Set(routeHint,`Bu kurs bankasında ${wp96BankReady(activeCourse)} hazır kayıt var. Ortak kavram haritası 1–5000 arasında sabittir.`);
  const storyCount=typeof v5Stories!=='undefined'?v5Stories.filter(x=>x.course===activeCourse).length:0;const storyProgress=document.querySelector('#storyProgressText');if(storyProgress&&storyCount&&/\/ 0/.test(storyProgress.textContent))wp96Set(storyProgress,`0 / ${storyCount} tamamlandı`);
  const globalCopy=[...document.querySelectorAll('p')].find(n=>n.textContent?.includes('genel profil PP’si üç kursun toplamıdır'));if(globalCopy)wp96Set(globalCopy,'Her dil ayrı değerlendirilir; genel profil PP’si çalıştığın tüm kursların toplamıdır.');
  wp96UpdateRouteStats();
}
function wp96Apply(){
  wp96ApplyCourseRegistry();wp96EnsureAllCourseCards();wp96EnsureRoutePanel();wp96EnsureMapper();wp96FixStaticTruth();
}
const wp96UpdateCourseBase=updateCourseUI;
updateCourseUI=function(){const out=wp96UpdateCourseBase();wp96Apply();return out};
const wp96RenderDashboardBase=renderDashboard;
renderDashboard=function(){const out=wp96RenderDashboardBase();wp96Apply();return out};
const wp96RenderWordsBase=renderWords;
renderWords=function(...args){const out=wp96RenderWordsBase(...args);wp96Apply();return out};

function setupV96Events(){
  document.addEventListener('click',e=>{
    if(e.target.closest('#wp96OpenMap')){if(typeof nav==='function')nav('library');setTimeout(()=>document.querySelector('#wp96ConceptMapper')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
    if(e.target.closest('#wp96ConceptShow'))wp96ShowConcept(document.querySelector('#wp96ConceptInput')?.value);
    if(e.target.closest('#wp96ConceptPrev'))wp96ShowConcept(wp96ConceptIndex-1);
    if(e.target.closest('#wp96ConceptNext'))wp96ShowConcept(wp96ConceptIndex+1);
    if(e.target.closest('.course-card[data-course]'))setTimeout(()=>{wp96Apply();wp96ShowConcept(wp96ConceptIndex)},120);
  },true);
  document.addEventListener('keydown',e=>{if(e.target.id==='wp96ConceptInput'&&e.key==='Enter'){e.preventDefault();wp96ShowConcept(e.target.value)}});
}
async function wp96AfterInit(){
  wp96Apply();await wp96ShowConcept(1);
  if(wp96Observer)wp96Observer.disconnect();wp96Observer=new MutationObserver(()=>{clearTimeout(wp96Observer._t);wp96Observer._t=setTimeout(wp96Apply,220)});wp96Observer.observe(document.body,{childList:true,subtree:true});
}
