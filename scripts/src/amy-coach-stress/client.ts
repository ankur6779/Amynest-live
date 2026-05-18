import type { StressConfig } from "./config.js";
import { STRESS_AGE_GROUPS, STRESS_COACH_GOALS, STRESS_SEVERITIES } from "./config.js";
import type { PollLogEntry, RequestLogEntry } from "./metrics.js";

export interface GenerateCoachResult {
  requestLog: RequestLogEntry;
  sessionId?: string;
  generationId?: string;
  coachStatus?: string;
}

export interface FullFlowResult {
  generate: GenerateCoachResult;
  poll?: PollLogEntry;
}

function buildPayload(virtualUserIndex: number) {
  const goal = STRESS_COACH_GOALS[virtualUserIndex % STRESS_COACH_GOALS.length]!;
  const ageGroup = STRESS_AGE_GROUPS[virtualUserIndex % STRESS_AGE_GROUPS.length]!;
  const severity = STRESS_SEVERITIES[virtualUserIndex % STRESS_SEVERITIES.length]!;
  return {
    goal,
    ageGroup,
    severity,
    triggers: [`stress_trigger_${virtualUserIndex}`],
    routine: `Stress routine variant ${virtualUserIndex}`,
    topicAnswers: {
      stress_run_id: `stress-${Date.now()}-${virtualUserIndex}`,
    },
  };
}

export async function postCoachGenerate(
  config: StressConfig,
  virtualUserIndex: number,
): Promise<GenerateCoachResult> {
  const userId = `stress-user-${virtualUserIndex}`;
  const timestamp = new Date().toISOString();
  const url = `${config.apiUrl}/api/coach/generate`;
  const started = performance.now();
  let timeToFirstResponseMs = 0;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.authToken}`,
      },
      body: JSON.stringify(buildPayload(virtualUserIndex)),
    });
    timeToFirstResponseMs = Math.round(performance.now() - started);

    const responseTimeMs = timeToFirstResponseMs;
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const success = res.ok;
    const wins = body.wins;
    const winCount = Array.isArray(wins) ? wins.length : undefined;

    if (config.verbose) {
      console.log(
        `[generate] user=${userId} status=${res.status} ttfb=${timeToFirstResponseMs}ms wins=${winCount ?? 0}`,
      );
    }

    return {
      requestLog: {
        userId,
        virtualUserIndex,
        responseTimeMs,
        timeToFirstResponseMs,
        status: res.status,
        success,
        coachStatus: typeof body.status === "string" ? body.status : undefined,
        timestamp,
        sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
        generationId: typeof body.generationId === "string" ? body.generationId : undefined,
        winCount,
        cached: body.cached === true,
        error: success ? undefined : JSON.stringify(body).slice(0, 200),
      },
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      generationId: typeof body.generationId === "string" ? body.generationId : undefined,
      coachStatus: typeof body.status === "string" ? body.status : undefined,
    };
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - started);
    return {
      requestLog: {
        userId,
        virtualUserIndex,
        responseTimeMs,
        timeToFirstResponseMs: timeToFirstResponseMs || responseTimeMs,
        status: 0,
        success: false,
        timestamp,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function pollUntilComplete(
  config: StressConfig,
  virtualUserIndex: number,
  sessionId: string,
  generationId?: string,
): Promise<PollLogEntry> {
  const userId = `stress-user-${virtualUserIndex}`;
  const started = performance.now();
  let pollCount = 0;
  const qs = new URLSearchParams({ sessionId });
  if (generationId) qs.set("generationId", generationId);

  while (performance.now() - started < config.pollTimeoutMs) {
    pollCount++;
    await sleep(config.pollIntervalMs);

    try {
      const res = await fetch(`${config.apiUrl}/api/coach/status?${qs}`, {
        headers: { Authorization: `Bearer ${config.authToken}` },
      });
      const body = (await res.json()) as { status?: string; wins?: unknown[] };
      if (res.ok && body.status === "complete") {
        return {
          userId,
          virtualUserIndex,
          backgroundCompletionMs: Math.round(performance.now() - started),
          success: true,
          pollCount,
          timestamp: new Date().toISOString(),
        };
      }
      if (!res.ok && config.verbose) {
        console.warn(`[poll] user=${userId} http=${res.status} poll=${pollCount}`);
      }
    } catch (err) {
      if (config.verbose) {
        console.warn(`[poll] user=${userId} error=${err instanceof Error ? err.message : err}`);
      }
    }
  }

  return {
    userId,
    virtualUserIndex,
    backgroundCompletionMs: Math.round(performance.now() - started),
    success: false,
    pollCount,
    timestamp: new Date().toISOString(),
    error: "poll_timeout",
  };
}

export async function runFullCoachFlow(
  config: StressConfig,
  virtualUserIndex: number,
): Promise<FullFlowResult> {
  const generate = await postCoachGenerate(config, virtualUserIndex);

  if (!config.pollStatus || !generate.requestLog.success) {
    return { generate };
  }

  if (generate.coachStatus === "complete") {
    return {
      generate,
      poll: {
        userId: generate.requestLog.userId,
        virtualUserIndex,
        backgroundCompletionMs: 0,
        success: true,
        pollCount: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const sessionId = generate.sessionId;
  if (!sessionId) {
    return {
      generate,
      poll: {
        userId: generate.requestLog.userId,
        virtualUserIndex,
        backgroundCompletionMs: 0,
        success: false,
        pollCount: 0,
        timestamp: new Date().toISOString(),
        error: "missing_session_id",
      },
    };
  }

  const poll = await pollUntilComplete(
    config,
    virtualUserIndex,
    sessionId,
    generate.generationId,
  );
  return { generate, poll };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
