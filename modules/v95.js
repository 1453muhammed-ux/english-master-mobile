/* WordPilot v9.5.0 — Conversation Coach Pro and single-source UI truth. */
const WP95_VERSION='9.6.0';
const WP95_LABEL='v9.6.0 · Unified Concept Route';
const WP95_COUNTS={en:5000,ru:1500,uz:1000,tr:1000};
const WP95_CATEGORIES={all:'Tüm senaryolar',daily:'Günlük yaşam',travel:'Seyahat',health:'Sağlık',services:'Hizmetler',work:'İş hayatı',academic:'Akademik',social:'Sosyal'};
const WP95_LEVELS=['A1','A2','B1','B2','C1','C2'];
let wp95ScenarioCategory='all',wp95ScenarioSearch='',wp95Loaded=false;
const WP95_EXISTING_META={intro:['social','A1'],airport:['travel','A1'],hotel:['travel','A1'],restaurant:['daily','A1'],shopping:['daily','A1'],health:['health','A2'],university:['academic','A2'],interview:['work','B1'],directions:['travel','A1'],emergency:['health','A2']};

function wp95Count(course=activeCourse){
  const cached=courseWordCache?.[course];if(Array.isArray(cached)&&cached.length)return cached.length;
  if(course===activeCourse&&Array.isArray(words)&&words.length)return words.length;
  return Number(WP95_COUNTS[course]||1000);
}
function wp95CourseText(course){const n=wp95Count(course);if(course==='en')return `${n} İngilizce kelime · A1–C2 Akademi`;if(course==='ru')return `${n} kontrollü Rusça kayıt · A1–C2 Akademi`;if(course==='uz')return `${n} kontrollü Özbekçe kayıt`;return `${n} bağlantılı Türkçe kavram`}
function wp95Set(node,text){if(node&&node.textContent!==text)node.textContent=text}
function wp95ApplyTruth(){
  document.documentElement.dataset.wpVersion=WP95_VERSION;document.title='WordPilot 9.6 · Unified Concept Route · Reader 3.0';
  document.querySelectorAll('.version').forEach(n=>wp95Set(n,WP95_LABEL));
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='WordPilot v9.5.0 — Conversation Coach Pro, Reader 3.0 ve gerçek veri sayılarına bağlı çok dilli öğrenme platformu.';
  Object.keys(WP95_COUNTS).forEach(id=>{if(!COURSES[id])return;const n=wp95Count(id);COURSES[id].displayCount=n;COURSES[id].actualCount=n;COURSES[id].reviewedCount=n;COURSES[id].countLabel=wp95CourseText(id)});
  document.querySelectorAll('.course-card[data-course]').forEach(card=>{const id=card.dataset.course;if(WP95_COUNTS[id])wp95Set(card.querySelector('small'),id==='en'?`Türkçe anlatımlı · ${wp95Count(id)} kelime + A1–C2 Akademi`:id==='ru'?`Türkçe anlatımlı · ${wp95Count(id)} kayıt + A1–C2 Akademi`:id==='uz'?`Türkçe anlatımlı · ${wp95Count(id)} kontrollü kayıt`:`Türkçe açıklama desteği · ${wp95Count(id)} bağlantılı kavram`)});
  wp95Set($('#activeCourseSummary'),`${COURSES[activeCourse]?.name||activeCourse} · ${wp95CourseText(activeCourse)}`);
  const max=wp95Count(activeCourse);['setupStart','setupEnd','wp82RangeStart','wp82RangeEnd'].forEach(id=>{const el=$('#'+id);if(el)el.max=String(max)});wp95Set($('#wp82RangeMax'),`1–${max} arasından istediğin kayıtları doğrudan aç.`);
  const first=$('#groupFilter')?.options?.[0];if(first)wp95Set(first,`${max} kaydın tümü`);
  const allRange=document.querySelector('input[name="rangeType"][value="all"]')?.closest('.radio-card')?.querySelector('small');if(allRange)wp95Set(allRange,`${max} kaydın tamamı`);
  const academySmall=document.querySelector('[data-dashboard-tab="academy"] small');if(academySmall)wp95Set(academySmall,activeCourse==='uz'?'Hazırlanıyor':'A1–C2 Akademi');
  const storiesSmall=document.querySelector('[data-dashboard-tab="stories"] small');if(storiesSmall)wp95Set(storiesSmall,'Reader 3.0');
  const hero=$('#wp71ConversationSpotlight');if(hero){wp95Set(hero.querySelector('h2'),'Conversation Coach Pro · Mira');wp95Set(hero.querySelector('[data-wp71="description"]'),'Gerçek yaşam senaryoları, görev algılama, seviye uyarlaması ve ayrıntılı oturum raporu.');const proof=hero.querySelector('[data-wp71="prompts"]');if(proof)wp95Set(proof,'30 profesyonel senaryo')}
  const phraseCard=$('.collection-card[data-collection="phrases"]');if(phraseCard){wp95Set(phraseCard.querySelector('b'),'Phrase Lab 2.0');wp95Set(phraseCard.querySelector('small'),'240 incelenmiş konuşma kalıbı, kolokasyon, phrasal verb ve deyim')}
  const panel=$('#wp90CoveragePanel'),panelKey=`${activeCourse}:${max}`;if(panel&&panel.dataset.wp95!==panelKey){panel.dataset.wp95=panelKey;panel.innerHTML=`<div><p class="eyebrow">V9.5 CANLI İÇERİK DURUMU</p><b>${esc(COURSES[activeCourse]?.name||activeCourse)} · ${max} gerçek kayıt</b><small>Aralıklar ve kurs kartları doğrudan mevcut veri sayısından oluşturulur; olmayan kayıtlar gösterilmez.</small></div><div class="wp90-coverage-stats"><span><b>${max}</b><small>aktif kayıt</small></span><span><b>${v5Stories?.filter(x=>x.course===activeCourse).length||0}</b><small>Reader metni</small></span><span><b>240</b><small>incelenmiş kalıp</small></span><span><b>${activeCourse==='en'||activeCourse==='ru'?30:10}</b><small>konuşma senaryosu</small></span></div>`}
}

