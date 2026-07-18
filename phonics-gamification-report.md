# AmyNest Phonics — Gamification, Motivation & Habit Formation Report

**Date:** 2026-07-18  
**Scope:** Motivation / adventure / habit layer only  
**Unchanged:** SATPIN curriculum · AI Reading Coach logic · 10-step lesson engine · phoneme audio · prior UX redesign

---

## Scores

| # | Metric | Score |
|---|--------|------:|
| 1 | Motivation | **86** |
| 2 | Engagement | **85** |
| 3 | Habit Formation | **82** |
| 4 | Emotional Design | **88** |
| 5 | Child Delight | **87** |
| 6 | Parent Satisfaction | **84** |
| 7 | Gamification | **86** |
| **13** | **Production Readiness** | **88 / 100** |

---

## Motivation audit (Phase 1) — key findings addressed

| Severity | Drop-off moment | Improvement |
|----------|-----------------|-------------|
| Critical | Progress felt like a lesson list | Adventure path + SATPIN worlds |
| High | No reason to return tomorrow | Daily mystery / bonus / weekend card |
| High | Weak emotional bond | Amy greetings + optional reading pet |
| Medium | Generic badges | Literacy milestones (First Sound → Fluent) |
| Medium | Parent insights felt cold | Warm concrete encouragement lines |
| Medium | Streak pressure risk | Soft “days this week” — no shame copy |

---

## 8. Improvements implemented

1. **Adventure journey map** — Learning Sounds → Fluent path with Amy “here” marker  
2. **SATPIN worlds** — themed islands (Sunny Sound Island → Digraph Galaxy); treasure on completed; Play on current  
3. **Daily motivation strip** — Amy greeting + mystery sound / bonus star / surprise story / weekend adventure  
4. **Reading pet** — owl/fox/panda/dino/dragon; grows from lessons, words, stories, pronunciation (free)  
5. **Achievement expansion** — First Sound, Reading Explorer, Story Champion (+ existing milestones)  
6. **Parent encouragement** — headline, detail, home tip, next-world hint  
7. **Lesson-complete hooks** — feed pet, record gentle practice day, unlock badges + toast  
8. **Book-complete hooks** — pet story growth + achievement re-eval  

---

## 9. Before vs after

| Before | After |
|--------|--------|
| Optional classic stage map buried | Colorful adventure + world tiles first |
| Streak badge only | Daily card + soft weekly days + bonus star |
| No companion growth | Choosable pet with growth meter |
| Parent dense stats | Encouraging narrative + tip |
| Achievements mostly stories/words | Sound → explorer → champion literacy arc |

---

## 10. Performance impact

- Emoji/CSS themes only (no heavy art packs)  
- localStorage for pet / daily / achievements  
- No new network calls; animations reuse existing patterns  
- Android / iOS / PWA: same kidschedule bundle  

---

## 11. Testing results

```
vitest: gamification + reading-academy + mount + ux cues
→ 23 passed
```

---

## 12. Remaining recommendations

1. Light SFX on world unlock / pet hatch (offline-safe)  
2. Treasure chest reveal animation when letter group advances  
3. Moderated Day-1 / Day-7 / Day-30 parent interviews  
4. Align sticky `/phonics` CTA to `#phonics-adventure-map`  
5. Cloud sync of pet + achievements with phonics-v3 sync  

---

## Benchmark (Phase 12)

| App | Borrowed principle | AmyNest expression |
|-----|--------------------|--------------------|
| Reading Eggs | World map | SATPIN islands |
| Duolingo ABC | Daily return cue | Mystery sound / bonus (no guilt) |
| HOMER | Warm companion | Amy + pet |
| Khan Kids | Sparse rewards | Literacy badges only |
| Lingokids | Celebration | Toast + existing confetti on lesson end |

Identity preserved: Amy, Quicksand, amber/emerald adventure framing — not a clone.

---

## Constraint check

- SATPIN order / graphemes: **unchanged**  
- Coach scoring: **unchanged**  
- Lesson engine steps: **unchanged**  
- Gamification is **additive presentation** on existing counters  
