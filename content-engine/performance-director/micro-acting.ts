/**
 * Micro-acting schedule — at least one living beat every 2–3 seconds.
 */

import type { MicroActingBeat, ScenePerformancePlan } from "./types.js";

const POOL = [
  "Natural eye blink",
  "Soft smile begins",
  "Tiny head tilt toward partner",
  "Hand gesture (point / open palm / fidget)",
  "Visible soft breath in shoulders",
  "Weight shift on feet or seat",
  "Body turns a few degrees toward speaker",
  "Look toward another character",
  "Small laugh in the eyes",
  "Thinking pause (eyes search, mouth soft)",
  "Natural child glance around then re-focus",
  "Mentor encourage nod",
] as const;

export function scheduleMicroActing(
  plan: ScenePerformancePlan,
  durationSeconds: number,
): MicroActingBeat[] {
  if (plan.cast.length === 0 || durationSeconds <= 0) return [];

  const interval = 2.5;
  const beats: MicroActingBeat[] = [];
  let t = 0.8;
  let i = plan.index % POOL.length;

  while (t < durationSeconds - 0.35) {
    const action = POOL[i % POOL.length]!;
    const who =
      plan.cast[i % plan.cast.length]?.character.replace("amy-", "Amy ") ??
      "character";
    beats.push({
      atSecond: Number(t.toFixed(1)),
      action: `${who}: ${action}`,
    });
    t += interval;
    i += 1;
  }

  // Guarantee minimum density: ≥1 per ~3s
  const minCount = Math.max(1, Math.floor(durationSeconds / 3));
  while (beats.length < minCount) {
    const action = POOL[(plan.index + beats.length) % POOL.length]!;
    beats.push({
      atSecond: Number((1 + beats.length * 2.2).toFixed(1)),
      action: `ensemble: ${action}`,
    });
  }

  return beats;
}

export function applyMicroActing(plan: ScenePerformancePlan, durationSeconds: number): ScenePerformancePlan {
  return {
    ...plan,
    microActing: scheduleMicroActing(plan, durationSeconds),
  };
}
