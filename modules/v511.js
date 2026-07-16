/* WordPilot v6.5.1 — story controls, promoted learning hub and mobile safe-area polish. */
const WP511_VERSION='6.5.1';
function wp511PromoteLearningHub(){
  const anchor=document.querySelector('.course-selector-section'),hub=document.querySelector('.learning-hub');
  if(!anchor||!hub||hub.dataset.promoted==='1')return;
  const panels=[...document.querySelectorAll('[data-dashboard-panel]')],frag=document.createDocumentFragment();
  hub.dataset.promoted='1';hub.classList.add('learning-hub-promoted');frag.append(hub,...panels);anchor.after(frag);
}
function wp511StopAudioOnViewChange(){
  document.addEventListener('click',event=>{
    const navTarget=event.target.closest('[data-nav],[data-v5-open]');
    if(!navTarget)return;
    const destination=navTarget.dataset.nav||navTarget.dataset.v5Open;
    if(destination!=='stories'&&typeof v5StopStoryAudio==='function')v5StopStoryAudio();
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&typeof v5StopStoryAudio==='function')v5StopStoryAudio()});
}
function setupV511Events(){
  wp511PromoteLearningHub();wp511StopAudioOnViewChange();
  window.addEventListener('orientationchange',()=>setTimeout(()=>document.documentElement.style.setProperty('--wp-safe-top',`${Math.max(0,window.visualViewport?.offsetTop||0)}px`),120));
}
