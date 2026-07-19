# AmyNest 24-Hour Production Health Report

**Audit window:** 2026-07-13 ~11:00 UTC → 2026-07-14 ~15:35 UTC (~28.5 h on Coolify at 100%)  
**Production plane:** Coolify (100% via Cloudflare `x-amynest-backend: coolify`)  
**Render:** Hot Standby (healthy)  
**Engineering Freeze:** ACTIVE  
**Audit type:** Read-only inspection — no infrastructure changes made

---

## Overall Production Health Score: **88 / 100**

| Category | Score | Status |
|----------|------:|--------|
| Availability | 25/25 | 100% probe success (1,440/1,440 cycles) |
| Latency | 20/25 | Acceptable; audio endpoint p95 elevated |
| Database | 25/25 | Connected, stable, no long queries |
| Redis | 24/25 | Healthy; minor error reply counter |
| BullMQ | 25/25 | Zero backlog, zero failed jobs |
| Worker | 25/25 | Zero restarts, consumer active |
| Application | 22/25 | All routes healthy; intermittent audio probe timeouts in logs |
| Revenue / Users | 12/20 | Active usage; DAU down; email delivery blocked |
| Monitoring | 10/10 | Permanent monitor active (cycle 1,708) |

---

## Step 1 — Production Health

Live probe (2026-07-14T15:35 UTC):

| Endpoint | Code | Latency | Backend |
|----------|-----:|--------:|---------|
| `https://www.amynest.in/health` | **200** | 457 ms | (static SPA) |
| `https://www.amynest.in/api/healthz` | **200** | 707 ms | `coolify` |
| `https://www.amynest.in/api/healthz/audio` | **200** | 2,279 ms | `coolify` |

**24-hour monitor aggregates** (Hetzner `amynest-production-monitor`, 1,440 cycles):

| Metric | Value |
|--------|-------|
| Availability | **100.00%** (1,440 healthy / 0 unhealthy) |
| Critical alerts fired | **0** |
| Probe HTTP 5xx rate | **0.000%** (4,320 status-200 probes) |
| Latency p50 / p95 / max | 370 ms / 1,456 ms / 5,176 ms |
| Audio endpoint p50 / p95 / max | 1,176 ms / 1,692 ms / 5,176 ms |
| Audio probe failures (monitor) | **0** |

Render hot standby: **200** in 318 ms.

---

## Step 2 — Server Health

### Hetzner monitor host (`167.233.39.146`)

| Metric | Value |
|--------|-------|
| CPU cores | 4 |
| Load average | 0.00 / 0.03 / 0.00 |
| Memory used | 23.0% (1.87 GB / 7.6 GB) |
| Disk used | **81%** (monitor host — below critical 90% threshold) |
| Worker container | Up 32 h, **0 restarts** |
| Worker CPU / Memory | 0.02% / 2.64% (idle snapshot) |

### Coolify host (`188.245.208.126`)

| Metric | Value |
|--------|-------|
| Load average | 0.18 / 0.29 / 0.28 |
| Memory | 3.0 Gi used / 7.6 Gi total |
| Disk `/` | **24%** (18 GB / 75 GB) |
| Disk I/O (aggregate sectors) | read 186M / write 484M |

### Docker containers (Coolify)

| Container | Status | Restarts |
|-----------|--------|----------|
| `ik6ml2uhw6op765lo14wn5m3-*` (API) | Up 29 h | 0 |
| `coolify-proxy` (Traefik) | Up 30 h **(healthy)** | 0 |
| `coolify-db` | Up 4 d **(healthy)** | 0 |
| `coolify-redis` | Up 4 d **(healthy)** | 0 |
| `coolify` | Up 4 d **(healthy)** | 0 |
| `amynest-worker` (Hetzner) | Up 32 h | 0 |

**Traefik:** Verified healthy on Coolify host directly. Hetzner monitor Traefik probe reports `ok: false` due to missing SSH key to Coolify (monitoring gap only — not a production outage).

---

## Step 3 — Database (PostgreSQL)

| Check | Result |
|-------|--------|
| Connectivity | **PASS** (`healthz/env` → `db.ok: true`) |
| Database size | **668 MB** |
| Active connections | 1 active, 2 idle |
| Long-running queries (>30 s) | **0** |
| Failed queries | None observed |
| Replication | N/A (single Coolify Postgres instance) |
| Connection pool | App connected; pool metrics not exposed |

