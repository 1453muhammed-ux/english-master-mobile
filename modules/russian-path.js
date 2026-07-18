/* WordPilot v4.3 Russian learning-path module.
   The legacy STORE and per-course progress records remain unchanged. */
let russianGrammar=[],russianDialogues=[],activePathTab='grammar',activeGrammarLesson=null,grammarQuestionIndex=0,grammarCorrect=0;
const RU_PATH_PROGRESS_KEY='ru_path_v42';

function ruPathProgress(){
  state.stats.taskClaims=state.stats.taskClaims||{};
  return state.stats.taskClaims[RU_PATH_PROGRESS_KEY]||(state.stats.taskClaims[RU_PATH_PROGRESS_KEY]={});
}
function grammarProgress(id){return ruPathProgress()[`g_${id}`]||null}
function dialogueProgress(id){return ruPathProgress()[`d_${id}`]||null}
function setRuPathProgress(key,value){ruPathProgress()[key]={...(ruPathProgress()[key]||{}),...value,at:Date.now()};save();renderXp();renderRussianPathStats()}

async function loadRussianPathData(){
  if(!russianGrammar.length){const r=await fetch(`ru_grammar.json?v=${VERSION}`,{cache:'no-store'});if(!r.ok)throw new Error('ru_grammar.json');russianGrammar=await r.json()}
  if(!russianDialogues.length){const r=await fetch(`ru_dialogues.json?v=${VERSION}`,{cache:'no-store'});if(!r.ok)throw new Error('ru_dialogues.json');russianDialogues=await r.json()}
  return {grammar:russianGrammar,dialogues:russianDialogues};
}
function renderRussianPathStats(){
  const gd=russianGrammar.filter(m=>grammarProgress(m.id)?.completed).length,dd=russianDialogues.filter(d=>dialogueProgress(d.id)?.completed).length;
  if($('#grammarDoneCount'))$('#grammarDoneCount').textContent=`${gd} / ${russianGrammar.length||9}`;
  if($('#dialogueDoneCount'))$('#dialogueDoneCount').textContent=`${dd} / ${russianDialogues.length||15}`;
}
function renderGrammarModules(){
  const grid=$('#grammarModuleGrid');if(!grid)return;
  grid.innerHTML=russianGrammar.map(module=>{const progress=grammarProgress(module.id),done=!!progress?.completed;return `<button type="button" class="grammar-module-card ${done?'completed':''}" data-grammar-module="${esc(module.id)}"><span class="grammar-order">${module.order}</span><span class="grammar-icon">${esc(module.icon)}</span><div><b>${esc(module.title)}</b><small>${esc(module.level)} · ${esc(module.summary)}</small></div><em>${done?'✓ Tamamlandı':'Dersi aç →'}</em></button>`}).join('');
}
function renderDialogueCards(){
  const grid=$('#dialogueGrid');if(!grid)return;
  grid.innerHTML=russianDialogues.map(item=>{const done=!!dialogueProgress(item.id)?.completed;return `<button type="button" class="dialogue-card ${done?'completed':''}" data-dialogue-id="${esc(item.id)}"><span>${String(item.order).padStart(2,'0')}</span><div><b>${esc(item.title)}</b><small>${esc(item.topic)} · ${item.lines.length} konuşma satırı</small></div><em>${done?'✓ Tamamlandı':'Aç →'}</em></button>`}).join('');
}
function switchPathTab(tab){
  activePathTab=tab==='dialogues'?'dialogues':'grammar';$$('[data-path-tab]').forEach(b=>b.classList.toggle('active',b.dataset.pathTab===activePathTab));
  $('#pathGrammarSection')?.classList.toggle('active',activePathTab==='grammar');$('#pathDialoguesSection')?.classList.toggle('active',activePathTab==='dialogues');
  const panel=$('#pathLessonPanel');if(panel)panel.hidden=true;
}
function renderRussianPath(){
  renderRussianPathStats();renderGrammarModules();renderDialogueCards();switchPathTab(activePathTab);
}
function showGrammarLesson(id){
  const module=russianGrammar.find(x=>x.id===id);if(!module)return;activeGrammarLesson=module;grammarQuestionIndex=0;grammarCorrect=0;
  const panel=$('#pathLessonPanel');panel.hidden=false;panel.innerHTML=`<div class="lesson-head"><div><p class="eyebrow">MODÜL ${module.order} · ${esc(module.level)}</p><h2>${esc(module.title)}</h2><p>${esc(module.summary)}</p></div><button type="button" class="soft" data-close-path-panel>Kapat</button></div><div class="lesson-rule-grid">${module.rules.map((rule,i)=>`<div><span>${i+1}</span><p>${esc(rule)}</p></div>`).join('')}</div><div class="lesson-examples"><h3>Örnekler</h3>${module.examples.map((ex,i)=>`<article><button type="button" data-path-speak="${esc(ex.ru)}" title="Dinle">🔊</button><div><b>${esc(ex.stress||ex.ru)}</b><small>${esc(ex.reading)}</small><p>${esc(ex.tr)}</p></div></article>`).join('')}</div><div id="grammarQuizBox" class="grammar-quiz-box"></div>`;
  renderGrammarQuestion();panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderGrammarQuestion(){
  const box=$('#grammarQuizBox'),module=activeGrammarLesson;if(!box||!module)return;
  if(grammarQuestionIndex>=module.quiz.length){
    const old=grammarProgress(module.id),score=Math.round(grammarCorrect/module.quiz.length*100),first=!old?.completed;
    setRuPathProgress(`g_${module.id}`,{completed:true,score});if(first){const active=session;session=null;adjustPoints(30);session=active;toast('Dil bilgisi modülü tamamlandı: +30 PP')}
    box.innerHTML=`<div class="lesson-complete"><span>✓</span><h3>Modül tamamlandı</h3><p>${module.quiz.length} soruda ${grammarCorrect} doğru · %${score}</p><button type="button" class="primary" data-next-grammar="${module.order+1}">Sonraki modül →</button></div>`;renderGrammarModules();return;
  }
  const q=module.quiz[grammarQuestionIndex];box.innerHTML=`<div class="grammar-quiz-head"><span>SORU ${grammarQuestionIndex+1} / ${module.quiz.length}</span><b>${esc(q.q)}</b></div><div class="grammar-options">${q.options.map((opt,i)=>`<button type="button" data-grammar-answer="${i}">${esc(opt)}</button>`).join('')}</div><p id="grammarQuizFeedback" class="academy-game-feedback"></p>`;
}
function answerGrammar(index){
  const module=activeGrammarLesson,q=module?.quiz?.[grammarQuestionIndex];if(!q)return;const correct=Number(index)===Number(q.answer),feedback=$('#grammarQuizFeedback');
  $$('[data-grammar-answer]').forEach((b,i)=>{b.disabled=true;if(i===q.answer)b.classList.add('correct');if(i===Number(index)&&!correct)b.classList.add('wrong')});
  if(correct)grammarCorrect++;feedback.className=`academy-game-feedback ${correct?'good':'bad'}`;feedback.textContent=`${correct?'Doğru ✓':'Doğru cevap: '+q.options[q.answer]}. ${q.explanation}`;
  setTimeout(()=>{grammarQuestionIndex++;renderGrammarQuestion()},950);
}
function showDialogue(id){
  const item=russianDialogues.find(x=>x.id===id);if(!item)return;const panel=$('#pathLessonPanel');panel.hidden=false;
  panel.innerHTML=`<div class="lesson-head"><div><p class="eyebrow">DİYALOG ${item.order} · ${esc(item.level)}</p><h2>${esc(item.title)}</h2><p>${esc(item.topic)}</p></div><button type="button" class="soft" data-close-path-panel>Kapat</button></div><div class="dialogue-lines">${item.lines.map((line,i)=>`<article><span>${esc(line.speaker)}</span><button type="button" data-path-speak="${esc(line.ru)}" title="Dinle">🔊</button><div><b>${esc(line.stress||line.ru)}</b><small>${esc(line.reading)}</small><p>${esc(line.tr)}</p></div></article>`).join('')}</div><div class="dialogue-actions"><button type="button" class="secondary" data-play-dialogue="${esc(item.id)}">▶ Diyaloğun tamamını dinle</button><button type="button" class="primary" data-complete-dialogue="${esc(item.id)}">${dialogueProgress(item.id)?.completed?'✓ Tamamlandı':'Diyaloğu tamamladım · +20 PP'}</button></div>`;
  panel.scrollIntoView({behavior:'smooth',block:'start'});
}
async function playDialogue(id){
  const item=russianDialogues.find(x=>x.id===id);if(!item)return;for(const line of item.lines){speak(line.ru,'ru-RU');await new Promise(r=>setTimeout(r,Math.max(1400,line.ru.length*70)))}
}
function completeDialogue(id){
  const old=dialogueProgress(id);if(!old?.completed){setRuPathProgress(`d_${id}`,{completed:true});const active=session;session=null;adjustPoints(20);session=active;toast('Diyalog tamamlandı: +20 PP')}
  renderDialogueCards();showDialogue(id);
}

const wp41UpdateCourseUI=updateCourseUI;
updateCourseUI=function(){
  wp41UpdateCourseUI();
  const orderingCard=$('#orderingModeCard'),orderingOption=$('#setupMode option[value="ordering"]');if(orderingCard)orderingCard.hidden=false;if(orderingOption)orderingOption.disabled=false;
  const small=orderingCard?.querySelector('small');if(small)small.textContent=`${COURSES[activeCourse].name} örnek cümlesini doğru sıraya koy`;
  if($('#proofModeCount'))$('#proofModeCount').textContent='12';
};

const wp41Nav=nav;
nav=function(name){
  wp41Nav(name);
  if(name==='russian-path')loadRussianPathData().then(renderRussianPath).catch(()=>toast('Rusça öğrenme yolu yüklenemedi.'));
};

function setupV42Events(){
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-path-tab]');if(tab){switchPathTab(tab.dataset.pathTab);return}
    const module=e.target.closest('[data-grammar-module]');if(module){showGrammarLesson(module.dataset.grammarModule);return}
    const dialogue=e.target.closest('[data-dialogue-id]');if(dialogue){showDialogue(dialogue.dataset.dialogueId);return}
    const answerBtn=e.target.closest('[data-grammar-answer]');if(answerBtn){answerGrammar(answerBtn.dataset.grammarAnswer);return}
    const speakBtn=e.target.closest('[data-path-speak]');if(speakBtn){speak(speakBtn.dataset.pathSpeak,'ru-RU');return}
    const playBtn=e.target.closest('[data-play-dialogue]');if(playBtn){playDialogue(playBtn.dataset.playDialogue);return}
    const complete=e.target.closest('[data-complete-dialogue]');if(complete){completeDialogue(complete.dataset.completeDialogue);return}
    if(e.target.closest('[data-close-path-panel]')){const panel=$('#pathLessonPanel');if(panel)panel.hidden=true;return}
    const next=e.target.closest('[data-next-grammar]');if(next){const module=russianGrammar.find(x=>x.order===Number(next.dataset.nextGrammar));if(module)showGrammarLesson(module.id);else{const panel=$('#pathLessonPanel');if(panel)panel.hidden=true}return}
  });
}

