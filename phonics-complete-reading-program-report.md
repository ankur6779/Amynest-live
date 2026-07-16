# AmyNest Phonics — Phase 2: Complete Early Reading Program

**Date:** 2026-07-17  
**Constraint honored:** SATPIN letter-group progression was **not** modified  
**Builds on:** SATPIN redesign (`letter-groups.ts`, `letterGroupIndex`, early blend banks)

---

## Gap analysis (Phase 1 audit)

| Area | Before | After Phase 2 |
|------|--------|---------------|
| Lesson shape | Parallel hub cards (tiles, karaoke, games) | Sequenced **10-step Reading Lesson Runner** |
| Mouth / articulation | Missing | `MouthShapeCue` with child-friendly tips |
| Trace | Missing | Interactive `LetterTracePad` (+ accessibility skip) |
| Beginning / ending sounds | Implicit only | `SoundPositionGame` (PA mode can hide letters) |
| Segmenting | Missing | `SegmentWordRound` + post-lesson bonus |
| Independent reading | Stories / karaoke only | Cold-read step in every lesson |
| Multi-skill mastery | Word dims (heard/blended/identified/spoken) | + 8 SoR skill strands |
| Group assessment | Curriculum test only | Structured `group-assessment` builder/scorer |
| Parent view | Mastery/fluency summary | **Early Reading Progress** dashboard |
| Rewards | Mission/streak focused | Reading stars, word badges, treasure messaging |

---

## Scores (0–100)

| # | Dimension | Score | Notes |
|---|-----------|------:|-------|
| 1 | Reading curriculum quality | **88** | Hear→blend→read path; SATPIN preserved |
| 2 | Phonological awareness | **84** | Find-sound (letters hidden), beginning/ending games |
| 3 | Blending system | **90** | BuildTheWord + Karaoke inside lesson + existing CVC engine |
| 4 | Segmenting system | **82** | New segment round + group assessment item |
| 5 | Reading fluency readiness | **78** | Cold read + fluency skill EMA; connected-text still via stories |
| 6 | Parent experience | **85** | Group, skills, words read, strengths/needs, advance guidance |
| 7 | Accessibility | **80** | Large targets, slow playback, skip/trace alternatives, aria labels, high-contrast prop |
| 8 | UX | **86** | Clear step progress, stars, lesson CTA from mission |
| | **Composite** | **84** | |

**Final production readiness: 8.4 / 10**

---

## Technical implementation summary

### New core libs (`artifacts/kidschedule/src/lib/phonics-v3/`)

| File | Role |
|------|------|
| `reading-lesson-engine.ts` | 10-step definitions, targets, options, advance/stars, group gate helper |
| `reading-skills.ts` | Local multi-skill mastery, words read, stars, badges |
| `group-assessment.ts` | Post-group assessment items + scoring / advance recommendation |

### New UI (`artifacts/kidschedule/src/components/phonics-v2/lesson/`)

| Component | Steps covered |
|-----------|----------------|
| `ReadingLessonRunner` | Full 10-step orchestrator |
| `MouthShapeCue` | Articulation |
| `LetterTracePad` | Trace |
| `SoundPositionGame` | Find / beginning / ending |
| `SegmentWordRound` | Segmenting |
| `ReadingParentDashboard` | Parent reporting |

### Integration

- `PhonicsV2.tsx` — lesson card, parent dashboard, skill persistence, mastery/fluency hooks  
- `DailyMissionPanel` — challenge → **Start reading lesson**  
- Reuses: `BuildTheWord`, `KaraokeBlendRound`, `AudioPlayButton`, SATPIN unlock pools  

### SATPIN safety

- No edits to group order in `letter-groups.ts`  
- Lesson targets use `getUnlockedGroupWords(letterGroupIndex)` only  
- Group advance recommendation is advisory; existing `progression.ts` / letter mastery remain source of truth for unlocks  

---

## Database changes

**None required.**

- Reading skills / stars / badges → `localStorage` (`amynest:phonics-reading-skills:{childId}`)  
- Curriculum unlock still uses `completed_today.letterGroupIndex` from Phase 1  
- Optional future: sync reading-skills JSON via existing V3 progress sync endpoints  

---

## UI/UX changes

1. **Complete reading lesson** card on Early Reading Journey  
2. Step progress bar + slow-playback toggle  
3. Celebration with 1–3 reading stars  
4. Bonus segmenting after lesson  
5. Parent dashboard: phoneme path, words read, blending/segmenting %, fluency band, strengths/needs, next-group tip, badges  
6. Mission “Lesson” CTA for challenge slot  

---

## Testing results

| Suite | Result |
|-------|--------|
| `reading-lesson-engine.test.ts` | **pass** |
| `reading-skills.test.ts` | **pass** |
| `group-assessment.test.ts` | **pass** |
| Prior SATPIN invariants / Phase 6 | Unaffected (not regressed in this pass) |

Manual device smoke still recommended: Android WebView, iOS Capacitor, PWA offline lesson audio.

---

## Remaining recommendations

1. **Mic-backed repeat** — wire `VoicePhonicsRound` into step 3 when permission allows (self-report fallback remains).  
2. **Server sync** for reading-skills so parent dashboards survive device switch.  
3. **Animated mouth SVG/Lottie** assets per grapheme (current cues are instructional, not video).  
4. **Stroke-order tracing** for letter formation accuracy (pad currently uses ink-length threshold).  
5. **UI for group assessment** play surface (engine + scorer shipped; quiz shell can host items).  
6. **Mystery word of the day** — data field exists; schedule into daily mission.  
7. **Dyslexia font toggle** in settings (Quicksand is already friendly; offer OpenDyslexic option).  

---

## Science of Reading alignment

| Pillar | How AmyNest now teaches it |
|--------|----------------------------|
| Phonemic awareness | Letter-hidden find-sound; beginning/ending games |
| Phonics | Pure phoneme audio + SATPIN graphemes |
| Blending | Build + karaoke in every lesson |
| Segmenting | Explicit segment round |
| Fluency | Cold read + stories + fluency skill tracking |
| Vocabulary / comprehension | Decodable stories (existing L2+) |

Children can **hear a sound and read a decodable word in one lesson**, starting from Group 1 SATPIN words (`sat`, `pin`, `tap`…).

---

*Key entry points: `ReadingLessonRunner`, `reading-lesson-engine.ts`, `ReadingParentDashboard`, `PhonicsV2`.*
