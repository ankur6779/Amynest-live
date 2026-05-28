#!/usr/bin/env bash
# Sync local main to origin/main (fixes diverged branches after cloud agent merges).
# Creates a dated backup branch before resetting.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: Not inside a git repository."
  exit 1
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "main" ]]; then
  echo "Checking out main (was on ${current_branch})…"
  git checkout main
fi

echo "Fetching origin/main…"
git fetch origin main

backup="backup/local-main-$(date +%Y%m%d-%H%M%S)"
echo "Saving current main tip to ${backup}…"
git branch "$backup" main

echo "Resetting main to origin/main…"
git reset --hard origin/main

echo
echo "Done. Local main now matches GitHub."
git log -1 --oneline

if command -v pnpm >/dev/null 2>&1; then
  echo
  echo "Running pnpm install…"
  pnpm install
  echo "Run: pnpm run dev:api  and  pnpm run dev:web"
else
  echo "pnpm not found — run 'pnpm install' after installing Node/pnpm."
fi
