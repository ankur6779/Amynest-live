# Phonics Curriculum — Migration Notes

**For:** Deploy engineers, backend, mobile/web release  
**Schema migration required:** No  
**Data migration script required:** No

---

## Overview

The 7-level refactor is implemented as **runtime behavior + client/server logic changes**. Existing database rows are read through `migrateCurriculumLevel()` on API load. No column renames or data backfill jobs are required for deploy.

---

## Old Level 6 → New Level 7

### Background
Previously, **level 6** in stored progress could represent **fluency & stories** (the final stage). The canonical model now has **7 levels**, with fluency at **L7** and **CVCC at L6**.

### Runtime mapping

```typescript
// lib/phonics-curriculum/src/level-gating.ts
migrateCurriculumLevel(stored):
  1–5  → unchanged
  6    → 7   (old fluency → new L7 Fluency & Stories)
  7+   → clamped to 7
```

Applied on read in:
- `artifacts/api-server/src/lib/phonicsCurriculumService.ts` (`rowToProgress`)
- `artifacts/kidschedule/src/lib/phonics-curriculum-filter.ts` (`resolveCurriculumLevel`)

### What users see
- A child stored at `currentLevel: 6` (legacy fluency) is treated as **L7** for gating, UI, and assessments.
- **No automatic write-back** of `6 → 7` to the database on read; the mapping is applied in memory. Optional future backfill can normalize stored values without urgency.

### CVCC note
Children who were mid-journey on old level 6 expecting CVCC content should now be at **L6 (CVCC)** or **L7 (fluency)** depending on actual progress. Support should use displayed journey stage and mastery, not raw stored integer alone.

---

## No Data Loss Guarantees

| Data | Guarantee |
|------|-----------|
| `phonics_curriculum_progress.current_level` | Preserved as stored; mapped on read only |
| `phonics_curriculum_progress.mastery_score` | Unchanged |
| `phonics_curriculum_progress.weak_phonemes` | Unchanged |
| V3 mastery / fluency / retention (local + sync) | Unchanged schema; keys compatible |
| V2 journey progress (localStorage) | Old stage IDs ignored; new IDs used (`cvc_decoding`, `fluency_stories`) |
| Hub mission localStorage | Hub reads V3 mission cache; legacy goal state unused |
| Story progress | Unchanged |
| Test results | Unchanged |

**Nothing is deleted** by this deploy. Worst case: stale localStorage mission cache regenerates on next daily boundary.

---

## Story Unlock Behavior Changes

### Before
- Auth and V2 stories could unlock from **mastery alone** without curriculum level checks.
- Family requirements could block L2 stories even when mastery was sufficient.
- Default mission story fallback (`story-sam-hat`) could appear without gating.

### After
- Every story tier maps to `STORY_LEVEL_GATES`:

| Story tier | Required curriculum level | Min mastery |
|------------|---------------------------|-------------|
| 1 | L2 | 10 |
| 2 | L2 | 20 |
| 3 | L3 | 40 |
| 4 | L4 | 60 |
| 5 | L7 | 65 |

- Prefix stories: `dig-*` → L4, `blend-*` → L5, `cvcc-*` → L6 (+ pathway mastery).
- Family checks apply only when tier requires L3+.

### User-visible impact
- **L1 children** with high mastery: **fewer or zero** unlocked stories (correct).
- **L2 children** with low mastery (< 10): auth stories remain locked until mastery threshold met.
- **L2 children** with mastery ≥ 10: early auth stories unlock without family mastery at 50%.

---

## Assessment Behavior Changes

### Before
When curriculum filtering produced zero rows, generator could fall back to full age-band `contentRows`.

### After
When `curriculumLevel` is present on test generation:
- Pool = `filterRowsForCurriculumLevel(contentRows, level)` only.
- Empty pool → `[]` questions → API **409 `not_enough_content`**.

### User-visible impact
| Child level | Expected assessment behavior |
|-------------|------------------------------|
| L1 | Daily/weekly curriculum test may return **409** or empty — client should show friendly empty state |
| L2+ | Questions drawn only from level-appropriate symbols |
| Legacy clients without `curriculumLevel` | Age-band path unchanged (backward compatible API param) |

### API route
`POST /api/phonics/test/start` passes `curriculumLevel: curriculum?.currentLevel` when curriculum progress exists.

---

## Client Cache / OTA

| Platform | Action |
|----------|--------|
| **Web / Android WebView** | Deploy kidschedule bundle; auto on next load |
| **iOS Capacitor** | OTA or App Store build including updated `www/` bundle |
| **API** | Deploy api-server; no DB push required |

Optional: clear stale V3 mission cache is **not required** — missions regenerate daily.

---

## Deploy Sequence (Recommended)

1. Deploy **API server** first (migration-on-read active).
2. Deploy **web bundle** (gating UI + mission consolidation).
3. Run staging QA per [phonics-production-checklist.md](./phonics-production-checklist.md).
4. Monitor per [phonics-monitoring-checklist.md](./phonics-monitoring-checklist.md).

---

## Rollback Reference

See [phonics-rollback-plan.md](./phonics-rollback-plan.md) if staging/prod issues require reverting behavior.

---

## Related Documents

- [Release Notes](./phonics-release-notes.md)
- [QA Signoff](./phonics-qa-signoff.md)
