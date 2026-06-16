# Phonics Curriculum — QA Signoff Report

**Date:** 2026-06-16  
**Release:** 7-Level Phonics Curriculum Consolidation (Phases 4–7)  
**Automated gate:** `pnpm run audit:phonics` — **PASS**

---

## Executive Summary

Automated regression protection is green. P0 blocking issues from Phase 5 validation are resolved. The release is **approved for staging** pending manual QA walkthrough. Production promotion requires staging checklist sign-off.

---

## Automated Test Results

### Primary CI gate: `pnpm run audit:phonics`

| Component | Result |
|-----------|--------|
| Audit script (`scripts/audit-phonics-curriculum.ts`) | **PASS** |
| Vitest regression suite | **39 / 39 passed** |

### Vitest test files

| File | Focus |
|------|-------|
| `phonics-curriculum-invariants.test.ts` | L1–L7 gating, ownership, snapshots, client filter |
| `story-validation.test.ts` | Story metadata, requiredLevel, baseline symbol checks |
| `phase6-production-readiness.test.ts` | Journey simulation, L3 ownership, missions, stories |

### API unit tests

| Suite | Result |
|-------|--------|
| `artifacts/api-server/src/lib/phonicsTests.test.ts` | **78 passed**, 3 skipped (DB integration) |

Includes curriculum-specific cases:
- Daily test empty at L1 (no age-band fallback)
- Weekly test empty at L1
- Daily test filtered rows at L2

### Related tests (not in `audit:phonics` bundle)

| Suite | Notes |
|-------|-------|
| `adaptive-selector.test.ts` | Mission gating with seeded mastery |
| `story-catalog.test.ts` | Auth story level + mastery gates |
| `phonics-v2-mount.test.tsx` | PhonicsV2 mount with updated props |

---

## Audit Counts

| Metric | Count |
|--------|-------|
| Total audit findings (current) | **63** |
| Baselined finding keys | **63** |
| New blocking findings vs baseline | **0** |
| Duplicate concepts | 0 |
| Duplicate words | 0 |
| Level leaks | 0 |
| Ownership errors | 0 |
| Unreachable content (L7) | 0 |

**Baseline file:** `lib/phonics-curriculum/audit-baseline.json`

All 63 findings are **pre-existing orphan words** in `PHONICS_CURRICULUM_WORD_BANK` (audio/static catalog extras not listed in level `content` arrays). CI fails only on **new** orphans or leaks.

---

## Snapshot Counts

| Artifact | Count |
|----------|-------|
| Visible content snapshots | **7** (`visible-L1.json` … `visible-L7.json`) |
| Snapshot test assertions | **7** (one per level) |

Snapshot location: `lib/phonics-curriculum/src/snapshots/`

Example L2 visible words (excerpt): bat, bed, bus, can, cat, cup, dog, … (full list in snapshot file).

---

## Story Validation Baseline

| Metric | Count |
|--------|-------|
| Story symbol baseline entries | **199** |
| New symbol violations vs baseline | **0** |

**Baseline file:** `artifacts/kidschedule/src/lib/phonics-v3/story-symbol-baseline.json`

These are known cross-tier words in story prose (e.g. sight word *the* appearing in L4 digraph stories). CI fails only on **new** violations.

---

## Phase 5 → Phase 6 P0 Resolution

| P0 Issue | Status |
|----------|--------|
| Gate WordFamilyExplorer (L3+) | ✅ Resolved |
| Remove Karaoke hardcoded defaults | ✅ Resolved |
| Games Hub curriculum-only content | ✅ Resolved |
| Story unlock (level + mastery) | ✅ Resolved |
| Mission selector `isContentUnlocked()` | ✅ Resolved |
| Assessment no age-band fallback | ✅ Resolved |
| L3 owns families not CVC pool | ✅ Resolved |

---

## Manual QA Status

| Checklist | Status |
|-----------|--------|
| [phonics-production-checklist.md](./phonics-production-checklist.md) — L1 child | ⬜ Pending staging |
| L2 child | ⬜ Pending staging |
| L4 child | ⬜ Pending staging |
| L7 child | ⬜ Pending staging |

---

## Known Technical Debt (Non-Blocking)

1. **63 orphan words** in audio word bank — baselined; should be mapped or removed over time.
2. **199 story symbol cross-tier entries** — baselined; intentional readability scaffolding in decodable text.
3. **`content-ownership.ts`** — metadata exists; not wired to every runtime surface.
4. **`ParentInsightsCard.tsx`** — dead code with legacy fallback strings (unmounted).
5. **`WORD_FAMILIES` in adaptive-selector** — used for weak-family scoring only, not word pool seeding.
6. **Sparse missions at low mastery** — correct gating; may show fewer than 6 adaptive picks.
7. **Stored `currentLevel: 6` not written back as 7** — runtime mapping only.

---

## Remaining Non-Blocking Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| L1 users see 409 on daily test | Expected | Low — support macro | Empty-state UX; monitoring 409 rate |
| iOS OTA lag on old bundle | Medium | Medium | Verify Capacitor bundle version post-deploy |
| Android WebView cache | Low | Medium | Hard refresh / cache bust on deploy |
| Parent confusion on locked Word Families | Medium | Low | Lock card copy references L3 |
| Mission count < 6 at early levels | Expected | Low | Document in support FAQ |

---

## Signoff

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering (automated) | CI `audit:phonics` | 2026-06-16 | ✅ |
| QA (manual staging) | | | ⬜ |
| Product | | | ⬜ |

---

## Related Documents

- [Release Notes](./phonics-release-notes.md)
- [Migration Notes](./phonics-migration-notes.md)
- [Production Checklist](./phonics-production-checklist.md)
