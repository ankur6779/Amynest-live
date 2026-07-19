# Render → Coolify cutover checklist

**Use only after** `audit/render-to-coolify/verify-latest.json` shows `"passed": true`.

This checklist covers production cutover. **Database preparation** is a separate phase (see `render-to-coolify-migration-plan.md`).

**Out of scope for this preparation task:** Cloudflare and DNS are listed for completeness but must not be executed until replica is proven.

---

## A. Pre-cutover gates (T-24h)

### Database replica

- [ ] `01-initial-copy.sh --replace` completed successfully
- [ ] `verify-latest.json` → `"passed": true`
- [ ] `smoke-latest.json` → `"passed": true` (Firebase, profiles, AI queue, GCS, webhooks)
- [ ] Key tables match Render:
  - [ ] `parent_profiles`
  - [ ] `subscriptions`
  - [ ] `children`
  - [ ] `analytics_events`
  - [ ] `notification_log`
  - [ ] `speech_coach_v2_*`
- [ ] `03-delta-sync.sh` run at least once during soak
- [ ] Dump backup exists in `audit/render-to-coolify/dumps/`

### Data plane consistency (required before any canary % > 0)

- [ ] `bash scripts/render-to-coolify/09-data-plane-audit.sh` → exit 0
- [ ] `data-plane-audit-latest.json` → `"canary_approved": true`
- [ ] All stateful groups unified (database, redis, bullmq, notification_scheduler, cron_jobs)
- [ ] No Render + Coolify split on equivalent services

### Single Active Scheduler (required before canary)

- [ ] `bash scripts/render-to-coolify/10-scheduler-presync-render.sh`
- [ ] Render: `SCHEDULER_ACTIVE_PLANE=render`, `BACKGROUND_TASKS_ENABLED=true`, `NOTIFICATIONS_ENABLED=true`
- [ ] Coolify: `SCHEDULER_ACTIVE_PLANE=render`, `BACKGROUND_TASKS_ENABLED=false`, `NOTIFICATIONS_ENABLED=false`
- [ ] `pnpm run migrate:render-to-coolify:verify-scheduler` → PASS (exactly one owner)

### Coolify backend (parallel)

- [ ] Backend container healthy (`/health` inside container)
- [ ] `DATABASE_URL` → Coolify Postgres (not Render)
- [ ] `REDIS_URL` → decision made (Render Redis or Coolify Redis)
- [ ] Public HTTPS URL serves `/health` (Traefik routing fixed)
- [ ] Smoke test against Coolify URL (auth, subscription read, routine list)

### Worker alignment

- [ ] Hetzner worker `DATABASE_URL` / `REDIS_URL` plan documented
- [ ] BullMQ queues drained: `wait=0`, `active=0`, `delayed=0` on active Redis

### Rollback prepared

- [ ] Render backend still live (`amynest-backend-dykj.onrender.com/health` → 200)
- [ ] Cloudflare `BACKEND_ORIGIN` documented as Render URL
- [ ] Rollback owner assigned; < 5 min path tested

---

## B. Final sync (T-15min) — Render still live

- [ ] Announce maintenance window (optional; zero-downtime target)
- [ ] Run `04-final-sync.sh`
- [ ] Confirm `verify-latest.json` → `"passed": true` **again**
- [ ] Save copy of final verify report with timestamp
- [ ] Optional: `03-delta-sync.sh` one last time

---

## C. Cutover sequence (T-0) — **do not run until A+B complete**

> **Recommended:** Run canary stages (1% → 10% → 25% → 50% → 100%) via Cloudflare Worker before full cutover. See `render-to-coolify-canary.md`.

### C0. Canary stages (optional but recommended)

