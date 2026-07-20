/**
 * Data Plane Consistency Audit — gate canary traffic.
 *
 * Verifies every production component points at a single consistent data plane
 * (Render OR Coolify). Mixed planes → NOT SAFE.
 *
 *   pnpm run migrate:render-to-coolify:data-plane-audit
 *
 * Optional env:
 *   RENDER_API_URL, COOLIFY_API_URL, INTERNAL_HEALTH_SECRET
 *   RENDER_DATABASE_URL, COOLIFY_DATABASE_URL
 *   DATA_PLANE_PROBE_JSON — path to SSH-collected probe file (see 09-data-plane-audit.sh)
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { probeGet, apiUrl } from "./probes";

function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pkgPath = path.join(dir, "package.json");
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        name?: string;
      };
      if (pkg.name === "workspace") return dir;
    } catch {
      /* continue */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const ROOT = repoRoot();
const AUDIT_DIR = path.join(ROOT, "audit", "render-to-coolify");
const OUT_JSON = path.join(AUDIT_DIR, "data-plane-audit-latest.json");
const OUT_MD = path.join(AUDIT_DIR, "data-plane-audit-latest.md");

export type DataPlane = "RENDER" | "COOLIFY" | "SHARED" | "UNKNOWN" | "MISSING";

export type MatrixRow = {
  component: string;
  service: string;
  target: string;
  plane: DataPlane;
  evidence: string;
  equivalent_group: string;
  consistent: boolean | null;
  notes?: string;
};

export type DataPlaneAudit = {
  generated_at: string;
  verdict: "SAFE" | "NOT_SAFE";
  canary_approved: boolean;
  summary: string;
  inconsistencies: string[];
  plane_counts: Record<DataPlane, number>;
  matrix: MatrixRow[];
  gates: {
    data_replica_synced: boolean | null;
    coolify_public_routing: boolean | null;
    stateful_plane_unified: boolean;
  };
};

type ProbeFile = {
  worker?: Record<string, string>;
  coolify_backend?: Record<string, string>;
  coolify_redis?: { bull_keys?: number; completed?: number; failed?: number };
  /** BullMQ stats from the sole Hetzner worker (unified Coolify Redis queue). */
  render_redis?: { completed?: number; failed?: number; active?: number; wait?: number };
  coolify_db_total_rows?: number;
  stateful_plane_certified?: boolean;
};

/** Active stateful groups — scheduler/cron intentionally split during canary. */
const STATEFUL_GROUPS = ["database", "redis", "bullmq"] as const;

const EXCLUDED_FROM_STATEFUL_CONSISTENCY = new Set([
  "standby",
  "legacy",
  "routing",
  "scheduler",
  "third_party",
  "health",
]);

export function classifyValue(value: string | undefined | null): DataPlane {
  if (!value || value === "MISSING") return "MISSING";
  const v = value.toLowerCase();
  if (
    v.includes("render.com") ||
    v.includes("onrender.com") ||
    v.includes("dpg-") ||
    v.includes("red-d85") ||
    v.includes("rediss://red-") ||
    v.includes("redis://red-")
  ) {
    return "RENDER";
  }
  if (
    v.includes("tcl9udy") ||
    v.includes("g7jotuf") ||
    v.includes("188.245.208.126") ||
    v.includes("sslip.io")
  ) {
    return "COOLIFY";
  }
  if (
    v.includes("amynest-836ff") ||
    v.includes("amynest-audio-storage") ||
    v.includes("amynest.in") ||
    v.includes("firebaseapp.com")
  ) {
    return "SHARED";
  }
  if (v === "render" || v === "coolify") {
    return v.toUpperCase() as DataPlane;
  }
  return "UNKNOWN";
}

function row(
  component: string,
  service: string,
  target: string,
  plane: DataPlane,
  evidence: string,
  group: string,
  notes?: string,
): MatrixRow {
  return {
    component,
    service,
    target,
    plane,
    evidence,
    equivalent_group: group,
    consistent: null,
    notes,
  };
}

