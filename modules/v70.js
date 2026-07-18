/* WordPilot v7.0.0 — premium command center and expanded RU/UZ content. */
const WP70_VERSION='7.1.2';
const WP70_COUNTS={en:5000,ru:1500,uz:1000};
function wp70CourseText(course){
  if(course==='ru')return 'Русский · 1500 kayıt + A1–C2 Akademi';
  if(course==='uz')return 'O‘zbekcha · 1000 kontrollü kayıt';
  return 'English · 5000 kelime + A1–C2 Akademi';
}
function wp70RefreshCounts(){
  if(window.COURSES){
    Object.assign(COURSES.ru,{displayCount:1500,actualCount:1500,countLabel:'1500 kontrollü kelime ve ifade + A1–C2 Akademi'});
    Object.assign(COURSES.uz,{displayCount:1000,actualCount:1000,countLabel:'1000 kontrollü kelime ve ifade'});
  }
  const ru=document.querySelector('[data-course="ru"] small');if(ru)ru.textContent='Türkçe anlatımlı · 1500 kayıt + A1–C2 Akademi';
  const uz=document.querySelector('[data-course="uz"] small');if(uz)uz.textContent='Türkçe anlatımlı · 1000 kontrollü kayıt';
  const summary=document.querySelector('#activeCourseSummary');if(summary)summary.textContent=wp70CourseText(activeCourse);
  document.querySelectorAll('.wp63-vocab-stats article:first-child b').forEach(x=>x.textContent='1500');
  document.querySelectorAll('#russianTools p').forEach(p=>{p.innerHTML=p.innerHTML.replace(/1120|1\.120|1300/g,'1500')});
}
function wp70RefreshCommandCenter(){
  const hub=document.querySelector('.v7-command-center');if(!hub)return;
  const academy=hub.querySelector('[data-dashboard-tab="academy"] small');
  if(academy)academy.textContent=activeCourse==='uz'?'Yakında · 500 kelime':'A1–C2 Akademi';
  hub.dataset.course=activeCourse;
}
function wp70ApplyUzAcademyState(){
  const panel=document.querySelector('[data-dashboard-panel="academy"]');if(!panel)return;
  let notice=panel.querySelector('.v7-uz-coming');
  if(activeCourse==='uz'){
    if(!notice){notice=document.createElement('section');notice.className='v7-uz-coming';notice.innerHTML='<span>🇺🇿</span><div><p class="eyebrow">ÖZBEKÇE AKADEMİ</p><h2>Akademi rotası hazırlanıyor</h2><p>500 kontrollü A1–A2 kelimeyle Quiz, Reader ve Tekrar alanlarını kullanabilirsin. Tam ders yolu sonraki içerik sürümünde açılacak.</p></div><button type="button" data-dashboard-tab="games">Quiz ile başla →</button>';panel.prepend(notice)}
    panel.querySelector('.academy-dashboard-hero')?.setAttribute('hidden','');panel.querySelector('#academyDashboardProgress')?.setAttribute('hidden','');notice.hidden=false;
  }else{
    if(notice)notice.hidden=true;panel.querySelector('.academy-dashboard-hero')?.removeAttribute('hidden');panel.querySelector('#academyDashboardProgress')?.removeAttribute('hidden');
  }
}
function setupV70Events(){
  wp70RefreshCounts();wp70RefreshCommandCenter();wp70ApplyUzAcademyState();
  const oldCourse=window.updateCourseUI;window.updateCourseUI=function(){const out=oldCourse?.();wp70RefreshCounts();wp70RefreshCommandCenter();wp70ApplyUzAcademyState();return out};
  const oldDash=window.renderDashboard;window.renderDashboard=function(){const out=oldDash?.();wp70RefreshCounts();wp70RefreshCommandCenter();wp70ApplyUzAcademyState();return out};
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-dashboard-tab]');if(tab)setTimeout(()=>{wp70RefreshCommandCenter();wp70ApplyUzAcademyState()},0);
  });
}
function wp70AfterInit(){wp70RefreshCounts();wp70RefreshCommandCenter();wp70ApplyUzAcademyState()}
