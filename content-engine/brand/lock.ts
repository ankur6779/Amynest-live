import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertBrandAssetsPresent, resolveBrandAssetPath } from "./assets-resolver.js";
import {
  AMYNEST_BRAND_COLORS,
  AMYNEST_CTA_LINES,
  AMYNEST_WEBSITE_URL,
  getBrandIdentityKit,
} from "./identity.js";

const FINGERPRINTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "golden-master",
  "BRAND_LOCK_FINGERPRINTS.json",
);

/**
 * Immutable Brand Lock — RC-1.
 * No provider may redesign or reinterpret these locked surfaces.
 */
export const BRAND_LOCK_VERSION = "brand-v1.0.0" as const;

const LOCKED_ASSET_KEYS = [
  "appIcon",
  "amyAiBible",
  "amyAiBase",
  "amyGirlBible",
  "amyGirlBase",
  "amyBoyBible",
  "amyBoyBase",
  "googlePlayBadge",
  "appStoreBadge",
] as const;

export interface BrandLockManifest {
  version: typeof BRAND_LOCK_VERSION;
  immutable: true;
  lockedAt: string;
  colors: Readonly<typeof AMYNEST_BRAND_COLORS>;
  typography: Readonly<{ display: string; body: string }>;
  ctaLines: readonly string[];
  websiteUrl: string;
  endCard: Readonly<{
    required: true;
    durationSeconds: { min: number; max: number; default: number };
    downloadLine: string;
  }>;
  logoPlacement: Readonly<{
    watermark: "top-right";
    endCardIcon: "center-upper";
    safeMarginPct: number;
  }>;
  assetFingerprints: Readonly<Record<string, string>>;
  neverAllow: readonly string[];
}

function fingerprintFile(path: string): string {
  if (!existsSync(path)) return `MISSING:${path}`;
  const bytes = readFileSync(path);
  return createHash("sha256").update(bytes).digest("hex");
}

let cachedManifest: BrandLockManifest | undefined;

function currentFingerprints(): Record<string, string> {
  const fingerprints: Record<string, string> = {};
  for (const key of LOCKED_ASSET_KEYS) {
    fingerprints[key] = fingerprintFile(resolveBrandAssetPath(key));
  }
  return fingerprints;
}

function loadCommittedFingerprints(): Record<string, string> | undefined {
  if (!existsSync(FINGERPRINTS_PATH)) return undefined;
  return JSON.parse(readFileSync(FINGERPRINTS_PATH, "utf8")) as Record<string, string>;
}

/** Persist immutable asset fingerprints for RC release (call once at cert time). */
export function persistBrandLockFingerprints(
  path = FINGERPRINTS_PATH,
): Record<string, string> {
  const fingerprints = currentFingerprints();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(fingerprints, null, 2)}\n`, "utf8");
  cachedManifest = undefined;
  return fingerprints;
}

export function getBrandLockManifest(): BrandLockManifest {
  if (cachedManifest) return cachedManifest;
  const kit = getBrandIdentityKit();
  const fingerprints = loadCommittedFingerprints() ?? currentFingerprints();
  const manifest: BrandLockManifest = {
    version: BRAND_LOCK_VERSION,
    immutable: true,
    lockedAt: "2026-07-28T19:00:00.000Z",
    colors: Object.freeze({ ...AMYNEST_BRAND_COLORS }),
    typography: Object.freeze({ ...kit.typography }),
    ctaLines: AMYNEST_CTA_LINES,
    websiteUrl: AMYNEST_WEBSITE_URL,
    endCard: Object.freeze({
      required: true as const,
      durationSeconds: { ...kit.endCard.durationSeconds },
      downloadLine: kit.endCard.downloadLine,
    }),
    logoPlacement: Object.freeze({
      watermark: "top-right" as const,
      endCardIcon: "center-upper" as const,
      safeMarginPct: 8,
    }),
    assetFingerprints: Object.freeze(fingerprints),
    neverAllow: Object.freeze([
      "Redesign official characters",
      "Regenerate app icon with AI",
      "Invent random mascots",
      "Alter brand colors",
      "Omit end card / store badges / CTA",
      "Generic promotional copy without a real AmyNest feature",
    ]),
  };
  cachedManifest = Object.freeze(manifest);
  return cachedManifest;
}

export function verifyBrandLockIntegrity(): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const assets = assertBrandAssetsPresent();
  if (!assets.ok) {
    errors.push(...assets.missing.map((m) => `Missing locked asset: ${m}`));
  }
  const committed = loadCommittedFingerprints();
  if (!committed) {
    // Before first RC persist, integrity is presence-only.
    return { ok: errors.length === 0, errors };
  }
  const current = currentFingerprints();
  for (const [key, expected] of Object.entries(committed)) {
    if (expected.startsWith("MISSING:") || current[key]?.startsWith("MISSING:")) {
      errors.push(`Locked asset fingerprint missing for ${key}`);
      continue;
    }
    if (current[key] !== expected) {
      errors.push(
        `Brand lock drift on ${key}: fingerprint changed (identity mutation forbidden)`,
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Stronger reference-conditioning block for provider retries after identity drift. */
export function buildStrongerReferenceConditioning(reason: string): string {
  const kit = getBrandIdentityKit();
  return [
    "BRAND LOCK RETRY — STRICT REFERENCE CONDITIONING",
    `Reason: ${reason}`,
    "You MUST match the official AmyNest locked identity exactly.",
    "Use attached official reference sheets only. Do not invent new designs.",
    kit.characters["amy-ai"].promptLock,
    kit.characters["amy-girl"].promptLock,
    kit.characters["amy-boy"].promptLock,
    `Palette locked: ${kit.colors.primary}, ${kit.colors.deepPurple}, ${kit.colors.secondary}.`,
    "App icon must be the official asset only — never redraw.",
    "Reject any identity drift in face, hair, eyes, outfit, proportions, material, or logo.",
  ].join("\n");
}
