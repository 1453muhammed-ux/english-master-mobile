/* WordPilot v4.3 learning intelligence, achievements and academy spelling.
   Existing localStorage/Firebase keys remain unchanged. */
const V43_BADGE_LEDGER='wp43_badges';
let academySpellingPoolCache=[];

COURSES.en.actualCount=5488;
COURSES.ru.actualCount=1120;
COURSES.uz.actualCount=137;

function v43ModeStats(){
  state.stats.modeAnswers=state.stats.modeAnswers&&typeof state.stats.modeAnswers==='object'?state.stats.modeAnswers:{};
  return state.stats.modeAnswers;
}
function v43PathTotals(){
  const ruState=courseStatesFor().ru||defaultState(),progress=ruState.stats?.taskClaims?.[RU_PATH_PROGRESS_KEY]||{};
  const grammarDone=Object.entries(progress).filter(([key,value])=>key.startsWith('g_')&&value?.completed).length;
  const dialogueDone=Object.entries(progress).filter(([key,value])=>key.startsWith('d_')&&value?.completed).length;
  return {grammarDone,dialogueDone,grammarTotal:russianGrammar.length||9,dialogueTotal:russianDialogues.length||15};
}
function v43AchievementDefinitions(){
  const c=aggregateCounts(),tot=aggregateTotals('all'),modes=v43ModeStats(),path=v43PathTotals(),ruState=courseStatesFor().ru||defaultState(),academy={answers:Number(ruState.stats?.academyAnswers)||0,correct:Number(ruState.stats?.academyCorrect)||0};
  const marked=c.learn+c.memorized+c.hard,acc=tot.answers?Math.round(tot.correct/tot.answers*100):0;
  return [
    ['first-flight','✈','İlk Uçuş','İlk sorunu cevapla',tot.answers>=1],
    ['marked-100','🎯','100 Kelime','100 kelimeyi işaretle',marked>=100],
    ['marked-500','🥈','500 Kelime','500 kelimeyi işaretle',marked>=500],
    ['marked-1000','🥇','1000 Kelime','1000 kelimeyi işaretle',marked>=1000],
    ['streak-7','🔥','7 Gün Seri','7 gün üst üste çalış',globalStreak()>=7],
    ['streak-30','⚡','30 Gün Seri','30 gün üst üste çalış',globalStreak()>=30],
    ['sharp-pilot','🎓','Keskin Pilot','100 cevapta en az %90 doğruluk',tot.answers>=100&&acc>=90],
    ['sessions-10','🛫','Düzenli Pilot','10 çalışma oturumu tamamla',tot.sessions>=10],
    ['listen-first','🎧','Kulak Açıldı','İlk dinleme/dikte sorusunu çöz',(modes.listening||0)+(modes.dictation||0)>=1],
    ['write-first','✍','Aktif Üretim','İlk yazma sorusunu çöz',(modes['en-tr']||0)+(modes['tr-en']||0)>=1],
    ['sentence-first','🧩','Cümle Kurucu','İlk cümle sıralama/tamamlama sorusunu çöz',(modes.ordering||0)+(modes.sentence||0)>=1],
    ['academy-33','Я','Kiril Kaşifi','Kiril Akademisinde 33 doğru cevap ver',academy.correct>=33],
    ['grammar-first','📘','İlk Gramer','Bir Rusça dil bilgisi modülünü tamamla',path.grammarDone>=1],
    ['grammar-all','🏛','A1 Gramer Ustası','Tüm Rusça gramer modüllerini tamamla',path.grammarDone>=path.grammarTotal],
    ['dialogue-first','💬','İlk Diyalog','Bir Rusça diyaloğu tamamla',path.dialogueDone>=1],
    ['dialogue-all','🗣','Günlük Konuşma','Tüm Rusça diyalogları tamamla',path.dialogueDone>=path.dialogueTotal]
  ];
}
const wp42BadgeDefinitions=badgeDefinitions;
badgeDefinitions=function(){return v43AchievementDefinitions().map(([id,icon,title,desc,earned])=>[icon,title,desc,earned,id])};

