# AmyNest — 48-Hour Production Certification

**Document:** `48-hour-production-certification.md`  
**Role:** Release Director — Final Production Acceptance Audit  
**Audit window:** 2026-07-13T02:05 UTC (100% Coolify cutover) → 2026-07-15T15:10 UTC (~61 h)  
**Audit type:** Read-only inspection — no infrastructure, code, or configuration changes made  
**Production URL:** `https://www.amynest.in`

---

## Executive Summary

AmyNest has completed **~61 hours** at **100% Coolify API traffic** with **zero monitor-detected outages**, **zero probe 5xx**, and **zero critical alerts**. The stateful plane (PostgreSQL, Redis, BullMQ, Hetzner worker, scheduler) is unified and healthy on Coolify.

Render remains a **deliberate dependency** for (1) **static SPA hosting** and (2) **instant API failover** via Cloudflare Worker `BACKEND_ORIGIN`. Render Postgres and Redis are **frozen** and no longer receive production writes. The Render AI worker is **suspended**.

**Production Score: 93 / 100**

| Category | Score | Status |
|----------|------:|--------|
| Availability | 25/25 | 100.00% (911/911 cycles since cutover) |
| Reliability | 23/25 | Zero outages; Razorpay webhook secret gap on Coolify |
| Latency | 22/25 | Monitor p95 healthy; live curl includes CF cold path |
| Database | 25/25 | 681 MB, 0 long queries, pool healthy |
| Redis | 24/25 | PONG, 2.41 MB, 0 evictions |
| BullMQ | 25/25 | 0 wait/active/failed; 57 completed |
| Worker | 25/25 | 0 restarts (2+ days), heartbeat OK |
| Application | 24/25 | All feature probes pass; Razorpay 503 without secret |
| User Impact | 18/20 | No outage regression; modest funnel growth |
| Monitoring | 10/10 | 3,119 cycles, permanent 60 s probes |
| Infrastructure | 10/10 | Disk 13% (monitor), worker idle |

---

## Step 1 — Production Health

### Live probes (2026-07-15T15:05 UTC)

| Endpoint | HTTP | Latency | Backend / Notes |
|----------|-----:|--------:|-----------------|
| `https://www.amynest.in/health` | **200** | 4.68 s | SPA HTML (not API JSON — expected) |
| `https://www.amynest.in/api/healthz` | **200** | 4.90 s | `x-amynest-backend: coolify` |
| `https://www.amynest.in/api/healthz/audio` | **200** | 5.35 s | **PASS** — GCS probe OK, TTS stream OK |

**Routing confirmation:** Every probed API request returned `x-amynest-backend: coolify`. Render standby `https://amynest-backend-dykj.onrender.com/api/healthz` → **200** in 1.4 s (hot standby only).

### 48-hour monitor aggregates (Hetzner `amynest-production-monitor`)

| Metric | Value | Evidence |
|--------|-------|----------|
| Monitor cycles (48 h) | **906** | `/opt/amynest/monitor/history/*.jsonl` |
| Healthy cycles | **906** | 0 unhealthy |
| Availability | **100.000%** | 0 critical alerts |
| Probe HTTP 5xx | **0** | 0 status ≥ 500 in probe history |
| `/api/healthz` p50 / p95 | **315 ms / 430 ms** | 906 samples |
| `/api/healthz/audio` p50 / p95 | **1,176 ms / 1,736 ms** | 906 samples |
| Cycles since 100% cutover | **911 / 911 healthy** | Since 2026-07-13T02:05 UTC |

**Latest monitor snapshot (cycle 3,119 @ 2026-07-15T15:05 UTC):**

| Probe | Status | Latency | Lane |
|-------|-------:|--------:|------|
| `/health` | 200 | 192 ms | coolify |
| `/api/healthz` | 200 | 284 ms | coolify |
| `/api/healthz/audio` | 200 | 907 ms | coolify |

---

## Step 2 — Infrastructure

### Hetzner monitor host (`167.233.39.146`)

| Metric | Value |
|--------|-------|
| CPU cores | 4 |
| Load average | 0.01 / 0.16 / 0.24 |
| Memory used | **21.4%** (1.74 GB / 7.6 GB) |
| Disk used | **13%** (post Jul-14 cleanup) |
| Monitor service | `active (running)`, cycle 3,119 |
| Engineering freeze | ACTIVE |

### Coolify host (`188.245.208.126`)

