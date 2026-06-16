# Phonics Regression Strategy

Protects the 7-level curriculum architecture from future leaks, duplicate introductions, and assessment bypass.

---

## CI entry point

```bash
pnpm run audit:phonics
```

This runs:

1. **`scripts/audit-phonics-curriculum.ts`** — duplicate/orphan/level-leak/ownership audit vs baseline
2. **Vitest regression suite**:
   - `phonics-curriculum-invariants.test.ts`
   - `story-validation.test.ts`
   - `phase6-production-readiness.test.ts`

Add to pre-merge or staging pipeline alongside `pnpm run check:phonics-release-gate`.

---

## Baseline strategy

| Artifact | Path | Purpose |
|----------|------|---------|
| Audit baseline | `lib/phonics-curriculum/audit-baseline.json` | Known non-blocking findings (orphan words, etc.) |
| Story symbol baseline | `artifacts/kidschedule/src/lib/phonics-v3/story-symbol-baseline.json` | Known cross-tier words in story text |
| Visible snapshots | `lib/phonics-curriculum/src/snapshots/visible-L*.json` | Per-level content visibility |

**CI fails on:**
- New exact duplicates (`duplicate_concept`, `duplicate_word`)
- New orphan content
- New level leaks
- New story symbol violations
- Snapshot drift (unintentional visibility change)
- Any ownership validation error

**CI passes with baselined:**
- Pre-existing orphan words in audio bank
- Pre-existing sight words in lower-tier story prose

---

## Updating baselines (intentional curriculum change)

When a curriculum change is deliberate:

```bash
# Regenerate snapshots + baselines
pnpm run audit:phonics:artifacts

# Verify full gate passes
pnpm run audit:phonics
```

Commit updated snapshot/baseline files with the curriculum PR and document the change in the PR description.

---

## Module map

```
lib/phonics-curriculum/
  constants.ts          — SIGHT_WORDS, WORD_FAMILY_IDS, DIGRAPH_IDS
  level-gating.ts       — isContentUnlocked, requiredLevelForSymbol
  levels.ts             — PHONICS_CURRICULUM_LEVELS content arrays
  concept-registry.ts   — buildConceptRegistry, validateConceptOwnership
  visible-content.ts    — getVisibleContentSnapshot (L1–L7)
  audit.ts              — runPhonicsCurriculumAudit, diffAgainstBaseline

artifacts/kidschedule/
  phonics-curriculum-filter.ts   — client tile filtering
  phonics-curriculum-invariants.test.ts
  phonics-v3/story-validation.test.ts

scripts/
  audit-phonics-curriculum.ts
  generate-phonics-regression-artifacts.ts
```

---

## What to test when touching phonics

| Change type | Required checks |
|-------------|-----------------|
| New word in level content | `audit:phonics`, update snapshot if visibility changes |
| New story | `story-validation.test.ts`, symbol baseline if cross-tier words |
| Assessment logic | `phonicsTests.test.ts` curriculum tests |
| UI gating (Karaoke, Games, Families) | `phase6-production-readiness.test.ts` |
| `requiredLevelForSymbol` | Full `audit:phonics` + all invariant tests |

---

## Staging deployment recommendation

1. Run `pnpm run audit:phonics` locally — must pass.
2. Deploy API + kidschedule to staging.
3. Walk through [phonics-production-checklist.md](./phonics-production-checklist.md) for L1, L2, L4, L7.
4. Confirm daily test API returns 409 (not CVC questions) for L1 child with `curriculumLevel: 1`.
5. Promote to production after checklist sign-off.

---

## Remaining technical debt

- Orphan words in `PHONICS_CURRICULUM_WORD_BANK` should be mapped to owner levels or removed over time.
- Story prose contains L7 sight words before L7 unlock — acceptable as readability scaffolding; tracked in baseline.
- `content-ownership.ts` category metadata not yet wired to every UI surface at runtime.
- `ParentInsightsCard.tsx` dead code with legacy fallback strings (unmounted).

These do not block staging if `audit:phonics` passes.
