import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { logger } from "../lib/logger.js";

/** `artifacts/api-server` root (works on Render when process cwd is repo root). */
function apiServerRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

/** Apple-safe OTA: patch-only web bundle updates (Guideline 2.5.2). */
export type OtaChangeClass =
  | "bugfix"
  | "ui-copy"
  | "styling"
  | "performance"
  | "content-data";

export interface OtaManifest {
  /** Master switch — set false to pause all OTA without a store build. */
  enabled: boolean;
  channel: string;
  /** Semver of the web bundle served OTA (e.g. 1.0.3). */
  bundleVersion: string;
  /** HTTPS URL to a zip of the Capacitor `www` folder. */
  bundleUrl: string;
  /** Lowercase hex SHA-256 of the zip (Capgo `checksum` field). */
  checksum: string;
  /** Minimum native build number (iOS CFBundleVersion / Android versionCode). */
  minNativeBuild: number;
  /** Optional upper bound — force store upgrade when native is too new for this bundle. */
  maxNativeBuild?: number | null;
  /**
   * patch-only: only `bundleVersion` patch segment may increase (1.0.2 → 1.0.3).
   * Disabled for same major.minor as the client's current bundle.
   */
  policy: "patch-only" | "disabled";
  releaseNotes?: string;
  /** Declared change types for audit / App Review notes (not enforced at runtime). */
  changeClasses?: OtaChangeClass[];
}

export interface CapgoOtaCheckBody {
  platform?: string;
  device_id?: string;
  app_id?: string;
  version_build?: string;
  version_code?: string;
  version_name?: string;
  version_os?: string;
  is_emulator?: boolean;
  is_prod?: boolean;
  plugin_version?: string;
  custom_id?: string;
}

export type OtaCheckResult =
  | { kind: "update"; version: string; url: string; checksum: string; releaseNotes?: string }
  | { kind: "none"; message: string }
  | { kind: "blocked"; error: string; message: string };

const DEFAULT_MANIFEST_REL = "ota/manifest.production.json";

function manifestPath(): string {
  const fromEnv = process.env.OTA_MANIFEST_PATH?.trim();
  if (fromEnv) return resolve(fromEnv);
  return resolve(apiServerRoot(), DEFAULT_MANIFEST_REL);
}

export function loadOtaManifest(): OtaManifest | null {
  const path = manifestPath();
  if (!existsSync(path)) {
    logger.warn({ path }, "OTA manifest not found — OTA disabled");
    return null;
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as OtaManifest;
    if (!raw.bundleVersion || !raw.bundleUrl || !raw.checksum) {
      logger.error({ path }, "OTA manifest missing required fields");
      return null;
    }
    return raw;
  } catch (err) {
    logger.error(
      { path, err: err instanceof Error ? err.message : String(err) },
      "OTA manifest parse failed",
    );
    return null;
  }
}

export function parseSemver(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v).trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Apple-recommended: OTA may only bump the patch segment (1.0.4 → 1.0.5), not minor/major. */
export function isPatchOnlyOtaBump(current: string, next: string): boolean {
  const c = parseSemver(current);
  const n = parseSemver(next);
  if (!c || !n) return false;
  if (c[0] !== n[0] || c[1] !== n[1]) return false;
  return n[2] > c[2];
}

function normalizeClientBundleVersion(versionName: string | undefined, fallback: string): string {
  const v = (versionName ?? "").trim();
  if (!v || v === "builtin" || v === "default") return fallback;
  return v;
}

function parseNativeBuild(body: CapgoOtaCheckBody): number {
  const raw = body.version_build ?? body.version_code ?? "0";
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : 0;
}

export function evaluateOtaCheck(
  body: CapgoOtaCheckBody,
  opts?: { builtinBundleVersion?: string },
): OtaCheckResult {
  if (process.env.OTA_ENABLED === "false") {
    return { kind: "none", message: "OTA disabled by server" };
  }

  const manifest = loadOtaManifest();
  if (!manifest || !manifest.enabled || manifest.policy === "disabled") {
    return { kind: "none", message: "No OTA manifest or OTA paused" };
  }

  const platform = String(body.platform ?? "").toLowerCase();
  if (platform && platform !== "ios" && platform !== "android") {
    return { kind: "none", message: "OTA only for ios/android" };
  }

  const nativeBuild = parseNativeBuild(body);
  if (nativeBuild < manifest.minNativeBuild) {
    return {
      kind: "blocked",
      error: "native_upgrade_required",
      message: `Please update AmyNest from the App Store (build ${manifest.minNativeBuild}+ required).`,
    };
  }
  if (
    manifest.maxNativeBuild != null &&
    nativeBuild > manifest.maxNativeBuild
  ) {
    return {
      kind: "blocked",
      error: "native_downgrade_required",
      message: "This app build is too new for the available OTA bundle. Update from the store.",
    };
  }

  const builtin = opts?.builtinBundleVersion ?? manifest.bundleVersion;
  const current = normalizeClientBundleVersion(body.version_name, builtin);

  if (!isPatchOnlyOtaBump(current, manifest.bundleVersion)) {
    if (current === manifest.bundleVersion) {
      return { kind: "none", message: "Already on latest OTA bundle" };
    }
    return {
      kind: "blocked",
      error: "ota_policy_minor_major",
      message:
        "This update requires a new App Store version. OTA only delivers patch-level web fixes.",
    };
  }

  if (!manifest.bundleUrl.startsWith("https://")) {
    logger.error({ url: manifest.bundleUrl }, "OTA bundleUrl must be HTTPS");
    return { kind: "none", message: "OTA misconfigured" };
  }

  return {
    kind: "update",
    version: manifest.bundleVersion,
    url: manifest.bundleUrl,
    checksum: manifest.checksum.toLowerCase().replace(/^sha256:/, ""),
    releaseNotes: manifest.releaseNotes,
  };
}

/** Compute sha256 hex digest of a file (for publish script). */
export function sha256FileHex(filePath: string): string {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex");
}
