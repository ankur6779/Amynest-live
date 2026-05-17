/**
 * Full-day adaptive infant routine (0–12 months) — biologically grounded wake
 * windows, feeds, naps, and context-aware adjustments (AQI, events, poor sleep).
 */
import {
  applyDynamicAdjustments,
  getNapsPerDayForAge,
  getWakeWindowForAge,
} from "./sleepPredict.js";
import {
  minsToTime24,
  parseTimeToMins,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";
import { ON_DEMAND_FEEDING_NOTE } from "./routine-age-feeding.js";
import {
  buildRoutineContext,
  rewriteForRealism,
  scoreInfantRoutine,
  type RealismScoreResult,
} from "./routine-realism-score.js";

export type { RealismScoreResult } from "./routine-realism-score.js";

export type NightWakingSeverity = "low" | "moderate" | "high";

export type InfantFeedingMode =
  | "breast"
  | "formula"
  | "mixed"
  | "solids_intro";

export type InfantSpecialEvent = {
  label: string;
  /** 24h time e.g. "11:30" */
  time: string;
};

export type InfantRoutineInput = {
  ageMonths: number;
  wakeTime: string;
  sleepTime: string;
  nightWakings?: { count?: number; severity?: NightWakingSeverity };
  feedingType: InfantFeedingMode;
  location?: string;
  weather?: string;
  aqi?: number | null;
  specialEvents?: InfantSpecialEvent[];
  /** e.g. "poor sleep last night", "rain", "travel day" */
  constraints?: string[];
};

export type InfantRoutineBlock = {
  start: string;
  end: string;
  activity: string;
  kind:
    | "feed"
    | "nap"
    | "play"
    | "tummy"
    | "soothing"
    | "outdoor"
    | "indoor"
    | "bonding"
    | "hygiene"
    | "event"
    | "transition"
    | "sleep";
  notes?: string;
};

export type InfantRoutineResult = {
  ageMonths: number;
  wakeWindowMin: number;
  wakeWindowMax: number;
  targetNaps: { min: number; max: number };
  adaptations: string[];
  blocks: InfantRoutineBlock[];
  items: RoutineScheduleItem[];
};

const GAP_MINS = 8;
const MAX_IDLE_MINS = 75;

const CARE_ROTATION: ReadonlyArray<{
  activity: string;
  kind: InfantRoutineBlock["kind"];
  duration: [number, number];
  notes: string;
}> = [
  {
    activity: "Tummy time",
    kind: "tummy",
    duration: [10, 18],
    notes: "Supervised on a firm surface; stop if fussy.",
  },
  {
    activity: "Sensory play",
    kind: "play",
    duration: [15, 22],
    notes: "Rattles, textures, mirror play — narrate calmly.",
  },
  {
    activity: "Indoor movement & reaching",
    kind: "indoor",
    duration: [15, 20],
    notes: "Floor play, supported sitting, rolling practice.",
  },
  {
    activity: "Quiet cuddles & bonding",
    kind: "bonding",
    duration: [12, 20],
    notes: "Skin-to-skin or calm holding; watch sleepy cues.",
  },
  {
    activity: "Soothing & reset",
    kind: "soothing",
    duration: [10, 15],
    notes: "Dim lights, gentle shushing, pacifier if used.",
  },
];

function minsToClock(m: number): string {
  return minsToTime24(((m % 1440) + 1440) % 1440);
}

function blockEnd(startMins: number, duration: number): number {
  return startMins + duration;
}

function dur(range: [number, number], seed: number): number {
  return range[0] + (Math.abs(seed) % (range[1] - range[0] + 1));
}

function constraintFlags(constraints: string[] = []): {
  poorSleep: boolean;
  rain: boolean;
  noOutdoor: boolean;
  travel: boolean;
} {
  const text = constraints.join(" ").toLowerCase();
  return {
    poorSleep: /poor sleep|rough night|night was bad|fragmented/i.test(text),
    rain: /\brain|storm|drizzle\b/i.test(text),
    noOutdoor: /no outdoor|indoor only|stay inside/i.test(text),
    travel: /\btravel|car day|flight\b/i.test(text),
  };
}

function resolveWakeWindowMins(
  ageMonths: number,
  nightWakings: InfantRoutineInput["nightWakings"],
  poorSleep: boolean,
): { min: number; max: number; ideal: number; reasons: string[] } {
  const band = getWakeWindowForAge(ageMonths);
  let ideal = band.idealMin;
  let min = band.minMin;
  let max = band.maxMin;
  const reasons: string[] = [];

  if (poorSleep) {
    ideal = Math.round(ideal * 0.88);
    max = Math.round(max * 0.9);
    reasons.push("Shorter wake windows after a rough night.");
  }

  const sev = nightWakings?.severity ?? "low";
  const count = nightWakings?.count ?? 0;
  if (sev === "moderate" || count >= 2) {
    ideal = Math.round(ideal * 0.92);
    reasons.push("Moderate overnight wakings — easing daytime stimulation.");
  }
  if (sev === "high" || count >= 4) {
    ideal = Math.round(ideal * 0.85);
    max = Math.round(max * 0.88);
    reasons.push("High overnight wakings — prioritizing earlier naps and bedtime.");
  }

  const adj = applyDynamicAdjustments(ideal, {
    ageMonths,
    napCountToday: 0,
    nowMs: Date.now(),
  });
  if (adj.adjustedMin !== ideal) {
    ideal = adj.adjustedMin;
    reasons.push(...adj.reasons);
  }

  min = Math.min(min, ideal);
  max = Math.max(max, ideal + 15);
  return { min, max, ideal, reasons };
}

function feedingLabel(mode: InfantFeedingMode, index: number): string {
  if (mode === "formula") {
    return index % 2 === 0 ? "Formula feed" : "Bottle feed";
  }
  if (mode === "mixed") {
    return index % 3 === 0 ? "Breastfeed" : index % 3 === 1 ? "Formula top-up" : "Milk feed";
  }
  if (mode === "solids_intro") {
    return index % 2 === 0 ? "Milk feed" : "Milk feed (primary)";
  }
  return index % 2 === 0 ? "Breastfeed" : "Breastfeeding session";
}

function pickCare(
  index: number,
  indoorOnly: boolean,
  seed: number,
): (typeof CARE_ROTATION)[number] {
  const pool = indoorOnly
    ? CARE_ROTATION.filter((c) => c.kind !== "outdoor")
    : CARE_ROTATION;
  return pool[index % pool.length]!;
}

function pushBlock(
  blocks: InfantRoutineBlock[],
  startMins: number,
  duration: number,
  activity: string,
  kind: InfantRoutineBlock["kind"],
  notes?: string,
): number {
  blocks.push({
    start: minsToClock(startMins),
    end: minsToClock(blockEnd(startMins, duration)),
    activity,
    kind,
    notes,
  });
  return blockEnd(startMins, duration) + GAP_MINS;
}

function toScheduleItems(blocks: InfantRoutineBlock[]): RoutineScheduleItem[] {
  return blocks.map((b) => ({
    time: b.start,
    activity: b.activity,
    duration: parseTimeToMins(b.end) - parseTimeToMins(b.start),
    category:
      b.kind === "feed"
        ? "feeding"
        : b.kind === "nap" || b.kind === "sleep"
          ? "sleep"
          : b.kind === "event"
            ? "event"
            : b.kind === "hygiene"
              ? "hygiene"
              : "play",
    status: "pending" as const,
    notes: b.notes,
  }));
}

/**
 * Build a full-day infant schedule from structured parent inputs.
 */
export function generateAdaptiveInfantDayRoutine(
  input: InfantRoutineInput,
): InfantRoutineResult {
  const ageMonths = Math.max(0, Math.min(12, Math.floor(input.ageMonths)));
  const wakeMins = parseTimeToMins(input.wakeTime);
  let sleepMins = parseTimeToMins(input.sleepTime);
  if (sleepMins <= wakeMins) sleepMins += 24 * 60;

  const flags = constraintFlags(input.constraints);
  const aqi = input.aqi ?? null;
  const indoorOnly =
    flags.rain ||
    flags.noOutdoor ||
    (aqi != null && aqi > 200) ||
    /\brain|storm/i.test(input.weather ?? "");

  const { min: wwMin, max: wwMax, ideal: wwIdeal, reasons } = resolveWakeWindowMins(
    ageMonths,
    input.nightWakings,
    flags.poorSleep,
  );

  const napsBand = getNapsPerDayForAge(ageMonths);
  let targetNaps =
    flags.poorSleep || input.nightWakings?.severity === "high"
      ? Math.max(napsBand.min, napsBand.max)
      : Math.round((napsBand.min + napsBand.max) / 2);

  if (flags.poorSleep && sleepMins - wakeMins > 13 * 60) {
    sleepMins = Math.max(wakeMins + 11 * 60, sleepMins - 30);
    reasons.push("Earlier bedtime after poor overnight sleep.");
  }

  const adaptations = [...reasons];
  if (indoorOnly && aqi != null && aqi > 200) {
    adaptations.push(`AQI ${aqi}: no outdoor exposure — indoor sensory and movement only.`);
  } else if (indoorOnly) {
    adaptations.push("Indoor-only day — fresh air replaced with window time / indoor play.");
  }

  const events = [...(input.specialEvents ?? [])].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
  for (const ev of events) {
    adaptations.push(`Event "${ev.label}" at ${ev.time} — nap shortened before + calm recovery after.`);
  }

  const blocks: InfantRoutineBlock[] = [];
  let cursor = wakeMins;
  let seed = ageMonths * 7 + wakeMins;
  let feedIndex = 0;
  let careIndex = 0;
  let napsDone = 0;
  const wakeWin = dur([wwMin, wwMax], seed++);

  cursor = pushBlock(
    blocks,
    cursor,
    dur([12, 18], seed++),
    "Wake & diaper change",
    "hygiene",
    "Gentle lights on; check diaper; offer first feed if hungry.",
  );

  cursor = pushBlock(
    blocks,
    cursor,
    dur([18, 28], seed++),
    feedingLabel(input.feedingType, feedIndex++),
    "feed",
    ageMonths < 6
      ? `${ON_DEMAND_FEEDING_NOTE} Milk only under 6 months.`
      : "Milk remains primary; solids supplement, not replace.",
  );

  if (ageMonths >= 6 && input.feedingType !== "breast" && input.feedingType !== "formula") {
    cursor = pushBlock(
      blocks,
      cursor,
      dur([18, 25], seed++),
      "Soft complementary meal",
      "feed",
      "Smooth mash or puree — small portions; stop when baby turns away.",
    );
  }

  while (cursor + 40 < sleepMins - 70 && napsDone < targetNaps) {
    const nextEvent = events.find(
      (e) => parseTimeToMins(e.time) > cursor && parseTimeToMins(e.time) < sleepMins - 60,
    );
    if (nextEvent) {
      const evStart = parseTimeToMins(nextEvent.time);
      const prepStart = evStart - 10;
      while (cursor + 35 < prepStart - 12) {
        const care = pickCare(careIndex++, indoorOnly, seed);
        const careDur = Math.min(
          dur(care.duration, seed++),
          prepStart - cursor - 18,
        );
        if (careDur < 10) break;
        cursor = pushBlock(blocks, cursor, careDur, care.activity, care.kind, care.notes);
        if (sleepMins - cursor > wwIdeal + 20) {
          cursor = pushBlock(
            blocks,
            cursor,
            dur([14, 22], seed++),
            feedingLabel(input.feedingType, feedIndex++),
            "feed",
            ON_DEMAND_FEEDING_NOTE,
          );
        }
      }
      if (cursor < prepStart - 3) {
        const transDur = Math.min(dur([8, 14], seed++), prepStart - cursor);
        if (transDur >= 5) {
          cursor = pushBlock(
            blocks,
            cursor,
            transDur,
            "Get ready & transition",
            "transition",
            `Pack bag, calm feed if needed before ${nextEvent.label}.`,
          );
        }
      }
      if (cursor < evStart) {
        cursor = evStart;
      }
      cursor = pushBlock(
        blocks,
        evStart,
        dur([45, 75], seed++),
        nextEvent.label,
        "event",
        "Keep stimulation moderate; watch for overtired cues afterward.",
      );
      events.splice(events.indexOf(nextEvent), 1);
      cursor = pushBlock(
        blocks,
        cursor,
        dur([12, 20], seed++),
        "Recovery cuddles",
        "soothing",
        "Quiet hold or feed in dim space after outing.",
      );
      napsDone++;
      const napDur = dur([40, 70], seed++);
      if (cursor + napDur < sleepMins - 90) {
        cursor = pushBlock(
          blocks,
          cursor,
          napDur,
          napsDone === 1 ? "Morning nap" : "Afternoon nap",
          "nap",
          "Short restorative nap after stimulation.",
        );
      }
      continue;
    }

    const care = pickCare(careIndex++, indoorOnly, seed);
    const careDur = dur(care.duration, seed++);
    if (cursor + careDur > sleepMins - 80) break;

    if (!indoorOnly && careIndex % 5 === 0 && ageMonths >= 4) {
      cursor = pushBlock(
        blocks,
        cursor,
        dur([12, 18], seed++),
        "Brief outdoor fresh air",
        "outdoor",
        "Shaded stroller or yard time — avoid midday sun.",
      );
    } else if (indoorOnly && careIndex % 4 === 0) {
      cursor = pushBlock(
        blocks,
        cursor,
        dur([12, 20], seed++),
        "Window time & indoor air-safe play",
        "indoor",
        aqi != null && aqi > 200
          ? `Air quality (${aqi}) — stay indoors near filtered air if possible.`
          : "Indirect light and gentle movement indoors.",
      );
    }

    cursor = pushBlock(blocks, cursor, careDur, care.activity, care.kind, care.notes);

    const gapBeforeFeed = parseTimeToMins(
      blocks[blocks.length - 1]?.end ?? minsToClock(cursor),
    );
    if (sleepMins - gapBeforeFeed > wwIdeal + 25) {
      cursor = pushBlock(
        blocks,
        cursor,
        dur([16, 26], seed++),
        feedingLabel(input.feedingType, feedIndex++),
        "feed",
        ON_DEMAND_FEEDING_NOTE,
      );
    }

    if (napsDone < targetNaps && cursor + 45 < sleepMins - 75) {
      const napDur = dur(
        ageMonths < 4 ? [35, 55] : ageMonths < 8 ? [50, 85] : [45, 75],
        seed++,
      );
      if (cursor + wakeWin + napDur < sleepMins - 60) {
        cursor = pushBlock(
          blocks,
          cursor,
          napDur,
          napsDone === 0 ? "Morning nap" : napsDone === 1 ? "Midday nap" : "Late afternoon nap",
          "nap",
          `Wake window ~${wwIdeal} min before this nap when cues appear.`,
        );
        napsDone++;
        cursor = pushBlock(
          blocks,
          cursor,
          dur([14, 22], seed++),
          feedingLabel(input.feedingType, feedIndex++),
          "feed",
          "Feed on waking from nap.",
        );
      }
    }
  }

  while (cursor + 30 < sleepMins - 55) {
    const gap = sleepMins - 55 - cursor;
    if (gap <= MAX_IDLE_MINS) break;
    const care = pickCare(careIndex++, true, seed);
    const d = Math.min(dur(care.duration, seed++), gap - 10);
    if (d < 10) break;
    cursor = pushBlock(blocks, cursor, d, care.activity, care.kind, care.notes);
  }

  cursor = pushBlock(
    blocks,
    sleepMins - 50,
    dur([15, 22], seed++),
    "Evening bath",
    "hygiene",
    "Warm water; calm voice — no rough play.",
  );
  cursor = pushBlock(
    blocks,
    sleepMins - 28,
    dur([18, 28], seed++),
    "Quiet wind-down & lullaby",
    "soothing",
    "Dim lights; low stimulation before night sleep.",
  );
  if (ageMonths >= 6 && cursor < sleepMins - 12) {
    pushBlock(
      blocks,
      cursor,
      Math.min(12, sleepMins - 12 - cursor),
      feedingLabel(input.feedingType, feedIndex++),
      "feed",
      "Dream feed optional if baby takes it without full wake.",
    );
  }
  pushBlock(
    blocks,
    sleepMins,
    30,
    "Night sleep",
    "sleep",
    "Safe sleep: flat surface, back to sleep, clear crib.",
  );

  const nightSev = input.nightWakings?.severity ?? "low";
  if (nightSev !== "low" || (input.nightWakings?.count ?? 0) > 0) {
    pushBlock(
      blocks,
      sleepMins + 120,
      20,
      "Night feeding (if baby wakes)",
      "feed",
      `${ON_DEMAND_FEEDING_NOTE} Expected with ${nightSev} overnight wakings.`,
    );
  }

  blocks.sort(
    (a, b) => parseTimeToMins(a.start) - parseTimeToMins(b.start),
  );

  return {
    ageMonths,
    wakeWindowMin: wwMin,
    wakeWindowMax: wwMax,
    targetNaps: napsBand,
    adaptations,
    blocks,
    items: toScheduleItems(blocks),
  };
}

const HIGH_STIM_KINDS = new Set<InfantRoutineBlock["kind"]>([
  "play",
  "tummy",
  "outdoor",
  "indoor",
]);
const EVENING_CUTOFF_MINS = 17 * 60 + 30; // 5:30 PM

/** Expected total sleep (minutes) over 24h by age — conservative ranges. */
function expectedTotalSleepMins(ageMonths: number): { min: number; max: number } {
  if (ageMonths < 3) return { min: 14 * 60, max: 17 * 60 };
  if (ageMonths < 6) return { min: 13 * 60, max: 16 * 60 };
  if (ageMonths < 9) return { min: 12 * 60, max: 15 * 60 };
  return { min: 11 * 60, max: 14 * 60 };
}

function blockStartMins(b: InfantRoutineBlock): number {
  return parseTimeToMins(b.start);
}

function blockEndMins(b: InfantRoutineBlock): number {
  return parseTimeToMins(b.end);
}

function blockDuration(b: InfantRoutineBlock): number {
  return blockEndMins(b) - blockStartMins(b);
}

function overlaps(a: InfantRoutineBlock, b: InfantRoutineBlock): boolean {
  return blockStartMins(a) < blockEndMins(b) && blockStartMins(b) < blockEndMins(a);
}

export type AuditRuleResult = {
  rule: string;
  status: "PASS" | "FAIL";
  details: string[];
};

export type InfantRoutineAudit = {
  results: AuditRuleResult[];
  weaknesses: string[];
  allPassed: boolean;
};

export function auditInfantRoutine(
  result: InfantRoutineResult,
  input: InfantRoutineInput,
): InfantRoutineAudit {
  const details: AuditRuleResult[] = [];
  const blocks = result.blocks;
  const ageMonths = result.ageMonths;
  const aqi = input.aqi ?? null;
  const flags = constraintFlags(input.constraints);
  const wwMaxAllowed = result.wakeWindowMax + 10;
  const wwMinAllowed = Math.max(30, result.wakeWindowMin - 10);
  const maxIdle = ageMonths < 4 ? 60 : 75;

  // 1. Wake windows — awake span from sleep end → next sleep start (feeds right after wake excluded)
  const wwIssues: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const start = blocks[i]!;
    if (start.kind !== "nap" && start.kind !== "sleep") continue;
    const sleepEnd = blockEndMins(start);
    let cursor = sleepEnd;
    let awakeMins = 0;
    for (let j = i + 1; j < blocks.length; j++) {
      const b = blocks[j]!;
      if (b.kind === "nap" || b.kind === "sleep") {
        const toBedtime = b.kind === "sleep" && /night/i.test(b.activity);
        const cap = toBedtime
          ? Math.min(4 * 60, wwMaxAllowed + 60)
          : wwMaxAllowed;
        if (awakeMins > cap) {
          wwIssues.push(
            `${awakeMins}min awake after "${start.activity}" before "${b.activity}" (max ${cap}min)`,
          );
        }
        break;
      }
      const gap = Math.max(0, blockStartMins(b) - cursor);
      const sinceWake = blockStartMins(b) - sleepEnd;
      const isPostWakeFeed = b.kind === "feed" && sinceWake < 25;
      if (!isPostWakeFeed) {
        awakeMins += gap + blockDuration(b);
      }
      cursor = blockEndMins(b);
    }
  }
  details.push({
    rule: "1. Wake windows",
    status: wwIssues.length ? "FAIL" : "PASS",
    details: wwIssues.length
      ? wwIssues
      : [`All wake segments within ${wwMinAllowed}–${wwMaxAllowed} min.`],
  });

  // 2. Feeding alignment
  const feedIssues: string[] = [];
  for (const f of blocks.filter((b) => b.kind === "feed")) {
    for (const s of blocks) {
      if (s.kind !== "nap" && s.kind !== "sleep") continue;
      if (overlaps(f, s)) {
        feedIssues.push(`"${f.activity}" overlaps "${s.activity}"`);
      }
    }
    const idx = blocks.indexOf(f);
    const prev = blocks[idx - 1];
    const next = blocks[idx + 1];
    if (prev && (prev.kind === "nap" || prev.kind === "sleep")) {
      const gap = blockStartMins(f) - blockEndMins(prev);
      if (gap < 3) {
        feedIssues.push(`"${f.activity}" starts immediately after sleep (${gap}min gap)`);
      }
    }
    if (next && (next.kind === "nap" || next.kind === "sleep")) {
      const gap = blockStartMins(next) - blockEndMins(f);
      if (gap < 5) {
        feedIssues.push(`"${f.activity}" ends ${gap}min before "${next.activity}" — may interrupt sleep onset`);
      }
    }
  }
  details.push({
    rule: "2. Feeding alignment",
    status: feedIssues.length ? "FAIL" : "PASS",
    details: feedIssues.length
      ? feedIssues
      : ["Feeds placed in wake windows; none overlap sleep blocks."],
  });

  // 3. Nap realism
  const naps = blocks.filter((b) => b.kind === "nap");
  const napDurations = naps.map(blockDuration);
  const napIssues: string[] = [];
  if (naps.length < result.targetNaps.min || naps.length > result.targetNaps.max + 1) {
    napIssues.push(
      `${naps.length} naps (expected ${result.targetNaps.min}–${result.targetNaps.max})`,
    );
  }
  if (napDurations.length >= 2) {
    const allSame = napDurations.every((d) => d === napDurations[0]);
    if (allSame) {
      napIssues.push(`All naps exactly ${napDurations[0]}min — too uniform`);
    }
  }
  for (const n of naps) {
    const d = blockDuration(n);
    if (d < 30) napIssues.push(`"${n.activity}" only ${d}min (short for age)`);
    if (d > 120) napIssues.push(`"${n.activity}" ${d}min (very long single nap)`);
  }
  details.push({
    rule: "3. Nap realism",
    status: napIssues.length ? "FAIL" : "PASS",
    details: napIssues.length
      ? napIssues
      : [
          `${naps.length} nap(s): ${napDurations.map((d) => `${d}min`).join(", ") || "—"}`,
        ],
  });

  // 4. Gap validation
  const gapIssues: string[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1]!;
    const curr = blocks[i]!;
    if (prev.kind === "sleep" && /night feeding/i.test(curr.activity)) continue;
    const gap = blockStartMins(curr) - blockEndMins(prev);
    if (gap > maxIdle) {
      gapIssues.push(
        `${gap}min idle after "${prev.activity}" before "${curr.activity}"`,
      );
    }
  }
  details.push({
    rule: "4. Gap validation",
    status: gapIssues.length ? "FAIL" : "PASS",
    details: gapIssues.length
      ? gapIssues
      : [`No gaps exceed ${maxIdle} min.`],
  });

  // 5. Event handling
  const eventIssues: string[] = [];
  for (const ev of input.specialEvents ?? []) {
    const evBlock = blocks.find((b) =>
      b.kind === "event" && b.activity.toLowerCase().includes(ev.label.toLowerCase().slice(0, 8)),
    );
    if (!evBlock) {
      eventIssues.push(`Missing event block for "${ev.label}"`);
      continue;
    }
    const evStart = blockStartMins(evBlock);
    const hasPrep = blocks.some(
      (b) =>
        blockEndMins(b) <= evStart &&
        blockEndMins(b) >= evStart - 15 &&
        (b.kind === "transition" || b.kind === "feed" || b.kind === "hygiene"),
    );
    if (!hasPrep) {
      eventIssues.push(`No prep buffer (5–10 min) before "${ev.label}"`);
    }
    const evEnd = blockEndMins(evBlock);
    const hasRecovery = blocks.some(
      (b) =>
        blockStartMins(b) >= evEnd &&
        blockStartMins(b) <= evEnd + 25 &&
        (b.kind === "soothing" || b.kind === "nap" || b.kind === "feed"),
    );
    if (!hasRecovery) {
      eventIssues.push(`No recovery after "${ev.label}"`);
    }
  }
  details.push({
    rule: "5. Event handling",
    status: eventIssues.length ? "FAIL" : "PASS",
    details: eventIssues.length
      ? eventIssues
      : input.specialEvents?.length
        ? ["Prep and recovery present for each event."]
        : ["No special events — N/A."],
  });

  // 6. AQI
  const aqiIssues: string[] = [];
  if (aqi != null && aqi > 200) {
    const outdoors = blocks.filter((b) => b.kind === "outdoor");
    if (outdoors.length) {
      aqiIssues.push(`Outdoor blocks present at AQI ${aqi}: ${outdoors.map((o) => o.activity).join(", ")}`);
    }
  }
  details.push({
    rule: "6. AQI / weather",
    status: aqiIssues.length ? "FAIL" : "PASS",
    details: aqiIssues.length
      ? aqiIssues
      : aqi != null && aqi > 200
        ? [`AQI ${aqi}: no outdoor blocks.`]
        : ["Outdoor policy satisfied."],
  });

  // 7. Energy curve
  const energyIssues: string[] = [];
  for (const b of blocks) {
    if (blockStartMins(b) >= EVENING_CUTOFF_MINS && HIGH_STIM_KINDS.has(b.kind)) {
      energyIssues.push(
        `High stimulation "${b.activity}" at ${b.start} (after 5:30 PM)`,
      );
    }
  }
  details.push({
    rule: "7. Energy curve",
    status: energyIssues.length ? "FAIL" : "PASS",
    details: energyIssues.length
      ? energyIssues
      : ["Evening is calm (bath, wind-down, sleep only)."],
  });

  // 8. Adjacency
  const adjIssues: string[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const a = blocks[i - 1]!;
    const b = blocks[i]!;
    const gap = blockStartMins(b) - blockEndMins(a);
    if (gap > 15) continue;
    if (a.kind === b.kind && a.kind !== "hygiene" && a.kind !== "transition") {
      adjIssues.push(
        `Back-to-back ${a.kind}: "${a.activity}" → "${b.activity}"`,
      );
    }
  }
  details.push({
    rule: "8. Adjacency",
    status: adjIssues.length ? "FAIL" : "PASS",
    details: adjIssues.length
      ? adjIssues
      : ["No identical activity types back-to-back."],
  });

  // 9. Sleep logic
  const sleepIssues: string[] = [];
  let daySleep = 0;
  const wakeMins = parseTimeToMins(input.wakeTime);
  let sleepMins = parseTimeToMins(input.sleepTime);
  if (sleepMins <= wakeMins) sleepMins += 24 * 60;
  for (const b of blocks) {
    if (b.kind === "nap") daySleep += blockDuration(b);
  }
  const nightSleep = wakeMins + 24 * 60 - sleepMins;
  const total = daySleep + nightSleep;
  const expected = expectedTotalSleepMins(ageMonths);
  if (total < expected.min - 60 || total > expected.max + 90) {
    sleepIssues.push(
      `Total sleep ${Math.round(total / 60)}h ${total % 60}m (expected ~${Math.round(expected.min / 60)}–${Math.round(expected.max / 60)}h)`,
    );
  }
  if (flags.poorSleep) {
    const bed = blocks.find((b) => b.kind === "sleep" && /night/i.test(b.activity));
    if (bed && blockStartMins(bed) > sleepMins + 20) {
      sleepIssues.push(
        `Bedtime ${bed.start} not earlier despite poor night (target ~${input.sleepTime})`,
      );
    }
  }
  details.push({
    rule: "9. Sleep logic",
    status: sleepIssues.length ? "FAIL" : "PASS",
    details: sleepIssues.length
      ? sleepIssues
      : [
          `Day naps ${daySleep}min + estimated night ${Math.round(nightSleep / 60)}h; bedtime ~${input.sleepTime}.`,
        ],
  });

  const weaknesses: string[] = [];
  if (naps.length >= 2 && napDurations.every((d) => Math.abs(d - napDurations[0]!) < 8)) {
    weaknesses.push("Nap lengths cluster tightly — real days vary more.");
  }
  const feedCount = blocks.filter((b) => b.kind === "feed").length;
  if (feedCount > 8) {
    weaknesses.push("Many scheduled feeds — caregiver may follow cues more than clock.");
  }
  const eventBlock = blocks.find((b) => b.kind === "event");
  if (eventBlock && blockDuration(eventBlock) > 70) {
    weaknesses.push("Long appointment block may tire baby before recovery nap.");
  }

  const allPassed = details.every((d) => d.status === "PASS");

  return { results: details, weaknesses, allPassed };
}