function v43BadgeLedger(){
  state.stats.taskClaims=state.stats.taskClaims||{};
  const current=state.stats.taskClaims[V43_BADGE_LEDGER];
  if(current&&typeof current==='object'&&!Array.isArray(current))return current;
  return state.stats.taskClaims[V43_BADGE_LEDGER]={};
}
const wp42Save=save;
save=function(options={}){
  const ledger=v43BadgeLedger(),newly=[];
  v43AchievementDefinitions().forEach(([id,icon,title,desc,earned])=>{if(earned&&!ledger[id]){ledger[id]={at:Date.now(),title};newly.push({icon,title})}});
  wp42Save(options);
  if(newly.length)setTimeout(()=>toast(`${newly[0].icon} Yeni rozet: ${newly[0].title}${newly.length>1?` (+${newly.length-1})`:''}`),120);
};

const wp42RecordAnswer=recordAnswer;
recordAnswer=function(word,correct){
  const mode=session?.questionType||session?.mode||'smart',stats=v43ModeStats();
  stats[mode]=(Number(stats[mode])||0)+1;
  wp42RecordAnswer(word,correct);
};

function v43TopicPerformance(){
  const map=new Map();
  words.forEach(word=>{
    const topic=word.group||'Diğer';
    const row=map.get(topic)||{topic,total:0,marked:0,right:0,wrong:0};row.total++;
    if(statusOf(word.id))row.marked++;
    const h=state.history?.[word.id];row.right+=Number(h?.right)||0;row.wrong+=Number(h?.wrong)||0;map.set(topic,row);
  });
  return [...map.values()].map(row=>{
    const attempts=row.right+row.wrong,accuracy=attempts?Math.round(row.right/attempts*100):0,coverage=row.total?Math.round(row.marked/row.total*100):0;
    return {...row,attempts,accuracy,coverage,score:Math.round(coverage*.55+accuracy*.45)};
  });
}
function renderV43Mentor(){
  const items=v43TopicPerformance().filter(x=>x.total>=3),attempted=items.filter(x=>x.attempts||x.marked);
  const strong=[...attempted].sort((a,b)=>b.score-a.score)[0],weak=[...attempted].sort((a,b)=>a.score-b.score)[0];
  if($('#mentorStrongTopic'))$('#mentorStrongTopic').textContent=strong?strong.topic:'Henüz ölçülmedi';
  if($('#mentorWeakTopic'))$('#mentorWeakTopic').textContent=weak?weak.topic:'İlk oturumu tamamla';
  if($('#mentorNextAction'))$('#mentorNextAction').textContent=weak?`${weak.topic} konusunda ${Math.max(5,Math.min(20,weak.total-weak.marked||10))} soru çöz`:'Günün 20 kelimesini çalış';
}
function renderV43CoursePerformance(){
  const grid=$('#coursePerformanceGrid');if(!grid)return;const states=courseStatesFor();
  grid.innerHTML=COURSE_IDS.map(id=>{
    const meta=COURSES[id],st=states[id],c=countsForState(st),tot=periodTotalsForState(st,'all'),marked=c.learn+c.memorized+c.hard,total=meta.actualCount||meta.displayCount,pct=Math.min(100,Math.round(marked/Math.max(1,total)*100)),acc=tot.answers?Math.round(tot.correct/tot.answers*100):0;
    return `<article class="course-performance-card ${id===activeCourse?'active':''}"><span>${meta.flag}</span><div><b>${esc(meta.name)}</b><small>${marked} / ${total} işaretli · ${tot.answers?`%${acc} doğruluk`:'henüz cevap yok'}</small><i><em style="width:${pct}%"></em></i></div><strong>%${pct}</strong></article>`;
  }).join('');
}
function renderV43Insights(){
  const box=$('#learningInsightGrid');if(!box)return;const topics=v43TopicPerformance().filter(x=>x.attempts||x.marked),strong=[...topics].sort((a,b)=>b.score-a.score)[0],weak=[...topics].sort((a,b)=>a.score-b.score)[0];
  const review=new Set([...reviewIds(),...wrongIds()]).size,all=aggregateTotals('all'),accuracy=all.answers?Math.round(all.correct/all.answers*100):0;
  box.innerHTML=`<article><span>💪</span><div><small>EN GÜÇLÜ KONU</small><b>${esc(strong?.topic||'Henüz ölçülmedi')}</b><p>${strong?`%${strong.accuracy} doğruluk · %${strong.coverage} kapsam`:'Bir oturum tamamlayınca görünür.'}</p></div></article><article><span>🎯</span><div><small>ÖNCELİKLİ KONU</small><b>${esc(weak?.topic||'İlk çalışmanı başlat')}</b><p>${weak?`${weak.wrong} yanlış · ${weak.total-weak.marked} yeni kayıt`:'Akıllı Quiz başlangıç için hazır.'}</p></div></article><article><span>🔁</span><div><small>TEKRAR KUYRUĞU</small><b>${review} kayıt</b><p>Yanlışlar ve zor kelimeler akıllı tekrarda birleşir.</p></div></article><article><span>📈</span><div><small>GENEL DOĞRULUK</small><b>${all.answers?`%${accuracy}`:'—'}</b><p>${all.answers} cevap · ${all.sessions} oturum</p></div></article>`;
}
function renderV43AchievementSummary(){
  const el=$('#achievementSummary');if(!el)return;const defs=v43AchievementDefinitions(),earned=defs.filter(x=>x[4]).length;
  el.innerHTML=`<div><strong>${earned}</strong><span>/ ${defs.length} rozet kazanıldı</span></div><i><em style="width:${Math.round(earned/defs.length*100)}%"></em></i>`;
}

