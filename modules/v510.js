/* WordPilot v6.4.0 — professional dashboard navigation and mobile history. */
const WP510_VERSION='6.4.0';
const WP510_TAB_KEY=`${STORE}:dashboard_tab`;
const WP510_GUEST_PROMPT_KEY=`${STORE}:guest_signin_prompt_20`;
let wp510DashboardTab=localStorage.getItem(WP510_TAB_KEY)||'academy';
let wp510MeaningHidden=localStorage.getItem(`${STORE}:pronunciation_tr_hidden`)==='1';
let wp510NavBase=null;
let wp510HistoryPop=false;

function wp510CurrentView(){return document.querySelector('.view.active')?.id?.replace(/^view-/,'')||'dashboard'}
function wp510ValidTab(tab){return ['academy','games','speak','stories','collections','progress'].includes(tab)?tab:'academy'}
function wp510SetDashboardTab(tab,{scroll=false,save=true}={}){
  tab=wp510ValidTab(tab);wp510DashboardTab=tab;
  document.querySelectorAll('[data-dashboard-tab]').forEach(btn=>{
    const active=btn.dataset.dashboardTab===tab;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));
  });
  document.querySelectorAll('[data-dashboard-panel]').forEach(panel=>{
    const active=panel.dataset.dashboardPanel===tab;panel.hidden=!active;panel.classList.toggle('active',active);
  });
  if(save)localStorage.setItem(WP510_TAB_KEY,tab);
  if(history.state?.wp510&&wp510CurrentView()==='dashboard')history.replaceState({...history.state,tab,scrollY:window.scrollY},'',location.href);
  if(scroll)document.querySelector('.learning-hub')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function wp510RouteState(view=wp510CurrentView(),scrollY=window.scrollY){return {wp510:true,view,scrollY,tab:wp510DashboardTab}}
function wp510InstallHistory(){
  if(wp510NavBase)return;wp510NavBase=nav;
  nav=function(name){
    name=name||'dashboard';const current=wp510CurrentView();
    if(!wp510HistoryPop&&current!==name)history.replaceState(wp510RouteState(current,window.scrollY),'',location.href);
    wp510NavBase(name);
    if(name==='dashboard')wp510SetDashboardTab(wp510DashboardTab,{save:false});
    if(!wp510HistoryPop&&current!==name)history.pushState(wp510RouteState(name,0),'',location.href);
  };
  history.replaceState(wp510RouteState(),' ',location.href);
  window.addEventListener('popstate',event=>{
    const st=event.state?.wp510?event.state:{wp510:true,view:'dashboard',scrollY:0,tab:wp510DashboardTab};
    wp510HistoryPop=true;wp510DashboardTab=wp510ValidTab(st.tab||wp510DashboardTab);wp510NavBase(st.view||'dashboard');
    if((st.view||'dashboard')==='dashboard')wp510SetDashboardTab(wp510DashboardTab,{save:false});
    requestAnimationFrame(()=>setTimeout(()=>window.scrollTo({top:Number(st.scrollY)||0,behavior:'auto'}),40));
    wp510HistoryPop=false;
  });
  window.addEventListener('scroll',()=>{
    if(wp510CurrentView()==='dashboard'&&history.state?.wp510)history.replaceState({...history.state,scrollY:window.scrollY,tab:wp510DashboardTab},'',location.href);
  },{passive:true});
}
function wp510ApplyMeaningVisibility(){
  const meaning=$('#pronunciationTargetMeaning'),btn=$('#pronunciationToggleMeaning');if(!meaning||!btn)return;
  meaning.hidden=wp510MeaningHidden;btn.textContent=wp510MeaningHidden?'Türkçeyi göster':'Türkçeyi gizle';btn.setAttribute('aria-pressed',String(wp510MeaningHidden));
}
function wp510ToggleMeaning(){wp510MeaningHidden=!wp510MeaningHidden;localStorage.setItem(`${STORE}:pronunciation_tr_hidden`,wp510MeaningHidden?'1':'0');wp510ApplyMeaningVisibility()}
function wp510MaybeGuestPrompt(){
  if(authUser||(profile?.email&&profile.email!=='guest@local')||Number(state?.stats?.answers||0)<20||localStorage.getItem(WP510_GUEST_PROMPT_KEY))return;
  localStorage.setItem(WP510_GUEST_PROMPT_KEY,'1');const dialog=$('#guestProgressDialog');if(dialog&&!dialog.open)dialog.showModal();
}
function wp510LegacyCourseRow(row){return !(row?.coursePoints&&Object.prototype.hasOwnProperty.call(row.coursePoints,activeCourse))}
function wp510RenderLeaderboardRows(board,currentKey){
  const list=$('#leaderboardList');if(!list)return;const rows=(board||[]).slice().sort((a,b)=>leagueScore(b)-leagueScore(a)||String(a.name||'').localeCompare(String(b.name||''),'tr')).slice(0,100);renderLeagueSummary(rows,currentKey);
  list.innerHTML=rows.map((x,i)=>{
    const isCurrent=(x.uid&&x.uid===currentKey)||(!x.uid&&String(x.email||'').toLowerCase()===String(currentKey||'').toLowerCase()),medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'',legacy=wp510LegacyCourseRow(x);
    const accuracy=Number(x.coursePoints?.[activeCourse]?.accuracy??x.accuracy)||0;
    const detail=isCurrent?`Sen${legacy?' · Eski toplam XP':''}`:`${COURSES[activeCourse].short} ligi · ${legacy?'Eski toplam XP':`%${accuracy} doğruluk`}`;
    return `<div class="leaderboard-row ${isCurrent?'current':''} ${i<3?'top-rank':''} ${legacy?'legacy-score':''}"><span class="rank">${medal||i+1}</span>${leaderAvatar(x)}<div><b>${esc(x.name||'Öğrenci')}</b><small>${esc(detail)}</small></div><strong>${leagueScore(x)}<small>XP</small></strong></div>`;
  }).join('')||'<p class="muted">Bu dönemde henüz puan kaydı yok.</p>';
}
function wp510InstallOverrides(){
  const oldPron=renderPronunciationLab;renderPronunciationLab=function(){oldPron();wp510ApplyMeaningVisibility()};
  const oldRecord=recordAnswer;recordAnswer=function(word,correct){oldRecord(word,correct);setTimeout(wp510MaybeGuestPrompt,250)};
  renderLeaderboardRows=wp510RenderLeaderboardRows;
}
function setupV510Events(){
  wp510InstallOverrides();wp510InstallHistory();wp510SetDashboardTab(wp510DashboardTab,{save:false});
  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-dashboard-tab]');if(tab){wp510SetDashboardTab(tab.dataset.dashboardTab,{scroll:false});return}
    if(event.target.closest('#pronunciationToggleMeaning')){wp510ToggleMeaning();return}
    if(event.target.closest('#guestProgressSignIn')){$('#guestProgressDialog')?.close();signInWithGoogle();return}
  });
  document.addEventListener('click',event=>{
    const back=event.target.closest('[data-nav="dashboard"]');if(!back||wp510CurrentView()==='dashboard')return;
    if(history.state?.wp510){event.preventDefault();event.stopImmediatePropagation();history.back()}
  },true);
  document.addEventListener('keydown',event=>{
    const tab=event.target.closest?.('[data-dashboard-tab]');if(!tab||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    const buttons=[...document.querySelectorAll('[data-dashboard-tab]')],index=buttons.indexOf(tab),next=buttons[(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];next.focus();wp510SetDashboardTab(next.dataset.dashboardTab);
  });
  setTimeout(wp510MaybeGuestPrompt,900);
}
