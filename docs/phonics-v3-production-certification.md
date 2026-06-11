# Phonics V3 Elite — Production Certification Audit

**Date:** 2026-06-11  
**Auditor:** Automated + code review (`production-certification-audit.test.ts`)  
**Verdict:** **FAIL** — does not meet 9.5+ threshold; progress-loss scenarios confirmed.

---

## Certification Gate

| Gate | Requirement | Result |
|------|-------------|--------|
| Overall score | ≥ 9.5/10 | **7.6/10** |
| Progress-loss | None | **FAIL** — 6 confirmed loss scenarios |
| PASS | Both above | **FAIL** |

---

## Audit Findings (10 criteria)

### 1. Story uniqueness (150+ genuinely unique, not template variants)

**Result: FAIL (educational uniqueness)**

| Metric | Value | Evidence |
|--------|-------|----------|
| Story count | ≥ 150 | `story-catalog.test.ts` passes |
| Duplicate bodies | 0 | IDs deduped; full text bodies are distinct |
| Structural templates | **~78%** line-1 template match | `story-catalog.ts` generators: `I see a {word}`, `It is a {word}`, `{name} {verb}`, `{a} and {b}`, etc. |

**Conclusion:** Count target met; **content is combinatorial template expansion**, not 150+ authored narratives. Same pedagogical experience with swapped CVC tokens.

---

### 2. Phonics coverage matrix

**Result: PARTIAL PASS**

| Category | Catalog coverage | V3 UX exposure |
|----------|------------------|----------------|
| Letters (A–Z) | 26 (`LETTER_SOUNDS`) | V1/V2 tiles |
| Digraphs | 7 audio keys (`sh`, `ch`, `th1`, `th2`, `wh`, `ng`, `ck`) | Pathway panel only |
| Blends | 20 (`BLEND_IDS`) | Library only — **not in V3 journey** |
| CVC | 33 (`CVC_WORDS`) + curriculum bank | Core path |
| CVCC | **2** words in catalog (`buildCurriculumWordBankEntries`) | **Not taught in V3** |
| CCVC | **0** | **Missing** |
| High-frequency / sight | 8 (`SIGHT_WORD_IDS`) | Library only — **not gated in V3 stories** |

**Conclusion:** Audio library is broader than V3 teaches. V3 stories use CVC families only; digraph/blend/sight words are under-exposed.

---

### 3. Mastery inflation (repeated tapping / guessing)

**Result: FAIL (partial inflation vectors)**

`recordMasteryEvent` in `mastery-engine.ts` **always increments** counts with no per-session cap, cooldown, or correctness gate:

```146:171:artifacts/kidschedule/src/lib/phonics-v3/mastery-engine.ts
export function recordMasteryEvent(
  state: PhonicsMasteryState,
  type: MasteryTargetType,
  id: string,
  dimension: MasteryDimension,
): PhonicsMasteryState {
  // ...
  const counts = { ...existing.counts, [dimension]: existing.counts[dimension] + 1 };
```

| Vector | Inflatable? | Detail |
|--------|-------------|--------|
| `heard` | Score capped, counts unbounded | Family tile tap → `heard` every click (`PhonicsV2.tsx`) |
| `blended` | **Yes** | `KaraokeBlendRound` `onComplete` on every blend replay — no success check |
| `identified` | **Yes** | Karaoke complete passes `mastered ? "identified"` without quiz (`WordFamilyExplorer.tsx:151`) |
| `spoken` | Partially protected | Requires `usePhonicsVoiceRound` + speech-coach evaluation |

Score formula caps each dimension at threshold (`min(1, count/need)`), so **score plateaus** after 3/3/3/2 — but **band/history still update**, and `identified`/`blended` reach thresholds without verifying reading accuracy.

---

### 4. Mastery decay on retention failure

**Result: FAIL — not implemented**

No `decay`, `retentionCheck`, or `applyMasteryDecay` in `mastery-engine.ts` or anywhere under `phonics-v3/`. Once a dimension threshold is met, mastery **never regresses**.

---

### 5. Spaced repetition (1d, 3d, 7d, 14d, 30d)

**Result: FAIL — not implemented**

