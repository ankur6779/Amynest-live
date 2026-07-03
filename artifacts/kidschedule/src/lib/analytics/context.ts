import { isCapacitorIosShell } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";

export type AnalyticsRuntimeContext = {
  appVersion: string;
  buildNumber: string;
  environment: string;
  platform: string;
  os: string;
  browser: string;
  language: string;
  country?: string;
  subscriptionState?: string;
  childAgeBand?: string;
};

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent || "";
  if (/AmyNestAndroid/i.test(ua)) return "android";
  if (isCapacitorIosShell()) return "ios";
  if (isNativeAmyNestShell()) return "android";
  return "web";
}

function detectOs(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "unknown";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Firefox/i.test(ua)) return "Firefox";
  return "unknown";
}

export function resolveAppVersion(): string {
  const fromEnv = import.meta.env.VITE_APP_VERSION as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim().slice(0, 32);
  return import.meta.env.DEV ? "dev" : "unknown";
}

export function resolveBuildNumber(): string {
  const release =
    (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) ??
    (import.meta.env.VITE_APP_BUILD_VERSION as string | undefined);
  if (release?.trim()) return release.trim().slice(0, 32);
  return import.meta.env.DEV ? "dev" : "0";
}

export function resolveEnvironment(): string {
  const env = import.meta.env.VITE_AMYNEST_ENV as string | undefined;
  if (env?.trim()) return env.trim();
  return import.meta.env.DEV ? "development" : "production";
}

export function getAnalyticsRuntimeContext(
  overrides: Partial<AnalyticsRuntimeContext> = {},
): AnalyticsRuntimeContext {
  const language =
    typeof navigator !== "undefined"
      ? (navigator.language || "unknown").slice(0, 16)
      : "unknown";

  return {
    appVersion: resolveAppVersion(),
    buildNumber: resolveBuildNumber(),
    environment: resolveEnvironment(),
    platform: detectPlatform(),
    os: detectOs(),
    browser: detectBrowser(),
    language,
    ...overrides,
  };
}
