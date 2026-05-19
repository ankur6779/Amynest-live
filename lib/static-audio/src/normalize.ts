/** Canonical map lookup key — trim + lowercase so casing/spacing never misses. */
export function normalizeStaticAudioKey(text: string): string {
  return text.trim().toLowerCase();
}