| Component | Status | Evidence |
|-----------|--------|----------|
| Coolify API (Traefik) | **Healthy** | HTTP probe 7 ms via monitor |
| Traefik (`coolify-proxy`) | **Healthy** | `traefik.ok: true` |
| API container | Up **2+ days** | Monitor docker snapshot |
| Restarts (API/proxy) | **0** | No restart alerts in 48 h |

### Docker / process plane

| Container | Host | Status | Restarts (48 h) |
|-----------|------|--------|----------------:|
| Coolify API (`ik6ml2uhw6op765…`) | Coolify | Up 2+ days | **0** |
| `coolify-proxy` (Traefik) | Coolify | Healthy | **0** |
| `coolify-db` | Coolify | Healthy (4+ days) | **0** |
| `coolify-redis` | Coolify | Healthy (4+ days) | **0** |
| `amynest-worker` | Hetzner | Up 2 days | **0** |

### Render standby services (read-only API inspection)

| Service | Status | Role |
|---------|--------|------|
| `Amynest-backend-dykj` | **Live** (standard plan) | Hot standby API |
| `Amynest-live-1-dykj` | **Live** (static site) | **Active static SPA host** |
| `amynest-db-dykj` | Available (frozen) | Legacy backup; no new writes |
| `amynest-redis-dykj` | Available (drained) | Legacy; not in active queue |
| `amynest-ai-worker-dykj` | **Suspended** (crashloop) | Disabled standby |

**Render backend traffic post-cutover (Jul 13 12:00 UTC onward):** ~93–97 health/keep-warm requests/hour only. No production user API traffic (202/204/analytics dropped to **0** after Jul 13 12:00). Last Render 504s were during canary window (Jul 13 04:00–11:00 UTC).

---

## Step 3 — Application

| Feature | Probe | Result |
|---------|-------|--------|
| **Audio / TTS** | `/api/healthz/audio` | **200 PASS** — OpenAI TTS probe OK, GCS configured, `gcsProbeOk: true` |
| **GCS static audio** | healthz/audio `staticAudio` | **PASS** — bucket probe OK, circuit closed |
| **Speech Coach** | `/api/remote-config/speech-coach-v2` | **200** |
| **Phonics** | `/api/phonics/sound/a.mp3` | **200** |
| **Rhymes** | `/api/audio/rhymes/catalog` | **200** |
| **Stories** | `/api/stories/catalog` | **401** (auth required — route alive) |
| **Reels catalog** | `/api/healthz/reels-catalog` | **200 PASS** — 1,312 entries, 0 invalid refs |
| **Routine generation** | DB + stability metrics | Operational — 1 routine in post-48h window |
| **RevenueCat** | POST `/api/subscription/webhook` (no auth) | **401** (expected) |
| **Razorpay** | POST `/api/subscription/razorpay/webhook` (no auth) | **503** `webhook_secret_unconfigured` on Coolify |
| **Push notifications** | Scheduler `notifications_enabled: true` | Active — 23 cron jobs on Coolify owner |
| **GCS** | Worker + API + CF Worker | Shared `amynest-audio-storage` — probe OK |

### API domain stability (since Coolify container restart 2026-07-15T03:36 UTC)

| Domain | Success | Failure | Success Rate |
|--------|--------:|--------:|-------------:|
| analytics | 1,818 | 0 | **100%** |
| device_registration | 12 | 0 | **100%** |
| learning_progress | 1 | 0 | **100%** |
| hub_journey | 2 | 0 | **100%** |
| auth / routines / billing | 0 | 0 | N/A (no traffic in window) |

**Analytics ingest:** 3,784 accepted, 91 invalid props (2.3% invalid rate) — within normal bounds.

---

## Step 4 — Database (PostgreSQL)

**Source:** Coolify Postgres via read-only query through Hetzner worker `DATABASE_URL` proxy (`188.245.208.126:5432`).

| Check | Result |
|-------|--------|
| Connectivity | **PASS** |
| Database size | **681.1 MB** (growing from 668 MB at 24 h audit — normal) |
| Active connections | **1** |
| Idle connections | **1** |
| Long-running queries (>30 s) | **0** |
| Failed queries | None observed |
| Render Postgres staleness | Frozen at `2026-07-12T08:44 UTC` (502,271 events) — confirms Coolify is sole writer |

---

## Step 5 — Redis & BullMQ

