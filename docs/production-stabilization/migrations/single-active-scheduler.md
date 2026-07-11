# Single Active Scheduler

During Render → Coolify migration, **only one API environment** may run in-process cron jobs. This prevents duplicate notifications, billing reconciliation, recap pushes, cleanup sweeps, and HTTP cron triggers.

## Pre-cutover (default)

| Environment | Env vars |
|-------------|----------|
| **Render** | `SCHEDULER_ACTIVE_PLANE=render`, `BACKGROUND_TASKS_ENABLED=true`, `NOTIFICATIONS_ENABLED=true` |
| **Coolify** | `SCHEDULER_ACTIVE_PLANE=render`, `BACKGROUND_TASKS_ENABLED=false`, `NOTIFICATIONS_ENABLED=false` |

Apply:

```bash
bash scripts/render-to-coolify/10-scheduler-presync-render.sh
```

## Post-cutover (Coolify active)

After traffic is on Coolify and stable:

```bash
bash scripts/render-to-coolify/11-scheduler-cutover-coolify.sh
```

| Environment | Env vars |
|-------------|----------|
| **Coolify** | `SCHEDULER_ACTIVE_PLANE=coolify`, `BACKGROUND_TASKS_ENABLED=true`, `NOTIFICATIONS_ENABLED=true` |
| **Render** (standby) | `SCHEDULER_ACTIVE_PLANE=coolify`, `BACKGROUND_TASKS_ENABLED=false`, `NOTIFICATIONS_ENABLED=false` |

## Rollback

```bash
bash scripts/render-to-coolify/12-scheduler-rollback-render.sh
```

Restores Render as the sole scheduler owner. See `audit/render-to-coolify/scheduler-rollback-applied.md`.

## Verify singleton

```bash
pnpm run migrate:render-to-coolify:verify-scheduler
```

Requires `INTERNAL_HEALTH_SECRET` for `/api/healthz/env` on both APIs.

Expected: **exactly one** `scheduler.owner: true`.

## How it works (code)

- `SCHEDULER_ACTIVE_PLANE` — which plane may run crons (`render` or `coolify`)
- `resolveLocalDataPlane()` — detects Render vs Coolify from `RENDER`, `COOLIFY`, or `API_PUBLIC_URL`
- `shouldRunNotificationCrons()` / `shouldRunBackgroundCrons()` — gate all `node-cron` startup in `index.ts`
- HTTP cron endpoints return `503 scheduler_standby` on non-owner instances
- `GET /api/healthz/env` exposes `scheduler` snapshot (with `x-health-secret`)

## Job catalog (23 jobs)

| Category | Examples |
|----------|----------|
| notifications | global tick, routine sweep, infant tick, cron ping |
| billing | RevenueCat reconciliation, trial expiry |
| recap | weekly recap, retention summary |
| cleanup | TTS orphan, Razorpay webhook cleanup |
| content | phonics curriculum, story GCS mirror, learning seed |
| infra | admin health digest, Render keep-warm, BullMQ enqueue |

**BullMQ** has no repeat/cron schedulers — only `ai-jobs` queue consumed by the worker.

**Advisory locks** (`pg_try_advisory_lock`) prevent overlap on the **same** database only; they do not protect across Render + Coolify Postgres during migration. Single Active Scheduler is required until both APIs share one database.
