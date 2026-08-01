import type { FrontDoorAgeBand } from "./types";

export type FrontDoorAgeOption = {
  id: FrontDoorAgeBand;
  label: string;
  hint: string;
};

/** Emotional Blueprint age bands — photo-pointing, not a census form. */
export const FRONT_DOOR_AGE_OPTIONS: readonly FrontDoorAgeOption[] = [
  {
    id: "infant_0_12m",
    label: "0–12 months",
    hint: "Tiny, growing every day",
  },
  {
    id: "toddler_1_2",
    label: "1–2 years",
    hint: "Walking, talking starts",
  },
  {
    id: "preschool_3_5",
    label: "3–5 years",
    hint: "Play, words, school edge",
  },
  {
    id: "child_6_8",
    label: "6–8 years",
    hint: "School, mornings, confidence",
  },
  {
    id: "older_9_plus",
    label: "9 years and up",
    hint: "Independence and focus",
  },
] as const;
