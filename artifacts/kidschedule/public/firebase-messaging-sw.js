/* Auto-generated — do not edit. */

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
  var deepLink = event.notification.data && event.notification.data.deepLink
    ? event.notification.data.deepLink
    : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          client.navigate(deepLink);
          return client.focus();
        }
      }
      return self.clients.openWindow(deepLink);
    })
  );
});
