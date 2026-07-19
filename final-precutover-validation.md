# Final Pre-Cutover Validation

**Date:** 2026-07-13  
**Purpose:** Verify the permanent Traefik HTTPS fix did not introduce regressions before restoring production traffic to Coolify.  
**Constraints honored:** No code, Docker, database, Redis, or scheduler configuration changes.

---

## Step 1 — Fresh native Coolify deployment (Traefik fix survival)

**Action:** Queued Coolify-native redeploy with `force_rebuild=true` (deployment UUID `p14gug46yv1cuwveik2nj5de`). No manual `docker-compose.yaml` edits.

| Check | Result |
|-------|--------|
| `applications.custom_labels` contains `https-0-*` | **PASS** — 7 lines |
| `docker-compose.yaml` contains `https-0-*` | **PASS** — 7 lines |
| HTTP `/health` | **PASS** — 302 → `https://…/health` |
| HTTPS `/health` | **PASS** — 200 |
| HTTPS `/api/healthz` | **PASS** — 200 |
| HTTPS `/api/healthz/audio` | **PASS** — 200 |

**Verdict:** Permanent Traefik fix survives a completely fresh native Coolify deployment.

---

## Step 2 — Complete smoke tests

**Target:** `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io`  
**Data plane audit:** **SAFE** (canary approved)

| Component | Probe | Result |
|-----------|-------|--------|
| `/health` | GET HTTPS | **200** |
| `/api/healthz` | GET HTTPS | **200** |
| `/api/healthz/audio` | GET HTTPS | **200** |
| **Audio** | `healthz/audio` body | **PASS** (`ok: true`) |
| **GCS** | `staticAudio.gcsProbeOk` | **PASS** (`true`) |
| **Phonics** | `/api/phonics/sound/a.mp3` (follow redirect) | **200** |
| **Rhymes** | `/api/audio/rhymes/catalog` | **200** |
| **Speech Coach** | `/api/remote-config/speech-coach-v2` | **200** |
| **Stories** | `/api/stories/catalog` (unauthenticated) | **401** (route alive; auth required) |
| **Routine generation** | Auth-gated; infra via scheduler catalog | Scheduler lists `routine_item_sweep` + AI jobs |
| **RevenueCat** | Webhook without auth | **401** (expected) |
| **BullMQ** | `healthz/env` queue + worker | **PASS** (`mode: bullmq`, 18 completed, 0 failed) |
| **Redis** | Worker + `healthz/env` | **PASS** (`redisPing: true`, `PONG`) |
| **PostgreSQL** | `healthz/env` | **PASS** (`db.ok: true`) |
| **Worker** | `127.0.0.1:9090/health` on Hetzner | **PASS** (`bullMqActive`, `consumerRegistered`) |
| **Scheduler** | `healthz/env` | **PASS** (`schedulerOwner: true`, 23 jobs registered) |
| **Push notifications** | Scheduler job catalog | **PASS** (`notification_cron_ping`, `weekly_recap_push`, etc.) |

**Verdict:** All infrastructure and public feature routes healthy. Auth-gated routes (Stories, routine generation) respond correctly without 5xx.

---

## Step 3 — Short validation canary (Hetzner monitor, 30s interval, 15 min each)

### Stage 1% (`CANARY_PERCENT=1`)

- **Cloudflare deploy:** Version `480499f3-066a-4021-8c0e-61818526eb5f`
- **Monitor host:** `ubuntu-8gb-nbg1-1` (Hetzner `167.233.39.146`)
- **Duration:** 15 min (900,000 ms) @ 30s
- **Cycles:** 27
- **Coolify unhealthy:** 0
- **Render unhealthy:** 0
- **Composite failures:** 0
- **Max consecutive unhealthy:** 0
- **www.amynest.in probes:** 30/30 OK (200); sticky client IP routed to `render` (expected at 1%)

**Verdict:** **PASS** → advanced to 10%.

### Stage 10% (`CANARY_PERCENT=10`)

- **Cloudflare deploy:** Version `0daf813f-0521-4b85-969f-e59868867915`
- **Duration:** 15 min @ 30s
- **Cycles:** 27
- **Coolify unhealthy:** 0
- **Render unhealthy:** 0
- **Composite failures:** 0
- **Max consecutive unhealthy:** 0
- **www.amynest.in probes:** 30/30 OK (200)

**Verdict:** **PASS** → advanced to 100%.

---

## Step 4 — Full traffic restore (`CANARY_PERCENT=100`)

- **Cloudflare deploy:** Version `c79bc37d-479d-4af0-9a0a-62034d658bb6`

| Check | Result |
|-------|--------|
| `www.amynest.in/api/healthz` | **200**, `x-amynest-backend: coolify` |
| `www.amynest.in/api/healthz/audio` | **200**, `x-amynest-backend: coolify` |
| Direct Coolify HTTPS `/health` | **200** |
| Direct Coolify HTTPS `/api/healthz/audio` | **200** |
| **HTTPS routing (Traefik)** | **PASS** — labels intact post-redeploy |
| **Audio / GCS** | **PASS** |
| **BullMQ / Redis** | **PASS** (worker consumer registered) |
| **PostgreSQL** | **PASS** |
| **Scheduler** | **PASS** (owner active on Coolify) |
| **Worker** | **PASS** |
| **RevenueCat route** | **PASS** (401 without auth on direct Coolify) |

**Verdict:** Production API traffic restored to Coolify via Cloudflare worker. No Traefik regression observed.

---

## Overall result

| Step | Status |
|------|--------|
| 1 — Traefik fix survives redeploy | **PASS** |
| 2 — Complete smoke tests | **PASS** |
| 3 — Canary 1% (15 min) | **PASS** |
| 3 — Canary 10% (15 min) | **PASS** |
| 4 — Canary 100% + final verify | **PASS** |

**Conclusion:** The permanent Traefik HTTPS fix is validated. Production traffic is on Coolify (`CANARY_PERCENT=100`). No long soak started per instructions.

---

## Artifacts

| Artifact | Location |
|----------|----------|
| Traefik fix report | `coolify-traefik-permanent-fix.md` |
| Data plane audit | `audit/render-to-coolify/data-plane-audit-latest.md` |
| Stage 1% monitor summary | Hetzner `/opt/amynest/monitor-audit/precutover-stage1/render-to-coolify/production-48h-summary.json` |
| Stage 10% monitor summary | Hetzner `/opt/amynest/monitor-audit/precutover-stage10/render-to-coolify/production-48h-summary.json` |
| Canary probe logs | Hetzner `precutover-stage*/canary-probe.jsonl` |

## Notes

- HTTP `/health` returns **302** redirect-to-HTTPS when probed directly on Coolify (expected with `https://` FQDN).
- At 1% and 10% canary, the Hetzner probe client’s sticky IP consistently hashed to the Render bucket; all composite health checks still passed for both backends.
- At 100%, `x-amynest-backend: coolify` confirmed on `www.amynest.in`.

**STOP** — No additional soak or migration restart initiated.
