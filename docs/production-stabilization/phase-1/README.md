# Phase 1 — Analytics Foundation (Complete)

**Status:** Implemented  
**Date:** 2026-07-03

## Architecture

Single analytics spine — no duplicate emitters for product funnels.

```
UI / hooks / legacy track()
        ↓
AnalyticsService (singleton)
        ↓
EventQueue (memory + localStorage offline)
        ↓
POST /api/analytics/events
        ↓
analytics_events (Postgres)
```

### Components

| Module | Path |
|--------|------|
| AnalyticsService | `artifacts/kidschedule/src/lib/analytics/analytics-service.ts` |
| AnalyticsProvider | `artifacts/kidschedule/src/lib/analytics/analytics-provider.tsx` |
| EventQueue | `artifacts/kidschedule/src/lib/analytics/event-queue.ts` |
| SessionManager | `artifacts/kidschedule/src/lib/analytics/session-manager.ts` |
| Screen tracker | `artifacts/kidschedule/src/lib/analytics/screen-tracker.tsx` |
| Privacy scrubber | `artifacts/kidschedule/src/lib/analytics/privacy.ts` |
| Taxonomy SSOT | `lib/analytics-taxonomy/` |

## Requirements checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Single AnalyticsService | ✅ |
| 2 | Event versioning (event_version, schema_version, app_version, build_number, environment) | ✅ On every event props |
| 3 | Session timeout (30m), foreground/background, session_end | ✅ |
| 4 | Offline queue + retry + backoff | ✅ localStorage `amynest_analytics_persistent_queue` |
| 5 | Batching (50), debounce 2s, retry backoff | ✅ |
| 6 | screen_view / screen_leave / navigation | ✅ AnalyticsScreenTracker |
| 7 | button_click via Button `analyticsId` | ✅ paywall + Button pattern |
| 8 | performance_metric (API, startup) | ✅ fetch bridge |
| 9 | error_captured (react, unhandled, network) | ✅ bridges |
| 10 | Privacy scrub (no email/phone/tokens) | ✅ |
| 11 | Admin-ready props in JSONB | ✅ |
| 12 | Backward compatible track() facade | ✅ `@/lib/analytics` |
| 13 | Validation reports | ✅ `docs/production-stabilization/phase-1/reports/` |

## Funnel migration

| Pipeline | Before | After |
|----------|--------|-------|
| Subscription funnel | `/api/logs` only | `subscription_funnel_event` → DB |
| Onboarding funnel | `/api/logs` only | `onboarding_funnel_event` → DB |
| Growth (non-taxonomy) | broken `growth_analytics` logs | `growth_funnel_event` → DB |
| Growth (taxonomy) | triple emit | `track()` only + optional GA4 |

## New taxonomy events (16)

`screen_view`, `screen_leave`, `navigation`, `button_click`, `feature_open`, `feature_complete`, `session_end`, `first_open`, `search_query`, `search_no_results`, `asset_download`, `subscription_funnel_event`, `onboarding_funnel_event`, `growth_funnel_event`, `performance_metric`, `error_captured`

## Tests

```bash
pnpm --filter @workspace/kidschedule exec vitest run src/lib/analytics.test.ts src/lib/analytics-service.test.ts src/lib/analytics-validation-report.test.ts
pnpm --filter @workspace/kidschedule exec tsx scripts/generate-analytics-validation-reports.mjs
pnpm --filter @workspace/api-server test -- src/routes/analytics.test.ts
```

Reports are written to `docs/production-stabilization/phase-1/reports/`.

## Remaining instrumentation (incremental)

- Add `analyticsId` to more hub cards and secondary CTAs — pattern on `Button` + paywall primary CTAs done
- Infant hub: still uses `infant_product_analytics_events` (separate product surface — not duplicate funnel emitter)

## Success criteria

| Criterion | Code / CI | Production |
|-----------|-----------|------------|
| Duplicate events = 0 | ✅ validation test | Verify after deploy |
| Lost events = 0 | ✅ offline queue tests | Monitor queue flush |
| Broken routes = 0 | ✅ screen tracker on AppCore | Smoke test |
| Backward compatibility | ✅ `track()` facade | Legacy events in taxonomy |
| Analytics coverage >95% | Instrumentation ready | **48h post-deploy** |
| No perf regression | Batched + debounced | Profile after deploy |

**Do not proceed to Phase 2** until validation tests pass in CI and production confirms events in `analytics_events`.
