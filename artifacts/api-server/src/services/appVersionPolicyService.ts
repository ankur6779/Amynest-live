import { z } from "zod/v4";

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*)){0,2}(?:-(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const versionStringSchema = z
  .string()
  .trim()
  .regex(SEMVER_PATTERN, "Invalid semantic version");

const storeUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Store URL must be HTTPS");

function hasAllowedStoreHost(value: string, allowedHosts: readonly string[]): boolean {
  try {
    const host = new URL(value).host.toLowerCase();
    return allowedHosts.includes(host);
  } catch {
    return false;
  }
}

const platformPolicyBaseSchema = z.object({
  minimumVersion: versionStringSchema,
  latestVersion: versionStringSchema,
  forceUpdate: z.boolean(),
  message: z.string().trim().min(1).max(240),
});

export const appVersionPolicySchema = z.object({
  ios: platformPolicyBaseSchema.extend({
    storeUrl: storeUrlSchema.refine(
      (value) => hasAllowedStoreHost(value, ["apps.apple.com", "itunes.apple.com"]),
      "iOS store URL must point to the App Store",
    ),
  }),
  android: platformPolicyBaseSchema.extend({
    storeUrl: storeUrlSchema.refine(
      (value) => hasAllowedStoreHost(value, ["play.google.com"]),
      "Android store URL must point to Google Play",
    ),
  }),
});

export type AppVersionPolicy = z.infer<typeof appVersionPolicySchema>;

const DEFAULT_MESSAGE = "Please update AmyNest AI to continue using the app.";
const DEFAULT_IOS_STORE_URL = "https://apps.apple.com/app/amynest-ai";
const DEFAULT_ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.amynest.app";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const value = env(name)?.toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes";
}

function readPlatformPolicy(prefix: "IOS" | "ANDROID") {
  const minimumVersion = env(`APP_${prefix}_MINIMUM_VERSION`) ?? "0.0.0";
  return {
    minimumVersion,
    latestVersion: env(`APP_${prefix}_LATEST_VERSION`) ?? minimumVersion,
    forceUpdate: envBoolean(`APP_${prefix}_FORCE_UPDATE`, false),
    storeUrl:
      env(`APP_${prefix}_STORE_URL`) ??
      (prefix === "IOS" ? DEFAULT_IOS_STORE_URL : DEFAULT_ANDROID_STORE_URL),
    message: env(`APP_${prefix}_UPDATE_MESSAGE`) ?? DEFAULT_MESSAGE,
  };
}

export function getAppVersionPolicy(): AppVersionPolicy {
  const rawJson = env("APP_VERSION_POLICY_JSON");
  if (rawJson) {
    const parsedJson = JSON.parse(rawJson) as unknown;
    return appVersionPolicySchema.parse(parsedJson);
  }

  return appVersionPolicySchema.parse({
    ios: readPlatformPolicy("IOS"),
    android: readPlatformPolicy("ANDROID"),
  });
}

export function getAppVersionPolicyCacheSeconds(): number {
  const raw = Number(env("APP_VERSION_POLICY_CACHE_SECONDS") ?? "120");
  if (!Number.isFinite(raw)) return 120;
  return Math.min(300, Math.max(60, Math.floor(raw)));
}
