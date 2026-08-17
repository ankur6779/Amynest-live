import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";
import { pollResult, PollTerminalError, readAssistantAnswer } from "./poll-result";

function jsonResponse(body: unknown) {
  const payload = JSON.stringify(body);
  return {
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    text: async () => payload,
    json: async () => body,
  };
}

describe("pollResult terminal states", () => {
  it("stops on timed_out", async () => {
    const authFetch = vi.fn(async () =>
      jsonResponse({ status: "timed_out", error: "AI job timed out" }),
    ) as unknown as Parameters<typeof pollResult>[1];

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
    const authFetch = vi.fn(async () =>
      jsonResponse({ status: "failed", error: "boom" }),
    ) as unknown as Parameters<typeof pollResult>[1];

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
    const authFetch = vi.fn(async () =>
      jsonResponse({ status: "cancelled", error: "cancelled" }),
    ) as unknown as Parameters<typeof pollResult>[1];

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
    const authFetch = vi.fn(async () =>
      jsonResponse({ status: "completed", result: { ok: true, url: "/x" } }),
    ) as unknown as Parameters<typeof pollResult>[1];

    const result = await pollResult("job-4", authFetch, { maxAttempts: 1, intervalMs: 0 });
    assert.deepEqual(result, { ok: true, url: "/x" });
  });
});

describe("readAssistantAnswer", () => {
  it("prefers finalized answer over raw worker content", () => {
    assert.equal(readAssistantAnswer({ answer: "Try a wind-down.", content: "raw" }), "Try a wind-down.");
  });

  it("falls back to worker content when answer is missing", () => {
    assert.equal(readAssistantAnswer({ content: "Try a wind-down." }), "Try a wind-down.");
  });

  it("returns empty for missing payloads", () => {
    assert.equal(readAssistantAnswer(null), "");
    assert.equal(readAssistantAnswer({}), "");
    assert.equal(readAssistantAnswer({ answer: "  " }), "");
  });
});
