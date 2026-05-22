import type { PlayCategoryId, PlayItem } from "./types";

/** Collapse line breaks/extra spaces — matches static-audio map lookup. */
export function collapseSpeakWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Phrase Amy should speak for a play-zone tile.
 * Rhymes show `body` on screen but must read the full poem, not the short `speak` blurb.
 */
export function getPlayItemSpeakText(item: PlayItem, categoryId?: PlayCategoryId | string): string {
  if (categoryId === "rhymes" && item.body?.trim()) {
    return collapseSpeakWhitespace(item.body);
  }
  return collapseSpeakWhitespace(item.speak);
}
