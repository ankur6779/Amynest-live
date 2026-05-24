/**
 * Runtime phonics manifest — quality metadata for learning-safe routing.
 */

import type { PhonicsAudioManifestFile, PhonicsAudioMeta } from "@workspace/phonics-sounds";
import { shouldSkipStaticClipForLearning } from "@workspace/phonics-sounds";

let manifestCache: PhonicsAudioManifestFile | null | undefined;
let manifestPromise: Promise<PhonicsAudioManifestFile | null> | null = null;

export async function loadPhonicsManifest(): Promise<PhonicsAudioManifestFile | null> {
  if (manifestCache !== undefined) return manifestCache;
  if (typeof window === "undefined") return null;

  if (!manifestPromise) {
    manifestPromise = fetch("/phonics-audio/manifest.json", { cache: "force-cache" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as PhonicsAudioManifestFile;
      })
      .catch(() => null);
  }

  manifestCache = await manifestPromise;
  return manifestCache;
}

export async function getPhonicsClipMeta(audioKey: string): Promise<PhonicsAudioMeta | undefined> {
  const manifest = await loadPhonicsManifest();
  return manifest?.clips?.[audioKey.trim().toLowerCase()];
}

export async function shouldUsePhonicsVoiceFallback(audioKey: string): Promise<boolean> {
  const meta = await getPhonicsClipMeta(audioKey);
  return shouldSkipStaticClipForLearning(meta);
}

/** Test-only reset. */
export function resetPhonicsManifestCacheForTests(): void {
  manifestCache = undefined;
  manifestPromise = null;
}
