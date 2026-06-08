/**
 * Mini surprise animations — 3% random delight bursts, 1–2 seconds.
 */

export type TalkingAmyMiniSurpriseId =
  | "spin"
  | "happy_jump"
  | "sparkle_burst"
  | "rainbow_wave";

export const MINI_SURPRISE_CHANCE = 0.03;

const SURPRISES: readonly TalkingAmyMiniSurpriseId[] = [
  "spin",
  "happy_jump",
  "sparkle_burst",
  "rainbow_wave",
];

export function tryTalkingAmyMiniSurprise(roll = Math.random()): TalkingAmyMiniSurpriseId | null {
  if (roll >= MINI_SURPRISE_CHANCE) return null;
  return SURPRISES[Math.floor(Math.random() * SURPRISES.length)] ?? "sparkle_burst";
}

export function miniSurpriseDurationMs(): number {
  return 1000 + Math.floor(Math.random() * 1001);
}

export function miniSurpriseEmoji(id: TalkingAmyMiniSurpriseId): string {
  switch (id) {
    case "spin":
      return "🌀";
    case "happy_jump":
      return "⬆️";
    case "sparkle_burst":
      return "✨";
    case "rainbow_wave":
      return "🌈";
    default:
      return "✨";
  }
}
