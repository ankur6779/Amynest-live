import type { FrontDoorWorryId } from "./types";

export type FrontDoorWorryOption = {
  id: FrontDoorWorryId;
  label: string;
};

/** One worry — chip of truth (Emotional Blueprint). */
export const FRONT_DOOR_WORRY_OPTIONS: readonly FrontDoorWorryOption[] = [
  { id: "speech_talking", label: "Speech & talking" },
  { id: "sleep", label: "Sleep" },
  { id: "behavior", label: "Behavior" },
  { id: "learning_school", label: "Learning / school" },
  { id: "mornings", label: "Mornings" },
  { id: "feeding", label: "Feeding" },
  { id: "something_else", label: "Something else" },
] as const;
