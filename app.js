
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORE='wordpilot_v34'; // Eski anahtar korunur; mevcut ilerleme kaybolmaz.
const VERSION='3.6.3';
const LEADERBOARD_KEY=`${STORE}:leaderboard`;
const GUEST_ACK_KEY=`${STORE}:guest_acknowledged`;
const AUTH_FLOW_KEY=`${STORE}:google_auth_flow`;
const STATUS_LABEL={learn:'Öğreniyorum',memorized:'Ezberledim',hard:'Zorlanıyorum'};
const FLAG_LABEL={favorite:'Favori',veryHard:'Çok zor',ignored:'Tekrar gösterme'};
const MODE_LABEL={
  smart:'Akıllı Quiz',flash:'Kelime Kartları','en-tr':'Yaz EN → TR','tr-en':'Yaz TR → EN',
  synonym:'Eş Anlamlı Quiz',antonym:'Zıt Anlamlı Quiz',review:'Akıllı Tekrar',comprehensive:'Kapsamlı Quiz',listening:'Sesli / Gizli Mod',matching:'Eşleştirme','wrong-review':'Yanlışlar Tekrarı'
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
const DRIVE_FOLDER_URL='https://drive.google.com/drive/folders/1MkPkzyqxC_eciWam9PsinZjZRqe67XY8?usp=sharing';

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
    stats:{answers:0,correct:0,todayAnswers:0,todayCorrect:0,lastDay:'',streak:0,bestStreak:0,points:0,sessions:0,joinedAt:now,days:{}},
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
  const packChanges=map=>Object.entries(map||{}).map(([id,rec])=>[Number(id),rec?.value??'',Number(rec?.at)||0]);
  return {
    v:2,
    statusChanges:packChanges(st.statusUpdated),
    flagChanges:{favorite:packChanges(st.flagUpdated.favorite),veryHard:packChanges(st.flagUpdated.veryHard),ignored:packChanges(st.flagUpdated.ignored)},
    selectionChanges:packChanges(st.selectionUpdated),
    friendChanges:Object.entries(st.friendUpdated||{}).map(([code,rec])=>[code,!!rec?.value,Number(rec?.at)||0]),
    history:Object.entries(st.history).map(([id,h])=>[Number(id),Number(h?.right)||0,Number(h?.wrong)||0,Number(h?.level)||0,Date.parse(h?.last||'')||0,h?.needsReview?1:0]),
    stats:cloneData(st.stats),lastActive:st.lastActive
  };
}
function unpackState(value){
  if(!value||value.v!==2)return value;
  const out=defaultState();
  (value.statusChanges||[]).forEach(([id,val,at])=>out.statusUpdated[id]={value:String(val||''),at:Number(at)||0});
  ['favorite','veryHard','ignored'].forEach(flag=>(value.flagChanges?.[flag]||[]).forEach(([id,val,at])=>out.flagUpdated[flag][id]={value:!!val,at:Number(at)||0}));
  (value.selectionChanges||[]).forEach(([id,val,at])=>out.selectionUpdated[id]={value:!!val,at:Number(at)||0});
  (value.friendChanges||[]).forEach(([code,val,at])=>out.friendUpdated[String(code||'').toUpperCase()]={value:!!val,at:Number(at)||0});
  (value.history||[]).forEach(([id,right,wrong,level,last,needs])=>out.history[id]={right:Number(right)||0,wrong:Number(wrong)||0,level:Number(level)||0,last:last?new Date(Number(last)).toISOString():null,needsReview:!!needs});
  out.stats=value.stats||out.stats;out.lastActive=value.lastActive||out.lastActive;
  return ensureStateShape(out);
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
function setSyncStatus(text,type=''){
  ['#syncStatus','#authSignedOutStatus'].forEach(selector=>{
    const el=$(selector);if(!el)return;el.textContent=text;el.dataset.state=type;
  });
}
function updateAuthUI(){
  const signed=!!authUser;
  if($('#authSignedOut'))$('#authSignedOut').hidden=signed;
  if($('#authSignedIn'))$('#authSignedIn').hidden=!signed;
  if($('#authUserName'))$('#authUserName').textContent=accountDisplayName();
  if($('#authUserEmail'))$('#authUserEmail').textContent=authUser?.email||'';
  if($('#profileEmail'))$('#profileEmail').value=signed?(authUser?.email||''):(profile?.email==='guest@local'?'':profile?.email||'');
  if($('#guestBanner'))$('#guestBanner').hidden=signed;
  if($('#cloudNoteText'))$('#cloudNoteText').innerHTML=signed
    ?'<b>Google senkronizasyonu açık</b><br>İlerleme ve puanlar bu hesapla cihazlar arasında eşitlenir.'
    :'<b>Misafir modu</b><br>İlerleme Google hesabına kaydolmaz; yalnızca bu cihazda tutulur.';
  if(!signed)setSyncStatus(window.firebase?'Google ile giriş bekleniyor':'Çevrimdışı kullanım açık','idle');
}
function scheduleCloudSync(delay=180){
  if(!authUser||!fbDb||!cloudReady)return;
  clearTimeout(cloudSyncTimer);
  setSyncStatus('Değişiklikler kaydediliyor…','syncing');
  cloudSyncTimer=setTimeout(syncCloudNow,delay);
}
function setLeagueSyncStatus(text,type=''){
  const el=$('#leagueSyncStatus');if(!el)return;el.textContent=text;el.dataset.state=type;
}
function leaderboardCloudPayload(){
  if(!authUser)return null;
  const publicName=accountDisplayName(profile?.name,authUser),scores=leaderboardScores(),c=counts();
  return {uid:authUser.uid,name:publicName,friendCode:ownFriendCode(authUser.uid),...scores,photoURL:authUser.photoURL||profile?.photoURL||'',streak:computeStreak(),memorized:c.memorized,learn:c.learn,hard:c.hard,wrong:c.wrong,favorite:c.favorite,answers:Number(state?.stats?.answers)||0,accuracy:state?.stats?.answers?Math.round(state.stats.correct/state.stats.answers*100):0,clientUpdatedAt:new Date().toISOString(),updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()};
}
function scheduleLeaderboardWrite(delay=80){
  if(!authUser||!fbDb||!cloudReady)return;
  clearTimeout(leaderboardWriteTimer);setLeagueSyncStatus('Puan eşitleniyor…','syncing');
  leaderboardWriteTimer=setTimeout(pushLeaderboardNow,delay);
}
async function pushLeaderboardNow(){
  if(!authUser||!fbDb||!cloudReady)return;
  if(leaderboardWriteBusy){leaderboardWriteQueued=true;return}
  leaderboardWriteBusy=true;leaderboardWriteQueued=false;clearTimeout(leaderboardWriteTimer);
  const payload=leaderboardCloudPayload();if(!payload){leaderboardWriteBusy=false;return}
  try{
    await fbDb.collection('leaderboard').doc(authUser.uid).set(payload,{merge:true});
    updateLeaderboardCacheWithOwn();
    if($('#view-league')?.classList.contains('active'))renderLeaderboardRows(mergeOwnLeaderboardRow(cloudLeaderboardCache[`${leaderboardAudience}:${leaderboardPeriod}`]||[]),authUser.uid);
    setLeagueSyncStatus('Puan güncel ✓','ok');
  }catch(error){console.error('Leaderboard write error',error);setLeagueSyncStatus('İnternet gelince güncellenecek','error')}
  finally{leaderboardWriteBusy=false;if(leaderboardWriteQueued){leaderboardWriteQueued=false;scheduleLeaderboardWrite(120)}}
}
async function syncCloudNow(){
  if(!authUser||!fbDb||!cloudReady)return;
  if(cloudSyncBusy){cloudSyncQueued=true;return}
  cloudSyncBusy=true;cloudSyncQueued=false;clearTimeout(cloudSyncTimer);
  try{
    const publicName=accountDisplayName(profile?.name,authUser),scores=leaderboardScores(),c=counts();
    const userPayload={
      profile:{name:publicName,email:authUser.email||'',goal:Number(profile?.goal||20),voiceAccent:profile?.voiceAccent||'en-US',photoURL:authUser.photoURL||'',joinedAt:state.stats.joinedAt||''},
      state:packState(state),clientUpdatedAt:state.lastActive,
      updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
    };
    const leaderboardPayload=leaderboardCloudPayload();
    await Promise.all([
      fbDb.collection('users').doc(authUser.uid).set(userPayload,{merge:true}),
      fbDb.collection('leaderboard').doc(authUser.uid).set(leaderboardPayload,{merge:true})
    ]);
    setSyncStatus('Senkronize edildi ✓','ok');
    setLeagueSyncStatus('Puan güncel ✓','ok');
    updateLeaderboardCacheWithOwn();
    if($('#view-league')?.classList.contains('active'))renderLeaderboard();
  }catch(error){console.error('Cloud sync error',error);setSyncStatus('İnternet gelince yeniden eşitlenecek','error')}
  finally{cloudSyncBusy=false;if(cloudSyncQueued){cloudSyncQueued=false;scheduleCloudSync(250)}}
}
async function handleAuthState(user){
  authUser=user||null;cloudLeaderboardCache={};
  if(!user){cloudReady=false;stopLeaderboardRealtime();updateAuthUI();renderAll();return}
  const email=(user.email||'').toLowerCase(),previousEmail=(profile?.email||'guest@local').toLowerCase();
  const accountCandidate=previousEmail===email?cloneData(state):readLocalState(email);
  const guestCandidate=previousEmail==='guest@local'?cloneData(state):readLocalState('guest@local');
  setSyncStatus('Buluttaki ilerleme alınıyor…','syncing');
  let remoteData=null;try{const snap=await fbDb.collection('users').doc(user.uid).get();remoteData=snap.exists?snap.data():null}catch(error){console.error('Cloud load error',error)}
  state=mergeStates(remoteData?.state,accountCandidate||defaultState());
  const migrationKey=`${STORE}:guest_migrated:${user.uid}`;
  if(hasProgress(guestCandidate)&&!localStorage.getItem(migrationKey)){
    const transfer=confirm('Bu cihazdaki misafir ilerlemesini Google hesabına aktarmak ister misin?');
    if(transfer){state=mergeStates(state,guestCandidate);toast('Misafir ilerlemesi Google hesabına aktarıldı.')} 
    localStorage.setItem(migrationKey,transfer?'1':'0');
  }
  const remoteProfile=remoteData?.profile||{};
  const remoteName=placeholderName(remoteProfile.name)?'':normalizedName(remoteProfile.name);
  const localName=placeholderName(profile?.name)?'':normalizedName(profile?.name);
  profile={name:accountDisplayName(remoteName||localName,user),email:email||'guest@local',goal:Number(remoteProfile.goal||profile?.goal||20),voiceAccent:remoteProfile.voiceAccent||profile?.voiceAccent||'en-US',uid:user.uid,photoURL:user.photoURL||remoteProfile.photoURL||''};
  normalizeDay();localStorage.setItem(`${STORE}:profile`,JSON.stringify(profile));localStorage.setItem(profileKey(),JSON.stringify(state));updateLeaderboardEntry();
  cloudReady=true;updateAuthUI();renderAll();await syncCloudNow();
}
function loadExternalScript(src){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[src="${src}"]`);
    if(existing){if(existing.dataset.loaded==='1')resolve();else{existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true})}return}
    const script=document.createElement('script');script.src=src;script.async=true;
    script.addEventListener('load',()=>{script.dataset.loaded='1';resolve()},{once:true});script.addEventListener('error',reject,{once:true});
    document.head.appendChild(script);
  });
}
async function loadFirebaseSdk(){
  if(window.firebase?.auth&&window.firebase?.firestore)return true;
  const base='https://www.gstatic.com/firebasejs/12.16.0/';
  try{
    await loadExternalScript(`${base}firebase-app-compat.js`);
    await loadExternalScript(`${base}firebase-auth-compat.js`);
    await loadExternalScript(`${base}firebase-firestore-compat.js`);
    return !!window.firebase;
  }catch(error){console.error('Firebase SDK load error',error);return false}
}
function authRestError(error){
  const raw=String(error?.message||error?.code||'').replace(/^Firebase:\s*/i,'');
  if(/OPERATION_NOT_ALLOWED|CONFIGURATION_NOT_FOUND/i.test(raw))return 'Firebase Authentication içinde Google sağlayıcısı etkin değil.';
  if(/UNAUTHORIZED_DOMAIN|INVALID_CONTINUE_URI|INVALID_ORIGIN/i.test(raw))return 'GitHub site adresi Firebase yetkili alanlarında bulunmuyor.';
  if(/NETWORK|Failed to fetch|Load failed/i.test(raw))return 'İnternet bağlantısı nedeniyle Google girişi başlatılamadı.';
  if(/USER_CANCELLED|access_denied/i.test(raw))return 'Google girişi iptal edildi.';
  if(/INVALID_IDP_RESPONSE|INVALID_CREDENTIAL|MISSING_OR_INVALID_NONCE/i.test(raw))return 'Google hesabı doğrulanamadı. Tekrar giriş yap.';
  return raw&&raw.length<160?`Google girişi tamamlanamadı: ${raw}`:'Google girişi tamamlanamadı. Tekrar dene.';
}
async function authRestPost(method,body){
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/${method}?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  let data={};try{data=await response.json()}catch{}
  if(!response.ok){
    const error=new Error(data?.error?.message||`HTTP_${response.status}`);
    error.code=data?.error?.status||data?.error?.message||'';throw error;
  }
  return data;
}
function authReturnUrl(){
  const url=new URL(location.href);url.search='';url.hash='';return url.href;
}
function authCallbackPresent(){
  const query=`${location.search}&${location.hash}`;
  return /(?:^|[?&#])(code|state|error|error_description|oauth_token|authuser|scope|id_token)=/i.test(query);
}
function authContext(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
async function startGoogleFullPageSignIn(){
  const continueUri=authReturnUrl(),context=authContext();
  setSyncStatus('Google giriş sayfası açılıyor…','syncing');
  const result=await authRestPost('accounts:createAuthUri',{
    providerId:'google.com',continueUri,authFlowType:'CODE_FLOW',oauthScope:'email profile',
    context,customParameter:{prompt:'select_account'}
  });
  if(!result?.authUri||!result?.sessionId)throw new Error('Google giriş adresi oluşturulamadı');
  localStorage.setItem(AUTH_FLOW_KEY,JSON.stringify({sessionId:result.sessionId,continueUri,context,startedAt:Date.now()}));
  location.assign(result.authUri);
}
async function finishGoogleFullPageSignIn(){
  let flow=null;try{flow=JSON.parse(localStorage.getItem(AUTH_FLOW_KEY)||'null')}catch{}
  if(!flow)return false;
  if(Date.now()-Number(flow.startedAt||0)>20*60*1000){localStorage.removeItem(AUTH_FLOW_KEY);return false}
  if(!authCallbackPresent())return false;
  setSyncStatus('Google hesabı doğrulanıyor…','syncing');
  try{
    const result=await authRestPost('accounts:signInWithIdp',{
      requestUri:location.href,sessionId:flow.sessionId,returnSecureToken:true,returnIdpCredential:true
    });
    if(result?.errorMessage)throw new Error(result.errorMessage);
    const googleIdToken=result?.oauthIdToken||null;
    const googleAccessToken=result?.oauthAccessToken||null;
    if(!googleIdToken&&!googleAccessToken)throw new Error('Google kimlik bilgisi alınamadı');
    const credential=window.firebase.auth.GoogleAuthProvider.credential(googleIdToken,googleAccessToken);
    await fbAuth.signInWithCredential(credential);
    localStorage.removeItem(AUTH_FLOW_KEY);
    history.replaceState({},document.title,flow.continueUri||authReturnUrl());
    toast('Google hesabıyla giriş yapıldı.');
    return true;
  }catch(error){
    console.error('Full-page Google sign-in',error);
    localStorage.removeItem(AUTH_FLOW_KEY);
    history.replaceState({},document.title,flow.continueUri||authReturnUrl());
    const message=authRestError(error);setSyncStatus(message,'error');toast(message);return false;
  }
}
async function initFirebase(){
  setSyncStatus('Google bağlantısı hazırlanıyor…','syncing');
  if(!await loadFirebaseSdk()){updateAuthUI();setSyncStatus('Çevrimdışı kullanım açık','idle');return false}
  try{
    if(!window.firebase.apps.length)window.firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth=window.firebase.auth();fbDb=window.firebase.firestore();
    fbAuth.useDeviceLanguage();
    await fbAuth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
    fbAuth.onAuthStateChanged(user=>handleAuthState(user).catch(error=>{console.error(error);setSyncStatus('Senkronizasyon başlatılamadı','error')}));
    await finishGoogleFullPageSignIn();
    return true;
  }catch(error){console.error('Firebase init error',error);updateAuthUI();setSyncStatus(authRestError(error),'error');return false}
}
async function signInWithGoogle(){
  if(authBusy)return;
  if(!fbAuth||!window.firebase){toast('Google bağlantısı yüklenemedi. İnterneti kontrol et.');return}
  const button=$('#googleSignInBtn'),original=button?.textContent||'Google hesabıyla giriş';
  authBusy=true;if(button){button.disabled=true;button.textContent='Google’a gidiliyor…'}
  try{await startGoogleFullPageSignIn()}
  catch(error){
    console.error('Google sign-in start',error);
    const message=authRestError(error);setSyncStatus(message,'error');toast(message);
    authBusy=false;if(button){button.disabled=false;button.textContent=original}
  }
}
function switchToGuestMode({closeDialog=true,announce=true}={}){
  authUser=null;cloudReady=false;cloudLeaderboardCache={};stopLeaderboardRealtime();
  const goal=Number(profile?.goal||20),voiceAccent=profile?.voiceAccent||'en-US';
  const guestState=readLocalState('guest@local')||defaultState();
  profile={name:'Misafir',email:'guest@local',goal,voiceAccent};
  state=ensureStateShape(guestState);normalizeDay();save({cloud:false});
  localStorage.setItem(GUEST_ACK_KEY,'1');
  updateAuthUI();renderAll();
  if(closeDialog&&$('#profileDialog')?.open)$('#profileDialog').close();
  if(announce)toast('Misafir modundasın. İlerleme yalnızca bu cihazda tutulur.');
}
async function signOutGoogle(){
  if(authBusy)return;
  const button=$('#googleSignOutBtn'),original=button?.textContent||'Çıkış';
  authBusy=true;clearTimeout(cloudSyncTimer);
  if(button){button.disabled=true;button.textContent='Çıkılıyor…'}
  try{
    if(authUser)await Promise.race([syncCloudNow(),new Promise(resolve=>setTimeout(resolve,1000))]);
    if(fbAuth)await Promise.race([fbAuth.signOut(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('signout-timeout')),5000))]);
    localStorage.removeItem(AUTH_FLOW_KEY);
    switchToGuestMode({closeDialog:true,announce:false});
    toast('Google hesabından çıkış yapıldı.');
  }catch(error){
    console.error('Sign-out error',error);
    localStorage.removeItem(AUTH_FLOW_KEY);
    switchToGuestMode({closeDialog:true,announce:false});
    toast('Hesap bu cihazdan çıkarıldı.');
  }finally{authBusy=false;if(button){button.disabled=false;button.textContent=original}}
}
function ownFriendCode(uid=authUser?.uid){
  const raw=String(uid||'').replace(/[^a-z0-9]/gi,'').toUpperCase();return raw?`WP${raw.slice(0,8)}`:'';
}
function friendCodes(){return Object.keys(state?.friends||{}).filter(Boolean).sort()}
function setFriendCode(code,value=true){
  code=String(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!/^WP[A-Z0-9]{6,10}$/.test(code)){toast('Geçerli bir WordPilot arkadaş kodu yaz.');return false}
  if(code===ownFriendCode()){toast('Kendi kodunu ekleyemezsin.');return false}
  state.friendUpdated[code]={value:!!value,at:Date.now()};if(value)state.friends[code]=true;else delete state.friends[code];
  cloudLeaderboardCache={};save();renderFriendPanel();if($('#view-league')?.classList.contains('active'))renderLeaderboard();toast(value?'Arkadaş eklendi.':'Arkadaş kaldırıldı.');return true;
}
function renderFriendPanel(rows=[]){
  const panel=$('#friendPanel');if(panel)panel.hidden=leaderboardAudience!=='friends';
  const code=ownFriendCode();if($('#myFriendCode'))$('#myFriendCode').textContent=code||'Google girişi gerekli';
  if($('#copyFriendCode'))$('#copyFriendCode').disabled=!code;
  const names=new Map((rows||[]).map(row=>[row.friendCode,row.name||row.friendCode]));
  const list=$('#friendCodeList');if(list)list.innerHTML=friendCodes().map(friend=>`<span><b>${esc(names.get(friend)||friend)}</b><small>${esc(friend)}</small><button type="button" data-remove-friend="${esc(friend)}" title="Arkadaşı kaldır">×</button></span>`).join('')||'<p class="muted">Henüz arkadaş kodu eklenmedi.</p>';
}
function currentLeaderboardRow(){
  if(!authUser)return null;const scores=leaderboardScores(),c=counts();
  return {uid:authUser.uid,name:accountDisplayName(),friendCode:ownFriendCode(authUser.uid),...scores,photoURL:authUser.photoURL||profile?.photoURL||'',streak:computeStreak(),memorized:c.memorized,learn:c.learn,hard:c.hard,wrong:c.wrong,favorite:c.favorite,answers:Number(state?.stats?.answers)||0,accuracy:state?.stats?.answers?Math.round(state.stats.correct/state.stats.answers*100):0};
}
function mergeOwnLeaderboardRow(rows=[]){
  const own=currentLeaderboardRow();if(!own)return rows.slice();
  return [...rows.filter(row=>row.uid!==own.uid),own];
}
function updateLeaderboardCacheWithOwn(){
  if(!authUser)return;Object.keys(cloudLeaderboardCache).forEach(key=>{cloudLeaderboardCache[key]=mergeOwnLeaderboardRow(cloudLeaderboardCache[key])});
}
function stopLeaderboardRealtime(){
  if(leaderboardUnsubscribe){try{leaderboardUnsubscribe()}catch{}leaderboardUnsubscribe=null}leaderboardRealtimeKey='';
}
function leagueField(period=leaderboardPeriod){return period==='daily'?'dailyPoints':period==='weekly'?'weeklyPoints':period==='monthly'?'monthlyPoints':'points'}
function leagueLabel(period=leaderboardPeriod){return period==='daily'?'Bugünkü puana göre':period==='weekly'?'Bu haftaki puana göre':period==='monthly'?'Bu ayki puana göre':'Toplam puana göre'}
function leagueScore(row,period=leaderboardPeriod){return Math.max(0,Math.round(Number(row?.[leagueField(period)])||0))}
function renderLeagueSummary(board,currentKey){
  const rows=board||[],index=rows.findIndex(x=>(x.uid&&x.uid===currentKey)||(!x.uid&&String(x.email||'').toLowerCase()===String(currentKey||'').toLowerCase())),current=index>=0?rows[index]:null;
  const own=current?leagueScore(current):Math.round(periodTotals(leaderboardPeriod).points||0);
  if($('#leagueUserPoints'))$('#leagueUserPoints').textContent=own;if($('#leagueUserRank'))$('#leagueUserRank').textContent=index>=0?`#${index+1}`:'—';if($('#leagueUserCount'))$('#leagueUserCount').textContent=rows.length;
  if($('#leagueLoginNote')){$('#leagueLoginNote').hidden=!!authUser;$('#leagueLoginNote').textContent=leaderboardAudience==='friends'?'Arkadaş ligi ve arkadaş kodu için Google hesabınla giriş yap.':'Ortak ligde görünmek için Google hesabınla giriş yap. Misafir puanı yalnızca bu cihazda kalır.'}
  if($('#leaguePeriodText'))$('#leaguePeriodText').textContent=`${leagueLabel()} sıralama`;
  $$('[data-league-period]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leaguePeriod===leaderboardPeriod));$$('[data-league-audience]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leagueAudience===leaderboardAudience));renderFriendPanel(rows);
}
function leaderAvatar(x){
  if(x?.photoURL)return `<span class="leader-avatar has-photo"><img src="${esc(x.photoURL)}" alt="" referrerpolicy="no-referrer"></span>`;return `<span class="leader-avatar">${esc((x?.name||'Ö')[0].toUpperCase())}</span>`;
}
function renderLeaderboardRows(board,currentKey){
  const list=$('#leaderboardList');if(!list)return;const rows=(board||[]).slice().sort((a,b)=>leagueScore(b)-leagueScore(a)||String(a.name||'').localeCompare(String(b.name||''),'tr')).slice(0,100);renderLeagueSummary(rows,currentKey);
  list.innerHTML=rows.map((x,i)=>{const isCurrent=(x.uid&&x.uid===currentKey)||(!x.uid&&String(x.email||'').toLowerCase()===String(currentKey||'').toLowerCase()),medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'',detail=isCurrent?'Sen':`E ${Number(x.memorized)||0} · Ö ${Number(x.learn)||0} · Z ${Number(x.hard)||0} · %${Number(x.accuracy)||0}`;return `<div class="leaderboard-row ${isCurrent?'current':''} ${i<3?'top-rank':''}"><span class="rank">${medal||i+1}</span>${leaderAvatar(x)}<div><b>${esc(x.name||'Öğrenci')}</b><small>${esc(detail)}</small></div><strong>${leagueScore(x)}<small>PUAN</small></strong></div>`}).join('')||'<p class="muted">Bu dönemde henüz puan kaydı yok.</p>';
}
async function refreshCloudLeaderboard(force=false){
  if(!authUser||!fbDb)return;const cacheKey=`${leaderboardAudience}:${leaderboardPeriod}`;
  if(leaderboardAudience==='world'){
    if(!force&&leaderboardUnsubscribe&&leaderboardRealtimeKey===cacheKey)return;
    stopLeaderboardRealtime();leaderboardRealtimeKey=cacheKey;
    const query=fbDb.collection('leaderboard').orderBy(leagueField(),'desc').limit(100);
    leaderboardUnsubscribe=query.onSnapshot({includeMetadataChanges:true},snap=>{
      const rows=mergeOwnLeaderboardRow(snap.docs.map(doc=>({uid:doc.id,...doc.data()})));
      cloudLeaderboardCache[cacheKey]=rows;
      setLeagueSyncStatus(snap.metadata.hasPendingWrites?'Puan eşitleniyor…':snap.metadata.fromCache?'Çevrimdışı liste':'Canlı güncel ✓',snap.metadata.hasPendingWrites?'syncing':snap.metadata.fromCache?'idle':'ok');
      if($('#view-league')?.classList.contains('active'))renderLeaderboardRows(rows,authUser.uid);
    },error=>{console.error('Leaderboard realtime error',error);setLeagueSyncStatus('Lig bağlantısı kurulamadı','error');if($('#leaderboardList'))$('#leaderboardList').innerHTML='<p class="muted">Sıralama şu an yüklenemedi.</p>'});
    return;
  }
  stopLeaderboardRealtime();
  if(leaderboardFetch)return leaderboardFetch;
  leaderboardFetch=(async()=>{
    try{
      const codes=friendCodes(),queries=codes.map(code=>fbDb.collection('leaderboard').where('friendCode','==',code).limit(1).get()),ownPromise=fbDb.collection('leaderboard').doc(authUser.uid).get();
      const results=await Promise.all([...queries,ownPromise]);let rows=[];results.slice(0,-1).forEach(snap=>snap.docs.forEach(doc=>rows.push({uid:doc.id,...doc.data()})));const own=results.at(-1);if(own.exists)rows.push({uid:own.id,...own.data()});
      rows=mergeOwnLeaderboardRow([...new Map(rows.map(row=>[row.uid,row])).values()]);cloudLeaderboardCache[cacheKey]=rows;renderLeaderboardRows(rows,authUser.uid);
    }catch(error){console.error('Leaderboard error',error);if($('#leaderboardList'))$('#leaderboardList').innerHTML='<p class="muted">Sıralama şu an yüklenemedi.</p>'}finally{leaderboardFetch=null}
  })();return leaderboardFetch;
}

