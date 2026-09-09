import { childPlanHeadline } from "@/lib/product-promise";
import type {
  FirstExperienceAgeBand,
  FirstExperienceNextThing,
  FirstExperiencePlanBlock,
  FirstExperienceTodayContext,
} from "./types";

export type DecideNextInput = {
  childName: string;
  ageBand: FirstExperienceAgeBand;
  todayContext: FirstExperienceTodayContext;
  now?: Date;
  /** Soft parent focus — reshapes one block, never invents a new engine. */
  focusGoal?: string | null;
};

function timeBucket(now: Date): "morning" | "afternoon" | "evening" | "night" {
  const h = now.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function weekdayLabel(now: Date): string {
  return now.toLocaleDateString(undefined, { weekday: "long" });
}

function block(
  partial: FirstExperiencePlanBlock,
): FirstExperiencePlanBlock {
  return partial;
}

function infantBlocks(name: string, bucket: ReturnType<typeof timeBucket>): FirstExperiencePlanBlock[] {
  const feeding = block({
    id: "infant-feed-window",
    kind: "feeding",
    label: "Care",
    title: `Settle ${name}'s next feed calmly`,
    detail:
      "Prepare the next feed before fuss peaks. Same place, no extra stimulation. AmyNest infant care uses this window first.",
    minutes: 15,
    surface: "routine",
  });
  const connection = block({
    id: "infant-calm-contact",
    kind: "connection",
    label: "Together",
    title: `Give ${name} 10 minutes of calm contact`,
    detail:
      "Sit together with no phone. Soft voice, slow touch, one song or quiet talk. This steadies the next part of the day.",
    minutes: 10,
    surface: "connection",
  });
  const movement = block({
    id: "infant-floor-play",
    kind: "movement",
    label: "Move",
    title: `Floor play with ${name}`,
    detail:
      "A short stretch on a safe mat — tummy time or reaching for one toy. Stay close; stop when they turn away.",
    minutes: 8,
    surface: "activity",
  });
  const hard = block({
    id: "infant-fuss-support",
    kind: "hard_moment",
    label: "If it gets hard",
    title: `If ${name} is fussy, ask Amy`,
    detail:
      "Open Amy for a next step on fuss, overtiredness, or a tough stretch — age-matched, not generic advice.",
    minutes: 5,
    surface: "amy",
  });
  const sleep = block({
    id: "infant-wind-down",
    kind: "sleep",
    label: "Sleep",
    title: `Start ${name}'s wind-down now`,
    detail:
      "Dim lights, same short sequence, low talking. One calm cue is enough for this rest.",
    minutes: 12,
    surface: "routine",
  });
  const play = block({
    id: "infant-sensory-play",
    kind: "play",
    label: "Play",
    title: `One quiet sensory beat with ${name}`,
    detail:
      "One object, one song, or looking out a window together. Short and repeatable — then stop.",
    minutes: 6,
    surface: "activity",
  });

  if (bucket === "evening" || bucket === "night") {
    return [sleep, feeding, connection, hard, play];
  }
  if (bucket === "afternoon") {
    return [connection, feeding, movement, play, hard, sleep];
  }
  return [feeding, connection, movement, play, hard, sleep];
}

function preschoolBlocks(
  name: string,
  today: FirstExperienceTodayContext,
  bucket: ReturnType<typeof timeBucket>,
): FirstExperiencePlanBlock[] {
  const morning = block({
    id: today === "school" ? "preschool-leave-ready" : "preschool-morning-loop",
    kind: today === "school" ? "transition" : "morning",
    label: today === "school" ? "Leave-ready" : "Morning",
    title:
      today === "school"
        ? `Get ${name} leave-ready in one short loop`
        : `Start ${name}'s morning with one clear loop`,
    detail:
      today === "school"
        ? "Shoes → bag → water. One clear loop, no extra choices. Finish the loop before new requests."
        : "Wash, dress, then breakfast. One loop. Stay until the first step is done.",
    minutes: 8,
    surface: "routine",
  });
  const play = block({
    id: "preschool-reset-play",
    kind: "play",
    label: "Play",
    title: `Reset ${name} with 8 minutes of led play`,
    detail:
      "You choose one simple activity and stay nearby. Short, directed play lowers the next friction.",
    minutes: 8,
    surface: "activity",
  });
  const movement = block({
    id: "preschool-move",
    kind: "movement",
    label: "Move",
    title: `Move with ${name} for a few minutes`,
    detail:
      "A short walk, dance, or outdoor stretch. Bodies first — then the next ask is easier.",
    minutes: 10,
    surface: "routine",
  });
  const connection = block({
    id: "preschool-together",
    kind: "connection",
    label: "Together",
    title: `One unhurried moment with ${name}`,
    detail:
      "Sit together without a screen. One story, one snack, or one quiet chat — then continue the day.",
    minutes: 8,
    surface: "connection",
  });
  const hard = block({
    id: "preschool-hard-moment",
    kind: "hard_moment",
    label: "If it gets hard",
    title: `If ${name} melts down, open Amy`,
    detail:
      "Amy Coach has a next step for tantrums and transitions — one small action, matched to this age.",
    minutes: 5,
    surface: "amy",
  });
  const bedtime = block({
    id: "preschool-bedtime-bridge",
    kind: "bedtime",
    label: "Bedtime",
    title: `Bridge ${name} into bedtime with one story`,
    detail:
      "One story, same place, then lights lower. Keep it boring and predictable on purpose.",
    minutes: 10,
    surface: "routine",
  });

  if (today === "school" && bucket === "morning") {
    return [morning, movement, play, connection, hard, bedtime];
  }
  if (bucket === "evening" || bucket === "night") {
    return [bedtime, connection, hard, play, morning];
  }
  return [play, movement, connection, hard, bedtime, morning];
}

function schoolAgeBlocks(
  name: string,
  today: FirstExperienceTodayContext,
  bucket: ReturnType<typeof timeBucket>,
  ageBand: FirstExperienceAgeBand,
): FirstExperiencePlanBlock[] {
  const morning = block({
    id: "school-morning-launch",
    kind: "morning",
    label: "Morning",
    title: `Launch ${name}'s morning with the next physical step`,
    detail:
      "Name one step only — usually shoes or breakfast start — and stay until that step is done.",
    minutes: 7,
    surface: "routine",
  });
  const decompress = block({
    id: "after-school-decompress",
    kind: "transition",
    label: "After school",
    title: `Let ${name} decompress before asking for more`,
    detail:
      "10 quiet minutes first — snack or sit. Requests come after the body settles.",
    minutes: 10,
    surface: "routine",
  });
  const learning = block({
    id: "focus-block",
    kind: "learning",
    label: "Learn",
    title: `Give ${name} one small focus win`,
    detail:
      ageBand === "8-10"
        ? "Pick one short task that can finish now — homework start or a reading page. Celebrate completion, not perfection."
        : "Pick one short learning or play task that can finish now. Celebrate completion, not perfection.",
    minutes: 10,
    surface: "activity",
  });
  const movement = block({
    id: "school-age-move",
    kind: "movement",
    label: "Move",
    title: `Get ${name} moving before the next sit-down`,
    detail:
      "A short outdoor break, stretch, or active game. Movement first makes the next plan block stick.",
    minutes: 10,
    surface: "routine",
  });
  const connection = block({
    id: "school-age-together",
    kind: "connection",
    label: "Together",
    title: `Check in with ${name} without fixing anything`,
    detail:
      "Five unhurried minutes. One question, then listen. No lecture — connection before correction.",
    minutes: 5,
    surface: "connection",
  });
  const hard = block({
    id: "school-age-hard-moment",
    kind: "hard_moment",
    label: "If it gets hard",
    title: `If ${name} gets stuck, ask Amy`,
    detail:
      "Homework friction, screens, or a hard feeling — Amy gives the next right step for this age.",
    minutes: 5,
    surface: "amy",
  });
  const windDown = block({
    id: "school-age-wind-down",
    kind: "bedtime",
    label: "Evening",
    title: `Close ${name}'s day with one wind-down step`,
    detail:
      "Devices away, then one predictable close: wash / pajamas / short read. Stop there.",
    minutes: 12,
    surface: "routine",
  });

  if (today === "school" && bucket === "morning") {
    return [morning, learning, movement, connection, hard, windDown];
  }
  if (today === "school" && (bucket === "afternoon" || bucket === "evening")) {
    return [decompress, movement, learning, connection, hard, windDown];
  }
  if (bucket === "evening" || bucket === "night") {
    return [windDown, connection, hard, learning, movement];
  }
  return [learning, movement, connection, hard, windDown, morning];
}

function applyFocus(
  blocks: FirstExperiencePlanBlock[],
  focusGoal: string | null | undefined,
  name: string,
): FirstExperiencePlanBlock[] {
  if (!focusGoal) return blocks;
  return blocks.map((b) => {
    if (focusGoal === "improve_sleep" && (b.kind === "bedtime" || b.kind === "sleep")) {
      return {
        ...b,
        detail: `${b.detail} Tonight’s calm is the focus for ${name}.`,
      };
    }
    if (focusGoal === "reduce_tantrums" && b.kind === "hard_moment") {
      return {
        ...b,
        detail: `${b.detail} Keep the next step small so ${name} can recover.`,
      };
    }
    if (focusGoal === "improve_focus" && b.kind === "learning") {
      return {
        ...b,
        detail: `${b.detail} One short focus win is enough for ${name} today.`,
      };
    }
    if (focusGoal === "reduce_screen_time" && (b.kind === "play" || b.kind === "movement" || b.kind === "transition")) {
      return {
        ...b,
        detail: `${b.detail} This real-world beat replaces one screen loop.`,
      };
    }
    if (focusGoal === "increase_independence" && (b.kind === "morning" || b.kind === "transition")) {
      return {
        ...b,
        detail: `${b.detail} Let ${name} own this one small step.`,
      };
    }
    return b;
  });
}

function focusObservation(goal: string | null | undefined, name: string): string | null {
  if (!goal) return null;
  switch (goal) {
    case "improve_sleep":
      return `Tonight’s calm matters for ${name}.`;
    case "reduce_tantrums":
      return `A smaller next step steadies ${name}.`;
    case "improve_focus":
      return `One short focus win helps ${name} today.`;
    case "reduce_screen_time":
      return `A real-world beat replaces one screen loop.`;
    case "increase_independence":
      return `${name} can own one small step today.`;
    default:
      return null;
  }
}

/**
 * Deterministic today's mini-plan from ONLY signals the parent gave
 * plus genuine device clock/calendar. Never invents household facts.
 * Blocks map to existing AmyNest surfaces (routine, Amy, activity, connection).
 */
export function decideFirstExperienceNextThing(input: DecideNextInput): FirstExperienceNextThing {
  const now = input.now ?? new Date();
  const name = input.childName.trim() || "your child";
  const bucket = timeBucket(now);
  const basedOn = [
    `It’s ${weekdayLabel(now)}.`,
    `${name} is in the ${input.ageBand} stage.`,
    todayObservation(input.todayContext),
    "Today’s plan is ready.",
  ];
  const focusLine = focusObservation(input.focusGoal, name);
  if (focusLine) basedOn.push(focusLine);

  let blocks: FirstExperiencePlanBlock[];
  if (input.ageBand === "0-2") {
    blocks = infantBlocks(name, bucket);
  } else if (input.ageBand === "2-4") {
    blocks = preschoolBlocks(name, input.todayContext, bucket);
  } else {
    blocks = schoolAgeBlocks(name, input.todayContext, bucket, input.ageBand);
  }
  blocks = applyFocus(blocks, input.focusGoal, name);
  if (blocks.length > 6) blocks = blocks.slice(0, 6);
  if (blocks.length < 4) {
    /* should not happen — keep the engine honest in tests */
  }

  const lead = blocks[0];
  const minutes = blocks.reduce((sum, b) => sum + b.minutes, 0);

  return {
    id: lead?.id ?? "today-plan",
    title: childPlanHeadline(name),
    detail: lead
      ? `Start with ${lead.title.replace(name, name)}. Then follow the rest of today’s plan together.`
      : "A short plan for today — one next step at a time.",
    minutes,
    basedOn,
    blocks,
  };
}

function todayObservation(ctx: FirstExperienceTodayContext): string {
  if (ctx === "school") return "Today already has a direction.";
  if (ctx === "home") return "Today feels unhurried.";
  return "Today is still open.";
}

export { todayObservation };

/**
 * Contemplative observations — human, minimal, calm.
 * First-experience film is locked to soft morning light —
 * time language must never contradict the photographs.
 * Weekday / age / today context remain real signals.
 * Notice. Never report.
 */
export function buildWorkingSignals(input: DecideNextInput): string[] {
  const now = input.now ?? new Date();
  const name = input.childName.trim() || "your child";
  return [
    "Morning has settled into the house.",
    `It’s ${weekdayLabel(now)}.`,
    `${name} is in the ${input.ageBand} stage.`,
    todayObservation(input.todayContext),
    "Today’s plan comes into focus.",
  ];
}
