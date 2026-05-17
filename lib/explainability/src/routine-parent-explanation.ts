/**
 * Parent-facing "Why this routine?" formatter.
 * Strips internal debug tokens and returns a short, grouped explanation.
 */

export type ParentExplanationGroup =
  | "context"
  | "environment"
  | "behavior"
  | "adjustments";

export type ParentExplanationContext = {
  hasSchool?: boolean;
  isWeekendDay?: boolean;
  mood?: string;
};

export type ParentRoutineExplanation = {
  summary: string;
  bullets: string[];
  grouped: Record<ParentExplanationGroup, string[]>;
};

const MAX_BULLETS = 6;

const INTERNAL_PREFIX =
  /^(behavior|schedule|learning|decision|inputs|difficulty|aqi-validation|meal-flow|meal-day|meal-overlap|meal-timing|special-event|fixed-activities|fixed-activity|fixed-conflict|fixed-shift|fixed-adjust|hydration):/i;

type ScoredBullet = { text: string; group: ParentExplanationGroup; score: number };

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 120);
}

function isInternalToken(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (INTERNAL_PREFIX.test(t)) return true;
  if (/^goal:/i.test(t)) return false;
  return false;
}

function humanizeLine(raw: string): string | null {
  const line = raw.trim();
  if (!line || isInternalToken(line)) return null;

  if (line.startsWith("hydration:")) {
    const body = line.slice("hydration:".length).trim();
    return body ? `Hydration: ${body}` : null;
  }

  const humanizers: Array<[RegExp, string | ((m: RegExpMatchArray) => string) | null]> = [
    [
      /meal-variety:\s*duplicate\s+(\w+)\s+base across "([^"]+)" and "([^"]+)"/i,
      () => "Similar meal types were repeated — variety was improved for dinner.",
    ],
    [
      /meal-variety:\s*repeated meal pattern "([^"]+)"/i,
      () => "Meal variety was improved so the same dishes are not repeated.",
    ],
    [
      /meal-variety:\s*duplicate grain\/protein\/prep at refuel and dinner/i,
      () => "Afternoon snack and dinner were diversified for better variety.",
    ],
    [
      /meal-day:\s*after-school refuel must not appear on non-school day/i,
      null,
    ],
    [
      /meal-day:\s*missing lunch on non-school day/i,
      null,
    ],
    [
      /meal-day:\s*duplicate (\w+)/i,
      () => "Duplicate meal blocks were merged into a cleaner schedule.",
    ],
    [/schedule:reverted_pre_validation/i, null],
  ];

  for (const [re, out] of humanizers) {
    const m = line.match(re);
    if (m) {
      if (out === null) return null;
      return typeof out === "function" ? out(m) : out;
    }
  }

  if (/^Goal:/i.test(line)) return line;
  if (/^Weekend mode/i.test(line)) return line;
  if (/^School day/i.test(line)) return line;
  if (/^Anchored learning/i.test(line)) return line;
  if (/^Placed calmer/i.test(line)) return line;
  if (/^Outdoor /i.test(line)) return line;
  if (/^Routine kept fully indoors/i.test(line)) return line;
  if (/^Sunscreen/i.test(line)) return line;
  if (/^Cognitive blocks/i.test(line)) return line;
  if (/^Activity intensity reduced/i.test(line)) return line;
  if (/^Adjusted around/i.test(line)) return line;
  if (/^Built around/i.test(line)) return line;
  if (/^Special plan/i.test(line) || /special event/i.test(line)) return line;
  if (/^Removed similar AI blocks/i.test(line)) return line;
  if (/^Moved /i.test(line) && /meal/i.test(line)) return line;
  if (/^Ensured /i.test(line) || /^Inserted /i.test(line)) return line;
  if (/^Shortened /i.test(line) || /^Extended /i.test(line)) return line;

  if (line.length > 160) return `${line.slice(0, 157)}…`;
  return line;
}

