import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getFailureChainGraph, serializeFailureChain } from "./failure-chain-graph.js";
import { getFixCandidateForFingerprint } from "./fix-candidates.js";
import { getRegressionCandidateForFingerprint } from "./regression-candidates.js";
import { getRegressionForFingerprint } from "./regression-registry.js";
import { getRootCauseForFingerprint } from "./root-cause-playbooks.js";
import {
  SOURCE_MAPPINGS,
  fingerprintToReviewSlug,
  getSourceMappingForFingerprint,
} from "./source-mappings.js";
import type { EngineeringReviewPackage, FingerprintAggregate } from "./types.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const REVIEW_DIR = join(REPO_ROOT, "artifacts/crash-review");

function formatSourceMapping(pkg: EngineeringReviewPackage): string {
  if (!pkg.sourceMapping) return "_No source mapping._\n";
  const lines = [
    `**Component:** ${pkg.sourceMapping.component}`,
    `**Route:** ${pkg.sourceMapping.route}`,
    "",
    "| File | Line | Hook | Function | Mutation |",
    "|------|------|------|----------|----------|",
  ];
  for (const loc of pkg.sourceMapping.locations) {
    lines.push(
      `| \`${loc.file}\` | ${loc.line}${loc.endLine ? `–${loc.endLine}` : ""} | ${loc.hook} | ${loc.functionName} | ${loc.stateMutation ?? "—"} |`,
    );
    if (loc.dependencies?.length) {
      lines.push(`| | deps: \`${loc.dependencies.join(", ")}\` | | | |`);
    }
  }
  return lines.join("\n") + "\n";
}

function buildReviewMarkdown(pkg: EngineeringReviewPackage): string {
  const a = pkg.aggregate;
  const lines: string[] = [
    `# Crash Review: ${pkg.readableFingerprint}`,
    "",
    `> Generated: ${pkg.generatedAt}`,
    "> **Read-only analysis** — engineers approve all code changes.",
    "",
    "## Summary",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Severity | ${a?.severity ?? "—"} |`,
    `| Affected users (7d) | ${a?.affectedUsers ?? "—"} |`,
    `| Affected routes | ${a?.affectedRoutes.join(", ") || "—"} |`,
    `| Recovery rate | ${a?.recoverySuccessRate ?? "—"}% |`,
    `| 24h / 7d count | ${a?.count24h ?? "—"} / ${a?.count7d ?? "—"} |`,
    `| Example error IDs | ${a?.exampleErrorIds.join(", ") || "—"} |`,
    "",
    "## Root Cause",
    "",
  ];

  if (pkg.rootCause) {
    lines.push("```");
    lines.push(pkg.rootCause.chain.join("\n→ "));
    lines.push("```");
    lines.push("");
    lines.push(`- **Component:** ${pkg.rootCause.component}`);
    if (pkg.rootCause.hook) lines.push(`- **Hook:** ${pkg.rootCause.hook}`);
    if (pkg.rootCause.dependency)
      lines.push(`- **Dependency:** ${pkg.rootCause.dependency}`);
    if (pkg.rootCause.stateMutation)
      lines.push(`- **Mutation:** ${pkg.rootCause.stateMutation}`);
    lines.push("");
    lines.push("**Evidence files:**");
    for (const e of pkg.rootCause.evidence) lines.push(`- \`${e}\``);
  } else {
    lines.push("_No playbook — triage required._\n");
  }

  lines.push("", "## Source Locations", "", formatSourceMapping(pkg));

  lines.push("## Failure Chain (machine-readable)", "");
  if (pkg.failureChain) {
    lines.push("```json");
    lines.push(serializeFailureChain(pkg.failureChain));
    lines.push("```");
    lines.push("");
    lines.push(`**Loop type:** ${pkg.failureChain.loopType}`);
    if (pkg.failureChain.cycle.length) {
      lines.push(`**Cycle:** ${pkg.failureChain.cycle.join(" → ")}`);
    }
  }

  lines.push("", "## Fix Candidate", "");
  if (pkg.fixCandidate) {
    lines.push(`**Issue:** ${pkg.fixCandidate.issue}`);
    lines.push("");
    lines.push("**Evidence:**");
    for (const e of pkg.fixCandidate.evidence) lines.push(`- ${e}`);
    lines.push("");
    lines.push(`**Proposed fix:** ${pkg.fixCandidate.proposedFix}`);
    lines.push("");
    lines.push(
      `**Confidence:** ${pkg.fixCandidate.confidence}% | **Risk:** ${pkg.fixCandidate.risk}`,
    );
    if (pkg.fixCandidate.minimalDiffHint) {
      lines.push("");
      lines.push("**Minimal diff hint:**");
      lines.push("```ts");
      lines.push(pkg.fixCandidate.minimalDiffHint);
      lines.push("```");
    }
  } else {
    lines.push("_No fix candidate — add playbook entry._\n");
  }

  lines.push("", "## Regression Tests", "");
  if (pkg.regressionCandidate) {
    for (const s of pkg.regressionCandidate.scenarios) {
      lines.push(`### ${s.name}`);
      lines.push(s.description);
      lines.push(`- **File:** \`${s.suggestedTestFile}\``);
      lines.push("- **Assertions:**");
      for (const assertion of s.assertions) lines.push(`  - ${assertion}`);
      lines.push("");
    }
  }
  if (pkg.regression) {
    lines.push(
      `**Registry status:** ${pkg.regression.status} (${pkg.regression.testPaths.length} files)`,
    );
  }

  if (pkg.deploymentVerification) {
    lines.push("", "## Deployment Verification", "");
    lines.push(`- **Status:** ${pkg.deploymentVerification.status}`);
    lines.push(`- **Reason:** ${pkg.deploymentVerification.reason}`);
    lines.push(
      `- **7d count:** ${pkg.deploymentVerification.baselineCount7d} → ${pkg.deploymentVerification.currentCount7d}`,
    );
    lines.push(
      `- **Recovery:** ${pkg.deploymentVerification.recoveryRateBefore}% → ${pkg.deploymentVerification.recoveryRateAfter}%`,
    );
  }

  return lines.join("\n");
}

