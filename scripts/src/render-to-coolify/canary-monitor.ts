/**
 * Canary monitor — hardened probes, consecutive failure gate, gap detection.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { generateDashboardHtml, type DashboardData } from "./migration-dashboard";
import {
  countDbRows,
  probeWorkerHealth,
  snapshotBackend,
  type BackendSnapshot,
} from "./probes";
import {
  CONSECUTIVE_FAILURES_FOR_DEGRADATION,
  GAP_INVALIDATE_MS,
  probeCompositeHealth,
  persistProbeRecords,
  type CompositeHealthResult,
} from "./hardened-probe";
import { auditDir } from "./repo-root";
import { parseArgs } from "./cli-args";

const AUDIT_DIR = auditDir();
const STATE_FILE = path.join(AUDIT_DIR, "canary-state.json");
const STAGES = [1, 10, 25, 50, 100] as const;
const STABLE_MS = 30 * 60 * 1000;
const INTERVAL_MS = 60_000;

type CanaryState = {
  current_percent: number;
  stage_index: number;
  stable_since: string | null;
  last_check: string;
  degraded: boolean;
  degradation_reason: string | null;
  checks_total: number;
  consecutive_unhealthy_cycles: number;
  gap_invalidations: number;
  history: Array<{ at: string; render_score: number; coolify_score: number; percent: number }>;
};

type RedisQueueSnapshot = {
  available: boolean;
  bull_keys?: number;
  wait?: number;
  active?: number;
  delayed?: number;
  failed?: number;
  completed?: number;
  error?: string;
};

async function loadState(): Promise<CanaryState> {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as CanaryState;
    return {
      ...parsed,
      consecutive_unhealthy_cycles: parsed.consecutive_unhealthy_cycles ?? 0,
      gap_invalidations: parsed.gap_invalidations ?? 0,
    };
  } catch {
    return {
      current_percent: STAGES[0],
      stage_index: 0,
      stable_since: null,
      last_check: new Date().toISOString(),
      degraded: false,
      degradation_reason: null,
      checks_total: 0,
      consecutive_unhealthy_cycles: 0,
      gap_invalidations: 0,
      history: [],
    };
  }
}

async function saveState(state: CanaryState): Promise<void> {
  await mkdir(AUDIT_DIR, { recursive: true });
  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function envOr(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function compositeScore(composite: CompositeHealthResult): number {
  return composite.healthy ? 100 : 0;
}

function isDegraded(
  render: BackendSnapshot,
  coolify: BackendSnapshot,
  coolifyComposite: CompositeHealthResult,
  consecutiveUnhealthy: number,
): string | null {
  if (consecutiveUnhealthy < CONSECUTIVE_FAILURES_FOR_DEGRADATION) {
    return null;
  }
  if (!coolifyComposite.healthy) {
    return `Coolify unhealthy for ${consecutiveUnhealthy} consecutive cycles (all core endpoints failed)`;
  }
  if (coolify.error5xxRate > 0.05) {
    return `Coolify 5xx rate ${(coolify.error5xxRate * 100).toFixed(1)}%`;
  }
  if (coolify.latencyP95Ms > Math.max(3000, render.latencyP95Ms * 2.5)) {
    return `Coolify latency p95 ${coolify.latencyP95Ms}ms vs Render ${render.latencyP95Ms}ms`;
  }
  if (coolify.parentProfile?.status === 401 && render.parentProfile?.status !== 401) {
    return "Firebase login fails on Coolify only";
  }
  if (coolify.subscription && coolify.subscription.status >= 500) {
    return "Subscription API 5xx on Coolify";
  }
  if (coolify.aiEnqueue?.status === 503) return "AI queue unavailable on Coolify";
  if (coolify.score < 60 && render.score >= 80) {
    return `Coolify score ${coolify.score} vs Render ${render.score}`;
  }
  return null;
}

function buildRollbackInstructions(
  reason: string,
  state: CanaryState,
  renderUrl: string,
): string {
  const ts = new Date().toISOString();
  return `# Canary rollback instructions

Generated: ${ts}
Trigger: ${reason}
Current canary: ${state.current_percent}%
Consecutive unhealthy cycles: ${state.consecutive_unhealthy_cycles}

## Immediate actions (< 5 minutes)

1. **Set canary to 0%** (all traffic back to Render):

\`\`\`bash
cd infra/cloudflare/amynest-api-proxy
# wrangler.toml → CANARY_PERCENT = "0"
wrangler deploy
\`\`\`

2. **Verify Render is primary:**

\`\`\`bash
curl -sS ${renderUrl}/health
curl -sS https://www.amynest.in/api/healthz
\`\`\`

3. **Confirm response header** \`x-amynest-backend: render\` on proxied API calls.

4. **Do NOT stop Render backend or Postgres.**

5. **Investigate Coolify** before re-enabling canary:

\`\`\`bash
bash scripts/render-to-coolify/06-smoke-test.sh
bash scripts/render-to-coolify/02-verify-replica.sh
\`\`\`

Render remains live throughout. No DNS changes required for rollback.
`;
}

async function probeRedisViaWorker(workerUrl: string): Promise<RedisQueueSnapshot> {
  const health = await probeWorkerHealth(workerUrl);
  if (!health.ok) {
    return { available: false, error: health.error ?? `status ${health.status}` };
  }
  const body = health.body as {
    bullMqActive?: boolean;
    redisPingOk?: boolean;
  };
  return {
    available: Boolean(body.bullMqActive && body.redisPingOk),
    wait: 0,
    active: 0,
    delayed: 0,
  };
}

async function runCheck(state: CanaryState, advance: boolean): Promise<CanaryState> {
  const renderUrl = envOr("RENDER_API_URL", "https://amynest-backend-dykj.onrender.com");
  const coolifyUrl = envOr("COOLIFY_API_URL");
  if (!coolifyUrl) {
    console.error("Set COOLIFY_API_URL");
    process.exit(1);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const cycleId = randomUUID();
  const prevCheck = state.last_check ? new Date(state.last_check).getTime() : null;
  let gapInvalidated = false;

  if (prevCheck !== null) {
    const gapMs = now.getTime() - prevCheck;
    if (gapMs > GAP_INVALIDATE_MS) {
      gapInvalidated = true;
      state.gap_invalidations += 1;
      state.stable_since = null;
      state.consecutive_unhealthy_cycles = 0;
      console.warn(
        `Monitor gap ${Math.round(gapMs / 1000)}s > ${GAP_INVALIDATE_MS / 1000}s — soak timer reset (no rollback)`,
      );
    }
  }

  const token = envOr("SMOKE_FIREBASE_ID_TOKEN");
  const healthSecret = envOr("INTERNAL_HEALTH_SECRET");
  const rcSecret = envOr("REVENUECAT_WEBHOOK_SECRET");
  const childId = envOr("SMOKE_CHILD_ID") ? Number(envOr("SMOKE_CHILD_ID")) : undefined;
  const skipAi = process.env.SMOKE_SKIP_AI === "1";
  const workerUrl = envOr("SMOKE_WORKER_HEALTH_URL");
  const opts = { healthSecret, authToken: token || undefined, rcSecret, childId, skipAi };

  const [coolifyComposite, renderComposite, render, coolify] = await Promise.all([
    probeCompositeHealth("coolify", coolifyUrl, cycleId, healthSecret || undefined),
    probeCompositeHealth("render", renderUrl, cycleId, healthSecret || undefined),
    snapshotBackend("render", renderUrl, opts),
    snapshotBackend("coolify", coolifyUrl, opts),
  ]);

  await persistProbeRecords(coolifyComposite);
  await persistProbeRecords(renderComposite);

  if (!coolifyComposite.healthy) {
    state.consecutive_unhealthy_cycles += 1;
  } else {
    state.consecutive_unhealthy_cycles = 0;
  }

  let renderDb: Record<string, number> | undefined;
  let coolifyDb: Record<string, number> | undefined;
  const renderDbUrl = envOr("RENDER_DATABASE_URL");
  const coolifyDbUrl = envOr("COOLIFY_DATABASE_URL");
  const keyTables = ["parent_profiles", "subscriptions", "children", "analytics_events"];
  if (renderDbUrl) {
    try {
      renderDb = await countDbRows(renderDbUrl, keyTables);
    } catch (err) {
      renderDb = { __error: 1, __total_rows: 0 };
      console.warn("Render DB count failed:", err);
    }
  }
  if (coolifyDbUrl) {
    try {
      coolifyDb = await countDbRows(coolifyDbUrl, keyTables);
    } catch (err) {
      coolifyDb = { __error: 1, __total_rows: 0 };
      console.warn("Coolify DB count failed:", err);
    }
  }

  const redis: { render?: RedisQueueSnapshot; worker?: RedisQueueSnapshot } = {};
  if (workerUrl) {
    redis.worker = await probeRedisViaWorker(workerUrl);
  }

  const coolifyScore = compositeScore(coolifyComposite);
  const renderScore = compositeScore(renderComposite);
  const degradation = isDegraded(render, coolify, coolifyComposite, state.consecutive_unhealthy_cycles);

  if (degradation) {
    state.degraded = true;
    state.degradation_reason = degradation;
    state.stable_since = null;
    const rollback = buildRollbackInstructions(degradation, state, renderUrl);
    await writeFile(path.join(AUDIT_DIR, "rollback-instructions.md"), rollback, "utf8");
    console.error("\n⚠ DEGRADATION DETECTED:", degradation);
    console.error("Wrote audit/render-to-coolify/rollback-instructions.md\n");
  } else {
    state.degraded = false;
    state.degradation_reason = null;
    if (!gapInvalidated) {
      if (!state.stable_since) {
        state.stable_since = nowIso;
      }
      const stableMs = now.getTime() - new Date(state.stable_since).getTime();
      if (advance && stableMs >= STABLE_MS && state.stage_index < STAGES.length - 1) {
        const nextIdx = state.stage_index + 1;
        const nextPct = STAGES[nextIdx]!;
        console.log(
          `\n✓ Stable for ${Math.round(stableMs / 60000)} min — recommend advancing canary ${state.current_percent}% → ${nextPct}%`,
        );
        console.log(`  Update wrangler.toml CANARY_PERCENT="${nextPct}" && wrangler deploy\n`);
        state.stage_index = nextIdx;
        state.current_percent = nextPct;
        state.stable_since = nowIso;
      }
    }
  }

  state.last_check = nowIso;
  state.checks_total += 1;
  state.history.push({
    at: nowIso,
    render_score: renderScore,
    coolify_score: coolifyScore,
    percent: state.current_percent,
  });
  if (state.history.length > 120) state.history = state.history.slice(-120);

  const overallScore = Math.round(
    renderScore * (1 - state.current_percent / 100) + coolifyScore * (state.current_percent / 100),
  );

  const dashboard: DashboardData & {
    composite_health?: { coolify: CompositeHealthResult; render: CompositeHealthResult };
    consecutive_unhealthy_cycles?: number;
    gap_invalidations?: number;
  } = {
    generated_at: nowIso,
    canary_percent: state.current_percent,
    stage_index: state.stage_index,
    stable_since: state.stable_since,
    degraded: state.degraded,
    degradation_reason: state.degradation_reason,
    overall_score: overallScore,
    render,
    coolify,
    database: {
      render: renderDb,
      coolify: coolifyDb,
      row_delta:
        renderDb && coolifyDb
          ? (coolifyDb.__total_rows ?? 0) - (renderDb.__total_rows ?? 0)
          : null,
    },
    redis,
    worker: workerUrl ? { url: workerUrl, health: redis.worker } : undefined,
    next_stage: state.stage_index < STAGES.length - 1 ? STAGES[state.stage_index + 1]! : null,
    stages: [...STAGES],
    composite_health: { coolify: coolifyComposite, render: renderComposite },
    consecutive_unhealthy_cycles: state.consecutive_unhealthy_cycles,
    gap_invalidations: state.gap_invalidations,
  };

  await mkdir(AUDIT_DIR, { recursive: true });
  await writeFile(
    path.join(AUDIT_DIR, "dashboard-latest.json"),
    `${JSON.stringify(dashboard, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(AUDIT_DIR, "dashboard.html"),
    generateDashboardHtml(dashboard),
    "utf8",
  );
  await saveState(state);

  console.log(
    `Canary ${state.current_percent}% | Render ${renderScore} | Coolify ${coolifyScore} | Overall ${overallScore} | unhealthy_streak=${state.consecutive_unhealthy_cycles}`,
  );
  if (state.stable_since && !state.degraded) {
    const mins = Math.round((now.getTime() - new Date(state.stable_since).getTime()) / 60000);
    console.log(`Stable ${mins}/${STABLE_MS / 60000} min | Next stage: ${dashboard.next_stage ?? "complete"}`);
  }

  return state;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const once = args.once === true || args.watch !== true;
  const advance = args.advance === true;
  const failOnDegrade = args["no-fail-on-degrade"] !== true;

  let state = await loadState();

  if (once) {
    state = await runCheck(state, advance);
    if (state.degraded && failOnDegrade) process.exit(1);
    return;
  }

  console.log(`Canary monitor watching every ${INTERVAL_MS / 1000}s…`);
  for (;;) {
    state = await runCheck(state, advance);
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
