# Dependency Map — AmyNest AI Monorepo

## Workspace root

- **Package manager:** pnpm 9.15.0
- **Node:** >=20 <23
- **Workspaces:** `artifacts/*`, `lib/*`, `scripts`, `backend`

## Tier 0 — Deployable applications

| Package | Name | Depends on |
|---------|------|------------|
| `artifacts/kidschedule` | `@workspace/kidschedule` | api-client-react, analytics-taxonomy, 40+ lib/* |
| `artifacts/api-server` | `@workspace/api-server` | db, analytics-taxonomy, 50+ lib/* |
| `artifacts/amynest-capacitor` | (Capacitor) | kidschedule build output → `www/` |
| `android/` | (Gradle WebView) | Production URL `https://www.amynest.in` |
| `scripts` | `@workspace/scripts` | db, various lib/* for codegen/migrate |

## Tier 1 — Core infrastructure libs

| Package | Path | Consumers |
|---------|------|-----------|
| `@workspace/db` | `lib/db` | api-server, scripts |
| `@workspace/analytics-taxonomy` | `lib/analytics-taxonomy` | kidschedule, api-server |
| `@workspace/api-spec` | `lib/api-spec` | codegen → api-client-react, api-zod |
| `@workspace/api-client-react` | `lib/api-client-react` | kidschedule |
| `@workspace/api-zod` | `lib/api-zod` | api-server validation |
| `@workspace/environment` | `lib/environment` | kidschedule, api-server |

## Tier 2 — Product domain libs (selected)

### Parenting & routines
- `lib/routine-intelligence` — routine generation engine
- `lib/routine-journey` — routine onboarding journey
- `lib/family-routine` — household scheduling
- `lib/morning-flow` — school morning flow
- `lib/behavior-tracker` — behavior logging

### Learning zone
- `lib/phonics-curriculum`, `lib/phonics-v3-progress`, `lib/phonics-sounds`
- `lib/learning-progress-engine` — cross-module progress
- `lib/study-zone` — smart study daily plans
- `lib/abacus`, `lib/olympiad`, `lib/life-skills`
- `lib/math-tricks`, `lib/math-playground` (+ worksheets, assessment, voice, reporting, engagement)
- `lib/spelling-catalog`, `lib/spelling-audio`
- `lib/content-bank`, `lib/content-orchestration`
- `lib/gaming-rewards`

### Infant & nutrition
- `lib/infant-hub`, `lib/infant-problems`
- `lib/nutrition-localization`, `lib/tiffin-feedback`

### Speech & audio
- `lib/speech-coach`, `lib/speech-coach-v2`
- `lib/static-audio`, `lib/audio-lessons`
- `lib/rhymes-audio`, `lib/parent-hub-speak`

### Discovery & media
- `lib/animal-world`, `lib/world-engine`
- `lib/vehicle-world`, `lib/nature-sounds-world`, `lib/home-sounds-world`, `lib/instrument-world`, `lib/discovery-worlds`
- `artifacts/reels` — video reels catalog

### Intelligence & coaching
- `lib/amy-intelligence`, `lib/amy-operating-layer`
- `lib/coach-journey`, `lib/coach-topic-questions`
- `lib/family-intelligence`, `lib/child-intelligence` (via amy-operating)
- `lib/intent-recovery`, `lib/reality-validation`
- `lib/action-routing`

### Monetization & growth
- `lib/subscription-marketing`
- `lib/notification-engine` — push, fatigue, outcomes

### Safety & platform
- `lib/safety` — content validation
- `lib/phone-auth`
- `lib/explainability`

## Dependency flow (simplified)

```
kidschedule
  ├── api-client-react ──► api-spec (OpenAPI)
  ├── analytics-taxonomy
  └── [domain libs for client-only logic]

api-server
  ├── db ──► pg (PostgreSQL)
  ├── analytics-taxonomy
  ├── api-zod
  └── [domain libs for server business logic]

api-server ──► Redis (BullMQ) ──► worker (docker/worker)
api-server ──► OpenAI, ElevenLabs, GCS, Firebase Admin
```

## External service dependencies

| Service | Env vars | Used by |
|---------|----------|---------|
| PostgreSQL | `DATABASE_URL` | api-server, worker |
| Redis | `REDIS_URL` | api-server, worker (BullMQ) |
| Firebase | `VITE_FIREBASE_*`, Admin SDK | Auth, push |
| OpenAI | `OPENAI_API_KEY` | Routines, TTS, speech coach, AI tutor |
| ElevenLabs | (fallback TTS) | `elevenLabsFallbackService` |
| Google Cloud Storage | TTS/audio assets | static audio, phonics, stories |
| RevenueCat | Webhooks + SDK | Subscriptions |
| Razorpay | Webhooks | India billing |
| Sentry | `SENTRY_DSN`, `VITE_SENTRY_DSN` | Error monitoring |
| GA4 | `VITE_GA4_MEASUREMENT_ID` | Marketing pages only |

## Cross-cutting concerns map

| Concern | Primary location | Also in |
|---------|------------------|---------|
| Analytics ingest | `api-server/services/analyticsIngestService.ts` | `routes/analytics.ts` |
| Client logs | `api-server/routes/client-logs.ts` | 20+ kidschedule *-analytics.ts |
| Entitlements | `api-server/services/subscriptionService.ts` | `subscription-premium-gate.ts` |
| Feature usage | `api-server/services/featureUsageService.ts` | `routes/feature-usage.ts` |
| Crash intelligence | `api-server/services/crash-intelligence/` | `routes/crash-intelligence.ts` |
| Device limits | `api-server/services/deviceLimitService.ts` | `routes/devices.ts` |
| Notifications | `lib/notification-engine` | `routes/notification-prefs.ts` |

## Archived / do not extend for production

| Path | Status |
|------|--------|
| `archive/amynest-mobile-expo/` | Legacy Expo RN — read-only |
| `artifacts/amynest-capacitor/android/` | Not shipped Play Store app |
| `artifacts/mockup-sandbox/` | Design sandbox |

## Phase 1 dependency impact

Analytics foundation changes will touch:

1. `lib/analytics-taxonomy` — new event types
2. `artifacts/kidschedule/src/lib/analytics.ts` — centralized service extension
3. `artifacts/api-server/src/services/analyticsIngestService.ts` — ingest validation
4. `artifacts/api-server/src/routes/client-logs.ts` — fix `growth_analytics` type rejection
5. `artifacts/kidschedule/src/AppCore.tsx` — screen_view router hook
6. **No new packages** — extend existing spine only
