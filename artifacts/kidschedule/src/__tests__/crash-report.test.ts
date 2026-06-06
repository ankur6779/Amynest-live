import { describe, it, expect } from "vitest";
import { fingerprintCrash } from "@/lib/crash-report";

describe("crash-report", () => {
  it("groups identical crashes by fingerprint", () => {
    const a = fingerprintCrash("Maximum update depth exceeded", "ChildForm", "Error: x\n at A");
    const b = fingerprintCrash("Maximum update depth exceeded", "ChildForm", "Error: x\n at A");
    const c = fingerprintCrash("Something else", "ChildForm", "Error: x\n at A");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
