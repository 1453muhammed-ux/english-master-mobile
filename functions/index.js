'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const OpenAI=require('openai');

initializeApp();
const OPENAI_API_KEY=defineSecret('OPENAI_API_KEY');
const OPENAI_MODEL=defineString('OPENAI_MODEL',{default:'gpt-5-mini'});
const OPENAI_TRANSCRIBE_MODEL=defineString('OPENAI_TRANSCRIBE_MODEL',{default:'gpt-4o-mini-transcribe'});
const REGION='us-central1';

function clean(value,max=600){return String(value||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}
const LANGUAGE_NAMES={en:'English',tr:'Turkish',ru:'Russian',uz:'Uzbek',es:'Spanish',de:'German',fr:'French',it:'Italian',pt:'Portuguese',ja:'Japanese',ko:'Korean',zh:'Chinese'};
const TRANSCRIBE_CODES={en:'en',tr:'tr',ru:'ru',uz:'uz',es:'es',de:'de',fr:'fr',it:'it',pt:'pt',ja:'ja',ko:'ko',zh:'zh'};
function languageName(course){return LANGUAGE_NAMES[course]||'English'}
function supportLanguageName(course){return LANGUAGE_NAMES[course]||'English'}

exports.aiCoach=onCall({region:REGION,secrets:[OPENAI_API_KEY],enforceAppCheck:true,cors:true,maxInstances:10,timeoutSeconds:45},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Google sign-in is required.');
  const data=request.data||{},allowed=Object.keys(LANGUAGE_NAMES),course=allowed.includes(data.course)?data.course:'en',support=allowed.includes(data.supportLanguage)?data.supportLanguage:'tr',scenario=clean(data.scenario,40),message=clean(data.message,600),inputSource=data.inputSource==='voice'?'voice':'typed';
  if(!message)throw new HttpsError('invalid-argument','Message is required.');
  const level=['A1','A2','B1','B2','C1','C2'].includes(data.level)?data.level:'A1',correctionMode=['fluency','gentle','teacher'].includes(data.correctionMode)?data.correctionMode:'gentle';
  const db=getFirestore(),uid=request.auth.uid,usageRef=db.collection('aiUsage').doc(uid),now=Date.now(),day=new Date().toISOString().slice(0,10);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(usageRef),row=snap.exists?snap.data():{},windowStart=Number(row.windowStart)||0,count=Number(row.count)||0,fresh=now-windowStart>60_000,dailyDay=String(row.dailyDay||''),dailyCount=dailyDay===day?Number(row.dailyCount)||0:0;
    if(!fresh&&count>=12)throw new HttpsError('resource-exhausted','Please wait before sending another message.');
    if(dailyCount>=80)throw new HttpsError('resource-exhausted','Daily conversation limit reached.');
    tx.set(usageRef,{windowStart:fresh?now:windowStart,count:fresh?1:count+1,dailyDay:day,dailyCount:dailyCount+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  });
  const historyRows=Array.isArray(data.history)?data.history.slice(-30).map(x=>({role:x.role==='assistant'?'Tutor':'Learner',text:clean(x.text,500)})):[];
  const history=historyRows.map(x=>`${x.role}: ${x.text}`).join('\n');
  const tutorQuestions=historyRows.filter(x=>x.role==='Tutor').map(x=>x.text).filter(Boolean).slice(-15);
  const language=languageName(course),supportName=supportLanguageName(support);
  const correctionRule=correctionMode==='fluency'?'Ignore minor mistakes that do not block meaning; mention that they were skipped. Correct only major grammar or word-choice errors.':correctionMode==='teacher'?'Identify the exact grammar, word-choice, repetition, or sentence-completion problem. Explain how the correction changes meaning or naturalness. Never use a generic punctuation explanation when a more important problem exists.':'Correct important mistakes gently and keep the conversation moving.';
  const instructions=`You are Mira, WordPilot Conversation Coach 4.0, a warm and professional ${language} speaking tutor for a ${level} learner. The real-life role-play scenario is "${scenario}". The learner's explanation language is ${supportName}.

Conversation policy:
- Stay in the selected real-life role and continue naturally from the learner's latest answer. Use facts already shared.
- Ask exactly ONE short, practical follow-up question in ${language} at the end of YANIT so the learner can complete the scenario.
- Never repeat or paraphrase any of these recent tutor questions: ${JSON.stringify(tutorQuestions)}.
- If the learner already answered a topic, deepen it with how/why/when/comparison rather than restarting.
- Keep YANIT to 1-3 natural sentences suitable for ${level}.
- ${correctionRule}
- Input source is ${inputSource}. When it is voice, do NOT penalise missing capitalisation or punctuation because speech recognition normally omits them.
- If transcription seems uncertain, say so instead of confidently inventing a correction.
- Score grammar, clarity and fluency separately.
- Never invent personal facts. Never request sensitive personal data.
- Keep content suitable for general language learning.

Output exactly these labeled lines and nothing else:
YANIT: <natural reply plus one new question in ${language}>
DURUM: <DOGRU or DUZELT>
DUZELTILMIS: <best corrected version; unchanged if correct>
ACIKLAMA: <brief explanation in ${supportName}>
ALTERNATIF: <one natural alternative in ${language}>
HATA_TURU: <none, grammar, tense, word_choice, article, preposition, spelling, punctuation, fluency, or script>
NOT: <a brief note in ${supportName}; say when minor issues were intentionally skipped, otherwise leave empty>
PUAN: <integer 0-100>
DILBILGISI: <integer 0-100>
ANLASILIRLIK: <integer 0-100>
AKICILIK: <integer 0-100>`;
  const client=new OpenAI({apiKey:OPENAI_API_KEY.value()});
  const response=await client.responses.create({model:OPENAI_MODEL.value(),instructions,input:`Conversation so far:\n${history}\nLearner: ${message}\nTutor:`,max_output_tokens:440});
  const raw=clean(response.output_text,2400)||'';
  const labels='YANIT|DURUM|DUZELTILMIS|ACIKLAMA|ALTERNATIF|HATA_TURU|NOT|PUAN|DILBILGISI|ANLASILIRLIK|AKICILIK';
  const field=(name,max)=>clean((raw.match(new RegExp(`${name}\\s*:\\s*([\\s\\S]*?)(?=\\n(?:${labels})\\s*:|$)`,'i'))||[])[1],max);
  const status=/DOGRU/i.test(field('DURUM',30))?'correct':'needs_work',score=Math.max(0,Math.min(100,Math.round(Number(field('PUAN',10))||0)));
  const metric=name=>Math.max(0,Math.min(100,Math.round(Number(field(name,10))||score)));
  return {text:field('YANIT',1000)||'Please tell me a little more.',status,corrected:field('DUZELTILMIS',600)||message,explanation:field('ACIKLAMA',500),suggestion:field('ALTERNATIF',600),errorType:field('HATA_TURU',40)||'none',note:field('NOT',400),score,metrics:{grammar:metric('DILBILGISI'),clarity:metric('ANLASILIRLIK'),fluency:metric('AKICILIK')},mode:'cloud-v90'};
});

