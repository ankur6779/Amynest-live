# Production Canary — Final Report

**Generated:** 2026-07-12T09:20:00Z  
**Phase:** Production Canary (Render → Coolify)  
**Status:** **CANARY IN PROGRESS — Stage 1%**  
**Certification:** **NOT CANARY CERTIFIED** (requires 100% traffic stable ≥ 48 hours)

---

## Executive summary

Production canary traffic is **live at 1%** via the Cloudflare Worker (`amynest-api-proxy`). Render remains the primary backend and **hot standby**. All pre-canary gates passed. Coolify public HTTPS routing is healthy. No degradation detected at canary start.

**Rollback target:** < 5 minutes (`CANARY_PERCENT=0` + `wrangler deploy`)

**Render decommission:** **NOT performed** — Render stays operational as hot standby per runbook.

---

## Timeline

| Time (UTC) | Event | Result |
|------------|-------|--------|
| 2026-07-12T07:59Z | Database replica verify | `verify-latest.json` → **passed=true** |
| 2026-07-12T08:03Z | Coolify smoke tests | `smoke-latest.json` → **passed=true** |
| 2026-07-12T09:00Z | Stateful plane unification | **STATEFUL PLANE CERTIFIED** |
| 2026-07-12T09:08Z | Scheduler singleton verify | **PASS** (Render owner, Coolify standby) |
| 2026-07-12T09:11Z | Data plane audit (updated) | **SAFE**, `canary_approved=true` |
| 2026-07-12T09:11Z | Coolify public routing verify | HTTPS 200, valid Let's Encrypt TLS |
| 2026-07-12T09:17Z | Cloudflare Worker deploy | `CANARY_PERCENT=1`, version `3df002c5` |
| 2026-07-12T09:17Z | Canary monitor baseline | Render 100 / Coolify 100 / Overall 100 |
| 2026-07-12T09:18Z | Production routing probe | `x-amynest-backend: coolify` confirmed (sticky 1% bucket) |

---

## Step 1 — Pre-canary gates (final)

| Gate | Status | Evidence |
|------|--------|----------|
| Scheduler | **PASS** | `scheduler-singleton-latest.json` — Render `owner=true`, Coolify `owner=false` |
| Database | **PASS** | `verify-latest.json` — `passed=true`, 137 tables, 0 mismatches |
| Stateful Plane | **PASS** | `stateful-plane-audit.md` — **STATEFUL PLANE CERTIFIED** |
| Smoke | **PASS** | `smoke-latest.json` — health, ready, GCS OK |
| Worker | **PASS** | Hetzner `amynest-worker` on Coolify PG/Redis |
| BullMQ | **PASS** | Unified queue on Coolify Redis; worker consumer active |
| Data plane audit | **PASS** | `data-plane-audit-latest.json` — `canary_approved=true` |

---

## Step 2 — Coolify public routing

| Check | Result |
|-------|--------|
| HTTPS | **200** `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io/health` |
| TLS | Valid Let's Encrypt cert (expires 2026-10-10) |
| `/api/healthz` | **200** |
| `/health` | **200** |
| sslip.io routing | **OK** (HTTPS router + cert labels applied) |

**Canary target origin:** `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io`

---

## Step 3 — Canary configuration (live)

