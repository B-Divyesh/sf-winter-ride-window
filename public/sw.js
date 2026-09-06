const CACHE = 'winter-ride-window-v7';
const SHELL = ['/manifest.webmanifest', '/favicon.svg', '/assets/winter-field-guide-720.webp'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const index = await fetch('/');
  const markup = await index.clone().text();
  const builtAssets = [...markup.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
  await cache.put('/', index);
  await cache.addAll([...SHELL, ...builtAssets]);
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(key => key !== CACHE).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cacheKey = new URL(event.request.url).pathname;
    const cached = await caches.match(cacheKey, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (!response.ok) return event.request.mode === 'navigate' ? await caches.match('/') : response;
      caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    } catch {
      return event.request.mode === 'navigate' ? await caches.match('/') : new Response('', { status: 503 });
    }
  })());
});
