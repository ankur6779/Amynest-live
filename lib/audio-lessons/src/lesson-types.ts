export type AgeBucket = "0-2" | "2-4" | "5-7" | "8-10" | "10+";
export type LangCode = "en";
export type LessonTier = "quick" | "standard" | "deep";

export interface MultiLang {
  en: string;
}

export interface Lesson {
  id: string;
  title: MultiLang;
  description: MultiLang;
  durationMin: number;
  ageBucket: AgeBucket;
  emoji: string;
  expert: string;
  tier: LessonTier;
  paragraphs: {
    en: string[];
  };
}

export const TIER_LABELS: Record<LessonTier, string> = {
  quick: "Quick · 2–3 min",
  standard: "Standard · 5–7 min",
  deep: "Deep dive · 8–12 min",
};

const TIER_ORDER: Record<LessonTier, number> = {
  quick: 0,
  standard: 1,
  deep: 2,
};

export function sortLessons(list: Lesson[]): Lesson[] {
  return [...list].sort(
    (a, b) =>
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
      a.title.en.localeCompare(b.title.en),
  );
}
