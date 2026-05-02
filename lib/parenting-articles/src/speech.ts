import type { Article, ArticleSection } from "./articles";

/**
 * Convert a single article section into clean text suitable for ElevenLabs
 * TTS. Bullet items are joined with periods so the voice pauses naturally
 * between them; tip lines are prefixed with "Amy's tip" if not already.
 */
export function sectionToSpeechText(section: ArticleSection): string {
  switch (section.type) {
    case "intro":
    case "paragraph":
      return (section.text ?? "").trim();
    case "heading":
      // Headings are short — append a period so the voice treats them as a
      // sentence and we get a clean pause before the next section.
      return `${(section.text ?? "").trim()}.`;
    case "bullets":
      return (section.items ?? [])
        .map((it) => it.trim().replace(/[.;:]\s*$/, ""))
        .filter(Boolean)
        .join(". ") + ".";
    case "tip": {
      const t = (section.text ?? "").trim();
      if (!t) return "";
      // The article data already prefixes most tips with "Amy's Tip:" — strip
      // any leading marker so we don't say it twice when we re-prepend.
      const stripped = t.replace(/^amy[''']?s tip[:\-—\s]*/i, "");
      return `Amy's tip. ${stripped}`;
    }
    default:
      return "";
  }
}

/**
 * Returns one TTS string per playable section, preserving order.
 * Empty / whitespace-only sections are skipped so auto-advance never
 * tries to play silence.
 */
export function articleToSpeechSections(article: Article): string[] {
  const intro = `${article.title}. ${article.summary}`;
  const body = article.content
    .map(sectionToSpeechText)
    .map((s) => s.trim())
    .filter(Boolean);
  return [intro, ...body];
}

/**
 * The full article as one long string — useful for a "play all in one go"
 * fallback when we don't want segment-by-segment auto-advance.
 */
export function articleToFullSpeechText(article: Article): string {
  return articleToSpeechSections(article).join("\n\n");
}
