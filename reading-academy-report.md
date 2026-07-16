# AmyNest Reading Academy — Phase 4 Production Report

**Date:** 2026-07-17  
**Scope:** World-class early reading layer on existing SATPIN + 10-step lessons + AI Reading Coach  
**Constraint compliance:** SATPIN curriculum unchanged · AI Reading Coach preserved · no phonics redesign

---

## 1. Reading Academy architecture

```
Listening → Phonemic Awareness → Phonics (SATPIN) → Blending
    → Words → Sentences → Stories → Fluency → Independence
```

| Layer | Role | Location |
|-------|------|----------|
| SATPIN + mastery | Unchanged unlock source of truth | `lib/phonics-curriculum`, phonics-v3 mastery |
| 10-step lesson + coach | Hear → say → AI score (unchanged) | `ReadingLessonRunner`, `AiPronunciationCoach` |
| Academy levels | Milestone framing (not a second curriculum) | `reading-academy-levels.ts` |
| Decodable library | Progressive books gated by letter group | `decodable-books.ts` |
| Companion | Page transcript analysis, sparse nudges | `reading-companion.ts` + book reader |
| Fluency / vocab / quiz | Metrics + review + comprehension | `reading-fluency-academy`, `reading-vocabulary`, `reading-comprehension` |
| Adaptive path | Personalised next book / practice type | `reading-adaptive-path.ts` |
| Achievements + parent report | Meaningful milestones + weekly summary | `reading-achievements`, `parent-weekly-report` |
| Teacher mode | Feature-flagged stubs | `teacher-mode.ts` (`TEACHER_MODE_ENABLED = false`) |
| UX hub | Library, levels, report UI | `ReadingAcademyHub` in PhonicsV2 |

Persistence is local-first (`localStorage` per child) for academy progress, fluency samples, vocab, and achievements — offline-friendly and non-regressive for existing sync paths.

---

## 2. Reading level framework

Seven milestone levels (UI framing layered on curriculum + evidence):

| Level | Name | Typical evidence |
|-------|------|------------------|
| 1 | Learning Sounds | New reader / early SATPIN |
| 2 | Building Words | Words read or blending ≥ 40 |
| 3 | Reading Words | ≥ 5 words + blend/group |
| 4 | Reading Sentences | ≥ 12 words, group ≥ 2 |
| 5 | Reading Short Stories | ≥ 2 stories (or cur≥3 + words) |
| 6 | Reading Books | cur≥4 + ≥ 4 stories |
| 7 | Reading Fluently | cur≥6 + ≥ 8 stories + ≥ 80 words |

`resolveReadingAcademyLevel` is pure and never mutates SATPIN unlocks.

---

## 3. Book generation strategy

Hand-authored progressive library (Science of Reading — decodable only):

1. **Pat Sat** (Group 1) — SATPIN-only opener  
2. **Sam Sat** (Group 2) — introduces /m/  
3. **Pat and the Cat** (Group 2)  
4. **The Big Dog** (Group 2)  
5. **Fun at the Pond** (Group 3)  
6. **The Lost Hat** (Group 4)  
7. **The Red Bus** (Group 4)

Unlock rule: `minLetterGroup ≤ letterGroupIndex`.  
Every page word is validated with `validateBookDecodability` (+ high-frequency glue: a, is, the, and, can, had, …).  
No auto-generated free text that could introduce untaught graphemes.

---

## 4. AI Reading Companion design

- Operates on **transcripts only** (no raw audio storage).  
- Detects: skip, substitute, repeat, hesitation, weak pronunciation confidence.  
- Nudges are sparse; strong pages celebrate without interrupt (`nudge: null`).  
- Integrated per page via existing `AiPronunciationCoach` (`targetKind: "phrase"`).  
- Soft issues capped to one nudge so Amy stays a buddy, not a drill sergeant.

---

## 5. Fluency scoring methodology

Per session sample: word count, duration → **WPM**, accuracy %, pause count, self-corrections.  
Expression proxy: accuracy × (1 − pause rate).  
Band via existing `fluencyBandFromMetrics` (emerging → advanced).  
Trend: rolling average of last 20 samples (WPM, accuracy, expression).

---

## 6. Vocabulary system

Each book introduces 2–3 child-friendly cards (emoji, definition, example).  
`introduceBookVocabulary` on complete; spaced review via strength + 2-day due window.  
Parent report surfaces `vocabularyGrowth` totals.

---

## 7. Comprehension engine

Post-story quiz from book prompts (who / what / sequence / picture / feeling).  
Difficulty adapts: easy → medium → hard from recent score average.  
Scored as % correct; stored on academy progress for adaptive path.

---

## 8. Parent reporting enhancements

`buildParentWeeklyReport` + hub UI (“Weekly parent report”):

- Reading level name  
- Stories / words  
- Pronunciation & fluency trends  
- Comprehension score  
- Vocabulary growth  
- Recommended home activities (encouraging, no streak shame)

Coexists with existing `ReadingParentDashboard` / coach report.

---

## 9. Accessibility review

| Need | Support |
|------|---------|
| Beginning / slow readers | Slow playback toggle; shorter-book adaptive preference |
| Speech delays | Skip coach; continue without mic; gentle companion |
| Dyslexia-friendly | Large Quicksand display text; tracking widen on slow |
| Touch | Large page / quiz targets (min ~48px) |
| Replay | Coach retry + page continue |
| Offline | localStorage progress; assets via existing phonics offline pack |
| Low bandwidth | Text-first pages; no heavy media required |

---

## 10. Performance impact

- Hub is a single Card; books lazy-open into reader (no prefetch of all stories).  
- Fluency samples capped (120).  
- No new network calls for academy core.  
- Android WebView / iOS Capacitor / PWA: same kidschedule bundle — no native regression surface.

---

## 11. Test results

```
vitest run src/lib/phonics-v3/reading-academy.test.ts
→ 17 passed
```

Also green (regression check): `ai-reading-coach`, `reading-lesson-engine`, `reading-skills`.

Covered: level resolution, book unlock, decodability, companion, fluency WPM, vocab review, comprehension adaptivity, adaptive path (no locked books), achievements, weekly report, teacher flag off, progress mark-complete.

---

## 12. Remaining opportunities

1. Cloud sync of academy progress alongside phonics-v3 mastery sync  
2. Expand library to 20–40 books with illustration assets  
3. Continuous listening across a whole page (not only push-to-talk coach)  
4. Enable Teacher Mode flag + classroom API  
5. Parent PDF/email weekly digest  
6. Expression scoring from prosody once STT/prosody signals available  
7. Explicit migration banner for children with prior story completions → academy achievements

---

## 13. Final Production Readiness Score

| Area | Score |
|------|------:|
| Architecture & SoR alignment | 92 |
| Levels + unlock integrity | 90 |
| Books + decodability | 88 |
| Companion + coach coexistence | 85 |
| Fluency / vocab / comprehension | 86 |
| Parent report + achievements | 84 |
| Accessibility / performance | 82 |
| Tests & non-regression | 90 |
| Teacher mode (stub) | 70 |

### **Overall: 86 / 100**

Ready for staged production as an additive Reading Academy layer. SATPIN and AI Reading Coach remain authoritative; academy books and milestones deepen the journey without replacing phonics instruction.
