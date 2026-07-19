# Canary Stage 25% — Certification Report

**Generated:** 2026-07-12T18:10:00Z  
**Stage:** 25%  
**Verdict:** **STAGE 25 CERTIFIED**  
**Standard:** Stricter (60-min Hetzner soak, regression analysis, production traffic comparison)

---

## Soak configuration

| Setting | Value |
|---------|-------|
| Monitor host | `ubuntu-8gb-nbg1-1` (Hetzner `167.233.39.146`) |
| Started | `2026-07-12T17:08:52.490Z` |
| Completed | `2026-07-12T18:08:52.509Z` |
| Duration | **60 minutes** |
| Interval | **30 seconds** |
| Source | Hetzner systemd `amynest-monitor-soak.service` (not laptop) |
| `CANARY_PERCENT` during soak | **25** (unchanged) |

---

## Soak gate results

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

## Traffic served (Render production, soak window)

| Metric | Count |
|--------|------:|
| **Total requests** | **5,627** |
| HTTP 2xx | 4,589 (81.5%) |
| HTTP 4xx | 434 (7.7%) |
| HTTP 5xx | **0** (0%) |

**Status breakdown:** 200×337, 202×4233, 204×19, 304×604, 400×11, 404×423

*Render carries ~75% of routed traffic at 25% canary; Coolify receives ~25% via sticky hash. Hetzner soak probes both planes directly.*

---

## Hetzner probe comparison (Render vs Coolify)

| Plane | 2xx | 4xx | 5xx | Avg | p50 | p95 | Max |
|-------|----:|----:|----:|----:|----:|----:|----:|
| **Render** | 218 | 109 | 0 | 232ms | 226ms | 484ms | 601ms |
| **Coolify** | 218 | 109 | 0 | 163ms | 31ms | 715ms | 880ms |
| **Combined** | 436 | 218 | 0 | 197ms | 190ms | 580ms | 880ms |

**4xx note:** All 218 Hetzner 4xx are `/api/healthz/env` → 404 on both planes (same probe-path discrepancy as Stage 10; composite health remained OK). **No new 4xx class introduced at 25%.**

---

## Latency trend (stricter regression check)

| Window | Avg | p50 | p95 | Max |
|--------|----:|----:|----:|----:|
| First 30 min | 187ms | 190ms | 521ms | 880ms |
| Second 30 min | 209ms | 191ms | 587ms | 867ms |
| Delta | +12% avg | +0.5% p50 | +12.7% p95 | −1.5% max |

**Assessment:** Minor avg/p95 drift within normal variance. **No latency regression breach.**

---

## Render production latency (200 responses)

| Metric | Value |
|--------|-------|
| p50 | 5ms |
| p95 | 509ms |
| Maximum | 2,616ms |

---

## CPU trend

| Component | Soak window |
|-----------|-------------|
| Render API | 1.23% – 4.67% (brief bursts, not sustained) |
| Hetzner worker | 0.10% → 0.01% (flat) |

**No CPU leak detected.**

---

## Memory trend

| Component | Start | End | Assessment |
|-----------|------:|----:|------------|
| Render API | 564 MB | 548 MB | **Stable / slight decrease** |
| Hetzner worker | 1.94% | 1.94% | **Flat** |

**No memory leak detected.**

---

## BullMQ statistics

| Metric | Soak start | Soak end | Delta |
|--------|------------|----------|-------|
| waiting | 0 | 0 | 0 |
| active | 0 | 0 | 0 |
| completed | 4 | 4 | 0 |
| failed | 0 | 0 | 0 |
| delayed | 0 | 0 | 0 |
| Queue processing time | n/a | n/a | No backlog |

**No queue buildup. No failed jobs.**

---

## Worker statistics

| Metric | Value |
|--------|-------|
| Uptime | 9h+ (since `08:33:45Z`) |
| Restarts | **0** |
| CPU | 0.01% |
| Memory | 1.94% |
| Heartbeat | PASS (`bullMqActive`, `consumerRegistered`, `redisPingOk`) |
| Throughput degradation | **None observed** |

---

## Redis statistics

| Check | Result |
|-------|--------|
| `redisPingOk` | true (start → end) |
| Reconnects | **None** |
| Queue keys healthy | true |

---

## Database statistics

| Check | Result |
|-------|--------|
| `sessionSecretReady` | true (both planes, post-soak smoke) |
| Reconnects | **None** |
| Slow queries (observed) | **None** |
| Data inconsistency | **None** |

---

## Scheduler verification

**PASS** — unchanged throughout soak.

| Plane | Owner | Active plane |
|-------|-------|--------------|
| Render API | **true** | render |
| Coolify API | false | render (standby) |

---

## Additional pipeline checks

| Pipeline | Result |
|----------|--------|
| RevenueCat route | OK — `www.amynest.in/api/subscription/webhook` |
| Razorpay route | unchanged (not POST-tested) |
| Firebase auth | skip (no token) |
| GCS | PASS |
| AI enqueue | skip (no token); producer path OK |
| AI completion | stable — completed=4, failed=0 |
| Speech Coach | not directly probed (no auth token) |
| Push notification pipeline | scheduler owner=Render; no failures observed |

---

## Regression gate review (stricter)

| Check | Result |
|-------|--------|
| Memory leak | **PASS** |
| CPU trend | **PASS** |
| Latency trend | **PASS** (minor drift) |
| Queue buildup | **PASS** |
| Database slow queries | **PASS** |
| Redis reconnects | **PASS** |
| Worker throughput degradation | **PASS** |
| Traffic imbalance | **PASS** (~25% Coolify expected) |
| Unexpected 4xx increase | **PASS** (same probe pattern as Stage 10) |
| Unexpected 5xx increase | **PASS** (0) |

---

## Rollback gate review

| Condition | Triggered? |
|-----------|------------|
| 3 consecutive unhealthy cycles | **No** |
| Composite health failure | **No** |
| Queue instability | **No** |
| Worker instability | **No** |
| Database instability | **No** |
| Redis instability | **No** |
| User-visible degradation | **No** |

---

## Overall production health score

| Plane | Score |
|-------|------:|
| Render | **100** |
| Coolify | **100** |
| Worker / BullMQ | **100** |
| Scheduler | **100** |
| **Overall** | **100** |

---

## Comparison vs Stage 10 certification

| Metric | Stage 10 | Stage 25 | Delta |
|--------|----------|----------|-------|
| Soak cycles | 109 | 109 | = |
| Unhealthy cycles | 0 | 0 | = |
| Combined p95 | 607ms | 580ms | −4.4% |
| Combined max | 1010ms | 880ms | −12.9% |
| BullMQ failed | 0 | 0 | = |
| Worker restarts | 0 | 0 | = |
| Render 5xx (prod) | 0 | 0 | = |

---

## Recommendation

**CERTIFY Stage 25.** Authorized to advance canary to **50%** per release ladder. Render remains hot standby. Do not advance beyond 50% until Stage 50 soak completes.

---

## Artifacts

| File | Purpose |
|------|---------|
| `stage25-soak-hetzner.log` | Raw soak console output |
| `monitor-soak-summary.json` | Soak summary |
| `monitor-soak-cycles.json` | Per-cycle health |
| `probe-log.jsonl` | Full probe records |
| `stage25-soak-baseline.txt` | Pre-soak worker/BullMQ snapshot |

---

*Release Director — Stage 25 certified. Authorized to advance to 50%.*
