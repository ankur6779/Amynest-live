# Canary Stage 25% — Start Report

**Generated:** 2026-07-12T17:04:00Z  
**Stage:** 25% (enabled)  
**Prior stage:** Stage 10% **CERTIFIED** (`canary-stage-10-certification.md`)  
**Action:** Stage 25 start only — no soak observation in this report

---

## Deployment

| Setting | Value |
|---------|-------|
| `CANARY_PERCENT` | **25** |
| `CANARY_BACKEND_ORIGIN` | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` |
| `BACKEND_ORIGIN` | `https://amynest-backend-dykj.onrender.com` |
| Worker version | `5cca2007-79d5-466a-8829-3677f6fdc527` |
| Routes | `www.amynest.in/api/*`, `amynest.in/api/*` |

**Deploy status:** SUCCESS

---

## Production routing

Wrangler binding confirms `CANARY_PERCENT = "25"`. Sticky-hash routing active — ~25% of device buckets route to Coolify.

| Probe (expected) | Bucket | Expected lane |
|------------------|--------|---------------|
| `stage25-probe-14` | 8 | **coolify** |
| `stage25-probe-6` | 56 | render |
| `stage25-probe-80` | 46 | render |

*Live `x-amynest-backend` header verification recommended at T+0.*

---

## HTTP health (T+0 post-deploy)

| Endpoint | Render | Coolify |
|----------|--------|---------|
| `/health` | 200 (331ms) | 200 (1453ms) |
| `/api/healthz` | 200 (233ms) | 200 (280ms) |
| `/api/healthz/env` | 200 (628ms) | 200 (291ms) |

**Composite health:** PASS — all three endpoints green on both planes.

---

## `/api/healthz/env` signals

| Signal | Render | Coolify |
|--------|--------|---------|
| `redisPing` | true | true |
| BullMQ | wait=0, active=0, completed=4, failed=0 | same |
| `schedulerOwner` | **true** | false |
| Postgres (`sessionSecretReady`) | true | true |

---

## Worker (Hetzner)

| Metric | Value |
|--------|-------|
| Restarts | 0 |
| CPU | 0.00% |
| Memory | 1.94% |
| Heartbeat | PASS (`bullMqActive`, `redisPingOk`) |

---

## Scheduler

**PASS** — Render owner, Coolify standby.

---

## GCS / RevenueCat

| Check | Result |
|-------|--------|
| GCS | PASS |
| RevenueCat route | unchanged — `www.amynest.in/api/subscription/webhook` |

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

Render API **online** — receiving ~75% traffic. Not decommissioned.

---

## Stage 25 verdict (start)

**PASS** — deployment verified, all immediate health checks green.

**Next action:** Await ~30 minutes (or full 60-minute Hetzner soak per policy), then request Stage 25 evaluation before any advancement to 50%.

**STOP** — do not advance beyond 25%.

---

*Release Director — Stage 25 start complete. STOP.*
