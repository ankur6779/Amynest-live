import type { CurriculumGameMode, PlanActivityKind } from "./types.js";

/** Map curriculum activity kinds to mini-game modes. */
export const GAME_MAPPING: Record<PlanActivityKind, CurriculumGameMode> = {
  letter_sound: "hear_tap",
  blend_word: "build_word",
  read_word: "hear_tap",
  digraph: "hear_tap",
  blend_cluster: "build_word",
  sentence: "hear_tap",
  revision_phoneme: "hear_tap",
  daily_test: "mixed",
};

export function gameModeForActivity(kind: PlanActivityKind): CurriculumGameMode {
  return GAME_MAPPING[kind] ?? "mixed";
}
