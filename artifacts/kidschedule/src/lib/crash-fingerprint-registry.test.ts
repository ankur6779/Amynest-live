import { describe, it, expect, beforeEach } from "vitest";
import {
  recordCrashFingerprint,
  resetCrashFingerprintRegistry,
  shouldEmitErrorCaptured,
  stackTraceHash,
} from "@/lib/crash-fingerprint-registry";
import { buildCrashReport } from "@/lib/crash-report";

describe("crash-fingerprint-registry", () => {
  beforeEach(() => {
    resetCrashFingerprintRegistry();
  });

  it("tracks frequency and first/last seen", () => {
    const report = buildCrashReport({
      kind: "react.render",
      message: "Cannot read properties of undefined",
      component: "Phonics",
      stack: "Error: x\n at PhonicsLearning",
    });
    const first = recordCrashFingerprint(report, report.readableFingerprint);
    const second = recordCrashFingerprint(report, report.readableFingerprint);
    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(second.firstSeen).toBe(first.firstSeen);
    expect(new Date(second.lastSeen).getTime()).toBeGreaterThanOrEqual(
      new Date(first.firstSeen).getTime(),
    );
  });

  it("dedupes analytics emissions per fingerprint", () => {
    const fp = "fp_abc123";
    expect(shouldEmitErrorCaptured(fp)).toBe(true);
    expect(shouldEmitErrorCaptured(fp)).toBe(false);
  });

  it("stackTraceHash is stable", () => {
    const a = stackTraceHash("Error: test\n at Foo\n at Bar");
    const b = stackTraceHash("Error: test\n at Foo\n at Bar");
    expect(a).toBe(b);
  });
});
