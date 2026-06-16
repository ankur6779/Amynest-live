# Phonics Curriculum — Rollback Plan

**Purpose:** Restore pre-refactor phonics behavior if staging or production issues require it.  
**Important:** There is **no runtime feature flag** for curriculum gating today. Rollback is **deploy-time** (revert + redeploy).

---

## Decision Criteria

Trigger rollback if any of the following persist beyond 24h after deploy:

- Elevated **409 `not_enough_content`** blocking majority of L1–L2 daily tests without client recovery
- Widespread **mission generation failures** (empty missions for most active users)
- **Level regression** reports (children losing access to previously unlocked content incorrectly)
- Critical phonics route **5xx** error rate spike tied to curriculum code paths

Do **not** rollback for:
- Expected L1 empty assessments (by design)
- Fewer than 6 mission picks at low mastery
- Baselined orphan/symbol audit findings

---

## Database Impact Assessment

| Table / store | Impact of rollback | Impact of forward deploy |
|---------------|-------------------|--------------------------|
| `phonics_curriculum_progress` | **None** — no schema change | Rows preserved; `currentLevel` unchanged |
| `phonics_daily_plans` | **None** | Plans regenerate with reverted logic if service reverted |
| `phonics_test_results` | **None** | Historical results valid |
| `phonics_v3_*` tables | **None** | Mastery/fluency/mission sync unchanged |
| Client localStorage (V2/V3) | **None** on revert | May retain new keys; harmless with old code |

**No SQL rollback scripts required.** No destructive migrations were applied.

### Stored level 6 nuance
If you rollback code but DB rows remain at `currentLevel: 6`:
- **Forward code:** reads as L7 (fluency).
- **Reverted code:** may interpret 6 as legacy fluency stage — verify pre-refactor semantics before rollback.

Optional normalization (only if needed post-rollback):

```sql
-- Forward-normalize legacy fluency saves (optional, not required for deploy)
-- UPDATE phonics_curriculum_progress SET current_level = 7 WHERE current_level = 6;
```

---

## Rollback Strategy Overview

```
1. Revert git commit(s) for phonics consolidation
2. Redeploy API server
3. Redeploy kidschedule web bundle (+ iOS OTA / Android WebView picks up web)
4. Verify age-band assessments and legacy story unlock restored
5. Monitor error rates 24h
```

Estimated rollback time: **30–60 minutes** (deploy pipeline dependent).

---

## 1. Disable Curriculum Gating

There is no single env var. Gating is implemented across:

| Layer | File(s) |
|-------|---------|
| Client tile filter | `artifacts/kidschedule/src/lib/phonics-curriculum-filter.ts` |
| Word Families lock | `artifacts/kidschedule/src/components/phonics-v2/WordFamilyExplorer.tsx` |
| Karaoke / Games init | `artifacts/kidschedule/src/components/phonics-v2/PhonicsV2.tsx`, `PhonicsGamesHub.tsx` |
| Mission word picks | `artifacts/kidschedule/src/lib/phonics-v3/adaptive-selector.ts` |
| API assessments | `artifacts/api-server/src/lib/phonicsTests.ts` |

### Rollback action
**Git revert** the consolidation merge commit (or cherry-pick inverse) to restore pre-gating behavior.

### Partial mitigation (not recommended — inconsistent state)
- Omit `curriculumLevel` on test generation API path → restores age-band assessments only on server; client UI gating would remain until web revert.

---

## 2. Revert Level Mapping (Old L6 → New L7)

### Forward behavior (current)
`migrateCurriculumLevel(6) → 7` in:
- `lib/phonics-curriculum/src/level-gating.ts`
- `artifacts/api-server/src/lib/phonicsCurriculumService.ts`
- `artifacts/kidschedule/src/lib/phonics-curriculum-filter.ts`

### Rollback action
Revert `migrateCurriculumLevel()` to pre-refactor mapping (or remove migration call in `rowToProgress`):

```typescript
// phonicsCurriculumService.ts — rollback example
currentLevel: row.currentLevel as CurriculumLevel,  // no migrateCurriculumLevel()
```

And revert `level-gating.ts` `migrateCurriculumLevel` function to identity or legacy map.

**Data impact:** Children stored at level 6 return to legacy semantics. No row updates needed.

---

## 3. Restore Previous Story Unlock Logic

### Forward behavior (current)
- `STORY_LEVEL_GATES` + `storyMeetsCurriculumGate()` in `story-catalog.ts`
- `getUnlockedStoriesV3()` applies level + mastery for auth/V2 stories

### Rollback action
Revert:
- `artifacts/kidschedule/src/lib/phonics-v3/content/story-catalog.ts`
- Related tests: `story-catalog.test.ts`, `story-validation.test.ts`

Pre-refactor behavior: stories unlocked primarily from mastery/family thresholds without unified curriculum tier gates.

**Client-only rollback insufficient** if API-driven story lists are added later; currently story catalog is client-side.

---

## 4. Restore Assessment Age-Band Fallback

### Forward behavior (current)
`generateDailyCurriculumQuestions` / `generateWeeklyCurriculumQuestions` return `[]` when filtered pool empty.

### Rollback action
Revert `artifacts/api-server/src/lib/phonicsTests.ts` to restore:

```typescript
// REMOVED in forward deploy — do not re-add without product approval
const pool = filtered.length > 0 ? filtered : contentRows;
```

Redeploy API only for assessment-only rollback; still revert web for consistent UX.

---

## 5. Mission System Rollback

Revert:
- `artifacts/kidschedule/src/lib/phonics-v3/adaptive-selector.ts`
- `artifacts/kidschedule/src/components/phonics-v2/DailyMissionPanel.tsx`
- `artifacts/kidschedule/src/components/phonics-journey-hub.tsx` (if hub mission summary changed)

Restores prior weak-pool seeding and hub duplicate mission display (if present in reverted commit).

---

## 6. Regression Tests After Rollback

After redeploying reverted code:

```bash
# Reverted tree may fail new tests — expected
pnpm --filter @workspace/api-server test -- src/lib/phonicsTests.test.ts
pnpm --filter @workspace/kidschedule test
```

Remove or skip `audit:phonics` from CI until forward fix re-lands.

---

## Rollback Verification Checklist

- [ ] L2 child receives daily test questions (age-band or curriculum — per reverted code)
- [ ] Karaoke shows default words if reverted (cat/hat/dog)
- [ ] Word Families visible below L3 if reverted
- [ ] Auth stories unlock at prior mastery-only thresholds
- [ ] No new 5xx on `/api/phonics/test/start`
- [ ] iOS/Android load expected bundle version

---

## Contacts / Ownership

| Area | Primary files |
|------|---------------|
| Curriculum engine | `lib/phonics-curriculum/` |
| API assessments | `artifacts/api-server/src/lib/phonicsTests.ts`, `routes/phonics.ts` |
| UI / missions | `artifacts/kidschedule/src/components/phonics-v2/`, `phonics-v3/` |
| Regression CI | `scripts/audit-phonics-curriculum.ts`, `pnpm run audit:phonics` |

---

## Related Documents

- [Migration Notes](./phonics-migration-notes.md)
- [Monitoring Checklist](./phonics-monitoring-checklist.md)
- [QA Signoff](./phonics-qa-signoff.md)
