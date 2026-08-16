import { describe, expect, it, vi } from "vitest";
import {
  amyAiLatencyMeta,
  finishAmyAiLatency,
  markAmyAiLatency,
  startAmyAiLatency,
} from "./amy-ai-latency";

const queueClientLog = vi.fn();

vi.mock("@/lib/client-logs", () => ({
  queueClientLog: (...args: unknown[]) => queueClientLog(...args),
}));

describe("amy-ai-latency", () => {
  it("records client timings without conversation content", () => {
    const trace = startAmyAiLatency();
    markAmyAiLatency(trace, "fetchStart");
    markAmyAiLatency(trace, "fetchEnd");
    markAmyAiLatency(trace, "pollStart");
    markAmyAiLatency(trace, "responseComplete");
    markAmyAiLatency(trace, "persistenceComplete");
    finishAmyAiLatency(trace, { ok: true, asyncJob: true });
    expect(queueClientLog).toHaveBeenCalledTimes(1);
    const payload = queueClientLog.mock.calls[0]?.[0] as {
      message: string;
      meta: Record<string, unknown>;
    };
    expect(payload.message).toBe("amy_ai_latency");
    expect(payload.meta.asyncJob).toBe(true);
    expect(payload.meta.ok).toBe(true);
    expect(JSON.stringify(payload)).not.toMatch(/Bedtime|John|sleep/i);
    const meta = amyAiLatencyMeta(trace);
    expect(typeof meta.totalMs).toBe("number");
  });
});
