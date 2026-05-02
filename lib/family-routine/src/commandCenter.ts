// ─────────────────────────────────────────────────────────────────────────
// Parent Command Center — pure aggregation engine.
// Takes today's routine + behavior counts + mood/sleep + week totals and
// returns the full state for the dashboard:
//   • overview metrics (routine %, behavior score, mood, sleep, screen)
//   • 1–2 actionable AI insights (what + why + what-to-do)
//   • quick-action buttons (id + which route to send the user to)
//   • week snapshot (focus trend, routine consistency, behavior trend)
//   • parent status (quality time + stress label + effort summary)
// Pure / platform-free — runs on web + mobile + node.
// ─────────────────────────────────────────────────────────────────────────

import type {
  AdaptiveItem,
  AdaptiveItemStatus,
  AdaptiveMood,
  AdaptiveSleepQuality,
} from "./adaptive";

export type CommandActionId =
  | "simplify-today"
  | "fix-routine"
  | "calm-child"
  | "add-activity"
  | "improve-sleep";

export type CommandAction = {
  id: CommandActionId;
  label: string;
  emoji: string;
  /** "primary" actions get highlighted treatment in the UI. */
  severity: "primary" | "default";
};

export type CommandInsight = {
  /** What is happening — short headline. */
  what: string;
  /** Why — a single sentence. */
  why: string;
  /** What the parent should do — single concrete step. */
  action: string;
  tone: "good" | "warn" | "info";
};

export type CommandOverview = {
  routineCompletionPct: number;
  routineCompletedTasks: number;
  routineTotalTasks: number;
  behaviorScore: number; // 0..100
  behaviorLabel: string; // e.g. "Calm", "Mixed", "Tough day"
  mood: AdaptiveMood;
  sleepQuality: AdaptiveSleepQuality;
  screenMinutes: number;
  qualityMinutes: number;
  /** A single emoji representing the overall day. */
  statusEmoji: string;
  /** A short label like "Balanced", "On track", "Needs care". */
  statusLabel: string;
};

export type CommandWeek = {
  routineConsistencyPct: number;
  behaviorTrend: "up" | "flat" | "down";
  behaviorTrendLabel: string;
  focusImprovementPct: number; // can be negative
};

export type CommandParentStatus = {
  qualityMinutesToday: number;
  stressLabel: string;
  effortSummary: string;
};

export type CommandCenterInput = {
  childName?: string;
  /** Today's routine items (or [] if no routine yet). */
  items: AdaptiveItem[];
  /** Today's behavior log counts. */
  positiveBehaviorsToday: number;
  negativeBehaviorsToday: number;
  /** Mood + sleep that the parent has set (or detected) for today. */
  mood: AdaptiveMood;
  sleepQuality: AdaptiveSleepQuality;
  /** Week-to-date counts (last 7 days). */
  weeklyPositive?: number;
  weeklyNegative?: number;
  weeklyRoutinesGenerated?: number;
  /** Previous 7 days, used for trend deltas. Optional. */
  previousWeeklyPositive?: number;
  /**
   * Minutes since midnight in local time. Used to flag the current and next
   * routine step in the timeline. Optional — when omitted, the engine falls
   * back to picking the first pending item as "current".
   */
  nowMins?: number;
};

/**
 * Compact rendering of a single routine item along the today timeline.
 * The dashboard renders this row of icons + labels with `current` and
 * `next` flags driving the "NOW" / "NEXT" pills.
 */
export type CommandTimelineEntry = {
  /** Original index in the input items array — lets the UI mutate the right item. */
  index: number;
  time: string;
  activity: string;
  category: string;
  duration: number;
  status: AdaptiveItemStatus;
  /** Minutes-since-midnight start of this item (or -1 if unparsable). */
  startMins: number;
  current: boolean;
  next: boolean;
};

export type CommandSuggestionId =
  | "start-play"
  | "plan-nap"
  | "calm-tools"
  | "simplify-today"
  | "wind-down";

/**
 * A short, chip-sized auto-suggestion derived from today's data. The UI
 * renders these as one-tap chips above the action grid; tapping a chip
 * runs the action in `actionId` (or, when null, just opens the dashboard).
 */
export type CommandSuggestion = {
  id: CommandSuggestionId;
  label: string;
  emoji: string;
  /** Higher = more urgent. The list is pre-sorted descending by this value. */
  urgency: number;
  /** Which CommandActionId / quick-action this chip should run. */
  actionId: CommandActionId | null;
};

