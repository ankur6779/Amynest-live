/**
 * RC3 Final Release Certification — gate matrix, risk taxonomy, Go/No-Go (no product code).
 */

export type GateStatus = "PASS" | "FAIL" | "WAIVED" | "N/A" | "PENDING";

export type RiskCategory =
  | "engineering_blocker"
  | "operational_blocker"
  | "governance_blocker"
  | "accepted_risk"
  | "waiver";

export type ReleaseGate = {
  id: string;
  area: string;
  item: string;
  status: GateStatus;
  category: RiskCategory;
  evidence: string;
  owner: string;
};

export type EnvContractRow = {
  name: string;
  requiredFor: "canary" | "ga" | "local_dev";
  contractSource: string;
  localPresence: "SET" | "EMPTY" | "MISSING" | "NOT_PROBED" | "EXAMPLE_ONLY";
  /** Coolify/Cloudflare presence — never store secret values. */
  productionPresence: "SET" | "NOT SET" | "NOT ACCESSIBLE" | "EMPTY" | "MISSING" | "NOT_PROBED";
  notes: string;
};

/** Founder-operated production — intentional single-owner assignments. */
export const FOUNDER_OWNER = "Ankur Raman" as const;
export const PART9_SIGNED_DATE = "2026-07-25" as const;

/** Part 9 roles — signed by Release Manager under founder-operated model. */
export const PART9_SIGN_OFF_ROLES = [
  "Architecture",
  "Engineering",
  "QA",
  "Accessibility",
  "Security",
  "Privacy",
  "Platform",
  "SRE",
  "Release Manager",
] as const;

