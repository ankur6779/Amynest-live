import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { clearStaleCachesPlugin } from "../../scripts/vite-plugins/clear-stale-caches.js";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(artifactDir, "..", "..");

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/** Asset base for Vite (`/` for static hosting on Render). */
const basePath = process.env.BASE_PATH ?? "/";

function readFirebaseSwEnv() {
  const apiKey =
    process.env.VITE_FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY ?? "";
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID ?? "";
  const rawAuthDomain =
    process.env.VITE_FIREBASE_AUTH_DOMAIN ??
    process.env.FIREBASE_AUTH_DOMAIN ??
    "";
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
  return { apiKey, authDomain, projectId, appId, messagingSenderId };
}

function buildFcmServiceWorkerBlock() {
  const { apiKey, authDomain, projectId, appId, messagingSenderId } =
    readFirebaseSwEnv();
  if (!apiKey || !projectId) return "";

  return `
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: ${JSON.stringify(apiKey)},
  authDomain: ${JSON.stringify(authDomain)},
  projectId: ${JSON.stringify(projectId)},
  appId: ${JSON.stringify(appId)},
  messagingSenderId: ${JSON.stringify(messagingSenderId)},
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
`;
}

function amynestServiceWorkerPlugin() {
  const artifactDir = path.resolve(import.meta.dirname);
  const publicDir = path.resolve(artifactDir, "public");
  const distPublicDir = path.resolve(artifactDir, "dist/public");

  function writeServiceWorkers() {
    const commit =
      process.env.RENDER_GIT_COMMIT?.slice(0, 12) ??
      process.env.GITHUB_SHA?.slice(0, 12) ??
      String(Date.now());
    const cacheName = `amynest-v3-${commit}`;

    const fcmBlock = buildFcmServiceWorkerBlock();
    const fcmLegacy = fcmBlock
      ? `/* Auto-generated — do not edit. */\n${fcmBlock}`
      : "/* FCM not configured for this build. */";

    writeFileSync(
      path.join(publicDir, "firebase-messaging-sw.js"),
      fcmLegacy,
      "utf8",
    );

    const template = readFileSync(
      path.join(publicDir, "sw.source.js"),
      "utf8",
    );
    const swContent = template
      .replace("__AMYNEST_CACHE_NAME__", cacheName)
      .replace("/* __AMYNEST_FCM_BLOCK__ */", fcmBlock);

    const banner = `/* Auto-generated on build — do not edit. Cache: ${cacheName} */\n`;
    writeFileSync(path.join(publicDir, "sw.js"), banner + swContent, "utf8");

    try {
      writeFileSync(path.join(distPublicDir, "sw.js"), banner + swContent, "utf8");
      writeFileSync(
        path.join(distPublicDir, "firebase-messaging-sw.js"),
        fcmLegacy,
        "utf8",
      );
    } catch {
      /* dist may not exist during dev buildStart */
    }
  }

  return {
    name: "amynest-service-worker",
    buildStart() {
      writeServiceWorkers();
    },
    closeBundle() {
      writeServiceWorkers();
    },
  };
}

export default defineConfig({
  envDir: repoRoot,
  base: basePath,
  cacheDir: path.resolve(artifactDir, "node_modules/.vite"),
  // Hard refresh on /dashboard etc. must return index.html (Vite dev + preview).
  appType: "spa",
  plugins: [
    clearStaleCachesPlugin(artifactDir),
    amynestServiceWorkerPlugin(),
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
    // Dev pre-bundle only. Do NOT pass "safari14" here — esbuild cannot
    // downlevel destructuring for that target and optimizeDeps will fail
    // after a cache clear (--force / postinstall clean). Production Safari
    // support comes from build.target below.
    esbuildOptions: {
      target: "es2020",
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
    rollupOptions: {
      output: {
        // Default chunking — explicit so deploys don't inherit stale manual split config.
        manualChunks: undefined,
      },
    },
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