const fs=require('node:fs');
const path=require('node:path');
const CONTENT_FILES={
  'course:en':'words.json','ledger:all':'concept_ledger_v90.json','course:ru':'ru_words.json','course:uz':'uz_words.json','course:tr':'clean_concepts_v711.json','concepts:clean':'clean_concepts_v711.json',
  'stories:all':'stories.json','academy:all':'curriculum_v6.json','ru:alphabet':'ru_alphabet.json','ru:grammar':'ru_grammar.json','ru:dialogues':'ru_dialogues.json','ru:verbs':'ru_verb_lab.json','source:atlas':'source_atlas_v63.json','ru:exam':'ru_exam_lab.json'
};
const contentCache=new Map();
function readContent(key){
  const file=CONTENT_FILES[key];if(!file)throw new HttpsError('invalid-argument','Unknown content pack.');
  if(!contentCache.has(key))contentCache.set(key,JSON.parse(fs.readFileSync(path.join(__dirname,'data',file),'utf8')));
  return contentCache.get(key);
}
async function enforceContentRate(db,uid){
  const ref=db.collection('contentUsage').doc(uid),now=Date.now();
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref),row=snap.exists?snap.data():{},windowStart=Number(row.windowStart)||0,count=Number(row.count)||0,fresh=now-windowStart>60_000;
    if(!fresh&&count>=80)throw new HttpsError('resource-exhausted','Content request limit reached.');
    tx.set(ref,{windowStart:fresh?now:windowStart,count:fresh?1:count+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  });
}

