const CACHE='english-master-pro-v2.2.0';
const CORE=['./','index.html','style.css?v=2.2.0','app.js?v=2.2.0','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(e.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/app.js')||u.pathname.endsWith('/style.css')){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
    return;
  }
  if(u.pathname.endsWith('words.json')){
    e.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(e.request);try{const fresh=await fetch(e.request);if(fresh.ok)cache.put(e.request,fresh.clone());return fresh}catch{return cached}}));
    return;
  }
  e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(cache=>cache.put(e.request,r.clone()));return r})));
});