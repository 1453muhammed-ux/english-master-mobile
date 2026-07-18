/* WordPilot v8.0.0 Tester Beta
   Conversation Coach 4.0, instant language-pair switching and course-specific leagues.
   Existing progress keys remain unchanged. */
const WP80_VERSION='8.0.0';
const WP80_LEAGUE_SCHEMA=2;
const WP80_DEFAULT_PAUSE=5000;
const WP80_DEFAULT_RATE=.72;
let wp80Recognition=null;
let wp80Listening=false;
let wp80ManualStop=false;
let wp80FinalTranscript='';
let wp80InterimTranscript='';
let wp80SilenceTimer=null;
let wp80RestartTimer=null;
let wp80LastInputSource='typed';

const WP80_TEXT={
  tr:{close:'Kapat',swap:'Dilleri değiştir',pause:'Düşünme payı',speed:'Koçun hızı',pause25:'3 sn',pause4:'5 sn · önerilen',pause6:'8 sn',slow:'Çok yavaş',calm:'Yavaş · önerilen',normal:'Normal',fast:'Hızlı',listenReady:'Mikrofon hazır · konuşurken duraklayabilirsin',listening:'Dinliyorum… Düşünürken bekleyeceğim.',finishing:'Cevap hazırlanıyor…',ready:'Metin hazır. Kontrol edip Gönder’e bas.',sending:'Cevabın gönderiliyor…',micDenied:'Mikrofon izni verilmedi.',micUnsupported:'Bu tarayıcı canlı konuşma tanımayı desteklemiyor. Chrome kullan.',routeSaved:'Dil yönü anında değiştirildi.',same:'Ana dil ile öğrenme dili farklı olmalı.',coach:'Conversation Coach 4.0',coachDesc:'Duraklamalarını bekleyen, cevabının anlamına göre devam eden ve gerçek hataları ayrıntılı açıklayan konuşma öğretmeni.',voiceHint:'Konuşurken düşünebilirsin. Mikrofon kısa bir sessizlikte kapanmaz; bitirmek için mikrofona yeniden dokun.',strong:'Güçlü cevap',improve:'Geliştirilebilir',corrected:'Düzeltilmiş cümle',explanation:'Neden?',alternative:'Daha doğal alternatif',grammar:'Dil bilgisi',clarity:'Anlaşılırlık',fluency:'Akıcılık',spokenNote:'Konuşma yanıtlarında büyük harf ve noktalama hata olarak puanlanmaz.',courseLeague:'{course} kursu PP’si',legacy:'Bu kullanıcı henüz {course} kursuna özel PP verisini eşitlemedi.',you:'Sen',accuracy:'%{value} doğruluk',thinking:'WordPilot düşünüyor…'},
  en:{close:'Close',swap:'Swap languages',pause:'Thinking time',speed:'Coach speed',pause25:'3 sec',pause4:'5 sec · recommended',pause6:'8 sec',slow:'Very slow',calm:'Slow · recommended',normal:'Normal',fast:'Fast',listenReady:'Microphone ready · pauses are welcome',listening:'Listening… I will wait while you think.',finishing:'Preparing your answer…',ready:'Transcript ready. Review it and press Send.',sending:'Sending your answer…',micDenied:'Microphone permission was denied.',micUnsupported:'Live speech recognition is not supported here. Use Chrome.',routeSaved:'Language direction changed instantly.',same:'Native and target languages must be different.',coach:'Conversation Coach 4.0',coachDesc:'A speaking tutor that waits through pauses, follows the meaning of your answer and explains real mistakes in detail.',voiceHint:'Take your time while speaking. A short pause will not close the microphone; tap it again to finish.',strong:'Strong answer',improve:'Can be improved',corrected:'Corrected sentence',explanation:'Why?',alternative:'More natural alternative',grammar:'Grammar',clarity:'Clarity',fluency:'Fluency',spokenNote:'Capitalisation and punctuation are not scored as errors in spoken answers.',courseLeague:'{course} course PP',legacy:'This learner has not synced course-specific {course} PP yet.',you:'You',accuracy:'{value}% accuracy',thinking:'WordPilot is thinking…'},
  ru:{close:'Закрыть',swap:'Поменять языки',pause:'Пауза на размышление',speed:'Скорость тренера',pause25:'3 сек',pause4:'5 сек · рекомендуется',pause6:'8 сек',slow:'Очень медленно',calm:'Медленно · рекомендуется',normal:'Обычно',fast:'Быстро',listenReady:'Микрофон готов · можно делать паузы',listening:'Слушаю… Я подожду, пока вы думаете.',finishing:'Готовлю ответ…',ready:'Текст готов. Проверьте и нажмите «Отправить».',sending:'Отправляю ответ…',micDenied:'Нет разрешения на микрофон.',micUnsupported:'Браузер не поддерживает распознавание речи. Используйте Chrome.',routeSaved:'Языковое направление изменено.',same:'Родной и изучаемый языки должны отличаться.',coach:'Conversation Coach 4.0',coachDesc:'Тренер, который ждёт паузы, продолжает разговор по смыслу ответа и подробно объясняет реальные ошибки.',voiceHint:'Говорите не спеша. Короткая пауза не выключит микрофон; нажмите ещё раз, чтобы закончить.',strong:'Хороший ответ',improve:'Можно улучшить',corrected:'Исправленное предложение',explanation:'Почему?',alternative:'Более естественный вариант',grammar:'Грамматика',clarity:'Понятность',fluency:'Беглость',spokenNote:'В устных ответах регистр и пунктуация не считаются ошибками.',courseLeague:'PP курса {course}',legacy:'Пользователь ещё не синхронизировал PP курса {course}.',you:'Вы',accuracy:'Точность {value}%',thinking:'WordPilot думает…'},
  uz:{close:'Yopish',swap:'Tillarni almashtirish',pause:'O‘ylash vaqti',speed:'Murabbiy tezligi',pause25:'3 soniya',pause4:'5 soniya · tavsiya',pause6:'8 soniya',slow:'Juda sekin',calm:'Sekin · tavsiya',normal:'Normal',fast:'Tez',listenReady:'Mikrofon tayyor · pauza qilishingiz mumkin',listening:'Tinglayapman… O‘ylashingizni kutaman.',finishing:'Javob tayyorlanmoqda…',ready:'Matn tayyor. Tekshirib, Yuborish tugmasini bosing.',sending:'Javob yuborilmoqda…',micDenied:'Mikrofon ruxsati berilmadi.',micUnsupported:'Bu brauzer nutqni tanimaydi. Chrome’dan foydalaning.',routeSaved:'Til yo‘nalishi darhol o‘zgartirildi.',same:'Ona tili va o‘rganiladigan til boshqa bo‘lishi kerak.',coach:'Conversation Coach 4.0',coachDesc:'Pauzalarni kutadigan, javob mazmuniga qarab suhbatni davom ettiradigan va haqiqiy xatolarni batafsil tushuntiradigan murabbiy.',voiceHint:'Shoshilmay gapiring. Qisqa pauzada mikrofon yopilmaydi; tugatish uchun yana bosing.',strong:'Yaxshi javob',improve:'Yaxshilash mumkin',corrected:'Tuzatilgan gap',explanation:'Nega?',alternative:'Tabiiyroq variant',grammar:'Grammatika',clarity:'Aniqlik',fluency:'Ravonlik',spokenNote:'Og‘zaki javoblarda bosh harf va tinish belgilari xato sifatida baholanmaydi.',courseLeague:'{course} kurs PP',legacy:'Bu foydalanuvchi {course} kursi PP ma’lumotini hali sinxronlamagan.',you:'Siz',accuracy:'%{value} aniqlik',thinking:'WordPilot o‘ylamoqda…'}
};
function wp80T(key,vars={}){const lang=WP80_TEXT[wp71LanguageProfile?.ui]?wp71LanguageProfile.ui:'en';let text=WP80_TEXT[lang][key]||WP80_TEXT.en[key]||key;Object.entries(vars).forEach(([k,v])=>text=text.replaceAll(`{${k}}`,String(v)));return text}
function wp80Prefs(){const p=v5Ensure().preferences;p.coachPauseMs=Math.max(3000,Math.min(8000,Number(p.coachPauseMs)||WP80_DEFAULT_PAUSE));p.coachRate=Math.max(.6,Math.min(1.05,Number(p.coachRate)||WP80_DEFAULT_RATE));return p}
function wp80BrandShell(){const version=$('.version');if(version)version.textContent='v9.2.0 · Tester Beta';const hero=$('#wp71ConversationSpotlight');if(hero){const h=hero.querySelector('h2'),d=hero.querySelector('[data-wp71="description"]');if(h)h.textContent=wp80T('coach');if(d)d.textContent=wp80T('coachDesc')}const eye=$('#view-ai .section-title .eyebrow');if(eye)eye.textContent='CONVERSATION COACH 4.0';const pairIcon=$('#wp71PairButton em');if(pairIcon)pairIcon.textContent='⇄'}
const wp80PreviousApplyShell=wp711ApplyShell;
wp711ApplyShell=function(){const out=wp80PreviousApplyShell();wp80BrandShell();return out};
wp71ApplyInterfaceText=wp711ApplyShell;

