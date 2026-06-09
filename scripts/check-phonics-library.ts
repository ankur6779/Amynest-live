/**
 * Phase 11 — Validate 100% phonics library coverage (fail build if incomplete).
 *
 *   pnpm run check:phonics-library
 *
 * Set PHONICS_LIBRARY_SKIP_CHECK=1 to skip (local dev without generated assets).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildPhonicsAudioCatalog,
  getPhonicsCatalogKey,
  type PhonicsAudioLibraryManifest,
} from "@workspace/phonics-sounds";
import { PHONICS_LIBRARY_MANIFEST_PATHS, REPO_ROOT } from "./phonics-library-io.js";

type CheckResult = { id: string; label: string; ok: boolean; detail?: string };

/** Shipped manifests use API proxy paths; legacy entries may still use public GCS HTTPS. */
function isValidPhonicsManifestPlaybackUrl(url: string | undefined): boolean {
  const u = (url ?? "").trim();
  if (!u) return false;
  if (u.startsWith("https://")) return true;
  return u.startsWith("/api/phonics-library/phonics/");
}

function loadManifest(): PhonicsAudioLibraryManifest | null {
  const path = PHONICS_LIBRARY_MANIFEST_PATHS[0];
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PhonicsAudioLibraryManifest;
  } catch {
    return null;
  }
}

function checkCatalogCoverage(manifest: PhonicsAudioLibraryManifest | null): CheckResult[] {
  const catalog = buildPhonicsAudioCatalog();
  const results: CheckResult[] = [];

  if (!manifest?.assets) {
    return [
      {
        id: "manifest",
        label: "phonics-audio-map.json present",
        ok: false,
        detail: "Run generate:phonics-library after clean:phonics-audio-legacy",
      },
    ];
  }

  const missing: string[] = [];
  const broken: string[] = [];
  const duplicateUrls = new Map<string, string[]>();

  for (const entry of catalog) {
    const key = getPhonicsCatalogKey(entry.type, entry.id);
    const asset = manifest.assets[key];
    if (!isValidPhonicsManifestPlaybackUrl(asset?.url)) {
      missing.push(key);
      continue;
    }
    if (!asset.gcsPath?.startsWith("phonics/")) {
      broken.push(`${key}: bad gcsPath ${asset.gcsPath}`);
    }
    const list = duplicateUrls.get(asset.url) ?? [];
    list.push(key);
    duplicateUrls.set(asset.url, list);
  }

  results.push({
    id: "coverage",
    label: "Every curriculum item has audio",
    ok: missing.length === 0,
    detail: missing.length ? `missing ${missing.length}: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}` : `${catalog.length} assets`,
  });

  const quizMissing = catalog
    .filter((e) => e.type === "quiz")
    .filter((e) => !manifest.assets[getPhonicsCatalogKey(e.type, e.id)]?.url);
  results.push({
    id: "quiz",
    label: "Every quiz prompt has audio",
    ok: quizMissing.length === 0,
    detail: quizMissing.length ? quizMissing.map((e) => e.text).join("; ") : `${catalog.filter((e) => e.type === "quiz").length} quizzes`,
  });

  const sightMissing = catalog
    .filter((e) => e.type === "sight_word")
    .filter((e) => !manifest.assets[getPhonicsCatalogKey(e.type, e.id)]?.url);
  results.push({
    id: "sight",
    label: "Every sight word has audio",
    ok: sightMissing.length === 0,
    detail: sightMissing.map((e) => e.id).join(", ") || "ok",
  });

  const phonemeMissing = catalog
    .filter((e) => e.type === "letter" || e.type === "digraph" || e.type === "blend")
    .filter((e) => !manifest.assets[getPhonicsCatalogKey(e.type, e.id)]?.url);
  results.push({
    id: "phoneme",
    label: "Every phoneme/blend has audio",
    ok: phonemeMissing.length === 0,
    detail: phonemeMissing.map((e) => e.id).join(", ") || "ok",
  });

  results.push({
    id: "gcs-paths",
    label: "No broken GCS paths",
    ok: broken.length === 0,
    detail: broken.join("; ") || "ok",
  });

  const dupes = [...duplicateUrls.entries()].filter(([, keys]) => keys.length > 1);
  results.push({
    id: "duplicates",
    label: "No duplicate URLs",
    ok: dupes.length === 0,
    detail: dupes.length ? dupes.map(([url, keys]) => `${url} ← ${keys.join(",")}`).join("; ") : "ok",
  });

  const orphanKeys = Object.keys(manifest.assets).filter(
    (k) => !catalog.some((e) => getPhonicsCatalogKey(e.type, e.id) === k),
  );
  results.push({
    id: "orphans",
    label: "No orphan metadata keys",
    ok: orphanKeys.length === 0,
    detail: orphanKeys.length ? orphanKeys.slice(0, 10).join(", ") : "ok",
  });

  return results;
}

