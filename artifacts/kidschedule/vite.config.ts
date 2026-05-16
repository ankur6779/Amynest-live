import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "node:url";
import { copyFileSync, existsSync, writeFileSync } from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(artifactDir, "..", "..");

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/** Asset base for Vite (`/` for static hosting on Render). */
const basePath = process.env.BASE_PATH ?? "/";

function spa404CopyPlugin() {
  return {
    name: "spa-404-copy",
    closeBundle() {
      const outDir = path.resolve(import.meta.dirname, "dist/public");
      const indexPath = path.join(outDir, "index.html");
      const fallbackPath = path.join(outDir, "404.html");
      if (existsSync(indexPath)) {
        copyFileSync(indexPath, fallbackPath);
      }
    },
  };
}

function firebaseSwPlugin() {
  return {
    name: "firebase-sw",
    buildStart() {
      const apiKey =
        process.env.VITE_FIREBASE_API_KEY ??
        process.env.FIREBASE_API_KEY ??
        "";
      const projectId =
        process.env.VITE_FIREBASE_PROJECT_ID ??
        process.env.FIREBASE_PROJECT_ID ??
        "";
      const rawAuthDomain =
        process.env.VITE_FIREBASE_AUTH_DOMAIN ??
        process.env.FIREBASE_AUTH_DOMAIN ??
        "";
      // Mirror the same fallback used in src/lib/firebase.ts: if the env var
      // doesn't look like a domain (e.g. an appId was mistakenly set there),
      // fall back to the standard Firebase auth domain for the project.
      const authDomain =
        rawAuthDomain && rawAuthDomain.includes(".")
          ? rawAuthDomain
          : `${projectId}.firebaseapp.com`;
      const appId =
        process.env.VITE_FIREBASE_APP_ID ?? process.env.FIREBASE_APP_ID ?? "";
      const messagingSenderId =
        process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ??
        process.env.FIREBASE_MESSAGING_SENDER_ID ??
        "";

      const swContent = `/* Auto-generated — do not edit. Regenerated on every build. */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: ${JSON.stringify(apiKey)},
  authDomain: ${JSON.stringify(authDomain)},
  projectId: ${JSON.stringify(projectId)},
  appId: ${JSON.stringify(appId)},
  messagingSenderId: ${JSON.stringify(messagingSenderId)},
});

const messaging = firebase.messaging();

// Activate immediately on install so users get the updated SW (and its
// fresh Firebase config) right after a new deployment, without needing
// to close all tabs first.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'AmyNest';
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    // tag deduplicates: same category replaces the previous banner instead
    // of stacking multiple identical notifications.
    tag: (payload.data && payload.data.category) ? payload.data.category : 'amynest',
    renotify: true,
    data: payload.data ?? {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deepLink = (event.notification.data && event.notification.data.deepLink)
    ? event.notification.data.deepLink
    : '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing app window rather than opening a duplicate tab.
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(deepLink);
            return client.focus();
          }
        }
        // No existing window — open a new one.
        return self.clients.openWindow(deepLink);
      })
  );
});

// SPA fallback when this SW controls the scope (FCM registration replaces sw.js).
var INDEX_URL = new URL('index.html', self.location.origin).href;

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  var accept = request.headers.get('accept') || '';
  return request.method === 'GET' && accept.indexOf('text/html') !== -1;
}

function shouldSpaFallback(url) {
  var path = url.pathname;
  if (path.indexOf('/api') === 0) return false;
  if (path === '/index.html') return false;
  if (/\\.[a-z0-9]{1,8}$/i.test(path)) return false;
  return true;
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (!isNavigationRequest(request)) return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin || !shouldSpaFallback(url)) return;

  event.respondWith(
    fetch(request).then(function (response) {
      if (response.ok || response.type === 'opaqueredirect') return response;
      if (response.status === 404) {
        return fetch(INDEX_URL, { cache: 'no-store' }).then(function (indexResponse) {
          return indexResponse.ok ? indexResponse : response;
        });
      }
      return response;
    }).catch(function () {
      return fetch(INDEX_URL, { cache: 'no-store' });
    })
  );
});
`;
      writeFileSync(
        path.resolve(import.meta.dirname, "public", "firebase-messaging-sw.js"),
        swContent,
        "utf8",
      );
    },
  };
}

export default defineConfig({
  envDir: repoRoot,
  base: basePath,
  // Hard refresh on /dashboard etc. must return index.html (Vite dev + preview).
  appType: "spa",
  plugins: [
    firebaseSwPlugin(),
    spa404CopyPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    // Guarantee a single React instance across all packages (local + workspace).
    // Do NOT add sub-path aliases (react/jsx-dev-runtime, react-dom/client, etc.)
    // because aliases run before dedupe and would direct those sub-path imports
    // to the artifact-local node_modules/react copy, creating a second instance.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // Same Safari 14 target as build.target above — ensures the dev-server's
    // pre-bundled copies of Firebase et al. also have class static blocks and
    // private fields transformed, so Safari works in both dev and production.
    esbuildOptions: {
      target: ["es2020", "safari14"],
    },
    // Explicit entries force Vite to crawl the WHOLE app statically at
    // startup so it discovers every dep up-front. Without this, Vite would
    // discover deps lazily as files are requested, which triggers mid-session
    // re-bundles. A re-bundle changes the `?v=` cache-bust hash on dep URLs;
    // any code that already loaded React with the OLD hash now coexists with
    // code that loads React with the NEW hash — two ESM module instances,
    // each with its own `ReactSharedInternals` object, and `useState` blows
    // up because the renderer set the dispatcher on instance A while the
    // component reads it from instance B.
    entries: ["index.html"],
    // HARD GUARANTEE that mid-session re-bundles never happen. With
    // `noDiscovery: true`, Vite ONLY pre-bundles the explicit `include`
    // list below — it never lazily discovers a new dep at request time and
    // never bumps the browserHash mid-session. Any missing dep surfaces as
    // a request-time 404 (loud failure) instead of a silent re-bundle that
    // duplicates React in the browser.
    noDiscovery: true,
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "wouter",
      "@tanstack/react-query",
      "i18next",
      "react-i18next",
      "i18next-browser-languagedetector",
      "lucide-react",
      "firebase/app",
      "firebase/auth",
      "firebase/messaging",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "@radix-ui/react-select",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-progress",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-switch",
      "@radix-ui/react-toast",
      "@radix-ui/react-separator",
      "@radix-ui/react-tabs",
      "@radix-ui/react-accordion",
      "@radix-ui/react-popover",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-dropdown-menu",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "zod",
      "date-fns",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "framer-motion",
    ],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Explicitly target Safari 14+ so esbuild transpiles ES2022 syntax
    // (class static blocks, private class fields #field, logical-assign
    // operators ??=) that Firebase 12 and other modern deps use.
    // Without this Vite's default "modules" preset leaves those constructs
    // un-transformed; Safari < 16.4 fails to parse the bundle, the React
    // app never mounts, and users see "A problem repeatedly occurred".
    target: ["es2020", "safari14"],
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    headers: {
      "Cache-Control": "no-store",
    },
    fs: {
      strict: true,
      deny: ["**/.git", "**/.env*", "**/node_modules/.cache"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
