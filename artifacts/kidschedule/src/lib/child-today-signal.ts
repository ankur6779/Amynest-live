/** Simplified “how is your child today?” → API mood / focus / sleep (1–5). */

export type ChildTodayState =
  | "energetic"
  | "balanced"
  | "low_energy"
  | "needs_calming";

export const CHILD_TODAY_SIGNAL_MAP: Record<
  ChildTodayState,
  { mood: number; focusScore: number; sleepQuality: number }
> = {
  energetic: { mood: 5, focusScore: 4, sleepQuality: 4 },
  balanced: { mood: 3, focusScore: 3, sleepQuality: 3 },
  low_energy: { mood: 2, focusScore: 2, sleepQuality: 3 },
  needs_calming: { mood: 2, focusScore: 2, sleepQuality: 2 },
};

export function inferChildTodayState(
  mood: number | null | undefined,
  focus: number | null | undefined,
  sleep: number | null | undefined,
): ChildTodayState | null {
  if (mood == null && focus == null && sleep == null) return null;
  const m = mood ?? 3;
  const f = focus ?? 3;
  const s = sleep ?? 3;
  if (m >= 5 && f >= 4) return "energetic";
  if (m <= 2 && f <= 2 && s <= 2) return "needs_calming";
  if (m <= 2 || f <= 2) return "low_energy";
  if (m >= 4 && f >= 3) return "energetic";
  return "balanced";
}
