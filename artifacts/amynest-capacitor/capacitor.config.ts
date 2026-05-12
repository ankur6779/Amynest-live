import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.amynest.app",
  appName: "AmyNest",

  // www/ is populated by running: pnpm run build:web
  webDir: "www",

  // Do not bundle Capacitor runtime inside the web assets
  bundledWebRuntime: false,

  server: {
    // Use https scheme on Android (required for Clerk + Firebase cookies)
    androidScheme: "https",
    // Allow navigation back to the app's own origin on iOS
    iosScheme: "capacitor",
    // Keep the initial URL at root
    url: undefined,
    cleartext: false,
  },

  ios: {
    // Respect notch / Dynamic Island / home-indicator safe areas
    contentInset: "always",
    // Match the dark splash background
    backgroundColor: "#0a061a",
    // Disable link previews (long-press) — not needed in a native wrapper
    allowsLinkPreview: false,
    // Scroll is handled by the web app itself
    scrollEnabled: true,
    // Minimum iOS version (Capacitor 6 supports iOS 13+)
    minVersion: "14.0",
    // Limiter to prevent aggressive font scaling
    limitsNavigationsToAppBoundDomains: true,
  },

  android: {
    backgroundColor: "#0a061a",
    // Disallow mixed HTTP content (security)
    allowMixedContent: false,
    // Capture clicks so WebView handles all navigation
    captureInput: true,
    // Prefer dark web content
    useLegacyBridge: false,
  },

  plugins: {
    // ── Splash Screen ────────────────────────────────────────────────────
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: "#0a061a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // ── Push Notifications ───────────────────────────────────────────────
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },

    // ── Capacitor HTTP (cookie persistence on iOS) ───────────────────────
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