function renderLeaderboard(){
  const scope=$('#leaderboardScope'),cacheKey=`${leaderboardAudience}:${leaderboardPeriod}`;
  if(authUser&&fbDb){if(scope)scope.textContent=leaderboardAudience==='friends'?'Arkadaşların':'Tüm Google kullanıcıları';const cached=mergeOwnLeaderboardRow(cloudLeaderboardCache[cacheKey]||[]);if(cached.length)renderLeaderboardRows(cached,authUser.uid);else if($('#leaderboardList')){$('#leaderboardList').innerHTML='<p class="muted">Puan listesi yükleniyor…</p>';renderLeagueSummary([currentLeaderboardRow()].filter(Boolean),authUser.uid)}refreshCloudLeaderboard();return}
  if(scope)scope.textContent=leaderboardAudience==='friends'?'Google girişi gerekli':'Bu cihazdaki profiller';let board=[];try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}updateLeaderboardEntry();try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}if(leaderboardAudience==='friends')board=[];renderLeaderboardRows(board,(profile?.email||'guest@local').toLowerCase());
}
function normalizeDay(){
  const d=todayKey(),bucket=ensureDayBucket(d),st=state.stats;
  st.todayAnswers=Number(bucket.answers)||0;st.todayCorrect=Number(bucket.correct)||0;st.lastDay=d;computeStreak();
}
let speechVoices=[];
function refreshSpeechVoices(){speechVoices=window.speechSynthesis?.getVoices?.()||[]}
if('speechSynthesis'in window){
  refreshSpeechVoices();
  window.speechSynthesis.onvoiceschanged=refreshSpeechVoices;
}
function bestVoice(lang='en-US'){
  refreshSpeechVoices();
  const wanted=String(lang).toLowerCase();
  const candidates=speechVoices.filter(v=>String(v.lang||'').toLowerCase().startsWith(wanted.toLowerCase()));
  const preferred=lang==='en-GB'
    ?['Daniel','Serena','Sonia','Google UK English Female','Google UK English Male','Microsoft Ryan','Microsoft Libby']
    :['Samantha','Ava','Allison','Google US English','Microsoft Aria','Microsoft Jenny','Microsoft Guy'];
  return candidates.sort((a,b)=>{
    const ai=preferred.findIndex(n=>a.name.includes(n)),bi=preferred.findIndex(n=>b.name.includes(n));
    const as=ai<0?999:ai,bs=bi<0?999:bi;
    return as-bs||Number(b.localService)-Number(a.localService);
  })[0]||speechVoices.find(v=>String(v.lang||'').toLowerCase().startsWith(lang.slice(0,2).toLowerCase()))||null;
}
function speak(text,lang=null){
  if(!text||!('speechSynthesis'in window))return;
  const accent=lang||profile?.voiceAccent||'en-US';
  const spoken=displayClean(String(text)).replace(/[_/\\]+/g,' ').replace(/\s+/g,' ').trim();
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(spoken);
  u.lang=accent;u.rate=.82;u.pitch=1;
  const voice=bestVoice(accent);if(voice)u.voice=voice;
  speechSynthesis.speak(u);
}
function toast(msg){
  const t=$('#toast');if(!t)return;
  t.textContent=msg;t.classList.add('show');
  clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2200);
}
function statusOf(id){return state.statuses[id]||''}
function flagOf(id,flag){return !!state.flags?.[flag]?.[id]}
function setStatusValue(id,value){
  const key=String(Number(id)),at=Date.now();state.statusUpdated[key]={value:value||'',at};
  if(value)state.statuses[key]=value;else delete state.statuses[key];
}
function setStatus(id,status){
  const value=statusOf(id)===status?'':status;setStatusValue(id,value);save();scheduleLeaderboardWrite(80);renderAll();refreshWordStatus();
  toast(value?`${STATUS_LABEL[status]} olarak kaydedildi`:'İşaret kaldırıldı');
}
function setFlagValue(id,flag,value){
  const key=String(Number(id)),at=Date.now();state.flagUpdated[flag][key]={value:!!value,at};
  if(value)state.flags[flag][key]=true;else delete state.flags[flag][key];
}
function setFlag(id,flag){
  const value=!flagOf(id,flag);setFlagValue(id,flag,value);save();scheduleLeaderboardWrite(80);renderAll();refreshWordStatus();
  toast(value?`${FLAG_LABEL[flag]} işaretlendi`:`${FLAG_LABEL[flag]} işareti kaldırıldı`);
}
function selectedIds(){return new Set((state.selected||[]).map(Number))}
function toggleSelected(id){
  const key=String(Number(id)),value=!selectedIds().has(Number(id));state.selectionUpdated[key]={value,at:Date.now()};
  if(value)state.selected=[...new Set([...(state.selected||[]),Number(id)])].sort((a,b)=>a-b);else state.selected=(state.selected||[]).filter(x=>Number(x)!==Number(id));
  save();renderWords();updateSelectedControls();
}
function updateSelectedControls(){
  const count=(state.selected||[]).length,btn=$('#studySelectedBtn'),text=$('#selectedCount');if(text)text.textContent=count;if(btn)btn.hidden=count===0;
}
function adjustPoints(delta){
  const amount=Math.round(Number(delta)||0),bucket=ensureDayBucket();
  if(session)session.score=Math.max(0,Math.round((session.score||0)+amount));
  state.stats.points=Math.max(0,Math.round((state.stats.points||0)+amount));bucket.points=Math.max(0,Math.round((bucket.points||0)+amount));save();updateLeaderboardCacheWithOwn();scheduleLeaderboardWrite(40);if($('#view-league')?.classList.contains('active'))renderLeaderboard();
}
function responseScore(){
  const elapsed=Math.max(0,(Date.now()-(session?.questionStartedAt||Date.now()))/1000),rate=session?.quizStyle==='speed'?5.4:3.2,floor=session?.quizStyle==='speed'?20:25;
  const base=Math.max(floor,Math.round(100-elapsed*rate)),combo=Number(session?.combo)||0,bonus=combo>=10?30:combo>=5?15:combo>=2?5:0;
  return {elapsed,points:base+bonus,base,bonus};
}
function scheduleAutoAdvance(delay=1500){
  clearTimeout(session?.advanceTimer);
  if(!session)return;
  session.advanceTimer=setTimeout(()=>{if(session?.answered)nextStudy()},delay);
}
function counts(){
  const c={learn:0,memorized:0,hard:0,favorite:0,veryHard:0,ignored:0,wrong:0};
  Object.values(state.statuses).forEach(v=>{if(c[v]!==undefined)c[v]++});
  ['favorite','veryHard','ignored'].forEach(flag=>c[flag]=Object.keys(state.flags?.[flag]||{}).length);
  c.wrong=wrongIds().length;return c;
}
function reviewIds(){
  const now=Date.now(),day=864e5;
  return Object.entries(state.history).filter(([id,h])=>{
    if(statusOf(+id)==='memorized')return false;
    const interval=Math.min(30,Math.max(1,2**(h.level||0)));
    return !h.last||now-new Date(h.last).getTime()>interval*day;
  }).map(([id])=>+id);
}

