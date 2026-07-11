#!/usr/bin/env bash
# Single Active Scheduler — post-cutover (Coolify owns all crons).
#
# Run ONLY after:
#   - data-plane-audit passes
#   - canary at 100% stable
#   - production traffic on Coolify
#
#   bash scripts/render-to-coolify/11-scheduler-cutover-coolify.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUDIT_DIR="$ROOT/audit/render-to-coolify"
STATE_FILE="$AUDIT_DIR/scheduler-state.json"
ROLLBACK_FILE="$AUDIT_DIR/scheduler-rollback-to-render.md"

mkdir -p "$AUDIT_DIR"

# Save rollback snapshot before cutover
if [[ -f "$STATE_FILE" ]]; then
  cp "$STATE_FILE" "$AUDIT_DIR/scheduler-state-before-cutover.json"
fi

python3 <<PY
import json, datetime
state = {
  "mode": "cutover_coolify",
  "active_plane": "coolify",
  "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
  "render": {
    "SCHEDULER_ACTIVE_PLANE": "coolify",
    "BACKGROUND_TASKS_ENABLED": "false",
    "NOTIFICATIONS_ENABLED": "false",
  },
  "coolify": {
    "SCHEDULER_ACTIVE_PLANE": "coolify",
    "BACKGROUND_TASKS_ENABLED": "true",
    "NOTIFICATIONS_ENABLED": "true",
  },
}
open("$STATE_FILE", "w").write(json.dumps(state, indent=2) + "\\n")
PY

cat > "$AUDIT_DIR/scheduler-cutover-coolify-instructions.md" <<'MD'
# Single Active Scheduler — Cutover to Coolify

**Coolify is now the active scheduler plane.**

## Coolify backend

```env
SCHEDULER_ACTIVE_PLANE=coolify
BACKGROUND_TASKS_ENABLED=true
NOTIFICATIONS_ENABLED=true
```

## Render backend (standby — keep running)

```env
SCHEDULER_ACTIVE_PLANE=coolify
BACKGROUND_TASKS_ENABLED=false
NOTIFICATIONS_ENABLED=false
```

Redeploy **both** backends after updating env vars.

## Verify

```bash
pnpm run migrate:render-to-coolify:verify-scheduler
```

Expected: exactly **one** owner — Coolify API.

## Rollback

If cutover fails:

```bash
bash scripts/render-to-coolify/12-scheduler-rollback-render.sh
```
MD

cat > "$ROLLBACK_FILE" <<MD
# Scheduler Rollback — Restore Render (auto-generated at cutover)

If cutover fails, run:

\`\`\`bash
bash scripts/render-to-coolify/12-scheduler-rollback-render.sh
\`\`\`

Or manually restore Render:

\`\`\`env
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=true
NOTIFICATIONS_ENABLED=true
\`\`\`

And Coolify standby:

\`\`\`env
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=false
NOTIFICATIONS_ENABLED=false
\`\`\`

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
MD

echo "Wrote $STATE_FILE"
echo "Wrote $AUDIT_DIR/scheduler-cutover-coolify-instructions.md"
echo "Wrote $ROLLBACK_FILE"
echo ""
echo "Update env vars in Render + Coolify dashboards, redeploy both, then verify."
