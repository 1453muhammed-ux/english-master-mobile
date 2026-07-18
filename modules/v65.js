/* WordPilot v7.0.0 — professional navigation, voice conversation, mobile microphone resilience and UI consistency. */
const WP65_VERSION='7.1.2';
let wp65AiRecognition=null,wp65AiRecording=null,wp65AiStream=null,wp65AiChunks=[],wp65AiListening=false;

function wp65FlagMarkup(course,size='normal'){
  const name=COURSES[course]?.name||course;
  return `<i class="wp65-flag wp65-flag-${course} ${size==='small'?'small':''}" role="img" aria-label="${esc(name)}"></i>`;
}
function wp65ApplyFlags(){
  document.querySelectorAll('.course-card[data-course]').forEach(card=>{const id=card.dataset.course,slot=card.querySelector('.course-flag');if(slot)slot.innerHTML=wp65FlagMarkup(id)});
  document.querySelectorAll('.language-xp-card[data-language-xp-course]').forEach(card=>{const id=card.dataset.languageXpCourse,slot=card.querySelector('.language-xp-flag');if(slot)slot.innerHTML=wp65FlagMarkup(id)});
  document.querySelectorAll('[data-wp62-league-course]').forEach(btn=>{const id=btn.dataset.wp62LeagueCourse,slot=btn.querySelector('span');if(slot)slot.innerHTML=wp65FlagMarkup(id,'small')});
  const top=$('#courseTopBadge');if(top)top.innerHTML=`${wp65FlagMarkup(activeCourse,'small')}<span>${esc(COURSES[activeCourse].name)}</span>`;
  const vf=$('#voiceCourseFlag');if(vf)vf.innerHTML=wp65FlagMarkup(activeCourse);
  const af=$('#aiCourseFlag');if(af)af.innerHTML=wp65FlagMarkup(activeCourse);
}
function wp65PolishHub(){
  const tabs=document.querySelector('.learning-hub-tabs');if(!tabs)return;
  const map={academy:['🎓','Akademi','Ders yolu'],games:['🎯','Pratik','Quiz'],speak:['🎙','Konuşma','AI'],stories:['📚','Reader','Okuma'],progress:['📈','İlerleme','Analiz'],collections:['•••','Daha Fazla','Araçlar']};
  ['academy','games','speak','stories','progress','collections'].forEach(id=>{const btn=tabs.querySelector(`[data-dashboard-tab="${id}"]`);if(!btn)return;const m=map[id];btn.innerHTML=`<span>${m[0]}</span><b>${m[1]}</b><small>${m[2]}</small>`;tabs.appendChild(btn)});
  let summary=$('#wp65HubSummary');if(!summary){tabs.insertAdjacentHTML('afterend','<div id="wp65HubSummary" class="wp65-hub-summary"></div>');summary=$('#wp65HubSummary')}
  wp65UpdateHubSummary();
}
function wp65UpdateHubSummary(){
  const active=document.querySelector('.learning-hub-tabs [data-dashboard-tab].active'),summary=$('#wp65HubSummary');if(!active||!summary)return;
  const info={academy:'Yapılandırılmış derslerle seviyeni adım adım ilerlet.',games:'Kelime, dinleme, yazma ve cümle oyunlarından birini seç.',speak:'Telaffuzunu ölç veya sesli konuşma partneriyle pratik yap.',stories:'Seviyene uygun metinleri dinle, kelimelere dokun ve testini çöz.',progress:'Kurs PP, doğruluk, tekrar ve lig durumunu tek yerde incele.',collections:'Kiril, fiil, kelime atlası ve yardımcı araçlara ulaş.'};
  summary.textContent=info[active.dataset.dashboardTab]||'';
}
function wp65ResetQuestionVisuals(){
  const active=document.activeElement;if(active&&active.closest?.('#studyContent'))active.blur();
  document.querySelectorAll('#studyContent .choice,#studyContent [data-answer-id],#studyContent [data-sentence-option]').forEach(btn=>{btn.classList.remove('correct','wrong','used-wrong','locked','selected');btn.removeAttribute('aria-pressed')});
}
function wp65MicMessage(error){
  const code=String(error?.error||error?.name||error||'');
  if(/not-allowed|permission|denied/i.test(code))return 'Mikrofon izni kapalı. Tarayıcı ayarlarından WordPilot için mikrofonu aç.';
  if(/no-speech|nomatch/i.test(code))return 'Ses duyulmadı. Sessiz ortamda mikrofona biraz daha yakın konuş.';
  if(/audio-capture|notfound/i.test(code))return 'Mikrofon bulunamadı veya başka bir uygulama tarafından kullanılıyor.';
  if(/network/i.test(code))return 'Ses tanıma servisine bağlanılamadı. İnternet bağlantısını kontrol et.';
  return 'Mikrofon başlatılamadı. Sayfayı yenileyip yeniden dene.';
}
async function wp65RequestMicrophone(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('MIC_UNSUPPORTED');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  stream.getTracks().forEach(t=>t.stop());
  await new Promise(r=>setTimeout(r,220));
  return true;
}
function wp65RecognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function wp65SetMicButton(button,recording){
  if(!button)return;button.classList.toggle('recording',recording);
  if(button.id==='pronunciationRecord'){const icon=button.querySelector('span'),label=button.querySelector('b');if(icon)icon.textContent=recording?'■':'🎙';if(label)label.textContent=recording?'Dinleniyor…':'Okumaya başla'}
  else button.textContent=recording?'■':'🎙';
}
async function wp65RunRecognition({onText,onPartial,onEnd,statusEl,button}){
  if(wp65AiRecognition){try{wp65AiRecognition.abort()}catch{}wp65AiRecognition=null}
  try{speechSynthesis?.cancel();await wp65RequestMicrophone()}catch(err){const msg=wp65MicMessage(err);if(statusEl)statusEl.textContent=msg;toast(msg);throw err}
  const Ctor=wp65RecognitionCtor();if(!Ctor){const err=new Error('RECOGNITION_UNSUPPORTED');if(statusEl)statusEl.textContent='Bu telefonda canlı ses tanıma yok. Bulut ses tanıma etkinleştirilirse kayıtla devam edebilirsin.';throw err}
  const rec=new Ctor();wp65AiRecognition=rec;rec.lang=v5VoiceLang();rec.interimResults=true;rec.maxAlternatives=5;rec.continuous=false;
  wp65SetMicButton(button,true);if(statusEl)statusEl.textContent='Dinleniyor… Konuşmaya başla.';
  rec.onresult=e=>{let final='',partial='';for(let i=e.resultIndex;i<e.results.length;i++){const text=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)final+=text;else partial+=text}if(partial&&onPartial)onPartial(partial);if(final&&onText)onText(final.trim())};
  rec.onerror=e=>{const msg=wp65MicMessage(e);if(statusEl)statusEl.textContent=msg;toast(msg)};
  rec.onend=()=>{wp65AiRecognition=null;wp65SetMicButton(button,false);if(statusEl&&/Dinleniyor/.test(statusEl.textContent))statusEl.textContent='Mikrofon hazır';onEnd?.()};
  try{rec.start()}catch(err){rec.onend?.();throw err}
  return rec;
}
function wp65SurfaceCorrection(message){
  const raw=String(message||'').trim();let corrected=raw,status='correct',explanation='Cümlen anlaşılır ve doğal görünüyor.',suggestion='';
  if(activeCourse==='en'){
    corrected=corrected.replace(/\bi\b/g,'I').replace(/^([a-z])/,m=>m.toUpperCase());
    corrected=corrected.replace(/^I from\b/i,'I am from').replace(/^My name ([A-ZÇĞİÖŞÜ][\p{L}-]*)/u,'My name is $1');
    if(corrected&&!/[.!?]$/.test(corrected))corrected+='.';
    if(corrected!==raw){status='needs_work';explanation='Büyük harf, yardımcı fiil veya noktalama düzenlendi.'}
    suggestion=corrected.replace(/^I like (\w+)\./i,'I really enjoy $1.');
  }else if(activeCourse==='ru'){
    corrected=corrected.replace(/^([а-яё])/iu,m=>m.toUpperCase());if(corrected&&!/[.!?]$/.test(corrected))corrected+='.';
    if(!/[а-яё]/i.test(raw)){status='needs_work';explanation='Rusça cevapta Kiril alfabesi kullanmalısın.';suggestion='Попробу́йте написа́ть отве́т по-ру́сски.'}
    else if(corrected!==raw){status='needs_work';explanation='Büyük harf ve noktalama düzenlendi.'}
  }else{
    corrected=corrected.replace(/^([a-zʼʻö‘])/iu,m=>m.toUpperCase());if(corrected&&!/[.!?]$/.test(corrected))corrected+='.';
    if(corrected!==raw){status='needs_work';explanation='Büyük harf ve noktalama düzenlendi.'}
  }
  return {status,corrected,explanation,suggestion:suggestion||corrected};
}
const wp65OldLocalCoach=v5LocalCoachReply;
v5LocalCoachReply=function(message){const base=wp65OldLocalCoach(message),evaln=wp65SurfaceCorrection(message);return {...base,...evaln,correction:evaln.explanation,mode:'local'}};
function wp65HistoryBubble(x){
  const feedback=x.feedback||((x.status||x.corrected||x.explanation||x.suggestion)?{status:x.status,corrected:x.corrected,explanation:x.explanation,suggestion:x.suggestion}:null);
  const fb=feedback&&x.role==='assistant'?`<div class="wp65-answer-review ${feedback.status==='correct'?'good':'needs-work'}"><b>${feedback.status==='correct'?'✓ Cümlen doğru':'● Düzeltilmesi önerilir'}</b>${feedback.status!=='correct'&&feedback.corrected?`<p><span>Doğru kullanım</span>${esc(feedback.corrected)}</p>`:''}${feedback.explanation?`<small>${esc(feedback.explanation)}</small>`:''}${feedback.suggestion?`<p class="alternative"><span>Doğal alternatif</span>${esc(feedback.suggestion)}</p>`:''}</div>`:'';
  return `<article class="ai-message ${x.role}"><span>${x.role==='assistant'?'WP':'Sen'}</span><div><p>${esc(x.text)}</p>${fb}${x.role==='assistant'?`<button type="button" class="wp65-speak-reply" data-wp65-speak-reply="${esc(x.text)}">🔊 Dinle</button>`:''}</div></article>`;
}
renderAiCoach=function(){
  const meta=COURSES[activeCourse],scenario=V5_SCENARIOS[v5AiScenario];$('#aiCourseFlag').innerHTML=wp65FlagMarkup(activeCourse);$('#aiScenarioTitle').textContent=scenario.title;$('#aiScenarioHint').textContent=scenario.hint;
  $('#aiScenarioList').innerHTML=Object.entries(V5_SCENARIOS).map(([id,s])=>`<button type="button" class="${id===v5AiScenario?'active':''}" data-ai-scenario="${id}"><span>${s.icon}</span><div><b>${s.title}</b><small>${s.hint}</small></div></button>`).join('');
  const backend=$('#aiBackendStatus'),configured=!!V5_SECURITY.aiEnabled;backend.className=`ai-backend-status ${configured?'ready':'local'}`;backend.innerHTML=configured?'<b>Güvenli bulut AI</b><small>Düzeltme, öneri ve konuşma geri bildirimi aktif</small>':'<b>Yerel pratik modu</b><small>Temel düzeltme çalışır; gelişmiş AI için Functions etkinleştirilebilir.</small>';
  const history=v5HistoryForScenario();if(!history.length)history.push({role:'assistant',text:v5ScenarioStarter(),mode:'local',at:new Date().toISOString()});
  $('#aiChatMessages').innerHTML=history.map(wp65HistoryBubble).join('');$('#aiChatMessages').scrollTop=$('#aiChatMessages').scrollHeight;
  const level=$('#wp65AiLevel');if(level){const prefs=v5Ensure().preferences;level.value=prefs.aiLevel||'A1';const autoSpeak=$('#wp65AiAutoSpeak'),autoSend=$('#wp65AiAutoSend');if(autoSpeak)autoSpeak.checked=prefs.aiAutoSpeak!==false;if(autoSend)autoSend.checked=prefs.aiAutoSend!==false}
  wp65ApplyFlags();
}
v5CloudAi=async function(history,message){
  if(!authUser||!fbAuth)throw new Error('AUTH_REQUIRED');if(!(await v5LoadFunctionsSdk()))throw new Error('SDK_UNAVAILABLE');
  const callable=window.firebase.app().functions(V5_SECURITY.aiRegion||'us-central1').httpsCallable('aiCoach'),level=$('#wp65AiLevel')?.value||'A1';
  const response=await callable({course:activeCourse,level,scenario:v5AiScenario,message,history:history.slice(-10).map(x=>({role:x.role,text:x.text}))});return response?.data||{};
}
v5SendAiMessage=async function(message){
  const history=v5HistoryForScenario(),userEntry={role:'user',text:message,at:new Date().toISOString()};history.push(userEntry);renderAiCoach();v5AiBusy=true;$('#aiChatInput').disabled=true;
  let reply;try{if(V5_SECURITY.aiEnabled)reply=await v5CloudAi(history,message);else throw new Error('LOCAL')}catch(error){reply=v5LocalCoachReply(message);if(error?.message==='AUTH_REQUIRED')reply.explanation='Gelişmiş bulut AI için bir hesapla giriş yapmalısın.'}
  const feedback={status:reply.status||'needs_work',corrected:reply.corrected||message,explanation:reply.explanation||reply.correction||'',suggestion:reply.suggestion||''};
  history.push({role:'assistant',text:reply.text||v5LocalCoachReply(message).text,feedback,mode:reply.mode||'local',at:new Date().toISOString()});while(history.length>30)history.shift();v5AiBusy=false;$('#aiChatInput').disabled=false;v5Save();renderAiCoach();
  if($('#wp65AiAutoSpeak')?.checked)speak(reply.text||'',v5VoiceLang());
}
async function wp65StartAiVoice(){
  const btn=$('#wp65AiMic'),status=$('#wp65AiMicStatus'),input=$('#aiChatInput');
  if(!btn||!input)return;
  if(wp65AiRecognition){try{wp65AiRecognition.stop()}catch{}return}
  try{
    await wp65RunRecognition({
      button:btn,
      statusEl:status,
      onPartial:text=>{input.value=text},
      onText:text=>{
        input.value=text;
        const auto=$('#wp65AiAutoSend')?.checked;
        status.textContent=auto?'Cevabın gönderiliyor…':'Metin hazır. Kontrol edip Gönder’e bas.';
        if(auto&&!v5AiBusy){
          setTimeout(()=>{
            const value=input.value.trim();
            if(value){input.value='';v5SendAiMessage(value)}
          },180);
        }
      }
    });
  }catch(err){
    if(err.message==='RECOGNITION_UNSUPPORTED'&&V5_SECURITY.voiceTranscriptionEnabled)wp65StartCloudRecorder();
  }
}

