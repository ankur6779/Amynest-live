# Scheduler Phase — Final Verification

**Generated:** 2026-07-11T18:45:00Z  
**Verdict:** **PASS** (after Coolify presync re-apply)  
**Gate:** Database migration may proceed only after this report is PASS.

---

## Required output

```
Render:
schedulerOwner=true

Coolify:
schedulerOwner=false

Exactly one scheduler active=true
```

---

## Release steps completed

| Step | Status | Evidence |
|------|--------|----------|
| 1. Commit Single Active Scheduler code | ✅ | `17715117a` — *Add Single Active Scheduler mode for Render→Coolify migration.* |
| 2. Push to GitHub `main` | ✅ | `origin/main` at `17715117a` |
| 3. Trigger Render deployment | ✅ | Env update + auto-deploy on push |
| 4. Wait until deployment healthy | ✅ | Deploy `dep-d998mu2s87ks739g35f0` → **live** (commit `17715117a`, trigger `api`) |
| 5–9. Verification | ✅ | See sections below |

---

## Transient blocker (resolved)

After pushing `17715117a` to `main`, **Coolify auto-deployed** from GitHub and **reset scheduler env**:

| Variable | Expected (standby) | Observed after auto-deploy |
|----------|-------------------|----------------------------|
| `SCHEDULER_ACTIVE_PLANE` | `render` | **missing** |
| `BACKGROUND_TASKS_ENABLED` | `false` | `true` |
| `NOTIFICATIONS_ENABLED` | `false` | `true` |

Result: **both planes briefly had `schedulerOwner=true`** (duplicate crons).

**Remediation:** Re-ran `scripts/render-to-coolify/13-apply-scheduler-presync-coolify.sh` — patched Coolify `.env`, `docker compose up -d --force-recreate`, verified standby restored.

**Follow-up:** Pin Coolify scheduler env in Coolify UI / env group so Git auto-deploy cannot overwrite presync settings.

---

## Health probe — `GET /api/healthz/env`

Probed with `x-health-secret` (internal, not logged).

### Render (`https://amynest-backend-dykj.onrender.com`)

| Field | Expected | Actual |
|-------|----------|--------|
| `schedulerOwner` | `true` | ✅ `true` |
| `BACKGROUND_TASKS_ENABLED` | `true` | ✅ `true` |
| `NOTIFICATIONS_ENABLED` | `true` | ✅ `true` |
| `scheduler.mode` | `single_active` | ✅ `single_active` |
| `scheduler.active_plane` | `render` | ✅ `render` |
| `scheduler.local_plane` | `render` | ✅ `render` |
| `scheduler.job_catalog_count` | 23 | ✅ 23 |

### Coolify (internal `127.0.0.1:5000` via `docker exec`)

Public sslip.io URL returns fetch errors; internal probe used for authoritative standby check.

| Field | Expected | Actual |
|-------|----------|--------|
| `schedulerOwner` | `false` | ✅ `false` |
| `BACKGROUND_TASKS_ENABLED` | `false` | ✅ `false` |
| `NOTIFICATIONS_ENABLED` | `false` | ✅ `false` |
| `scheduler.mode` | `single_active` | ✅ `single_active` |
| `scheduler.active_plane` | `render` | ✅ `render` |
| `scheduler.local_plane` | `coolify` | ✅ `coolify` |

### Singleton

| Check | Result |
|-------|--------|
| Owner count | **1** (Render only) |
| `pnpm run migrate:render-to-coolify:verify-scheduler` | **PASS** |

---

## Cron startup log audit

### Render — live instance `srv-d85k8jbtqb8s7382mjng-9srzl` (deploy `dep-d998mu2s87ks739g35f0`)

Boot `[bg:start]` lines present (scheduler owner):

| Category | Log evidence |
|----------|--------------|
| **Notifications** | `[bg:start] notification_cron` @ 2026-07-11T18:36:43Z |
| **Cleanup** | `[bg:start] tts_orphan_cleanup_cron` @ 2026-07-11T18:36:43Z |
| **Billing + recap + cleanup block** | `[bg:start] crons` → `[bg:ok] crons` @ 2026-07-11T18:36:43Z (includes `startBillingReconciliationCron`, `startWeeklyRecapCron`, `startRetentionWeeklySummaryCron`, `startRazorpayWebhookCleanup`, `startTrialExpiryCron`) |

### Coolify — container `ik6ml2uhw6op765lo14wn5m3-182803785366` (post presync re-apply)

| Category | Log lines |
|----------|-----------|
| Notifications | **0** (`notification_cron` / notification cron) |
| Billing | **0** |
| Recap | **0** (`weekly_recap` / `retention_weekly`) |
| Cleanup | **0** (`orphan_cron` / `razorpay_webhook_cleanup` / `tts.orphan`) |
| Boot signal | `BACKGROUND_TASKS: disabled` |
| Non-scheduler boot | `[bg:start] speech_coach_v2_realtime_model` only (not in scheduler catalog) |

### Duplicate cron startup across planes

| Check | Result |
|-------|--------|
| Notification/billing/recap/cleanup crons on Coolify | ✅ **None** |
| Same categories on Render only | ✅ **Confirmed** |
| Cross-plane duplicate owners at verification time | ✅ **None** |

**Note:** During Render rolling deploy, two Render instances briefly emitted boot `[bg:start]` lines (`nz8xl` → `9srzl`). This is a single-plane deploy transition, not a Render+Coolify duplicate.

---

## Environment configuration (final)

### Render (`srv-d85k8jbtqb8s7382mjng`)

```
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=true
NOTIFICATIONS_ENABLED=true
```

Image: commit `17715117a` (live deploy `dep-d998mu2s87ks739g35f0`).

### Coolify (`ik6ml2uhw6op765lo14wn5m3`)

```
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=false
NOTIFICATIONS_ENABLED=false
```

Image: commit `17715117a` (auto-deploy from GitHub; presync env re-applied via SSH).

---

## Scheduler job catalog (23 jobs)

Categories: `notifications`, `billing`, `recap`, `cleanup`, `content`, `infra`  
Triggers: `node-cron`, `http-cron`, `bullmq`

Standby Coolify rejects HTTP cron pings with `503 scheduler_standby` when `SCHEDULER_ACTIVE_PLANE` points to the other plane.

---

## Sign-off

| Role | Result |
|------|--------|
| Release Engineer | Scheduler Phase **PASS** |
| DB migration gate | **OPEN** — safe to proceed to `01-initial-copy.sh` data plane work |

**Artifacts:**

- `scripts/audit/render-to-coolify/scheduler-singleton-latest.json`
- `audit/render-to-coolify/scheduler-presync-verification.json` (pre-push Coolify baseline)
