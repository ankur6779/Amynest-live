// Re-export the shared data + helpers from the workspace lib so both web
// (KidSchedule) and mobile (AmyNest) consume the same article corpus.
// LocalStorage-backed helpers stay here because they're web-only.
export type {
  AgeTag,
  ArticleCategory,
  Article,
  ArticleSection,
  ArticleHero,
} from "@workspace/parenting-articles";
export {
  ARTICLES,
  CATEGORY_COLORS,
  AGE_TAG_LABELS,
  getArticlesForAgeMonths,
  getArticleHero,
  articleToSpeechSections,
  articleToFullSpeechText,
  sectionToSpeechText,
} from "@workspace/parenting-articles";

const SAVED_KEY = "amynest_saved_articles";
const CONTINUE_KEY = "amynest_continue_article";

export function getSavedArticles(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}
export function toggleSavedArticle(id: string): string[] {
  const saved = getSavedArticles();
  const updated = saved.includes(id) ? saved.filter(s => s !== id) : [...saved, id];
  localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  return updated;
}
export function setLastReadArticle(id: string) {
  localStorage.setItem(CONTINUE_KEY, id);
}
export function getLastReadArticleId(): string | null {
  return localStorage.getItem(CONTINUE_KEY);
}
