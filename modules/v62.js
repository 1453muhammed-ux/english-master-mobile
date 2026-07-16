/* WordPilot v6.4.0 — SM-2 learning engine, personal daily plan and course-tabbed leagues. */
const WP62_VERSION='6.4.0';
const WP62_STORE_KEY='wordpilot_v62';
const WP62_LEAGUE_KEY=`${STORE}:league_course`;
let wp62LeagueCourse=COURSES[localStorage.getItem(WP62_LEAGUE_KEY)]?localStorage.getItem(WP62_LEAGUE_KEY):activeCourse;

function wp62Root(st=state){
  st.stats=st.stats||{};
  const root=st.stats[WP62_STORE_KEY]||(st.stats[WP62_STORE_KEY]={});
  root.sm2=root.sm2&&typeof root.sm2==='object'?root.sm2:{};
  root.reviewsByDay=root.reviewsByDay&&typeof root.reviewsByDay==='object'?root.reviewsByDay:{};
  root.integrity=root.integrity&&typeof root.integrity==='object'?root.integrity:{rapid:0,lastAwardAt:0,awards:[]};
  return root;
}
function wp62LegacyInterval(h={}){const values=[1,1,3,7,14,30,60];return values[Math.min(6,Math.max(0,Number(h.level)||0))]}
function wp62Sm2Record(id,st=state){
  const root=wp62Root(st),key=String(Number(id));
  if(!root.sm2[key]){
    const h=st.history?.[key]||st.history?.[Number(id)]||{},last=h.last?new Date(h.last).getTime():0,interval=wp62LegacyInterval(h);
    root.sm2[key]={ease:2.5,intervalDays:Math.max(1,interval),repetitions:Math.max(0,Number(h.level)||0),dueAt:last?new Date(last+interval*864e5).toISOString():null,lastReviewed:h.last||null,lastQuality:null,lapses:Number(h.wrong)||0};
  }
  return root.sm2[key];
}
function wp62Quality(correct){
  if(!correct)return (Number(session?.currentAttempts)||0)>=3?0:1;
  const attempts=Number(session?.currentAttempts)||0;
  if(attempts<=0&&!(session?.hintRevealCount>0))return 5;
  if(attempts<=1)return 4;
  return 3;
}
function wp62WasDue(id){
  const rec=wp62Root().sm2?.[String(Number(id))],h=state.history?.[id];
  return !!h?.needsReview||!!(rec?.dueAt&&new Date(rec.dueAt).getTime()<=Date.now());
}
function wp62UpdateSm2(word,correct){
  const rec=wp62Sm2Record(word.id),quality=wp62Quality(correct),wasDue=wp62WasDue(word.id),now=Date.now();
  let ease=Number(rec.ease)||2.5,reps=Number(rec.repetitions)||0,interval=Math.max(1,Number(rec.intervalDays)||1);
  ease=Math.max(1.3,ease+(0.1-(5-quality)*(0.08+(5-quality)*0.02)));
  if(quality<3){reps=0;interval=1;rec.lapses=(Number(rec.lapses)||0)+1}
  else{reps+=1;interval=reps===1?1:reps===2?6:Math.max(1,Math.round(interval*ease))}
  Object.assign(rec,{ease:Number(ease.toFixed(2)),intervalDays:interval,repetitions:reps,dueAt:new Date(now+interval*864e5).toISOString(),lastReviewed:new Date(now).toISOString(),lastQuality:quality});
  const h=state.history?.[word.id];if(h)h.needsReview=quality<3;
  if(wasDue){const day=todayKey(),root=wp62Root();root.reviewsByDay[day]=(Number(root.reviewsByDay[day])||0)+1}
}
function wp62DueIds(){
  const now=Date.now(),out=[];
  Object.entries(state.history||{}).forEach(([id,h])=>{
    if(statusOf(+id)==='memorized'||flagOf(+id,'ignored'))return;
    const rec=wp62Sm2Record(id),due=rec.dueAt?new Date(rec.dueAt).getTime():0;
    if(h?.needsReview||!due||due<=now)out.push(Number(id));
  });
  return [...new Set(out)];
}
function wp62DueSummary(){
  const now=Date.now(),tomorrow=now+864e5,week=now+7*864e5;let due=0,tom=0,later=0;
  Object.entries(wp62Root().sm2).forEach(([id,rec])=>{if(statusOf(+id)==='memorized'||flagOf(+id,'ignored')||!rec?.dueAt)return;const at=new Date(rec.dueAt).getTime();if(at<=now)due++;else if(at<=tomorrow)tom++;else if(at<=week)later++});
  const reviewed=new Set(Object.keys(wp62Root().sm2).map(Number));return {due,tomorrow:tom,later,newCount:Math.max(0,words.filter(w=>!reviewed.has(w.id)&&!flagOf(w.id,'ignored')).length)};
}
function wp62WeakTopic(){
  const map=new Map();words.forEach(w=>{const h=state.history?.[w.id];if(!h)return;const topic=w.topic||w.group||cefr(w)||'Genel',row=map.get(topic)||{topic,wrong:0,right:0};row.wrong+=Number(h.wrong)||0;row.right+=Number(h.right)||0;map.set(topic,row)});
  return [...map.values()].filter(x=>x.wrong+x.right>=2).sort((a,b)=>(b.wrong/(b.wrong+b.right))-(a.wrong/(a.wrong+a.right))||b.wrong-a.wrong)[0]||null;
}
function wp62AdaptivePriority(word){
  if(flagOf(word.id,'ignored'))return-9999;
  const h=state.history?.[word.id]||{},rec=wp62Root().sm2?.[String(word.id)],due=rec?.dueAt?new Date(rec.dueAt).getTime():0,overdueDays=due?Math.max(0,(Date.now()-due)/864e5):0;
  let score=0;if(h.needsReview)score+=120;if(due&&due<=Date.now())score+=100+Math.min(80,overdueDays*8);if(!h.last)score+=24;score+=(Number(h.wrong)||0)*20;score-=Math.min(45,(Number(h.right)||0)*3);if(statusOf(word.id)==='hard')score+=30;if(flagOf(word.id,'veryHard'))score+=40;if(statusOf(word.id)==='memorized')score-=140;return score;
}
function wp62AdaptiveWords(limit=20){return words.filter(w=>!flagOf(w.id,'ignored')).map(w=>({word:w,score:wp62AdaptivePriority(w)})).sort((a,b)=>b.score-a.score||a.word.id-b.word.id).slice(0,limit)}
function wp62AcademyDoneToday(){
  if(typeof wp61ProgressFor!=='function'||!wp60Data)return 0;const day=todayKey();let count=0;
  ['en','ru'].forEach(course=>Object.values(wp61ProgressFor(course).lessons||{}).forEach(rec=>{if(rec?.completed&&rec?.at&&dateKey(new Date(rec.at))===day)count++}));return count;
}
function wp62PronDoneToday(){const list=state.stats?.v5?.pronunciation||[],day=todayKey();return list.filter(x=>x?.at&&dateKey(new Date(x.at))===day).length}
function wp62TaskDefinitions(){
  const bucket=state.stats.days?.[todayKey()]||{},reviews=Number(wp62Root().reviewsByDay[todayKey()])||0;
  return [
    {id:'answer10',icon:'✓',title:'10 soru çöz',value:Number(bucket.answers)||0,target:10,reward:40,action:'games'},
    {id:'sm2review5',icon:'↻',title:'5 zamanı gelen tekrarı tamamla',value:reviews,target:5,reward:50,action:'adaptive'},
    {id:'academy1',icon:'🎓',title:'1 Akademi dersi bitir',value:wp62AcademyDoneToday(),target:1,reward:50,action:'academy'},
    {id:'pron1',icon:'🎙',title:'1 telaffuz çalışması yap',value:wp62PronDoneToday(),target:1,reward:40,action:'pronunciation'}
  ];
}
function wp62RenderDailyTasks(){
  const list=$('#dailyTaskList');if(!list)return;const claims=state.stats.taskClaims?.[todayKey()]||{},tasks=taskDefinitions(),done=tasks.filter(t=>claims[t.id]).length;if($('#dailyTaskDone'))$('#dailyTaskDone').textContent=`${done} / ${tasks.length}`;
  list.innerHTML=tasks.map(t=>{const complete=!!claims[t.id],pct=Math.min(100,Math.round(t.value/t.target*100));return `<button type="button" class="daily-task ${complete?'complete':''} actionable" data-wp62-task="${esc(t.action||'games')}"><span>${complete?'✓':t.icon}</span><div><b>${esc(t.title)}</b><small>${Math.min(t.value,t.target)} / ${t.target} · +${t.reward} XP</small><i style="width:${pct}%"></i></div>${!complete?'<em>→</em>':''}</button>`}).join('');
}
function wp62RenderCoach(){
  const root=document.querySelector('[data-dashboard-panel="academy"]');if(!root)return;let box=$('#wp62Coach'),anchor=$('#wp61DashboardContinue')||root.querySelector('.academy-dashboard-progress');if(!box){anchor?.insertAdjacentHTML('afterend','<section id="wp62Coach" class="wp62-coach"></section>');box=$('#wp62Coach')}else if(anchor&&box.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',box);if(!box)return;
  const s=wp62DueSummary(),weak=wp62WeakTopic(),reviewed=Number(wp62Root().reviewsByDay[todayKey()])||0;
  box.innerHTML=`<div class="wp62-coach-head"><div><p class="eyebrow">AKILLI ÖĞRENME MOTORU</p><h3>Bugünkü kişisel planın</h3><p>SM-2 aralıklı tekrar; cevap kaliten, hataların ve tekrar tarihlerine göre planlanır.</p></div><span>SM-2 AKTİF</span></div><div class="wp62-coach-grid"><article><small>ŞİMDİ TEKRARLA</small><b>${s.due}</b><em>kayıt</em></article><article><small>BUGÜN TAMAMLANDI</small><b>${reviewed}</b><em>tekrar</em></article><article><small>YARIN</small><b>${s.tomorrow}</b><em>kayıt</em></article><article><small>ÖNCELİKLİ KONU</small><b>${esc(weak?.topic||'İlk çalışmanı başlat')}</b><em>${weak?`${weak.wrong} hata`:'veri bekleniyor'}</em></article></div><div class="wp62-coach-actions"><button class="primary" type="button" data-wp62-start-plan>Akıllı planı başlat →</button><button class="soft" type="button" data-v5-open="adaptive">Planı incele</button></div>`;
}
function wp62LeagueMeta(){return COURSES[wp62LeagueCourse]||COURSES.en}
function wp62CoursePoint(row,period=leaderboardPeriod){const field=period==='daily'?'dailyPoints':period==='weekly'?'weeklyPoints':period==='monthly'?'monthlyPoints':'points',has=!!(row?.coursePoints&&Object.prototype.hasOwnProperty.call(row.coursePoints,wp62LeagueCourse));return Math.max(0,Math.round(Number(has?row.coursePoints[wp62LeagueCourse]?.[field]:row?.[field])||0))}
function wp62RenderLeagueTabs(){
  const panel=document.querySelector('.league-page-panel');if(!panel)return;let tabs=$('#wp62LeagueTabs');if(!tabs){panel.querySelector('.leaderboard-head')?.insertAdjacentHTML('afterend','<div id="wp62LeagueTabs" class="wp62-league-tabs" role="tablist" aria-label="Lig dili"></div>');tabs=$('#wp62LeagueTabs')}
  tabs.innerHTML=COURSE_IDS.map(id=>`<button type="button" role="tab" aria-selected="${id===wp62LeagueCourse}" class="${id===wp62LeagueCourse?'active':''}" data-wp62-league-course="${id}"><span>${COURSES[id].flag}</span>${COURSES[id].name}</button>`).join('');
}
function wp62RenderLeagueHeader(){const meta=wp62LeagueMeta();if($('#leagueCourseEyebrow'))$('#leagueCourseEyebrow').textContent=`${meta.name.toLocaleUpperCase('tr-TR')} LİGİ`;if($('#leagueCourseTitle'))$('#leagueCourseTitle').textContent=`${meta.name} kursunda kim önde?`;if($('#leaderboardScope'))$('#leaderboardScope').textContent=`${meta.flag} ${meta.name}`;wp62RenderLeagueTabs()}
function wp62RenderLeagueSummary(board,currentKey){
  const rows=board||[],index=rows.findIndex(x=>(x.uid&&x.uid===currentKey)||(!x.uid&&String(x.email||'').toLowerCase()===String(currentKey||'').toLowerCase())),current=index>=0?rows[index]:null,st=courseStatesFor()[wp62LeagueCourse],own=current?leagueScore(current):Math.round(periodTotalsForState(st,leaderboardPeriod).points||0);
  if($('#leagueUserPoints'))$('#leagueUserPoints').textContent=own;if($('#leagueUserRank'))$('#leagueUserRank').textContent=index>=0?`#${index+1}`:'—';if($('#leagueUserCount'))$('#leagueUserCount').textContent=rows.length;
  if($('#leagueLoginNote')){$('#leagueLoginNote').hidden=!!authUser;$('#leagueLoginNote').textContent=leaderboardAudience==='friends'?'Arkadaş ligi ve arkadaş kodu için Google hesabınla giriş yap.':'Ortak ligde görünmek için Google hesabınla giriş yap. Misafir XP’i yalnızca bu cihazda kalır.'}
  if($('#leaguePeriodText'))$('#leaguePeriodText').textContent=`${leagueLabel()} sıralama`;$$('[data-league-period]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leaguePeriod===leaderboardPeriod));$$('[data-league-audience]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leagueAudience===leaderboardAudience));renderFriendPanel(rows);
}
function wp62RenderLeaderboardRows(board,currentKey){
  const list=$('#leaderboardList');if(!list)return;const rows=(board||[]).slice().sort((a,b)=>leagueScore(b)-leagueScore(a)||String(a.name||'').localeCompare(String(b.name||''),'tr')).slice(0,100);renderLeagueSummary(rows,currentKey);
  list.innerHTML=rows.map((x,i)=>{const isCurrent=(x.uid&&x.uid===currentKey)||(!x.uid&&String(x.email||'').toLowerCase()===String(currentKey||'').toLowerCase()),medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'',legacy=!(x?.coursePoints&&Object.prototype.hasOwnProperty.call(x.coursePoints,wp62LeagueCourse)),accuracy=Number(x.coursePoints?.[wp62LeagueCourse]?.accuracy??x.accuracy)||0,detail=isCurrent?`Sen${legacy?' · Eski toplam XP':''}`:`${wp62LeagueMeta().short} ligi · ${legacy?'Eski toplam XP':`%${accuracy} doğruluk`}`;return `<div class="leaderboard-row ${isCurrent?'current':''} ${i<3?'top-rank':''} ${legacy?'legacy-score':''}"><span class="rank">${medal||i+1}</span>${leaderAvatar(x)}<div><b>${esc(x.name||'Öğrenci')}</b><small>${esc(detail)}</small></div><strong>${leagueScore(x)}<small>XP</small></strong></div>`}).join('')||`<div class="wp62-empty-league"><span>✈️</span><b>${wp62LeagueMeta().name} liginde ilk uçuşunu başlat</b><p>10 soru çözerek ilk XP kaydını oluştur.</p><button type="button" class="primary" data-wp62-league-start>Çalışmaya başla</button></div>`;
}
async function wp62RefreshCloudLeaderboard(force=false){
  if(!authUser||!fbDb)return;const course=wp62LeagueCourse,cacheKey=`${course}:${leaderboardAudience}:${leaderboardPeriod}`;
  if(leaderboardAudience==='world'){
    if(!force&&leaderboardUnsubscribe&&leaderboardRealtimeKey===cacheKey)return;stopLeaderboardRealtime();leaderboardRealtimeKey=cacheKey;
    const query=fbDb.collection('leaderboard').orderBy(legacyLeagueField(),'desc').limit(250);
    leaderboardUnsubscribe=query.onSnapshot({includeMetadataChanges:true},snap=>{const rows=mergeOwnLeaderboardRow(snap.docs.map(doc=>({uid:doc.id,...doc.data()})));cloudLeaderboardCache[cacheKey]=rows;setLeagueSyncStatus(snap.metadata.hasPendingWrites?'XP eşitleniyor…':snap.metadata.fromCache?'Çevrimdışı liste':'Canlı güncel ✓',snap.metadata.hasPendingWrites?'syncing':snap.metadata.fromCache?'idle':'ok');if($('#view-league')?.classList.contains('active')&&course===wp62LeagueCourse)renderLeaderboardRows(rows,authUser.uid)},error=>{console.error('Leaderboard realtime error',error);setLeagueSyncStatus('Lig bağlantısı kurulamadı','error')});return;
  }
  stopLeaderboardRealtime();if(leaderboardFetch)return leaderboardFetch;
  leaderboardFetch=(async()=>{try{const codes=friendCodes(),queries=codes.map(code=>fbDb.collection('leaderboard').where('friendCode','==',code).limit(1).get()),ownPromise=fbDb.collection('leaderboard').doc(authUser.uid).get(),results=await Promise.all([...queries,ownPromise]);let rows=[];results.slice(0,-1).forEach(s=>s.docs.forEach(doc=>rows.push({uid:doc.id,...doc.data()})));const own=results.at(-1);if(own.exists)rows.push({uid:own.id,...own.data()});rows=mergeOwnLeaderboardRow([...new Map(rows.map(row=>[row.uid,row])).values()]);cloudLeaderboardCache[cacheKey]=rows;if(course===wp62LeagueCourse)renderLeaderboardRows(rows,authUser.uid)}catch(error){console.error('Leaderboard error',error)}finally{leaderboardFetch=null}})();return leaderboardFetch;
}
function wp62RenderLeaderboard(){
  wp62RenderLeagueHeader();const scope=$('#leaderboardScope'),cacheKey=`${wp62LeagueCourse}:${leaderboardAudience}:${leaderboardPeriod}`;
  if(authUser&&fbDb){if(scope)scope.textContent=leaderboardAudience==='friends'?'Arkadaşların':`${wp62LeagueMeta().flag} ${wp62LeagueMeta().name}`;const cached=mergeOwnLeaderboardRow(cloudLeaderboardCache[cacheKey]||[]);if(cached.length)renderLeaderboardRows(cached,authUser.uid);else if($('#leaderboardList')){$('#leaderboardList').innerHTML='<p class="muted">XP listesi yükleniyor…</p>';renderLeagueSummary([currentLeaderboardRow()].filter(Boolean),authUser.uid)}refreshCloudLeaderboard();return}
  if(scope)scope.textContent=leaderboardAudience==='friends'?'Google girişi gerekli':'Bu cihazdaki profiller';let board=[];try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}updateLeaderboardEntry();try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}if(leaderboardAudience==='friends')board=[];renderLeaderboardRows(board,(profile?.email||'guest@local').toLowerCase());
}
function wp62IntegrityScore(base){
  const root=wp62Root().integrity,now=Date.now(),elapsed=Math.max(0,(now-(session?.questionStartedAt||now))/1000);root.awards=(root.awards||[]).filter(x=>now-x<60000);
  if(elapsed<0.65||root.awards.length>=45){root.rapid=(Number(root.rapid)||0)+1;setTimeout(()=>toast('Çok hızlı cevap algılandı; bu sorudan XP verilmedi.'),20);return {...base,points:0,integrityBlocked:true}}
  root.awards.push(now);root.lastAwardAt=now;return base;
}
function wp62UpdateRoadmap(){if(!Array.isArray(WP61_ROADMAP))return;WP61_ROADMAP.splice(0,WP61_ROADMAP.length,
  ['🧠','SM-2 akıllı tekrar','Cevap kalitesine göre kişisel tekrar tarihleri','aktif'],
  ['🏆','Dil sekmeli lig','English, Русский ve O‘zbekcha liglerine tek ekrandan geçiş','aktif'],
  ['🛡️','Sunucu doğrulamalı XP','Soru bileti, hız sınırı ve tekrar puanı denetimi','yakında'],
  ['🤝','Güvenli arkadaşlık','Karşılıklı onay, reddetme ve engelleme','yakında'],
  ['🔐','Korumalı kaynak kütüphanesi','Giriş kontrollü PDF ve çalışma dosyaları','yakında'],
  ['🇺🇿','O‘zbekçe Akademi','A1–C2 konu anlatımı ve özgün okumalar','yakında']);
}
function setupV62Events(){
  wp62UpdateRoadmap();if(typeof wp61RenderRoadmap==='function')setTimeout(wp61RenderRoadmap,0);
  const oldRecord=recordAnswer;recordAnswer=function(word,correct){oldRecord(word,correct);wp62UpdateSm2(word,correct);save()};
  reviewIds=wp62DueIds;v5AdaptivePriority=wp62AdaptivePriority;v5AdaptiveWords=wp62AdaptiveWords;taskDefinitions=wp62TaskDefinitions;renderDailyTasks=wp62RenderDailyTasks;
  const oldAdaptive=renderAdaptivePlan;renderAdaptivePlan=function(){oldAdaptive();const title=$('#adaptiveTitle'),summary=$('#adaptiveSummary');if(title)title.textContent=`${COURSES[activeCourse].name} · SM-2 kişisel plan`;if(summary){const s=wp62DueSummary();summary.textContent=`${s.due} zamanı gelen tekrar, ${s.tomorrow} yarınki kayıt ve zayıf konuların önceliklendirildi.`}document.querySelector('.adaptive-view .eyebrow')?.replaceChildren(document.createTextNode('SM-2 AKILLI TEKRAR'))};
  const oldResponse=responseScore;responseScore=function(){return wp62IntegrityScore(oldResponse())};
  const oldAdjust=adjustPoints;adjustPoints=function(delta){if(Number(delta)>0&&session?.mode==='matching'){const root=wp62Root().integrity,now=Date.now();root.matchAwards=(root.matchAwards||[]).filter(x=>now-x<60000);if(now-(Number(root.lastMatchAwardAt)||0)<180||root.matchAwards.length>=60){root.rapid=(Number(root.rapid)||0)+1;delta=0}else{root.lastMatchAwardAt=now;root.matchAwards.push(now)}}return oldAdjust(delta)};
  leagueScore=(row,period=leaderboardPeriod)=>wp62CoursePoint(row,period);leagueField=(period=leaderboardPeriod)=>`coursePoints.${wp62LeagueCourse}.${period==='daily'?'dailyPoints':period==='weekly'?'weeklyPoints':period==='monthly'?'monthlyPoints':'points'}`;leagueLabel=(period=leaderboardPeriod)=>`${wp62LeagueMeta().name} · ${period==='daily'?'Bugünkü':period==='weekly'?'Bu haftaki':period==='monthly'?'Bu ayki':'Toplam'} XP’ye göre`;
  renderLeagueSummary=wp62RenderLeagueSummary;renderLeaderboardRows=wp62RenderLeaderboardRows;refreshCloudLeaderboard=wp62RefreshCloudLeaderboard;renderLeaderboard=wp62RenderLeaderboard;
  const oldDash=renderDashboard;renderDashboard=function(){oldDash();wp62RenderCoach();wp62RenderDailyTasks()};
  const oldV60Dash=wp60RenderDashboard;wp60RenderDashboard=function(){oldV60Dash();wp62RenderCoach()};
  const oldNav=nav;nav=function(name){if(name==='league'&&wp510CurrentView?.()!=='league')wp62LeagueCourse=activeCourse;const result=oldNav(name);if(name==='league')setTimeout(()=>{wp62RenderLeagueTabs();wp62RenderLeaderboard()},0);return result};
  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-wp62-league-course]');if(tab){wp62LeagueCourse=tab.dataset.wp62LeagueCourse;localStorage.setItem(WP62_LEAGUE_KEY,wp62LeagueCourse);stopLeaderboardRealtime();wp62RenderLeaderboard();return}
    const task=event.target.closest('[data-wp62-task]');if(task){const action=task.dataset.wp62Task;if(action==='academy'){if(activeCourse==='uz'){toast('O‘zbekçe Akademi yakında.');return}wp60SetCourse(activeCourse);nav('academy');return}if(action==='games'){wp510SetDashboardTab('games',{scroll:true});return}if(action==='adaptive'){nav('adaptive');return}if(action==='pronunciation'){nav('pronunciation');return}}
    if(event.target.closest('[data-wp62-start-plan]')){startStudy('smart',null,'classic','adaptive',false);return}
    if(event.target.closest('[data-wp62-league-start]')){nav('dashboard');wp510SetDashboardTab('games',{scroll:true});return}
  });
  // İlk çizim initV40 tamamlandıktan sonra yapılır. Burada state henüz null olabilir.
}
function wp62AfterInit(){
  if(!state)return;
  wp62RenderLeagueTabs();
  wp62RenderCoach();
  wp62RenderDailyTasks();
}
