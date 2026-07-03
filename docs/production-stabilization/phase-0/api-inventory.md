# API Inventory — AmyNest AI

**Mount point:** `/api` via `artifacts/api-server/src/app.ts`  
**Router index:** `artifacts/api-server/src/routes/index.ts`  
**Route modules:** ~115 files  
**Estimated endpoints:** ~400+

## Auth gates

```
Public routes → requireAuth → devices → requireRegisteredDevice → all other routers
```

## Domain index

### Infrastructure & health (public + admin)

| File | Key paths |
|------|-----------|
| `health.ts` | `GET /healthz`, `/health`, `/healthz/tts`, `/healthz/audio` |
| `ota.ts` | `GET /app/ota/bundle/:filename`, `POST /app/ota/check` |
| `remote-config.ts` | `GET /remote-config/chat-platform`, `/speech-coach-v2` |
| `app-version-policy.ts` | `GET /app-version-policy` |
| `client-logs.ts` | `POST /logs`, `/log-client-error`, `GET /logs/recent` |
| `startup-telemetry.ts` | `POST /startup-events`, `GET /admin/startup-stats` |
| `crash-intelligence.ts` | `POST /crash-events`, admin fingerprint/heatmap suite |
| `audio-health.ts` | `GET /admin/dashboard`, `/admin/system-health`, `/admin/audio-slo` |

### Auth & account

| File | Key paths |
|------|-----------|
| `auth.ts` | `POST /auth/check-reset-email` |
| `account.ts` | `DELETE /account` |
| `devices.ts` | `POST /devices/register`, `GET /devices`, `DELETE /devices/:id` |
| `onboarding.ts` | `GET/POST /onboarding`, `POST /onboarding/complete` |
| `parent-profile.ts` | `GET/PUT /parent-profile` |

### Subscriptions

| File | Key paths |
|------|-----------|
| `subscription.ts` | `GET /subscription`, `POST /start-trial`, RC sync, Razorpay, webhooks |
| `features.ts` | `POST /features/:feature/consume` |

### Analytics

| File | Key paths |
|------|-----------|
| `analytics.ts` | `POST /analytics/events` |
| `feature-usage.ts` | `GET /feature-usage/status`, `POST /feature-usage/track` |
| `user-feedback.ts` | `POST /user-feedback`, `GET /admin/feedback` |
| `analytics-admin.ts` | `GET /admin/analytics/retention`, `/quality`, `/device-metrics` |

### Routines

| File | Key paths |
|------|-----------|
| `routines.ts` | `POST /routines/generate`, `/generate-ai`, CRUD, `POST /insights` |
| `routine-feedback.ts` | `POST /routine-feedback` |
| `routine-journey.ts` | `GET /routine-journey/status` |
| `dashboard.ts` | `GET /dashboard/summary`, `/recent-routines` |

### Learning zone

| File | Key paths |
|------|-----------|
| `phonics.ts` | Curriculum, tests, downloads, daily-plan |
| `phonics-v3-progress.ts` | v3 progress sync |
| `spelling.ts` | Sessions, tournaments, AI generate |
| `learning-progress.ts` | `GET /learning-progress/status`, `POST /analytics` |
| `hub-journey.ts` | `GET /hub-journey/status` ⚠️ **500 in prod** |
| `abacus.ts`, `olympiad.ts`, `life-skills.ts`, `health-lab.ts` | Module progress |
| `worksheets.ts`, `coloring.ts`, `funsheets.ts` | Download lists |
| `gaming-rewards.ts` | Wallet sync/earn/unlock |

### Speech & audio

| File | Key paths |
|------|-----------|
| `speech-coach-v2.ts` | Session start/complete, realtime token, usage |
| `tts.ts` | `POST /tts/generate`, `/stream`, public `GET /tts/audio/:key.mp3` |
| `static-audio.ts` | Catalog MP3 streaming |

### Infant care

| File | Key paths |
|------|-----------|
| `infant-care.ts`, `infant-today.ts`, `infant-milestones.ts` | Logging & milestones |
| `cryInsight.ts` | `POST /cry-insight/analyze` |
| `infant-sleep-coach.ts` | Sleep plans |
| `infant-analytics-admin.ts` | `GET /admin/infant-parenting-analytics` |

### AI & coach

| File | Key paths |
|------|-----------|
| `ai-coach.ts` | `/ai-coach` + `/coach/*` aliases |
| `ai.ts` | `/ai/assistant`, `/ai/recipe` |
| `content-orchestration.ts` | Daily plans, tutor turns |
| `smart-study.ts` | Smart study daily plan |
| `amy-operating.ts` | Hub dashboard, daily briefing |

### Notifications

| File | Key paths |
|------|-----------|
| `push.ts` | `POST /push/register` |
| `notifications.ts` | Legacy prefs |
| `notification-prefs.ts` | Categories, history, outcomes, deep-link events |

### Media

| File | Key paths |
|------|-----------|
| `reels.ts` | `GET /api/reels/videos` (prefixed) |
| `stories.ts` | `GET /api/stories/`, stream, sync |

## Duplicate & overlapping endpoints

### Intentional aliases (same handler)

| Path A | Path B | File |
|--------|--------|------|
| `POST /ai-coach` | `POST /coach/generate` | `ai-coach.ts` |
| `POST /logs` | `POST /log-client-error` | `client-logs.ts` |

### Functional overlap (different paths, similar purpose)

| Area | Paths | Phase 3 priority |
|------|-------|------------------|
| Daily plan | `/content/daily-plan`, `/smart-study/daily-plan`, `/phonics/curriculum/daily-plan` | Document; do not merge |
| Job status | `GET /result/:jobId`, `GET /ai/jobs/:jobId` | Document |
| Notification prefs | `/notifications/preferences` vs `/notifications/categories` | Legacy + rich — extend rich |
| Journey status | 4 parallel journey endpoints | Keep; add analytics per journey |
| Learning progress | Multiple module-specific progress routes | Keep; fix 500s on status |

### Production 500 endpoints (audit + Render logs)

| Path | Status | Phase |
|------|--------|-------|
| `GET /api/hub-journey/status` | 500 | Phase 3 |
| `GET /api/learning-progress/status` | 500 | Phase 3 |
| `POST /api/log-client-error` | 500 | Phase 3 |
| `POST /api/devices/register` | 500 (intermittent) | Phase 3 |
| `OPTIONS /api/startup-events` | 500 (dev tool CORS) | Phase 3 |

## App-level routes (outside `/api`)

| Path | File |
|------|------|
| `GET /`, `GET /health`, `GET /healthz` | `app.ts` |

## Phase 3 stabilization targets

No new APIs. Fix existing endpoints:

1. `hub-journey/status` — null-safe child journey rows
2. `learning-progress/status` — handle missing child progress
3. `log-client-error` — fix ingest validation/payload limits
4. `devices/register` — idempotent retry on conflict
5. `subscription/rc-sync` — reduce reconciliation failures (28 audit events)
