#!/usr/bin/env node
/**
 * Lightweight API stress probe — run against local or staging API.
 *
 *   API_BASE=http://127.0.0.1:5000 CONCURRENCY=100 node scripts/reliability-stress.mjs
 *
 * Requires BEARER_TOKEN for authed routes (optional — health checks work without).
 */
const API_BASE = (process.env.API_BASE ?? "http://127.0.0.1:5000").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.CONCURRENCY ?? "100");
const DURATION_SEC = Number(process.env.DURATION_SEC ?? "30");
const BEARER = process.env.BEARER_TOKEN?.trim();

const FLOWS = [
  { name: "health", path: "/health", method: "GET", auth: false },
  { name: "coach_observability", path: "/api/ai-coach/observability", method: "GET", auth: true },
  { name: "meals_suggest", path: "/api/meals/suggest?region=all", method: "GET", auth: false },
  { name: "subscription_rc_config", path: "/api/subscription/rc-config", method: "GET", auth: true },
  { name: "routines_list", path: "/api/routines", method: "GET", auth: true },
];

const results = {
  startedAt: new Date().toISOString(),
  apiBase: API_BASE,
  concurrency: CONCURRENCY,
  durationSec: DURATION_SEC,
  flows: {},
};

async function oneRequest(flow) {
  const headers = { Accept: "application/json" };
  if (flow.auth && BEARER) headers.Authorization = `Bearer ${BEARER}`;
  const started = performance.now();
  try {
    const res = await fetch(`${API_BASE}${flow.path}`, { method: flow.method, headers });
    const ms = performance.now() - started;
    const ct = res.headers.get("content-type") ?? "";
    const isJson = ct.includes("application/json");
    return { ok: res.ok, status: res.status, ms, isJson, html: ct.includes("text/html") };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: performance.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function initFlow(name) {
  results.flows[name] = {
    requests: 0,
    success: 0,
    errors: 0,
    htmlResponses: 0,
    latencies: [],
    statusCodes: {},
  };
}

async function worker(flow, deadline) {
  const bucket = results.flows[flow.name];
  while (Date.now() < deadline) {
    const r = await oneRequest(flow);
    bucket.requests++;
    if (r.ok && r.isJson !== false) bucket.success++;
    else bucket.errors++;
    if (r.html) bucket.htmlResponses++;
    bucket.latencies.push(r.ms);
    bucket.statusCodes[r.status] = (bucket.statusCodes[r.status] ?? 0) + 1;
  }
}

function summarize(bucket) {
  const sorted = [...bucket.latencies].sort((a, b) => a - b);
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  return {
    requests: bucket.requests,
    success: bucket.success,
    errors: bucket.errors,
    htmlResponses: bucket.htmlResponses,
    errorRate: bucket.requests ? bucket.errors / bucket.requests : 0,
    p50Ms: p(0.5),
    p95Ms: p(0.95),
    p99Ms: p(0.99),
    statusCodes: bucket.statusCodes,
  };
}

const deadline = Date.now() + DURATION_SEC * 1000;
for (const flow of FLOWS) {
  if (flow.auth && !BEARER) {
    results.flows[flow.name] = { skipped: true, reason: "BEARER_TOKEN not set" };
    continue;
  }
  initFlow(flow.name);
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(flow, deadline)));
  results.flows[flow.name] = summarize(results.flows[flow.name]);
}

results.recommendations = [];
if (!BEARER) {
  results.recommendations.push("Set BEARER_TOKEN to stress authed flows (coach, routines, subscription).");
}
results.recommendations.push("Run with CONCURRENCY=100,250,500 sequentially and compare p95Ms + errorRate.");
results.recommendations.push("If p95 > 5000ms on coach/meals, scale AI worker concurrency and Redis pool.");
results.recommendations.push("If 503/504 spike, raise PG_POOL_MAX and verify statement_timeout is not too aggressive.");

console.log(JSON.stringify(results, null, 2));
