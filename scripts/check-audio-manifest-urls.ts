/**
 * Fail CI when shipped audio manifests still reference raw GCS playback URLs.
 *
 *   pnpm run check:audio-manifest-urls
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, STATIC_AUDIO_MAP_PATHS } from "./static-audio-paths.js";

const GCS_PLAYBACK_RE = /storage\.googleapis\.com/i;

function assertStaticAudioMaps(): string[] {
  const violations: string[] = [];
  for (const path of STATIC_AUDIO_MAP_PATHS) {
    if (!existsSync(path)) continue;
    const map = JSON.parse(readFileSync(path, "utf8")) as Record<
      string,
      Record<string, string>
    >;
    for (const [mode, entries] of Object.entries(map)) {
      if (!entries) continue;
      for (const [key, url] of Object.entries(entries)) {
        if (GCS_PLAYBACK_RE.test(url ?? "")) {
          violations.push(`${path} [${mode}] "${key}": raw GCS url`);
        }
      }
    }
  }
  return violations;
}

const SPELLING_PATHS = [
  resolve(REPO_ROOT, "artifacts/kidschedule/src/data/spelling-audio-manifest.json"),
  resolve(REPO_ROOT, "artifacts/api-server/src/data/spelling-audio-manifest.json"),
];

function assertSpellingManifests(): string[] {
  const violations: string[] = [];
  for (const path of SPELLING_PATHS) {
    if (!existsSync(path)) continue;
    const manifest = JSON.parse(readFileSync(path, "utf8")) as {
      entries?: Record<string, { url?: string; slowUrl?: string | null }>;
    };
    for (const [id, entry] of Object.entries(manifest.entries ?? {})) {
      if (GCS_PLAYBACK_RE.test(entry.url ?? "")) {
        violations.push(`${path} entry ${id}.url: raw GCS url`);
      }
      if (entry.slowUrl && GCS_PLAYBACK_RE.test(entry.slowUrl)) {
        violations.push(`${path} entry ${id}.slowUrl: raw GCS url`);
      }
    }
  }
  return violations;
}

const PHONICS_PATHS = [
  resolve(REPO_ROOT, "artifacts/kidschedule/src/data/phonics-audio-map.json"),
  resolve(REPO_ROOT, "artifacts/api-server/src/data/phonics-audio-map.json"),
];

function assertPhonicsMaps(): string[] {
  const violations: string[] = [];
  for (const path of PHONICS_PATHS) {
    if (!existsSync(path)) continue;
    const manifest = JSON.parse(readFileSync(path, "utf8")) as {
      baseUrl?: string;
      assets?: Record<string, { url?: string }>;
    };
    if (GCS_PLAYBACK_RE.test(manifest.baseUrl ?? "")) {
      violations.push(`${path}: baseUrl is raw GCS`);
    }
    for (const [key, asset] of Object.entries(manifest.assets ?? {})) {
      if (GCS_PLAYBACK_RE.test(asset.url ?? "")) {
        violations.push(`${path} asset ${key}.url: raw GCS url`);
      }
    }
  }
  return violations;
}

const CONTENT_BANK_MAP = resolve(REPO_ROOT, "content-bank/audio-map.json");

function assertContentBankMap(): string[] {
  const violations: string[] = [];
  if (!existsSync(CONTENT_BANK_MAP)) return violations;
  const data = JSON.parse(readFileSync(CONTENT_BANK_MAP, "utf8")) as {
    items?: Record<string, { staticAudioUrl?: string }>;
  };
  for (const [id, item] of Object.entries(data.items ?? {})) {
    if (GCS_PLAYBACK_RE.test(item.staticAudioUrl ?? "")) {
      violations.push(`${CONTENT_BANK_MAP} item ${id}.staticAudioUrl: raw GCS url`);
    }
  }
  return violations;
}

function main(): void {
  const violations = [
    ...assertStaticAudioMaps(),
    ...assertSpellingManifests(),
    ...assertPhonicsMaps(),
    ...assertContentBankMap(),
  ];

  if (violations.length === 0) {
    console.log("✅ Audio manifest URLs use API proxy paths (no raw GCS playback).\n");
    return;
  }

  console.error("❌ Audio manifest URL regression — raw GCS playback URLs found:\n");
  for (const v of violations.slice(0, 30)) {
    console.error(`   • ${v}`);
  }
  if (violations.length > 30) {
    console.error(`   … +${violations.length - 30} more`);
  }
  console.error("\nRun: pnpm run normalize:audio-manifest-urls -- --write\n");
  process.exit(1);
}

main();
