import { z } from "zod";
import { getApiUrl } from "@/lib/api";
import { isCapacitorIosShell, isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import { compareVersions, isVersionLessThan } from "@/lib/version-comparator";
import { trackVersionAnalytics } from "@/lib/version-analytics";

export type AppUpdatePlatform = "ios" | "android";

export type PlatformVersionPolicy = {
  minimumVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  storeUrl: string;
  message: string;
};

export type AppVersionPolicy = Record<AppUpdatePlatform, PlatformVersionPolicy>;

export type VersionGateDecision =
  | { kind: "allow"; platform: AppUpdatePlatform | null; reason: string }
  | {
      kind: "hard-update";
      platform: AppUpdatePlatform;
      installedVersion: string;
      policy: PlatformVersionPolicy;
    }
  | {
      kind: "soft-update";
      platform: AppUpdatePlatform;
      installedVersion: string;
      policy: PlatformVersionPolicy;
    };

type CachedPolicy = {
  policy: AppVersionPolicy;
  fetchedAt: number;
  maxAgeMs: number;
};

type AndroidAppBridge = {
  getVersionName?: () => string;
  openStoreUrl?: (url: string) => boolean;
  setForceUpdateActive?: (active: boolean) => void;
};

declare global {
  interface Window {
    AmyNestAppNative?: AndroidAppBridge;
  }
}

const CACHE_KEY = "amynest:app-version-policy:v1";
const DEFAULT_CACHE_MAX_AGE_MS = 120_000;
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*)){0,2}(?:-(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const versionSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(SEMVER_PATTERN);

function isAllowedStoreUrl(platform: AppUpdatePlatform, storeUrl: string): boolean {
  try {
    const url = new URL(storeUrl);
    const protocol = url.protocol.toLowerCase();
    const host = url.host.toLowerCase();
    if (platform === "ios") {
      return protocol === "https:" && (host === "apps.apple.com" || host === "itunes.apple.com");
    }
    return (
      protocol === "market:" ||
      (protocol === "https:" && host === "play.google.com" && url.pathname.startsWith("/store"))
    );
  } catch {
    return false;
  }
}

const platformPolicyBaseSchema = z.object({
  minimumVersion: versionSchema,
  latestVersion: versionSchema,
  forceUpdate: z.boolean(),
  message: z.string().trim().min(1).max(240),
});
const appVersionPolicySchema = z.object({
  ios: platformPolicyBaseSchema.extend({
    storeUrl: z
      .string()
      .trim()
      .url()
      .refine((value) => isAllowedStoreUrl("ios", value)),
  }),
  android: platformPolicyBaseSchema.extend({
    storeUrl: z
      .string()
      .trim()
      .url()
      .refine((value) => isAllowedStoreUrl("android", value)),
  }),
});

function logVersionEvent(event: string, props: Record<string, unknown>): void {
  console.info(`[amynest:version] ${event}`, props);
}

function readCapacitorPlatform(): AppUpdatePlatform | null {
  if (typeof window === "undefined") return null;
  try {
    const cap = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
      }
    ).Capacitor;
    if (cap?.isNativePlatform?.() !== true) return null;
    const platform = cap.getPlatform?.();
    return platform === "ios" || platform === "android" ? platform : null;
  } catch {
    return null;
  }
}

export function detectAppUpdatePlatform(): AppUpdatePlatform | null {
  const capacitorPlatform = readCapacitorPlatform();
  if (capacitorPlatform) return capacitorPlatform;
  if (isNativeAmyNestAndroidWrapper()) return "android";
  return null;
}

export async function getInstalledAppVersion(
  platform: AppUpdatePlatform,
): Promise<string | null> {
  if (platform === "android") {
    try {
      const version = window.AmyNestAppNative?.getVersionName?.()?.trim();
      if (version) return version;
    } catch (err) {
      logVersionEvent("android_version_read_failed", { err });
    }
  }

  if (isCapacitorIosShell() || readCapacitorPlatform() === platform) {
    try {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      return info.version?.trim() || null;
    } catch (err) {
      logVersionEvent("capacitor_version_read_failed", { platform, err });
    }
  }

  return null;
}

function parseCacheControlMaxAge(header: string | null): number {
  const match = /(?:^|,)\s*max-age=(\d+)/i.exec(header ?? "");
  if (!match) return DEFAULT_CACHE_MAX_AGE_MS;
  return Math.max(60_000, Math.min(300_000, Number(match[1]) * 1000));
}

function readCachedPolicy(now = Date.now()): CachedPolicy | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPolicy;
    const policy = appVersionPolicySchema.parse(parsed.policy);
    const fetchedAt = Number(parsed.fetchedAt);
    const maxAgeMs = Number(parsed.maxAgeMs);
    if (!Number.isFinite(fetchedAt) || !Number.isFinite(maxAgeMs)) return null;
    if (now - fetchedAt > maxAgeMs) return null;
    return { policy, fetchedAt, maxAgeMs };
  } catch {
    return null;
  }
}

