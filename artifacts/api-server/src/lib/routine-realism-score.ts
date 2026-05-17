/**
 * Strict realism scoring + humanizing rewrite for infant day routines.
 * Runs after audit-correct pipeline output — targets 80–90, not 100.
 */
import { getWakeWindowForAge } from "./sleepPredict.js";
import { minsToTime24, parseTimeToMins } from "./routine-scheduler.js";

export type RoutineBlockKind =
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

export type RoutineBlock = {
  start: string;
  end: string;
  activity: string;
  kind: RoutineBlockKind;
  notes?: string;
};

export type RoutineContext = {
  ageMonths: number;
  wakeTime: string;
  sleepTime: string;
  aqi?: number | null;
  weather?: string | null;
  specialEvents?: Array<{ label: string; time: string }>;
  constraints?: string[];
  wakeWindowMin?: number;
  wakeWindowMax?: number;
};

export interface RealismScoreResult {
  total: number;
  breakdown: {
    biological: number;
    behavioral: number;
    feeding: number;
    clustering: number;
    transitions: number;
    event: number;
    energy: number;
  };
  penalties: number;
  issues: string[];
}

const EVENING_STIM_CUTOFF = 17 * 60 + 30;
const PLAY_KINDS = new Set<RoutineBlockKind>([
  "play",
  "tummy",
  "indoor",
  "bonding",
  "outdoor",
]);
const HIGH_STIM = new Set<RoutineBlockKind>([
  "play",
  "tummy",
  "outdoor",
  "indoor",
]);

const AUDIT_ARTIFACT_RE =
  /\b(brief soothing pause|micro-nap|overtired rescue|calm play & diaper check)\b/i;
const TOP_UP_RE = /\b(top-up|top up)\b/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function startMins(b: RoutineBlock): number {
  return parseTimeToMins(b.start);
}

function endMins(b: RoutineBlock): number {
  return parseTimeToMins(b.end);
}

function duration(b: RoutineBlock): number {
  return endMins(b) - startMins(b);
}

function isFeed(b: RoutineBlock): boolean {
  return b.kind === "feed" || /\b(feed|breast|formula|milk)\b/i.test(b.activity);
}

function targetFeedCount(ageMonths: number): number {
  if (ageMonths < 6) return 7;
  if (ageMonths <= 9) return 6;
  return 5;
}

function roundToNearest(mins: number, step: number): number {
  return Math.round(mins / step) * step;
}

function hasExactMinutePrecision(blocks: RoutineBlock[]): boolean {
  let odd = 0;
  for (const b of blocks) {
    const m = startMins(b) % 10;
    if (m !== 0 && m !== 5) odd++;
  }
  return odd >= Math.max(3, Math.floor(blocks.length * 0.35));
}

function hasAuditArtifacts(blocks: RoutineBlock[]): boolean {
  return blocks.some((b) => AUDIT_ARTIFACT_RE.test(b.activity));
}

function gapVarianceScore(gaps: number[]): number {
  if (gaps.length < 3) return 0;
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance =
    gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length;
  const std = Math.sqrt(variance);
  if (std < 4) return -8;
  if (std < 7) return -4;
  return 0;
}

function wakeSpans(blocks: RoutineBlock[]): number[] {
  const spans: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const s = blocks[i]!;
    if (s.kind !== "nap" && s.kind !== "sleep") continue;
    const sleepEnd = endMins(s);
    let awake = 0;
    let cursor = sleepEnd;
    for (let j = i + 1; j < blocks.length; j++) {
      const b = blocks[j]!;
      if (b.kind === "nap" || b.kind === "sleep") {
        if (awake > 0) spans.push(awake);
        break;
      }
      const gap = Math.max(0, startMins(b) - cursor);
      const postWakeFeed = b.kind === "feed" && startMins(b) - sleepEnd < 25;
      if (!postWakeFeed) awake += gap + duration(b);
      cursor = endMins(b);
    }
  }
  return spans;
}

