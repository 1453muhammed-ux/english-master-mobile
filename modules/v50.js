/* WordPilot v5.0 — voice lab, stories, adaptive learning, language leagues and AI coach.
   Existing localStorage/Firebase course state keys remain unchanged. */
const V5_VERSION='5.1.0';
const V5_STORY_FILE='stories.json';
const V5_SECURITY=window.WORDPILOT_SECURITY||{};
const V5_SCENARIOS={
  intro:{icon:'👋',title:'Tanışma',hint:'Ad, ülke ve günlük yaşam'},
  cafe:{icon:'☕',title:'Kafede',hint:'Sipariş ver ve soru sor'},
  travel:{icon:'🧳',title:'Seyahat',hint:'Bilet, yön ve saat konuş'},
  work:{icon:'💼',title:'İş ve okul',hint:'Program ve görevlerden bahset'},
  health:{icon:'🩺',title:'Sağlık',hint:'Basit bir şikâyeti anlat'}
};
let v5Stories=[],v5Story=null,v5StoryAnswers={},v5PronunciationWord=null,v5Recognition=null,v5AiScenario='intro',v5AiBusy=false,v5AppCheckReady=false;

function v5Ensure(){
  state.stats=state.stats||{};
  const root=state.stats.v5=state.stats.v5&&typeof state.stats.v5==='object'?state.stats.v5:{};
  root.pronunciation=Array.isArray(root.pronunciation)?root.pronunciation:[];
  root.stories=root.stories&&typeof root.stories==='object'?root.stories:{};
  root.aiHistory=root.aiHistory&&typeof root.aiHistory==='object'?root.aiHistory:{};
  root.preferences=root.preferences&&typeof root.preferences==='object'?root.preferences:{};
  root.adaptiveRuns=Number(root.adaptiveRuns)||0;
  return root;
}
function v5CourseData(course=activeCourse){
  if(course===activeCourse)return v5Ensure();
  const st=courseStatesFor()[course]||defaultState();st.stats=st.stats||{};
  return st.stats.v5&&typeof st.stats.v5==='object'?st.stats.v5:{pronunciation:[],stories:{},aiHistory:{},preferences:{},adaptiveRuns:0};
}
function v5Save(){save();renderV5DashboardHints();}
function v5StripStress(text=''){return String(text).normalize('NFD').replace(/\u0301/g,'').normalize('NFC')}
function v5NormalizeSpeech(text=''){
  const locale=activeCourse==='ru'?'ru-RU':activeCourse==='uz'?'uz-UZ':'en-US';
  return v5StripStress(displayClean(String(text))).normalize('NFKC').toLocaleLowerCase(locale)
    .replace(/[’‘`ʻʼ]/g,"'").replace(/[^\p{L}\p{N}'\s-]/gu,' ').replace(/\s+/g,' ').trim();
}
function v5Levenshtein(a,b){
  const x=[...a],y=[...b],row=Array(y.length+1).fill(0).map((_,i)=>i);
  for(let i=1;i<=x.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=y.length;j++){const old=row[j],cost=x[i-1]===y[j-1]?0:1;row[j]=Math.min(row[j]+1,row[j-1]+1,prev+cost);prev=old}}
  return row[y.length];
}
function v5PronunciationScore(target,spoken){
  const a=v5NormalizeSpeech(target),b=v5NormalizeSpeech(spoken);if(!a||!b)return 0;
  const char=Math.max(0,1-v5Levenshtein(a,b)/Math.max(a.length,b.length));
  const aw=new Set(a.split(' ')),bw=new Set(b.split(' '));let hit=0;aw.forEach(w=>{if(bw.has(w))hit++});
  const words=aw.size?hit/aw.size:0;return Math.max(0,Math.min(100,Math.round((char*.72+words*.28)*100)));
}
function v5TargetText(word=v5PronunciationWord){return word?.english||''}
function v5TargetMeaning(word=v5PronunciationWord){return firstMeaning(word)||word?.meaningTr||word?.translation||''}
function v5VoiceLang(course=activeCourse){return course==='en'?(profile?.voiceAccent||'en-US'):COURSES[course].voice}
function v5VoicePreference(course=activeCourse){return profile?.v5Voices?.[course]||''}
function v5SpeechRate(course=activeCourse){return Number(profile?.v5Rates?.[course]||.85)}
function v5PickVoice(lang=v5VoiceLang(),name=v5VoicePreference()){
  refreshSpeechVoices();
  return speechVoices.find(v=>v.name===name)||bestVoice(lang)||speechVoices.find(v=>String(v.lang||'').toLowerCase().startsWith(lang.slice(0,2).toLowerCase()))||null;
}
const v5LegacySpeak=speak;
speak=function(text,lang=null,options={}){
  if(!text||!('speechSynthesis'in window))return;
  const course=options.course||activeCourse,accent=lang||v5VoiceLang(course),spoken=v5StripStress(displayClean(String(text))).replace(/[_/\\]+/g,' ').replace(/\s+/g,' ').trim();
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(spoken);u.lang=accent;u.rate=Number(options.rate||v5SpeechRate(course));u.pitch=1;
  const voice=v5PickVoice(accent,profile?.v5Voices?.[course]);if(voice)u.voice=voice;speechSynthesis.speak(u);return u;
};
function v5RenderVoiceSelect(){
  const select=$('#v5VoiceSelect');if(!select)return;refreshSpeechVoices();const lang=v5VoiceLang(),prefix=lang.slice(0,2).toLowerCase();
  let options=speechVoices.filter(v=>String(v.lang||'').toLowerCase().startsWith(prefix));
  if(activeCourse==='uz'&&!options.length)options=speechVoices.filter(v=>/^tr/i.test(v.lang||''));
  if(!options.length)options=speechVoices.slice(0,20);
  const current=v5VoicePreference();select.innerHTML=options.map(v=>`<option value="${esc(v.name)}" ${v.name===current?'selected':''}>${esc(v.name)} · ${esc(v.lang||'')}</option>`).join('')||'<option value="">Cihazın varsayılan sesi</option>';
  const rate=$('#v5Rate');if(rate)rate.value=String(v5SpeechRate());if($('#v5RateOutput'))$('#v5RateOutput').textContent=`${v5SpeechRate().toFixed(2)}×`;
}
function v5RandomPronunciationTarget(){
  const candidates=words.filter(w=>w?.english&&String(w.english).length<=55&&String(w.english).split(/\s+/).length<=8&&!flagOf(w.id,'ignored'));
  v5PronunciationWord=candidates[Math.floor(Math.random()*Math.max(1,candidates.length))]||words[0]||null;renderPronunciationLab();
}
function v5PronStats(){
  const list=v5Ensure().pronunciation,avg=list.length?Math.round(list.reduce((s,x)=>s+Number(x.score||0),0)/list.length):0;
  return {list,avg,count:list.length};
}
function renderPronunciationLab(){
  if(!$('#view-pronunciation'))return;const meta=COURSES[activeCourse];if(!v5PronunciationWord||!words.includes(v5PronunciationWord))v5RandomPronunciationTarget();
  const w=v5PronunciationWord;if(!w)return;
  $('#voiceCourseFlag').textContent=meta.flag;$('#voiceCourseName').textContent=meta.name;$('#pronunciationTarget').textContent=v5TargetText(w);$('#pronunciationTargetReading').textContent=w.pronunciation||'';$('#pronunciationTargetMeaning').textContent=v5TargetMeaning(w);$('#pronunciationTargetLevel').textContent=cefr(w)||'A1';
  const p=v5PronStats();$('#pronunciationCourseScore').textContent=p.count?`%${p.avg}`:'—';$('#pronunciationAttemptCount').textContent=`${p.count} deneme`;
  $('#pronunciationHistory').innerHTML=p.list.slice(-10).reverse().map(x=>`<article><span class="pron-score ${x.score>=80?'good':x.score>=55?'mid':'low'}">${x.score}</span><div><b>${esc(x.target)}</b><small>Algılanan: ${esc(x.spoken||'—')}</small></div><time>${new Date(x.at).toLocaleDateString('tr-TR')}</time></article>`).join('')||'<p class="muted">Henüz telaffuz denemesi yok.</p>';
  v5RenderVoiceSelect();
}
function v5SpeechRecognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function v5StartPronunciation(){
  const Ctor=v5SpeechRecognitionCtor();if(!Ctor){toast('Bu tarayıcı mikrofonlu konuşma tanımayı desteklemiyor. Chrome kullan.');return}
  if(v5Recognition){try{v5Recognition.abort()}catch{}}
  const btn=$('#pronunciationRecord'),result=$('#pronunciationResult');v5Recognition=new Ctor();v5Recognition.lang=v5VoiceLang();v5Recognition.interimResults=false;v5Recognition.maxAlternatives=3;v5Recognition.continuous=false;
  btn.classList.add('recording');btn.querySelector('b').textContent='Dinleniyor…';result.hidden=true;
  v5Recognition.onresult=e=>{const candidates=[...e.results[0]].map(x=>x.transcript),target=v5TargetText(),ranked=candidates.map(spoken=>({spoken,score:v5PronunciationScore(target,spoken)})).sort((a,b)=>b.score-a.score),best=ranked[0]||{spoken:'',score:0};
    const v5=v5Ensure();v5.pronunciation.push({target,spoken:best.spoken,score:best.score,at:new Date().toISOString()});v5.pronunciation=v5.pronunciation.slice(-50);adjustPoints(best.score>=80?12:best.score>=55?6:2);v5Save();
    result.hidden=false;result.className=`pronunciation-result ${best.score>=80?'good':best.score>=55?'mid':'low'}`;result.innerHTML=`<strong>%${best.score}</strong><div><b>${best.score>=80?'Çok iyi!':best.score>=55?'İyi başlangıç':'Bir kez daha dene'}</b><p>Algılanan: ${esc(best.spoken||'—')}</p></div>`;renderPronunciationLab();
  };
  v5Recognition.onerror=e=>{toast(e.error==='not-allowed'?'Mikrofon izni verilmedi.':'Ses algılanamadı. Tekrar dene.');};
  v5Recognition.onend=()=>{btn.classList.remove('recording');btn.querySelector('b').textContent='Okumaya başla';};
  try{v5Recognition.start()}catch{toast('Mikrofon şu an başlatılamadı.')}
}

async function v5LoadStories(){if(v5Stories.length)return v5Stories;const r=await fetch(`${V5_STORY_FILE}?v=${VERSION}`,{cache:'no-store'});if(!r.ok)throw new Error('stories');v5Stories=await r.json();return v5Stories}
function v5CourseStories(){return v5Stories.filter(s=>s.course===activeCourse)}
function v5StoryProgress(){const complete=v5Ensure().stories||{},all=v5CourseStories();return {done:all.filter(x=>complete[x.id]?.completed).length,total:all.length}}
async function renderStoryLibrary(){
  try{await v5LoadStories()}catch{if($('#storyList'))$('#storyList').innerHTML='<p class="muted">Hikâyeler yüklenemedi.</p>';return}
  const meta=COURSES[activeCourse],list=v5CourseStories(),progress=v5StoryProgress();$('#storyCourseTitle').textContent=`${meta.name} hikâyeleri`;$('#storyProgressText').textContent=`${progress.done} / ${progress.total} tamamlandı`;
  $('#storyList').innerHTML=list.map(st=>{const done=!!v5Ensure().stories?.[st.id]?.completed;return `<button type="button" class="story-list-item ${v5Story?.id===st.id?'active':''} ${done?'done':''}" data-story-id="${esc(st.id)}"><span>${done?'✓':'📖'}</span><div><b>${esc(st.title)}</b><small>${esc(st.level)} · ${esc(st.topic)}</small></div><em>→</em></button>`}).join('');
  if(v5Story&&v5Story.course===activeCourse)renderStoryReader(v5Story);else $('#storyReader').innerHTML='<div class="story-empty"><span>📖</span><h2>Bir hikâye seç</h2><p>Metni dinleyebilir, çeviriyi açabilir ve soruları çözebilirsin.</p></div>';
}
function renderStoryReader(story){
  v5Story=story;v5StoryAnswers={};const completed=!!v5Ensure().stories?.[story.id]?.completed;
  $('#storyReader').innerHTML=`<div class="story-reader-head"><div><span class="chip">${esc(story.level)} · ${esc(story.topic)}</span><h2>${esc(story.title)}</h2></div><div><button class="secondary" type="button" data-story-speak-all>🔊 Tamamını dinle</button><button class="soft" type="button" data-story-toggle-translation>Çevirileri aç</button></div></div><div class="story-lines">${story.lines.map((line,i)=>`<article><button type="button" data-story-line-speak="${i}" aria-label="Satırı dinle">🔊</button><div><p>${esc(line.text)}</p><small class="story-translation" hidden>${esc(line.translation)}</small></div></article>`).join('')}</div><section class="story-questions"><h3>Metin soruları</h3>${story.questions.map((q,qi)=>`<article><b>${qi+1}. ${esc(q.q)}</b><div>${q.options.map((o,oi)=>`<button type="button" data-story-answer="${qi}:${oi}">${esc(o)}</button>`).join('')}</div></article>`).join('')}<button class="primary" type="button" data-story-check>Kontrol et</button><p id="storyFeedback">${completed?'Bu hikâyeyi daha önce tamamladın.':''}</p></section>`;
}
function v5CheckStory(){
  if(!v5Story)return;let correct=0;v5Story.questions.forEach((q,i)=>{if(Number(v5StoryAnswers[i])===Number(q.answer))correct++});const total=v5Story.questions.length,ok=correct===total;
  $('#storyFeedback').textContent=`${correct} / ${total} doğru${ok?' · Hikâye tamamlandı!':''}`;if(ok){v5Ensure().stories[v5Story.id]={completed:true,score:correct,at:new Date().toISOString()};adjustPoints(25);v5Save();renderStoryLibrary()}
}

function v5HistoryForScenario(){const v=v5Ensure(),key=`${activeCourse}:${v5AiScenario}`;return v.aiHistory[key]=Array.isArray(v.aiHistory[key])?v.aiHistory[key]:[]}
function v5ScenarioStarter(){
  const map={
    en:{intro:'Hello! What is your name and where are you from?',cafe:'Hello! What would you like to order?',travel:'Where would you like to travel today?',work:'Tell me about your work or school day.',health:'How are you feeling today?'},
    ru:{intro:'Приве́т! Как вас зову́т и отку́да вы?',cafe:'Здра́вствуйте! Что вы хоти́те заказа́ть?',travel:'Куда́ вы хоти́те пое́хать?',work:'Расскажи́те о ва́шей рабо́те или учёбе.',health:'Как вы себя́ чу́вствуете сего́дня?'},
    uz:{intro:'Salom! Ismingiz nima va qayerdansiz?',cafe:'Salom! Nima buyurtma qilmoqchisiz?',travel:'Bugun qayerga sayohat qilmoqchisiz?',work:'Ishingiz yoki o‘qishingiz haqida ayting.',health:'Bugun o‘zingizni qanday his qilyapsiz?'}
  };return map[activeCourse]?.[v5AiScenario]||map.en.intro;
}
function v5LocalCoachReply(message){
  const m=v5NormalizeSpeech(message),course=activeCourse,scenario=v5AiScenario;
  const replies={
    en:{intro:`Nice to meet you. Can you tell me one thing you like doing?`,cafe:`Good choice. Would you like anything to drink with that?`,travel:`That sounds interesting. How will you get there?`,work:`What is the most important task in your day?`,health:`I understand. When did you start feeling this way?`},
    ru:{intro:`О́чень прия́тно. Что вы лю́бите де́лать в свобо́дное вре́мя?`,cafe:`Хоро́ший вы́бор. Что бу́дете пить?`,travel:`Интере́сно. Как вы туда́ пое́дете?`,work:`Кака́я зада́ча са́мая ва́жная в ва́шем дне?`,health:`Понима́ю. Когда́ вы на́чали так себя́ чу́вствовать?`},
    uz:{intro:`Tanishganimdan xursandman. Bo‘sh vaqtingizda nima qilishni yoqtirasiz?`,cafe:`Yaxshi tanlov. Nima ichasiz?`,travel:`Qiziq. U yerga qanday borasiz?`,work:`Kuningizdagi eng muhim vazifa nima?`,health:`Tushundim. Qachondan beri shunday his qilyapsiz?`}
  };
  let correction='';if(course==='en'&&m&&m.split(' ').length<3)correction='Daha doğal bir cevap için tam cümle kurmayı dene.';if(course==='ru'&&!/[а-яё]/i.test(message))correction='Rusça pratik için cevabı Kiril harfleriyle yazmayı dene.';if(course==='uz'&&m&&m.split(' ').length<3)correction='Özbekçe cevabını kısa bir tam cümle hâline getirebilirsin.';
  return {text:replies[course]?.[scenario]||replies.en.intro,correction,mode:'local'};
}
async function v5LoadFunctionsSdk(){
  if(window.firebase?.functions)return true;if(!window.firebase)return false;
  try{await loadExternalScript('https://www.gstatic.com/firebasejs/12.16.0/firebase-functions-compat.js');return !!window.firebase?.functions}catch{return false}
}
async function v5CloudAi(history,message){
  if(!authUser||!fbAuth)throw new Error('AUTH_REQUIRED');if(!(await v5LoadFunctionsSdk()))throw new Error('SDK_UNAVAILABLE');
  const callable=window.firebase.app().functions(V5_SECURITY.aiRegion||'us-central1').httpsCallable('aiCoach');
  const response=await callable({course:activeCourse,level:'A1-A2',scenario:v5AiScenario,message,history:history.slice(-10).map(x=>({role:x.role,text:x.text}))});return response?.data||{};
}
function renderAiCoach(){
  const meta=COURSES[activeCourse],scenario=V5_SCENARIOS[v5AiScenario];$('#aiCourseFlag').textContent=meta.flag;$('#aiScenarioTitle').textContent=scenario.title;$('#aiScenarioHint').textContent=scenario.hint;
  $('#aiScenarioList').innerHTML=Object.entries(V5_SCENARIOS).map(([id,s])=>`<button type="button" class="${id===v5AiScenario?'active':''}" data-ai-scenario="${id}"><span>${s.icon}</span><div><b>${s.title}</b><small>${s.hint}</small></div></button>`).join('');
  const backend=$('#aiBackendStatus'),configured=!!V5_SECURITY.aiEnabled;backend.className=`ai-backend-status ${configured?'ready':'local'}`;backend.innerHTML=configured?'<b>Güvenli AI hazır</b><small>Firebase Function + App Check</small>':'<b>Yerel koç modu</b><small>Gerçek AI, güvenlik kurulumu tamamlanınca açılır.</small>';
  const history=v5HistoryForScenario();if(!history.length)history.push({role:'assistant',text:v5ScenarioStarter(),mode:'local',at:new Date().toISOString()});
  $('#aiChatMessages').innerHTML=history.map(x=>`<article class="ai-message ${x.role}"><span>${x.role==='assistant'?'WP':'Sen'}</span><div><p>${esc(x.text)}</p>${x.correction?`<small>💡 ${esc(x.correction)}</small>`:''}</div></article>`).join('');$('#aiChatMessages').scrollTop=$('#aiChatMessages').scrollHeight;
}
async function v5SendAiMessage(message){
  const history=v5HistoryForScenario();history.push({role:'user',text:message,at:new Date().toISOString()});renderAiCoach();v5AiBusy=true;$('#aiChatInput').disabled=true;
  let reply;try{if(V5_SECURITY.aiEnabled)reply=await v5CloudAi(history,message);else throw new Error('LOCAL')}catch(error){reply=v5LocalCoachReply(message);if(error?.message==='AUTH_REQUIRED')reply.correction='Gerçek AI için Google hesabıyla giriş yapmalısın.'}
  history.push({role:'assistant',text:reply.text||v5LocalCoachReply(message).text,correction:reply.correction||'',mode:reply.mode||'cloud',at:new Date().toISOString()});while(history.length>30)history.shift();v5AiBusy=false;$('#aiChatInput').disabled=false;v5Save();renderAiCoach();
}

function v5AdaptivePriority(word){
  const h=state.history?.[word.id]||{},last=h.last?new Date(h.last).getTime():0,ageDays=last?Math.max(0,(Date.now()-last)/864e5):999,wrong=Number(h.wrong)||0,right=Number(h.right)||0,level=Number(h.level)||0;
  let score=0;if(h.needsReview)score+=80;score+=wrong*18;score+=Math.min(45,ageDays*3);score+=Math.max(0,22-level*4);if(statusOf(word.id)==='hard')score+=25;if(flagOf(word.id,'veryHard'))score+=35;if(statusOf(word.id)==='memorized')score-=60;if(!last)score+=12;score-=right*2;return score;
}
function v5AdaptiveWords(limit=20){return words.filter(w=>!flagOf(w.id,'ignored')).map(w=>({word:w,score:v5AdaptivePriority(w)})).sort((a,b)=>b.score-a.score||a.word.id-b.word.id).slice(0,limit)}
const v5OldMakePool=makePool;
makePool=function(mode,range=null,source='all'){if(source==='adaptive')return v5AdaptiveWords(50).map(x=>x.word).filter(w=>mode!=='cloze'||exampleContainsTarget(w));return v5OldMakePool(mode,range,source)};
function renderAdaptivePlan(){
  const ranked=v5AdaptiveWords(20),review=ranked.filter(x=>state.history?.[x.word.id]?.needsReview).length,newItems=ranked.filter(x=>!state.history?.[x.word.id]?.last).length,hard=ranked.filter(x=>statusOf(x.word.id)==='hard'||flagOf(x.word.id,'veryHard')).length;
  $('#adaptiveTitle').textContent=`${COURSES[activeCourse].name} için ${ranked.length} kayıtlık plan`;$('#adaptiveSummary').textContent=`${review} tekrar, ${hard} zor kayıt ve ${newItems} yeni kayıt önceliklendirildi.`;$('#adaptiveCount').textContent=`${ranked.length} kayıt`;
  $('#adaptiveMetrics').innerHTML=`<article><span>🔁</span><b>${review}</b><small>Tekrar zamanı</small></article><article><span>🔥</span><b>${hard}</b><small>Zor kayıt</small></article><article><span>✨</span><b>${newItems}</b><small>Yeni kayıt</small></article><article><span>🧠</span><b>${v5Ensure().adaptiveRuns}</b><small>Tamamlanan plan</small></article>`;
  $('#adaptiveWordList').innerHTML=ranked.map((x,i)=>`<article><span>${i+1}</span><div><b>${esc(x.word.english)}</b><small>${esc(firstMeaning(x.word))}</small></div><em>${Math.round(x.score)} öncelik</em></article>`).join('');
}

function v5PeriodDays(count=14){const arr=[];for(let i=count-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=dateKey(d),val=state.stats.days?.[key]||{};arr.push({key,label:d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit'}),answers:Number(val.answers)||0,points:Number(val.points)||0})}return arr}
function renderV5ProfessionalStats(){
  if(!$('#v5StatCards'))return;const meta=COURSES[activeCourse],all=periodTotals('all'),week=periodTotals('weekly'),countsNow=counts(),pron=v5PronStats(),story=v5StoryProgress(),review=new Set([...reviewIds(),...wrongIds()]).size;$('#v5StatsCourse').textContent=`${meta.flag} ${meta.name}`;
  $('#v5StatCards').innerHTML=`<article><small>KURS XP</small><strong>${Math.round(all.points)}</strong><span>Bu hafta ${Math.round(week.points)} XP</span></article><article><small>DOĞRULUK</small><strong>${all.answers?`%${Math.round(all.correct/all.answers*100)}`:'—'}</strong><span>${all.answers} cevap</span></article><article><small>TELAFFUZ</small><strong>${pron.count?`%${pron.avg}`:'—'}</strong><span>${pron.count} deneme</span></article><article><small>OKUMA</small><strong>${story.done}/${story.total}</strong><span>hikâye tamamlandı</span></article><article><small>TEKRAR</small><strong>${review}</strong><span>kayıt bekliyor</span></article><article><small>İŞARETLİ</small><strong>${countsNow.learn+countsNow.memorized+countsNow.hard}</strong><span>${words.length} kayıt içinde</span></article>`;
  const days=v5PeriodDays(),max=Math.max(1,...days.map(x=>x.answers));$('#v5ActivityChart').innerHTML=days.map(x=>`<div title="${x.label}: ${x.answers} cevap"><i style="height:${Math.max(4,x.answers/max*100)}%"></i><small>${x.label.slice(0,2)}</small></div>`).join('');
  const modes=Object.entries(v43ModeStats()).sort((a,b)=>b[1]-a[1]).slice(0,7),maxMode=Math.max(1,...modes.map(x=>x[1]));$('#v5ModeChart').innerHTML=modes.map(([id,value])=>`<div><span>${esc(MODE_LABEL[id]||id)}</span><i><em style="width:${value/maxMode*100}%"></em></i><b>${value}</b></div>`).join('')||'<p class="muted">Oyun verisi henüz oluşmadı.</p>';
  const recent=pron.list.slice(-10),maxPron=100;$('#v5PronunciationChart').innerHTML=recent.map(x=>`<div title="%${x.score}"><i style="height:${Math.max(5,x.score/maxPron*100)}%"></i><small>${x.score}</small></div>`).join('')||'<p class="muted">İlk telaffuz denemeni yap.</p>';
  $('#v5SyncMatrix').innerHTML=`<div class="${authUser?'ok':'wait'}"><span>${authUser?'✓':'○'}</span><b>Google hesabı</b><small>${authUser?'Bağlı':'Misafir modunda'}</small></div><div class="${cloudReady?'ok':'wait'}"><span>${cloudReady?'✓':'○'}</span><b>Kurs ilerlemesi</b><small>${cloudReady?'Bulut eşitleniyor':'Cihazda korunuyor'}</small></div><div class="${navigator.onLine?'ok':'wait'}"><span>${navigator.onLine?'✓':'○'}</span><b>Bağlantı</b><small>${navigator.onLine?'Çevrimiçi':'Çevrimdışı'}</small></div><div class="${v5AppCheckReady?'ok':'wait'}"><span>${v5AppCheckReady?'✓':'○'}</span><b>App Check</b><small>${v5AppCheckReady?'Etkin':'Kurulum bekliyor'}</small></div>`;
}

const v5OldUpdateLeaderboardEntry=updateLeaderboardEntry;
updateLeaderboardEntry=function(){v5OldUpdateLeaderboardEntry();let board=[];try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}const email=(profile?.email||'guest@local').toLowerCase(),row=board.find(x=>String(x.email||'').toLowerCase()===email);if(row){row.coursePoints=v431CoursePoints();row.activeCourse=activeCourse;localStorage.setItem(LEADERBOARD_KEY,JSON.stringify(board))}};

function v5CoursePoint(row,period=leaderboardPeriod){const field=period==='daily'?'dailyPoints':period==='weekly'?'weeklyPoints':period==='monthly'?'monthlyPoints':'points',hasCourse=!!(row?.coursePoints&&Object.prototype.hasOwnProperty.call(row.coursePoints,activeCourse));if(hasCourse)return Math.max(0,Math.round(Number(row.coursePoints[activeCourse]?.[field])||0));return Math.max(0,Math.round(Number(row?.[field])||0))}
leagueScore=function(row,period=leaderboardPeriod){return v5CoursePoint(row,period)};
leagueField=function(period=leaderboardPeriod){return `coursePoints.${activeCourse}.${period==='daily'?'dailyPoints':period==='weekly'?'weeklyPoints':period==='monthly'?'monthlyPoints':'points'}`};
leagueLabel=function(period=leaderboardPeriod){const label=period==='daily'?'Bugünkü':period==='weekly'?'Bu haftaki':period==='monthly'?'Bu ayki':'Toplam';return `${COURSES[activeCourse].name} · ${label} XP’ye göre`};
const v5OldV431CoursePoints=v431CoursePoints;
v431CoursePoints=function(){const out=v5OldV431CoursePoints();COURSE_IDS.forEach(id=>{const m=v431CourseMetrics(id),month=periodTotalsForState(m.st,'monthly');out[id].monthlyPoints=Math.round(month.points)});return out};
function v5RenderLeagueHeader(){const meta=COURSES[activeCourse];if($('#leagueCourseEyebrow'))$('#leagueCourseEyebrow').textContent=`${meta.name.toLocaleUpperCase('tr-TR')} LİGİ`;if($('#leagueCourseTitle'))$('#leagueCourseTitle').textContent=`${meta.name} kursunda kim önde?`;if($('#leaderboardScope'))$('#leaderboardScope').textContent=`${meta.flag} ${meta.name}`;}
const v5OldRenderLeaderboard=renderLeaderboard;
renderLeaderboard=function(){v5RenderLeagueHeader();return v5OldRenderLeaderboard()};

function renderV5DashboardHints(){
  const meta=COURSES[activeCourse],pron=v5PronStats(),story=v5Stories.length?v5StoryProgress():{done:0,total:0};
  document.querySelectorAll('.v5-feature-card').forEach(card=>card.dataset.course=activeCourse);
  const p=$('.v5-feature-card.voice small');if(p)p.textContent=pron.count?`${pron.count} deneme · ortalama %${pron.avg}`:'Dinle, kaydet ve dil bazlı puanını gör';
  const st=$('.v5-feature-card.stories small');if(st)st.textContent=story.total?`${story.done}/${story.total} ${meta.name} hikâyesi tamamlandı`:'A1–A2 metin, çeviri, ses ve sorular';
}
function v5RenderActiveView(){
  if($('#view-pronunciation')?.classList.contains('active'))renderPronunciationLab();
  if($('#view-ai')?.classList.contains('active'))renderAiCoach();
  if($('#view-stories')?.classList.contains('active'))renderStoryLibrary();
  if($('#view-adaptive')?.classList.contains('active'))renderAdaptivePlan();
  if($('#view-progress')?.classList.contains('active'))renderV5ProfessionalStats();
}
const v5OldRenderDashboard=renderDashboard;
renderDashboard=function(){v5OldRenderDashboard();renderV5DashboardHints()};
const v5OldRenderProgress=renderProgress;
renderProgress=function(){v5OldRenderProgress();renderV5ProfessionalStats()};
const v5OldUpdateCourseUI=updateCourseUI;
updateCourseUI=function(){v5OldUpdateCourseUI();v5PronunciationWord=null;v5Story=null;v5RenderLeagueHeader();renderV5DashboardHints();v5RenderActiveView()};

async function v5InitAppCheck(){
  if(!V5_SECURITY.appCheckSiteKey||!window.firebase)return false;
  try{await loadExternalScript('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check-compat.js');window.firebase.appCheck().activate(new window.firebase.appCheck.ReCaptchaEnterpriseProvider(V5_SECURITY.appCheckSiteKey),true);v5AppCheckReady=true;return true}catch(error){console.warn('App Check init',error);return false}
}
function v5ContentGuard(){
  document.addEventListener('contextmenu',e=>{if(e.target.closest('.study-card,.story-reader,.word-row,.academy-view')){e.preventDefault();toast('Ders içeriğinde sağ tık kapalıdır.')}});
  document.addEventListener('copy',e=>{if(e.target.closest('.study-card,.story-reader,.word-row,.academy-view')&&!e.target.closest('input,textarea')){e.preventDefault();e.clipboardData?.setData('text/plain','WordPilot · Eğitim içeriği');toast('Ders içeriğinin toplu kopyalanması sınırlandırıldı.')}});
}
function setupV50Events(){
  document.addEventListener('click',async e=>{
    const open=e.target.closest('[data-v5-open]');if(open){nav(open.dataset.v5Open);v5RenderActiveView();return}
    if(e.target.closest('#newPronunciationTarget')){v5RandomPronunciationTarget();return}
    if(e.target.closest('#pronunciationListen')){speak(v5TargetText());return}
    if(e.target.closest('#pronunciationListenSlow')){speak(v5TargetText(),null,{rate:.58});return}
    if(e.target.closest('#pronunciationRecord')){v5StartPronunciation();return}
    if(e.target.closest('#v5TestVoice')){speak(v5PronunciationWord?.english||words[0]?.english||COURSES[activeCourse].name);return}
    if(e.target.closest('#v5StopVoice')){speechSynthesis?.cancel();return}
    const storyBtn=e.target.closest('[data-story-id]');if(storyBtn){const all=await v5LoadStories();const st=all.find(x=>x.id===storyBtn.dataset.storyId);if(st)renderStoryReader(st);return}
    const line=e.target.closest('[data-story-line-speak]');if(line&&v5Story){speak(v5Story.lines[Number(line.dataset.storyLineSpeak)]?.text);return}
    if(e.target.closest('[data-story-speak-all]')&&v5Story){speak(v5Story.lines.map(x=>x.text).join(' '));return}
    if(e.target.closest('[data-story-toggle-translation]')){$$('.story-translation').forEach(x=>x.hidden=!x.hidden);return}
    const ans=e.target.closest('[data-story-answer]');if(ans){const [q,o]=ans.dataset.storyAnswer.split(':').map(Number);v5StoryAnswers[q]=o;ans.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===ans));return}
    if(e.target.closest('[data-story-check]')){v5CheckStory();return}
    const scenario=e.target.closest('[data-ai-scenario]');if(scenario){v5AiScenario=scenario.dataset.aiScenario;renderAiCoach();return}
    if(e.target.closest('#aiResetChat')){const key=`${activeCourse}:${v5AiScenario}`;v5Ensure().aiHistory[key]=[];v5Save();renderAiCoach();return}
    if(e.target.closest('#startAdaptivePlan')){v5Ensure().adaptiveRuns++;v5Save();startStudy('smart',null,'classic','adaptive',false);return}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='v5VoiceSelect'){profile.v5Voices=profile.v5Voices||{};profile.v5Voices[activeCourse]=e.target.value;v5Save();return}
    if(e.target.id==='v5Rate'){profile.v5Rates=profile.v5Rates||{};profile.v5Rates[activeCourse]=Number(e.target.value);$('#v5RateOutput').textContent=`${Number(e.target.value).toFixed(2)}×`;v5Save();return}
  });
  document.addEventListener('input',e=>{if(e.target.id==='v5Rate')$('#v5RateOutput').textContent=`${Number(e.target.value).toFixed(2)}×`});
  document.addEventListener('submit',e=>{if(e.target.id==='aiChatForm'){e.preventDefault();if(v5AiBusy)return;const input=$('#aiChatInput'),value=input.value.trim();if(!value)return;input.value='';v5SendAiMessage(value)}});
  if('speechSynthesis'in window)window.speechSynthesis.addEventListener?.('voiceschanged',()=>v5RenderVoiceSelect());
  v5ContentGuard();
  v5LoadStories().then(()=>{renderV5DashboardHints();if($('#view-progress')?.classList.contains('active'))renderV5ProfessionalStats()}).catch(()=>{});
}

