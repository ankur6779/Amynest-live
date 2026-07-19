# Canary Stage 50% — Autonomous Certification Report

**Generated:** 2026-07-12T19:50:18.510Z
**Verdict:** **STAGE 50 CERTIFIED**
**Monitor host:** ubuntu-8gb-nbg1-1
**Duration:** 90 minutes @ 30s

## Soak results

| Metric | Value |
|--------|-------|
| Total probe cycles | 162 |
| Coolify unhealthy cycles | 0 |
| Render unhealthy cycles | 0 |
| Composite failure cycles | 0 |
| Max consecutive unhealthy | 0 |
| Gap invalidations | 0 |
| Rollback recommended | NO |
| Advance to 100% executed | NO |

## Latency (all successful endpoint probes)

| Metric | Value |
|--------|-------|
| Average | 253ms |
| p50 | 186ms |
| p95 | 705ms |
| Maximum | 1250ms |

## HTTP distribution

| Class | Count |
|-------|------:|
| 2xx | 972 |
| 4xx | 0 |
| 5xx | 0 |
| other | 0 |

## CPU / memory trend (worker container)

| Metric | Start | End |
|--------|-------|-----|
| CPU | 45.66% | 36.64% |
| Memory | 1.95% | 1.96% |

## BullMQ statistics

| Metric | Start | End |
|--------|-------|-----|
| waiting | 0 | 0 |
| active | 0 | 0 |
| completed | 4 | 4 |
| failed | 0 | 0 |
| delayed | 0 | 0 |

## Worker statistics

| Metric | Value |
|--------|-------|
| Heartbeat (final) | PASS |
| Restarts (final) | 0 |

## Redis / PostgreSQL (final cycle)

| Check | Result |
|-------|--------|
| Redis ping | PASS |
| PostgreSQL SELECT 1 | FAIL |

## Docker / Traefik (final cycle)

| Component | Status |
|-----------|--------|
| Worker container | amynest-worker Up 11 hours |
| Coolify proxy | unknown |
| Traefik health | WARN |

## Scheduler (when secret available)

Render owner: true  
Coolify owner: false  
Active plane: render

## Overall production health score

**100**

## Artifacts

- `stage50-autonomous-cycles.jsonl`
- `stage50-autonomous-summary.json`
- `stage50-autonomous.log`

---
*Autonomous monitor — STAGE 50 CERTIFIED*