---

## Step 4 — Redis

| Check | Result |
|-------|--------|
| Connectivity | **PASS** (`PONG`) |
| Memory | 2.38 MB used |
| Connected clients | 8–9 |
| Evicted keys | **0** |
| Rejected connections | **0** |
| Error replies (lifetime counter) | 309 (non-zero; no current connectivity impact) |
| Keyspace hit rate | 59,813 hits / 407,796 misses |

---

## Step 5 — BullMQ

| Queue | Count |
|-------|------:|
| Waiting | 0 |
| Active | 0 |
| Delayed | 0 |
| Failed | **0** |
| Completed | **41** |
| Paused | 0 |
| Stalled | 0 (no stalled jobs) |
| Backlog (wait + delayed) | **0** |

Queue processing: **active and healthy**. No backlog above critical threshold (100).

---

## Step 6 — Worker

| Check | Result |
|-------|--------|
| Heartbeat | **PASS** (`ok: true` @ `127.0.0.1:9090/health`) |
| Restart count | **0** (since 2026-07-13T07:48 UTC) |
| CPU / Memory | 0.02% / 2.64% |
| BullMQ consumer | Registered, active |
| Redis ping | OK |
| AI processing | 41 jobs completed, 0 failed in period |

---

## Step 7 — Application

| Feature | Probe | Result |
|---------|-------|--------|
| Audio | `/api/healthz/audio` | **200 PASS** (GCS probe OK) |
| GCS | `staticAudio.gcsProbeOk` | **true** |
| Speech Coach | `/api/remote-config/speech-coach-v2` | **200** |
| Phonics | `/api/phonics/sound/a.mp3` | **200** (redirect follow) |
| Rhymes | `/api/audio/rhymes/catalog` | **200** |
| Stories | `/api/stories/catalog` | **401** (auth required — route alive) |
| Routine generation | DB: 1 routine created (24 h) | Operational |
| Push notifications | Scheduler jobs active; FCM errors in logs | **Partial** (see errors) |
| RevenueCat webhook | POST without auth | **401** (expected) |
| Razorpay webhook | POST without auth | **401** (expected) |
| Scheduler | `schedulerOwner: true`, 23 jobs catalogued | **PASS** (singleton on Coolify) |

**Note:** Coolify scheduler has `BACKGROUND_TASKS_ENABLED=true` and `NOTIFICATIONS_ENABLED=true`. Pre-cutover presync expected `false`/`false` on Coolify — not applied (Engineering Freeze). At 100% Coolify traffic this is expected for production schedulers to run on Coolify.

---

## Step 8 — User Metrics (Previous 24 h vs Current 24 h)

| Metric | Previous 24 h | Current 24 h | Δ |
|--------|--------------:|-------------:|---|
| New parent profiles | 1 | 2 | +1 |
| Children added | 1 | 2 | +1 |
| Routines generated | 0 | 1 | +1 |
| Subscriptions created | 4 | 4 | 0 |
| Active paid subscriptions | 0 | 0 | 0 |
| Push tokens registered | 1 | 2 | +1 |
| Analytics events | 33,585 | 6,657 | −26,928 |
| DAU (distinct users) | 15 | 10 | −5 |
| App install events | 7 | 6 | −1 |
| Signup events (analytics) | 0 | 0 | 0 |

| Metric | Value |
|--------|-------|
| Total subscriptions (all time) | 321 |
| Total analytics events (all time) | 558,379 |
| HTTP 5xx (monitor probes) | **0%** |
| API failures (sustained) | **None** |
| Crash rate | Not centrally instrumented; client error logs present (auth-gated endpoints hit without bearer) |

**Observation:** Core signup funnel shows modest growth. DAU and analytics event volume declined period-over-period — worth monitoring but not indicative of outage (availability remained 100%).

---

## Step 9 — Error Analysis (Last 24 Hours)

