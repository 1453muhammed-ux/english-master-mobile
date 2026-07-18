/* WordPilot v8.2.2 Tester Beta
   3000 unique English vocabulary records, A1-C2 estimates,
   licensed semantic relations, word-family links and safe progress migration. */
const WP822_VERSION='9.2.0';
const WP822_MIGRATION='context-to-lexicon-v1';

COURSES.en.file='words.json';
COURSES.en.displayCount=3000;
COURSES.en.actualCount=3000;
COURSES.en.countLabel='3000 benzersiz kelime kaydı · A1–C2';

function wp822ApplyBrand(){
  const version=$('.version');if(version)version.textContent='v9.5.0 · Conversation Coach Pro';
  document.documentElement.dataset.wpVersion=WP822_VERSION;
  const summary=$('#activeCourseSummary');if(summary&&activeCourse==='en')summary.textContent='English · 3000 benzersiz kelime · A1–C2';
  const enCard=$('.course-card[data-course="en"] small');if(enCard)enCard.textContent='Türkçe anlatımlı · 3000 benzersiz kelime + A1–C2 Akademi';
  if($('#proofWordCount')&&activeCourse==='en')$('#proofWordCount').textContent='3000';
  if($('#proofWordLabel')&&activeCourse==='en')$('#proofWordLabel').textContent='benzersiz İngilizce kelime kaydı';
  if(activeCourse==='en'){
    const group=$('#groupFilter');
    if(group){
      const current=group.value,values=[...group.options].map(o=>o.value).join('|');
      if(values!=='|base1000|extended2000'){
        group.innerHTML='<option value="">3000 kelimenin tümü</option><option value="base1000">1–1000 İncelenmiş Çekirdek</option><option value="extended2000">1001–3000 Genişletilmiş Beta Sözlük</option>';
        group.value=['base1000','extended2000'].includes(current)?current:'';
      }
    }
    const core=$('[data-collection="core5000"]');if(core){core.hidden=false;core.querySelector('b').textContent='1000 Temel Kelime';core.querySelector('small').textContent='İncelenmiş çekirdek sözlük'}
    const phrases=$('[data-collection="phrases"]');if(phrases){phrases.hidden=false;phrases.querySelector('b').textContent='2000 Genişletilmiş Kelime';phrases.querySelector('small').textContent='1001–3000 genişletilmiş A1–C2 sözlük'}
  }
  wp822EnsureLibrarySummary();
}

function wp822EnsureLibrarySummary(){
  const view=$('#view-library');if(!view||activeCourse!=='en')return;
  let box=$('#wp822LexiconSummary');
  if(!box){
    box=document.createElement('section');box.id='wp822LexiconSummary';box.className='wp822-lexicon-summary panel';
    const filters=view.querySelector('.filters');if(filters)filters.before(box);
  }
  if(box.dataset.version!==WP822_VERSION){
    box.innerHTML='<div><p class="eyebrow">V8.2.2 SÖZLÜK</p><b>3000 benzersiz İngilizce kayıt</b><small>1000 incelenmiş çekirdek + 2000 beta genişletme</small></div><div class="wp822-summary-stats"><span><b>A1–C2</b><small>seviye tahmini</small></span><span><b>161</b><small>eş anlam bağlantısı</small></span><span><b>171</b><small>zıt anlam bağlantısı</small></span><span><b>127</b><small>kelime ailesi</small></span></div>';
    box.dataset.version=WP822_VERSION;
  }
}

const wp822FilteredWordsBase=filteredWords;
filteredWords=function(){
  const select=$('#groupFilter'),group=select?.value||'';
  if(!['base1000','extended2000'].includes(group))return wp822FilteredWordsBase();
  select.value='';const rows=wp822FilteredWordsBase();select.value=group;
  return rows.filter(w=>group==='base1000'?Number(w.id)<=1000:Number(w.id)>1000);
};

const wp822OpenCollectionBase=openCollection;
openCollection=function(type){
  if(activeCourse==='en'&&(type==='core5000'||type==='phrases')){
    nav('library');
    if($('#searchInput'))$('#searchInput').value='';if($('#levelFilter'))$('#levelFilter').value='';if($('#statusFilter'))$('#statusFilter').value='';
    wp822ApplyBrand();
    if($('#groupFilter'))$('#groupFilter').value=type==='core5000'?'base1000':'extended2000';
    if(typeof wp82ClearLibraryRange==='function')wp82ClearLibraryRange();else renderWords(true);
    return;
  }
  return wp822OpenCollectionBase(type);
};

const wp822UpdateCourseUIBase=updateCourseUI;
updateCourseUI=function(){const out=wp822UpdateCourseUIBase();wp822ApplyBrand();return out};

function wp822MigrationKey(email=(profile?.email||'guest@local')){return `${STORE}:migration:${WP822_MIGRATION}:${String(email).toLowerCase()}`}
function wp822ClearLegacyContextProgress(st){
  st=ensureStateShape(st||defaultState());const at=Date.now(),affected=new Set();
  const add=id=>{id=Number(id);if(id>=1001&&id<=2000)affected.add(String(id))};
  [st.statuses,st.statusUpdated,st.history,st.selectionUpdated].forEach(map=>Object.keys(map||{}).forEach(add));
  (st.selected||[]).forEach(add);
  ['favorite','veryHard','ignored'].forEach(flag=>{Object.keys(st.flags?.[flag]||{}).forEach(add);Object.keys(st.flagUpdated?.[flag]||{}).forEach(add)});
  affected.forEach(key=>{
    delete st.statuses[key];st.statusUpdated[key]={value:'',at};
    ['favorite','veryHard','ignored'].forEach(flag=>{delete st.flags[flag][key];st.flagUpdated[flag][key]={value:false,at}});
    delete st.history[key];st.selectionUpdated[key]={value:false,at};
  });
  st.selected=(st.selected||[]).filter(id=>Number(id)<=1000);
  if(affected.size)st.lastActive=new Date().toISOString();
  return ensureStateShape(st);
}
function wp822MigrateProgress(email=(profile?.email||'guest@local')){
  email=String(email||'guest@local').toLowerCase();const marker=wp822MigrationKey(email);if(localStorage.getItem(marker))return false;
  let enState=activeCourse==='en'?state:(readLocalState(email,'en')||defaultState());
  enState=wp822ClearLegacyContextProgress(enState);writeCourseState('en',enState,email);cloudCourseStates.en=enState;if(activeCourse==='en')state=enState;
  localStorage.setItem(marker,new Date().toISOString());return true;
}
const wp822LoadBase=load;
load=function(){wp822LoadBase();wp822MigrateProgress(profile?.email||'guest@local')};
const wp822HandleAuthStateBase=handleAuthState;
handleAuthState=async function(user){
  await wp822HandleAuthStateBase(user);
  if(user&&wp822MigrateProgress(user.email||profile?.email)){save({cloud:false});await syncCloudNow();renderAll();}
  wp822ApplyBrand();
};

function setupV822Events(){
  document.addEventListener('change',event=>{if(event.target?.id==='groupFilter'){if(typeof wp82LibraryPage!=='undefined')wp82LibraryPage=1;renderWords(true)}},true);
}
function wp822AfterInit(){
  wp822ApplyBrand();
  /* v9.5: eski içerik gözlemcisi devre dışı */
}
