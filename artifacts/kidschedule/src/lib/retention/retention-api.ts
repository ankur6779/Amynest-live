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

export type RetentionStatus = {
  ok: boolean;
  state: {
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

const CACHE_KEY = "amynest:retention_status_cache_v1";

export function readRetentionCache(): RetentionStatus | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RetentionStatus) : null;
  } catch {
    return null;
  }
}

export function writeRetentionCache(status: RetentionStatus): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(status));
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
  if (!res.ok) throw new Error(`retention status ${res.status}`);
  const data = (await parseApiJson<RetentionStatus>(res));
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
