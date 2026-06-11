/**
 * Canonical playback text + mode for phonics grid tiles (letters, CVC words).
 * Word rows must never use verbose API `sound` lines (those route to Amy / wrong catalog).
 */
import {
  getCvcWordAudioText,
  getCvcWordEntry,
  resolvePhonicsPlaybackText,
} from "@workspace/phonics-sounds";

export type PhonicsTileLike = {
  symbol: string;
  sound?: string;
  type: string;
  phoneme?: string;
};

export function isPhonicsCvcOrWordTile(item: PhonicsTileLike): boolean {
  const sym = item.symbol.trim().toLowerCase();
  if (item.type === "word") return true;
  if (getCvcWordEntry(sym)) return true;
  return /^[a-z]{2,4}$/.test(sym) && !/\s/.test(item.symbol);
}

const MAX_PHONICS_TILE_CLIP_CHARS = 32;

function isVerboseLessonSoundLine(sound: string): boolean {
  const t = sound.trim();
  if (!t) return false;
  if (t.length > MAX_PHONICS_TILE_CLIP_CHARS) return true;
  return /audio lesson|listen with amy|newborn sleep|parent needs|paragraph/i.test(t);
}

export function phonicsTilePlaybackText(item: PhonicsTileLike): string {
  if (item.type === "sentence" || item.type === "story") {
    return (item.sound || item.symbol).trim();
  }
  if (isPhonicsCvcOrWordTile(item)) {
    return getCvcWordAudioText(item.symbol);
  }
  if (item.type === "letter" || item.type === "sound") {
    const fromSymbol = resolvePhonicsPlaybackText({
      symbol: item.symbol,
      phoneme: item.phoneme,
    });
    if (fromSymbol && fromSymbol.length <= MAX_PHONICS_TILE_CLIP_CHARS) {
      return fromSymbol;
    }
    const symbol = item.symbol.trim();
    if (symbol && symbol.length <= MAX_PHONICS_TILE_CLIP_CHARS) return symbol;
  }
  const sound = (item.sound ?? "").trim();
  if (sound && !isVerboseLessonSoundLine(sound)) {
    return sound;
  }
  return resolvePhonicsPlaybackText(item);
}

export function phonicsTileCvcWordKey(item: PhonicsTileLike): string | undefined {
  if (!isPhonicsCvcOrWordTile(item)) return undefined;
  return item.symbol.trim().toLowerCase();
}

/** Grid/practice tiles always use phonics static catalog — never Amy default lesson mode. */
export function phonicsTileUsesPhonicsMode(item: PhonicsTileLike): boolean {
  if (item.type === "sentence" || item.type === "story") return false;
  return true;
}