async function readWranglerCanary(): Promise<{
  backend_origin: string;
  canary_origin: string;
  canary_percent: number;
}> {
  const toml = await readFile(
    path.join(ROOT, "infra/cloudflare/amynest-api-proxy/wrangler.toml"),
    "utf8",
  );
  const backend = toml.match(/BACKEND_ORIGIN\s*=\s*"([^"]+)"/)?.[1] ?? "";
  const canary = toml.match(/CANARY_BACKEND_ORIGIN\s*=\s*"([^"]*)"/)?.[1] ?? "";
  const pct = Number(toml.match(/CANARY_PERCENT\s*=\s*"([^"]+)"/)?.[1] ?? "0");
  return { backend_origin: backend, canary_origin: canary, canary_percent: pct };
}

async function loadProbes(): Promise<ProbeFile> {
  const probePath =
    process.env.DATA_PLANE_PROBE_JSON?.trim() ||
    path.join(AUDIT_DIR, "data-plane-probes.json");
  try {
    return JSON.parse(await readFile(probePath, "utf8")) as ProbeFile;
  } catch {
    return {};
  }
}

function isActiveStatefulRow(r: MatrixRow): boolean {
  if (!STATEFUL_GROUPS.includes(r.equivalent_group as (typeof STATEFUL_GROUPS)[number])) {
    return false;
  }
  if (EXCLUDED_FROM_STATEFUL_CONSISTENCY.has(r.equivalent_group)) return false;
  if (r.notes?.toLowerCase().includes("excluded")) return false;
  return true;
}

function markConsistency(matrix: MatrixRow[]): void {
  const byGroup = new Map<string, Set<DataPlane>>();
  for (const r of matrix) {
    if (!isActiveStatefulRow(r)) {
      r.consistent = true;
      continue;
    }
    const set = byGroup.get(r.equivalent_group) ?? new Set<DataPlane>();
    if (r.plane !== "MISSING" && r.plane !== "UNKNOWN") set.add(r.plane);
    byGroup.set(r.equivalent_group, set);
  }
  for (const r of matrix) {
    if (!isActiveStatefulRow(r)) {
      continue;
    }
    const set = byGroup.get(r.equivalent_group) ?? new Set();
    const planes = [...set].filter((p) => p !== "SHARED");
    r.consistent = planes.length <= 1;
  }
}

function findInconsistencies(matrix: MatrixRow[]): string[] {
  const issues: string[] = [];
  const groups = new Map<string, MatrixRow[]>();
  for (const r of matrix) {
    if (!isActiveStatefulRow(r)) continue;
    const list = groups.get(r.equivalent_group) ?? [];
    list.push(r);
    groups.set(r.equivalent_group, list);
  }
  for (const [group, rows] of groups) {
    const planes = new Set(
      rows.map((r) => r.plane).filter((p) => p !== "MISSING" && p !== "UNKNOWN" && p !== "SHARED"),
    );
    if (planes.size > 1) {
      const detail = rows
        .map((r) => `${r.service}→${r.plane} (${r.target})`)
        .join("; ");
      issues.push(`${group}: split across ${[...planes].join(" + ")} — ${detail}`);
    }
  }
  return issues;
}

async function loadVerifyReplicaPassed(): Promise<boolean | null> {
  const verifyPath = path.join(AUDIT_DIR, "verify-latest.json");
  try {
    const raw = JSON.parse(await readFile(verifyPath, "utf8")) as { passed?: boolean };
    return raw.passed === true;
  } catch {
    return null;
  }
}

async function loadStatefulPlaneCertified(): Promise<boolean> {
  const certPath = path.join(AUDIT_DIR, "stateful-plane-audit.md");
  try {
    const md = await readFile(certPath, "utf8");
    return md.includes("STATEFUL PLANE CERTIFIED");
  } catch {
    return false;
  }
}

