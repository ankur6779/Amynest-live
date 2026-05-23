import type { PlayCategoryId, PlayItem, StudyTopic } from "./types";

/** Collapse line breaks/extra spaces — matches static-audio map lookup. */
export function collapseSpeakWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Options for verbatim static-catalog TTS (play tiles, topic notes). */
export type StudyCatalogSpeakOpts = {
  catalogPlayback: true;
  staticCatalogTexts: string[];
};

function uniqueTexts(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
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

/** Static-audio-first playback for nursery play tiles (matches pre-generated corpus). */
export function getPlayItemCatalogSpeakOpts(
  item: PlayItem,
  categoryId?: PlayCategoryId | string,
): StudyCatalogSpeakOpts {
  const primary = getPlayItemSpeakText(item, categoryId);
  return {
    catalogPlayback: true,
    staticCatalogTexts: uniqueTexts([
      primary,
      item.speak,
      ...(item.body ? [collapseSpeakWhitespace(item.body)] : []),
    ]),
  };
}

/** Full topic notes for read-aloud. */
export function getTopicNotesSpeakText(topic: Pick<StudyTopic, "notes">): string {
  return collapseSpeakWhitespace(topic.notes);
}

/** Short Amy line for the topic (kid-friendly spoken copy). */
export function getTopicAmySpeakText(topic: Pick<StudyTopic, "amySpeak" | "notes" | "amyPrompt">): string {
  if (topic.amySpeak?.trim()) return collapseSpeakWhitespace(topic.amySpeak);
  const firstLine = topic.notes
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (firstLine) return collapseSpeakWhitespace(firstLine);
  return collapseSpeakWhitespace(topic.amyPrompt);
}

/** Static-audio-first playback for topic notes. */
export function getTopicNotesCatalogSpeakOpts(
  topic: Pick<StudyTopic, "notes">,
): StudyCatalogSpeakOpts {
  const primary = getTopicNotesSpeakText(topic);
  return {
    catalogPlayback: true,
    staticCatalogTexts: uniqueTexts([primary, topic.notes.trim()]),
  };
}

/** Static-audio-first playback for the short Amy summary button. */
export function getTopicAmyCatalogSpeakOpts(
  topic: Pick<StudyTopic, "amySpeak" | "notes" | "amyPrompt">,
): StudyCatalogSpeakOpts {
  const primary = getTopicAmySpeakText(topic);
  return {
    catalogPlayback: true,
    staticCatalogTexts: uniqueTexts([
      primary,
      topic.amySpeak?.trim() ?? "",
      topic.amyPrompt.trim(),
    ]),
  };
}