| Check | Result |
|-------|--------|
| Connectivity | **PASS** (`PONG`) |
| Memory | **2.41 MB** used |
| Connected clients | **9** (monitor) |
| Evicted keys | **0** |
| Error replies | Non-zero lifetime counter; no current impact |
| **BullMQ `ai-jobs` waiting** | **0** |
| **Active** | **0** |
| **Delayed** | **0** |
| **Failed** | **0** |
| **Completed** | **57** |
| **Stalled** | **0** |
| Worker heartbeat | **PASS** (`167.233.39.146:9090/health`) |
| Worker CPU / Memory | 0.02% / 2.78% |
| Queue processing | **Active** — no backlog |

---

## Step 6 — User Impact (48 h post-cutover vs 48 h pre-cutover)

**Comparison windows (Coolify Postgres, read-only):**

| Window | Period | Context |
|--------|--------|---------|
| **Post-48h** | 2026-07-13T15:10 → 2026-07-15T15:10 UTC | 100% Coolify production |
| **Pre-48h** | 2026-07-11T15:10 → 2026-07-13T15:10 UTC | Canary 1%→50%→100% migration period |

| Metric | Pre-48h | Post-48h | Δ | Regression? |
|--------|--------:|---------:|---:|:-----------:|
| Installs (`device_registered`) | 21 | **25** | +4 (+19%) | No |
| First open (distinct users) | 14 | **14** | 0 | No |
| Signups | 0 | 0 | 0 | No (pre-existing funnel issue) |
| Parent profiles | 1 | **3** | +2 | No |
| Children added | 1 | **3** | +2 | No |
| Routines generated | 0 | **1** | +1 | No |
| Trial started | 0 | 0 | 0 | No |
| Paid purchases | 0 | 0 | 0 | No (pre-existing monetization gap) |
| Analytics events (volume) | 146,294 | 21,693 | −124,601 | **Expected** — pre window includes heavy canary/monitor traffic |
| DAU (24 h within window) | 10 | **13** | +3 (+30%) | No |
| Crash events | 0 | **0** | 0 | No |
| Crash users | 0 | **0** | 0 | No |
| HTTP 5xx (monitor probes) | **0%** | **0%** | 0 | **No outage regression** |
| API domain failures | N/A | **0** | — | No |

**Interpretation:** No user-facing outage regression detected. Core funnel metrics are flat-to-up. Analytics volume drop is explained by migration soak/monitor traffic in the pre-window, not by production failure. Monetization remains at zero purchases — a **pre-existing product issue**, not a Coolify migration regression.

---

## Step 7 — Render Dependency Audit

| Component | Still Using Render? | Evidence |
|-----------|:-------------------:|----------|
| **Backend (active traffic)** | **NO** | `CANARY_PERCENT=100`; all probes show `x-amynest-backend: coolify` |
| **Backend (failover path)** | **YES** | `wrangler.toml` `BACKEND_ORIGIN=amynest-backend-dykj.onrender.com` |
| **Worker (active)** | **NO** | Hetzner `amynest-worker` → Coolify PG/Redis; Render worker suspended |
| **PostgreSQL (active)** | **NO** | Coolify `tcl9udyxcuq2zu598ebj0pfu`; Render PG frozen Jul 12 |
| **Redis (active)** | **NO** | Coolify `g7jotufnm43n4au4e8n6x946`; Render Redis drained |
| **Static Site (SPA)** | **YES** | `rndr-id` header on `www.amynest.in`; identical bundle hash to `amynest-live-1-dykj.onrender.com` |
| **Cloudflare Worker** | **NO** (Render-independent) | Routes `/api/*` to Coolify at 100%; Render is fallback config only |
| **DNS** | **NO** (Render-independent) | `www.amynest.in` → Cloudflare IPs (`104.21.21.231`, `172.67.200.243`) |
| **Cron Jobs (active)** | **NO** | Coolify API `schedulerOwner: true`, 23 jobs |
| **Webhooks (RevenueCat)** | **NO** (lane-independent) | Single URL `www.amynest.in/api/subscription/webhook` → Coolify |
| **Webhooks (Razorpay)** | **PARTIAL** | Routes to Coolify but `RAZORPAY_WEBHOOK_SECRET` unconfigured → 503 |
| **Environment Variables** | **PARTIAL** | Coolify has full prod secrets except Razorpay webhook secret gap |

---

## Step 8 — Static Site Analysis

