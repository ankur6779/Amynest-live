# Canary Stage 1% — Start Report

**Generated:** 2026-07-12T13:24:00Z  
**Stage:** 1% (enabled)  
**Action:** Stage start only — no soak observation in this report

---

## Deployment

| Setting | Value |
|---------|-------|
| `CANARY_PERCENT` | **1** |
| `CANARY_BACKEND_ORIGIN` | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` |
| `BACKEND_ORIGIN` | `https://amynest-backend-dykj.onrender.com` |
| Worker version | `8879b86c-1d2f-4dbf-826c-bd4ed42bc10b` |
| Routes | `www.amynest.in/api/*`, `amynest.in/api/*` |

**Deploy status:** SUCCESS

---

## Production routing (immediate)

| Probe | `x-amynest-backend` | HTTP |
|-------|---------------------|------|
| `stage1-probe-1` | render | 200 |
| `canary-probe-50` (1% bucket) | **coolify** | 200 |

Sticky 1% canary routing confirmed on `www.amynest.in`.

---

## HTTP health

| Endpoint | Render | Coolify |
|----------|--------|---------|
| `/health` | 200 (176ms) | 200 (837ms) |
| `/api/healthz` | 200 (158ms) | 200 (920ms) |

---

## `/api/healthz/env` (composite probe)

| Plane | Status | Key signals |
|-------|--------|-------------|
| **Render** | 200 | `schedulerOwner=true`, `redisPing=true`, BullMQ ok |
| **Coolify** | 200 | `schedulerOwner=false`, `redisPing=true`, BullMQ ok |

### BullMQ (both planes)

| Metric | Render | Coolify |
|--------|--------|---------|
| mode | bullmq | bullmq |
| redisPing | true | true |
| waiting | 0 | 0 |
| active | 0 | 0 |
| completed | 2 | 2 |
| failed | 0 | 0 |

### Redis

`redis: true`, `redisPing: true` on both API planes.

### PostgreSQL

`phonicsTests.sessionSecretReady: true` on both planes (Postgres-derived session OK).

---

## Worker (Hetzner)

| Metric | Value |
|--------|-------|
| Status | running |
| Restarts | 0 |
| Uptime since | 2026-07-12T08:33:45Z |
| CPU | 0.00% |
| Memory | 1.86% |

---

## Scheduler

**PASS** — singleton verified at stage start.

| Plane | Owner | Active plane |
|-------|-------|--------------|
| Render API | **true** | render |
| Coolify API | false | render (standby) |

---

## RevenueCat endpoint

| Check | Result |
|-------|--------|
| Webhook route | `https://www.amynest.in/api/subscription/webhook` (Cloudflare → Render primary) |
| Smoke validation | warn — `REVENUECAT_WEBHOOK_SECRET` unset in probe env (auth rejection only) |
| Routing | OK — single webhook URL unchanged |

---

## GCS

| Plane | `/api/healthz/audio` | Result |
|-------|----------------------|--------|
| Render | 200 | PASS — stream probe ok, bucket configured |
| Coolify | 200 | PASS — stream probe ok, bucket configured |

Smoke test GCS: **pass**

---

## AI enqueue

| Check | Result |
|-------|--------|
| `/audio-warmup/enqueue` | skip — requires `SMOKE_FIREBASE_ID_TOKEN` |
| BullMQ producer path | OK via `healthz/env` (`queue.status: ok`) |
| Worker consumer | running, 0 restarts |

---

## Hardened monitor snapshot (T+0)

| Metric | Value |
|--------|-------|
| Render composite score | 100 |
| Coolify composite score | 100 |
| Overall score | 100 |
| Consecutive unhealthy cycles | 0 |
| Degraded | false |

Composite health gate: all of `/health`, `/api/healthz`, `/api/healthz/env` passed on both planes (with retries).

---

## Rollback policy (active)

Rollback requires **3 consecutive unhealthy monitor cycles** with composite health failure, or user-visible production issue. Single transient probe failures do **not** trigger rollback.

Emergency rollback: `CANARY_PERCENT=0` + `wrangler deploy`

---

## Render hot standby

Render API **online** — receiving ~99% traffic. Not decommissioned.

---

## Stage 1 verdict (start)

**PASS** — deployment verified, all immediate health checks green.

**Next action:** Await ~30 minutes, then request Stage 1 evaluation (PASS or ROLLBACK) before any advancement to 10%.

---

*Release Director — Stage 1 start complete. STOP.*