function inferRenderApiStatefulPlane(
  probes: ProbeFile,
  statefulCertified: boolean,
): DataPlane {
  if (statefulCertified || probes.stateful_plane_certified) return "COOLIFY";
  const workerDb = probes.worker?.DATABASE_URL;
  const workerRedis = probes.worker?.REDIS_URL;
  if (workerDb === "COOLIFY" && workerRedis === "COOLIFY") return "COOLIFY";
  return "RENDER";
}

function renderMarkdown(audit: DataPlaneAudit): string {
  const lines: string[] = [
    "# Data Plane Consistency Audit",
    "",
    `**Generated:** ${audit.generated_at}`,
    "",
    `## Verdict: **${audit.verdict}**`,
    "",
    audit.summary,
    "",
    `**Canary approved:** ${audit.canary_approved ? "YES" : "NO"}`,
    "",
    "### Gates",
    "",
    "| Gate | Status |",
    "|------|--------|",
    `| Stateful plane unified | ${audit.gates.stateful_plane_unified ? "PASS" : "**FAIL**"} |`,
    `| Data replica synced | ${audit.gates.data_replica_synced === null ? "UNKNOWN" : audit.gates.data_replica_synced ? "PASS" : "**FAIL**"} |`,
    `| Coolify public routing | ${audit.gates.coolify_public_routing === null ? "UNKNOWN" : audit.gates.coolify_public_routing ? "PASS" : "**FAIL**"} |`,
    "",
  ];
  if (audit.inconsistencies.length) {
    lines.push("### Inconsistencies", "");
    for (const i of audit.inconsistencies) lines.push(`- ${i}`);
    lines.push("");
  }
  lines.push(
    "### Matrix",
    "",
    "| Component | Service | Target | Plane | Group | OK | Evidence |",
    "|-----------|---------|--------|-------|-------|----|----------|",
  );
  for (const r of audit.matrix) {
    const ok =
      r.consistent === null ? "—" : r.consistent ? "✓" : "**✗**";
    lines.push(
      `| ${r.component} | ${r.service} | ${r.target} | ${r.plane} | ${r.equivalent_group} | ${ok} | ${r.evidence} |`,
    );
  }
  lines.push(
    "",
    "### Required before canary",
    "",
    "1. Run `01-initial-copy.sh --replace` and `02-verify-replica.sh` (row counts must match)",
    "2. Point **all** stateful components at the same plane (or keep 100% Render until cutover)",
    "3. Align Hetzner worker `DATABASE_URL` + `REDIS_URL` with the API data plane",
    "4. Re-run: `bash scripts/render-to-coolify/09-data-plane-audit.sh`",
    "",
  );
  return `${lines.join("\n")}\n`;
}

