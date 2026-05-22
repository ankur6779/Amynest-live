/** Canonical map lookup key — trim + lowercase so casing/spacing never misses. */
export function normalizeStaticAudioKey(text: string): string {
  return text.trim().toLowerCase();
}

/** Lookup key when UI text has line breaks or extra spaces (study notes, poems). */
export function normalizeSpeakTextForLookup(text: string): string {
  return normalizeStaticAudioKey(text.replace(/\s+/g, " "));
}
