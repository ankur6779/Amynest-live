#!/bin/sh
# Pre-commit hook: verify codegen output is up to date with the OpenAPI spec.
# Runs codegen and fails if any generated files were modified or newly created,
# reminding the developer to stage the freshly generated files before committing.

set -e

GENERATED_DIRS="lib/api-client-react/src/generated lib/api-zod/src/generated"

echo "Checking codegen output is up to date..."

# Clear incremental tsc build cache so the commit-time typecheck matches CI's
# clean build. Incremental `tsc --build` can FALSE-PASS on a stale .tsbuildinfo,
# letting type errors slip into a push where CI then blocks the deploy.
find lib -name "*.tsbuildinfo" -delete 2>/dev/null || true

pnpm run codegen

# Check for modified tracked files
TRACKED_CHANGES=$(git diff --name-only -- $GENERATED_DIRS)

# Check for new untracked files (codegen may add brand-new files)
UNTRACKED_FILES=$(git ls-files --others --exclude-standard -- $GENERATED_DIRS)

if [ -n "$TRACKED_CHANGES" ] || [ -n "$UNTRACKED_FILES" ]; then
  echo ""
  echo "ERROR: Codegen output is out of date."
  echo ""
  if [ -n "$TRACKED_CHANGES" ]; then
    echo "Modified files:"
    echo "$TRACKED_CHANGES" | sed 's/^/  /'
  fi
  if [ -n "$UNTRACKED_FILES" ]; then
    echo "New untracked files:"
    echo "$UNTRACKED_FILES" | sed 's/^/  /'
  fi
  echo ""
  echo "These files changed after running 'pnpm run codegen'."
  echo "Please stage the updated generated files and commit again:"
  echo ""
  echo "  git add lib/api-client-react/src/generated/ lib/api-zod/src/generated/"
  echo "  git commit"
  echo ""
  echo "If you intentionally changed the OpenAPI spec, this is expected — just"
  echo "stage the regenerated files alongside your spec changes."
  exit 1
fi

echo "Codegen output is up to date. Proceeding with commit."
