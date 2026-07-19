# Coolify backend smoke test

Generated: 2026-07-13T02:04:41.704Z
API: https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io

## Result: PASS ✓

| Pass | Fail | Skip | Warn |
|-----:|-----:|-----:|-----:|
| 3 | 0 | 9 | 1 |

| Check | Status | Message |
|-------|--------|---------|
| health | pass | GET /health → 200 |
| ready | pass | GET /ready N/A — /api/healthz + /api/healthz/env readiness OK |
| firebase_login | skip | Set SMOKE_FIREBASE_ID_TOKEN or SMOKE_FIREBASE_UID + FIREBASE_SERVICE_ACCOUNT_JSON + FIREBASE_WEB_API_KEY |
| parent_profile | skip | Requires auth token |
| child_profile | skip | Requires auth token |
| subscription_lookup | skip | Requires auth token |
| revenuecat_webhook_validation | warn | REVENUECAT_WEBHOOK_SECRET unset — auth rejection only |
| gcs_access | pass | GCS configured and probe OK |
| push_registration | skip | Requires auth token |
| routine_generation | skip | Requires auth token and childId |
| bullmq_enqueue | skip | Requires auth token |
| bullmq_processing | skip | Requires enqueue |
| ai_request | skip | Requires auth token |
