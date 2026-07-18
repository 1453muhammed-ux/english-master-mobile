function firstLine(value=''){return displayClean(String(value).split(/\n+/)[0].replace(/^•\s*/,''))}
function firstExample(w){return firstLine(w?.example||'')}
function escapeRegex(value=''){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function exampleContainsTarget(w){const ex=firstExample(w),target=String(w?.english||'').trim();return !!(ex&&target&&new RegExp(`(^|[^\\p{L}])${escapeRegex(target)}([^\\p{L}]|$)`,'iu').test(ex))}
function blankTarget(sentence,target){
  const re=new RegExp(`(^|[^\\p{L}])(${escapeRegex(target)})(?=[^\\p{L}]|$)`,'iu');
  return sentence.replace(re,(m,prefix)=>`${prefix}${'＿'.repeat(Math.max(4,[...target].length))}`);
}
function normalizeAnswer(value=''){
  return clean(value).normalize('NFKC').toLocaleLowerCase(activeCourse==='ru'?'ru-RU':'tr-TR')
    .replace(/[’‘`ʻʼ]/g,"'").replace(/[.,!?;:"“”]/g,'').replace(/o['’]z/g,"o'z").replace(/g['’]/g,"g'").replace(/\s+/g,' ').trim();
}
function sentenceQuestion(w){
  const sentence=firstExample(w),tokens=sentence.split(/\s+/),cut=Math.max(1,Math.floor(tokens.length/2)),prompt=tokens.slice(0,cut).join(' ')+' …',answer=tokens.slice(cut).join(' ');
  const alternatives=words.filter(x=>x.id!==w.id&&firstExample(x).split(/\s+/).length>=4).sort(()=>Math.random()-.5).slice(0,3).map(x=>{const t=firstExample(x).split(/\s+/);return t.slice(Math.max(1,Math.floor(t.length/2))).join(' ')});
  return {prompt,answer,options:[answer,...alternatives].sort(()=>Math.random()-.5)};
}
function courseStateKey(course=activeCourse,email=(profile?.email||'guest@local').toLowerCase()){
  const cleanEmail=String(email||'guest@local').toLowerCase();
  return course==='en'?`${STORE}:${cleanEmail}`:`${STORE}:course:${course}:${cleanEmail}`;
}
function profileKey(){return courseStateKey(activeCourse)}
function readLocalState(email,course=activeCourse){
  if(!email)return null;try{const raw=JSON.parse(localStorage.getItem(courseStateKey(course,email)));return raw?ensureStateShape(raw):null}catch{return null}
}
function writeCourseState(course,value,email=(profile?.email||'guest@local').toLowerCase()){localStorage.setItem(courseStateKey(course,email),JSON.stringify(ensureStateShape(value)))}
function load(){
  try{profile=JSON.parse(localStorage.getItem(`${STORE}:profile`))}catch{}
  if(!profile)profile={name:'Öğrenci',email:'guest@local',goal:20,voiceAccent:'en-US'};
  activeCourse=profile.activeCourse||localStorage.getItem(ACTIVE_COURSE_KEY)||'en';if(!COURSES[activeCourse])activeCourse='en';
  profile.activeCourse=activeCourse;if(!profile.voiceAccent)profile.voiceAccent='en-US';if(!profile.goal)profile.goal=20;
  state=readLocalState(profile.email,activeCourse)||defaultState();normalizeDay();
}
function courseStatesFor(email=(profile?.email||'guest@local').toLowerCase()){
  const out={};COURSE_IDS.forEach(id=>{out[id]=id===activeCourse?ensureStateShape(cloneData(state)):readLocalState(email,id)||defaultState()});return out;
}
function periodTotalsForState(st,period='all'){
  st=ensureStateShape(cloneData(st)||defaultState());const days=st.stats.days||{},today=todayKey(),week=weekKey(),month=monthKey(),out={points:0,answers:0,correct:0,sessions:0};
  Object.entries(days).forEach(([key,val])=>{const include=period==='all'||(period==='daily'&&key===today)||(period==='weekly'&&key>=week&&key<=today)||(period==='monthly'&&key.startsWith(month));if(!include)return;out.points+=Number(val.points)||0;out.answers+=Number(val.answers)||0;out.correct+=Number(val.correct)||0;out.sessions+=Number(val.sessions)||0});
  if(period==='all'){out.points=Math.max(out.points,Number(st.stats.points)||0);out.answers=Math.max(out.answers,Number(st.stats.answers)||0);out.correct=Math.max(out.correct,Number(st.stats.correct)||0);out.sessions=Math.max(out.sessions,Number(st.stats.sessions)||0)}return out;
}
function aggregateTotals(period='all'){const total={points:0,answers:0,correct:0,sessions:0};Object.values(courseStatesFor()).forEach(st=>{const t=periodTotalsForState(st,period);Object.keys(total).forEach(k=>total[k]+=Number(t[k])||0)});return total}
function countsForState(st){st=ensureStateShape(cloneData(st)||defaultState());const c={learn:0,memorized:0,hard:0,favorite:0,veryHard:0,ignored:0,wrong:0};Object.values(st.statuses).forEach(v=>{if(c[v]!==undefined)c[v]++});['favorite','veryHard','ignored'].forEach(flag=>c[flag]=Object.keys(st.flags?.[flag]||{}).length);c.wrong=Object.values(st.history||{}).filter(h=>h?.needsReview===true).length;return c}
function aggregateCounts(){const out={learn:0,memorized:0,hard:0,favorite:0,veryHard:0,ignored:0,wrong:0};Object.values(courseStatesFor()).forEach(st=>{const c=countsForState(st);Object.keys(out).forEach(k=>out[k]+=c[k])});return out}
function globalStreak(){return Math.max(...Object.values(courseStatesFor()).map(st=>Number(st.stats?.streak)||0),0)}
function leaderboardScores(){const all=aggregateTotals('all'),day=aggregateTotals('daily'),week=aggregateTotals('weekly'),month=aggregateTotals('monthly');return {points:Math.max(0,Math.round(all.points)),dailyPoints:Math.max(0,Math.round(day.points)),weeklyPoints:Math.max(0,Math.round(week.points)),monthlyPoints:Math.max(0,Math.round(month.points))}}
function updateLeaderboardEntry(){
  let board=[];try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}const email=(profile?.email||'guest@local').toLowerCase(),scores=leaderboardScores(),c=aggregateCounts(),tot=aggregateTotals('all');
  const entry={name:accountDisplayName(),email,friendCode:authUser?.uid?ownFriendCode(authUser.uid):'',...scores,photoURL:profile?.photoURL||'',streak:globalStreak(),memorized:c.memorized,learn:c.learn,hard:c.hard,wrong:c.wrong,favorite:c.favorite,answers:tot.answers,accuracy:tot.answers?Math.round(tot.correct/tot.answers*100):0,updated:new Date().toISOString()};
  const index=board.findIndex(x=>x.email===email);if(index>=0)board[index]=entry;else board.push(entry);board=board.sort((a,b)=>(b.points||0)-(a.points||0)||String(a.name).localeCompare(String(b.name),'tr')).slice(0,100);localStorage.setItem(LEADERBOARD_KEY,JSON.stringify(board));
}
function taskDefinitions(){
  const bucket=state.stats.days?.[todayKey()]||{};
  const stories=state.stats?.v5?.stories||{};
  const storyDoneToday=Object.values(stories).filter(item=>item?.completed&&item?.at&&dateKey(new Date(item.at))===todayKey()).length;
  return [
    {id:'answer10',icon:'✓',title:'10 soru çöz',value:Number(bucket.answers)||0,target:10,reward:50},
    {id:'correct8',icon:'🎯',title:'8 doğru cevap',value:Number(bucket.correct)||0,target:8,reward:50},
    {id:'story1',icon:'📖',title:'1 hikâye bölümü bitir',value:storyDoneToday,target:1,reward:40,action:'stories'},
    {id:'session1',icon:'✈',title:'1 oturum tamamla',value:Number(bucket.sessions)||0,target:1,reward:40}
  ];
}
function applyDailyTaskRewards(){
  if(taskRewardGuard)return[];taskRewardGuard=true;const day=todayKey(),claims=state.stats.taskClaims||(state.stats.taskClaims={}),dayClaims=claims[day]||(claims[day]={}),earned=[];
  taskDefinitions().forEach(task=>{if(task.value>=task.target&&!dayClaims[task.id]){dayClaims[task.id]=true;state.stats.points=Math.max(0,(Number(state.stats.points)||0)+task.reward);ensureDayBucket(day).points=Math.max(0,(Number(ensureDayBucket(day).points)||0)+task.reward);earned.push(task)}});taskRewardGuard=false;
  if(earned.length)setTimeout(()=>toast(`${earned.map(t=>t.title).join(', ')} tamamlandı · +${earned.reduce((s,t)=>s+t.reward,0)} PP`),80);return earned;
}
function save(options={}){
  state=ensureStateShape(state);state.lastActive=new Date().toISOString();applyDailyTaskRewards();profile.activeCourse=activeCourse;localStorage.setItem(ACTIVE_COURSE_KEY,activeCourse);localStorage.setItem(`${STORE}:profile`,JSON.stringify(profile));writeCourseState(activeCourse,state);updateLeaderboardEntry();if(options.cloud!==false)scheduleCloudSync();
}
function leaderboardCloudPayload(){
  if(!authUser)return null;const publicName=accountDisplayName(profile?.name,authUser),scores=leaderboardScores(),c=aggregateCounts(),tot=aggregateTotals('all');
  return {uid:authUser.uid,name:publicName,friendCode:ownFriendCode(authUser.uid),...scores,photoURL:authUser.photoURL||profile?.photoURL||'',streak:globalStreak(),memorized:c.memorized,learn:c.learn,hard:c.hard,wrong:c.wrong,favorite:c.favorite,answers:tot.answers,accuracy:tot.answers?Math.round(tot.correct/tot.answers*100):0,activeCourse,clientUpdatedAt:new Date().toISOString(),updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()};
}
function currentLeaderboardRow(){if(!authUser)return null;const scores=leaderboardScores(),c=aggregateCounts(),tot=aggregateTotals('all');return {uid:authUser.uid,name:accountDisplayName(),friendCode:ownFriendCode(authUser.uid),...scores,photoURL:authUser.photoURL||profile?.photoURL||'',streak:globalStreak(),memorized:c.memorized,learn:c.learn,hard:c.hard,wrong:c.wrong,favorite:c.favorite,answers:tot.answers,accuracy:tot.answers?Math.round(tot.correct/tot.answers*100):0,activeCourse}}
async function syncCloudNow(){
  if(!authUser||!fbDb||!cloudReady)return;if(cloudSyncBusy){cloudSyncQueued=true;return}cloudSyncBusy=true;cloudSyncQueued=false;clearTimeout(cloudSyncTimer);
  try{
    const states=courseStatesFor(authUser.email||profile.email),packed={};COURSE_IDS.forEach(id=>packed[id]=packState(states[id]));cloudCourseStates=states;
    const publicName=accountDisplayName(profile?.name,authUser),userPayload={profile:{name:publicName,email:authUser.email||'',goal:Number(profile?.goal||20),voiceAccent:profile?.voiceAccent||'en-US',v5Voices:profile?.v5Voices||{},v5Rates:profile?.v5Rates||{},photoURL:authUser.photoURL||'',activeCourse,languageProfile:(typeof wp71LanguageProfile!=='undefined'?{ui:wp71LanguageProfile.ui||wp71LanguageProfile.support||'en',support:wp71LanguageProfile.support||'en',target:activeCourse,experience:wp71LanguageProfile.experience||'standard',updatedAt:wp71LanguageProfile.updatedAt||new Date().toISOString()}:null),joinedAt:states.en?.stats?.joinedAt||state.stats.joinedAt||''},coursesJson:JSON.stringify(packed),courseSchema:1,clientUpdatedAt:String(state.lastActive||new Date().toISOString()),updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()};
    userPayload.stateJson=JSON.stringify(packed.en);userPayload.stateSchema=Number(packed.en?.v)||3;
    await Promise.all([fbDb.collection('users').doc(authUser.uid).set(userPayload,{merge:true}),fbDb.collection('leaderboard').doc(authUser.uid).set(leaderboardCloudPayload(),{merge:true})]);
    setSyncStatus('Senkronize edildi ✓','ok');setLeagueSyncStatus('PP güncel ✓','ok');updateLeaderboardCacheWithOwn();if($('#view-league')?.classList.contains('active'))renderLeaderboard();
  }catch(error){console.error('Cloud sync error',error);setSyncStatus(cloudErrorMessage(error),'error')}finally{cloudSyncBusy=false;if(cloudSyncQueued){cloudSyncQueued=false;scheduleCloudSync(250)}}
}
function parseRemoteCourses(remoteData){
  const out={};if(typeof remoteData?.coursesJson==='string'){try{const parsed=JSON.parse(remoteData.coursesJson);COURSE_IDS.forEach(id=>{if(parsed[id])out[id]=unpackState(parsed[id])})}catch(error){console.error('Course JSON parse error',error)}}
  if(!out.en){const legacy=remoteStateFromDocument(remoteData);if(legacy)out.en=legacy}return out;
}
async function handleAuthState(user){
  authUser=user||null;cloudLeaderboardCache={};if(!user){cloudReady=false;stopLeaderboardRealtime();updateAuthUI();renderAll();return}
  const email=(user.email||'').toLowerCase(),previousEmail=(profile?.email||'guest@local').toLowerCase();setSyncStatus('Buluttaki kurslar alınıyor…','syncing');let remoteData=null;try{const snap=await fbDb.collection('users').doc(user.uid).get();remoteData=snap.exists?snap.data():null}catch(error){console.error('Cloud load error',error)}
  const remoteCourses=parseRemoteCourses(remoteData),migrationKey=`${STORE}:guest_migrated_v40:${user.uid}`;let transfer=false;
  if(!localStorage.getItem(migrationKey)){const hasGuest=COURSE_IDS.some(id=>hasProgress(readLocalState('guest@local',id)||defaultState()));if(hasGuest)transfer=confirm('Bu cihazdaki misafir ilerlemelerini bağlı hesabına aktarmak ister misin?');localStorage.setItem(migrationKey,transfer?'1':'0')}
  COURSE_IDS.forEach(id=>{let merged=mergeStates(remoteCourses[id],readLocalState(email,id)||defaultState());if(transfer)merged=mergeStates(merged,readLocalState('guest@local',id)||defaultState());cloudCourseStates[id]=merged;writeCourseState(id,merged,email)});
  const remoteProfile=remoteData?.profile||{},remoteName=placeholderName(remoteProfile.name)?'':normalizedName(remoteProfile.name),localName=placeholderName(profile?.name)?'':normalizedName(profile?.name);
  const localRouteTarget=(typeof wp71LanguageProfile!=='undefined'&&COURSES[wp71LanguageProfile?.target])?wp71LanguageProfile.target:null;
  activeCourse=localRouteTarget||(COURSES[remoteProfile.activeCourse]?remoteProfile.activeCourse:(COURSES[profile.activeCourse]?profile.activeCourse:'en'));
  profile={name:accountDisplayName(remoteName||localName,user),email:email||'guest@local',goal:Number(remoteProfile.goal||profile?.goal||20),voiceAccent:remoteProfile.voiceAccent||profile?.voiceAccent||'en-US',v5Voices:remoteProfile.v5Voices||profile?.v5Voices||{},v5Rates:remoteProfile.v5Rates||profile?.v5Rates||{},activeCourse,uid:user.uid,photoURL:user.photoURL||remoteProfile.photoURL||''};
  state=readLocalState(email,activeCourse)||defaultState();normalizeDay();localStorage.setItem(`${STORE}:profile`,JSON.stringify(profile));cloudReady=true;await loadCourseWords(activeCourse);updateAuthUI();renderAll();await syncCloudNow();
}
async function loadCourseWords(course=activeCourse){
  if(courseWordCache[course]){words=courseWordCache[course];return words}const meta=COURSES[course],response=await fetch(`${meta.file}?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(meta.file);const data=await response.json();courseWordCache[course]=data;words=data;return data;
}
function updateCourseUI(){
  const meta=COURSES[activeCourse];$$('[data-course]').forEach(btn=>{const active=btn.dataset.course===activeCourse;btn.classList.toggle('active',active);const em=btn.querySelector('em');if(em)em.textContent=active?'Aktif':'Seç'});
  if($('#activeCourseSummary'))$('#activeCourseSummary').textContent=`${meta.name} · ${meta.countLabel}`;if($('#courseTopBadge'))$('#courseTopBadge').textContent=meta.name;if($('#libraryCourseName'))$('#libraryCourseName').textContent=meta.name;
  if($('#proofWordCount'))$('#proofWordCount').textContent=meta.displayCount||words.length;if($('#proofWordLabel'))$('#proofWordLabel').textContent=meta.countLabel.includes('kalıp')?'kelime ve kalıp':'A1 kelime ve ifade';
  const search=$('#searchInput');if(search)search.placeholder=`${meta.name} kelime, Türkçe anlam veya örnek ara…`;
  const group=$('#groupFilter');if(group){if(activeCourse==='en')group.innerHTML='<option value="">Tüm gruplar</option><option value="base1000">1000 temel kelime</option><option value="context1000">1000 bağlam kartı</option>';else group.innerHTML=`<option value="">Tüm ${meta.name} kayıtları</option><option value="${activeCourse==='ru'?'Rusça A1':'Özbekçe A1'}">A1 Başlangıç</option>`}
  const start=$('#setupStart'),end=$('#setupEnd');if(start)start.max=words.length;if(end){end.max=words.length;end.value=Math.min(50,words.length)};
  const us=$('#wordSpeakUS'),uk=$('#wordSpeakUK');if(us){us.textContent=meta.flag;us.title=`${meta.name} dinle`}if(uk){uk.textContent='🔊';uk.title=`${meta.name} tekrar dinle`}
  $$('.collection-card').forEach(card=>{if(activeCourse!=='en'&&['core5000','phrases','intermediate'].includes(card.dataset.collection))card.hidden=true;else card.hidden=false});
  const beginner=$('.collection-card[data-collection="beginner"]');if(beginner){const b=beginner.querySelector('b'),sm=beginner.querySelector('small');if(activeCourse==='en'){if(b)b.textContent='A1–A2 Başlangıç';if(sm)sm.textContent='Temelden sağlam ilerle'}else{if(b)b.textContent=`${meta.name} A1 Başlangıç`;if(sm)sm.textContent=`${words.length} temel kelime ve ifade`}}
  $$('[data-start="synonym"],[data-start="antonym"]').forEach(btn=>btn.hidden=activeCourse!=='en');const syn=$('#setupMode option[value="synonym"]'),ant=$('#setupMode option[value="antonym"]');if(syn)syn.disabled=activeCourse!=='en';if(ant)ant.disabled=activeCourse!=='en';
}
async function switchCourse(course){
  if(!COURSES[course]||course===activeCourse)return;if(session&&$('#view-study')?.classList.contains('active')&&!confirm('Açık çalışma oturumu kapatılsın ve kurs değiştirilsin mi?'))return;
  save({cloud:false});clearSavedSession();session=null;activeCourse=course;profile.activeCourse=course;localStorage.setItem(ACTIVE_COURSE_KEY,course);state=readLocalState(profile.email,course)||cloudCourseStates[course]||defaultState();normalizeDay();
  try{await loadCourseWords(course);updateCourseUI();save();renderAll();renderWords(true);nav('dashboard');toast(`${COURSES[course].name} kursu açıldı.`)}catch{toast('Kurs verisi yüklenemedi.')}
}
function renderDailyTasks(){
  const list=$('#dailyTaskList');if(!list)return;const claims=state.stats.taskClaims?.[todayKey()]||{},tasks=taskDefinitions(),done=tasks.filter(t=>claims[t.id]).length;if($('#dailyTaskDone'))$('#dailyTaskDone').textContent=`${done} / ${tasks.length}`;
  list.innerHTML=tasks.map(t=>{const complete=!!claims[t.id],pct=Math.min(100,Math.round(t.value/t.target*100)),action=t.action?` data-v5-open="${esc(t.action)}" role="button" tabindex="0" title="Görevi aç"`:'';return `<div class="daily-task ${complete?'complete':''} ${t.action?'actionable':''}"${action}><span>${complete?'✓':t.icon}</span><div><b>${esc(t.title)}</b><small>${Math.min(t.value,t.target)} / ${t.target} · +${t.reward} PP</small><i style="width:${pct}%"></i></div>${t.action&&!complete?'<em>→</em>':''}</div>`}).join('');
}
function renderXp(){const total=leaderboardScores().points,level=Math.floor(total/500)+1,within=total%500;if($('#globalXpText'))$('#globalXpText').textContent=`${total} PP`;if($('#xpLevel'))$('#xpLevel').textContent=level;if($('#xpToNext'))$('#xpToNext').textContent=`${500-within} PP`;if($('#xpLevelFill'))$('#xpLevelFill').style.width=`${within/5}%`;if($('#xpText'))$('#xpText').textContent=`${total} PP`}
function renderDashboard(){renderDashboardBase();updateCourseUI();renderXp();renderDailyTasks();const meta=COURSES[activeCourse];if($('#dailyWordSpeak'))$('#dailyWordSpeak').dataset.speak=$('#dailyWordEnglish')?.textContent||'';if($('#heroMessage')&&!state.stats.todayAnswers)$('#heroMessage').textContent=`${meta.name} kursunda ${reviewIds().length} tekrar ve ${words.length} kayıt seni bekliyor.`}
function renderProfileStats(){const c=aggregateCounts(),tot=aggregateTotals('all'),acc=tot.answers?`%${Math.round(tot.correct/tot.answers*100)}`:'—',values={profilePoints:Math.round(tot.points||0),profileMem:c.memorized,profileLearn:c.learn,profileHard:c.hard,profileWrong:c.wrong,profileStreak:globalStreak(),profileAccuracy:acc,profileSessions:tot.sessions||0};Object.entries(values).forEach(([id,value])=>{if($('#'+id))$('#'+id).textContent=value})}
function openCollection(type){if(activeCourse!=='en'&&['core5000','phrases','beginner','intermediate'].includes(type)){nav('library');$('#searchInput').value='';$('#groupFilter').value='';$('#levelFilter').value='';$('#statusFilter').value='';renderWords(true);return}openCollectionBase(type)}
function openProfile(){openProfileBase();renderProfileStats()}
function setupV40Events(){
  document.addEventListener('click',e=>{const course=e.target.closest('[data-course]');if(course){switchCourse(course.dataset.course);return}const sentence=e.target.closest('[data-sentence-option]');if(sentence&&session){const correct=sentence.dataset.correct==='1';if(correct){$$('[data-sentence-option]').forEach(b=>b.disabled=true);sentence.classList.add('correct')}else{sentence.classList.add('wrong','used-wrong');sentence.disabled=true}answer(correct);return}});
  document.addEventListener('submit',e=>{if(e.target.id==='dictationForm'){e.preventDefault();answer(normalizeAnswer($('#dictationAnswer').value)===normalizeAnswer(session.current.english));return}});
}
/* WordPilot v4.3 course and Russian academy engine.
   Existing localStorage/Firebase state keys are intentionally unchanged. */
const RUSSIAN_TOPICS=[
  'Selamlaşma ve tanışma','Sayılar, günler, aylar ve saat','Aile ve insanlar','Ev ve günlük eşyalar',
  'Yiyecek ve içecek','Şehir, ulaşım ve yönler','İş ve okul','Sağlık ve vücut','Alışveriş','En sık kullanılan fiiller ve sıfatlar'
];
let russianAlphabet=[],academyGame=null;
MODE_LABEL.ordering='Cümle Sıralama';
COURSES.ru.displayCount=1300;
COURSES.ru.countLabel='1300 kontrollü A1–C2 kelime ve ifade';
COURSES.ru.starter=false;

function normalizeCourseRecord(row,course){
  if(course!=='ru'||!row?.word)return row;
  const typeLabel=String(row.type||'kelime');
  return {
    ...row,
    meaningTr:row.translation,
    exampleTranslation:row.example_translation,
    english:row.word,
    pronunciation:`${row.stress} · ${row.reading}`,
    meaning:`${row.translation} ★★★★★`,
    usage:`• Konu: ${row.topic}\n• Vurgulu Kiril yazımı: ${row.stress}`,
    example:`• ${row.example}`,
    translation:`• ${row.example_translation}`,
    synonyms:'Yok',opposite:'Yok',family:'Yok',phrase:'',collocations:'',
    notes:`Vurgulu Kiril: ${row.stress}\nTürkçe okunuş: ${row.reading}`,
    cefr:`● ${row.level}`,
    type:`● ${typeLabel.charAt(0).toLocaleUpperCase('tr-TR')+typeLabel.slice(1)}`,
    group:row.topic
  };
}

async function loadRussianAlphabet(){
  if(russianAlphabet.length)return russianAlphabet;
  const response=await fetch(`ru_alphabet.json?v=${VERSION}`,{cache:'no-store'});
  if(!response.ok)throw new Error('ru_alphabet.json');
  russianAlphabet=await response.json();
  return russianAlphabet;
}

const wp40LoadCourseWords=loadCourseWords;
loadCourseWords=async function(course=activeCourse){
  if(courseWordCache[course]){words=courseWordCache[course];if(course==='ru'&&!russianAlphabet.length)await loadRussianAlphabet();return words}
  const meta=COURSES[course],response=await fetch(`${meta.file}?v=${VERSION}`,{cache:'no-store'});
  if(!response.ok)throw new Error(meta.file);
  const raw=await response.json(),data=raw.map(row=>normalizeCourseRecord(row,course));
  courseWordCache[course]=data;words=data;
  if(course==='ru')await loadRussianAlphabet();
  return data;
};

function renderRussianTopics(){
  const grid=$('#russianTopicGrid');if(!grid)return;
  const counts=new Map(RUSSIAN_TOPICS.map(topic=>[topic,words.filter(w=>w.group===topic).length]));
  grid.innerHTML=RUSSIAN_TOPICS.map((topic,index)=>`<article class="russian-topic-card">
    <button type="button" class="topic-open" data-russian-topic="${esc(topic)}"><span>${String(index+1).padStart(2,'0')}</span><div><b>${esc(topic)}</b><small>${counts.get(topic)||0} kayıt · A1–A2</small></div></button>
    <button type="button" class="topic-study" data-topic-study="${esc(topic)}">Çalış</button>
  </article>`).join('');
}

const wp40UpdateCourseUI=updateCourseUI;
updateCourseUI=function(){
  wp40UpdateCourseUI();
  const isRu=activeCourse==='ru',tools=$('#russianTools');if(tools)tools.hidden=!isRu;
  const ruCard=document.querySelector('[data-course="ru"] small');if(ruCard)ruCard.textContent='Türkçe anlatımlı · 1300 kontrollü kayıt + A1–C2 Akademi';
  const group=$('#groupFilter');
  if(group&&isRu)group.innerHTML='<option value="">Tüm Rusça konuları</option>'+RUSSIAN_TOPICS.map(topic=>`<option value="${esc(topic)}">${esc(topic)}</option>`).join('');
  const orderingCard=$('#orderingModeCard');if(orderingCard)orderingCard.hidden=!isRu;
  const orderingOption=$('#setupMode option[value="ordering"]');if(orderingOption)orderingOption.disabled=!isRu;
  if($('#proofModeCount'))$('#proofModeCount').textContent=isRu?'12':'11';
  const enTr=document.querySelector('[data-start="en-tr"] b'),trEn=document.querySelector('[data-start="tr-en"] b');
  if(enTr)enTr.textContent=isRu?'Yaz RU → TR':activeCourse==='uz'?'Yaz UZ → TR':'Yaz EN → TR';
  if(trEn)trEn.textContent=isRu?'Yaz TR → RU':activeCourse==='uz'?'Yaz TR → UZ':'Yaz TR → EN';
  const enTrOption=$('#setupMode option[value="en-tr"]'),trEnOption=$('#setupMode option[value="tr-en"]');
  if(enTrOption)enTrOption.textContent=isRu?'Yaz RU → TR':activeCourse==='uz'?'Yaz UZ → TR':'Yaz EN → TR';
  if(trEnOption)trEnOption.textContent=isRu?'Yaz TR → RU':activeCourse==='uz'?'Yaz TR → UZ':'Yaz TR → EN';
  if(isRu)renderRussianTopics();
};

const wp40RenderDashboard=renderDashboard;
renderDashboard=function(){
  wp40RenderDashboard();
  if(activeCourse==='ru'){
    const daily=dailyWordOfDay();
    if(daily){$('#dailyWordEnglish').textContent=daily.stress||daily.english;$('#dailyWordPron').textContent=`Türkçe okunuş: ${daily.reading||''}`}
    renderRussianTopics();
  }
};

const wp40OpenWord=openWord;
openWord=function(id){
  wp40OpenWord(id);
  if(activeCourse!=='ru'||!currentWord)return;
  $('#wordEnglish').textContent=currentWord.stress||currentWord.english;
  $('#wordPron').textContent=`Türkçe okunuş: ${currentWord.reading||''}`;
  const details=$('#wordDetails');if(details){
    details.insertAdjacentHTML('afterbegin',`<div class="detail-block russian-schema-detail"><h4>RUSÇA KAYIT BİLGİSİ</h4><p><b>Vurgulu Kiril:</b> ${esc(currentWord.stress||currentWord.english)}\n<b>Kelime türü:</b> ${esc(String(currentWord.type||'').replace(/^●\s*/,''))}\n<b>Konu:</b> ${esc(currentWord.topic||currentWord.group||'')}\n<b>CEFR:</b> ${esc(currentWord.level||cefr(currentWord))}</p></div>`);
  }
};

const wp40MakePool=makePool;
makePool=function(mode,range=null,source='all'){
  const topicSource=String(source||'').startsWith('topic:')?decodeURIComponent(String(source).slice(6)):'';
  let pool=wp40MakePool(mode,range,topicSource?'all':source);
  if(topicSource)pool=pool.filter(w=>w.group===topicSource);
  if(mode==='ordering')pool=pool.filter(w=>{const n=firstExample(w).split(/\s+/).filter(Boolean).length;return n>=3&&n<=12});
  return pool;
};

const wp40ChooseComprehensiveType=chooseComprehensiveType;
chooseComprehensiveType=function(w){
  const base=wp40ChooseComprehensiveType(w);
  const n=firstExample(w).split(/\s+/).filter(Boolean).length;
  if(n>=3&&n<=12&&Math.random()<.22)return'ordering';
  return base;
};

function shuffledIndices(length){
  const arr=Array.from({length},(_,i)=>i).sort(()=>Math.random()-.5);
  if(length>1&&arr.every((v,i)=>v===i))arr.push(arr.shift());
  return arr;
}
function renderOrderingBoard(){
  if(!session?.orderingTokens)return;
  const selected=new Set(session.orderingOrder||[]),answer=$('#orderingAnswer'),bank=$('#orderingBank');
  if(answer)answer.innerHTML=(session.orderingOrder||[]).map(i=>`<button type="button" data-order-remove="${i}">${esc(session.orderingTokens[i])}</button>`).join('')||'<span>Kelimeleri buraya sırala…</span>';
  if(bank)bank.innerHTML=(session.orderingShuffled||[]).filter(i=>!selected.has(i)).map(i=>`<button type="button" data-order-token="${i}">${esc(session.orderingTokens[i])}</button>`).join('');
}

const wp40RenderStudyQuestion=renderStudyQuestion;
renderStudyQuestion=function(){
  const mode=session?.questionType||session?.mode;
  if(mode!=='ordering')return wp40RenderStudyQuestion();
  const w=session.current,sentence=firstExample(w),tokens=sentence.split(/\s+/).filter(Boolean);
  session.orderingAnswer=sentence;session.orderingTokens=tokens;session.orderingOrder=[];session.orderingShuffled=shuffledIndices(tokens.length);
  $('#studyModeName').textContent=session.quizStyle==='speed'?'Cümle Sıralama · Hız':'Cümle Sıralama';
  $('#studySpeak').hidden=true;$('#studyBadge').textContent='CÜMLE SIRALA';
  $('#studyQuestion').textContent=firstLine(w.translation)||'Cümleyi doğru sıraya koy';
  $('#studyPron').textContent=`Kelimelere dokunarak ${COURSES[activeCourse].name} cümlesini oluştur.`;
  $('#studyContent').innerHTML=`<form id="orderingForm" class="ordering-game"><div id="orderingAnswer" class="ordering-answer"></div><div id="orderingBank" class="ordering-bank"></div><button class="primary" type="submit">Kontrol et</button></form>`;
  renderOrderingBoard();
};

const wp40ResetCurrentQuestionForRetry=resetCurrentQuestionForRetry;
resetCurrentQuestionForRetry=function(){
  wp40ResetCurrentQuestionForRetry();
  if((session?.questionType||session?.mode)==='ordering')renderStudyQuestion();
};

const wp40HintTarget=hintTarget;
hintTarget=function(){return(session?.questionType||session?.mode)==='ordering'?clean(session?.orderingAnswer||firstExample(session?.current)):wp40HintTarget()};

const wp40ShowAnswerForCurrent=showAnswerForCurrent;
showAnswerForCurrent=function(){
  if((session?.questionType||session?.mode)!=='ordering')return wp40ShowAnswerForCurrent();
  const w=session?.current;if(!w||session.answered)return;
  stopQuestionTimer();session.combo=0;session.answered=true;session.currentAttempts=3;recordAnswer(w,false);session.done.add(w.id);session.queue.push({word:w,due:session.index+4});if(session.total<300)session.total++;
  const box=document.createElement('div');box.className='answer-reveal';box.innerHTML=`<b>Doğru cümle</b>${esc(firstExample(w))}`;$('#studyContent').appendChild(box);revealStudyInfo();
  $('#studyFeedback').className='feedback bad';$('#studyFeedback').textContent='Cevap gösterildi. Cümle tekrar listene eklendi.';adjustPoints(-30);$('#nextQuestion').hidden=false;$('#showHint').disabled=true;$('#showAnswer').disabled=true;updateStudyScore();saveSession();
};

function academyStats(){
  const answers=Number(state?.stats?.academyAnswers)||0,correct=Number(state?.stats?.academyCorrect)||0;
  return {answers,correct,accuracy:answers?Math.round(correct/answers*100):0};
}
function renderAcademyStats(){
  const s=academyStats();if($('#academyAnswers'))$('#academyAnswers').textContent=s.answers;if($('#academyAccuracy'))$('#academyAccuracy').textContent=s.answers?`%${s.accuracy}`:'—';
}
function recordAcademyAnswer(correct){
  state.stats.academyAnswers=(Number(state.stats.academyAnswers)||0)+1;if(correct)state.stats.academyCorrect=(Number(state.stats.academyCorrect)||0)+1;
  const activeSession=session;session=null;adjustPoints(correct?8:-2);session=activeSession;renderAcademyStats();renderXp();
}
function renderAlphabetAcademy(shuffle=false){
  const grid=$('#alphabetGrid');if(!grid)return;
  renderAcademyStats();
  const letters=shuffle?[...russianAlphabet].sort(()=>Math.random()-.5):russianAlphabet;
  grid.innerHTML=letters.map(letter=>`<article class="alphabet-card"><button type="button" class="alphabet-sound" data-letter-speak="${letter.order}" title="Dinle">🔊</button><div class="alphabet-glyph"><b>${esc(letter.upper)}</b><span>${esc(letter.lower)}</span></div><div class="alphabet-copy"><h3>${esc(letter.name)} <small>/${esc(letter.sound)}/</small></h3><p>${esc(letter.explanation)}</p><div class="alphabet-example"><b>${esc(letter.example)}</b><span>${esc(letter.example_reading)}</span></div>${letter.confusable?`<em>⚠ ${esc(letter.confusable)}</em>`:''}</div></article>`).join('');
}
function randomLetters(count,excludeOrder=null){
  return [...russianAlphabet].filter(x=>x.order!==excludeOrder).sort(()=>Math.random()-.5).slice(0,count);
}
function startAcademyListen(){
  const target=russianAlphabet[Math.floor(Math.random()*russianAlphabet.length)],options=[target,...randomLetters(3,target.order)].sort(()=>Math.random()-.5);academyGame={type:'listen',target};
  const panel=$('#academyGamePanel');panel.hidden=false;panel.innerHTML=`<div class="academy-game-head"><div><p class="eyebrow">DİNLE VE SEÇ</p><h2>Duyduğun harf hangisi?</h2></div><button type="button" class="academy-listen-button" data-academy-replay>🔊 Tekrar dinle</button></div><div class="academy-choice-grid">${options.map(x=>`<button type="button" data-academy-choice="${x.order}"><b>${esc(x.upper)}</b><span>${esc(x.lower)}</span></button>`).join('')}</div><p id="academyGameFeedback" class="academy-game-feedback"></p>`;
  panel.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>speak(target.upper,'ru-RU'),180);
}
function startAcademyMatch(){
  const batch=[...russianAlphabet].sort(()=>Math.random()-.5).slice(0,6),left=[...batch].sort(()=>Math.random()-.5),right=[...batch].sort(()=>Math.random()-.5);academyGame={type:'match',batch,left:null,right:null,matched:new Set()};
  const panel=$('#academyGamePanel');panel.hidden=false;panel.innerHTML=`<div class="academy-game-head"><div><p class="eyebrow">KİRİL → OKUNUŞ</p><h2>Harfleri sesleriyle eşleştir</h2></div><button type="button" class="soft" data-academy-game="match">Yeni tur</button></div><div class="academy-match-board"><div>${left.map(x=>`<button type="button" data-academy-match-side="left" data-academy-match-id="${x.order}">${esc(x.upper)} ${esc(x.lower)}</button>`).join('')}</div><div>${right.map(x=>`<button type="button" data-academy-match-side="right" data-academy-match-id="${x.order}">/${esc(x.sound)}/ · ${esc(x.name)}</button>`).join('')}</div></div><p id="academyGameFeedback" class="academy-game-feedback">Bir harf ve bir okunuş seç.</p>`;
  panel.scrollIntoView({behavior:'smooth',block:'center'});
}
function handleAcademyMatch(btn){
  if(!academyGame||academyGame.type!=='match'||btn.disabled)return;const side=btn.dataset.academyMatchSide;
  document.querySelectorAll(`[data-academy-match-side="${side}"]`).forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');academyGame[side]=btn;
  if(!academyGame.left||!academyGame.right)return;
  const correct=academyGame.left.dataset.academyMatchId===academyGame.right.dataset.academyMatchId,feedback=$('#academyGameFeedback');recordAcademyAnswer(correct);
  if(correct){[academyGame.left,academyGame.right].forEach(x=>{x.classList.remove('selected');x.classList.add('matched');x.disabled=true});academyGame.matched.add(academyGame.left.dataset.academyMatchId);feedback.textContent='Doğru eşleştirme ✓ +8 PP';feedback.className='academy-game-feedback good';if(academyGame.matched.size===academyGame.batch.length)setTimeout(startAcademyMatch,800)}
  else{[academyGame.left,academyGame.right].forEach(x=>x.classList.add('wrong'));feedback.textContent='Bu eşleşme doğru değil. Tekrar dene.';feedback.className='academy-game-feedback bad';setTimeout(()=>document.querySelectorAll('.academy-match-board .wrong').forEach(x=>x.classList.remove('wrong')),450)}
  academyGame.left=null;academyGame.right=null;
}

const wp40Nav=nav;
nav=function(name){wp40Nav(name);if(name==='kiril-academy'){loadRussianAlphabet().then(()=>renderAlphabetAcademy()).catch(()=>toast('Kiril alfabesi yüklenemedi.'))}};

function setupV41Events(){
  document.addEventListener('click',e=>{
    const topic=e.target.closest('[data-russian-topic]');if(topic){const value=topic.dataset.russianTopic;nav('library');$('#groupFilter').value=value;renderWords(true);return}
    const topicStudy=e.target.closest('[data-topic-study]');if(topicStudy){startStudy('smart',null,null,`topic:${encodeURIComponent(topicStudy.dataset.topicStudy)}`,false);return}
    const letter=e.target.closest('[data-letter-speak]');if(letter){const item=russianAlphabet.find(x=>x.order===Number(letter.dataset.letterSpeak));if(item)speak(`${item.upper}. ${item.example}`,'ru-RU');return}
    const game=e.target.closest('[data-academy-game]');if(game&&['listen','match'].includes(game.dataset.academyGame)){game.dataset.academyGame==='listen'?startAcademyListen():startAcademyMatch();return}
    if(e.target.closest('[data-academy-replay]')){if(academyGame?.target)speak(academyGame.target.upper,'ru-RU');return}
    const choice=e.target.closest('[data-academy-choice]');if(choice&&academyGame?.type==='listen'){
      const correct=Number(choice.dataset.academyChoice)===academyGame.target.order,feedback=$('#academyGameFeedback');recordAcademyAnswer(correct);
      if(correct){choice.classList.add('correct');document.querySelectorAll('[data-academy-choice]').forEach(x=>x.disabled=true);feedback.textContent=`Doğru: ${academyGame.target.upper} ${academyGame.target.lower} · /${academyGame.target.sound}/ · +8 PP`;feedback.className='academy-game-feedback good';setTimeout(startAcademyListen,850)}
      else{choice.classList.add('wrong');choice.disabled=true;feedback.textContent='Tekrar dinle ve başka bir harf seç.';feedback.className='academy-game-feedback bad'}return;}
    const match=e.target.closest('[data-academy-match-side]');if(match){handleAcademyMatch(match);return}
    const token=e.target.closest('[data-order-token]');if(token&&session){session.orderingOrder.push(Number(token.dataset.orderToken));renderOrderingBoard();return}
    const remove=e.target.closest('[data-order-remove]');if(remove&&session){const id=Number(remove.dataset.orderRemove),pos=session.orderingOrder.lastIndexOf(id);if(pos>=0)session.orderingOrder.splice(pos,1);renderOrderingBoard();return}
  });
  $('#academyShuffle')?.addEventListener('click',()=>renderAlphabetAcademy(true));
  document.addEventListener('submit',e=>{if(e.target.id==='orderingForm'){e.preventDefault();const built=(session.orderingOrder||[]).map(i=>session.orderingTokens[i]).join(' ');answer(normalizeAnswer(built)===normalizeAnswer(session.orderingAnswer));return}});
}


async function initV40(){
  load();try{await loadCourseWords(activeCourse)}catch{document.body.innerHTML='<main><div class="panel"><h2>Veri yüklenemedi</h2><p>Bağlantıyı kontrol edip sayfayı yenileyin.</p></div></main>';return}
  setupEvents();setupV40Events();setupV41Events();setupV42Events();setupV43Events();updateCourseUI();renderAll();renderWords(true);registerServiceWorker();initFirebase();$('#installBtn').hidden=isStandalone();updateSelectedControls();
  const hasSaved=!!localStorage.getItem(SESSION_KEY);if(hasSaved&&confirm('Kaydedilmiş bir quiz oturumun var. Devam etmek ister misin?'))restoreSavedSession();else if(profile.email==='guest@local'&&!localStorage.getItem(GUEST_ACK_KEY))setTimeout(()=>{if(!authUser&&!$('#profileDialog').open)openProfile()},1200);
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
  registerServiceWorker();
  initFirebase();
  $('#installBtn').hidden=isStandalone();updateSelectedControls();
  const hasSaved=!!localStorage.getItem(SESSION_KEY);
  if(hasSaved&&confirm('Kaydedilmiş bir quiz oturumun var. Devam etmek ister misin?'))restoreSavedSession();
  else if(profile.email==='guest@local'&&!localStorage.getItem(GUEST_ACK_KEY))setTimeout(()=>{if(!authUser&&!$('#profileDialog').open)openProfile()},1200);
}
