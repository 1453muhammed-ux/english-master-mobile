
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORE='wordpilot_v31';
const STATUS_LABEL={learn:'Öğreniyorum',memorized:'Ezberledim',hard:'Zorlanıyorum'};
const MODE_LABEL={
  smart:'Akıllı Quiz',flash:'Kelime Kartları','en-tr':'Yaz EN → TR','tr-en':'Yaz TR → EN',
  synonym:'Eş Anlamlı Quiz',antonym:'Zıt Anlamlı Quiz',review:'Akıllı Tekrar'
};
let words=[], profile=null, state=null, currentWord=null, listLimit=80, session=null, deferredPrompt=null;

function defaultState(){
  return {statuses:{},history:{},stats:{answers:0,correct:0,todayAnswers:0,todayCorrect:0,lastDay:'',streak:0,bestStreak:0},lastActive:new Date().toISOString()};
}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function clean(v=''){return String(v).replace(/[★●○]/g,'').replace(/\s+/g,' ').trim()}
function firstMeaning(w){return clean((w?.meaning||'').split('\n')[0])}
function cefr(w){return (w?.cefr||'').match(/[ABC][12]/)?.[0]||'—'}
function todayKey(){return new Date().toISOString().slice(0,10)}
function profileKey(){return `${STORE}:${(profile?.email||'guest@local').toLowerCase()}`}
function load(){
  try{profile=JSON.parse(localStorage.getItem(`${STORE}:profile`))}catch{}
  if(!profile)profile={name:'Öğrenci',email:'guest@local',goal:20};
  try{state=JSON.parse(localStorage.getItem(profileKey()))||defaultState()}catch{state=defaultState()}
  if(!state.stats)state.stats=defaultState().stats;
  if(!state.history)state.history={};
  if(!state.statuses)state.statuses={};
  normalizeDay();
}
function save(){
  state.lastActive=new Date().toISOString();
  localStorage.setItem(`${STORE}:profile`,JSON.stringify(profile));
  localStorage.setItem(profileKey(),JSON.stringify(state));
}
function normalizeDay(){
  const d=todayKey(),st=state.stats;
  if(st.lastDay&&st.lastDay!==d){
    const prev=new Date(d);prev.setDate(prev.getDate()-1);
    const yesterday=prev.toISOString().slice(0,10);
    if(st.todayAnswers>0){
      st.streak=st.lastDay===yesterday?(st.streak||0)+1:1;
      st.bestStreak=Math.max(st.bestStreak||0,st.streak);
    }else if(st.lastDay!==yesterday){st.streak=0}
    st.todayAnswers=0;st.todayCorrect=0;
  }
  st.lastDay=d;
}
function speak(text,lang='en-US'){
  if(!text||!('speechSynthesis'in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=lang;u.rate=.86;
  speechSynthesis.speak(u);
}
function toast(msg){
  const t=$('#toast');if(!t)return;
  t.textContent=msg;t.classList.add('show');
  clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2200);
}
function statusOf(id){return state.statuses[id]||''}
function setStatus(id,status){
  if(state.statuses[id]===status)delete state.statuses[id];else state.statuses[id]=status;
  save();renderAll();refreshWordStatus();
  toast(statusOf(id)?`${STATUS_LABEL[status]} olarak kaydedildi`:'İşaret kaldırıldı');
}
function counts(){
  const c={learn:0,memorized:0,hard:0};
  Object.values(state.statuses).forEach(s=>{if(c[s]!==undefined)c[s]++});
  return c;
}
function reviewIds(){
  const now=Date.now(),day=864e5;
  return Object.entries(state.history).filter(([id,h])=>{
    if(statusOf(+id)==='memorized')return false;
    const interval=Math.min(30,Math.max(1,2**(h.level||0)));
    return !h.last||now-new Date(h.last).getTime()>interval*day;
  }).map(([id])=>+id);
}
function recordAnswer(word,correct){
  normalizeDay();
  const st=state.stats;
  st.answers++;st.todayAnswers++;
  if(correct){st.correct++;st.todayCorrect++}
  const h=state.history[word.id]||{right:0,wrong:0,level:0,last:null};
  if(correct){h.right++;h.level=Math.min(6,(h.level||0)+1)}
  else{
    h.wrong++;h.level=Math.max(0,(h.level||0)-1);
    if(h.wrong>=3&&!statusOf(word.id))state.statuses[word.id]='hard';
  }
  h.last=new Date().toISOString();
  state.history[word.id]=h;
  save();
}
function nav(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
  $$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='library')renderWords(true);
  if(name==='progress')renderProgress();
}
function renderDashboard(){
  normalizeDay();
  const c=counts(),st=state.stats,goal=Number(profile.goal||20);
  const pct=Math.min(100,Math.round((st.todayAnswers||0)/goal*100));
  $('#helloName').textContent=profile.name||'Öğrenci';
  $('#profileBtn').textContent=(profile.name||'M')[0].toUpperCase();
  $('#todayText').textContent=new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  $('#countLearn').textContent=c.learn;
  $('#countMem').textContent=c.memorized;
  $('#countHard').textContent=c.hard;
  $('#countReview').textContent=reviewIds().length;
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
  $('#xpText').textContent=`${(st.correct||0)*10} XP`;
  let insight='İlk oturumunu başlat; güçlü ve zor kelimelerini analiz edelim.';
  if(c.hard)insight=`${c.hard} zor kelimen var. Akıllı tekrar bunları farklı soru biçimleriyle geri getirecek.`;
  else if(st.answers>10)insight=`Genel başarı oranın %${acc}. Doğru bildiğin kelimeler aynı oturumda tekrar edilmez.`;
  $('#insightText').textContent=insight;
}
function filteredWords(){
  const q=($('#searchInput')?.value||'').toLocaleLowerCase('tr').trim();
  const g=$('#groupFilter')?.value||'',l=$('#levelFilter')?.value||'',s=$('#statusFilter')?.value||'';
  return words.filter(w=>{
    const hay=`${w.english} ${w.meaning} ${w.example} ${w.translation}`.toLocaleLowerCase('tr');
    const st=statusOf(w.id),lv=cefr(w);
    const groupOk=!g||(g==='core5000'?w.id<=5000:w.group===g);
    const levelOk=!l||(l==='A1-A2'?['A1','A2'].includes(lv):l==='B1-B2'?['B1','B2'].includes(lv):lv===l);
    const statusOk=!s||(s==='unset'?!st:st===s);
    return(!q||hay.includes(q))&&groupOk&&levelOk&&statusOk;
  });
}
function renderWords(reset=false){
  if(reset)listLimit=80;
  const arr=filteredWords();
  $('#resultCount').textContent=arr.length;
  $('#wordList').innerHTML=arr.slice(0,listLimit).map(w=>{
    const s=statusOf(w.id);
    return `<article class="word-row">
      <span class="word-id">#${w.id}</span>
      <div class="word-main">
        <b>${esc(w.english)} <span class="word-level-badge">${cefr(w)}</span></b>
        <small>${esc(w.pronunciation||'Okunuş bilgisi yok')}</small>
      </div>
      <div class="word-meaning">${esc(firstMeaning(w))}</div>
      <span class="word-status ${s}">${s?STATUS_LABEL[s]:'İşaretsiz'}</span>
      <div class="word-actions">
        <button class="word-action" data-speak="${esc(w.english)}" title="Dinle">🔊</button>
        <button class="word-action" data-info="${w.id}" title="Bilgi">ℹ️</button>
      </div>
    </article>`;
  }).join('')||'<div class="panel">Aramana uygun kelime bulunamadı.</div>';
  $('#loadMore').hidden=arr.length<=listLimit;
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
  $('#wordDetails').innerHTML=sections.map(([h,p])=>`<div class="detail-block"><h4>${h}</h4><p>${esc(p)}</p></div>`).join('');
  refreshWordStatus();
  $('#wordDialog').showModal();
}
function refreshWordStatus(){
  if(!currentWord)return;
  $$('[data-word-status]').forEach(b=>b.classList.toggle('active',statusOf(currentWord.id)===b.dataset.wordStatus));
}
function renderProgress(){
  const c=counts(),marked=c.learn+c.memorized+c.hard,pct=words.length?Math.round(marked/words.length*100):0,st=state.stats;
  $('#masteryPercent').textContent=`${pct}%`;
  $('#masteryDonut').style.background=`conic-gradient(var(--primary) ${pct}%,#E9EDF5 ${pct}%)`;
  $('#rLearn').textContent=c.learn;$('#rMem').textContent=c.memorized;$('#rHard').textContent=c.hard;
  $('#rAnswers').textContent=st.answers||0;$('#rCorrect').textContent=st.correct||0;
  $('#rAccuracy').textContent=st.answers?`%${Math.round(st.correct/st.answers*100)}`:'—';
  $('#rBestStreak').textContent=`${st.bestStreak||0} gün`;
  const levels=['A1','A2','B1','B2','C1','C2'];
  const vals=levels.map(l=>words.filter(w=>cefr(w)===l&&statusOf(w.id)).length),max=Math.max(1,...vals);
  $('#levelDistribution').innerHTML=levels.map((l,i)=>`<div class="level-row"><b>${l}</b><div class="level-track"><div class="level-fill" style="width:${vals[i]/max*100}%"></div></div><span>${vals[i]}</span></div>`).join('');
}
function renderAll(){
  renderDashboard();
  if($('#view-library').classList.contains('active'))renderWords();
  if($('#view-progress').classList.contains('active'))renderProgress();
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
function makePool(mode,range=null){
  let pool=words.filter(w=>statusOf(w.id)!=='memorized');
  if(range)pool=pool.filter(w=>w.id>=range.start&&w.id<=range.end);
  if(mode==='review'){
    const review=new Set([...reviewIds(),...words.filter(w=>statusOf(w.id)==='hard').map(w=>w.id)]);
    pool=pool.filter(w=>review.has(w.id));
  }
  if(mode==='synonym'||mode==='antonym')pool=pool.filter(w=>hasRelation(w,mode));
  return pool.sort(()=>Math.random()-.5);
}
function startStudy(mode='smart',range=null){
  const pool=makePool(mode,range);
  if(!pool.length){toast('Bu seçimde çalışılabilir kelime bulunamadı.');return}
  const requested=range?pool.length:20,total=Math.min(requested,200);
  session={mode,pool:pool.slice(0,total),queue:[],done:new Set(),index:0,total,correct:0,current:null,answered:false,range,advanceTimer:null};
  nav('study');nextStudy();
}
function nextStudy(){
  if(!session||session.index>=session.total){finishSession();return}
  const dueIndex=session.queue.findIndex(q=>q.due<=session.index);
  let w;
  if(dueIndex>=0){w=session.queue.splice(dueIndex,1)[0].word}
  else w=session.pool.find(x=>!session.done.has(x.id));
  if(!w){finishSession();return}
  session.current=w;session.answered=false;session.index++;
  $('#studyCounter').textContent=`${session.index} / ${session.total}`;
  $('#studyProgress').max=session.total;$('#studyProgress').value=session.index;
  $('#studyFeedback').className='feedback';$('#studyFeedback').textContent='';
  $('#studyWordInfo').hidden=true;$('#studyWordInfo').innerHTML='';
  $('#nextQuestion').hidden=true;
  renderStudyQuestion();
}
function choiceOptions(correctWord,asMeaning=true){
  const wrong=words.filter(x=>x.id!==correctWord.id&&cefr(x)===cefr(correctWord))
    .sort(()=>Math.random()-.5).slice(0,3);
  return [correctWord,...wrong].sort(()=>Math.random()-.5).map(w=>({
    id:w.id,text:asMeaning?firstMeaning(w):w.english
  }));
}
function renderStudyQuestion(){
  const w=session.current,mode=session.mode==='review'?'smart':session.mode;
  $('#studyModeName').textContent=MODE_LABEL[session.mode]||'Çalışma';
  $('#studySpeak').hidden=mode==='tr-en';
  $('#studyBadge').textContent=mode==='flash'?'KELİME KARTI':mode==='synonym'?'EŞ ANLAM':mode==='antonym'?'ZIT ANLAM':'SORU';
  $('#studyPron').textContent='';
  if(mode==='flash'){
    session.answered=true;
    $('#studyQuestion').textContent=w.english;
    $('#studyPron').textContent=w.pronunciation||'';
    $('#studyContent').innerHTML=`<div class="flash-card-inner">
      <button class="flip-button" data-flip>Karşılığını göster</button>
      <div class="flash-reveal" hidden>
        <div class="flash-meaning">${esc(w.meaning||'')}</div>
        <div class="flash-actions">
          <button data-flash="hard">Zorlandım</button>
          <button data-flash="learn">Öğreniyorum</button>
          <button data-flash="memorized">Ezberledim</button>
        </div>
      </div>
    </div>`;
    return;
  }
  if(mode==='smart'){
    $('#studyQuestion').textContent=w.english;
    const opts=choiceOptions(w,true);
    $('#studyContent').innerHTML=`<div class="choice-grid">${opts.map(o=>`<button class="choice" data-answer-id="${o.id}">${esc(o.text)}</button>`).join('')}</div>`;
    return;
  }
  if(mode==='synonym'||mode==='antonym'){
    const field=mode==='synonym'?'synonyms':'opposite';
    const rel=relationCandidates(w,field)[0];
    session.relationAnswer=rel;
    $('#studyQuestion').textContent=w.english;
    $('#studyPron').innerHTML=`<span class="quiz-relation">${mode==='synonym'?'Eş anlamlısını seç':'Zıt anlamlısını seç'}</span>`;
    const opts=choiceOptions(rel,false);
    $('#studyContent').innerHTML=`<div class="choice-grid">${opts.map(o=>`<button class="choice" data-relation-id="${o.id}">${esc(o.text)}</button>`).join('')}</div>`;
    return;
  }
  const ask=mode==='en-tr'?w.english:firstMeaning(w);
  $('#studyQuestion').textContent=ask;
  $('#studyContent').innerHTML=`<form class="answer-input" id="writeForm">
    <input id="writeAnswer" autocomplete="off" placeholder="Cevabını yaz…">
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
    <div class="info-meaning">${esc(w.meaning||'')}</div>
    ${w.example?`<div class="info-example">${esc(w.example)}${w.translation?`\n${esc(w.translation)}`:''}</div>`:''}`;
}
function answer(correct){
  if(session.answered)return;
  session.answered=true;recordAnswer(session.current,correct);
  const w=session.current;
  revealStudyInfo();
  if(correct){
    session.correct++;session.done.add(w.id);
    $('#studyFeedback').className='feedback good';
    $('#studyFeedback').textContent='Doğru ✓';
    $('#nextQuestion').hidden=true;
    clearTimeout(session.advanceTimer);
    session.advanceTimer=setTimeout(()=>{if(session&&$('#view-study').classList.contains('active'))nextStudy()},900);
  }else{
    session.queue.push({word:w,due:session.index+4});
    $('#studyFeedback').className='feedback bad';
    $('#studyFeedback').textContent=`Doğru cevap: ${w.english} — ${firstMeaning(w)}.`;
    $('#nextQuestion').hidden=false;
  }
  renderDashboard();
}
function finishSession(){
  const score=session?Math.round(session.correct/Math.max(1,session.index)*100):0;
  $('#studyBadge').textContent='OTURUM TAMAMLANDI';
  $('#studyQuestion').textContent=`%${score} başarı`;
  $('#studyPron').textContent=`${session.correct} doğru · ${session.index-session.correct} yanlış`;
  $('#studyContent').innerHTML=`<div class="flash-card-inner"><h3>Uçuş tamamlandı ✈</h3><p class="muted">Doğru bildiklerin bu oturumda tekrar sorulmadı. Yanlışların tekrar listene kaydedildi.</p><button class="primary wide" data-nav="dashboard">Ana sayfaya dön</button></div>`;
  $('#studyFeedback').textContent='';$('#studyWordInfo').hidden=true;$('#nextQuestion').hidden=true;$('#studySpeak').hidden=true;
  renderAll();
}
function openStudySetup(){
  $('#setupMode').value='smart';
  document.querySelector('input[name="rangeType"][value="quick"]').checked=true;
  $('#setupRangeFields').hidden=true;
  $('#studySetupDialog').showModal();
}
function selectedRangeType(){return document.querySelector('input[name="rangeType"]:checked')?.value||'quick'}
function openProfile(){
  $('#profileName').value=profile.name||'';
  $('#profileEmail').value=profile.email==='guest@local'?'':profile.email;
  $('#dailyGoal').value=String(profile.goal||20);
  $('#profileTitle').textContent=profile.email==='guest@local'?'Profilini oluştur':profile.name;
  $('#profileAvatar').textContent=(profile.name||'M')[0].toUpperCase();
  $('#profileDialog').showModal();
}
function openCollection(type){
  nav('library');
  $('#searchInput').value='';$('#groupFilter').value='';$('#levelFilter').value='';$('#statusFilter').value='';
  if(type==='core5000')$('#groupFilter').value='core5000';
  if(type==='phrases')$('#groupFilter').value='5001-6000 Kalıplar';
  if(type==='beginner')$('#levelFilter').value='A1-A2';
  if(type==='intermediate')$('#levelFilter').value='B1-B2';
  if(type==='hard')$('#statusFilter').value='hard';
  if(type==='memorized')$('#statusFilter').value='memorized';
  renderWords(true);
}
function setupEvents(){
  document.addEventListener('click',e=>{
    const navBtn=e.target.closest('[data-nav]');if(navBtn){nav(navBtn.dataset.nav);return}
    const start=e.target.closest('[data-start]');if(start){startStudy(start.dataset.start);return}
    const collection=e.target.closest('[data-collection]');if(collection){openCollection(collection.dataset.collection);return}
    const setup=e.target.closest('[data-action="open-study-setup"]');if(setup){openStudySetup();return}
    const profileBtn=e.target.closest('[data-action="open-profile"]');if(profileBtn){openProfile();return}
    const close=e.target.closest('[data-close]');if(close){document.getElementById(close.dataset.close)?.close();return}
    const sp=e.target.closest('[data-speak]');if(sp){speak(sp.dataset.speak);return}
    const info=e.target.closest('[data-info]');if(info){openWord(info.dataset.info);return}
    const status=e.target.closest('[data-word-status]');if(status&&currentWord){setStatus(currentWord.id,status.dataset.wordStatus);return}
    const preset=e.target.closest('[data-range-preset]');
    if(preset){
      const [a,b]=preset.dataset.rangePreset.split(',');
      $('#setupStart').value=a;$('#setupEnd').value=b;
      document.querySelector('input[name="rangeType"][value="custom"]').checked=true;
      $('#setupRangeFields').hidden=false;return;
    }
    const answerBtn=e.target.closest('[data-answer-id]');
    if(answerBtn){
      const correct=Number(answerBtn.dataset.answerId)===session.current.id;
      $$('.choice').forEach(b=>{b.disabled=true;if(Number(b.dataset.answerId)===session.current.id)b.classList.add('correct')});
      if(!correct)answerBtn.classList.add('wrong');
      answer(correct);return;
    }
    const relationBtn=e.target.closest('[data-relation-id]');
    if(relationBtn){
      const correct=Number(relationBtn.dataset.relationId)===session.relationAnswer?.id;
      $$('.choice').forEach(b=>{b.disabled=true;if(Number(b.dataset.relationId)===session.relationAnswer?.id)b.classList.add('correct')});
      if(!correct)relationBtn.classList.add('wrong');
      answer(correct);return;
    }
    const flip=e.target.closest('[data-flip]');
    if(flip){flip.hidden=true;flip.parentElement.querySelector('.flash-reveal').hidden=false;return}
    const flash=e.target.closest('[data-flash]');
    if(flash){
      setStatus(session.current.id,flash.dataset.flash);
      recordAnswer(session.current,flash.dataset.flash!=='hard');
      session.done.add(session.current.id);nextStudy();return;
    }
    const f=e.target.closest('[data-filter-status]');
    if(f){nav('library');$('#statusFilter').value=f.dataset.filterStatus;renderWords(true);return}
  });
  $('#searchInput').addEventListener('input',()=>renderWords(true));
  ['groupFilter','levelFilter','statusFilter'].forEach(id=>$('#'+id).addEventListener('change',()=>renderWords(true)));
  $('#loadMore').addEventListener('click',()=>{listLimit+=80;renderWords()});
  $('#wordSpeak').addEventListener('click',()=>speak(currentWord?.english));
  $('#studySpeak').addEventListener('click',()=>speak(session?.current?.english));
  $('#studyInfo').addEventListener('click',()=>session?.current&&openWord(session.current.id));
  $('#exitStudy').addEventListener('click',()=>{
    if(confirm('Çalışma oturumundan çıkılsın mı?')){
      clearTimeout(session?.advanceTimer);nav('dashboard');
    }
  });
  $('#nextQuestion').addEventListener('click',nextStudy);
  document.addEventListener('submit',e=>{
    if(e.target.id==='writeForm'){
      e.preventDefault();
      const val=clean($('#writeAnswer').value).toLocaleLowerCase('tr');
      const w=session.current,mode=session.mode;
      const correct=mode==='en-tr'
        ?clean(w.meaning).toLocaleLowerCase('tr').split(/\n|★/).map(clean).filter(Boolean).some(x=>x===val||x.includes(val)||val.includes(x))
        :val===clean(w.english).toLocaleLowerCase('tr');
      answer(correct);
    }
    if(e.target.id==='profileForm'){
      e.preventDefault();
      const oldState=state;
      profile={name:$('#profileName').value.trim()||'Öğrenci',email:($('#profileEmail').value.trim()||'guest@local').toLowerCase(),goal:Number($('#dailyGoal').value||20)};
      try{state=JSON.parse(localStorage.getItem(profileKey()))||oldState}catch{state=oldState}
      save();$('#profileDialog').close();renderAll();toast('Profil kaydedildi');
    }
  });
  $('#resetData').addEventListener('click',()=>{
    if(confirm('Bu profildeki tüm ilerleme silinsin mi?')){
      state=defaultState();save();renderAll();$('#profileDialog').close();toast('İlerleme sıfırlandı');
    }
  });
  document.querySelectorAll('input[name="rangeType"]').forEach(r=>r.addEventListener('change',()=>{$('#setupRangeFields').hidden=selectedRangeType()!=='custom'}));
  $('#studySetupForm').addEventListener('submit',e=>{
    e.preventDefault();
    const mode=$('#setupMode').value;
    if(selectedRangeType()==='quick'){$('#studySetupDialog').close();startStudy(mode);return}
    let a=Number($('#setupStart').value),b=Number($('#setupEnd').value);
    if(!Number.isFinite(a)||!Number.isFinite(b)){toast('Başlangıç ve bitiş numarasını gir.');return}
    a=Math.max(1,Math.min(words.length,a));b=Math.max(1,Math.min(words.length,b));
    if(a>b)[a,b]=[b,a];
    $('#studySetupDialog').close();startStudy(mode,{start:a,end:b});
  });
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
  $('#installBtn').addEventListener('click',async()=>{
    if(!deferredPrompt)return;
    deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true;
  });
}
async function init(){
  load();
  try{
    const response=await fetch('words.json?v=3.1.0',{cache:'no-store'});
    if(!response.ok)throw new Error('words.json');
    words=await response.json();
  }catch{
    document.body.innerHTML='<main><div class="panel"><h2>Veri yüklenemedi</h2><p>Bağlantıyı kontrol edip sayfayı yenileyin.</p></div></main>';return;
  }
  setupEvents();renderAll();renderWords(true);
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js?v=3.1.0');
  if(profile.email==='guest@local')setTimeout(openProfile,600);
}
init();