| Setting | Value |
|---------|-------|
| `BACKEND_ORIGIN` | `https://amynest-backend-dykj.onrender.com` (Render primary) |
| `CANARY_BACKEND_ORIGIN` | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` |
| `CANARY_PERCENT` | **1** |
| Worker version | `3df002c5-e8ea-4918-b4fb-507df3a0c96f` |
| Routes | `www.amynest.in/api/*`, `amynest.in/api/*` |
| Sticky key | `x-amynest-device-id` or `cf-connecting-ip` (FNV-1a hash) |

Production verification:

- `x-amynest-device-id: canary-probe-1` → `x-amynest-backend: render`
- `x-amynest-device-id: canary-probe-50` → `x-amynest-backend: coolify`

---

## Step 4 — Observation (Stage 1%, 30 min soak)

**Started:** 2026-07-12T09:17:46Z  
**Monitor:** `07-canary-monitor.sh --watch --advance` (background, 60s interval)

### Baseline metrics (T+0)

| Metric | Render | Coolify | Notes |
|--------|--------|---------|-------|
| Health score | 100 | 100 | `/health`, `/api/healthz` |
| HTTP 5xx rate | 0% | 0% | No degradation |
| Latency p95 | Within bounds | Within bounds | No 2.5× spike |
| Firebase login | skip | skip | Token not set in monitor env |
| Routine generation | skip | skip | Requires auth token |
| RevenueCat | skip/warn | skip/warn | Webhook secret unset in monitor |
| Razorpay | routing OK | routing OK | Single webhook URL via CF Worker |
| BullMQ | unified | unified | Coolify Redis + Hetzner worker |
| Speech Coach | routing OK | routing OK | Proxied via CF Worker |
| Push notifications | skip | skip | Requires auth |
| OpenAI / GCS | SHARED | SHARED | Same keys/bucket across planes |

**Degradation:** None detected at baseline.

---

## Step 5 — Stage ladder (planned)

| Stage | Percent | Soak | Status |
|-------|---------|------|--------|
| 1 | 1% | 30 min | **IN PROGRESS** (started 09:17 UTC) |
| 2 | 10% | 30 min | Pending |
| 3 | 25% | 30 min | Pending |
| 4 | 50% | 30 min | Pending |
| 5 | 100% | 48 hr | Pending |

Advance command (after each stable soak):

```bash
bash scripts/render-to-coolify/set-canary-percent.sh <percent>
cd infra/cloudflare/amynest-api-proxy && wrangler deploy
```

---

## Step 6 — Render hot standby

| Service | Status | Role |
|---------|--------|------|
| `Amynest-backend-dykj` | **Live** | Primary HTTP backend (99% canary traffic) |
| `amynest-ai-worker-dykj` | Standby (`WORKER_ENABLED=false`) | Disabled consumer |
| `amynest-db-dykj` | Legacy | No longer active stateful plane |
| `amynest-redis-dykj` | Legacy (drained) | No active consumer |

**Render is NOT decommissioned.** Minimum 48-hour soak at 100% required before any decommission discussion.

---

## Step 7 — Continuous comparison (Render vs Coolify)

| Dimension | Render | Coolify | Delta |
|-----------|--------|---------|-------|
| Health | OK | OK | None |
| Latency | Baseline | Baseline | None at T+0 |
| 5xx | 0% | 0% | None |
| BullMQ | Producer (Coolify Redis) | Producer (same queue) | Unified |
| Scheduler | **Owner** | Standby | Intentional split |
| RevenueCat | SHARED routing | SHARED routing | Same webhook URL |
| AI jobs | Enqueue via Coolify Redis | Enqueue via Coolify Redis | Unified |
| Database writes | Coolify PG (via proxy) | Coolify PG (internal) | Same database |

Dashboard artifacts:

- `audit/render-to-coolify/dashboard-latest.json`
- `audit/render-to-coolify/dashboard.html`

---

## Rollback readiness

| Item | Ready |
|------|-------|
| Rollback path | `CANARY_PERCENT=0` + `wrangler deploy` |
| Estimated downtime | **0 seconds** (instant traffic shift) |
| Estimated rollback time | **< 5 minutes** |
| Render hot standby | **Yes** — live and receiving 99% traffic |
| DNS changes required | **No** |
| Runbook | `audit/render-to-coolify/rollback-instructions.md` (auto-generated on degradation) |

```bash
# Emergency rollback
cd infra/cloudflare/amynest-api-proxy
# wrangler.toml → CANARY_PERCENT = "0"
wrangler deploy
curl -sS https://www.amynest.in/api/health  # expect x-amynest-backend: render
```

---

## Traffic percentages

| Plane | HTTP traffic share | Stateful data share |
|-------|-------------------|---------------------|
| Render API | **~99%** (primary) | Shared Coolify PG/Redis |
| Coolify API | **~1%** (canary) | Shared Coolify PG/Redis |
| Render legacy DB/Redis | 0% | Drained / legacy |

---

## Final recommendation

1. **Continue Stage 1% soak** for the full 30 minutes (until ~09:47 UTC).
2. If stable, advance to **10%** — do not skip stages.
3. Keep **Render running** as hot standby through 100% and 48-hour post-cutover soak.
4. Monitor continuously via `07-canary-monitor.sh --watch --advance`.
5. On any critical degradation (5xx spike, auth failure on Coolify only, queue unavailable): **immediate rollback to 0%**.

### Certification criteria (not yet met)

**CANARY CERTIFIED** requires:

- [ ] 100% traffic on Coolify
- [ ] Stable for **≥ 48 hours** at 100%
- [ ] Render remains hot standby (not decommissioned)

**Current verdict:** Canary is **safely underway at 1%**. Do **not** declare CANARY CERTIFIED until the 48-hour soak at 100% completes successfully.

---

## Artifacts

| File | Purpose |
|------|---------|
| `data-plane-audit-latest.json` | Pre-canary gate |
| `verify-latest.json` | Database replica certification |
| `smoke-latest.json` | Backend smoke tests |
| `stateful-plane-audit.md` | Stateful plane certification |
| `scheduler-singleton-latest.json` | Scheduler gate |
| `canary-state.json` | Live canary stage state |
| `dashboard-latest.json` | Render vs Coolify metrics |

---

*Report generated by Release Manager — Production Canary Phase. Re-run monitor and update this document at each stage advance and after 48-hour soak.*
