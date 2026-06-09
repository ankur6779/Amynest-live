/**
 * Rewrite shipped audio manifest URLs from raw GCS to same-origin API proxy paths.
 *
 *   pnpm run normalize:audio-manifest-urls          # dry-run
 *   pnpm run normalize:audio-manifest-urls -- --write
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { phonicsLibraryProxyPath } from "@workspace/phonics-sounds";
import { spellingLibraryProxyPath } from "@workspace/spelling-audio";
import { REPO_ROOT, STATIC_AUDIO_MAP_PATHS } from "./static-audio-paths.js";

const WRITE = process.argv.includes("--write");

const STATIC_GCS_HASH_RE =
  /storage\.googleapis\.com\/[^/]+\/static-audio\/([a-f0-9]{32})\.mp3/i;

function staticProxyPath(hash: string): string {
  return `/api/static-audio/${hash.toLowerCase()}.mp3`;
}

function normalizeStaticMapUrl(url: string): { next: string; changed: boolean } {
  const trimmed = (url ?? "").trim();
  if (trimmed.startsWith("/api/static-audio/")) {
    return { next: trimmed, changed: false };
  }
  const match = trimmed.match(STATIC_GCS_HASH_RE);
  if (match?.[1]) {
    return { next: staticProxyPath(match[1]), changed: true };
  }
  return { next: trimmed, changed: false };
}

function normalizeStaticAudioMaps(): number {
  let changes = 0;
  const mapPath = STATIC_AUDIO_MAP_PATHS.find((p) => {
    try {
      readFileSync(p);
      return true;
    } catch {
      return false;
    }
  });
  if (!mapPath) return 0;

  const raw = JSON.parse(readFileSync(mapPath, "utf8")) as Record<
    string,
    Record<string, string>
  >;
  for (const bucket of Object.keys(raw)) {
    const entries = raw[bucket];
    if (!entries || typeof entries !== "object") continue;
    for (const [key, url] of Object.entries(entries)) {
      const { next, changed } = normalizeStaticMapUrl(url);
      if (changed) {
        entries[key] = next;
        changes++;
      }
    }
  }

  if (changes > 0 && WRITE) {
    const body = `${JSON.stringify(raw, null, 2)}\n`;
    for (const path of STATIC_AUDIO_MAP_PATHS) {
      writeFileSync(path, body, "utf8");
    }
  }
  return changes;
}

const SPELLING_PATHS = [
  resolve(REPO_ROOT, "artifacts/kidschedule/src/data/spelling-audio-manifest.json"),
  resolve(REPO_ROOT, "artifacts/api-server/src/data/spelling-audio-manifest.json"),
];

function normalizeSpellingManifests(): number {
  let changes = 0;
  let body = "";

  for (const path of SPELLING_PATHS) {
    const manifest = JSON.parse(readFileSync(path, "utf8")) as {
      entries?: Record<
        string,
        {
          gcsPath?: string;
          url?: string;
          slowGcsPath?: string | null;
          slowUrl?: string | null;
        }
      >;
    };

    for (const entry of Object.values(manifest.entries ?? {})) {
      const gcsPath = entry.gcsPath?.trim();
      if (gcsPath) {
        try {
          const proxy = spellingLibraryProxyPath(gcsPath);
          if (entry.url !== proxy) {
            entry.url = proxy;
            changes++;
          }
        } catch {
          /* skip invalid paths */
        }
      }
      const slowGcs = entry.slowGcsPath?.trim();
      if (slowGcs) {
        try {
          const proxy = spellingLibraryProxyPath(slowGcs);
          if (entry.slowUrl !== proxy) {
            entry.slowUrl = proxy;
            changes++;
          }
        } catch {
          /* skip */
        }
      } else if (entry.slowUrl?.includes("storage.googleapis.com")) {
        entry.slowUrl = null;
        changes++;
      }
    }

    body = `${JSON.stringify(manifest, null, 2)}\n`;
  }

  if (changes > 0 && WRITE) {
    for (const path of SPELLING_PATHS) {
      writeFileSync(path, body, "utf8");
    }
  }
  return changes;
}

const PHONICS_PATHS = [
  resolve(REPO_ROOT, "artifacts/kidschedule/src/data/phonics-audio-map.json"),
  resolve(REPO_ROOT, "artifacts/api-server/src/data/phonics-audio-map.json"),
];

function normalizePhonicsMaps(): number {
  let changes = 0;
  let body = "";

  for (const path of PHONICS_PATHS) {
    const manifest = JSON.parse(readFileSync(path, "utf8")) as {
      baseUrl?: string;
      assets?: Record<string, { gcsPath?: string; url?: string }>;
    };

    if (manifest.baseUrl?.includes("storage.googleapis.com")) {
      manifest.baseUrl = "";
      changes++;
    }

    for (const asset of Object.values(manifest.assets ?? {})) {
      const gcsPath = asset.gcsPath?.trim();
      if (!gcsPath) continue;
      try {
        const proxy = phonicsLibraryProxyPath(gcsPath);
        if (asset.url !== proxy) {
          asset.url = proxy;
          changes++;
        }
      } catch {
        /* skip */
      }
    }

    body = `${JSON.stringify(manifest, null, 2)}\n`;
  }

  if (changes > 0 && WRITE) {
    for (const path of PHONICS_PATHS) {
      writeFileSync(path, body, "utf8");
    }
  }
  return changes;
}

const CONTENT_BANK_MAP = resolve(REPO_ROOT, "content-bank/audio-map.json");

function normalizeContentBankMap(): number {
  try {
    readFileSync(CONTENT_BANK_MAP);
  } catch {
    return 0;
  }

  const data = JSON.parse(readFileSync(CONTENT_BANK_MAP, "utf8")) as {
    items?: Record<string, { staticAudioUrl?: string }>;
  };
  let changes = 0;

  for (const item of Object.values(data.items ?? {})) {
    const url = item.staticAudioUrl;
    if (typeof url !== "string") continue;
    const { next, changed } = normalizeStaticMapUrl(url);
    if (changed) {
      item.staticAudioUrl = next;
      changes++;
    }
  }

  if (changes > 0 && WRITE) {
    writeFileSync(CONTENT_BANK_MAP, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
  return changes;
}

function main(): void {
  console.log(`\n🔧 normalize-audio-manifest-urls (${WRITE ? "WRITE" : "dry-run"})\n`);

  const staticChanges = normalizeStaticAudioMaps();
  const spellingChanges = normalizeSpellingManifests();
  const phonicsChanges = normalizePhonicsMaps();
  const contentBankChanges = normalizeContentBankMap();
  const total = staticChanges + spellingChanges + phonicsChanges + contentBankChanges;

  console.log(`   static-audio-map:     ${staticChanges} url(s)`);
  console.log(`   spelling manifest:    ${spellingChanges} url(s)`);
  console.log(`   phonics map:          ${phonicsChanges} url(s)`);
  console.log(`   content-bank map:     ${contentBankChanges} url(s)`);
  console.log(`   total:                ${total}\n`);

  if (total === 0) {
    console.log("✅ All manifest URLs already use API proxy paths.\n");
    return;
  }

  if (!WRITE) {
    console.log("ℹ️  Re-run with --write to apply changes.\n");
    return;
  }

  console.log("✅ Manifest URLs normalized.\n");
}

main();