export function scoreInfantRoutine(
  blocks: RoutineBlock[],
  context: RoutineContext,
): RealismScoreResult {
  const issues: string[] = [];
  const ageMonths = context.ageMonths;
  const ww = getWakeWindowForAge(ageMonths);
  const wwMin = context.wakeWindowMin ?? ww.minMin;
  const wwMax = context.wakeWindowMax ?? ww.maxMin;

  const feeds = blocks.filter(isFeed);
  const feedCount = feeds.length;
  const naps = blocks.filter((b) => b.kind === "nap");
  const shortBlocks = blocks.filter((b) => duration(b) < 15 && b.kind !== "transition");
  const gaps: number[] = [];
  for (let i = 1; i < blocks.length; i++) {
    gaps.push(startMins(blocks[i]!) - endMins(blocks[i - 1]!));
  }

  // --- Biological (0–20) ---
  let biological = 16;
  const napDurs = naps.map(duration);
  if (napDurs.length >= 2) {
    const spread = Math.max(...napDurs) - Math.min(...napDurs);
    if (spread < 8) {
      biological -= 5;
      issues.push("Nap durations too uniform");
    }
  } else if (naps.length === 0) {
    biological -= 6;
  }
  const spans = wakeSpans(blocks);
  if (spans.length && spans.every((s) => s >= wwMin && s <= wwMax + 5)) {
    biological -= 4;
    issues.push("Wake windows fit textbook limits too neatly");
  }
  biological += gapVarianceScore(gaps);
  biological = clamp(biological, 0, 20);

  // --- Behavioral (0–20) ---
  let behavioral = 18;
  if (blocks.length > 20) {
    behavioral -= Math.min(12, (blocks.length - 20) * 2);
    issues.push(`Over-fragmented routine (${blocks.length} blocks)`);
  }
  if (blocks.length > 14) behavioral -= 3;
  if (shortBlocks.length >= 5) {
    behavioral -= Math.min(6, shortBlocks.length - 2);
    issues.push(`Too many short blocks (${shortBlocks.length} under 15 min)`);
  }
  const microLabels = blocks.filter((b) =>
    /reset|top-up|pause|transition/i.test(b.activity),
  ).length;
  if (microLabels >= 4) {
    behavioral -= 4;
    issues.push("Too many labeled micro-actions");
  }
  behavioral = clamp(behavioral, 0, 20);

  // --- Feeding (0–15) ---
  let feeding = 14;
  const ideal = targetFeedCount(ageMonths);
  if (feedCount > 8) {
    feeding -= 10;
    issues.push(`Too many feeds (${feedCount} detected)`);
  } else if (feedCount > ideal) {
    feeding -= (feedCount - ideal) * 2;
    issues.push(`High feed count (${feedCount}; ideal ~${ideal})`);
  }
  const topUps = blocks.filter((b) => TOP_UP_RE.test(b.activity)).length;
  if (topUps >= 2) {
    feeding -= 4;
    issues.push("Frequent top-up feed pattern");
  }
  const clustered = feeds.filter((f) => {
    const idx = blocks.indexOf(f);
    const prev = blocks[idx - 1];
    if (prev && (prev.kind === "nap" || prev.kind === "sleep")) return true;
    const s = startMins(f);
    return blocks.some(
      (n) => n.kind === "nap" && s >= endMins(n) && s <= endMins(n) + 25,
    );
  }).length;
  if (feedCount >= 4 && clustered < Math.min(2, feedCount - 1)) {
    feeding -= 3;
    issues.push("Feeds not clustered around wake-ups");
  }
  feeding = clamp(feeding, 0, 15);

  // --- Clustering (0–15) ---
  let clustering = 14;
  clustering -= Math.min(8, shortBlocks.length);
  if (blocks.length <= 14) clustering += 3;
  if (blocks.length <= 12) clustering += 2;
  const playRuns = blocks.filter((b) => PLAY_KINDS.has(b.kind)).length;
  if (playRuns >= 6) {
    clustering -= 4;
    issues.push("Play split into many fragments instead of play blocks");
  }
  if (hasAuditArtifacts(blocks)) {
    clustering -= 5;
    issues.push("Artificial buffer blocks detected");
  }
  clustering = clamp(clustering, 0, 15);

  // --- Transitions (0–10) ---
  let transitions = 8;
  transitions += gapVarianceScore(gaps) / 2;
  if (gaps.length && Math.max(...gaps) - Math.min(...gaps) < 5) {
    transitions -= 5;
    issues.push("Timeline too uniform (machine-like gaps)");
  }
  transitions = clamp(transitions, 0, 10);

  // --- Event (0–10) ---
  let event = 8;
  const events = context.specialEvents ?? [];
  if (events.length) {
    const evBlock = blocks.find((b) => b.kind === "event");
    if (!evBlock) {
      event -= 4;
    } else {
      const evStart = startMins(evBlock);
      const morningDense = blocks.filter(
        (b) =>
          startMins(b) < evStart - 60 &&
          startMins(b) > evStart - 4 * 60 &&
          duration(b) < 25,
      ).length;
      if (morningDense >= 8) {
        event -= 3;
        issues.push("Pre-event schedule overly optimized");
      }
      const recovery = blocks.some(
        (b, i) =>
          i > 0 &&
          startMins(b) >= endMins(evBlock) &&
          startMins(b) <= endMins(evBlock) + 30 &&
          (b.kind === "soothing" || b.kind === "nap"),
      );
      if (!recovery) event -= 3;
    }
  } else {
    event = 8;
  }
  event = clamp(event, 0, 10);

  // --- Energy (0–10) ---
  let energy = 9;
  const lateStim = blocks.filter(
    (b) => startMins(b) >= EVENING_STIM_CUTOFF && HIGH_STIM.has(b.kind),
  );
  if (lateStim.length) {
    energy -= lateStim.length * 3;
    issues.push("Stimulation after 5:30 PM");
  }
  energy = clamp(energy, 0, 10);

  const baseScore =
    biological +
    behavioral +
    feeding +
    clustering +
    transitions +
    event +
    energy;

  let penalties = 0;
  if (feedCount > 8) penalties -= 8;
  if (blocks.length > 25) penalties -= 10;
  if (hasExactMinutePrecision(blocks)) {
    penalties -= 5;
    issues.push("Timeline too precise (minute-level timestamps)");
  }
  if (hasAuditArtifacts(blocks)) penalties -= 5;

  const total = clamp(baseScore + penalties, 0, 100);

  return {
    total,
    breakdown: {
      biological,
      behavioral,
      feeding,
      clustering,
      transitions,
      event,
      energy,
    },
    penalties,
    issues: [...new Set(issues)],
  };
}

