/**
 * Startup diagnostics — device, WebView, network, and startup-stage telemetry.
 *
 * Used by the global startup watchdog and crash overlay to explain *why* a boot
 * stalled (especially on OEM Android WebViews — OnePlus / Oppo / Vivo / Xiaomi /
 * Realme / Motorola — where dynamic-import fetches can hang on flaky networks).
 *
 * Everything here is best-effort and never throws: a diagnostics call must never
 * be the reason startup fails.
 */

import { getStartupState } from "@/lib/startup-orchestrator";

export type StartupDiagnostics = {
  platform: "android" | "ios" | "web" | "unknown";
  /** Android model token (e.g. "CPH2451", "Pixel 7") or "unknown". */
  deviceModel: string;
  /** OS version string (e.g. "Android 13", "iOS 17.4") or "unknown". */
  osVersion: string;
  /** Chrome/WebView major version (e.g. "120") or "unknown". */
  webViewVersion: string;
  /** True when running inside an Android WebView (UA contains "; wv"). */
  isWebView: boolean;
  browser: string;
  online: boolean;
  /** navigator.connection.effectiveType (e.g. "4g", "3g") or "unknown". */
  effectiveType: string;
  /** Current startup orchestrator phase. */
  startupStage: string;
  /** ms since startup began. */
  startupMs: number;
  /** Pre-React boot breadcrumbs from index.html (__amynestDiag). */
  bootPhases: string[];
  appCoreReady: boolean;
  reactRendered: boolean;
  userAgent: string;
};

function safeUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  try {
    return navigator.userAgent || "";
  } catch {
    return "";
  }
}

function detectPlatform(ua: string): StartupDiagnostics["platform"] {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (
    /Mac/i.test(ua) &&
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator).maxTouchPoints === "number" &&
    (navigator as Navigator).maxTouchPoints > 1
  ) {
    return "ios";
  }
  if (ua) return "web";
  return "unknown";
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "edge";
  if (/SamsungBrowser/i.test(ua)) return "samsung-internet";
  if (/chrome|crios/i.test(ua)) return "chrome";
  if (/firefox|fxios/i.test(ua)) return "firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "safari";
  return "other";
}

/**
 * Parse the Android device model from the UA build segment.
 * UA shape: "Mozilla/5.0 (Linux; Android 13; CPH2451 Build/TP1A...) ...".
 */
function detectDeviceModel(ua: string): string {
  const androidModel = ua.match(/Android\s[\d.]+;\s?([^;)]+?)(?:\sBuild\/|\)|;)/i);
  if (androidModel?.[1]) {
    const model = androidModel[1].trim();
    // Strip a trailing locale token ("en-us") some OEM UAs include.
    if (model && !/^[a-z]{2}-[a-z]{2}$/i.test(model)) return model;
  }
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  return "unknown";
}

function detectOsVersion(ua: string, platform: string): string {
  if (platform === "android") {
    const m = ua.match(/Android\s([\d.]+)/i);
    return m?.[1] ? `Android ${m[1]}` : "Android";
  }
  if (platform === "ios") {
    const m = ua.match(/OS\s(\d+[_.]\d+(?:[_.]\d+)?)/i);
    return m?.[1] ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS";
  }
  return "unknown";
}

function detectWebViewVersion(ua: string): string {
  const m = ua.match(/Chrome\/(\d+)/i);
  return m?.[1] ?? "unknown";
}

function isAndroidWebView(ua: string): boolean {
  // Android System WebView injects "; wv" into the UA. Some OEM in-app shells
  // also expose Version/x.x alongside Chrome.
  return /;\s?wv\b/i.test(ua) || /\bVersion\/[\d.]+.*Chrome\//i.test(ua);
}

function detectEffectiveType(): string {
  if (typeof navigator === "undefined") return "unknown";
  try {
    const conn = (
      navigator as Navigator & { connection?: { effectiveType?: string } }
    ).connection;
    return conn?.effectiveType ?? "unknown";
  } catch {
    return "unknown";
  }
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  try {
    return navigator.onLine !== false;
  } catch {
    return true;
  }
}

function readBootPhases(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const diag = window.__amynestDiag?.();
    const phases = (diag as { phases?: string[] } | null)?.phases;
    return Array.isArray(phases) ? phases : [];
  } catch {
    return [];
  }
}

/** Snapshot of everything we know about the current boot — never throws. */
export function collectStartupDiagnostics(): StartupDiagnostics {
  const ua = safeUserAgent();
  const platform = detectPlatform(ua);

  let startupStage = "unknown";
  let startupMs = 0;
  let appCoreReady = false;
  let reactRendered = false;
  try {
    const s = getStartupState();
    startupStage = s.phase;
    startupMs = Date.now() - s.startedAt;
    appCoreReady = s.appCoreReady;
    reactRendered = s.reactRendered;
  } catch {
    /* orchestrator may not be initialised yet */
  }

  return {
    platform,
    deviceModel: detectDeviceModel(ua),
    osVersion: detectOsVersion(ua, platform),
    webViewVersion: detectWebViewVersion(ua),
    isWebView: platform === "android" && isAndroidWebView(ua),
    browser: detectBrowser(ua),
    online: isOnline(),
    effectiveType: detectEffectiveType(),
    startupStage,
    startupMs,
    bootPhases: readBootPhases(),
    appCoreReady,
    reactRendered,
    userAgent: ua,
  };
}

/** Flatten diagnostics into a telemetry-safe primitive map. */
export function diagnosticsToTelemetry(
  d: StartupDiagnostics,
): Record<string, string | number | boolean> {
  return {
    platform: d.platform,
    device_model: d.deviceModel,
    os_version: d.osVersion,
    webview_version: d.webViewVersion,
    is_webview: d.isWebView,
    browser: d.browser,
    online: d.online,
    effective_type: d.effectiveType,
    startup_stage: d.startupStage,
    startup_ms: d.startupMs,
    boot_phases: d.bootPhases.join(">"),
    app_core_ready: d.appCoreReady,
    react_rendered: d.reactRendered,
  };
}

/** Log a single, grep-able diagnostics line to console + production logs. */
export function logStartupDiagnostics(reason: string): StartupDiagnostics {
  const d = collectStartupDiagnostics();
  try {
    console.warn(`[amynest:startup-diag] ${reason}`, diagnosticsToTelemetry(d));
  } catch {
    /* ignore */
  }
  return d;
}
