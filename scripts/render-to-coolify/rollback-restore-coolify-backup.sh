#!/usr/bin/env bash
# Rollback B — Restore Coolify from a local pg_dump backup (full or data-only).
#
#   export COOLIFY_DATABASE_URL='postgresql://postgres:PASS@tcl9udyxcuq2zu598ebj0pfu:5432/postgres'
#   bash scripts/render-to-coolify/rollback-restore-coolify-backup.sh audit/render-to-coolify/dumps/render-prod-XXXX.dump
#
# Does NOT affect Render production.
set -euo pipefail

DUMP_FILE="${1:-}"
if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
  echo "Usage: $0 <path-to-.dump>"
  exit 1
fi
if [[ -z "${COOLIFY_DATABASE_URL:-}" ]]; then
  echo "Set COOLIFY_DATABASE_URL."
  exit 1
fi

read -r -p "Restore Coolify from $DUMP_FILE? This truncates data first. [y/N] " confirm
if [[ "${MIGRATION_CONFIRM:-}" == "yes" ]]; then confirm="y"; fi
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

MIGRATION_CONFIRM=yes bash "$(dirname "$0")/rollback-truncate-coolify.sh"

pg_restore \
  -d "$COOLIFY_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --data-only \
  --disable-triggers \
  --verbose \
  "$DUMP_FILE" 2>&1 | tail -30 || true

bash "$(dirname "$0")/05-fix-sequences.sh"
echo "Coolify restored from backup."
