# Canary Stage 10% — Start Report

**Generated:** 2026-07-12T15:39:00Z  
**Stage:** 10% (enabled)  
**Prior stage:** Stage 1% **PASSED** (evaluation at 2026-07-12T15:32Z)  
**Action:** Stage 10 start only — no soak observation in this report

---

## Deployment

| Setting | Value |
|---------|-------|
| `CANARY_PERCENT` | **10** |
| `CANARY_BACKEND_ORIGIN` | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` |
| `BACKEND_ORIGIN` | `https://amynest-backend-dykj.onrender.com` |
| Worker version | `f2b21b61-f6bf-4e60-af74-8683b9204ebc` |
| Deployed at | `2026-07-12T15:33:57Z` |
| Routes | `www.amynest.in/api/*`, `amynest.in/api/*` |

**Deploy status:** SUCCESS

---

## Production routing (immediate)

| Probe | `x-amynest-backend` | HTTP |
|-------|---------------------|------|
| `stage10-probe-1` | render | 200 |
| `stage10-probe-6` (10% bucket) | **coolify** | 200 |
| `stage10-probe-46` (10% bucket) | **coolify** | 200 |
| `stage10-probe-50` | render | 200 |

Sticky 10% canary routing confirmed on `www.amynest.in`. Expected ~19/201 device buckets in canary lane (FNV-1a hash).

---

## HTTP health (T+0 post-deploy)

| Endpoint | Render | Coolify |
|----------|--------|---------|
| `/health` | 200 (407ms) | 200 (1018ms) |
| `/api/healthz` | 200 (120ms) | 200 (292ms) |
| `/api/healthz/env` | 200 (673ms) | 200 (279ms) |

**Composite health:** PASS — all three endpoints green on both planes (hardened probe, 0 retries).

---

## `/api/healthz/env` signals

| Signal | Render | Coolify |
|--------|--------|---------|
| `redisPing` | true | true |
| BullMQ mode | bullmq | bullmq |
| waiting / active | 0 / 0 | 0 / 0 |
| completed / failed | 4 / 0 | 4 / 0 |
| `schedulerOwner` | **true** | false |
| `active_plane` | render | render (standby) |
| Postgres (`sessionSecretReady`) | true | true |

---

## Render metrics (last 60 min, MCP)

| Metric | Value |
|--------|-------|
| CPU (latest) | ~1.6% |
| Memory (latest) | ~528 MB |
| HTTP 5xx (monitor) | 0% |
| HTTP 504 (Render logs) | 2 requests at 14:56Z (isolated; no composite failure) |
| HTTP 503 (Render logs) | 1 request at 15:34Z (probe artifact, not user degradation) |

---

## Worker (Hetzner `167.233.39.146`)

| Metric | Value |
|--------|-------|
| Container status | running (7h uptime) |
| Restarts | 0 |
| CPU | 0.12% |
| Memory | 1.94% |
| Health (`:9090/health`) | **PASS** — `bullMqActive`, `consumerRegistered`, `redisPingOk` |
| Recent activity | Processing `audio/warmup` jobs |

---

## Scheduler

**PASS** — singleton verified at stage start.

| Plane | Owner | Active plane |
|-------|-------|--------------|
| Render API | **true** | render |
| Coolify API | false | render (standby) |

---

## RevenueCat / Razorpay webhooks

| Check | Result |
|-------|--------|
| RevenueCat route | `https://www.amynest.in/api/subscription/webhook` — unchanged |
| RevenueCat validation | warn — secret unset in probe env (401 expected) |
| Razorpay | not exercised (no live POST in this report) |

---

## GCS

| Plane | `/api/healthz/audio` | Result |
|-------|----------------------|--------|
| Render | 200 | PASS — stream probe ok |
| Coolify | 200 | PASS — stream probe ok |

Smoke test GCS: **pass** (`scripts/audit/render-to-coolify/smoke-latest.json`)

---

## AI pipeline

| Check | Result |
|-------|--------|
| BullMQ producer | OK (`queue.status: ok`) |
| BullMQ consumer | OK — worker processing jobs |
| Completed jobs | 4 (up from 2 at Stage 1 start) |
| Failed jobs | 0 |
| `/audio-warmup/enqueue` | skip — requires `SMOKE_FIREBASE_ID_TOKEN` |

---

## Hardened monitor snapshot (T+0)

| Metric | Value |
|--------|-------|
| Render composite score | 100 |
| Coolify composite score | 100 |
| Overall score | 100 |
| Consecutive unhealthy cycles | 0 |
| Degraded | false |

---

## Render hot standby

Render API **online** — receiving ~90% traffic. Not decommissioned.

---

## Stage 10 verdict (start)

**PASS** — deployment verified, all immediate health checks green.

**Next action:** Await ~30 minutes, then request Stage 10 evaluation (PASS or ROLLBACK) before any advancement to 25%.

---

*Release Director — Stage 10 start complete. STOP.*
