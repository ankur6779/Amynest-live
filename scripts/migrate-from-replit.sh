#!/usr/bin/env bash
# Run this in Replit Shell (not on your Mac).
# helium hostname only works inside Replit.
#
# 1. Replit → Secrets: add RENDER_DATABASE_URL = Render amynest-db External URL
# 2. In Shell:
#      export SOURCE_DATABASE_URL="postgresql://postgres:PASSWORD@helium/heliumdb?sslmode=disable"
#      export DATABASE_URL="$RENDER_DATABASE_URL"
#      bash scripts/migrate-from-replit.sh --replace
#
set -euo pipefail
cd "$(dirname "$0")/.."

SOURCE="${SOURCE_DATABASE_URL:-${DATABASE_URL:-}}"
if [[ -z "$SOURCE" ]]; then
  echo "Set SOURCE_DATABASE_URL (Replit internal postgres URL)."
  exit 1
fi

if [[ -z "${RENDER_DATABASE_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "Set RENDER_DATABASE_URL (Render External Database URL) in Secrets, then:"
  echo '  export DATABASE_URL="$RENDER_DATABASE_URL"'
  exit 1
fi

export DATABASE_URL="${DATABASE_URL:-$RENDER_DATABASE_URL}"
export SOURCE_DATABASE_URL="$SOURCE"

pnpm install
pnpm run db:migrate -- "$@"