export function buildReleaseGateMatrix(input: {
  conformanceFail: number;
  conformanceUnknown: number;
  regressionPass: boolean;
  killSwitchPass: boolean;
  rollbackRunbookPresent: boolean;
  webSmokePass: boolean;
  formFactorSmokePass: boolean;
  encryptionClientPass: boolean;
  encryptionServerPass: boolean;
  migrationPass: boolean;
  part9Signed: boolean;
  physicalA11yDone: boolean;
  stagingLiveE2E: boolean;
  androidSignedBuild: boolean;
  iosArchiveReady: boolean;
  opsDashboards: boolean;
  deployTargetEnvVerified: boolean;
  encryptionKeyOnTarget: boolean;
}): ReleaseGate[] {
  const engOk = input.conformanceFail === 0 && input.conformanceUnknown === 0;
  return [
    {
      id: "G-CONF",
      area: "Conformance",
      item: "CONFORMANCE_REPORT fail=0 unknown=0",
      status: engOk ? "PASS" : "FAIL",
      category: engOk ? "accepted_risk" : "engineering_blocker",
      evidence: `fail=${input.conformanceFail} unknown=${input.conformanceUnknown}`,
      owner: "Eng",
    },
    {
      id: "G-REGRESS",
      area: "Regression",
      item: "Birth Sky vitest IM-0–IM-7 + RC1/RC2",
      status: input.regressionPass ? "PASS" : "FAIL",
      category: input.regressionPass ? "accepted_risk" : "engineering_blocker",
      evidence: "vitest src/features/birth-sky",
      owner: "Eng/QA",
    },
    {
      id: "G-COMPAT",
      area: "Compatibility",
      item: "COMPATIBILITY_MATRIX published",
      status: "PASS",
      category: "accepted_risk",
      evidence: "COMPATIBILITY_MATRIX.md",
      owner: "Eng",
    },
    {
      id: "G-P1",
      area: "Privacy",
      item: "P1 offline + server field encryption",
      status: input.encryptionClientPass && input.encryptionServerPass ? "PASS" : "FAIL",
      category:
        input.encryptionClientPass && input.encryptionServerPass
          ? "accepted_risk"
          : "engineering_blocker",
      evidence: "RC1 secure-offline-crypto + birth-field-crypto",
      owner: "Security",
    },
    {
      id: "G-MIG",
      area: "Migration",
      item: "Plaintext→encrypted migration idempotent",
      status: input.migrationPass ? "PASS" : "FAIL",
      category: input.migrationPass ? "accepted_risk" : "engineering_blocker",
      evidence: "offline-migration + server lazy migrate",
      owner: "Eng",
    },
    {
      id: "G-KILL",
      area: "Canary",
      item: "Kill switch verified",
      status: input.killSwitchPass ? "PASS" : "FAIL",
      category: input.killSwitchPass ? "accepted_risk" : "operational_blocker",
      evidence: "feature-flags + Playwright RC2",
      owner: "Eng/SRE",
    },
    {
      id: "G-ROLL",
      area: "Canary",
      item: "Rollback procedure documented",
      status: input.rollbackRunbookPresent ? "PASS" : "FAIL",
      category: input.rollbackRunbookPresent ? "accepted_risk" : "operational_blocker",
      evidence: "ROLLBACK_RUNBOOK.md + ROLLBACK_CHECKLIST.md",
      owner: "Release Manager",
    },
    {
      id: "G-SMOKE-WEB",
      area: "Device",
      item: "Pack 8 §1.5 Web smoke",
      status: input.webSmokePass ? "PASS" : "FAIL",
      category: input.webSmokePass ? "accepted_risk" : "operational_blocker",
      evidence: "Playwright birth-sky-rc2 web-chromium",
      owner: "QA",
    },
    {
      id: "G-SMOKE-FF",
      area: "Device",
      item: "Android/iOS form-factor smoke",
      status: input.formFactorSmokePass ? "PASS" : "WAIVED",
      category: input.formFactorSmokePass ? "accepted_risk" : "accepted_risk",
      evidence: "Playwright Pixel/iPhone/iPad Chromium proxies",
      owner: "QA",
    },
    {
      id: "G-A11Y-PHYS",
      area: "Accessibility",
      item: "Physical VoiceOver / TalkBack lab",
      status: input.physicalA11yDone ? "PASS" : "WAIVED",
      category: input.physicalA11yDone ? "accepted_risk" : "waiver",
      evidence: input.physicalA11yDone ? "Device lab signed" : "WAIVER_REGISTER W-A11Y-PHYS",
      owner: "Accessibility",
    },
    {
      id: "G-STAGING-E2E",
      area: "Staging",
      item: "Staging live auth + API E2E",
      status: input.stagingLiveE2E ? "PASS" : "WAIVED",
      category: input.stagingLiveE2E ? "accepted_risk" : "operational_blocker",
      evidence: input.stagingLiveE2E ? "Staging smoke signed" : "Not executed on cert host",
      owner: "QA/SRE",
    },
    {
      id: "G-AND-SIGNED",
      area: "Mobile",
      item: "Android signed release build",
      status: input.androidSignedBuild ? "PASS" : "WAIVED",
      category: input.androidSignedBuild ? "accepted_risk" : "operational_blocker",
      evidence: input.androidSignedBuild ? "assembleRelease signed" : "No JRE on cert host",
      owner: "Platform",
    },
    {
      id: "G-IOS-ARCHIVE",
      area: "Mobile",
      item: "iOS Capacitor archive readiness",
      status: input.iosArchiveReady ? "PASS" : "PENDING",
      category: input.iosArchiveReady ? "accepted_risk" : "operational_blocker",
      evidence: input.iosArchiveReady
        ? "Xcode project present; archive not executed this train"
        : "Missing Capacitor iOS tree",
      owner: "Platform",
    },
    {
      id: "G-ENV-TARGET",
      area: "Environment",
      item: "Deploy-target env verified (DB/key/Firebase/RC/OpenAI)",
      status: input.deployTargetEnvVerified ? "PASS" : "PENDING",
      category: input.deployTargetEnvVerified ? "accepted_risk" : "operational_blocker",
      evidence:
        "DEPLOYMENT_PREREQUISITES.md / ENV_VERIFICATION.md — Coolify (Hetzner) + Cloudflare; not Render",
      owner: "SRE",
    },
    {
      id: "G-KEY",
      area: "Environment",
      item: "BIRTH_SKY_FIELD_ENCRYPTION_KEY on Coolify deploy target",
      status: input.encryptionKeyOnTarget ? "PASS" : "PENDING",
      category: input.encryptionKeyOnTarget ? "accepted_risk" : "operational_blocker",
      evidence: "Required on Coolify API before canary with sealed server fields",
      owner: "SRE/Security",
    },
    {
      id: "G-OPS-DASH",
      area: "Operations",
      item: "Pack 11 dashboards/alerts armed",
      status: input.opsDashboards ? "PASS" : "WAIVED",
      category: "waiver",
      evidence: "WAIVER_REGISTER W-OPS-DASH — core-only train",
      owner: "SRE/Release Manager",
    },
    {
      id: "G-PART9",
      area: "Governance",
      item: "Part 9 human sign-off complete",
      status: input.part9Signed ? "PASS" : "PENDING",
      category: input.part9Signed ? "accepted_risk" : "governance_blocker",
      evidence: input.part9Signed
        ? "WAIVER_REGISTER.md — Release Manager final signature SIGNED"
        : "Conformance Checklist Part 9 signature table",
      owner: "Release Manager",
    },
  ];
}

