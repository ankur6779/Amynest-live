/**
 * Post-verification smoke tests against the Coolify (or any) AmyNest API backend.
 *
 *   COOLIFY_API_URL=https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io \
 *   SMOKE_FIREBASE_ID_TOKEN=eyJ... \
 *   INTERNAL_HEALTH_SECRET=... \
 *   REVENUECAT_WEBHOOK_SECRET=... \
 *   pnpm run migrate:render-to-coolify:smoke
 *
 * Optional:
 *   bash scripts/render-to-coolify/mint-smoke-firebase-token.sh — mint ID token from SA JSON
 *   SMOKE_WORKER_HEALTH_URL=http://127.0.0.1:9090/health — BullMQ consumer probe
 *   SMOKE_CHILD_ID=123 — override child for routine test
 *   SMOKE_SKIP_AI=1 — skip enqueue/poll (faster)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, requireEnv } from "./pg-utils";

type CheckStatus = "pass" | "fail" | "skip" | "warn";

type SmokeCheck = {
  id: string;
  category: string;
  status: CheckStatus;
  message: string;
  durationMs: number;
  details?: Record<string, unknown>;
};

type SmokeReport = {
  generated_at: string;
  api_url: string;
  passed: boolean;
  summary: { pass: number; fail: number; skip: number; warn: number };
  checks: SmokeCheck[];
};

const REPORT_DIR = path.join(process.cwd(), "audit", "render-to-coolify");

function apiBase(): string {
  const raw = requireEnv("COOLIFY_API_URL").replace(/\/$/, "");
  return raw;
}

function api(pathname: string): string {
  const base = apiBase();
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (p.startsWith("/api/")) return `${base}${p}`;
  if (p === "/health" || p === "/ready") return `${base}${p}`;
  return `${base}/api${p}`;
}

async function timed<T>(
  id: string,
  category: string,
  fn: () => Promise<{ status: CheckStatus; message: string; details?: Record<string, unknown> }>,
): Promise<SmokeCheck> {
  const start = Date.now();
  try {
    const result = await fn();
    return { id, category, ...result, durationMs: Date.now() - start };
  } catch (err) {
    return {
      id,
      category,
      status: "fail",
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown; text: string }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* plain text */
  }
  return { status: res.status, body, text };
}

async function resolveIdToken(): Promise<string | null> {
  return process.env.SMOKE_FIREBASE_ID_TOKEN?.trim() ?? null;
}

