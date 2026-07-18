/* WordPilot v9.2.0 — 3000-word lexicon, secure AI auto-detection,
   shared multilingual concept ledger and permanent Coach 4.0 brand lock. */
const WP90_VERSION='9.2.0';
const WP90_REVIEWED={en:3000,ru:1500,uz:1000,tr:1000,es:1000,de:1000,fr:1000,it:1000,pt:1000,ja:1000,ko:1000,zh:1000};
let wp90AiHealthBusy=false,wp90AiHealthChecked=false;

function wp90CoverageText(course){const live=WP90_REVIEWED[course]||1000;return course==='en'?'3000 İngilizce kelime · A1–C2':`${live} onaylı kayıt · 3000 ortak kavram sırası`}
function wp90SetText(node,value){if(node&&node.textContent!==value)node.textContent=value}
function wp90ApplyVersionLock(){
  if(document.documentElement.dataset.wpVersion!==WP90_VERSION)document.documentElement.dataset.wpVersion=WP90_VERSION;if(document.title!=='WordPilot 9.1 · 3000 Kelime · Conversation Coach 4.0')document.title='WordPilot 9.1 · 3000 Kelime · Conversation Coach 4.0';
  wp90SetText($('.version'),'v9.5.0 · Conversation Coach Pro');
  wp90SetText($('#view-ai .section-title .eyebrow'),'CONVERSATION COACH 4.0');
  wp90SetText($('#view-ai .section-title h1'),'Conversation Coach 4.0 · Mira');
  wp90SetText($('#wp71ConversationSpotlight h2'),'Conversation Coach 4.0');
  if(COURSES.en){COURSES.en.file='words.json';COURSES.en.displayCount=3000;COURSES.en.actualCount=3000;COURSES.en.countLabel='3000 benzersiz İngilizce kelime · A1–C2'}
  Object.keys(COURSES).forEach(id=>{COURSES[id].sharedConceptCount=3000;COURSES[id].reviewedCount=WP90_REVIEWED[id]||1000});
  $$('.course-card[data-course]').forEach(card=>{const id=card.dataset.course;wp90SetText(card.querySelector('small'),wp90CoverageText(id))});
  wp90SetText($('#activeCourseSummary'),`${COURSES[activeCourse]?.name||activeCourse} · ${wp90CoverageText(activeCourse)}`);
  if(activeCourse==='en')wp90UpgradeLibrary();
}
function wp90UpgradeLibrary(){
  const group=$('#groupFilter');if(group){const value=group.value;if([...group.options].map(o=>o.value).join('|')!=='|base1000|extended2000')group.innerHTML='<option value="">3000 kelimenin tümü</option><option value="base1000">1–1000 İncelenmiş Çekirdek</option><option value="extended2000">1001–3000 Genişletilmiş Beta Sözlük</option>';group.value=['base1000','extended2000'].includes(value)?value:''}
  let box=$('#wp90CoveragePanel');const view=$('#view-library');if(!box&&view){box=document.createElement('section');box.id='wp90CoveragePanel';box.className='wp90-coverage panel';view.querySelector('.filters')?.before(box)}
  const html='<div><p class="eyebrow">V9.0 SÖZLÜK</p><b>3000 gerçek İngilizce kelime</b><small>Tekrarlı bağlam kartı yok · cümle tamamlama artık hedef kelimeyi tam cümlede sorar</small></div><div class="wp90-coverage-stats"><span><b>1000</b><small>incelenmiş çekirdek</small></span><span><b>2000</b><small>beta genişletme</small></span><span><b>3×</b><small>kelime başına bağlam</small></span></div>';if(box&&box.innerHTML!==html)box.innerHTML=html;
}
function wp90AiStatus(kind,text,detail){const backend=$('#aiBackendStatus');if(!backend)return;backend.className=`ai-backend-status ${kind}`;backend.innerHTML=`<b>${text}</b><small>${detail}</small>`}
async function wp90DetectCloudAi(force=false){
  if(wp90AiHealthBusy||(!force&&wp90AiHealthChecked))return;wp90AiHealthBusy=true;
  try{
    if(!authUser){V5_SECURITY.aiEnabled=false;V5_SECURITY.voiceTranscriptionEnabled=false;wp90AiStatus('local','Coach 4.0 · Yerel senaryo modu','Bulut AI için giriş yap; senaryolar çevrimdışı çalışmaya devam eder.');return}
    wp90AiStatus('checking','Coach 4.0 · Güvenli bağlantı kontrolü','Firebase Functions ve Secret Manager doğrulanıyor…');
    if(!(await v5LoadFunctionsSdk()))throw new Error('FUNCTIONS_SDK');
    const callable=window.firebase.app().functions(V5_SECURITY.aiRegion||'us-central1').httpsCallable('aiHealth');
    const response=await callable({clientVersion:WP90_VERSION});const ready=!!response?.data?.ready;
    V5_SECURITY.aiEnabled=ready;V5_SECURITY.voiceTranscriptionEnabled=ready;wp90AiHealthChecked=true;
    if(ready)wp90AiStatus('ready','Coach 4.0 · Güvenli Bulut AI hazır',`App Check doğrulandı · ${response.data.model||'AI modeli'} · API anahtarı tarayıcıda değil`);
    else wp90AiStatus('local','Coach 4.0 · Yerel senaryo modu','Functions açık ancak OPENAI_API_KEY sırrı hazır değil.');
  }catch(error){V5_SECURITY.aiEnabled=false;V5_SECURITY.voiceTranscriptionEnabled=false;wp90AiHealthChecked=true;wp90AiStatus('local','Coach 4.0 · Yerel senaryo modu','Bulut Functions henüz dağıtılmadı veya gizli anahtar bağlanmadı.');console.info('WordPilot AI health',error?.code||error?.message||error)}finally{wp90AiHealthBusy=false}
}
const wp90RenderAiCoachBase=renderAiCoach;
renderAiCoach=function(){const out=wp90RenderAiCoachBase();setTimeout(()=>{wp90ApplyVersionLock();if(V5_SECURITY.aiEnabled)wp90AiStatus('ready','Coach 4.0 · Güvenli Bulut AI hazır','Firebase Function + App Check + Secret Manager')},0);return out};
const wp90UpdateCourseUIBase=updateCourseUI;
updateCourseUI=function(){const out=wp90UpdateCourseUIBase();wp90ApplyVersionLock();return out};
const wp90HandleAuthStateBase=handleAuthState;
handleAuthState=async function(user){await wp90HandleAuthStateBase(user);wp90AiHealthChecked=false;await wp90DetectCloudAi(true);wp90ApplyVersionLock()};
function setupV90Events(){document.addEventListener('click',event=>{if(event.target.closest('#aiBackendStatus'))wp90DetectCloudAi(true)},true)}
function wp90AfterInit(){wp90ApplyVersionLock();/* v9.5: eski sürüm gözlemcisi devre dışı */setTimeout(()=>wp90DetectCloudAi(false),900)}

