import { getOrCreateDeviceId, detectDevicePlatform, detectBrowser, getAppVersion } from "@/lib/device-id";
import { getNetworkLabel } from "@/lib/fetch-with-timeout";
import {
  detectStartType,
  getOrCreateFunnelSessionId,
  getOrCreateInstallId,
  getLaunchTimestampMs,
} from "./install";
import type { StartupFunnelEventPayload } from "@workspace/analytics-taxonomy";

export type StartupFunnelContext = Omit<
  StartupFunnelEventPayload,
  "event_name" | "event_type" | "client_ts" | "elapsed_ms" | "startup_phase" | "meta"
>;

type NativeDeviceBridge = {
  getDeviceInfo?: () => string;
};

declare global {
  interface Window {
    AmyNestDeviceNative?: NativeDeviceBridge;
    __AMYNEST_DEVICE_INFO?: Partial<StartupFunnelContext>;
  }
}

function parseNativeDeviceInfo(): Partial<StartupFunnelContext> {
  if (typeof window === "undefined") return {};
  if (window.__AMYNEST_DEVICE_INFO) return window.__AMYNEST_DEVICE_INFO;
  try {
    const raw = window.AmyNestDeviceNative?.getDeviceInfo?.();
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StartupFunnelContext>;
    window.__AMYNEST_DEVICE_INFO = parsed;
    return parsed;
  } catch {
    return {};
  }
}

function readMetaDeployVersion(): string {
  if (typeof document === "undefined") return "unknown";
  return (
    document.querySelector('meta[name="amynest-deploy"]')?.getAttribute("content") ??
    "unknown"
  );
}

function readBuildNumber(): string {
  if (typeof document === "undefined") return "unknown";
  return (
    document.querySelector('meta[name="app-build-version"]')?.getAttribute("content") ??
    import.meta.env.VITE_APP_VERSION ??
    "unknown"
  );
}

function readWebViewVersion(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const ua = navigator.userAgent;
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  if (chrome) return chrome[1];
  return undefined;
}

function readAndroidVersion(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const m = navigator.userAgent.match(/Android ([\d.]+)/);
  return m?.[1];
}

function readLocale(): string {
  try {
    return navigator.language || "unknown";
  } catch {
    return "unknown";
  }
}

function readTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    return "unknown";
  }
}

function readMemoryClass(): string | undefined {
  try {
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (dm != null) return `${dm}gb`;
  } catch {
    /* ignore */
  }
  return undefined;
}

function readBatterySaver(): boolean | undefined {
  return undefined;
}

function readScreen(): { width?: number; height?: number } {
  if (typeof window === "undefined") return {};
  return {
    width: window.screen?.width,
    height: window.screen?.height,
  };
}

let cachedContext: StartupFunnelContext | null = null;

export function getStartupFunnelContext(): StartupFunnelContext {
  if (cachedContext) return cachedContext;
  const native = parseNativeDeviceInfo();
  const screen = readScreen();
  cachedContext = {
    session_id: getOrCreateFunnelSessionId(),
    install_id: getOrCreateInstallId(),
    device_id: getOrCreateDeviceId(),
    device_model: native.device_model,
    manufacturer: native.manufacturer,
    android_version: native.android_version ?? readAndroidVersion(),
    webview_version: native.webview_version ?? readWebViewVersion(),
    app_version: native.app_version ?? getAppVersion(),
    build_number: native.build_number ?? readBuildNumber(),
    network_type: getNetworkLabel(),
    carrier: native.carrier,
    locale: readLocale(),
    timezone: readTimezone(),
    memory_class: native.memory_class ?? readMemoryClass(),
    battery_saver: native.battery_saver ?? readBatterySaver(),
    platform: native.platform ?? detectDevicePlatform(),
    country: readLocale().split("-")[1]?.toUpperCase(),
    language: readLocale().split("-")[0],
    screen_width: screen.width,
    screen_height: screen.height,
    cpu_architecture: native.cpu_architecture,
    play_store_version: native.play_store_version,
    start_type: detectStartType(),
  };
  return cachedContext;
}

export function elapsedMsFromLaunch(): number {
  return Math.max(0, Math.round(Date.now() - getLaunchTimestampMs()));
}

export function resetStartupFunnelContextForTests(): void {
  cachedContext = null;
}

export function getDeployVersion(): string {
  return readMetaDeployVersion();
}
