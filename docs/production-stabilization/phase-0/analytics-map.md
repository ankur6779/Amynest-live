# Analytics Map — AmyNest AI

**SSOT for taxonomy:** `lib/analytics-taxonomy/src/index.ts`  
**Client spine:** `artifacts/kidschedule/src/lib/analytics.ts`  
**Server ingest:** `POST /api/analytics/events` → `analyticsIngestService.ts` → `analytics_events`

## Pipeline diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (kidschedule)                                             │
├─────────────────────────────────────────────────────────────────┤
│ track() ──────────────────────► POST /api/analytics/events     │
│ queueClientLog() ─────────────► POST /api/logs                   │
│ trackMarketingEvent() ────────► GA4 (gtag)                       │
│ version-analytics ────────────► POST /api/app-version-analytics  │
│ startup beacon ───────────────► POST /api/startup-events         │
│ learning-progress ──────────► POST /api/learning-progress/     │
│                               analytics                          │
│ crash / Sentry ─────────────► Sentry + POST /api/logs|crash    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│ SERVER PERSISTENCE                                               │
├─────────────────────────────────────────────────────────────────┤
│ analytics_events        ← taxonomy + learning-progress (bypass) │
│ infant_product_analytics_events ← infant_parenting logs         │
│ crash_events            ← crash logs + /api/crash-events        │
│ structured logs         ← everything else (ephemeral)           │
│ in-memory buffers       ← startup, audio-health, health-lab     │
│ GA4                     ← marketing only (external)             │
└─────────────────────────────────────────────────────────────────┘
```

## Taxonomy categories & event count

| Category | Events | Examples |
|----------|-------:|----------|
| session | 18 | `app_open`, `session_start`, speech_coach_v2_*, version_* |
| routine | 4 | `routine_generated`, `routine_viewed`, `routine_item_*` |
| feedback | 1 | `routine_feedback_submitted` |
| premium | 14 | `premium_paywall_viewed`, `device_*`, `upgrade_*` |
| growth | 24 | `install_source`, `streak_updated`, `onboarding_milestone`, pre_signup_* |
| learning | 2 | `origami_model_completed`, `origami_certificate_downloaded` |
| **Total** | **~63** | |

## Client analytics modules

### Unified spine (`track()`)

| File | Events sent via taxonomy |
|------|--------------------------|
| `lib/analytics.ts` | `app_open`, flush batching |
| `lib/growth-analytics.ts` | Subset via `GROWTH_TO_TAXONOMY` map |
| `lib/device-registration.ts` | `device_registered`, `device_*` |
| `contexts/paywall-context.tsx` | `premium_paywall_viewed` |
| `components/paywall-modal*.tsx` | `premium_cta_clicked`, gates |
| `pages/routines/generate.tsx` | `routine_generated` |
| `pages/routines/detail.tsx` | `routine_viewed`, item events |
| `features/speech-coach-v2/lib/analytics.ts` | All `speech_coach_v2_*` |

### Log-only pipelines (`queueClientLog` → `/api/logs`)

| File | Log type | DB persist? |
|------|----------|-------------|
| `subscription-analytics.ts` | `subscription_funnel` | **No** |
| `onboarding-analytics.ts` | `onboarding_funnel` | **No** |
| `infant-hub-analytics.ts` | `infant_parenting` | **Yes** → `infant_product_analytics_events` |
| `growth-analytics.ts` | `growth_analytics` | **No** (⚠️ **server rejects type — HTTP 400**) |
| `learning-progress-analytics.ts` | `info` (message prefix) | **No** (server path separate) |
| `health-lab-analytics.ts` | `info` + meta | In-memory metrics only |
| `nutrition-hub-analytics.ts` | `info` | No |
| `study-zone-analytics.ts` | `info` | No |
| `playground-analytics.ts` | `info` | No |
| `hub-executive-analytics.ts` | `info` | No |
| `discovery-worlds-telemetry.ts` | `info` | No |
| `animal-world-telemetry.ts` | `info` | No |
| `deep-link-analytics.ts` | `info` + dedicated endpoint | Logs only |

### GA4 (marketing only)

| File | Scope |
|------|-------|
| `marketing/ga4-analytics.ts` | Public pages: get-app, features, guides |
| `marketing/ga4-bootstrap.tsx` | gtag loader (`send_page_view: false`) |
| `growth-analytics.ts` | Mirrors subset to GA4 |
| `infant-marketing-analytics.ts` | Direct gtag calls |

### Local-only (no server)

| File | Storage |
|------|---------|
| `game-maze-analytics.ts` | localStorage |
| `amy-voice-analytics.ts` | In-memory |
| `audio-reliability-telemetry.ts` | In-memory ring buffer |
| `phonics-telemetry.ts` | `logAmyVoiceDiag` (dev console) |

## Server ingest routes

| Endpoint | Auth | Persistence |
|----------|------|-------------|
| `POST /api/analytics/events` | Yes | `analytics_events` (validated) |
| `POST /api/logs` | Yes | Logs + conditional DB |
| `POST /api/app-version-analytics/events` | No | Logs only |
| `POST /api/startup-events` | No | In-memory (2000 cap) |
| `POST /api/learning-progress/analytics` | Yes | `analytics_events` (**unvalidated**) |
| `POST /api/notifications/deep-link-event` | Yes | Logs only |
| `POST /api/crash-events` | Yes | `crash_events` |
| `POST /api/audio-health` | Yes | In-memory |
| `GET /api/admin/analytics/retention` | Admin | Read `analytics_events` |

## Production event volume (2026-07-03 audit)

| Event | Count | Users |
|-------|------:|------:|
| `device_header_missing` ⚠️ | 4,125 | 141 |
| `session_start` | 476 | 140 |
| `app_open` | 476 | 140 |
| `device_registered` | 269 | 131 |
| `streak_updated` | 162 | 111 |
| `install_source` | 105 | 99 |
| `routine_generated` | 23 | 13 |
| `premium_paywall_viewed` | 30 | 13 |
| `onboarding_milestone` | 26 | 26 |

## Critical gaps (Phase 1 targets)

| Gap | Impact | Fix approach |
|-----|--------|--------------|
| **No `screen_view`** | Cannot answer Sections 7–8 of audit | Router hook in AppCore |
| **No `button_click`** | No heatmaps | Extend taxonomy + UI primitives |
| **No `navigation`** | No user flows | `use-action-navigation.ts` extension |
| **`growth_analytics` rejected by server** | Growth events lost on flush | Add to `client-logs.ts` Zod union |
| **Subscription/onboarding funnels log-only** | Funnel analysis impossible | Persist to `analytics_events` or dedicated table |
| **`device_header_missing` storm** | 70% of events are noise | Fix device header injection |
| **No `app_version` in events** | Device analytics blind | Populate on every `track()` |
| **Learning-progress bypasses taxonomy** | Inconsistent event shapes | Route through taxonomy validator |
| **Version events orphaned** | 13 taxonomy events unused | Wire `version-analytics.ts` to `track()` |
| **Feature analytics siloed** | 8 users in `feature_usage` | Expand `feature_open` to all hub cards |

## Duplicate tracking paths

| User action | Paths | Recommendation |
|-------------|-------|----------------|
| Growth events | logs + track() + GA4 | Single spine + optional GA4 mirror |
| Paywall view | `premium_paywall_viewed` + `paywall_opened` (logs) | Unify naming |
| Purchase | subscription logs → `premium_conversion` → GA4 | Persist funnel to DB |
| Origami complete | learning-progress API + taxonomy | Single validated path |
| Deep link | client log + notification endpoint | Keep both; add DB |
| Crashes | Sentry + client-logs + crash-events | Keep; ensure dedup |

## Events required by stabilization program (not yet in taxonomy)

```
screen_view, page_view, button_click, navigation,
feature_open, feature_complete, session_end, first_open,
search, download, error, performance,
onboarding_step, paywall_step, purchase_step
```

**Phase 1 action:** Extend `lib/analytics-taxonomy` with these categories without breaking existing event names.

## Retention query dependency

`retentionService.ts` reads **only** `analytics_events`. Any event not in that table is invisible to DAU/WAU/MAU and cohort retention — including all log-only funnels.