`adaptive-selector.ts` uses a **single daily** weak/review/new mix (70/20/10). No per-skill `nextReviewAt`, no interval schedule, no SM-2/Leitner. V1 `phonics-journey-adaptive.ts` has review tiers but is **not wired to V3 mastery records**.

---

### 6. Fluency survives logout / browser reset / device change

**Result: FAIL**

`fluency-tracker.ts` and `mastery-engine.ts` use **localStorage only**:

- `amynest:phonics-v3-fluency:{childId}`
- `amynest:phonics-v3-mastery:{childId}`

No API read/write, no merge on login, no IndexedDB backup beyond audio cache.

**Confirmed progress-loss scenarios:**

1. Browser “Clear site data” → total loss of mastery, fluency, missions, story completion
2. New device / fresh install → empty state
3. Logout + storage eviction (mobile WebView pressure) → loss
4. Incognito session end → loss
5. `childId` profile switch → separate keys, no cross-profile migration
6. Parent views insights on Device B → stale/empty vs Device A

---

### 7. Server-side persistence (mastery, fluency, missions, stories)

**Result: FAIL for V3**

| Data | Client storage | Server table | V3 sync? |
|------|----------------|--------------|----------|
| V3 mastery dimensions | localStorage | — | **No** |
| V3 fluency / streaks | localStorage | — | **No** |
| Daily missions | `amynest:phonics-v2-mission:` | — | **No** |
| Story completion | fluency local counters only | — | **No** |
| V1 play counts | API | `phonics_progress` | Yes (V1 only) |
| Curriculum level | API | `phonics_curriculum_progress` | Yes (aggregate score, not V3 dimensions) |

---

### 8. Offline cache graceful recovery

**Result: CONDITIONAL PASS**

**Strengths:** `phonics-static-audio.ts` fails safe — returns `phonics_library_missing`, does **not** fall back to Amy lesson TTS in phonics mode.

**Weaknesses:** `offline-cache.ts` prefetches **caps** (40 phonemes, 40 CVC, 15 story lines). Missing assets surface as silent playback failure + toast, not automatic retry queue or progressive download. Estimated coverage is formula-based (~90%), not measured cache hit rate.

---

### 9. Every digraph: stories, audio, assessment, practice loops

**Result: FAIL**

| Digraph | Audio (library) | V3 story | Assessment | Practice loop |
|---------|-----------------|----------|------------|---------------|
| sh | ✓ | **0** | **No** | Word buttons → karaoke only |
| ch | ✓ | **0** | **No** | Same |
| th | ✓ (th1/th2) | **0** | **No** | Same |
| wh | ✓ | **0** | **No** | Same |
| ck | ✓ | **0** | **No** | Same |
| ng | ✓ | **0** | **No** | Same |

`story-catalog.ts` generates from CVC `WORD_FAMILIES` only — **zero** decodable digraph stories. `DigraphPathwayPanel` has no `VoicePhonicsRound`, no missions, no stories.

---

### 10. Stress test — 1000 children × 90 days

**Result: PASS (compute only)**

| Metric | Value |
|--------|-------|
| Simulated children | 1,000 |
| Simulated days | 90 |
| Wall time | **< 1s** (in-process, no I/O) |
| Total mastery events | > 100,000 |

**Caveat:** Simulation uses in-memory state only. Does **not** test localStorage quota, API load, or audio pipeline under concurrency.

---

## Composite Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Production readiness** | **7.8/10** | Audio fail-safe solid; persistence, digraph completeness, and offline depth block production certification |
| **Learning effectiveness** | **7.4/10** | Multi-dimensional mastery model is sound in theory; no decay, no spaced rep, gameable blend/identify paths undermine outcomes |
| **Retention (long-term)** | **6.6/10** | Progress-loss on device/browser change; no retention checks; template stories reduce re-read value |
| **Parent satisfaction** | **8.0/10** | V3 insights card is actionable; ephemeral data and no cross-device report erode trust |
| **Weighted overall** | **7.6/10** | Educational/retention gaps dominate |

---

## Remaining Blockers to 9.5+

