# Coolify backend smoke test

Generated: 2026-07-12T08:03:19.800Z
API: http://127.0.0.1:15000

## Result: PASS ✓

| Pass | Fail | Skip | Warn |
|-----:|-----:|-----:|-----:|
| 4 | 0 | 9 | 0 |

| Check | Status | Message |
|-------|--------|---------|
| health | pass | GET /health → 200 |
| ready | pass | GET /ready N/A — /api/healthz + /api/healthz/env readiness OK |
| firebase_login | skip | Set SMOKE_FIREBASE_ID_TOKEN or SMOKE_FIREBASE_UID + FIREBASE_SERVICE_ACCOUNT_JSON + FIREBASE_WEB_API_KEY |
| parent_profile | skip | Requires auth token |
| child_profile | skip | Requires auth token |
| subscription_lookup | skip | Requires auth token |
| revenuecat_webhook_validation | pass | Webhook auth + payload validation OK (401/400 paths verified) |
| gcs_access | pass | GCS configured and probe OK |
| push_registration | skip | Requires auth token |
| routine_generation | skip | Requires auth token and childId |
| bullmq_enqueue | skip | SMOKE_SKIP_AI=1 |
| bullmq_processing | skip | SMOKE_SKIP_AI=1 |
| ai_request | skip | SMOKE_SKIP_AI=1 |