function wrongIds(){
  return Object.entries(state.history).filter(([id,h])=>h?.needsReview===true).map(([id])=>Number(id));
}
function applyCorrectTarget(word){const target=session?.correctTarget;if(target)setStatusValue(word.id,target)}
function recordAnswer(word,correct){
  normalizeDay();const st=state.stats,bucket=ensureDayBucket();
  st.answers++;st.todayAnswers++;bucket.answers++;
  if(correct){st.correct++;st.todayCorrect++;bucket.correct++}
  const h=state.history[word.id]||{right:0,wrong:0,level:0,last:null,needsReview:false};
  if(correct){h.right++;h.level=Math.min(6,(h.level||0)+1);if(session?.mode==='wrong-review')h.needsReview=false}
  else{h.wrong++;h.level=Math.max(0,(h.level||0)-1);h.needsReview=true;if(h.wrong>=3&&!statusOf(word.id))setStatusValue(word.id,'hard')}
  h.last=new Date().toISOString();state.history[word.id]=h;computeStreak();save();
}
function nav(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
  $$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='library')renderWords(true);
  if(name==='progress')renderProgress();
  if(name==='league'){
    renderLeaderboard();
    if(authUser){scheduleLeaderboardWrite(0);refreshCloudLeaderboard(true)}
  }else stopLeaderboardRealtime();
}
function dailyWordOfDay(){
  const pool=words.filter(w=>Number(w.id)<=5000);if(!pool.length)return null;
  const seed=Number(todayKey().replace(/-/g,''));return pool[(seed*37+17)%pool.length];
}
function renderDashboard(){
  normalizeDay();
  const c=counts(),st=state.stats,goal=Number(profile.goal||20);
  const pct=Math.min(100,Math.round((st.todayAnswers||0)/goal*100));
  $('#helloName').textContent=profile.name||'Öğrenci';
  const avatar=$('#profileBtn');if(profile.photoURL)avatar.innerHTML=`<img src="${esc(profile.photoURL)}" alt="" referrerpolicy="no-referrer">`;else avatar.textContent=(profile.name||'M')[0].toUpperCase();
  $('#todayText').textContent=new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  $('#countLearn').textContent=c.learn;
  $('#countMem').textContent=c.memorized;
  $('#countHard').textContent=c.hard;
  $('#countReview').textContent=new Set([...reviewIds(),...wrongIds()]).size;
  $('#streak').textContent=st.streak||0;
  $('#goalPercent').textContent=`${pct}%`;
  $('#flightTrackFill').style.width=`${pct}%`;
  $('#todayAnswered').textContent=st.todayAnswers||0;
  $('#dailyGoalText').textContent=goal;
  $('#heroMessage').textContent=st.todayAnswers
    ?`Bugün ${st.todayAnswers} soru çözdün. Hedefe ${Math.max(0,goal-st.todayAnswers)} soru kaldı.`
    :`${reviewIds().length} tekrar ve ${words.length} kelime seni bekliyor.`;
  const acc=st.answers?Math.round(st.correct/st.answers*100):0;
  $('#accuracyText').textContent=st.answers?`%${acc}`:'—';
  $('#answeredTotal').textContent=st.answers||0;
  $('#xpText').textContent=`${Math.round(st.points||0)} puan`;
  let insight='İlk oturumunu başlat; güçlü ve zor kelimelerini analiz edelim.';
  if(c.hard)insight=`${c.hard} zor kelimen var. Akıllı tekrar bunları farklı soru biçimleriyle geri getirecek.`;
  else if(st.answers>10)insight=`Genel başarı oranın %${acc}. Doğru bildiğin kelimeler aynı oturumda tekrar edilmez.`;
  $('#insightText').textContent=insight;
  const daily=dailyWordOfDay();if(daily){
    $('#dailyWordEnglish').textContent=daily.english;$('#dailyWordLevel').textContent=cefr(daily);$('#dailyWordPron').textContent=daily.pronunciation||'';
    $('#dailyWordMeaning').textContent=displayClean(firstMeaning(daily));$('#dailyWordExample').textContent=daily.example?`“${displayClean(String(daily.example).split(/\n/)[0])}”`:'';
    $('#dailyWordSpeak').dataset.speak=daily.english;$('#dailyWordInfo').dataset.info=daily.id;
  }
}
function filteredWords(){
  const q=($('#searchInput')?.value||'').toLocaleLowerCase('tr').trim(),g=$('#groupFilter')?.value||'',l=$('#levelFilter')?.value||'',s=$('#statusFilter')?.value||'';
  return words.filter(w=>{
    const hay=`${w.english} ${w.meaning} ${w.example} ${w.translation}`.toLocaleLowerCase('tr'),st=statusOf(w.id),lv=cefr(w);
    const groupOk=!g||(g==='core5000'?w.id<=5000:w.group===g),levelOk=!l||(l==='A1-A2'?['A1','A2'].includes(lv):l==='B1-B2'?['B1','B2'].includes(lv):lv===l);
    const statusOk=!s||(s==='unset'?!st:s==='wrong'?state.history[w.id]?.needsReview===true:s==='favorite'?flagOf(w.id,'favorite'):s==='veryhard'?flagOf(w.id,'veryHard'):s==='ignored'?flagOf(w.id,'ignored'):s==='notmemorized'?st!=='memorized':st===s);
    return(!q||hay.includes(q))&&groupOk&&levelOk&&statusOk;
  });
}
function renderWords(reset=false){
  if(reset)listLimit=80;const arr=filteredWords(),selected=selectedIds();$('#resultCount').textContent=arr.length;
  $('#wordList').innerHTML=arr.slice(0,listLimit).map(w=>{
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
  }).join('')||'<div class="panel">Aramana uygun kelime bulunamadı.</div>';
  $('#loadMore').hidden=arr.length<=listLimit;updateSelectedControls();
}
function openWord(id){
  currentWord=words.find(w=>w.id===Number(id));if(!currentWord)return;
  $('#wordLevel').textContent=`${cefr(currentWord)} · ${currentWord.group||''}`;
  $('#wordEnglish').textContent=currentWord.english;
  $('#wordPron').textContent=currentWord.pronunciation||'';
  const sections=[
    ['ANLAMLAR',currentWord.meaning],['KULLANIM',currentWord.usage],
    ['ÖRNEK CÜMLELER',currentWord.example],['TÜRKÇESİ',currentWord.translation],
    ['EŞ ANLAMLILAR',currentWord.synonyms],['ZIT ANLAMLILAR',currentWord.opposite],
    ['KELİME AİLESİ',currentWord.family],['KALIPLAR',currentWord.phrase],
    ['COLLOCATIONS',currentWord.collocations],['NOTLAR',currentWord.notes]
  ].filter(x=>x[1]&&clean(x[1]).toLocaleLowerCase('tr')!=='yok');
  const ratedHeaders=new Set(['ANLAMLAR','EŞ ANLAMLILAR','ZIT ANLAMLILAR']);
  $('#wordDetails').innerHTML=sections.map(([h,p])=>`<div class="detail-block"><h4>${h}</h4><p class="${ratedHeaders.has(h)?'rated-lines':''}">${ratedHeaders.has(h)?ratedLinesHtml(p):esc(displayClean(p))}</p></div>`).join('');
  refreshWordStatus();
  $('#wordDialog').showModal();
}
function refreshWordStatus(){
  if(!currentWord)return;
  $$('[data-word-status]').forEach(b=>b.classList.toggle('active',statusOf(currentWord.id)===b.dataset.wordStatus));
  $$('[data-word-flag]').forEach(b=>b.classList.toggle('active',flagOf(currentWord.id,b.dataset.wordFlag)));
}
function badgeDefinitions(){
  const c=counts(),st=state.stats,acc=st.answers?Math.round(st.correct/st.answers*100):0,marked=c.learn+c.memorized+c.hard;
  return [
    ['✈','İlk Uçuş','İlk sorunu cevapla',st.answers>=1],['🎯','100 Kelime','100 kelimeyi işaretle',marked>=100],['🥈','500 Kelime','500 kelimeyi işaretle',marked>=500],['🥇','1000 Kelime','1000 kelimeyi işaretle',marked>=1000],
    ['🔥','7 Gün Seri','7 gün üst üste çalış',st.bestStreak>=7],['⚡','30 Gün Seri','30 gün üst üste çalış',st.bestStreak>=30],['🎓','Keskin Pilot','100 cevapta %90 doğruluk',st.answers>=100&&acc>=90],['👑','6000 Tamam','Tüm kelimeleri işaretle',marked>=6000]
  ];
}
function renderProgress(){
  const c=counts(),marked=c.learn+c.memorized+c.hard,pct=words.length?Math.round(marked/words.length*100):0,st=state.stats;
  $('#masteryPercent').textContent=`${pct}%`;$('#masteryDonut').style.background=`conic-gradient(var(--primary) ${pct}%,#E9EDF5 ${pct}%)`;
  $('#rLearn').textContent=c.learn;$('#rMem').textContent=c.memorized;$('#rHard').textContent=c.hard;$('#rAnswers').textContent=st.answers||0;$('#rCorrect').textContent=st.correct||0;$('#rAccuracy').textContent=st.answers?`%${Math.round(st.correct/st.answers*100)}`:'—';$('#rBestStreak').textContent=`${st.bestStreak||0} gün`;
  $('#rFavorites').textContent=c.favorite;$('#rVeryHard').textContent=c.veryHard;$('#rWrong').textContent=c.wrong;$('#rIgnored').textContent=c.ignored;
  const today=periodTotals('daily'),week=periodTotals('weekly'),month=periodTotals('monthly'),all=periodTotals('all');
  $('#pTodayPoints').textContent=Math.round(today.points);$('#pTodayAnswers').textContent=today.answers;$('#pWeekPoints').textContent=Math.round(week.points);$('#pWeekAnswers').textContent=week.answers;$('#pMonthPoints').textContent=Math.round(month.points);$('#pMonthAnswers').textContent=month.answers;$('#pTotalPoints').textContent=Math.round(all.points);$('#pSessions').textContent=all.sessions;
  const labels=['Pz','Pt','Sa','Ça','Pe','Cu','Ct'],activity=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const val=state.stats.days?.[dateKey(d)]||{};activity.push({label:labels[d.getDay()],answers:Number(val.answers)||0})}
  const max=Math.max(1,...activity.map(x=>x.answers));$('#weeklyActivity').innerHTML=activity.map(x=>`<div><span style="height:${Math.max(5,x.answers/max*100)}%"></span><b>${x.answers}</b><small>${x.label}</small></div>`).join('');
  $('#badgeGrid').innerHTML=badgeDefinitions().map(([icon,title,desc,earned])=>`<div class="badge-card ${earned?'earned':'locked'}"><span>${earned?icon:'🔒'}</span><b>${title}</b><small>${desc}</small></div>`).join('');
  const levels=['A1','A2','B1','B2','C1','C2'],vals=levels.map(level=>words.filter(w=>cefr(w)===level&&statusOf(w.id)).length),maxLevel=Math.max(1,...vals);$('#levelDistribution').innerHTML=levels.map((level,i)=>`<div class="level-row"><b>${level}</b><div class="level-track"><div class="level-fill" style="width:${vals[i]/maxLevel*100}%"></div></div><span>${vals[i]}</span></div>`).join('');
}
function renderAll(){
  renderDashboard();
  if($('#view-library').classList.contains('active'))renderWords();
  if($('#view-progress').classList.contains('active'))renderProgress();
  if($('#view-league').classList.contains('active'))renderLeaderboard();
}

