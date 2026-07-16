function setSyncStatus(text,type=''){
  ['#syncStatus','#authSignedOutStatus'].forEach(selector=>{
    const el=$(selector);if(!el)return;el.textContent=text;el.dataset.state=type;
  });
}
function cloudErrorMessage(error,area='Senkronizasyon'){
  const code=String(error?.code||'').replace(/^firestore\//,'');
  const raw=String(error?.message||'').replace(/^FirebaseError:\s*/i,'');
  if(code==='permission-denied')return `${area}: Firebase erişim izni reddedildi.`;
  if(code==='unauthenticated')return `${area}: Google oturumu yenilenmeli.`;
  if(code==='unavailable'||/network|failed to fetch|load failed/i.test(raw))return `${area}: internet bağlantısı bekleniyor.`;
  if(code==='resource-exhausted')return `${area}: Firebase kotası doldu.`;
  if(code==='invalid-argument'||/unsupported field value|undefined/i.test(raw))return `${area}: kaydedilen veride geçersiz alan var.`;
  return `${area} hatası${code?` (${code})`:''}.`;
}
function updateAuthUI(){
  const signed=!!authUser;
  if($('#authSignedOut'))$('#authSignedOut').hidden=signed;
  if($('#authSignedIn'))$('#authSignedIn').hidden=!signed;
  const visibleName=signed?accountDisplayName(profile?.name,authUser):(profile?.name||'Misafir');
  if(signed&&placeholderName(profile?.name))profile.name=visibleName;
  if($('#authUserName'))$('#authUserName').textContent=visibleName;
  if($('#authUserEmail'))$('#authUserEmail').textContent=authUser?.email||'';
  if($('#profileTitle')&&signed)$('#profileTitle').textContent=visibleName;
  if($('#profileName')&&signed&&placeholderName($('#profileName').value))$('#profileName').value=visibleName;
  if($('#profileEmail'))$('#profileEmail').value=signed?(authUser?.email||''):(profile?.email==='guest@local'?'':profile?.email||'');
  if($('#guestBanner'))$('#guestBanner').hidden=signed;
  if($('#cloudNoteText'))$('#cloudNoteText').innerHTML=signed
    ?'<b>Google senkronizasyonu açık</b><br>İlerleme ve XP değerleri bu hesapla cihazlar arasında eşitlenir.'
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
  clearTimeout(leaderboardWriteTimer);setLeagueSyncStatus('XP eşitleniyor…','syncing');
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
    setLeagueSyncStatus('XP güncel ✓','ok');
  }catch(error){console.error('Leaderboard write error',error);setLeagueSyncStatus(cloudErrorMessage(error,'Lig'),'error')}
  finally{leaderboardWriteBusy=false;if(leaderboardWriteQueued){leaderboardWriteQueued=false;scheduleLeaderboardWrite(120)}}
}
async function syncCloudNow(){
  if(!authUser||!fbDb||!cloudReady)return;
  if(cloudSyncBusy){cloudSyncQueued=true;return}
  cloudSyncBusy=true;cloudSyncQueued=false;clearTimeout(cloudSyncTimer);
  try{
    const publicName=accountDisplayName(profile?.name,authUser),scores=leaderboardScores(),c=counts();
    const packedState=packState(state);
    const userPayload={
      profile:{name:publicName,email:authUser.email||'',goal:Number(profile?.goal||20),voiceAccent:profile?.voiceAccent||'en-US',photoURL:authUser.photoURL||'',joinedAt:state.stats.joinedAt||''},
      // Firestore'a yalnızca düz metin gönderilir. Böylece eski cihaz kayıtlarındaki
      // iç içe dizi, undefined veya tarayıcıya özgü değerler senkronizasyonu bozamaz.
      stateJson:JSON.stringify(packedState),stateSchema:Number(packedState.v)||3,clientUpdatedAt:String(state.lastActive||new Date().toISOString()),
      updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
    };
    const leaderboardPayload=leaderboardCloudPayload();
    await Promise.all([
      fbDb.collection('users').doc(authUser.uid).set(userPayload,{merge:true}),
      fbDb.collection('leaderboard').doc(authUser.uid).set(leaderboardPayload,{merge:true})
    ]);
    setSyncStatus('Senkronize edildi ✓','ok');
    setLeagueSyncStatus('XP güncel ✓','ok');
    updateLeaderboardCacheWithOwn();
    if($('#view-league')?.classList.contains('active'))renderLeaderboard();
  }catch(error){console.error('Cloud sync error',error);setSyncStatus(cloudErrorMessage(error),'error')}
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
  state=mergeStates(remoteStateFromDocument(remoteData),accountCandidate||defaultState());
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
    if(typeof v5InitAppCheck==='function')await v5InitAppCheck();
    fbAuth=window.firebase.auth();fbDb=window.firebase.firestore();
    // Eski yerel kayıtlardaki tanımsız alanlar senkronizasyonu durdurmasın.
    try{fbDb.settings({ignoreUndefinedProperties:true})}catch(error){console.warn('Firestore settings',error)}
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
  const goal=Number(profile?.goal||20),voiceAccent=profile?.voiceAccent||'en-US',v5Voices=profile?.v5Voices||{},v5Rates=profile?.v5Rates||{};
  const guestState=readLocalState('guest@local')||defaultState();
  profile={name:'Misafir',email:'guest@local',goal,voiceAccent,v5Voices,v5Rates};
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
function leagueLabel(period=leaderboardPeriod){return period==='daily'?'Bugünkü XP’ye göre':period==='weekly'?'Bu haftaki XP’ye göre':period==='monthly'?'Bu ayki XP’ye göre':'Toplam XP’ye göre'}
function leagueScore(row,period=leaderboardPeriod){return Math.max(0,Math.round(Number(row?.[leagueField(period)])||0))}
function renderLeagueSummary(board,currentKey){
  const rows=board||[],index=rows.findIndex(x=>(x.uid&&x.uid===currentKey)||(!x.uid&&String(x.email||'').toLowerCase()===String(currentKey||'').toLowerCase())),current=index>=0?rows[index]:null;
  const own=current?leagueScore(current):Math.round(periodTotals(leaderboardPeriod).points||0);
  if($('#leagueUserPoints'))$('#leagueUserPoints').textContent=own;if($('#leagueUserRank'))$('#leagueUserRank').textContent=index>=0?`#${index+1}`:'—';if($('#leagueUserCount'))$('#leagueUserCount').textContent=rows.length;
  if($('#leagueLoginNote')){$('#leagueLoginNote').hidden=!!authUser;$('#leagueLoginNote').textContent=leaderboardAudience==='friends'?'Arkadaş ligi ve arkadaş kodu için Google hesabınla giriş yap.':'Ortak ligde görünmek için Google hesabınla giriş yap. Misafir XP’i yalnızca bu cihazda kalır.'}
  if($('#leaguePeriodText'))$('#leaguePeriodText').textContent=`${leagueLabel()} sıralama`;
  $$('[data-league-period]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leaguePeriod===leaderboardPeriod));$$('[data-league-audience]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leagueAudience===leaderboardAudience));renderFriendPanel(rows);
}
function leaderAvatar(x){
  if(x?.photoURL)return `<span class="leader-avatar has-photo"><img src="${esc(x.photoURL)}" alt="" referrerpolicy="no-referrer"></span>`;return `<span class="leader-avatar">${esc((x?.name||'Ö')[0].toUpperCase())}</span>`;
}
function renderLeaderboardRows(board,currentKey){
  const list=$('#leaderboardList');if(!list)return;const rows=(board||[]).slice().sort((a,b)=>leagueScore(b)-leagueScore(a)||String(a.name||'').localeCompare(String(b.name||''),'tr')).slice(0,100);renderLeagueSummary(rows,currentKey);
  list.innerHTML=rows.map((x,i)=>{const isCurrent=(x.uid&&x.uid===currentKey)||(!x.uid&&String(x.email||'').toLowerCase()===String(currentKey||'').toLowerCase()),medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'',detail=isCurrent?'Sen':`${COURSES[activeCourse].short} ligi · %${Number(x.coursePoints?.[activeCourse]?.accuracy??x.accuracy)||0} doğruluk`;return `<div class="leaderboard-row ${isCurrent?'current':''} ${i<3?'top-rank':''}"><span class="rank">${medal||i+1}</span>${leaderAvatar(x)}<div><b>${esc(x.name||'Öğrenci')}</b><small>${esc(detail)}</small></div><strong>${leagueScore(x)}<small>XP</small></strong></div>`}).join('')||'<p class="muted">Bu dönemde henüz puan kaydı yok.</p>';
}
async function refreshCloudLeaderboard(force=false){
  if(!authUser||!fbDb)return;const cacheKey=`${activeCourse}:${leaderboardAudience}:${leaderboardPeriod}`;
  if(leaderboardAudience==='world'){
    if(!force&&leaderboardUnsubscribe&&leaderboardRealtimeKey===cacheKey)return;
    stopLeaderboardRealtime();leaderboardRealtimeKey=cacheKey;
    const query=fbDb.collection('leaderboard').orderBy(leagueField(),'desc').limit(100);
    leaderboardUnsubscribe=query.onSnapshot({includeMetadataChanges:true},snap=>{
      const rows=mergeOwnLeaderboardRow(snap.docs.map(doc=>({uid:doc.id,...doc.data()})));
      cloudLeaderboardCache[cacheKey]=rows;
      setLeagueSyncStatus(snap.metadata.hasPendingWrites?'XP eşitleniyor…':snap.metadata.fromCache?'Çevrimdışı liste':'Canlı güncel ✓',snap.metadata.hasPendingWrites?'syncing':snap.metadata.fromCache?'idle':'ok');
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
  if(authUser&&fbDb){if(scope)scope.textContent=leaderboardAudience==='friends'?'Arkadaşların':'Tüm Google kullanıcıları';const cached=mergeOwnLeaderboardRow(cloudLeaderboardCache[cacheKey]||[]);if(cached.length)renderLeaderboardRows(cached,authUser.uid);else if($('#leaderboardList')){$('#leaderboardList').innerHTML='<p class="muted">XP listesi yükleniyor…</p>';renderLeagueSummary([currentLeaderboardRow()].filter(Boolean),authUser.uid)}refreshCloudLeaderboard();return}
  if(scope)scope.textContent=leaderboardAudience==='friends'?'Google girişi gerekli':'Bu cihazdaki profiller';let board=[];try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}updateLeaderboardEntry();try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}if(leaderboardAudience==='friends')board=[];renderLeaderboardRows(board,(profile?.email||'guest@local').toLowerCase());
}