export type CommandCenterResult = {
  overview: CommandOverview;
  insights: CommandInsight[];
  actions: CommandAction[];
  week: CommandWeek;
  parentStatus: CommandParentStatus;
  /** Today's items in chronological order with current/next flags. */
  timeline: CommandTimelineEntry[];
  /** Auto-suggestions ranked by urgency (most urgent first). */
  suggestions: CommandSuggestion[];
};

const ESSENTIAL = /(meal|tiffin|hygiene|bath|brush|toilet|shower|sleep|bedtime|school|wind-down)/i;
const SCREEN = /(screen|tv|tablet|phone|video|youtube)/i;
const QUALITY = /(bond|play|read|story|cuddle|hug|talk)/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function durationOf(items: AdaptiveItem[], match: RegExp, completedOnly = true): number {
  return items.reduce((sum, it) => {
    const isCompleted = (it.status ?? "pending") === "completed";
    if (completedOnly && !isCompleted) return sum;
    const cat = (it.category ?? "").toLowerCase();
    const act = (it.activity ?? "").toLowerCase();
    if (match.test(cat) || match.test(act)) return sum + (it.duration ?? 0);
    return sum;
  }, 0);
}

function behaviorScore(pos: number, neg: number): number {
  const total = pos + neg;
  if (total === 0) return 70; // assume neutral when no data
  const raw = (pos / total) * 100;
  return Math.round(clamp(raw, 0, 100));
}

function behaviorLabel(score: number): string {
  if (score >= 80) return "Calm & happy";
  if (score >= 60) return "Mostly good";
  if (score >= 40) return "Mixed";
  return "Tough day";
}

function statusFor(routinePct: number, score: number, mood: AdaptiveMood, sleep: AdaptiveSleepQuality) {
  // Weighted aggregate so a single bad signal doesn't tank the day.
  const moodPts = mood === "active" ? 100 : mood === "neutral" ? 70 : 40;
  const sleepPts = sleep === "good" ? 100 : sleep === "ok" ? 70 : 40;
  const overall = Math.round(routinePct * 0.35 + score * 0.3 + moodPts * 0.2 + sleepPts * 0.15);
  if (overall >= 80) return { label: "Thriving", emoji: "🌟" };
  if (overall >= 65) return { label: "Balanced", emoji: "👍" };
  if (overall >= 45) return { label: "On track", emoji: "🙂" };
  if (overall >= 30) return { label: "Needs care", emoji: "🤍" };
  return { label: "Slow it down", emoji: "🫶" };
}

function stressFor(score: number, qualityMins: number, sleep: AdaptiveSleepQuality): string {
  if (qualityMins >= 60 && score >= 70 && sleep !== "poor") return "Calm & connected";
  if (qualityMins < 15 && score < 50) return "Stretched — take a breath";
  if (sleep === "poor" || score < 40) return "Tense — keep tonight gentle";
  return "Steady";
}

function effortSummary(qualityMins: number, completed: number): string {
  if (qualityMins >= 60) return `${qualityMins} min quality time today ❤️`;
  if (qualityMins >= 20) return `${qualityMins} min connected with your child today`;
  if (completed >= 3) return `You guided ${completed} routine moments today`;
  return `Every small moment counts — you showed up today`;
}

// Parses a "h:mm AM/PM" or "HH:mm" time string into minutes-since-midnight.
// Returns -1 on parse failure so callers can preserve item order without a
// silent default that would re-order items past midnight (00:00).
export function parseClockTimeMins(t: string): number {
  if (!t) return -1;
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const mn = parseInt(m12[2], 10);
    const ap = m12[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + mn;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const mn = parseInt(m24[2], 10);
    if (h >= 0 && h < 24 && mn >= 0 && mn < 60) return h * 60 + mn;
  }
  return -1;
}

/**
 * Picks the current + next steps from today's items.
 *
 * Rules:
 *   - "current" = the latest pending/in-progress item whose start time has
 *     already begun (now >= start, now < start + duration). Falls back to
 *     the earliest pending item that hasn't started yet.
 *   - "next" = the first pending item strictly after the current one.
 *   - Items already completed/skipped/delayed never count as current/next.
 *   - When `nowMins` is omitted, the engine picks the earliest pending item
 *     as current and the next pending item as next.
 *
 * Always returns the timeline in chronological order (by start time, with
 * unparsable times falling back to original index order).
 */