function classifyGroup(text: string): ParentExplanationGroup {
  const l = text.toLowerCase();
  if (
    /weekend|school day|school hours|day off|no school|holiday/.test(l)
  ) {
    return "context";
  }
  if (
    /aqi|air quality|uv|weather|outdoor|indoor|heat|humidity|storm|rain|sunscreen|wind/.test(
      l,
    )
  ) {
    return "environment";
  }
  if (
    /mood|sleep|energy|focus|calm|gentler|rested|cranky|tired|happy|compliance|learning window|peak focus|low-energy/.test(
      l,
    )
  ) {
    return "behavior";
  }
  return "adjustments";
}

function scoreBullet(text: string, ctx: ParentExplanationContext): number {
  const l = text.toLowerCase();
  let score = 40;
  if (/weekend|school day/.test(l)) score = Math.max(score, 100);
  if (/aqi|air quality|weather|outdoor|indoor/.test(l)) score = Math.max(score, 92);
  if (/mood|sleep|energy|focus|calm/.test(l)) score = Math.max(score, 88);
  if (/special (plan|event)|birthday|party|appointment/.test(l))
    score = Math.max(score, 82);
  if (/fixed activit|tuition|weekly activit/.test(l)) score = Math.max(score, 78);
  if (/goal:/.test(l)) score = Math.max(score, 72);
  if (/meal|dinner|lunch|snack|variety|hydration/.test(l)) score = Math.max(score, 55);
  if (ctx.isWeekendDay && /weekend/.test(l)) score += 5;
  if (ctx.hasSchool && /school/.test(l)) score += 3;
  if (ctx.mood && ctx.mood !== "normal" && /mood/.test(l)) score += 4;
  return score;
}

function dedupeBullets(candidates: ScoredBullet[]): ScoredBullet[] {
  const seen = new Map<string, ScoredBullet>();
  for (const c of candidates) {
    const key = normalizeKey(c.text);
    const prev = seen.get(key);
    if (!prev || c.score > prev.score) seen.set(key, c);
  }
  return [...seen.values()];
}

/**
 * Convert raw adaptation strings (may include legacy debug tokens) into
 * a concise parent-facing explanation.
 */
function moodContextLine(mood?: string): string | null {
  switch (mood) {
    case "happy":
      return "Today's plan keeps energy up — your child seems in a good mood.";
    case "lazy":
      return "Today's plan is gentler with extra breaks for a lower-energy day.";
    case "angry":
      return "Today's plan favors calm, soothing activities.";
    default:
      return null;
  }
}

export function formatParentRoutineExplanation(
  rawLines: readonly string[],
  ctx: ParentExplanationContext = {},
): ParentRoutineExplanation {
  const candidates: ScoredBullet[] = [];

  const moodLine = moodContextLine(ctx.mood);
  if (moodLine) {
    candidates.push({ text: moodLine, group: "behavior", score: 90 });
  }

  for (const raw of rawLines) {
    const text = humanizeLine(raw);
    if (!text) continue;
    const group = classifyGroup(text);
    candidates.push({ text, group, score: scoreBullet(text, ctx) });
  }

  const deduped = dedupeBullets(candidates).sort((a, b) => b.score - a.score);
  const top = deduped.slice(0, MAX_BULLETS);

  const grouped: Record<ParentExplanationGroup, string[]> = {
    context: [],
    environment: [],
    behavior: [],
    adjustments: [],
  };
  for (const b of top) grouped[b.group].push(b.text);

  const order: ParentExplanationGroup[] = [
    "context",
    "environment",
    "behavior",
    "adjustments",
  ];
  const bullets: string[] = [];
  for (const g of order) {
    for (const t of grouped[g]) {
      if (bullets.length < MAX_BULLETS) bullets.push(t);
    }
  }

  return {
    summary: "Here's how Amy adapted today's plan:",
    bullets,
    grouped,
  };
}

/** True when the line should never be stored or shown to parents. */
export function isInternalAdaptationToken(line: string): boolean {
  return isInternalToken(line.trim());
}
