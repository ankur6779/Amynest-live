import { describe, expect, it, beforeEach } from "vitest";
import {
  CONNECTION_TRACE_TAGS,
  evaluateConnectionTrace,
  verificationTrace,
  type VerificationTraceEntry,
} from "./verification-trace";

describe("verification trace", () => {
  beforeEach(() => {
    window.__SPEECH_COACH_V2_TRACE__ = [];
  });

  it("records timestamped entries with required tags", () => {
    for (const tag of CONNECTION_TRACE_TAGS) {
      verificationTrace(tag);
    }
    const result = evaluateConnectionTrace(window.__SPEECH_COACH_V2_TRACE__ ?? []);
    expect(result.pass).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.ordered).toHaveLength(CONNECTION_TRACE_TAGS.length);
    for (let i = 1; i < result.ordered.length; i += 1) {
      expect(result.ordered[i].ts).toBeGreaterThanOrEqual(result.ordered[i - 1].ts);
    }
  });

  it("fails when any connection step is missing", () => {
    const partial: VerificationTraceEntry[] = [
      { tag: "MIC_REQUEST_START", ts: 1, iso: "", platform: "test" },
      { tag: "TOKEN_MINTED", ts: 2, iso: "", platform: "test" },
    ];
    const result = evaluateConnectionTrace(partial);
    expect(result.pass).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
