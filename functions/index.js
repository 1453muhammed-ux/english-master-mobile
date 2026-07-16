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
function languageName(course){return course==='ru'?'Russian':course==='uz'?'Uzbek':'English'}

exports.aiCoach=onCall({region:REGION,secrets:[OPENAI_API_KEY],enforceAppCheck:true,cors:true,maxInstances:10,timeoutSeconds:45},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Google sign-in is required.');
  const data=request.data||{},course=['en','ru','uz'].includes(data.course)?data.course:'en',scenario=clean(data.scenario,40),message=clean(data.message,600);
  if(!message)throw new HttpsError('invalid-argument','Message is required.');
  const db=getFirestore(),uid=request.auth.uid,usageRef=db.collection('aiUsage').doc(uid),now=Date.now();
  await db.runTransaction(async tx=>{
    const snap=await tx.get(usageRef),row=snap.exists?snap.data():{},windowStart=Number(row.windowStart)||0,count=Number(row.count)||0;
    const fresh=now-windowStart>60_000;if(!fresh&&count>=12)throw new HttpsError('resource-exhausted','Please wait before sending another message.');
    tx.set(usageRef,{windowStart:fresh?now:windowStart,count:fresh?1:count+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  });
  const history=Array.isArray(data.history)?data.history.slice(-10).map(x=>`${x.role==='assistant'?'Tutor':'Learner'}: ${clean(x.text,500)}`).join('\n'):'';
  const language=languageName(course);
  const level=['A1','A2','B1','B2','C1','C2'].includes(data.level)?data.level:'A1';
  const instructions=`You are WordPilot, a supportive ${language} tutor for an adult ${level} learner. Continue the role-play scenario "${scenario}". Reply mainly in ${language}, using 1-3 natural sentences suitable for ${level}. Evaluate the learner's latest message. Output exactly these labeled lines and nothing else:
YANIT: <your conversational reply>
DURUM: <DOGRU or DUZELT>
DUZELTILMIS: <best corrected version of the learner message; repeat it unchanged if already correct>
ACIKLAMA: <one brief Turkish explanation>
ALTERNATIF: <one natural alternative phrase in ${language}>
Never request sensitive personal data. Do not provide medical, legal, financial, or dangerous instructions. Keep the exchange suitable for language practice.`;
  const client=new OpenAI({apiKey:OPENAI_API_KEY.value()});
  const response=await client.responses.create({model:OPENAI_MODEL.value(),instructions,input:`Conversation so far:
${history}
Learner: ${message}
Tutor:`,max_output_tokens:320});
  const raw=clean(response.output_text,1800)||'';
  const field=(name,max)=>clean((raw.match(new RegExp(`${name}\\s*:\\s*([\\s\\S]*?)(?=\\n(?:YANIT|DURUM|DUZELTILMIS|ACIKLAMA|ALTERNATIF)\\s*:|$)`,'i'))||[])[1],max);
  const status=/DOGRU/i.test(field('DURUM',30))?'correct':'needs_work';
  return {text:field('YANIT',900)||'Please try again.',status,corrected:field('DUZELTILMIS',600)||message,explanation:field('ACIKLAMA',350),suggestion:field('ALTERNATIF',500),correction:field('ACIKLAMA',350),mode:'cloud'};
});

const fs=require('node:fs');
const path=require('node:path');
const CONTENT_FILES={
  'course:en':'words.json','course:ru':'ru_words.json','course:uz':'uz_words.json',
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
  const data=request.data||{},kind=clean(data.kind,30)||'course',course=['en','ru','uz'].includes(data.course)?data.course:'en';
  const key=kind==='course'?`course:${course}`:kind==='stories'?'stories:all':kind==='academy'?'academy:all':kind==='alphabet'?'ru:alphabet':kind==='grammar'?'ru:grammar':kind==='dialogues'?'ru:dialogues':kind==='verbs'?'ru:verbs':kind==='exam'?'ru:exam':kind==='source'?'source:atlas':'';
  const db=getFirestore();await enforceContentRate(db,request.auth.uid);
  const all=readContent(key),offset=Math.max(0,Math.floor(Number(data.offset)||0)),limit=Math.max(1,Math.min(500,Math.floor(Number(data.limit)||250)));
  const base=kind==='exam'?all.tasks:kind==='source'?all.packs:all;const filtered=kind==='stories'?base.filter(x=>!data.course||x.course===course):base;
  return {version:'6.5.0',kind,course,offset,limit,total:filtered.length,items:filtered.slice(offset,offset+limit)};
});


exports.transcribeAudio=onCall({region:REGION,secrets:[OPENAI_API_KEY],enforceAppCheck:true,cors:true,maxInstances:6,timeoutSeconds:60},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Google sign-in is required.');
  const data=request.data||{},course=['en','ru','uz'].includes(data.course)?data.course:'en',mime=clean(data.mimeType,80)||'audio/webm',audio=String(data.audioBase64||'');
  if(!audio||audio.length>7_000_000)throw new HttpsError('invalid-argument','Audio is missing or too large.');
  const db=getFirestore(),uid=request.auth.uid,ref=db.collection('voiceUsage').doc(uid),now=Date.now();
  await db.runTransaction(async tx=>{const snap=await tx.get(ref),row=snap.exists?snap.data():{},windowStart=Number(row.windowStart)||0,count=Number(row.count)||0,fresh=now-windowStart>60_000;if(!fresh&&count>=8)throw new HttpsError('resource-exhausted','Please wait before recording again.');tx.set(ref,{windowStart:fresh?now:windowStart,count:fresh?1:count+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});});
  const ext=mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':'webm';
  const file=new File([Buffer.from(audio,'base64')],`wordpilot-speech.${ext}`,{type:mime});
  const client=new OpenAI({apiKey:OPENAI_API_KEY.value()});
  const result=await client.audio.transcriptions.create({file,model:OPENAI_TRANSCRIBE_MODEL.value(),language:course==='ru'?'ru':course==='uz'?'uz':'en'});
  return {text:clean(result.text,1200),mode:'cloud'};
});
