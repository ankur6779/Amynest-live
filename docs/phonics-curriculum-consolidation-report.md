# Phonics Curriculum Consolidation — Implementation Report

Phase 4 implementation complete. Source of truth: `@workspace/phonics-curriculum` levels 1–7.

---

## 1. Updated Level Structure

| Level | Name | Owns |
|-------|------|------|
| **L1** | Letter Sounds | Single-letter phonemes |
| **L2** | CVC Decoding | All short-vowel CVC words (merged old L2 + L3 pools) |
| **L3** | Word Families | Family patterns only; reuses mastered L2 words |
| **L4** | Digraphs | sh, ch, th, wh, ck, ng (Digraph Pathway merged in) |
| **L5** | Consonant Blends | CCVC blend content (Blend Pathway merged in) |
| **L6** | CVCC | Four-letter CVCC words (new sub-level) |
| **L7** | Fluency & Stories | Sight words (the, and, is, it, to), sentences, stories |

**Migration:** `migrateCurriculumLevel()` maps old stored level 6 (fluency) → new level 7. Levels 1–5 unchanged.

---

## 2. Removed Duplicates

| Removed | Kept |
|---------|------|
| `CvcBlendingPracticeCard` in `phonics-learning.tsx` and `PhonicsV2.tsx` | Karaoke Blending (`phonics-v2-karaoke`) |
| Hub mission goal list (`buildAdaptiveMissionGoals`) | `DailyMissionPanel` (`#phonics-today-mission`) |
| Hub duplicate journey map (`PHONICS_JOURNEY_STAGES` horizontal strip) | `JourneyMapV2` in PhonicsV2 |
| `ParentInsightsCard` (V2) | `ParentInsightsV3Card` |
| `phonics-curriculum-dashboard.tsx` (never mounted) | `usePhonicsCurriculum` wired into mission flow |
| Empty anchors `#phonics-v2-stage-letters`, `#phonics-v2-sentences`, `#phonics-v2-cvc` | Stage scroll targets in `journey-stages.ts` |

---

## 3. Repositioned Topics

| Topic | Before | After |
|-------|--------|-------|
| Sight words (the, and, is, it, to) | Age band 4–5y | **L7 only** |
| CVC practice | Tiles + Karaoke + CvcBlendingPracticeCard | **Karaoke only** (tiles filtered by level) |
| Digraph pathway | Mastery avg ≥ 60% | **currentLevel ≥ 4 AND mastery ≥ 60%** |
| Blend pathway | Mastery avg ≥ 55% | **currentLevel ≥ 5 AND mastery ≥ 55%** |
| CVCC pathway | Mastery avg ≥ 55% | **currentLevel ≥ 6 AND mastery ≥ 55%** (after L5) |
| Daily mission source | Hub goals + V2 panel | **V3 adaptive mission only** |

---

## 4. New Unlock Logic

Implemented in `lib/phonics-curriculum/src/level-gating.ts`:

```typescript
isDigraphPathwayAvailable(level >= 4 && mastery >= 60)
isBlendPathwayAvailable(level >= 5 && mastery >= 55)
isCvccPathwayAvailable(level >= 6 && mastery >= 55)
```

Per-digraph thresholds (sh/ch 65%, th 70%, etc.) still apply after pathway unlock.

Client content visibility: `isContentUnlocked(symbol, currentLevel, type)` via `phonics-curriculum-filter.ts`.

---

## 5. New Assessment Logic

- **Daily tests:** `generateDailyCurriculumQuestions()` in `phonicsTests.ts` — question pool from `currentLevel` content when `curriculumLevel` is set on the API route.
- **Weekly tests:** Same curriculum-level routing when set.
- **Content ownership:** `lib/phonics-curriculum/src/content-ownership.ts` defines `introducedAt`, `reinforcedIn[]`, `assessedIn` per concept.

---

## 6. Migration Risks

