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
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
