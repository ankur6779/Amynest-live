import type {
  FirstExperienceAgeBand,
  FirstExperienceNextThing,
  FirstExperienceTodayContext,
} from "./types";

export type DecideNextInput = {
  childName: string;
  ageBand: FirstExperienceAgeBand;
  todayContext: FirstExperienceTodayContext;
  now?: Date;
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

function clockLabel(now: Date): string {
  return now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Deterministic next-right-thing from ONLY signals the parent gave
 * plus genuine device clock/calendar. Never invents household facts.
 */
export function decideFirstExperienceNextThing(input: DecideNextInput): FirstExperienceNextThing {
  const now = input.now ?? new Date();
  const name = input.childName.trim() || "your child";
  const bucket = timeBucket(now);
  const basedOn = [
    `Local time: ${clockLabel(now)}`,
    `Day: ${weekdayLabel(now)}`,
    `Age band you shared: ${input.ageBand}`,
    `Today you shared: ${labelToday(input.todayContext)}`,
  ];

  if (input.ageBand === "0-2") {
    if (bucket === "morning" || bucket === "afternoon") {
      return {
        id: "infant-calm-contact",
        title: `Give ${name} 10 minutes of calm contact`,
        detail:
          "Sit together with no phone. Soft voice, slow touch, one song or quiet talk. This steadies the next part of the day.",
        minutes: 10,
        basedOn,
      };
    }
    return {
      id: "infant-wind-down",
      title: `Start ${name}'s wind-down now`,
      detail:
        "Dim lights, same short sequence, low talking. One calm cue is enough for tonight.",
      minutes: 12,
      basedOn,
    };
  }

  if (input.ageBand === "2-4") {
    if (input.todayContext === "school" && bucket === "morning") {
      return {
        id: "preschool-leave-ready",
        title: `Get ${name} leave-ready in one short loop`,
        detail:
          "Shoes → bag → water. One clear loop, no extra choices. Finish the loop before new requests.",
        minutes: 8,
        basedOn,
      };
    }
    if (bucket === "evening" || bucket === "night") {
      return {
        id: "preschool-bedtime-bridge",
        title: `Bridge ${name} into bedtime with one story`,
        detail:
          "One story, same place, then lights lower. Keep it boring and predictable on purpose.",
        minutes: 10,
        basedOn,
      };
    }
    return {
      id: "preschool-reset-play",
      title: `Reset ${name} with 8 minutes of led play`,
      detail:
        "You choose one simple activity and stay nearby. Short, directed play lowers the next friction.",
      minutes: 8,
      basedOn,
    };
  }

  // 5-7 and 8-10
  if (input.todayContext === "school" && bucket === "morning") {
    return {
      id: "school-morning-launch",
      title: `Launch ${name}'s morning with the next physical step`,
      detail:
        "Name one step only — usually shoes or breakfast start — and stay until that step is done.",
      minutes: 7,
      basedOn,
    };
  }

  if (input.todayContext === "school" && (bucket === "afternoon" || bucket === "evening")) {
    return {
      id: "after-school-decompress",
      title: `Let ${name} decompress before asking for more`,
      detail:
        "10 quiet minutes first — snack or sit. Requests come after the body settles.",
      minutes: 10,
      basedOn,
    };
  }

  if (bucket === "evening" || bucket === "night") {
    return {
      id: "school-age-wind-down",
      title: `Close ${name}'s day with one wind-down step`,
      detail:
        "Devices away, then one predictable close: wash / pajamas / short read. Stop there.",
      minutes: 12,
      basedOn,
    };
  }

  return {
    id: "focus-block",
    title: `Give ${name} one small focus win`,
    detail:
      "Pick one short task that can finish now. Celebrate completion, not perfection.",
    minutes: 10,
    basedOn,
  };
}

function labelToday(ctx: FirstExperienceTodayContext): string {
  if (ctx === "school") return "school / care day";
  if (ctx === "home") return "home day";
  return "not sure yet";
}

function todayObservation(ctx: FirstExperienceTodayContext): string {
  if (ctx === "school") return "Today already has a direction.";
  if (ctx === "home") return "Today feels unhurried.";
  return "Today is still open.";
}

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
    "One next right thing comes into focus.",
  ];
}
