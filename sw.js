// Skift versionsnummeret, hver gang en af filerne ændres
const CACHE = 'elprisen-v4';

const FILES = [
  './',
  'index.html',
  'manifest.json',
  'assets/css/site.css',
  'assets/js/site.js',
  'assets/js/controller.js',
  'assets/js/model.js',
  'assets/js/view.js',
  'icons/gear.svg',
  'icons/circle-xmark.svg',
  'icons/calendar-days.svg',
  'icons/cirkelLogo.svg',
  'icons/32.png',
  'icons/72.png',
  'icons/100.png',
  'icons/128.png',
  'icons/144.png',
  'icons/152.png',
  'icons/180.png',
  'icons/192.png',
  'icons/256.png',
  'icons/512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// API: network first, så offline bruges senest hentede priser
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

// Google Fonts: gem første gang, brug cachen bagefter
async function cacheFirstRuntime(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.hostname.endsWith('elprisenligenu.dk')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirstRuntime(request));
    return;
  }

  if (url.origin !== location.origin) return;

  // Sider: prøv nettet, ellers appen fra cache
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('index.html')));
    return;
  }

  // Statiske filer: cache first
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});