#!/bin/sh
# Certification guard — run when frozen routine-engine files change.
set -e

cd "$(dirname "$0")/../artifacts/api-server"

export DATABASE_URL="${DATABASE_URL:-postgresql://test:test@127.0.0.1:5432/test?connect_timeout=1}"

echo "Routine Engine v1.0 certification suite..."

node --import tsx/esm --test \
  src/lib/routine-meal-dinner-integrity.test.ts \
  src/lib/routine-country-profile.test.ts \
  src/lib/routine-intelligence-pipeline.test.ts \
  src/lib/routine-scheduler.test.ts

echo "Running dinner-gap integration tests..."
node --import tsx/esm --test \
  src/lib/routine-meal-integration.test.ts \
  src/lib/routine-trust-validators.test.ts

echo "Running rule-based template certification..."
node --import tsx/esm --test \
  src/lib/routine-templates.test.ts

echo "Routine Engine certification: PASS"
