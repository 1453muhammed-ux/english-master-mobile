/* WordPilot v9.4.0 — Reader 3.0: focus reading, richer dictionary, vocabulary practice, bookmarks and reading reports. */
const WP94_VERSION='9.4.0';
const WP94_STOP=new Set('a an the and or but if because as at by for from in into of on to with without is are was were be been being am do does did have has had it its this that these those i you he she we they me him her us them my your his our their not no yes can could may might must will would should than then very more most some any all each every who what when where why how'.split(' '));
const WP94_LEVEL_ORDER=['A1','A2','B1','B2','C1','C2'];
let wp94Lexicon=new Map(),wp94Aliases={},wp94AnalysisCache=new Map(),wp94Session=null,wp94LastElapsed={},wp94Timer=null,wp94StoryStatus='all',wp94StoryLength='all',wp94PracticeTab='vocabulary',wp94VocabAnswers={};

function wp94Ensure(){
  const v=v5Ensure(),r=v.reader94=v.reader94&&typeof v.reader94==='object'?v.reader94:{};
  r.preferences=r.preferences&&typeof r.preferences==='object'?r.preferences:{font:100,spacing:'normal',theme:'paper',focus:false};
  r.bookmarks=r.bookmarks&&typeof r.bookmarks==='object'?r.bookmarks:{};
  r.summaries=r.summaries&&typeof r.summaries==='object'?r.summaries:{};
  r.sessions=r.sessions&&typeof r.sessions==='object'?r.sessions:{};
  r.vocabResults=r.vocabResults&&typeof r.vocabResults==='object'?r.vocabResults:{};
  return r;
}
function wp94WordsOf(text=''){return String(text||'').match(/[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*/gu)||[]}
function wp94Simple(value=''){return String(value||'').normalize('NFKC').toLocaleLowerCase(activeCourse==='ru'?'ru-RU':'en-US').replace(/[’‘`]/g,"'").replace(/[^\p{L}\p{M}'-]+/gu,'').trim()}
function wp94Meaning(row){return row?firstMeaning(row)||row.meaningTr||row.meaning||row.translation||'Bağlam içinde inceleniyor':''}
function wp94CourseName(){return COURSES?.[activeCourse]?.name||activeCourse.toUpperCase()}
function wp94StoryWords(story=v5Story){return wp94WordsOf((story?.lines||[]).map(x=>x.text||'').join(' '))}
function wp94Hash(text=''){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

async function wp94LoadLexicon(){
  try{
    const data=await fetch(`reader_lexicon_v94.json?v=${WP94_VERSION}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
    wp94Lexicon=new Map((data.entries||[]).map(x=>[wp94Simple(x.word||x.english),x]));wp94Aliases=data.aliases||{};wp94AnalysisCache.clear();
  }catch(error){console.warn('Reader 3 sözlüğü yüklenemedi',error)}
}

const wp94LookupBase=wp64Lookup;
wp64Lookup=function(raw){
  const direct=wp94LookupBase(raw);if(direct)return direct;
  const n=wp94Simple(raw);if(!n)return null;
  const alias=wp94Aliases[n];if(alias){const row=wp94LookupBase(alias)||wp94Lexicon.get(alias);if(row)return {...row,readerForm:n,readerBase:alias}}
  if(wp94Lexicon.has(n))return wp94Lexicon.get(n);
  const candidates=[];
  if(activeCourse==='en'){
    if(n.endsWith("'s"))candidates.push(n.slice(0,-2));
    if(n.endsWith("n't"))candidates.push(n.slice(0,-3));
    if(n.endsWith("'re"))candidates.push('be');if(n.endsWith("'ve"))candidates.push('have');if(n.endsWith("'ll"))candidates.push('will');
    if(n.endsWith('ies')&&n.length>4)candidates.push(n.slice(0,-3)+'y');
    if(n.endsWith('ves')&&n.length>4)candidates.push(n.slice(0,-3)+'f',n.slice(0,-3)+'fe');
    if(n.endsWith('ing')&&n.length>5){const b=n.slice(0,-3);candidates.push(b,b+'e');if(b.length>2&&b.at(-1)===b.at(-2))candidates.push(b.slice(0,-1))}
    if(n.endsWith('ied')&&n.length>4)candidates.push(n.slice(0,-3)+'y');
    if(n.endsWith('ed')&&n.length>4){const b=n.slice(0,-2);candidates.push(b,b+'e');if(b.length>2&&b.at(-1)===b.at(-2))candidates.push(b.slice(0,-1))}
    if(n.endsWith('er')&&n.length>4)candidates.push(n.slice(0,-2),n.slice(0,-1),n.slice(0,-2)+'e');
    if(n.endsWith('est')&&n.length>5)candidates.push(n.slice(0,-3),n.slice(0,-2),n.slice(0,-3)+'e');
    if(n.endsWith('ly')&&n.length>4)candidates.push(n.slice(0,-2),n.slice(0,-2)+'e');
    if(n.endsWith('ness')&&n.length>6)candidates.push(n.slice(0,-4),n.slice(0,-4)+'y');
    if(n.endsWith('ment')&&n.length>6)candidates.push(n.slice(0,-4));
    if(n.endsWith('tion')&&n.length>6)candidates.push(n.slice(0,-4)+'e',n.slice(0,-3));
    if(n.endsWith('es')&&n.length>4)candidates.push(n.slice(0,-2),n.slice(0,-1));
    if(n.endsWith('s')&&n.length>3)candidates.push(n.slice(0,-1));
    const british={organised:'organized',organise:'organize',recognised:'recognized',centre:'center',neighbour:'neighbor',neighbours:'neighbor',harbour:'harbor',colour:'color',favour:'favor',labour:'labor'};if(british[n])candidates.push(british[n]);
  }
  for(const c of [...new Set(candidates.filter(Boolean))]){const row=wp94LookupBase(c)||wp94Lexicon.get(c);if(row)return {...row,readerForm:n,readerBase:c}}
  return null;
};

function wp94AnalyseStory(story){
  if(!story)return{coverage:0,known:0,unknown:0,unique:0,names:0,words:0,minutes:0};
  const key=`${activeCourse}:${story.id}:${wp94Lexicon.size}`;if(wp94AnalysisCache.has(key))return wp94AnalysisCache.get(key);
  const tokens=wp94StoryWords(story),unique=[...new Set(tokens.map(wp94Simple).filter(Boolean))],content=unique.filter(x=>!WP94_STOP.has(x));let known=0,names=0;const rows=[],missing=[];
  content.forEach(token=>{const row=wp64Lookup(token);if(row){known++;rows.push(row)}else{const seen=tokens.find(x=>wp94Simple(x)===token)||token;if(/^[A-ZÇĞİÖŞÜА-ЯЁ]/u.test(seen)){names++}else missing.push(token)}});
  const denominator=Math.max(1,content.length-names),coverage=Math.round(known/denominator*100),wordCount=Number(story.wordCount)||tokens.length;
  const result={coverage:Math.max(0,Math.min(100,coverage)),known,unknown:missing.length,unique:content.length,names,words:wordCount,minutes:Number(story.readMinutes)||Math.max(1,Math.ceil(wordCount/160)),rows:[...new Map(rows.map(r=>[wp94Simple(r.english||r.word),r])).values()],missing};
  wp94AnalysisCache.set(key,result);return result;
}
function wp94Difficulty(story,analysis){const lv=WP94_LEVEL_ORDER.indexOf(story?.level)+1,cov=analysis.coverage;return cov>=93?['Rahat okuma','easy']:cov>=84?['Dengeli','balanced']:cov>=72?['Zorlayıcı','challenging']:[`Yoğun ${story?.level||''}`,'intense']}
function wp94Bookmarks(storyId=v5Story?.id){const r=wp94Ensure();return r.bookmarks[storyId]||(r.bookmarks[storyId]=[])}
function wp94IsBookmarked(i){return wp94Bookmarks().includes(Number(i))}
function wp94ToggleBookmark(i){const list=wp94Bookmarks(),n=Number(i),at=list.indexOf(n);if(at>=0)list.splice(at,1);else list.push(n);list.sort((a,b)=>a-b);v5Save();wp94DecorateBookmarks();toast(at>=0?'Yer imi kaldırıldı.':'Cümle yer imlerine eklendi.')}

function wp94StartSession(story){
  if(wp94Session?.storyId===story.id)return;
  wp94FinishSession(true);wp94Session={storyId:story.id,startedAt:Date.now(),activeSince:Date.now(),activeMs:0};
  clearInterval(wp94Timer);wp94Timer=setInterval(wp94UpdateTimer,1000);wp94UpdateTimer();
}
function wp94PauseSession(){if(!wp94Session?.activeSince)return;wp94Session.activeMs+=Date.now()-wp94Session.activeSince;wp94Session.activeSince=0}
function wp94ResumeSession(){if(wp94Session&&!wp94Session.activeSince)wp94Session.activeSince=Date.now()}
function wp94ElapsedMs(){return wp94Session?wp94Session.activeMs+(wp94Session.activeSince?Date.now()-wp94Session.activeSince:0):0}
function wp94UpdateTimer(){const el=$('#wp94SessionTime');if(el){const sec=Math.floor(wp94ElapsedMs()/1000);el.textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}}
function wp94FinishSession(save=true){
  if(!wp94Session)return;wp94PauseSession();wp94LastElapsed[wp94Session.storyId]=wp94Session.activeMs;if(save){const r=wp94Ensure(),old=r.sessions[wp94Session.storyId]||{totalMs:0,visits:0};r.sessions[wp94Session.storyId]={...old,totalMs:Number(old.totalMs||0)+wp94Session.activeMs,visits:Number(old.visits||0)+1,lastAt:new Date().toISOString()};v5Save()}
  wp94Session=null;clearInterval(wp94Timer);wp94Timer=null;
}

function wp94ApplyPreferences(){
  const p=wp94Ensure().preferences,reader=$('#storyReader');if(!reader)return;
  reader.style.setProperty('--wp94-font-scale',`${Math.max(80,Math.min(145,Number(p.font)||100))/100}`);reader.dataset.wp94Spacing=p.spacing||'normal';reader.dataset.wp94Theme=p.theme||'paper';reader.classList.toggle('wp94-focus',!!p.focus);
  const font=$('#wp94FontValue');if(font)font.textContent=`%${Number(p.font)||100}`;
  document.querySelectorAll('[data-wp94-theme]').forEach(x=>x.classList.toggle('active',x.dataset.wp94Theme===(p.theme||'paper')));
  const focus=$('[data-wp94-focus]');if(focus){focus.classList.toggle('active',!!p.focus);focus.textContent=p.focus?'◉ Odak açık':'◎ Odak modu'}
}
function wp94ChapterNav(story){
  const chapters=Array.isArray(story.chapters)&&story.chapters.length?story.chapters:[{title:'Metin',startLine:0,endLine:story.lines.length}];
  return `<nav class="wp94-chapter-nav" aria-label="Bölümler"><span>Bölümler</span>${chapters.map((x,i)=>`<button type="button" data-wp94-chapter-go="${i}"><b>${i+1}</b>${esc(x.title||`Bölüm ${i+1}`)}</button>`).join('')}</nav>`;
}
function wp94ReaderTools(){const p=wp94Ensure().preferences;return `<section class="wp94-reader-tools"><div class="wp94-font-tools"><span>Yazı</span><button type="button" data-wp94-font="-10">A−</button><b id="wp94FontValue">%${Number(p.font)||100}</b><button type="button" data-wp94-font="10">A＋</button></div><div class="wp94-theme-tools"><button type="button" data-wp94-theme="paper" class="${p.theme==='paper'?'active':''}">Kâğıt</button><button type="button" data-wp94-theme="sepia" class="${p.theme==='sepia'?'active':''}">Sepya</button><button type="button" data-wp94-theme="night" class="${p.theme==='night'?'active':''}">Gece</button></div><label>Satır aralığı<select id="wp94Spacing"><option value="compact" ${p.spacing==='compact'?'selected':''}>Sıkı</option><option value="normal" ${p.spacing==='normal'?'selected':''}>Normal</option><option value="wide" ${p.spacing==='wide'?'selected':''}>Rahat</option></select></label><button type="button" data-wp94-focus>${p.focus?'◉ Odak açık':'◎ Odak modu'}</button></section>`}
function wp94Insights(story){
  const a=wp94AnalyseStory(story),[difficulty,cls]=wp94Difficulty(story,a),saved=Object.values(wp64CourseWords()).filter(x=>x.storyId===story.id).length;
  return `<section class="wp94-insights"><article><span>📚</span><div><b>${a.words.toLocaleString('tr-TR')}</b><small>kelime</small></div></article><article><span>⏱</span><div><b id="wp94SessionTime">0:00</b><small>aktif okuma</small></div></article><article><span>🎯</span><div><b>%${a.coverage}</b><small>sözlük kapsamı</small></div></article><article class="${cls}"><span>🧭</span><div><b>${difficulty}</b><small>${story.level} düzeyi</small></div></article><article><span>🧠</span><div><b>${saved}</b><small>kaydedilen</small></div></article></section>`;
}
function wp94VocabItems(story){
  const analysis=wp94AnalyseStory(story),rows=analysis.rows.filter(r=>wp94Meaning(r)&&!/^anlam henüz/i.test(wp94Meaning(r)));if(!rows.length)return[];
  const sorted=[...rows].sort((a,b)=>wp94Hash(`${story.id}:${a.english||a.word}`)-wp94Hash(`${story.id}:${b.english||b.word}`));return sorted.slice(0,Math.min(6,sorted.length));
}
function wp94Distractors(target,story,index){
  const targetMeaning=wp94Meaning(target),pool=[...wp94AnalyseStory(story).rows,...(words||[])].filter(x=>x&&wp94Meaning(x)&&wp94Meaning(x)!==targetMeaning);const out=[];let p=wp94Hash(`${story.id}:${index}`)%Math.max(1,pool.length);
  while(out.length<3&&pool.length){const m=wp94Meaning(pool[p%pool.length]);if(m&&!out.includes(m)&&m!==targetMeaning)out.push(m);p+=97}
  return out;
}
function wp94RenderVocabularyPractice(story){
  const items=wp94VocabItems(story);if(!items.length)return '<div class="story-empty"><span>🧠</span><h3>Kelime çalışması hazırlanamadı</h3><p>Bu metinde eşleşen sözlük kartı bulunamadı.</p></div>';
  return `<div class="wp94-vocab-practice">${items.map((row,qi)=>{const correct=wp94Meaning(row),opts=[correct,...wp94Distractors(row,story,qi)].sort((a,b)=>wp94Hash(`${a}:${story.id}:${qi}`)-wp94Hash(`${b}:${story.id}:${qi}`));return `<article><div><small>${qi+1} / ${items.length}</small><b>“${esc(row.english||row.word)}” kelimesinin bu dersteki anlamı nedir?</b>${wp64Reading(row)?`<em>${esc(wp64Reading(row))}</em>`:''}</div><div>${opts.map(o=>`<button type="button" data-wp94-vocab="${qi}" data-wp94-correct="${o===correct?'1':'0'}">${esc(o)}</button>`).join('')}</div></article>`}).join('')}<div class="wp94-practice-result"><button type="button" class="primary" data-wp94-vocab-check>Kelime sonucunu gör</button><p id="wp94VocabFeedback"></p></div></div>`;
}
function wp94PracticeCenter(story){
  const saved=wp94Ensure().summaries[story.id]||'';
  return `<section class="wp94-practice-center"><div class="wp94-practice-head"><div><p class="eyebrow">READER 3.0 ÇALIŞMA MERKEZİ</p><h3>Okuduğunu kalıcı hâle getir</h3></div><button type="button" class="secondary" data-wp94-open-report>📊 Okuma raporu</button></div><div class="wp94-practice-tabs"><button type="button" data-wp94-tab="vocabulary" class="${wp94PracticeTab==='vocabulary'?'active':''}">Kelime testi</button><button type="button" data-wp94-tab="summary" class="${wp94PracticeTab==='summary'?'active':''}">Kendi özetim</button><button type="button" data-wp94-tab="review" class="${wp94PracticeTab==='review'?'active':''}">Tekrar planı</button></div><div id="wp94PracticeBody">${wp94PracticeTab==='summary'?wp94SummaryPanel(story,saved):wp94PracticeTab==='review'?wp94ReviewPanel(story):wp94RenderVocabularyPractice(story)}</div></section>`;
}
function wp94SummaryPanel(story,saved=''){return `<div class="wp94-summary-panel"><div><span>✍️</span><div><h4>Hikâyeyi 3–5 cümleyle anlat</h4><p>Karakteri veya ana konuyu, temel sorunu ve sonucu kendi kelimelerinle yaz. Metni kopyalamak yerine anlamı yeniden kur.</p></div></div><textarea id="wp94SummaryText" maxlength="1200" rows="7" placeholder="Bu hikâyenin ana fikri…">${esc(saved)}</textarea><footer><span id="wp94SummaryCount">${saved.length} / 1200</span><button type="button" class="primary" data-wp94-save-summary>Özetimi kaydet</button></footer></div>`}
function wp94ReviewPanel(story){const saved=Object.values(wp64CourseWords()).filter(x=>x.storyId===story.id),marks=wp94Bookmarks(story.id);return `<div class="wp94-review-panel"><article><b>${saved.length}</b><span>Hikâyeden kaydedilen kelime</span><button type="button" class="secondary" data-wp94-open-words>Kelime listemi aç</button></article><article><b>${marks.length}</b><span>İşaretlenen önemli cümle</span>${marks.length?`<div>${marks.map(i=>`<button type="button" data-wp94-line-go="${i}">Cümle ${i+1}</button>`).join('')}</div>`:'<small>Yıldız düğmesiyle önemli cümleleri işaretle.</small>'}</article><article><b>${Number(wp94Ensure().sessions[story.id]?.visits)||0}</b><span>Okuma ziyareti</span><small>Metni farklı günlerde yeniden okumak akıcılığı güçlendirir.</small></article></div>`}
function wp94EnsureReportDialog(){if($('#wp94ReportDialog'))return;document.body.insertAdjacentHTML('beforeend','<dialog id="wp94ReportDialog" class="modal wp94-report-dialog"><button class="sheet-close" data-close="wp94ReportDialog">×</button><div id="wp94ReportBody"></div></dialog>')}
function wp94ReportData(story=v5Story){const a=wp94AnalyseStory(story),elapsed=Math.max(1000,wp94ElapsedMs()||wp94LastElapsed[story?.id]||0),mins=elapsed/60000,wpm=Math.round(a.words/Math.max(.5,mins)),correct=(story?.questions||[]).reduce((s,q,i)=>s+(Number(v5StoryAnswers?.[i])===Number(q.answer)?1:0),0),total=story?.questions?.length||0,vocab=wp94Ensure().vocabResults[story?.id]||null;return{a,elapsed,mins,wpm,correct,total,vocab,saved:Object.values(wp64CourseWords()).filter(x=>x.storyId===story?.id).length,bookmarks:wp94Bookmarks(story?.id).length}}
function wp94OpenReport(){
  if(!v5Story)return;wp94EnsureReportDialog();const d=wp94ReportData(),score=d.total?Math.round(d.correct/d.total*100):0,readLabel=d.wpm<90?'Dikkatli okuma':d.wpm<180?'Dengeli tempo':'Hızlı okuma';
  $('#wp94ReportBody').innerHTML=`<p class="eyebrow">READER 3.0 OKUMA RAPORU</p><h2>${esc(v5Story.title)}</h2><p class="muted">${esc(v5Story.level)} · ${esc(v5Story.genre||v5Story.topic||'Okuma')} · ${new Date().toLocaleDateString('tr-TR')}</p><div class="wp94-report-score"><strong>${score||d.a.coverage}</strong><span>${d.total?'anlama puanı':'sözlük kapsamı'}</span></div><div class="wp94-report-grid"><article><b>${Math.max(1,Math.round(d.mins))} dk</b><small>aktif süre</small></article><article><b>${d.wpm}</b><small>kelime/dakika</small></article><article><b>${readLabel}</b><small>okuma temposu</small></article><article><b>%${d.a.coverage}</b><small>sözlük kapsamı</small></article><article><b>${d.correct}/${d.total}</b><small>anlama</small></article><article><b>${d.vocab?`${d.vocab.correct}/${d.vocab.total}`:'—'}</b><small>kelime testi</small></article><article><b>${d.saved}</b><small>kaydedilen kelime</small></article><article><b>${d.bookmarks}</b><small>yer imi</small></article></div><div class="wp94-report-advice"><b>Sonraki adım</b><p>${score>=80?'Metni tamamladın. Kaydettiğin kelimeleri tekrar planında çalış ve bir sonraki hikâyeye geç.':'Metni bir kez daha, bu defa bölüm bölüm dinleyerek oku. Sonra testi yeniden çöz.'}</p></div><div class="wp94-report-actions"><button type="button" class="secondary" data-wp94-report-reread>Metni yeniden oku</button><button type="button" class="primary" data-wp94-next-story>Sonraki hikâye →</button></div>`;
  $('#wp94ReportDialog').showModal();
}
function wp94NextStory(){const list=wp64FilteredStories(),i=list.findIndex(x=>x.id===v5Story?.id),next=list[i+1]||list[0];$('#wp94ReportDialog')?.close();if(next)renderStoryReader(next)}

function wp94DecorateBookmarks(){
  document.querySelectorAll('.wp64-story-line').forEach(row=>{const i=Number(row.dataset.wp64LineIndex),actions=row.querySelector('.wp64-line-actions');if(actions&&!actions.querySelector('[data-wp94-bookmark]'))actions.insertAdjacentHTML('beforeend',`<button type="button" data-wp94-bookmark="${i}" title="Cümleyi işaretle">☆</button>`)});
  document.querySelectorAll('[data-wp94-bookmark]').forEach(btn=>{const on=wp94IsBookmarked(btn.dataset.wp94Bookmark);btn.classList.toggle('active',on);btn.textContent=on?'★':'☆'});
}
function wp94DecorateReader(story){
  const reader=$('#storyReader');if(!reader||!story)return;wp94StartSession(story);
  const chip=reader.querySelector('.wp64-reader-head .chip');if(chip)chip.textContent=`${story.level} · Reader 3.0`;
  const head=reader.querySelector('.wp64-reader-head');if(head&&!$('#wp94ReaderTools'))head.insertAdjacentHTML('afterend',`${wp94Insights(story)}${wp94ReaderTools()}${wp94ChapterNav(story)}`);
  const tip=reader.querySelector('.wp64-reader-tip');if(tip)tip.innerHTML='Kelimeye dokun: anlam, Türkçe-okunur telaffuz ve bağlamı gör. <b>☆</b> ile önemli cümleyi işaretle; <b>TR</b> ile yalnız o çeviriyi aç.';
  const questions=reader.querySelector('.wp64-story-questions');if(questions&&!reader.querySelector('.wp94-practice-center'))questions.insertAdjacentHTML('afterend',wp94PracticeCenter(story));
  wp94DecorateBookmarks();wp94ApplyPreferences();wp94VocabAnswers={};
}
const wp94RenderStoryReaderBase=renderStoryReader;
renderStoryReader=function(story){wp94RenderStoryReaderBase(story);wp94DecorateReader(story)};
const wp94RenderStoryLibraryBase=renderStoryLibrary;
renderStoryLibrary=async function(){await wp94RenderStoryLibraryBase();wp94EnhanceLibrary();wp94ApplyVersion()};
function wp94EnhanceLibrary(){
  document.querySelectorAll('.wp64-story-card').forEach(card=>{const st=v5Stories.find(x=>x.id===card.dataset.storyId);if(!st)return;const small=card.querySelector('small'),a=wp94AnalyseStory(st);if(small&&!small.dataset.wp94){small.dataset.wp94='1';small.innerHTML+=` · <span class="wp94-card-coverage">%${a.coverage} kapsam</span>`}if(st.readerVersion==='3.0.0')card.classList.add('wp94-original')});
}
const wp94FilteredStoriesBase=wp64FilteredStories;
wp64FilteredStories=function(){let list=wp94FilteredStoriesBase();if(wp94StoryStatus==='completed')list=list.filter(x=>wp64CardProgress(x).completed);if(wp94StoryStatus==='started')list=list.filter(x=>{const p=wp64CardProgress(x);return !p.completed&&p.pct>0});if(wp94StoryStatus==='new')list=list.filter(x=>!wp64CardProgress(x).completed&&!wp64CardProgress(x).pct);if(wp94StoryStatus==='saved')list=list.filter(x=>wp94Bookmarks(x.id).length||Object.values(wp64CourseWords()).some(w=>w.storyId===x.id));if(wp94StoryLength!=='all')list=list.filter(x=>{const m=Number(x.readMinutes)||2;return wp94StoryLength==='short'?m<=3:wp94StoryLength==='medium'?m>3&&m<=8:m>8});return list};
function wp94EnsureFilters(){
  wp64EnsureToolbar();const controls=$('.wp64-reader-controls');if(!controls)return;if(!$('#wp94StoryStatus'))controls.insertAdjacentHTML('afterbegin',`<label>Durum<select id="wp94StoryStatus"><option value="all">Tüm hikâyeler</option><option value="new">Yeni</option><option value="started">Başlanan</option><option value="completed">Tamamlanan</option><option value="saved">Kaydı olan</option></select></label><label>Uzunluk<select id="wp94StoryLength"><option value="all">Tüm uzunluklar</option><option value="short">Kısa · ≤3 dk</option><option value="medium">Orta · 4–8 dk</option><option value="long">Uzun · 9+ dk</option></select></label>`);
}

const wp94ShowWordPopupBase=wp64ShowWordPopup;
wp64ShowWordPopup=function(btn){
  const raw=btn.dataset.wp64Word,row=wp64Lookup(raw),line=Number(btn.dataset.wp64Line),context=wp64ContextTranslation(line),proper=!row&&/^[A-ZÇĞİÖŞÜА-ЯЁ]/u.test(raw),meaning=row?wp94Meaning(row):proper?'Özel ad · kişi, yer veya kurum adı':'Bu kelime Reader inceleme kuyruğuna eklendi; cümlenin Türkçe çevirisi aşağıda gösteriliyor.',reading=row?wp64Reading(row):'';
  wp64Ui.wordContext={raw,row,line,meaning,reading,context,storyId:v5Story?.id||''};const popup=$('#wp64WordPopup');
  popup.innerHTML=`<button type="button" class="wp64-popup-close" data-wp64-popup-close>×</button><p class="eyebrow">${proper?'ÖZEL AD':row?.content_origin?.includes('Reader 3')?'READER SÖZLÜĞÜ':activeCourse==='ru'?'RUSÇA KELİME':'KELİME KARTI'}</p><h3>${esc(row?.stress||row?.english||raw)}</h3>${reading?`<p class="wp64-reading">${esc(reading)}</p>`:''}<strong>${esc(meaning)}</strong>${row?.cefr?`<span class="wp94-popup-level">${esc(clean(row.cefr))}</span>`:''}${context?`<small><b>Bağlam:</b> ${esc(context)}</small>`:''}<div><button type="button" class="secondary" data-wp64-word-speak>🔊 Dinle</button>${!proper?'<button type="button" class="primary" data-wp64-save-word>＋ Kelimelerime ekle</button><button type="button" class="soft" data-wp94-mark-hard>Zorlandım</button>':''}</div>`;
  popup.hidden=false;const r=btn.getBoundingClientRect(),pw=Math.min(390,window.innerWidth-24);popup.style.width=`${pw}px`;popup.style.left=`${Math.max(12,Math.min(window.innerWidth-pw-12,r.left+r.width/2-pw/2))}px`;popup.style.top=`${Math.min(window.innerHeight-popup.offsetHeight-12,r.bottom+8)}px`;
};

const wp94CheckStoryBase=v5CheckStory;
v5CheckStory=function(){wp94CheckStoryBase();wp94FinishSession(true);setTimeout(()=>{const fb=$('#storyFeedback');if(fb&&!fb.querySelector('[data-wp94-open-report]'))fb.insertAdjacentHTML('beforeend',' <button type="button" class="soft" data-wp94-open-report>Raporu aç</button>')},80)};

function wp94ApplyVersion(){
  document.documentElement.dataset.wpVersion=WP94_VERSION;document.title='WordPilot 9.4 · Reader 3.0 · 5000 Kelime';
  $$('.version').forEach(node=>{if(node.textContent!=='v9.5.0 · Conversation Coach Pro')node.textContent='v9.5.0 · Conversation Coach Pro'});
  wp91Set($('[data-dashboard-tab="stories"] small'),'Reader 3.0');
  const fc=$('.v5-feature-card.stories');if(fc){wp91Set(fc.querySelector('b'),'Reader 3.0');wp91Set(fc.querySelector('small'),'A1–C2 · 114 metin · odak modu · kelime testi · okuma raporu')}
  wp91Set($('#view-stories .section-title .eyebrow'),'READER 3.0 · A1–C2');wp91Set($('#view-stories .section-title h1'),'WordPilot Reader 3.0');wp91Set($('#view-stories .section-title .muted'),'Derecelendirilmiş uzun okumalar, dokunmatik sözlük, bölüm takibi, kelime testi, yer imleri ve kişisel okuma raporu.');
  const toolbar=$('#wp64ReaderToolbar');if(toolbar){wp91Set(toolbar.querySelector('.eyebrow'),'WORDPILOT READER 3.0');wp91Set(toolbar.querySelector('h2'),'A1–C2 akıllı okuma kütüphanesi');wp91Set(toolbar.querySelector('.wp64-reader-title small'),'Oku · dinle · kelimeyi incele · cümleyi işaretle · raporla ilerlemeni gör')}
  wp94EnsureFilters();
}

function setupV94Events(){
  if(setupV94Events.done)return;setupV94Events.done=true;
  document.addEventListener('click',e=>{
    const font=e.target.closest('[data-wp94-font]');if(font){const p=wp94Ensure().preferences;p.font=Math.max(80,Math.min(145,(Number(p.font)||100)+Number(font.dataset.wp94Font)));v5Save();wp94ApplyPreferences();return}
    const theme=e.target.closest('[data-wp94-theme]');if(theme){wp94Ensure().preferences.theme=theme.dataset.wp94Theme;v5Save();wp94ApplyPreferences();return}
    if(e.target.closest('[data-wp94-focus]')){const p=wp94Ensure().preferences;p.focus=!p.focus;v5Save();wp94ApplyPreferences();return}
    const mark=e.target.closest('[data-wp94-bookmark]');if(mark){wp94ToggleBookmark(mark.dataset.wp94Bookmark);return}
    const chapter=e.target.closest('[data-wp94-chapter-go]');if(chapter){document.querySelector(`[data-wp64-chapter="${chapter.dataset.wp94ChapterGo}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});return}
    const go=e.target.closest('[data-wp94-line-go]');if(go){document.querySelector(`[data-wp64-line-index="${go.dataset.wp94LineGo}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});return}
    const tab=e.target.closest('[data-wp94-tab]');if(tab){wp94PracticeTab=tab.dataset.wp94Tab;const body=$('#wp94PracticeBody');if(body)body.outerHTML=`<div id="wp94PracticeBody">${wp94PracticeTab==='summary'?wp94SummaryPanel(v5Story,wp94Ensure().summaries[v5Story.id]||''):wp94PracticeTab==='review'?wp94ReviewPanel(v5Story):wp94RenderVocabularyPractice(v5Story)}</div>`;document.querySelectorAll('[data-wp94-tab]').forEach(x=>x.classList.toggle('active',x.dataset.wp94Tab===wp94PracticeTab));return}
    const va=e.target.closest('[data-wp94-vocab]');if(va){const qi=Number(va.dataset.wp94Vocab);wp94VocabAnswers[qi]=va.dataset.wp94Correct==='1';va.closest('article')?.querySelectorAll('[data-wp94-vocab]').forEach(x=>x.classList.toggle('selected',x===va));return}
    if(e.target.closest('[data-wp94-vocab-check]')){const total=wp94VocabItems(v5Story).length,correct=Object.values(wp94VocabAnswers).filter(Boolean).length;wp94Ensure().vocabResults[v5Story.id]={correct,total,at:new Date().toISOString()};v5Save();document.querySelectorAll('[data-wp94-vocab]').forEach(x=>{x.disabled=true;x.classList.toggle('correct',x.dataset.wp94Correct==='1');x.classList.toggle('wrong',x.classList.contains('selected')&&x.dataset.wp94Correct!=='1')});const fb=$('#wp94VocabFeedback');if(fb)fb.textContent=`${correct} / ${total} doğru · ${correct===total?'Mükemmel!':'Yanlışları hikâye içinde yeniden bul.'}`;return}
    if(e.target.closest('[data-wp94-save-summary]')){const text=$('#wp94SummaryText')?.value.trim()||'';wp94Ensure().summaries[v5Story.id]=text;v5Save();toast(text?'Özetin kaydedildi.':'Boş özet kaydı temizlendi.');return}
    if(e.target.closest('[data-wp94-open-report]')){wp94OpenReport();return}
    if(e.target.closest('[data-wp94-next-story]')){wp94NextStory();return}
    if(e.target.closest('[data-wp94-report-reread]')){$('#wp94ReportDialog')?.close();document.querySelector('.wp64-story-lines')?.scrollIntoView({behavior:'smooth'});return}
    if(e.target.closest('[data-wp94-open-words]')){wp64RenderWordDialog();$('#wp64WordDialog')?.showModal();return}
    if(e.target.closest('[data-wp94-mark-hard]')){const c=wp64Ui.wordContext;wp64SaveStoryWord();const key=wp64Normalize(c?.row?.english||c?.raw||''),item=wp64CourseWords()[key];if(item){item.lastGrade=2;item.dueAt=new Date().toISOString();v5Save();toast('Kelime “Zorlandım” tekrarına eklendi.')}return}
  },true);
  document.addEventListener('change',e=>{
    if(e.target.id==='wp94Spacing'){wp94Ensure().preferences.spacing=e.target.value;v5Save();wp94ApplyPreferences();return}
    if(e.target.id==='wp94StoryStatus'){wp94StoryStatus=e.target.value;renderStoryLibrary();return}
    if(e.target.id==='wp94StoryLength'){wp94StoryLength=e.target.value;renderStoryLibrary();return}
  });
  document.addEventListener('input',e=>{if(e.target.id==='wp94SummaryText'){const c=$('#wp94SummaryCount');if(c)c.textContent=`${e.target.value.length} / 1200`}});
  document.addEventListener('visibilitychange',()=>document.hidden?wp94PauseSession():wp94ResumeSession());
  window.addEventListener('beforeunload',()=>wp94FinishSession(true));
}
function wp94AfterInit(){
  wp93Apply=wp94ApplyVersion;try{wp92Apply=wp94ApplyVersion}catch{}try{wp91ApplyTruth=wp94ApplyVersion}catch{}try{wp90ApplyVersionLock=wp94ApplyVersion}catch{}
  setupV94Events();wp94ApplyVersion();wp94LoadLexicon().then(async()=>{if($('#view-stories')?.classList.contains('active'))await renderStoryLibrary();wp94ApplyVersion()});
  /* v9.5: eski sürüm gözlemcisi devre dışı */
}
