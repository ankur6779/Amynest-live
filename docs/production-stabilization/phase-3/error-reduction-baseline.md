# Error Reduction Baseline — Phase 3

**Captured:** 2026-07-04 (pre-fix)  
**Source:** Phase 0 verification, production logs, code audit

---

## Production HTTP 500 endpoints (confirmed P0)

| Endpoint | Est. impact | Root cause (code-level) |
|----------|-------------|-------------------------|
| `GET /api/hub-journey/status` | Hub load failure | Unhandled service/DB errors; weak logging masks `err` stack |
| `GET /api/learning-progress/status` | Learning hub failure | **Cascade** from hub-journey; `ensureLearningProgressRow` race → `learning_progress_insert_failed` |
| `POST /api/log-client-error` | Error reporting loop | Uncaught throw in `JSON.stringify(meta)` (circular refs); sync side-effect throws |
| `POST /api/devices/register` | Onboarding/device gate | **No try/catch** — DB transaction errors become unhandled 500 |

---

## P0 root cause detail

### `learning_progress_insert_failed`

```typescript
// learningProgressService.ts — race when two concurrent status reads insert same childId
const [created] = await db.insert(learningProgressTable).values({...}).returning();
if (!created) throw new Error("learning_progress_insert_failed");
```

`learning_progress` has `uniqueIndex("learning_progress_child_uq").on(childId)`. Concurrent inserts: winner returns row, loser gets empty `.returning()` → throw → 500.

**Fix:** `onConflictDoNothing` + retry select (same pattern as `ensureHubJourney`).

### Learning progress ↔ hub journey cascade

```typescript
const hubStatus = await getHubJourneyStatus(userId, childId);
if (!hubStatus) return null;
```

If `getHubJourneyStatus` **throws** (subscription DB error, progress snapshot query failure), learning-progress returns 500 even when learning row exists.

**Fix:** Structured catch in route; service-layer resilience for subscription read (Step 2).

### `POST /api/log-client-error`

- Mounted **after** `requireAuth` + `requireRegisteredDevice` — failures with 401/403 are expected without JWT/device
- Handler has **no top-level try/catch**
- Meta clone: `JSON.parse(JSON.stringify(meta).slice(0, 4000))` throws on circular structures

**Fix:** Safe meta clone + outer try/catch; structured 500 with `requestId`.

### `POST /api/devices/register`

```typescript
const result = await registerOrRefreshDevice({...}); // no try/catch
```

Transaction failures (connection pool, advisory lock timeout) propagate to global handler → opaque 500.

**Fix:** try/catch with structured error + `evt: "device.register_failed"`.

---

## P1 production issues

| Area | Symptom | Notes |
|------|---------|-------|
| Billing reconciliation | 28 audit failures (Phase 0) | `sync_error` on subscriptions; batch cap 100–500 |
| `POST /api/analytics/events` | Occasional 500 | DB ingest; string-only error log |
| `POST /api/subscription/rc-sync` | 409 vs 500 confusion | Manual JSON parse |
| `device_header_missing` | 70% analytics events | Client/device gate (Phase 1) — not API 500 |
| Phonics/parenting-hub crashes | 111 client crashes | Client-side (Phase 4 scope) |

---

## Error response baseline

| Metric | Pre-fix value |
|--------|---------------|
| Routes using structured error contract | ~0% |
| Routes with `requestId` in error body | ~0% (header only) |
| Routes logging `{ err }` object on failure | ~45% |
| Global 500 sanitization | ✅ `sanitizePublicErrorMessage` |

---

## Target metrics (post Phase 3)

| Metric | Target |
|--------|--------|
| P0 endpoint 500 rate | 0 from app bugs |
| Structured error responses (P0 routes) | 100% |
| Validation crashes | 0 |
| Unhandled promise rejections in routes | 0 |

---

## Error reduction tracking (Step 2 partial)

| Endpoint | Baseline | After fix | Notes |
|----------|----------|-----------|-------|
| hub-journey/status | 500 | Structured 500 + `{ err }` logs | Service root causes may remain |
| learning-progress/status | 500 | Insert race fixed; structured errors | Hub cascade still possible |
| log-client-error | 500 | Safe meta + try/catch | Circular meta no longer throws |
| devices/register | intermittent 500 | try/catch + structured 500 | DB errors no longer unhandled |
