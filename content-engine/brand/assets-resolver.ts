import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(HERE, "assets");

const FILES = {
  appIcon: "app-icon.png",
  appIconMaster: "app-icon-master.png",
  appIconOfficial: "app-icon-official.jpeg",
  amyAiBible: "amy-ai-bible.jpeg",
  amyAiSheet: "amy-ai-sheet.png",
  amyAiBase: "amy-ai-base.png",
  amyGirlBible: "amy-girl-bible.jpeg",
  amyGirlSheet: "amy-girl-sheet.png",
  amyGirlBase: "amy-girl-base.png",
  amyBoyBible: "amy-boy-bible.jpeg",
  amyBoySheet: "amy-boy-sheet.png",
  amyBoyBase: "amy-boy-base.png",
  googlePlayBadge: "google-play-badge.svg",
  appStoreBadge: "app-store-badge.svg",
} as const;

export type BrandAssetKey = keyof typeof FILES;

/** Resolve a brand kit asset path. Falls back through alternate filenames when needed. */
export function resolveBrandAssetPath(key: BrandAssetKey): string {
  const primary = join(ASSETS_DIR, FILES[key]);
  if (existsSync(primary)) return primary;

  const fallbacks: Partial<Record<BrandAssetKey, string[]>> = {
    appIcon: [FILES.appIconMaster, FILES.appIconOfficial],
    amyAiBible: [FILES.amyAiSheet, FILES.amyAiBase],
    amyGirlBible: [FILES.amyGirlSheet, FILES.amyGirlBase],
    amyBoyBible: [FILES.amyBoySheet, FILES.amyBoyBase],
  };

  for (const name of fallbacks[key] ?? []) {
    const candidate = join(ASSETS_DIR, name);
    if (existsSync(candidate)) return candidate;
  }
  return primary;
}

export function getBrandAssetsDirectory(): string {
  return ASSETS_DIR;
}

export function assertBrandAssetsPresent(): {
  ok: boolean;
  missing: string[];
  present: string[];
} {
  const required: BrandAssetKey[] = [
    "appIcon",
    "amyAiBible",
    "amyGirlBible",
    "amyBoyBible",
    "amyAiBase",
    "amyGirlBase",
    "amyBoyBase",
    "googlePlayBadge",
    "appStoreBadge",
  ];
  const missing: string[] = [];
  const present: string[] = [];
  for (const key of required) {
    const path = resolveBrandAssetPath(key);
    if (existsSync(path)) present.push(path);
    else missing.push(path);
  }
  return { ok: missing.length === 0, missing, present };
}