export function buildTimeline(
  items: AdaptiveItem[],
  nowMins: number | undefined,
): CommandTimelineEntry[] {
  const enriched = items.map((it, index) => {
    const startMins = parseClockTimeMins(it.time);
    const status = (it.status ?? "pending") as AdaptiveItemStatus;
    return {
      index,
      time: it.time,
      activity: it.activity,
      category: it.category ?? "",
      duration: it.duration ?? 0,
      status,
      startMins,
      // Filled in below.
      current: false,
      next: false,
    } as CommandTimelineEntry;
  });

  // Stable chronological sort: items with parseable times come first in
  // ascending order; unparsable times keep their input order at the end.
  enriched.sort((a, b) => {
    if (a.startMins < 0 && b.startMins < 0) return a.index - b.index;
    if (a.startMins < 0) return 1;
    if (b.startMins < 0) return -1;
    if (a.startMins !== b.startMins) return a.startMins - b.startMins;
    return a.index - b.index;
  });

  const pending = enriched.filter((e) => e.status === "pending");
  if (pending.length === 0) return enriched;

  let currentIdx = -1;
  if (typeof nowMins === "number") {
    // Latest pending item that has started (in-progress window).
    for (let i = pending.length - 1; i >= 0; i--) {
      const e = pending[i];
      if (e.startMins < 0) continue;
      const end = e.startMins + (e.duration || 0);
      if (nowMins >= e.startMins && nowMins < end) {
        currentIdx = i;
        break;
      }
    }
    // No in-progress item — first pending item that hasn't started yet.
    if (currentIdx < 0) {
      for (let i = 0; i < pending.length; i++) {
        const e = pending[i];
        if (e.startMins < 0 || e.startMins > nowMins) {
          currentIdx = i;
          break;
        }
      }
    }
  }
  // Fallback: first pending item.
  if (currentIdx < 0) currentIdx = 0;

  pending[currentIdx].current = true;
  if (currentIdx + 1 < pending.length) {
    pending[currentIdx + 1].next = true;
  }
  return enriched;
}

/**
 * Pure ranking of one-tap chip suggestions. Higher urgency = louder chip.
 *
 * Inputs are the already-computed signals so the dashboard and tests can
 * exercise this independently of the rest of the engine.
 */
export function buildSuggestions(args: {
  qualityMinutes: number;
  sleepQuality: AdaptiveSleepQuality;
  mood: AdaptiveMood;
  routinePct: number;
  totalItems: number;
  delayedCount: number;
  /** Hour-of-day in local time (0–23). Optional — defaults to neutral. */
  hour?: number;
  /**
   * Positive behaviors already logged today. Used to suppress the
   * "Try a 10-min play" chip once the parent has acted on it (the play
   * picker logs a positive moment, so re-suggesting it would feel naggy).
   */
  positiveBehaviorsToday?: number;
}): CommandSuggestion[] {
  const { qualityMinutes, sleepQuality, mood, routinePct, totalItems, delayedCount, hour, positiveBehaviorsToday } = args;
  const out: CommandSuggestion[] = [];

  // Behind on the day → simplify wins decisively.
  if (delayedCount >= 2) {
    out.push({ id: "simplify-today", label: "Simplify today", emoji: "✨", urgency: 95, actionId: "simplify-today" });
  }
  // Evening + weak completion → simplify (lighter weight than the delayed
  // case so it doesn't outrank a real "behind" signal).
  if (typeof hour === "number" && hour >= 17 && totalItems > 0 && routinePct < 50 && delayedCount < 2) {
    out.push({ id: "simplify-today", label: "Wrap up the day", emoji: "🌙", urgency: 80, actionId: "simplify-today" });
  }
  // Poor sleep → wind-down (mapped to Improve Sleep panel) + nap when low mood.
  if (sleepQuality === "poor") {
    out.push({ id: "wind-down", label: "Plan tonight's wind-down", emoji: "😴", urgency: 85, actionId: "improve-sleep" });
  }
  if (sleepQuality === "poor" && mood !== "active") {
    out.push({ id: "plan-nap", label: "Plan a nap", emoji: "💤", urgency: 70, actionId: "improve-sleep" });
  }
  // Low mood → calming tools.
  if (mood === "low") {
    out.push({ id: "calm-tools", label: "Open calming tools", emoji: "🫶", urgency: 75, actionId: "calm-child" });
  }
  // Light quality time → 10-min play picker. The chip wires to no specific
  // action because the UI opens an in-place play picker (3 age-appropriate
  // ideas) instead of running a generic action. We suppress the chip once
  // the parent has logged ANY positive moment today so the suggestion stops
  // re-appearing after they act on it.
  if (qualityMinutes < 15 && (positiveBehaviorsToday ?? 0) === 0) {
    out.push({ id: "start-play", label: "Try a 10-min play", emoji: "🎲", urgency: 60, actionId: null });
  }

  // Stable de-dupe by id, keeping the highest-urgency entry per id.
  const byId = new Map<CommandSuggestionId, CommandSuggestion>();
  for (const s of out) {
    const prev = byId.get(s.id);
    if (!prev || s.urgency > prev.urgency) byId.set(s.id, s);
  }
  return [...byId.values()].sort((a, b) => b.urgency - a.urgency);
}

