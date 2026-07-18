/* WordPilot v8.2.0 Tester Beta
   Safer content branch, 2000-item English learning bank, gentler scoring,
   natural voice defaults, improved mastery flow and broader authentication UI. */
const WP81_VERSION='8.2.0';
const WP81_SCORE_SCHEMA=3;
const WP81_PAUSE_DEFAULT=10000;
const WP81_RATE_DEFAULT=.88;

// The v8.1 English course uses 1000 reviewed word cards + 1000 original context cards.
COURSES.en.file='words.json';
COURSES.en.displayCount=2000;
COURSES.en.actualCount=2000;
COURSES.en.countLabel='2000 çalışma kartı · 1000 kelime + 1000 özgün bağlam kartı';
COURSES.tr.flag='TR';

const wp81LoadCourseWordsBase=loadCourseWords;
loadCourseWords=async function(course=activeCourse){
  const support=typeof wp71Support==='function'?wp71Support():'tr',key=`${course}|${support}|81`;
  if(courseWordCache[key]){words=courseWordCache[key];return words}
  if(course==='en'&&support==='tr'){
    const response=await fetch(`words.json?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error('words.json');
    const data=await response.json();courseWordCache[key]=data;courseWordCache.en=data;words=data;return data;
  }
  return wp81LoadCourseWordsBase(course);
};

function wp81TurkishFlag(){return '<img class="wp81-tr-flag" src="assets/flag-tr.svg" alt="Türkiye bayrağı">'}
function wp81ApplyTurkishFlags(root=document){
  root.querySelectorAll('.course-card[data-course="tr"] .course-flag').forEach(el=>el.innerHTML=wp81TurkishFlag());
  root.querySelectorAll('[data-wp81-tr-flag]').forEach(el=>el.innerHTML=wp81TurkishFlag());
}

function wp81ApplyBrand(){
  const version=$('.version');if(version)version.textContent='v8.2.0 · Tester Beta';
  const summary=$('#activeCourseSummary');if(summary&&activeCourse==='en')summary.textContent='English · 2000 çalışma kartı';
  const enCard=$('.course-card[data-course="en"] small');if(enCard)enCard.textContent='Türkçe anlatımlı · 2000 çalışma kartı + A1–C2 Akademi';
  const ruCard=$('.course-card[data-course="ru"] small');if(ruCard)ruCard.textContent='Türkçe anlatımlı · 1500 kontrollü kayıt + A1–C2 Akademi';
  const uzCard=$('.course-card[data-course="uz"] small');if(uzCard)uzCard.textContent='Türkçe anlatımlı · 1000 kontrollü kayıt';
  if($('#proofWordCount')&&activeCourse==='en')$('#proofWordCount').textContent='2000';
  if($('#proofWordLabel')&&activeCourse==='en')$('#proofWordLabel').textContent='İngilizce çalışma kartı';
  if($('#activeCourseXpLabel'))$('#activeCourseXpLabel').textContent=`${String(COURSES[activeCourse]?.name||'KURS').toUpperCase()} KURS PUANI`;
  if(activeCourse==='en'){
    const group=$('#groupFilter');if(group&&![...group.options].some(o=>o.value==='base1000'))group.innerHTML='<option value="">Tüm gruplar</option><option value="base1000">1000 temel kelime</option><option value="context1000">1000 bağlam kartı</option>';
    const core=$('[data-collection="core5000"]');if(core){core.hidden=false;core.querySelector('b').textContent='1000 Temel Kelime';core.querySelector('small').textContent='İncelenmiş ana kelime kartları'}
    const phrases=$('[data-collection="phrases"]');if(phrases){phrases.hidden=false;phrases.querySelector('b').textContent='1000 Bağlam Kartı';phrases.querySelector('small').textContent='Özgün örnek ve kalıp çalışmaları'}
    const beginner=$('[data-collection="beginner"]');if(beginner){beginner.querySelector('b').textContent='A1–A2 Başlangıç';beginner.querySelector('small').textContent='Temelden sağlam ilerle'}
    const intermediate=$('[data-collection="intermediate"]');if(intermediate){intermediate.hidden=false;intermediate.querySelector('b').textContent='B1–B2 Gelişim';intermediate.querySelector('small').textContent='Orta ve ileri seviye'}
  }
  document.querySelectorAll('.global-xp-note').forEach(el=>el.childNodes.forEach(node=>{if(node.nodeType===3)node.textContent=node.textContent.replace(/Genel lig PP:/g,'Genel lig puanı:')}));
  wp81ApplyTurkishFlags();
  const profileLead=$('#profileDialog .profile-head .muted');if(profileLead)profileLead.textContent='Google, Microsoft/Hotmail veya e-posta hesabıyla giriş yaptığında ilerlemen cihazların arasında eşitlenir.';
  const guestBanner=$('#guestBanner p');if(guestBanner)guestBanner.innerHTML='<b>Misafir modundasın.</b> İlerlemen yalnızca bu cihazda tutulur. Cihazlar arası kullanım için bir hesap bağlayabilirsin.';
  const guestButton=$('#guestBanner [data-action="open-profile"]');if(guestButton)guestButton.textContent='Hesap bağla';
  wp81NormalizePointCopy(document);
}

/* ---------- v8.1 commercial-clean learning gates and collections ---------- */
const wp81CommercialGatesBase=wp71ApplyCommercialGates;
wp71ApplyCommercialGates=function(){
  const out=wp81CommercialGatesBase();
  if(activeCourse==='en'){
    const phrases=$('[data-collection="phrases"]'),intermediate=$('[data-collection="intermediate"]');if(phrases)phrases.hidden=false;if(intermediate)intermediate.hidden=false;
    $$('[data-start="synonym"],[data-start="antonym"]').forEach(btn=>btn.hidden=false);
    const syn=$('#setupMode option[value="synonym"]'),ant=$('#setupMode option[value="antonym"]');if(syn)syn.disabled=false;if(ant)ant.disabled=false;
    wp81ApplyBrand();
  }
  return out;
};
const wp81FilteredWordsBase=filteredWords;
filteredWords=function(){
  const select=$('#groupFilter'),group=select?.value||'';
  if(!['base1000','context1000'].includes(group))return wp81FilteredWordsBase();
  select.value='';const result=wp81FilteredWordsBase();select.value=group;
  return result.filter(w=>group==='base1000'?w.card_type==='word':w.card_type==='context');
};
const wp81OpenCollectionBase=openCollection;
openCollection=function(type){
  if(activeCourse==='en'&&(type==='core5000'||type==='phrases')){
    nav('library');$('#searchInput').value='';$('#levelFilter').value='';$('#statusFilter').value='';wp81ApplyBrand();$('#groupFilter').value=type==='core5000'?'base1000':'context1000';renderWords(true);return;
  }
  return wp81OpenCollectionBase(type);
};
const wp81UpdateCourseUIBase=updateCourseUI;
updateCourseUI=function(){const out=wp81UpdateCourseUIBase();wp81ApplyBrand();wp71ApplyCommercialGates();return out};

/* ---------- Lower, easier-to-read Pilot Points ---------- */
function wp81ScaleAward(value){
  const n=Math.round(Number(value)||0),a=Math.abs(n);if(!a)return 0;
  const scaled=a<=10?a:Math.max(1,Math.round(a/10));
  return Math.sign(n)*scaled;
}
function wp81ScalePointCopy(text){return String(text||'').replace(/([+−-])(\d+)\s*PP/g,(all,sign,value)=>{const n=wp81ScaleAward(Number(value));return `${sign==='+'?'+':'-'}${Math.abs(n)} PP`})}
function wp81NormalizePointCopy(root=document){
  const nodes=[];if(root?.nodeType===3)nodes.push(root);else if(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode)}
  nodes.forEach(node=>{const next=wp81ScalePointCopy(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next});
}
const wp81ToastBase=toast;toast=function(message,...args){return wp81ToastBase(wp81ScalePointCopy(message),...args)};
const wp81AdjustPointsBase=adjustPoints;
adjustPoints=function(delta){return wp81AdjustPointsBase(wp81ScaleAward(delta))};
responseScore=function(){
  const elapsed=Math.max(0,(Date.now()-(session?.questionStartedAt||Date.now()))/1000);
  const base=Math.max(3,Math.round(8-elapsed/18));
  const combo=Number(session?.combo)||0,bonus=combo>=10?2:combo>=4?1:0;
  return {elapsed,points:base+bonus,base,bonus};
};
const wp81TaskDefinitionsBase=taskDefinitions;
taskDefinitions=function(){return wp81TaskDefinitionsBase().map(task=>({...task,reward:Math.max(2,Math.round(Number(task.reward||0)/10))}))};

function wp81ScaleState(st){
  st=ensureStateShape(st||defaultState());st.stats=st.stats||{};
  if(Number(st.stats.scoreSchema||0)>=WP81_SCORE_SCHEMA)return st;
  st.stats.points=Math.max(0,Math.round((Number(st.stats.points)||0)/10));
  Object.values(st.stats.days||{}).forEach(day=>day.points=Math.max(0,Math.round((Number(day.points)||0)/10)));
  st.stats.scoreSchema=WP81_SCORE_SCHEMA;return st;
}
function wp81MigrateScores(){
  if(!profile||!state)return;
  const email=(profile.email||'guest@local').toLowerCase();
  COURSE_IDS.forEach(id=>{
    let st=id===activeCourse?state:readLocalState(email,id)||defaultState();st=wp81ScaleState(st);writeCourseState(id,st,email);if(id===activeCourse)state=st;
  });
  save({cloud:false});
}
const wp81HandleAuthStateBase=handleAuthState;
handleAuthState=async function(user){await wp81HandleAuthStateBase(user);if(user){wp81MigrateScores();await syncCloudNow()}};

renderXp=function(){
  const total=leaderboardScores().points,level=Math.floor(total/100)+1,within=total%100;
  if($('#globalXpText'))$('#globalXpText').textContent=`${total} PP`;
  if($('#xpLevel'))$('#xpLevel').textContent=level;
  if($('#xpToNext'))$('#xpToNext').textContent=`${100-within} PP`;
  if($('#xpLevelFill'))$('#xpLevelFill').style.width=`${within}%`;
  if($('#xpText'))$('#xpText').textContent=`${total} PP`;
};
updateStudyScore=function(){
  $('#studyScore').textContent=`${Math.round(session?.score||0)} PP`;
  const combo=$('#studyCombo'),value=Number(session?.combo)||0;if(combo){combo.hidden=value<2;combo.textContent=`🔥 ${value} seri`;}
  updateAttemptDisplay();
};
const wp81RenderLeaderboardRowsBase=renderLeaderboardRows;
renderLeaderboardRows=function(board,currentKey){wp81RenderLeaderboardRowsBase(board,currentKey);$('#leaderboardList')?.querySelectorAll('strong small').forEach(el=>el.textContent='PP')};
const wp81LeaderboardPayloadBase=leaderboardCloudPayload;
leaderboardCloudPayload=function(){const p=wp81LeaderboardPayloadBase();if(p){p.scoreSchema=WP81_SCORE_SCHEMA;p.appVersion=WP81_VERSION}return p};

/* ---------- Mastered-word flow and adaptive ordering ---------- */
const wp81RecordAnswerBase=recordAnswer;
recordAnswer=function(word,correct){
  if(session&&correct){session.correctWordIds=session.correctWordIds||[];if(!session.correctWordIds.includes(word.id))session.correctWordIds.push(word.id)}
  return wp81RecordAnswerBase(word,correct);
};
const wp81MakePoolBase=makePool;
makePool=function(mode,range=null,source='all'){
  const pool=wp81MakePoolBase(mode,range,source);
  if(source==='daily20')return pool;
  return pool.map(w=>({w,rank:(statusOf(w.id)==='hard'?0:flagOf(w.id,'veryHard')?0:!statusOf(w.id)?1:(state.history[w.id]?.needsReview?1:2))+Math.random()*.25})).sort((a,b)=>a.rank-b.rank).map(x=>x.w);
};
const wp81FinishSessionBase=finishSession;
finishSession=function(){
  const completed=session,ids=[...new Set(completed?.correctWordIds||[])];
  wp81FinishSessionBase();
  if(!completed)return;
  const score=Math.round(completed.correct/Math.max(1,completed.index)*100),already=ids.filter(id=>statusOf(id)==='memorized').length,eligible=ids.length-already;
  $('#studyPron').textContent=`${completed.correct} doğru · ${completed.index-completed.correct} yanlış · ${Math.round(completed.score||0)} PP · en iyi seri ${completed.maxCombo||0}`;
  $('#studyContent').innerHTML=`<div class="flash-card-inner wp81-finish-card"><span class="wp81-finish-icon">✓</span><h3>Çalışma tamamlandı</h3><p><b>%${score}</b> başarı elde ettin. Yanlış yaptığın kelimeler tekrar planına eklendi.</p>${eligible?`<div class="wp81-master-offer"><b>${eligible} doğru kelimeyi “Ezberledim” listesine taşıyalım mı?</b><p>Taşıdığın kelimeler normal quizlerde yeniden sorulmaz. Daha sonra zorlandığın bir kelimeyi <b>Ana Menü → Kelimeler</b> bölümünden bulup <b>Zorlandım</b> düğmesine basarak tekrar çalışma listene alabilirsin.</p><button class="primary wide" type="button" data-wp81-memorize-session data-ids="${ids.join(',')}">Doğru kelimeleri ezbere taşı</button><button class="secondary wide" type="button" data-nav="dashboard">Şimdilik taşıma</button></div>`:`<p class="muted">Bu oturumdaki doğru kelimeler zaten ezber listende.</p><button class="primary wide" data-nav="dashboard">Ana sayfaya dön</button>`}</div>`;
};
function wp81MemorizeSession(ids){
  let changed=0;ids.forEach(id=>{const w=words.find(x=>x.id===Number(id));if(!w)return;if(statusOf(w.id)!=='memorized'){setStatusValue(w.id,'memorized');changed++}if(state.history[w.id])state.history[w.id].needsReview=false});
  save();renderAll();const box=$('.wp81-master-offer');if(box)box.innerHTML=`<b>${changed} kelime ezber listesine taşındı ✓</b><p>Normal çalışmalarda tekrar sorulmayacak. Gerektiğinde Kelimeler bölümünden “Zorlandım” olarak işaretleyebilirsin.</p><button class="primary wide" data-nav="dashboard">Ana sayfaya dön</button>`;
}

/* ---------- Natural female-first TTS ---------- */
bestVoice=function(lang='en-US'){
  refreshSpeechVoices();const wanted=String(lang).toLowerCase(),base=wanted.slice(0,2);
  const candidates=speechVoices.filter(v=>String(v.lang||'').toLowerCase().startsWith(wanted)||String(v.lang||'').toLowerCase().startsWith(base));
  const female=['Jenny','Aria','Ava','Samantha','Sonia','Serena','Libby','Zira','Hazel','Susan','Victoria','Karen','Moira','Tessa','Fiona','Google UK English Female','Google US English','Microsoft Emel','Microsoft Seda','Microsoft Irina','Milena','Alena','Gulnoza'];
  return candidates.sort((a,b)=>{const ai=female.findIndex(n=>a.name.includes(n)),bi=female.findIndex(n=>b.name.includes(n));return (ai<0?999:ai)-(bi<0?999:bi)||Number(b.localService)-Number(a.localService)})[0]||speechVoices.find(v=>String(v.lang||'').toLowerCase().startsWith(base))||null;
};
speak=function(text,lang=null,options={}){
  if(!text||!('speechSynthesis'in window))return;const accent=lang||(activeCourse==='en'?(profile?.voiceAccent||'en-US'):COURSES[activeCourse].voice),spoken=displayClean(String(text)).replace(/[_/\\]+/g,' ').replace(/\s+/g,' ').trim();
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(spoken);u.lang=accent;u.rate=Math.max(.72,Math.min(1.05,Number(options.rate)||.88));u.pitch=1.04;const voice=bestVoice(accent);if(voice)u.voice=voice;speechSynthesis.speak(u);
};

/* ---------- Coach 3.1: more patient and less harsh ---------- */
wp80Prefs=function(){const p=v5Ensure().preferences;p.coachPauseMs=Math.max(6000,Math.min(20000,Number(p.coachPauseMs)||WP81_PAUSE_DEFAULT));p.coachRate=Math.max(.75,Math.min(1.05,Number(p.coachRate)||WP81_RATE_DEFAULT));return p};
const wp81CoachControlsBase=wp80EnsureCoachControls;
wp80EnsureCoachControls=function(){
  wp81CoachControlsBase();const delay=$('#wp80SilenceDelay');if(delay){delay.innerHTML='<option value="6000">6 sn</option><option value="10000">10 sn · önerilen</option><option value="15000">15 sn</option><option value="20000">20 sn</option>';delay.value=String(wp80Prefs().coachPauseMs)}
  const rate=$('#wp80CoachRate');if(rate){rate.innerHTML='<option value="0.78">Sakin</option><option value="0.88">Doğal · önerilen</option><option value="0.96">Normal</option><option value="1.04">Hızlı</option>';rate.value=String(wp80Prefs().coachRate)}
  const view=$('#view-ai');if(view&&!view.querySelector('.wp81-coach-mascot'))view.querySelector('.section-title')?.insertAdjacentHTML('afterend','<div class="wp81-coach-mascot"><span class="wp81-bot-face"><i></i><i></i><b></b></span><div><b>Mira seninle konuşmak istiyor</b><small>Düşünmek için zamanın var. Cevabını bitirdiğinde gönderebilirsin.</small></div></div>');
  const eye=$('#view-ai .section-title .eyebrow');if(eye)eye.textContent='CONVERSATION COACH 3.1';wp81ApplyBrand();
};
const wp81EvaluationBase=wp80DetailedEvaluation;
wp80DetailedEvaluation=function(message,mode=wp71CoachMode(),source=wp80LastInputSource){
  const r=wp81EvaluationBase(message,mode,source),floor=source==='voice'?70:62;
  const soften=v=>Math.max(floor,Math.min(100,Math.round(55+Number(v||0)*.45)));
  r.metrics={grammar:soften(r.metrics?.grammar),clarity:soften(r.metrics?.clarity),fluency:soften(r.metrics?.fluency)};
  r.score=Math.round((r.metrics.grammar+r.metrics.clarity+r.metrics.fluency)/3);
  if(r.score>=86&&r.status==='needs_work'&&!r.issues?.some(x=>/yanlış|standard|Kiril/i.test(x)))r.status='correct';
  return r;
};

/* ---------- Clear review wording and always-visible practice shortcuts ---------- */
function wp81HumanizeReview(){
  document.querySelectorAll('[data-dashboard-tab="collections"] small').forEach(el=>el.textContent='Zamanı gelenler ve listeler');
  document.querySelectorAll('.wp62-coach-head').forEach(box=>{const eye=box.querySelector('.eyebrow'),p=box.querySelector('p:not(.eyebrow)'),badge=box.querySelector('span');if(eye)eye.textContent='KİŞİSEL TEKRAR PLANI';if(p)p.textContent='Zorlandığın ve tekrar zamanı gelen kelimeler önce gösterilir.';if(badge)badge.textContent='OTOMATİK PLAN'});
  document.querySelectorAll('.adaptive-view .eyebrow').forEach(el=>el.textContent='KİŞİSEL TEKRAR');
  const title=$('#adaptiveTitle');if(title)title.textContent=`${COURSES[activeCourse]?.name||''} · kişisel tekrar planı`;
}
function wp81EnsureQuickPractice(){
  if($('#wp81QuickPractice'))return;const hub=$('.learning-hub');if(!hub)return;
  hub.insertAdjacentHTML('afterend',`<section id="wp81QuickPractice" class="wp81-quick-practice"><div><p class="eyebrow">HIZLI BAŞLA</p><h2>Oyunlar artık tek dokunuş uzağında</h2></div><div class="wp81-quick-grid"><button data-start="smart"><span>✦</span><b>Akıllı Quiz</b></button><button data-start="listening"><span>🔊</span><b>Dinleme</b></button><button data-start="matching"><span>↔</span><b>Eşleştirme</b></button><button data-start="synonym"><span>≈</span><b>Eş Anlam</b></button><button data-start="antonym"><span>≠</span><b>Zıt Anlam</b></button><button data-dashboard-tab="games"><span>＋</span><b>Tüm oyunlar</b></button></div></section>`);
}
function wp81EnsureFeedbackActions(){
  if($('#wp81FeedbackPanel'))return;const tools=$('.home-tools');if(!tools)return;
  tools.insertAdjacentHTML('beforebegin','<section id="wp81FeedbackPanel" class="wp81-feedback-panel"><div><span>💬</span><div><b>WordPilot hakkında ne düşünüyorsun?</b><small>Yeni özellik öner veya karşılaştığın hatayı bize bildir.</small></div></div><div><button type="button" data-wp81-feedback="idea">Yenilik öner</button><button type="button" data-wp81-feedback="bug">Hata bildir</button></div></section>');
}

/* ---------- Email, Microsoft/Hotmail and local guest access ---------- */
function wp81AuthMessage(error){const c=String(error?.code||error?.message||'');if(/email-already-in-use/i.test(c))return 'Bu e-posta zaten kayıtlı. “Giriş yap” düğmesini kullan.';if(/invalid-email/i.test(c))return 'Geçerli bir e-posta adresi yaz.';if(/weak-password/i.test(c))return 'Daha güçlü bir şifre kullan.';if(/invalid-credential|wrong-password|user-not-found/i.test(c))return 'E-posta veya şifre doğru değil.';if(/too-many-requests/i.test(c))return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar dene.';if(/operation-not-allowed/i.test(c))return 'Bu giriş yöntemi Firebase konsolunda henüz etkinleştirilmemiş.';if(/account-exists-with-different-credential/i.test(c))return 'Bu e-posta başka bir giriş yöntemiyle kayıtlı.';if(/popup|cancel/i.test(c))return 'Giriş işlemi iptal edildi.';return 'Giriş tamamlanamadı. Bağlantını ve hesap bilgilerini kontrol et.'}
function wp81EnsureAuthUI(){
  const card=$('#authSignedOut');if(!card||$('#wp81EmailAuth'))return;
  card.classList.add('wp81-auth-card');card.querySelector('.google-badge')?.remove();const head=card.querySelector('div');if(head){head.querySelector('b').textContent='Hesabını bağla';head.querySelector('small').textContent='Google, Microsoft/Hotmail veya herhangi bir e-posta adresi kullanabilirsin.'}
  const actions=card.querySelector('.auth-actions');if(actions){const google=$('#googleSignInBtn'),guest=$('#guestContinueBtn');if(google)google.textContent='Google ile giriş';if(guest){guest.textContent='E-postasız misafir devam et';guest.classList.add('text-link')}if(!$('#wp81MicrosoftSignIn'))google?.insertAdjacentHTML('afterend','<button id="wp81MicrosoftSignIn" class="secondary" type="button">Microsoft / Hotmail</button>')}
  actions?.insertAdjacentHTML('beforebegin',`<form id="wp81EmailAuth" class="wp81-email-auth"><label>E-posta<input id="wp81AuthEmail" type="email" autocomplete="email" required placeholder="adiniz@example.com"></label><label>Şifre<input id="wp81AuthPassword" type="password" autocomplete="current-password" minlength="8" required placeholder="En az 8 karakter"></label><div><button class="secondary" type="button" data-wp81-email="signin">E-posta ile giriş</button><button class="secondary" type="button" data-wp81-email="signup">Yeni hesap oluştur</button></div><button class="text-link" type="button" data-wp81-reset-password>Şifremi unuttum</button><p id="wp81AuthStatus" aria-live="polite"></p></form><div class="wp81-auth-divider"><span>veya</span></div>`);
  const warning=card.querySelector('.guest-warning');if(warning)warning.textContent='Misafir kullanımında hesap gerekmez; ancak ilerleme yalnızca bu cihazda saklanır.';
  const signed=$('#authSignedIn');if(signed&&!$('#wp81DeleteAccount'))signed.insertAdjacentHTML('beforeend','<button id="wp81DeleteAccount" class="danger-link" type="button">Hesabı ve bulut verilerini sil</button>');
  const cloud=$('#cloudNoteText');if(cloud)cloud.innerHTML='<b>Bulut senkronizasyonu</b><br>Google, Microsoft veya e-posta hesabı bağlandığında ilerleme cihazlar arasında eşitlenir.';
}
async function wp81EmailAuth(mode){
  if(!fbAuth)return toast('Hesap bağlantısı henüz hazır değil.');const email=$('#wp81AuthEmail')?.value.trim(),password=$('#wp81AuthPassword')?.value||'',status=$('#wp81AuthStatus');if(!email||password.length<8){if(status)status.textContent='E-posta ve en az 8 karakterli şifre yaz.';return}
  try{if(status)status.textContent='Hesap doğrulanıyor…';if(mode==='signup')await fbAuth.createUserWithEmailAndPassword(email,password);else await fbAuth.signInWithEmailAndPassword(email,password);if(status)status.textContent='Giriş başarılı ✓';$('#profileDialog')?.close()}
  catch(error){if(status)status.textContent=wp81AuthMessage(error)}
}
async function wp81MicrosoftSignIn(){
  if(!fbAuth||!window.firebase)return toast('Microsoft girişi henüz hazır değil.');try{const provider=new window.firebase.auth.OAuthProvider('microsoft.com');provider.setCustomParameters({prompt:'select_account'});await fbAuth.signInWithRedirect(provider)}catch(error){toast(wp81AuthMessage(error))}
}
async function wp81ResetPassword(){const email=$('#wp81AuthEmail')?.value.trim(),status=$('#wp81AuthStatus');if(!email){if(status)status.textContent='Önce e-posta adresini yaz.';return}try{await fbAuth.sendPasswordResetEmail(email);if(status)status.textContent='Şifre yenileme bağlantısı gönderildi.'}catch(error){if(status)status.textContent=wp81AuthMessage(error)}}
async function wp81DeleteAccount(){
  if(!authUser||!fbAuth)return;const ok=confirm('WordPilot hesabın, bulut ilerlemen ve lig kaydın silinsin mi? Bu işlem geri alınamaz.');if(!ok)return;
  try{const uid=authUser.uid;await Promise.allSettled([fbDb?.collection('users').doc(uid).delete(),fbDb?.collection('leaderboard').doc(uid).delete()]);await authUser.delete();switchToGuestMode();toast('Hesap ve bulut verileri silindi.')}
  catch(error){toast(/requires-recent-login/i.test(String(error?.code))?'Güvenlik için yeniden giriş yapıp silme işlemini tekrar dene.':wp81AuthMessage(error))}
}
const wp81InitFirebaseBase=initFirebase;
initFirebase=async function(){const ok=await wp81InitFirebaseBase();if(ok&&fbAuth){try{const result=await fbAuth.getRedirectResult();if(result?.user)toast('Microsoft hesabıyla giriş yapıldı.')}catch(error){toast(wp81AuthMessage(error))}}return ok};

function wp81AfterInit(){
  wp81MigrateScores();wp81EnsureQuickPractice();wp81EnsureFeedbackActions();wp81EnsureAuthUI();wp81HumanizeReview();wp80EnsureCoachControls();wp71ApplyCommercialGates();wp81ApplyBrand();renderXp();
  const profileLabel=$('#profilePoints')?.nextElementSibling;if(profileLabel)profileLabel.textContent='PİLOT PUANI';
  const roadmap=document.querySelectorAll('.wp61-roadmap-card, .roadmap-card');roadmap.forEach(card=>{if(/SM-2/i.test(card.textContent))card.innerHTML=card.innerHTML.replace(/SM-2/gi,'Kişisel')});
}

document.addEventListener('click',event=>{
  const mem=event.target.closest('[data-wp81-memorize-session]');if(mem){wp81MemorizeSession(mem.dataset.ids.split(',').map(Number));return}
  const feedback=event.target.closest('[data-wp81-feedback]');if(feedback){wp712OpenFeedback();setTimeout(()=>{$('#wp712FeedbackCategory').value=feedback.dataset.wp81Feedback;$('#wp712FeedbackSubject').focus()},0);return}
  const email=event.target.closest('[data-wp81-email]');if(email){wp81EmailAuth(email.dataset.wp81Email);return}
  if(event.target.closest('#wp81MicrosoftSignIn')){wp81MicrosoftSignIn();return}
  if(event.target.closest('[data-wp81-reset-password]')){wp81ResetPassword();return}
  if(event.target.closest('#wp81DeleteAccount')){wp81DeleteAccount();return}
  const allGames=event.target.closest('#wp81QuickPractice [data-dashboard-tab="games"]');if(allGames){document.querySelector('[data-dashboard-tab="games"]')?.click();return}
},true);

// Reapply human-readable wording after dynamic dashboard renders.
const wp81Observer=new MutationObserver(()=>{clearTimeout(wp81Observer._t);wp81Observer._t=setTimeout(()=>{wp81ApplyBrand();wp81HumanizeReview();wp81EnsureAuthUI();wp81NormalizePointCopy(document)},80)});
document.addEventListener('DOMContentLoaded',()=>wp81Observer.observe(document.body,{childList:true,subtree:true}));