function isAuditArtifact(b: RoutineBlock): boolean {
  return AUDIT_ARTIFACT_RE.test(b.activity);
}

function mergeKindGroup(
  group: RoutineBlock[],
  label: string,
  kind: RoutineBlockKind,
): RoutineBlock {
  const start = Math.min(...group.map(startMins));
  const end = Math.max(...group.map(endMins));
  return {
    start: minsToTime24(start),
    end: minsToTime24(end),
    activity: label,
    kind,
    notes: group.map((g) => g.notes).filter(Boolean).join(" ") || undefined,
  };
}

function removeOutdoorIfNeeded(
  blocks: RoutineBlock[],
  aqi: number | null | undefined,
): RoutineBlock[] {
  if (aqi == null || aqi <= 200) return blocks;
  return blocks.map((b) =>
    b.kind === "outdoor"
      ? {
          ...b,
          activity: "Window time & indoor play",
          kind: "indoor",
          notes: `AQI ${aqi}: stayed indoors.`,
        }
      : b,
  );
}

function selectFeedsToKeep(
  blocks: RoutineBlock[],
  target: number,
): RoutineBlock[] {
  const feeds = blocks.filter(isFeed);
  if (feeds.length <= target) return blocks;

  const keep = new Set<RoutineBlock>();
  const first = feeds[0];
  const last = feeds[feeds.length - 1];
  if (first) keep.add(first);
  if (last && last !== first) keep.add(last);

  for (const f of feeds) {
    const idx = blocks.indexOf(f);
    const prev = blocks[idx - 1];
    if (prev && (prev.kind === "nap" || prev.kind === "sleep")) keep.add(f);
  }

  for (const f of feeds) {
    if (keep.size >= target) break;
    if (/night feeding/i.test(f.activity)) keep.add(f);
  }

  for (const f of feeds) {
    if (keep.size >= target) break;
    if (/soft|solid|complementary/i.test(f.activity)) keep.add(f);
  }

  for (const f of feeds) {
    if (keep.size >= target) break;
    keep.add(f);
  }

  return blocks.filter((b) => !isFeed(b) || keep.has(b));
}

