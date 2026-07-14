const CACHE='wordpilot-v3.5.0';
const CORE=['./','index.html','style.css?v=3.5.0','app.js?v=3.5.0','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png'];
const OFFLINE=[...CORE,'words.json?v=3.5.0'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_OFFLINE')return;
  event.waitUntil((async()=>{
    try{
      const cache=await caches.open(CACHE);
      await cache.addAll(OFFLINE);
      event.ports?.[0]?.postMessage({ok:true});
    }catch(error){
      event.ports?.[0]?.postMessage({ok:false,error:String(error)});
    }
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./',copy));return response;
    }).catch(()=>caches.match('./').then(hit=>hit||caches.match('index.html'))));
    return;
  }

  if(/\/(app\.js|style\.css|words\.json)$/.test(url.pathname)){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
    }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match(url.pathname.split('/').pop()))));
    return;
  }

  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
  })));
});
