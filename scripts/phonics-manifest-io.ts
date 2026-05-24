/**
 * Load / save phonics manifest with per-clip quality metadata.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildPhonicsAudioMeta,
  estimateMp3DurationMs,
  getAllPhonicsAudioKeys,
  isUpgradeQualityCandidate,
  type PhonicsAudioManifestFile,
  type PhonicsAudioMeta,
} from "@workspace/phonics-sounds";

export function loadPhonicsManifestFile(manifestPath: string): PhonicsAudioManifestFile {
  if (!existsSync(manifestPath)) {
    return { version: 5, basePath: "/phonics-audio", clips: {} };
  }
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as PhonicsAudioManifestFile;
  } catch {
    return { version: 5, basePath: "/phonics-audio", clips: {} };
  }
}

export function writePhonicsManifestFile(
  manifestPath: string,
  manifest: PhonicsAudioManifestFile,
): void {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function metaFromMp3File(
  key: string,
  buffer: Buffer,
  source: "elevenlabs" | "fallback_tone",
  previous?: PhonicsAudioMeta | null,
  preserveApproved = false,
): PhonicsAudioMeta {
  return buildPhonicsAudioMeta({
    key,
    durationMs: estimateMp3DurationMs(buffer.byteLength),
    size: buffer.byteLength,
    source,
    previous,
    preserveApproved,
  });
}

export function filterKeysForUpgradeQuality(
  keys: string[],
  manifest: PhonicsAudioManifestFile,
): string[] {
  return keys.filter((key) =>
    isUpgradeQualityCandidate(manifest.clips?.[key.trim().toLowerCase()]),
  );
}

export function rebuildManifestClips(
  outDir: string,
  manifest: PhonicsAudioManifestFile,
): Record<string, PhonicsAudioMeta> {
  const clips: Record<string, PhonicsAudioMeta> = { ...manifest.clips };
  for (const key of getAllPhonicsAudioKeys()) {
    const path = join(outDir, `${key}.mp3`);
    if (!existsSync(path)) continue;
    const buf = readFileSync(path);
    const prev = clips[key];
    const source = prev?.source ?? "elevenlabs";
    clips[key] = metaFromMp3File(key, buf, source, prev, prev?.quality === "approved");
  }
  return clips;
}
