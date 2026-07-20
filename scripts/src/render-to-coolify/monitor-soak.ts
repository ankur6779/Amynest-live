/**
 * Monitor certification soak — hardened probes every 30s for 60 minutes.
 * Canary remains disabled; no rollback actions.
 *
 *   pnpm run migrate:render-to-coolify:monitor-soak
 */
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  GAP_INVALIDATE_MS,
  probeCompositeHealth,
  persistProbeRecords,
  type CompositeHealthResult,
} from "./hardened-probe";
import { auditDir } from "./repo-root";
import { parseArgs } from "./cli-args";

const DEFAULT_INTERVAL_MS = 30_000;
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

type SoakCycle = {
  at: string;
  cycle_id: string;
  coolify_healthy: boolean;
  render_healthy: boolean;
  gap_invalidated: boolean;
  gap_ms: number | null;
  false_failure: boolean;
};

type SoakSummary = {
  started_at: string;
  completed_at: string;
  host: string;
  interval_ms: number;
  duration_ms: number;
  total_cycles: number;
  coolify_unhealthy_cycles: number;
  render_unhealthy_cycles: number;
  gap_invalidations: number;
  false_failures: number;
  certified: boolean;
};

function envOr(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function hadTransientEndpointFailure(composite: CompositeHealthResult): boolean {
  const eps = Object.values(composite.endpoints);
  const transportGlitch = eps.some((e) => e.status === 0 && Boolean(e.error));
  return transportGlitch && composite.healthy;
}

async function writeCertification(summary: SoakSummary, cycles: SoakCycle[]): Promise<void> {
  const dir = auditDir();
  await mkdir(dir, { recursive: true });
  const verdict = summary.certified ? "MONITOR CERTIFIED" : "MONITOR FAILED";
  const md = `# Monitor Certification

**Generated:** ${summary.completed_at}
**Verdict:** **${verdict}**

## Configuration

| Setting | Value |
|---------|-------|
| Host | ${summary.host} |
| Interval | ${summary.interval_ms / 1000}s |
| Duration | ${summary.duration_ms / 60000} min |
| Coolify URL | ${envOr("COOLIFY_API_URL")} |

## Results

| Metric | Value |
|--------|-------|
| Total cycles | ${summary.total_cycles} |
| Coolify unhealthy cycles | ${summary.coolify_unhealthy_cycles} |
| Render unhealthy cycles | ${summary.render_unhealthy_cycles} |
| Gap invalidations (>120s) | ${summary.gap_invalidations} |
| False failures | ${summary.false_failures} |

## Policy

- Composite unhealthy only when **all** of /health, /api/healthz, /api/healthz/env fail (with retries)
- Gap >120s invalidates soak segment (no rollback)
- Certification requires **zero coolify unhealthy cycles** (composite gate)

## Verdict

\`\`\`
${verdict}
\`\`\`

Raw cycles: \`monitor-soak-cycles.json\`
Probe log: \`probe-log.jsonl\`
`;

  await writeFile(path.join(dir, "monitor-certification.md"), md, "utf8");
  await writeFile(
    path.join(dir, "monitor-soak-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(dir, "monitor-soak-cycles.json"),
    `${JSON.stringify(cycles, null, 2)}\n`,
    "utf8",
  );
  console.log(verdict);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const coolifyUrl = envOr(
    "COOLIFY_API_URL",
    "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io",
  );
  const renderUrl = envOr("RENDER_API_URL", "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io");
  const healthSecret = envOr("INTERNAL_HEALTH_SECRET");
  const intervalMs = Number(envOr("MONITOR_INTERVAL_MS", String(DEFAULT_INTERVAL_MS)));
  const durationMs = Number(
    args.duration_ms ?? envOr("MONITOR_SOAK_DURATION_MS", String(DEFAULT_DURATION_MS)),
  );

  const startedAt = new Date();
  const endAt = startedAt.getTime() + durationMs;
  const cycles: SoakCycle[] = [];
  let lastAt: number | null = null;
  let coolifyUnhealthy = 0;
  let renderUnhealthy = 0;
  let gapInvalidations = 0;
  let falseFailures = 0;

  console.log(
    `Monitor soak: ${durationMs / 60000}min @ ${intervalMs / 1000}s on ${coolifyUrl}`,
  );

  while (Date.now() < endAt) {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const cycleId = randomUUID();
    let gapInvalidated = false;
    let gapMs: number | null = null;

    if (lastAt !== null) {
      gapMs = now - lastAt;
      if (gapMs > GAP_INVALIDATE_MS) {
        gapInvalidated = true;
        gapInvalidations += 1;
        console.warn(`Gap ${Math.round(gapMs / 1000)}s — soak segment invalidated (no rollback)`);
      }
    }
    lastAt = now;

    const [coolify, render] = await Promise.all([
      probeCompositeHealth("coolify", coolifyUrl, cycleId, healthSecret || undefined),
      probeCompositeHealth("render", renderUrl, cycleId, healthSecret || undefined),
    ]);

    await persistProbeRecords(coolify);
    await persistProbeRecords(render);

    const coolifyTransient = hadTransientEndpointFailure(coolify);
    const renderTransient = hadTransientEndpointFailure(render);
    if (coolifyTransient || renderTransient) falseFailures += 1;
    if (!coolify.healthy) coolifyUnhealthy += 1;
    if (!render.healthy) renderUnhealthy += 1;

    cycles.push({
      at: nowIso,
      cycle_id: cycleId,
      coolify_healthy: coolify.healthy,
      render_healthy: render.healthy,
      gap_invalidated: gapInvalidated,
      gap_ms: gapMs,
      false_failure: coolifyTransient || renderTransient,
    });

    const elapsed = Math.round((now - startedAt.getTime()) / 1000);
    console.log(
      `[${elapsed}s] coolify=${coolify.healthy ? "OK" : "UNHEALTHY"} render=${render.healthy ? "OK" : "UNHEALTHY"} gaps=${gapInvalidations} false=${falseFailures}`,
    );

    const remaining = endAt - Date.now();
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, Math.min(intervalMs, remaining)));
    }
  }

  const summary: SoakSummary = {
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    host: os.hostname(),
    interval_ms: intervalMs,
    duration_ms: durationMs,
    total_cycles: cycles.length,
    coolify_unhealthy_cycles: coolifyUnhealthy,
    render_unhealthy_cycles: renderUnhealthy,
    gap_invalidations: gapInvalidations,
    false_failures: falseFailures,
    certified: coolifyUnhealthy === 0,
  };

  await writeCertification(summary, cycles);
  process.exit(summary.certified ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