function relationCandidates(w,field){
  const raw=String(w[field]||'');
  if(!raw||clean(raw).toLocaleLowerCase('tr')==='yok')return [];
  const out=[];
  raw.split(/\n+/).forEach(line=>{
    const idMatch=line.match(/\(#(\d+)\)/);
    if(idMatch){
      const hit=words.find(x=>x.id===Number(idMatch[1]));
      if(hit)out.push(hit);
      return;
    }
    const term=clean(line.replace(/\([^)]*\)/g,'')).split(/[;,/]/)[0].trim().toLocaleLowerCase('en');
    if(term){
      const hit=words.find(x=>x.english.toLocaleLowerCase('en')===term);
      if(hit)out.push(hit);
    }
  });
  return [...new Map(out.map(x=>[x.id,x])).values()];
}
function hasRelation(w,mode){
  return relationCandidates(w,mode==='synonym'?'synonyms':'opposite').length>0;
}
function seededWordOrder(seed){
  const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  return [...words].sort((a,b)=>hash(`${seed}:${a.id}`)-hash(`${seed}:${b.id}`));
}
function makePool(mode,range=null,source='all'){
  let pool=source==='daily20'?seededWordOrder(todayKey()).filter(w=>!flagOf(w.id,'ignored')).slice(0,20):[...words];
  if(source==='learn'||source==='memorized'||source==='hard')pool=pool.filter(w=>statusOf(w.id)===source);
  else if(source==='wrong')pool=pool.filter(w=>state.history[w.id]?.needsReview===true);
  else if(source==='favorite')pool=pool.filter(w=>flagOf(w.id,'favorite'));
  else if(source==='veryhard')pool=pool.filter(w=>flagOf(w.id,'veryHard'));
  else if(source==='notmemorized')pool=pool.filter(w=>statusOf(w.id)!=='memorized');
  else if(source==='selected'){const selected=selectedIds();pool=pool.filter(w=>selected.has(w.id))}
  else if(source!=='daily20')pool=pool.filter(w=>statusOf(w.id)!=='memorized'||mode==='wrong-review');
  if(source!=='daily20')pool=pool.filter(w=>!flagOf(w.id,'ignored'));
  if(range)pool=pool.filter(w=>w.id>=range.start&&w.id<=range.end);
  if(mode==='review'){const review=new Set([...reviewIds(),...words.filter(w=>statusOf(w.id)==='hard'||flagOf(w.id,'veryHard')).map(w=>w.id)]);pool=pool.filter(w=>review.has(w.id))}
  if(mode==='wrong-review'){const wrong=new Set(wrongIds());pool=pool.filter(w=>wrong.has(w.id))}
  if(mode==='synonym'||mode==='antonym')pool=pool.filter(w=>hasRelation(w,mode));
  return source==='daily20'?pool:pool.sort(()=>Math.random()-.5);
}
function startStudy(mode='smart',range=null,quizStyle=null,source='all',useAll=false){
  const style=quizStyle||selectedQuizStyle();
  let actualMode=mode;
  if(style==='comprehensive'&&!['matching','listening','wrong-review'].includes(mode))actualMode='comprehensive';
  const pool=makePool(actualMode==='comprehensive'?'smart':actualMode,range,source);
  if(!pool.length){
    let message=source==='selected'?'Önce listeden kelime seç.':'Bu seçimde çalışılabilir kelime bulunamadı.';
    if(source==='all'||source==='notmemorized'){
      const scope=words.filter(w=>(!range||(w.id>=range.start&&w.id<=range.end))&&!flagOf(w.id,'ignored'));
      if(scope.length&&scope.every(w=>statusOf(w.id)==='memorized'))message='Bu bölümdeki tüm kelimeleri ezberlediğin için çalışılacak kelime yok. Tebrikler! 🎉';
    }
    toast(message);return;
  }
  const requested=useAll?pool.length:(range?pool.length:20),total=useAll?requested:Math.min(requested,200);
  session={
    mode:actualMode,baseMode:mode,quizStyle:style,pool:pool.slice(0,total),queue:[],done:new Set(),
    historyIds:[],index:0,total,correct:0,score:0,current:null,answered:false,range,source,useAll,
    advanceTimer:null,timerId:null,timeLeft:15,questionType:null,questionStartedAt:Date.now(),
    autoSpeak:$('#autoSpeakToggle')?.checked!==false,
    hiddenMode:mode==='listening'||$('#hiddenModeToggle')?.checked===true,
    correctTarget:$('#correctTarget')?.value||'',
    matchingOffset:0,matchBatch:[],matchSelectedLeft:null,matchSelectedRight:null,
    currentAttempts:0,hintRevealCount:0,combo:0,maxCombo:0,completed:false
  };
  clearSavedSession();nav('study');nextStudy();
}

function stopQuestionTimer(){
  if(session?.timerId){clearInterval(session.timerId);session.timerId=null}
}

function startQuestionTimer(){
  stopQuestionTimer();
  const isSpeed=session?.quizStyle==='speed';
  $('#speedBar').hidden=!isSpeed;
  $('#studyHearts').hidden=true;
  if(!isSpeed){
    $('#studyTimer').textContent='—';
    $('#studyTimer').classList.remove('timer-warning');
    return;
  }
  session.timeLeft=15;
  const update=()=>{
    const shown=Math.max(0,Math.ceil(session.timeLeft));
    $('#studyTimer').textContent=`${shown}s`;
    $('#studyTimer').classList.toggle('timer-warning',shown<=5);
    $('#speedBar i').style.width=`${Math.max(0,session.timeLeft/15*100)}%`;
  };
  update();
  session.timerId=setInterval(()=>{
    session.timeLeft=Math.max(0,session.timeLeft-.1);
    update();
    if(session.timeLeft<=0){
      stopQuestionTimer();
      if(!session.answered)answer(false,true);
    }
  },100);
}


function updateStudyScore(){
  $('#studyScore').textContent=`${Math.round(session?.score||0)} puan`;const combo=$('#studyCombo'),value=Number(session?.combo)||0;if(combo){combo.hidden=value<2;combo.textContent=`🔥 ${value} seri`;}updateAttemptDisplay();
}
function chooseComprehensiveType(w){
  const options=['smart','en-tr','tr-en'];
  if(hasRelation(w,'synonym'))options.push('synonym');
  if(hasRelation(w,'antonym'))options.push('antonym');
  return options[Math.floor(Math.random()*options.length)];
}


function updateAttemptDisplay(){
  const left=Math.max(0,3-(session?.currentAttempts||0));
  const el=$('#attemptText');
  if(el)el.textContent=`${left} hak`;
  const sound=$('#toggleAutoSpeak');
  if(sound){
    sound.classList.toggle('active',!!session?.autoSpeak);
    sound.textContent=session?.autoSpeak?'🔊 Ses Açık':'🔇 Ses Kapalı';
  }
  const hidden=$('#toggleHiddenMode');
  if(hidden){
    hidden.classList.toggle('active',!!session?.hiddenMode);
    hidden.textContent=session?.hiddenMode?'🙈 Gizli Açık':'👁 Kelime Açık';
  }
}
function questionShowsEnglish(){
  const mode=session?.questionType||session?.mode;
  return ['smart','listening','en-tr','synonym','antonym'].includes(mode);
}
function updateQuestionVisibility(){
  if(!session?.current||!questionShowsEnglish())return;
  const mode=session.questionType||session.mode;
  if(mode==='listening'||mode==='smart'||mode==='en-tr'){
    $('#studyQuestion').innerHTML=session.hiddenMode?'<span class="hidden-word">••••••</span>':esc(session.current.english);
  }else if(mode==='synonym'||mode==='antonym'){
    $('#studyQuestion').innerHTML=session.hiddenMode?'<span class="hidden-word">••••••</span>':esc(session.current.english);
  }
}
function hintTarget(){
  const w=session?.current,mode=session?.questionType||session?.mode;
  if(!w)return'';
  if(mode==='tr-en')return clean(w.english);
  if(mode==='synonym'||mode==='antonym')return clean(session.relationAnswer?.english||w.english);
  return clean(firstMeaning(w));
}
function revealPattern(text,count){
  let seen=0,out='';
  for(const ch of text){
    if(/\s/.test(ch)){out+=ch;continue}
    seen++;
    out+=seen<=count?ch:'_';
  }
  return out;
}
function resetCurrentQuestionForRetry(){
  session.answered=false;
  $('#nextQuestion').hidden=true;
  $('#showHint').disabled=false;
  $('#showAnswer').disabled=false;
  $$('.choice').forEach(b=>{if(!b.classList.contains('used-wrong'))b.disabled=false});
  const input=$('#writeAnswer');
  if(input){input.disabled=false;input.value='';setTimeout(()=>input.focus(),50)}
  if(session.quizStyle==='speed')startQuestionTimer();
  updateAttemptDisplay();
}
function markFinalCorrectChoice(){
  $$('.choice').forEach(b=>{
    b.disabled=true;b.classList.add('locked');
    if(Number(b.dataset.answerId)===session.current?.id)b.classList.add('correct');
    if(Number(b.dataset.relationId)===session.relationAnswer?.id)b.classList.add('correct');
  });
}


function nextStudy(){
  stopQuestionTimer();if(session?.advanceTimer){clearTimeout(session.advanceTimer);session.advanceTimer=null}
  if(session?.mode==='matching'){renderMatchingRound();return}
  if(!session||session.index>=session.total){finishSession();return}
  const dueIndex=session.queue.findIndex(q=>q.due<=session.index);
  let w;
  if(dueIndex>=0)w=session.queue.splice(dueIndex,1)[0].word;
  else w=session.pool.find(x=>!session.done.has(x.id));
  if(!w){finishSession();return}
  if(session.current)session.historyIds.push(session.current.id);
  session.current=w;session.answered=false;session.currentAttempts=0;session.hintRevealCount=0;session.questionStartedAt=Date.now();session.index++;
  session.questionType=session.mode==='comprehensive'?chooseComprehensiveType(w):(session.mode==='review'?'smart':session.mode);
  $('#studyCounter').textContent=`${session.index} / ${session.total}`;
  $('#studyProgress').max=session.total;$('#studyProgress').value=session.index;
  $('#studyFeedback').className='feedback';$('#studyFeedback').textContent='';
  $('#studyWordInfo').hidden=true;$('#studyWordInfo').innerHTML='';
  $('#nextQuestion').hidden=true;
  $('#showHint').disabled=false;$('#showAnswer').disabled=false;
  $('#previousQuestion').disabled=!session.historyIds.length;
  $('#studyActionBar').hidden=false;$('#studyToggleBar').hidden=false;
  updateStudyScore();renderStudyQuestion();updateAttemptDisplay();startQuestionTimer();
  if(session.autoSpeak&&(session.questionType!=='tr-en'||session.hiddenMode)){
    setTimeout(()=>speak(session.current.english),180);
  }
}

function choiceOptions(correctWord,asMeaning=true){
  const wrong=words.filter(x=>x.id!==correctWord.id&&cefr(x)===cefr(correctWord))
    .sort(()=>Math.random()-.5).slice(0,3);
  return [correctWord,...wrong].sort(()=>Math.random()-.5).map(w=>({
    id:w.id,text:asMeaning?firstMeaning(w):w.english
  }));
}

function renderStudyQuestion(){
  const w=session.current,mode=session.questionType||session.mode;
  $('#studyModeName').textContent=session.quizStyle==='speed'?`${MODE_LABEL[mode]||'Quiz'} · Hız`:session.mode==='comprehensive'?'Kapsamlı Quiz':MODE_LABEL[mode]||'Çalışma';
  $('#studySpeak').hidden=mode==='tr-en';
  $('#studyBadge').textContent=mode==='flash'?'KELİME KARTI':mode==='synonym'?'EŞ ANLAM':mode==='antonym'?'ZIT ANLAM':'SORU';
  $('#studyPron').textContent='';
  if(mode==='flash'){
    session.answered=true;stopQuestionTimer();
    $('#studyQuestion').textContent=w.english;$('#studyPron').textContent=w.pronunciation||'';
    $('#studyContent').innerHTML=`<div class="flash-card-inner">
      <button class="flip-button" data-flip>Karşılığını göster</button>
      <div class="flash-reveal" hidden>
        <div class="flash-meaning">${esc(displayClean(w.meaning||''))}</div>
        <div class="flash-actions">
          <button data-flash="hard">Zorlandım</button>
          <button data-flash="learn">Öğreniyorum</button>
          <button data-flash="memorized">Ezberledim</button>
        </div>
      </div>
    </div>`;return;
  }
  if(mode==='listening'){
    $('#studyQuestion').innerHTML=session.hiddenMode?'<span class="hidden-word">••••••</span>':esc(w.english);
    $('#studyPron').innerHTML='<div class="listening-prompt"><button type="button" data-listen-again>🔊</button><span class="voice-note">Sesi dinle ve doğru anlamı seç</span></div>';
    const opts=choiceOptions(w,true);
    $('#studyContent').innerHTML=`<div class="choice-grid">${opts.map(o=>`<button class="choice" data-answer-id="${o.id}">${esc(displayClean(o.text))}</button>`).join('')}</div>`;return;
  }
  if(mode==='smart'){
    $('#studyQuestion').innerHTML=session.hiddenMode?'<span class="hidden-word">••••••</span>':esc(w.english);
    const opts=choiceOptions(w,true);
    $('#studyContent').innerHTML=`<div class="choice-grid">${opts.map(o=>`<button class="choice" data-answer-id="${o.id}">${esc(displayClean(o.text))}</button>`).join('')}</div>`;return;
  }
  if(mode==='synonym'||mode==='antonym'){
    const field=mode==='synonym'?'synonyms':'opposite';
    const rel=relationCandidates(w,field)[0];
    if(!rel){session.questionType='smart';renderStudyQuestion();return}
    session.relationAnswer=rel;
    $('#studyQuestion').innerHTML=session.hiddenMode?'<span class="hidden-word">••••••</span>':esc(w.english);
    $('#studyPron').innerHTML=`<span class="quiz-relation">${mode==='synonym'?'Eş anlamlısını seç':'Zıt anlamlısını seç'}</span>`;
    const opts=choiceOptions(rel,false);
    $('#studyContent').innerHTML=`<div class="choice-grid">${opts.map(o=>`<button class="choice" data-relation-id="${o.id}">${esc(displayClean(o.text))}</button>`).join('')}</div>`;return;
  }
  const ask=mode==='en-tr'?w.english:firstMeaning(w);
  $('#studyQuestion').innerHTML=mode==='en-tr'&&session.hiddenMode?'<span class="hidden-word">••••••</span>':esc(displayClean(ask));
  $('#studyContent').innerHTML=`<form class="answer-input" id="writeForm">
    <input id="writeAnswer" autocomplete="off" enterkeyhint="done" placeholder="Cevabını yaz…">
    <button class="primary">Kontrol et</button>
  </form>`;
  setTimeout(()=>$('#writeAnswer')?.focus(),80);
}

function revealStudyInfo(){
  const w=session?.current;if(!w)return;
  const info=$('#studyWordInfo');
  info.hidden=false;
  info.innerHTML=`<h4>KELİME BİLGİSİ</h4><b>${esc(w.english)}</b>
    <div class="info-pron">${esc(w.pronunciation||'')}</div>
    <div class="info-meaning rated-lines">${ratedLinesHtml(w.meaning||'')}</div>
    ${w.example?`<div class="info-example">${esc(displayClean(w.example))}${w.translation?`\n${esc(displayClean(w.translation))}`:''}</div>`:''}`;
}

function answer(correct,timeout=false){
  if(session.answered)return;stopQuestionTimer();const w=session.current;
  if(correct){
    session.combo=(session.combo||0)+1;session.maxCombo=Math.max(session.maxCombo||0,session.combo);session.answered=true;recordAnswer(w,true);session.correct++;session.done.add(w.id);applyCorrectTarget(w);
    const scored=responseScore(),gained=scored.points;adjustPoints(gained);revealStudyInfo();$$('.choice').forEach(b=>{b.disabled=true;b.classList.add('locked')});
    $('#studyFeedback').className='feedback good';$('#studyFeedback').textContent=`Doğru ✓ +${gained} puan · ${scored.elapsed.toFixed(1)} sn${session.combo>=2?` · 🔥 ${session.combo} seri`:''}`;
    $('#nextQuestion').hidden=false;$('#showHint').disabled=true;$('#showAnswer').disabled=true;scheduleAutoAdvance(1500);
  }else{
    session.combo=0;session.currentAttempts=(session.currentAttempts||0)+1;recordAnswer(w,false);adjustPoints(-15);const remaining=Math.max(0,3-session.currentAttempts);
    if(session.currentAttempts<3){$('#studyFeedback').className='feedback bad';$('#studyFeedback').textContent=timeout?`Süre doldu. -15 puan · ${remaining} hakkın kaldı.`:`Yanlış. -15 puan · ${remaining} hakkın kaldı.`;resetCurrentQuestionForRetry()}
    else{session.answered=true;session.done.add(w.id);session.queue.push({word:w,due:session.index+4});if(session.total<300)session.total++;markFinalCorrectChoice();revealStudyInfo();$('#studyFeedback').className='feedback bad';$('#studyFeedback').textContent=`3 hak bitti. Doğru cevap: ${w.english} — ${firstMeaning(w)}.`;$('#nextQuestion').hidden=false;$('#showHint').disabled=true;$('#showAnswer').disabled=true}
  }
  updateStudyScore();renderDashboard();saveSession();save();
}
function finishSession(){
  stopQuestionTimer();clearSavedSession();
  if(session&&!session.completed){session.completed=true;state.stats.sessions=(Number(state.stats.sessions)||0)+1;ensureDayBucket().sessions++;save()}
  const score=session?Math.round(session.correct/Math.max(1,session.index)*100):0;$('#studyBadge').textContent='OTURUM TAMAMLANDI';$('#studyQuestion').textContent=`%${score} başarı`;
  $('#studyPron').textContent=`${session.correct} doğru · ${session.index-session.correct} yanlış · ${Math.round(session.score||0)} puan · en iyi seri ${session.maxCombo||0}`;
  $('#studyContent').innerHTML=`<div class="flash-card-inner"><h3>Uçuş tamamlandı ✈</h3><p class="muted">Puanın ve ilerlemen kaydedildi. Yanlışların tekrar listene eklendi.</p><button class="primary wide" data-nav="dashboard">Ana sayfaya dön</button></div>`;
  $('#studyFeedback').textContent='';$('#studyWordInfo').hidden=true;$('#nextQuestion').hidden=true;$('#studySpeak').hidden=true;$('#studyActionBar').hidden=true;$('#studyToggleBar').hidden=true;$('#speedBar').hidden=true;if($('#studyCombo'))$('#studyCombo').hidden=true;renderAll();
}
function renderMatchingRound(){
  stopQuestionTimer();
  if(!session||session.matchingOffset>=session.total){finishSession();return}
  const remaining=session.pool.filter(w=>!session.done.has(w.id));
  const batch=remaining.slice(0,5);
  if(!batch.length){finishSession();return}
  session.matchBatch=batch;session.matchSelectedLeft=null;session.matchSelectedRight=null;session.answered=false;
  const start=session.matchingOffset+1,end=Math.min(session.total,session.matchingOffset+batch.length);
  $('#studyModeName').textContent='Eşleştirme';
  $('#studyCounter').textContent=`${start}–${end} / ${session.total}`;
  $('#studyProgress').max=session.total;$('#studyProgress').value=session.matchingOffset;
  $('#studyBadge').textContent='EŞLEŞTİRME';
  $('#studyQuestion').textContent='Kelime ve anlamı eşleştir';
  $('#studyPron').textContent='';
  $('#studySpeak').hidden=false;
  $('#studyActionBar').hidden=true;
  $('#studyFeedback').className='feedback';$('#studyFeedback').textContent='';
  $('#studyWordInfo').hidden=true;$('#nextQuestion').hidden=true;
  const left=[...batch].sort(()=>Math.random()-.5);
  const right=[...batch].sort(()=>Math.random()-.5);
  $('#studyContent').innerHTML=`<div class="matching-title"><span>İNGİLİZCE</span><span>TÜRKÇE</span></div>
    <div class="matching-board">
      <div class="match-column">${left.map(w=>`<button class="match-tile" data-match-side="left" data-match-id="${w.id}">${esc(w.english)}</button>`).join('')}</div>
      <div class="match-column">${right.map(w=>`<button class="match-tile" data-match-side="right" data-match-id="${w.id}">${esc(firstMeaning(w))}</button>`).join('')}</div>
    </div>`;
  if(session.autoSpeak&&batch[0])setTimeout(()=>speak(batch[0].english),180);
}
function selectMatchTile(btn){
  if(btn.classList.contains('matched'))return;
  const side=btn.dataset.matchSide;
  $$(`.match-tile[data-match-side="${side}"]`).forEach(x=>x.classList.remove('selected'));
  btn.classList.add('selected');
  if(side==='left'){session.matchSelectedLeft=btn;if(session.autoSpeak)speak(btn.textContent)}
  else session.matchSelectedRight=btn;
  if(!session.matchSelectedLeft||!session.matchSelectedRight)return;
  const left=session.matchSelectedLeft,right=session.matchSelectedRight;
  const correct=left.dataset.matchId===right.dataset.matchId;
  if(correct){
    const word=words.find(w=>w.id===Number(left.dataset.matchId));
    left.classList.remove('selected');right.classList.remove('selected');
    left.classList.add('matched');right.classList.add('matched');
    session.combo=(session.combo||0)+1;session.maxCombo=Math.max(session.maxCombo||0,session.combo);session.done.add(word.id);session.correct++;applyCorrectTarget(word);recordAnswer(word,true);adjustPoints(50+(session.combo>=5?10:session.combo>=2?5:0));
    session.matchingOffset++;updateStudyScore();
    session.matchSelectedLeft=null;session.matchSelectedRight=null;
    if(session.matchBatch.every(w=>session.done.has(w.id))){
      $('#studyFeedback').className='feedback good';$('#studyFeedback').textContent='Tur tamamlandı ✓';
      $('#nextQuestion').hidden=false;saveSession();
    }
  }else{
    left.classList.add('mismatch');right.classList.add('mismatch');
    const wrongWord=words.find(w=>w.id===Number(left.dataset.matchId));
    session.combo=0;if(wrongWord){recordAnswer(wrongWord,false);adjustPoints(-10);updateStudyScore()}
    setTimeout(()=>{
      left.classList.remove('selected','mismatch');right.classList.remove('selected','mismatch');
      session.matchSelectedLeft=null;session.matchSelectedRight=null;
    },500);
  }
}


function showHintForCurrent(){
  const w=session?.current;if(!w||session.answered)return;
  const target=hintTarget();if(!target)return;
  session.hintRevealCount=Math.min(target.replace(/\s/g,'').length,(session.hintRevealCount||0)+1);
  let box=$('#studyContent').querySelector('.hint-box');
  if(!box){box=document.createElement('div');box.className='hint-box';$('#studyContent').appendChild(box)}
  box.textContent=`İpucu: ${revealPattern(target,session.hintRevealCount)}`;
  adjustPoints(-5);updateStudyScore();saveSession();
}


function showAnswerForCurrent(){
  const w=session?.current;if(!w||session.answered)return;
  stopQuestionTimer();session.combo=0;session.answered=true;session.currentAttempts=3;recordAnswer(w,false);
  session.done.add(w.id);session.queue.push({word:w,due:session.index+4});
  if(session.total<300)session.total++;
  markFinalCorrectChoice();
  const box=document.createElement('div');box.className='answer-reveal';
  box.innerHTML=`<b>Doğru cevap</b>${esc(w.english)} — ${esc(firstMeaning(w))}`;
  $('#studyContent').appendChild(box);revealStudyInfo();
  $('#studyFeedback').className='feedback bad';
  $('#studyFeedback').textContent='Cevap gösterildi. Kelime tekrar listene eklendi.';
  adjustPoints(-30);
  $('#nextQuestion').hidden=false;$('#showHint').disabled=true;$('#showAnswer').disabled=true;
  updateStudyScore();saveSession();
}

function previousQuestion(){
  const prevId=session?.historyIds?.pop();if(!prevId)return;
  stopQuestionTimer();
  const prev=words.find(w=>w.id===prevId);if(!prev)return;
  session.current=prev;
  session.index=Math.max(1,session.index-1);
  session.answered=true;
  $('#studyCounter').textContent=`${session.index} / ${session.total}`;
  $('#studyProgress').value=session.index;
  $('#studyQuestion').textContent=prev.english;
  $('#studyPron').textContent=prev.pronunciation||'';
  $('#studyBadge').textContent='ÖNCEKİ SORU';
  $('#studyContent').innerHTML='';
  revealStudyInfo();
  $('#studyFeedback').className='feedback';
  $('#studyFeedback').textContent='Bu soru daha önce görüntülendi.';
  $('#nextQuestion').hidden=false;
  $('#showHint').disabled=true;$('#showAnswer').disabled=true;
  $('#previousQuestion').disabled=!session.historyIds.length;
}


function openStudySetup(mode='smart',source=null){
  $('#setupMode').value=mode||'smart';document.querySelector('input[name="quizStyle"][value="classic"]').checked=true;$$('.quiz-style-card').forEach(c=>c.classList.toggle('active',c.querySelector('input').checked));document.querySelector('input[name="rangeType"][value="quick"]').checked=true;$('#setupRangeFields').hidden=true;
  const activeFilter=$('#view-library').classList.contains('active')?($('#statusFilter').value||''):'';
  const accepted=['learn','memorized','hard','wrong','favorite','veryhard','notmemorized','selected','daily20'],resolved=source||(accepted.includes(activeFilter)?activeFilter:'all');$('#setupSource').value=resolved;
  if(mode==='wrong-review')$('#setupSource').value='wrong';if(mode==='review'&&resolved==='all')$('#setupSource').value='hard';if(mode==='listening'){$('#hiddenModeToggle').checked=true;$('#autoSpeakToggle').checked=true}$('#studySetupDialog').showModal();
}
function selectedRangeType(){return document.querySelector('input[name="rangeType"]:checked')?.value||'quick'}
function renderProfileStats(){
  const c=counts(),st=state.stats,acc=st.answers?`%${Math.round(st.correct/st.answers*100)}`:'—';
  const values={profilePoints:Math.round(st.points||0),profileMem:c.memorized,profileLearn:c.learn,profileHard:c.hard,profileWrong:c.wrong,profileStreak:computeStreak(),profileAccuracy:acc,profileSessions:st.sessions||0};Object.entries(values).forEach(([id,value])=>{if($('#'+id))$('#'+id).textContent=value});
}
function openProfile(){
  $('#profileName').value=profile.name||'';$('#dailyGoal').value=String(profile.goal||20);$('#voiceAccent').value=profile.voiceAccent||'en-US';$('#profileTitle').textContent=authUser?(profile.name||authUser.displayName||'Profil'):profile.email==='guest@local'?'Profilini oluştur':profile.name;
  const avatar=$('#profileAvatar');if(profile.photoURL)avatar.innerHTML=`<img src="${esc(profile.photoURL)}" alt="" referrerpolicy="no-referrer">`;else avatar.textContent=(profile.name||authUser?.displayName||'M')[0].toUpperCase();renderProfileStats();updateAuthUI();$('#profileDialog').showModal();
}
function openCollection(type){
  if(type==='daily20'){openStudySetup('smart','daily20');return}nav('library');$('#searchInput').value='';$('#groupFilter').value='';$('#levelFilter').value='';$('#statusFilter').value='';
  if(type==='core5000')$('#groupFilter').value='core5000';if(type==='phrases')$('#groupFilter').value='5001-6000 Kalıplar';if(type==='beginner')$('#levelFilter').value='A1-A2';if(type==='intermediate')$('#levelFilter').value='B1-B2';
  if(type==='hard')$('#statusFilter').value='hard';if(type==='wrong')$('#statusFilter').value='wrong';if(type==='memorized')$('#statusFilter').value='memorized';if(type==='favorite')$('#statusFilter').value='favorite';if(type==='veryhard')$('#statusFilter').value='veryhard';if(type==='notmemorized')$('#statusFilter').value='notmemorized';renderWords(true);
}
function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
function installInstructions(){
  const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/.test(ua),android=/Android/.test(ua),chromeIOS=/CriOS/.test(ua),chrome=/Chrome|CriOS/.test(ua);
  if(ios&&chromeIOS)return '<p><b>Chrome’dan doğrudan ekleyebilirsin.</b> Safari’ye geçmen gerekmez.</p><ol><li>Adres çubuğunun yanındaki <b>Paylaş</b> simgesine dokun.</li><li><b>Ana Ekrana Ekle</b> seçeneğini seç.</li><li>Adı WordPilot olarak bırakıp <b>Ekle</b> de.</li></ol><p class="install-alt"><b>Safari kullanıyorsan:</b> Paylaş → Ana Ekrana Ekle → Ekle.</p>';
  if(ios)return '<p><b>Safari’den ekleme</b></p><ol><li>Alt veya üst menüdeki <b>Paylaş</b> simgesine dokun.</li><li><b>Ana Ekrana Ekle</b> seçeneğini seç.</li><li>Sağ üstten <b>Ekle</b> de.</li></ol><p class="install-alt"><b>Chrome’da da:</b> Paylaş → Ana Ekrana Ekle → Ekle.</p>';
  if(android&&chrome)return '<ol><li>Chrome menüsünü <b>⋮</b> aç.</li><li><b>Uygulamayı yükle</b> veya <b>Ana ekrana ekle</b> seçeneğine dokun.</li><li><b>Yükle</b> ile tamamla.</li></ol>';
  if(android)return '<ol><li>Tarayıcı menüsünü aç.</li><li><b>Ana ekrana ekle</b> veya <b>Uygulamayı yükle</b> seçeneğine dokun.</li><li>Onaylayarak tamamla.</li></ol>';
  return '<ol><li>Tarayıcı adres çubuğundaki yükleme simgesine veya menüye tıkla.</li><li><b>WordPilot’u yükle</b> ya da <b>Ana ekrana ekle</b> seçeneğini seç.</li></ol>';
}
async function handleInstallRequest(){
  if(isStandalone()){toast('WordPilot zaten uygulama olarak açık.');return}
  if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true;return}
  $('#installHelpText').innerHTML=installInstructions();$('#installHelpDialog').showModal();
}
async function downloadOfflineMode(){
  const btn=$('#offlineBtn'),status=$('#offlineStatus');
  if(!('serviceWorker'in navigator)){status.textContent='Bu tarayıcı çevrimdışı uygulama özelliğini desteklemiyor.';return}
  btn.disabled=true;status.textContent='Yaklaşık 4,3 MB: site dosyaları ve 6000 kelime tarayıcıya kaydediliyor…';
  try{
    const reg=await navigator.serviceWorker.ready;
    const worker=reg.active||reg.waiting||reg.installing;
    if(!worker)throw new Error('worker');
    const result=await new Promise((resolve,reject)=>{
      const channel=new MessageChannel(),timer=setTimeout(()=>reject(new Error('timeout')),45000);
      channel.port1.onmessage=e=>{clearTimeout(timer);e.data?.ok?resolve(e.data):reject(new Error(e.data?.error||'cache'))};
      worker.postMessage({type:'CACHE_OFFLINE'},[channel.port2]);
    });
    const fileCount=Number(result?.files)||8,size=(Number(result?.bytes)||4300000)/1048576;status.textContent=`Hazır ✓ ${fileCount} dosya ve 6000 kelime (${size.toFixed(1)} MB) tarayıcı hafızasına kaydedildi. İndirilenler klasörüne dosya düşmez.`;toast('Çevrimdışı paket hazır.');
  }catch{status.textContent='İndirme tamamlanamadı. İnterneti kontrol edip tekrar dene.'}
  finally{btn.disabled=false}
}
function setupEvents(){
  document.addEventListener('click',e=>{
    const navBtn=e.target.closest('[data-nav]');if(navBtn){nav(navBtn.dataset.nav);return}
    const start=e.target.closest('[data-start]');if(start){openStudySetup(start.dataset.start);return}
    const collection=e.target.closest('[data-collection]');if(collection){openCollection(collection.dataset.collection);return}
    const setup=e.target.closest('[data-action="open-study-setup"]');if(setup){openStudySetup(setup.dataset.mode||'smart');return}
    const profileBtn=e.target.closest('[data-action="open-profile"]');if(profileBtn){openProfile();return}
    const selectWord=e.target.closest('[data-select-word]');if(selectWord){toggleSelected(selectWord.dataset.selectWord);return}
    const listStatus=e.target.closest('[data-list-status]');if(listStatus){setStatus(Number(listStatus.dataset.wordId),listStatus.dataset.listStatus);return}
    const listFlag=e.target.closest('[data-list-flag]');if(listFlag){setFlag(Number(listFlag.dataset.wordId),listFlag.dataset.listFlag);return}
    const close=e.target.closest('[data-close]');if(close){document.getElementById(close.dataset.close)?.close();return}
    const sp=e.target.closest('[data-speak]');if(sp){speak(sp.dataset.speak);return}const listenAgain=e.target.closest('[data-listen-again]');if(listenAgain){speak(session?.current?.english);return}
    const info=e.target.closest('[data-info]');if(info){openWord(info.dataset.info);return}
    const status=e.target.closest('[data-word-status]');if(status&&currentWord){setStatus(currentWord.id,status.dataset.wordStatus);return}
    const wordFlag=e.target.closest('[data-word-flag]');if(wordFlag&&currentWord){setFlag(currentWord.id,wordFlag.dataset.wordFlag);return}
    const leagueTab=e.target.closest('[data-league-period]');if(leagueTab){leaderboardPeriod=leagueTab.dataset.leaguePeriod;renderLeaderboard();return}
    const leagueAudienceBtn=e.target.closest('[data-league-audience]');if(leagueAudienceBtn){leaderboardAudience=leagueAudienceBtn.dataset.leagueAudience;renderLeaderboard();return}
    const removeFriend=e.target.closest('[data-remove-friend]');if(removeFriend){setFriendCode(removeFriend.dataset.removeFriend,false);return}
    if(e.target.closest('#copyFriendCode')){const code=ownFriendCode();if(!code){toast('Önce Google hesabıyla giriş yap.');return}navigator.clipboard?.writeText(code).then(()=>toast('Arkadaş kodu kopyalandı.')).catch(()=>toast(`Arkadaş kodun: ${code}`));return}
    const matchTile=e.target.closest('[data-match-side]');if(matchTile){selectMatchTile(matchTile);return}
    const answerBtn=e.target.closest('[data-answer-id]');
    if(answerBtn){
      const correct=Number(answerBtn.dataset.answerId)===session.current.id;
      if(correct){
        answerBtn.classList.add('correct');
        $$('.choice').forEach(b=>b.disabled=true);
      }else{
        answerBtn.classList.add('wrong','used-wrong');answerBtn.disabled=true;
      }
      answer(correct);return;
    }
    const relationBtn=e.target.closest('[data-relation-id]');
    if(relationBtn){
      const correct=Number(relationBtn.dataset.relationId)===session.relationAnswer?.id;
      if(correct){
        relationBtn.classList.add('correct');
        $$('.choice').forEach(b=>b.disabled=true);
      }else{
        relationBtn.classList.add('wrong','used-wrong');relationBtn.disabled=true;
      }
      answer(correct);return;
    }
    const flip=e.target.closest('[data-flip]');
    if(flip){flip.hidden=true;flip.parentElement.querySelector('.flash-reveal').hidden=false;return}
    const flash=e.target.closest('[data-flash]');
    if(flash){
      const result=flash.dataset.flash,isCorrect=result!=='hard';setStatusValue(session.current.id,result);recordAnswer(session.current,isCorrect);
      if(isCorrect){session.combo=(session.combo||0)+1;session.maxCombo=Math.max(session.maxCombo||0,session.combo);adjustPoints(result==='memorized'?60:35)}else{session.combo=0;adjustPoints(-5)}
      session.done.add(session.current.id);save();nextStudy();return;
    }
    const f=e.target.closest('[data-filter-status]');
    if(f){nav('library');$('#statusFilter').value=f.dataset.filterStatus;renderWords(true);return}
  });
  $('#searchInput').addEventListener('input',()=>renderWords(true));
  ['groupFilter','levelFilter','statusFilter'].forEach(id=>$('#'+id).addEventListener('change',()=>renderWords(true)));
  $('#loadMore').addEventListener('click',()=>{listLimit+=80;renderWords()});
  $('#wordSpeakUS').addEventListener('click',()=>speak(currentWord?.english,'en-US'));$('#wordSpeakUK').addEventListener('click',()=>speak(currentWord?.english,'en-GB'));
  $('#studySpeak').addEventListener('click',()=>speak(session?.current?.english));
  $('#studyInfo').addEventListener('click',()=>session?.current&&openWord(session.current.id));
  $('#exitStudy').addEventListener('click',()=>{
    stopQuestionTimer();
    $('#exitStudyDialog').showModal();
  });
  $('#saveAndExit').addEventListener('click',()=>{
    saveSession();$('#exitStudyDialog').close();nav('dashboard');toast('Oturum kaydedildi.');
  });
  $('#exitWithoutSave').addEventListener('click',()=>{
    clearSavedSession();$('#exitStudyDialog').close();nav('dashboard');toast('Oturum kaydedilmeden kapatıldı.');
  });
  $('#cancelExit').addEventListener('click',()=>{
    $('#exitStudyDialog').close();
    if(session&&!session.answered)startQuestionTimer();
  });
  $('#showHint').addEventListener('click',showHintForCurrent);
  $('#showAnswer').addEventListener('click',showAnswerForCurrent);
  $('#toggleAutoSpeak').addEventListener('click',()=>{
    if(!session)return;session.autoSpeak=!session.autoSpeak;updateAttemptDisplay();
    if(session.autoSpeak&&session.current)speak(session.current.english);
    saveSession();
  });
  $('#toggleHiddenMode').addEventListener('click',()=>{
    if(!session)return;session.hiddenMode=!session.hiddenMode;updateQuestionVisibility();updateAttemptDisplay();saveSession();
  });
  $('#previousQuestion').addEventListener('click',previousQuestion);
  $('#nextQuestion').addEventListener('click',()=>{if(session?.advanceTimer){clearTimeout(session.advanceTimer);session.advanceTimer=null}if(session?.mode==='matching')renderMatchingRound();else nextStudy()});
  $('#studySelectedBtn').addEventListener('click',()=>openStudySetup('smart','selected'));
  $('#installAppBtn').addEventListener('click',handleInstallRequest);
  $('#offlineBtn').addEventListener('click',downloadOfflineMode);
  $('#googleSignInBtn').addEventListener('click',signInWithGoogle);
  $('#googleSignOutBtn').addEventListener('click',signOutGoogle);
  $('#refreshLeagueBtn')?.addEventListener('click',()=>{if(!authUser){renderLeaderboard();return}setLeagueSyncStatus('Yenileniyor…','syncing');scheduleLeaderboardWrite(0);refreshCloudLeaderboard(true)});
  $('#guestContinueBtn').addEventListener('click',()=>switchToGuestMode());
  window.addEventListener('online',()=>{if(authUser){syncCloudNow();pushLeaderboardNow();refreshCloudLeaderboard(true)}});
  document.addEventListener('submit',e=>{
    if(e.target.id==='friendAddForm'){
      e.preventDefault();if(!authUser){toast('Arkadaş eklemek için Google hesabıyla giriş yap.');return}const input=$('#friendCodeInput');if(setFriendCode(input.value,true))input.value='';return;
    }
    if(e.target.id==='writeForm'){
      e.preventDefault();
      const val=clean($('#writeAnswer').value).toLocaleLowerCase('tr');
      const w=session.current,mode=session.questionType||session.mode;
      const correct=mode==='en-tr'
        ?clean(w.meaning).toLocaleLowerCase('tr').split(/\n|★/).map(clean).filter(Boolean).some(x=>x===val||x.includes(val)||val.includes(x))
        :val===clean(w.english).toLocaleLowerCase('tr');
      answer(correct);
    }
    if(e.target.id==='profileForm'){
      e.preventDefault();
      profile={
        ...profile,
        name:$('#profileName').value.trim()||authUser?.displayName||'Öğrenci',
        email:(authUser?.email||profile?.email||'guest@local').toLowerCase(),
        goal:Number($('#dailyGoal').value||20),voiceAccent:$('#voiceAccent').value||'en-US',
        uid:authUser?.uid||profile?.uid||'',photoURL:authUser?.photoURL||profile?.photoURL||''
      };
      save();updateAuthUI();$('#profileDialog').close();renderAll();toast(authUser?'Profil kaydedildi ve eşitleniyor':'Profil bu cihaza kaydedildi');
    }
  });
  $('#resetData').addEventListener('click',()=>{
    if(confirm('Bu profildeki tüm ilerleme silinsin mi?')){
      state=defaultState();save();if(authUser)syncCloudNow();renderAll();$('#profileDialog').close();toast('İlerleme sıfırlandı');
    }
  });
  $('#setupMode').addEventListener('change',()=>{if($('#setupMode').value==='listening'){$('#hiddenModeToggle').checked=true;$('#autoSpeakToggle').checked=true}});
  document.querySelectorAll('input[name="quizStyle"]').forEach(r=>r.addEventListener('change',()=>{$$('.quiz-style-card').forEach(c=>c.classList.toggle('active',c.querySelector('input').checked))}));
  document.querySelectorAll('input[name="rangeType"]').forEach(r=>r.addEventListener('change',()=>{$('#setupRangeFields').hidden=selectedRangeType()!=='custom'}));
  $('#studySetupForm').addEventListener('submit',e=>{
    e.preventDefault();
    const mode=$('#setupMode').value,source=$('#setupSource').value,rangeType=selectedRangeType();
    if(source==='selected'&&!(state.selected||[]).length){toast('Önce kelime listesinden + işaretiyle kelime seç.');return}
    if(rangeType==='quick'){$('#studySetupDialog').close();startStudy(mode,null,selectedQuizStyle(),source,false);return}
    if(rangeType==='all'){$('#studySetupDialog').close();startStudy(mode,null,selectedQuizStyle(),source,true);return}
    let a=Number($('#setupStart').value),b=Number($('#setupEnd').value);
    if(!Number.isFinite(a)||!Number.isFinite(b)){toast('Başlangıç ve bitiş numarasını gir.');return}
    a=Math.max(1,Math.min(words.length,a));b=Math.max(1,Math.min(words.length,b));
    if(a>b)[a,b]=[b,a];
    $('#studySetupDialog').close();startStudy(mode,{start:a,end:b},selectedQuizStyle(),source,false);
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||!$('#view-study').classList.contains('active')||!session)return;
    const input=e.target.closest?.('#writeAnswer');
    if(input){
      e.preventDefault();
      if(session.answered&&!$('#nextQuestion').hidden){$('#nextQuestion').click();return}
      document.querySelector('#writeForm')?.requestSubmit();return;
    }
    if(session.answered&&!$('#nextQuestion').hidden){
      e.preventDefault();$('#nextQuestion').click();
    }
  });
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
  $('#installBtn').addEventListener('click',handleInstallRequest);
}
async function init(){
  load();
  try{
    const response=await fetch(`words.json?v=${VERSION}`,{cache:'no-store'});
    if(!response.ok)throw new Error('words.json');
    words=await response.json();
  }catch{
    document.body.innerHTML='<main><div class="panel"><h2>Veri yüklenemedi</h2><p>Bağlantıyı kontrol edip sayfayı yenileyin.</p></div></main>';return;
  }
  setupEvents();renderAll();renderWords(true);
  if('serviceWorker'in navigator)navigator.serviceWorker.register(`sw.js?v=${VERSION}`);
  initFirebase();
  $('#installBtn').hidden=isStandalone();updateSelectedControls();
  const hasSaved=!!localStorage.getItem(SESSION_KEY);
  if(hasSaved&&confirm('Kaydedilmiş bir quiz oturumun var. Devam etmek ister misin?'))restoreSavedSession();
  else if(profile.email==='guest@local'&&!localStorage.getItem(GUEST_ACK_KEY))setTimeout(()=>{if(!authUser&&!$('#profileDialog').open)openProfile()},1200);
}
init();