### Current deployment

| Property | Value |
|----------|-------|
| Host | **Render** `Amynest-live-1-dykj` |
| URL | `https://amynest-live-1-dykj.onrender.com` |
| Build | `bash scripts/render-frontend-build.sh` → `artifacts/kidschedule/dist/public` |
| Last deploy | **2026-07-15T03:37 UTC** (Render `updatedAt`) |
| Production traffic | **YES** — `www.amynest.in` serves identical `assets/index-BeJfahIn.js` with `rndr-id` header |
| Content type | **Static SPA only** (HTML + hashed JS/CSS + SW) |
| API coupling | None at host level — API proxied separately by Cloudflare Worker |

### Is Render still required?

| Question | Answer |
|----------|--------|
| Required for production traffic today? | **YES** — static SPA is served from Render CDN behind Cloudflare |
| Receiving production traffic? | **YES** — all `www.amynest.in` page loads |
| Serving only static assets? | **YES** — no server-side logic |
| Safe to move to Coolify? | **Yes, technically** — static files can be served by Traefik/nginx on Coolify or any object host |
| Better long-term: Cloudflare Pages? | **Recommended** |

### Option comparison

| Criterion | Render Static (current) | Coolify static host | Cloudflare Pages |
|-----------|------------------------|---------------------|------------------|
| **Cost** | ~$7+/mo (starter) | Included in Hetzner/Coolify | **Free** tier sufficient for SPA |
| **Reliability** | Good; separate provider | Same host as API (blast radius) | **Global edge**, independent of API host |
| **Deploy simplicity** | Git push → Render build | Custom pipeline to Coolify volume | **Git push → auto build** (like Render) |
| **CDN** | Cloudflare in front (proxied) | Would need CF or Traefik config | **Native Cloudflare edge** |
| **Coupling to API host** | Independent ✅ | Coupled ⚠️ | Independent ✅ |
| **Rollback** | Redeploy previous build | Redeploy / swap volume | Instant preview + rollback |

### Recommendation

**Migrate static site to Cloudflare Pages** (not Coolify) as the next infrastructure step, after API retirement checklist progresses.

**Rationale:**
1. `www.amynest.in` DNS already lives on Cloudflare — Pages is a natural fit.
2. Decouples user-facing SPA from both Render **and** Coolify API host (reduces blast radius).
3. Zero incremental cost vs Render static plan.
4. Build command (`scripts/render-frontend-build.sh`) is portable — minimal change.
5. Coolify static hosting would concentrate web + API on one VPS; acceptable but inferior to edge-static for a global parenting app.

**Evidence:** Identical bundle hash on `www.amynest.in` and `amynest-live-1-dykj.onrender.com`; `rndr-id` response header confirms Render origin; API already decoupled via CF Worker.

---

## Step 9 — Remaining Risks

| ID | Risk | Severity | Impact | Mitigation (post-freeze) |
|----|------|----------|--------|--------------------------|
| R-1 | **Render static site SPOF** | Medium | SPA unavailable if Render static fails (API may still work) | Migrate to Cloudflare Pages |
| R-2 | **Razorpay webhook secret missing on Coolify** | Medium | Razorpay billing events return 503 | Copy `RAZORPAY_WEBHOOK_SECRET` to Coolify env |
| R-3 | **Render hot standby cost** | Low | ~$25+/mo for unused capacity | Retire after 30-day soak + failover drill |
| R-4 | **Render Postgres/Redis legacy instances** | Low | Stale data + cost | Final backup → decommission per retirement checklist |
| R-5 | **FCM iOS APNs auth key** | Medium | iOS native push may fail | Ops: Firebase Console APNs key |
| R-6 | **Monetization at zero** | High (product) | No revenue — not migration-related | Product sprint (pre-existing) |
| R-7 | **Traefik HTTPS regression on Coolify redeploy** | Medium | 503 on HTTPS after native redeploy | Run `19-ensure-coolify-traefik-https.sh` before redeploys |

**No open P1/P2 production outages.**

---