| Risk | Mitigation |
|------|------------|
| Stored `currentLevel: 6` (old fluency) | `migrateCurriculumLevel()` → 7 on API read |
| V2 journey progress with old stage IDs (`blending_practice`, `reading_stories`) | New IDs (`cvc_decoding`, `fluency_stories`); old IDs ignored in progress calc |
| Hub mission state in localStorage | Hub reads V3 mission cache; no duplicate goal persistence |
| Children above unlocked level seeing tiles | Client-side `filterItemsByCurriculumLevel` before journey cap |
| API tests require DATABASE_URL | Run with `.env.development` loaded |

---

## 7. Files Modified

### New
- `lib/phonics-curriculum/src/content-ownership.ts`
- `lib/phonics-curriculum/src/level-gating.ts`
- `artifacts/kidschedule/src/lib/phonics-curriculum-filter.ts`
- `docs/phonics-curriculum-consolidation-report.md`

### Deleted
- `artifacts/kidschedule/src/components/phonics-curriculum-dashboard.tsx`

### Core curriculum
- `lib/phonics-curriculum/src/types.ts` — 7 levels
- `lib/phonics-curriculum/src/levels.ts` — L1–L7 definitions
- `lib/phonics-curriculum/src/index.ts` — exports
- `lib/phonics-curriculum/src/progression.ts` — max level 7
- `lib/phonics-curriculum/src/plan.ts` — L6 read_word, L7 sentences

### API
- `artifacts/api-server/src/lib/phonicsTests.ts` — curriculum daily/weekly generation
- `artifacts/api-server/src/lib/phonicsCurriculumService.ts` — level migration on read

### Content / pathways
- `artifacts/kidschedule/src/lib/phonics-content.ts` — sight words → 5_6y band
- `lib/phonics-sounds/src/curriculum-word-bank.ts` — blue, tree in blends
- `artifacts/kidschedule/src/lib/phonics-v2/content/journey-stages.ts` — 7 stages
- `artifacts/kidschedule/src/lib/phonics-v3/content/digraph-pathway.ts`
- `artifacts/kidschedule/src/lib/phonics-v3/content/blend-catalog.ts`
- `artifacts/kidschedule/src/lib/phonics-v3/content/cvcc-catalog.ts`
- `artifacts/kidschedule/src/lib/phonics-v3/content/digraph-adaptive.ts`
- `artifacts/kidschedule/src/lib/phonics-v3/content/blend-adaptive.ts`
- `artifacts/kidschedule/src/lib/phonics-v3/content/story-catalog.ts`
- `artifacts/kidschedule/src/lib/phonics-v3/adaptive-selector.ts`
- `artifacts/kidschedule/src/lib/phonics-v3/parent-insights-v3.ts`

### UI
- `artifacts/kidschedule/src/components/phonics-learning.tsx` — level filter, mission wiring
- `artifacts/kidschedule/src/components/phonics-v2/PhonicsV2.tsx` — single CVC surface, curriculum props
- `artifacts/kidschedule/src/components/phonics-v2/DailyMissionPanel.tsx` — canonical mission + `completeActivity`
- `artifacts/kidschedule/src/components/phonics-v2/DigraphPathwayPanel.tsx` — level-gated unlock
- `artifacts/kidschedule/src/components/phonics-v2/ParentInsightsV3Card.tsx`
- `artifacts/kidschedule/src/components/phonics-journey-hub.tsx` — summary mission, no duplicate map
- `artifacts/kidschedule/src/lib/phonics-journey-roadmap.ts` — 7-level completion divisor

### Tests
- `artifacts/kidschedule/src/lib/phonics-journey-roadmap.test.ts`
- `artifacts/kidschedule/src/lib/phonics-v3/content/digraph-certification.test.ts`

---

## Migration Notes for Deploy

1. **No DB schema migration required** — level migration is runtime via `migrateCurriculumLevel()`.
2. **Clear stale mission cache optional** — V3 missions regenerate daily; old hub goal state is unused.
3. **Verify production API** passes `curriculumLevel` on `/api/phonics/test/generate` daily route (already wired in `phonics.ts`).
4. **Parent-facing copy** in hub digraph lock message now references "Level 4".
