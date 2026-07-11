#!/usr/bin/env bash
# Single Active Scheduler — pre-cutover (Render owns all crons).
#
#   bash scripts/render-to-coolify/10-scheduler-presync-render.sh
#   bash scripts/render-to-coolify/10-scheduler-presync-render.sh --apply-render
#
# Render:
#   SCHEDULER_ACTIVE_PLANE=render
#   BACKGROUND_TASKS_ENABLED=true
#   NOTIFICATIONS_ENABLED=true
#
# Coolify (set in Coolify dashboard → backend → Environment):
#   SCHEDULER_ACTIVE_PLANE=render
#   BACKGROUND_TASKS_ENABLED=false
#   NOTIFICATIONS_ENABLED=false
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUDIT_DIR="$ROOT/audit/render-to-coolify"
STATE_FILE="$AUDIT_DIR/scheduler-state.json"
APPLY_RENDER=false
[[ "${1:-}" == "--apply-render" ]] && APPLY_RENDER=true

mkdir -p "$AUDIT_DIR"

RENDER_ENV=$(cat <<'EOF'
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=true
NOTIFICATIONS_ENABLED=true
EOF
)

COOLIFY_ENV=$(cat <<'EOF'
SCHEDULER_ACTIVE_PLANE=render
BACKGROUND_TASKS_ENABLED=false
NOTIFICATIONS_ENABLED=false
EOF
)

python3 <<PY
import json, datetime
state = {
  "mode": "presync",
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

cat > "$AUDIT_DIR/scheduler-presync-instructions.md" <<MD
# Single Active Scheduler — Pre-cutover (Render active)

**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)

Only **Render** runs in-process crons until final cutover.

## Render (Amynest-backend-dykj)

\`\`\`env
$RENDER_ENV
\`\`\`

Redeploy backend after saving env vars.

## Coolify (backend application)

\`\`\`env
$COOLIFY_ENV
\`\`\`

Redeploy Coolify backend after saving env vars.

## Verify

\`\`\`bash
bash scripts/render-to-coolify/09-data-plane-audit.sh
pnpm run migrate:render-to-coolify:verify-scheduler
\`\`\`

Expected: exactly **one** scheduler owner (Render API).
MD

echo "Wrote $STATE_FILE"
echo "Wrote $AUDIT_DIR/scheduler-presync-instructions.md"

if $APPLY_RENDER; then
  echo "==> Applying Render env (Amynest-backend-dykj) via Render API..."
  echo "Set in Render Dashboard → Amynest-backend-dykj → Environment:"
  echo "$RENDER_ENV"
  echo "(Automated Render MCP apply requires operator confirmation in CI)"
fi

echo ""
echo "==> Verifying Coolify env via SSH (read-only)"
SSH_KEY="${HETZNER_SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
COOLIFY_HOST="${COOLIFY_SSH_HOST:-188.245.208.126}"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "root@$COOLIFY_HOST" \
  'CID=$(docker ps --format "{{.Names}}" | grep -m1 ik6ml2uh || true); if [ -n "$CID" ]; then docker exec "$CID" printenv SCHEDULER_ACTIVE_PLANE BACKGROUND_TASKS_ENABLED NOTIFICATIONS_ENABLED 2>/dev/null | sort; fi' \
  || echo "(Coolify SSH probe skipped)"

echo ""
echo "Next: set Coolify env in dashboard, redeploy both backends, then:"
echo "  pnpm run migrate:render-to-coolify:verify-scheduler"
