import type { SafetyValidationResponse } from "@workspace/api-zod";

export type AgeBand = "infant" | "toddler" | "preschool" | "school" | "tween";

export type SafetyStatus = "safe" | "mostly_safe" | "needs_attention";

export interface RoutineItemLike {
  time?: string;
  activity?: string;
  duration?: number;
  category?: string;
}

export interface SafetyIssueItem {
  issue: string;
  suggestion: string;
  severity: "info" | "warning" | "critical";
}

export interface SafetyReport {
  status: SafetyStatus;
  score: number;
  issues: SafetyIssueItem[];
  positives: string[];
  raw: SafetyValidationResponse;
}

const SAFETY_CACHE_KEY = "amynest_last_safety_report";

type CachedSafety = {
  routineId: number;
  result: SafetyValidationResponse;
  cachedAt: string;
};

export function classifyAgeBand(months: number): AgeBand {
  if (months < 18) return "infant";
  if (months < 36) return "toddler";
  if (months < 60) return "preschool";
  if (months < 132) return "school";
  return "tween";
}

export function ageMonthsFromDob(dob?: string | null): number {
  if (!dob) return 84;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 84;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function parseStartMinutes(time: string | undefined, fallback: number): number {
  const m = /(\d{1,2}):(\d{2})/.exec(time ?? "");
  if (!m) return fallback;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (/pm/i.test(time ?? "") && h < 12) h += 12;
  if (/am/i.test(time ?? "") && h === 12) h = 0;
  return h * 60 + min;
}

export function buildSafetyValidationPayload(
  items: RoutineItemLike[],
  ageBand: AgeBand,
  ageMonths: number,
) {
  let totalSleep = 0;
  let totalScreen = 0;
  let totalOutdoor = 0;

  const activities = items.map((it, i) => {
    const cat = (it.category ?? "general").toLowerCase();
    const title = it.activity ?? "Activity";
    const dur = it.duration ?? 30;
    if (/sleep|nap|bed/.test(cat) || /sleep|nap|bed/i.test(title)) totalSleep += dur;
    if (/screen|tv|tablet|video/.test(cat) || /screen|tv|tablet|video/i.test(title)) {
      totalScreen += dur;
    }
    if (/outdoor|park|play|sport/.test(cat) || /outdoor|park/i.test(title)) {
      totalOutdoor += dur;
    }
    const intensity =
      /sport|run|active|gym|exercise/i.test(title)
        ? "high"
        : /play|walk|chore/i.test(title)
          ? "moderate"
          : "low";
    return {
      id: `slot-${i}`,
      title,
      startMinutes: parseStartMinutes(it.time, i * 30),
      durationMinutes: dur,
      category: cat,
      intensity,
    };
  });

  return {
    ageBand,
    ageMonths,
    activities,
    totalScreenMinutes: totalScreen,
    totalSleepMinutes: totalSleep,
    totalOutdoorMinutes: totalOutdoor,
    caregiverPresent: true,
  };
}

function issueLabelFromViolation(v: {
  category: string;
  message: string;
  severity: string;
}): string {
  const cat = v.category;
  if (cat === "sleep_safety") {
    if (/sleep/i.test(v.message)) return "Sleep may be too short for this age";
    return "Sleep timing needs attention";
  }
  if (cat === "screen_time") return "Screen time is high";
  if (cat === "activity_intensity") return "Activity intensity may be too much";
  if (cat === "outdoor_exposure") return "Not enough outdoor time";
  if (cat === "supervision") return "Supervision may be needed";
  if (cat === "nutrition_balance") return "Meals or snacks may be missing";
  return v.message.split(".")[0] || "Routine balance concern";
}

function clientSideIssues(
  activities: ReturnType<typeof buildSafetyValidationPayload>["activities"],
): SafetyIssueItem[] {
  const issues: SafetyIssueItem[] = [];

  const lateActive = activities.filter(
    (a) =>
      (a.intensity === "high" || a.intensity === "moderate") &&
      a.startMinutes >= 19 * 60,
  );
  if (lateActive.length > 0) {
    issues.push({
      issue: "High activity near bedtime",
      suggestion:
        "Move active play earlier and keep the last hour calm — bath, reading, or quiet play.",
      severity: "warning",
    });
  }

  const lateBed = activities.filter(
    (a) =>
      (/sleep|bed|night/i.test(a.title) || /sleep|bed/.test(a.category)) &&
      a.startMinutes >= 21 * 60 + 30,
  );
  if (lateBed.length > 0) {
    issues.push({
      issue: "Late sleep timing",
      suggestion: "Try shifting bedtime 30–45 minutes earlier when you can.",
      severity: "warning",
    });
  }

  const gaps = findShortRestGaps(activities);
  if (gaps < 2 && activities.length > 6) {
    issues.push({
      issue: "Few rest gaps between activities",
      suggestion: "Add short breaks between demanding blocks so your child can recharge.",
      severity: "info",
    });
  }

  return issues;
}

function findShortRestGaps(
  activities: ReturnType<typeof buildSafetyValidationPayload>["activities"],
): number {
  const sorted = [...activities].sort((a, b) => a.startMinutes - b.startMinutes);
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gap =
      cur.startMinutes - (prev.startMinutes + prev.durationMinutes);
    if (gap >= 15) gaps++;
  }
  return gaps;
}

