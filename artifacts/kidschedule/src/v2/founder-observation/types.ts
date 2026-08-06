/** Lightweight observation events — local only, no analytics sink. */

export type FounderObsEventType =
  | "session_start"
  | "screen"
  | "action"
  | "milestone"
  | "hesitation"
  | "exit";

export type FounderObsEvent = {
  /** ms since observation session start */
  t: number;
  type: FounderObsEventType;
  detail: string;
  path?: string;
};

export type FounderObsSummary = {
  sessionStartedAt: string;
  durationMs: number;
  screenSequence: string[];
  firstMeaningfulAction: { t: number; detail: string; path?: string } | null;
  timeToFirstMissionMs: number | null;
  timeToCoachMs: number | null;
  timeToAskAmyMs: number | null;
  timeBeforeLeavingTodayMs: number | null;
  firstHesitationMs: number | null;
  exitPoint: string | null;
  events: FounderObsEvent[];
};
