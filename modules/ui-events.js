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
function openProfileBase(){
  const displayName=authUser?accountDisplayName(profile?.name,authUser):(profile?.name||'Misafir');
  if(authUser&&placeholderName(profile?.name))profile.name=displayName;
  $('#profileName').value=displayName;$('#dailyGoal').value=String(profile.goal||20);$('#voiceAccent').value=profile.voiceAccent||'en-US';$('#profileTitle').textContent=authUser?displayName:profile.email==='guest@local'?'Profilini oluştur':displayName;
  const avatar=$('#profileAvatar');if(profile.photoURL)avatar.innerHTML=`<img src="${esc(profile.photoURL)}" alt="" referrerpolicy="no-referrer">`;else avatar.textContent=(displayName||'M')[0].toUpperCase();renderProfileStats();updateAuthUI();$('#profileDialog').showModal();
}
function openCollectionBase(type){
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
  btn.disabled=true;status.textContent='Yaklaşık 4,6 MB: üç kurs ve çalışma dosyaları tarayıcıya kaydediliyor…';
  try{
    const reg=await navigator.serviceWorker.ready;
    const worker=reg.active||reg.waiting||reg.installing;
    if(!worker)throw new Error('worker');
    const result=await new Promise((resolve,reject)=>{
      const channel=new MessageChannel(),timer=setTimeout(()=>reject(new Error('timeout')),45000);
      channel.port1.onmessage=e=>{clearTimeout(timer);e.data?.ok?resolve(e.data):reject(new Error(e.data?.error||'cache'))};
      worker.postMessage({type:'CACHE_OFFLINE'},[channel.port2]);
    });
    const fileCount=Number(result?.files)||8,size=(Number(result?.bytes)||4300000)/1048576;status.textContent=`Hazır ✓ ${fileCount} dosya ve üç kurs (${size.toFixed(1)} MB) tarayıcı hafızasına kaydedildi. İndirilenler klasörüne dosya düşmez.`;toast('Çevrimdışı paket hazır.');
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
  $('#wordSpeakUS').addEventListener('click',()=>speak(currentWord?.english,COURSES[activeCourse].voice));$('#wordSpeakUK').addEventListener('click',()=>speak(currentWord?.english,COURSES[activeCourse].voiceAlt));
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
      const val=normalizeAnswer($('#writeAnswer').value);
      const w=session.current,mode=session.questionType||session.mode;
      const correct=mode==='en-tr'
        ?clean(w.meaning).split(/\n|★/).map(normalizeAnswer).filter(Boolean).some(x=>x===val||x.includes(val)||val.includes(x))
        :val===normalizeAnswer(w.english);
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
  $('#setupMode').addEventListener('change',()=>{if(['listening','dictation'].includes($('#setupMode').value)){$('#hiddenModeToggle').checked=true;$('#autoSpeakToggle').checked=true}});
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
  window.addEventListener('online',()=>{if(authUser){setSyncStatus('Bağlantı geri geldi, eşitleniyor…','syncing');scheduleCloudSync(0);scheduleLeaderboardWrite(0)}});
  window.addEventListener('offline',()=>{if(authUser)setSyncStatus('Çevrimdışısın; değişiklikler cihazda korunuyor.','idle')});
  $('#installBtn').addEventListener('click',handleInstallRequest);
}
async function registerServiceWorker(){
  if(!('serviceWorker'in navigator))return;
  try{
    const reloadKey=`wordpilot_sw_reload_${VERSION}`;
    let reloading=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(reloading||sessionStorage.getItem(reloadKey))return;
      reloading=true;sessionStorage.setItem(reloadKey,'1');location.reload();
    });
    const reg=await navigator.serviceWorker.register(`${SW_FILE}?v=${VERSION}`,{updateViaCache:'none'});
    await reg.update().catch(()=>{});
    if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;if(!worker)return;
      worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)worker.postMessage({type:'SKIP_WAITING'})});
    });
  }catch(error){console.error('Service worker update error',error)}
}
