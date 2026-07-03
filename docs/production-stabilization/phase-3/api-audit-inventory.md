# API Audit Inventory — Phase 3 Step 1

**Route handler count:** 437 (`router.get|post|put|patch|delete` in `src/routes/`)  
**Route modules:** 119 TypeScript files (excl. `*.test.ts`)

> Full domain table inherited from Phase 0: [../phase-0/api-inventory.md](../phase-0/api-inventory.md)

---

## Mount order (`routes/index.ts`)

### Public (pre-`requireAuth`)

| Router | Notable paths |
|--------|---------------|
| `health.ts` | `/healthz`, `/health`, TTS/audio health |
| `subscription.ts` | Webhook + mixed auth per-route |
| `auth-debug.ts`, `auth.ts` | Diagnostics, check-reset-email |
| `meals.ts` | `/meals/suggest` public |
| `ttsPublicRouter`, `phonicsPublicRouter`, spelling/phonics/animal/worlds libraries | CDN-style audio streams |
| `staticAudioPublicRouter`, `storiesPublicRouter`, `audioSignedUrlPublicRouter` | Public media |
| `ota.ts` | Capacitor OTA |
| `learningSeedPublicRouter`, `startupTelemetryPublicRouter` | Seed + startup |
| `nutritionSharePublicRouter`, `remote-config.ts` | Share links + RC |
| `app-version-policy.ts`, `app-version-analytics.ts` | Version gates |
| `speechCoachV2DebugRouter`, `openaiRealtimeInfraRouter` | Debug infra |

### Post-`requireAuth`, pre-device gate

| Router | Paths |
|--------|-------|
| `drive.ts` | Google Drive |
| `worksheets.ts` | Worksheet downloads |
| `devices.ts` | `POST /devices/register`, `GET /devices`, replace |

### Post-`requireRegisteredDevice`

All remaining ~90 routers including hub-journey, learning-progress, routines, phonics (auth), analytics, client-logs, etc.

---

## Top route modules by handler count

| Module | Handlers | Notes |
|--------|----------:|-------|
| `ai-coach.ts` | 20 | Legacy `/coach/*` aliases |
| `audio-health.ts` | 10 | Admin dashboards |
| `subscription.ts` | 9 | Billing critical |
| `tts.ts` | 8 | OpenAI latency |
| `phonics.ts` | 14 | Heavy 500 usage |
| `health.ts` | 8 | Overlaps `app.ts` health |
| `content-orchestration.ts` | 14 | Daily plan orchestration |
| `spelling.ts` | 19 | Sessions + tournaments |
| `notification-prefs.ts` | 13 | Rich prefs |
| `crash-intelligence.ts` | 7 | Crash ingest |
| `health-lab.ts` | 12 | Metrics store |
| `smart-study.ts` | 14 | Learning zone |
| `routines.ts` | 16 | Phase 2 client targets |
| `child-intelligence.ts` | 18 | Family AI |

---

## Validation coverage (`safeParse` in routes)

**~78 route files** contain at least one `safeParse` call (~230 total).

### Strong validation (representative)

`children.ts`, `routines.ts`, `hub-journey.ts`, `learning-progress.ts`, `devices.ts`, `analytics.ts`, `client-logs.ts`, `phonics.ts`, `content-orchestration.ts`, `speech-converse.ts`

### Weak / missing validation (representative)

| Module | Gap |
|--------|-----|
| `meals.ts` | `generate` body manual parse |
| `subscription.ts` | `rc-sync` manual body |
| `family-intelligence.ts` | Large POST bodies |
| `dashboard.ts` | Query params unchecked |
| `feature-usage.ts` | Partial |
| `ai.ts` | Mixed |

---

## Auth coverage

| Layer | Mechanism |
|-------|-----------|
| Global | `requireAuth` → Firebase JWT via `getAuth(req)` |
| Device | `requireRegisteredDevice` (skippable when `DEVICE_LIMIT_STRICT=0`) |
| Per-route | Manual `if (!userId)` in handlers |
| Admin | `ADMIN_USER_IDS` env allowlist in admin routers |
| Premium | `subscriptionService` checks in learning, features, infant guards |
| Child ownership | `loadOwnedChild` pattern in journey/progress services |

### Authorization gaps (Step 5)

- Device soft mode bypasses registration but many routes still expect device headers
- Admin checks inconsistent across `analytics-admin`, `audio-health`, `crash-intelligence`
- Some GET endpoints accept `childId` without verifying ownership in route (rely on service layer)

---

## Logging coverage

| Pattern | Files |
|---------|------:|
| Structured `logger.{info,warn,error}({ evt, err, userId })` | ~62 |
| String-only error logs | hub-journey, learning-progress, analytics |
| No catch block | `devices/register`, parts of `meals.ts` |

---

## Error response patterns

| Pattern | Occurrences (approx.) |
|---------|----------------------:|
| `res.status(500).json({ error: ... })` | 157 |
| `res.status(4xx).json({ error, issues? })` | ~300 |
| `sendSafeError` / `sendSafeJson` in routes | 0 |
| Global unhandled → `sendSafeError` | `app.ts` |

---

## P0 endpoint file map

| Endpoint | File | Service |
|----------|------|---------|
| `GET /hub-journey/status` | `routes/hub-journey.ts` | `parentHubJourneyService.getHubJourneyStatus` |
| `GET /learning-progress/status` | `routes/learning-progress.ts` | `learningProgressService.getLearningProgressStatus` |
| `POST /logs`, `/log-client-error` | `routes/client-logs.ts` | inline + crash/infant side effects |
| `POST /devices/register` | `routes/devices.ts` | `deviceLimitService.registerOrRefreshDevice` |
| `POST /analytics/events` | `routes/analytics.ts` | `analyticsIngestService.ingestAnalyticsEvents` |

---

## Billing & reconciliation

| Component | Path |
|-----------|------|
| RC webhook | `subscription.ts` |
| Manual sync | `POST /subscription/rc-sync` |
| Reconciliation cron | `services/billingReconciliationCron.ts` |
| Reconciliation service | `services/subscriptionReconciliationService.ts` |
| `sync_error` column | `subscriptions` table |

---

## Database tables (P0 touchpoints)

| Table | Schema file | Risk |
|-------|-------------|------|
| `parent_hub_journey` | `lib/db/src/schema/parent_hub_journey.ts` | Insert race (mitigated) |
| `learning_progress` | `lib/db/src/schema/learning_progress.ts` | **Unique on `childId`; insert race unmitigated** |
| `user_devices` | device schema | Transaction + advisory lock |
| `analytics_events` | analytics schema | Batch ingest |
| `subscriptions` | subscription schema | RC sync errors |

---

## Test files (routes)

25 `*.test.ts` files under `src/routes/`. **No dedicated tests** for hub-journey, learning-progress, client-logs P0 paths (Step 10).