function mergeAdjacentBlocks(blocks: RoutineBlock[]): RoutineBlock[] {
  const out: RoutineBlock[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i]!;
    if (isAuditArtifact(b)) {
      i++;
      continue;
    }

    if (b.kind === "feed" && blocks[i + 1]?.kind === "soothing") {
      const s = blocks[i + 1]!;
      out.push(
        mergeKindGroup(
          [b, s],
          /solid|complementary/i.test(b.activity)
            ? "Milk & solids"
            : "Feed & settle",
          "feed",
        ),
      );
      i += 2;
      continue;
    }

    if (PLAY_KINDS.has(b.kind)) {
      const group = [b];
      let j = i + 1;
      while (j < blocks.length && PLAY_KINDS.has(blocks[j]!.kind)) {
        if (isAuditArtifact(blocks[j]!)) {
          j++;
          continue;
        }
        group.push(blocks[j]!);
        j++;
      }
      if (group.length >= 2) {
        out.push(mergeKindGroup(group, "Play & exploration", "play"));
        i = j;
        continue;
      }
    }

    if (
      isFeed(b) &&
      blocks[i + 1] &&
      isFeed(blocks[i + 1]!) &&
      startMins(blocks[i + 1]!) - endMins(b) <= 20
    ) {
      const f2 = blocks[i + 1]!;
      out.push(
        mergeKindGroup(
          [b, f2],
          /solid|complementary/i.test(b.activity) ||
            /solid|complementary/i.test(f2.activity)
            ? "Milk & solids"
            : "Feed",
          "feed",
        ),
      );
      i += 2;
      continue;
    }

    if (b.kind === "transition") {
      const next = blocks[i + 1];
      if (next?.kind === "event") {
        out.push({
          ...b,
          activity: `Get ready for ${next.activity.toLowerCase()}`,
          end: minsToTime24(startMins(next) - 5),
        });
        i++;
        continue;
      }
    }

    out.push(b);
    i++;
  }
  return out;
}

function roundBlockTimes(blocks: RoutineBlock[], step = 10): RoutineBlock[] {
  return blocks.map((b) => {
    const start = roundToNearest(startMins(b), step);
    const dur = Math.max(15, roundToNearest(duration(b), 5));
    return {
      ...b,
      start: minsToTime24(start),
      end: minsToTime24(start + dur),
    };
  });
}

function addImperfections(
  blocks: RoutineBlock[],
  context: RoutineContext,
): RoutineBlock[] {
  const out = blocks.map((b) => ({ ...b }));
  const napIndices = out
    .map((b, i) => (b.kind === "nap" ? i : -1))
    .filter((i) => i >= 0);

  if (napIndices.length >= 1) {
    const i0 = napIndices[0]!;
    const s0 = startMins(out[i0]!);
    out[i0] = {
      ...out[i0]!,
      end: minsToTime24(s0 + 72),
      notes: "Started a bit late (~10 min).",
    };
  }
  if (napIndices.length >= 2) {
    const i1 = napIndices[1]!;
    const s1 = startMins(out[i1]!);
    out[i1] = {
      ...out[i1]!,
      end: minsToTime24(s1 + 34),
      activity: out[i1]!.activity.replace(/nap/i, "catnap"),
      notes: "Short nap — woke cranky (common).",
    };
  }

  const ev = out.find((b) => b.kind === "event");
  if (ev) {
    const idx = out.indexOf(ev);
    out[idx] = {
      ...ev,
      notes: "Ran a little long; baby tired afterward.",
    };
  }

  const targetBed = parseTimeToMins(context.sleepTime);
  const bath = out.find((b) => b.kind === "hygiene");
  const night = out.find((b) => b.kind === "sleep" && /night/i.test(b.activity));
  if (night && /poor sleep/i.test((context.constraints ?? []).join(" "))) {
    const idx = out.indexOf(night);
    let bed = targetBed - 10;
    if (bath) bed = Math.min(bed, Math.max(endMins(bath) + 5, targetBed - 15));
    out[idx] = {
      ...night,
      start: minsToTime24(bed),
      end: minsToTime24(bed + 30),
      notes: "Earlier bedtime after a rough night (timing approximate).",
    };
  }

  const playIdx = out.findIndex(
    (b) => b.kind === "play" && startMins(b) < 11 * 60,
  );
  if (playIdx >= 0) {
    out[playIdx] = {
      ...out[playIdx]!,
      notes: "Includes a fussy spell mid-block — normal.",
    };
  }

  return out;
}

