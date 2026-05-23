import { API_BASE_URL } from "@/constants/api";

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setApiAuthGetter(fn: () => Promise<string | null>): void {
  authTokenGetter = fn;
}

async function authHeader(): Promise<Record<string, string>> {
  if (!authTokenGetter) return {};
  try {
    const t = await authTokenGetter();
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

export type AppDataResponse = {
  user: { name: string; parentType: string };
  children: Array<{ id: number; name: string; ageGroup: string; problems: string[] }>;
  dashboard: { greeting: string; totalProgress: number; streak: number };
  routine: {
    todayTasks: Array<{
      id: string;
      title: string;
      duration: number;
      status: "pending" | "done";
      time: string;
      category: string;
    }>;
    completedCount: number;
    totalCount: number;
    progress: number;
  };
  coach: {
    currentGoal: string;
    currentStep: number;
    totalSteps: number;
    progress: number;
    currentWin: { title: string; objective: string; summary: string };
  };
  behavior: {
    score: number;
    metrics: { listening: number; screen: number; sleep: number; eating: number };
    trend: "up" | "down" | "flat";
    recentPositive: number;
    recentNegative: number;
  };
  insights: Array<{ title: string; description: string }>;
  recommendations: Array<{
    type: "coach" | "routine" | "activity";
    title: string;
    description: string;
  }>;
  subscription?: {
    isPremium: boolean;
    plan?: string | null;
    status?: string | null;
    currentPeriodEnd?: string | null;
    [key: string]: unknown;
  };
  meta: { generatedAt: string; cached: boolean };
};

export async function fetchAppData(opts: { refresh?: boolean } = {}): Promise<AppDataResponse> {
  const headers = await authHeader();
  const url = `${API_BASE_URL}/api/app-data${opts.refresh ? "?refresh=1" : ""}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fetchAppData ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as AppDataResponse;
}

export async function postAppDataRefresh(): Promise<AppDataResponse> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE_URL}/api/app-data/refresh`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`postAppDataRefresh ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as AppDataResponse;
}
