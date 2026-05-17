/**
 * Lightweight client mirror of api-server routine-special-event parsing
 * for live feedback on the generate-routine form.
 */

export type SpecialEventType =
  | "doctor"
  | "birthday"
  | "outing"
  | "class"
  | "party"
  | "appointment"
  | "other";

export type ParsedSpecialPlanPreview = {
  activity: string;
  type: SpecialEventType;
  timeLabel: string | null;
  timeSource: "explicit" | "inferred";
};

const HANDLER_SEGMENT_RE =
  /today is being handled by|both parents.*handling|babysitter|grandparent|handled by dad|handled by mom/i;

const TIME_PATTERNS: Array<{
  re: RegExp;
  parse: (m: RegExpMatchArray) => { h: number; m: number } | null;
}> = [
  {
    re: /(?:@|at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    parse: (m) => ({ h: parseInt(m[1]!, 10), m: parseInt(m[2]!, 10) }),
  },
  {
    re: /(?:@|at\s+)?(\d{1,2})\s*(am|pm)/i,
    parse: (m) => ({ h: parseInt(m[1]!, 10), m: 0 }),
  },
  {
    re: /\b(\d{1,2})\s*(am|pm)\b/i,
    parse: (m) => ({ h: parseInt(m[1]!, 10), m: 0 }),
  },
];

const INFERRED_START: Record<SpecialEventType, number> = {
  doctor: 10 * 60,
  appointment: 10 * 60,
  birthday: 17 * 60,
  party: 17 * 60,
  outing: 18 * 60,
  class: 16 * 60,
  other: 15 * 60,
};

const TYPE_LABELS: Record<SpecialEventType, string> = {
  doctor: "Doctor visit",
  birthday: "Birthday",
  party: "Party",
  outing: "Outing",
  class: "Class or lesson",
  appointment: "Appointment",
  other: "Special plan",
};

function minsTo12h(total: number): string {
  const h24 = Math.floor(total / 60) % 24;
  const min = total % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min.toString().padStart(2, "0")} ${ampm}`;
}

export function stripHandlerSegments(specialPlans: string): string {
  const parts = specialPlans
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const events = parts.filter((p) => !HANDLER_SEGMENT_RE.test(p));
  if (events.length > 0) return events.join(" | ");
  return specialPlans.trim();
}

export function inferSpecialEventType(text: string): SpecialEventType {
  const t = text.toLowerCase();
  if (/doctor|dentist|clinic|hospital|check-?up|paediatric|pediatric|vaccin/i.test(t)) {
    return "doctor";
  }
  if (/birthday|bday|cake cutting/i.test(t)) return "birthday";
  if (/party|celebration|function/i.test(t)) return "party";
  if (/outing|picnic|zoo|museum|trip to|theme park|beach day/i.test(t)) {
    return "outing";
  }
  if (/class|lesson|tuition|soccer|football|swim|dance|music|karate|ballet/i.test(t)) {
    return "class";
  }
  if (/appointment|visit/i.test(t)) return "appointment";
  return "other";
}

function extractTimeMins(text: string): { mins: number; source: "explicit" | "inferred" } {
  for (const { re, parse } of TIME_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const parts = parse(m);
    if (!parts) continue;
    let h = parts.h;
    const min = parts.m;
    const ap = m[3]?.toLowerCase() ?? m[2]?.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      return { mins: h * 60 + min, source: "explicit" };
    }
  }
  const type = inferSpecialEventType(text);
  return { mins: INFERRED_START[type], source: "inferred" };
}

function formatActivityLabel(raw: string): string {
  let label = raw
    .replace(/(?:@|at)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (label.length > 60) label = `${label.slice(0, 57)}…`;
  if (!label) return "Special activity";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Returns null when input is empty or only handler metadata. */
export function parseSpecialPlansPreview(
  specialPlans: string,
): ParsedSpecialPlanPreview | null {
  if (!specialPlans.trim()) return null;
  const cleaned = stripHandlerSegments(specialPlans.trim());
  if (!cleaned) return null;
  const primary = cleaned.split(/\s*\|\s*/)[0]!.trim();
  const type = inferSpecialEventType(primary);
  const { mins, source } = extractTimeMins(primary);
  const activity = formatActivityLabel(primary);
  return {
    activity,
    type,
    timeLabel: minsTo12h(mins),
    timeSource: source,
  };
}

export function formatDetectedSpecialPlan(preview: ParsedSpecialPlanPreview): string {
  const kind = TYPE_LABELS[preview.type] ?? preview.activity;
  const timePart =
    preview.timeSource === "inferred"
      ? `around ${preview.timeLabel} (estimated)`
      : `at ${preview.timeLabel}`;
  return `Detected: ${kind} ${timePart}`;
}

export const SPECIAL_PLAN_CHIPS: Array<{
  id: SpecialEventType;
  emoji: string;
  label: string;
  template: string;
}> = [
  { id: "birthday", emoji: "🎂", label: "Birthday", template: "Birthday party" },
  { id: "doctor", emoji: "🏥", label: "Doctor", template: "Doctor appointment" },
  { id: "outing", emoji: "🏞", label: "Outing", template: "Family outing" },
  { id: "class", emoji: "📚", label: "Class", template: "Class or lesson" },
];