/** Repair common audit failures in place. */
export function repairInfantRoutine(
  result: InfantRoutineResult,
  input: InfantRoutineInput,
  audit: InfantRoutineAudit,
  opts?: { skipAdjacencyBuffers?: boolean },
): { result: InfantRoutineResult; fixes: string[] } {
  const fixes: string[] = [];
  let blocks = [...result.blocks];

  const failGap = audit.results.find((r) => r.rule.startsWith("4."));
  const failAdj = audit.results.find((r) => r.rule.startsWith("8."));
  const failEnergy = audit.results.find((r) => r.rule.startsWith("7."));
  const failWw = audit.results.find((r) => r.rule.startsWith("1."));
  const failFeed = audit.results.find((r) => r.rule.startsWith("2."));

  if (failEnergy?.status === "FAIL") {
    blocks = blocks.map((b) => {
      if (blockStartMins(b) >= EVENING_CUTOFF_MINS && HIGH_STIM_KINDS.has(b.kind)) {
        fixes.push(`Replaced evening "${b.activity}" with quiet cuddles`);
        return {
          ...b,
          activity: "Quiet cuddles",
          kind: "soothing" as const,
          notes: "Lower stimulation before bed.",
        };
      }
      return b;
    });
  }

  if (failAdj?.status === "FAIL" && !opts?.skipAdjacencyBuffers) {
    const out: InfantRoutineBlock[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]!;
      const prev = out[out.length - 1];
      if (
        prev &&
        prev.kind === b.kind &&
        blockStartMins(b) - blockEndMins(prev) <= 15 &&
        b.kind === "feed"
      ) {
        fixes.push(`Merged adjacent feeds → "${prev.activity}" shortened, added brief soothing between`);
        out.push({
          start: minsToClock(blockEndMins(prev) + 5),
          end: minsToClock(blockEndMins(prev) + 17),
          activity: "Brief soothing pause",
          kind: "soothing",
          notes: "Buffer between feeds.",
        });
      }
      out.push(b);
    }
    blocks = out;
  } else if (failAdj?.status === "FAIL" && opts?.skipAdjacencyBuffers) {
    const merged: InfantRoutineBlock[] = [];
    for (const b of blocks) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        prev.kind === b.kind &&
        b.kind === "feed" &&
        blockStartMins(b) - blockEndMins(prev) <= 15
      ) {
        merged[merged.length - 1] = {
          ...prev,
          end: b.end,
          activity: "Feed & settle",
        };
        fixes.push("Merged adjacent feeds (realism-safe)");
      } else {
        merged.push(b);
      }
    }
    blocks = merged;
  }

  if (failWw?.status === "FAIL") {
    for (let i = 0; i < blocks.length; i++) {
      const start = blocks[i]!;
      if (start.kind !== "nap") continue;
      const sleepEnd = blockEndMins(start);
      let awakeMins = 0;
      let cursor = sleepEnd;
      let nextSleepIdx = -1;
      for (let j = i + 1; j < blocks.length; j++) {
        const b = blocks[j]!;
        if (b.kind === "nap" || b.kind === "sleep") {
          nextSleepIdx = j;
          break;
        }
        const gap = Math.max(0, blockStartMins(b) - cursor);
        const isPostWakeFeed = b.kind === "feed" && blockStartMins(b) - sleepEnd < 25;
        if (!isPostWakeFeed) awakeMins += gap + blockDuration(b);
        cursor = blockEndMins(b);
      }
      if (nextSleepIdx < 0) continue;
      const next = blocks[nextSleepIdx]!;
      const cap =
        next.kind === "sleep" ? Math.min(4 * 60, result.wakeWindowMax + 60) : result.wakeWindowMax + 10;
      if (awakeMins > cap && next.kind === "nap") {
        const insertAt = sleepEnd + Math.round(result.wakeWindowMax * 0.85);
        blocks.push({
          start: minsToClock(insertAt),
          end: minsToClock(insertAt + 35),
          activity: "Micro-nap (overtired rescue)",
          kind: "nap",
          notes: "Split long wake window.",
        });
        fixes.push(`Inserted micro-nap after "${start.activity}" (wake was ${awakeMins}min)`);
      }
    }
    blocks.sort((a, b) => blockStartMins(a) - blockStartMins(b));
  }

  if (failGap?.status === "FAIL") {
    const filled: InfantRoutineBlock[] = [];
    for (let i = 0; i < blocks.length; i++) {
      filled.push(blocks[i]!);
      const next = blocks[i + 1];
      if (!next) continue;
      const gap = blockStartMins(next) - blockEndMins(blocks[i]!);
      if (gap > MAX_IDLE_MINS) {
        if (blocks[i]!.kind === "sleep" || /night feeding/i.test(blocks[i + 1]?.activity ?? "")) {
          continue;
        }
        const insertAt = blockEndMins(blocks[i]!) + 5;
        const insertDur = Math.min(22, gap - 15);
        filled.push({
          start: minsToClock(insertAt),
          end: minsToClock(insertAt + insertDur),
          activity: "Calm play & diaper check",
          kind: "bonding",
          notes: "Fills long idle gap with low-key care.",
        });
        fixes.push(`Filled ${gap}min gap after "${blocks[i]!.activity}"`);
      }
    }
    blocks = filled.sort((a, b) => blockStartMins(a) - blockStartMins(b));
  }

  if (failFeed?.status === "FAIL") {
    blocks = blocks.filter((b, i, arr) => {
      if (b.kind !== "feed") return true;
      for (const s of arr) {
        if (s === b || (s.kind !== "nap" && s.kind !== "sleep")) continue;
        if (overlaps(b, s)) {
          fixes.push(`Removed overlapping feed "${b.activity}"`);
          return false;
        }
      }
      return true;
    });
  }

  blocks = mergeOverlappingBlocks(
    blocks.sort((a, b) => blockStartMins(a) - blockStartMins(b)),
  );

  return {
    result: {
      ...result,
      blocks,
      items: toScheduleItems(blocks),
    },
    fixes,
  };
}

