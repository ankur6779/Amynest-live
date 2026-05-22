import type { StaticAudioMode } from "./types.js";

/** Browser-safe missing-key helpers (no node:crypto / server corpus). */

export function staticAudioMissingKey(mode: StaticAudioMode, normalized: string): string {
  return `${mode}:${normalized}`;
}

export function parseStaticAudioMissingKey(
  key: string,
): { mode: StaticAudioMode; normalized: string } | null {
  const trimmed = key.trim();
  const idx = trimmed.indexOf(":");
  if (idx <= 0) return null;
  const mode = trimmed.slice(0, idx) as StaticAudioMode;
  if (mode !== "default" && mode !== "phonics") return null;
  const normalized = trimmed.slice(idx + 1).trim();
  if (!normalized) return null;
  return { mode, normalized };
}

export function extractTextFromMissingKey(key: string): string | null {
  return parseStaticAudioMissingKey(key)?.normalized ?? null;
}