async function wp65BlobToBase64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=reject;r.readAsDataURL(blob)})}
async function wp65StartCloudRecorder(){
  const btn=$('#wp65AiMic'),status=$('#wp65AiMicStatus');if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Bu cihazda ses kaydı desteklenmiyor.');return}
  if(wp65AiRecording&&wp65AiRecording.state==='recording'){wp65AiRecording.stop();return}
  try{wp65AiStream=await navigator.mediaDevices.getUserMedia({audio:true});const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(x=>MediaRecorder.isTypeSupported?.(x))||'';wp65AiChunks=[];wp65AiRecording=new MediaRecorder(wp65AiStream,type?{mimeType:type}:undefined);wp65AiRecording.ondataavailable=e=>{if(e.data.size)wp65AiChunks.push(e.data)};wp65AiRecording.onstop=async()=>{btn.textContent='🎙';btn.classList.remove('recording');wp65AiStream?.getTracks().forEach(t=>t.stop());status.textContent='Ses yazıya çevriliyor…';try{if(!authUser)throw new Error('AUTH_REQUIRED');if(!(await v5LoadFunctionsSdk()))throw new Error('SDK');const blob=new Blob(wp65AiChunks,{type:wp65AiRecording.mimeType||'audio/webm'}),audioBase64=await wp65BlobToBase64(blob),callable=window.firebase.app().functions(V5_SECURITY.aiRegion||'us-central1').httpsCallable('transcribeAudio'),res=await callable({course:activeCourse,mimeType:blob.type,audioBase64});$('#aiChatInput').value=res?.data?.text||'';status.textContent='Metin hazır. Gönder’e bas.'}catch(e){status.textContent='Bulut ses tanıma kullanılamadı.';toast(e.message==='AUTH_REQUIRED'?'Ses tanıma için Google ile giriş yap.':'Ses yazıya çevrilemedi.')}finally{wp65AiRecording=null}};wp65AiRecording.start();btn.textContent='■';btn.classList.add('recording');status.textContent='Kaydediliyor… Bitirmek için tekrar dokun.';setTimeout(()=>{if(wp65AiRecording?.state==='recording')wp65AiRecording.stop()},10000)}catch(e){const msg=wp65MicMessage(e);status.textContent=msg;toast(msg)}
}
async function wp65StartPronunciation(){
  const btn=$('#pronunciationRecord'),result=$('#pronunciationResult');if(!btn)return;
  if(wp65AiRecognition){try{wp65AiRecognition.stop()}catch{}return}
  try{await wp65RunRecognition({button:btn,statusEl:$('#wp65MicDiagnosticText'),onText:spoken=>{const target=v5TargetText(),score=v5PronunciationScore(target,spoken),v5=v5Ensure();v5.pronunciation.push({target,spoken,score,at:new Date().toISOString()});v5.pronunciation=v5.pronunciation.slice(-50);adjustPoints(score>=80?12:score>=55?6:2);v5Save();result.hidden=false;result.className=`pronunciation-result ${score>=80?'good':score>=55?'mid':'low'}`;result.innerHTML=`<strong>%${score}</strong><div><b>${score>=80?'Çok iyi!':score>=55?'İyi başlangıç':'Bir kez daha dene'}</b><p>Algılanan: ${esc(spoken||'—')}</p></div>`;renderPronunciationLab()},onEnd:()=>wp65SetMicButton(btn,false)})}catch(e){wp65SetMicButton(btn,false)}
}
async function wp65MicDiagnostic(){
  const text=$('#wp65MicDiagnosticText');if(!text)return;text.textContent='Mikrofon izni kontrol ediliyor…';try{await wp65RequestMicrophone();const has=!!wp65RecognitionCtor();text.textContent=has?'Mikrofon izni açık ve canlı ses tanıma kullanılabilir.':'Mikrofon izni açık; bu tarayıcı canlı yazıya dökmeyi desteklemiyor.'}catch(e){text.textContent=wp65MicMessage(e)}
}
function wp65UpdateCounts(){
  COURSES.ru.displayCount=1500;COURSES.ru.actualCount=1500;COURSES.ru.countLabel='1500 kontrollü kelime ve ifade + A1–C2 Akademi';
  const card=document.querySelector('[data-course="ru"] small');if(card)card.textContent='Türkçe anlatımlı · 1500 kayıt + A1–C2 Akademi';
  const summary=$('#activeCourseSummary');if(summary&&activeCourse==='ru')summary.textContent='Русский · 1500 kontrollü kayıt + A1–C2 Akademi';
  document.querySelectorAll('.wp63-vocab-stats article:first-child b').forEach(x=>x.textContent='1500');
}
function setupV65Events(){
  wp65PolishHub();wp65UpdateCounts();
  const oldRenderQuestion=renderStudyQuestion;renderStudyQuestion=function(){wp65ResetQuestionVisuals();const out=oldRenderQuestion();requestAnimationFrame(wp65ResetQuestionVisuals);return out};
  const oldNext=nextStudy;nextStudy=function(){wp65ResetQuestionVisuals();return oldNext()};
  const oldUpdate=updateCourseUI;updateCourseUI=function(){const out=oldUpdate();wp65UpdateCounts();wp65ApplyFlags();return out};
  const oldDash=renderDashboard;renderDashboard=function(){const out=oldDash();wp65UpdateCounts();wp65ApplyFlags();return out};
  if(typeof wp62RenderLeagueTabs==='function'){const oldTabs=wp62RenderLeagueTabs;wp62RenderLeagueTabs=function(){const out=oldTabs();wp65ApplyFlags();return out}}
  v5StartPronunciation=wp65StartPronunciation;
  document.addEventListener('click',e=>{if(e.target.closest('#wp65AiMic')){wp65StartAiVoice();return}if(e.target.closest('#wp65AiStopSpeech')){speechSynthesis?.cancel();$('#wp65AiMicStatus').textContent='Ses durduruldu';return}if(e.target.closest('#wp65MicDiagnostic')){wp65MicDiagnostic();return}const speakBtn=e.target.closest('[data-wp65-speak-reply]');if(speakBtn){speak(speakBtn.dataset.wp65SpeakReply,v5VoiceLang());return}});
  document.addEventListener('change',e=>{const prefs=v5Ensure().preferences;if(e.target.id==='wp65AiLevel')prefs.aiLevel=e.target.value;else if(e.target.id==='wp65AiAutoSpeak')prefs.aiAutoSpeak=e.target.checked;else if(e.target.id==='wp65AiAutoSend')prefs.aiAutoSend=e.target.checked;else return;v5Save()});
  document.addEventListener('click',e=>{const tab=e.target.closest('[data-dashboard-tab]');if(tab){setTimeout(()=>{wp65UpdateHubSummary();if(window.innerWidth<=900)tab.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})},0)}});
}
function wp65AfterInit(){wp65UpdateCounts();wp65PolishHub();wp65ApplyFlags();renderAiCoach();}