const WP90_SENTENCE_CACHE_PREFIX='wordpilot:v90:sentence:';
const wp90SentencePending=new Set();
window.wp90SentenceCacheFor=function(w){
  try{const row=JSON.parse(localStorage.getItem(`${WP90_SENTENCE_CACHE_PREFIX}${w.id}`)||'null');return row&&Date.now()-Number(row.savedAt||0)<30*86400000&&Array.isArray(row.examples)?row.examples:[]}catch{return[]}
};
window.wp90PrefetchSentence=async function(w){
  if(!V5_SECURITY.aiEnabled||!authUser||wp90SentencePending.has(w.id)||window.wp90SentenceCacheFor(w).length>=3)return;
  wp90SentencePending.add(w.id);
  try{
    if(!(await v5LoadFunctionsSdk()))return;
    const callable=window.firebase.app().functions(V5_SECURITY.aiRegion||'us-central1').httpsCallable('sentencePractice');
    const response=await callable({word:w.english,meaningTr:firstMeaning(w),cefr:cefr(w),partOfSpeech:wp90SentenceType(w),clientVersion:WP90_VERSION});
    const examples=(response?.data?.examples||[]).map(firstLine).filter(x=>new RegExp(`(^|[^\\p{L}])${escapeRegex(w.english)}(?=[^\\p{L}]|$)`,'iu').test(x)).slice(0,3);
    if(examples.length===3)localStorage.setItem(`${WP90_SENTENCE_CACHE_PREFIX}${w.id}`,JSON.stringify({savedAt:Date.now(),examples,source:'secure-cloud'}));
  }catch(error){console.info('WordPilot sentence practice',error?.code||error?.message||error)}finally{wp90SentencePending.delete(w.id)}
};
