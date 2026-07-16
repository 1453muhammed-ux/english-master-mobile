/* WordPilot v6.5.2 — daily mission navigation helpers. */
const WP512_VERSION='6.5.2';
function setupV512Events(){
  document.addEventListener('keydown',event=>{
    const task=event.target.closest?.('.daily-task.actionable[data-v5-open]');
    if(!task||!['Enter',' '].includes(event.key))return;
    event.preventDefault();task.click();
  });
}
