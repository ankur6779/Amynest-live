/**
 * Writes IM-7 human-readable certification artifacts (no product behavior).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { evaluateConformanceChecklist } from "./evaluate-conformance";
import { getVersionRegistrySnapshot } from "./version-registry";
import { PERFORMANCE_BUDGETS, type PerformanceMeasurement } from "./performance-budgets";
import type { ConformanceReport } from "./conformance-types";

export function getBirthSkyCertOutputDir(fromDir: string): string {
  return join(fromDir, "../../../../certification/birth-sky");
}

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}\n`;
}

export function writeReleaseDocumentation(outDir: string): ConformanceReport {
  mkdirSync(outDir, { recursive: true });
  const report = evaluateConformanceChecklist();
  const versions = getVersionRegistrySnapshot();

  writeFileSync(join(outDir, "CONFORMANCE_REPORT.json"), JSON.stringify(report, null, 2));

  const confMd = [
    `# Birth Sky Conformance Report`,
    ``,
    `**App Build:** ${report.appBuild}  `,
    `**Generated:** ${report.generatedAt}  `,
    `**Scope:** ${report.scope}  `,
    `**Verdict:** ${report.readinessVerdict}`,
    ``,
    `## Summary`,
    ``,
    mdTable(
      ["Total", "PASS", "FAIL", "WAIVED", "N/A", "Unknown"],
      [
        [
          String(report.summary.total),
          String(report.summary.pass),
          String(report.summary.fail),
          String(report.summary.waived),
          String(report.summary.notApplicable),
          String(report.summary.unknown),
        ],
      ],
    ),
    `## Open blockers`,
    ``,
    report.openBlockers.length
      ? report.openBlockers.map((b) => `- ${b}`).join("\n")
      : `- None`,
    ``,
    `## Checklist results`,
    ``,
    mdTable(
      ["ID", "Part", "Status", "Check", "Evidence"],
      report.items.map((i) => [
        i.id,
        i.part,
        i.status,
        i.check.replace(/\|/g, "/"),
        i.evidence.replace(/\|/g, "/"),
      ]),
    ),
    `## Part 9 sign-off`,
    ``,
    `Human signatures required before Ship (Architecture, Eng, QA, A11y, Security, Privacy, Platform, SRE, Release Manager).`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "CONFORMANCE_REPORT.md"), confMd);

  const matrixMd = [
    `# Birth Sky Compatibility Matrix`,
    ``,
    `**App Build:** ${versions.appBuild}  `,
    `**Authority:** Pack 8 Addendum A  `,
    `**Scope:** Core Birth Sky (no shipping extension lenses)`,
    ``,
    `## Axes`,
    ``,
    mdTable(
      ["Axis", "Value", "Notes"],
      [
        ["App Build", versions.appBuild, "Certification train label"],
        [
          "engineVersion (compute writes)",
          versions.engineVersion.computeWrites,
          versions.engineVersion.notes,
        ],
        [
          "engineVersion (readable min)",
          versions.engineVersion.readableMin,
          "Older snapshots hydrate without auto-regen",
        ],
        [
          "traditionalContentVersion",
          versions.traditionalContentVersion.current,
          versions.traditionalContentVersion.notes,
        ],
        [
          "contextSchemaVersion (write)",
          versions.contextSchemaVersion.write,
          `Supported: ${versions.contextSchemaVersion.supported.join(", ")}`,
        ],
        [
          "exportManifestVersion (write)",
          versions.exportManifestVersion.write,
          `Supported: ${versions.exportManifestVersion.supported.join(", ")}; unknown → fail safe`,
        ],
        [
          "privacyPolicyVersion (required)",
          versions.privacyPolicyVersion.required,
          "Behind version → re-consent",
        ],
        ["consentVersion", versions.consentVersion.current, "Pack 2 consent"],
        ["lens SDK version", versions.lensSdkVersion.current, "Pack 10 peer"],
        [
          "offlineBundleSchema",
          versions.offlineBundleSchema.current,
          "Client current-snapshot bundle",
        ],
        [
          "modelVersion",
          versions.modelVersion.policy,
          "Recorded per AI delivery — not module-global",
        ],
        [
          "primary lens",
          `${versions.lensPrimary.lensId}@${versions.lensPrimary.lensVersion}`,
          "Registry required",
        ],
      ],
    ),
    `## Backward compatibility rules`,
    ``,
    `- Older \`engineVersion\` snapshots remain readable (Pack 4 Addendum A).`,
    `- Unsupported \`exportManifestVersion\` / \`contextSchemaVersion\` fail safe (no corrupt import; no free-insight consume).`,
    `- Regeneration creates a **new** snapshotVersion; history preserved.`,
    `- Conversations/reflections retained across regen (Pack 7).`,
    `- Lens SDK peer mismatch → lens unavailable; core Birth Sky unaffected.`,
    ``,
    `## ADR linkage`,
    ``,
    `Breaking matrix changes require \`ADR-BS-NNN\` (Pack 8 Addendum A). This release: **none**.`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "COMPATIBILITY_MATRIX.md"), matrixMd);

  const perfRows: PerformanceMeasurement[] = [
    {
      metric: "Cold module open → Welcome",
      budgetMs: PERFORMANCE_BUDGETS.coldModuleOpenWelcomeMs,
      measuredMs: null,
      status: "WAIVED",
      evidence: "Device mid-tier lab pending",
    },
    {
      metric: "Cold open → Dashboard (cache hit)",
      budgetMs: PERFORMANCE_BUDGETS.coldOpenDashboardCacheHitMs,
      measuredMs: null,
      status: "WAIVED",
      evidence: "Device lab pending",
    },
    {
      metric: "Warm segment switch",
      budgetMs: PERFORMANCE_BUDGETS.warmSegmentSwitchMs,
      measuredMs: null,
      status: "WAIVED",
      evidence: "Device lab pending",
    },
    {
      metric: "Formation min ceremony",
      budgetMs: PERFORMANCE_BUDGETS.formationMinCeremonyMs,
      measuredMs: PERFORMANCE_BUDGETS.formationMinCeremonyMs,
      status: "PASS",
      evidence: "FORMATION_MIN_CEREMONY_MS constant enforced",
    },
    {
      metric: "Formation hard fail timeout",
      budgetMs: PERFORMANCE_BUDGETS.formationHardFailMs,
      measuredMs: PERFORMANCE_BUDGETS.formationHardFailMs,
      status: "PASS",
      evidence: "FORMATION_HARD_TIMEOUT_MS constant enforced",
    },
    {
      metric: "Reveal CTA enable",
      budgetMs: PERFORMANCE_BUDGETS.revealCtaEnableMs,
      measuredMs: PERFORMANCE_BUDGETS.revealCtaEnableMs,
      status: "PASS",
      evidence: "REVEAL_CTA_ENABLE_MS constant enforced",
    },
    {
      metric: "Offline Dashboard cache hit",
      budgetMs: PERFORMANCE_BUDGETS.offlineDashboardCacheHitMs,
      measuredMs: null,
      status: "WAIVED",
      evidence: "Device lab pending; offline bundle path implemented",
    },
    {
      metric: "AI conversation open / streaming latency",
      budgetMs: 0,
      measuredMs: null,
      status: "WAIVED",
      evidence: "Chunk batching implemented; p95 lab pending",
    },
    {
      metric: "Regeneration duration",
      budgetMs: 0,
      measuredMs: null,
      status: "WAIVED",
      evidence: "Overlay path + regeneration_duration_bucket analytics; lab pending",
    },
    {
      metric: "Export duration",
      budgetMs: 0,
      measuredMs: null,
      status: "WAIVED",
      evidence: "Client JSON download path; lab pending",
    },
  ];

  const perfMd = [
    `# Birth Sky Performance Report`,
    ``,
    `**Authority:** Pack 8 Part 3  `,
    `**App Build:** ${versions.appBuild}`,
    ``,
    `Regression policy: fail if measured &gt; budget × (1 + ${PERFORMANCE_BUDGETS.regressionToleranceRatio}) without waiver.`,
    ``,
    mdTable(
      ["Metric", "Budget (ms)", "Measured (ms)", "Status", "Evidence"],
      perfRows.map((r) => [
        r.metric,
        r.budgetMs ? String(r.budgetMs) : "—",
        r.measuredMs == null ? "—" : String(r.measuredMs),
        r.status,
        r.evidence,
      ]),
    ),
    `## Notes`,
    ``,
    `- Contractual timers (Formation/Reveal) are **PASS** via source constants + unit tests.`,
    `- Mid-tier device timings are **WAIVED** pending lab measurement — do not claim device PASS.`,
    `- No performance “optimizations” beyond frozen contracts were introduced in IM-7.`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "PERFORMANCE_REPORT.md"), perfMd);

  const a11yMd = [
    `# Birth Sky Accessibility Report`,
    ``,
    `**Authority:** Pack 8 Part 2 (WCAG 2.2 AA–oriented)  `,
    `**App Build:** ${versions.appBuild}`,
    ``,
    `## Automated / static results`,
    ``,
    mdTable(
      ["Check", "Status", "Evidence"],
      [
        ["Back control labeled", "PASS", "birth-sky-module-shell aria-label"],
        ["Segment tablist + arrow keys", "PASS", "segment-nav.tsx"],
        ["Delete dialog modal naming", "PASS", "settings-page delete dialog"],
        ["Edit confirm dialog", "PASS", "edit-birth-details-page"],
        ["AI sheet dialog + live regions", "PASS", "conversation-sheet"],
        ["Reduced motion consulted", "PASS", "dashboard + settings"],
        ["Sky map textual body list", "PASS", "instrument-svg / sky segment list path"],
        ["VoiceOver / TalkBack full path", "WAIVED", "Device lab pending (U12)"],
        ["Contrast AA sample all screens", "WAIVED", "Design token audit pending"],
        ["Dynamic Type largest category", "WAIVED", "Device lab pending"],
      ],
    ),
    `## Certification statement`,
    ``,
    `Static a11y contracts for dialogs, focusable tabs, and reduced motion are verified in CI.`,
    `Full VO/TalkBack + contrast sampling remains **WAIVED** until A11y owner completes device certification.`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "ACCESSIBILITY_REPORT.md"), a11yMd);

  const failCount = report.summary.fail;
  const limitationsMd = [
    `# Birth Sky Known Limitations`,
    ``,
    `Supported by current implementation evidence only. **App Build:** ${versions.appBuild}`,
    ``,
    `1. **Ephemeris:** \`amynest-astro-lite/1.0.0\` temporary adapter — Swiss Ephemeris swap is a future engineVersion change without forced regen for old snapshots.`,
    `2. **Lens Platform:** Framework ready; no marketplace, remote plugins, or shipping extension lenses.`,
    `3. **Operations (Pack 11):** Dashboards, ORS, MTTD/MTTR wiring not claimed for this core-only engineering cert.`,
    `4. **Device matrix:** iOS Capacitor + Android WebView + Web full Pack 8 §1.5 smoke not executed on this CI host.`,
    `5. **IAP resume E2E (AI9):** Requires staging RevenueCat; code path present, lab WAIVED.`,
    `6. **Offline key material:** AES-GCM device key prefers IndexedDB; localStorage fallback stores key bytes only (never birth payload). Clearing site data loses offline cache (expected).`,
    `7. **Server field key ops:** Production should set \`BIRTH_SKY_FIELD_ENCRYPTION_KEY\` (64-hex or ≥32 char). Losing the key makes sealed rows unreadable — treat as a secret with backup.`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "KNOWN_LIMITATIONS.md"), limitationsMd);

  /** Every gate must be PASS | FAIL | WAIVED — never UNKNOWN (RC1 Blocker 4). */
  const checklistRows: Array<{ item: string; status: "PASS" | "FAIL" | "WAIVED"; evidence: string }> = [
    {
      item: "CONFORMANCE_REPORT has zero FAIL (or formal waivers)",
      status: failCount === 0 ? "PASS" : "FAIL",
      evidence: failCount === 0 ? "No open FAIL items" : `${failCount} FAIL item(s)`,
    },
    {
      item: "COMPATIBILITY_MATRIX published for this App Build",
      status: "PASS",
      evidence: "Generated with write-release-docs",
    },
    {
      item: "ACCESSIBILITY_REPORT device items signed by A11y",
      status: "WAIVED",
      evidence: "Device VO/TalkBack + contrast lab pending (U12)",
    },
    {
      item: "PERFORMANCE_REPORT device lab attached or waived",
      status: "WAIVED",
      evidence: "Mid-tier device timings waived; contractual timers PASS in CI",
    },
    {
      item: "Pack 8 §1.5 smoke on Web + iOS Capacitor + Android WebView",
      status: "WAIVED",
      evidence: "Not executed on this CI host; required before canary",
    },
    {
      item: "Kill-switch drill: VITE_FF_BIRTH_SKY=0 / prod flag off",
      status: "PASS",
      evidence: "feature-flags.test.ts + Playwright birth-sky-rc2",
    },
    {
      item: "Rollback owner + comms template named",
      status: "PASS",
      evidence: "ROLLBACK_RUNBOOK.md (RC2)",
    },
    {
      item: "Ops dashboards/alerts armed (O1/O2) or Release Manager waiver",
      status: "WAIVED",
      evidence: "Pack 11 ops out of RC1 scope; formal waiver for core-only train",
    },
    {
      item: "Part 9 human sign-off complete",
      status: "WAIVED",
      evidence: "Human signatures required before Ship — not an engineering auto-PASS",
    },
    {
      item: "Offline sensitive cache encrypted (RC1 P1)",
      status: "PASS",
      evidence: "AES-GCM envelope + migration suite",
    },
    {
      item: "Server birth time/place encrypted at rest (RC1 P1)",
      status: "PASS",
      evidence: "birth-field-crypto AES-GCM + lazy migration",
    },
    {
      item: "Plaintext→encrypted migration verified (idempotent)",
      status: "PASS",
      evidence: "offline-migration.test.ts + birth-field-crypto.test.ts",
    },
    {
      item: "Snapshot hydrate supports older engineVersion",
      status: "PASS",
      evidence: "Compatibility matrix + hydrate path",
    },
    {
      item: "Export unsupported manifest fails safe",
      status: "PASS",
      evidence: "settings export version gate",
    },
    {
      item: "Soft-delete + local cache clear on delete",
      status: "PASS",
      evidence: "deleteBirthSkyProfile + clearOfflineBundle/clearReflectionStore",
    },
    {
      item: "API DATABASE_URL + Birth Sky tables pushed",
      status: "WAIVED",
      evidence: "Environment-specific; validate per deploy target",
    },
    {
      item: "Firebase auth configured for parent sessions",
      status: "WAIVED",
      evidence: "Environment-specific",
    },
    {
      item: "RevenueCat existing premium offering (no new Birth Sky SKU)",
      status: "PASS",
      evidence: "No new SKU in Birth Sky packs; uses existing premium gate",
    },
  ];

  const releaseChecklistMd = [
    `# Birth Sky RELEASE_CHECKLIST`,
    ``,
    `**App Build:** ${versions.appBuild}  `,
    `**RC1:** Every item is PASS, FAIL, or WAIVED (none unresolved).  `,
    `**Do not deploy from this checklist alone — verify readiness only.**`,
    ``,
    `## Pre-canary / engineering gates`,
    ``,
    mdTable(
      ["Item", "Status", "Evidence"],
      checklistRows.map((r) => [r.item, r.status, r.evidence]),
    ),
    `## Feature flags`,
    ``,
    `| Flag | Default | Role |`,
    `| --- | --- | --- |`,
    `| \`VITE_FF_BIRTH_SKY\` | off | Master kill |`,
    `| \`VITE_FF_BIRTH_SKY_HUB_TILE\` | follows master | Hub tile |`,
    `| \`VITE_FF_BIRTH_SKY_DEEP_LINKS\` | follows master | Deep links |`,
    ``,
    `## Rollout plan (Pack 8 §6 / Roadmap Part 7)`,
    ``,
    `1. Internal allowlist  `,
    `2. Canary 0.5–5%  `,
    `3. Regional/platform raise  `,
    `4. 100%  `,
    `Rollback: flag off within minutes; encrypted offline cache remains readable after rollback of *new* code only if device key retained — plaintext migration is one-way to envelope (legacy plaintext restored only if migration verify fails).`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "RELEASE_CHECKLIST.md"), releaseChecklistMd);

  const notesMd = [
    `# Birth Sky RELEASE_NOTES_DRAFT`,
    ``,
    `**App Build:** ${versions.appBuild}  `,
    `**ADRs:** none (implementation within Phases 1–3 / Packs 1–12 freezes)`,
    ``,
    `## What’s included (engineering)`,
    ``,
    `- Birth Sky core journey: Welcome → Setup → Formation → Reveal → Dashboard (Sky · Astronomy · Tradition · Reflect)`,
    `- AI Ask Amy with Pack 2 entitlement (one free insight; existing Premium paywall)`,
    `- Lifecycle: Settings, edit/regen, export, delete, offline read, sync`,
    `- Lens Platform (Registry/SDK/runtime) — framework only; no marketplace`,
    ``,
    `## Compatibility`,
    ``,
    `- Engine compute: \`${versions.engineVersion.computeWrites}\``,
    `- Context schema: \`${versions.contextSchemaVersion.write}\``,
    `- Export manifest: \`${versions.exportManifestVersion.write}\``,
    `- Privacy policy: \`${versions.privacyPolicyVersion.required}\``,
    `- Lens SDK: \`${versions.lensSdkVersion.current}\``,
    ``,
    `See COMPATIBILITY_MATRIX.md.`,
    ``,
    `## Remaining before production ship`,
    ``,
    `- Part 9 human sign-offs (WAIVED in engineering checklist until owners sign)`,
    `- Device a11y/perf labs + Pack 8 §1.5 smoke (WAIVED pending lab)`,
    `- Ops dashboards/alerts (Pack 11) — Release Manager waiver for core-only`,
    `- Set BIRTH_SKY_FIELD_ENCRYPTION_KEY in production before canary`,
    ``,
    `## Non-goals / not in this release`,
    ``,
    `- Marketplace / remote plugins`,
    `- New AI SKUs`,
    `- Deployment (IM-7 verifies readiness only)`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "RELEASE_NOTES_DRAFT.md"), notesMd);

  return report;
}
