/**
 * Warm, concrete parent lines — no dense dashboards required.
 */
import { getSatpinWorld } from "./satpin-worlds";

export type ParentEncouragement = {
  headline: string;
  detail: string;
  homeTip: string;
  nextWorldHint: string;
};

export function buildParentEncouragement(opts: {
  childName?: string;
  letterGroupIndex: number;
  wordsRead: number;
  storiesCompleted: number;
  lessonsThisWeek?: number;
  soundsMasteredApprox?: number;
}): ParentEncouragement {
  const name = opts.childName?.trim() || "Your child";
  const world = getSatpinWorld(opts.letterGroupIndex);
  const nextWorld = getSatpinWorld(Math.min(8, opts.letterGroupIndex + 1));
  const sounds = opts.soundsMasteredApprox ?? opts.letterGroupIndex * 4;
  const lessons = opts.lessonsThisWeek ?? 0;

  const headline =
    lessons > 0
      ? `${name} practiced reading ${lessons} time${lessons === 1 ? "" : "s"} this week.`
      : `${name} is exploring ${world.name}.`;

  const detail =
    opts.wordsRead > 0
      ? `They can work with about ${opts.wordsRead} word${opts.wordsRead === 1 ? "" : "s"} and ${opts.storiesCompleted} stor${opts.storiesCompleted === 1 ? "y" : "ies"} so far.`
      : `About ${sounds} sounds are on their path in ${world.name}.`;

  const homeTip =
    opts.letterGroupIndex <= 2
      ? "At home: play “I spy” with beginning sounds for 2 minutes."
      : opts.storiesCompleted > 0
        ? "At home: re-read a favourite AmyNest book together — child leads."
        : "At home: celebrate every sound they say — effort first.";

  const nextWorldHint =
    opts.letterGroupIndex >= 8
      ? "They’re in the final adventure world — keep joyful practice going."
      : `Just keep short lessons going — next world: ${nextWorld.emoji} ${nextWorld.name}.`;

  return { headline, detail, homeTip, nextWorldHint };
}
