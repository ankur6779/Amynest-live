/* Auto-generated on build — do not edit. Cache: amynest-v6 */
/**
 * AmyNest root service worker (source — built to /sw.js with a deploy-specific cache id).
 *
 * - skipWaiting + clients.claim on every deploy
 * - Versioned cache (amynest-v6); purge all other cache names on activate
 * - Navigation: always network (never serve cached index.html)
 * - Static hashed assets: browser/CDN cache only (SW does not intercept)
 * - FCM block appended at build time via importScripts snippet
 */

/* global self, caches, clients, importScripts, firebase */

const CACHE_NAME = "amynest-v6";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        }),
      ).then(() => self.clients.claim()),
    ),
  );
});

function isNavigationRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return request.method === "GET" && accept.includes("text/html");
}

function isAssetPath(pathname) {
  return /\.[a-z0-9]{1,12}$/i.test(pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Hashed bundles and static files — browser HTTP cache + CDN only.
  if (isAssetPath(url.pathname)) return;

  if (!isNavigationRequest(request)) return;

  // Never serve a cached shell — always fetch the latest index.html from network.
  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(() =>
      fetch(request.url, { cache: "reload" }),
    ),
  );
});


importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyBjmRgm4uGfSs_hVXN1pSgyncKn_A7T6uo",
  authDomain: "amynest-836ff.firebaseapp.com",
  projectId: "amynest-836ff",
  appId: "1:573340015027:web:1d05e678f1ba90dca293c6",
  messagingSenderId: "573340015027",
});
var messaging = firebase.messaging();
messaging.onBackgroundMessage(function (payload) {
  var title = payload.notification && payload.notification.title ? payload.notification.title : 'AmyNest';
  var options = {
    body: payload.notification && payload.notification.body ? payload.notification.body : '',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: payload.data && payload.data.category ? payload.data.category : 'amynest',
    renotify: true,
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var deepLink = data.deepLink ? data.deepLink : '/';
  var category = data.category ? data.category : '';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          client.postMessage({
            type: 'amynest-notif-deeplink',
            deepLink: deepLink,
            category: category,
            data: data,
          });
          return client.focus();
        }
      }
      var target = deepLink.indexOf('/') === 0 ? self.location.origin + deepLink : deepLink;
      return self.clients.openWindow(target);
    })
  );
});

