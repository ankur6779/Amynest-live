import {
  simplifyForHandler,
  type FRItem,
  type HandlerKey,
} from "@workspace/family-routine";

export type SafeRoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
  activitySource?: string;
  culturalTag?: string;
  meal?: string;
  recipe?: unknown;
  nutrition?: unknown;
  ageBand?: string;
};

const DEFAULT_TIME = "9:00 AM";
const DEFAULT_ACTIVITY = "Free play";
const DEFAULT_CATEGORY = "activity";

function coerceString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Drop malformed slots and coerce required fields so render paths never throw. */
export function sanitizeRoutineItems(items: unknown): SafeRoutineItem[] {
  if (!Array.isArray(items)) return [];
  const out: SafeRoutineItem[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const activity = coerceString(row.activity, "");
    if (!activity) continue;
    out.push({
      time: coerceString(row.time, DEFAULT_TIME),
      activity,
      duration: Math.max(1, Math.round(Number(row.duration) || 30)),
      category: coerceString(row.category, DEFAULT_CATEGORY),
      notes: typeof row.notes === "string" ? row.notes : undefined,
      status: typeof row.status === "string" ? row.status : undefined,
      activitySource: typeof row.activitySource === "string" ? row.activitySource : undefined,
      culturalTag: typeof row.culturalTag === "string" ? row.culturalTag : undefined,
      meal: typeof row.meal === "string" ? row.meal : undefined,
      recipe: row.recipe,
      nutrition: row.nutrition,
      ageBand: typeof row.ageBand === "string" ? row.ageBand : undefined,
    });
  }
  return out;
}

export function safeSimplifyForHandler(
  items: unknown,
  handlerKey: HandlerKey,
): SafeRoutineItem[] {
  const sanitized = sanitizeRoutineItems(items);
  if (sanitized.length === 0) return [];
  try {
    const simplified = simplifyForHandler(sanitized as FRItem[], handlerKey);
    const normalized = sanitizeRoutineItems(simplified);
    return normalized.length > 0 ? normalized : sanitized;
  } catch {
    return sanitized;
  }
}

/** Minimal client-side emergency routine when all server paths fail (display-only until retry). */
export function buildEmergencyRoutineFallback(childName?: string): SafeRoutineItem[] {
  const who = childName?.trim() || "your child";
  return [
    {
      time: "7:30 AM",
      activity: `Wake up & get ready`,
      duration: 30,
      category: "morning_routine",
    },
    {
      time: "8:00 AM",
      activity: `Breakfast for ${who}`,
      duration: 30,
      category: "meal",
    },
    {
      time: "9:00 AM",
      activity: "Learning or play time",
      duration: 45,
      category: "learning",
    },
    {
      time: "12:30 PM",
      activity: "Lunch",
      duration: 30,
      category: "meal",
    },
    {
      time: "3:00 PM",
      activity: "Outdoor or indoor play",
      duration: 45,
      category: "play",
    },
    {
      time: "7:00 PM",
      activity: "Dinner",
      duration: 30,
      category: "meal",
    },
    {
      time: "8:30 PM",
      activity: "Wind-down & bedtime",
      duration: 30,
      category: "sleep",
    },
  ];
}
