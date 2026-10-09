// Service Worker para la PWA Admin de Dientes Sanos CRM

const CACHE_NAME = 'dientes-sanos-admin-cache-v1';
const ADMIN_BASE = '/admin';

// Extensiones de assets estáticos con nombre hasheado (inmutables) -> cache-first.
const STATIC_ASSET_RE = /\.(js|mjs|css|woff2?|ttf|otf|eot|png|jpe?g|webp|svg|gif|ico|mp4|webm)$/i;

const ASSETS_TO_CACHE = [
  '/admin.html',
  '/favicon.png',
  '/favicon.svg',
  '/pwa-icon.png',
  '/manifest-admin.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Offline support for Supabase POST/PATCH/PUT
  if (url.hostname.includes('supabase.co') && ['POST', 'PATCH', 'PUT'].includes(event.request.method)) {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        const requestClone = event.request.clone();
        const bodyText = await requestClone.text();

        await saveOfflineRequest({
          url: requestClone.url,
          method: requestClone.method,
          headers: Array.from(requestClone.headers.entries()).reduce((h, [k, v]) => ({ ...h, [k]: v }), {}),
          body: bodyText,
          timestamp: Date.now()
        });

        return new Response(JSON.stringify({ offline: true, success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // SPA navigation fallback for admin routes
  if (event.request.mode === 'navigate' && url.pathname.startsWith(ADMIN_BASE)) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        return (await caches.match('/admin.html')) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  // Cache-first para assets estáticos hasheados del mismo origen (JS/CSS/fuentes/imágenes).
  // Los nombres llevan hash de contenido: si están en caché son válidos para siempre, así
  // que las cargas repetidas son instantáneas aunque el wifi sea lento. Un deploy nuevo
  // genera nombres nuevos que se descargan una sola vez.
  if (
    event.request.method === 'GET' &&
    url.origin === self.location.origin &&
    // Los <video> piden rangos byte a byte y el servidor responde 206 Partial Content,
    // que la Cache API rechaza. Se dejan pasar directo a la red.
    !event.request.headers.has('range') &&
    (url.pathname.startsWith('/assets/') || STATIC_ASSET_RE.test(url.pathname))
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          // Solo 200: response.ok abarca 206, que cache.put() no acepta.
          if (response && response.status === 200) {
            cache.put(event.request, response.clone()).catch(() => {});
          }
          return response;
        } catch (err) {
          return (await cache.match(event.request)) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      return (await caches.match(event.request)) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});

// ─── IndexedDB Offline Queue ────────────────────────────────────────────────

function saveOfflineRequest(requestData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_admin_offline_db', 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_requests')) {
        db.createObjectStore('offline_requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('offline_requests', 'readwrite');
      tx.objectStore('offline_requests').add(requestData);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-admin-offline') event.waitUntil(replayOfflineRequests());
});

self.addEventListener('message', event => {
  if (event.data?.action === 'sync') event.waitUntil(replayOfflineRequests());
});

async function replayOfflineRequests() {
  const requests = await getOfflineRequests();
  for (const req of requests) {
    try {
      const response = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
      if (response.ok || response.status === 409) await deleteOfflineRequest(req.id);
    } catch (e) {
      console.error('[Admin SW Sync] Error:', e);
      break;
    }
  }
}

function getOfflineRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_admin_offline_db', 1);
    request.onsuccess = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_requests')) { resolve([]); return; }
      const tx = db.transaction('offline_requests', 'readonly');
      const getAllReq = tx.objectStore('offline_requests').getAll();
      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

function deleteOfflineRequest(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_admin_offline_db', 1);
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('offline_requests', 'readwrite');
      tx.objectStore('offline_requests').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', event => {
  let data = { title: 'Dientes Sanos', body: 'Nueva notificación.' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data = { title: 'Dientes Sanos', body: event.data.text() }; }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-icon.png',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: { dateOfArrival: Date.now(), primaryKey: '1' },
      actions: [
        { action: 'open', title: 'Abrir Panel', icon: '/favicon.svg' },
        { action: 'close', title: 'Cerrar', icon: '/favicon.svg' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(clients.openWindow('/admin'));
  }
});