const wp42RenderProgress=renderProgress;
renderProgress=function(){wp42RenderProgress();renderV43CoursePerformance();renderV43Insights();renderV43AchievementSummary()};
const wp42RenderDashboard=renderDashboard;
renderDashboard=function(){wp42RenderDashboard();renderV43Mentor()};

const wp42RenderRussianTopics=renderRussianTopics;
renderRussianTopics=function(){
  const grid=$('#russianTopicGrid');if(!grid||activeCourse!=='ru')return wp42RenderRussianTopics();
  grid.innerHTML=RUSSIAN_TOPICS.map((topic,index)=>{const items=words.filter(w=>w.group===topic),marked=items.filter(w=>statusOf(w.id)).length,pct=items.length?Math.round(marked/items.length*100):0;return `<article class="russian-topic-card"><button type="button" class="topic-open" data-russian-topic="${esc(topic)}"><span>${String(index+1).padStart(2,'0')}</span><div><b>${esc(topic)}</b><small>${items.length} kayıt · ${marked} çalışıldı</small><i><em style="width:${pct}%"></em></i></div></button><button type="button" class="topic-study" data-topic-study="${esc(topic)}">Çalış</button></article>`}).join('');
};

const wp42RenderRussianPathStats=renderRussianPathStats;
renderRussianPathStats=function(){
  wp42RenderRussianPathStats();const p=v43PathTotals(),gp=Math.round(p.grammarDone/p.grammarTotal*100),dp=Math.round(p.dialogueDone/p.dialogueTotal*100),overall=Math.round((p.grammarDone+p.dialogueDone)/(p.grammarTotal+p.dialogueTotal)*100);
  if($('#grammarPathPercent'))$('#grammarPathPercent').textContent=`%${gp}`;if($('#dialoguePathPercent'))$('#dialoguePathPercent').textContent=`%${dp}`;if($('#ruPathOverallFill'))$('#ruPathOverallFill').style.width=`${overall}%`;if($('#ruPathOverallText'))$('#ruPathOverallText').textContent=`%${overall} tamamlandı`;
};

