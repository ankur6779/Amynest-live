import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { runResilienceSweep } from "./resilience-recovery";

const SYNC_KEY = "amynest:learning-sync:v1";

describe("resilience-recovery learning-sync prune", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("keeps never-retried offline completions older than 30 minutes", () => {
    const oldAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    localStorage.setItem(
      SYNC_KEY,
      JSON.stringify({
        queue: [
          {
            clientId: `phonics-cvc@${oldAt}`,
            childId: 42,
            activityId: "phonics-cvc",
            section: "phonics",
            correct: true,
            at: oldAt,
            attempts: 0,
            nextAttemptAt: Date.now(),
          },
        ],
        recent: [],
        diag: {},
      }),
    );

    const report = runResilienceSweep();
    expect(report.removedStaleEntries).toBe(0);

    const persisted = JSON.parse(localStorage.getItem(SYNC_KEY) ?? "{}") as {
      queue: unknown[];
    };
    expect(persisted.queue).toHaveLength(1);
    expect((persisted.queue[0] as { clientId: string }).clientId).toContain(
      "phonics-cvc",
    );
  });

  it("still drops entries that already exhausted retries", () => {
    const at = new Date().toISOString();
    localStorage.setItem(
      SYNC_KEY,
      JSON.stringify({
        queue: [
          {
            clientId: `math-1@${at}`,
            childId: 1,
            activityId: "math-1",
            section: "math",
            correct: true,
            at,
            attempts: 8,
            nextAttemptAt: Date.now(),
          },
          {
            clientId: `math-2@${at}`,
            childId: 1,
            activityId: "math-2",
            section: "math",
            correct: true,
            at,
            attempts: 2,
            nextAttemptAt: Date.now(),
          },
        ],
        recent: [],
        diag: {},
      }),
    );

    const report = runResilienceSweep();
    expect(report.removedStaleEntries).toBe(1);

    const persisted = JSON.parse(localStorage.getItem(SYNC_KEY) ?? "{}") as {
      queue: Array<{ activityId: string }>;
    };
    expect(persisted.queue).toHaveLength(1);
    expect(persisted.queue[0]?.activityId).toBe("math-2");
  });
});
