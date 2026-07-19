/* WordPilot v9.7.0 — Smart Word Session: persistent study sets, mastery route and five-word story practice. */
const WP97_VERSION='9.7.0';
const WP97_LABEL='v9.7.0 · Smart Word Session';
const WP97_SET_KEY=`${STORE}:smart_word_set_v97`;
const WP97_HISTORY_KEY=`${STORE}:smart_word_set_history_v97`;
const WP97_MAX_SET=12;
let wp97Observer=null;
let wp97Practice=null;

function wp97ReadJson(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function wp97WriteJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
function wp97Shuffle(input){const out=[...input];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function wp97ActiveSet(){const set=wp97ReadJson(WP97_SET_KEY,null);return set&&Array.isArray(set.ids)&&set.ids.length?set:null}
function wp97SaveSet(set){if(!set){localStorage.removeItem(WP97_SET_KEY);wp97Apply();return null}set.updatedAt=new Date().toISOString();wp97WriteJson(WP97_SET_KEY,set);wp97Apply();return set}
function wp97Apply(){wp97EnsureUi();wp97ApplyVersion()}
function wp97History(){return wp97ReadJson(WP97_HISTORY_KEY,[]).filter(x=>x&&Array.isArray(x.ids)&&x.ids.length)}
function wp97ArchiveSet(set){if(!set)return;const history=wp97History().filter(x=>x.id!==set.id);history.unshift({...set,archivedAt:new Date().toISOString()});wp97WriteJson(WP97_HISTORY_KEY,history.slice(0,12))}
function wp97CourseShort(course=activeCourse){return COURSES[course]?.short||String(course||'').toUpperCase()}
function wp97DirectionLabel(set=wp97ActiveSet()){
  if(!set)return'';const target=wp97CourseShort(set.course);
  return set.direction==='tr-target'?`TR → ${target}`:`${target} → TR`;
}
function wp97SetWords(set=wp97ActiveSet()){
  if(!set||set.course!==activeCourse)return[];
  const wanted=new Set(set.ids.map(Number));return words.filter(w=>wanted.has(Number(w.id))).sort((a,b)=>set.ids.indexOf(Number(a.id))-set.ids.indexOf(Number(b.id)));
}
function wp97ModeKey(){return session?.wp97Mode||wp97Practice?.type||wp97ActiveSet()?.lastMode||session?.questionType||session?.mode||'practice'}
function wp97MasteryScore(rec={}){const right=Number(rec.correct)||0,wrong=Number(rec.wrong)||0,coverage=Object.keys(rec.modes||{}).length;return Math.min(100,Math.round((right/(Math.max(1,right+wrong)))*70+Math.min(30,coverage*5)))}
function wp97UpdateMastery(word,correct,mode=wp97ModeKey()){
  const set=wp97ActiveSet();if(!set||set.course!==activeCourse||!set.ids.includes(Number(word?.id)))return;
  set.mastery=set.mastery||{};const key=String(Number(word.id));const rec=set.mastery[key]||(set.mastery[key]={correct:0,wrong:0,modes:{}});
  if(correct)rec.correct=(Number(rec.correct)||0)+1;else rec.wrong=(Number(rec.wrong)||0)+1;
  rec.lastAt=new Date().toISOString();rec.modes=rec.modes||{};rec.modes[mode]={correct:(Number(rec.modes[mode]?.correct)||0)+(correct?1:0),wrong:(Number(rec.modes[mode]?.wrong)||0)+(correct?0:1),at:rec.lastAt};
  wp97SaveSet(set);
}
function wp97MarkModeComplete(key,score=100){
  const set=wp97ActiveSet();if(!set)return;set.completed=set.completed||{};set.completed[key]={at:new Date().toISOString(),score:Math.max(0,Math.min(100,Math.round(Number(score)||0)))};set.lastMode=key;wp97SaveSet(set);
}
function wp97CreateSetFromSelection(){
  let ids=[...new Set((state.selected||[]).map(Number).filter(Number.isFinite))];
  if(!ids.length){toast('Önce kelime listesinden + işaretiyle kelime seç.');return null}
  if(ids.length>WP97_MAX_SET){ids=ids.slice(0,WP97_MAX_SET);toast(`Akıcı çalışma için ilk ${WP97_MAX_SET} kelime sete alındı.`)}
  const old=wp97ActiveSet();
  if(old&&!(old.course===activeCourse&&old.ids.length===ids.length&&old.ids.every((id,i)=>id===ids[i])))wp97ArchiveSet(old);
  const preserve=old?.course===activeCourse&&old.ids.every(id=>ids.includes(id))?old:null;
  const set={
    id:preserve?.id||`${activeCourse}-${Date.now()}`,course:activeCourse,ids,label:`${COURSES[activeCourse]?.name||activeCourse} · ${ids.length} kelime`,
    direction:preserve?.direction||'target-tr',createdAt:preserve?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),
    completed:preserve?.completed||{},mastery:preserve?.mastery||{},dueAt:preserve?.dueAt||null,lastMode:preserve?.lastMode||''
  };
  wp97SaveSet(set);wp97OpenHub();toast(`${ids.length} kelimelik akıllı set hazır.`);return set;
}
function wp97RestoreSelection(set){
  if(!set||set.course!==activeCourse)return;const existing=new Set((state.selected||[]).map(Number));
  Object.keys(state.selectionUpdated||{}).forEach(id=>{if(existing.has(Number(id))&&!set.ids.includes(Number(id)))state.selectionUpdated[id]={value:false,at:Date.now()}});
  set.ids.forEach(id=>state.selectionUpdated[String(id)]={value:true,at:Date.now()});state.selected=[...set.ids];save();renderWords();updateSelectedControls();
}
function wp97SetDirection(direction){const set=wp97ActiveSet();if(!set)return;set.direction=direction==='tr-target'?'tr-target':'target-tr';wp97SaveSet(set);wp97RenderHub();}
function wp97ModeAvailability(key,set=wp97ActiveSet()){
  const rows=wp97SetWords(set);if(!rows.length)return false;
  if(key==='cloze')return rows.some(exampleContainsTarget);
  if(key==='sentence'||key==='translation'||key==='story')return rows.some(w=>firstExample(w));
  if(key==='ordering')return rows.some(w=>{const n=firstExample(w).split(/\s+/).filter(Boolean).length;return n>=3&&n<=12});
  if(key==='synonym')return rows.some(w=>hasRelation(w,'synonym'));
  if(key==='antonym')return rows.some(w=>hasRelation(w,'antonym'));
  if(key==='family')return rows.some(w=>wp97FamilyTerms(w).length);
  return true;
}
function wp97Modes(set=wp97ActiveSet()){
  const direction=set?.direction==='tr-target'?'tr-en':'en-tr';
  return [
    {key:'recognize',icon:'👁',title:'Tanı ve dinle',desc:'Kelime, anlam, ses ve örnek',mode:'flash'},
    {key:'meaning',icon:'🎯',title:'Anlamı seç',desc:'Hızlı tanıma ve hatırlama',mode:'smart'},
    {key:'direction',icon:'↔',title:`Yaz ${wp97DirectionLabel(set)}`,desc:'Yön değiştirmeden yazılı üretim',mode:direction},
    {key:'cloze',icon:'▱',title:'Cümle tamamlama',desc:'Kelimeyi doğru bağlama yerleştir',mode:'cloze'},
    {key:'sentence',icon:'✍',title:'Cümle devamını seç',desc:'Doğal örnek cümleyi tamamla',mode:'sentence'},
    {key:'ordering',icon:'🧩',title:'Cümle oluştur',desc:'Karışık parçaları doğru sırala',mode:'ordering'},
    {key:'translation',icon:'🔢',title:'Çeviri yapbozu',desc:'Numaralı parçalarla cümleyi kur',custom:true},
    {key:'synonym',icon:'≈',title:'Eş anlam oyunu',desc:'Anlam bağlantılarını güçlendir',mode:'synonym'},
    {key:'antonym',icon:'⇄',title:'Zıt anlam oyunu',desc:'Karşıt anlamları ayırt et',mode:'antonym'},
    {key:'family',icon:'🌿',title:'Kelime ailesi',desc:'İsim, fiil ve sıfat bağlarını gör',custom:true},
    {key:'story',icon:'📖',title:`${set?.ids?.length||5} kelimelik mini hikâye`,desc:'Örnekleri tek okuma akışında pekiştir',custom:true},
    {key:'final',icon:'🏁',title:'Karışık final testi',desc:'Bütün becerilerden son tur',mode:'comprehensive'}
  ].map(item=>({...item,available:wp97ModeAvailability(item.key,set)}));
}
function wp97NextMode(set=wp97ActiveSet()){return wp97Modes(set).find(m=>m.available&&!set?.completed?.[m.key])||wp97Modes(set).find(m=>m.available)}
function wp97SetProgress(set=wp97ActiveSet()){const modes=wp97Modes(set).filter(m=>m.available),done=modes.filter(m=>set?.completed?.[m.key]).length;return {done,total:modes.length,pct:modes.length?Math.round(done/modes.length*100):0}}

function wp97EnsureUi(){
  if(!document.querySelector('#wp97ActiveSetBar'))document.body.insertAdjacentHTML('beforeend',`<aside id="wp97ActiveSetBar" class="wp97-active-bar" hidden aria-live="polite"></aside>`);
  if(!document.querySelector('#wp97SessionHub'))document.body.insertAdjacentHTML('beforeend',`<dialog id="wp97SessionHub" class="modal wp97-session-hub"><button class="sheet-close" data-wp97-close type="button">×</button><div id="wp97HubContent"></div></dialog>`);
}
function wp97WordChips(set=wp97ActiveSet(),limit=6){
  if(!set)return'';let rows=[];
  if(set.course===activeCourse)rows=wp97SetWords(set).map(w=>({id:w.id,term:w.english,meaning:firstMeaning(w)}));
  else rows=set.ids.map(id=>({id,term:`#${id}`,meaning:''}));
  return rows.slice(0,limit).map(row=>`<span class="wp97-word-chip"><b>${esc(row.term)}</b>${row.meaning?`<small>${esc(row.meaning)}</small>`:''}</span>`).join('')+(rows.length>limit?`<span class="wp97-word-more">+${rows.length-limit}</span>`:'');
}
function wp97RenderBar(){
  wp97EnsureUi();const bar=document.querySelector('#wp97ActiveSetBar'),set=wp97ActiveSet();if(!bar)return;
  if(!set){bar.hidden=true;return}bar.hidden=false;
  const same=set.course===activeCourse,progress=wp97SetProgress(set),due=set.dueAt?new Date(set.dueAt):null;
  const html=`<div class="wp97-bar-copy"><span class="wp97-set-dot">${set.ids.length}</span><div><b>${same?'Aktif kelime setin':`${COURSES[set.course]?.name||set.course} setin hazır`}</b><small>${same?`${wp97DirectionLabel(set)} · %${progress.pct} rota`: 'Kursa dönerek kaldığın yerden devam et'}${due?` · tekrar ${new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short'}).format(due)}`:''}</small></div></div><div class="wp97-bar-chips">${wp97WordChips(set,4)}</div><div class="wp97-bar-actions">${same?'<button type="button" class="secondary" data-wp97-direction>↔</button>':`<button type="button" class="secondary" data-wp97-switch-course="${esc(set.course)}">Kursa dön</button>`}<button type="button" class="primary" data-wp97-open>Devam et</button></div>`;
  if(bar.innerHTML!==html)bar.innerHTML=html;
}
function wp97RenderMastery(set=wp97ActiveSet()){
  const rows=wp97SetWords(set);if(!rows.length)return'';
  return `<div class="wp97-mastery-list">${rows.map(w=>{const rec=set.mastery?.[String(w.id)]||{},score=wp97MasteryScore(rec);return `<article><div><b>${esc(w.english)}</b><small>${esc(firstMeaning(w))}</small></div><div class="wp97-mastery-track"><i style="width:${score}%"></i></div><strong>%${score}</strong></article>`}).join('')}</div>`;
}
function wp97RenderHistory(){
  const rows=wp97History();if(!rows.length)return'<p class="muted">Henüz geçmiş set yok.</p>';
  return `<div class="wp97-history-list">${rows.slice(0,5).map(set=>`<button type="button" data-wp97-restore="${esc(set.id)}"><span><b>${esc(set.label||`${set.ids.length} kelime`)}</b><small>${set.ids.length} kelime · ${new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short'}).format(new Date(set.updatedAt||set.createdAt||Date.now()))}</small></span><em>Yeniden aç →</em></button>`).join('')}</div>`;
}
function wp97RenderHub(){
  wp97EnsureUi();const host=document.querySelector('#wp97HubContent'),set=wp97ActiveSet();if(!host)return;
  if(!set){host.innerHTML=`<p class="eyebrow">AKILLI KELİME OTURUMU</p><h2>Önce bir kelime seti oluştur</h2><p>Kütüphanede kelimelerin yanındaki + düğmesine dokun ve “Seçilenlere çalış” düğmesini kullan.</p><button type="button" class="primary wide" data-wp97-new-set>Kelimelere git</button>`;return}
  if(set.course!==activeCourse){host.innerHTML=`<p class="eyebrow">AKTİF SET BAŞKA KURSTA</p><h2>${esc(COURSES[set.course]?.name||set.course)} · ${set.ids.length} kelime</h2><p>Bu seti açmak için ilgili kursa dön. Kelimelerin, yönün ve ilerlemen korunuyor.</p><button type="button" class="primary wide" data-wp97-switch-course="${esc(set.course)}">Kursa dön ve devam et</button>`;return}
  wp97RestoreSelection(set);const progress=wp97SetProgress(set),next=wp97NextMode(set),modes=wp97Modes(set);
  host.innerHTML=`<header class="wp97-hub-head"><div><p class="eyebrow">V9.7 · AKILLI KELİME OTURUMU</p><h2>${set.ids.length} kelime seç. Tanı, kullan, yaz ve hikâyede yaşat.</h2><p>Aynı kelimeler bütün oyunlarda korunur; menüye dönüp yön ve liste seçmene gerek kalmaz.</p></div><div class="wp97-progress-ring" style="--wp97-p:${progress.pct}"><b>%${progress.pct}</b><small>${progress.done}/${progress.total} bölüm</small></div></header>
  <section class="wp97-set-summary"><div class="wp97-hub-chips">${wp97WordChips(set,12)}</div><div class="wp97-direction"><span>Çalışma yönü</span><button type="button" class="${set.direction==='target-tr'?'active':''}" data-wp97-set-direction="target-tr">${wp97CourseShort(set.course)} → TR</button><button type="button" class="${set.direction==='tr-target'?'active':''}" data-wp97-set-direction="tr-target">TR → ${wp97CourseShort(set.course)}</button></div></section>
  ${next?`<section class="wp97-next-card"><div><span>SIRADAKİ ÖNERİ</span><h3>${next.icon} ${esc(next.title)}</h3><p>${esc(next.desc)}</p></div><button type="button" class="primary" data-wp97-mode="${esc(next.key)}">Devam et</button></section>`:''}
  <section><div class="wp97-section-title"><div><p class="eyebrow">USTALIK DÖNGÜSÜ</p><h3>Aynı setle bütün oyunlar</h3></div><button type="button" class="secondary" data-wp97-repeat-hard>Zorlandıklarımı seç</button></div><div class="wp97-mode-grid">${modes.map(m=>`<button type="button" class="wp97-mode-card ${set.completed?.[m.key]?'done':''}" data-wp97-mode="${esc(m.key)}" ${m.available?'':'disabled'}><span>${m.icon}</span><div><b>${esc(m.title)}</b><small>${m.available?esc(m.desc):'Bu sette gerekli içerik bulunmuyor'}</small></div><em>${set.completed?.[m.key]?`✓ %${set.completed[m.key].score}`:'Başla →'}</em></button>`).join('')}</div></section>
  <section class="wp97-mastery"><div class="wp97-section-title"><div><p class="eyebrow">KELİME BAZLI GELİŞİM</p><h3>Hangi kelime daha çok tekrar istiyor?</h3></div></div>${wp97RenderMastery(set)}</section>
  <section class="wp97-review-plan"><div><p class="eyebrow">TEKRAR PLANI</p><h3>Bu set ne zaman geri gelsin?</h3></div><div><button type="button" data-wp97-due="1">Yarın</button><button type="button" data-wp97-due="3">3 gün</button><button type="button" data-wp97-due="7">7 gün</button><button type="button" data-wp97-due="0">Planı kaldır</button></div></section>
  <section class="wp97-history"><div class="wp97-section-title"><div><p class="eyebrow">GEÇMİŞ SETLER</p><h3>Eski kelime grubunu tek dokunuşla aç</h3></div><button type="button" class="secondary" data-wp97-new-set>Yeni set seç</button></div>${wp97RenderHistory()}</section>
  <div id="wp97PracticeStage" class="wp97-practice-stage" hidden></div>`;
}
function wp97OpenHub(){wp97RenderHub();const dialog=document.querySelector('#wp97SessionHub');if(dialog&&!dialog.open)dialog.showModal()}
function wp97CloseHub(){const dialog=document.querySelector('#wp97SessionHub');if(dialog?.open)dialog.close()}

function wp97StartMode(key){
  const set=wp97ActiveSet(),mode=wp97Modes(set).find(x=>x.key===key);if(!set||set.course!==activeCourse||!mode||!mode.available)return;
  set.lastMode=key;wp97SaveSet(set);wp97Practice=null;
  if(mode.custom){if(key==='translation')wp97StartTranslation(0);else if(key==='family')wp97StartFamily(0);else if(key==='story')wp97StartStory();return}
  wp97RestoreSelection(set);wp97CloseHub();startStudy(mode.mode,null,'classic','selected',true);if(session){session.wp97Mode=key;session.wp97SetId=set.id;session.total=session.pool.length;saveSession()}
}
function wp97FirstTranslation(w){return firstLine(w?.translation)||firstMeaning(w)}
function wp97RenderPractice(html){wp97OpenHub();const stage=document.querySelector('#wp97PracticeStage');if(!stage)return;stage.hidden=false;stage.innerHTML=html;stage.scrollIntoView({behavior:'smooth',block:'start'})}
function wp97StartTranslation(index=0){
  const set=wp97ActiveSet(),rows=wp97SetWords(set).filter(w=>firstExample(w));if(!rows.length)return;index=Math.max(0,Math.min(rows.length-1,index));const w=rows[index],sentence=firstExample(w),tokens=sentence.split(/\s+/).filter(Boolean),order=wp97Shuffle(tokens.map((_,i)=>i));
  if(order.every((v,i)=>v===i)&&order.length>1)order.push(order.shift());wp97Practice={type:'translation',index,rows,w,tokens,order,answer:[],correct:false};
  wp97RenderPractice(`<div class="wp97-practice-head"><div><p class="eyebrow">ÇEVİRİ YAPBOZU · ${index+1}/${rows.length}</p><h3>${esc(wp97FirstTranslation(w))}</h3><p>Numaralı parçaları seçerek hedef dildeki cümleyi kur.</p></div><button type="button" class="secondary" data-wp97-practice-close>Oyunlara dön</button></div><div id="wp97PuzzleAnswer" class="wp97-puzzle-answer"><span>Parçalara dokun…</span></div><div id="wp97PuzzleBank" class="wp97-puzzle-bank">${order.map((tokenIndex,i)=>`<button type="button" data-wp97-puzzle-token="${tokenIndex}"><small>${i+1}</small>${esc(tokens[tokenIndex])}</button>`).join('')}</div><div class="wp97-practice-actions"><button type="button" class="secondary" data-wp97-puzzle-undo>Son parçayı geri al</button><button type="button" class="primary" data-wp97-puzzle-check>Kontrol et</button></div><p id="wp97PracticeFeedback" class="feedback"></p>`);
}
function wp97RenderPuzzleAnswer(){const box=document.querySelector('#wp97PuzzleAnswer');if(!box||!wp97Practice)return;box.innerHTML=wp97Practice.answer.length?wp97Practice.answer.map((tokenIndex,i)=>`<button type="button" data-wp97-puzzle-remove="${i}">${esc(wp97Practice.tokens[tokenIndex])}</button>`).join(''):'<span>Parçalara dokun…</span>';document.querySelectorAll('[data-wp97-puzzle-token]').forEach(btn=>btn.disabled=wp97Practice.answer.includes(Number(btn.dataset.wp97PuzzleToken)))}
function wp97CheckPuzzle(){
  if(!wp97Practice||wp97Practice.type!=='translation'||wp97Practice.correct)return;const built=wp97Practice.answer.map(i=>wp97Practice.tokens[i]).join(' '),correct=normalizeAnswer(built)===normalizeAnswer(wp97Practice.tokens.join(' ')),fb=document.querySelector('#wp97PracticeFeedback');
  if(correct){wp97Practice.correct=true;recordAnswer(wp97Practice.w,true);adjustPoints(8);if(fb){fb.className='feedback good';fb.textContent='Doğru cümle ✓'}const last=wp97Practice.index>=wp97Practice.rows.length-1;if(last)wp97MarkModeComplete('translation',100);document.querySelector('.wp97-practice-actions')?.insertAdjacentHTML('beforeend',`<button type="button" class="primary" data-wp97-puzzle-next>${last?'Bölümü tamamla':'Sonraki kelime →'}</button>`)}
  else{recordAnswer(wp97Practice.w,false);adjustPoints(-1);if(fb){fb.className='feedback bad';fb.textContent='Sıra henüz doğru değil. Cümleyi yeniden düzenle.'}}
}
function wp97FamilyTerms(w){
  const raw=clean(w?.family||'');if(!raw||raw.toLocaleLowerCase('tr')==='yok')return[];
  return [...new Set(raw.split(/[\n,;•]+/).map(x=>clean(x.replace(/\([^)]*\)/g,''))).filter(x=>x&&x.toLocaleLowerCase('en')!==String(w.english||'').toLocaleLowerCase('en')&&x.length<45))];
}
function wp97StartFamily(index=0){
  const set=wp97ActiveSet(),rows=wp97SetWords(set).map(w=>({w,terms:wp97FamilyTerms(w)})).filter(x=>x.terms.length);if(!rows.length)return;index=Math.max(0,Math.min(rows.length-1,index));const row=rows[index],correct=row.terms[0];let distractors=rows.filter(x=>x.w.id!==row.w.id).flatMap(x=>x.terms).filter(Boolean);if(distractors.length<3)distractors=distractors.concat(words.filter(x=>x.id!==row.w.id).flatMap(w=>wp97FamilyTerms(w)).slice(0,12));const options=wp97Shuffle([correct,...[...new Set(distractors)].slice(0,3)]);wp97Practice={type:'family',index,rows,w:row.w,correct,answered:false};
  wp97RenderPractice(`<div class="wp97-practice-head"><div><p class="eyebrow">KELİME AİLESİ · ${index+1}/${rows.length}</p><h3>${esc(row.w.english)}</h3><p>${esc(firstMeaning(row.w))} kelimesiyle aynı aileden olan biçimi seç.</p></div><button type="button" class="secondary" data-wp97-practice-close>Oyunlara dön</button></div><div class="wp97-family-options">${options.map(x=>`<button type="button" data-wp97-family-answer="${esc(x)}">${esc(x)}</button>`).join('')}</div><p id="wp97PracticeFeedback" class="feedback"></p>`);
}
function wp97AnswerFamily(value,button){
  if(!wp97Practice||wp97Practice.type!=='family'||wp97Practice.answered)return;const correct=normalizeAnswer(value)===normalizeAnswer(wp97Practice.correct),fb=document.querySelector('#wp97PracticeFeedback');
  if(correct){wp97Practice.answered=true;button.classList.add('correct');document.querySelectorAll('[data-wp97-family-answer]').forEach(x=>x.disabled=true);recordAnswer(wp97Practice.w,true);adjustPoints(8);if(fb){fb.className='feedback good';fb.textContent=`Doğru ✓ ${wp97Practice.correct}`};const last=wp97Practice.index>=wp97Practice.rows.length-1;if(last)wp97MarkModeComplete('family',100);button.parentElement.insertAdjacentHTML('afterend',`<button type="button" class="primary wide wp97-family-next" data-wp97-family-next>${last?'Bölümü tamamla':'Sonraki kelime →'}</button>`)}
  else{button.classList.add('wrong');button.disabled=true;recordAnswer(wp97Practice.w,false);adjustPoints(-1);if(fb){fb.className='feedback bad';fb.textContent='Bu biçim başka bir aileye ait. Tekrar dene.'}}
}
function wp97Highlight(text,term){const raw=String(text||''),needle=String(term||'');if(!needle)return esc(raw);const index=raw.toLocaleLowerCase('en').indexOf(needle.toLocaleLowerCase('en'));if(index<0)return esc(raw);return `${esc(raw.slice(0,index))}<mark>${esc(raw.slice(index,index+needle.length))}</mark>${esc(raw.slice(index+needle.length))}`}
function wp97StartStory(){
  const set=wp97ActiveSet(),rows=wp97SetWords(set).filter(w=>firstExample(w));if(!rows.length)return;wp97Practice={type:'story',rows,showTranslations:false};
  const title=rows.length===5?'Beş Kelimelik Mini Hikâye':`${rows.length} Kelimelik Mini Hikâye`;
  wp97RenderPractice(`<div class="wp97-practice-head"><div><p class="eyebrow">ÖRNEKLERDEN HİKÂYE</p><h3>${title}</h3><p>Seçtiğin kelimelerin gerçek örnek cümleleri ${rows.length} sahneli tek bir okuma akışına dönüştürüldü.</p></div><button type="button" class="secondary" data-wp97-practice-close>Oyunlara dön</button></div><article class="wp97-story-card"><p class="wp97-story-intro">Mira yeni bir gün için not defterini açtı. Her sahnede öğrendiği kelimelerden birini gerçek bağlamında kullanmaya karar verdi.</p>${rows.map((w,i)=>`<section><div class="wp97-story-index">${i+1}</div><div><small>SAHNE ${i+1} · ${esc(w.english)}</small><p>${wp97Highlight(firstExample(w),w.english)}</p><p class="wp97-story-translation" hidden>${esc(wp97FirstTranslation(w))}</p></div><button type="button" data-wp97-story-speak="${w.id}" title="Cümleyi dinle">🔊</button></section>`).join('')}<p class="wp97-story-outro">Mira sayfayı kapatmadan önce bütün kelimeleri bir kez daha sesli okudu. Artık onları yalnızca tanımıyor, cümle içinde de hatırlıyordu.</p></article><div class="wp97-story-actions"><button type="button" class="secondary" data-wp97-story-translate>Türkçe çevirileri göster</button><button type="button" class="primary" data-wp97-story-complete>Hikâyeyi tamamla</button></div>`);
}
function wp97CompleteStory(){const rows=wp97Practice?.rows||[];rows.forEach(w=>wp97UpdateMastery(w,true,'story'));adjustPoints(Math.max(5,rows.length*2));wp97MarkModeComplete('story',100);wp97Practice=null;wp97RenderHub();toast('Mini hikâye tamamlandı. Kelimeler bağlam turundan geçti.')}
function wp97RepeatHard(){
  const set=wp97ActiveSet();if(!set||set.course!==activeCourse)return;const hard=set.ids.filter(id=>wp97MasteryScore(set.mastery?.[String(id)]||{})<70||state.history?.[id]?.needsReview);if(!hard.length){toast('Bu sette belirgin zor kelime görünmüyor.');return}
  state.selected=[...hard];Object.keys(state.selectionUpdated||{}).forEach(id=>state.selectionUpdated[id]={value:hard.includes(Number(id)),at:Date.now()});hard.forEach(id=>state.selectionUpdated[String(id)]={value:true,at:Date.now()});save();wp97CloseHub();startStudy('comprehensive',null,'classic','selected',true);if(session){session.wp97Mode='hard-repeat';session.wp97SetId=set.id}toast(`${hard.length} zor kelimeyle tekrar başladı.`)
}
function wp97Schedule(days){const set=wp97ActiveSet();if(!set)return;set.dueAt=days?new Date(Date.now()+Number(days)*86400000).toISOString():null;wp97SaveSet(set);wp97RenderHub();toast(days?`Set ${days} gün sonra tekrar listene gelecek.`:'Tekrar planı kaldırıldı.')}
function wp97NewSet(){const old=wp97ActiveSet();if(old)wp97ArchiveSet(old);localStorage.removeItem(WP97_SET_KEY);state.selected=[];Object.keys(state.selectionUpdated||{}).forEach(id=>state.selectionUpdated[id]={value:false,at:Date.now()});save();wp97CloseHub();nav('library');renderWords(true);toast('Yeni set için kelimeleri + düğmesiyle seç.')}
function wp97RestoreHistory(id){const set=wp97History().find(x=>x.id===id);if(!set)return;const current=wp97ActiveSet();if(current)wp97ArchiveSet(current);wp97SaveSet({...set,id:`${set.course}-${Date.now()}`,createdAt:new Date().toISOString()});if(set.course===activeCourse){wp97RestoreSelection(set);wp97RenderHub()}else switchCourse(set.course).then(()=>{wp97RestoreSelection(wp97ActiveSet());wp97OpenHub()})}

function wp97ApplyVersion(){
  if(document.documentElement.dataset.wpVersion!==WP97_VERSION)document.documentElement.dataset.wpVersion=WP97_VERSION;
  const title='WordPilot 9.7.0 · Smart Word Session · Reader 3.0';if(document.title!==title)document.title=title;
  document.querySelectorAll('.version').forEach(n=>{if(n.textContent!==WP97_LABEL)n.textContent=WP97_LABEL});
  const meta=document.querySelector('meta[name="description"]'),description='WordPilot v9.7.0 — kalıcı kelime setleri, aynı kelimelerle cümle, çeviri, hikâye, eş-zıt anlam ve ustalık takibi.';if(meta&&meta.content!==description)meta.content=description;
  const btn=document.querySelector('#studySelectedBtn'),count=(state?.selected||[]).length;if(btn){if(btn.dataset.wp97Count!==String(count)){btn.innerHTML=`${count} kelimeyle akıllı oturum <span id="selectedCount">${count}</span>`;btn.dataset.wp97Count=String(count)}btn.hidden=count===0}
  wp97RenderBar();
}
const wp97RecordAnswerBase=recordAnswer;
recordAnswer=function(word,correct){const out=wp97RecordAnswerBase(word,correct);wp97UpdateMastery(word,correct);return out};
const wp97FinishSessionBase=finishSession;
finishSession=function(){
  const snapshot=session?{source:session.source,pool:[...(session.pool||[])],correct:Number(session.correct)||0,index:Number(session.index)||0,score:Number(session.score)||0,mode:session.wp97Mode||wp97ActiveSet()?.lastMode||session.mode,setId:session.wp97SetId}:null;
  const out=wp97FinishSessionBase();const set=wp97ActiveSet();if(!snapshot||!set||set.course!==activeCourse||snapshot.source!=='selected'||!snapshot.pool.some(w=>set.ids.includes(Number(w.id))))return out;
  const pct=Math.round(snapshot.correct/Math.max(1,snapshot.index)*100);wp97MarkModeComplete(snapshot.mode,pct);const next=wp97NextMode(wp97ActiveSet()),content=document.querySelector('#studyContent');
  if(content)content.innerHTML=`<div class="wp97-finish-card"><span>✓</span><h3>Bu ${set.ids.length} kelimeyle devam et</h3><p>%${pct} başarı · ${snapshot.correct} doğru · ${Math.max(0,snapshot.index-snapshot.correct)} yanlış</p><div class="wp97-finish-actions">${next?`<button type="button" class="primary" data-wp97-mode="${esc(next.key)}">Sıradaki: ${esc(next.title)}</button>`:''}<button type="button" class="secondary" data-wp97-open>Bütün oyunları gör</button><button type="button" class="secondary" data-wp97-repeat-hard>Zorlandıklarımı tekrar et</button></div></div>`;
  wp97Apply();return out;
};
const wp97RenderWordsBase=renderWords;
renderWords=function(...args){const out=wp97RenderWordsBase(...args);wp97ApplyVersion();return out};
const wp97RenderDashboardBase=renderDashboard;
renderDashboard=function(...args){const out=wp97RenderDashboardBase(...args);wp97ApplyVersion();return out};
const wp97UpdateCourseBase=updateCourseUI;
updateCourseUI=function(...args){const out=wp97UpdateCourseBase(...args);wp97ApplyVersion();return out};

function setupV97Events(){
  document.addEventListener('click',e=>{
    if(e.target.closest('#studySelectedBtn')){e.preventDefault();e.stopImmediatePropagation();wp97CreateSetFromSelection();return}
    if(e.target.closest('[data-wp97-open]')){e.preventDefault();wp97OpenHub();return}
    if(e.target.closest('[data-wp97-close]')){wp97CloseHub();return}
    const course=e.target.closest('[data-wp97-switch-course]');if(course){e.preventDefault();switchCourse(course.dataset.wp97SwitchCourse).then(()=>{const set=wp97ActiveSet();if(set)wp97RestoreSelection(set);wp97OpenHub()});return}
    if(e.target.closest('[data-wp97-direction]')){const set=wp97ActiveSet();if(set)wp97SetDirection(set.direction==='target-tr'?'tr-target':'target-tr');return}
    const direction=e.target.closest('[data-wp97-set-direction]');if(direction){wp97SetDirection(direction.dataset.wp97SetDirection);return}
    const mode=e.target.closest('[data-wp97-mode]');if(mode){e.preventDefault();wp97StartMode(mode.dataset.wp97Mode);return}
    if(e.target.closest('[data-wp97-new-set]')){wp97NewSet();return}
    if(e.target.closest('[data-wp97-repeat-hard]')){wp97RepeatHard();return}
    const due=e.target.closest('[data-wp97-due]');if(due){wp97Schedule(Number(due.dataset.wp97Due));return}
    const restore=e.target.closest('[data-wp97-restore]');if(restore){wp97RestoreHistory(restore.dataset.wp97Restore);return}
    if(e.target.closest('[data-wp97-practice-close]')){wp97Practice=null;wp97RenderHub();return}
    const token=e.target.closest('[data-wp97-puzzle-token]');if(token&&wp97Practice?.type==='translation'){wp97Practice.answer.push(Number(token.dataset.wp97PuzzleToken));wp97RenderPuzzleAnswer();return}
    const remove=e.target.closest('[data-wp97-puzzle-remove]');if(remove&&wp97Practice?.type==='translation'){wp97Practice.answer.splice(Number(remove.dataset.wp97PuzzleRemove),1);wp97RenderPuzzleAnswer();return}
    if(e.target.closest('[data-wp97-puzzle-undo]')&&wp97Practice?.type==='translation'){wp97Practice.answer.pop();wp97RenderPuzzleAnswer();return}
    if(e.target.closest('[data-wp97-puzzle-check]')){wp97CheckPuzzle();return}
    if(e.target.closest('[data-wp97-puzzle-next]')){const p=wp97Practice;if(!p)return;if(p.index>=p.rows.length-1){wp97Practice=null;wp97RenderHub()}else wp97StartTranslation(p.index+1);return}
    const family=e.target.closest('[data-wp97-family-answer]');if(family){wp97AnswerFamily(family.dataset.wp97FamilyAnswer,family);return}
    if(e.target.closest('[data-wp97-family-next]')){const p=wp97Practice;if(!p)return;if(p.index>=p.rows.length-1){wp97Practice=null;wp97RenderHub()}else wp97StartFamily(p.index+1);return}
    const storySpeak=e.target.closest('[data-wp97-story-speak]');if(storySpeak){const w=wp97Practice?.rows?.find(x=>Number(x.id)===Number(storySpeak.dataset.wp97StorySpeak));if(w)speak(firstExample(w),COURSES[activeCourse]?.voice);return}
    if(e.target.closest('[data-wp97-story-translate]')){const show=[...document.querySelectorAll('.wp97-story-translation')].some(x=>x.hidden);document.querySelectorAll('.wp97-story-translation').forEach(x=>x.hidden=!show);e.target.closest('button').textContent=show?'Türkçe çevirileri gizle':'Türkçe çevirileri göster';return}
    if(e.target.closest('[data-wp97-story-complete]')){wp97CompleteStory();return}
  },true);
}

function wp97InstallVersionLocks(){
  if(typeof wp81ApplyBrand==='function'&&!wp81ApplyBrand.wp97){const base=wp81ApplyBrand;wp81ApplyBrand=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp81ApplyBrand.wp97=true}
  if(typeof wp82ApplyBrand==='function'&&!wp82ApplyBrand.wp97){const base=wp82ApplyBrand;wp82ApplyBrand=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp82ApplyBrand.wp97=true}
  if(typeof wp90ApplyVersionLock==='function'&&!wp90ApplyVersionLock.wp97){const base=wp90ApplyVersionLock;wp90ApplyVersionLock=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp90ApplyVersionLock.wp97=true}
  if(typeof wp91ApplyTruth==='function'&&!wp91ApplyTruth.wp97){const base=wp91ApplyTruth;wp91ApplyTruth=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp91ApplyTruth.wp97=true}
  if(typeof wp92Apply==='function'&&!wp92Apply.wp97){const base=wp92Apply;wp92Apply=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp92Apply.wp97=true}
  if(typeof wp93Apply==='function'&&!wp93Apply.wp97){const base=wp93Apply;wp93Apply=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp93Apply.wp97=true}
  if(typeof wp94ApplyVersion==='function'&&!wp94ApplyVersion.wp97){const base=wp94ApplyVersion;wp94ApplyVersion=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp94ApplyVersion.wp97=true}
  if(typeof wp95Apply==='function'&&!wp95Apply.wp97){const base=wp95Apply;wp95Apply=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp95Apply.wp97=true}
  if(typeof wp96Apply==='function'&&!wp96Apply.wp97){const base=wp96Apply;wp96Apply=function(...args){const out=base(...args);wp97ApplyVersion();return out};wp96Apply.wp97=true}
}

async function wp97AfterInit(){
  if(typeof wp96Observer!=='undefined'&&wp96Observer)wp96Observer.disconnect();wp97EnsureUi();wp97InstallVersionLocks();wp97ApplyVersion();
  if(wp97Observer)wp97Observer.disconnect();wp97Observer=new MutationObserver(()=>{clearTimeout(wp97Observer._t);wp97Observer._t=setTimeout(wp97ApplyVersion,180)});wp97Observer.observe(document.body,{childList:true,subtree:true});
  const set=wp97ActiveSet();if(set?.course===activeCourse)wp97RestoreSelection(set);
  setTimeout(()=>{wp97InstallVersionLocks();wp97ApplyVersion()},700);setTimeout(()=>{wp97InstallVersionLocks();wp97ApplyVersion()},1600);
}