- [ ] `CANARY_BACKEND_ORIGIN` set in `wrangler.toml`
- [ ] `CANARY_PERCENT=1` deployed; monitor stable 30 min
- [ ] Advance: 10% → 25% → 50% → 100% with `07-canary-monitor.sh --watch --advance`
- [ ] `dashboard.html` shows overall score ≥ 85 at each stage
- [ ] No `rollback-instructions.md` generated during canary

### C1. Stop new writes to Render DB (brief coordination)

- [ ] Option A (preferred): Keep Render API live; only switch proxy (writes go to Coolify API → Coolify DB)
- [ ] Option B: If dual-write risk exists, pause Render API autoscaling triggers only

### C2. Backend traffic switch

- [ ] At `CANARY_PERCENT=100`, all API traffic via Worker goes to Coolify
- [ ] Or update Cloudflare Worker `BACKEND_ORIGIN` → Coolify HTTPS origin (legacy full cutover)
- [ ] `wrangler deploy` (in `infra/cloudflare/amynest-api-proxy/`)
- [ ] Verify `https://www.amynest.in/api/health` → Coolify
- [ ] Verify `x-amynest-backend: coolify` on sample requests

### C3. Worker switch (if applicable)

- [ ] Update Hetzner `worker.env` `DATABASE_URL` + `REDIS_URL`
- [ ] `bash scripts/hetzner/deploy-worker-remote.sh`
- [ ] Worker health: `redisPingOk`, `bullMqActive`, `consumerRegistered`

### C4. Immediate validation (T+0 to T+5min)

- [ ] Login (Firebase) — existing user
- [ ] New signup flow
- [ ] Subscription status read
- [ ] Routine list + completion
- [ ] Speech coach session start
- [ ] AI job enqueue + worker completion
- [ ] RevenueCat webhook test event (dashboard)
- [ ] Push token registration

---

## D. Rollback (if cutover fails) — target < 5 minutes

| Step | Action | Owner | ~Time |
|------|--------|-------|------:|
| 1 | Set `CANARY_PERCENT=0` in wrangler.toml and deploy | DevOps | 60s |
| 2 | Or revert `BACKEND_ORIGIN` to Render if legacy full cutover was used | DevOps | 60s |
| 3 | Verify `www.amynest.in/api/health` hits Render | DevOps | 30s |
| 4 | Revert Hetzner worker env to Render DB/Redis if changed | DevOps | 90s |
| 5 | Restart worker | DevOps | 60s |
| 6 | Confirm login + AI jobs on Render path | QA | 60s |

**Render Postgres was never stopped** — rollback does not require DB restore.

**Coolify rollback (if bad data written during failed cutover):**

```bash
bash scripts/render-to-coolify/rollback-truncate-coolify.sh
bash scripts/render-to-coolify/rollback-restore-coolify-backup.sh audit/render-to-coolify/dumps/<last-good>.dump
```

---

## E. Post-cutover soak (T+1h to T+48h)

- [ ] Keep Render backend running (hot standby)
- [ ] Monitor error rates, 5xx, auth failures
- [ ] Compare `analytics_events` row growth Render vs Coolify (should diverge — Render frozen)
- [ ] After 48h stable: decommission Render backend
- [ ] Keep Render Postgres backup 7+ days after final cutover

---

## F. Go / no-go decision

| Condition | Decision |
|-----------|----------|
| `verify-latest.json` passed **and** Coolify `/health` public **and** smoke tests pass | **GO** for cutover |
| Any row mismatch | **NO-GO** — run `04-final-sync.sh`, re-verify |
| Coolify public URL broken | **NO-GO** — fix Traefik first |
| Worker not aligned with target Redis | **NO-GO** — AI jobs will fail |

**Current status (2026-07-11): NO-GO** — data not migrated; verification will fail until Phase 1 completes.

---

## Quick command reference

```bash
# Prove replica (must PASS)
bash scripts/render-to-coolify/04-final-sync.sh

# Read result
cat audit/render-to-coolify/verify-latest.md
jq .passed audit/render-to-coolify/verify-latest.json
```
