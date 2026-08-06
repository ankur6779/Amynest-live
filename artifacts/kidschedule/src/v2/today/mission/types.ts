import type { FrontDoorAgeBand, FrontDoorWorryId } from "@/v2/front-door/types";

export type MissionDifficulty = "easy" | "medium" | "hard";

/** Sprint 3A — single Speech mission shape (not Mission Engine). */
export type TodaySpeechMission = {
  /** Stable mission id — never random. */
  missionId: string;
  domain: "speech";
  ageBand: FrontDoorAgeBand;
  /** Worry key used for lookup. */
  worry: FrontDoorWorryId;
  title: string;
  /** Human-readable duration label, e.g. "3 min". */
  duration: string;
  difficulty: MissionDifficulty;
  /** Numeric minutes for UI / future scheduling. */
  estimatedMinutes: number;
  summary: string;
  steps: readonly string[];
  ctaLabel: string;
};

export type TodayMissionCompletion = {
  guestId: string;
  missionId: string;
  /** Local calendar day YYYY-MM-DD */
  dateKey: string;
  completedAt: string;
};
