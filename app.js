
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORE='wordpilot_v34'; // Eski anahtar korunur; mevcut ilerleme kaybolmaz.
const VERSION='9.2.0';
const SW_FILE='sw.js';
const LEADERBOARD_KEY=`${STORE}:leaderboard`;
const GUEST_ACK_KEY=`${STORE}:guest_acknowledged`;
const AUTH_FLOW_KEY=`${STORE}:google_auth_flow`;
const STATUS_LABEL={learn:'Öğreniyorum',memorized:'Ezberledim',hard:'Zorlanıyorum'};
const FLAG_LABEL={favorite:'Favori',veryHard:'Çok zor',ignored:'Tekrar gösterme'};
const MODE_LABEL={
  smart:'Akıllı Quiz',flash:'Kelime Kartları','en-tr':'Yaz EN → TR','tr-en':'Yaz TR → EN',
  synonym:'Eş Anlamlı Quiz',antonym:'Zıt Anlamlı Quiz',review:'Akıllı Tekrar',comprehensive:'Kapsamlı Quiz',listening:'Çoktan Seçmeli',matching:'Eşleştirme','wrong-review':'Yanlışlar Tekrarı',cloze:'Boşluk Doldurma',sentence:'Cümle Tamamlama',dictation:'Dinlediğini Yaz',ordering:'Cümle Sıralama'
};

const FIREBASE_CONFIG={
  apiKey:'AIzaSyAZW-p7wdUfvBh66um0ngCw86SYOKNrelY',
  authDomain:'wordpilot-7a574.firebaseapp.com',
  projectId:'wordpilot-7a574',
  storageBucket:'wordpilot-7a574.firebasestorage.app',
  messagingSenderId:'1024648950699',
  appId:'1:1024648950699:web:c7d394327b153ccfe358ee',
  measurementId:'G-QER57NNSES'
};

const COURSES={
  en:{id:'en',name:'English',short:'EN',flag:'🇬🇧',file:'clean_concepts_v711.json',voice:'en-US',voiceAlt:'en-GB',displayCount:1000,countLabel:'1000 bağlantılı ticari temiz kavram',targetLabel:'İNGİLİZCE',starter:true},
  ru:{id:'ru',name:'Русский',short:'RU',flag:'🇷🇺',file:'ru_words.json',voice:'ru-RU',voiceAlt:'ru-RU',displayCount:1500,countLabel:'1500 kontrollü kelime ve ifade + bağlantılı çekirdek',targetLabel:'RUSÇA',starter:true},
  uz:{id:'uz',name:'O‘zbekcha',short:'UZ',flag:'🇺🇿',file:'uz_words.json',voice:'uz-UZ',voiceAlt:'uz-UZ',displayCount:1000,countLabel:'1000 kontrollü kelime ve ifade + bağlantılı çekirdek',targetLabel:'ÖZBEKÇE',starter:true},
  tr:{id:'tr',name:'Türkçe',short:'TR',flag:'🇹🇷',file:'clean_concepts_v711.json',voice:'tr-TR',voiceAlt:'tr-TR',displayCount:1000,countLabel:'1000 bağlantılı ticari temiz kavram',targetLabel:'TÜRKÇE',starter:true}
};
const COURSE_IDS=['en','ru','uz','tr'];
const ACTIVE_COURSE_KEY=`${STORE}:active_course`;
let activeCourse=localStorage.getItem(ACTIVE_COURSE_KEY)||'en';
if(!COURSES[activeCourse])activeCourse='en';
let courseWordCache={},cloudCourseStates={},taskRewardGuard=false;


let words=[], profile=null, state=null, currentWord=null, listLimit=80, session=null, deferredPrompt=null;
let fbAuth=null,fbDb=null,authUser=null,cloudReady=false,cloudSyncTimer=null,cloudSyncBusy=false,cloudSyncQueued=false,leaderboardFetch=null,cloudLeaderboardCache={},leaderboardPeriod='all',leaderboardAudience='world',authBusy=false,leaderboardUnsubscribe=null,leaderboardRealtimeKey='',leaderboardWriteTimer=null,leaderboardWriteBusy=false,leaderboardWriteQueued=false;
const SESSION_KEY='wordpilot_active_session_v34';
function selectedQuizStyle(){return document.querySelector('input[name="quizStyle"]:checked')?.value||'classic'}

