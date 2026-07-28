/**
 * Seamless stitch plan for FFmpeg xfade / concat.
 * Viewer should not notice multi-clip assembly.
 */

import type { ComposerTransition } from "./types.js";

export interface XfadeStep {
  fromLabel: string;
  toLabel: string;
  outLabel: string;
  transition: "fade" | "dissolve" | "fadewhite" | "fadeblack";
  durationSeconds: number;
  /** Offset on the accumulating timeline where the crossfade begins. */
  offsetSeconds: number;
}

/**
 * Build cumulative xfade steps from clip durations + transition intents.
 * Used by render-engine FFmpeg command builder when seamless stitch is enabled.
 */
export function buildXfadeSteps(input: {
  clipDurations: number[];
  transitions: ComposerTransition[];
}): XfadeStep[] {
  const { clipDurations, transitions } = input;
  if (clipDurations.length < 2) return [];

  const steps: XfadeStep[] = [];
  let accumulated = clipDurations[0]!;
  let prevLabel = "v0";

  for (let i = 1; i < clipDurations.length; i++) {
    const transition = transitions[i - 1];
    const fade = Math.min(
      transition?.durationSeconds ?? 0.35,
      Math.max(0.15, Math.min(clipDurations[i - 1]!, clipDurations[i]!) * 0.35),
    );
    const offset = Math.max(0, accumulated - fade);
    const outLabel = i === clipDurations.length - 1 ? "vxfade" : `vx${i}`;
    steps.push({
      fromLabel: prevLabel,
      toLabel: `v${i}`,
      outLabel,
      transition: mapTransition(transition?.type, transition?.brandPurpleWash),
      durationSeconds: round3(fade),
      offsetSeconds: round3(offset),
    });
    accumulated = offset + clipDurations[i]!;
    prevLabel = outLabel;
  }

  return steps;
}

export function buildXfadeFilterComplex(steps: XfadeStep[]): string {
  return steps
    .map(
      (s) =>
        `[${s.fromLabel}][${s.toLabel}]xfade=transition=${s.transition}:duration=${s.durationSeconds}:offset=${s.offsetSeconds}[${s.outLabel}]`,
    )
    .join(";");
}

function mapTransition(
  type: ComposerTransition["type"] | undefined,
  purple?: boolean,
): XfadeStep["transition"] {
  if (purple) return "fade";
  switch (type) {
    case "Dissolve":
      return "dissolve";
    case "Fade":
      return "fadeblack";
    case "Crossfade":
    default:
      return "fade";
  }
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
