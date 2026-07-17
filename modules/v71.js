/* WordPilot v7.1.2 — commercial clean branch, multilingual concept graph and Conversation Coach 2.0. */
const WP71_VERSION='7.1.2';
const WP71_SETTINGS_KEY=`${STORE}:v71_language_profile`;
const WP71_CONCEPT_FILE='clean_concepts_v71.json';
const WP71_ACTIVE_LANGUAGES=['en','tr','ru','uz'];
const WP71_LANGUAGE_META={
  en:{name:'English',native:'English',flag:'🇬🇧',voice:'en-US'},
  tr:{name:'Turkish',native:'Türkçe',flag:'🇹🇷',voice:'tr-TR'},
  ru:{name:'Russian',native:'Русский',flag:'🇷🇺',voice:'ru-RU'},
  uz:{name:'Uzbek',native:'O‘zbekcha',flag:'🇺🇿',voice:'uz-UZ'}
};
const WP71_PLANNED_LANGUAGES=[
  ['es','Español','🇪🇸'],['de','Deutsch','🇩🇪'],['fr','Français','🇫🇷'],['it','Italiano','🇮🇹'],['pt','Português','🇵🇹'],['ja','日本語','🇯🇵'],['ko','한국어','🇰🇷'],['zh','中文','🇨🇳']
];
let wp71Concepts=null;
let wp71LanguageProfile=wp71ReadLanguageProfile();
function wp71ReadLanguageProfile(){
  let row={ui:'tr',support:'tr',target:localStorage.getItem(ACTIVE_COURSE_KEY)||'en',experience:'standard',complete:false};
  try{row={...row,...JSON.parse(localStorage.getItem(WP71_SETTINGS_KEY)||'{}')}}catch{}
  if(!WP71_ACTIVE_LANGUAGES.includes(row.ui))row.ui='tr';
  if(!WP71_ACTIVE_LANGUAGES.includes(row.support))row.support='tr';
  if(!WP71_ACTIVE_LANGUAGES.includes(row.target))row.target='en';
  if(row.support===row.target)row.support=row.target==='tr'?'en':'tr';
  return row;
}
function wp71SaveLanguageProfile(next){
  wp71LanguageProfile={...wp71LanguageProfile,...next,complete:true};
  if(wp71LanguageProfile.support===wp71LanguageProfile.target)wp71LanguageProfile.support=wp71LanguageProfile.target==='tr'?'en':'tr';
  localStorage.setItem(WP71_SETTINGS_KEY,JSON.stringify(wp71LanguageProfile));
}
function wp71Lang(id){return WP71_LANGUAGE_META[id]||WP71_LANGUAGE_META.en}
function wp71Support(){return wp71LanguageProfile.support||'tr'}
function wp71Target(){return activeCourse||wp71LanguageProfile.target||'en'}
function wp71PairLabel(){const s=wp71Lang(wp71Support()),t=wp71Lang(wp71Target());return `${s.flag} ${s.native} → ${t.flag} ${t.native}`}
function wp71EscapeAttribute(value=''){return esc(String(value)).replace(/\n/g,' ')}

// Turkish becomes a first-class target language without changing existing progress keys.
COURSES.tr={id:'tr',name:'Türkçe',short:'TR',flag:'🇹🇷',file:WP71_CONCEPT_FILE,voice:'tr-TR',voiceAlt:'tr-TR',displayCount:120,countLabel:'120 bağlantılı temiz çekirdek kayıt',targetLabel:'TÜRKÇE',starter:true};
if(!COURSE_IDS.includes('tr'))COURSE_IDS.push('tr');
COURSES.en.file=WP71_CONCEPT_FILE;COURSES.en.displayCount=120;COURSES.en.actualCount=120;COURSES.en.countLabel='120 özgün clean-room kavram · ticari temiz çekirdek';

async function wp71LoadConcepts(){
  if(wp71Concepts)return wp71Concepts;
  const response=await fetch(`${WP71_CONCEPT_FILE}?v=${VERSION}`,{cache:'no-store'});
  if(!response.ok)throw new Error(WP71_CONCEPT_FILE);
  wp71Concepts=await response.json();return wp71Concepts;
}
const WP71_PENDING={
  tr:'Editör incelemesi bekliyor.',en:'Editorial review is pending.',ru:'Ожидает редакторской проверки.',uz:'Muharrir tekshiruvi kutilmoqda.'
};
function wp71ConceptToLegacy(c,target=wp71Target(),support=wp71Support()){
  const term=c.terms?.[target]||c.terms?.en||'',meaning=c.terms?.[support]||c.terms?.tr||'',supportUsage=c.usage?.[support]||c.usage?.tr||'',targetExample=c.examples?.[target]||'',supportExample=c.examples?.[support]||'';
  const id=Number(c.legacy_ids?.en)||Number(String(c.concept_id||'').match(/\d+$/)?.[0])||0;
  return {
    id,concept_id:c.concept_id,english:term,word:term,pronunciation:'',meaningTr:meaning,
    meaning:`${meaning} ★★★★★`,usage:`• ${supportUsage}`,example:`• ${targetExample}`,translation:`• ${supportExample}`,
    synonyms:WP71_PENDING[support],opposite:WP71_PENDING[support],family:WP71_PENDING[support],phrase:'',collocations:'',
    notes:'',
    cefr:`● ${c.level||'A1'}`,level:c.level||'A1',type:`● ${String(c.part_of_speech||'word')}`,group:`Clean Core · ${c.topic||'Core'}`,
    topic:c.topic||'Core',target_lang:target,support_lang:support,content_origin:c.content_origin,license:c.license,
    review_status:c.review_status,commercial_safe:c.commercial_safe===true,content_hash:c.content_hash
  };
}
const wp71PreviousLoadCourseWords=loadCourseWords;
loadCourseWords=async function(course=activeCourse){
  const support=wp71Support();
  // English and Turkish always use the clean commercial concept graph. RU/UZ use it for cross-language directions.
  const useClean=course==='en'||course==='tr'||support!=='tr';
  if(useClean){
    const concepts=await wp71LoadConcepts(),data=concepts.map(c=>wp71ConceptToLegacy(c,course,support));
    courseWordCache[course]=data;words=data;return data;
  }
  return wp71PreviousLoadCourseWords(course);
};

