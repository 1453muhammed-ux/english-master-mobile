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
  const accent=lang||(activeCourse==='en'?(profile?.voiceAccent||'en-US'):COURSES[activeCourse].voice);
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
    const intervals=[1,1,3,7,14,30,60],interval=intervals[Math.min(6,Math.max(0,Number(h.level)||0))];
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
function renderDashboardBase(){
  normalizeDay();
  const c=counts(),st=state.stats,goal=Number(profile.goal||20);
  const pct=Math.min(100,Math.round((st.todayAnswers||0)/goal*100));
  const dashboardName=authUser?accountDisplayName(profile?.name,authUser):(profile.name||'Öğrenci');
  $('#helloName').textContent=dashboardName;
  const avatar=$('#profileBtn');if(profile.photoURL)avatar.innerHTML=`<img src="${esc(profile.photoURL)}" alt="" referrerpolicy="no-referrer">`;else avatar.textContent=(dashboardName||'M')[0].toUpperCase();
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
  $('#xpText').textContent=`${Math.round(st.points||0)} XP`;
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
  if(mode==='cloze')pool=pool.filter(exampleContainsTarget);
  if(mode==='sentence')pool=pool.filter(w=>firstExample(w).split(/\s+/).length>=4);
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
  $('#studyScore').textContent=`${Math.round(session?.score||0)} XP`;const combo=$('#studyCombo'),value=Number(session?.combo)||0;if(combo){combo.hidden=value<2;combo.textContent=`🔥 ${value} seri`;}updateAttemptDisplay();
}
function chooseComprehensiveType(w){
  const options=['smart','en-tr','tr-en','dictation'];
  if(exampleContainsTarget(w))options.push('cloze');
  if(firstExample(w).split(/\s+/).length>=4)options.push('sentence');
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
  if(mode==='tr-en'||mode==='dictation'||mode==='cloze')return clean(w.english);
  if(mode==='sentence')return clean(session.sentenceAnswer||w.english);
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
  const input=$('#writeAnswer')||$('#dictationAnswer');
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
  if(session.autoSpeak&&(session.questionType==='dictation'||(!['tr-en','cloze','sentence','ordering'].includes(session.questionType)&&!session.hiddenMode))){
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
  $('#studySpeak').hidden=['tr-en','cloze','sentence','ordering'].includes(mode);
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

  if(mode==='dictation'){
    $('#studyBadge').textContent='DİKTE';
    $('#studyQuestion').textContent='Dinlediğin kelimeyi yaz';
    $('#studyPron').innerHTML='<div class="listening-prompt"><button type="button" data-listen-again>🔊</button><span class="voice-note">Sesi tekrar dinleyebilirsin</span></div>';
    $('#studyContent').innerHTML=`<form class="answer-input" id="dictationForm"><input id="dictationAnswer" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="Duyduğun kelimeyi yaz…"><button class="primary">Kontrol et</button></form>`;
    setTimeout(()=>$('#dictationAnswer')?.focus(),80);return;
  }
  if(mode==='cloze'){
    const sentence=firstExample(w),blank=blankTarget(sentence,w.english),opts=choiceOptions(w,false);
    $('#studyBadge').textContent='BOŞLUK DOLDUR';$('#studyQuestion').textContent=blank;$('#studyPron').textContent=w.translation?firstLine(w.translation):'Doğru kelimeyi seç';
    $('#studyContent').innerHTML=`<div class="choice-grid">${opts.map(o=>`<button class="choice" data-answer-id="${o.id}">${esc(displayClean(o.text))}</button>`).join('')}</div>`;return;
  }
  if(mode==='sentence'){
    const parts=sentenceQuestion(w);session.sentenceAnswer=parts.answer;
    $('#studyBadge').textContent='CÜMLE TAMAMLA';$('#studyQuestion').textContent=parts.prompt;$('#studyPron').textContent=w.translation?firstLine(w.translation):'Doğru devamı seç';
    $('#studyContent').innerHTML=`<div class="sentence-options">${parts.options.map((o,i)=>`<button class="choice sentence-choice" data-sentence-option="${i}" data-correct="${o===parts.answer?'1':'0'}">${esc(o)}</button>`).join('')}</div>`;return;
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
    $('#studyFeedback').className='feedback good';$('#studyFeedback').textContent=`Doğru ✓ +${gained} XP · ${scored.elapsed.toFixed(1)} sn${session.combo>=2?` · 🔥 ${session.combo} seri`:''}`;
    $('#nextQuestion').hidden=false;$('#showHint').disabled=true;$('#showAnswer').disabled=true;scheduleAutoAdvance(1500);
  }else{
    session.combo=0;session.currentAttempts=(session.currentAttempts||0)+1;recordAnswer(w,false);adjustPoints(-15);const remaining=Math.max(0,3-session.currentAttempts);
    if(session.currentAttempts<3){$('#studyFeedback').className='feedback bad';$('#studyFeedback').textContent=timeout?`Süre doldu. -15 XP · ${remaining} hakkın kaldı.`:`Yanlış. -15 XP · ${remaining} hakkın kaldı.`;resetCurrentQuestionForRetry()}
    else{session.answered=true;session.done.add(w.id);session.queue.push({word:w,due:session.index+4});if(session.total<300)session.total++;markFinalCorrectChoice();revealStudyInfo();$('#studyFeedback').className='feedback bad';$('#studyFeedback').textContent=`3 hak bitti. Doğru cevap: ${w.english} — ${firstMeaning(w)}.`;$('#nextQuestion').hidden=false;$('#showHint').disabled=true;$('#showAnswer').disabled=true}
  }
  updateStudyScore();renderDashboard();saveSession();save();
}
function finishSession(){
  stopQuestionTimer();clearSavedSession();
  if(session&&!session.completed){session.completed=true;state.stats.sessions=(Number(state.stats.sessions)||0)+1;ensureDayBucket().sessions++;save()}
  const score=session?Math.round(session.correct/Math.max(1,session.index)*100):0;$('#studyBadge').textContent='OTURUM TAMAMLANDI';$('#studyQuestion').textContent=`%${score} başarı`;
  $('#studyPron').textContent=`${session.correct} doğru · ${session.index-session.correct} yanlış · ${Math.round(session.score||0)} XP · en iyi seri ${session.maxCombo||0}`;
  $('#studyContent').innerHTML=`<div class="flash-card-inner"><h3>Uçuş tamamlandı ✈</h3><p class="muted">XP’in ve ilerlemen kaydedildi. Yanlışların tekrar listene eklendi.</p><button class="primary wide" data-nav="dashboard">Ana sayfaya dön</button></div>`;
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
  $('#studyContent').innerHTML=`<div class="matching-title"><span>${esc(COURSES[activeCourse].targetLabel)}</span><span>TÜRKÇE</span></div>
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