function formatReportMarkdown(report: SmokeReport): string {
  const lines = [
    `# Coolify backend smoke test`,
    ``,
    `Generated: ${report.generated_at}`,
    `API: ${report.api_url}`,
    ``,
    `## Result: ${report.passed ? "PASS ✓" : "FAIL ✗"}`,
    ``,
    `| Pass | Fail | Skip | Warn |`,
    `|-----:|-----:|-----:|-----:|`,
    `| ${report.summary.pass} | ${report.summary.fail} | ${report.summary.skip} | ${report.summary.warn} |`,
    ``,
    `| Check | Status | Message |`,
    `|-------|--------|---------|`,
  ];
  for (const c of report.checks) {
    lines.push(`| ${c.id} | ${c.status} | ${c.message.replace(/\|/g, "/")} |`);
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const failOnFailure = args["no-fail-on-failure"] !== true;
  const base = apiBase();
  const checks: SmokeCheck[] = [];

  let idToken: string | null = await resolveIdToken();

  const authHeaders = idToken
    ? { authorization: `Bearer ${idToken}`, "content-type": "application/json" }
    : { "content-type": "application/json" };

  // ── /health ──────────────────────────────────────────────────────────────
  checks.push(
    await timed("health", "infra", async () => {
      const { status, body } = await fetchJson(api("/health"));
      const ok =
        status === 200 &&
        typeof body === "object" &&
        body !== null &&
        (body as { ok?: boolean }).ok === true;
      return ok
        ? { status: "pass", message: `GET /health → ${status}` }
        : { status: "fail", message: `GET /health → ${status}`, details: { body } };
    }),
  );

  // ── /ready (or readiness surrogate) ───────────────────────────────────────
  checks.push(
    await timed("ready", "infra", async () => {
      const readyRes = await fetchJson(api("/ready"));
      if (readyRes.status === 200) {
        return { status: "pass", message: "GET /ready → 200" };
      }
      if (readyRes.status !== 404) {
        return {
          status: "fail",
          message: `GET /ready → ${readyRes.status} (expected 200 or 404)`,
        };
      }

      const healthz = await fetchJson(api("/healthz"));
      const secret = process.env.INTERNAL_HEALTH_SECRET?.trim();
      const envHeaders: Record<string, string> = secret
        ? { "x-health-secret": secret }
        : {};
      const envRes = await fetchJson(api("/healthz/env"), { headers: envHeaders });

      if (healthz.status !== 200) {
        return { status: "fail", message: `Readiness surrogate /api/healthz → ${healthz.status}` };
      }
      if (envRes.status === 404 && secret) {
        return { status: "fail", message: "/api/healthz/env → 404 (wrong INTERNAL_HEALTH_SECRET)" };
      }
      if (envRes.status === 200) {
        const envBody = envRes.body as { ok?: boolean; queue?: { redis?: boolean } };
        const ok = envBody.ok === true;
        return ok
          ? {
              status: "pass",
              message: "GET /ready N/A — /api/healthz + /api/healthz/env readiness OK",
              details: { queue: envBody.queue },
            }
          : {
              status: "fail",
              message: "/api/healthz/env reports not ready",
              details: { body: envBody },
            };
      }
      return {
        status: "warn",
        message:
          "GET /ready → 404; /api/healthz OK but /api/healthz/env needs INTERNAL_HEALTH_SECRET",
      };
    }),
  );

  // ── Firebase login ─────────────────────────────────────────────────────────
  if (!idToken) {
    checks.push({
      id: "firebase_login",
      category: "auth",
      status: "skip",
      message:
        "Set SMOKE_FIREBASE_ID_TOKEN or SMOKE_FIREBASE_UID + FIREBASE_SERVICE_ACCOUNT_JSON + FIREBASE_WEB_API_KEY",
      durationMs: 0,
    });
  } else {
    checks.push(
      await timed("firebase_login", "auth", async () => {
        const { status } = await fetchJson(api("/parent-profile"), { headers: authHeaders });
        if (status === 401) {
          return { status: "fail", message: "Bearer token rejected (401)" };
        }
        return { status: "pass", message: `Firebase token accepted (parent-profile → ${status})` };
      }),
    );
  }

  // ── Parent profile ─────────────────────────────────────────────────────────
  if (!idToken) {
    checks.push({
      id: "parent_profile",
      category: "data",
      status: "skip",
      message: "Requires auth token",
      durationMs: 0,
    });
  } else {
    checks.push(
      await timed("parent_profile", "data", async () => {
        const { status, body } = await fetchJson(api("/parent-profile"), { headers: authHeaders });
        if (status === 200) {
          const p = body as { userId?: string; name?: string };
          return {
            status: "pass",
            message: `Parent profile loaded (userId=${p.userId ?? "?"})`,
          };
        }
        if (status === 404) {
          return {
            status: "warn",
            message: "Parent profile 404 — smoke user has no profile row yet",
          };
        }
        return { status: "fail", message: `GET /parent-profile → ${status}`, details: { body } };
      }),
    );
  }

  // ── Child profile ──────────────────────────────────────────────────────────
  let childId: number | null = process.env.SMOKE_CHILD_ID
    ? Number(process.env.SMOKE_CHILD_ID)
    : null;

  if (!idToken) {
    checks.push({
      id: "child_profile",
      category: "data",
      status: "skip",
      message: "Requires auth token",
      durationMs: 0,
    });
  } else {
    checks.push(
      await timed("child_profile", "data", async () => {
        const { status, body } = await fetchJson(api("/children"), { headers: authHeaders });
        if (status !== 200) {
          return { status: "fail", message: `GET /children → ${status}`, details: { body } };
        }
        const rows = body as Array<{ id?: number; name?: string }>;
        if (!Array.isArray(rows) || rows.length === 0) {
          return { status: "warn", message: "GET /children → 200 but empty array" };
        }
        if (!childId && rows[0]?.id) childId = rows[0].id;
        return {
          status: "pass",
          message: `Loaded ${rows.length} child(ren); using childId=${childId ?? "?"}`,
        };
      }),
    );
  }

  // ── Subscription lookup ──────────────────────────────────────────────────
  if (!idToken) {
    checks.push({
      id: "subscription_lookup",
      category: "billing",
      status: "skip",
      message: "Requires auth token",
      durationMs: 0,
    });
  } else {
    checks.push(
      await timed("subscription_lookup", "billing", async () => {
        const { status, body } = await fetchJson(api("/subscription"), { headers: authHeaders });
        if (status !== 200) {
          return { status: "fail", message: `GET /subscription → ${status}`, details: { body } };
        }
        const ent = (body as { entitlements?: { isPremium?: boolean } }).entitlements;
        return {
          status: "pass",
          message: `Subscription loaded (isPremium=${ent?.isPremium ?? "?"})`,
        };
      }),
    );
  }

  // ── RevenueCat webhook validation ──────────────────────────────────────────
  checks.push(
    await timed("revenuecat_webhook_validation", "billing", async () => {
      const url = api("/subscription/webhook");
      const noAuth = await fetchJson(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: { type: "TEST" } }),
      });
      if (noAuth.status !== 401 && noAuth.status !== 503) {
        return {
          status: "fail",
          message: `Webhook without auth → ${noAuth.status} (expected 401 or 503)`,
        };
      }

      const secret = process.env.REVENUECAT_WEBHOOK_SECRET?.trim();
      if (!secret) {
        return {
          status: "warn",
          message: "REVENUECAT_WEBHOOK_SECRET unset — auth rejection only",
        };
      }

      const badBody = await fetchJson(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ event: { type: "TEST" } }),
      });
      if (badBody.status !== 400) {
        return {
          status: "fail",
          message: `Webhook missing app_user_id → ${badBody.status} (expected 400)`,
        };
      }

      return {
        status: "pass",
        message: "Webhook auth + payload validation OK (401/400 paths verified)",
      };
    }),
  );

  // ── GCS access ─────────────────────────────────────────────────────────────
  checks.push(
    await timed("gcs_access", "storage", async () => {
      const { status, body } = await fetchJson(api("/healthz/audio"));
      const b = body as {
        ok?: boolean;
        staticAudio?: { gcsConfigured?: boolean; gcsProbeOk?: boolean };
      };
      if (status === 503 || b.ok !== true) {
        return {
          status: "fail",
          message: `/api/healthz/audio not ready (${status})`,
          details: { body: b },
        };
      }
      const gcsOk = b.staticAudio?.gcsConfigured && b.staticAudio?.gcsProbeOk;
      return gcsOk
        ? { status: "pass", message: "GCS configured and probe OK" }
        : {
            status: "fail",
            message: "GCS probe failed",
            details: { staticAudio: b.staticAudio },
          };
    }),
  );

  // ── Push notification registration ─────────────────────────────────────────
  if (!idToken) {
    checks.push({
      id: "push_registration",
      category: "notifications",
      status: "skip",
      message: "Requires auth token",
      durationMs: 0,
    });
  } else {
    checks.push(
      await timed("push_registration", "notifications", async () => {
        const token = `SmokeToken[${Date.now()}]`;
        const { status, body } = await fetchJson(api("/push/register"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ token, platform: "web", deviceName: "coolify-smoke" }),
        });
        if (status !== 200) {
          return { status: "fail", message: `POST /push/register → ${status}`, details: { body } };
        }
        return { status: "pass", message: "Push token registered" };
      }),
    );
  }

  // ── Routine generation (auth + routing; may 403/429 without failing infra) ─
  if (!idToken || !childId) {
    checks.push({
      id: "routine_generation",
      category: "ai",
      status: "skip",
      message: "Requires auth token and childId",
      durationMs: 0,
    });
  } else {
    checks.push(
      await timed("routine_generation", "ai", async () => {
        const today = new Date().toISOString().slice(0, 10);
        const { status, body } = await fetchJson(api("/routines/generate-ai"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            childId,
            date: today,
            age: 6,
            hasSchool: false,
            mood: "happy",
          }),
        });
        if (status >= 500) {
          return {
            status: "fail",
            message: `POST /routines/generate-ai → ${status}`,
            details: { body },
          };
        }
        return {
          status: "pass",
          message: `Routine endpoint reachable (${status} — not 5xx)`,
          details: { status },
        };
      }),
    );
  }

  // ── BullMQ enqueue + processing ────────────────────────────────────────────
  let jobId: string | null = null;
  const skipAi = process.env.SMOKE_SKIP_AI === "1";

  if (!idToken || skipAi) {
    checks.push({
      id: "bullmq_enqueue",
      category: "queue",
      status: skipAi ? "skip" : "skip",
      message: skipAi ? "SMOKE_SKIP_AI=1" : "Requires auth token",
      durationMs: 0,
    });
    checks.push({
      id: "bullmq_processing",
      category: "queue",
      status: "skip",
      message: skipAi ? "SMOKE_SKIP_AI=1" : "Requires enqueue",
      durationMs: 0,
    });
    checks.push({
      id: "ai_request",
      category: "ai",
      status: skipAi ? "skip" : "skip",
      message: skipAi ? "SMOKE_SKIP_AI=1" : "Requires auth token",
      durationMs: 0,
    });
  } else {
    checks.push(
      await timed("bullmq_enqueue", "queue", async () => {
        const { status, body } = await fetchJson(api("/audio-warmup/enqueue"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ module: "parent_hub", maxAssets: 1 }),
        });
        const b = body as { jobId?: string; ok?: boolean; deduped?: boolean };
        if (status === 202 && (b.jobId || b.deduped)) {
          jobId = b.jobId ?? null;
          return {
            status: "pass",
            message: b.deduped
              ? "Enqueue deduped (queue recently touched)"
              : `Job enqueued: ${b.jobId}`,
          };
        }
        if (status === 503) {
          return { status: "fail", message: "AI queue unavailable (503)", details: { body: b } };
        }
        return { status: "fail", message: `Enqueue → ${status}`, details: { body: b } };
      }),
    );

    checks.push(
      await timed("ai_request", "ai", async () => {
        if (!jobId) {
          return { status: "warn", message: "No jobId (deduped) — AI path assumed warm" };
        }
        const { status, body } = await fetchJson(api(`/result/${jobId}`), {
          headers: authHeaders,
        });
        if (status === 202 || status === 200) {
          return { status: "pass", message: `Job poll → ${status}` };
        }
        return { status: "fail", message: `GET /result/${jobId} → ${status}`, details: { body } };
      }),
    );

    checks.push(
      await timed("bullmq_processing", "queue", async () => {
        const workerUrl = process.env.SMOKE_WORKER_HEALTH_URL?.trim();
        if (workerUrl) {
          const w = await fetchJson(workerUrl);
          const snap = w.body as {
            ok?: boolean;
            bullMqActive?: boolean;
            consumerRegistered?: boolean;
          };
          if (w.status === 200 && snap.ok && snap.bullMqActive && snap.consumerRegistered) {
            return { status: "pass", message: "Worker health OK (consumer registered)" };
          }
          return {
            status: "fail",
            message: "Worker health check failed",
            details: { status: w.status, body: snap },
          };
        }

        if (!jobId) {
          const secret = process.env.INTERNAL_HEALTH_SECRET?.trim();
          if (!secret) {
            return {
              status: "warn",
              message: "Set SMOKE_WORKER_HEALTH_URL or INTERNAL_HEALTH_SECRET for queue proof",
            };
          }
          const envRes = await fetchJson(api("/healthz/env"), {
            headers: { "x-health-secret": secret },
          });
          const q = (envRes.body as { queue?: { mode?: string; redis?: boolean } }).queue;
          if (q?.mode === "bullmq" && q.redis) {
            return {
              status: "warn",
              message: "BullMQ mode confirmed via healthz/env; worker not directly probed",
              details: { queue: q },
            };
          }
          return { status: "fail", message: "BullMQ not active on API", details: { queue: q } };
        }

        const deadline = Date.now() + 45_000;
        let lastStatus = "unknown";
        while (Date.now() < deadline) {
          const { status, body } = await fetchJson(api(`/result/${jobId}`), {
            headers: authHeaders,
          });
          const b = body as { status?: string };
          lastStatus = b.status ?? String(status);
          if (b.status === "completed" || b.status === "failed") {
            return b.status === "completed"
              ? { status: "pass", message: "Job completed" }
              : { status: "fail", message: "Job failed", details: { body: b } };
          }
          if (status === 200 && b.status === "completed") {
            return { status: "pass", message: "Job completed" };
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        return {
          status: "warn",
          message: `Job still processing after 45s (last=${lastStatus})`,
        };
      }),
    );
  }

  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    fail: checks.filter((c) => c.status === "fail").length,
    skip: checks.filter((c) => c.status === "skip").length,
    warn: checks.filter((c) => c.status === "warn").length,
  };

  const passed = summary.fail === 0;

  const report: SmokeReport = {
    generated_at: new Date().toISOString(),
    api_url: base,
    passed,
    summary,
    checks,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  const stamp = report.generated_at.replace(/[:.]/g, "-");
  await writeFile(
    path.join(REPORT_DIR, `smoke-${stamp}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(REPORT_DIR, "smoke-latest.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(REPORT_DIR, "smoke-latest.md"),
    `${formatReportMarkdown(report)}\n`,
    "utf8",
  );

  console.log(formatReportMarkdown(report));
  console.log(`\nReport: audit/render-to-coolify/smoke-latest.json`);
  console.log(`Result: ${passed ? "PASS" : "FAIL"}`);

  if (!passed && failOnFailure) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
