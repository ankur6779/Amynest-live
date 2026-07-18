# AmyNest v1.0 — Soft Launch Plan

**Goal:** Limited public exposure while billing lifecycle matrix completes on device.

---

## Rollout

| Channel | Rollout | Notes |
|---------|---------|--------|
| Web `www.amynest.in` | **100%** Pages traffic | Already live |
| API Coolify | **100%** (`CANARY_PERCENT=100`) | Render standby kept for rollback |
| Play Store | **Closed testing → 20% staged → 100%** | Do not jump to 100% until L1 device matrix signed |
| App Store | **TestFlight → phased release 7 days** | Same gate |

Recommended Play staged rollout: 20% → 50% → 100% over 72h if crash-free + purchase success ≥ 95%.

---

## Success metrics (first 72h)

| Metric | Target |
|--------|--------|
| API availability | ≥ 99.5% |
| Crash-free sessions | ≥ 99% |
| Purchase → premium unlock | ≥ 95% within 60s |
| Stuck internal trials | **0** |
| Failed RC webhooks | **0** unprocessed > 1h |
| p95 API (health/authenticated) | Monitor vs baseline |

---

## Rollback triggers

| Trigger | Action |
|---------|--------|
| Purchase success &lt; 80% over 20+ attempts | Pause Play rollout; freeze IAP marketing |
| API 5xx spike &gt; 2% for 15 min | Worker `CANARY_PERCENT=0` → Render standby (if still provisioned) |
| Data corruption / bad migration | Restore from `/data/coolify/backups/postgres/latest.dump` per DR runbook |
| Critical privacy/security incident | Take API maintenance; rotate secrets |

---

## Rollback procedures

1. **API traffic:** Cloudflare Worker canary → `CANARY_PERCENT=0` (Render standby).  
2. **Static:** Cloudflare Pages → previous deployment.  
3. **DB:** DR runbook restore drill path (incident only).  
4. **Store:** Halt staged rollout / pause listing.

---

## Monitoring cadence

| Window | Cadence |
|--------|---------|
| Hours 0–6 | Every 30 min |
| Hours 6–24 | Hourly |
| Hours 24–72 | Every 4 h |

Escalation: on-call engineer → founder if purchase or auth broken &gt; 30 min.