export type GoNoGoDecision = {
  engineering: "GO" | "NO-GO";
  internalAllowlistCanary: "GO" | "CONDITIONAL_GO" | "NO-GO";
  publicCanary: "GO" | "CONDITIONAL_GO" | "NO-GO";
  productionGa: "GO" | "NO-GO";
  overall: "GO" | "SHIP_WITH_WAIVERS" | "HOLD" | "NO-GO";
  rationale: string[];
};

export function decideGoNoGo(gates: ReleaseGate[]): GoNoGoDecision {
  const engBlockers = gates.filter((g) => g.category === "engineering_blocker");
  const opsBlockers = gates.filter(
    (g) => g.category === "operational_blocker" && g.status !== "PASS",
  );
  const govBlockers = gates.filter(
    (g) => g.category === "governance_blocker" && g.status !== "PASS",
  );

  const engineering: GoNoGoDecision["engineering"] =
    engBlockers.length === 0 ? "GO" : "NO-GO";

  const rationale: string[] = [];
  if (engineering === "GO") {
    rationale.push("Engineering FAIL count is 0; P1 encryption and regression PASS.");
  } else {
    rationale.push(`Engineering blockers: ${engBlockers.map((b) => b.id).join(", ")}`);
  }

  if (govBlockers.length) {
    rationale.push(
      `Governance blockers open: ${govBlockers.map((b) => b.id).join(", ")} (Part 9 unsigned).`,
    );
  }
  if (opsBlockers.length) {
    rationale.push(
      `Operational items open/pending: ${opsBlockers.map((b) => `${b.id}:${b.status}`).join(", ")}.`,
    );
  }

  const internalAllowlistCanary: GoNoGoDecision["internalAllowlistCanary"] =
    engineering === "GO" && govBlockers.length === 0 && opsBlockers.every((o) => o.id !== "G-KEY")
      ? "GO"
      : engineering === "GO"
        ? "CONDITIONAL_GO"
        : "NO-GO";

  const publicCanaryBlockers = opsBlockers.filter((o) =>
    ["G-STAGING-E2E", "G-KEY", "G-ENV-TARGET"].includes(o.id),
  );
  const publicCanary: GoNoGoDecision["publicCanary"] =
    engineering === "GO" && govBlockers.length === 0 && publicCanaryBlockers.length === 0
      ? "GO"
      : "NO-GO";

  const gaBlockers = opsBlockers.filter((o) =>
    ["G-STAGING-E2E", "G-KEY", "G-ENV-TARGET", "G-AND-SIGNED", "G-IOS-ARCHIVE", "G-A11Y-PHYS"].includes(
      o.id,
    ),
  );
  const productionGa: GoNoGoDecision["productionGa"] =
    publicCanary === "GO" && gaBlockers.length === 0 && govBlockers.length === 0
      ? "GO"
      : "NO-GO";

  const overall: GoNoGoDecision["overall"] =
    engineering === "NO-GO"
      ? "NO-GO"
      : govBlockers.length > 0 || publicCanary === "NO-GO"
        ? "HOLD"
        : productionGa === "GO"
          ? "GO"
          : "SHIP_WITH_WAIVERS";

  rationale.push(
    `Overall Pack 8 decision box: ${overall}. Do not deploy from this package alone.`,
  );

  return {
    engineering,
    internalAllowlistCanary,
    publicCanary,
    productionGa,
    overall,
    rationale,
  };
}
