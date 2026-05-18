import { getApiUrl } from "@/lib/api";
import { getCrashLog } from "@/lib/crash-logger";

export type ClientLogType = "crash" | "slow_api" | "failed_routine" | "warning" | "info";

type LogPayload = {
  type: ClientLogType;
  message: string;
  context?: string;
  route?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pending: LogPayload[] = [];

export function queueClientLog(payload: LogPayload): void {
  pending.push(payload);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushClientLogs();
  }, 2000);
}

export async function flushClientLogs(
  authFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<void> {
  if (!authFetch || pending.length === 0) return;
  const batch = pending.splice(0, 8);
  for (const entry of batch) {
    try {
      await authFetch(getApiUrl("/api/logs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...entry,
          meta: {
            ...entry.meta,
            crashes: entry.type === "crash" ? getCrashLog().slice(-5) : undefined,
          },
        }),
      });
    } catch {
      /* best-effort telemetry */
    }
  }
}

export function reportSlowApi(path: string, durationMs: number): void {
  if (durationMs <= 3000) return;
  queueClientLog({
    type: "slow_api",
    message: `Slow API ${Math.round(durationMs)}ms`,
    route: path,
    durationMs,
  });
}

export function reportFailedRoutine(message: string, context?: string): void {
  queueClientLog({
    type: "failed_routine",
    message,
    context,
  });
}

export function reportCrashToBackend(message: string, context?: string): void {
  queueClientLog({
    type: "crash",
    message,
    context,
  });
}
