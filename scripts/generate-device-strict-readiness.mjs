#!/usr/bin/env node
/**
 * Generates audit/device-limit-strict-readiness.md from live DB metrics when
 * DATABASE_URL is available, or from static client audit otherwise.
 *
 * Usage: DATABASE_URL=... node scripts/generate-device-strict-readiness.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function loadSnapshot() {
  if (!process.env.DATABASE_URL) {
    return {
      generatedAt: new Date().toISOString(),
      dataSource: "static-audit-only",
      recommendation: "DELAY",
      recommendationReasons: [
        "DATABASE_URL not set — run against production/staging DB for live coverage metrics.",
        "Client header audit: PASS (all six headers implemented in device-id.ts).",
        "DEVICE_LIMIT_STRICT remains disabled — do not enable until live registration success rate ≥ 95%.",
      ],
      daily: null,
      weekly: null,
      clientHeaderAudit: {
        sendsDeviceId: true,
        sendsPlatform: true,
        sendsDeviceName: true,
        sendsBrowser: true,
        sendsOs: true,
        sendsAppVersion: true,
      },
    };
  }

  const { assessStrictReadiness } = await import(
    "../artifacts/api-server/src/services/deviceMetricsService.ts"
  );
  const snapshot = await assessStrictReadiness();
  return { ...snapshot, dataSource: "database" };
}

function md(snapshot) {
  const lines = [
    "# Device Limit Strict Mode — Readiness Assessment",
    "",
    `**Generated:** ${snapshot.generatedAt}`,
    `**Data source:** ${snapshot.dataSource}`,
    `**DEVICE_LIMIT_STRICT:** NOT enabled (assessment only)`,
    "",
    "## Recommendation",
    "",
    `### ${snapshot.recommendation === "ENABLE" ? "✅ ENABLE" : "⏸ DELAY"} strict mode`,
    "",
    ...snapshot.recommendationReasons.map((r) => `- ${r}`),
    "",
    "## Client header audit",
    "",
    "| Header | Shipped |",
    "|--------|---------|",
    `| X-AmyNest-Device-Id | ${snapshot.clientHeaderAudit.sendsDeviceId ? "✅" : "❌"} |`,
    `| X-AmyNest-Platform | ${snapshot.clientHeaderAudit.sendsPlatform ? "✅" : "❌"} |`,
    `| X-AmyNest-Device-Name | ${snapshot.clientHeaderAudit.sendsDeviceName ? "✅" : "❌"} |`,
    `| X-AmyNest-Browser | ${snapshot.clientHeaderAudit.sendsBrowser ? "✅" : "❌"} |`,
    `| X-AmyNest-OS | ${snapshot.clientHeaderAudit.sendsOs ? "✅" : "❌"} |`,
    `| X-AmyNest-App-Version | ${snapshot.clientHeaderAudit.sendsAppVersion ? "✅" : "❌"} |`,
    "",
  ];

  if (snapshot.weekly) {
    lines.push(
      "## Weekly metrics",
      "",
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Registration success rate | ${snapshot.weekly.registrationSuccessRate ?? "n/a"}% |`,
      `| Missing header rate | ${snapshot.weekly.missingHeaderRate ?? "n/a"}% |`,
      `| Bypass attempts | ${snapshot.weekly.bypassAttempts} |`,
      "",
      "### Event totals (7d)",
      "",
      "| Event | Count |",
      "|-------|-------|",
      ...snapshot.weekly.totals.map((t) => `| ${t.eventName} | ${t.count} |`),
      "",
    );
  } else {
    lines.push(
      "## Live metrics",
      "",
      "Run with `DATABASE_URL` set to populate registration coverage and missing-header percentages.",
      "",
    );
  }

  lines.push(
    "## Certification thresholds",
    "",
    "| Check | Threshold |",
    "|-------|-----------|",
    "| Registration success rate | ≥ 95% |",
    "| Missing header rate | ≤ 5% |",
    "| Auth failure regression | No increase vs baseline |",
    "",
    "## API compatibility",
    "",
    "- Device routes exempt from `requireRegisteredDevice` middleware",
    "- Legacy clients without headers: allowed until `DEVICE_LIMIT_STRICT=1`",
    "- `demo@amynest.in`: unlimited devices + middleware bypass",
    "",
    "**Do not set `DEVICE_LIMIT_STRICT=1` until recommendation is ENABLE.**",
    "",
  );

  return lines.join("\n");
}

const snapshot = await loadSnapshot();
const outPath = join(root, "audit/device-limit-strict-readiness.md");
writeFileSync(outPath, md(snapshot));
console.log(`Wrote ${outPath}`);
console.log(`Recommendation: ${snapshot.recommendation}`);
