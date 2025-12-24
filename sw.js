// KuKu Drill service worker - 最適化版
const CACHE_VERSION = 'kuku-v32';  // バージョン統一
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  // すべてのアイコンをキャッシュ
  './icon/icon-180.png',
  './icon/icon-192.png',
  './icon/icon-512.png',
  './icon/icon-512-maskable.png',
  './icon/favicon.ico',
  './icon/favicon-16x16.png',
  './icon/favicon-32x32.png'
];

self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW] Caching assets:', ASSETS);
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Installation failed:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys().then(keys => {
      console.log('[SW] Existing caches:', keys);
      return Promise.all(
        keys.map(k => {
          if (k !== CACHE_VERSION) {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Chrome拡張機能のリクエストは無視
  if (req.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // ネットワーク優先戦略（HTML）
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // 成功したらキャッシュを更新
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => {
          // ネットワーク失敗時はキャッシュから返す
          console.log('[SW] Network failed, serving from cache:', req.url);
          return caches.match(req);
        })
    );
  } else {
    // リソースはキャッシュ優先（画像、CSS、JSなど）
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) {
          console.log('[SW] Serving from cache:', req.url);
          return cached;
        }
        
        // キャッシュに無い場合はネットワークから取得
        return fetch(req).then(res => {
          // 200番台のレスポンスのみキャッシュ
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          }
          return res;
        });
      })
    );
  }
});
