import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildReadableFingerprint,
  captureCrashIntelligence,
  getFingerprintCounts,
} from "@/lib/self-healing/crash-intelligence";
import {
  isFeatureMitigated,
  recordFingerprintSpike,
  resetFeatureMitigationForTests,
} from "@/lib/self-healing/feature-mitigation";
import {
  isRouteQuarantined,
  quarantineRoute,
  clearRouteQuarantine,
} from "@/lib/self-healing/route-quarantine";
import { getRecoveryStats, recordRecoveryEvent } from "@/lib/self-healing/recovery-stats";

describe("self-healing", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    vi.stubGlobal("window", {
      location: { pathname: "/children/42" },
      navigator: { userAgent: "Test" },
    });
    resetFeatureMitigationForTests();
    clearRouteQuarantine();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds readable fingerprint ChildForm|MaximumDepth|InfantEffect", () => {
    expect(
      buildReadableFingerprint(
        "ChildForm",
        "Maximum update depth exceeded",
        "InfantEffect",
      ),
    ).toBe("ChildForm|MaximumDepth|InfantEffect");
  });

  it("captures crash intelligence with route and fingerprint counts", () => {
    captureCrashIntelligence({
      kind: "react.render",
      message: "Maximum update depth exceeded",
      component: "ChildForm",
      componentStack: "at ChildForm",
    });
    const counts = getFingerprintCounts();
    expect(Object.keys(counts).length).toBeGreaterThan(0);
  });

  it("mitigates feature after 5 spikes in window", () => {
    const fp = "ChildForm|MaximumDepth|InfantEffect";
    for (let i = 0; i < 4; i++) {
      expect(recordFingerprintSpike(fp)).toBeNull();
    }
    expect(recordFingerprintSpike(fp)).toBe("child-form-infant-normalize");
    expect(isFeatureMitigated("child-form-infant-normalize")).toBe(true);
  });

  it("quarantines route for session", () => {
    quarantineRoute("ChildForm", "ChildForm|MaximumDepth");
    expect(isRouteQuarantined("ChildForm")).toBe(true);
  });

  it("tracks recovery success rate", () => {
    recordRecoveryEvent({ level: 1, outcome: "auto_recovered", component: "ChildForm" });
    recordRecoveryEvent({ level: 1, outcome: "auto_recovered", component: "Dashboard" });
    recordRecoveryEvent({ level: 1, outcome: "manual_required", component: "Routine" });
    const stats = getRecoveryStats();
    expect(stats.total).toBe(3);
    expect(stats.autoRecovered).toBe(2);
    expect(stats.successRate).toBe(67);
  });
});
