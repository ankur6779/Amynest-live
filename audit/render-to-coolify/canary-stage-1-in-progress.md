# Canary Operations — Stage 1% (In Progress)

**Generated:** 2026-07-12T09:25:00Z  
**Release Manager:** Production Canary Operations  
**Engineering freeze:** ACTIVE — monitoring and rollback only

---

## Current state

| Item | Value |
|------|-------|
| Canary percent | **1%** |
| Primary backend | Render (`amynest-backend-dykj`) |
| Canary backend | Coolify (`ik6ml2uhw6op765lo14wn5m3`) |
| Stage soak | **7 / 30 minutes** (~23 min remaining) |
| Next stage | 10% (not before soak completes) |
| Degradation | **None** |
| Rollback required | **No** |
| Render hot standby | **Online** |

---

## Metrics snapshot (T+7 min)

| Metric | Render | Coolify | Status |
|--------|--------|---------|--------|
| HTTP 5xx rate | 0% | 0% | OK |
| Health `/health` | 200 (188ms) | 200 (300ms) | OK |
| `/api/healthz/env` | 200 | 200 | OK |
| Latency p95 | 1072ms | 1269ms | OK (within baseline; Coolify < 2.5× Render) |
| Overall score | 100 | 100 | OK |
| BullMQ | redis ping OK, wait=0, active=0 | redis ping OK, wait=0, active=0 | OK |
| Redis | available | available | OK |
| PostgreSQL | session secret OK | session secret OK | OK |
| Scheduler ownership | **owner=true** | **owner=false** | OK (singleton PASS) |
| GCS / OpenAI | PASS (stream probe OK) | PASS (stream probe OK) | OK |
| Speech Coach / TTS | configured + probe OK | configured + probe OK | OK |
| Worker container | Up 50m, CPU 0.01%, mem 1.83% | — | OK |
| Worker BullMQ consumer | active (jobs completed) | — | OK |
| Firebase auth | skip (no token in monitor env) | skip | Monitored via healthz only |
| Parent profile | skip (no token) | skip | Monitored via healthz only |
| Routine generation | skip (no token) | skip | Monitored via healthz only |
| RevenueCat webhook | skip (secret unset) | skip | Routing OK via CF Worker |
| Razorpay | routing OK | routing OK | OK |
| Push notifications | skip (no token) | skip | — |
| Memory / CPU (Render) | service live, not suspended | — | OK |
| Crash loop | none observed | none observed | OK |

### Production routing verification

| Device probe | Backend lane |
|--------------|--------------|
| `canary-probe-1` | render |
| `canary-probe-5` | render |
| `canary-probe-10` | render |
| `canary-probe-20` | render |
| `canary-probe-50` | **coolify** |

Sticky 1% canary routing confirmed on `www.amynest.in`.

---

## Errors

None detected. No rollback triggered.

---

## Recommendation

**HOLD at 1%.** Do not advance to 10% until:

1. Full **30-minute** stable soak completes (~09:47 UTC)
2. All metrics remain healthy on next monitor cycles
3. No automatic degradation flags from `07-canary-monitor.sh`

### At stage completion (if still healthy)

```bash
bash scripts/render-to-coolify/set-canary-percent.sh 10
cd infra/cloudflare/amynest-api-proxy && wrangler deploy
```

### Emergency rollback (if triggered)

```bash
bash scripts/render-to-coolify/set-canary-percent.sh 0
cd infra/cloudflare/amynest-api-proxy && wrangler deploy
```

---

## Estimated readiness

| Milestone | ETA (UTC) | Status |
|-----------|-----------|--------|
| Stage 1% soak complete | ~09:47 | In progress |
| Stage 10% eligible | ~09:47+ | Pending |
| 100% cutover | T+4–5 hours (all soaks) | Pending |
| CANARY CERTIFIED (48h @ 100%) | ~3 days after 100% | Not started |

---

## Active monitoring

- Background loop: `07-canary-monitor.sh --watch --advance` (60s interval)
- Artifacts: `dashboard-latest.json`, `canary-state.json`
- Render: **must remain online** — no decommission actions

---

*Interim report — Stage 1% not yet complete. Full stage completion report will be generated after 30-minute soak.*
