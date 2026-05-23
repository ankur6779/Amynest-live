// Smart Study Zone — shared types for web + mobile
// Three modes are derived from the child's age (or class):
//   play     — Nursery / UKG (ages 3–5)
//   basic    — Class 1–5     (ages 6–10)
//   advanced — Class 6–10    (ages 11+)

export type StudyMode = "play" | "basic" | "advanced";

export type PlayCategoryId =
  | "alphabets"
  | "numbers"
  | "colors"
  | "shapes"
  | "animals"
  | "fruits"
  | "rhymes";

export interface PlayItem {
  /** Stable id within the category, e.g. "A", "1", "red", "circle". */
  id: string;
  /** Big visible label, e.g. "A", "1", "Red". */
  label: string;
  /** Spoken phrase, e.g. "A for Apple", "One", "Red". */
  speak: string;
  /** Optional emoji to render alongside the label. */
  emoji?: string;
  /** Optional rhyme/lyrics body for the rhymes category. */
  body?: string;
}

export interface PlayCategory {
  id: PlayCategoryId;
  title: string;
  emoji: string;
  items: PlayItem[];
}

export type BasicSubjectId = "math" | "science" | "english" | "gk";
export type AdvancedSubjectId = "math" | "science" | "english";

export interface PracticeQuestion {
  q: string;
  options: string[];
  /** Index into options. */
  answer: number;
  /** One-line explanation shown after the parent reveals the answer. */
  hint?: string;
}

export interface StudyTopic {
  id: string;
  title: string;
  /** 3–5 line plain-language note. */
  notes: string;
  /** Kid-friendly line Amy speaks aloud (English, global). */
  amySpeak: string;
  /** Seed prompt fed to Amy AI when the parent taps "Ask Amy" (not spoken). */
  amyPrompt: string;
  /**
   * Optional inline SVG illustration (raw markup, no XML prolog).
   * Web renders it via a data: URI in an <img>; mobile renders it via
   * react-native-svg's SvgXml. Keep each one under ~1 KB.
   */
  imageExample?: string;
  questions: PracticeQuestion[];
}

/** Topic content before `amySpeak` is attached from the global catalog. */
export type StudyTopicDraft = Omit<StudyTopic, "amySpeak">;

export interface SubjectPack<TId extends string = string> {
  id: TId;
  title: string;
  emoji: string;
  topics: StudyTopic[];
}

/** Resolve the study mode from the child's age in years (and optional class label). */
export function resolveStudyMode(ageYears: number, childClass?: string | null): StudyMode {
  // If a class is set, use it as the strongest signal.
  if (childClass) {
    const c = childClass.trim().toLowerCase();
    if (/(nursery|prep|lkg|ukg|kg|kindergarten)/.test(c)) return "play";
    const num = parseInt(c.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num)) {
      if (num <= 5) return "basic";
      return "advanced";
    }
  }
  if (ageYears <= 5) return "play";
  if (ageYears <= 10) return "basic";
  return "advanced";
}

export const MODE_LABELS: Record<StudyMode, { title: string; subtitle: string; emoji: string }> = {
  play: { title: "Play & Learn", subtitle: "Tap, listen, learn", emoji: "👶" },
  basic: { title: "Basic Learning", subtitle: "Notes + practice", emoji: "📘" },
  advanced: { title: "Advanced Study", subtitle: "Concepts + practice", emoji: "📊" },
};
