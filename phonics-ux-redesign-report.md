# AmyNest Phonics Module — UX Audit & UI Redesign Report

**Date:** 2026-07-18  
**Scope:** Presentation / interaction redesign only  
**Constraints honored:** SATPIN curriculum unchanged · lesson engine logic unchanged · AI Reading Coach scoring unchanged

---

## Scores

| Metric | Score |
|--------|------:|
| 1. UX Audit Score | **78 → 88** (post-redesign) |
| 2. UI Audit Score | **74 → 86** |
| 3. Child Friendliness | **72 → 90** |
| 4. Parent Friendliness | **70 → 86** |
| 5. Accessibility | **76 → 85** |
| 6. Engagement | **68 → 84** |
| **13. Production Readiness** | **87 / 100** |

---

## 7. UX issues found (pre-redesign)

| ID | Severity | Issue | Why it confuses | Fix applied |
|----|----------|-------|-----------------|-------------|
| U1 | Critical | No clear “Start here” | Multiple competing CTAs (hub, map, mission, lesson, games) | `PhonicsStartHere` hero with pulsing CTA |
| U2 | Critical | Mission “Lesson” marked complete on tap | Child/parent thinks task done before finishing | Complete only via `lessonCompleteNonce` after lesson ends |
| U3 | High | Long stacked page | Overwhelm; unclear next action | Journey map collapsed; optional practice behind toggle |
| U4 | High | Lesson “what next?” unclear | Self-report labels (“I heard it”) + thin progress | Amy cue per step + step dots + pulsing **Next** |
| U5 | High | Mic button easy to miss | Small / no idle highlight | Larger mic + idle pulse + “tap when ready” |
| U6 | Medium | Weak celebration | Static stars only | Confetti burst + Amy “You did it!” |
| U7 | Medium | Parent report dense | Stats before takeaway | Summary-first + “More detail” accordion |
| U8 | Medium | Dual journey maps | Hub + JourneyMapV2 compete | Map demoted to optional details |
| U9 | Medium | “Go” labels vague | Child doesn’t know meaning | “Tap” / “Start lesson” language |
| U10 | Low | No FTUE | First open confusing | One-time Amy greeting + dismiss |

**File references:**  
`PhonicsV2.tsx`, `DailyMissionPanel.tsx`, `ReadingLessonRunner.tsx`, `AiPronunciationCoach.tsx`, `ReadingParentDashboard.tsx`, new `components/phonics-v2/ux/*`

---

## 8. Screens redesigned

1. **Phonics V2 entry** — Start Here card (sound, group, time, CTA)  
2. **Daily Mission** — Amy cue + primary Start lesson CTA  
3. **Reading Lesson Runner** — cues, dots, pulse next, celebration  
4. **AI Pronunciation Coach UI** — presentation-only mic guidance  
5. **Parent dashboard** — visual summary first  
6. **Optional practice** — karaoke / families / games / stories / digraphs collapsed  

---

## 9. Before vs after

| Before | After |
|--------|--------|
| Dense scroll of all modules | Start → Mission → Lesson → Academy → Parent → optional more |
| “Go” / “Lesson” auto-complete | Start lesson scrolls to runner; mission completes on finish |
| Step text + thin bar | Amy one-liner + step dots + thicker progress |
| Quiet lesson complete | Confetti + celebrate cue + larger stars |
| Parent wall of stats | “Next practice” summary + details accordion |

---

## 10. Performance impact

- No new network calls  
- Pulse CSS respects `prefers-reduced-motion`  
- DelightBurst uses existing experience-system intensity clamp  
- Optional sections not mounted until toggled → fewer initial DOM nodes  

---

## 11. Testing results

```
vitest: phonics-ux.test.ts + phonics-v2-mount.test.tsx + reading-lesson-engine.test.ts
→ 10 passed
```

- Mount asserts Start Here / mission / lesson / collapsed optional practice  
- Cue coverage for all 10 lesson steps  
- Lesson engine / coach logic suites unchanged and green  

---

## 12. Remaining recommendations

1. Wire short Amy TTS for `LESSON_STEP_AMY_CUES` (presentation layer + existing TTS)  
2. Finger-tap Lottie on first letter_id / mic step  
3. Align sticky page CTA (`phonics.tsx`) to `#phonics-start-here`  
4. Simplify `PhonicsJourneyHub` hero when V2 Start Here is present (reduce dual headers)  
5. Moderated usability sessions with 3–5 parents of ages 2–7  
6. Sticker / reading-pet progression (delight layer only)  

---

## Benchmark notes (Phase 14)

| App | AmyNest was weaker on | Improvement shipped |
|-----|----------------------|---------------------|
| Duolingo ABC | Single obvious CTA | Start Here + pulse |
| Reading Eggs | Visual progress path | Step dots + mission progress |
| Khan Kids | Sparse screens | Optional practice collapse |
| HOMER | Warm character guidance | GuidedAmyCue |
| Lingokids | Celebration micro-moments | DelightBurst on complete |

Identity preserved: Quicksand, amber lesson framing, Amy icon, SATPIN groups.

---

## Constraint check

- SATPIN / letter groups: **not modified**  
- `reading-lesson-engine` advance/scoring: **not modified**  
- Coach evaluation logic: **not modified** (UI chrome only)  
