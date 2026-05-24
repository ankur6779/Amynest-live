import type { OlympiadTrack, OlympiadTrackId } from "./types.js";

export const OLYMPIAD_TRACKS: OlympiadTrack[] = [
  {
    id: "nso",
    label: "NSO Prep",
    emoji: "🔬",
    description: "Science Olympiad style — biology, physics & chemistry basics",
    subjects: ["science", "reasoning"],
  },
  {
    id: "math_olympiad",
    label: "Math Olympiad Prep",
    emoji: "🔢",
    description: "Number patterns, operations & logic for math olympiads",
    subjects: ["math", "reasoning"],
  },
  {
    id: "gk_olympiad",
    label: "GK Olympiad Prep",
    emoji: "🌍",
    description: "General knowledge, geography & current affairs basics",
    subjects: ["gk", "reasoning"],
  },
];

export const TRACK_BY_ID: Record<OlympiadTrackId, OlympiadTrack> = Object.fromEntries(
  OLYMPIAD_TRACKS.map((t) => [t.id, t]),
) as Record<OlympiadTrackId, OlympiadTrack>;
