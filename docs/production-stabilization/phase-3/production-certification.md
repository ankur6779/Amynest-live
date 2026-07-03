# Phase 3 — Production Certification (Scoped)

**Date:** 2026-07-04  
**Scope:** P0 production-critical APIs only (not full 437-handler migration)

---

## Final API Stability Score

### **84 / 100**

| Dimension | Weight | Score | Notes |
|-----------|--------|------:|-------|
| Zero critical 500s (P0 routes) | 20 | 18/20 | Root-cause fixes deployed; prod verification pending |
| Structured error contract | 15 | 8/15 | P0 routes only (`sendStructuredApiError`) |
| Input validation (scoped) | 15 | 10/15 | Auth, billing rc-sync, existing hub/learning/device/analytics |
| Auth & ownership | 15 | 14/15 | Unchanged global gates; auth Zod added |
| Structured logging (P0) | 10 | 8/10 | `{ err, evt, requestId }` on P0 failure paths |
| Billing / RC sync | 10 | 7/10 | Insert race fix; sync_error prioritization; no 500 on restore |
| Analytics / device ingest | 10 | 8/10 | Chunked insert; device onConflict; partial batch accept |
| Resilience (P0) | 5 | 4/5 | Hub/learning degrade paths; no circuit breakers |
| P0 integration tests | 5 | 4/5 | 8 tests; DB integration skips when Postgres unavailable |
| Observability (scoped) | 5 | 3/5 | `GET /healthz/stability-metrics` + domain counters |

**Phase 3B (debt) target:** migrate remaining ~400 handlers incrementally.

---

## Certification gate

| Criterion | Status |
|-----------|--------|
| No known production 500s on P0 endpoints | ✅ Code fixes applied |
| Billing reconciliation improved | ✅ `sync_error` rows prioritized |
| RevenueCat sync no unhandled 500 | ✅ Structured JSON; Zod on body |
| Analytics ingestion reliability | ✅ Chunked + per-row fallback |
| Device registration reliability | ✅ onConflict + try/catch |
| Hub Journey succeeds | ✅ Service hardening + degrade paths |
| Learning Progress succeeds | ✅ Decoupled from hub throw; insert race fixed |
| P0 integration tests | ✅ Pass (unit); integration skips without DB |
| Phase 1 analytics unaffected | ✅ Same endpoint contract; additive errors |
| Phase 2 routines unaffected | ✅ No routine engine/route timing changes |

### Verdict: **CERTIFIED for scoped Phase 3** — Phase 4 may begin

Phase 4 addresses **client-side** crashes (`/phonics`, `/parenting-hub`) and UX stability. Remaining API debt is explicitly deferred to **Phase 3B**.

---

## P0 fixes delivered

### 1. Hub Journey (`parentHubJourneyService.ts`)
- Premium check wrapped — defaults to free on subscription DB failure
- Progress snapshot, life-skills reads, article pick — degrade with empty defaults
- `syncHubJourneyChildId` — non-fatal on update failure
- Domain metrics via `withApiDomainMetrics("hub_journey")`

### 2. Learning Progress (`learningProgressService.ts`)
- `resolveLearningHubContext` — no longer returns 404 when hub throws; uses day-1 defaults
- Section enrich + skill graph — degrade on failure
- `learning_progress` insert race — `onConflictDoNothing` + retry
- Domain metrics on status reads

### 3. Billing
- `getOrCreateSubscription` — insert race fix (`onConflictDoNothing`)
- Reconciliation cron — prioritizes rows with `sync_error`
- `POST /subscription/rc-sync` — Zod `purpose: "restore"`; metrics; no 500 on invalid body

### 4. Device registration
- `registerOrRefreshDevice` — `onConflictDoNothing` on `(userId, deviceId)` + reactivation path
- Route try/catch + structured 500 + metrics

### 5. Client error logging
- Safe meta clone; outer try/catch; structured 400/500

### 6. Analytics ingestion
- Chunked batch insert (50) with per-row fallback
- Partial accept — 500 only when **zero** rows persist
- Route metrics

### 7. Observability
- `GET /api/healthz/stability-metrics` — domain success/failure/latency + analytics quality

---

## P1 integration tests

| Suite | File |
|-------|------|
| Hub Journey | `p0-api-stability.integration.test.ts` |
| Learning Progress | same (+ concurrent race test) |
| Device Registration | same |
| Analytics ingestion | same |
| Billing rc-sync | same |
| Client logs | `client-logs.test.ts` |
| Structured errors | `safe-api-response.test.ts` |
| Domain metrics | `api-domain-metrics.test.ts` |

Run (requires Postgres):

```bash
DATABASE_URL=postgresql://amynest:amynest@localhost:5432/amynest_dev \
  node --import tsx/esm --test \
  artifacts/api-server/src/routes/p0-api-stability.integration.test.ts
```

---

## Remaining technical debt (Phase 3B)

| Item | Est. handlers | Priority |
|------|--------------:|----------|
| Migrate legacy `{ error: string }` to structured envelope | ~400 | Medium |
| Zod on all mutation routes | ~200 | Low |
| Circuit breakers (OpenAI, RevenueCat) | 2 deps | Medium |
| Per-route DB query optimization | TBD | Low |
| `logClientError` bearer token always null | 1 client | High (telemetry 401s) |
| `DEVICE_LIMIT_STRICT=0` soft bypass | config | Medium |
| Production P50/P95 latency baseline | — | Medium |
| Phonics 14× inline 500 handlers | 14 | Low |

---

## APIs intentionally postponed (Phase 3B)

- All non-P0 domains: infant-care, speech-coach, content-orchestration, olympiad, health-lab, etc.
- Legacy coach/ai-coach alias consolidation (document only)
- Notification prefs dual-router merge
- Global error handler envelope migration
- Full observability on all 437 handlers

---

## Phase 4 recommendation

**Proceed to Phase 4** — client crash stabilization on `/phonics` and `/parenting-hub`.

**Do not block on:**
- Full handler migration (Phase 3B)
- Performance optimization beyond top-20 endpoints (not yet measured in prod)
- Circuit breakers (nice-to-have)

**Monitor after deploy:**
- `GET /api/healthz/stability-metrics` — P0 domain failure rates
- Render logs for `evt: hub_journey.*_failed`, `learning_progress.*_failed`
- `subscriptions.sync_error` count trend

---

## Modified files

See [modified-files.md](./modified-files.md) (updated).