| Timestamp (app) | Component | Root Cause | Severity | Current Status |
|-----------------|-----------|------------|----------|----------------|
| Recurring (~5×) | `/api/healthz/audio` | 5 s probe timeout → duplicate response (`ERR_HTTP_HEADERS_SENT`) | **Medium** | Endpoint returns 200 on live probe; intermittent |
| Recurring (~6×) | Email (Resend) | Domain `amynest.in` not verified on Resend | **Medium** | Transactional email failing |
| Recurring | Push (FCM Android) | Stale registration tokens (`messaging/registration-token-not-registered`) | **Low** | Expected token churn |
| Sporadic | Push (FCM iOS) | Missing OAuth credential for FCM | **Medium** | iOS push may fail |
| 1× | `/api/coach/generate` | Headers already sent (timeout race) | **Medium** | Resolved on retry |
| 1× | BullMQ enqueue | `ai_job.enqueue_failed` (transient) | **Low** | Queue currently empty |
| 1× | CORS | Direct sslip.io origin blocked | **Low** | By design; production uses amynest.in |
| Frequent | Auth middleware | `missing_bearer` on pre-auth analytics/client-error endpoints | **Info** | Expected client behavior |
| 1× | AI routine | `ai_routine_failed_trust_validation` → rule fallback | **Low** | Fallback succeeded |
| Client logs | Amy voice / keyboard | Layer failures, keyboard layout (Android WebView) | **Info** | UX telemetry, not server outage |

**No CRITICAL monitor alerts** fired in 24 h. No PostgreSQL/Redis/BullMQ/worker/Traefik outages detected.

---

## Step 10 — Executive Summary

### Availability
**100%** — 1,440 consecutive healthy monitor cycles; all production health endpoints returning 200; zero probe 5xx.

### Latency
Within acceptable range for API health checks (p95 ~1.5 s). Audio health endpoint consistently slower (p95 ~1.7 s, max ~5.2 s) with 5 logged timeout events — warrants investigation post-freeze.

### Database / Redis / BullMQ / Worker
All core data-plane components **healthy**. Zero failed BullMQ jobs, zero queue backlog, zero worker restarts.

### Application
All public feature routes operational. Push email delivery and intermittent audio health probe race are the primary application-layer concerns.

### Revenue
321 total subscriptions; 0 newly active paid in window; 4 new subscription records (trial/free states). RevenueCat/Razorpay webhooks responding correctly to unauthenticated probes.

### User Growth
Modest new user acquisition (2 parent profiles, 2 children). DAU decreased 15 → 10; analytics volume down — monitor for trend, not outage.

### Open Incidents

| ID | Issue | Impact | Action (post-freeze) |
|----|-------|--------|----------------------|
| W-1 | Resend domain unverified | Email delivery fails | Verify domain on Resend |
| W-2 | `/api/healthz/audio` timeout race | Intermittent 504 + log noise | Fix double-response in health route |
| W-3 | FCM iOS credential | iOS push failures | Verify Firebase/APNs credentials |
| W-4 | Hetzner monitor SSH to Coolify | Traefik probe blind spot | Add SSH key on monitor host |
| W-5 | Hetzner disk 81% | Approaching capacity | Plan disk cleanup/expansion |
| W-6 | DAU decline | Product metric | Monitor next 24 h |

**No open P1/P2 production outages.**

### Recommendations (read-only audit — no changes made)

1. **Post-freeze:** Fix `health.ts` timeout handling to prevent `ERR_HTTP_HEADERS_SENT` on `/api/healthz/audio`.
2. **Post-freeze:** Verify `amynest.in` on Resend for transactional email.
3. **Post-freeze:** Restore FCM iOS push credentials; stale Android token cleanup is normal.
4. **Post-freeze:** Install Coolify SSH key on Hetzner monitor host for accurate Traefik probing.
5. **Watch:** Hetzner monitor disk at 81%; Coolify host disk healthy at 24%.
6. **Watch:** DAU trend over next 24–48 h.

---

## Evidence Sources

| Source | Location |
|--------|----------|
| Permanent monitor | Hetzner `amynest-production-monitor.service` (cycle 1,708) |
| Live status | `/opt/amynest/monitor/latest-status.json` |
| 24 h history | `/opt/amynest/monitor/history/*.jsonl` (1,439 records) |
| Cycle log | `/opt/amynest/monitor/cycles.jsonl` (1,440 lines) |
| App logs | Coolify API container (`docker logs --since 24h`) |
| Database | Coolify Postgres (`tcl9udyxcuq2zu598ebj0pfu`) read-only SQL |
| Direct probes | `curl` to `www.amynest.in` |

**Audit completed:** 2026-07-14T15:35 UTC  
**Auditor mode:** Read-only — no deployments, restarts, or configuration changes.
