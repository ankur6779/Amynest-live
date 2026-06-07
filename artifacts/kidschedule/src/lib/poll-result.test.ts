import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";
import { pollResult, PollTerminalError } from "./poll-result";

describe("pollResult terminal states", () => {
  it("stops on timed_out", async () => {
    const authFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "timed_out", error: "AI job timed out" }),
    })) as unknown as Parameters<typeof pollResult>[1];

    await assert.rejects(
      () => pollResult("job-1", authFetch, { maxAttempts: 1, intervalMs: 0 }),
      (err: unknown) => {
        assert.ok(err instanceof PollTerminalError);
        assert.equal(err.terminalStatus, "timed_out");
        return true;
      },
    );
    assert.equal(authFetch.mock.calls.length, 1);
  });

  it("stops on failed", async () => {
    const authFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "failed", error: "boom" }),
    })) as unknown as Parameters<typeof pollResult>[1];

    await assert.rejects(
      () => pollResult("job-2", authFetch, { maxAttempts: 1, intervalMs: 0 }),
      (err: unknown) => {
        assert.ok(err instanceof PollTerminalError);
        assert.equal(err.terminalStatus, "failed");
        return true;
      },
    );
  });

  it("stops on cancelled", async () => {
    const authFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "cancelled", error: "cancelled" }),
    })) as unknown as Parameters<typeof pollResult>[1];

    await assert.rejects(
      () => pollResult("job-3", authFetch, { maxAttempts: 1, intervalMs: 0 }),
      (err: unknown) => {
        assert.ok(err instanceof PollTerminalError);
        assert.equal(err.terminalStatus, "cancelled");
        return true;
      },
    );
  });

  it("returns result on completed", async () => {
    const authFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "completed", result: { ok: true, url: "/x" } }),
    })) as unknown as Parameters<typeof pollResult>[1];

    const result = await pollResult("job-4", authFetch, { maxAttempts: 1, intervalMs: 0 });
    assert.deepEqual(result, { ok: true, url: "/x" });
  });
});