/**
 * A short, parent-friendly play idea served by the in-place 10-min play
 * picker. Each entry has a self-contained title + description so the UI
 * doesn't need to look anything up.
 */
export type PlayIdea = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Inclusive lower bound (years). 0 means works from babies up. */
  ageMin: number;
  /** Inclusive upper bound (years). */
  ageMax: number;
};

const PLAY_IDEAS: PlayIdea[] = [
  // Baby (0–2)
  { id: "peekaboo",       emoji: "👀", title: "Peek-a-boo round",     description: "Hide your face with a soft cloth, then reveal — watch the giggles.", ageMin: 0, ageMax: 2 },
  { id: "mirror-faces",   emoji: "🪞", title: "Mirror faces",          description: "Sit in front of a mirror and copy each other's expressions.",       ageMin: 0, ageMax: 3 },
  { id: "sing-sway",      emoji: "🎵", title: "Sing & sway",           description: "Pick a soft song and gently sway together for a minute.",          ageMin: 0, ageMax: 3 },
  // Toddler (1–4)
  { id: "bubble-chase",   emoji: "🫧", title: "Bubble chase",          description: "Blow a few bubbles and let them pop each one before it lands.",    ageMin: 1, ageMax: 5 },
  { id: "stack-topple",   emoji: "🧱", title: "Stack & topple",        description: "Build a tower with cups or blocks, then knock it down together.",  ageMin: 1, ageMax: 5 },
  { id: "animal-sounds",  emoji: "🐮", title: "Animal sound guess",    description: "Take turns making animal sounds — the other guesses the animal.",  ageMin: 2, ageMax: 6 },
  // Preschool (3–6)
  { id: "treasure-hunt",  emoji: "🗺️", title: "Mini treasure hunt",   description: "Hide 3 small toys around the room and give warm/cold hints.",      ageMin: 3, ageMax: 8 },
  { id: "doodle-duel",    emoji: "🎨", title: "Doodle duel",           description: "Pick a theme and both draw — share what you made after 5 min.",   ageMin: 3, ageMax: 10 },
  { id: "simon-says",     emoji: "🙆", title: "Simon says",            description: "Quick rounds of silly actions — let them be Simon for a turn too.", ageMin: 3, ageMax: 9 },
  // Early elementary (4–9)
  { id: "story-chain",    emoji: "📖", title: "Story chain",           description: "Take turns adding one sentence to build a silly story together.",  ageMin: 4, ageMax: 12 },
  { id: "memory-match",   emoji: "🧠", title: "Memory match",          description: "Lay 8 cards face-down and take turns finding matching pairs.",     ageMin: 4, ageMax: 12 },
  { id: "charades",       emoji: "🎭", title: "Charades",              description: "Act out animals or jobs without words — 1-minute round each.",    ageMin: 5, ageMax: 14 },
  // Older (7+)
  { id: "twenty-q",       emoji: "❓", title: "20 questions",          description: "Pick anything — they get 20 yes/no questions to guess it.",        ageMin: 7, ageMax: 14 },
  { id: "speed-sketch",   emoji: "✏️", title: "Speed sketch",          description: "Set a 60-sec timer and both sketch the same prompt.",             ageMin: 7, ageMax: 14 },
  { id: "would-you",      emoji: "🤔", title: "Would-you-rather",      description: "Trade silly 'would you rather' questions for 5 minutes.",         ageMin: 8, ageMax: 14 },
];

