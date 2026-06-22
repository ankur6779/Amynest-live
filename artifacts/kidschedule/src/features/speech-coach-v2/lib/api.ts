import { getApiUrl } from "@/lib/api";
import { parseApiJson } from "@/lib/safe-json-response";
import type { AuthFetchFn } from "@/lib/poll-result";
import type {
  PersistedSessionState,
  SpeechCoachV2AgeBand,
  SpeechCoachV2EvaluationResult,
  SpeechCoachV2Exercise,
  SpeechCoachV2ParentDashboard,
  SpeechCoachV2Phase,
} from "@workspace/speech-coach-v2";

export class SpeechCoachV2ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
    this.name = "SpeechCoachV2ApiError";
  }
}

async function parseApiError(res: Response, fallback: string): Promise<SpeechCoachV2ApiError> {
  const err = await res.json().catch(() => ({}));
  const body = err as { error?: string; message?: string };
  return new SpeechCoachV2ApiError(
    body.message ?? fallback,
    body.error,
    res.status,
  );
}
export interface SpeechCoachV2Usage {
  speechSecondsUsed: number;
  speechMinutesToday: number;
  dailyLimitSeconds: number;
  monthlyLimitSeconds: number;
  monthSecondsUsed: number;
  remainingSeconds: number;
  limitReached: boolean;
  isTrial: boolean;
  isPaid: boolean;
  dateKey: string;
}

export interface SpeechCoachV2StartResponse {
  sessionId: string;
  tabLockToken: string;
  ageBand: SpeechCoachV2AgeBand;
  phase: SpeechCoachV2Phase;
  exercises: SpeechCoachV2Exercise[];
  sessionState: PersistedSessionState;
  remainingSeconds: number;
  dailyLimitSeconds: number;
  isTrial: boolean;
  isPaid: boolean;
  instructions: string;
}

export interface SpeechCoachV2ActiveSessionResponse {
  hasActiveSession: boolean;
  sessionId?: string;
  tabLockToken?: string;
  ageBand?: SpeechCoachV2AgeBand;
  secondsConsumed?: number;
  sessionState?: PersistedSessionState;
  instructions?: string;
}

export interface SpeechCoachV2TokenResponse {
  clientSecret: string;
  expiresAt: number;
  model: string;
  voice: string;
  callsUrl: string;
  remainingSeconds: number;
}

export interface SpeechCoachV2EvaluateResponse extends SpeechCoachV2EvaluationResult {
  sessionState: PersistedSessionState;
  starsEarned: number;
  pointsEarned: number;
  instructions: string;
}

export async function fetchSpeechCoachV2Usage(
  authFetch: AuthFetchFn,
  childId: number,
): Promise<SpeechCoachV2Usage> {
  const res = await authFetch(getApiUrl(`/api/speech/v2/usage?childId=${childId}`));
  if (!res.ok) throw new Error("Failed to load usage");
  return parseApiJson<SpeechCoachV2Usage>(res);
}

export async function fetchActiveSpeechCoachV2Session(
  authFetch: AuthFetchFn,
  childId: number,
): Promise<SpeechCoachV2ActiveSessionResponse> {
  const res = await authFetch(getApiUrl(`/api/speech/v2/session/active?childId=${childId}`));
  if (!res.ok) throw new Error("Failed to check active session");
  return parseApiJson<SpeechCoachV2ActiveSessionResponse>(res);
}

export async function startSpeechCoachV2Session(
  authFetch: AuthFetchFn,
  input: {
    childId: number;
    resume?: boolean;
    sessionId?: string;
    tabLockToken?: string;
  },
): Promise<SpeechCoachV2StartResponse> {
  const res = await authFetch(getApiUrl("/api/speech/v2/session/start"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await parseApiError(res, "Failed to start session");
  }
  return parseApiJson<SpeechCoachV2StartResponse>(res);
}

export async function heartbeatSpeechCoachV2Session(
  authFetch: AuthFetchFn,
  input: { childId: number; sessionId: string; tabLockToken: string },
): Promise<{ ok: boolean; secondsConsumed: number; remainingSeconds: number; sessionState: PersistedSessionState }> {
  const res = await authFetch(getApiUrl("/api/speech/v2/session/heartbeat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await parseApiError(res, "Heartbeat failed");
  }
  return parseApiJson(res);
}

export async function mintSpeechCoachV2RealtimeToken(
  authFetch: AuthFetchFn,
  input: {
    childId: number;
    sessionId: string;
    tabLockToken: string;
    instructions: string;
  },
): Promise<SpeechCoachV2TokenResponse> {
  const res = await authFetch(getApiUrl("/api/speech/v2/realtime/token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await parseApiError(res, "Failed to mint realtime token");
  }
  return parseApiJson<SpeechCoachV2TokenResponse>(res);
}

export async function evaluateSpeechCoachV2Turn(
  authFetch: AuthFetchFn,
  input: {
    childId: number;
    sessionId: string;
    tabLockToken: string;
    exerciseId: string;
    expected: string;
    transcript: string;
    rawTranscript?: string;
    responseSeconds?: number;
  },
): Promise<SpeechCoachV2EvaluateResponse> {
  const res = await authFetch(getApiUrl("/api/speech/v2/evaluate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Evaluation failed");
  return parseApiJson<SpeechCoachV2EvaluateResponse>(res);
}

export async function reportSpeechCoachV2TokenUsage(
  authFetch: AuthFetchFn,
  input: {
    childId: number;
    sessionId: string;
    tabLockToken: string;
    delta: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      inputAudioTokens: number;
      outputAudioTokens: number;
      cachedInputTokens: number;
      inputTextTokens: number;
      outputTextTokens: number;
    };
    responseCount: number;
    model?: string;
  },
): Promise<{
  sessionCostInr: number;
  sessionCostUsd: number;
  sessionTotals: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputAudioTokens: number;
    outputAudioTokens: number;
    cachedInputTokens: number;
    inputTextTokens: number;
    outputTextTokens: number;
  };
}> {
  const res = await authFetch(getApiUrl("/api/speech/v2/session/usage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await parseApiError(res, "Failed to report token usage");
  }
  return parseApiJson(res);
}

export async function completeSpeechCoachV2Session(
  authFetch: AuthFetchFn,
  input: {
    childId: number;
    sessionId: string;
    tabLockToken: string;
  },
): Promise<{
  dailyStreak: number;
  weeklyStreak: number;
  badgesEarned: string[];
  durationSeconds: number;
  starsEarned: number;
  pointsEarned: number;
}> {
  const res = await authFetch(getApiUrl("/api/speech/v2/session/complete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to complete session");
  return parseApiJson(res);
}

export async function fetchSpeechCoachV2Dashboard(
  authFetch: AuthFetchFn,
  childId: number,
): Promise<SpeechCoachV2ParentDashboard> {
  const res = await authFetch(getApiUrl(`/api/speech/v2/dashboard?childId=${childId}`));
  if (!res.ok) throw new Error("Failed to load dashboard");
  return parseApiJson<SpeechCoachV2ParentDashboard>(res);
}
