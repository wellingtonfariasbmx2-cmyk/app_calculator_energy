
const CACHE_NAME = 'stageflow-pro-v3';
const DYNAMIC_CACHE_NAME = 'stageflow-dynamic-v3';

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

// --- PUSH NOTIFICATIONS ---

// Recebe push do servidor (para uso futuro com VAPID)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'StageFlow Pro', body: 'Nova atualização' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/427/427735.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/427/427735.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'stageflow-default',
      data: { url: data.url || '/' }
    })
  );
});

// Click na notificação — abre o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});

// Recebe mensagens do app principal (postMessage)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/427/427735.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/427/427735.png',
      vibrate: [200, 100, 200],
      tag: event.data.tag || 'stageflow-' + Date.now(),
      data: { url: '/' }
    });
  }
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

  // Ignorar requisições que não sejam GET ou para esquemas não suportados (como chrome-extension, blob:, data:)
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Não interceptar blob: URLs (downloads de PDF, etc.) para preservar o filename
  if (event.request.url.startsWith('blob:')) {
    return;
  }

  // Ignorar requisições ao Supabase para evitar AbortErrors
  if (url.hostname.includes('supabase.co')) {
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
      }).catch((error) => {
        console.error('Fetch error no Service Worker:', error);
        throw error;
      });

      // Retorna o cache se existir, senão aguarda a rede
      return cachedResponse || fetchPromise;
    })
  );
});
