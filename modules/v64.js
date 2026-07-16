/* WordPilot v6.4.0 — Reader 2.0: graded library, tap dictionary, sentence translation, guided TTS and story-word SM-2. */
const WP64_VERSION='6.4.0';
const WP64_LEVELS=['A1','A2','B1','B2','C1','C2'];
const WP64_LEVEL_XP={A1:30,A2:40,B1:55,B2:70,C1:90,C2:110};
const wp64Ui={level:'all',genre:'all',query:'',showAllTranslations:false,activeLine:-1,speaking:false,paused:false,observer:null,dictMap:null,dictCourse:'',wordContext:null};

function wp64Ensure(){
  const v5=v5Ensure(),r=v5.reader64=v5.reader64&&typeof v5.reader64==='object'?v5.reader64:{};
  r.progress=r.progress&&typeof r.progress==='object'?r.progress:{};
  r.storyWords=r.storyWords&&typeof r.storyWords==='object'?r.storyWords:{en:{},ru:{},uz:{}};
  COURSE_IDS.forEach(id=>{r.storyWords[id]=r.storyWords[id]&&typeof r.storyWords[id]==='object'?r.storyWords[id]:{}});
  r.preferences=r.preferences&&typeof r.preferences==='object'?r.preferences:{};
  return r;
}
function wp64CourseWords(course=activeCourse){return wp64Ensure().storyWords[course]||(wp64Ensure().storyWords[course]={})}
function wp64StoryState(id=v5Story?.id){if(!id)return{};const r=wp64Ensure();return r.progress[id]||(r.progress[id]={lastLine:0,percent:0,updatedAt:''})}
function wp64Normalize(value=''){return v5StripStress(String(value||'')).normalize('NFKC').toLocaleLowerCase(activeCourse==='ru'?'ru-RU':'en-US').replace(/[’‘`]/g,"'").replace(/[^\p{L}\p{M}'-]+/gu,'').trim()}
function wp64Meaning(row){return firstMeaning(row)||row?.meaningTr||row?.translation||'Anlam henüz eklenmedi'}
function wp64Reading(row){return row?.reading||row?.pronunciation||row?.stress||''}
function wp64BuildDictionary(){
  if(wp64Ui.dictMap&&wp64Ui.dictCourse===activeCourse)return wp64Ui.dictMap;
  const map=new Map();
  (words||[]).forEach(row=>{
    const keys=[row?.english,row?.word,row?.stress].filter(Boolean);
    keys.forEach(k=>{const n=wp64Normalize(k);if(n&&!map.has(n))map.set(n,row)});
  });
  wp64Ui.dictMap=map;wp64Ui.dictCourse=activeCourse;return map;
}
function wp64Lookup(raw){
  const map=wp64BuildDictionary(),n=wp64Normalize(raw);if(!n)return null;if(map.has(n))return map.get(n);
  const candidates=[];
  if(activeCourse==='en'){
    if(n.endsWith('ies'))candidates.push(n.slice(0,-3)+'y');
    if(n.endsWith('ing'))candidates.push(n.slice(0,-3),n.slice(0,-3)+'e');
    if(n.endsWith('ed'))candidates.push(n.slice(0,-2),n.slice(0,-1));
    if(n.endsWith('es'))candidates.push(n.slice(0,-2),n.slice(0,-1));
    if(n.endsWith('s'))candidates.push(n.slice(0,-1));
    if(n.endsWith('ly'))candidates.push(n.slice(0,-2));
  }else if(activeCourse==='ru'){
    const endings=['иями','ами','ями','ого','ему','ому','ыми','ими','ов','ев','ей','ах','ях','ом','ем','ую','юю','ая','яя','ое','ее','ые','ие','ы','и','а','я','у','ю','е'];
    endings.forEach(end=>{if(n.length>end.length+2&&n.endsWith(end))candidates.push(n.slice(0,-end.length))});
    if(n.endsWith('лся'))candidates.push(n.slice(0,-3)+'ться',n.slice(0,-3)+'ть');
    if(n.endsWith('ла')||n.endsWith('ли'))candidates.push(n.slice(0,-2)+'ть');
  }
  for(const c of candidates){if(map.has(c))return map.get(c);for(const [key,row] of map){if(key.startsWith(c)&&Math.abs(key.length-c.length)<=4)return row}}
  return null;
}
function wp64WordHtml(text,lineIndex){
  const parts=String(text||'').split(/([\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*)/gu);
  return parts.map((part,i)=>i%2?`<button type="button" class="wp64-word" data-wp64-word="${esc(part)}" data-wp64-line="${lineIndex}">${esc(part)}</button>`:esc(part)).join('');
}
function wp64Genres(list=v5CourseStories()){return [...new Set(list.map(x=>x.genre||x.topic||'Genel'))].sort((a,b)=>a.localeCompare(b,'tr'))}
function wp64FilteredStories(){
  const q=wp64Ui.query.toLocaleLowerCase('tr-TR');
  return v5CourseStories().filter(st=>(wp64Ui.level==='all'||st.level===wp64Ui.level)&&(wp64Ui.genre==='all'||(st.genre||st.topic||'Genel')===wp64Ui.genre)&&(!q||`${st.title} ${st.titleTr||''} ${st.genre||''} ${st.topic||''}`.toLocaleLowerCase('tr-TR').includes(q)))
    .sort((a,b)=>WP64_LEVELS.indexOf(a.level)-WP64_LEVELS.indexOf(b.level)||String(a.title).localeCompare(String(b.title),activeCourse==='ru'?'ru':'en'));
}
function wp64EnsureToolbar(){
  const view=$('#view-stories'),layout=view?.querySelector('.story-layout');if(!view||!layout)return;
  if(!$('#wp64ReaderToolbar'))layout.insertAdjacentHTML('beforebegin',`<section id="wp64ReaderToolbar" class="panel wp64-reader-toolbar">
    <div class="wp64-reader-title"><span>📚</span><div><p class="eyebrow">WORDPILOT READER 2.0</p><h2>A1–C2 derecelendirilmiş kütüphane</h2><small>Kelimeye dokun · cümleyi çevir · dinle · kaldığın yerden devam et</small></div></div>
    <div id="wp64LevelTabs" class="wp64-level-tabs"></div>
    <div class="wp64-reader-controls"><label>Tür<select id="wp64GenreFilter"></select></label><label class="wp64-search">Hikâye ara<input id="wp64StorySearch" type="search" placeholder="Başlık veya tür"></label><button id="wp64OpenWordList" type="button" class="secondary">🧠 Hikâye kelimelerim <b id="wp64SavedWordCount">0</b></button></div>
    <div class="wp64-library-summary"><span id="wp64StoryCount">0 hikâye</span><span id="wp64LevelSummary">A1–C2</span><span id="wp64TotalWords">0 kelime</span></div>
  </section>`);
  if(!$('#wp64WordPopup'))document.body.insertAdjacentHTML('beforeend',`<div id="wp64WordPopup" class="wp64-word-popup" hidden></div>
  <dialog id="wp64WordDialog" class="modal wp64-word-dialog"><button class="sheet-close" data-close="wp64WordDialog">×</button><p class="eyebrow">HİKÂYEDEN ÖĞRENDİKLERİM</p><h2>Hikâye kelime listem</h2><div id="wp64DueSummary" class="wp64-due-summary"></div><div id="wp64WordReviewList" class="wp64-review-list"></div></dialog>`);
}
function wp64RenderToolbar(){
  wp64EnsureToolbar();const list=v5CourseStories(),genres=wp64Genres(list),saved=Object.keys(wp64CourseWords()).length,filtered=wp64FilteredStories();
  $('#wp64LevelTabs').innerHTML=['all',...WP64_LEVELS].map(l=>`<button type="button" class="${wp64Ui.level===l?'active':''}" data-wp64-level="${l}">${l==='all'?'Tümü':l}<small>${l==='all'?list.length:list.filter(x=>x.level===l).length}</small></button>`).join('');
  $('#wp64GenreFilter').innerHTML=`<option value="all">Tüm türler</option>${genres.map(g=>`<option value="${esc(g)}" ${wp64Ui.genre===g?'selected':''}>${esc(g)}</option>`).join('')}`;
  $('#wp64StorySearch').value=wp64Ui.query;$('#wp64SavedWordCount').textContent=saved;$('#wp64StoryCount').textContent=`${filtered.length} hikâye`;
  $('#wp64LevelSummary').textContent=wp64Ui.level==='all'?'A1–C2':wp64Ui.level;$('#wp64TotalWords').textContent=`${filtered.reduce((s,x)=>s+Number(x.wordCount||String(x.lines?.map(l=>l.text).join(' ')).split(/\s+/).length),0).toLocaleString('tr-TR')} kelime`;
}
function wp64CardProgress(st){
  const old=v5Ensure().stories?.[st.id],p=wp64Ensure().progress?.[st.id]||{},pct=old?.completed?100:Math.max(0,Math.min(99,Number(p.percent)||0));
  return {completed:!!old?.completed,pct,lastLine:Number(p.lastLine)||0};
}
async function renderStoryLibrary(){
  try{await v5LoadStories()}catch{if($('#storyList'))$('#storyList').innerHTML='<p class="muted">Hikâyeler yüklenemedi.</p>';return}
  wp64EnsureToolbar();wp64RenderToolbar();const meta=COURSES[activeCourse],list=wp64FilteredStories(),progress=v5StoryProgress();
  $('#storyCourseTitle').textContent=`${meta.name} Reader`;$('#storyProgressText').textContent=`${progress.done} / ${progress.total} tamamlandı`;
  $('#storyList').innerHTML=list.map(st=>{const p=wp64CardProgress(st),words=Number(st.wordCount)||0;return `<button type="button" class="story-list-item wp64-story-card ${v5Story?.id===st.id?'active':''} ${p.completed?'done':''}" data-story-id="${esc(st.id)}">
    <span>${p.completed?'✓':esc(st.emoji||'📖')}</span><div><b>${esc(st.title)}</b>${st.titleTr?`<em>${esc(st.titleTr)}</em>`:''}<small>${esc(st.level)} · ${esc(st.genre||st.topic||'Okuma')} · ${words?words.toLocaleString('tr-TR')+' kelime':'kısa metin'} · ${st.readMinutes||2} dk</small><i><u style="width:${p.pct}%"></u></i></div><strong>${p.completed?'Tamamlandı':p.pct?`%${p.pct}`:'Başla'} →</strong></button>`}).join('')||'<div class="story-empty"><span>🔎</span><h2>Bu filtrede hikâye yok</h2><p>Seviye, tür veya arama seçimini değiştir.</p></div>';
  if(v5Story&&v5Story.course===activeCourse&&list.some(x=>x.id===v5Story.id))renderStoryReader(v5Story);else $('#storyReader').innerHTML='<div class="story-empty"><span>📖</span><h2>Bir hikâye seç</h2><p>Kelimeye dokunabilir, cümleyi çevirebilir, metni dinleyebilir ve kaldığın yerden devam edebilirsin.</p></div>';
}
function wp64StoryMeta(story){
  const p=wp64CardProgress(story);return `<div class="wp64-story-meta"><span>${esc(story.emoji||'📖')} ${esc(story.genre||story.topic||'Okuma')}</span><span>${esc(story.level)}</span><span>${Number(story.wordCount||0).toLocaleString('tr-TR')} kelime</span><span>≈ ${story.readMinutes||2} dk</span><span>${p.completed?'✓ Tamamlandı':p.pct?`%${p.pct} okundu`:'Yeni'}</span></div>`;
}
function wp64RenderChapters(story){
  const chapters=Array.isArray(story.chapters)&&story.chapters.length?story.chapters:[{title:'Metin',startLine:0,endLine:story.lines.length}];
  let html='';
  chapters.forEach((ch,ci)=>{html+=`<section class="wp64-chapter" data-wp64-chapter="${ci}"><h3><span>${ci+1}</span>${esc(ch.title||`Bölüm ${ci+1}`)}</h3>`;
    for(let i=Number(ch.startLine)||0;i<Math.min(story.lines.length,Number(ch.endLine)||story.lines.length);i++){const line=story.lines[i];html+=`<article class="wp64-story-line" data-wp64-line-index="${i}"><div class="wp64-line-actions"><button type="button" data-story-line-speak="${i}" title="Cümleyi dinle">🔊</button><button type="button" data-wp64-line-translation="${i}" aria-pressed="false" title="Cümleyi çevir">TR</button></div><div><p>${wp64WordHtml(line.text,i)}</p><small class="story-translation" data-wp64-translation="${i}" hidden>${esc(line.translation||'')}</small></div></article>`}
    html+='</section>';
  });return html;
}
function wp64StopReaderAudio(){
  if('speechSynthesis'in window)speechSynthesis.cancel();wp64Ui.speaking=false;wp64Ui.paused=false;wp64Ui.activeLine=-1;document.querySelectorAll('.wp64-story-line.is-reading').forEach(x=>x.classList.remove('is-reading'));wp64UpdateAudioButtons();
  v5StorySpeaking=false;v5StoryUtterance=null;v5UpdateStoryAudioButton?.();
}
function wp64UpdateAudioButtons(){
  const play=$('[data-wp64-play]'),pause=$('[data-wp64-pause]');if(play){play.textContent=wp64Ui.speaking?'⏹ Durdur':'▶ Baştan dinle';play.classList.toggle('is-speaking',wp64Ui.speaking)}
  if(pause){pause.hidden=!wp64Ui.speaking;pause.textContent=wp64Ui.paused?'▶ Devam':'⏸ Duraklat'}
}
function wp64SpeakLine(index,continueAll=false){
  if(!v5Story?.lines?.[index]){wp64StopReaderAudio();return}
  document.querySelectorAll('.wp64-story-line.is-reading').forEach(x=>x.classList.remove('is-reading'));const row=document.querySelector(`[data-wp64-line-index="${index}"]`);row?.classList.add('is-reading');if(continueAll)row?.scrollIntoView({behavior:'smooth',block:'center'});
  wp64Ui.activeLine=index;wp64Ui.speaking=continueAll;wp64Ui.paused=false;wp64UpdateAudioButtons();
  const utterance=speak(v5Story.lines[index].text);if(!utterance){wp64StopReaderAudio();return}
  utterance.onend=()=>{if(continueAll&&wp64Ui.speaking)wp64SpeakLine(index+1,true);else{row?.classList.remove('is-reading');if(!continueAll)wp64Ui.activeLine=-1}};
  utterance.onerror=()=>wp64StopReaderAudio();
}
function wp64StartFullAudio(from=0){if(wp64Ui.speaking){wp64StopReaderAudio();return}wp64Ui.speaking=true;wp64SpeakLine(Math.max(0,Number(from)||0),true)}
function wp64TogglePause(){if(!wp64Ui.speaking)return;if(wp64Ui.paused){speechSynthesis.resume();wp64Ui.paused=false}else{speechSynthesis.pause();wp64Ui.paused=true}wp64UpdateAudioButtons()}
function wp64ApplyTranslations(){
  document.querySelectorAll('[data-wp64-translation]').forEach(el=>{const own=el.dataset.open==='1';el.hidden=!(wp64Ui.showAllTranslations||own)});
  document.querySelectorAll('[data-wp64-line-translation]').forEach(btn=>{const open=wp64Ui.showAllTranslations||document.querySelector(`[data-wp64-translation="${btn.dataset.wp64LineTranslation}"]`)?.dataset.open==='1';btn.classList.toggle('active',open);btn.setAttribute('aria-pressed',String(open))});
  const all=$('[data-wp64-toggle-all]');if(all)all.textContent=wp64Ui.showAllTranslations?'Çevirileri kapat':'Tüm çevirileri aç';
}
function wp64InstallObserver(story){
  wp64Ui.observer?.disconnect();const rows=[...document.querySelectorAll('.wp64-story-line')];if(!rows.length)return;
  const total=rows.length;wp64Ui.observer=new IntersectionObserver(entries=>{
    entries.filter(e=>e.isIntersecting).forEach(entry=>{const index=Number(entry.target.dataset.wp64LineIndex)||0,p=wp64StoryState(story.id);if(index>=Number(p.lastLine||0)){p.lastLine=index;p.percent=Math.min(99,Math.round((index+1)/total*100));p.updatedAt=new Date().toISOString();const bar=$('#wp64ReadingFill'),txt=$('#wp64ReadingText');if(bar)bar.style.width=`${p.percent}%`;if(txt)txt.textContent=`%${p.percent}`;clearTimeout(wp64InstallObserver.t);wp64InstallObserver.t=setTimeout(()=>v5Save(),500)}})
  },{root:null,threshold:.55});rows.forEach(r=>wp64Ui.observer.observe(r));
}
function renderStoryReader(story){
  wp64StopReaderAudio();v5Story=story;v5StoryAnswers={};wp64Ui.showAllTranslations=false;const old=!!v5Ensure().stories?.[story.id]?.completed,p=wp64StoryState(story.id);
  $('#storyReader').innerHTML=`<div class="story-reader-head wp64-reader-head"><div><span class="chip">${esc(story.level)} · Reader 2.0</span><h2>${esc(story.title)}</h2>${story.titleTr?`<p class="wp64-title-tr">${esc(story.titleTr)}</p>`:''}${wp64StoryMeta(story)}</div><div><button class="secondary" type="button" data-wp64-play>▶ Baştan dinle</button><button class="secondary" type="button" data-wp64-pause hidden>⏸ Duraklat</button><button class="soft" type="button" data-wp64-toggle-all>Tüm çevirileri aç</button></div></div>
  <div class="wp64-reading-progress"><i><u id="wp64ReadingFill" style="width:${old?100:Number(p.percent)||0}%"></u></i><b id="wp64ReadingText">${old?'%100':`%${Number(p.percent)||0}`}</b>${Number(p.lastLine)>0&&!old?`<button type="button" data-wp64-resume="${Number(p.lastLine)}">Kaldığın yerden devam et →</button>`:''}</div>
  <p class="wp64-reader-tip">Bir kelimeye dokun: anlamını, okunuşunu ve bağlamını gör. Cümle yanındaki <b>TR</b> düğmesiyle yalnız o çeviriyi aç.</p>
  <div class="story-lines wp64-story-lines">${wp64RenderChapters(story)}</div>
  <section class="story-questions wp64-story-questions"><div><p class="eyebrow">OKUDUĞUNU ANLAMA</p><h3>Hikâye testi</h3><small>Başarı için en az %80 doğru cevap gerekir.</small></div>${story.questions.map((q,qi)=>`<article><b>${qi+1}. ${esc(q.q)}</b>${q.qTr?`<small>${esc(q.qTr)}</small>`:''}<div>${q.options.map((o,oi)=>`<button type="button" data-story-answer="${qi}:${oi}">${esc(o)}</button>`).join('')}</div></article>`).join('')}<button class="primary" type="button" data-story-check>Testi kontrol et</button><p id="storyFeedback">${old?'Bu hikâyeyi daha önce tamamladın.':''}</p></section>`;
  wp64ApplyTranslations();wp64UpdateAudioButtons();requestAnimationFrame(()=>wp64InstallObserver(story));renderStoryLibrary && wp64RenderToolbar();
}
function v5CheckStory(){
  if(!v5Story)return;let correct=0;v5Story.questions.forEach((q,i)=>{if(Number(v5StoryAnswers[i])===Number(q.answer))correct++});const total=v5Story.questions.length,ratio=total?correct/total:0,ok=ratio>=.8,already=!!v5Ensure().stories?.[v5Story.id]?.completed;
  document.querySelectorAll('[data-story-answer]').forEach(btn=>{const [q,o]=btn.dataset.storyAnswer.split(':').map(Number),selected=Number(v5StoryAnswers[q])===o,answer=Number(v5Story.questions[q].answer)===o;btn.classList.toggle('correct-answer',answer);btn.classList.toggle('wrong-answer',selected&&!answer);btn.disabled=true});
  $('#storyFeedback').textContent=`${correct} / ${total} doğru · %${Math.round(ratio*100)}${ok?' · Hikâye tamamlandı!':' · %80 için tekrar deneyebilirsin.'}`;
  if(ok){v5Ensure().stories[v5Story.id]={completed:true,score:correct,total,at:new Date().toISOString()};const p=wp64StoryState(v5Story.id);p.percent=100;p.lastLine=Math.max(0,v5Story.lines.length-1);p.completedAt=new Date().toISOString();if(!already)adjustPoints(WP64_LEVEL_XP[v5Story.level]||40);v5Save();setTimeout(()=>renderStoryLibrary(),500)}
}
function wp64ContextTranslation(lineIndex){return v5Story?.lines?.[Number(lineIndex)]?.translation||''}
function wp64ShowWordPopup(btn){
  const raw=btn.dataset.wp64Word,row=wp64Lookup(raw),line=Number(btn.dataset.wp64Line),meaning=row?wp64Meaning(row):'Sözlük kaydında henüz bulunamadı',reading=row?wp64Reading(row):'',context=wp64ContextTranslation(line);
  wp64Ui.wordContext={raw,row,line,meaning,reading,context,storyId:v5Story?.id||''};
  const popup=$('#wp64WordPopup');popup.innerHTML=`<button type="button" class="wp64-popup-close" data-wp64-popup-close>×</button><p class="eyebrow">${activeCourse==='ru'?'RUSÇA KELİME':'KELİME ANLAMI'}</p><h3>${esc(row?.stress||row?.english||raw)}</h3>${reading?`<p class="wp64-reading">${esc(reading)}</p>`:''}<strong>${esc(meaning)}</strong>${context?`<small><b>Bağlam:</b> ${esc(context)}</small>`:''}<div><button type="button" class="secondary" data-wp64-word-speak>🔊 Dinle</button><button type="button" class="primary" data-wp64-save-word>＋ Kelimelerime ekle</button></div>`;
  popup.hidden=false;const r=btn.getBoundingClientRect(),pw=Math.min(360,window.innerWidth-24);popup.style.width=`${pw}px`;popup.style.left=`${Math.max(12,Math.min(window.innerWidth-pw-12,r.left+r.width/2-pw/2))}px`;popup.style.top=`${Math.min(window.innerHeight-popup.offsetHeight-12,r.bottom+8)}px`;
}
function wp64ClosePopup(){const p=$('#wp64WordPopup');if(p)p.hidden=true;wp64Ui.wordContext=null}
function wp64SaveStoryWord(){
  const c=wp64Ui.wordContext;if(!c)return;const key=wp64Normalize(c.row?.english||c.raw),list=wp64CourseWords(),now=new Date().toISOString(),old=list[key]||{};
  list[key]={...old,key,word:c.row?.stress||c.row?.english||c.raw,base:c.row?.english||c.raw,meaning:c.meaning,reading:c.reading,context:c.context,storyId:c.storyId,addedAt:old.addedAt||now,ease:Number(old.ease)||2.5,intervalDays:Number(old.intervalDays)||0,repetitions:Number(old.repetitions)||0,dueAt:old.dueAt||now,lastGrade:old.lastGrade??null};
  v5Save();wp64RenderToolbar();toast('Kelime hikâye tekrar listene eklendi.');wp64ClosePopup();
}
function wp64DueWords(){const now=Date.now();return Object.values(wp64CourseWords()).sort((a,b)=>new Date(a.dueAt||0)-new Date(b.dueAt||0)).filter(x=>!x.dueAt||new Date(x.dueAt).getTime()<=now)}
function wp64GradeWord(key,quality){
  const item=wp64CourseWords()[key];if(!item)return;let ease=Math.max(1.3,Number(item.ease)||2.5),rep=Number(item.repetitions)||0,interval=Number(item.intervalDays)||0;
  if(quality<3){rep=0;interval=1}else{interval=rep===0?1:rep===1?6:Math.max(1,Math.round(interval*ease));rep++;ease=Math.max(1.3,ease+(0.1-(5-quality)*(0.08+(5-quality)*0.02)))}
  const due=new Date();due.setDate(due.getDate()+interval);Object.assign(item,{ease,intervalDays:interval,repetitions:rep,dueAt:due.toISOString(),lastGrade:quality,lastReviewedAt:new Date().toISOString()});v5Save();wp64RenderWordDialog();
}
function wp64RenderWordDialog(){
  const all=Object.values(wp64CourseWords()).sort((a,b)=>new Date(a.dueAt||0)-new Date(b.dueAt||0)),due=wp64DueWords();$('#wp64DueSummary').innerHTML=`<article><b>${all.length}</b><small>Kayıtlı kelime</small></article><article><b>${due.length}</b><small>Bugün tekrar</small></article><article><b>${all.filter(x=>Number(x.repetitions)>=3).length}</b><small>Kalıcılaşan</small></article>`;
  $('#wp64WordReviewList').innerHTML=all.map(x=>{const isDue=!x.dueAt||new Date(x.dueAt)<=new Date();return `<article class="${isDue?'due':''}"><div><b>${esc(x.word)}</b>${x.reading?`<em>${esc(x.reading)}</em>`:''}<strong>${esc(x.meaning)}</strong><small>${esc(x.context||'')}</small><time>${isDue?'Tekrar zamanı':`Sonraki: ${new Date(x.dueAt).toLocaleDateString('tr-TR')}`}</time></div><div><button type="button" data-wp64-review-speak="${esc(x.key)}">🔊</button><button type="button" data-wp64-grade="${esc(x.key)}:2">Zor</button><button type="button" data-wp64-grade="${esc(x.key)}:4">İyi</button><button type="button" data-wp64-grade="${esc(x.key)}:5">Kolay</button><button type="button" class="danger-link" data-wp64-remove="${esc(x.key)}">Sil</button></div></article>`}).join('')||'<div class="story-empty"><span>🧠</span><h2>Henüz kayıtlı kelime yok</h2><p>Bir hikâyede kelimeye dokunup “Kelimelerime ekle” düğmesini kullan.</p></div>';
}
function wp64AfterInit(){wp64EnsureToolbar();wp64RenderToolbar();if(v5Stories.length)renderV5DashboardHints()}
function setupV64Events(){
  wp64EnsureToolbar();
  document.addEventListener('click',e=>{
    const level=e.target.closest('[data-wp64-level]');if(level){wp64Ui.level=level.dataset.wp64Level;renderStoryLibrary();return}
    if(e.target.closest('#wp64OpenWordList')){wp64RenderWordDialog();$('#wp64WordDialog')?.showModal();return}
    const word=e.target.closest('[data-wp64-word]');if(word){e.stopPropagation();wp64ShowWordPopup(word);return}
    if(e.target.closest('[data-wp64-popup-close]')){wp64ClosePopup();return}
    if(e.target.closest('[data-wp64-word-speak]')){const c=wp64Ui.wordContext;if(c)speak(c.row?.english||c.raw);return}
    if(e.target.closest('[data-wp64-save-word]')){wp64SaveStoryWord();return}
    if(e.target.closest('[data-wp64-play]')){wp64StartFullAudio(0);return}
    if(e.target.closest('[data-wp64-pause]')){wp64TogglePause();return}
    const resume=e.target.closest('[data-wp64-resume]');if(resume){const i=Number(resume.dataset.wp64Resume)||0;document.querySelector(`[data-wp64-line-index="${i}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});return}
    const tr=e.target.closest('[data-wp64-line-translation]');if(tr){const item=document.querySelector(`[data-wp64-translation="${tr.dataset.wp64LineTranslation}"]`);if(item)item.dataset.open=item.dataset.open==='1'?'0':'1';wp64ApplyTranslations();return}
    if(e.target.closest('[data-wp64-toggle-all]')){wp64Ui.showAllTranslations=!wp64Ui.showAllTranslations;wp64ApplyTranslations();return}
    const grade=e.target.closest('[data-wp64-grade]');if(grade){const cut=grade.dataset.wp64Grade.lastIndexOf(':');wp64GradeWord(grade.dataset.wp64Grade.slice(0,cut),Number(grade.dataset.wp64Grade.slice(cut+1)));return}
    const remove=e.target.closest('[data-wp64-remove]');if(remove){delete wp64CourseWords()[remove.dataset.wp64Remove];v5Save();wp64RenderWordDialog();wp64RenderToolbar();return}
    const reviewSpeak=e.target.closest('[data-wp64-review-speak]');if(reviewSpeak){const x=wp64CourseWords()[reviewSpeak.dataset.wp64ReviewSpeak];if(x)speak(x.base||x.word);return}
    if(!e.target.closest('#wp64WordPopup'))wp64ClosePopup();
  },true);
  document.addEventListener('change',e=>{if(e.target.id==='wp64GenreFilter'){wp64Ui.genre=e.target.value;renderStoryLibrary()}});
  document.addEventListener('input',e=>{if(e.target.id==='wp64StorySearch'){clearTimeout(setupV64Events.searchTimer);setupV64Events.searchTimer=setTimeout(()=>{wp64Ui.query=e.target.value.trim();renderStoryLibrary()},220)}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)wp64StopReaderAudio()});
  window.addEventListener('popstate',wp64StopReaderAudio);
  const oldStop=window.v5StopStoryAudio;window.v5StopStoryAudio=function(){oldStop?.();wp64StopReaderAudio()};
  const oldUpdate=updateCourseUI;updateCourseUI=function(){oldUpdate();wp64Ui.dictMap=null;wp64Ui.dictCourse='';wp64Ui.genre='all';wp64Ui.query='';wp64ClosePopup();wp64StopReaderAudio();if($('#view-stories')?.classList.contains('active'))renderStoryLibrary();else wp64RenderToolbar()};
}
