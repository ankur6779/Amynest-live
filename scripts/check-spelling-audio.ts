/**
 * Validate spelling-audio-manifest.json against the spelling catalog.
 *
 *   pnpm run check:spelling-audio
 *
 * Set SPELLING_AUDIO_SKIP_CHECK=1 to skip (local dev without manifest).
 */
import { existsSync, readFileSync } from "node:fs";
import { getAllCatalogEntries } from "@workspace/spelling-catalog";
import {
  isValidSpellingGcsObjectPath,
  SPELLING_AUDIO_VERSION,
  type SpellingAudioManifest,
} from "@workspace/spelling-audio";
import { SPELLING_AUDIO_MANIFEST_PATHS, REPO_ROOT } from "./spelling-audio-io.js";

type CheckResult = { id: string; label: string; ok: boolean; detail?: string };

function loadManifest(): SpellingAudioManifest | null {
  const path = SPELLING_AUDIO_MANIFEST_PATHS[0];
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as SpellingAudioManifest;
  } catch {
    return null;
  }
}

function isValidPlaybackUrl(url: string): boolean {
  const u = (url ?? "").trim();
  if (!u || u.includes("undefined")) return false;
  if (u.startsWith("https://storage.googleapis.com/")) return true;
  return /^\/api\/spelling-library\/spelling\/v[0-9]+\/[a-z0-9_-]+\.mp3$/i.test(u);
}

export function runSpellingAudioChecks(): CheckResult[] {
  const catalog = getAllCatalogEntries();
  const manifest = loadManifest();
  const results: CheckResult[] = [];

  if (!manifest?.entries) {
    return [
      {
        id: "manifest",
        label: "spelling-audio-manifest.json present",
        ok: false,
        detail: "Run pnpm run build:spelling-audio-manifest",
      },
    ];
  }

  const missing: string[] = [];
  const badUrl: string[] = [];
  const badPath: string[] = [];
  const versionMismatch: string[] = [];

  for (const entry of catalog) {
    const asset = manifest.entries[entry.id];
    if (!asset) {
      missing.push(entry.id);
      continue;
    }
    if (asset.word !== entry.word) {
      badUrl.push(`${entry.id}: word mismatch`);
    }
    if (!isValidPlaybackUrl(asset.url)) {
      badUrl.push(`${entry.id}: invalid url`);
    }
    if (!isValidSpellingGcsObjectPath(asset.gcsPath)) {
      badPath.push(`${entry.id}: ${asset.gcsPath}`);
    }
    if (asset.version !== SPELLING_AUDIO_VERSION && manifest.meta.version !== SPELLING_AUDIO_VERSION) {
      versionMismatch.push(entry.id);
    }
  }

  results.push({
    id: "coverage",
    label: "Every catalog entry has audio metadata",
    ok: missing.length === 0,
    detail: missing.length
      ? `missing ${missing.length}: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}`
      : `${catalog.length} entries`,
  });

  results.push({
    id: "urls",
    label: "All entries have valid playback URLs (API proxy or GCS)",
    ok: badUrl.length === 0,
    detail: badUrl.length ? badUrl.slice(0, 5).join("; ") : "ok",
  });

  results.push({
    id: "paths",
    label: "All gcsPath values match spelling/v{n}/{slug}.mp3",
    ok: badPath.length === 0,
    detail: badPath.length ? badPath.slice(0, 5).join("; ") : "ok",
  });

  results.push({
    id: "version",
    label: `Manifest version is ${SPELLING_AUDIO_VERSION}`,
    ok: manifest.meta.version === SPELLING_AUDIO_VERSION,
    detail: manifest.meta.version,
  });

  const metaCount = manifest.meta.catalogEntryCount ?? 0;
  results.push({
    id: "count",
    label: "Manifest entry count matches catalog",
    ok: metaCount === catalog.length && Object.keys(manifest.entries).length === catalog.length,
    detail: `manifest ${Object.keys(manifest.entries).length} vs catalog ${catalog.length}`,
  });

  return results;
}

function main(): void {
  if (process.env.SPELLING_AUDIO_SKIP_CHECK === "1") {
    console.log("[check:spelling-audio] skipped (SPELLING_AUDIO_SKIP_CHECK=1)");
    return;
  }

  const results = runSpellingAudioChecks();
  console.log("\n[check:spelling-audio] SPELLING AUDIO VALIDATION\n");
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.label}${r.detail ? ` — ${r.detail}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error("\n[check:spelling-audio] FAIL");
    console.error("  pnpm run build:spelling-audio-manifest");
    console.error("  OPENAI_API_KEY=... pnpm run generate:spelling-audio\n");
    process.exit(1);
  }

  console.log("\n[check:spelling-audio] PASS\n");
}

if (process.argv[1]?.includes("check-spelling-audio.ts")) {
  main();
}
