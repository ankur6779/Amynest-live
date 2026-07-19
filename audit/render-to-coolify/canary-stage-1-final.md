# Canary Stage 1% — Final Report

**Generated:** 2026-07-12T10:42:00Z  
**Stage:** 1% → **FAILED** (rollback executed)  
**Canary percent (final):** **0%** (rolled back)  
**Verdict:** **DO NOT ADVANCE** — soak criteria not met

---

## Executive summary

Stage 1% canary ran from **09:17 UTC** until automatic rollback at **~10:40 UTC**. Seventeen monitoring intervals passed with Render and Coolify scores at 100. At **10:38:52 UTC**, interval **#18 failed**: Coolify `/health` returned `fetch failed` (score 45). Per release policy, **immediate rollback to `CANARY_PERCENT=0`** was executed. Stage advancement to 10% is **blocked**.

Render remains primary and hot standby. No user-facing production outage observed during rollback.

---

## Soak gate checklist

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Full 30-minute Stage 1 soak completed | **FAIL** — 16 consecutive stable minutes; monitor gap; failure at T+81m |
| 2 | Every monitoring interval passed | **FAIL** — 18/19 passed; 1 failed |
| 3 | No HTTP 5xx increase | **PASS** (during healthy intervals) |
| 4 | No latency regression >50% | **PASS** |
| 5 | No authentication failures | **PASS** (auth probes skipped — no token) |
| 6 | No RevenueCat failures | **PASS** (webhook secret unset — routing only) |
| 7 | No Razorpay failures | **PASS** |
| 8 | No BullMQ enqueue/processing failures | **PASS** |
| 9 | No Redis reconnects | **PASS** — `redisPing: true` on both planes |
| 10 | No PostgreSQL reconnects | **PASS** — session secret OK |
| 11 | No worker restarts | **PASS** — `restart_count=0`, uptime 2h |
| 12 | No scheduler ownership changes | **PASS** — Render owner, Coolify standby |
| 13 | No memory/CPU anomalies | **PASS** — worker CPU 0.03%, mem 1.84% |
| 14 | No user-visible production issues | **PASS** — no reported incidents |

**Advancement to 10%:** **DENIED**

---

## Request volume (monitoring scope)

Production request logs are not available in the monitoring toolchain. Figures below cover **automated release probes** during Stage 1.

| Source | Count | Notes |
|--------|------:|-------|
| Monitor intervals (60s) | **19** | 09:17–09:34 continuous; gap; 10:38 failure; 10:39 recovery |
| Passed intervals | **18** | Both planes score 100 |
| Failed intervals | **1** | Coolify `/health` fetch failed |
| Synthetic routing probes (1% window) | ~20 | Sticky-hash verification samples |
| Post-rollback routing probes | **20** | All `x-amynest-backend: render` |

### Estimated production traffic split (1% canary window)

| Backend | Estimated share | Method |
|---------|----------------|--------|
| Render | ~99% | Primary + sticky hash |
| Coolify | ~1% | Canary bucket (`canary-probe-50` confirmed coolify lane) |

*Exact request totals require Cloudflare Analytics — not queried during this soak.*

---

## HTTP status distribution (probe endpoints)

Aggregated across healthy monitor snapshots (Render + Coolify direct probes):

| Endpoint | Status | Count (per plane per check) |
|----------|--------|----------------------------|
| `/health` | **200** | 1 |
| `/ready` | 404 | 1 (expected — no handler) |
| `/api/healthz/env` | **200** | 1 |
| `/api/healthz/audio` | **200** | 1 |
| **5xx** | **0** | 0 |

Failed interval (10:38:52): Coolify `/health` → **status 0** (`fetch failed`, transient network).

---

## Latency (probe-derived)

From healthy-interval snapshots (multi-endpoint probe bundle per plane):

| Plane | p50 (approx) | p95 | Notes |
|-------|-------------|-----|-------|
| **Render** | ~615ms | **1072–2371ms** | Dominated by `/healthz/audio` stream probe |
| **Coolify** | ~348ms | **1269–1574ms** | Within 2.5× Render threshold |
| Production via CF (`/api/health`) | ~550ms | ~1073ms | Post-rollback sample |

No latency regression >50% vs Render baseline during healthy intervals.

---

## Worker uptime

| Metric | Value |
|--------|-------|
| Container status | Up 2 hours |
| Restart count | **0** |
| CPU | 0.03% |
| Memory | 1.84% (141.7 MiB / 7.565 GiB) |
| BullMQ consumer | Active |
| Recent jobs | `stateful-plane-*` completed |

---

## BullMQ statistics

| Metric | Render API | Coolify API |
|--------|------------|-------------|
| Mode | bullmq | bullmq |
| Redis ping | true | true |
| Waiting | 0 | 0 |
| Active | 0 | 0 |
| Completed | 2 | 2 |
| Failed | 0 | 0 |
| Delayed | 0 | 0 |

No enqueue or processing failures observed.

---

## Redis health

| Check | Status |
|-------|--------|
| Render API `redisPing` | OK |
| Coolify API `redisPing` | OK |
| Worker consumer | OK |
| Reconnect events | **None detected** |

---

## PostgreSQL health

| Check | Status |
|-------|--------|
| Session secret (Render) | OK (`session_secret`) |
| Session secret (Coolify) | OK (`session_secret`) |
| Reconnect events | **None detected** |
| Replica certification | `verify-latest.json` passed (pre-canary) |

---

## Scheduler verification

**Result: PASS** (post-rollback re-check)

| Plane | Owner | Active plane | Background tasks | Notifications |
|-------|-------|--------------|------------------|---------------|
| Render API | **true** | render | enabled | enabled |
| Coolify API | **false** | render (standby) | disabled | disabled |

No ownership drift during soak.

---

## Error summary

| Time (UTC) | Severity | Component | Error | Impact |
|------------|----------|-----------|-------|--------|
| 10:38:52 | **Critical (monitor)** | Coolify `/health` | `fetch failed` (status 0) | Monitor score 45; triggered rollback policy |
| 10:39:55 | Info | Coolify `/health` | Recovered — 200 | Post-failure probe OK |
| — | Info | Monitor gap | ~64 min between checks 17→18 | Soak continuity broken |

No HTTP 5xx, auth failures, BullMQ failures, worker restarts, or scheduler mismatches.

---

## Rollback actions taken

| Step | Status |
|------|--------|
| `CANARY_PERCENT=0` | Applied |
| Cloudflare Worker deploy | **c1c690a3-e402-40e1-8b6c-c4857b754c28** |
| Production routing verify | 20/20 probes → `render` |
| Stage advancement | **STOPPED** |

See: `audit/render-to-coolify/canary-rollback-report.md`

---

## Recommendation

1. **Hold canary at 0%.** Do not re-enable until root cause of Coolify `/health` transient failure is understood.
2. **Investigate Coolify public routing stability** — likely transient network/TLS blip on sslip.io; confirm Traefik and container health on Coolify host.
3. **Fix monitor continuity** — 64-minute gap between checks invalidates soak integrity; ensure `07-canary-monitor.sh --watch` runs uninterrupted for full 30-minute windows.
4. **Re-attempt Stage 1%** only after:
   - Coolify passes 30 consecutive 60s monitor intervals with zero failures
   - Full 30-minute soak with no gaps
   - All 14 gate criteria green
5. **Render remains hot standby** — do not decommission.

**Estimated readiness for Stage 1 retry:** After investigation + successful 30-min uninterrupted soak (earliest: next ops window).

**CANARY CERTIFIED:** Not applicable — rollout rolled back.

---

*Release Operations — Engineering freeze remains in effect.*
