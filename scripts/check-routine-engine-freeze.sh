#!/bin/sh
# Blocks merges when frozen routine-engine files change without explicit approval.
#
# Approval paths (any one):
#   ROUTINE_ENGINE_CHANGE=true
#   PR label: routine-engine-change
#
# Usage:
#   ./scripts/check-routine-engine-freeze.sh [base-ref]
#   ROUTINE_ENGINE_CHANGE=true ./scripts/check-routine-engine-freeze.sh

set -e

BASE_REF="${1:-origin/main}"
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  BASE_REF="HEAD~1"
fi

FROZEN_PATHS="
artifacts/api-server/src/lib/routine-country-profile.ts
artifacts/api-server/src/lib/routine-meal-dinner-integrity.ts
artifacts/api-server/src/lib/routine-input-validation.ts
artifacts/api-server/src/lib/routine-templates.ts
artifacts/api-server/src/lib/routine-intelligence-pipeline.ts
artifacts/api-server/src/routes/routines.ts
artifacts/api-server/src/lib/routine-scheduler.ts
artifacts/api-server/src/lib/routine-trust-validators.ts
artifacts/api-server/src/lib/routine-meal-integration.ts
artifacts/api-server/src/lib/routine-meal-day-type.ts
artifacts/api-server/src/lib/routine-safety-gate.ts
artifacts/api-server/src/lib/routine-content-integrity.ts
artifacts/api-server/src/lib/routine-meal-options-safety.ts
artifacts/api-server/src/lib/routine-infant-schedule-validation.ts
artifacts/api-server/src/lib/routine-aqi.ts
artifacts/api-server/src/lib/sleepPredict.ts
"

CHANGED=""
for path in $FROZEN_PATHS; do
  if git diff --name-only "$BASE_REF"...HEAD -- "$path" 2>/dev/null | grep -q .; then
    CHANGED="$CHANGED
  - $path"
  fi
done

# Also catch unstaged/staged on local pre-commit style compare
if [ -z "$CHANGED" ]; then
  for path in $FROZEN_PATHS; do
    if git diff --name-only HEAD -- "$path" 2>/dev/null | grep -q .; then
      CHANGED="$CHANGED
  - $path (working tree)"
    fi
  done
fi

if [ -z "$CHANGED" ]; then
  echo "Routine engine freeze: no frozen files changed."
  exit 0
fi

if [ "$ROUTINE_ENGINE_CHANGE" = "true" ]; then
  echo "Routine engine freeze: frozen files changed with ROUTINE_ENGINE_CHANGE=true — allowed."
  echo "$CHANGED"
  exit 0
fi

echo ""
echo "ERROR: Routine Engine v1.0 FROZEN files were modified."
echo ""
echo "Changed files:$CHANGED"
echo ""
echo "Timing logic is production-certified. To proceed you must:"
echo "  1. Obtain architecture approval"
echo "  2. Set ROUTINE_ENGINE_CHANGE=true (CI) or add PR label routine-engine-change"
echo "  3. Run: pnpm run check:routine-engine-certification"
echo "  4. Document recertification in the PR"
echo ""
echo "Registry: docs/routine-engine/ROUTINE_ENGINE_FROZEN_FILES.md"
exit 1