/**
 * Picks `count` age-appropriate quick play ideas for the in-place picker.
 *
 * - Filters the catalog by `ageYears` (clamped to [0, 15]) and falls back
 *   to the full catalog when the filter is too narrow to fill `count`.
 * - Output order is deterministic per age so the same age always sees the
 *   same trio; this keeps the dashboard stable across re-renders without
 *   the parent feeling like the list is reshuffling on them.
 */
export function pickPlayIdeas(ageYears: number, count = 3): PlayIdea[] {
  const safeAge = Number.isFinite(ageYears)
    ? Math.max(0, Math.min(15, Math.floor(ageYears)))
    : 4;
  const matching = PLAY_IDEAS.filter((p) => p.ageMin <= safeAge && p.ageMax >= safeAge);
  const pool = matching.length >= count ? matching : PLAY_IDEAS;
  // Stable per-age "shuffle" — ranks each idea by (charCode + age*7) mod 11
  // so the same age always sees the same first N ideas, but different ages
  // see meaningfully different lists.
  const ranked = [...pool].sort((a, b) => {
    const ka = (a.id.charCodeAt(0) + safeAge * 7) % 11;
    const kb = (b.id.charCodeAt(0) + safeAge * 7) % 11;
    if (ka !== kb) return ka - kb;
    return a.id.localeCompare(b.id);
  });
  return ranked.slice(0, count);
}

