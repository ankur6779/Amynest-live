/**
 * Bundled audio pack manifest — files live under /audio-pack/ (Vite public/).
 * Build: pnpm run build:audio-pack
 */

import packManifest from "../../public/audio-pack/manifest.json";
import { isLocalAudioRecoveryEnabled } from "@/lib/local-audio-recovery";

export type LocalAudioPackCategory =
  | "phonics-letter"
  | "phonics-word"
  | "phonics-phoneme"
  | "coach"
  | "spelling";

type PackManifest = {
  version: number;
  tier?: string;
  entries: Record<string, string>;
};

/** True when pack was seeded with one placeholder clip per key (not real per-asset audio). */
export function isLocalAudioPackStub(): boolean {
  return manifest.tier === "stub";
}

const manifest = packManifest as PackManifest;

const LETTER_PHRASE: Record<string, string> = {
  a: "a as in apple",
  e: "e as in egg",
  i: "i as in igloo",
  o: "o as in octopus",
  u: "u as in umbrella",
};

function packKey(category: LocalAudioPackCategory, id: string): string {
  return `${category}:${id.trim().toLowerCase()}`;
}

/** Relative URL served from app origin (no network). */
export function resolveLocalPackUrl(
  category: LocalAudioPackCategory,
  id: string,
): string | null {
  if (!isLocalAudioRecoveryEnabled() || isLocalAudioPackStub()) return null;
  const key = packKey(category, id);
  const rel = manifest.entries[key];
  if (!rel) return null;
  if (rel.startsWith("/")) return rel;
  return `/audio-pack/${rel.replace(/^\//, "")}`;
}

export function hasLocalPackAsset(
  category: LocalAudioPackCategory,
  id: string,
): boolean {
  return resolveLocalPackUrl(category, id) != null;
}

export function resolveLocalPhonicsLetterUrl(audioKey: string): string | null {
  const k = audioKey.trim().toLowerCase();
  return (
    resolveLocalPackUrl("phonics-letter", k) ??
    resolveLocalPackUrl("phonics-letter", LETTER_PHRASE[k] ?? k) ??
    resolveLocalPackUrl("phonics-phoneme", k)
  );
}

export function resolveLocalPhonicsWordUrl(word: string): string | null {
  const w = word.trim().toLowerCase();
  return resolveLocalPackUrl("phonics-word", w);
}

export function resolveLocalCoachUrl(phrase: string): string | null {
  const t = phrase.trim();
  if (!t) return null;
  return (
    resolveLocalPackUrl("coach", t) ??
    resolveLocalPackUrl("coach", t.toLowerCase())
  );
}

export function resolveLocalSpellingUrl(word: string): string | null {
  return resolveLocalPackUrl("spelling", word.trim().toLowerCase());
}

export function listLocalPackEntryCount(): number {
  return Object.keys(manifest.entries).length;
}
