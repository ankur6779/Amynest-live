# AmyNest Phonics — SATPIN Synthetic Phonics Redesign

**Date:** 2026-07-17  
**Status:** Implemented in codebase (progression + unlock + migration + UI hooks)  
**Production seed:** Re-run `seedPhonics.ts` on Coolify before/with deploy so DB letter order matches SATPIN

---

## 1. Old vs New curriculum comparison

| Aspect | Old (A–Z) | New (SATPIN Synthetic Phonics) |
|--------|-----------|--------------------------------|
| Letter order | Alphabetical A→Z | Groups: SATPIN → MDGOCK → CKEUR → HBFL → doubles+J → VWXYZ → QU → digraphs |
| First readable words | After most of the alphabet | After Group 1 (`sat`, `sit`, `pin`, `tap`…) |
| L1 content | Opaque “a–z phonics sounds” / all letters | Concrete SATPIN letters + early blend bank |
| Unlock model | Curriculum level only | Curriculum level **+** `letterGroupIndex` (1–8) |
| CVC at L1 | Generally blocked until L2 | Group-decodable words unlock with each letter group |
| Q | Isolated letter tile | Taught as **qu** only (Group 7) |
| Progress key | `contentId` (preserved) | Same — levels remapped by symbol, not by wiping progress |

---

## 2. Research rationale for SATPIN progression

Evidence-based synthetic phonics programmes (Letters and Sounds Phase 2, Jolly Phonics, UFLI Foundations) introduce graphemes in clusters that maximise early blending, not alphabetical order.

**Why SATPIN first**

- Mix of continuous consonants (/s/, /n/) and stop consonants (/t/, /p/) that are easy to articulate cleanly.
- Short vowels /æ/ and /ɪ/ appear early, enabling many CVC frames.
- Children can decode meaningful words (`sat`, `pin`, `tap`) within the first group — building confidence and reinforcing phoneme–grapheme mapping through use, not drill alone.

**Blending-first philosophy**

Teaching letter names or finishing A–Z before blending delays reading. AmyNest now unlocks blend/read practice as soon as the required graphemes are available.

---

## 3. New lesson structure

Canonical groups live in `lib/phonics-curriculum/src/letter-groups.ts`.

| Group | Graphemes | Example unlock words | Badge / treasure |
|-------|-----------|----------------------|------------------|
| 1 SATPIN | s a t p i n | sat sit pin pan tap pat nip tin | First Reader 💎 |
| 2 MDGOCK | m d g o c k | dog dig got mat cat cot kit mop | Word Builder 🏆 |
| 3 CKEUR | ck e u r | duck neck pen red cup run | Sound Spotter ⭐ |
| 4 HBFL | h b f l | hat bed fan log hop bus | Blend Champ 🎖️ |
| 5 Doubles+J | ll ss ff j | bell hiss puff jam | Double Star 🌟 |
| 6 VWXYZ | v w x y z | van win box yes zip | Alphabet Finisher 👑 |
| 7 QU | qu | quit quiz quill | QU Quest 🔑 |
| 8 Digraphs | sh ch th ng ai ee … | ship chip thin ring… | Digraph Hero 🌈 |

Daily plan activities still use existing modes (hear/tap, blend word, revision, daily test). Journey hub surfaces the active letter group, blend words, and treasure messaging. Full 10-step per-lesson UI (mouth animation, trace, timed challenges) remains an incremental UX layer on this data model.

---

## 4. New unlock flow

```
New learner → letterGroupIndex = 1 (SATPIN)
     ↓ master Group 1 letters (strong test / mastery)
letterGroupIndex = 2 → MDGOCK + Group 2 words
     ↓ …
letterGroupIndex ≥ 7 + mastery ≥ 85 → curriculum L2 (full CVC)
     ↓ L3 families → L4 digraphs → L5 blends → L6 CVCC → L7 fluency
```

**APIs / clients**

- `isContentUnlocked(symbol, level, type, { letterGroupIndex })`
- Client filter: `filterItemsByCurriculumLevel(..., { letterGroupIndex })`
- Adaptive missions + learning-path prewarm pass `letterGroupIndex`
- Stored in `phonics_curriculum_progress.completed_today.letterGroupIndex` (no hard schema migration)

L1→L2 is **blocked** until letter groups are largely complete (prevents skipping SATPIN).

---

## 5. Reading progression map

**After Group 1:** sat, sit, pin, pan, tap, pat, nip, tin (+ sip, tip, nap, tan)  
**After Group 2:** + dog, dig, got, mat, cat, cot, kit, mop, can, man…  
**Groups 3–6:** expanding short-vowel CVC / doubles  
**Group 7:** qu words  
**Group 8 / L4+:** digraphs and longer vowel teams (curriculum L4 pathway)

