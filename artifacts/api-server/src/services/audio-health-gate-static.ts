/**
 * Static audio hash sampling for the audio health gate (shared by CI script + live admin).
 */
import { randomInt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FALLBACK_HASH = "ff74291468e5322c612357c6f74701e8";

function repoRootFromHere(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../../..");
}

function loadManifestHashes(): string[] {
  const root = repoRootFromHere();
  const manifestPath = join(root, "lib/static-audio/manifest.json");
  if (!existsSync(manifestPath)) return [];

  try {
    const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      default?: Record<string, string>;
      phonics?: Record<string, string>;
    };
    const urls = [...Object.values(raw.default ?? {}), ...Object.values(raw.phonics ?? {})];
    return [
      ...new Set(
        urls
          .map((u) => u.match(/static-audio\/([a-f0-9]{32})\.mp3/i)?.[1]?.toLowerCase())
          .filter((h): h is string => !!h),
      ),
    ];
  } catch {
    return [];
  }
}

/** Pick up to `count` unique static-audio content hashes for gate probes. */
export function loadStaticAudioMapFromRepo(count: number): string[] {
  const unique = loadManifestHashes();
  if (unique.length === 0) return [FALLBACK_HASH];

  const picked: string[] = [];
  while (picked.length < count && picked.length < unique.length) {
    const hash = unique[randomInt(unique.length)]!;
    if (!picked.includes(hash)) picked.push(hash);
  }
  return picked;
}