const WP71_UI={
  tr:{home:'Ana Sayfa',words:'Kelimeler',study:'Çalış',league:'Lig',progress:'İlerleme',pair:'Dil yönünü değiştir',hello:'Konuşarak öğren',hero:'Conversation Coach 2.0',heroText:'Seni dinleyen, aynı soruyu tekrarlamayan ve hatalarını açıklama dilinde gösteren kişisel konuşma öğretmeni.',start:'Konuşmaya başla',clean:'Ticari temiz çekirdek',memory:'Konuşma hafızası',modes:'3 düzeltme modu',prompts:'72+ yönlendirilmiş soru'},
  en:{home:'Home',words:'Words',study:'Practice',league:'League',progress:'Progress',pair:'Change language pair',hello:'Learn by speaking',hero:'Conversation Coach 2.0',heroText:'A personal speaking tutor that listens, avoids repeated questions and explains mistakes in your support language.',start:'Start speaking',clean:'Commercial clean core',memory:'Conversation memory',modes:'3 correction modes',prompts:'72+ guided prompts'},
  ru:{home:'Главная',words:'Слова',study:'Практика',league:'Лига',progress:'Прогресс',pair:'Изменить языковую пару',hello:'Учитесь говорить',hero:'Conversation Coach 2.0',heroText:'Личный разговорный тренер: слушает, не повторяет вопросы и объясняет ошибки на выбранном языке.',start:'Начать разговор',clean:'Чистое коммерческое ядро',memory:'Память разговора',modes:'3 режима исправлений',prompts:'72+ вопросов'},
  uz:{home:'Bosh sahifa',words:'So‘zlar',study:'Mashq',league:'Liga',progress:'Natijalar',pair:'Til yo‘nalishini o‘zgartirish',hello:'Gapirib o‘rganing',hero:'Conversation Coach 2.0',heroText:'Sizni tinglaydigan, savollarni takrorlamaydigan va xatolarni tanlangan tilda tushuntiradigan shaxsiy suhbat murabbiyi.',start:'Suhbatni boshlash',clean:'Tijoriy toza yadro',memory:'Suhbat xotirasi',modes:'3 tuzatish rejimi',prompts:'72+ yo‘naltirilgan savol'}
};
function wp71Ui(){return WP71_UI[wp71LanguageProfile.ui]||WP71_UI.tr}
function wp71ApplyInterfaceText(){
  const t=wp71Ui(),navButtons=$$('.desktop-top-nav button');
  if(navButtons[0])navButtons[0].textContent=t.home;if(navButtons[1])navButtons[1].textContent=t.words;if(navButtons[2])navButtons[2].textContent=t.study;if(navButtons[3])navButtons[3].textContent=t.league;if(navButtons[4])navButtons[4].textContent=t.progress;
  const pairBtn=$('#wp71PairButton');if(pairBtn){pairBtn.title=t.pair;pairBtn.setAttribute('aria-label',t.pair)}
  const hero=$('#wp71ConversationSpotlight');if(hero){hero.querySelector('[data-wp71="eyebrow"]').textContent=t.hello;hero.querySelector('h2').textContent=t.hero;hero.querySelector('[data-wp71="description"]').textContent=t.heroText;hero.querySelector('[data-v5-open="ai"] b').textContent=t.start;hero.querySelector('[data-wp71="clean"]').textContent=t.clean;hero.querySelector('[data-wp71="memory"]').textContent=t.memory;hero.querySelector('[data-wp71="modes"]').textContent=t.modes;hero.querySelector('[data-wp71="prompts"]').textContent=t.prompts}
  document.documentElement.lang=wp71LanguageProfile.ui;
}
function wp71LanguageOptions(selected,exclude='',planned=false){
  let html=WP71_ACTIVE_LANGUAGES.filter(id=>id!==exclude).map(id=>{const l=wp71Lang(id);return `<option value="${id}" ${id===selected?'selected':''}>${l.flag} ${l.native}</option>`}).join('');
  if(planned)html+='<optgroup label="Roadmap">'+WP71_PLANNED_LANGUAGES.map(([id,name,flag])=>`<option value="${id}" disabled>${flag} ${name} · yakında</option>`).join('')+'</optgroup>';
  return html;
}
function wp71EnsureOnboarding(){
  if($('#wp71Onboarding'))return;
  document.body.insertAdjacentHTML('beforeend',`<dialog id="wp71Onboarding" class="modal wp71-onboarding">
    <div class="wp71-onboarding-brand"><span>W</span><div><p class="eyebrow">WORDPILOT 7.1</p><h2>Dil rotanı oluştur</h2><p>Arayüz, açıklama ve hedef dil birbirinden bağımsızdır. İlerleme hedef dile göre korunur.</p></div></div>
    <div class="wp71-onboarding-grid">
      <label><span>Arayüz dili</span><select id="wp71UiLanguage">${wp71LanguageOptions(wp71LanguageProfile.ui)}</select><small>Menüler ve uygulama yönlendirmeleri</small></label>
      <label><span>Bildiğim / açıklama dili</span><select id="wp71SupportLanguage">${wp71LanguageOptions(wp71LanguageProfile.support,wp71LanguageProfile.target,true)}</select><small>Düzeltmeler ve kelime anlamları bu dilde görünür</small></label>
      <label><span>Öğrenmek istediğim dil</span><select id="wp71TargetLanguage">${wp71LanguageOptions(wp71LanguageProfile.target,wp71LanguageProfile.support,true)}</select><small>Konuşma, kelime ve ses hedefi</small></label>
    </div>
    <fieldset class="wp71-experience"><legend>Deneyim</legend><label class="active"><input type="radio" name="wp71Experience" value="standard" checked><span>🧭</span><div><b>Standard</b><small>Yetişkin ve genç öğrenme deneyimi</small></div></label><label class="planned"><input type="radio" name="wp71Experience" value="junior" disabled><span>🚀</span><div><b>WordPilot Junior</b><small>V8 · ebeveyn kontrollü çocuk modu</small></div></label></fieldset>
    <div class="wp71-legal-note"><b>Commercial Clean</b><span>Bu dalda yalnızca WordPilot’a ait veya açıkça lisanslı içerik kullanılacaktır.</span></div>
    <button id="wp71SaveLanguageProfile" class="primary wide" type="button">Rotayı kaydet ve başla</button>
  </dialog>`);
}
function wp71RefreshOnboardingOptions(){
  const support=$('#wp71SupportLanguage'),target=$('#wp71TargetLanguage');if(!support||!target)return;
  support.innerHTML=wp71LanguageOptions(support.value||wp71Support(),target.value,true);target.innerHTML=wp71LanguageOptions(target.value||wp71Target(),support.value,true);
}
function wp71OpenOnboarding(){wp71EnsureOnboarding();const d=$('#wp71Onboarding');if(d&&!d.open)d.showModal()}
function wp71EnsurePairButton(){
  if(!$('#wp71PairButton'))document.querySelector('.top-actions')?.insertAdjacentHTML('afterbegin',`<button id="wp71PairButton" class="wp71-pair-button" type="button"><span>${wp71PairLabel()}</span><em>↕</em></button>`);
  const btn=$('#wp71PairButton');if(btn)btn.querySelector('span').textContent=wp71PairLabel();
}
function wp71EnsureConversationSpotlight(){
  if($('#wp71ConversationSpotlight'))return;
  const anchor=$('.course-selector-section');if(!anchor)return;
  anchor.insertAdjacentHTML('beforebegin',`<section id="wp71ConversationSpotlight" class="wp71-conversation-spotlight">
    <div class="wp71-conversation-copy"><p class="eyebrow" data-wp71="eyebrow">Konuşarak öğren</p><h2>Conversation Coach 2.0</h2><p data-wp71="description">Seni dinleyen, aynı soruyu tekrarlamayan ve hatalarını açıklama dilinde gösteren kişisel konuşma öğretmeni.</p><div class="wp71-proof-row"><span>✓ <b data-wp71="memory">Konuşma hafızası</b></span><span>✓ <b data-wp71="modes">3 düzeltme modu</b></span><span>✓ <b data-wp71="prompts">72+ yönlendirilmiş soru</b></span><span>✓ <b data-wp71="clean">Ticari temiz çekirdek</b></span></div></div>
    <div class="wp71-conversation-action"><div class="wp71-orbit"><span>WP</span><i></i><i></i></div><small id="wp71HeroPair">${wp71PairLabel()}</small><button class="primary" type="button" data-v5-open="ai"><b>Konuşmaya başla</b><span>Sesli veya yazılı →</span></button></div>
  </section>`);
}
function wp71UpdatePairUI(){
  wp71EnsurePairButton();const label=wp71PairLabel();$('#wp71PairButton span').textContent=label;if($('#wp71HeroPair'))$('#wp71HeroPair').textContent=label;
  const summary=$('#activeCourseSummary');if(summary)summary.textContent=`${label} · ${words.length||COURSES[activeCourse]?.displayCount||0} kayıt`;
  const courseTitle=$('#courseSelectorTitle');if(courseTitle)courseTitle.textContent=wp71LanguageProfile.ui==='en'?'Which language do you want to learn today?':'Bugün hangi dili öğrenmek istiyorsun?';
  $$('.course-card[data-course]').forEach(card=>{const id=card.dataset.course,small=card.querySelector('small');if(small)small.textContent=id===activeCourse?`${wp71Lang(wp71Support()).native} açıklamalı · ${words.length} aktif kayıt`:`${wp71Lang(wp71Support()).native} açıklama desteği`});
}