/* ---------- Language route: full lists, close button, one-tap swap, no reload ---------- */
wp71LanguageOptions=function(selected){return WP711_LANGS.map(id=>{const l=wp71Lang(id),beta=['en','tr','ru','uz','es'].includes(id)?'':` · ${wp711T('beta')}`;return `<option value="${id}" ${id===selected?'selected':''}>${l.flag} ${l.native}${beta}</option>`}).join('')};
wp71EnsureOnboarding=function(){
  $('#wp71Onboarding')?.remove();
  document.body.insertAdjacentHTML('beforeend',`<dialog id="wp71Onboarding" class="modal wp71-onboarding wp711-onboarding wp80-route-dialog">
    <button class="wp80-route-close" type="button" data-wp80-route-close aria-label="${wp80T('close')}" title="${wp80T('close')}">×</button>
    <div class="wp71-onboarding-brand"><span>W</span><div><p class="eyebrow">WORDPILOT 8.0</p><h2>${wp711T('routeTitle')}</h2><p>${wp711T('routeDesc')}</p></div></div>
    <div class="wp80-language-pair">
      <label><span>${wp711T('native')}</span><select id="wp71SupportLanguage">${wp71LanguageOptions(wp71Support())}</select><small>${wp711T('selectNative')}</small></label>
      <button id="wp80SwapLanguages" class="wp80-swap-languages" type="button" title="${wp80T('swap')}" aria-label="${wp80T('swap')}"><span>⇄</span><small>${wp80T('swap')}</small></button>
      <label><span>${wp711T('target')}</span><select id="wp71TargetLanguage">${wp71LanguageOptions(wp71Target())}</select><small>${wp711T('selectTarget')}</small></label>
      <select id="wp71UiLanguage" hidden aria-hidden="true"><option value="${wp71Support()}" selected>${wp71Support()}</option></select>
    </div>
    <fieldset class="wp71-experience"><legend>${wp711T('standard')}</legend><label class="active"><input type="radio" name="wp71Experience" value="standard" checked><span>🧭</span><div><b>${wp711T('standard')}</b><small>${wp711T('standardDesc')}</small></div></label><label class="planned"><input type="radio" name="wp71Experience" value="junior" disabled><span>🚀</span><div><b>${wp711T('junior')}</b><small>${wp711T('juniorDesc')}</small></div></label></fieldset>
    <div class="wp71-legal-note"><b>Commercial Clean</b><span>${wp711T('legal')}</span></div>
    <button id="wp71SaveLanguageProfile" class="primary wide" type="button">${wp711T('save')}</button>
  </dialog>`);
};
wp71RefreshOnboardingOptions=function(){const support=$('#wp71SupportLanguage'),target=$('#wp71TargetLanguage'),ui=$('#wp71UiLanguage');if(!support||!target)return;if(ui)ui.innerHTML=`<option value="${support.value}" selected>${support.value}</option>`};
async function wp80ApplyLanguageRoute(){
  const support=$('#wp71SupportLanguage')?.value,target=$('#wp71TargetLanguage')?.value;
  if(!WP711_LANGS.includes(support)||!COURSES[target])return;
  if(support===target){toast(wp80T('same'));return}
  const targetChanged=activeCourse!==target;
  wp71SaveLanguageProfile({ui:support,support,target,experience:'standard'});
  wp71LanguageProfile.ui=support;wp71LanguageProfile.support=support;wp71LanguageProfile.target=target;
  if(typeof wp62LeagueCourse!=='undefined'){wp62LeagueCourse=target;try{localStorage.setItem(WP62_LEAGUE_KEY,target)}catch{}}
  courseWordCache={};
  try{
    if(targetChanged)await switchCourse(target);
    else{activeCourse=target;profile.activeCourse=target;state=readLocalState(profile.email,target)||cloudCourseStates[target]||state||defaultState();await loadCourseWords(target);updateCourseUI();renderAll();renderWords(true)}
    wp711ApplyShell();wp712ApplyHubTranslations();wp712RefreshFlags();wp71UpdatePairUI();renderAiCoach();
    $('#wp71Onboarding')?.close();save({cloud:false});if(authUser)scheduleCloudSync(80);toast(wp80T('routeSaved'));
  }catch(error){console.error('Language route switch error',error);toast('Dil yönü değiştirilemedi. Tekrar dene.')}
}

