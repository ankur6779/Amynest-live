/**
 * AmyNest root service worker.
 *
 * Purpose: satisfy Chrome's WebAPK install criteria on Android so that
 * "Install app" / "Add to Home Screen" mints a real WebAPK (not just a
 * launcher shortcut). This is what makes installed-PWA push notifications
 * appear under the AmyNest app name + icon instead of the generic
 * "Chrome" header with the Chrome logo.
 *
 * Chrome's WebAPK install criteria require a service worker registered
 * at the page scope ("/") that has a `fetch` event listener. The
 * Firebase messaging SW (firebase-messaging-sw.js) is registered by the
 * Firebase SDK at its own narrow scope and does NOT have a fetch
 * handler — so Chrome was previously falling back to the shortcut path.
 *
 * Navigation requests that would 404 on the origin (common when a CDN
 * has no SPA rewrite) are answered with index.html so client-side routing
 * can handle /dashboard, /parent-profile, etc. after pull-to-refresh.
 *
 * Deep-link / FCM push handling stays in firebase-messaging-sw.js — the
 * two SWs coexist at different scopes and do not conflict.
 */

const INDEX_URL = new URL('index.html', self.location.origin).href;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return request.method === 'GET' && accept.includes('text/html');
}

function shouldSpaFallback(url) {
  const path = url.pathname;
  if (path.startsWith('/api')) return false;
  if (path === '/index.html') return false;
  if (/\.[a-z0-9]{1,8}$/i.test(path)) return false;
  return true;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isNavigationRequest(request)) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !shouldSpaFallback(url)) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok || response.type === 'opaqueredirect') {
          return response;
        }
        if (response.status === 404) {
          const indexResponse = await fetch(INDEX_URL, {
            cache: 'no-store',
          });
          if (indexResponse.ok) return indexResponse;
        }
        return response;
      } catch {
        const indexResponse = await fetch(INDEX_URL, { cache: 'no-store' });
        if (indexResponse.ok) return indexResponse;
        throw new Error('SPA offline and index.html unavailable');
      }
    })(),
  );
});