function mergeOverlappingBlocks(blocks: InfantRoutineBlock[]): InfantRoutineBlock[] {
  const sorted = [...blocks].sort((a, b) => blockStartMins(a) - blockStartMins(b));
  const out: InfantRoutineBlock[] = [];
  let cursor = -1;
  for (const b of sorted) {
    let start = blockStartMins(b);
    const duration = blockDuration(b);
    if (cursor >= 0 && start < cursor + GAP_MINS) {
      start = cursor + GAP_MINS;
    }
    out.push({
      ...b,
      start: minsToClock(start),
      end: minsToClock(start + duration),
    });
    cursor = start + duration;
  }
  return out;
}

const REALISM_TARGET_SCORE = 80;

export function generateValidatedInfantRoutine(input: InfantRoutineInput): {
  result: InfantRoutineResult;
  initialAudit: InfantRoutineAudit;
  finalAudit: InfantRoutineAudit;
  fixes: string[];
  realismScore: RealismScoreResult;
  realismScoreBeforeRewrite?: RealismScoreResult;
  realismRewriteApplied: boolean;
} {
  let result = generateAdaptiveInfantDayRoutine(input);
  const initialAudit = auditInfantRoutine(result, input);
  const { result: repaired, fixes } = repairInfantRoutine(
    result,
    input,
    initialAudit,
  );
  result = repaired;
  let finalAudit = auditInfantRoutine(result, input);

  const realismContext = buildRoutineContext(input, {
    min: result.wakeWindowMin,
    max: result.wakeWindowMax,
  });

  let realismScoreBeforeRewrite = scoreInfantRoutine(
    result.blocks,
    realismContext,
  );
  let realismRewriteApplied = false;

  if (realismScoreBeforeRewrite.total < REALISM_TARGET_SCORE) {
    realismRewriteApplied = true;
    fixes.push(
      `realism rewrite: score ${realismScoreBeforeRewrite.total} → targeting ≥${REALISM_TARGET_SCORE}`,
    );
    const rewritten = rewriteForRealism(result.blocks, realismContext);
    result = {
      ...result,
      blocks: rewritten,
      items: toScheduleItems(rewritten),
    };

    finalAudit = auditInfantRoutine(result, input);
    if (!finalAudit.allPassed) {
      const repairAfterRealism = repairInfantRoutine(
        result,
        input,
        finalAudit,
        { skipAdjacencyBuffers: true },
      );
      result = repairAfterRealism.result;
      fixes.push(...repairAfterRealism.fixes);
      const repolished = rewriteForRealism(result.blocks, realismContext);
      result = {
        ...result,
        blocks: repolished,
        items: toScheduleItems(repolished),
      };
      finalAudit = auditInfantRoutine(result, input);
    }
  }

  const realismScore = scoreInfantRoutine(result.blocks, realismContext);

  return {
    result,
    initialAudit,
    finalAudit,
    fixes,
    realismScore,
    realismScoreBeforeRewrite: realismRewriteApplied
      ? realismScoreBeforeRewrite
      : undefined,
    realismRewriteApplied,
  };
}

/** Markdown-friendly timeline for parents / prompts. */
export function formatInfantRoutineMarkdown(result: InfantRoutineResult): string {
  const lines = [
    `**Age:** ${result.ageMonths} months`,
    `**Wake window:** ${result.wakeWindowMin}–${result.wakeWindowMax} min (target ~${Math.round((result.wakeWindowMin + result.wakeWindowMax) / 2)} min)`,
    `**Naps/day:** ${result.targetNaps.min}–${result.targetNaps.max}`,
    "",
  ];
  if (result.adaptations.length) {
    lines.push("**Adaptations:**");
    for (const a of result.adaptations) lines.push(`- ${a}`);
    lines.push("");
  }
  lines.push("| Time | Activity |");
  lines.push("|------|----------|");
  for (const b of result.blocks) {
    lines.push(`| ${b.start} – ${b.end} | **${b.activity}**${b.notes ? ` — ${b.notes}` : ""} |`);
  }
  return lines.join("\n");
}
