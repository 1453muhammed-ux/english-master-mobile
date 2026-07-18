/* WordPilot v9.3.0 — Content Quality, semantic links and Phrase Lab 2.0. */
const WP93_VERSION='9.3.0';
const WP93_QUALITY={"version":"9.3.0","generated_at":"2026-07-18","word_count":5000,"reviewed_core":1000,"source_checked_beta":2000,"editorial_beta":2000,"meaning_corrections":43,"words_with_synonym_links":587,"words_with_antonym_links":378,"words_with_family_links":777,"words_with_verified_patterns":162,"phrase_count":240,"phrase_categories":{"conversation":60,"collocation":60,"phrasal_verb":60,"idiom":60},"policy":"Doğrudan ilişkisi olmayan kelimelere yapay eş/zıt anlam eklenmez. 1001–5000 beta katmanı insan editör ve hukuk kontrolü tamamlanmadan ticari final sayılmaz."};
let wp93QualityFilter='';
function wp93QualityLabel(w){return w?.quality_code==='reviewed_core'?'İncelenmiş':w?.quality_code==='source_checked_beta'?'Kaynak kontrollü beta':'Editör beta'}
function wp93QualityClass(w){return w?.quality_code==='reviewed_core'?'reviewed':w?.quality_code==='source_checked_beta'?'checked':'beta'}
function wp93EnsureQualityFilter(){
  if($('#wp93QualityFilter'))return;const status=$('#statusFilter');if(!status)return;
  status.insertAdjacentHTML('afterend','<select id="wp93QualityFilter" aria-label="İçerik kalitesi"><option value="">Tüm içerik durumları</option><option value="reviewed_core">İncelenmiş çekirdek</option><option value="source_checked_beta">Kaynak kontrollü beta</option><option value="editorial_beta">Editör beta</option><option value="relations">Eş/zıt/aile bağlantısı olanlar</option><option value="patterns">Kalıp veya kolokasyonu olanlar</option></select>');
}
const wp93FilteredWordsBase=filteredWords;
filteredWords=function(){let a=wp93FilteredWordsBase();const f=$('#wp93QualityFilter')?.value||wp93QualityFilter;if(!f)return a;if(f==='relations')return a.filter(w=>/\(#\d+\)/.test(`${w.synonyms} ${w.opposite} ${w.family}`));if(f==='patterns')return a.filter(w=>String(w.phrase||w.collocations||'').trim());return a.filter(w=>w.quality_code===f)};
const wp93WordRowBase=wp82WordRow;
wp82WordRow=function(w,selected){const html=wp93WordRowBase(w,selected);return html.replace('<span class="word-level-badge">'+cefr(w)+'</span>','<span class="word-level-badge">'+cefr(w)+'</span><span class="wp93-quality-badge '+wp93QualityClass(w)+'">'+wp93QualityLabel(w)+'</span>')};
function wp93OpenWord(id){
  currentWord=words.find(w=>w.id===Number(id));if(!currentWord)return;
  $('#wordLevel').innerHTML=`${cefr(currentWord)} · ${esc(currentWord.group||'')} <span class="wp93-quality-badge ${wp93QualityClass(currentWord)}">${wp93QualityLabel(currentWord)} · ${Number(currentWord.quality_score)||0}/100</span>`;
  $('#wordEnglish').textContent=currentWord.english;$('#wordPron').textContent=currentWord.pronunciation||'';
  const sections=[['ANLAMLAR',currentWord.meaning],['KULLANIM',currentWord.usage],['ÖRNEK CÜMLELER',(currentWord.completion_examples||[]).map((x,i)=>`${i+1}. ${x}`).join('\n')||currentWord.example],['TÜRKÇESİ',currentWord.translation],['İNGİLİZCE TANIM',currentWord.definition_en||currentWord.source_definition],['EŞ ANLAMLILAR',currentWord.synonyms],['ZIT ANLAMLILAR',currentWord.opposite],['KELİME AİLESİ',currentWord.family],['KALIPLAR',currentWord.phrase],['COLLOCATIONS',currentWord.collocations],['İÇERİK DURUMU',`${wp93QualityLabel(currentWord)} · Kalite puanı ${Number(currentWord.quality_score)||0}/100${currentWord.commercial_safe?' · Ticari çekirdek':' · Ticari final değil'}`],['NOTLAR',currentWord.notes]].filter(x=>x[1]&&clean(x[1]).toLocaleLowerCase('tr')!=='yok');
  const ratedHeaders=new Set(['ANLAMLAR','EŞ ANLAMLILAR','ZIT ANLAMLILAR']);
  $('#wordDetails').innerHTML=sections.map(([h,p])=>`<div class="detail-block"><h4>${h}</h4><p class="${ratedHeaders.has(h)?'rated-lines':''}">${ratedHeaders.has(h)?ratedLinesHtml(p):esc(displayClean(p)).replace(/\n/g,'<br>')}</p></div>`).join('');
  refreshWordStatus();$('#wordDialog').showModal();
}
function wp93Apply(){
  document.documentElement.dataset.wpVersion=WP93_VERSION;document.title='WordPilot 9.3 · İçerik Kalitesi · 5000 Kelime';
  wp91Set($('.version'),'v9.5.0 · Conversation Coach Pro');
  wp91Set($('#view-ai .section-title .eyebrow'),'CONVERSATION COACH 4.0');wp91Set($('#view-ai .section-title h1'),'Conversation Coach 4.0 · Mira');
  wp93EnsureQualityFilter();
  const p=$('#wp90CoveragePanel');if(p)p.innerHTML=`<div><p class="eyebrow">V9.3 İÇERİK KALİTESİ</p><b>5000 benzersiz İngilizce kelime</b><small>1000 incelenmiş çekirdek · 4000 açıkça işaretli beta · yapay eş/zıt anlam üretilmez</small></div><div class="wp90-coverage-stats"><span><b>${WP93_QUALITY.words_with_synonym_links}</b><small>eş anlam bağlantılı</small></span><span><b>${WP93_QUALITY.words_with_antonym_links}</b><small>zıt anlam bağlantılı</small></span><span><b>${WP93_QUALITY.words_with_family_links}</b><small>kelime ailesi</small></span><span><b>${WP93_QUALITY.phrase_count}</b><small>incelenmiş kalıp</small></span></div>`;
  const pc=$('.collection-card[data-collection="phrases"]');if(pc){wp91Set(pc.querySelector('b'),'Phrase Lab 2.0');wp91Set(pc.querySelector('small'),`${WP93_QUALITY.phrase_count} incelenmiş konuşma kalıbı, kolokasyon, phrasal verb ve deyim`)}
}
const wp93OpenPhraseLabBase=wp92OpenPhraseLab;
wp92OpenPhraseLab=async function(){wp92EnsurePhraseDialog();if(!wp92Phrases.length||!wp92Phrases.some(x=>String(x.id).startsWith('wp93-'))){try{wp92Phrases=await fetch('phrases_v93.json?v=9.3.0',{cache:'no-store'}).then(r=>r.json())}catch(e){toast('Kalıp verisi açılamadı.');return}}wp92RenderPhrases();$('#wp92PhraseDialog').showModal()};
function setupV93Events(){document.addEventListener('change',e=>{if(e.target?.id==='wp93QualityFilter'){wp93QualityFilter=e.target.value;if(typeof wp82LibraryPage!=='undefined')wp82LibraryPage=1;renderWords(true)}},true)}
function wp93AfterInit(){
  try{wp92Apply=wp93Apply}catch{}try{wp90ApplyVersionLock=wp93Apply}catch{}try{openWord=wp93OpenWord}catch{}
  wp93Apply();setupV93Events();
  /* v9.5: eski sürüm gözlemcisi devre dışı */
}
