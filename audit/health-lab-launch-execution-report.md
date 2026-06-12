# Amy Health Lab™ — Launch Execution Report

**Date:** 2026-06-12  
**Prior status:** CONDITIONAL GO  
**Execution agent:** Cursor (automated + environment checks)

---

## Final Recommendation: **NO-GO**

Launch cannot be declared **GO** until Step 1 (database migration) completes on staging and production. All automated validation passes; the sole blocker is operational — credentials and migration execution.

---

## Step 1 — Database Migration

| Check | Status | Evidence |
|-------|--------|----------|
| `pnpm db:push` staging | ❌ **NOT RUN** | No `DATABASE_URL` in workspace `.env`; local Postgres unavailable |
| `pnpm db:push` production | ❌ **NOT RUN** | Production credentials not available to agent |
| `health_lab_progress` exists | ⏳ Pending | Schema ready in `lib/db/src/schema/health_lab_progress.ts` |
| Unique `child_id` index | ⏳ Pending | Defined as `health_lab_progress_child_uq` in schema |
| `db-verify.ts` includes table | ✅ PASS | Listed in `CRITICAL_TABLES` |
| Migration script ready | ✅ PASS | `scripts/health-lab-migrate-verify.sh` |

### Migration command (run manually)

```bash
# Staging
DATABASE_URL='<staging-url>' ./scripts/health-lab-migrate-verify.sh staging

# Production (after staging passes)
DATABASE_URL='<production-url>' ./scripts/health-lab-migrate-verify.sh production
```

Script captures logs to `audit/health-lab-migration-log-<env>-<timestamp>.txt`.

### Render Postgres verification (optional)

If using Render MCP, after workspace selection:

```sql
SELECT to_regclass('public.health_lab_progress') IS NOT NULL;
SELECT indexname FROM pg_indexes WHERE tablename = 'health_lab_progress';
SELECT child_id, COUNT(*) FROM health_lab_progress GROUP BY child_id HAVING COUNT(*) > 1;
```

---

## Step 2 — 2-Device Sync Smoke Test

| Scenario | Automated | Physical devices |
|----------|-----------|------------------|
| Device A play → Device B sync | ✅ Simulated | ☐ Manual required |
| XP / badge / coins / quest / streak | ✅ Simulated | ☐ Manual required |
| Offline A → Online B | ✅ Queue logic (E2E) | ☐ Manual required |
| Offline B → Online A | ✅ Queue logic (E2E) | ☐ Manual required |
| Conflict resolution | ✅ 11 API tests | ☐ Manual required |
| Reinstall / logout / child switch | ✅ Logic tests | ☐ Manual required |

### Automated sync test results: **PASS (15/15 API + 38/38 E2E)**

New tests in `healthLabTwoDeviceSync.test.ts`:

- Device A → B hydrate merge
- Badge deduplication across devices
- Conflict newest-wins without duplicate sessions
- Coin max merge (no negative duplication)
- Reinstall empty-local restore
- Replay timestamp dedup (no duplicate XP rows)

### Physical 2-device pass criteria (manual)

After migration, run on **same parent + same child**:

1. Device A: complete Breath Control, earn XP, unlock badge, spend coins
2. Device B: open Health Lab → verify XP, badge, coin balance, quest, streak
3. Toggle airplane mode on each device; confirm no loss after reconnect
4. Reinstall on one device; confirm server restore

**Result:** ⏳ **PENDING** — requires human execution post-migration

---

## Step 3 — Real Device Validation

| Platform | Code review | Manual QA |
|----------|-------------|-----------|
| iPhone Safari | ✅ Hidden pause, motion fallback | ☐ |
| Capacitor iOS | ✅ Same web bundle | ☐ |
| Android Chrome | ✅ DeviceMotion path | ☐ |
| Android WebView | ✅ Production URL shell | ☐ |
| Tablet | ✅ Responsive layout | ☐ |
| PWA | ✅ Offline queue | ☐ |

