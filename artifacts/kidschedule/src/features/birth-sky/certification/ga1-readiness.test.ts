/**
 * GA1 — internal allowlist canary readiness after Coolify ops verification.
 */
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { writeGa1Documentation, BIRTH_SKY_GA1_CERT_BUILD } from "./write-ga1-docs";
import {
  writeOpsVerificationPackage,
  FOUNDER_OWNER,
} from "./write-ops-verification";
import { writeRc3Documentation } from "./write-rc3-docs";

const OUT_DIR = join(__dirname, "../../../../certification/birth-sky");

const GA1_FILES = [
  "GA1_DEPLOYMENT_PREREQUISITES.md",
  "GA1_MIGRATION_READINESS.md",
  "GA1_CANARY_VALIDATION.md",
  "GA1_OWNERSHIP_MATRIX.md",
  "GA1_READINESS_REPORT.md",
  "GA1_SUMMARY.json",
] as const;

describe("GA1 deployment readiness", () => {
  it("classifies Coolify prereqs and marks internal allowlist GO", () => {
    writeRc3Documentation(OUT_DIR);
    writeGa1Documentation(OUT_DIR);
    writeOpsVerificationPackage(OUT_DIR);

    expect(BIRTH_SKY_GA1_CERT_BUILD).toBe("birth_sky_ga1_readiness/1.0.0");
    for (const f of GA1_FILES) {
      expect(existsSync(join(OUT_DIR, f))).toBe(true);
    }

    const summary = JSON.parse(readFileSync(join(OUT_DIR, "GA1_SUMMARY.json"), "utf8")) as {
      decision: { internalAllowlistCanary: string; overall: string; rollbackReadiness: string };
      prereqs: Array<{ id: string; status: string }>;
      ownership: Array<{ namedIndividual: string; status: string }>;
      migration: Array<{ id: string; status: string }>;
      topology?: { backend?: string };
    };

    expect(summary.topology?.backend).toMatch(/Coolify/);

    for (const p of summary.prereqs) {
      expect(["READY", "NOT_READY", "BLOCKED", "UNKNOWN"]).toContain(p.status);
    }
    for (const o of summary.ownership) {
      expect(o.namedIndividual).toBe(FOUNDER_OWNER);
      expect(o.status).toBe("READY");
    }

    expect(summary.prereqs.find((p) => p.id === "P-PART9")?.status).toBe("READY");
    expect(summary.prereqs.find((p) => p.id === "P-DB")?.status).toBe("READY");
    expect(summary.prereqs.find((p) => p.id === "P-SESSION")?.status).toBe("READY");
    expect(summary.prereqs.find((p) => p.id === "P-OPENAI")?.status).toBe("READY");
    expect(summary.prereqs.find((p) => p.id === "P-RC")?.status).toBe("READY");
    expect(summary.prereqs.find((p) => p.id === "P-KEY")?.status).toBe("READY");
    expect(summary.prereqs.find((p) => p.id === "P-FIREBASE")?.status).toBe("READY");
    expect(summary.prereqs.find((p) => p.id === "P-SCHEMA")?.status).toBe("READY");
    expect(summary.prereqs.find((p) => p.id === "P-FLAGS")?.status).toBe("READY");
    expect(summary.migration.find((m) => m.id === "M-EXEC")?.status).toBe("READY");

    expect(summary.decision.internalAllowlistCanary).toBe("GO");
    expect(summary.decision.overall).toBe("GO");
    expect(summary.decision.rollbackReadiness).toBe("READY");

    const report = readFileSync(join(OUT_DIR, "GA1_READINESS_REPORT.md"), "utf8");
    expect(report).toMatch(/Coolify/);
    expect(report).toMatch(/Internal allowlist canary \| \*\*GO\*\*/);
    expect(report).toContain(FOUNDER_OWNER);
    expect(report).not.toMatch(/onrender\.com/);
    expect(report).not.toMatch(/PENDING_ASSIGNMENT/);
  });
});
