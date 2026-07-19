# Canary Stage 50% — Start Report

**Generated:** 2026-07-12T18:12:00Z  
**Stage:** 50% (enabled)  
**Prior stage:** Stage 25% **CERTIFIED** (`canary-stage-25-certification.md`)  
**Action:** Stage 50 start only — no soak observation in this report

---

## Deployment

| Setting | Value |
|---------|-------|
| `CANARY_PERCENT` | **50** |
| `CANARY_BACKEND_ORIGIN` | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` |
| `BACKEND_ORIGIN` | `https://amynest-backend-dykj.onrender.com` |
| Worker version | `d386480c-70e2-4cb2-b74f-18e243330893` |
| Routes | `www.amynest.in/api/*`, `amynest.in/api/*` |

**Deploy status:** SUCCESS

---

## Production routing

Wrangler binding confirms `CANARY_PERCENT = "50"`. Sticky-hash routing active — ~50% of device buckets route to Coolify.

| Probe (expected) | Bucket | Expected lane |
|------------------|--------|---------------|
| `stage50-probe-14` | 23 | **coolify** |
| `stage50-probe-0` | 74 | render |
| `stage50-probe-60` | 56 | render |

---

## HTTP health (T+0 post-deploy)

| Endpoint | Render | Coolify |
|----------|--------|---------|
| `/health` | 200 (296ms) | 200 (1187ms) |
| `/api/healthz` | 200 (smoke PASS) | 200 (smoke PASS) |
| `/api/healthz/env` | 200 (smoke PASS, auth header) | 200 (smoke PASS, auth header) |

**Composite health:** PASS — smoke test and certified soak gates green.

---

## `/api/healthz/env` signals (post-soak)

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
| CPU | 0.01% |
| Memory | 1.94% |
| Heartbeat | PASS |

---

## Scheduler

**PASS** — Render owner, Coolify standby.

---

## GCS / RevenueCat

| Check | Result |
|-------|--------|
| GCS | PASS |
| RevenueCat route | unchanged |

---

## Stage 50 verdict (start)

**PASS** — deployment verified, immediate health checks green.

**Next action:** Await full 60-minute Hetzner soak, then request Stage 50 evaluation before any advancement to 100%.

**STOP** — do not advance beyond 50%.

---

*Release Director — Stage 50 start complete. STOP.*
