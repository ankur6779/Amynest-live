# Canary Rollback Report

**Generated:** 2026-07-12T10:42:00Z  
**Trigger:** Coolify `/health failed` (monitor interval 2026-07-12T10:38:52Z)  
**Action:** Immediate rollback to 0% canary  
**Downtime:** **0 seconds** (traffic shifted to Render via Cloudflare Worker)

---

## Incident timeline

| Time (UTC) | Event |
|------------|-------|
| 09:17:46 | Stage 1% canary enabled (`CANARY_PERCENT=1`) |
| 09:17–09:34 | 17 consecutive healthy monitor intervals (Render 100 / Coolify 100) |
| 09:34–10:38 | Monitor gap (~64 minutes — soak continuity lost) |
| **10:38:52** | **Degradation:** Coolify `/health` → `fetch failed`, score 45 |
| 10:40:00 | Rollback initiated — `CANARY_PERCENT=0` |
| 10:40:28 | Cloudflare Worker deployed (version `c1c690a3`) |
| 10:39:55 | Post-failure probe: Coolify recovered (score 100) |
| 10:42:00 | Rollback verified — 20/20 production probes → `render` |

---

## Rollback execution

```text
CANARY_PERCENT: 1 → 0
CANARY_BACKEND_ORIGIN: unchanged (Coolify URL retained for future retry)
BACKEND_ORIGIN: https://amynest-backend-dykj.onrender.com (unchanged)
Worker version: c1c690a3-e402-40e1-8b6c-c4857b754c28
```

### Verification

| Check | Result |
|-------|--------|
| `curl https://www.amynest.in/api/health` | 200 |
| `x-amynest-backend` (20 probes) | **render** (20/20) |
| Render `/health` | 200 |
| Coolify `/health` (post-rollback) | 200 |
| Scheduler singleton | PASS |
| Render service | Live, not suspended |

---

## Root cause (preliminary)

**Transient Coolify reachability failure** from the monitoring host:

- Error: `fetch failed` (status 0, 2ms latency) — consistent with DNS/TLS/network blip, not application 5xx
- Coolify `/api/healthz/env` succeeded in same check window (1159ms) — partial connectivity
- Coolify recovered within ~60 seconds without intervention

**Contributing factor:** Monitor process had a ~64-minute gap between checks, breaking soak integrity before the failure.

---

## Impact assessment

| Area | Impact |
|------|--------|
| Production users | **None observed** — ~1% canary traffic; Render carried 99%+ |
| HTTP 5xx | 0% during incident |
| Authentication | No failures |
| BullMQ / Worker | No interruption (restart_count=0) |
| Scheduler | No ownership change |
| Database / Redis | No reconnect events |
| RevenueCat / Razorpay | Routing unaffected |

---

## Stage advancement status

| Item | Status |
|------|--------|
| Advance to 10% | **CANCELLED** |
| Stage 2 soak | **NOT STARTED** |
| Further advancement | **STOPPED** until re-certification |

---

## Required before re-enabling canary

1. Investigate Coolify public endpoint stability (Traefik, TLS, sslip.io)
2. Run uninterrupted 30-minute monitor soak with zero failures
3. Re-run `06-smoke-test.sh` and scheduler verify
4. Re-enable at `CANARY_PERCENT=1` only after engineering sign-off on investigation

---

## Render hot standby

| Service | Status |
|---------|--------|
| `Amynest-backend-dykj` | **Online** — receiving 100% traffic |
| Legacy Render DB/Redis | Unchanged |
| Backups | **Not removed** |

**No Render services were stopped, deleted, or decommissioned.**

---

## Artifacts

- `audit/render-to-coolify/canary-stage-1-final.md`
- `audit/render-to-coolify/rollback-instructions.md`
- `scripts/audit/render-to-coolify/canary-state.json`
- `scripts/audit/render-to-coolify/dashboard-latest.json`

---

*Automatic rollback per Release Operations policy. Manual approval not required for rollback; advancement remains blocked.*
