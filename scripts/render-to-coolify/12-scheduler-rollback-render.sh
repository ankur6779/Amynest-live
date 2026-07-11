#!/usr/bin/env bash
# Single Active Scheduler — rollback to Render owning crons.
#
#   bash scripts/render-to-coolify/12-scheduler-rollback-render.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUDIT_DIR="$ROOT/audit/render-to-coolify"
STATE_FILE="$AUDIT_DIR/scheduler-state.json"

mkdir -p "$AUDIT_DIR"

python3 <<PY
import json, datetime
state = {
  "mode": "rollback_render",
  "active_plane": "render",
  "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
  "render": {
    "SCHEDULER_ACTIVE_PLANE": "render",
    "BACKGROUND_TASKS_ENABLED": "true",
    "NOTIFICATIONS_ENABLED": "true",
  },
  "coolify": {
    "SCHEDULER_ACTIVE_PLANE": "render",
    "BACKGROUND_TASKS_ENABLED": "false",
    "NOTIFICATIONS_ENABLED": "false",
  },
}
open("$STATE_FILE", "w").write(json.dumps(state, indent=2) + "\\n")
PY

cat > "$AUDIT_DIR/scheduler-rollback-applied.md" <<'MD'
# Scheduler Rollback Applied — Render Active

## Immediate actions

1. **Render backend** — set and redeploy:

```env
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=true
NOTIFICATIONS_ENABLED=true
```

2. **Coolify backend** — set and redeploy:

```env
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=false
NOTIFICATIONS_ENABLED=false
```

3. If traffic was on Coolify, revert canary:

```bash
bash scripts/render-to-coolify/set-canary-percent.sh 0
cd infra/cloudflare/amynest-api-proxy && wrangler deploy
```

4. Verify singleton:

```bash
pnpm run migrate:render-to-coolify:verify-scheduler
```

## What this restores

- Notification ticks (global, routine, infant, feature)
- Billing reconciliation + trial expiry
- Weekly recap + retention summaries
- TTS orphan cleanup, Razorpay webhook cleanup
- Phonics/story/learning content crons
- HTTP cron pings (reject on Coolify standby with 503)

Render resumes as the **sole** scheduler owner.
MD

echo "Wrote $STATE_FILE"
echo "Wrote $AUDIT_DIR/scheduler-rollback-applied.md"
echo ""
cat "$AUDIT_DIR/scheduler-rollback-applied.md"