export function deriveSafetyStatus(
  result: SafetyValidationResponse,
  extraIssues: SafetyIssueItem[],
): SafetyStatus {
  const hasCritical =
    result.violations.some((v) => v.severity === "critical") ||
    extraIssues.some((i) => i.severity === "critical");
  if (hasCritical || result.safetyScore < 55) return "needs_attention";
  if (result.safetyScore >= 85 && result.violations.length === 0 && extraIssues.length === 0) {
    return "safe";
  }
  if (result.safetyScore >= 70 && !hasCritical) return "safe";
  if (result.safetyScore >= 55) return "mostly_safe";
  return "needs_attention";
}

export function buildSafetyReport(
  result: SafetyValidationResponse,
  payload: ReturnType<typeof buildSafetyValidationPayload>,
): SafetyReport {
  const extraIssues = clientSideIssues(payload.activities);
  const violationCategories = new Set(result.violations.map((v) => v.category));

  const issuesFromApi: SafetyIssueItem[] = result.violations.map((v) => {
    const adj =
      result.adjustments.find((a) => a.reason.includes(v.ruleId)) ??
      result.adjustments.find(
        (a) =>
          a.activityId != null && v.affectedActivityIds.includes(a.activityId),
      ) ??
      result.adjustments[0];
    return {
      issue: issueLabelFromViolation(v),
      suggestion:
        adj?.suggestion ??
        "Adjust timing or duration for this part of the day.",
      severity: v.severity,
    };
  });

  const seen = new Set<string>();
  const issues = [...issuesFromApi, ...extraIssues].filter((i) => {
    const k = i.issue.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const positives: string[] = [];
  if (!violationCategories.has("sleep_safety") && payload.totalSleepMinutes > 0) {
    positives.push("Sleep duration looks appropriate for your child's age");
  }
  if (!violationCategories.has("screen_time")) {
    positives.push("Screen time stays within recommended limits");
  }
  if (
    !violationCategories.has("activity_intensity") &&
    !extraIssues.some((i) => i.issue.includes("bedtime"))
  ) {
    positives.push("Activity levels look balanced through the day");
  }
  if (
    (payload.totalOutdoorMinutes ?? 0) > 0 &&
    !violationCategories.has("outdoor_exposure")
  ) {
    positives.push("Outdoor time is included — good for movement and mood");
  }
  if (issues.length === 0) {
    positives.push("No major concerns — this routine supports rest and recovery");
  }

  const status = deriveSafetyStatus(result, extraIssues);

  return {
    status,
    score: result.safetyScore,
    issues,
    positives: positives.slice(0, 4),
    raw: result,
  };
}

export async function validateRoutineSafety(
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
  items: RoutineItemLike[],
  child: { dob?: string | null } | undefined,
): Promise<SafetyValidationResponse> {
  const ageMonths = ageMonthsFromDob(child?.dob);
  const ageBand = classifyAgeBand(ageMonths);
  const payload = buildSafetyValidationPayload(items, ageBand, ageMonths);

  const res = await authFetch("/api/safety/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Safety validation failed (${res.status})`);
  return res.json() as Promise<SafetyValidationResponse>;
}

export function cacheSafetyForRoutine(
  routineId: number,
  result: SafetyValidationResponse,
): void {
  try {
    const entry: CachedSafety = {
      routineId,
      result,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(SAFETY_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

export function getCachedSafetyForRoutine(
  routineId: number,
): SafetyValidationResponse | null {
  try {
    const raw = localStorage.getItem(SAFETY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSafety;
    if (parsed.routineId !== routineId) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

export function getLatestCachedSafetyRoutineId(): number | null {
  try {
    const raw = localStorage.getItem(SAFETY_CACHE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as CachedSafety).routineId;
  } catch {
    return null;
  }
}