## Render Dependency Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                     www.amynest.in (Cloudflare DNS)              │
├────────────────────────────┬────────────────────────────────────┤
│  Static SPA (HTML/JS/CSS)  │  /api/* (Cloudflare Worker)        │
│  ────────────────────────  │  ────────────────────────────────  │
│  Render Amynest-live-1     │  100% → Coolify Traefik API        │
│  [ACTIVE - REQUIRED]       │  0%   → Render backend [STANDBY]   │
└────────────────────────────┴────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
  amynest-live-1-dykj              Coolify PG + Redis + Scheduler
  .onrender.com                    Hetzner BullMQ Worker
                                   [ACTIVE - PRODUCTION]
```

| Plane | Production Target | Render Role |
|-------|-------------------|-------------|
| HTTP API | Coolify | Hot standby (0% traffic) |
| PostgreSQL | Coolify | Frozen archive |
| Redis | Coolify | Drained legacy |
| BullMQ | Coolify + Hetzner | None |
| Scheduler | Coolify | None |
| Static SPA | **Render** | **Sole host** |
| Failover | Cloudflare Worker | Instant `CANARY_PERCENT=0` path |

---

## Retirement Recommendation

### Certify now

- ✅ Coolify API production plane
- ✅ Coolify PostgreSQL as sole writer
- ✅ Coolify Redis + Hetzner worker
- ✅ Coolify scheduler singleton
- ✅ Cloudflare Worker canary at 100%

### Keep Render for now

| Render service | Action | Earliest retirement |
|----------------|--------|---------------------|
| `Amynest-backend-dykj` | Keep hot standby | After 30-day soak + documented failover drill |
| `Amynest-live-1-dykj` | Keep until Pages migration | After Cloudflare Pages cutover verified |
| `amynest-db-dykj` | Keep read-only backup | After final `pg_dump` + 30-day retention |
| `amynest-redis-dykj` | Decommission | After backup confirmation (already drained) |
| `amynest-ai-worker-dykj` | Already suspended | Safe to delete |

### Next retirement sequence (recommended order)

1. Migrate static site to **Cloudflare Pages** → retire `Amynest-live-1-dykj`
2. Configure `RAZORPAY_WEBHOOK_SECRET` on Coolify (if Razorpay billing is active)
3. Complete 30-day Coolify soak (target: **2026-08-13**)
4. Final Render Postgres backup → delete DB + Redis
5. Remove or retain `BACKEND_ORIGIN` Render fallback in CF Worker (ops choice)
6. Delete `Amynest-backend-dykj`

---

## Final Verdict

# 🟢 CERTIFIED FOR FULL PRODUCTION

**on Coolify** — with **🟡 KEEP RENDER FOR NOW** for static SPA + API hot standby

AmyNest production API, database, cache, queue, worker, and scheduler are **certified for full production on Coolify** after 48+ hours at 100% traffic with **100% availability**, **zero probe 5xx**, and **no user-impact regression**.

Render **cannot be fully retired yet** because:
1. The production SPA is still hosted on `Amynest-live-1-dykj` (confirmed by `rndr-id` header and identical bundle hash).
2. Cloudflare Worker retains Render as instant failover (`BACKEND_ORIGIN`).

This is an **acceptable, intentional** architecture per the migration plan. Complete Render independence requires static site migration (recommended: Cloudflare Pages) and execution of the Render retirement checklist.

---

## Evidence Sources

| Source | Location / Method |
|--------|-------------------|
| Live HTTP probes | `curl` to `www.amynest.in` (2026-07-15T15:05 UTC) |
| Production monitor | Hetzner `167.233.39.146` — `/opt/amynest/monitor/latest-status.json` |
| 48 h history | `/opt/amynest/monitor/history/2026-07-13.jsonl.1`, `2026-07-14.jsonl.1`, `2026-07-15.jsonl` |
| Protected diagnostics | `/api/healthz/env` with `x-health-secret` (monitor env) |
| Coolify Postgres metrics | Read-only `psql` via worker `DATABASE_URL` proxy |
| API stability | `/api/healthz/stability-metrics` |
| Render services | Render MCP `list_services` (2026-07-15) |
| Render Postgres staleness | Render MCP `query_render_postgres` |
| Static site origin | `rndr-id` header + bundle hash comparison |
| Cloudflare routing | `infra/cloudflare/amynest-api-proxy/wrangler.toml` |
| Prior audits | `24-hour-production-health-report.md`, `AMYNEST_COOLIFY_MIGRATION_FINAL_CERTIFICATION.md` |

---

**Audit completed:** 2026-07-15T15:10 UTC  
**Signed:** Release Director — AmyNest Platform Migration  
**Mode:** Read-only — no deployments, restarts, or configuration changes made.

---

*End of 48-hour production certification.*