async function loadAggregate(
  readableFingerprint: string,
  aggregate?: FingerprintAggregate | null,
): Promise<FingerprintAggregate | null> {
  if (aggregate !== undefined) return aggregate;
  if (!process.env.DATABASE_URL) return null;
  try {
    const { aggregateCrashFingerprints } = await import(
      "./aggregation-service.js"
    );
    const aggregates = await aggregateCrashFingerprints(100);
    return (
      aggregates.find((a) => a.readableFingerprint === readableFingerprint) ??
      null
    );
  } catch {
    return null;
  }
}

/** Offline-capable review package builder — no DB required. */
export async function buildReviewPackageCore(
  readableFingerprint: string,
  aggregate?: FingerprintAggregate | null,
): Promise<EngineeringReviewPackage> {
  const agg = await loadAggregate(readableFingerprint, aggregate);

  const pkg: EngineeringReviewPackage = {
    readableFingerprint,
    generatedAt: new Date().toISOString(),
    aggregate: agg,
    rootCause: getRootCauseForFingerprint(readableFingerprint),
    sourceMapping: getSourceMappingForFingerprint(readableFingerprint),
    failureChain: getFailureChainGraph(readableFingerprint),
    fixCandidate: getFixCandidateForFingerprint(readableFingerprint),
    regressionCandidate: getRegressionCandidateForFingerprint(readableFingerprint),
    regression: getRegressionForFingerprint(readableFingerprint),
    deploymentVerification: null,
    markdown: "",
  };

  if (process.env.DATABASE_URL) {
    try {
      const { verifyFingerprintFix } = await import(
        "./deployment-verification.js"
      );
      pkg.deploymentVerification = await verifyFingerprintFix(readableFingerprint);
    } catch {
      /* optional */
    }
  }

  pkg.markdown = buildReviewMarkdown(pkg);
  return pkg;
}

export async function buildReviewPackage(
  readableFingerprint: string,
  aggregate?: FingerprintAggregate | null,
): Promise<EngineeringReviewPackage> {
  return buildReviewPackageCore(readableFingerprint, aggregate);
}

export async function writeReviewPackage(
  readableFingerprint: string,
): Promise<string> {
  const pkg = await buildReviewPackageCore(readableFingerprint, null);
  const slug = fingerprintToReviewSlug(readableFingerprint);
  mkdirSync(REVIEW_DIR, { recursive: true });
  const outPath = join(REVIEW_DIR, `${slug}.md`);
  writeFileSync(outPath, pkg.markdown, "utf8");
  return outPath;
}

export async function writeAllReviewPackages(input?: {
  minSeverity?: "P0" | "P1";
}): Promise<string[]> {
  let aggregates: FingerprintAggregate[] = [];
  if (process.env.DATABASE_URL) {
    try {
      const { aggregateCrashFingerprints } = await import(
        "./aggregation-service.js"
      );
      aggregates = await aggregateCrashFingerprints(50);
    } catch {
      aggregates = [];
    }
  }

  const minSev = input?.minSeverity ?? "P1";
  const order = { P0: 0, P1: 1, P2: 2, P3: 3 };

  const targets = aggregates.filter(
    (a) => order[a.severity] <= order[minSev] && a.count7d > 0,
  );

  const fromRegistry = SOURCE_MAPPINGS.map((m) => m.readableFingerprint);
  const allFps = new Set([
    ...targets.map((t) => t.readableFingerprint),
    ...fromRegistry,
  ]);

  const paths: string[] = [];
  for (const fp of allFps) {
    const agg = aggregates.find((a) => a.readableFingerprint === fp) ?? null;
    const pkg = await buildReviewPackageCore(fp, agg);
    const slug = fingerprintToReviewSlug(fp);
    mkdirSync(REVIEW_DIR, { recursive: true });
    const outPath = join(REVIEW_DIR, `${slug}.md`);
    writeFileSync(outPath, pkg.markdown, "utf8");
    paths.push(outPath);
  }
  return paths;
}