// Optional protected-content endpoint. It is not used until static JSON migration is enabled.
// Requires authenticated users and valid Firebase App Check tokens.
exports.getContentPack=onCall({region:REGION,enforceAppCheck:true,cors:true,maxInstances:20,timeoutSeconds:30},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Google sign-in is required.');
  const data=request.data||{},kind=clean(data.kind,30)||'course',course=['en','tr','ru','uz'].includes(data.course)?data.course:'en';
  const key=kind==='concepts'?'concepts:clean':kind==='course'?`course:${course}`:kind==='stories'?'stories:all':kind==='academy'?'academy:all':kind==='alphabet'?'ru:alphabet':kind==='grammar'?'ru:grammar':kind==='dialogues'?'ru:dialogues':kind==='verbs'?'ru:verbs':kind==='exam'?'ru:exam':kind==='source'?'source:atlas':kind==='ledger'?'ledger:all':'';
  const db=getFirestore();await enforceContentRate(db,request.auth.uid);
  const all=readContent(key),offset=Math.max(0,Math.floor(Number(data.offset)||0)),limit=Math.max(1,Math.min(500,Math.floor(Number(data.limit)||250)));
  const base=kind==='exam'?all.tasks:kind==='source'?all.packs:all;const filtered=kind==='stories'?base.filter(x=>!data.course||x.course===course):base;
  return {version:'9.0.0',kind,course,offset,limit,total:filtered.length,items:filtered.slice(offset,offset+limit)};
});


exports.transcribeAudio=onCall({region:REGION,secrets:[OPENAI_API_KEY],enforceAppCheck:true,cors:true,maxInstances:6,timeoutSeconds:60},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Google sign-in is required.');
  const data=request.data||{},course=Object.keys(LANGUAGE_NAMES).includes(data.course)?data.course:'en',mime=clean(data.mimeType,80)||'audio/webm',audio=String(data.audioBase64||'');
  if(!audio||audio.length>7_000_000)throw new HttpsError('invalid-argument','Audio is missing or too large.');
  const db=getFirestore(),uid=request.auth.uid,ref=db.collection('voiceUsage').doc(uid),now=Date.now();
  await db.runTransaction(async tx=>{const snap=await tx.get(ref),row=snap.exists?snap.data():{},windowStart=Number(row.windowStart)||0,count=Number(row.count)||0,fresh=now-windowStart>60_000;if(!fresh&&count>=8)throw new HttpsError('resource-exhausted','Please wait before recording again.');tx.set(ref,{windowStart:fresh?now:windowStart,count:fresh?1:count+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});});
  const ext=mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':'webm';
  const file=new File([Buffer.from(audio,'base64')],`wordpilot-speech.${ext}`,{type:mime});
  const client=new OpenAI({apiKey:OPENAI_API_KEY.value()});
  const result=await client.audio.transcriptions.create({file,model:OPENAI_TRANSCRIBE_MODEL.value(),language:TRANSCRIBE_CODES[course]||'en'});
  return {text:clean(result.text,1200),mode:'cloud-v90'};
});


// Deployment readiness probe. The secret is bound only to this function and is never returned.
exports.aiHealth=onCall({region:REGION,secrets:[OPENAI_API_KEY],enforceAppCheck:true,cors:true,maxInstances:5,timeoutSeconds:15},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Sign-in is required.');
  return {ready:Boolean(OPENAI_API_KEY.value()),version:'9.0.0',coach:'4.0',model:OPENAI_MODEL.value(),voiceTranscription:true,appCheck:Boolean(request.app)};
});

function requireAdmin(request){
  if(!request.auth)throw new HttpsError('unauthenticated','Sign-in is required.');
  if(request.auth.token?.admin!==true)throw new HttpsError('permission-denied','WordPilot admin permission is required.');
}
function parseJsonObject(text){
  const cleanText=String(text||'').replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  try{return JSON.parse(cleanText)}catch{}
  const start=cleanText.indexOf('{'),end=cleanText.lastIndexOf('}');if(start>=0&&end>start)return JSON.parse(cleanText.slice(start,end+1));
  throw new HttpsError('internal','The translation draft could not be parsed.');
}

