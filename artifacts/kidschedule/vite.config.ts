import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { writeFileSync } from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

function firebaseSwPlugin() {
  return {
    name: "firebase-sw",
    buildStart() {
      const apiKey =
        process.env.VITE_FIREBASE_API_KEY ??
        process.env.FIREBASE_API_KEY ??
        "";
      const authDomain =
        process.env.VITE_FIREBASE_AUTH_DOMAIN ??
        process.env.FIREBASE_AUTH_DOMAIN ??
        "";
      const projectId =
        process.env.VITE_FIREBASE_PROJECT_ID ??
        process.env.FIREBASE_PROJECT_ID ??
        "";
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

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'AmyNest';
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    data: payload.data ?? {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deepLink = event.notification.data?.deepLink;
  if (deepLink) {
    event.waitUntil(clients.openWindow(deepLink));
  }
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
  base: basePath,
  plugins: [
    firebaseSwPlugin(),
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
      // Pin every React entry-point to the SAME on-disk file so Vite's
      // pre-bundle graph cannot accidentally produce two React module
      // instances. The missing `jsx-dev-runtime` / `react-dom/client`
      // aliases were causing React 19's dispatcher to be null on first
      // render, which surfaced as a misleading "more than one copy of
      // React in the same app" warning + a `useState` null crash.
      react: path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
      "react-dom/client": path.resolve(
        import.meta.dirname,
        "node_modules/react-dom/client.js",
      ),
      "react/jsx-runtime": path.resolve(
        import.meta.dirname,
        "node_modules/react/jsx-runtime.js",
      ),
      "react/jsx-dev-runtime": path.resolve(
        import.meta.dirname,
        "node_modules/react/jsx-dev-runtime.js",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
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
    // After the initial crawl, refuse to silently re-bundle on the fly. If
    // a dep is genuinely missing from `include`, Vite will throw a clear
    // error pointing at it instead of triggering a hash-changing re-bundle
    // that desyncs already-loaded React modules in the browser.
    noDiscovery: true,
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
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
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
