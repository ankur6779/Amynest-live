# Canary Stage 10% — Certification Report

**Generated:** 2026-07-12T17:00:00Z  
**Stage:** 10%  
**Verdict:** **STAGE 10 CERTIFIED**

---

## Soak configuration

| Setting | Value |
|---------|-------|
| Monitor host | `ubuntu-8gb-nbg1-1` (Hetzner `167.233.39.146`) |
| Started | `2026-07-12T15:58:07.985Z` |
| Completed | `2026-07-12T16:58:07.999Z` |
| Duration | **60 minutes** |
| Interval | **30 seconds** |
| Source | Hetzner systemd `amynest-monitor-soak.service` (not laptop) |
| `CANARY_PERCENT` during soak | **10** (unchanged) |

---

## Soak results

| Metric | Value |
|--------|-------|
| Total probe cycles | **109** |
| Coolify unhealthy cycles | **0** |
| Render unhealthy cycles | **0** |
| Max consecutive unhealthy cycles | **0** |
| Gap invalidations (>120s) | **0** |
| False failures (transient) | **0** |
| Composite monitor verdict | **MONITOR CERTIFIED** |

---

## HTTP distribution (654 Hetzner probe records)

| Class | Count | Notes |
|-------|------:|-------|
| **2xx** | 436 | `/health` + `/api/healthz` on both planes — all cycles |
| **4xx** | 218 | `/api/healthz/env` → 404 from Hetzner vantage (see note) |
| **5xx** | **0** | None |

**Note on 404s:** Hetzner probes to `/api/healthz/env` returned 404 on both Render and Coolify for all 109 cycles. `/health` and `/api/healthz` returned 200. Per composite policy, unhealthy requires **all three** endpoints to fail — therefore cycles remained **healthy**. MacBook point-in-time probes during the same window returned 200 on `/api/healthz/env`. This is a **probe-path discrepancy**, not user-visible degradation.

---

## Latency (Hetzner soak, successful probes)

| Metric | Value |
|--------|-------|
| Average | **223ms** |
| p50 | **193ms** |
| p95 | **607ms** |
| Maximum | **1010ms** |

---

## Worker uptime

| Metric | Soak start | Soak end |
|--------|------------|----------|
| Container status | running | running |
| Restarts | **0** | **0** |
| Started at | `2026-07-12T08:33:45Z` | unchanged |
| CPU | 0.02% | 0.00% |
| Memory | 1.94% | 1.94% |
| Heartbeat (`:9090/health`) | PASS | PASS |

---

## BullMQ statistics

| Metric | Soak start | Soak end | Delta |
|--------|------------|----------|-------|
| waiting | 0 | 0 | 0 |
| active | 0 | 0 | 0 |
| completed | 4 | 4 | 0 |
| failed | 0 | 0 | 0 |
| delayed | 0 | 0 | 0 |

**No queue growth. No failed jobs.**

---

## Redis health

| Check | Soak start | Soak end |
|-------|------------|----------|
| `redisPingOk` | true | true |
| `bullMqActive` | true | true |
| Reconnects observed | **None** | **None** |

---

## Database health

| Check | Result |
|-------|--------|
| `sessionSecretReady` (Render) | true |
| `sessionSecretReady` (Coolify) | true |
| Reconnects observed | **None** |
| Data inconsistency | **None detected** |

---

## Memory trend

| Component | Trend |
|-----------|-------|
| Hetzner worker container | **Flat** — 1.94% start → 1.94% end |
| Render API (MCP) | Stable ~528–546 MB band during soak window |

---

## CPU trend

| Component | Trend |
|-----------|-------|
| Hetzner worker | **Flat** — 0.02% → 0.00% |
| Render API (MCP) | Low utilization, brief probe bursts only |

---

## Scheduler verification

**PASS** — singleton unchanged throughout soak.

| Plane | Owner | Active plane |
|-------|-------|--------------|
| Render API | **true** | render |
| Coolify API | false | render (standby) |

---

## Additional checks (post-soak)

| Check | Result |
|-------|--------|
| RevenueCat route | OK — `www.amynest.in/api/subscription/webhook` |
| GCS | PASS — stream probe OK |
| Firebase auth | skip (no token in probe env) |
| AI completion | stable — completed=4, failed=0 |
| Smoke test | **PASS** |

---

## Failure gate review

| Condition | Triggered? |
|-----------|------------|
| 3 consecutive unhealthy cycles | **No** |
| Composite health failure | **No** |
| Queue growth | **No** |
| Worker restart | **No** |
| Redis reconnect | **No** |
| PostgreSQL reconnect | **No** |
| Scheduler change | **No** |
| User-visible degradation | **No** |

---

## Recommendation

**CERTIFY Stage 10.** Advance canary to **25%** per release ladder. Render remains hot standby. Do not advance beyond 25% until Stage 25 soak completes.

---

## Artifacts

| File | Purpose |
|------|---------|
| `stage10-soak-hetzner.log` | Raw soak console output |
| `monitor-soak-summary.json` | Soak summary |
| `monitor-soak-cycles.json` | Per-cycle health |
| `probe-log.jsonl` | Full probe records |
| `stage10-soak-baseline.json` | Pre-soak worker/BullMQ snapshot |

---

*Release Director — Stage 10 certified. Authorized to advance to 25%.*