/* ---------- Conversation Coach 4.0 controls and patient microphone ---------- */
function wp80EnsureCoachControls(){
  const head=$('.wp65-ai-head-tools');if(head&&!$('#wp80CoachRate'))head.insertAdjacentHTML('beforeend',`<label class="wp80-coach-select">${wp80T('speed')}<select id="wp80CoachRate"><option value="0.65">${wp80T('slow')}</option><option value="0.72">${wp80T('calm')}</option><option value="0.88">${wp80T('normal')}</option><option value="1">${wp80T('fast')}</option></select></label>`);
  const form=$('#aiChatForm');if(form&&!$('#wp80SilenceDelay'))form.insertAdjacentHTML('beforebegin',`<div class="wp80-listening-bar"><span>🎙</span><p>${wp80T('voiceHint')}</p><label>${wp80T('pause')}<select id="wp80SilenceDelay"><option value="3000">${wp80T('pause25')}</option><option value="5000">${wp80T('pause4')}</option><option value="8000">${wp80T('pause6')}</option></select></label></div>`);
  const prefs=wp80Prefs();if($('#wp80SilenceDelay'))$('#wp80SilenceDelay').value=String(prefs.coachPauseMs);if($('#wp80CoachRate'))$('#wp80CoachRate').value=String(prefs.coachRate);
  const eye=$('#view-ai .section-title .eyebrow');if(eye)eye.textContent='CONVERSATION COACH 4.0';const pairIcon=$('#wp71PairButton em');if(pairIcon)pairIcon.textContent='⇄';const title=$('#view-ai .section-title h1');if(title)title.textContent=wp80T('coach');const desc=$('#view-ai .section-title .muted');if(desc)desc.textContent=wp80T('coachDesc');
  const hero=$('#wp71ConversationSpotlight');if(hero){hero.querySelector('h2').textContent=wp80T('coach');hero.querySelector('[data-wp71="description"]').textContent=wp80T('coachDesc')}
  const status=$('#wp65AiMicStatus');if(status&&!wp80Listening)status.textContent=wp80T('listenReady');const version=$('.version');if(version)version.textContent='v9.2.0 · Tester Beta';
}
function wp80SetMicUi(active){const btn=$('#wp65AiMic');if(!btn)return;btn.classList.toggle('recording',active);btn.textContent=active?'■':'🎙';btn.setAttribute('aria-label',active?wp80T('close'):wp80T('listenReady'))}
function wp80ClearSpeechTimers(){clearTimeout(wp80SilenceTimer);clearTimeout(wp80RestartTimer);wp80SilenceTimer=null;wp80RestartTimer=null}
function wp80Transcript(){return `${wp80FinalTranscript} ${wp80InterimTranscript}`.replace(/\s+/g,' ').trim()}
function wp80ScheduleSilenceFinish(){clearTimeout(wp80SilenceTimer);if(!wp80Listening||!wp80Transcript())return;wp80SilenceTimer=setTimeout(()=>wp80FinishListening(true),wp80Prefs().coachPauseMs)}
function wp80CreateRecognition(){
  const Ctor=wp65RecognitionCtor();if(!Ctor)return null;
  const rec=new Ctor();rec.lang=v5VoiceLang();rec.interimResults=true;rec.maxAlternatives=5;rec.continuous=true;
  rec.onresult=event=>{
    let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i][0]?.transcript||'';if(event.results[i].isFinal)wp80FinalTranscript+=`${text} `;else interim+=`${text} `}
    wp80InterimTranscript=interim;const input=$('#aiChatInput');if(input)input.value=wp80Transcript();const status=$('#wp65AiMicStatus');if(status)status.textContent=wp80T('listening');wp80ScheduleSilenceFinish();
  };
  rec.onerror=event=>{if(['aborted','no-speech'].includes(event.error))return;if(event.error==='not-allowed'||event.error==='service-not-allowed'){wp80Listening=false;wp80ManualStop=true;wp80ClearSpeechTimers();wp80SetMicUi(false);const status=$('#wp65AiMicStatus');if(status)status.textContent=wp80T('micDenied');toast(wp80T('micDenied'))}else console.warn('Speech recognition',event.error)};
  rec.onend=()=>{if(wp80Listening&&!wp80ManualStop){wp80RestartTimer=setTimeout(()=>{if(!wp80Listening)return;wp80Recognition=wp80CreateRecognition();try{wp80Recognition?.start()}catch{}},220)}else{wp80Recognition=null;wp80SetMicUi(false)}};
  return rec;
}
async function wp80StartListening(){
  if(wp80Listening){wp80FinishListening(false);return}
  if(!wp65RecognitionCtor()){toast(wp80T('micUnsupported'));return}
  try{speechSynthesis?.cancel();await wp65RequestMicrophone()}catch(error){const text=wp65MicMessage(error);$('#wp65AiMicStatus').textContent=text;toast(text);return}
  wp80ClearSpeechTimers();wp80Listening=true;wp80ManualStop=false;wp80FinalTranscript='';wp80InterimTranscript='';wp80SetMicUi(true);$('#wp65AiMicStatus').textContent=wp80T('listening');wp80Recognition=wp80CreateRecognition();
  try{wp80Recognition.start()}catch(error){wp80Listening=false;wp80SetMicUi(false);toast(wp80T('micUnsupported'))}
}
function wp80FinishListening(fromSilence=false){
  if(!wp80Listening)return;wp80Listening=false;wp80ManualStop=true;wp80ClearSpeechTimers();try{wp80Recognition?.stop()}catch{}wp80SetMicUi(false);
  const input=$('#aiChatInput'),value=(input?.value||wp80Transcript()).trim(),status=$('#wp65AiMicStatus');wp80InterimTranscript='';
  if(!value){if(status)status.textContent=wp80T('listenReady');return}
  const auto=$('#wp65AiAutoSend')?.checked;if(status)status.textContent=auto?wp80T('sending'):wp80T('ready');
  if(auto&&!v5AiBusy)setTimeout(()=>{const text=input?.value.trim();if(text){input.value='';wp80LastInputSource='voice';v5SendAiMessage(text,{source:'voice'}).finally(()=>{wp80LastInputSource='typed'})}},fromSilence?700:350);
}