1. **Server persistence** for V3 mastery, fluency, missions, per-story completion (with merge on login).
2. **Mastery decay** + retention-check failures reducing dimension counts or scores.
3. **Spaced repetition engine** with 1/3/7/14/30d per-skill scheduling.
4. **Anti-inflation guards** — session caps, correctness gates for `blended`/`identified`, cooldowns.
5. **Authored or semantically diverse stories** — replace template combinatorics for ~60%+ of catalog.
6. **Digraph complete loop** — stories + voice assessment + missions per digraph.
7. **CVCC/CCVC + sight-word integration** in V3 progression and stories.
8. **Progress-loss elimination** — cloud sync must survive browser reset and device change.

---

## Exact Files Requiring Changes

### Persistence & API
- `lib/db/src/schema/phonics_v3_progress.ts` *(new)* — mastery, fluency, missions, story JSON
- `lib/db/migrations/00xx_phonics_v3_progress.sql` *(new)*
- `artifacts/api-server/src/routes/phonics.ts` — GET/PATCH v3 progress endpoints
- `artifacts/kidschedule/src/lib/phonics-v3/mastery-engine.ts` — sync hooks, decay
- `artifacts/kidschedule/src/lib/phonics-v3/fluency-tracker.ts` — sync hooks
- `artifacts/kidschedule/src/lib/phonics-v2/daily-missions.ts` — server backup
- `artifacts/kidschedule/src/hooks/use-phonics-data.ts` — hydrate v3 from API on load

### Mastery integrity
- `artifacts/kidschedule/src/lib/phonics-v3/mastery-engine.ts` — caps, decay, retention checks
- `artifacts/kidschedule/src/lib/phonics-v3/spaced-repetition.ts` *(new)* — interval scheduler
- `artifacts/kidschedule/src/lib/phonics-v3/adaptive-selector.ts` — consume spaced-rep queue
- `artifacts/kidschedule/src/components/phonics-v2/KaraokeBlendRound.tsx` — gate `onComplete` on successful blend
- `artifacts/kidschedule/src/components/phonics-v2/PhonicsV2.tsx` — stop unguarded `recordMasteryEvent` calls

### Stories & coverage
- `artifacts/kidschedule/src/lib/phonics-v3/content/story-catalog.ts` — authored stories, digraph stories
- `artifacts/kidschedule/src/lib/phonics-v3/content/digraph-pathway.ts` — tie to stories/games
- `lib/phonics-sounds/src/curriculum-word-bank.ts` — CVCC/CCVC words
- `lib/phonics-sounds/src/cvc.ts` — CCVC/CVCC entries if needed

### Digraph loop
- `artifacts/kidschedule/src/components/phonics-v2/DigraphPathwayPanel.tsx` — voice round, stories
- `artifacts/kidschedule/src/components/phonics-v2/VoicePhonicsRound.tsx` — digraph assessment mode

### Offline
- `artifacts/kidschedule/src/lib/phonics-v3/offline-cache.ts` — uncapped progressive prefetch + retry
- `artifacts/kidschedule/src/lib/phonics-static-audio.ts` — user-visible recovery UX

### Certification
- `artifacts/kidschedule/src/lib/phonics-v3/production-certification-audit.test.ts` — keep as regression gate

---

## Evidence Commands

```bash
# Automated certification (expect failures until blockers resolved)
pnpm --filter @workspace/kidschedule exec vitest run \
  src/lib/phonics-v3/production-certification-audit.test.ts

# Story count
pnpm --filter @workspace/kidschedule exec vitest run \
  src/lib/phonics-v3/content/story-catalog.test.ts -t "150"
```

---

## Final Certification Statement

**Phonics V3 Elite is NOT certified for production** at the 9.5+ bar.

The system delivers a credible **client-side prototype** of mastery tracking, adaptive missions, and parent insights, but **fails certification** on:

- Template-dominated story catalog (not educationally unique)
- No mastery decay or spaced repetition
- Gameable mastery dimensions
- **Definitive progress-loss** on browser reset and device change
- Incomplete digraph instructional loop
- No server persistence for V3 state

**Re-audit when:** server sync ships, spaced-rep + decay land, digraph loop complete, and `production-certification-audit.test.ts` passes 10/10.
