# API Stability Report — Phase 3 Step 1

**Generated:** 2026-07-04  
**Scope:** `artifacts/api-server` — read-only audit  
**Code changes:** None (Step 1)

---

## Executive summary

The AmyNest API server exposes **~437 route handlers** across **~112 route modules**, mounted at `/api` with a layered auth/device gate. Infrastructure for production-grade responses exists (`sendSafeError`, `requestId`, `pino-http`, Sentry) but **is not adopted by route handlers** (~95% still return raw `{ error: string }` JSON).

Production audit (Phase 0) and code review confirm **at least 4 P0 endpoints** returning HTTP 500 from application bugs, plus billing reconciliation drift and analytics ingest fragility.

---

## API Stability Score

### Score: **38 / 100** (pre-fix baseline)

| Dimension | Weight | Score | Notes |
|-----------|--------|------:|-------|
| Zero critical 500s | 20 | 4/20 | hub-journey, learning-progress, log-client-error, devices/register |
| Structured error contract | 15 | 2/15 | `sendSafeError` used only in global 404/500 handlers |
| Input validation (Zod) | 15 | 8/15 | ~55% of route files use `safeParse`; mutations uneven |
| Auth & ownership | 15 | 13/15 | Global `requireAuth` + device gate; soft device mode gap |
| Structured logging | 10 | 4/10 | P0 routes log string-only errors; no `requestId` in catches |
| Billing/subscription stability | 10 | 5/10 | Reconciliation cron exists; 28 audit failures in prod |
| Analytics/device ingest | 10 | 7/10 | Zod on analytics batch; client-logs meta edge cases |
| Resilience patterns | 5 | 3/5 | Timeouts + slow-api guard exist; no circuit breakers |
| Test coverage (API) | 5 | 2/5 | ~40 route test files; P0 endpoints lack dedicated tests |
| Observability | 5 | 2/5 | Admin dashboards partial; per-route metrics sparse |

**Target after Phase 3:** ≥ 95

---

## 1. API inventory summary

| Metric | Value |
|--------|------:|
| Route modules (`src/routes/*.ts`, excl. tests) | ~112 |
| `router.(get\|post\|put\|patch\|delete)` handlers | **437** |
| Public pre-auth mounts | ~18 routers |
| Post-auth routers | ~94 routers |
| `res.status(500)` in routes | ~157 occurrences |
| `safeParse` usages in routes | ~230 calls across ~78 files |
| `sendSafeError` in route handlers | **0** |

Full domain breakdown: [api-audit-inventory.md](./api-audit-inventory.md)

---

## 2. Auth middleware chain

```
Request
  → requestIdMiddleware
  → sentryRequestMiddleware
  → requestTimeout
  → slowApiGuard
  → limitJsonResponse
  → requestLoopDetector
  → pino-http (autoLogging OFF in production)
  → /api router
      → PUBLIC routers (subscription webhook, auth, TTS/phonics audio, OTA, …)
      → requireAuth (Firebase JWT)
      → devices router  ← BEFORE device gate (intentional)
      → requireRegisteredDevice
      → ALL other authenticated routers
```

### Gaps

| Gap | Risk | Step |
|-----|------|------|
| `DEVICE_LIMIT_STRICT=0` passes requests without device headers | Entitlement/analytics skew | 5 |
| `getAuth(req).userId` checked per-handler (not enforced by type) | Missed auth check on new routes | 5 |
| Admin routes rely on `ADMIN_USER_IDS` allowlist scattered in handlers | Inconsistent protection | 5 |

---

## 3. Duplicate endpoints

### Intentional aliases (keep)

| Path A | Path B | Handler |
|--------|--------|---------|
| `POST /api/logs` | `POST /api/log-client-error` | `ingestClientLog` |
| `POST /api/ai-coach/*` | `POST /api/coach/*` | `ai-coach.ts` |

### Overlapping (document only — do not merge)

| Area | Endpoints |
|------|-----------|
| Journey status | `/journey/status`, `/hub-journey/status`, `/coach-journey/status`, `/routine-journey/status` |
| Daily plans | `/content/daily-plan`, `/smart-study/daily-plan`, `/phonics/curriculum/daily-plan` |
| Notifications | `notifications.ts` (legacy) + `notification-prefs.ts` (rich) |
| Health | `app.ts` `/healthz` + `health.ts` `/api/healthz/*` |

### Dead endpoints

No routes proven unused in production traffic during this audit. **Do not remove** any endpoint in Phase 3 without 30-day zero-traffic proof.

---

## 4. Missing validation (estimate)

| Category | Estimate |
|----------|----------|
| Endpoints with Zod `safeParse` on inputs | ~45–55% |
| High-risk mutations without Zod | `meals/generate`, `subscription/rc-sync`, `family-intelligence/*`, parts of `ai.ts` |
| GET endpoints with query params | hub/learning ✅; dashboard, feature-usage GET ❌ |

**Step 4 action:** Prioritize mutation routes + any route that threw 500 from malformed input.

---

## 5. Missing / weak logging

| Pattern | Count | Example |
|---------|------:|---------|
| `logger.error({ err, userId, evt })` | ~62 files | `family-intelligence.ts` |
| `logger.error(\`msg: ${err.message}\`)` | P0 routes | hub-journey, learning-progress, analytics |
| No catch logging | ~50 route files | Rely on global handler only |

**Step 7 action:** Standardize on `{ err, userId, childId, requestId, evt, api, durationMs, status }`.