/* ---------- Better local language feedback ---------- */
function wp80UniqueWords(text=''){return String(text).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[]}
function wp80DetailedEvaluation(message,mode=wp71CoachMode(),source=wp80LastInputSource){
  const raw=String(message||'').replace(/\s+/g,' ').trim(),course=activeCourse,spoken=source==='voice';let corrected=raw,alternative='',issues=[],major=false;
  if(course==='tr'){
    if(/ele\s+hazırla(?:yayım|yım)|ele\s+hazırlayayım/i.test(corrected)){corrected=corrected.replace(/ele\s+hazırla(?:yayım|yım)|ele\s+hazırlayayım/ig,'Elazığ');issues.push('Ses tanıma “Elazığ” özel adını yanlış algılamış olabilir.');major=true}
    if(/sadece\s+türkçe\s+konuşabiliyorum[\s,.]*(?:az\s+az|biraz).*\bgen\b.*biraz/i.test(corrected)){corrected='Şu anda sadece Türkçe konuşabiliyorum. İngilizceyi ise biraz biliyorum.';alternative='Şimdilik Türkçe konuşabiliyorum; İngilizcem ise başlangıç seviyesinde.';issues.push('İkinci düşünce yarım kalmıştı; hangi dili biraz bildiğin açıklaştırıldı.','“Biraz” sözcüğünün gereksiz tekrarı kaldırıldı.');major=true}
    corrected=corrected.replace(/\baz\s+az\b/gi,'biraz').replace(/\b(yani\s+){2,}/gi,'yani ');
    if(/\b(\p{L}+)\s+\1\b/iu.test(corrected)){corrected=corrected.replace(/\b(\p{L}+)\s+\1\b/giu,'$1');issues.push('Arka arkaya tekrarlanan sözcük kaldırıldı.')}
    if(/^elazığ(?:\s|,)/i.test(corrected)&&/türkiye['’]nin bir ili/i.test(corrected)){corrected='Elazığ, Türkiye’nin bir ilidir.';alternative='Elazığ, Türkiye’de bulunan bir şehirdir.';issues.push('Özel addan sonra kısa bir duraklama eklenerek cümle daha doğal kuruldu.');major=true}
  }else if(course==='en'){
    const before=corrected;corrected=corrected.replace(/\bi\b/g,'I').replace(/\bI am agree\b/gi,'I agree').replace(/\bI have (\d+) years(?: old)?\b/gi,'I am $1 years old').replace(/\bI didn't went\b/gi,"I didn't go").replace(/\bYesterday I go\b/gi,'Yesterday I went').replace(/\bI like swim\b/gi,'I like swimming').replace(/\bI can speak English a little little\b/gi,'I can speak a little English');if(corrected!==before){issues.push('The verb form or word order was adjusted to standard English.');major=true}
  }else if(course==='ru'&&!/[а-яё]/i.test(raw)){issues.push('Rusça pratik için Kiril alfabesiyle cevap vermelisin.');major=true}
  if(!spoken&&corrected){if(/^[\p{Ll}]/u.test(corrected)){corrected=corrected.charAt(0).toLocaleUpperCase(WP711_META[course]?.voice||'en-US')+corrected.slice(1);issues.push('Cümle başlangıcı büyük harfle yazıldı.')}if(!/[.!?。！？]$/.test(corrected)){corrected+=['ja','zh'].includes(course)?'。':'.';issues.push('Cümle sonu işareti eklendi.')}}
  const words=wp80UniqueWords(raw),unique=new Set(words),repetition=words.length?1-unique.size/words.length:0;if(repetition>.28&&!issues.some(x=>/tekrar/i.test(x))){issues.push(wp71Support()==='tr'?'Aynı sözcükler sık tekrarlandığı için cümle akıcılığı azaldı.':'Repeated words reduced fluency.');}
  if(words.length<3){issues.push(wp71Support()==='tr'?'Cevap çok kısa kaldı; bir neden veya örnek eklemek konuşmayı geliştirir.':'The answer is very short; add a reason or example.');}
  if(spoken&&issues.length===0&&corrected!==raw)corrected=raw;
  if(!alternative&&corrected!==raw)alternative=corrected;
  const onlyMechanics=issues.length>0&&issues.every(x=>/büyük|işareti|capital|punctuation/i.test(x));
  if(spoken&&onlyMechanics)issues=[];
  if(mode==='fluency'&&!major&&issues.length<=1){issues=[];corrected=raw;alternative=''}
  const clarity=Math.max(45,Math.min(100,96-(major?18:0)-Math.min(20,repetition*60)-(words.length<3?12:0))),grammar=Math.max(45,Math.min(100,97-(major?22:0)-issues.length*3)),fluency=Math.max(45,Math.min(100,96-Math.min(30,repetition*80)-(words.length<3?15:0)));
  const score=Math.round((clarity+grammar+fluency)/3),status=issues.length?'needs_work':'correct';
  let explanation=status==='correct'?(wp71Support()==='tr'?'Cümlen anlaşılır, doğal ve bağlama uygun.':'Your answer is clear, natural and relevant.'):issues.slice(0,3).join(' ');
  const note=spoken?wp80T('spokenNote'):'';
  return {status,corrected:corrected||raw,explanation,suggestion:alternative,errorType:major?'grammar':issues.length?'fluency':'none',note,score,metrics:{grammar,clarity,fluency},issues,source:spoken?'voice':'typed'};
}
function wp80ContextQuestion(message,history){
  const m=String(message||'').toLocaleLowerCase(),lang=activeCourse,candidates=[];
  const q={
    tr:{language:'Peki öğrenmek istediğin ilk yabancı dil hangisi ve onu nerede kullanmak istiyorsun?',place:'Oranın en sevdiğin özelliği nedir?',work:'İşinde veya eğitiminde en çok hangi konuyu geliştirmek istiyorsun?',reason:'Bunun senin için önemli olmasının nedeni nedir?',detail:'Bunu kısa bir örnekle biraz daha anlatabilir misin?'},
    en:{language:'Which language would you most like to learn, and where would you use it?',place:'What do you like most about that place?',work:'Which skill would you most like to improve for work or study?',reason:'Why is that important to you?',detail:'Could you give me one short example?'},
    ru:{language:'Какой иностранный язык вы хотите выучить и где будете его использовать?',place:'Что вам больше всего нравится в этом месте?',work:'Какой навык вы хотите улучшить для работы или учёбы?',reason:'Почему это важно для вас?',detail:'Можете привести короткий пример?'},
    uz:{language:'Qaysi chet tilini o‘rganishni xohlaysiz va uni qayerda ishlatasiz?',place:'Bu joyning sizga eng yoqadigan tomoni nima?',work:'Ish yoki o‘qish uchun qaysi ko‘nikmani rivojlantirmoqchisiz?',reason:'Bu siz uchun nega muhim?',detail:'Qisqa misol keltira olasizmi?'}
  }[lang]||null;
  if(q){if(/dil|türkçe|ingiliz|rusça|özbek|english|russian|language|язык|til/i.test(m))candidates.push(q.language);if(/türkiye|şehir|il\b|ülke|city|country|город|страна|shahar|mamlakat/i.test(m))candidates.push(q.place);if(/iş|okul|üniversite|work|study|работ|уч|ish|o‘q/i.test(m))candidates.push(q.work);if(/çünkü|neden|önem|because|important|потому|важ|chunki|muhim/i.test(m))candidates.push(q.reason);candidates.push(q.detail)}
  candidates.push(...wp71Questions(lang,v5AiScenario));const asked=wp71AskedSet(history);return candidates.find(x=>{if(!x)return false;const q=String(x).trim().toLocaleLowerCase();return ![...asked].some(a=>a.includes(q)||q.includes(a))})||wp71NextQuestion(history,lang,v5AiScenario);
}
function wp80Acknowledgement(){return {tr:'Anladım.',en:'I see.',ru:'Понимаю.',uz:'Tushundim.',es:'Entiendo.',de:'Verstanden.',fr:'Je comprends.',it:'Capisco.',pt:'Entendo.',ja:'分かりました。',ko:'알겠습니다.',zh:'明白了。'}[activeCourse]||'I see.'}
v5LocalCoachReply=function(message,options={}){const history=v5HistoryForScenario(),evaluation=wp80DetailedEvaluation(message,wp71CoachMode(),options.source||wp80LastInputSource),question=wp80ContextQuestion(message,history);return {...evaluation,text:`${wp80Acknowledgement()} ${question}`,mode:'local-v80'}};
wp71FeedbackHtml=function(feedback){
  if(!feedback)return'';const good=feedback.status==='correct',m=feedback.metrics||{},metricHtml=m.grammar?`<div class="wp80-feedback-metrics"><span><small>${wp80T('grammar')}</small><b>${Math.round(m.grammar)}</b></span><span><small>${wp80T('clarity')}</small><b>${Math.round(m.clarity)}</b></span><span><small>${wp80T('fluency')}</small><b>${Math.round(m.fluency)}</b></span></div>`:'';
  return `<div class="wp71-feedback wp80-feedback ${good?'good':'needs-work'}"><div class="wp71-feedback-head"><b>${good?'✓ '+wp80T('strong'):'● '+wp80T('improve')}</b>${feedback.score?`<span>${Math.round(feedback.score)}/100</span>`:''}</div>${!good&&feedback.corrected?`<p><small>${wp80T('corrected')}</small><mark>${esc(feedback.corrected)}</mark></p>`:''}${feedback.explanation?`<p><small>${wp80T('explanation')}</small>${esc(feedback.explanation)}</p>`:''}${feedback.suggestion&&feedback.suggestion!==feedback.corrected?`<p class="alternative"><small>${wp80T('alternative')}</small>${esc(feedback.suggestion)}</p>`:''}${metricHtml}${feedback.note?`<aside>ℹ ${esc(feedback.note)}</aside>`:''}</div>`;
};
const wp80PreviousRenderAiCoach=renderAiCoach;
renderAiCoach=function(){wp80PreviousRenderAiCoach();wp80EnsureCoachControls()};
v5CloudAi=async function(history,message){
  if(!authUser||!fbAuth)throw new Error('AUTH_REQUIRED');if(!(await v5LoadFunctionsSdk()))throw new Error('SDK_UNAVAILABLE');
  const callable=window.firebase.app().functions(V5_SECURITY.aiRegion||'us-central1').httpsCallable('aiCoach'),level=$('#wp65AiLevel')?.value||'A1';
  const response=await callable({course:activeCourse,supportLanguage:wp71Support(),correctionMode:wp71CoachMode(),level,scenario:v5AiScenario,message,inputSource:wp80LastInputSource||'typed',history:history.slice(-30).map(x=>({role:x.role,text:x.text}))});return response?.data||{};
};
v5SendAiMessage=async function(message,options={}){
  const history=v5HistoryForScenario(),source=options.source||wp80LastInputSource||'typed';history.push({role:'user',text:message,source,at:new Date().toISOString()});renderAiCoach();v5AiBusy=true;const input=$('#aiChatInput');if(input)input.disabled=true;
  const messages=$('#aiChatMessages');if(messages){messages.insertAdjacentHTML('beforeend',`<article id="wp80Thinking" class="ai-message assistant wp80-thinking"><span>WP</span><div><p><i></i><i></i><i></i> ${wp80T('thinking')}</p></div></article>`);messages.scrollTop=messages.scrollHeight}
  let reply;try{if(V5_SECURITY.aiEnabled)reply=await v5CloudAi(history,message);else throw new Error('LOCAL')}catch(error){reply=v5LocalCoachReply(message,{source});if(error?.message==='AUTH_REQUIRED')reply.note=(wp71Support()==='tr'?'Gelişmiş bulut AI için bir hesapla giriş gerekir.':'Cloud AI requires a connected account.')}
  await new Promise(resolve=>setTimeout(resolve,V5_SECURITY.aiEnabled?120:420));$('#wp80Thinking')?.remove();
  const localFallback=wp80DetailedEvaluation(message,wp71CoachMode(),source),feedback={status:reply.status||localFallback.status,corrected:reply.corrected||localFallback.corrected,explanation:reply.explanation||reply.correction||localFallback.explanation,suggestion:reply.suggestion||localFallback.suggestion,errorType:reply.errorType||reply.error_type||localFallback.errorType,note:reply.note||localFallback.note,score:Number(reply.score)||localFallback.score,metrics:reply.metrics||localFallback.metrics,source};
  history.push({role:'assistant',text:reply.text||wp80ContextQuestion(message,history),feedback,mode:reply.mode||'local-v80',at:new Date().toISOString()});while(history.length>80)history.shift();v5AiBusy=false;if(input){input.disabled=false;input.focus()}v5Save();renderAiCoach();if($('#wp65AiAutoSpeak')?.checked)speak(reply.text||'',v5VoiceLang(),{rate:wp80Prefs().coachRate,course:activeCourse});
};

/* ---------- Course-specific league schema ---------- */
function wp80CoursePointMap(){
  const states=courseStatesFor(),out={};COURSE_IDS.forEach(id=>{const st=states[id]||defaultState(),all=periodTotalsForState(st,'all'),daily=periodTotalsForState(st,'daily'),weekly=periodTotalsForState(st,'weekly'),monthly=periodTotalsForState(st,'monthly');out[id]={points:Math.max(0,Math.round(all.points)),dailyPoints:Math.max(0,Math.round(daily.points)),weeklyPoints:Math.max(0,Math.round(weekly.points)),monthlyPoints:Math.max(0,Math.round(monthly.points)),answers:Math.max(0,Math.round(all.answers)),accuracy:all.answers?Math.round(all.correct/all.answers*100):0}});return out;
}
function wp80LeagueCourse(){return typeof wp62LeagueCourse!=='undefined'&&COURSES[wp62LeagueCourse]?wp62LeagueCourse:activeCourse}
function wp80LeaguePeriodField(period=leaderboardPeriod){return period==='daily'?'dailyPoints':period==='weekly'?'weeklyPoints':period==='monthly'?'monthlyPoints':'points'}
function wp80CourseScore(row,course=wp80LeagueCourse(),period=leaderboardPeriod){return Math.max(0,Math.round(Number(row?.coursePoints?.[course]?.[wp80LeaguePeriodField(period)])||0))}
leaderboardCloudPayload=function(){if(!authUser)return null;const publicName=accountDisplayName(profile?.name,authUser),scores=leaderboardScores(),c=aggregateCounts(),tot=aggregateTotals('all'),coursePoints=wp80CoursePointMap();return {uid:authUser.uid,name:publicName,friendCode:ownFriendCode(authUser.uid),...scores,coursePoints,leagueSchema:WP80_LEAGUE_SCHEMA,photoURL:authUser.photoURL||profile?.photoURL||'',streak:globalStreak(),memorized:c.memorized,learn:c.learn,hard:c.hard,wrong:c.wrong,favorite:c.favorite,answers:tot.answers,accuracy:tot.answers?Math.round(tot.correct/tot.answers*100):0,activeCourse,clientUpdatedAt:new Date().toISOString(),updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()}};
currentLeaderboardRow=function(){if(!authUser)return null;const payload=leaderboardCloudPayload();if(!payload)return null;const {updatedAt,...row}=payload;return row};
updateLeaderboardEntry=function(){let board=[];try{board=JSON.parse(localStorage.getItem(LEADERBOARD_KEY))||[]}catch{}const email=(profile?.email||'guest@local').toLowerCase(),scores=leaderboardScores(),c=aggregateCounts(),tot=aggregateTotals('all'),coursePoints=wp80CoursePointMap(),entry={name:accountDisplayName(),email,friendCode:authUser?.uid?ownFriendCode(authUser.uid):'',...scores,coursePoints,leagueSchema:WP80_LEAGUE_SCHEMA,photoURL:profile?.photoURL||'',streak:globalStreak(),memorized:c.memorized,learn:c.learn,hard:c.hard,wrong:c.wrong,favorite:c.favorite,answers:tot.answers,accuracy:tot.answers?Math.round(tot.correct/tot.answers*100):0,updated:new Date().toISOString()};const index=board.findIndex(x=>x.email===email);if(index>=0)board[index]={...board[index],...entry};else board.push(entry);board=board.sort((a,b)=>wp80CourseScore(b,activeCourse)-wp80CourseScore(a,activeCourse)||String(a.name).localeCompare(String(b.name),'tr')).slice(0,100);localStorage.setItem(LEADERBOARD_KEY,JSON.stringify(board))};
leagueScore=function(row,period=leaderboardPeriod){return wp80CourseScore(row,wp80LeagueCourse(),period)};
leagueLabel=function(period=leaderboardPeriod){const leagueCourse=wp80LeagueCourse(),course=COURSES[leagueCourse]?.name||leagueCourse,periodText=period==='daily'?(wp71LanguageProfile.ui==='tr'?'bugünkü':'today’s'):period==='weekly'?(wp71LanguageProfile.ui==='tr'?'bu haftaki':'this week’s'):period==='monthly'?(wp71LanguageProfile.ui==='tr'?'bu ayki':'this month’s'):(wp71LanguageProfile.ui==='tr'?'toplam':'total');return `${course} · ${periodText} PP`};
renderLeaderboardRows=function(board,currentKey){
  const list=$('#leaderboardList');if(!list)return;const rows=(board||[]).slice().sort((a,b)=>leagueScore(b)-leagueScore(a)||String(a.name||'').localeCompare(String(b.name||''),'tr')).slice(0,100);renderLeagueSummary(rows,currentKey);const leagueCourse=wp80LeagueCourse(),course=COURSES[leagueCourse]?.name||leagueCourse;
  list.innerHTML=rows.map((x,i)=>{const isCurrent=(x.uid&&x.uid===currentKey)||(!x.uid&&String(x.email||'').toLowerCase()===String(currentKey||'').toLowerCase()),medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'',has=!!x.coursePoints?.[leagueCourse],accuracy=Number(x.coursePoints?.[leagueCourse]?.accuracy)||0,detail=has?(isCurrent?`${wp80T('you')} · ${COURSES[leagueCourse].short} ${wp80T('accuracy',{value:accuracy})}`:`${COURSES[leagueCourse].short} · ${wp80T('accuracy',{value:accuracy})}`):wp80T('legacy',{course});return `<div class="leaderboard-row ${isCurrent?'current':''} ${i<3?'top-rank':''} ${has?'':'legacy-score'}"><span class="rank">${medal||i+1}</span>${leaderAvatar(x)}<div><b>${esc(x.name||'Öğrenci')}</b><small>${esc(detail)}</small></div><strong>${leagueScore(x)}<small>PP</small></strong></div>`}).join('')||'<p class="muted">Bu kursta henüz puan kaydı yok.</p>';
};
refreshCloudLeaderboard=async function(force=false){
  if(!authUser||!fbDb)return;const course=wp80LeagueCourse(),cacheKey=`${course}:${leaderboardAudience}:${leaderboardPeriod}`;
  if(leaderboardAudience==='world'){
    if(!force&&leaderboardUnsubscribe&&leaderboardRealtimeKey===cacheKey)return;stopLeaderboardRealtime();leaderboardRealtimeKey=cacheKey;
    const query=fbDb.collection('leaderboard').limit(250);leaderboardUnsubscribe=query.onSnapshot({includeMetadataChanges:true},snap=>{const rows=mergeOwnLeaderboardRow(snap.docs.map(doc=>({uid:doc.id,...doc.data()})));cloudLeaderboardCache[cacheKey]=rows;setLeagueSyncStatus(snap.metadata.hasPendingWrites?'PP eşitleniyor…':snap.metadata.fromCache?'Çevrimdışı liste':'Canlı güncel ✓',snap.metadata.hasPendingWrites?'syncing':snap.metadata.fromCache?'idle':'ok');if($('#view-league')?.classList.contains('active')&&course===wp80LeagueCourse())renderLeaderboardRows(rows,authUser.uid)},error=>{console.error('Leaderboard realtime error',error);setLeagueSyncStatus('Lig bağlantısı kurulamadı','error');if($('#leaderboardList'))$('#leaderboardList').innerHTML='<p class="muted">Sıralama şu an yüklenemedi.</p>'});return;
  }
  stopLeaderboardRealtime();if(leaderboardFetch)return leaderboardFetch;leaderboardFetch=(async()=>{try{const codes=friendCodes(),queries=codes.map(code=>fbDb.collection('leaderboard').where('friendCode','==',code).limit(1).get()),ownPromise=fbDb.collection('leaderboard').doc(authUser.uid).get(),results=await Promise.all([...queries,ownPromise]);let rows=[];results.slice(0,-1).forEach(snap=>snap.docs.forEach(doc=>rows.push({uid:doc.id,...doc.data()})));const own=results.at(-1);if(own.exists)rows.push({uid:own.id,...own.data()});rows=mergeOwnLeaderboardRow([...new Map(rows.map(row=>[row.uid,row])).values()]);cloudLeaderboardCache[cacheKey]=rows;if(course===wp80LeagueCourse())renderLeaderboardRows(rows,authUser.uid)}catch(error){console.error('Leaderboard error',error);if($('#leaderboardList'))$('#leaderboardList').innerHTML='<p class="muted">Sıralama şu an yüklenemedi.</p>'}finally{leaderboardFetch=null}})();return leaderboardFetch;
};

function setupV80Events(){
  wp71EnsureOnboarding();
  document.addEventListener('click',event=>{
    const close=event.target.closest('[data-wp80-route-close]');if(close){event.preventDefault();event.stopImmediatePropagation();$('#wp71Onboarding')?.close();return}
    const swap=event.target.closest('#wp80SwapLanguages');if(swap){event.preventDefault();event.stopImmediatePropagation();const a=$('#wp71SupportLanguage'),b=$('#wp71TargetLanguage');if(a&&b){const value=a.value;a.value=b.value;b.value=value;$('#wp71UiLanguage').innerHTML=`<option value="${a.value}" selected>${a.value}</option>`}return}
    const saveBtn=event.target.closest('#wp71SaveLanguageProfile');if(saveBtn){event.preventDefault();event.stopImmediatePropagation();wp80ApplyLanguageRoute();return}
    const mic=event.target.closest('#wp65AiMic');if(mic){event.preventDefault();event.stopImmediatePropagation();wp80StartListening();return}
    const speakBtn=event.target.closest('[data-wp65-speak-reply]');if(speakBtn){event.preventDefault();event.stopImmediatePropagation();speak(speakBtn.dataset.wp65SpeakReply,v5VoiceLang(),{rate:wp80Prefs().coachRate,course:activeCourse});return}
  },true);
  document.addEventListener('change',event=>{const prefs=wp80Prefs();if(event.target.id==='wp80SilenceDelay'){prefs.coachPauseMs=Number(event.target.value);v5Save()}if(event.target.id==='wp80CoachRate'){prefs.coachRate=Number(event.target.value);v5Save()}if(event.target.id==='wp71SupportLanguage'){const ui=$('#wp71UiLanguage');if(ui)ui.innerHTML=`<option value="${event.target.value}" selected>${event.target.value}</option>`}},true);
}
function wp80AfterInit(){
  wp71EnsureOnboarding();wp80EnsureCoachControls();wp711ApplyShell();wp712ApplyHubTranslations();wp71UpdatePairUI();updateLeaderboardEntry();renderAiCoach();
  const version=$('.version');if(version)version.textContent='v9.2.0 · Tester Beta';
  const scope=$('#leaderboardScope'),leagueCourse=wp80LeagueCourse();if(scope)scope.textContent=wp80T('courseLeague',{course:COURSES[leagueCourse]?.name||leagueCourse});
}
