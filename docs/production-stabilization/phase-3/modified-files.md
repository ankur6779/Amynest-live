# Phase 3 — Modified Files

## Documentation

| File | Purpose |
|------|---------|
| `docs/production-stabilization/phase-3/README.md` | Phase index |
| `docs/production-stabilization/phase-3/api-stability-report.md` | Step 1 audit |
| `docs/production-stabilization/phase-3/api-audit-inventory.md` | Route inventory |
| `docs/production-stabilization/phase-3/error-reduction-baseline.md` | Error baseline |
| `docs/production-stabilization/phase-3/production-readiness-gate.md` | Gate checklist |
| `docs/production-stabilization/phase-3/production-certification.md` | **Final certification** |
| `docs/production-stabilization/phase-3/modified-files.md` | This file |

## P0 service layer

| File | Change |
|------|--------|
| `artifacts/api-server/src/services/parentHubJourneyService.ts` | Premium/progress degrade paths, metrics |
| `artifacts/api-server/src/services/learningProgressService.ts` | Hub decouple, insert race, degrade paths |
| `artifacts/api-server/src/services/subscriptionService.ts` | Subscription insert race fix |
| `artifacts/api-server/src/services/subscriptionReconciliationService.ts` | Prioritize `sync_error` rows |
| `artifacts/api-server/src/services/deviceLimitService.ts` | Device insert onConflict |
| `artifacts/api-server/src/services/analyticsIngestService.ts` | Chunked insert + per-row fallback |

## P0 routes

| File | Change |
|------|--------|
| `artifacts/api-server/src/routes/hub-journey.ts` | Structured errors + logging |
| `artifacts/api-server/src/routes/learning-progress.ts` | Structured errors + logging |
| `artifacts/api-server/src/routes/client-logs.ts` | Safe meta, try/catch |
| `artifacts/api-server/src/routes/devices.ts` | try/catch, metrics |
| `artifacts/api-server/src/routes/analytics.ts` | Structured errors, metrics |
| `artifacts/api-server/src/routes/auth.ts` | Zod + metrics |
| `artifacts/api-server/src/routes/subscription.ts` | rc-sync Zod + metrics |
| `artifacts/api-server/src/routes/health.ts` | `GET /healthz/stability-metrics` |

## Infrastructure

| File | Change |
|------|--------|
| `artifacts/api-server/src/lib/safe-api-response.ts` | `sendStructuredApiError`, `getRequestId` |
| `artifacts/api-server/src/lib/api-domain-metrics.ts` | Domain counters (new) |

## Tests

| File | Change |
|------|--------|
| `artifacts/api-server/src/lib/safe-api-response.test.ts` | Unit |
| `artifacts/api-server/src/lib/api-domain-metrics.test.ts` | Unit |
| `artifacts/api-server/src/routes/client-logs.test.ts` | P0 client logs |
| `artifacts/api-server/src/routes/p0-api-stability.integration.test.ts` | P1 integration |

## Database changes

**None** — all fixes are application-layer (onConflict, degrade paths).
