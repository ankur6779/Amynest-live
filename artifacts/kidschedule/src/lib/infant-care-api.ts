import { getApiUrl } from "@/lib/api";

async function infantFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`infant_api_${res.status}`);
  return res.json() as Promise<T>;
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
