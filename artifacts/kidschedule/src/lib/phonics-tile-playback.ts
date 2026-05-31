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

export function phonicsTilePlaybackText(item: PhonicsTileLike): string {
  if (item.type === "sentence" || item.type === "story") {
    return (item.sound || item.symbol).trim();
  }
  if (isPhonicsCvcOrWordTile(item)) {
    return getCvcWordAudioText(item.symbol);
  }
  return resolvePhonicsPlaybackText(item);
}

export function phonicsTileCvcWordKey(item: PhonicsTileLike): string | undefined {
  if (!isPhonicsCvcOrWordTile(item)) return undefined;
  return item.symbol.trim().toLowerCase();
}

export function phonicsTileUsesPhonicsMode(item: PhonicsTileLike): boolean {
  return !!item.phoneme || isPhonicsCvcOrWordTile(item);
}
