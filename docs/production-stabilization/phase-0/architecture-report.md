# Architecture Report — AmyNest AI

## 1. System overview

AmyNest is a **pnpm monorepo** parenting/education platform with:

- **Web SPA** (primary product UI): `artifacts/kidschedule/`
- **API server** (Express 5): `artifacts/api-server/`
- **Shared libraries**: `lib/*` (60+ workspace packages)
- **iOS shell** (Capacitor): `artifacts/amynest-capacitor/`
- **Android shell** (WebView wrapper, not Capacitor): `android/`
- **Background AI worker**: Docker worker on Render (`docker/worker/`)
- **Static deploy**: Render static site + Cloudflare Worker API proxy

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client surfaces                           │
├──────────────┬──────────────┬──────────────┬─────────────────────┤
│ Web (Vite)   │ iOS Capacitor│ Android WV   │ Marketing pages     │
│ kidschedule  │ amynest-cap  │ android/     │ /get-app, /guides   │
└──────┬───────┴──────┬───────┴──────┬───────┴──────────┬──────────┘
       │              │              │                   │
       └──────────────┴──────────────┴───────────────────┘
                              │
                    HTTPS /api/* (Cloudflare proxy)
                              │
       ┌──────────────────────┴──────────────────────┐
       │     Amynest-backend-dykj (Render)         │
       │     Express 5 + Drizzle ORM               │
       │     artifacts/api-server/                 │
       └──────────────┬──────────────────────────┘
                      │
       ┌──────────────┼──────────────┬─────────────┐
       │              │              │             │
   PostgreSQL      Redis/BullMQ    OpenAI TTS    GCS
   (Render)        (AI jobs)       ElevenLabs    (audio/assets)
```

## 2. Repository layout

| Path | Role |
|------|------|
| `artifacts/kidschedule/` | React 18 + Vite SPA — all product UI (~100 routes) |
| `artifacts/api-server/` | Express API — routes, services, worker hooks |
| `artifacts/amynest-capacitor/` | iOS native shell, OTA bundles |
| `android/` | Play Store WebView shell (`AmyNestAndroid/1.0` UA) |
| `lib/db/` | Drizzle schema, migrations, Postgres connection |
| `lib/analytics-taxonomy/` | SSOT for `analytics_events` event names |
| `lib/api-spec/` + `lib/api-client-react/` | OpenAPI codegen |
| `lib/*` | Domain engines (phonics, speech-coach-v2, infant-hub, etc.) |
| `scripts/` | Audio generation, DB migrate, stress tests |
| `docker/backend/`, `docker/worker/` | Production containers |
| `infra/cloudflare/` | API reverse proxy for `www.amynest.in` |
| `archive/amynest-mobile-expo/` | **Read-only** legacy RN app |

## 3. Runtime services (production)

| Service | Render name | Type | Port |
|---------|-------------|------|------|
| API | `Amynest-backend-dykj` | Web (Docker) | 10000 |
| Web static | `Amynest-live-1-dykj` | Static site | CDN |
| AI worker | `amynest-ai-worker-dykj` | Background worker | — |
| Database | `amynest-db-dykj` | Postgres 18 | — |

## 4. Authentication & identity

- **Firebase Auth** — JWT on API (`requireAuth` middleware)
- **No `users` table** — Firebase UID (`text user_id`) across `parent_profiles`, `subscriptions`, `children`
- **Device registration** — `user_devices` + `requireRegisteredDevice` gate after device routes
- **Subscriptions** — auto-created row per user on first API touch (`subscriptions` table)

## 5. Request pipeline (API)

```
Request
  → Sentry context middleware
  → CORS / body parser
  → /api router (routes/index.ts)
      → Public routes (health, auth, webhooks, TTS streams, OTA)
      → requireAuth
      → devices router
      → requireRegisteredDevice
      → ~110 authenticated routers
  → Error handler → Sentry
```

## 6. Client bootstrap flow

```
main.tsx
  → initWebSentry()
  → AppCore.tsx
      → Firebase auth listener
      → device registration (device-registration.ts)
      → trackAppOpen() + flushAnalytics()
      → onboarding gate → dashboard
```

## 7. AI architecture

| Concern | Location |
|---------|----------|
| Routine generation | `lib/routine-intelligence/` + `api-server/routes/routines.ts` |
| Coach / Amy | `lib/coach-journey/`, `ai-coach.ts` |
| Speech Coach v2 | `lib/speech-coach-v2/`, OpenAI Realtime |
| TTS | OpenAI primary (`openaiTtsService.ts`), ElevenLabs fallback |
| Job queue | BullMQ + Redis (`AI_HTTP_WAIT_MS=0` in prod → async 202) |
| Content orchestration | `lib/content-orchestration/` |

## 8. Analytics architecture (summary)

Three parallel pipelines — see [analytics-map.md](./analytics-map.md):

1. **Taxonomy spine** → `POST /api/analytics/events` → `analytics_events`
2. **Client logs** → `POST /api/logs` → logs + selective DB (crashes, infant)
3. **GA4** → marketing pages only (no in-app screen views)

## 9. Admin & ops

| Surface | Path |
|---------|------|
| System dashboard | `/admin/dashboard` (kidschedule) |
| Retention API | `GET /api/admin/analytics/retention` |
| Crash intelligence | `GET /api/admin/crash-intelligence/*` |
| Infant analytics | `GET /api/admin/infant-parenting-analytics` |
| Audio health gate | `GET /api/admin/audio-health-gate` |

Gated by `ADMIN_USER_IDS` env var.

## 10. Known architectural constraints (from audit)

- **Fragmented analytics** — retention queries only read `analytics_events`; subscription/onboarding funnels are log-only
- **116 subscription rows without parent_profiles** — partial activation state
- **Dual schema path** — Drizzle push + numbered migrations + `ensureStartupTables.ts`
- **Four parallel "journey" systems** — hub, coach, routine, generic journey
- **Multiple daily-plan APIs** — content-orchestration, smart-study, phonics curriculum

## 11. Deployment

- **Branch:** `main` on `Amynest-live` GitHub repo
- **Auto-deploy:** off (manual deploys on Render)
- **Region:** Singapore
- **Env:** Render dashboard secrets (`DATABASE_URL`, `REDIS_URL`, API keys)

## 12. Test & quality gates

| Gate | Command |
|------|---------|
| API tests | `pnpm --filter @workspace/api-server test` |
| Web tests | `pnpm --filter @workspace/kidschedule test` |
| Typecheck libs | `pnpm run typecheck:libs` |
| Pre-commit | `pnpm run codegen` (OpenAPI drift check) |
| Static audio | `pnpm run check:static-audio` |