async function v43RussianSpellingPool(){
  if(academySpellingPoolCache.length)return academySpellingPoolCache;
  let raw=courseWordCache.ru;
  if(!raw){const response=await fetch(`ru_words.json?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error('ru_words.json');raw=await response.json()}
  academySpellingPoolCache=raw.map(x=>({word:String(x.word||x.english||'').normalize('NFD').replace(/\u0301/g,'').normalize('NFC'),stress:x.stress||x.word||x.english,reading:x.reading||'',translation:x.meaningTr||x.translation||firstMeaning(x)})).filter(x=>/^[А-Яа-яЁё]{3,9}$/u.test(x.word));
  return academySpellingPoolCache;
}
function v43ShuffleIndices(length){const arr=Array.from({length},(_,i)=>i).sort(()=>Math.random()-.5);if(length>1&&arr.every((x,i)=>x===i))arr.reverse();return arr}
function renderAcademySpellingBoard(){
  const game=academyGame;if(!game||game.type!=='spelling')return;const chosen=new Set(game.order),answer=$('#academySpellingAnswer'),bank=$('#academySpellingBank');
  if(answer)answer.innerHTML=game.order.map(i=>`<button type="button" data-spelling-remove="${i}">${esc(game.letters[i])}</button>`).join('')||'<span>Harfleri buraya sırala…</span>';
  if(bank)bank.innerHTML=game.shuffled.filter(i=>!chosen.has(i)).map(i=>`<button type="button" data-spelling-token="${i}">${esc(game.letters[i])}</button>`).join('');
}
async function startAcademySpelling(){
  try{
    const pool=await v43RussianSpellingPool(),target=pool[Math.floor(Math.random()*pool.length)],letters=[...target.word];academyGame={type:'spelling',target,letters,order:[],shuffled:v43ShuffleIndices(letters.length)};
    const panel=$('#academyGamePanel');panel.hidden=false;panel.innerHTML=`<div class="academy-game-head"><div><p class="eyebrow">KELİMEYİ HECELE</p><h2>${esc(target.translation)}</h2><p>${esc(target.reading)} · ${letters.length} harf</p></div><button type="button" class="academy-listen-button" data-spelling-listen>🔊 Kelimeyi dinle</button></div><form id="academySpellingForm" class="academy-spelling-form"><div id="academySpellingAnswer" class="ordering-answer"></div><div id="academySpellingBank" class="ordering-bank"></div><button class="primary" type="submit">Kontrol et</button></form><p id="academyGameFeedback" class="academy-game-feedback"></p>`;renderAcademySpellingBoard();panel.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>speak(target.word,'ru-RU'),180);
  }catch{toast('Kelime heceleme oyunu yüklenemedi.')}
}
function checkAcademySpelling(){
  if(academyGame?.type!=='spelling')return;const built=academyGame.order.map(i=>academyGame.letters[i]).join(''),correct=normalizeAnswer(built)===normalizeAnswer(academyGame.target.word),feedback=$('#academyGameFeedback');recordAcademyAnswer(correct);
  if(correct){feedback.className='academy-game-feedback good';feedback.textContent=`Doğru: ${academyGame.target.stress} · +8 XP`;document.querySelectorAll('#academySpellingForm button').forEach(x=>x.disabled=true);setTimeout(startAcademySpelling,900)}
  else{feedback.className='academy-game-feedback bad';feedback.textContent=`Henüz doğru değil. ${academyGame.target.word.length} harfin tamamını sırala.`;academyGame.order=[];renderAcademySpellingBoard()}
}

function setupV43Events(){
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-action="speed-challenge"]')){startStudy('smart',null,'speed','daily20',false);return}
    const game=e.target.closest('[data-academy-game="spelling"]');if(game){startAcademySpelling();return}
    const token=e.target.closest('[data-spelling-token]');if(token&&academyGame?.type==='spelling'){academyGame.order.push(Number(token.dataset.spellingToken));renderAcademySpellingBoard();return}
    const remove=e.target.closest('[data-spelling-remove]');if(remove&&academyGame?.type==='spelling'){const id=Number(remove.dataset.spellingRemove),pos=academyGame.order.lastIndexOf(id);if(pos>=0)academyGame.order.splice(pos,1);renderAcademySpellingBoard();return}
    if(e.target.closest('[data-spelling-listen]')&&academyGame?.target){speak(academyGame.target.word,'ru-RU');return}
  });
  document.addEventListener('submit',e=>{if(e.target.id==='academySpellingForm'){e.preventDefault();checkAcademySpelling()}});
}
