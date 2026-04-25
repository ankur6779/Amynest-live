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
    dedupe: ["react", "react-dom"],
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
