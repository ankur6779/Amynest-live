# Single Active Scheduler — Pre-cutover (Render active)

**Generated:** 2026-07-11T18:09:58Z

Only **Render** runs in-process crons until final cutover.

## Render (Amynest-backend-dykj)

```env
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=true
NOTIFICATIONS_ENABLED=true
```

Redeploy backend after saving env vars.

## Coolify (backend application)

```env
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=false
NOTIFICATIONS_ENABLED=false
```

Redeploy Coolify backend after saving env vars.

## Verify

```bash
bash scripts/render-to-coolify/09-data-plane-audit.sh
pnpm run migrate:render-to-coolify:verify-scheduler
```

Expected: exactly **one** scheduler owner (Render API).
