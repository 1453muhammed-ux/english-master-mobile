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
setupV70Events();
setupV71Events();
setupV711Events();
setupV712Events();
setupV80Events();
setupV82Events();
initV40().then(()=>{
  if(typeof wp62AfterInit==='function')wp62AfterInit();
  if(typeof wp63AfterInit==='function')wp63AfterInit();
  if(typeof wp64AfterInit==='function')wp64AfterInit();
  if(typeof wp65AfterInit==='function')wp65AfterInit();
  if(typeof wp70AfterInit==='function')wp70AfterInit();
  if(typeof wp71AfterInit==='function')wp71AfterInit();
  if(typeof wp711AfterInit==='function')wp711AfterInit();
  if(typeof wp712AfterInit==='function')wp712AfterInit();
  if(typeof wp80AfterInit==='function')wp80AfterInit();
  if(typeof wp81AfterInit==='function')wp81AfterInit();
  if(typeof wp82AfterInit==='function')wp82AfterInit();
}).catch(error=>{
  console.error('WordPilot başlangıç hatası',error);
  const box=document.querySelector('#toast');
  if(box){box.textContent='Uygulama başlatılamadı. Sayfayı yenileyin.';box.classList.add('show')}
});