function checkLegacyRemoved(): CheckResult[] {
  const legacyDir = join(REPO_ROOT, "artifacts/kidschedule/public/phonics-audio");
  const legacyMp3Count = existsSync(legacyDir)
    ? readdirSync(legacyDir).filter((f) => f.endsWith(".mp3")).length
    : 0;

  return [
    {
      id: "legacy-mp3",
      label: "No legacy bundled phonics MP3s",
      ok: legacyMp3Count === 0,
      detail: legacyMp3Count ? `${legacyMp3Count} files remain in public/phonics-audio/` : "clean",
    },
  ];
}

const PHONICS_RELEASE_MIN_ASSETS = 100;

function checkManifestIntegrity(manifest: PhonicsAudioLibraryManifest | null): CheckResult[] {
  if (!manifest?.assets) {
    return [
      {
        id: "min-count",
        label: `Manifest has at least ${PHONICS_RELEASE_MIN_ASSETS} assets`,
        ok: false,
        detail: "manifest missing",
      },
      {
        id: "https-urls",
        label: "Every manifest asset has HTTPS url",
        ok: false,
        detail: "manifest missing",
      },
    ];
  }

  const entries = Object.entries(manifest.assets);
  let missingUrls = 0;
  for (const [, asset] of entries) {
    if (!isValidPhonicsManifestPlaybackUrl(asset?.url)) missingUrls += 1;
  }

  return [
    {
      id: "min-count",
      label: `Manifest has at least ${PHONICS_RELEASE_MIN_ASSETS} assets`,
      ok: entries.length >= PHONICS_RELEASE_MIN_ASSETS,
      detail: `${entries.length} assets`,
    },
    {
      id: "https-urls",
      label: "Every manifest asset has playable url (API proxy or HTTPS)",
      ok: missingUrls === 0,
      detail: missingUrls ? `${missingUrls} missing/bad URLs` : "ok",
    },
  ];
}

export function runPhonicsLibraryChecks(): CheckResult[] {
  if (process.env.PHONICS_LIBRARY_SKIP_CHECK === "1") {
    console.log("[check:phonics-library] skipped (PHONICS_LIBRARY_SKIP_CHECK=1)");
    return [];
  }
  const manifest = loadManifest();
  return [
    ...checkCatalogCoverage(manifest),
    ...checkManifestIntegrity(manifest),
    ...checkLegacyRemoved(),
  ];
}

function main(): void {
  const results = runPhonicsLibraryChecks();
  if (results.length === 0) return;

  console.log("\n[check:phonics-library] PHONICS LIBRARY VALIDATION\n");
  for (const r of results) {
    const icon = r.ok ? "✔" : "✗";
    console.log(`  ${icon} [${r.id}] ${r.label}${r.detail ? `\n      ${r.detail}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n  ${results.length - failed}/${results.length} passed\n`);

  if (failed > 0) {
    console.error("[check:phonics-library] FAIL — coverage must be 100% before release.");
    console.error("  pnpm run clean:phonics-audio-legacy");
    console.error("  ELEVENLABS_API_KEY=... pnpm run generate:phonics-library -- --force\n");
    process.exit(1);
  }

  console.log("[check:phonics-library] PASS — library complete.\n");
}

const isDirectRun =
  process.argv[1]?.includes("check-phonics-library.ts") &&
  !process.argv[1]?.includes("check-phonics-release-gate");

if (isDirectRun) {
  main();
}
