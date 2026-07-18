/* WordPilot v5.0.0 — language-specific PP and themed lesson cards.
   Course states stay separate; only the public league score is the sum of all courses. */
function v431CourseMetrics(course){
  const meta=COURSES[course],states=courseStatesFor(),st=states[course]||defaultState();
  const all=periodTotalsForState(st,'all'),today=periodTotalsForState(st,'daily'),week=periodTotalsForState(st,'weekly');
  const c=countsForState(st),marked=c.learn+c.memorized+c.hard,total=Number(meta.actualCount||meta.displayCount)||1;
  return {course,meta,st,all,today,week,c,marked,total,coverage:Math.min(100,Math.round(marked/total*100)),accuracy:all.answers?Math.round(all.correct/all.answers*100):0};
}
function v431CoursePoints(){
  const out={};COURSE_IDS.forEach(id=>{const m=v431CourseMetrics(id);out[id]={points:Math.round(m.all.points),dailyPoints:Math.round(m.today.points),weeklyPoints:Math.round(m.week.points),answers:m.all.answers,accuracy:m.accuracy}});return out;
}
function renderV431LanguageXp(){
  const grid=$('#languageXpGrid');if(!grid)return;
  grid.innerHTML=COURSE_IDS.map(id=>{const m=v431CourseMetrics(id),active=id===activeCourse;
    return `<button type="button" class="language-xp-card course-${id} ${active?'active':''}" data-language-xp-course="${id}" aria-pressed="${active}"><span class="language-xp-flag">${m.meta.flag}</span><div class="language-xp-copy"><small>${esc(m.meta.name)}</small><strong>${Math.round(m.all.points)} PP</strong><p>Bugün ${Math.round(m.today.points)} PP · ${m.all.answers?`%${m.accuracy} doğruluk`:'ilk çalışma bekleniyor'}</p><i><em style="width:${m.coverage}%"></em></i></div><b>${m.meta.short}</b></button>`;
  }).join('');
}
function renderV431CourseLabels(){
  const meta=COURSES[activeCourse],m=v431CourseMetrics(activeCourse),global=Math.round(aggregateTotals('all').points),level=Math.floor(m.all.points/500)+1,within=Math.round(m.all.points)%500;
  if($('#activeCourseXpLabel'))$('#activeCourseXpLabel').textContent=`${meta.name.toLocaleUpperCase('tr-TR')} KURS PP`;
  if($('#activeCourseXpName'))$('#activeCourseXpName').textContent=meta.name;
  if($('#activeCourseXpIcon'))$('#activeCourseXpIcon').textContent=meta.short;
  if($('#activeCourseXpText'))$('#activeCourseXpText').textContent=`${Math.round(m.all.points)} PP`;
  if($('#globalXpText'))$('#globalXpText').textContent=`${global} PP`;
  if($('#xpLevel'))$('#xpLevel').textContent=level;
  if($('#xpToNext'))$('#xpToNext').textContent=`${within===0&&m.all.points>0?500:500-within} PP`;
  if($('#xpLevelFill'))$('#xpLevelFill').style.width=`${within/5}%`;
  if($('#xpText'))$('#xpText').textContent=`${meta.short} ${Math.round(m.all.points)} PP`;
  if($('#progressCourseBadge'))$('#progressCourseBadge').textContent=`${meta.flag} ${meta.name} · ${Math.round(m.all.points)} PP`;
}
const wp43RenderXp431=renderXp;
renderXp=function(){wp43RenderXp431();renderV431CourseLabels();renderV431LanguageXp()};

const wp43RenderCoursePerformance431=renderV43CoursePerformance;
renderV43CoursePerformance=function(){
  const grid=$('#coursePerformanceGrid');if(!grid)return wp43RenderCoursePerformance431();
  grid.innerHTML=COURSE_IDS.map(id=>{const m=v431CourseMetrics(id),active=id===activeCourse;
    return `<article class="course-performance-card ${active?'active':''}"><span>${m.meta.flag}</span><div><b>${esc(m.meta.name)}</b><small><strong>${Math.round(m.all.points)} PP</strong> · ${m.marked} / ${m.total} işaretli · ${m.all.answers?`%${m.accuracy} doğruluk`:'henüz cevap yok'}</small><i><em style="width:${m.coverage}%"></em></i></div><strong>%${m.coverage}</strong></article>`;
  }).join('');
};

const wp43RenderDashboard431=renderDashboard;
renderDashboard=function(){wp43RenderDashboard431();renderV431CourseLabels();renderV431LanguageXp()};
const wp43RenderProgress431=renderProgress;
renderProgress=function(){wp43RenderProgress431();renderV431CourseLabels();renderV431LanguageXp()};
const wp43UpdateCourseUI431=updateCourseUI;
updateCourseUI=function(){wp43UpdateCourseUI431();renderV431CourseLabels();renderV431LanguageXp()};

const wp43LeaderboardPayload431=leaderboardCloudPayload;
leaderboardCloudPayload=function(){const payload=wp43LeaderboardPayload431();if(payload)payload.coursePoints=v431CoursePoints();return payload};
const wp43CurrentLeaderboardRow431=currentLeaderboardRow;
currentLeaderboardRow=function(){const row=wp43CurrentLeaderboardRow431();if(row)row.coursePoints=v431CoursePoints();return row};

function setupV431Events(){
  document.addEventListener('click',e=>{const card=e.target.closest('[data-language-xp-course]');if(!card)return;switchCourse(card.dataset.languageXpCourse)});
}
