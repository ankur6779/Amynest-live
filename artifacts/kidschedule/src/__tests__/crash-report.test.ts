import { describe, it, expect } from "vitest";
import {
  buildCrashReport,
  fingerprintCrash,
  generateErrorReferenceId,
} from "@/lib/crash-report";

describe("crash-report", () => {
  it("groups identical crashes by fingerprint", () => {
    const a = fingerprintCrash("Maximum update depth exceeded", "ChildForm", "Error: x\n at A");
    const b = fingerprintCrash("Maximum update depth exceeded", "ChildForm", "Error: x\n at A");
    const c = fingerprintCrash("Something else", "ChildForm", "Error: x\n at A");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("generates ERR-YYYYMMDD-XXXXXX reference ids", () => {
    const id = generateErrorReferenceId();
    expect(id).toMatch(/^ERR-\d{8}-[A-Z0-9]{6}$/);
  });

  it("includes errorId and childId in report", () => {
    const report = buildCrashReport({
      kind: "react.render",
      message: "test",
      component: "ChildForm",
      childId: "child-42",
      errorId: "ERR-20260606-ABC123",
    });
    expect(report.errorId).toBe("ERR-20260606-ABC123");
    expect(report.childId).toBe("child-42");
  });
});