| Check | Code status |
|-------|-------------|
| Motion permissions | ✅ Grant/deny + `permission_denied` analytics |
| Sensor reliability | ✅ Pause when `document.hidden` |
| Orientation | ✅ Responsive CSS (no lock) |
| Background recovery | ✅ Sensor restart on focus |
| Offline recovery | ✅ localStorage queue + flush |
| Animation performance | ✅ Reduced-motion + particle pause |

**Result:** ⏳ **PENDING** — 2-hour manual soak required for GO at 99+ confidence

---

## Step 4 — Production Monitoring

| Check | Status |
|-------|--------|
| `GET /api/admin/health-lab/metrics` implemented | ✅ |
| DAU counter | ✅ `health_lab_dau_users` |
| Session count | ✅ `health_lab_session_*` |
| Quest / badge / shop rates | ✅ 24h snapshot |
| Permission denied rate | ✅ |
| Sync failure rate | ✅ |
| 429 rate limits | ✅ Middleware on POST routes |
| Client log ingest | ✅ `meta.feature === "health_lab"` |

### Live endpoint validation

| Environment | Result |
|-------------|--------|
| Production API `/health` | ✅ `{"ok":true}` |
| Admin metrics (unauthenticated) | ⏳ Expected 401/403 — not smoke-tested with admin token |
| Post-deploy metrics with traffic | ⏳ Pending soft launch |

**Automated metrics unit tests:** **PASS (4/4)**

---

## Step 5 — Soft Launch

| Phase | Status |
|-------|--------|
| Internal families | ⏳ Blocked on Step 1 |
| 10% premium | ⏳ Blocked on Step 1 |
| 7-day monitoring | ⏳ Not started |

### Monitoring watchlist (first 7 days)

- Progress-loss support tickets
- `health_lab_sync_failure` rate >5%
- `health_lab_permission_denied` >30% of sessions
- 429 spikes on `/health-lab/sync`
- Postgres `health_lab_progress` row growth

---

## Test Summary (All Automated Gates)

| Suite | Result |
|-------|--------|
| Vitest `health-lab.test.ts` | 31/31 ✅ |
| Playwright certification | 38/38 ✅ |
| API merge tests | 5/5 ✅ |
| API two-device sync | 6/6 ✅ |
| API metrics tests | 4/4 ✅ |
| **Total automated** | **84/84 ✅** |

---

## Launch Decision Matrix

| Step | Required for GO | Status |
|------|---------------|--------|
| 1. DB migration staging + prod | Yes | ❌ BLOCKED |
| 2. Physical 2-device smoke | Yes | ⏳ PENDING |
| 3. Real device QA | Yes (staged OK parallel) | ⏳ PENDING |
| 4. Metrics endpoint live | Yes | ✅ Code ready |
| 5. Soft launch | After 1–4 | ⏳ NOT STARTED |

---

## GO / NO-GO

### **NO-GO** (current)

**Reason:** Production blocker R-001 unresolved — `health_lab_progress` not migrated.

### Path to **GO**

1. Run `scripts/health-lab-migrate-verify.sh` on staging → production
2. Complete 2-device manual smoke (30 min)
3. Begin internal family soft launch
4. After 48h clean metrics → expand to 10% premium

**Estimated time to GO:** ~2 hours operator time + 48h soak

---

## Operator Checklist (copy/paste)

```
[ ] DATABASE_URL staging → ./scripts/health-lab-migrate-verify.sh staging
[ ] Verify API boot log: health_lab_progress present
[ ] DATABASE_URL production → ./scripts/health-lab-migrate-verify.sh production
[ ] 2-device sync smoke (iPhone + Android)
[ ] GET /api/admin/health-lab/metrics with admin token
[ ] Enable hub tile for internal testers
[ ] Monitor 48h → expand rollout
```

---

*Supersedes checklist items in `health-lab-launch-go-no-go.md` once all boxes checked.*
