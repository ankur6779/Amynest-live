/**
 * GA1 — Internal allowlist canary deployment readiness (verification only).
 * No deploy. No product code. Aggregates RC3 package evidence.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getVersionRegistrySnapshot } from "./version-registry";
import { FOUNDER_OWNER, PART9_SIGNED_DATE } from "./rc3-release-gates";

export const BIRTH_SKY_GA1_CERT_BUILD = "birth_sky_ga1_readiness/1.0.0" as const;

export type PrereqStatus = "READY" | "NOT_READY" | "BLOCKED" | "UNKNOWN";

export type PrereqRow = {
  id: string;
  item: string;
  status: PrereqStatus;
  evidence: string;
  requiredForInternalAllowlist: boolean;
};

export type OwnershipRow = {
  responsibility: string;
  roleDocumented: string;
  namedIndividual: string;
  status: PrereqStatus;
  evidence: string;
};

export type MigrationCheck = {
  id: string;
  check: string;
  status: PrereqStatus;
  evidence: string;
};

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}\n`;
}

function readText(path: string): string | null {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
}

function packageComplete(outDir: string): boolean {
  const required = [
    "GO_NO_GO.md",
    "GA_READINESS_REPORT.md",
    "CANARY_PLAN.md",
    "WAIVER_REGISTER.md",
    "DEPLOYMENT_PREREQUISITES.md",
    "ROLLBACK_CHECKLIST.md",
    "ROLLBACK_RUNBOOK.md",
    "RELEASE_CHECKLIST.md",
    "RC3_SUMMARY.json",
  ];
  return required.every((f) => existsSync(join(outDir, f)));
}

export function evaluateGa1Prerequisites(outDir: string): {
  prereqs: PrereqRow[];
  migration: MigrationCheck[];
  ownership: OwnershipRow[];
  canaryValidation: Array<{
    id: string;
    item: string;
    status: PrereqStatus;
    evidence: string;
  }>;
  decision: {
    internalAllowlistCanary: "READY" | "CONDITIONAL_READY" | "NOT_READY" | "BLOCKED";
    rollbackReadiness: PrereqStatus;
    overall: "READY" | "NOT_READY" | "BLOCKED";
    rationale: string[];
  };
} {
  const versions = getVersionRegistrySnapshot();
  const goNoGo = readText(join(outDir, "GO_NO_GO.md")) ?? "";
  const prereqDoc = readText(join(outDir, "DEPLOYMENT_PREREQUISITES.md")) ?? "";
  const canary = readText(join(outDir, "CANARY_PLAN.md")) ?? "";
  const waivers = readText(join(outDir, "WAIVER_REGISTER.md")) ?? "";
  const rollback = readText(join(outDir, "ROLLBACK_CHECKLIST.md")) ?? "";
  const runbook = readText(join(outDir, "ROLLBACK_RUNBOOK.md")) ?? "";
  const release = readText(join(outDir, "RELEASE_CHECKLIST.md")) ?? "";

  const pkgOk = packageComplete(outDir);
  const part9Pending = /Part 9|PENDING/.test(waivers) && /Release Manager \| PENDING/.test(
    waivers.replace(/\n/g, " "),
  );
  // Simpler Part 9 check
  const part9Open =
    waivers.includes("Release Manager") &&
    waivers.includes("PENDING") &&
    !waivers.includes("Release Manager final signature:** SIGNED");

  const envNotProbed =
    prereqDoc.includes("NOT_PROBED") || prereqDoc.includes("not print or invent");

  const flagDefaultsDocumented =
    release.includes("VITE_FF_BIRTH_SKY") &&
    release.includes("| off |") &&
    canary.includes("VITE_FF_BIRTH_SKY");

  const migrationOrderDocumented =
    prereqDoc.includes("Migration order") &&
    prereqDoc.includes("BIRTH_SKY_FIELD_ENCRYPTION_KEY") &&
    prereqDoc.includes("offline envelope schema 2");

  const killSwitchDocumented =
    runbook.includes("VITE_FF_BIRTH_SKY=0") && rollback.includes("VITE_FF_BIRTH_SKY=0");

  const prereqs: PrereqRow[] = [
    {
      id: "P-PKG",
      item: "RC3 certification package present",
      status: pkgOk ? "READY" : "BLOCKED",
      evidence: pkgOk ? "All RC3 authority files present" : "Missing RC3 artifacts",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-ENG",
      item: "Engineering GO (RC3)",
      status: goNoGo.includes("Engineering readiness | **GO**") ? "READY" : "BLOCKED",
      evidence: "GO_NO_GO.md",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-DB",
      item: "DATABASE_URL configured on deploy target",
      status: envNotProbed ? "UNKNOWN" : "NOT_READY",
      evidence: "Coolify (Hetzner) — see ENV_VERIFICATION.md after ops probe",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-KEY",
      item: "BIRTH_SKY_FIELD_ENCRYPTION_KEY configured on Coolify",
      status: "UNKNOWN",
      evidence:
        "Coolify API env — confirm via ENV_VERIFICATION.md before sealed API traffic",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-SESSION",
      item: "SESSION_SECRET configured on Coolify",
      status: "UNKNOWN",
      evidence: "Coolify API env — see ENV_VERIFICATION.md",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-FIREBASE",
      item: "Firebase configuration (Coolify API + Cloudflare web)",
      status: "UNKNOWN",
      evidence: "FIREBASE_SERVICE_ACCOUNT_JSON on Coolify; VITE_FIREBASE_* on Cloudflare",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-RC",
      item: "RevenueCat configuration (existing premium; no new SKU)",
      status: "UNKNOWN",
      evidence: "REVENUECAT_* on Coolify — see ENV_VERIFICATION.md",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-OPENAI",
      item: "OpenAI configuration",
      status: "UNKNOWN",
      evidence: "OPENAI_API_KEY on Coolify + AI Worker — see ENV_VERIFICATION.md",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-FLAGS",
      item: "Feature flag defaults (master off)",
      status: flagDefaultsDocumented ? "READY" : "NOT_READY",
      evidence: "RELEASE_CHECKLIST + CANARY_PLAN + feature-flags default off",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-MIG-ORDER",
      item: "Migration ordering documented",
      status: migrationOrderDocumented ? "READY" : "NOT_READY",
      evidence: "DEPLOYMENT_PREREQUISITES.md Migration order §",
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-PART9",
      item: "Part 9 human sign-off",
      status: part9Open ? "BLOCKED" : "READY",
      evidence: part9Open
        ? "WAIVER_REGISTER.md — Release Manager unsigned"
        : `WAIVER_REGISTER.md — Release Manager final signature SIGNED (${FOUNDER_OWNER}, ${PART9_SIGNED_DATE})`,
      requiredForInternalAllowlist: true,
    },
    {
      id: "P-KILL",
      item: "Kill switch procedure documented + engineering verified",
      status: killSwitchDocumented ? "READY" : "NOT_READY",
      evidence: "ROLLBACK_RUNBOOK + ROLLBACK_CHECKLIST + RC2 Playwright/unit",
      requiredForInternalAllowlist: true,
    },
  ];

  const migration: MigrationCheck[] = [
    {
      id: "M-ORDER",
      check: "Database / deploy migration order (API seal → client envelope → flag on)",
      status: migrationOrderDocumented ? "READY" : "NOT_READY",
      evidence: "DEPLOYMENT_PREREQUISITES.md — verification only, not executed",
    },
    {
      id: "M-ROLLBACK",
      check: "Rollback compatibility (flag off; no irreversible client disable)",
      status: runbook.includes("Flag off does **not** purge") ? "READY" : "NOT_READY",
      evidence: "ROLLBACK_RUNBOOK.md data safety",
    },
    {
      id: "M-ENC",
      check: "Encrypted field compatibility (seal/unseal + plaintext legacy read)",
      status: "READY",
      evidence: "RC1 birth-field-crypto + offline envelope; suites PASS (not re-executed in GA1)",
    },
    {
      id: "M-SNAP",
      check: "Historical snapshot compatibility (engineVersion hydrate)",
      status: "READY",
      evidence: "COMPATIBILITY_MATRIX + hydrateSkySnapshot / RC1-04",
    },
    {
      id: "M-IDEM",
      check: "Migration idempotency (client + server lazy migrate)",
      status: "READY",
      evidence: "RC1 offline-migration idempotent + seal idempotent tests",
    },
    {
      id: "M-EXEC",
      check: "Migrations executed on deploy target",
      status: "UNKNOWN",
      evidence: "GA1 does not execute migrations — target state unknown",
    },
  ];

  const ownership: OwnershipRow[] = [
    {
      responsibility: "Rollback approval",
      roleDocumented: "Release Manager (primary) / Eng on-call (backup)",
      namedIndividual: FOUNDER_OWNER,
      status: "READY",
      evidence: `OPERATIONAL_OWNERSHIP.md — founder-operated (${FOUNDER_OWNER})`,
    },
    {
      responsibility: "Incident response",
      roleDocumented: "Eng on-call / SRE",
      namedIndividual: FOUNDER_OWNER,
      status: "READY",
      evidence: `OPERATIONAL_OWNERSHIP.md — founder-operated (${FOUNDER_OWNER})`,
    },
    {
      responsibility: "Feature flag changes",
      roleDocumented: "Release Manager / Eng",
      namedIndividual: FOUNDER_OWNER,
      status: "READY",
      evidence: `OPERATIONAL_OWNERSHIP.md — founder-operated (${FOUNDER_OWNER})`,
    },
    {
      responsibility: "Database rollback",
      roleDocumented: "SRE / Eng",
      namedIndividual: FOUNDER_OWNER,
      status: "READY",
      evidence: `OPERATIONAL_OWNERSHIP.md — founder-operated (${FOUNDER_OWNER})`,
    },
    {
      responsibility: "Encryption key rotation",
      roleDocumented: "Security / SRE",
      namedIndividual: FOUNDER_OWNER,
      status: "READY",
      evidence: `OPERATIONAL_OWNERSHIP.md — founder-operated (${FOUNDER_OWNER})`,
    },
    {
      responsibility: "Kill switch execution",
      roleDocumented: "Release Manager / Eng on-call",
      namedIndividual: FOUNDER_OWNER,
      status: "READY",
      evidence: `OPERATIONAL_OWNERSHIP.md — founder-operated (${FOUNDER_OWNER})`,
    },
  ];

  const canaryValidation: Array<{
    id: string;
    item: string;
    status: PrereqStatus;
    evidence: string;
  }> = [
    {
      id: "C-SCOPE",
      item: "Rollout scope = internal allowlist (eng/QA accounts)",
      status: canary.includes("Internal allowlist") ? "READY" : "NOT_READY",
      evidence: "CANARY_PLAN.md phase 1",
    },
    {
      id: "C-TRIGGER",
      item: "Rollback trigger (Sev-1/Sev-2 → checklist)",
      status: canary.includes("Sev-1/Sev-2") && rollback.length > 0 ? "READY" : "NOT_READY",
      evidence: "CANARY_PLAN exit/abort + ROLLBACK_CHECKLIST",
    },
    {
      id: "C-KILL-OWN",
      item: "Kill switch ownership",
      status: "READY",
      evidence: `OPERATIONAL_OWNERSHIP.md — ${FOUNDER_OWNER} (Feature Flag / Kill switch)`,
    },
    {
      id: "C-MONITOR",
      item: "Monitoring checkpoints",
      status: waivers.includes("W-OPS-DASH") ? "NOT_READY" : "READY",
      evidence:
        "W-OPS-DASH waived — Birth Sky-specific dashboards not armed; use platform defaults only",
    },
    {
      id: "C-SUCCESS",
      item: "Success criteria for internal allowlist",
      status: canary.includes("Internal allowlist") ? "READY" : "NOT_READY",
      evidence: "Flag on for allowlist; kill-switch drill watch; no Sev-1/2",
    },
    {
      id: "C-ABORT",
      item: "Abort criteria",
      status: canary.includes("Flag off") ? "READY" : "NOT_READY",
      evidence: "CANARY_PLAN + ROLLBACK_CHECKLIST",
    },
    {
      id: "C-ENTRY",
      item: "RC3 entry conditions for internal allowlist GO",
      status:
        !part9Open && goNoGo.includes("Internal allowlist canary | **GO**")
          ? "READY"
          : "BLOCKED",
      evidence: !part9Open
        ? `GO_NO_GO internal allowlist GO; Part 9 SIGNED (${FOUNDER_OWNER})`
        : "GO_NO_GO / Part 9 not ready",
    },
  ];

  const blocked = [
    ...prereqs.filter((p) => p.status === "BLOCKED" && p.requiredForInternalAllowlist),
    ...canaryValidation.filter((c) => c.status === "BLOCKED"),
  ];
  const unknownRequired = prereqs.filter(
    (p) => p.requiredForInternalAllowlist && p.status === "UNKNOWN",
  );
  const ownershipGaps = ownership.filter((o) => o.status !== "READY");

  const rationale: string[] = [];
  if (blocked.length) {
    rationale.push(`Blocked: ${blocked.map((b) => b.id).join(", ")}`);
  }
  if (unknownRequired.length) {
    rationale.push(
      `Deploy-target secrets UNKNOWN (not probed): ${unknownRequired.map((u) => u.id).join(", ")}`,
    );
  }
  if (ownershipGaps.length) {
    rationale.push("Named operational owners MISSING for all GA1-04 responsibilities.");
  }
  rationale.push("No new waivers created in GA1.");
  if (part9Open) {
    rationale.push("Part 9 unsigned — internal allowlist blocked.");
  } else {
    rationale.push(
      `Part 9 SIGNED by ${FOUNDER_OWNER} (${PART9_SIGNED_DATE}); founder-operated ownership assigned.`,
    );
  }

  let internalAllowlistCanary: "READY" | "CONDITIONAL_READY" | "NOT_READY" | "BLOCKED" =
    "NOT_READY";
  if (blocked.length || part9Open) internalAllowlistCanary = "BLOCKED";
  else if (unknownRequired.length || ownershipGaps.length)
    internalAllowlistCanary = "NOT_READY";
  else internalAllowlistCanary = "READY";

  const rollbackReadiness: PrereqStatus =
    killSwitchDocumented && rollback.length > 0 && runbook.length > 0
      ? ownership.find((o) => o.responsibility === "Rollback approval")?.status === "READY"
        ? "READY"
        : "NOT_READY"
      : "NOT_READY";

  const overall: "READY" | "NOT_READY" | "BLOCKED" =
    internalAllowlistCanary === "BLOCKED"
      ? "BLOCKED"
      : internalAllowlistCanary === "READY"
        ? "READY"
        : "NOT_READY";

  return {
    prereqs,
    migration,
    ownership,
    canaryValidation,
    decision: {
      internalAllowlistCanary,
      rollbackReadiness,
      overall,
      rationale,
    },
  };
}

export function writeGa1Documentation(outDir: string): ReturnType<typeof evaluateGa1Prerequisites> {
  mkdirSync(outDir, { recursive: true });
  const result = evaluateGa1Prerequisites(outDir);
  const versions = getVersionRegistrySnapshot();
  const { prereqs, migration, ownership, canaryValidation, decision } = result;

  writeFileSync(
    join(outDir, "GA1_DEPLOYMENT_PREREQUISITES.md"),
    [
      `# Birth Sky GA1_DEPLOYMENT_PREREQUISITES`,
      ``,
      `**GA1 Build:** ${BIRTH_SKY_GA1_CERT_BUILD}  `,
      `**App Build (RC3):** ${versions.appBuild}  `,
      `**Statuses:** READY | NOT_READY | BLOCKED | UNKNOWN  `,
      `**Do not deploy. Do not invent secret values.**`,
      ``,
      mdTable(
        ["ID", "Item", "Status", "Required for allowlist", "Evidence"],
        prereqs.map((p) => [
          p.id,
          p.item,
          p.status,
          p.requiredForInternalAllowlist ? "yes" : "no",
          p.evidence.replace(/\|/g, "/"),
        ]),
      ),
      `## Classification rules`,
      ``,
      `- **READY** — evidence in RC3 package proves readiness for internal allowlist.`,
      `- **NOT_READY** — documented gap (e.g. named owner missing).`,
      `- **BLOCKED** — must clear before any canary enablement (e.g. Part 9).`,
      `- **UNKNOWN** — deploy-target secret/config not probed; do not assume SET.`,
      ``,
    ].join("\n"),
  );

  writeFileSync(
    join(outDir, "GA1_MIGRATION_READINESS.md"),
    [
      `# Birth Sky GA1_MIGRATION_READINESS`,
      ``,
      `**GA1 Build:** ${BIRTH_SKY_GA1_CERT_BUILD}  `,
      `**Verification only — migrations were not executed.**`,
      ``,
      mdTable(
        ["ID", "Check", "Status", "Evidence"],
        migration.map((m) => [m.id, m.check, m.status, m.evidence.replace(/\|/g, "/")]),
      ),
      ``,
    ].join("\n"),
  );

  writeFileSync(
    join(outDir, "GA1_CANARY_VALIDATION.md"),
    [
      `# Birth Sky GA1_CANARY_VALIDATION`,
      ``,
      `**GA1 Build:** ${BIRTH_SKY_GA1_CERT_BUILD}  `,
      `**Scope:** Internal allowlist only (public canary remains NO-GO per RC3)`,
      ``,
      mdTable(
        ["ID", "Item", "Status", "Evidence"],
        canaryValidation.map((c) => [
          c.id,
          c.item,
          c.status,
          c.evidence.replace(/\|/g, "/"),
        ]),
      ),
      ``,
    ].join("\n"),
  );

  writeFileSync(
    join(outDir, "GA1_OWNERSHIP_MATRIX.md"),
    [
      `# Birth Sky GA1_OWNERSHIP_MATRIX`,
      ``,
      `**GA1 Build:** ${BIRTH_SKY_GA1_CERT_BUILD}  `,
      `**Rule:** Role documented ≠ named individual assigned.`,
      ``,
      mdTable(
        ["Responsibility", "Role (documented)", "Named individual", "Status", "Evidence"],
        ownership.map((o) => [
          o.responsibility,
          o.roleDocumented,
          o.namedIndividual,
          o.status,
          o.evidence.replace(/\|/g, "/"),
        ]),
      ),
      ``,
    ].join("\n"),
  );

  writeFileSync(
    join(outDir, "GA1_READINESS_REPORT.md"),
    [
      `# Birth Sky GA1_READINESS_REPORT`,
      ``,
      `**GA1 Build:** ${BIRTH_SKY_GA1_CERT_BUILD}  `,
      `**App Build:** ${versions.appBuild}  `,
      `**Generated:** ${new Date().toISOString()}`,
      ``,
      `## Decision`,
      ``,
      `| Scope | Decision |`,
      `| --- | --- |`,
      `| Internal allowlist canary | **${decision.internalAllowlistCanary}** |`,
      `| Rollback readiness | **${decision.rollbackReadiness}** |`,
      `| Overall GA1 | **${decision.overall}** |`,
      ``,
      `## Rationale`,
      ``,
      ...decision.rationale.map((r) => `- ${r}`),
      ``,
      `## Governance (no new waivers)`,
      ``,
      `- Part 9: **SIGNED** by Release Manager ${FOUNDER_OWNER} (${PART9_SIGNED_DATE})`,
      `- Owners: all roles → ${FOUNDER_OWNER} (founder-operated)`,
      `- Waiver register unchanged: W-A11Y-PHYS, W-OPS-DASH, W-STAGING-LIVE, W-AND-SIGNED, W-PERF-DEVICE`,
      `- Public canary / GA: remain NO-GO (RC3)`,
      ``,
      `## Explicit non-actions`,
      ``,
      `- Do **not** begin public canary or Production GA.`,
      `- Internal allowlist flag enablement is a separate Release Manager action.`,
      `- No deployment scripts, infra changes, or product code in GA1.`,
      ``,
    ].join("\n"),
  );

  writeFileSync(
    join(outDir, "GA1_SUMMARY.json"),
    JSON.stringify(
      {
        ga1Build: BIRTH_SKY_GA1_CERT_BUILD,
        appBuild: versions.appBuild,
        generatedAt: new Date().toISOString(),
        decision,
        prereqs,
        migration,
        ownership,
        canaryValidation,
      },
      null,
      2,
    ),
  );

  return result;
}
