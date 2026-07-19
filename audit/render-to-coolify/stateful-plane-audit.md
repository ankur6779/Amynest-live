# Stateful Plane Unification Audit

**Generated:** 2026-07-12T09:00:00Z  
**Phase:** Stateful Plane Unification (pre-canary)  
**Verdict:** **STATEFUL PLANE CERTIFIED**

---

## Executive summary

All stateful components now target **one production plane**:

| Component | Plane | Host |
|-----------|-------|------|
| PostgreSQL | **Coolify** | `tcl9udyxcuq2zu598ebj0pfu` |
| Redis | **Coolify** | `g7jotufnm43n4au4e8n6x946` |
| BullMQ queue | **Coolify Redis** | `ai-jobs` |
| API (Render production HTTP) | **Coolify stateful** | `amynest-backend-dykj.onrender.com` |
| API (Coolify standby HTTP) | **Coolify stateful** | `ik6ml2uhw6op765lo14wn5m3` (internal) |
| AI Worker (sole consumer) | **Coolify stateful** | Hetzner `167.233.39.146` |
| Cron owner | **Render API only** | `schedulerOwner=true` on Render |

**Not changed:** Cloudflare, DNS, public traffic routing, RevenueCat/Razorpay dashboards.

---

## Step 1 — Process audit

| Process | Hostname | DATABASE_URL target | REDIS_URL target | BullMQ queue | Cron owner |
|---------|----------|---------------------|------------------|--------------|------------|
| **Render API** (`Amynest-backend-dykj`) | `render` (Singapore) | `188.245.208.126:5432/postgres` → Coolify PG | `188.245.208.126:6379` → Coolify Redis | `ai-jobs` (producer) | **yes** (`schedulerOwner=true`) |
| **Coolify API** (`ik6ml2uhw6op765lo14wn5m3`) | `Amynest-Backend-prod` | `tcl9udyxcuq2zu598ebj0pfu:5432` (internal) | `g7jotufnm43n4au4e8n6x946:6379` (internal) | `ai-jobs` (producer) | **no** (`schedulerOwner=false`) |
| **Hetzner AI Worker** (`amynest-worker`) | `ubuntu-8gb-nbg1-1` | `188.245.208.126:5432/postgres` → Coolify PG | `188.245.208.126:6379` → Coolify Redis | `ai-jobs` (consumer) | n/a |
| **Render AI Worker** (`amynest-ai-worker-dykj`) | Render (standby) | — | — | — (disabled) | n/a |
| **Coolify Postgres** | `tcl9udyxcuq2zu598ebj0pfu` | self | — | — | n/a |
| **Coolify Redis** | `g7jotufnm43n4au4e8n6x946` | — | self | `bull:ai-jobs:*` | n/a |
| **Render Postgres** (`amynest-db-dykj`) | Render | legacy (no longer API primary) | — | — | n/a |
| **Render Redis** (`amynest-redis-dykj`) | Render | — | legacy (drained, no active consumer) | drained | n/a |

**Network path:** Coolify host exposes `socat` proxies on `0.0.0.0:5432` and `0.0.0.0:6379` forwarding to Docker internal `10.0.2.7` / `10.0.2.8`. Render API and Hetzner worker reach Coolify stateful via `188.245.208.126`.

---

## Step 2 — Worker migration

| Action | Result |
|--------|--------|
| Backup `worker.env` | `worker.env.bak.*` on `167.233.39.146` |
| Update `DATABASE_URL` | Coolify Postgres via proxy |
| Update `REDIS_URL` | Coolify Redis via proxy |
| Restart worker | Single container `amynest-worker` (no duplicate) |
| Worker health | `redisPingOk=true`, `bullMqActive=true`, `consumerRegistered=true` |

---

## Step 3 — BullMQ drain (pre-switch)

**Render Redis (legacy queue) before switch:**

```json
{"wait":0,"active":0,"delayed":0,"paused":0,"prioritized":0,"completed":0,"failed":0}
```

**Coolify Redis (active queue) after unification:**

```json
{"wait":0,"active":0,"delayed":0}
```

Render API `/api/healthz/env` post-deploy:

```json
{"waiting":0,"active":0,"completed":1,"failed":0,"delayed":0,"paused":0}
```

No jobs lost during drain; queue depth zero before consumer switch.

---

## Step 4 — End-to-end AI validation

| Step | Evidence |
|------|----------|
| Enqueue | `stateful-plane-1783845395` via Coolify API → Coolify Redis |
| Worker pickup | Worker log: `Processing job: stateful-plane-1783845395` |
| Processing | `Processing: legacy` (audio.warmup handler) |
| Completion | BullMQ state: `completed` |
| Second job | `stateful-plane-render-1783846729` → `completed` |
| Queue after | `wait=0`, `active=0`, `delayed=0`, `failed=0` |

Worker health endpoint: `http://167.233.39.146:9090/health` → `ok: true`

---

## Step 5 — Scheduler ownership

| API | `schedulerOwner` | `active_plane` | `BACKGROUND_TASKS_ENABLED` | `NOTIFICATIONS_ENABLED` |
|-----|------------------|----------------|----------------------------|-------------------------|
| Render | **true** | `render` | `true` | `true` |
| Coolify | **false** | `render` | `false` | `false` |

`pnpm run migrate:render-to-coolify:verify-scheduler` → **PASS** (exactly one owner)

---

## Step 6 — Duplicate worker prevention

| Worker | Status |
|--------|--------|
| Hetzner `amynest-worker` | **Active** (sole BullMQ consumer) |
| Render `amynest-ai-worker-dykj` | `WORKER_ENABLED=false` (deploy triggered) |

---

## Stateful plane proof

```
┌─────────────────────────────────────────────────────────────┐
│  UNIFIED STATEFUL PLANE (Coolify)                           │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL: tcl9udyxcuq2zu598ebj0pfu                        │
│  Redis:      g7jotufnm43n4au4e8n6x946                        │
│  BullMQ:     ai-jobs @ Coolify Redis                        │
├─────────────────────────────────────────────────────────────┤
│  Producers:  Render API  ──┐                                │
│              Coolify API ──┼──► same REDIS_URL / DATABASE   │
│  Consumer:   Hetzner Worker (single instance)               │
│  Cron:       Render API only (schedulerOwner=true)          │
└─────────────────────────────────────────────────────────────┘

HTTP routing unchanged: Cloudflare → Render API (production traffic)
```

---

## Artifacts

| File | Purpose |
|------|---------|
| `audit/render-to-coolify/stateful-plane-audit.md` | This report |
| `audit/render-to-coolify/scheduler-singleton-latest.json` | Scheduler verify |
| `scripts/render-to-coolify/14-stateful-plane-unify.sh` | Repeatable runbook |
| Render deploy `dep-d99l5uu7r5hc73bdkmn0` | API stateful env live |
| Render deploy `dep-d99le5naqgkc738c8mlg` | Standby worker disabled |

---

## Constraints honored

- Cloudflare / DNS: **not changed**
- Public traffic: **still Render API**
- RevenueCat / Razorpay dashboards: **not changed**
- Canary: **not enabled**
- Render HTTP service: **operational** (`/health` → 200)

---

# STATEFUL PLANE CERTIFIED

`verify-scheduler` = PASS  
BullMQ drain = PASS (`wait=0`, `active=0`, `delayed=0`)  
E2E AI = PASS (2 jobs completed)  
Single worker = PASS  
Single stateful plane = PASS (Coolify Postgres + Redis)