function writeCachedPolicy(policy: AppVersionPolicy, maxAgeMs: number): void {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ policy, fetchedAt: Date.now(), maxAgeMs }),
    );
  } catch {
    /* Local cache is best-effort; never block app boot. */
  }
}

async function fetchPolicy(): Promise<{
  policy: AppVersionPolicy;
  source: "network" | "cache";
}> {
  try {
    const res = await fetch(getApiUrl("/api/app-version-policy"), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-cache",
    });
    if (!res.ok) {
      throw new Error(`policy_http_${res.status}`);
    }
    const data = appVersionPolicySchema.parse(await res.json());
    writeCachedPolicy(data, parseCacheControlMaxAge(res.headers.get("Cache-Control")));
    return { policy: data, source: "network" };
  } catch (err) {
    const cached = readCachedPolicy();
    logVersionEvent("policy_fetch_failed", {
      reason: err instanceof Error ? err.message : String(err),
      usedCache: Boolean(cached),
    });
    if (cached) return { policy: cached.policy, source: "cache" };
    throw err;
  }
}

export function setNativeForceUpdateActive(active: boolean): void {
  try {
    window.AmyNestAppNative?.setForceUpdateActive?.(active);
  } catch {
    /* Bridge is optional outside the Android wrapper. */
  }
}

export async function openStoreUrl(platform: AppUpdatePlatform, storeUrl: string): Promise<void> {
  if (!isAllowedStoreUrl(platform, storeUrl)) {
    logVersionEvent("store_url_rejected", { platform, storeUrl });
    return;
  }

  if (platform === "android") {
    try {
      const opened = window.AmyNestAppNative?.openStoreUrl?.(storeUrl);
      if (opened) return;
    } catch (err) {
      logVersionEvent("android_store_open_failed", { err });
    }
  }

  window.location.assign(storeUrl);
}

export async function evaluateVersionGate(): Promise<VersionGateDecision> {
  const platform = detectAppUpdatePlatform();
  if (!platform) {
    return { kind: "allow", platform: null, reason: "not_native_app" };
  }

  const installedVersion = await getInstalledAppVersion(platform);
  logVersionEvent("installed_version", { platform, installedVersion });

  if (!installedVersion) {
    trackVersionAnalytics("version_policy_fetch_failed", {
      platform,
      installedVersion,
      reason: "installed_version_unavailable",
    }, { onceKey: `${platform}:version-unavailable` });
    return { kind: "allow", platform, reason: "installed_version_unavailable" };
  }

  let fetched: Awaited<ReturnType<typeof fetchPolicy>>;
  try {
    fetched = await fetchPolicy();
  } catch (err) {
    trackVersionAnalytics(
      "version_policy_fetch_failed",
      {
        platform,
        installedVersion,
        reason: err instanceof Error ? err.message.slice(0, 120) : "policy_fetch_failed",
      },
      { onceKey: `${platform}:${installedVersion}:policy-unavailable` },
    );
    return { kind: "allow", platform, reason: "policy_unavailable" };
  }

  const policy = fetched.policy[platform];
  const policyOnceKey = `${platform}:${installedVersion}:${policy.minimumVersion}:${policy.latestVersion}:${policy.forceUpdate}:${fetched.source}`;
  trackVersionAnalytics(
    "app_version_policy_fetched",
    {
      platform,
      installedVersion,
      minimumVersion: policy.minimumVersion,
      latestVersion: policy.latestVersion,
      forceUpdate: policy.forceUpdate,
      source: fetched.source,
    },
    { onceKey: policyOnceKey },
  );
  if (fetched.source === "cache") {
    trackVersionAnalytics(
      "cached_policy_used",
      {
        platform,
        installedVersion,
        minimumVersion: policy.minimumVersion,
        latestVersion: policy.latestVersion,
        forceUpdate: policy.forceUpdate,
        source: "cache",
      },
      { onceKey: policyOnceKey },
    );
  }

  const belowMinimum = isVersionLessThan(installedVersion, policy.minimumVersion);
  const belowLatest = isVersionLessThan(installedVersion, policy.latestVersion);
  const comparisonResult = belowMinimum
    ? "hard_update"
    : belowLatest && !policy.forceUpdate
      ? "soft_update"
      : "allow";

  logVersionEvent("comparison_result", {
    platform,
    installedVersion,
    minimumVersion: policy.minimumVersion,
    latestVersion: policy.latestVersion,
    forceUpdate: policy.forceUpdate,
    comparisonResult,
    numericMinimumComparison: compareVersions(installedVersion, policy.minimumVersion),
    numericLatestComparison: compareVersions(installedVersion, policy.latestVersion),
  });

  if (belowMinimum) {
    return { kind: "hard-update", platform, installedVersion, policy };
  }

  if (belowLatest && !policy.forceUpdate) {
    return { kind: "soft-update", platform, installedVersion, policy };
  }

  return { kind: "allow", platform, reason: "version_supported" };
}