function saveSession(){
  if(!session)return;
  const serial={
    mode:session.mode,quizStyle:session.quizStyle,range:session.range,source:session.source,useAll:session.useAll,total:session.total,index:session.index,
    correct:session.correct,score:session.score||0,currentId:session.current?.id||null,
    autoSpeak:session.autoSpeak,hiddenMode:session.hiddenMode,correctTarget:session.correctTarget,
    matchingOffset:session.matchingOffset||0,currentAttempts:session.currentAttempts||0,combo:session.combo||0,maxCombo:session.maxCombo||0,
    poolIds:session.pool.map(w=>w.id),done:[...session.done],
    queue:session.queue.map(q=>({id:q.word.id,due:q.due})),historyIds:session.historyIds||[]
  };
  localStorage.setItem(SESSION_KEY,JSON.stringify(serial));
}

function clearSavedSession(){localStorage.removeItem(SESSION_KEY)}

function restoreSavedSession(){
  let raw;try{raw=JSON.parse(localStorage.getItem(SESSION_KEY))}catch{return false}
  if(!raw||!raw.poolIds?.length)return false;
  const pool=raw.poolIds.map(id=>words.find(w=>w.id===id)).filter(Boolean);
  if(!pool.length)return false;
  session={
    mode:raw.mode||'smart',quizStyle:raw.quizStyle||'classic',range:raw.range||null,total:raw.total||pool.length,
    index:raw.index||0,correct:raw.correct||0,score:raw.score||0,
    pool,done:new Set(raw.done||[]),queue:(raw.queue||[]).map(q=>({word:words.find(w=>w.id===q.id),due:q.due})).filter(q=>q.word),
    historyIds:raw.historyIds||[],answered:false,current:null,advanceTimer:null,timerId:null,timeLeft:15,
    questionType:null,autoSpeak:raw.autoSpeak!==false,hiddenMode:!!raw.hiddenMode,
    correctTarget:raw.correctTarget||'learn',source:raw.source||'all',useAll:!!raw.useAll,matchingOffset:raw.matchingOffset||0,
    matchBatch:[],matchSelectedLeft:null,matchSelectedRight:null,currentAttempts:0,hintRevealCount:0,questionStartedAt:Date.now(),combo:raw.combo||0,maxCombo:raw.maxCombo||0,completed:false
  };
  nav('study');nextStudy();
  toast('Kaydedilen oturuma devam ediliyor.');
  return true;
}

