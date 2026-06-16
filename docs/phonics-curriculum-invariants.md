# Phonics Curriculum Invariants

Canonical rules enforced by automated tests and `pnpm run audit:phonics`.  
Source of truth: `@workspace/phonics-curriculum` (`level-gating.ts`, `levels.ts`, `concept-registry.ts`).

---

## Level ownership

| Level | Name | Owns |
|-------|------|------|
| L1 | Letter Sounds | a–z phonemes |
| L2 | CVC Decoding | Full CVC word pool |
| L3 | Word Families | Family ids (`at`, `an`, …), `pattern:*` entries |
| L4 | Digraphs | Explicit `DIGRAPH_WORD_IDS` vocabulary |
| L5 | Consonant Blends | `BLEND_WORD_IDS` |
| L6 | CVCC | `CVCC_WORD_IDS` |
| L7 | Fluency & Stories | Sight words + fluency sentences |

**L3 must not own the full CVC pool** — only family patterns and anchor words (introduced at L2).

---

## Gating invariants

1. **No content above unlocked level**  
   `isContentUnlocked(symbol, currentLevel)` must be false when `requiredLevelForSymbol(symbol) > currentLevel`.

2. **Word Families** — unavailable below L3 (`at`, `an`, `pattern:at`, etc.).

3. **Digraphs** — unavailable below L4 (explicit word set, not substring matching).

4. **Blends** — unavailable below L5; pathway requires mastery ≥ 55%.

5. **CVCC** — unavailable below L6; pathway requires mastery ≥ 55%.

6. **Sight words** — unavailable below L7.

7. **Assessments** — when `curriculumLevel` is set on test generation, **never fall back** to unfiltered age-band rows. Empty pool → empty question set (API may return 409).

---

## Story invariants

1. Every story has a **requiredLevel** derived from:
   - `STORY_LEVEL_GATES[story.level]` for auth/V2 stories, or
   - Prefix: `dig-*` → L4, `blend-*` → L5, `cvcc-*` → L6

2. Unlock requires **both**:
   - `currentLevel >= requiredCurriculumLevel`
   - `masteryScoreAvg >= masteryMin`

3. Family prerequisite check applies only when `requiredCurriculumLevel >= 3`.

4. Story symbol violations above tier are **baselined** — CI fails only on **new** violations.

---

## Ownership registry

Each concept record:

```typescript
{
  ownerLevel: CurriculumLevel;
  reinforcementLocations: ReinforcementSurface[];
  assessmentLocation: AssessmentSurface[];
}
```

Validation rules (`validateConceptOwnership()`):

- Exactly one owner per concept id
- Every concept has ≥ 1 assessment path
- Every concept has ≥ 1 reinforcement surface
- Registry owner matches `requiredLevelForSymbol()` gating

---

## Snapshot invariants

Committed snapshots at `lib/phonics-curriculum/src/snapshots/visible-L{1-7}.json` define expected visible letters, words, patterns, sentences, and pathway flags per level.  
Changes require intentional snapshot update via `pnpm run audit:phonics:artifacts`.

---

## Test locations

| Invariant | Test file |
|-----------|-----------|
| Level gating L1–L7 | `artifacts/kidschedule/src/lib/phonics-curriculum-invariants.test.ts` |
| Ownership registry | same + `concept-registry.ts` |
| Visible snapshots | same |
| Story metadata | `artifacts/kidschedule/src/lib/phonics-v3/story-validation.test.ts` |
| Journey simulation | `artifacts/kidschedule/src/lib/phonics-v3/phase6-production-readiness.test.ts` |
| Assessment no-fallback | `artifacts/api-server/src/lib/phonicsTests.test.ts` |
| Audit duplicates/orphans | `scripts/audit-phonics-curriculum.ts` |

---

## Known baselined exceptions

- **Orphan words** in `PHONICS_CURRICULUM_WORD_BANK` not listed in level `content` arrays (audio/static catalog extras) — tracked in `audit-baseline.json`, fail only on new orphans.
- **Story sight words** (e.g. `the` in L4 digraph stories) — tracked in `story-symbol-baseline.json`, fail only on new violations.

Do not add to baselines without team review.