// Admin-only multilingual pipeline. Generated records are private drafts and are never
// published automatically. Firestore rules deny all browser access to contentDrafts.
exports.generateLanguageDraftBatch=onCall({region:REGION,secrets:[OPENAI_API_KEY],enforceAppCheck:true,consumeAppCheckToken:true,cors:true,maxInstances:2,timeoutSeconds:120,memory:'1GiB'},async request=>{
  requireAdmin(request);const data=request.data||{},target=Object.keys(LANGUAGE_NAMES).includes(data.targetLanguage)?data.targetLanguage:'';
  if(!target||['en','tr'].includes(target))throw new HttpsError('invalid-argument','Choose a supported target language other than English or Turkish.');
  const start=Math.max(1,Math.min(3000,Math.floor(Number(data.start)||1))),limit=Math.max(1,Math.min(20,Math.floor(Number(data.limit)||10))),ledger=readContent('ledger:all').slice(start-1,start-1+limit);
  if(!ledger.length)throw new HttpsError('not-found','No concepts found for this range.');
  const client=new OpenAI({apiKey:OPENAI_API_KEY.value()}),language=languageName(target);
  const instructions=`Create careful ${language} learning-content DRAFTS for WordPilot. Preserve every concept_id and learning_rank. Use the English word and Turkish meaning only as semantic anchors. Return strict JSON: {"items":[{"concept_id":"...","learning_rank":1,"term":"...","pronunciation":"...","meaning_tr":"...","example":"...","example_tr":"...","cefr":"A1"}]}. Do not add explanations, markdown or extra keys. Examples must be natural, short and original. Never copy an external course. If a translation is uncertain, set review_note instead of guessing.`;
  const response=await client.responses.create({model:OPENAI_MODEL.value(),instructions,input:JSON.stringify(ledger.map(x=>({concept_id:x.concept_id,learning_rank:x.learning_rank,english:x.english,meaning_tr:x.meaning_tr,cefr:x.cefr}))),max_output_tokens:4000});
  const parsed=parseJsonObject(response.output_text),items=Array.isArray(parsed.items)?parsed.items:[];if(!items.length)throw new HttpsError('internal','No draft items were generated.');
  const db=getFirestore(),batch=db.batch(),created=[];
  for(const item of items.slice(0,limit)){
    const rank=Math.floor(Number(item.learning_rank)||0),source=ledger.find(x=>x.learning_rank===rank&&x.concept_id===item.concept_id);if(!source)continue;
    const id=`${target}_${String(rank).padStart(6,'0')}`,row={...item,targetLanguage:target,sourceEnglish:source.english,sourceMeaningTr:source.meaning_tr,status:'draft',commercialSafe:false,generatedBy:'WordPilot v9 secure admin pipeline',createdBy:request.auth.uid,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
    batch.set(db.collection('contentDrafts').doc(id),row,{merge:true});created.push(id);
  }
  await batch.commit();return {ok:true,status:'draft-only',targetLanguage:target,created:created.length,ids:created};
});


// Generates fresh, natural sentence-completion contexts. Results are cached in the
// learner's browser; the API key remains inside Secret Manager-bound Functions.
exports.sentencePractice=onCall({region:REGION,secrets:[OPENAI_API_KEY],enforceAppCheck:true,cors:true,maxInstances:6,timeoutSeconds:35},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Sign-in is required.');
  const data=request.data||{},word=clean(data.word,80),meaningTr=clean(data.meaningTr,160),cefr=['A1','A2','B1','B2','C1','C2'].includes(data.cefr)?data.cefr:'A1',partOfSpeech=clean(data.partOfSpeech,30);
  if(!word||!/^[A-Za-z][A-Za-z' -]{0,79}$/.test(word))throw new HttpsError('invalid-argument','A valid English target is required.');
  const db=getFirestore(),ref=db.collection('sentenceUsage').doc(request.auth.uid),now=Date.now();
  await db.runTransaction(async tx=>{const snap=await tx.get(ref),row=snap.exists?snap.data():{},windowStart=Number(row.windowStart)||0,count=Number(row.count)||0,fresh=now-windowStart>60_000;if(!fresh&&count>=10)throw new HttpsError('resource-exhausted','Please wait before generating more practice sentences.');tx.set(ref,{windowStart:fresh?now:windowStart,count:fresh?1:count+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});});
  const client=new OpenAI({apiKey:OPENAI_API_KEY.value()});
  const instructions=`Create exactly three original, natural English example sentences for a ${cefr} learner. The exact target text is ${JSON.stringify(word)}; Turkish meaning is ${JSON.stringify(meaningTr)}; part of speech is ${JSON.stringify(partOfSpeech)}. Every sentence must use the target with the intended everyday meaning, provide enough context to choose it in a fill-the-blank quiz, and differ clearly in situation and structure. Avoid dictionary-style wording, quotations around the target, meta-language, sensitive data, and copied course text. Return strict JSON only: {"examples":["...","...","..."]}.`;
  const response=await client.responses.create({model:OPENAI_MODEL.value(),instructions,input:'Generate the three practice sentences.',max_output_tokens:320});
  const parsed=parseJsonObject(response.output_text),examples=(Array.isArray(parsed.examples)?parsed.examples:[]).map(x=>clean(x,240)).filter(Boolean).slice(0,3);
  const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),reTarget=new RegExp(`(^|[^A-Za-z])${escaped}(?=[^A-Za-z]|$)`,'i');
  if(examples.length!==3||examples.some(x=>!reTarget.test(x)))throw new HttpsError('internal','Sentence generation did not pass validation.');
  return {ok:true,examples,version:'9.0.0',mode:'secure-cloud'};
});