function defaultState(){
  const now=new Date().toISOString();
  return {
    statuses:{},statusUpdated:{},
    flags:{favorite:{},veryHard:{},ignored:{}},
    flagUpdated:{favorite:{},veryHard:{},ignored:{}},
    history:{},selected:[],selectionUpdated:{},friends:{},friendUpdated:{},
    stats:{answers:0,correct:0,todayAnswers:0,todayCorrect:0,lastDay:'',streak:0,bestStreak:0,points:0,sessions:0,joinedAt:now,days:{},taskClaims:{}},
    lastActive:now
  };
}
function ensureStateShape(input){
  const base=defaultState(),out=input&&typeof input==='object'?input:base;
  if(!out.lastActive)out.lastActive=new Date(0).toISOString();
  const legacyAt=Date.parse(out.lastActive)||0;
  out.statuses=out.statuses&&typeof out.statuses==='object'?out.statuses:{};
  out.statusUpdated=out.statusUpdated&&typeof out.statusUpdated==='object'?out.statusUpdated:{};
  Object.entries(out.statuses).forEach(([id,value])=>{if(!out.statusUpdated[id])out.statusUpdated[id]={value,at:legacyAt}});
  const normalizedStatus={};
  Object.entries(out.statusUpdated).forEach(([id,rec])=>{
    const value=typeof rec==='string'?rec:String(rec?.value||'');
    const at=Number(typeof rec==='object'?rec?.at:legacyAt)||legacyAt;
    out.statusUpdated[id]={value,at};if(value)normalizedStatus[id]=value;
  });
  out.statuses=normalizedStatus;

  out.flags=out.flags&&typeof out.flags==='object'?out.flags:{};
  out.flagUpdated=out.flagUpdated&&typeof out.flagUpdated==='object'?out.flagUpdated:{};
  ['favorite','veryHard','ignored'].forEach(flag=>{
    out.flags[flag]=out.flags[flag]&&typeof out.flags[flag]==='object'?out.flags[flag]:{};
    out.flagUpdated[flag]=out.flagUpdated[flag]&&typeof out.flagUpdated[flag]==='object'?out.flagUpdated[flag]:{};
    Object.entries(out.flags[flag]).forEach(([id,value])=>{if(value&&!out.flagUpdated[flag][id])out.flagUpdated[flag][id]={value:true,at:legacyAt}});
    const normalized={};
    Object.entries(out.flagUpdated[flag]).forEach(([id,rec])=>{
      const value=typeof rec==='boolean'?rec:!!rec?.value;
      const at=Number(typeof rec==='object'?rec?.at:legacyAt)||legacyAt;
      out.flagUpdated[flag][id]={value,at};if(value)normalized[id]=true;
    });
    out.flags[flag]=normalized;
  });

  out.selected=Array.isArray(out.selected)?out.selected.map(Number).filter(Number.isFinite):[];
  out.selectionUpdated=out.selectionUpdated&&typeof out.selectionUpdated==='object'?out.selectionUpdated:{};
  out.selected.forEach(id=>{if(!out.selectionUpdated[id])out.selectionUpdated[id]={value:true,at:legacyAt}});
  const selected=[];
  Object.entries(out.selectionUpdated).forEach(([id,rec])=>{
    const value=typeof rec==='boolean'?rec:!!rec?.value;
    const at=Number(typeof rec==='object'?rec?.at:legacyAt)||legacyAt;
    out.selectionUpdated[id]={value,at};if(value&&Number.isFinite(Number(id)))selected.push(Number(id));
  });
  out.selected=[...new Set(selected)].sort((a,b)=>a-b);

  out.friends=out.friends&&typeof out.friends==='object'?out.friends:{};
  out.friendUpdated=out.friendUpdated&&typeof out.friendUpdated==='object'?out.friendUpdated:{};
  Object.entries(out.friends).forEach(([code,value])=>{if(value&&!out.friendUpdated[code])out.friendUpdated[code]={value:true,at:legacyAt}});
  const normalizedFriends={};
  Object.entries(out.friendUpdated).forEach(([code,rec])=>{
    const cleanCode=String(code||'').trim().toUpperCase(),value=typeof rec==='boolean'?rec:!!rec?.value,at=Number(typeof rec==='object'?rec?.at:legacyAt)||legacyAt;
    if(cleanCode){out.friendUpdated[cleanCode]={value,at};if(value)normalizedFriends[cleanCode]=true}
    if(cleanCode!==code)delete out.friendUpdated[code];
  });
  out.friends=normalizedFriends;

  out.history=out.history&&typeof out.history==='object'?out.history:{};
  out.stats={...base.stats,...(out.stats&&typeof out.stats==='object'?out.stats:{})};
  ['answers','correct','todayAnswers','todayCorrect','streak','bestStreak','points','sessions'].forEach(key=>{
    out.stats[key]=Number.isFinite(Number(out.stats[key]))?Number(out.stats[key]):0;
  });
  out.stats.days=out.stats.days&&typeof out.stats.days==='object'?out.stats.days:{};
  out.stats.taskClaims=out.stats.taskClaims&&typeof out.stats.taskClaims==='object'?out.stats.taskClaims:{};
  Object.entries(out.stats.days).forEach(([day,val])=>{
    val=val&&typeof val==='object'?val:{};
    out.stats.days[day]={points:Math.max(0,Number(val.points)||0),answers:Math.max(0,Number(val.answers)||0),correct:Math.max(0,Number(val.correct)||0),sessions:Math.max(0,Number(val.sessions)||0)};
  });
  if(!out.stats.lastDay)out.stats.lastDay='';
  if(!Object.keys(out.stats.days).length&&(out.stats.todayAnswers>0||out.stats.todayCorrect>0)){
    const legacyDay=out.stats.lastDay||todayKey();out.stats.days[legacyDay]={points:0,answers:Math.max(0,Number(out.stats.todayAnswers)||0),correct:Math.max(0,Number(out.stats.todayCorrect)||0),sessions:0};
  }
  if(!out.stats.joinedAt)out.stats.joinedAt=out.lastActive||new Date().toISOString();
  return out;
}
function cloneData(value){
  try{return JSON.parse(JSON.stringify(value))}catch{return value}
}
function hasProgress(value){
  const s=ensureStateShape(cloneData(value)||defaultState());
  return Object.keys(s.statuses).length>0||Object.keys(s.history).length>0||s.selected.length>0||Object.keys(s.friends||{}).length>0||Object.values(s.flags).some(v=>Object.keys(v||{}).length>0)||Number(s.stats.answers)>0||Number(s.stats.points)>0;
}
function stateTime(value){
  const time=Date.parse(value?.lastActive||'');return Number.isFinite(time)?time:0;
}
function packState(value){
  const st=ensureStateShape(cloneData(value)||defaultState());
  // Firestore doğrudan iç içe dizileri (array içinde array) kabul etmez.
  // Bu nedenle değişiklik kayıtları v3 biçiminde nesne dizileri olarak saklanır.
  const packChanges=map=>Object.entries(map||{}).map(([id,rec])=>({
    id:Number(id),value:rec?.value??'',at:Number(rec?.at)||0
  }));
  return {
    v:3,
    statusChanges:packChanges(st.statusUpdated),
    flagChanges:{favorite:packChanges(st.flagUpdated.favorite),veryHard:packChanges(st.flagUpdated.veryHard),ignored:packChanges(st.flagUpdated.ignored)},
    selectionChanges:packChanges(st.selectionUpdated),
    friendChanges:Object.entries(st.friendUpdated||{}).map(([code,rec])=>({code,value:!!rec?.value,at:Number(rec?.at)||0})),
    history:Object.entries(st.history).map(([id,h])=>({
      id:Number(id),right:Number(h?.right)||0,wrong:Number(h?.wrong)||0,level:Number(h?.level)||0,
      last:Date.parse(h?.last||'')||0,needsReview:!!h?.needsReview
    })),
    stats:cloneData(st.stats),lastActive:String(st.lastActive||new Date().toISOString())
  };
}
function unpackState(value){
  if(!value||![2,3].includes(Number(value.v)))return value;
  const out=defaultState(),v=Number(value.v);
  if(v===2){
    // Önceki paket biçimiyle kaydedilmiş boş/eski kayıtlarla geriye uyumluluk.
    (value.statusChanges||[]).forEach(([id,val,at])=>out.statusUpdated[id]={value:String(val||''),at:Number(at)||0});
    ['favorite','veryHard','ignored'].forEach(flag=>(value.flagChanges?.[flag]||[]).forEach(([id,val,at])=>out.flagUpdated[flag][id]={value:!!val,at:Number(at)||0}));
    (value.selectionChanges||[]).forEach(([id,val,at])=>out.selectionUpdated[id]={value:!!val,at:Number(at)||0});
    (value.friendChanges||[]).forEach(([code,val,at])=>out.friendUpdated[String(code||'').toUpperCase()]={value:!!val,at:Number(at)||0});
    (value.history||[]).forEach(([id,right,wrong,level,last,needs])=>out.history[id]={right:Number(right)||0,wrong:Number(wrong)||0,level:Number(level)||0,last:last?new Date(Number(last)).toISOString():null,needsReview:!!needs});
  }else{
    (value.statusChanges||[]).forEach(rec=>out.statusUpdated[rec?.id]={value:String(rec?.value||''),at:Number(rec?.at)||0});
    ['favorite','veryHard','ignored'].forEach(flag=>(value.flagChanges?.[flag]||[]).forEach(rec=>out.flagUpdated[flag][rec?.id]={value:!!rec?.value,at:Number(rec?.at)||0}));
    (value.selectionChanges||[]).forEach(rec=>out.selectionUpdated[rec?.id]={value:!!rec?.value,at:Number(rec?.at)||0});
    (value.friendChanges||[]).forEach(rec=>out.friendUpdated[String(rec?.code||'').toUpperCase()]={value:!!rec?.value,at:Number(rec?.at)||0});
    (value.history||[]).forEach(rec=>out.history[rec?.id]={right:Number(rec?.right)||0,wrong:Number(rec?.wrong)||0,level:Number(rec?.level)||0,last:rec?.last?new Date(Number(rec.last)).toISOString():null,needsReview:!!rec?.needsReview});
  }
  out.stats=value.stats||out.stats;out.lastActive=value.lastActive||out.lastActive;
  return ensureStateShape(out);
}
function remoteStateFromDocument(data){
  if(!data||typeof data!=='object')return null;
  if(typeof data.stateJson==='string'&&data.stateJson){
    try{return JSON.parse(data.stateJson)}catch(error){console.error('Cloud state JSON parse error',error)}
  }
  return data.state||null;
}
function mergeTimedMap(a,b){
  const out={};
  new Set([...Object.keys(a||{}),...Object.keys(b||{})]).forEach(id=>{
    const ar=a?.[id],br=b?.[id],aa=Number(ar?.at)||0,ba=Number(br?.at)||0;
    out[id]=cloneData(ba>=aa?(br||ar):(ar||br));
  });
  return out;
}
function mergeStates(remoteValue,localValue){
  const remote=ensureStateShape(cloneData(unpackState(remoteValue))||defaultState());
  const local=ensureStateShape(cloneData(unpackState(localValue))||defaultState());
  const remoteHas=hasProgress(remote),localHas=hasProgress(local);
  if(remoteHas&&!localHas)return remote;
  if(localHas&&!remoteHas)return local;
  if(!remoteHas&&!localHas)return stateTime(remote)>=stateTime(local)?remote:local;
  const merged=defaultState();
  merged.statusUpdated=mergeTimedMap(remote.statusUpdated,local.statusUpdated);
  ['favorite','veryHard','ignored'].forEach(flag=>merged.flagUpdated[flag]=mergeTimedMap(remote.flagUpdated[flag],local.flagUpdated[flag]));
  merged.selectionUpdated=mergeTimedMap(remote.selectionUpdated,local.selectionUpdated);
  merged.friendUpdated=mergeTimedMap(remote.friendUpdated,local.friendUpdated);
  merged.history={};
  new Set([...Object.keys(remote.history||{}),...Object.keys(local.history||{})]).forEach(id=>{
    const a=remote.history[id],b=local.history[id];
    if(!a){merged.history[id]=cloneData(b);return}if(!b){merged.history[id]=cloneData(a);return}
    const at=Date.parse(a.last||'')||0,bt=Date.parse(b.last||'')||0,newer=bt>=at?b:a,older=newer===b?a:b;
    merged.history[id]={...cloneData(newer),right:Math.max(Number(a.right)||0,Number(b.right)||0),wrong:Math.max(Number(a.wrong)||0,Number(b.wrong)||0),level:Math.max(Number(newer.level)||0,Number(older.level)||0),needsReview:!!newer.needsReview};
  });
  const rs=remote.stats||{},ls=local.stats||{};
  merged.stats={...cloneData(stateTime(local)>=stateTime(remote)?ls:rs)};
  ['answers','correct','points','sessions','bestStreak'].forEach(key=>merged.stats[key]=Math.max(Number(rs[key])||0,Number(ls[key])||0));
  merged.stats.days={};
  new Set([...Object.keys(rs.days||{}),...Object.keys(ls.days||{})]).forEach(day=>{
    const a=rs.days?.[day]||{},b=ls.days?.[day]||{};
    merged.stats.days[day]={points:Math.max(Number(a.points)||0,Number(b.points)||0),answers:Math.max(Number(a.answers)||0,Number(b.answers)||0),correct:Math.max(Number(a.correct)||0,Number(b.correct)||0),sessions:Math.max(Number(a.sessions)||0,Number(b.sessions)||0)};
  });
  merged.stats.taskClaims={};
  new Set([...Object.keys(rs.taskClaims||{}),...Object.keys(ls.taskClaims||{})]).forEach(day=>{
    merged.stats.taskClaims[day]={...(rs.taskClaims?.[day]||{}),...(ls.taskClaims?.[day]||{})};
  });
  const joined=[rs.joinedAt,ls.joinedAt].map(x=>Date.parse(x||'')).filter(Number.isFinite);
  merged.stats.joinedAt=joined.length?new Date(Math.min(...joined)).toISOString():new Date().toISOString();
  merged.lastActive=new Date(Math.max(stateTime(remote),stateTime(local),Date.now())).toISOString();
  return ensureStateShape(merged);
}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function clean(v=''){return String(v).replace(/[★☆✦✧●○]/g,'').replace(/\s+/g,' ').trim()}
function firstMeaning(w){return clean((w?.meaning||'').split('\n')[0])}
function displayClean(v=''){return String(v).replace(/[★☆✦✧]/g,'').replace(/\s+\n/g,'\n').replace(/\n\s+/g,'\n').trim()}
function ratedLinesHtml(v=''){
  return String(v).split(/\n+/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const match=line.match(/^(.*?)(?:\s+([★☆]{1,5}))?$/),text=(match?.[1]||line).trim(),stars=match?.[2]||'';
    return `<span class="rated-line"><span>${esc(text)}</span>${stars?`<span class="usage-stars" title="Kullanım sıklığı" aria-label="Kullanım sıklığı ${stars}">${stars}</span>`:''}</span>`;
  }).join('');
}
function cefr(w){return (w?.cefr||'').match(/[ABC][12]/)?.[0]||'—'}
function dateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function todayKey(){return dateKey(new Date())}
function monthKey(date=new Date()){return dateKey(date).slice(0,7)}
function startOfWeek(date=new Date()){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d}
function weekKey(date=new Date()){return dateKey(startOfWeek(date))}
function ensureDayBucket(key=todayKey()){const days=state.stats.days||(state.stats.days={});return days[key]||(days[key]={points:0,answers:0,correct:0,sessions:0})}
function periodTotals(period='all'){
  const days=state?.stats?.days||{},today=todayKey(),week=weekKey(),month=monthKey();
  const out={points:0,answers:0,correct:0,sessions:0};
  Object.entries(days).forEach(([key,val])=>{
    const include=period==='all'||(period==='daily'&&key===today)||(period==='weekly'&&key>=week&&key<=today)||(period==='monthly'&&key.startsWith(month));
    if(!include)return;out.points+=Number(val.points)||0;out.answers+=Number(val.answers)||0;out.correct+=Number(val.correct)||0;out.sessions+=Number(val.sessions)||0;
  });
  if(period==='all'){out.points=Math.max(out.points,Number(state?.stats?.points)||0);out.answers=Math.max(out.answers,Number(state?.stats?.answers)||0);out.correct=Math.max(out.correct,Number(state?.stats?.correct)||0);out.sessions=Math.max(out.sessions,Number(state?.stats?.sessions)||0)}
  return out;
}
function computeStreak(){
  const days=state?.stats?.days||{},hasActivity=Object.values(days).some(day=>Number(day?.answers)>0);
  if(!hasActivity)return Number(state?.stats?.streak)||0;
  let cursor=new Date();if(!(days[dateKey(cursor)]?.answers>0))cursor.setDate(cursor.getDate()-1);
  let count=0;while(days[dateKey(cursor)]?.answers>0){count++;cursor.setDate(cursor.getDate()-1)}
  state.stats.streak=count;state.stats.bestStreak=Math.max(Number(state.stats.bestStreak)||0,count);return count;
}
function normalizedName(value){return String(value||'').replace(/\s+/g,' ').trim()}
function placeholderName(value){return ['misafir','öğrenci','ogrenci','guest','google hesabı bağlı'].includes(normalizedName(value).toLocaleLowerCase('tr'))}
function emailDisplayName(email){
  const local=String(email||'').split('@')[0].replace(/[._-]+/g,' ').trim();
  return local?local.split(/\s+/).map(part=>part.charAt(0).toLocaleUpperCase('tr')+part.slice(1)).join(' '):'Öğrenci';
}
function accountDisplayName(candidate=profile?.name,user=authUser){
  const custom=normalizedName(candidate);if(custom&&!placeholderName(custom))return custom;
  const google=normalizedName(user?.displayName);if(google&&!placeholderName(google))return google;
  return emailDisplayName(user?.email||profile?.email);
}
function profileKey(){return `${STORE}:${(profile?.email||'guest@local').toLowerCase()}`}
function readLocalState(email){
  if(!email)return null;
  try{
    const raw=JSON.parse(localStorage.getItem(`${STORE}:${String(email).toLowerCase()}`));
    return raw?ensureStateShape(raw):null;
  }catch{return null}
}
function load(){
  try{profile=JSON.parse(localStorage.getItem(`${STORE}:profile`))}catch{}
  if(!profile)profile={name:'Öğrenci',email:'guest@local',goal:20,voiceAccent:'en-US'};
  if(!profile.voiceAccent)profile.voiceAccent='en-US';
  if(!profile.goal)profile.goal=20;
  try{state=ensureStateShape(JSON.parse(localStorage.getItem(profileKey()))||defaultState())}catch{state=defaultState()}
  normalizeDay();
}
function leaderboardScores(){
  return {points:Math.max(0,Math.round(periodTotals('all').points)),dailyPoints:Math.max(0,Math.round(periodTotals('daily').points)),weeklyPoints:Math.max(0,Math.round(periodTotals('weekly').points)),monthlyPoints:Math.max(0,Math.round(periodTotals('monthly').points))};
}
function updateLeaderboardEntry(){
  let board=[];try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}
  const email=(profile?.email||'guest@local').toLowerCase(),scores=leaderboardScores(),c=counts();
  const entry={name:accountDisplayName(),email,friendCode:authUser?.uid?ownFriendCode(authUser.uid):'',...scores,photoURL:profile?.photoURL||'',streak:computeStreak(),memorized:c.memorized,learn:c.learn,hard:c.hard,wrong:c.wrong,favorite:c.favorite,answers:Number(state?.stats?.answers)||0,accuracy:state?.stats?.answers?Math.round(state.stats.correct/state.stats.answers*100):0,updated:new Date().toISOString()};
  const index=board.findIndex(x=>x.email===email);
  if(index>=0)board[index]=entry;else board.push(entry);
  board=board.sort((a,b)=>(b.points||0)-(a.points||0)||String(a.name).localeCompare(String(b.name),'tr')).slice(0,100);
  localStorage.setItem(LEADERBOARD_KEY,JSON.stringify(board));
}
function save(options={}){
  state=ensureStateShape(state);
  state.lastActive=new Date().toISOString();
  localStorage.setItem(`${STORE}:profile`,JSON.stringify(profile));
  localStorage.setItem(profileKey(),JSON.stringify(state));
  updateLeaderboardEntry();
  if(options.cloud!==false)scheduleCloudSync();
}
