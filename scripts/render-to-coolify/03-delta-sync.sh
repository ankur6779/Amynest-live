#!/usr/bin/env bash
# Phase 3 — Incremental delta sync (rows changed on Render after initial snapshot).
#
# Safe to run repeatedly while Render stays live. Does not stop production.
#
#   bash scripts/render-to-coolify/03-delta-sync.sh
#   bash scripts/render-to-coolify/03-delta-sync.sh --dry-run
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${RENDER_DATABASE_URL:-}" || -z "${COOLIFY_DATABASE_URL:-}" ]]; then
  echo "Set RENDER_DATABASE_URL and COOLIFY_DATABASE_URL."
  exit 1
fi

if [[ ! -f "$ROOT/audit/render-to-coolify/snapshot.json" ]]; then
  echo "Missing audit/render-to-coolify/snapshot.json — run 01-initial-copy.sh first."
  exit 1
fi

pnpm run migrate:render-to-coolify:delta "$@"