function wp95ScenarioSupported(row){const level=$('#wp65AiLevel')?.value||'A1',courseOk=!row.supportedCourses||row.supportedCourses.includes(activeCourse),min=row.minLevel||'A1';return courseOk&&WP95_LEVELS.indexOf(level)>=WP95_LEVELS.indexOf(min)}
function wp95AnnotateExisting(){Object.entries(WP95_EXISTING_META).forEach(([id,[category,minLevel]])=>{const row=WP83_SCENARIOS[id];if(row){row.category=category;row.minLevel=minLevel;row.supportedCourses=['en','ru','uz','tr']}})}
async function wp95LoadScenarios(){
  if(wp95Loaded)return;wp95AnnotateExisting();
  try{const rows=await fetch(`coach_scenarios_v95.json?v=${WP95_VERSION}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});rows.forEach(row=>{WP83_SCENARIOS[row.id]=row;V5_SCENARIOS[row.id]={icon:row.icon,title:row.title,hint:row.hint,category:row.category,supportedCourses:row.supportedCourses,minLevel:row.minLevel}});wp95Loaded=true}catch(error){console.warn('Coach Pro senaryoları yüklenemedi',error);wp95Loaded=true}
}
function wp95EnsureScenarioTools(){
  const aside=$('.ai-scenarios');if(!aside||$('#wp95ScenarioTools'))return;
  aside.querySelector('.eyebrow')?.insertAdjacentHTML('afterend',`<div id="wp95ScenarioTools" class="wp95-scenario-tools"><select id="wp95ScenarioCategory">${Object.entries(WP95_CATEGORIES).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><input id="wp95ScenarioSearch" type="search" placeholder="Senaryo ara…" maxlength="40"><div id="wp95ScenarioStats"></div></div>`);
}
function wp95FilterScenarioList(){
  wp95EnsureScenarioTools();const q=wp95ScenarioSearch.toLocaleLowerCase('tr-TR');let visible=0,total=0;
  $$('#aiScenarioList [data-ai-scenario]').forEach(btn=>{const row=wp83Scenario(btn.dataset.aiScenario),supported=wp95ScenarioSupported(row),category=wp95ScenarioCategory==='all'||row.category===wp95ScenarioCategory,search=!q||`${row.title} ${row.hint} ${row.place||''}`.toLocaleLowerCase('tr-TR').includes(q),show=supported&&category&&search;btn.hidden=!show;if(show)visible++;if(supported)total++;const badge=btn.querySelector('.wp83-scenario-badge');if(badge){const level=row.minLevel||'A1';badge.dataset.level=level;if(!badge.textContent.includes('Tamam'))badge.textContent=`${level}+ · ${row.turns||5} adım`}});
  wp95Set($('#wp95ScenarioStats'),`${visible} senaryo gösteriliyor · bu dil/seviyede ${total} uygun`);
}
function wp95FirstAvailableScenario(){return Object.keys(WP83_SCENARIOS).find(id=>wp95ScenarioSupported(WP83_SCENARIOS[id]))||'intro'}
function wp95EnsureActiveScenario(){const row=wp83Scenario(v5AiScenario);if(!wp95ScenarioSupported(row)){v5AiScenario=wp95FirstAvailableScenario();return true}return false}
function wp95CoachCopy(){
  const view=$('#view-ai');if(!view)return;wp95Set(view.querySelector('.section-title .eyebrow'),'CONVERSATION COACH PRO');wp95Set(view.querySelector('.section-title h1'),'Mira ile profesyonel konuşma pratiği');wp95Set(view.querySelector('.section-title .muted'),'Seviyene uygun gerçek yaşam görevlerini tamamla; tekrar etmeyen sorular, doğal düzeltmeler ve beş ölçütlü oturum raporu al.');
  const backend=$('#aiBackendStatus');if(backend){const cloud=!!V5_SECURITY.aiEnabled;backend.className=`ai-backend-status ${cloud?'ready':'local'}`;backend.innerHTML=cloud?'<b>Coach Pro · Güvenli Bulut AI</b><small>Firebase App Check ve sunucu tarafı gizli anahtar ile bağlama duyarlı düzeltme.</small>':`<b>Coach Pro · Yerel pratik</b><small>${activeCourse==='en'||activeCourse==='ru'?'30':'10'} kontrollü senaryo çevrimdışı çalışır. Bulut AI etkinleştirilmedi.</small>`}
  const brief=$('#wp83ScenarioBrief .wp83-brief-top small');if(brief)brief.textContent=`PRO ROL OYUNU · ${wp83Level()}`;
}
function wp95Normalize(text=''){return v5NormalizeSpeech(text).replace(/ё/g,'е')}
function wp95TaskMatches(message,row,index){const lang=row.keywords?.[activeCourse]?activeCourse:'en',sets=row.keywords?.[lang]||[],need=sets[index]||[],m=wp95Normalize(message);if(need.length)return need.some(k=>m.includes(wp95Normalize(k)));return wp83TokenCount(message)>=3}
function wp95VocabularyScore(message){const t=wp95Normalize(message).split(/\s+/).filter(Boolean),unique=new Set(t);if(!t.length)return 50;return Math.max(55,Math.min(98,Math.round(56+unique.size/Math.max(1,t.length)*32+Math.min(10,t.length)*1.1)))}
function wp95NaturalnessScore(message,feedback){const tokens=wp83TokenCount(message),base=feedback?.status==='correct'?88:76,shape=tokens>=5&&tokens<=28?7:tokens>=3?2:-5;return Math.max(50,Math.min(98,base+shape))}
function wp95RecordTurn(message,feedback){
  const session=wp83Session(),row=wp83Scenario();session.turns++;
  const next=row.tasks.findIndex((_,i)=>!session.completed.includes(i)&&wp95TaskMatches(message,row,i));if(next>=0)session.completed.push(next);
  const score=wp83SmoothedScore(feedback?.score||72,session.lastScore);session.lastScore=score;const grammar=Number(feedback?.metrics?.grammar)||score,clarity=Number(feedback?.metrics?.clarity)||score,fluency=Number(feedback?.metrics?.fluency)||score,vocabulary=wp95VocabularyScore(message),naturalness=wp95NaturalnessScore(message,feedback);
  session.scores.push({score,grammar,clarity,fluency,vocabulary,naturalness,at:new Date().toISOString()});session.scores=session.scores.slice(-60);if(feedback){feedback.rawScore=feedback.score;feedback.score=score;feedback.metrics={...(feedback.metrics||{}),grammar,clarity,fluency,vocabulary,naturalness};feedback.sessionTurn=session.turns}v5Save();return session
}
function wp95Average(rows,key){return rows.length?Math.round(rows.reduce((s,r)=>s+(Number(r[key])||0),0)/rows.length):0}
function wp95Recommendation(metrics,done){const low=Object.entries(metrics).filter(([,v])=>Number(v)>0).sort((a,b)=>a[1]-b[1])[0];const map={grammar:'Bir sonraki turda cümle yapısını biraz daha kontrollü kur.',clarity:'Cevabını daha açık ve kısa parçalara böl.',fluency:'Önce yavaş söyle, ardından aynı cevabı tek akışta tekrar et.',vocabulary:'Aynı kelimeleri tekrarlamak yerine senaryodaki hazır ifadelerden yararlan.',naturalness:'Doğru cümleyi günlük konuşmada kullanılan daha doğal bir kalıpla yeniden söyle.'};return `${done?'Senaryo tamamlandı. ':'Görevlerin bir kısmı kaldı. '}${map[low?.[0]]||'Bir tekrar daha yaparak akıcılığını sabitle.'}`}
function wp95FinishSession(){
  const row=wp83Scenario(),session=wp83Session(),scores=session.scores||[],completed=session.completed?.length||0,done=completed>=row.tasks.length;
  const m={grammar:wp95Average(scores,'grammar'),clarity:wp95Average(scores,'clarity'),fluency:wp95Average(scores,'fluency'),vocabulary:wp95Average(scores,'vocabulary'),naturalness:wp95Average(scores,'naturalness')};const overall=Math.round(Object.values(m).reduce((a,b)=>a+b,0)/5)||0;
  const body=$('#wp83SessionReportBody');if(!body)return;body.innerHTML=`<div class="wp83-report-hero"><span>${done?'🏆':'🧭'}</span><p class="eyebrow">CONVERSATION COACH PRO</p><h2>${esc(row.title)} oturum raporu</h2><p>${esc(wp95Recommendation(m,done))}</p></div><div class="wp83-report-score"><strong>${overall||'—'}</strong><span>genel konuşma puanı</span></div><div class="wp95-report-metrics">${[['grammar','Dil bilgisi'],['clarity','Anlaşılırlık'],['fluency','Akıcılık'],['vocabulary','Kelime çeşitliliği'],['naturalness','Doğallık']].map(([k,l])=>`<span><b>${m[k]||'—'}</b><small>${l}</small></span>`).join('')}</div><div class="wp83-report-tasks"><b>${completed} / ${row.tasks.length} görev tamamlandı</b>${row.tasks.map((task,i)=>`<p class="${session.completed.includes(i)?'done':''}">${session.completed.includes(i)?'✓':'○'} ${esc(task)}</p>`).join('')}</div><div class="wp83-report-actions"><button type="button" class="secondary" data-close="wp83SessionReport">Kapat</button><button id="wp83RestartScenario" type="button" class="primary">Senaryoyu yeniden başlat</button></div>`;$('#wp83SessionReport').showModal()
}

function wp95ApplyCoachPro(){wp95ApplyTruth();wp95EnsureActiveScenario();wp95CoachCopy();wp95EnsureScenarioTools();wp95FilterScenarioList()}
const wp95RenderAiBase=renderAiCoach;
renderAiCoach=function(){wp95EnsureActiveScenario();const out=wp95RenderAiBase();wp95ApplyCoachPro();return out};
const wp95UpdateCourseBase=updateCourseUI;
updateCourseUI=function(){const out=wp95UpdateCourseBase();wp95ApplyTruth();if($('#view-ai')?.classList.contains('active'))setTimeout(()=>{wp95EnsureActiveScenario();renderAiCoach()},0);return out};
const wp95RenderDashboardBase=renderDashboard;
renderDashboard=function(){const out=wp95RenderDashboardBase();wp95ApplyTruth();return out};
const wp95RenderWordsBase=renderWords;
renderWords=function(...args){const out=wp95RenderWordsBase(...args);wp95ApplyTruth();return out};

function setupV95Events(){
  document.addEventListener('input',e=>{if(e.target.id==='wp95ScenarioSearch'){wp95ScenarioSearch=e.target.value;wp95FilterScenarioList()}},true);
  document.addEventListener('change',e=>{if(e.target.id==='wp95ScenarioCategory'){wp95ScenarioCategory=e.target.value;wp95FilterScenarioList()}if(e.target.id==='wp65AiLevel'){v5Ensure().preferences.aiLevel=e.target.value;v5Save();if(wp95EnsureActiveScenario())renderAiCoach();else wp95FilterScenarioList()}},true);
  document.addEventListener('click',e=>{if(e.target.closest('[data-ai-scenario]'))setTimeout(wp95ApplyCoachPro,0)},true);
}
async function wp95AfterInit(){
  await wp95LoadScenarios();wp83RecordTurn=wp95RecordTurn;wp83FinishSession=wp95FinishSession;wp95ApplyTruth();if(wp95EnsureActiveScenario()){}renderAiCoach();
  /* v9.6: eski tek-kaynak gözlemcisi devre dışı; son arayüz doğrusu v96 tarafından yönetilir. */
}
