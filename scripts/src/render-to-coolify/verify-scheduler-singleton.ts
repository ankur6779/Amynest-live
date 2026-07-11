/**
 * Verify Single Active Scheduler — no duplicate cron owners across Render + Coolify.
 *
 *   pnpm run migrate:render-to-coolify:verify-scheduler
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { probeGet, apiUrl } from "./probes";

const JOB_CATALOG_COUNT = 23;

const AUDIT_DIR = path.join(process.cwd(), "audit", "render-to-coolify");
const OUT_JSON = path.join(AUDIT_DIR, "scheduler-singleton-latest.json");
const OUT_MD = path.join(AUDIT_DIR, "scheduler-singleton-latest.md");

type SchedulerEnvProbe = {
  label: string;
  url: string;
  ok: boolean;
  owner: boolean | null;
  mode: string | null;
  active_plane: string | null;
  local_plane: string | null;
  background_tasks_enabled: boolean | null;
  notifications_enabled: boolean | null;
  job_count: number | null;
  error?: string;
};

async function probeScheduler(
  label: string,
  baseUrl: string,
  healthSecret?: string,
): Promise<SchedulerEnvProbe> {
  const headers = healthSecret ? { "x-health-secret": healthSecret } : undefined;
  const res = await probeGet(apiUrl(baseUrl, "/healthz/env"), headers);
  if (!res.ok || res.status === 404) {
    return {
      label,
      url: baseUrl,
      ok: false,
      owner: null,
      mode: null,
      active_plane: null,
      local_plane: null,
      background_tasks_enabled: null,
      notifications_enabled: null,
      job_count: null,
      error: res.status === 404 ? "healthz/env requires INTERNAL_HEALTH_SECRET" : res.error,
    };
  }
  const body = res.body as {
    scheduler?: {
      owner?: boolean;
      mode?: string;
      active_plane?: string | null;
      local_plane?: string;
      background_tasks_enabled?: boolean;
      notifications_enabled?: boolean;
      job_catalog_count?: number;
      jobs?: string[];
    };
  };
  const s = body.scheduler;
  return {
    label,
    url: baseUrl,
    ok: true,
    owner: s?.owner ?? null,
    mode: s?.mode ?? null,
    active_plane: s?.active_plane ?? null,
    local_plane: s?.local_plane ?? null,
    background_tasks_enabled: s?.background_tasks_enabled ?? null,
    notifications_enabled: s?.notifications_enabled ?? null,
    job_count: s?.job_catalog_count ?? s?.jobs?.length ?? null,
  };
}

function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) as {
        name?: string;
      };
      if (pkg.name === "workspace") return dir;
    } catch {
      /* continue */
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

async function loadSshProbes(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(path.join(repoRoot(), "audit/render-to-coolify/data-plane-probes.json"), "utf8");
    const data = JSON.parse(raw) as {
      worker?: Record<string, string>;
      coolify_backend?: Record<string, string>;
    };
    return {
      ...(data.coolify_backend ?? {}),
    };
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const renderUrl =
    process.env.RENDER_API_URL?.trim() || "https://amynest-backend-dykj.onrender.com";
  const coolifyUrl =
    process.env.COOLIFY_API_URL?.trim() ||
    "https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io";
  const secret = process.env.INTERNAL_HEALTH_SECRET?.trim();

  const [render, coolify] = await Promise.all([
    probeScheduler("Render API", renderUrl, secret),
    probeScheduler("Coolify API", coolifyUrl, secret),
  ]);

  const ssh = await loadSshProbes();
  const coolifyBg = ssh.BACKGROUND_TASKS_ENABLED ?? "(unknown)";
  const coolifyNotif = ssh.NOTIFICATIONS_ENABLED ?? "(unknown)";

  const owners = [render, coolify].filter((p) => p.owner === true);
  const passed = owners.length === 1;

  const issues: string[] = [];
  if (owners.length === 0) {
    issues.push("No scheduler owner detected — all crons may be disabled");
  }
  if (owners.length > 1) {
    issues.push(
      `Multiple scheduler owners: ${owners.map((o) => o.label).join(", ")} — duplicate crons will run`,
    );
  }
  if (coolifyBg === "OTHER" || coolifyNotif === "OTHER") {
    issues.push("Coolify has schedulers enabled via SSH env (expected false/false during presync)");
  }
  if (render.owner === false && coolify.owner === false) {
    issues.push("Neither API is scheduler owner — notifications and billing jobs will not run");
  }

  const categories = ["notifications", "billing", "recap", "cleanup", "content", "infra"];
  const triggers = ["node-cron", "http-cron", "bullmq"];

  const report = {
    generated_at: new Date().toISOString(),
    passed,
    owner_count: owners.length,
    active_owner: owners[0]?.label ?? null,
    issues,
    catalog: {
      jobs: JOB_CATALOG_COUNT,
      categories,
      triggers,
    },
    probes: { render, coolify },
    ssh_coolify_env: {
      BACKGROUND_TASKS_ENABLED: coolifyBg,
      NOTIFICATIONS_ENABLED: coolifyNotif,
    },
    presync_expected: {
      render: {
        SCHEDULER_ACTIVE_PLANE: "render",
        BACKGROUND_TASKS_ENABLED: "true",
        NOTIFICATIONS_ENABLED: "true",
      },
      coolify: {
        SCHEDULER_ACTIVE_PLANE: "render",
        BACKGROUND_TASKS_ENABLED: "false",
        NOTIFICATIONS_ENABLED: "false",
      },
    },
  };

  const md = [
    "# Scheduler Singleton Verification",
    "",
    `**Generated:** ${report.generated_at}`,
    "",
    `## Result: **${passed ? "PASS" : "FAIL"}**`,
    "",
    `Active owner: ${report.active_owner ?? "(none)"}`,
    "",
    issues.length ? `### Issues\n\n${issues.map((i) => `- ${i}`).join("\n")}\n` : "",
    "### Probes",
    "",
    "| API | Owner | Mode | Active plane | Local plane | BG tasks | Notifications |",
    "|-----|-------|------|--------------|-------------|----------|---------------|",
    `| Render | ${render.owner} | ${render.mode} | ${render.active_plane} | ${render.local_plane} | ${render.background_tasks_enabled} | ${render.notifications_enabled} |`,
    `| Coolify | ${coolify.owner} | ${coolify.mode} | ${coolify.active_plane} | ${coolify.local_plane} | ${coolify.background_tasks_enabled} | ${coolify.notifications_enabled} |`,
    "",
    `Job catalog: **${JOB_CATALOG_COUNT}** jobs across categories: ${categories.join(", ")}`,
    "",
    "### Duplicate prevention",
    "",
    "- `SCHEDULER_ACTIVE_PLANE` ensures only one plane runs node-cron jobs",
    "- Standby instances reject HTTP cron pings with `503 scheduler_standby`",
    "- Advisory locks (`pg_try_advisory_lock`) prevent overlap on the **same** database only",
    "- BullMQ has no repeat/cron jobs — worker consumes `ai-jobs` queue only",
    "",
  ].join("\n");

  await mkdir(AUDIT_DIR, { recursive: true });
  await writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(OUT_MD, md, "utf8");

  console.log(`Scheduler singleton: ${passed ? "PASS" : "FAIL"}`);
  console.log(`Wrote ${OUT_MD}`);
  if (!passed) {
    for (const i of issues) console.log(`  - ${i}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
