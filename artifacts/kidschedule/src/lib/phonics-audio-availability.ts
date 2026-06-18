/**
 * Strict phonics clip availability — never substitute wrong audio (no "a" fallback).
 */
import {
  resolveGraphemeToAudioKey,
  resolveLetterClipCatalogKey,
  type PhonicsAssetType,
} from "@workspace/phonics-sounds";
import {
  lookupPhonicsLibraryAsset,
  resolvePhonicsContentCatalogKey,
} from "@/lib/phonics-audio-map";
import { recordPhonicsTelemetry } from "@/lib/phonics-telemetry";
import { isPhonicsLibraryOnlyEnforced } from "@/lib/phonics-static-audio";
import { hasPhonicsStaticCatalogAudio } from "@/lib/unified-catalog-playback";
import { lookupStaticAudioUrlStrict } from "@/lib/static-audio";

export type PhonicsClipAvailability = {
  available: boolean;
  catalogKey: string | null;
  reason?: "missing_catalog_key" | "missing_manifest_asset" | "missing_gcs_path";
};

export function checkPhonicsLetterClip(audioKey: string): PhonicsClipAvailability {
  const key = (audioKey ?? "").trim().toLowerCase();
  if (!key) {
    return { available: false, catalogKey: null, reason: "missing_catalog_key" };
  }
  if (!isPhonicsLibraryOnlyEnforced() && hasPhonicsStaticCatalogAudio(key)) {
    return { available: true, catalogKey: `static:${key}` };
  }
  const catalogKey = resolveLetterClipCatalogKey(key);
  if (!catalogKey) {
    return { available: false, catalogKey: null, reason: "missing_catalog_key" };
  }
  const asset = lookupPhonicsLibraryAsset(catalogKey);
  if (!asset?.gcsPath?.startsWith("phonics/")) {
    recordPhonicsTelemetry("phonics_audio_manifest_missing", {
      catalogKey,
      audioKey: key,
      clipType: "letter",
    });
    return { available: false, catalogKey, reason: "missing_manifest_asset" };
  }
  return { available: true, catalogKey };
}

export function checkPhonicsContentClip(
  text: string,
  preferredType?: PhonicsAssetType,
): PhonicsClipAvailability {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return { available: false, catalogKey: null, reason: "missing_catalog_key" };
  }
  const catalogKey = resolvePhonicsContentCatalogKey(trimmed, preferredType);
  if (!catalogKey) {
    return { available: false, catalogKey: null, reason: "missing_catalog_key" };
  }
  const asset = lookupPhonicsLibraryAsset(catalogKey);
  if (!asset?.gcsPath?.startsWith("phonics/")) {
    recordPhonicsTelemetry("phonics_audio_manifest_missing", {
      catalogKey,
      text: trimmed,
      clipType: preferredType ?? "content",
    });
    return { available: false, catalogKey, reason: "missing_manifest_asset" };
  }
  return { available: true, catalogKey };
}

/** Word must have CVC library clip or phonics-mode static audio — never default lesson catalog. */
export function checkPhonicsWordClip(word: string): PhonicsClipAvailability {
  const w = word.trim().toLowerCase();
  if (
    !isPhonicsLibraryOnlyEnforced() &&
    lookupStaticAudioUrlStrict(w, "phonics")
  ) {
    return { available: true, catalogKey: `static:phonics:${w}` };
  }
  return checkPhonicsContentClip(w, "cvc");
}

export type PhonicsWordAudioBundle = {
  word: string;
  wordAudio: boolean;
  phonemeAudio: boolean[];
  blendAudio: boolean;
  available: boolean;
};

/** Every word needs word clip + each phoneme clip — never play wrong fallback audio. */
export function validatePhonicsWordAudio(
  word: string,
  phonemes?: string[],
): PhonicsWordAudioBundle {
  const w = word.trim().toLowerCase();
  const wordClip = checkPhonicsWordClip(w);
  const wordAudio = wordClip.available;
  const blendAudio = wordAudio;

  const phonemeKeys =
    phonemes ??
    w.split("").map((ch) => ch.trim().toLowerCase());

  const phonemeAudio = phonemeKeys.map((p) => {
    const audioKey = resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase();
    return checkPhonicsLetterClip(audioKey).available;
  });
  const available = wordAudio && phonemeAudio.every(Boolean);

  if (!available) {
    recordPhonicsTelemetry("phonics_audio_manifest_missing", {
      wordId: w,
      wordAudio,
      phonemeAudio,
      blendAudio,
    });
  }

  return { word: w, wordAudio, phonemeAudio, blendAudio, available };
}
