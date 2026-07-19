# Canary Stage 100% — Start Report

**Generated:** 2026-07-13T02:05:00Z  
**Stage:** 100% (full Coolify cutover via Cloudflare Worker)  
**Prior stage:** Stage 50% **CERTIFIED** (`canary-stage-50-certification.md`)  
**Action:** Cutover start only — 48-hour certification NOT started automatically

---

## Deployment

| Setting | Value |
|---------|-------|
| `CANARY_PERCENT` | **100** |
| `CANARY_BACKEND_ORIGIN` | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` |
| `BACKEND_ORIGIN` | `https://amynest-backend-dykj.onrender.com` (hot standby) |
| Worker version | `a89f306a-62cb-4a5a-afe4-befc2046e6ea` |
| Routes | `www.amynest.in/api/*`, `amynest.in/api/*` |

**Deploy status:** SUCCESS

---

## Stage 50 autonomous soak summary (certification basis)

| Metric | Value |
|--------|-------|
| Duration | 90 min @ 30s (Hetzner) |
| Total cycles | **162** |
| Unhealthy cycles | **0** |
| Max consecutive unhealthy | **0** |
| HTTP 2xx / 4xx / 5xx | 972 / 0 / 0 |
| p50 / p95 / max latency | 186ms / 705ms / 1250ms |
| Overall score | **100** |
| Rollback recommended | **NO** |

---

## Production routing (T+0)

At `CANARY_PERCENT=100`, all `www.amynest.in/api/*` traffic routes to **Coolify**.

| Probe | `x-amynest-backend` |
|-------|---------------------|
| `stage100-probe-1` | **coolify** |
| `stage100-probe-50` | **coolify** |
| `stage100-probe-99` | **coolify** |

---

## Post-cutover validation

| Check | Render (standby) | Coolify (primary) | Result |
|-------|------------------|-------------------|--------|
| `/health` | 200 (649ms) | 200 (1017ms) | PASS |
| `/api/healthz` | 200 (293ms) | 200 (895ms) | PASS |
| `/api/healthz/env` | smoke PASS | smoke PASS | PASS |
| Redis | — | `redisPingOk: true` | PASS |
| PostgreSQL | — | `sessionSecretReady: true` (smoke) | PASS |
| BullMQ | — | wait=0, active=0, failed=0 | PASS |
| Worker heartbeat | — | PASS (`:9090/health`, 0 restarts) | PASS |
| Scheduler | owner=true | standby=false, active_plane=render | PASS |

**Smoke test:** PASS  
**Scheduler singleton:** PASS

---

## Render hot standby

Render API **online** — not decommissioned. Serves failover / rollback path only.

---

## Stage 100 verdict (start)

**PASS** — 100% cutover deployed, immediate validation green.

**Next action:** Await explicit request for 48-hour post-cutover certification. **STOP.**

---

*Release Director — Stage 100 start complete. STOP.*
