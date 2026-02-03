
const CACHE_NAME = 'lightload-pro-v1';
const DYNAMIC_CACHE_NAME = 'lightload-dynamic-v1';

// Assets fundamentais para o app shell
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com'
];

// Instalação: Cache dos arquivos estáticos principais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Interceptação de Requisições (Estratégia: Stale-While-Revalidate)
// Tenta servir do cache, mas atualiza em background. Se não tiver no cache, busca na rede.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requisições que não sejam GET ou para esquemas não suportados (como chrome-extension)
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Se a resposta for válida, atualiza o cache dinâmico
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        // Cacheia também as bibliotecas externas (esm.sh, etc)
        if (networkResponse && networkResponse.status === 200 && (url.hostname.includes('esm.sh') || url.hostname.includes('cdn.tailwindcss.com'))) {
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, responseToCache);
             });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback offline se necessário (opcional)
      });

      // Retorna o cache se existir, senão aguarda a rede
      return cachedResponse || fetchPromise;
    })
  );
});