function canMerge(a: RoutineBlock, b: RoutineBlock): boolean {
  if (a.kind === "event" || b.kind === "event") return false;
  if (a.kind === "sleep" || b.kind === "sleep") return false;
  if (startMins(b) - endMins(a) > 40) return false;
  if (PLAY_KINDS.has(a.kind) && PLAY_KINDS.has(b.kind)) return true;
  if (isFeed(a) && isFeed(b)) return true;
  if (isFeed(a) && b.kind === "soothing") return true;
  if (a.kind === "soothing" && isFeed(b)) return true;
  if (a.kind === "hygiene" && isFeed(b)) return true;
  if (a.kind === "transition" || b.kind === "transition") return false;
  return a.kind === b.kind;
}

function mergeLabelFor(a: RoutineBlock, b: RoutineBlock): string {
  if (isFeed(a) || isFeed(b)) {
    if (/solid|complementary/i.test(a.activity + b.activity)) return "Milk & solids";
    return "Feed & settle";
  }
  if (PLAY_KINDS.has(a.kind)) return "Play & exploration";
  if (a.kind === "transition" || b.kind === "transition") {
    return b.kind === "event" ? `Get ready for ${b.activity}` : "Get ready";
  }
  return a.activity;
}

function collapsePlaySegments(blocks: RoutineBlock[]): RoutineBlock[] {
  const out: RoutineBlock[] = [];
  let playBuf: RoutineBlock[] = [];
  const flush = () => {
    if (!playBuf.length) return;
    out.push(
      playBuf.length === 1
        ? playBuf[0]!
        : mergeKindGroup(playBuf, "Play & exploration", "play"),
    );
    playBuf = [];
  };
  for (const b of blocks) {
    if (PLAY_KINDS.has(b.kind)) playBuf.push(b);
    else {
      flush();
      out.push(b);
    }
  }
  flush();
  return out;
}

function sortTimeline(blocks: RoutineBlock[]): RoutineBlock[] {
  return [...blocks].sort((a, b) => startMins(a) - startMins(b));
}

function anchorSpecialEvents(
  blocks: RoutineBlock[],
  events: RoutineContext["specialEvents"],
): RoutineBlock[] {
  if (!events?.length) return blocks;
  const out = blocks.map((b) => ({ ...b }));
  for (const ev of events) {
    const evStart = parseTimeToMins(ev.time);
    const idx = out.findIndex(
      (b) =>
        b.kind === "event" &&
        b.activity.toLowerCase().includes(ev.label.toLowerCase().slice(0, 6)),
    );
    if (idx < 0) continue;
    const dur = Math.max(45, duration(out[idx]!));
    out[idx] = {
      ...out[idx]!,
      start: minsToTime24(evStart),
      end: minsToTime24(evStart + dur),
      activity: ev.label,
    };
    const prepIdx = out.findIndex(
      (b, i) => i < idx && b.kind === "transition",
    );
    if (prepIdx >= 0) {
      out[prepIdx] = {
        ...out[prepIdx]!,
        start: minsToTime24(evStart - 12),
        end: minsToTime24(evStart - 5),
        activity: `Get ready for ${ev.label.toLowerCase()}`,
      };
    }
  }
  return out;
}

function ensureEventPrep(
  blocks: RoutineBlock[],
  events: RoutineContext["specialEvents"],
): RoutineBlock[] {
  if (!events?.length) return blocks;
  const out = [...blocks];
  for (const ev of events) {
    const evStart = parseTimeToMins(ev.time);
    const idx = out.findIndex(
      (b) =>
        b.kind === "event" &&
        b.activity.toLowerCase().includes(ev.label.toLowerCase().slice(0, 6)),
    );
    if (idx < 0) continue;
    const hasPrep = out.some(
      (b) =>
        endMins(b) <= evStart &&
        endMins(b) >= evStart - 15 &&
        (b.kind === "transition" || b.kind === "feed" || b.kind === "hygiene"),
    );
    if (!hasPrep) {
      out.splice(idx, 0, {
        start: minsToTime24(evStart - 12),
        end: minsToTime24(evStart - 5),
        activity: `Get ready for ${ev.label.toLowerCase()}`,
        kind: "transition",
        notes: "May leave a few minutes late.",
      });
    }
  }
  return out.sort((a, b) => startMins(a) - startMins(b));
}

