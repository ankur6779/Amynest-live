import { getApiUrl } from "@/lib/api";
import { extractApiErrorMessage } from "@/lib/api-error-message";

export type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
) => Promise<Response>;

export type CryCause = "hunger" | "sleepy" | "discomfort" | "pain";

export type CryAudioStats = {
  avgAmplitude?: number;
  peakAmplitude?: number;
  zeroCrossingRate?: number;
  durationMs?: number;
};

export interface CrySession {
  id: number;
  childId: number;
  durationMs: number;
  audioStats: CryAudioStats;
  context: Record<string, unknown>;
  primary: { cause: CryCause; confidence: number };
  secondary: { cause: CryCause; confidence: number };
  suggestion: string;
  medicalFlag: boolean;
  createdAt: string;
}

export interface CryAnalyzeBody {
  childId: number;
  durationMs: number;
  audioStats: CryAudioStats;
  context: Record<string, unknown>;
  language: string;
}

export function cryInsightErrorDescription(
  status: number,
  data: unknown,
): string {
  if (status === 401) {
    const serverMsg = extractApiErrorMessage({ data }, "");
    if (
      !serverMsg ||
      serverMsg.toLowerCase().includes("unauthorized") ||
      serverMsg.toLowerCase().includes("unauthenticated")
    ) {
      return "Session expired. Please sign in again.";
    }
    return serverMsg;
  }
  return extractApiErrorMessage(
    { data },
    `Server returned ${status}. Please try again.`,
  );
}

export type CryInsightHistoryResult =
  | { ok: true; sessions: CrySession[] }
  | { ok: false; status: number; data: unknown };

export async function fetchCryInsightHistory(
  authFetch: AuthFetch,
  childId: number,
  limit = 10,
): Promise<CryInsightHistoryResult> {
  const r = await authFetch(
    getApiUrl(`/api/cry-insight/history/${childId}?limit=${limit}`),
  );
  if (!r.ok) {
    let data: unknown = null;
    try {
      data = await r.json();
    } catch {
      /* noop */
    }
    return { ok: false, status: r.status, data };
  }
  const j = (await r.json()) as { ok: boolean; sessions: CrySession[] };
  return { ok: true, sessions: j.ok ? j.sessions : [] };
}

export async function postCryInsightAnalyze(
  authFetch: AuthFetch,
  body: CryAnalyzeBody,
): Promise<
  | { ok: true; session: CrySession }
  | { ok: false; status: number; data: unknown }
> {
  const url = getApiUrl("/api/cry-insight/analyze");
  const r = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let data: unknown = null;
    try {
      data = await r.json();
    } catch {
      /* noop */
    }
    return { ok: false, status: r.status, data };
  }
  const j = (await r.json()) as { ok: true; session: CrySession };
  return { ok: true, session: j.session };
}
