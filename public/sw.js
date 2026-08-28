const CACHE = 'winter-ride-window-v2';
const SHELL = ['/manifest.webmanifest', '/favicon.svg', '/assets/winter-field-guide-720.webp'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const index = await fetch('/');
  const markup = await index.clone().text();
  const builtAssets = [...markup.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
  await cache.put('/', index);
  await cache.addAll([...SHELL, ...builtAssets]);
})()));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || (event.request.mode === 'navigate' ? caches.match('/') : new Response('', { status: 503 })) )));
});
