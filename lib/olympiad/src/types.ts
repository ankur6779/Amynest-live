export type OlympiadSubject = "math" | "science" | "reasoning" | "gk";
export type OlympiadAgeBand = "tiny" | "junior" | "senior";
export type OlympiadDifficulty = "easy" | "medium" | "hard";
export type OlympiadTrackId = "nso" | "math_olympiad" | "gk_olympiad";
export type OlympiadRunType = "daily" | "weekly" | "practice" | "mock" | "track";

export interface OlympiadQuestion {
  id: string;
  subject: OlympiadSubject;
  ageBand: OlympiadAgeBand;
  difficulty: OlympiadDifficulty;
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
  /** Syllabus tracks this question belongs to (optional). */
  tracks?: OlympiadTrackId[];
  /** Country-specific GK rows (IN, US, AE, …). */
  countryCode?: string;
}

export interface OlympiadTrack {
  id: OlympiadTrackId;
  label: string;
  emoji: string;
  description: string;
  subjects: OlympiadSubject[];
}
