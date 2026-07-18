/* WordPilot v9.1.0 — honest multilingual coverage and dynamic library ranges. */
const WP91_VERSION='9.1.0';
const WP91_COUNTS={en:3000,ru:1500,uz:1000,tr:1000,es:1000,de:1000,fr:1000,it:1000,pt:1000,ja:1000,ko:1000,zh:1000};
const WP91_REVIEW_LABEL={en:'3000 İngilizce kelime · 1000 incelenmiş + 2000 beta',ru:'1500 kontrollü Rusça kayıt',uz:'1000 kontrollü Özbekçe kayıt',tr:'1000 bağlantılı Türkçe kavram'};
function wp91Count(id){return Number(WP91_COUNTS[id]||COURSES[id]?.actualCount||COURSES[id]?.displayCount||1000)}
function wp91CourseText(id){return WP91_REVIEW_LABEL[id]||`${wp91Count(id)} bağlantılı kayıt · beta`}
function wp91Set(node,text){if(node&&node.textContent!==text)node.textContent=text}
function wp91GroupOptions(){
  const group=$('#groupFilter');if(!group)return;
  const max=wp91Count(activeCourse),current=group.value;
  let html=`<option value="">${max} kaydın tümü</option>`;
  if(activeCourse==='en')html+='<option value="base1000">1–1000 İncelenmiş Çekirdek</option><option value="extended2000">1001–3000 Genişletilmiş Beta</option>';
  else if(activeCourse==='ru')html+='<option value="wp91core">1–1000 Temel Rusça</option><option value="wp91extended">1001–1500 Genişletilmiş Rusça</option>';
  if(group.innerHTML!==html)group.innerHTML=html;
  if([...group.options].some(o=>o.value===current))group.value=current;
}
function wp91RangePresets(){
  const wrap=$('.wp82-range-presets');if(!wrap)return;const max=Math.max(1,words.length||wp91Count(activeCourse));
  const ranges=[[1,Math.min(50,max)]];
  if(max>50)ranges.push([51,Math.min(100,max)]);
  if(max>100)ranges.push([101,Math.min(200,max)]);
  if(max>=1000)ranges.push([951,1000]);
  if(max>1000)ranges.push([1001,Math.min(1050,max)]);
  if(max>1500)ranges.push([Math.max(1,max-49),max]);
  else if(max>1050)ranges.push([Math.max(1,max-49),max]);
  const seen=new Set();const html=ranges.filter(([a,b])=>a<=b&&!seen.has(`${a}-${b}`)&&seen.add(`${a}-${b}`)).map(([a,b])=>`<button type="button" data-wp82-range="${a}-${b}">${a}–${b}</button>`).join('');
  if(wrap.innerHTML!==html)wrap.innerHTML=html;
}
function wp91FilterRuGroups(){
  if(activeCourse!=='ru')return;const group=$('#groupFilter')?.value||'';
  if(group!=='wp91core'&&group!=='wp91extended')return;
  const base=words.filter(w=>group==='wp91core'?Number(w.id)<=1000:Number(w.id)>=1001&&Number(w.id)<=1500);
  return base;
}
const wp91FilteredBase=filteredWords;
filteredWords=function(){
  if(activeCourse==='ru'){
    const special=wp91FilterRuGroups();if(special){
      const search=($('#wordSearch')?.value||'').trim().toLocaleLowerCase('tr-TR');
      const level=$('#levelFilter')?.value||'',status=$('#statusFilter')?.value||'';
      let list=special;
      if(search)list=list.filter(w=>[w.english,w.meaning,w.pronunciation,w.example,w.translation].some(v=>String(v||'').toLocaleLowerCase('tr-TR').includes(search)));
      if(level)list=list.filter(w=>cefr(w)===level);
      if(status)list=list.filter(w=>statusOf(w.id)===status);
      const {start,end}=typeof wp82LibraryRange!=='undefined'?wp82LibraryRange:{};
      if(Number.isFinite(start)&&Number.isFinite(end))list=list.filter(w=>Number(w.id)>=start&&Number(w.id)<=end);
      return list;
    }
  }
  return wp91FilteredBase();
};
function wp91ApplyTruth(){
  document.documentElement.dataset.wpVersion=WP91_VERSION;document.title='WordPilot 9.1 · Tutarlı Dil Kütüphanesi · Coach 4.0';
  wp91Set($('.version'),'v9.1.0 · Tester Beta');
  Object.keys(COURSES).forEach(id=>{const n=wp91Count(id);COURSES[id].displayCount=n;COURSES[id].actualCount=n;COURSES[id].reviewedCount=n});
  $$('.course-card[data-course]').forEach(card=>wp91Set(card.querySelector('small'),wp91CourseText(card.dataset.course)));
  wp91Set($('#activeCourseSummary'),`${COURSES[activeCourse]?.name||activeCourse} · ${wp91CourseText(activeCourse)}`);
  wp91GroupOptions();
  const max=Math.max(1,words.length||wp91Count(activeCourse));
  ['setupStart','setupEnd','wp82RangeStart','wp82RangeEnd'].forEach(id=>{const input=$('#'+id);if(input)input.max=String(max)});
  wp91Set($('#wp82RangeMax'),`1–${max} arasından istediğin kayıtları doğrudan aç.`);
  const allRange=document.querySelector('input[name="rangeType"][value="all"]')?.closest('.radio-card')?.querySelector('small');if(allRange)wp91Set(allRange,`${max} kaydın tamamı`);
  wp91RangePresets();
  const panel=$('#wp90CoveragePanel');if(panel){
    const title=activeCourse==='en'?'3000 gerçek İngilizce kelime':`${max} gerçek ${COURSES[activeCourse]?.name||''} kaydı`;
    const note=activeCourse==='en'?'1000 incelenmiş çekirdek + 2000 editör kontrolü bekleyen beta kayıt':'Yalnızca veri dosyasında gerçekten bulunan kayıtlar gösterilir; olmayan aralıklar sunulmaz.';
    panel.innerHTML=`<div><p class="eyebrow">V9.1 KÜTÜPHANE DURUMU</p><b>${title}</b><small>${note}</small></div><div class="wp90-coverage-stats"><span><b>${max}</b><small>aktif kayıt</small></span><span><b>A1–C2</b><small>seviye alanı</small></span><span><b>Gerçek</b><small>dinamik sınırlar</small></span></div>`;
  }
  wp91Set($('#view-ai .section-title .eyebrow'),'CONVERSATION COACH 4.0');wp91Set($('#view-ai .section-title h1'),'Conversation Coach 4.0 · Mira');
}
function setupV91Events(){
  document.addEventListener('click',e=>{if(e.target.closest('.course-card[data-course]'))setTimeout(()=>{wp91ApplyTruth();renderWords(true)},420)},true);
  document.addEventListener('change',e=>{if(e.target?.id==='groupFilter'&&activeCourse==='ru')renderWords(true)},true);
}
function wp91AfterInit(){
  if(typeof wp90ApplyVersionLock==='function')wp90ApplyVersionLock=wp91ApplyTruth;
  wp91ApplyTruth();
  const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(wp91ApplyTruth,140)});observer.observe(document.body,{childList:true,subtree:true});
}
