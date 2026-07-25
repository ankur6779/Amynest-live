/**
 * RC3 Final Release Certification — aggregation + Go/No-Go package.
 */
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { writeRc3Documentation } from "./write-rc3-docs";
import { BIRTH_SKY_CERT_APP_BUILD } from "./version-registry";
import { decideGoNoGo, buildReleaseGateMatrix } from "./rc3-release-gates";

const OUT_DIR = join(__dirname, "../../../../certification/birth-sky");

const RC3_FILES = [
  "GA_READINESS_REPORT.md",
  "GO_NO_GO.md",
  "WAIVER_REGISTER.md",
  "CANARY_PLAN.md",
  "ROLLBACK_CHECKLIST.md",
  "DEPLOYMENT_PREREQUISITES.md",
  "FINAL_RELEASE_SUMMARY.md",
  "RC3_SUMMARY.json",
] as const;

describe("RC3 final release certification", () => {
  it("aggregates gates, keeps unknown=0, writes Go/No-Go package", () => {
    const result = writeRc3Documentation(OUT_DIR);

    expect(BIRTH_SKY_CERT_APP_BUILD).toBe("birth_sky_rc3/1.0.0");
    expect(result.unknownCount).toBe(0);
    expect(result.decision.engineering).toBe("GO");
    expect(result.decision.internalAllowlistCanary).toBe("GO");
    expect(result.decision.productionGa).toBe("NO-GO");
    expect(result.decision.publicCanary).toBe("NO-GO");
    expect(["HOLD", "NO-GO", "SHIP_WITH_WAIVERS"]).toContain(result.decision.overall);
    expect(result.gates.find((g) => g.id === "G-PART9")?.status).toBe("PASS");

    for (const f of RC3_FILES) {
      expect(existsSync(join(OUT_DIR, f))).toBe(true);
    }

    for (const g of result.gates) {
      expect(["PASS", "FAIL", "WAIVED", "N/A", "PENDING"]).toContain(g.status);
      expect([
        "engineering_blocker",
        "operational_blocker",
        "governance_blocker",
        "accepted_risk",
        "waiver",
      ]).toContain(g.category);
    }

    const categorized = result.gates.every((g) => g.category.length > 0);
    expect(categorized).toBe(true);

    const go = readFileSync(join(OUT_DIR, "GO_NO_GO.md"), "utf8");
    expect(go).toMatch(/Internal allowlist canary \| \*\*GO\*\*/);
    expect(go).toMatch(/Public canary \(0\.5–5%\) \| \*\*NO-GO\*\*/);
    expect(go).toMatch(/Production GA \| \*\*NO-GO\*\*/);

    const waivers = readFileSync(join(OUT_DIR, "WAIVER_REGISTER.md"), "utf8");
    expect(waivers).toMatch(/W-A11Y-PHYS/);
    expect(waivers).toMatch(/Release Manager final signature:\*\* SIGNED/);
    expect(waivers).not.toMatch(/Release Manager final signature:\*\* PENDING/);

    const prereq = readFileSync(join(OUT_DIR, "DEPLOYMENT_PREREQUISITES.md"), "utf8");
    expect(prereq).toMatch(/BIRTH_SKY_FIELD_ENCRYPTION_KEY/);
    expect(prereq).toMatch(/Coolify/);
    expect(prereq).not.toMatch(/Production \(Render\)/);
    expect(prereq).not.toMatch(/onrender\.com/);

    // Sanity: decideGoNoGo with all PASS yields GO path for engineering
    const optimistic = decideGoNoGo(
      buildReleaseGateMatrix({
        conformanceFail: 0,
        conformanceUnknown: 0,
        regressionPass: true,
        killSwitchPass: true,
        rollbackRunbookPresent: true,
        webSmokePass: true,
        formFactorSmokePass: true,
        encryptionClientPass: true,
        encryptionServerPass: true,
        migrationPass: true,
        part9Signed: true,
        physicalA11yDone: true,
        stagingLiveE2E: true,
        androidSignedBuild: true,
        iosArchiveReady: true,
        opsDashboards: true,
        deployTargetEnvVerified: true,
        encryptionKeyOnTarget: true,
      }),
    );
    expect(optimistic.engineering).toBe("GO");
    expect(optimistic.productionGa).toBe("GO");
  });
});
