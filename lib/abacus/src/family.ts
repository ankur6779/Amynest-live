/**
 * Family experience definitions — client-side quests that wrap existing modes.
 * No pay-to-win. Progress stays on existing child progress rows.
 */

export type FamilyChallengeId =
  | "family_five"
  | "weekend_quest"
  | "parent_practice"
  | "trophy_night";

export type FamilyChallenge = {
  id: FamilyChallengeId;
  title: string;
  emoji: string;
  blurb: string;
  /** Suggested child mode to play. */
  childMode: "practice" | "mental" | "challenge" | "warmup";
  parentHint: string;
  rewardLabel: string;
};

export const FAMILY_CHALLENGES: readonly FamilyChallenge[] = [
  {
    id: "family_five",
    title: "Family Five",
    emoji: "👨‍👩‍👧",
    blurb: "Child lands 5 correct — parent cheers each one.",
    childMode: "practice",
    parentHint: "Sit beside them and celebrate every correct bead move.",
    rewardLabel: "Family High-Five sticker",
  },
  {
    id: "weekend_quest",
    title: "Weekend Mission",
    emoji: "🎉",
    blurb: "Finish today's Adventure together this weekend.",
    childMode: "warmup",
    parentHint: "Start Warm-up together, then let them lead the quest.",
    rewardLabel: "Weekend Warrior badge",
  },
  {
    id: "parent_practice",
    title: "Parent Practice",
    emoji: "🤝",
    blurb: "Parent tries one Practice question, then child beats their time.",
    childMode: "practice",
    parentHint: "Model a calm attempt — then hand the board to your child.",
    rewardLabel: "Team Trophy",
  },
  {
    id: "trophy_night",
    title: "Trophy Night",
    emoji: "🏆",
    blurb: "Review the Trophy Wall and pick a favorite achievement.",
    childMode: "mental",
    parentHint: "Ask which badge they're proudest of and why.",
    rewardLabel: "Shared Progress star",
  },
] as const;

export function weekendFamilyChallenge(dateKey: string): FamilyChallenge {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  const isWeekend = day === 0 || day === 6;
  return isWeekend
    ? FAMILY_CHALLENGES.find((c) => c.id === "weekend_quest")!
    : FAMILY_CHALLENGES.find((c) => c.id === "family_five")!;
}