function ensureEventRecovery(blocks: RoutineBlock[]): RoutineBlock[] {
  const out = [...blocks];
  for (let i = 0; i < out.length; i++) {
    const b = out[i]!;
    if (b.kind !== "event") continue;
    const evEnd = endMins(b);
    const recoveryIdx = out.findIndex(
      (r, j) =>
        j > i &&
        startMins(r) >= evEnd &&
        startMins(r) <= evEnd + 30 &&
        (r.kind === "soothing" || r.kind === "nap" || r.kind === "feed"),
    );
    if (recoveryIdx < 0) {
      out.splice(i + 1, 0, {
        start: minsToTime24(evEnd + 5),
        end: minsToTime24(evEnd + 25),
        activity: "Recovery cuddles",
        kind: "soothing",
        notes: "Longer recovery after appointment.",
      });
    } else {
      const rec = out[recoveryIdx]!;
      out[recoveryIdx] = {
        ...rec,
        activity: /recovery/i.test(rec.activity) ? rec.activity : "Recovery cuddles",
        start: minsToTime24(evEnd + 5),
        end: minsToTime24(Math.min(endMins(rec), evEnd + 25)),
      };
    }
  }
  return out;
}

function dedupeRecoveryBlocks(blocks: RoutineBlock[]): RoutineBlock[] {
  const out: RoutineBlock[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.kind === "soothing" &&
      b.kind === "soothing" &&
      /recovery/i.test(prev.activity) &&
      /recovery/i.test(b.activity)
    ) {
      out[out.length - 1] = mergeKindGroup(
        [prev, b],
        "Recovery cuddles",
        "soothing",
      );
      continue;
    }
    out.push(b);
  }
  return out;
}

/** One feed chunk + one play chunk per wake window (keeps naps/events intact). */
function compressWakeSegments(blocks: RoutineBlock[]): RoutineBlock[] {
  const sorted = [...blocks].sort((a, b) => startMins(a) - startMins(b));
  const out: RoutineBlock[] = [];
  let segment: RoutineBlock[] = [];

  const flush = () => {
    if (!segment.length) return;
    const ordered = [...segment].sort((a, b) => startMins(a) - startMins(b));
    const groups: RoutineBlock[][] = [];
    let group: RoutineBlock[] = [];
    for (const b of ordered) {
      const prev = group[group.length - 1];
      if (prev && startMins(b) - endMins(prev) > 40) {
        groups.push(group);
        group = [];
      }
      group.push(b);
    }
    if (group.length) groups.push(group);

    for (const g of groups) {
      const feeds = g.filter(isFeed);
      const plays = g.filter((b) => PLAY_KINDS.has(b.kind));
      const others = g.filter((b) => !isFeed(b) && !PLAY_KINDS.has(b.kind));
      if (feeds.length) {
        out.push(
          mergeKindGroup(
            feeds,
            feeds.some((f) => /solid|complementary/i.test(f.activity))
              ? "Milk & solids"
              : "Feed & settle",
            "feed",
          ),
        );
      }
      for (const o of others) out.push(o);
      if (plays.length) {
        out.push(mergeKindGroup(plays, "Play & exploration", "play"));
      }
    }
    segment = [];
  };

  for (const b of sorted) {
    if (b.kind === "event" || b.kind === "transition") {
      flush();
      out.push(b);
    } else if (b.kind === "nap" || (b.kind === "sleep" && /night/i.test(b.activity))) {
      flush();
      out.push(b);
    } else if (b.kind === "sleep") {
      segment.push(b);
    } else {
      segment.push(b);
    }
  }
  flush();
  return out.sort((a, b) => startMins(a) - startMins(b));
}

function consolidateToTarget(blocks: RoutineBlock[], maxBlocks: number): RoutineBlock[] {
  let current = [...blocks].sort((a, b) => startMins(a) - startMins(b));
  let guard = 0;
  while (current.length > maxBlocks && guard++ < 50) {
    let best = -1;
    let bestGap = Infinity;
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i]!;
      const b = current[i + 1]!;
      if (!canMerge(a, b)) continue;
      const gap = startMins(b) - endMins(a);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    }
    if (best < 0) {
      const dropIdx = current.findIndex(
        (b, i) =>
          i > 0 &&
          i < current.length - 1 &&
          isFeed(b) &&
          TOP_UP_RE.test(b.activity),
      );
      if (dropIdx >= 0) {
        current = current.filter((_, i) => i !== dropIdx);
        continue;
      }
      break;
    }
    const a = current[best]!;
    const b = current[best + 1]!;
    const kind: RoutineBlockKind =
      isFeed(a) || isFeed(b)
        ? "feed"
        : PLAY_KINDS.has(a.kind) || PLAY_KINDS.has(b.kind)
          ? "play"
          : a.kind;
    current = [
      ...current.slice(0, best),
      mergeKindGroup([a, b], mergeLabelFor(a, b), kind),
      ...current.slice(best + 2),
    ];
  }
  return current;
}

