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
initV40().then(()=>{
  if(typeof wp62AfterInit==='function')wp62AfterInit();
  if(typeof wp63AfterInit==='function')wp63AfterInit();
  if(typeof wp64AfterInit==='function')wp64AfterInit();
}).catch(error=>{
  console.error('WordPilot başlangıç hatası',error);
  const box=document.querySelector('#toast');
  if(box){box.textContent='Uygulama başlatılamadı. Sayfayı yenileyin.';box.classList.add('show')}
});
