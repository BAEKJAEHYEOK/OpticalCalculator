// 오프라인 캐시. 현장·이동 중 네트워크 없이도 계산기가 열려야 한다.
// 버전을 올리면 이전 캐시를 비우고 새로 받는다.
const CACHE = 'optical-calc-v12';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './pwa/icon.svg',
  './pwa/icon-192.png',
  './pwa/icon-512.png',
  './pwa/icon-512-maskable.png',
  './core/units.js',
  './core/diagram.js',
  './core/profile.js',
  './core/registry.js',
  './core/render.js',
  './calc/shared.js',
  './calc/lens.js',
  './calc/lens-design.js',
  './calc/camera.js',
  './calc/lighting.js',
  './calc/geometry.js',
  './calc/wave.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 캐시 우선. 정적 계산기라 최신성보다 오프라인 가용성이 중요하다.
// 새 버전은 CACHE 이름을 올려 배포한다.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
    )
  );
});
