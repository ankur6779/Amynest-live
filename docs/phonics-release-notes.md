# Phonics Curriculum — Release Notes

**Release:** Phonics 7-Level Curriculum Consolidation  
**Scope:** API server, kidschedule web (iOS Capacitor bundle), Android WebView (loads production web)  
**Audience:** Product, engineering, support, QA

---

## Summary

AmyNest phonics now follows a single canonical **7-level progression** with unified gating, assessments, missions, and story unlocks. Duplicate surfaces were removed; content visibility is enforced by curriculum level rather than age band alone.

---

## Curriculum Architecture Changes

### Before
- Overlapping 6-level model with duplicate CVC surfaces (tiles, Karaoke, standalone blending card).
- Hub and V2 each maintained separate mission goal lists and journey maps.
- Word Families, Karaoke, and Games Hub could show content above the child's stored level.
- L3 `levels.ts` duplicated the full CVC word pool.
- Assessments could fall back to age-band content when curriculum filtering yielded an empty pool.

### After
- **`@workspace/phonics-curriculum`** is the single source of truth for levels 1–7.
- Client filtering via `phonics-curriculum-filter.ts` and server filtering via `level-gating.ts` / `phonicsTests.ts`.
- One mission surface: **V3 adaptive daily mission** (`DailyMissionPanel`).
- One journey map: **`JourneyMapV2`** in Phonics V2.
- L3 owns **family patterns only** (not the full CVC pool).

---

## New 7-Level Progression

| Level | Name | Content |
|-------|------|---------|
| **L1** | Letter Sounds | a–z phonemes |
| **L2** | CVC Decoding | Full CVC word pool |
| **L3** | Word Families | Family ids + `pattern:*` (anchor words remain L2) |
| **L4** | Digraphs | Explicit digraph vocabulary |
| **L5** | Consonant Blends | CCVC blend words |
| **L6** | CVCC | Four-letter CVCC words |
| **L7** | Fluency & Stories | Sight words + fluency sentences |

Pathway unlocks (in addition to level):
- Digraph pathway: L4 + mastery ≥ 60%
- Blend pathway: L5 + mastery ≥ 55%
- CVCC pathway: L6 + mastery ≥ 55%

---

## Story Gating Improvements

- **Auth stories** and **migrated V2 stories** use `STORY_LEVEL_GATES` — unlock requires **both** curriculum level and mastery threshold.
- Digraph (`dig-*`), blend (`blend-*`), and CVCC (`cvcc-*`) stories use prefix-based level gates.
- Family prerequisite checks apply only when story tier requires L3+.
- L1 children with high mastery no longer receive premature story unlocks.

---

## Assessment Improvements

- **Daily** and **weekly** tests route through `generateDailyCurriculumQuestions` / `generateWeeklyCurriculumQuestions` when `curriculumLevel` is set on the API request.
- Removed fallback: `filtered.length > 0 ? filtered : contentRows` — no age-band top-up.
- Empty filtered pool → **empty question set**; API returns **409 `not_enough_content`** (not mixed age-band questions).
- Weekly tests use 40/30/30 curriculum mix (current / previous / weak).

---

## Mission System Consolidation

- Removed duplicate hub mission goal list; **DailyMissionPanel** is canonical.
- Adaptive mission generation uses **`isContentUnlocked()`** and respects `currentLevel`.
- Removed direct `WORD_FAMILIES` flatMap for weak-word pool seeding and cat-based fallbacks.
- Story tasks only appear when a unlocked `missionStoryId` is provided.

---

## UI Surface Changes

| Surface | Change |
|---------|--------|
| **WordFamilyExplorer** | Locked below L3 with explicit lock card |
| **Karaoke** | Initializes from first curriculum-filtered word; hidden when pool empty |
| **PhonicsGamesHub** | Uses `practiceWords` only; renders null when empty |
| **CvcBlendingPracticeCard** | Removed (Karaoke is sole CVC practice surface) |
| **phonics-curriculum-dashboard** | Deleted (never mounted) |
| **ParentInsightsCard (V2)** | Superseded by ParentInsightsV3Card |

---

## Regression Protection (Phase 7)

New CI gate:

```bash
pnpm run audit:phonics
```

Includes:
- Curriculum invariant tests (L1–L7 gating)
- Ownership validation (`concept-registry.ts`)
- L1–L7 visible content snapshots
- Story validation CI
- Duplicate/orphan/level-leak audit vs committed baseline

Documentation:
- [phonics-curriculum-invariants.md](./phonics-curriculum-invariants.md)
- [phonics-regression-strategy.md](./phonics-regression-strategy.md)
- [phonics-production-checklist.md](./phonics-production-checklist.md)

---

## Support / Parent-Facing Notes

- Children at **L1** may see **fewer missions** and **no daily test questions** until they advance — this is expected gating, not a bug.
- **Word Families** unlock at Level 3 after CVC decoding.
- Digraph pathway copy references **Level 4** (not legacy stage names).
- Stored level **6** (old fluency) displays and behaves as **Level 7** automatically.

---

## Related Documents

- [Migration Notes](./phonics-migration-notes.md)
- [QA Signoff](./phonics-qa-signoff.md)
- [Rollback Plan](./phonics-rollback-plan.md)
- [Monitoring Checklist](./phonics-monitoring-checklist.md)
