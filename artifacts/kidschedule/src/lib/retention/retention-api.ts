import { parseApiJson } from "@/lib/safe-json-response";
import { getApiUrl } from "@/lib/api";
import { touchRetentionActivity } from "@/lib/retention/retention-goal-bridge";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type RetentionDailyGoals = {
  routine: boolean;
  story: boolean;
  activity: boolean;
  speech: boolean;
};

export type RetentionResumeItem = {
  type: string;
  href: string;
  label: string;
  progressPct: number;
  updatedAt: string;
};

export type RetentionCheckinResult = {
  ok?: boolean;
  alreadyCheckedIn?: boolean;
  streakStarted?: boolean;
  streakExtended?: boolean;
  streakLost?: boolean;
  newAchievements?: string[];
  newMilestones?: number[];
  rewards?: { stars: number; coins: number; parentXp: number };
  next?: { currentStreak: number };
};

export type RetentionGoalResult = {
  ok?: boolean;
  allGoalsComplete?: boolean;
};

export type RetentionStatusState = {
  currentStreak: number;
  longestStreak: number;
  totalStars: number;
  totalCoins: number;
  parentXp: number;
  dailyGoals: RetentionDailyGoals;
  achievements: string[];
  inactiveDays: number;
  winbackLevel: number;
};

export type RetentionStatus = {
  ok: boolean;
  state: RetentionStatusState;
  shieldAvailable: boolean;
  canUseShield: boolean;
  parentingScore: number;
  goalsComplete: number;
  goalsTotal: number;
  checkedInToday: boolean;
  resumeItems: RetentionResumeItem[];
  preferences: Record<string, unknown>;
  weeklySummary: Record<string, unknown> | null;
  trialPremiumFeature: string | null;
};

export const RETENTION_STATUS_CACHE_KEY = "amynest:retention_status_cache_v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isValidRetentionDailyGoals(value: unknown): value is RetentionDailyGoals {
  if (!isRecord(value)) return false;
  return (
    typeof value.routine === "boolean" &&
    typeof value.story === "boolean" &&
    typeof value.activity === "boolean" &&
    typeof value.speech === "boolean"
  );
}

export function isValidRetentionState(value: unknown): value is RetentionStatusState {
  if (!isRecord(value)) return false;
  return (
    typeof value.currentStreak === "number" &&
    typeof value.longestStreak === "number" &&
    typeof value.totalStars === "number" &&
    typeof value.totalCoins === "number" &&
    typeof value.parentXp === "number" &&
    typeof value.inactiveDays === "number" &&
    typeof value.winbackLevel === "number" &&
    Array.isArray(value.achievements) &&
    isValidRetentionDailyGoals(value.dailyGoals)
  );
}

/** Validates a full retention status payload before cache or render. */
export function isValidRetentionStatus(value: unknown): value is RetentionStatus {
  if (!isRecord(value)) return false;
  if (!isValidRetentionState(value.state)) return false;
  return (
    typeof value.shieldAvailable === "boolean" &&
    typeof value.canUseShield === "boolean" &&
    typeof value.parentingScore === "number" &&
    typeof value.goalsComplete === "number" &&
    typeof value.goalsTotal === "number" &&
    typeof value.checkedInToday === "boolean" &&
    Array.isArray(value.resumeItems)
  );
}

export function clearRetentionCache(): void {
  try {
    sessionStorage.removeItem(RETENTION_STATUS_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function readRetentionCache(): RetentionStatus | undefined {
  try {
    const raw = sessionStorage.getItem(RETENTION_STATUS_CACHE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidRetentionStatus(parsed)) {
      clearRetentionCache();
      return undefined;
    }
    return parsed;
  } catch {
    clearRetentionCache();
    return undefined;
  }
}

export function writeRetentionCache(status: RetentionStatus): void {
  if (!isValidRetentionStatus(status)) return;
  try {
    sessionStorage.setItem(RETENTION_STATUS_CACHE_KEY, JSON.stringify(status));
  } catch {
    /* ignore */
  }
}

export async function fetchRetentionStatus(
  authFetch: AuthFetch,
  opts?: { routineCompletionPct?: number; trialing?: boolean },
): Promise<RetentionStatus> {
  const params = new URLSearchParams();
  if (opts?.routineCompletionPct != null) {
    params.set("routineCompletionPct", String(opts.routineCompletionPct));
  }
  if (opts?.trialing) params.set("trialing", "1");
  const qs = params.toString();
  const res = await authFetch(
    getApiUrl(`/api/retention/status${qs ? `?${qs}` : ""}`),
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[retention] status API error", {
      status: res.status,
      url: res.url,
      body: body.slice(0, 500),
    });
    throw new Error(`retention status ${res.status}`);
  }
  const data = await parseApiJson<unknown>(res);
  if (!isValidRetentionStatus(data)) {
    console.error("[retention] invalid API payload — not caching", { data });
    throw new Error("retention status invalid");
  }
  writeRetentionCache(data);
  void touchRetentionActivity(authFetch);
  return data;
}

export async function postRetentionCheckin(
  authFetch: AuthFetch,
  useShield?: boolean,
): Promise<RetentionCheckinResult> {
  const res = await authFetch(getApiUrl("/api/retention/checkin"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ useShield: !!useShield }),
  });
  if (!res.ok) throw new Error(`retention checkin ${res.status}`);
  return parseApiJson<RetentionCheckinResult>(res);
}

export async function postRetentionGoal(
  authFetch: AuthFetch,
  goal: keyof RetentionDailyGoals,
) {
  const res = await authFetch(getApiUrl("/api/retention/goal"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal }),
  });
  if (!res.ok) throw new Error(`retention goal ${res.status}`);
  return parseApiJson<RetentionGoalResult>(res);
}

export async function postRetentionResume(
  authFetch: AuthFetch,
  item: Omit<RetentionResumeItem, "updatedAt">,
) {
  const res = await authFetch(getApiUrl("/api/retention/resume"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`retention resume ${res.status}`);
  return parseApiJson(res);
}
