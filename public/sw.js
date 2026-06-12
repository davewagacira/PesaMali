// PesaMali service worker: app shell + last-known data so the app still
// opens and shows your numbers without a connection.
const VERSION = 'pesamali-v2'
const STATIC_CACHE = `${VERSION}-static`
const PAGE_CACHE = `${VERSION}-pages`
const API_CACHE = `${VERSION}-api`

const PRECACHE = ['/offline.html', '/manifest.json', '/icon-192.png', '/logo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GETs; mutations must always hit the network
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // Offline page: network-first so layout fixes reach installed PWAs quickly
  if (url.pathname === '/offline.html') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match('/offline.html'))
    )
    return
  }

  // Build assets and images: cache-first (hashed filenames never change)
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            return res
          })
      )
    )
    return
  }

  // API reads: network-first, falling back to the last successful response
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(API_CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match(request).then((hit) => hit || Response.error()))
    )
    return
  }

  // Page navigations: network-first, then cached page, then offline screen
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match('/offline.html'))
        )
    )
  }
})