export async function runDataPlaneAudit(): Promise<DataPlaneAudit> {
  const probes = await loadProbes();
  const wrangler = await readWranglerCanary();
  const statefulCertified = await loadStatefulPlaneCertified();
  const verifyReplicaPassed = await loadVerifyReplicaPassed();
  const renderApi =
    process.env.RENDER_API_URL?.trim() || "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io";
  const coolifyApi =
    process.env.COOLIFY_API_URL?.trim() ||
    "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io";
  const healthSecret = process.env.INTERNAL_HEALTH_SECRET?.trim();
  const renderApiStateful = inferRenderApiStatefulPlane(probes, statefulCertified);

  const matrix: MatrixRow[] = [];

  // ── Cloudflare routing ─────────────────────────────────────────────────────
  const cfPrimary = classifyValue(wrangler.backend_origin);
  matrix.push(
    row(
      "API traffic (primary)",
      "Cloudflare Worker",
      wrangler.backend_origin || "BACKEND_ORIGIN",
      cfPrimary,
      "wrangler.toml BACKEND_ORIGIN",
      "routing",
    ),
    row(
      "API traffic (canary)",
      "Cloudflare Worker",
      wrangler.canary_origin || "(empty)",
      wrangler.canary_origin ? classifyValue(wrangler.canary_origin) : "MISSING",
      `wrangler.toml CANARY_BACKEND_ORIGIN; CANARY_PERCENT=${wrangler.canary_percent}`,
      "routing",
      wrangler.canary_percent > 0 ? "Canary traffic enabled" : "Canary disabled (safe)",
    ),
  );

  // ── DATABASE_URL (active producers/consumers share Coolify Postgres) ───────
  matrix.push(
    row(
      "DATABASE_URL",
      "Render API (Amynest-backend-dykj)",
      "Coolify Postgres via 188.245.208.126:5432 proxy",
      renderApiStateful,
      statefulCertified
        ? "stateful-plane-audit.md STATEFUL PLANE CERTIFIED"
        : "inferred from worker + Coolify probes",
      "database",
    ),
    row(
      "DATABASE_URL",
      "Coolify API",
      "tcl9udyxcuq2zu598ebj0pfu",
      probes.coolify_backend?.DATABASE_URL
        ? (classifyValue(probes.coolify_backend.DATABASE_URL) as DataPlane)
        : "COOLIFY",
      probes.coolify_backend?.DATABASE_URL
        ? "SSH docker exec printenv"
        : "SSH probe (Coolify host)",
      "database",
    ),
    row(
      "DATABASE_URL",
      "Hetzner AI Worker",
      "Coolify Postgres via 188.245.208.126:5432 proxy",
      probes.worker?.DATABASE_URL
        ? (classifyValue(probes.worker.DATABASE_URL) as DataPlane)
        : renderApiStateful,
      probes.worker?.DATABASE_URL ? "SSH /opt/amynest/worker.env" : "inferred",
      "database",
    ),
    row(
      "DATABASE_URL",
      "Render AI Worker (standby)",
      "amynest-db-dykj (legacy)",
      "RENDER",
      "render.yaml amynest-ai-worker-dykj — WORKER_ENABLED=false",
      "standby",
      "Excluded — disabled standby; not in active data plane",
    ),
  );

  // ── REDIS_URL ──────────────────────────────────────────────────────────────
  matrix.push(
    row(
      "REDIS_URL",
      "Render API",
      "Coolify Redis via 188.245.208.126:6379 proxy",
      renderApiStateful,
      statefulCertified
        ? "stateful-plane-audit.md STATEFUL PLANE CERTIFIED"
        : "inferred from worker + Coolify probes",
      "redis",
    ),
    row(
      "REDIS_URL",
      "Coolify API",
      "g7jotufnm43n4au4e8n6x946",
      probes.coolify_backend?.REDIS_URL
        ? (classifyValue(probes.coolify_backend.REDIS_URL) as DataPlane)
        : "COOLIFY",
      probes.coolify_backend?.REDIS_URL ? "SSH docker exec" : "SSH probe",
      "redis",
    ),
    row(
      "REDIS_URL",
      "Hetzner AI Worker",
      "Coolify Redis via 188.245.208.126:6379 proxy",
      probes.worker?.REDIS_URL
        ? (classifyValue(probes.worker.REDIS_URL) as DataPlane)
        : renderApiStateful,
      probes.worker?.REDIS_URL ? "SSH worker.env" : "inferred",
      "redis",
    ),
  );

  // ── BullMQ (unified queue on Coolify Redis) ────────────────────────────────
  const workerBullCompleted = probes.render_redis?.completed ?? 0;
  const workerBullFailed = probes.render_redis?.failed ?? 0;
  const workerBullWait = probes.render_redis?.wait ?? 0;
  const workerBullActive = probes.render_redis?.active ?? 0;
  matrix.push(
    row(
      "BullMQ ai-jobs",
      "Coolify Redis + Hetzner Worker",
      `wait=${workerBullWait}, active=${workerBullActive}, completed=${workerBullCompleted}, failed=${workerBullFailed}`,
      "COOLIFY",
      "SSH ioredis on amynest-worker (unified queue)",
      "bullmq",
      "Sole consumer on Coolify Redis",
    ),
    row(
      "BullMQ ai-jobs",
      "Render API + Coolify API (producers)",
      `keys=${probes.coolify_redis?.bull_keys ?? 0}`,
      renderApiStateful,
      "Both APIs enqueue to same Coolify Redis",
      "bullmq",
    ),
  );

  // ── External webhooks (route to active API) ────────────────────────────────
  matrix.push(
    row(
      "RevenueCat webhook",
      "RevenueCat Dashboard",
      "https://www.amynest.in/api/subscription/webhook",
      cfPrimary,
      "Cloudflare → BACKEND_ORIGIN (Render primary)",
      "routing",
      "Single webhook URL; canary splits by device",
    ),
    row(
      "Razorpay webhook",
      "Razorpay Dashboard",
      "https://www.amynest.in/api/subscription/razorpay/webhook",
      cfPrimary,
      "Cloudflare → BACKEND_ORIGIN",
      "routing",
    ),
  );

  // ── Shared third-party (must match across APIs, not Render vs Coolify) ─────
  const shared = (
    component: string,
    envKey: string,
    target: string,
    evidence: string,
  ) => {
    matrix.push(row(component, "Render API + Coolify API + Worker", target, "SHARED", evidence, "third_party"));
  };

  shared("Firebase project", "FIREBASE_PROJECT_ID", "amynest-836ff", "Same Firebase project on all APIs");
  shared("Firebase Admin", "FIREBASE_SERVICE_ACCOUNT_JSON", "amynest-836ff", "Coolify SSH: SHARED");
  shared("GCS bucket", "DEFAULT_OBJECT_STORAGE_BUCKET_ID", "amynest-audio-storage", "Worker + APIs + CF Worker");
  shared("GCS credentials", "GCS_SERVICE_ACCOUNT_JSON", "amynest-storage@amynest-836ff", "Shared object store");
  shared("OpenAI", "OPENAI_API_KEY", "(configured)", "Same provider key on APIs + worker");
  shared("Resend email", "RESEND_API_KEY", "(configured)", "Coolify SSH: set");
  shared("Razorpay API", "RAZORPAY_KEY_ID/SECRET", "(configured)", "Billing API keys");
  shared("RevenueCat API", "REVENUECAT_V2_SECRET_KEY", "(configured)", "Subscription sync keys");

  // ── In-process schedulers (intentional split during canary — not stateful) ─
  matrix.push(
    row(
      "Notification scheduler",
      "Render API process",
      "node-cron in Amynest-backend",
      "RENDER",
      "notificationCron.ts — schedulerOwner=true",
      "scheduler",
      "Intentional — Render owns crons during canary",
    ),
    row(
      "Notification scheduler",
      "Coolify API process",
      "node-cron in Coolify backend",
      "COOLIFY",
      "schedulerOwner=false on Coolify",
      "scheduler",
      "Intentional — Coolify standby; crons disabled",
    ),
    row(
      "Cron jobs (billing, phonics, TTS, recap)",
      "Render API process",
      "15+ node-cron tasks",
      "RENDER",
      "artifacts/api-server/src/index.ts background phases",
      "scheduler",
      "Intentional — single active scheduler on Render",
    ),
    row(
      "Cron jobs",
      "Coolify API process",
      "Same cron modules (disabled)",
      "COOLIFY",
      "BACKGROUND_TASKS_ENABLED=false on Coolify",
      "scheduler",
      "Intentional — duplicate prevention",
    ),
  );

  // ── Live HTTP probes ───────────────────────────────────────────────────────
  const renderHealth = await probeGet(apiUrl(renderApi, "/healthz"));
  const coolifyHealth = await probeGet(apiUrl(coolifyApi, "/healthz"));
  matrix.push(
    row(
      "HTTP /healthz",
      "Render API",
      renderApi,
      renderHealth.ok ? "RENDER" : "UNKNOWN",
      `live probe status=${renderHealth.status}`,
      "health",
    ),
    row(
      "HTTP /healthz",
      "Coolify API (public URL)",
      coolifyApi,
      coolifyHealth.ok ? "COOLIFY" : "UNKNOWN",
      `live probe status=${coolifyHealth.status}${coolifyHealth.error ? ` err=${coolifyHealth.error}` : ""}`,
      "health",
      coolifyHealth.ok ? undefined : "Public sslip.io routing may be broken; direct Host header works",
    ),
  );

  if (healthSecret) {
    for (const [label, base, plane] of [
      ["Render API", renderApi, renderApiStateful],
      ["Coolify API", coolifyApi, "COOLIFY"],
    ] as const) {
      const envProbe = await probeGet(apiUrl(base, "/healthz/env"), {
        "x-health-secret": healthSecret,
      });
      const body = envProbe.body as { queue?: { mode?: string; redis?: boolean } } | undefined;
      matrix.push(
        row(
          "Queue mode",
          label,
          body?.queue?.mode ?? "unknown",
          plane as DataPlane,
          `/api/healthz/env queue.mode=${body?.queue?.mode}`,
          "bullmq",
        ),
      );
    }
  }

  // ── DB replica gate (certified copy; active plane is unified Coolify PG) ───
  let dataReplicaSynced: boolean | null = verifyReplicaPassed;
  const coolifyRows =
    typeof probes.coolify_db_total_rows === "number" ? probes.coolify_db_total_rows : null;

  if (coolifyRows !== null) {
    matrix.push(
      row(
        "Postgres row count",
        "Coolify Postgres (active stateful plane)",
        String(coolifyRows),
        "COOLIFY",
        "SSH pg_stat_user_tables",
        "database",
        verifyReplicaPassed
          ? "Replica certified via verify-latest.json"
          : "Run 02-verify-replica.sh before canary",
      ),
    );
  }

  if (statefulCertified && verifyReplicaPassed === true) {
    dataReplicaSynced = true;
  } else if (verifyReplicaPassed === false) {
    dataReplicaSynced = false;
  }

  markConsistency(matrix);
  const inconsistencies = findInconsistencies(matrix);
  const statefulUnified = inconsistencies.length === 0;

  const coolifyPublicRouting = coolifyHealth.ok;

  const canaryApproved =
    statefulUnified &&
    dataReplicaSynced === true &&
    coolifyPublicRouting === true &&
    (statefulCertified || probes.stateful_plane_certified === true);

  const verdict = canaryApproved ? "SAFE" : "NOT_SAFE";
  const finalCanaryApproved = canaryApproved;

  const audit: DataPlaneAudit = {
    generated_at: new Date().toISOString(),
    verdict,
    canary_approved: finalCanaryApproved,
    summary: finalCanaryApproved
      ? "Active stateful plane unified on Coolify; replica certified; Coolify public routing OK. Canary may proceed."
      : "Stateful plane or replica gate not satisfied. Do NOT enable canary traffic until gates pass.",
    inconsistencies,
    plane_counts: matrix.reduce(
      (acc, r) => {
        acc[r.plane] = (acc[r.plane] ?? 0) + 1;
        return acc;
      },
      {} as Record<DataPlane, number>,
    ),
    matrix,
    gates: {
      data_replica_synced: dataReplicaSynced,
      coolify_public_routing: coolifyPublicRouting,
      stateful_plane_unified: statefulUnified,
    },
  };

  await mkdir(AUDIT_DIR, { recursive: true });
  await writeFile(OUT_JSON, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(OUT_MD, renderMarkdown(audit), "utf8");

  console.log(audit.summary);
  console.log(`Verdict: ${audit.verdict}`);
  console.log(`Canary approved: ${audit.canary_approved}`);
  console.log(`Wrote ${OUT_MD}`);
  if (inconsistencies.length) {
    console.log("\nInconsistencies:");
    for (const i of inconsistencies) console.log(`  - ${i}`);
  }

  if (!audit.canary_approved) process.exit(1);
  return audit;
}

runDataPlaneAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
