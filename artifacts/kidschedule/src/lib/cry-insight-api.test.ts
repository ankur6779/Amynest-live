import { describe, expect, it, vi } from "vitest";
import {
  cryInsightErrorDescription,
  fetchCryInsightHistory,
  postCryInsightAnalyze,
  type CrySession,
} from "./cry-insight-api";

const mockSession: CrySession = {
  id: 1,
  childId: 42,
  durationMs: 5000,
  audioStats: {},
  context: { ageMonths: 6 },
  primary: { cause: "hunger", confidence: 72 },
  secondary: { cause: "sleepy", confidence: 18 },
  suggestion: "Try a feed.",
  medicalFlag: false,
  createdAt: new Date().toISOString(),
};

describe("cryInsightErrorDescription", () => {
  it("maps 401 to a sign-in prompt", () => {
    expect(cryInsightErrorDescription(401, { error: "Unauthorized" })).toBe(
      "Session expired. Please sign in again.",
    );
  });

  it("maps missing-token 401 from authFetch", () => {
    expect(cryInsightErrorDescription(401, { error: "Unauthorized" })).toContain(
      "sign in",
    );
  });

  it("surfaces other server errors", () => {
    expect(
      cryInsightErrorDescription(404, {
        error: "child_not_found",
        message: "Child not found or you do not have access.",
      }),
    ).toBe("Child not found or you do not have access.");
  });
});

describe("postCryInsightAnalyze", () => {
  it("succeeds when authFetch returns ok", async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, session: mockSession }),
    });

    const result = await postCryInsightAnalyze(authFetch, {
      childId: 42,
      durationMs: 0,
      audioStats: {},
      context: { ageMonths: 6 },
      language: "en",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.id).toBe(1);
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/cry-insight/analyze"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns 401 when bearer token is missing or expired", async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    const result = await postCryInsightAnalyze(authFetch, {
      childId: 42,
      durationMs: 0,
      audioStats: {},
      context: {},
      language: "en",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(cryInsightErrorDescription(result.status, result.data)).toContain(
        "sign in",
      );
    }
  });
});

describe("fetchCryInsightHistory", () => {
  it("uses authenticated fetch for history", async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, sessions: [mockSession] }),
    });

    const outcome = await fetchCryInsightHistory(authFetch, 42);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.sessions).toHaveLength(1);
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/cry-insight/history/42"),
    );
  });

  it("returns auth error instead of silently empty history", async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized", message: "Authentication required. Please sign in again." }),
    });

    const outcome = await fetchCryInsightHistory(authFetch, 42);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.status).toBe(401);
      expect(cryInsightErrorDescription(outcome.status, outcome.data)).toContain("sign in");
    }
  });
});