const WP71_SCENARIOS={
  intro:{icon:'👋',title:'Tanışma',hint:'Kendini doğal biçimde tanıt'},daily:{icon:'☀️',title:'Günlük yaşam',hint:'Rutin, saat ve alışkanlıklar'},cafe:{icon:'☕',title:'Kafede',hint:'Sipariş, tercih ve ödeme'},travel:{icon:'🧳',title:'Seyahat',hint:'Yol, bilet ve planlar'},work:{icon:'💼',title:'İş ve okul',hint:'Görev, eğitim ve hedefler'},shopping:{icon:'🛍️',title:'Alışveriş',hint:'Fiyat, beden ve karşılaştırma'},hotel:{icon:'🏨',title:'Otelde',hint:'Rezervasyon ve ihtiyaçlar'},health:{icon:'🩺',title:'Sağlık',hint:'Basit şikâyet ve tavsiye'},hobby:{icon:'🎨',title:'Hobiler',hint:'İlgi alanı ve deneyimler'},family:{icon:'🏡',title:'Aile ve arkadaşlar',hint:'İnsanları ve ilişkileri anlat'},plans:{icon:'📅',title:'Planlar',hint:'Gelecek ve randevular'},opinion:{icon:'💬',title:'Fikir belirtme',hint:'Neden, karşılaştırma ve görüş'}
};
Object.keys(V5_SCENARIOS).forEach(k=>delete V5_SCENARIOS[k]);Object.assign(V5_SCENARIOS,WP71_SCENARIOS);
const WP71_QUESTIONS={
  en:{
    intro:['What name would you like me to use?','Where are you from, and what do you like about that place?','Which languages do you already speak?','What is one thing you want to improve in this language?','How would a close friend describe you?','What made you start learning this language?'],
    daily:['What time does your day usually begin?','What is the first thing you do in the morning?','Which part of your daily routine do you enjoy most?','What do you normally do after work or school?','Is your weekend routine different? How?','Which habit would you like to change?'],
    cafe:['What would you like to order today?','Do you prefer tea or coffee, and why?','Would you like anything to eat with your drink?','How would you ask whether a dish contains sugar?','What makes a café comfortable for you?','How would you politely ask for the bill?'],
    travel:['Where would you like to travel next?','How do you usually prepare for a trip?','Do you prefer travelling by train or by plane?','What do you do when you cannot find an address?','Tell me about a memorable journey.','What is the most important item in your suitcase?'],
    work:['What do you do or study at the moment?','Which task takes most of your time?','How do you organise a busy day?','What skill would help you in your work or studies?','Do you prefer working alone or with a team?','Describe a goal you want to reach this year.'],
    shopping:['What are you looking for today?','How would you ask for a different size?','Do you compare prices before buying something?','What was the last useful thing you bought?','Do you prefer online shops or physical stores?','How would you return a damaged product?'],
    hotel:['How many nights would you like to stay?','What kind of room do you prefer?','How would you ask about breakfast time?','What would you say if the room were too noisy?','Which hotel service matters most to you?','How would you request a late check-out?'],
    health:['How are you feeling today?','When did the problem begin?','How would you describe the pain simply?','What do you usually do to stay healthy?','How many hours do you normally sleep?','What advice would you give someone who feels tired?'],
    hobby:['What do you enjoy doing in your free time?','How often do you practise this hobby?','When did you become interested in it?','Do you prefer creative or active hobbies?','What new hobby would you like to try?','How does your hobby change your mood?'],
    family:['Who are you closest to in your family?','What do you enjoy doing with your friends?','How often do you speak with your relatives?','Describe someone who has influenced you.','What makes a person a good friend?','Which family tradition is important to you?'],
    plans:['What are you planning for this weekend?','What is one goal for next month?','How do you remember important appointments?','Would you rather plan everything or be spontaneous?','What are you looking forward to this year?','What might change in your life soon?'],
    opinion:['What makes a language-learning app useful?','Do you think mistakes help people learn? Why?','Which is more important: accuracy or fluency?','What is one advantage of learning online?','Do you agree that daily practice is better than long weekly sessions?','What would you improve in your ideal course?']
  },
  tr:{
    intro:['Sana hangi isimle hitap etmemi istersin?','Nerelisin ve yaşadığın yerin en sevdiğin yönü nedir?','Şu anda hangi dilleri konuşabiliyorsun?','Bu dilde özellikle neyi geliştirmek istiyorsun?','Yakın bir arkadaşın seni nasıl tarif ederdi?','Bu dili öğrenmeye neden başladın?'],
    daily:['Günün genellikle saat kaçta başlıyor?','Sabah yaptığın ilk şey nedir?','Günlük düzeninin en sevdiğin bölümü hangisi?','İşten veya okuldan sonra genellikle ne yaparsın?','Hafta sonu düzenin farklı mı?','Değiştirmek istediğin bir alışkanlık var mı?'],
    cafe:['Bugün ne sipariş etmek istersin?','Çay mı kahve mi tercih edersin, neden?','İçeceğinin yanında bir şey yemek ister misin?','Bir yemeğin şeker içerip içermediğini nasıl sorarsın?','Bir kafeyi senin için rahat yapan şey nedir?','Hesabı nazikçe nasıl istersin?'],
    travel:['Bir sonraki seyahatinde nereye gitmek istersin?','Bir yolculuğa genellikle nasıl hazırlanırsın?','Trenle mi uçakla mı seyahat etmeyi tercih edersin?','Bir adresi bulamadığında ne yaparsın?','Unutamadığın bir yolculuğu anlatır mısın?','Bavulundaki en önemli eşya nedir?'],
    work:['Şu anda ne iş yapıyor veya ne okuyorsun?','En çok zamanını hangi görev alıyor?','Yoğun bir günü nasıl planlarsın?','Hangi beceri işinde veya eğitiminde sana yardımcı olurdu?','Tek başına mı ekiple mi çalışmayı tercih edersin?','Bu yıl ulaşmak istediğin bir hedefi anlat.'],
    shopping:['Bugün ne arıyorsun?','Farklı bir beden nasıl istersin?','Bir şey satın almadan önce fiyatları karşılaştırır mısın?','En son aldığın yararlı şey neydi?','İnternetten mi mağazadan mı alışveriş yapmayı tercih edersin?','Hasarlı bir ürünü nasıl iade edersin?'],
    hotel:['Kaç gece kalmak istersin?','Nasıl bir oda tercih edersin?','Kahvaltı saatini nasıl sorarsın?','Oda çok gürültülü olsaydı ne söylerdin?','Senin için en önemli otel hizmeti hangisidir?','Geç çıkış nasıl talep edilir?'],
    health:['Bugün kendini nasıl hissediyorsun?','Sorun ne zaman başladı?','Ağrıyı basitçe nasıl tarif edersin?','Sağlıklı kalmak için genellikle ne yaparsın?','Normalde kaç saat uyursun?','Yorgun hisseden birine ne önerirsin?'],
    hobby:['Boş zamanlarında ne yapmaktan hoşlanırsın?','Bu hobiyi ne sıklıkla yaparsın?','Buna ne zaman ilgi duymaya başladın?','Yaratıcı mı hareketli mi hobileri tercih edersin?','Hangi yeni hobiyi denemek istersin?','Hobin ruh hâlini nasıl etkiliyor?'],
    family:['Ailende en yakın olduğun kişi kim?','Arkadaşlarınla ne yapmaktan hoşlanırsın?','Akrabalarınla ne sıklıkla konuşursun?','Seni etkileyen birini anlatır mısın?','Sence iyi bir arkadaşın özellikleri nelerdir?','Senin için önemli bir aile geleneği var mı?'],
    plans:['Bu hafta sonu için ne planlıyorsun?','Gelecek ay için bir hedefin nedir?','Önemli randevuları nasıl hatırlarsın?','Her şeyi planlamayı mı spontane olmayı mı tercih edersin?','Bu yıl en çok neyi bekliyorsun?','Yakında hayatında ne değişebilir?'],
    opinion:['Bir dil uygulamasını yararlı yapan şey nedir?','Sence hatalar öğrenmeye yardımcı olur mu?','Doğruluk mu akıcılık mı daha önemlidir?','Çevrim içi öğrenmenin bir avantajı nedir?','Her gün kısa çalışmak, haftada bir uzun çalışmaktan daha mı iyidir?','İdeal bir dil kursunda neyi değiştirirdin?']
  },
  ru:{
    intro:['Как к вам обращаться?','Откуда вы и что вам нравится в этом месте?','На каких языках вы уже говорите?','Что именно вы хотите улучшить в этом языке?','Как вас описал бы близкий друг?','Почему вы начали учить этот язык?'],
    daily:['Во сколько обычно начинается ваш день?','Что вы делаете первым делом утром?','Какая часть распорядка вам нравится больше всего?','Что вы обычно делаете после работы или учёбы?','Ваши выходные проходят иначе?','Какую привычку вы хотели бы изменить?'],
    cafe:['Что вы хотели бы заказать?','Вы предпочитаете чай или кофе? Почему?','Хотите что-нибудь к напитку?','Как спросить, есть ли в блюде сахар?','Что делает кафе уютным для вас?','Как вежливо попросить счёт?'],
    travel:['Куда вы хотели бы поехать в следующий раз?','Как вы обычно готовитесь к поездке?','Вы предпочитаете поезд или самолёт?','Что вы делаете, если не можете найти адрес?','Расскажите о запоминающемся путешествии.','Какая вещь самая важная в вашем чемодане?'],
    work:['Чем вы сейчас занимаетесь или что изучаете?','Какая задача занимает больше всего времени?','Как вы организуете忙ный день?'.replace('忙','насыщен'),'Какой навык помог бы вам в работе или учёбе?','Вы предпочитаете работать один или в команде?','Расскажите о цели на этот год.'],
    shopping:['Что вы сегодня ищете?','Как попросить другой размер?','Вы сравниваете цены перед покупкой?','Какую полезную вещь вы купили недавно?','Вы предпочитаете интернет-магазины или обычные магазины?','Как вернуть повреждённый товар?'],
    hotel:['На сколько ночей вы хотите остановиться?','Какой номер вы предпочитаете?','Как спросить время завтрака?','Что вы скажете, если в номере слишком шумно?','Какая гостиничная услуга важнее всего?','Как попросить поздний выезд?'],
    health:['Как вы себя сегодня чувствуете?','Когда началась проблема?','Как просто описать боль?','Что вы делаете, чтобы оставаться здоровым?','Сколько часов вы обычно спите?','Что вы посоветуете уставшему человеку?'],
    hobby:['Чем вы любите заниматься в свободное время?','Как часто вы занимаетесь этим хобби?','Когда вы этим заинтересовались?','Вы предпочитаете творческие или активные хобби?','Какое новое хобби вы хотели бы попробовать?','Как хобби влияет на ваше настроение?'],
    family:['С кем в семье вы ближе всего?','Что вы любите делать с друзьями?','Как часто вы разговариваете с родственниками?','Расскажите о человеке, который на вас повлиял.','Каким должен быть хороший друг?','Какая семейная традиция важна для вас?'],
    plans:['Что вы планируете на выходные?','Какая у вас цель на следующий месяц?','Как вы помните о важных встречах?','Вы любите всё планировать или действовать спонтанно?','Чего вы больше всего ждёте в этом году?','Что скоро может измениться в вашей жизни?'],
    opinion:['Что делает приложение для языков полезным?','Помогают ли ошибки учиться? Почему?','Что важнее: точность или беглость?','Каково преимущество онлайн-обучения?','Лучше заниматься понемногу каждый день или долго раз в неделю?','Что бы вы улучшили в идеальном курсе?']
  },
  uz:{
    intro:['Sizga qanday murojaat qilishimni xohlaysiz?','Qayerdansiz va u yerning nimasi sizga yoqadi?','Qaysi tillarda gaplasha olasiz?','Bu tilda aynan nimani yaxshilamoqchisiz?','Yaqin do‘stingiz sizni qanday ta’riflaydi?','Nega bu tilni o‘rganishni boshladingiz?'],
    daily:['Kuningiz odatda soat nechada boshlanadi?','Ertalab birinchi nima qilasiz?','Kundalik tartibingizning qaysi qismi sizga ko‘proq yoqadi?','Ish yoki o‘qishdan keyin odatda nima qilasiz?','Dam olish kunlari tartibingiz boshqachami?','Qaysi odatingizni o‘zgartirmoqchisiz?'],
    cafe:['Bugun nima buyurtma qilmoqchisiz?','Choymi yoki qahvami, qaysi birini afzal ko‘rasiz?','Ichimlik bilan birga nimadir yeysizmi?','Taomda shakar borligini qanday so‘raysiz?','Kafeni siz uchun qulay qiladigan narsa nima?','Hisobni muloyim tarzda qanday so‘raysiz?'],
    travel:['Keyingi safaringizda qayerga bormoqchisiz?','Safarga odatda qanday tayyorlanasiz?','Poyezd yoki samolyotni afzal ko‘rasizmi?','Manzilni topa olmasangiz nima qilasiz?','Esda qolgan safaringiz haqida ayting.','Chamadoningizdagi eng muhim narsa nima?'],
    work:['Hozir nima bilan shug‘ullanasiz yoki nimani o‘qiysiz?','Qaysi vazifa ko‘p vaqtingizni oladi?','Band kunni qanday rejalashtirasiz?','Qaysi ko‘nikma ish yoki o‘qishda yordam beradi?','Yolg‘iz yoki jamoa bilan ishlashni afzal ko‘rasizmi?','Bu yil erishmoqchi bo‘lgan maqsadingizni ayting.'],
    shopping:['Bugun nimani qidiryapsiz?','Boshqa o‘lchamni qanday so‘raysiz?','Xariddan oldin narxlarni solishtirasizmi?','Yaqinda olgan foydali narsangiz nima?','Onlayn yoki oddiy do‘konni afzal ko‘rasizmi?','Nosoz mahsulotni qanday qaytarasiz?'],
    hotel:['Necha kecha qolmoqchisiz?','Qanday xona xohlaysiz?','Nonushta vaqtini qanday so‘raysiz?','Xona juda shovqinli bo‘lsa nima deysiz?','Qaysi mehmonxona xizmati muhim?','Kechroq chiqishni qanday so‘raysiz?'],
    health:['Bugun o‘zingizni qanday his qilyapsiz?','Muammo qachon boshlandi?','Og‘riqni sodda qilib qanday tasvirlaysiz?','Sog‘lom bo‘lish uchun nima qilasiz?','Odatda necha soat uxlaysiz?','Charchagan odamga nima maslahat berasiz?'],
    hobby:['Bo‘sh vaqtingizda nima qilishni yoqtirasiz?','Bu hobbi bilan qanchalik tez-tez shug‘ullanasiz?','Qachon unga qiziqa boshladingiz?','Ijodiy yoki faol hobbini afzal ko‘rasizmi?','Qaysi yangi hobbini sinab ko‘rmoqchisiz?','Hobbi kayfiyatingizga qanday ta’sir qiladi?'],
    family:['Oilangizda kimga eng yaqinsiz?','Do‘stlaringiz bilan nima qilishni yoqtirasiz?','Qarindoshlaringiz bilan qanchalik tez-tez gaplashasiz?','Sizga ta’sir qilgan inson haqida ayting.','Yaxshi do‘st qanday bo‘lishi kerak?','Qaysi oilaviy an’ana siz uchun muhim?'],
    plans:['Dam olish kunlariga nima rejalashtirgansiz?','Keyingi oy uchun maqsadingiz nima?','Muhim uchrashuvlarni qanday eslab qolasiz?','Hammasini rejalashtirishni yoki spontan bo‘lishni afzal ko‘rasizmi?','Bu yil nimani intiqlik bilan kutyapsiz?','Yaqinda hayotingizda nima o‘zgarishi mumkin?'],
    opinion:['Til o‘rganish ilovasini nima foydali qiladi?','Xatolar o‘rganishga yordam beradimi?','Aniqlikmi yoki ravonlikmi muhimroq?','Onlayn o‘rganishning bir afzalligi nima?','Har kuni qisqa mashq qilish haftalik uzun mashqdan yaxshimi?','Ideal kursda nimani yaxshilardingiz?']
  }
};
function wp71Questions(course=activeCourse,scenario=v5AiScenario){return WP71_QUESTIONS[course]?.[scenario]||WP71_QUESTIONS.en.intro}
function wp71AskedSet(history){return new Set((history||[]).filter(x=>x.role==='assistant').map(x=>String(x.text||'').trim().toLocaleLowerCase()))}
function wp71NextQuestion(history,course=activeCourse,scenario=v5AiScenario){
  const list=wp71Questions(course,scenario),asked=wp71AskedSet(history),fresh=list.find(q=>![...asked].some(a=>a.includes(q.toLocaleLowerCase())||q.toLocaleLowerCase().includes(a)));
  if(fresh)return fresh;
  const lastUser=[...(history||[])].reverse().find(x=>x.role==='user')?.text||'';
  const keyword=lastUser.split(/\s+/).filter(x=>x.length>4).slice(-1)[0];
  const fallback={en:`Could you tell me one more detail${keyword?` about “${keyword}”`:''}?`,tr:`${keyword?`“${keyword}” hakkında `:''}Bir ayrıntı daha anlatır mısın?`,ru:`Расскажите ещё одну деталь${keyword?` о «${keyword}»`:''}.`,uz:`${keyword?`“${keyword}” haqida `:''}Yana bir tafsilot ayta olasizmi?`};
  return fallback[course]||fallback.en;
}
function wp71CorrectionMessages(){
  const s=wp71Support();return {
    capitalization:{tr:'Büyük harf ve noktalama düzenlendi.',en:'Capitalisation and punctuation were adjusted.',ru:'Исправлены заглавные буквы и пунктуация.',uz:'Bosh harf va tinish belgilari tuzatildi.'}[s],
    grammar:{tr:'Cümle yapısında önemli bir dil bilgisi düzeltmesi yapıldı.',en:'An important grammar correction was made.',ru:'Исправлена важная грамматическая ошибка.',uz:'Muhim grammatik xato tuzatildi.'}[s],
    correct:{tr:'Cümlen anlaşılır ve doğal.',en:'Your sentence is clear and natural.',ru:'Предложение понятное и естественное.',uz:'Gappingiz tushunarli va tabiiy.'}[s],
    skipped:{tr:'Akıcılığı korumak için küçük hatalar bu turda göz ardı edildi.',en:'Minor issues were skipped in this turn to protect fluency.',ru:'Небольшие ошибки пропущены, чтобы сохранить беглость.',uz:'Ravonlikni saqlash uchun kichik xatolar bu safar e’tiborsiz qoldirildi.'}[s]
  }
}
function wp71EvaluateLocal(message,mode='gentle'){
  const raw=String(message||'').trim(),m=wp71CorrectionMessages();let corrected=raw,errorType='',major=false;
  if(activeCourse==='en'){
    corrected=corrected.replace(/\bi\b/g,'I').replace(/^([a-z])/,x=>x.toUpperCase()).replace(/\bI am agree\b/gi,'I agree').replace(/\bI have (\d+) years(?: old)?\b/gi,'I am $1 years old').replace(/\bI didn't went\b/gi,"I didn't go").replace(/\bYesterday I go\b/gi,'Yesterday I went').replace(/\bI like swim\b/gi,'I like swimming');
    if(!/[.!?]$/.test(corrected))corrected+='.';
  }else if(activeCourse==='tr'){
    corrected=corrected.replace(/^([a-zçğıöşü])/iu,x=>x.toLocaleUpperCase('tr-TR'));if(!/[.!?]$/.test(corrected))corrected+='.';
  }else if(activeCourse==='ru'){
    corrected=corrected.replace(/^([а-яё])/iu,x=>x.toUpperCase());if(!/[.!?]$/.test(corrected))corrected+='.';if(!/[а-яё]/i.test(raw)){major=true;errorType='script'}
  }else{corrected=corrected.replace(/^([a-zö‘ʼʻ])/iu,x=>x.toUpperCase());if(!/[.!?]$/.test(corrected))corrected+='.'}
  const grammarChanged=/I agree|years old|didn't go|Yesterday I went|like swimming/.test(corrected)&&corrected.toLowerCase()!==raw.toLowerCase();
  major=major||grammarChanged;errorType=errorType||(grammarChanged?'grammar':corrected!==raw?'mechanics':'none');
  let status=corrected===raw?'correct':'needs_work',explanation=status==='correct'?m.correct:(grammarChanged?m.grammar:m.capitalization),note='';
  if(mode==='fluency'&&!major){status='correct';corrected=raw;explanation=m.correct;note=m.skipped}
  const score=status==='correct'?96:major?72:86;
  return {status,corrected,explanation,suggestion:corrected,errorType,note,score};
}
function wp71CoachMode(){return $('#wp71CorrectionMode')?.value||v5Ensure().preferences?.correctionMode||'gentle'}
function wp71HistoryForAll(){return v5HistoryForScenario()}
v5ScenarioStarter=function(){return wp71Questions(activeCourse,v5AiScenario)[0]||'Hello!'};
v5LocalCoachReply=function(message){
  const history=wp71HistoryForAll(),evaluation=wp71EvaluateLocal(message,wp71CoachMode()),question=wp71NextQuestion(history,activeCourse,v5AiScenario);
  return {...evaluation,text:question,correction:evaluation.explanation,mode:'local-v71'};
};
function wp71FeedbackHtml(feedback){
  if(!feedback)return'';const good=feedback.status==='correct';
  return `<div class="wp71-feedback ${good?'good':'needs-work'}"><div class="wp71-feedback-head"><b>${good?'✓ Güçlü cevap':'● Geliştirilebilir'}</b>${feedback.score?`<span>${Math.round(feedback.score)}/100</span>`:''}</div>${!good&&feedback.corrected?`<p><small>Düzeltilmiş cümle</small><mark>${esc(feedback.corrected)}</mark></p>`:''}${feedback.explanation?`<p><small>Açıklama</small>${esc(feedback.explanation)}</p>`:''}${feedback.suggestion&&feedback.suggestion!==feedback.corrected?`<p class="alternative"><small>Daha doğal alternatif</small>${esc(feedback.suggestion)}</p>`:''}${feedback.note?`<aside>ℹ ${esc(feedback.note)}</aside>`:''}${feedback.errorType&&feedback.errorType!=='none'?`<em>${esc(feedback.errorType)}</em>`:''}</div>`;
}
function wp71HistoryBubble(x){
  const feedback=x.feedback||((x.status||x.corrected||x.explanation)?x:null);
  return `<article class="ai-message ${x.role}"><span>${x.role==='assistant'?'WP':'Sen'}</span><div><p>${esc(x.text)}</p>${x.role==='assistant'?wp71FeedbackHtml(feedback):''}${x.role==='assistant'?`<button type="button" class="wp65-speak-reply" data-wp65-speak-reply="${wp71EscapeAttribute(x.text)}">🔊 Dinle</button>`:''}</div></article>`;
}
function wp71RenderSessionMetrics(history){
  const user=history.filter(x=>x.role==='user').length,feedbacks=history.filter(x=>x.feedback),avg=feedbacks.length?Math.round(feedbacks.reduce((a,x)=>a+Number(x.feedback?.score||0),0)/feedbacks.length):0;
  if($('#wp71ConversationMetrics'))$('#wp71ConversationMetrics').innerHTML=`<span><b>${user}</b> cevap</span><span><b>${avg||'—'}</b> ortalama</span><span><b>${new Set(history.filter(x=>x.role==='assistant').map(x=>x.text)).size}</b> farklı soru</span>`;
}
renderAiCoach=function(){
  const meta=COURSES[activeCourse],scenario=V5_SCENARIOS[v5AiScenario];$('#aiCourseFlag').innerHTML=wp65FlagMarkup(activeCourse);$('#aiScenarioTitle').textContent=scenario.title;$('#aiScenarioHint').textContent=scenario.hint;
  $('#aiScenarioList').innerHTML=Object.entries(V5_SCENARIOS).map(([id,s])=>`<button type="button" class="${id===v5AiScenario?'active':''}" data-ai-scenario="${id}"><span>${s.icon}</span><div><b>${s.title}</b><small>${s.hint}</small></div></button>`).join('');
  const configured=!!V5_SECURITY.aiEnabled,backend=$('#aiBackendStatus');backend.className=`ai-backend-status ${configured?'ready':'local'}`;backend.innerHTML=configured?'<b>Conversation Coach Cloud</b><small>Bağlama duyarlı soru, ayrıntılı düzeltme ve tekrar engeli</small>':'<b>Conversation Coach Yerel</b><small>72+ yönlendirilmiş soru ve temel düzeltme çevrimdışı çalışır.</small>';
  const history=v5HistoryForScenario();if(!history.length)history.push({role:'assistant',text:v5ScenarioStarter(),mode:'local-v71',at:new Date().toISOString()});
  $('#aiChatMessages').innerHTML=history.map(wp71HistoryBubble).join('');$('#aiChatMessages').scrollTop=$('#aiChatMessages').scrollHeight;
  const prefs=v5Ensure().preferences,level=$('#wp65AiLevel');if(level)level.value=prefs.aiLevel||'A1';if($('#wp71CorrectionMode'))$('#wp71CorrectionMode').value=prefs.correctionMode||'gentle';if($('#wp65AiAutoSpeak'))$('#wp65AiAutoSpeak').checked=prefs.aiAutoSpeak!==false;if($('#wp65AiAutoSend'))$('#wp65AiAutoSend').checked=prefs.aiAutoSend!==false;
  if($('#wp71CoachPair'))$('#wp71CoachPair').textContent=wp71PairLabel();wp71RenderSessionMetrics(history);wp65ApplyFlags();
};
v5CloudAi=async function(history,message){
  if(!authUser||!fbAuth)throw new Error('AUTH_REQUIRED');if(!(await v5LoadFunctionsSdk()))throw new Error('SDK_UNAVAILABLE');
  const callable=window.firebase.app().functions(V5_SECURITY.aiRegion||'us-central1').httpsCallable('aiCoach'),level=$('#wp65AiLevel')?.value||'A1';
  const response=await callable({course:activeCourse,supportLanguage:wp71Support(),correctionMode:wp71CoachMode(),level,scenario:v5AiScenario,message,history:history.slice(-20).map(x=>({role:x.role,text:x.text}))});return response?.data||{};
};
v5SendAiMessage=async function(message){
  const history=v5HistoryForScenario();history.push({role:'user',text:message,at:new Date().toISOString()});renderAiCoach();v5AiBusy=true;$('#aiChatInput').disabled=true;
  let reply;try{if(V5_SECURITY.aiEnabled)reply=await v5CloudAi(history,message);else throw new Error('LOCAL')}catch(error){reply=v5LocalCoachReply(message);if(error?.message==='AUTH_REQUIRED')reply.note=(wp71Support()==='tr'?'Gelişmiş bulut AI için Google hesabıyla giriş gerekir.':'Cloud AI requires Google sign-in.')}
  const feedback={status:reply.status||'needs_work',corrected:reply.corrected||message,explanation:reply.explanation||reply.correction||'',suggestion:reply.suggestion||'',errorType:reply.errorType||reply.error_type||'',note:reply.note||'',score:Number(reply.score)||0};
  history.push({role:'assistant',text:reply.text||wp71NextQuestion(history),feedback,mode:reply.mode||'local-v71',at:new Date().toISOString()});while(history.length>60)history.shift();v5AiBusy=false;$('#aiChatInput').disabled=false;v5Save();renderAiCoach();if($('#wp65AiAutoSpeak')?.checked)speak(reply.text||'',v5VoiceLang());
};

const wp71PreviousUpdateCourseUI=updateCourseUI;
updateCourseUI=function(){
  const out=wp71PreviousUpdateCourseUI();wp71UpdatePairUI();wp71ApplyCommercialGates();
  const target=wp71Lang(activeCourse).native,support=wp71Lang(wp71Support()).native;
  const search=$('#searchInput');if(search)search.placeholder=`${target}: kelime, ${support} anlam veya örnek ara…`;
  const labels={en:'EN',tr:'TR',ru:'RU',uz:'UZ'},a=labels[activeCourse],b=labels[wp71Support()];
  const one=document.querySelector('[data-start="en-tr"] b'),two=document.querySelector('[data-start="tr-en"] b');if(one)one.textContent=`Yaz ${a} → ${b}`;if(two)two.textContent=`Yaz ${b} → ${a}`;
  return out;
};
const wp71PreviousRenderDashboard=renderDashboard;
renderDashboard=function(){const out=wp71PreviousRenderDashboard();wp71UpdatePairUI();wp71ApplyInterfaceText();wp71ApplyCommercialGates();return out};
const wp71PreviousOpenProfile=openProfile;
openProfile=function(){if($('#wp71Onboarding')?.open)return;return wp71PreviousOpenProfile()};

function wp71EnsureAiControls(){
  const tools=$('.wp65-ai-head-tools');if(!tools||$('#wp71CorrectionMode'))return;
  tools.insertAdjacentHTML('afterbegin',`<label>Düzeltme<select id="wp71CorrectionMode"><option value="fluency">Akıcılık</option><option value="gentle" selected>Nazik</option><option value="teacher">Öğretmen</option></select></label>`);
  const head=$('.ai-chat-head');head?.insertAdjacentHTML('afterend',`<div class="wp71-coach-context"><span id="wp71CoachPair">${wp71PairLabel()}</span><div id="wp71ConversationMetrics"><span><b>0</b> cevap</span><span><b>—</b> ortalama</span><span><b>1</b> farklı soru</span></div></div>`);
}

function wp71IsAuditGated(){return ['en','tr'].includes(activeCourse)}
function wp71ApplyCommercialGates(){
  const gated=wp71IsAuditGated();
  const core=document.querySelector('[data-collection="core5000"]');if(core){core.querySelector('b').textContent='Clean Core 120';core.querySelector('small').textContent='Özgün ve hash kayıtlı ticari çekirdek'}
  const phrases=document.querySelector('[data-collection="phrases"]');if(phrases)phrases.hidden=true;
  const intermediate=document.querySelector('[data-collection="intermediate"]');if(intermediate)intermediate.hidden=gated;
  const beginner=document.querySelector('[data-collection="beginner"]');if(beginner){beginner.querySelector('b').textContent='Bağlantılı Kavramlar';beginner.querySelector('small').textContent='4 dil · 12 öğrenme yönü'}
  $$('[data-start="synonym"],[data-start="antonym"]').forEach(btn=>btn.hidden=gated);
  const syn=$('#setupMode option[value="synonym"]'),ant=$('#setupMode option[value="antonym"]');if(syn)syn.disabled=gated;if(ant)ant.disabled=gated;
  const academyPanel=document.querySelector('[data-dashboard-panel="academy"]');
  if(academyPanel){
    let notice=academyPanel.querySelector('.wp71-audit-notice');
    if(gated&&!notice){notice=document.createElement('section');notice.className='wp71-audit-notice';notice.innerHTML='<span>⚖️</span><div><p class="eyebrow">COMMERCIAL CLEAN ALPHA</p><h2>Akademi içerik denetiminde</h2><p>Bu ticari dalda yalnızca Clean Core ve Conversation Coach açıktır. Eski dersler özel V7.0 arşivinde korunur; denetim tamamlanmadan yayımlanmaz.</p></div><button class="primary" type="button" data-v5-open="ai">Conversation Coach’u aç →</button>';academyPanel.prepend(notice)}
    if(notice)notice.hidden=!gated;academyPanel.querySelector('.academy-dashboard-hero')?.toggleAttribute('hidden',gated);academyPanel.querySelector('#academyDashboardProgress')?.toggleAttribute('hidden',gated);
  }
  const storiesPanel=document.querySelector('[data-dashboard-panel="stories"]');
  if(storiesPanel){
    let notice=storiesPanel.querySelector('.wp71-audit-notice');
    if(gated&&!notice){notice=document.createElement('section');notice.className='wp71-audit-notice';notice.innerHTML='<span>📚</span><div><p class="eyebrow">READER CLEANUP</p><h2>Özgün Reader kütüphanesi hazırlanıyor</h2><p>Şüpheli veya kaynak denetimi tamamlanmamış metinler bu dalda açılmaz. Yeni hikâyeler WordPilot tarafından sıfırdan üretilecek.</p></div><button class="secondary" type="button" data-dashboard-tab="games">Clean Core ile çalış →</button>';storiesPanel.prepend(notice)}
    if(notice)notice.hidden=!gated;[...storiesPanel.children].forEach(child=>{if(!child.classList.contains('wp71-audit-notice'))child.toggleAttribute('hidden',gated)});
  }
}
function setupV71Events(){
  wp71EnsureOnboarding();wp71EnsurePairButton();wp71EnsureConversationSpotlight();wp71EnsureAiControls();wp71ApplyInterfaceText();wp71UpdatePairUI();wp71ApplyCommercialGates();
  document.addEventListener('click',e=>{if(!wp71IsAuditGated())return;const blocked=e.target.closest('[data-v5-open="stories"],[data-nav="academy"]');if(blocked){e.preventDefault();e.stopImmediatePropagation();toast('Bu bölüm ticari içerik denetimi tamamlanınca açılacak.');}},true);
  document.addEventListener('click',e=>{
    if(e.target.closest('#wp71PairButton')){wp71OpenOnboarding();return}
    if(e.target.closest('#wp71SaveLanguageProfile')){
      const ui=$('#wp71UiLanguage').value,support=$('#wp71SupportLanguage').value,target=$('#wp71TargetLanguage').value;
      if(support===target){toast('Bildiğin dil ile hedef dil farklı olmalı.');return}
      wp71SaveLanguageProfile({ui,support,target,experience:'standard'});localStorage.setItem(ACTIVE_COURSE_KEY,target);$('#wp71Onboarding').close();location.reload();return;
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('#wp71SupportLanguage,#wp71TargetLanguage'))wp71RefreshOnboardingOptions();
    if(e.target.id==='wp71CorrectionMode'){v5Ensure().preferences.correctionMode=e.target.value;v5Save()}
  });
  const oldSwitch=switchCourse;switchCourse=async function(course){wp71LanguageProfile.target=course;wp71SaveLanguageProfile({target:course});const out=await oldSwitch(course);wp71UpdatePairUI();return out};
}
function wp71AfterInit(){
  wp71EnsureConversationSpotlight();wp71EnsureAiControls();wp71ApplyInterfaceText();wp71UpdatePairUI();wp71ApplyCommercialGates();renderAiCoach();
  if(!wp71LanguageProfile.complete)setTimeout(wp71OpenOnboarding,120);
}
