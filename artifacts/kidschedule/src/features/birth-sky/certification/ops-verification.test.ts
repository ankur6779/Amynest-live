/**
 * Operational verification — Coolify + Hetzner + Cloudflare. No deploy. No secrets.
 */
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  writeOpsVerificationPackage,
  BIRTH_SKY_OPS_VERIFY_BUILD,
  BIRTH_SKY_GA2_READINESS_BUILD,
  FOUNDER_OWNER,
  PROD_TOPOLOGY,
} from "./write-ops-verification";
import { writeRc3Documentation } from "./write-rc3-docs";

const OUT_DIR = join(__dirname, "../../../../certification/birth-sky");

const OPS_FILES = [
  "ENV_VERIFICATION.md",
  "ENV_VERIFICATION.json",
  "OPERATIONAL_OWNERSHIP.md",
  "DEPLOYMENT_PREREQUISITES.md",
  "INFRASTRUCTURE.md",
  "GA1_SUMMARY.json",
  "GA1_READINESS_REPORT.md",
  "GA2_READINESS_REPORT.md",
  "GA2_SUMMARY.json",
  "GA1_BLOCKER_REEVAL.md",
] as const;

describe("Birth Sky operational verification (Coolify)", () => {
  it("probes Coolify presence-only, strips Render assumptions, GA2 GO for internal allowlist", () => {
    writeRc3Documentation(OUT_DIR);
    const result = writeOpsVerificationPackage(OUT_DIR);

    expect(BIRTH_SKY_OPS_VERIFY_BUILD).toBe("birth_sky_ops_verify/1.0.0");
    expect(BIRTH_SKY_GA2_READINESS_BUILD).toBe("birth_sky_ga2_readiness/1.0.0");
    expect(PROD_TOPOLOGY.backend).toMatch(/Coolify/);
    expect(PROD_TOPOLOGY.staticFrontend).toMatch(/Cloudflare/);
    expect(PROD_TOPOLOGY.aiWorker).toMatch(/Hetzner/);

    for (const f of OPS_FILES) {
      expect(existsSync(join(OUT_DIR, f))).toBe(true);
    }

    for (const row of result.env) {
      expect(["SET", "NOT SET", "NOT ACCESSIBLE"]).toContain(row.presence);
      expect(row.evidence).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
      expect(row.evidence).not.toMatch(/-----BEGIN/);
    }

    expect(result.env.find((e) => e.id === "E-DB")?.presence).toBe("SET");
    expect(result.env.find((e) => e.id === "E-SESSION")?.presence).toBe("SET");
    expect(result.env.find((e) => e.id === "E-OPENAI")?.presence).toBe("SET");
    expect(result.env.find((e) => e.id === "E-RC")?.presence).toBe("SET");
    expect(result.env.find((e) => e.id === "E-KEY")?.presence).toBe("SET");
    expect(result.env.find((e) => e.id === "E-FIREBASE")?.presence).toBe("SET");
    expect(result.env.find((e) => e.id === "E-FIREBASE-API")?.presence).toBe("SET");
    expect(result.ga2Decision).toBe("GO");

    expect(result.infra.find((h) => h.id === "H-BACKEND")?.status).toBe("PASS");
    expect(result.infra.find((h) => h.id === "H-WORKER")?.status).toBe("PASS");
    expect(result.infra.find((h) => h.id === "H-SCHEMA")?.status).toBe("PASS");
    expect(result.blockers.find((b) => b.id === "G-KEY")?.classification).toBe("PASS");
    expect(result.blockers.find((b) => b.id === "G-PART9")?.classification).toBe("PASS");
    expect(result.blockers.find((b) => b.id === "G-OWNERS")?.classification).toBe("PASS");
    expect(result.blockers.find((b) => b.id === "G-FIREBASE-WEB")?.classification).toBe(
      "PASS",
    );
    expect(result.blockers.find((b) => b.id === "G-SCHEMA")?.classification).toBe("PASS");

    expect(existsSync(join(OUT_DIR, "SCHEMA_ROOT_CAUSE.md"))).toBe(true);
    expect(existsSync(join(OUT_DIR, "MIGRATION_PLAN.md"))).toBe(true);
    expect(readFileSync(join(OUT_DIR, "SCHEMA_ROOT_CAUSE.md"), "utf8")).toMatch(
      /6\/6 PRESENT|additive SQL/i,
    );

    const ownership = readFileSync(join(OUT_DIR, "OPERATIONAL_OWNERSHIP.md"), "utf8");
    expect(ownership).toContain(FOUNDER_OWNER);
    expect(ownership).not.toMatch(/PENDING_ASSIGNMENT/);

    const waivers = readFileSync(join(OUT_DIR, "WAIVER_REGISTER.md"), "utf8");
    expect(waivers).toMatch(/Release Manager final signature:\*\* SIGNED/);
    expect(waivers).toContain(FOUNDER_OWNER);

    const goNoGo = readFileSync(join(OUT_DIR, "GO_NO_GO.md"), "utf8");
    expect(goNoGo).toMatch(/Internal allowlist canary \| \*\*GO\*\*/);
    expect(goNoGo).toMatch(/Public canary \(0\.5–5%\) \| \*\*NO-GO\*\*/);
    expect(goNoGo).toMatch(/Production GA \| \*\*NO-GO\*\*/);

    const prereq = readFileSync(join(OUT_DIR, "DEPLOYMENT_PREREQUISITES.md"), "utf8");
    expect(prereq).toMatch(/Coolify/);
    expect(prereq).toMatch(/Hetzner/);
    expect(prereq).toMatch(/Cloudflare/);
    expect(prereq).not.toMatch(/onrender\.com/);
    expect(prereq).not.toMatch(/Amynest-backend-dykj/);
    expect(prereq).not.toMatch(/render\.yaml/);

    const envMd = readFileSync(join(OUT_DIR, "ENV_VERIFICATION.md"), "utf8");
    expect(envMd).toMatch(/Render is not part of production/);

    const ga2 = readFileSync(join(OUT_DIR, "GA2_READINESS_REPORT.md"), "utf8");
    expect(ga2).toMatch(/GA2 \(internal allowlist execution readiness\) \| \*\*GO\*\*/);
    expect(ga2).toMatch(/Internal allowlist canary approval \| \*\*GO\*\*/);
    expect(ga2).toMatch(/Public canary \/ Production GA \| \*\*NO-GO\*\*/);
    expect(ga2).not.toMatch(/onrender\.com/);
  });
});
