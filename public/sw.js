const VERSION = 'boutikplus-v6';
const APP_SHELL_CACHE = `${VERSION}-shell`;
const PUBLIC_IMAGE_CACHE = `${VERSION}-public-images`;
const MAX_PUBLIC_IMAGES = 120;
const PUBLIC_MEDIA_BUCKETS = new Set([
  'product-images',
  'shop-logos',
  'shop-covers',
  'profile-avatars',
]);

// Pre-cache critical app shell resources on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => Promise.all([
        cache.add('/index.html'),
        // Prefetch critical CSS/fonts if available
        cache.add('/').catch(() => undefined),
        // Prefetch critical JS chunks for faster navigation
        prefetchCriticalChunks(cache),
      ]))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

// Prefetch critical chunks for primary tabs
async function prefetchCriticalChunks(cache) {
  try {
    // Get the index.html to extract chunk URLs
    const response = await fetch('/index.html');
    if (!response.ok) return;
    const html = await response.text();
    
    // Extract JS chunk URLs from script tags
    const chunkMatches = html.match(/\/_expo\/static\/js\/web\/[^"']+\.js/g) || [];
    
    // Prioritize main entry and critical screen chunks
    const criticalPatterns = ['AppEntry', 'index'];
    const criticalChunks = chunkMatches.filter(url => 
      criticalPatterns.some(pattern => url.includes(pattern))
    );
    
    // Prefetch critical chunks
    await Promise.all(
      criticalChunks.map(url => cache.add(url).catch(() => undefined))
    );
  } catch {
    // Silently fail - chunks will be loaded on demand
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('boutikplus-') && ![APP_SHELL_CACHE, PUBLIC_IMAGE_CACHE].includes(key))
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Navigation: network-first with offline fallback
  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Static assets (JS/CSS/fonts): cache-first (immutable)
  if (url.origin === self.location.origin && (
    url.pathname.startsWith('/_expo/static/') ||
    url.pathname.startsWith('/static-assets/')
  )) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    return;
  }

  // Public Supabase images: stale-while-revalidate with LRU cap
  if (isPublicSupabaseImage(url)) {
    event.respondWith(staleWhileRevalidateImage(request));
    return;
  }

  // JS chunks: cache-first with network fallback (they're content-hashed)
  if (url.origin === self.location.origin && url.pathname.endsWith('.js')) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    return;
  }
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/index.html')) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidateImage(request) {
  const cache = await caches.open(PUBLIC_IMAGE_CACHE);
  const cached = (await cache.match(request)) || (await matchCachedImageVariant(cache, request));
  const network = fetch(request).then(async (response) => {
    if (response.ok && response.type !== 'opaque') {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_PUBLIC_IMAGES);
    }
    return response;
  }).catch(() => null);

  return cached || (await network) || Response.error();
}

async function matchCachedImageVariant(cache, request) {
  const requestedUrl = new URL(request.url);
  const requestedPath = normalizePublicImagePath(requestedUrl.pathname);
  if (!requestedPath) return undefined;

  const keys = await cache.keys();
  const matchingRequest = keys.find((key) => {
    const cachedUrl = new URL(key.url);
    return normalizePublicImagePath(cachedUrl.pathname) === requestedPath;
  });

  return matchingRequest ? cache.match(matchingRequest) : undefined;
}

function normalizePublicImagePath(pathname) {
  return pathname
    .replace('/storage/v1/object/public/', '/storage/v1/public/')
    .replace('/storage/v1/render/image/public/', '/storage/v1/public/');
}

function isPublicSupabaseImage(url) {
  const markers = ['/storage/v1/object/public/', '/storage/v1/render/image/public/'];
  const marker = markers.find((value) => url.pathname.includes(value));
  if (!marker) return false;
  const bucket = url.pathname.split(marker)[1]?.split('/')[0];
  return !!bucket && PUBLIC_MEDIA_BUCKETS.has(bucket);
}

async function trimCache(cache, maximum) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maximum)).map((key) => cache.delete(key)));
}
