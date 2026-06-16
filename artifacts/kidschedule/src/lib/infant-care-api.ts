import { parseApiJson } from "@/lib/safe-json-response";
import { getApiUrl } from "@/lib/api";
import { waitForIdToken } from "@/lib/auth-token";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getFirebaseAuth } from "@/lib/firebase";

async function infantAuthHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = await waitForIdToken(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    return user.getIdToken();
  });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

/** Authenticated infant hub API fetch (Bearer + timeout). */
export async function infantFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = await infantAuthHeaders(init?.headers);
  const res = await fetchWithTimeout(getApiUrl(path), {
    credentials: "include",
    ...init,
    headers,
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401 ? "auth-unauthorized" : `infant_api_${res.status}`,
    );
  }
  return parseApiJson(res) as Promise<T>;
}

export type BabyTodayData = {
  childId: number;
  childName: string;
  ageMonths: number;
  nextNap: string | null;
  nextFeed: string | null;
  lastSleep: string | null;
  lastFeed: string | null;
  activity: { emoji: string; title: string } | null;
  vaccineStatus: string;
  sleepScore: string;
  milestoneProgressPct: number;
  cryInsightHint: string | null;
};

export type InfantCareLogType =
  | "feed_breast"
  | "feed_bottle"
  | "feed_solid"
  | "diaper_wet"
  | "diaper_dirty"
  | "diaper_mixed"
  | "burp";

export async function fetchBabyToday(childId: number): Promise<BabyTodayData> {
  const tzOffsetMin = new Date().getTimezoneOffset();
  const res = await infantFetch<{ ok: true; today: BabyTodayData }>(
    `/api/infant-today/${childId}?tzOffsetMin=${tzOffsetMin}`,
  );
  return res.today;
}

export async function logInfantCare(
  childId: number,
  logType: InfantCareLogType,
): Promise<void> {
  await infantFetch("/api/infant-care/log", {
    method: "POST",
    body: JSON.stringify({ childId, logType }),
  });
}

export async function fetchInfantCareSummary(childId: number) {
  return infantFetch<{
    ok: true;
    lastFeed: { loggedAt: string; logType: string } | null;
    lastDiaper: { loggedAt: string; logType: string } | null;
  }>(`/api/infant-care/${childId}/summary`);
}

export async function fetchDoctorReport(childId: number) {
  return infantFetch<Record<string, unknown>>(`/api/infant-doctor-report/${childId}`);
}

export async function logGrowth(
  childId: number,
  data: { weightKg?: number; heightCm?: number; headCm?: number },
) {
  return infantFetch("/api/infant-growth/log", {
    method: "POST",
    body: JSON.stringify({ childId, ...data }),
  });
}

export async function fetchGrowthHistory(childId: number) {
  return infantFetch<{ ok: true; measurements: unknown[] }>(
    `/api/infant-growth/${childId}`,
  );
}

export async function submitWellbeingCheckin(
  childId: number,
  energy: number,
  stress: number,
) {
  return infantFetch<{ ok: true; amyMessage: string }>(
    "/api/infant-wellbeing/checkin",
    {
      method: "POST",
      body: JSON.stringify({ childId, energy, stress }),
    },
  );
}

export async function createCoParentInvite(childId: number) {
  return infantFetch<{ ok: true; inviteCode: string }>(
    `/api/child-caregivers/${childId}/invite`,
    { method: "POST" },
  );
}

export async function acceptCoParentInvite(inviteCode: string) {
  return infantFetch<{ ok: true; childId: number }>(
    "/api/child-caregivers/accept",
    {
      method: "POST",
      body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
    },
  );
}

export type InfantSleepCoachPlan = {
  bedtimeRecommendation: string;
  wakeWindowAdjustments: string[];
  regressionAnalysis: string;
  napTransitionGuidance: string;
  weeklyFocus: string;
  actionSteps: string[];
};

export type InfantFeedingDayPlan = {
  day: string;
  meals: Record<string, { name: string; texture: string; portion: string }>;
};

export type InfantFeedingPlan = {
  roadmapSummary: string;
  allergyIntroTimeline: string[];
  allergyIntroductionRoadmap?: Array<{ week: number; food: string; method: string }>;
  portionGuidance: string;
  days: InfantFeedingDayPlan[];
};

export async function fetchInfantSleepCoachPlan(childId: number) {
  return infantFetch<{
    ok: true;
    plan: InfantSleepCoachPlan;
    generatedAt: string;
    cached: boolean;
  }>(`/api/infant-sleep/coach-plan/${childId}`);
}

export async function generateInfantSleepCoachPlan(
  childId: number,
  opts?: { forceRefresh?: boolean },
) {
  const tzOffsetMin = new Date().getTimezoneOffset();
  return infantFetch<{
    ok: true;
    plan: InfantSleepCoachPlan;
    generatedAt: string;
    cached: boolean;
  }>("/api/infant-sleep/coach-plan", {
    method: "POST",
    body: JSON.stringify({
      childId,
      forceRefresh: opts?.forceRefresh ?? false,
      tzOffsetMin,
    }),
  });
}

export async function fetchInfantFeedingPlan(childId: number) {
  return infantFetch<{
    ok: true;
    plan: InfantFeedingPlan;
    generatedAt: string;
    cached: boolean;
  }>(`/api/infant-feeding/plan/${childId}`);
}

export async function generateInfantFeedingPlan(
  childId: number,
  opts?: { forceRefresh?: boolean },
) {
  return infantFetch<{
    ok: true;
    plan: InfantFeedingPlan;
    generatedAt: string;
    cached: boolean;
  }>("/api/infant-feeding/plan", {
    method: "POST",
    body: JSON.stringify({
      childId,
      forceRefresh: opts?.forceRefresh ?? false,
    }),
  });
}