---

## 6. High-error production APIs (P0)

| Endpoint | Prod symptom | Root cause hypothesis | Fix priority |
|----------|--------------|----------------------|--------------|
| `GET /api/hub-journey/status` | HTTP 500 | DB failure in `ensureHubJourney` / `parent_hub_journey` table; subscription read errors; string-only logging hides stack | P0 |
| `GET /api/learning-progress/status` | HTTP 500 | **Cascades from `getHubJourneyStatus`**; `ensureLearningProgressRow` throws `learning_progress_insert_failed`; JSON column parse errors | P0 |
| `POST /api/log-client-error` | HTTP 500 | Zod reject on new client log types; `meta` JSON stringify edge cases; crash ingest side effects | P0 |
| `POST /api/devices/register` | HTTP 500 intermittent | **No try/catch** in handler — unhandled DB errors from `registerOrRefreshDevice` / `getOrCreateSubscription` bubble to global handler | P0 |
| `POST /api/analytics/events` | Occasional 500 | `ingestAnalyticsEvents` DB errors; weak error logging | P1 |
| `POST /api/subscription/rc-sync` | 409/500 confusion | Manual body parsing; webhook-only path returns 409 | P1 |
| Billing reconciliation | 28 audit failures | RC API / customer_id mismatch; batch limit 100–500 | P1 |

---

## 7. Slow APIs (code + architecture signals)

| Area | Signal | Step |
|------|--------|------|
| `POST /api/routines/generate-ai` | AI queue + 35s timeout | 8, 9 |
| `POST /api/tts/*` | External OpenAI latency | 8 |
| `GET /api/learning-progress/status` | 6+ DB queries + hub journey cascade | 6, 8 |
| `GET /api/hub-journey/status` | Multi-table progress snapshot | 6, 8 |
| `phonics.ts` | 14 explicit `res.status(500)` handlers | 2, 3 |

No production P50/P95 metrics in repo — **Step 8** requires Render/log aggregation baseline.

---

## 8. Standard error handling status

### Required contract (Step 3 target)

```json
{
  "success": false,
  "error": "code",
  "message": "human readable",
  "details": {},
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

### Current state

| Mechanism | Adoption |
|-----------|----------|
| `sendSafeError` / `sendSafeJson` | Global 404 + unhandled 500 only |
| Raw `res.status(N).json({ error })` | ~95% of handlers |
| `requestId` on errors | Global handler + routines/household 503 only |
| Stack traces to client | Prevented in production via `sanitizePublicErrorMessage` |

---

## 9. Database audit signals (Step 6 preview)

| Issue | Location | Notes |
|-------|----------|-------|
| N+1 reads | `getLearningProgressStatus` | Multiple sequential queries per section |
| Missing row handling | `ensureLearningProgressRow` | Throws instead of retry/onConflict |
| Hub → learning cascade | `learningProgressService` | Single hub failure kills learning status |
| `parent_hub_journey` insert race | `ensureHubJourney` | `onConflictDoNothing` + retry (good pattern) |
| Reconciliation batch cap | `subscriptionReconciliationService` | Stale `sync_error` rows |

No schema changes recommended in Step 1.

---

## 10. Resilience status (Step 9 preview)

| Pattern | Present | Gap |
|---------|---------|-----|
| Request timeout middleware | ✅ | Not per-route tuned |
| Slow API guard | ✅ | — |
| AI job queue + poll | ✅ | — |
| Circuit breakers | ❌ | OpenAI/RC calls unprotected |
| Retry with backoff | Partial | Billing cron only |
| Graceful degradation | Partial | Routines 503 mapping |

---

## 11. Test coverage (Step 10 preview)

| Suite | Files | Notes |
|-------|------:|-------|
| Route tests | ~40 `*.test.ts` in routes | hub-journey, learning-progress, client-logs **lack** dedicated tests |
| Service tests | lib + services | subscription, routines strong |
| Integration | device-limit, launch-security | Good patterns to extend |

---

## 12. Phase 1 & 2 compatibility

| Concern | Impact from Phase 3 |
|---------|---------------------|
| `POST /api/analytics/events` | Must remain backward compatible; extend error contract additively |
| Routine routes | Global 503 mapping for `/api/routines` preserved |
| Client `track()` facade | Unaffected (client-side) |

---

## 13. Recommended fix order (Steps 2–11)

1. **P0 handlers:** hub-journey, learning-progress, client-logs, devices/register — try/catch + structured logs + null-safe service layer
2. **Error envelope:** Introduce `apiError(res, code, …)` wrapper; migrate P0 routes first
3. **Validation:** Zod on `rc-sync`, meals, family-intelligence mutations
4. **DB:** Decouple learning-progress from hub-journey failure; fix `learning_progress_insert_failed`
5. **Billing:** Surface `sync_error` on subscription GET; tighten reconciliation logging
6. **Tests:** Add hub-journey, learning-progress, client-logs, devices integration tests
7. **Observability:** Per-route success/failure counters in admin analytics

---

## Remaining risks before Phase 4

1. Phonics/parenting-hub crashes are **client-side** (Phase 4) — API stability alone won't fix
2. `DEVICE_LIMIT_STRICT=0` in production may mask device registration issues
3. 157 inline `500` handlers — high migration surface for error contract
4. No production latency baseline in repo — performance work needs Render metrics
5. OpenAI/RC external dependency failures need circuit breakers (Step 9)
