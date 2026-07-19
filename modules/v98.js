/* WordPilot v9.8.0 — Reader Pro: story-to-session bridge, sentence lab and continuous reading route. */
const WP98_VERSION='9.8.0';
const WP98_LABEL='v9.8.0 · Reader Pro';
const WP98_MAX_WORDS=12;
let wp98Observer=null;
let wp98Lab={storyId:'',mode:'shadow',index:0,answer:[],order:[],answered:false};

function wp98Ensure(){
  const v=v5Ensure(),r=v.reader98=v.reader98&&typeof v.reader98==='object'?v.reader98:{};
  r.selections=r.selections&&typeof r.selections==='object'?r.selections:{};
  r.lab=r.lab&&typeof r.lab==='object'?r.lab:{};
  r.completedRoutes=r.completedRoutes&&typeof r.completedRoutes==='object'?r.completedRoutes:{};
  return r;
}
function wp98StoryId(story=v5Story){return String(story?.id||'')}
function wp98Normalize(value=''){return typeof wp94Simple==='function'?wp94Simple(value):String(value||'').toLocaleLowerCase('en').replace(/[^\p{L}\p{M}'-]+/gu,'').trim()}
function wp98WordMap(){return new Map((words||[]).map(w=>[wp98Normalize(w.english||w.word),w]))}
function wp98StoryRows(story=v5Story){
  if(!story)return[];const map=wp98WordMap(),seen=new Set(),rows=[];
  const source=typeof wp94AnalyseStory==='function'?wp94AnalyseStory(story).rows:[];
  source.forEach(row=>{
    let live=Number.isFinite(Number(row?.id))?(words||[]).find(w=>Number(w.id)===Number(row.id)):null;
    if(!live)live=map.get(wp98Normalize(row?.english||row?.word));
    if(!live||seen.has(Number(live.id)))return;seen.add(Number(live.id));rows.push(live);
  });
  return rows;
}
function wp98Selection(story=v5Story){
  const id=wp98StoryId(story),available=new Set(wp98StoryRows(story).map(w=>Number(w.id)));
  const raw=wp98Ensure().selections[id];return Array.isArray(raw)?raw.map(Number).filter(x=>available.has(x)).slice(0,WP98_MAX_WORDS):[];
}
function wp98SaveSelection(ids,story=v5Story){
  if(!story)return[];const available=new Set(wp98StoryRows(story).map(w=>Number(w.id))),clean=[...new Set((ids||[]).map(Number).filter(id=>available.has(id)))].slice(0,WP98_MAX_WORDS);
  wp98Ensure().selections[wp98StoryId(story)]=clean;v5Save();wp98RefreshReader(story);return clean;
}
function wp98Frequency(story,word){
  const text=(story?.lines||[]).map(x=>x.text||'').join(' '),needle=wp98Normalize(word?.english||word?.word);if(!needle)return 0;
  return wp94WordsOf(text).map(wp98Normalize).filter(x=>x===needle).length;
}
function wp98Suggestion(story=v5Story,limit=5){
  const active=typeof wp97ActiveSet==='function'?wp97ActiveSet():null;
  return wp98StoryRows(story).map(w=>{
    const history=state?.history?.[w.id]||{},mastery=active?.course===activeCourse?wp97MasteryScore(active.mastery?.[String(w.id)]||{}):0;
    let score=wp98Frequency(story,w)*18+(history.needsReview?38:0)+(history.learned?0:18)+(mastery<55?16:0);
    if(Number(w.quality_score)>=85)score+=8;if(String(w.cefr||'').includes(story?.level||''))score+=6;
    return{w,score};
  }).sort((a,b)=>b.score-a.score||Number(a.w.id)-Number(b.w.id)).slice(0,Math.min(limit,WP98_MAX_WORDS)).map(x=>Number(x.w.id));
}
function wp98SelectedRows(story=v5Story){const selected=new Set(wp98Selection(story));return wp98StoryRows(story).filter(w=>selected.has(Number(w.id)))}
function wp98ToggleWord(id,story=v5Story){
  if(!story)return;id=Number(id);const selected=wp98Selection(story),at=selected.indexOf(id);
  if(at>=0)selected.splice(at,1);else if(selected.length<WP98_MAX_WORDS)selected.push(id);else{toast(`Reader seti en fazla ${WP98_MAX_WORDS} kelime olabilir.`);return}
  wp98SaveSelection(selected,story);wp98UpdatePopupButton();
}
function wp98ImportSaved(story=v5Story){
  const map=wp98WordMap(),ids=[];Object.values(wp64CourseWords()).filter(x=>x.storyId===story?.id).forEach(item=>{const w=map.get(wp98Normalize(item.base||item.word));if(w)ids.push(Number(w.id))});
  if(!ids.length){toast('Bu hikâyeden ana sözlüğe bağlı kayıtlı kelime bulunamadı.');return}wp98SaveSelection(ids,story);toast(`${Math.min(ids.length,WP98_MAX_WORDS)} kayıtlı kelime Reader setine alındı.`)
}
function wp98CreateSmartSet(ids,story=v5Story){
  const clean=[...new Set((ids||[]).map(Number).filter(Number.isFinite))].slice(0,WP98_MAX_WORDS);if(!clean.length){toast('Önce hikâyeden kelime seç veya 5 kelime öner düğmesini kullan.');return null}
  state.selected=[...clean];state.selectionUpdated=state.selectionUpdated||{};Object.keys(state.selectionUpdated).forEach(id=>{state.selectionUpdated[id]={value:clean.includes(Number(id)),at:Date.now()}});clean.forEach(id=>state.selectionUpdated[String(id)]={value:true,at:Date.now()});save();
  const set=wp97CreateSetFromSelection();if(!set)return null;set.source='reader-pro';set.sourceStoryId=story?.id||'';set.sourceStoryTitle=story?.title||'';set.label=`${story?.title||'Reader'} · ${clean.length} kelime`;wp97SaveSet(set);wp98Ensure().completedRoutes[wp98StoryId(story)]={at:new Date().toISOString(),ids:clean};v5Save();wp98RefreshReader(story);return set;
}
function wp98CreateSuggestedSet(story=v5Story){const ids=wp98Selection(story).length?wp98Selection(story):wp98Suggestion(story,5);wp98SaveSelection(ids,story);return wp98CreateSmartSet(ids,story)}

function wp98BridgeHtml(story=v5Story){
  const rows=wp98StoryRows(story),selected=new Set(wp98Selection(story)),active=typeof wp97ActiveSet==='function'?wp97ActiveSet():null;
  const visible=rows.slice(0,18),activeHere=active?.sourceStoryId===story?.id&&active.course===activeCourse;
  return `<section id="wp98ReaderBridge" class="wp98-reader-bridge">
    <div class="wp98-bridge-head"><div><p class="eyebrow">READER PRO · HİKÂYEDEN AKILLI SET</p><h3>Bu metindeki kelimelerle çalışmaya devam et</h3><p>Kelimeyi bir kez seç; aynı set cümle, çeviri, dinleme, eş-zıt anlam, mini hikâye ve final oyunlarında korunur.</p></div><div class="wp98-bridge-count"><b>${selected.size}</b><span>/ ${Math.min(WP98_MAX_WORDS,rows.length)} seçili</span></div></div>
    ${rows.length?`<div class="wp98-word-grid">${visible.map(w=>`<button type="button" class="wp98-word-choice ${selected.has(Number(w.id))?'selected':''}" data-wp98-word-id="${w.id}" aria-pressed="${selected.has(Number(w.id))?'true':'false'}"><span>${selected.has(Number(w.id))?'✓':'+'}</span><div><b>${esc(w.english||w.word)}</b><small>${esc(firstMeaning(w))}</small></div></button>`).join('')}</div>${rows.length>visible.length?`<small class="wp98-more-note">Hikâyede ${rows.length-visible.length} ek ana sözlük kelimesi daha var. Öneri sistemi önem sırasına göre seçim yapar.</small>`:''}`:`<div class="wp98-empty"><b>Bu hikâyede Smart Session’a bağlanabilen ana sözlük kelimesi bulunamadı.</b><span>Reader sözlüğü ve cümle laboratuvarı yine kullanılabilir.</span></div>`}
    <div class="wp98-bridge-actions"><button type="button" class="secondary" data-wp98-suggest ${rows.length?'':'disabled'}>✨ 5 kelime öner</button><button type="button" class="secondary" data-wp98-import-saved ${rows.length?'':'disabled'}>Kaydettiklerimi getir</button><button type="button" class="secondary" data-wp98-clear ${selected.size?'':'disabled'}>Seçimi temizle</button><button type="button" class="primary" data-wp98-create-session ${selected.size?'':'disabled'}>${activeHere?'Aktif sete dön':'Seçilenlerle çalış'}</button></div>
    ${activeHere?`<div class="wp98-active-note"><span>✓</span><div><b>Bu hikâyenin ${active.ids.length} kelimelik seti aktif.</b><small>Menüye dönmeden Smart Word Session rotasına devam edebilirsin.</small></div><button type="button" class="soft" data-wp97-open>Oturumu aç</button></div>`:''}
  </section>`;
}
function wp98LabProgress(story=v5Story){const id=wp98StoryId(story),root=wp98Ensure().lab;return root[id]||(root[id]={shadowed:[],puzzleCorrect:0,matchCorrect:0,visits:0})}
function wp98CurrentLine(story=v5Story){const lines=story?.lines||[];if(!lines.length)return null;wp98Lab.index=Math.max(0,Math.min(lines.length-1,Number(wp98Lab.index)||0));return lines[wp98Lab.index]}
function wp98DeterministicOrder(tokens,seed=''){
  const indexed=tokens.map((_,i)=>i);indexed.sort((a,b)=>wp94Hash(`${seed}:${tokens[a]}:${a}`)-wp94Hash(`${seed}:${tokens[b]}:${b}`));if(indexed.every((x,i)=>x===i)&&indexed.length>1)indexed.push(indexed.shift());return indexed
}
function wp98LabModeButtons(){return `<div class="wp98-lab-tabs"><button type="button" data-wp98-lab-mode="shadow" class="${wp98Lab.mode==='shadow'?'active':''}">🔊 Dinle & gölgele</button><button type="button" data-wp98-lab-mode="puzzle" class="${wp98Lab.mode==='puzzle'?'active':''}">🔢 Çeviri yapbozu</button><button type="button" data-wp98-lab-mode="match" class="${wp98Lab.mode==='match'?'active':''}">🎯 Cümleyi bul</button></div>`}
function wp98ShadowHtml(story,line,progress){const done=progress.shadowed.includes(wp98Lab.index);return `<div class="wp98-lab-card"><small>CÜMLE ${wp98Lab.index+1} / ${story.lines.length}</small><p class="wp98-target-sentence">${esc(line.text)}</p><p id="wp98ShadowTranslation" class="wp98-line-translation" hidden>${esc(line.translation||'')}</p><div class="wp98-lab-actions"><button type="button" class="secondary" data-wp98-speak-line>🔊 Dinle</button><button type="button" class="secondary" data-wp98-show-translation>TR çeviriyi göster</button><button type="button" class="primary" data-wp98-shadow-done>${done?'✓ Tekrar edildi':'Sesli tekrar ettim'}</button></div><p class="wp98-lab-help">Önce dinle, ardından cümleyi aynı ritim ve vurguya yakın biçimde sesli tekrar et. Bu bölüm mikrofonla puan vermez; dürüst öz değerlendirme kaydı tutar.</p></div>`}
function wp98PuzzleHtml(story,line){
  const tokens=String(line.text||'').split(/\s+/).filter(Boolean);if(wp98Lab.storyId!==story.id||wp98Lab.mode!=='puzzle'||wp98Lab.order.length!==tokens.length){wp98Lab.answer=[];wp98Lab.order=wp98DeterministicOrder(tokens,`${story.id}:${wp98Lab.index}`);wp98Lab.answered=false}
  return `<div class="wp98-lab-card"><small>ÇEVİRİ YAPBOZU · ${wp98Lab.index+1} / ${story.lines.length}</small><h4>${esc(line.translation||'Cümleyi doğru sıraya koy.')}</h4><div id="wp98PuzzleAnswer" class="wp98-puzzle-answer">${wp98Lab.answer.length?wp98Lab.answer.map((tokenIndex,i)=>`<button type="button" data-wp98-puzzle-remove="${i}">${esc(tokens[tokenIndex])}</button>`).join(''):'<span>Numaralı parçalara dokun…</span>'}</div><div class="wp98-puzzle-bank">${wp98Lab.order.map((tokenIndex,i)=>`<button type="button" data-wp98-puzzle-token="${tokenIndex}" ${wp98Lab.answer.includes(tokenIndex)?'disabled':''}><small>${i+1}</small>${esc(tokens[tokenIndex])}</button>`).join('')}</div><div class="wp98-lab-actions"><button type="button" class="secondary" data-wp98-puzzle-undo>Son parçayı geri al</button><button type="button" class="primary" data-wp98-puzzle-check>Kontrol et</button></div><p id="wp98LabFeedback" class="feedback"></p></div>`
}
function wp98MatchOptions(story,index){
  const lines=story.lines||[],correct=lines[index]?.text||'';const pool=lines.map((x,i)=>({text:x.text,index:i})).filter(x=>x.index!==index).sort((a,b)=>wp94Hash(`${story.id}:${index}:${a.index}`)-wp94Hash(`${story.id}:${index}:${b.index}`)).slice(0,2);
  return [{text:correct,index},...pool].sort((a,b)=>wp94Hash(`${story.id}:match:${index}:${a.text}`)-wp94Hash(`${story.id}:match:${index}:${b.text}`));
}
function wp98MatchHtml(story,line){return `<div class="wp98-lab-card"><small>CÜMLEYİ BUL · ${wp98Lab.index+1} / ${story.lines.length}</small><h4>${esc(line.translation||'Doğru İngilizce cümleyi seç.')}</h4><div class="wp98-match-options">${wp98MatchOptions(story,wp98Lab.index).map(x=>`<button type="button" data-wp98-match="${x.index}" ${wp98Lab.answered?'disabled':''}>${esc(x.text)}</button>`).join('')}</div><p id="wp98LabFeedback" class="feedback"></p></div>`}
function wp98SentenceLabHtml(story=v5Story){
  if(!story?.lines?.length)return'';if(wp98Lab.storyId!==story.id){wp98Lab={storyId:story.id,mode:'shadow',index:0,answer:[],order:[],answered:false};wp98LabProgress(story).visits=(Number(wp98LabProgress(story).visits)||0)+1;v5Save()}
  const line=wp98CurrentLine(story),progress=wp98LabProgress(story),body=wp98Lab.mode==='puzzle'?wp98PuzzleHtml(story,line):wp98Lab.mode==='match'?wp98MatchHtml(story,line):wp98ShadowHtml(story,line,progress);
  return `<section id="wp98SentenceLab" class="wp98-sentence-lab"><div class="wp98-lab-head"><div><p class="eyebrow">READER PRO · CÜMLE LABORATUVARI</p><h3>Hikâyeyi sadece okuma; cümleleri üret</h3><p>Dinleme, gölgeleme, Türkçeden cümle kurma ve anlam eşleştirme aynı metin üzerinde ilerler.</p></div><div class="wp98-lab-score"><b>${progress.shadowed.length}</b><span>gölgelenen</span></div></div>${wp98LabModeButtons()}<div id="wp98LabBody">${body}</div><footer class="wp98-lab-nav"><button type="button" class="secondary" data-wp98-lab-prev ${wp98Lab.index===0?'disabled':''}>← Önceki</button><span>${wp98Lab.index+1} / ${story.lines.length}</span><button type="button" class="secondary" data-wp98-lab-next ${wp98Lab.index>=story.lines.length-1?'disabled':''}>Sonraki →</button></footer></section>`;
}
function wp98RenderBridge(story=v5Story){const old=document.querySelector('#wp98ReaderBridge');if(old)old.outerHTML=wp98BridgeHtml(story)}
function wp98RenderLab(story=v5Story){const old=document.querySelector('#wp98SentenceLab');if(old)old.outerHTML=wp98SentenceLabHtml(story)}
function wp98RefreshReader(story=v5Story){wp98RenderBridge(story);wp98RenderLab(story);wp98EnhanceLibrary();wp98ApplyVersion()}
function wp98DecorateReader(story=v5Story){
  const reader=document.querySelector('#storyReader');if(!reader||!story)return;const questions=reader.querySelector('.wp64-story-questions');
  if(questions&&!reader.querySelector('#wp98ReaderBridge'))questions.insertAdjacentHTML('beforebegin',wp98BridgeHtml(story));
  if(questions&&!reader.querySelector('#wp98SentenceLab'))questions.insertAdjacentHTML('beforebegin',wp98SentenceLabHtml(story));
  const chip=reader.querySelector('.wp64-reader-head .chip');if(chip)chip.textContent=`${story.level} · Reader Pro`;
  const tip=reader.querySelector('.wp64-reader-tip');if(tip)tip.innerHTML='Kelimeye dokun, anlamını dinle ve <b>Reader setine ekle</b>. Sonra aynı kelimelerle Smart Word Session oyunlarına veya cümle laboratuvarına geç.';
  wp98ApplyVersion();
}
function wp98EnhanceLibrary(){
  document.querySelectorAll('.wp64-story-card').forEach(card=>{const st=v5Stories.find(x=>x.id===card.dataset.storyId);if(!st)return;const small=card.querySelector('small'),available=wp98StoryRows(st).length,selected=wp98Selection(st).length;if(small&&!small.dataset.wp98){small.dataset.wp98='1';small.insertAdjacentHTML('beforeend',` · <span class="wp98-card-words">${available} çalışma kelimesi</span>`)}card.classList.toggle('wp98-has-set',selected>0);let badge=card.querySelector('.wp98-card-badge');if(selected&&!badge){card.insertAdjacentHTML('beforeend',`<span class="wp98-card-badge">${selected} kelime seçili</span>`)}else if(badge){if(selected)badge.textContent=`${selected} kelime seçili`;else badge.remove()}})
}
function wp98UpdatePopupButton(){
  const popup=document.querySelector('#wp64WordPopup'),c=wp64Ui?.wordContext,row=c?.row;if(!popup||!row||!Number.isFinite(Number(row.id)))return;const selected=wp98Selection().includes(Number(row.id)),btn=popup.querySelector('[data-wp98-popup-word]');if(btn){btn.classList.toggle('selected',selected);btn.textContent=selected?'✓ Reader setinde':'＋ Reader setine ekle'}
}
function wp98DecoratePopup(){
  const popup=document.querySelector('#wp64WordPopup'),c=wp64Ui?.wordContext,row=c?.row;if(!popup||!row||!Number.isFinite(Number(row.id)))return;const actions=popup.querySelector('div:last-child');if(actions&&!actions.querySelector('[data-wp98-popup-word]'))actions.insertAdjacentHTML('beforeend',`<button type="button" class="soft" data-wp98-popup-word="${row.id}">＋ Reader setine ekle</button>`);wp98UpdatePopupButton()
}
function wp98CompletionRoute(story=v5Story){
  const fb=document.querySelector('#storyFeedback');if(!fb||!story)return;document.querySelector('.wp98-completion-route')?.remove();const selected=wp98Selection(story),suggested=wp98Suggestion(story,5);
  fb.insertAdjacentHTML('afterend',`<section class="wp98-completion-route"><div><span>✓</span><div><b>Bu hikâyeyle devam et</b><small>Okuma bitti; şimdi kelimeleri aktif kullanıma geçir.</small></div></div><div><button type="button" class="secondary" data-wp98-lab-scroll>Cümle laboratuvarı</button><button type="button" class="secondary" data-wp94-open-report>Okuma raporu</button><button type="button" class="primary" data-wp98-auto-session>${selected.length?`${selected.length} seçili kelimeyle çalış`:`${suggested.length} kelime öner ve çalış`}</button></div></section>`)
}
function wp98DecorateReport(){
  const body=document.querySelector('#wp94ReportBody'),actions=body?.querySelector('.wp94-report-actions');if(!body||!actions)return;const p=body.querySelector('.eyebrow');if(p)p.textContent='READER PRO OKUMA RAPORU';if(!actions.querySelector('[data-wp98-auto-session]'))actions.insertAdjacentHTML('afterbegin','<button type="button" class="secondary" data-wp98-auto-session>Hikâyeden kelime seti oluştur</button>')
}
function wp98LabSetIndex(index){const max=Math.max(0,(v5Story?.lines?.length||1)-1);wp98Lab.index=Math.max(0,Math.min(max,Number(index)||0));wp98Lab.answer=[];wp98Lab.order=[];wp98Lab.answered=false;wp98RenderLab()}
function wp98LabSetMode(mode){wp98Lab.mode=['shadow','puzzle','match'].includes(mode)?mode:'shadow';wp98Lab.answer=[];wp98Lab.order=[];wp98Lab.answered=false;wp98RenderLab()}
function wp98PuzzleRefresh(){
  const line=wp98CurrentLine(),tokens=String(line?.text||'').split(/\s+/).filter(Boolean),box=document.querySelector('#wp98PuzzleAnswer');if(!box)return;box.innerHTML=wp98Lab.answer.length?wp98Lab.answer.map((tokenIndex,i)=>`<button type="button" data-wp98-puzzle-remove="${i}">${esc(tokens[tokenIndex])}</button>`).join(''):'<span>Numaralı parçalara dokun…</span>';document.querySelectorAll('[data-wp98-puzzle-token]').forEach(btn=>btn.disabled=wp98Lab.answer.includes(Number(btn.dataset.wp98PuzzleToken)))
}
function wp98CheckPuzzle(){
  const line=wp98CurrentLine(),tokens=String(line?.text||'').split(/\s+/).filter(Boolean),built=wp98Lab.answer.map(i=>tokens[i]).join(' '),ok=normalizeAnswer(built)===normalizeAnswer(tokens.join(' ')),fb=document.querySelector('#wp98LabFeedback');
  if(ok){wp98Lab.answered=true;wp98LabProgress().puzzleCorrect=(Number(wp98LabProgress().puzzleCorrect)||0)+1;v5Save();if(fb){fb.className='feedback good';fb.textContent='Doğru cümle ✓'}adjustPoints(4)}else if(fb){fb.className='feedback bad';fb.textContent='Sıra henüz doğru değil. Parçaları yeniden düzenle.'}
}
function wp98AnswerMatch(index,button){
  if(wp98Lab.answered)return;wp98Lab.answered=true;const ok=Number(index)===wp98Lab.index,fb=document.querySelector('#wp98LabFeedback');document.querySelectorAll('[data-wp98-match]').forEach(btn=>{btn.disabled=true;btn.classList.toggle('correct',Number(btn.dataset.wp98Match)===wp98Lab.index)});button.classList.toggle('wrong',!ok);if(ok){wp98LabProgress().matchCorrect=(Number(wp98LabProgress().matchCorrect)||0)+1;adjustPoints(4)}v5Save();if(fb){fb.className=`feedback ${ok?'good':'bad'}`;fb.textContent=ok?'Doğru cümleyi buldun ✓':'Doğru cümle yeşil olarak gösterildi.'}
}
function wp98MarkShadow(){const p=wp98LabProgress(),i=wp98Lab.index;if(!p.shadowed.includes(i)){p.shadowed.push(i);p.shadowed.sort((a,b)=>a-b);adjustPoints(2);v5Save();toast('Cümle gölgeleme kaydına eklendi.')}wp98RenderLab()}

const wp98RenderStoryReaderBase=renderStoryReader;
renderStoryReader=function(story){const out=wp98RenderStoryReaderBase(story);wp98DecorateReader(story);return out};
const wp98RenderStoryLibraryBase=renderStoryLibrary;
renderStoryLibrary=async function(...args){const out=await wp98RenderStoryLibraryBase(...args);wp98EnhanceLibrary();wp98ApplyVersion();return out};
const wp98ShowWordPopupBase=wp64ShowWordPopup;
wp64ShowWordPopup=function(btn){const out=wp98ShowWordPopupBase(btn);wp98DecoratePopup();return out};
const wp98CheckStoryBase=v5CheckStory;
v5CheckStory=function(){const out=wp98CheckStoryBase();setTimeout(()=>wp98CompletionRoute(v5Story),120);return out};
const wp98OpenReportBase=wp94OpenReport;
wp94OpenReport=function(){const out=wp98OpenReportBase();wp98DecorateReport();return out};

function wp98ApplyVersion(){
  document.documentElement.dataset.wpVersion=WP98_VERSION;const title='WordPilot 9.8.0 · Reader Pro · Smart Word Session';if(document.title!==title)document.title=title;
  document.querySelectorAll('.version').forEach(node=>{if(node.textContent!==WP98_LABEL)node.textContent=WP98_LABEL});
  const meta=document.querySelector('meta[name="description"]'),description='WordPilot v9.8.0 Reader Pro — hikâyeden akıllı kelime seti, cümle laboratuvarı, gölgeleme, çeviri yapbozu ve Smart Word Session bağlantısı.';if(meta&&meta.content!==description)meta.content=description;
  const tab=document.querySelector('[data-dashboard-tab="stories"] small');if(tab)tab.textContent='Reader Pro';
  const feature=document.querySelector('.v5-feature-card.stories');if(feature){const b=feature.querySelector('b'),s=feature.querySelector('small');if(b)b.textContent='Reader Pro';if(s)s.textContent='114 metin · akıllı kelime seti · cümle laboratuvarı · okuma raporu'}
  const section=document.querySelector('#view-stories .section-title');if(section){const e=section.querySelector('.eyebrow'),h=section.querySelector('h1'),p=section.querySelector('.muted');if(e)e.textContent='READER PRO · A1–C2';if(h)h.textContent='WordPilot Reader Pro';if(p)p.textContent='Oku, dinle, hikâyeden kelime seti oluştur ve aynı cümleleri aktif üretim oyunlarıyla pekiştir.'}
  const toolbar=document.querySelector('#wp64ReaderToolbar');if(toolbar){const e=toolbar.querySelector('.eyebrow'),h=toolbar.querySelector('h2'),s=toolbar.querySelector('.wp64-reader-title small');if(e)e.textContent='WORDPILOT READER PRO';if(h)h.textContent='A1–C2 bağlantılı okuma kütüphanesi';if(s)s.textContent='Oku · kelime seç · cümleyi üret · Smart Word Session ile devam et'}
}
function wp98InstallVersionLocks(){
  const names=['wp81ApplyBrand','wp82ApplyBrand','wp90ApplyVersionLock','wp91ApplyTruth','wp92Apply','wp93Apply','wp94ApplyVersion','wp95Apply','wp96Apply','wp97ApplyVersion'];
  names.forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.wp98)return;const wrapped=function(...args){const out=fn.apply(this,args);wp98ApplyVersion();return out};wrapped.wp98=true;window[name]=wrapped});
}
function setupV98Events(){
  if(setupV98Events.done)return;setupV98Events.done=true;
  document.addEventListener('click',e=>{
    const word=e.target.closest('[data-wp98-word-id]');if(word){wp98ToggleWord(word.dataset.wp98WordId);return}
    const popup=e.target.closest('[data-wp98-popup-word]');if(popup){wp98ToggleWord(popup.dataset.wp98PopupWord);return}
    if(e.target.closest('[data-wp98-suggest]')){const ids=wp98Suggestion(v5Story,5);wp98SaveSelection(ids);toast(`${ids.length} kelime kullanım ve tekrar ihtiyacına göre önerildi.`);return}
    if(e.target.closest('[data-wp98-import-saved]')){wp98ImportSaved();return}
    if(e.target.closest('[data-wp98-clear]')){wp98SaveSelection([]);return}
    if(e.target.closest('[data-wp98-create-session]')){const active=wp97ActiveSet();if(active?.sourceStoryId===v5Story?.id){wp97OpenHub()}else wp98CreateSmartSet(wp98Selection());return}
    if(e.target.closest('[data-wp98-auto-session]')){wp98CreateSuggestedSet();return}
    if(e.target.closest('[data-wp98-lab-scroll]')){document.querySelector('#wp98SentenceLab')?.scrollIntoView({behavior:'smooth',block:'start'});return}
    const mode=e.target.closest('[data-wp98-lab-mode]');if(mode){wp98LabSetMode(mode.dataset.wp98LabMode);return}
    if(e.target.closest('[data-wp98-lab-prev]')){wp98LabSetIndex(wp98Lab.index-1);return}
    if(e.target.closest('[data-wp98-lab-next]')){wp98LabSetIndex(wp98Lab.index+1);return}
    if(e.target.closest('[data-wp98-speak-line]')){const line=wp98CurrentLine();if(line)speak(line.text,COURSES[activeCourse]?.voice);return}
    if(e.target.closest('[data-wp98-show-translation]')){const tr=document.querySelector('#wp98ShadowTranslation');if(tr){tr.hidden=!tr.hidden;e.target.closest('button').textContent=tr.hidden?'TR çeviriyi göster':'TR çeviriyi gizle'}return}
    if(e.target.closest('[data-wp98-shadow-done]')){wp98MarkShadow();return}
    const token=e.target.closest('[data-wp98-puzzle-token]');if(token&&!wp98Lab.answered){wp98Lab.answer.push(Number(token.dataset.wp98PuzzleToken));wp98PuzzleRefresh();return}
    const remove=e.target.closest('[data-wp98-puzzle-remove]');if(remove&&!wp98Lab.answered){wp98Lab.answer.splice(Number(remove.dataset.wp98PuzzleRemove),1);wp98PuzzleRefresh();return}
    if(e.target.closest('[data-wp98-puzzle-undo]')&&!wp98Lab.answered){wp98Lab.answer.pop();wp98PuzzleRefresh();return}
    if(e.target.closest('[data-wp98-puzzle-check]')){wp98CheckPuzzle();return}
    const match=e.target.closest('[data-wp98-match]');if(match){wp98AnswerMatch(match.dataset.wp98Match,match);return}
  },true)
}
function wp98AfterInit(){
  setupV98Events();wp98InstallVersionLocks();wp98ApplyVersion();if(document.querySelector('#view-stories')?.classList.contains('active'))renderStoryLibrary();
  if(wp98Observer)wp98Observer.disconnect();wp98Observer=new MutationObserver(()=>{clearTimeout(wp98Observer._t);wp98Observer._t=setTimeout(()=>{wp98InstallVersionLocks();wp98ApplyVersion()},160)});wp98Observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{wp98InstallVersionLocks();wp98ApplyVersion()},700);setTimeout(()=>{wp98InstallVersionLocks();wp98ApplyVersion()},1600)
}