export function computeCommandCenter(
  input: CommandCenterInput,
): CommandCenterResult {
  const {
    childName,
    items,
    positiveBehaviorsToday,
    negativeBehaviorsToday,
    mood,
    sleepQuality,
    weeklyPositive = 0,
    weeklyNegative = 0,
    weeklyRoutinesGenerated = 0,
    previousWeeklyPositive,
  } = input;

  // ── Overview ────────────────────────────────────────────────────
  const total = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const routinePct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const score = behaviorScore(positiveBehaviorsToday, negativeBehaviorsToday);
  const screenMinutes = durationOf(items, SCREEN, true);
  const qualityMinutes = durationOf(items, QUALITY, true);
  const status = statusFor(routinePct, score, mood, sleepQuality);

  const overview: CommandOverview = {
    routineCompletionPct: routinePct,
    routineCompletedTasks: completed,
    routineTotalTasks: total,
    behaviorScore: score,
    behaviorLabel: behaviorLabel(score),
    mood,
    sleepQuality,
    screenMinutes,
    qualityMinutes,
    statusEmoji: status.emoji,
    statusLabel: status.label,
  };

  // ── Insights (max 2, ranked by urgency) ─────────────────────────
  const delayed = items.filter((i) => i.status === "delayed").length;
  const insights: CommandInsight[] = [];
  const childRef = childName || "your child";

  if (sleepQuality === "poor") {
    insights.push({
      what: "Low sleep may cause evening irritation.",
      why: "Tired kids regulate emotion 30–40% slower.",
      action: "Keep today light and add a calm wind-down activity tonight.",
      tone: "warn",
    });
  }
  if (delayed >= 2) {
    insights.push({
      what: `${delayed} tasks slipped behind.`,
      why: "Trying to catch up usually adds more stress, not less.",
      action: "Tap Simplify Today and let Amy clear low-priority tasks.",
      tone: "warn",
    });
  }
  if (score < 50 && negativeBehaviorsToday > 0 && insights.length < 2) {
    insights.push({
      what: `${childRef}'s behavior has been challenging today.`,
      why: "Often a sign of unmet need — hunger, sleep, or feeling unseen.",
      action: "Try 10 minutes of focused 1:1 play before the next transition.",
      tone: "warn",
    });
  }
  if (mood === "low" && insights.length < 2) {
    insights.push({
      what: `${childRef} seems low on energy today.`,
      why: "Energy dips are normal — pushing through usually backfires.",
      action: "Swap one heavy task for a calm activity like reading together.",
      tone: "info",
    });
  }
  if (screenMinutes >= 90 && insights.length < 2) {
    insights.push({
      what: `Screen time is at ${screenMinutes} minutes today.`,
      why: "Beyond ~60 min, it usually crowds out movement and sleep quality.",
      action: "Add a 15-minute outdoor or movement break before evening.",
      tone: "warn",
    });
  }
  if (insights.length === 0) {
    if (routinePct >= 80) {
      insights.push({
        what: "Today is going well.",
        why: `${routinePct}% of the routine is done and behavior is steady.`,
        action: "Celebrate one win out loud — kids remember the recognition.",
        tone: "good",
      });
    } else if (qualityMinutes < 15) {
      insights.push({
        what: "Quality time is light today.",
        why: "Even 10 focused minutes builds connection more than an hour of half-attention.",
        action: "Block 15 min of phone-free play before the next routine block.",
        tone: "info",
      });
    } else {
      insights.push({
        what: "Today is steady.",
        why: "No urgent flags — the routine and mood are tracking normally.",
        action: "Stay close, mirror feelings, keep your tone warm and brief.",
        tone: "good",
      });
    }
  }

  // ── Quick actions (always show all 5 — UX consistency) ─────────
  const primary: CommandActionId | null =
    delayed >= 2 ? "simplify-today"
      : sleepQuality === "poor" ? "improve-sleep"
      : score < 50 ? "calm-child"
      : routinePct < 30 && total > 0 ? "fix-routine"
      : null;

  const actions: CommandAction[] = [
    { id: "simplify-today", label: "Simplify Today", emoji: "✨", severity: primary === "simplify-today" ? "primary" : "default" },
    { id: "fix-routine",    label: "Fix Routine",    emoji: "🛠️", severity: primary === "fix-routine"    ? "primary" : "default" },
    { id: "calm-child",     label: "Calm Child",     emoji: "🫂", severity: primary === "calm-child"     ? "primary" : "default" },
    { id: "add-activity",   label: "Add Activity",   emoji: "➕", severity: "default" },
    { id: "improve-sleep",  label: "Improve Sleep",  emoji: "😴", severity: primary === "improve-sleep"  ? "primary" : "default" },
  ];

  // ── Week snapshot ───────────────────────────────────────────────
  const consistency = clamp(Math.round((weeklyRoutinesGenerated / 7) * 100), 0, 100);
  let trend: "up" | "flat" | "down" = "flat";
  let trendLabel = "Holding steady";
  let focusImprovementPct = 0;
  if (typeof previousWeeklyPositive === "number") {
    const delta = weeklyPositive - previousWeeklyPositive;
    if (previousWeeklyPositive > 0) {
      focusImprovementPct = Math.round((delta / previousWeeklyPositive) * 100);
      if (delta > 0) { trend = "up"; trendLabel = `Behavior up ${Math.abs(focusImprovementPct)}% this week`; }
      else if (delta < 0) { trend = "down"; trendLabel = `Behavior down ${Math.abs(focusImprovementPct)}% this week`; }
    } else if (weeklyPositive > 0) {
      // Avoid misleading "100%" jumps when previous week had no data — use raw count.
      trend = "up";
      trendLabel = `${weeklyPositive} positive moment${weeklyPositive === 1 ? "" : "s"} this week`;
    }
  } else if (weeklyPositive + weeklyNegative > 0) {
    const ratio = weeklyPositive / (weeklyPositive + weeklyNegative);
    if (ratio >= 0.7) { trend = "up"; trendLabel = `${weeklyPositive} positive moments this week`; }
    else if (ratio <= 0.3) { trend = "down"; trendLabel = "More tough moments than wins this week"; }
    else { trendLabel = `${weeklyPositive} wins · ${weeklyNegative} tough this week`; }
  }

  const week: CommandWeek = {
    routineConsistencyPct: consistency,
    behaviorTrend: trend,
    behaviorTrendLabel: trendLabel,
    focusImprovementPct,
  };

  // ── Parent status ───────────────────────────────────────────────
  const parentStatus: CommandParentStatus = {
    qualityMinutesToday: qualityMinutes,
    stressLabel: stressFor(score, qualityMinutes, sleepQuality),
    effortSummary: effortSummary(qualityMinutes, completed),
  };

  // ── Timeline + auto-suggestions ─────────────────────────────────
  const timeline = buildTimeline(items, input.nowMins);
  const hour =
    typeof input.nowMins === "number"
      ? Math.floor(input.nowMins / 60)
      : undefined;
  const suggestions = buildSuggestions({
    qualityMinutes,
    sleepQuality,
    mood,
    routinePct,
    totalItems: total,
    delayedCount: delayed,
    hour,
    positiveBehaviorsToday,
  });

  return { overview, insights, actions, week, parentStatus, timeline, suggestions };
}

// Re-export so consumers can `import { ... } from "@workspace/family-routine"`.
export type { AdaptiveMood, AdaptiveSleepQuality } from "./adaptive";
