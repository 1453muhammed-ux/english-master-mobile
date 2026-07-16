setupV431Events();
setupV50Events();
setupV510Events();
setupV511Events();
setupV512Events();
setupV60Events();
setupV61Events();
setupV62Events();
setupV63Events();
setupV64Events();
setupV65Events();
initV40().then(()=>{
  if(typeof wp62AfterInit==='function')wp62AfterInit();
  if(typeof wp63AfterInit==='function')wp63AfterInit();
  if(typeof wp64AfterInit==='function')wp64AfterInit();
  if(typeof wp65AfterInit==='function')wp65AfterInit();
}).catch(error=>{
  console.error('WordPilot başlangıç hatası',error);
  const box=document.querySelector('#toast');
  if(box){box.textContent='Uygulama başlatılamadı. Sayfayı yenileyin.';box.classList.add('show')}
});