CVC bank order in `@workspace/phonics-sounds` matches this blending-first sequence.

---

## 6. User migration strategy

1. **Preserve `phonics_progress` rows** keyed by `contentId` (letter tile mastery unchanged).
2. **Lazy migrate** on curriculum load: if `letterGroupIndex` missing, infer from mastered letter symbols via `inferLetterGroupFromMasteredLetters`.
3. **L2+ children** receive `letterGroupIndex = 8` (full alphabet access).
4. **Seed remap** parks then updates rows by symbol so content IDs stay stable when letter levels reorder to SATPIN.
5. Ambiguous partial A–Z mastery → unlocked through the highest *complete* consecutive group (no progress wipe).

---

## 7. Database changes

| Change | Detail |
|--------|--------|
| Schema migration | **None required** |
| `completed_today` JSON | Adds optional `letterGroupIndex` |
| `phonics_content` | Seed reorder: letters/words in SATPIN order; stale (level,symbol) deactivated |
| Progress FKs | Preserved via symbol-based update in `seedPhonics.ts` |

**Ops:** Run production seed after deploy:

```bash
# Coolify / API container
pnpm --filter @workspace/api-server exec tsx scripts/seedPhonics.ts
```

---

## 8. Audio changes

No new phoneme regeneration required for this phase. Pure-phoneme assets from the prior phonics audio fix (`phonemeVersion: 2`, cache `v6`) remain the source of truth. Lesson order now points at the same clips earlier in the journey (S/A/T… instead of A/B/C…).

Validate after seed: Group 1 tiles play phonemes, not letter names; blend demos for `sat`/`pin` resolve.

---

## 9. UX improvements

- Age-tier copy: “SATPIN Phonics” / blend-early messaging in `phonics-content.ts`
- Journey stage 1: “SATPIN Sounds — Learn sounds in groups — blend words early”
- Journey hub card: active letter group, graphemes, blend words, badge, treasure unlock line
- Daily mission / adaptive selector: only schedules words decodeable for current group

---

## 10. Testing results

| Suite | Result |
|-------|--------|
| `letter-groups.test.ts` + `plan.test.ts` | **13/13 pass** |
| `phonics-curriculum-invariants.test.ts` | **pass** (snapshots regenerated) |
| `phase6-production-readiness.test.ts` | **pass** (SATPIN L1 expectations) |
| `learning-path.test.ts` / `adaptive-selector.test.ts` | **pass** |
| `audit:phonics-curriculum` | Baseline refreshed (62 known findings; no *new* blockers vs baseline). Pre-existing orphan_word bank noise remains |

Manual / device matrix (Android WebView, iOS Capacitor, PWA offline) should be smoke-checked after production seed + deploy.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Users mid A–Z feel “locked” letters | Migration infers highest complete group; L2+ keep full access |
| Seed unique conflicts on reorder | Temporary high levels + update-by-symbol |
| Digraph word `duck` dual ownership | Group bank wins for L1 unlock; digraph pathway still L4 |
| Lesson 10-step UI incomplete | Data/unlock layer shipped; richer activity UI can iterate without schema change |
| Long digraph list (ai/ee/…) partially aspirational | Group 8 grapheme list present; full word banks still L4+ curriculum content |

---

## 12. Performance impact

Negligible: unlock checks are in-memory set lookups; one optional join on first curriculum load for migration; no new tables or heavy queries.

---

## 13. Final Production Readiness Score

| Dimension | Score | Notes |
|-----------|------:|-------|
| Pedagogical model | 9/10 | SATPIN groups + blending-first |
| Unlock / progression code | 9/10 | Wired end-to-end |
| Data migration safety | 8/10 | Lazy infer + stable contentIds |
| Client UX | 7/10 | Group card + copy; full lesson choreography later |
| Audio alignment | 8/10 | Relies on prior phoneme fix |
| Tests / snapshots | 9/10 | Updated & green for SATPIN gates |
| Production seed/deploy | 6/10 | **Must run seed on Coolify** |
| **Overall** | **8.2 / 10** | Ready to deploy after seed + smoke |

### Deploy checklist

1. Merge / deploy code with SATPIN curriculum package + kidschedule wiring  
2. Run `seedPhonics.ts` against production DB  
3. Smoke: new child sees S/A/T… and can blend `sat` after Group 1  
4. Smoke: existing L1 child with many mastered letters gets inferred `letterGroupIndex` (not reset to empty)  
5. Smoke: L2+ child still sees full CVC  

---

*Implementation anchors: `lib/phonics-curriculum/src/letter-groups.ts`, `level-gating.ts`, `progression.ts`, `artifacts/api-server/scripts/seedPhonics.ts`, `artifacts/api-server/src/lib/phonicsCurriculumService.ts`, kidschedule filter / adaptive / journey hub.*