function squeezeHumanTimeline(
  blocks: RoutineBlock[],
  maxBlocks: number,
): RoutineBlock[] {
  let current = [...blocks].sort((a, b) => startMins(a) - startMins(b));
  for (let pass = 0; pass < 8; pass++) {
    const next: RoutineBlock[] = [];
    for (let i = 0; i < current.length; i++) {
      const b = current[i]!;
      const n = current[i + 1];
      if (
        n &&
        b.kind === "soothing" &&
        n.kind === "soothing" &&
        startMins(n) - endMins(b) <= 25
      ) {
        next.push(mergeKindGroup([b, n], "Quiet time", "soothing"));
        i++;
        continue;
      }
      if (
        n &&
        b.kind === "soothing" &&
        n.kind === "hygiene" &&
        startMins(n) - endMins(b) <= 25
      ) {
        next.push(mergeKindGroup([b, n], "Bath & wind-down", "hygiene"));
        i++;
        continue;
      }
      if (n && canMerge(b, n)) {
        const kind: RoutineBlockKind =
          isFeed(b) || isFeed(n)
            ? "feed"
            : PLAY_KINDS.has(b.kind) || PLAY_KINDS.has(n.kind)
              ? "play"
              : b.kind;
        next.push(mergeKindGroup([b, n], mergeLabelFor(b, n), kind));
        i++;
        continue;
      }
      next.push(b);
    }
    current = next;
    if (current.length <= maxBlocks) break;
  }
  while (current.length > maxBlocks) {
    const idx = current.findIndex((b) => isAuditArtifact(b));
    if (idx < 0) break;
    current = current.filter((_, i) => i !== idx);
  }
  return current;
}

/**
 * Humanize an audit-correct routine: fewer chunks, clustered feeds, rounded times.
 */
export function rewriteForRealism(
  blocks: RoutineBlock[],
  context: RoutineContext,
): RoutineBlock[] {
  let working = removeOutdoorIfNeeded(
    blocks.filter((b) => !isAuditArtifact(b)),
    context.aqi,
  );

  working = collapsePlaySegments(working);
  working = mergeAdjacentBlocks(working);

  const targetFeeds = targetFeedCount(context.ageMonths);
  working = selectFeedsToKeep(working, targetFeeds);

  const bedMins = parseTimeToMins(context.sleepTime);
  working = working.filter(
    (b) => !(isFeed(b) && startMins(b) >= bedMins + 90),
  );

  working = compressWakeSegments(working);
  working = consolidateToTarget(working, 11);

  working = roundBlockTimes(working, 10);

  working = squeezeHumanTimeline(working, 13);

  working = anchorSpecialEvents(working, context.specialEvents);
  working = ensureEventPrep(working, context.specialEvents);
  working = ensureEventRecovery(working);

  working = addImperfections(working, context);

  working = sortTimeline(working);

  for (const b of working) {
    if (startMins(b) >= EVENING_STIM_CUTOFF && HIGH_STIM.has(b.kind)) {
      b.kind = "soothing";
      b.activity = "Quiet cuddles";
      b.notes = "Low stimulation before bed.";
    }
  }

  working = dedupeRecoveryBlocks(working);
  working = squeezeHumanTimeline(working, 12);

  return working;
}

export function buildRoutineContext(
  input: {
    ageMonths: number;
    wakeTime: string;
    sleepTime: string;
    aqi?: number | null;
    weather?: string | null;
    specialEvents?: Array<{ label: string; time: string }>;
    constraints?: string[];
  },
  wakeWindow?: { min: number; max: number },
): RoutineContext {
  const ww = getWakeWindowForAge(input.ageMonths);
  return {
    ...input,
    wakeWindowMin: wakeWindow?.min ?? ww.minMin,
    wakeWindowMax: wakeWindow?.max ?? ww.maxMin,
  };
}
