/**
 * Persistent *installation* identity — survives logout on this install so the
 * backend can treat it as one active session, not a new device every sign-in.
 * Uninstall (app data cleared) mints a new id. It must never permanently bind
 * hardware to one AmyNest account; active ownership lives in `user_devices`.
 */

import { isCapacitorNativeShell, isNativeAmyNestShell } from "@/lib/native-shell";

const DEVICE_ID_KEY = "amynest:device:id:v1";
const DEVICE_NAME_KEY = "amynest:device:name:v1";

export const DEVICE_ID_HEADER = "x-amynest-device-id";
export const DEVICE_NAME_HEADER = "x-amynest-device-name";
export const DEVICE_PLATFORM_HEADER = "x-amynest-platform";
export const DEVICE_BROWSER_HEADER = "x-amynest-browser";
export const DEVICE_OS_HEADER = "x-amynest-os";
export const DEVICE_APP_VERSION_HEADER = "x-amynest-app-version";

type NativeAnalyticsWindow = Window & {
  __AMYNEST_NATIVE_DEVICE_ID?: string;
  __AMYNEST_RESOLVED_DEVICE_ID?: string;
  __AMYNEST_APP_VERSION?: string;
  __AMYNEST_DEVICE_INFO?: { app_version?: string };
  AmyNestAppNative?: { getVersionName?: () => string };
};

function nativeWindow(): NativeAnalyticsWindow | null {
  if (typeof window === "undefined") return null;
  return window as NativeAnalyticsWindow;
}

function readNativeDeviceId(): string | null {
  const w = nativeWindow();
  const id = w?.__AMYNEST_RESOLVED_DEVICE_ID || w?.__AMYNEST_NATIVE_DEVICE_ID;
  if (typeof id === "string" && id.length >= 8) return id;
  return null;
}

function readNativeAppVersion(): string | null {
  const w = nativeWindow();
  if (!w) return null;
  if (typeof w.__AMYNEST_APP_VERSION === "string" && w.__AMYNEST_APP_VERSION.trim()) {
    return w.__AMYNEST_APP_VERSION.trim();
  }
  const fromInfo = w.__AMYNEST_DEVICE_INFO?.app_version;
  if (typeof fromInfo === "string" && fromInfo.trim()) return fromInfo.trim();
  try {
    const native = w.AmyNestAppNative?.getVersionName?.();
    if (typeof native === "string" && native.trim()) return native.trim();
  } catch {
    /* bridge not ready */
  }
  return null;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function userAgent(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
}

export function detectDevicePlatform(): string {
  const ua = userAgent();
  if (/AmyNestAndroid/i.test(ua)) return "android";
  if (isCapacitorNativeShell()) return "ios";
  if (isNativeAmyNestShell()) return "native";
  return "web";
}

export function detectBrowser(): string {
  const ua = userAgent();
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (detectDevicePlatform() === "ios") return "Safari";
  if (detectDevicePlatform() === "android") return "Chrome";
  return "Browser";
}

export function detectOS(): string {
  const ua = userAgent();
  if (/iPhone|iPad|iPod/.test(ua)) return /iPad/.test(ua) ? "iPadOS" : "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

export function getAppVersion(): string {
  const native = readNativeAppVersion();
  if (native) return native;
  const fromEnv = import.meta.env.VITE_APP_VERSION;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  return "web";
}

export function detectDeviceName(): string {
  const platform = detectDevicePlatform();
  const ua = userAgent();

  if (platform === "ios") {
    return /iPad/.test(ua) ? "iPad" : /iPhone/.test(ua) ? "iPhone" : "iOS device";
  }
  if (platform === "android") {
    return "Android device";
  }

  const stored = safeRead(DEVICE_NAME_KEY);
  if (stored) return stored;

  const name = `${detectBrowser()} on ${detectOS()}`;
  safeWrite(DEVICE_NAME_KEY, name);
  return name;
}

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Stable per-installation ID. Created once and reused across sessions on this install. */
export function getOrCreateDeviceId(): string {
  const existing = safeRead(DEVICE_ID_KEY);
  if (existing && existing.length >= 8) return existing;
  const native = readNativeDeviceId();
  if (native) {
    safeWrite(DEVICE_ID_KEY, native);
    return native;
  }
  const id = randomId();
  safeWrite(DEVICE_ID_KEY, id);
  return id;
}

export function getDeviceMetadata() {
  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: detectDeviceName(),
    platform: detectDevicePlatform(),
    browser: detectBrowser(),
    os: detectOS(),
    appVersion: getAppVersion(),
  };
}

export function getDeviceHeaders(): Record<string, string> {
  const meta = getDeviceMetadata();
  return {
    [DEVICE_ID_HEADER]: meta.deviceId,
    [DEVICE_NAME_HEADER]: meta.deviceName,
    [DEVICE_PLATFORM_HEADER]: meta.platform,
    [DEVICE_BROWSER_HEADER]: meta.browser,
    [DEVICE_OS_HEADER]: meta.os,
    [DEVICE_APP_VERSION_HEADER]: meta.appVersion,
  };
}

export function applyDeviceHeaders(headers: Headers): void {
  const map = getDeviceHeaders();
  for (const [key, value] of Object.entries(map)) {
    headers.set(key, value);
  }
}

export function formatDeviceSubtitle(browser: string | null, os: string | null, platform: string): string {
  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return platform;
}
