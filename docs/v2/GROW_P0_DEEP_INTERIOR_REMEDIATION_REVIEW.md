# Grow P0 — Deep Interior Remediation Review

**Status:** IMPLEMENTED — awaiting Founder review  
**Authority:** Founder Order — Grow P0 Deep Interior Remediation  
**Flag:** `VITE_FF_GROW_LIVING_V1` (default ON; OFF = legacy edtech SKU faces)  
**Source audit:** `docs/v2/AMYNEST_PRE_FINAL_APPLE_PORTFOLIO_CONSISTENCY_AUDIT.md`  
**Branch:** `cursor/product-execution-model-v2`

**Frozen (not modified):**

- Health Lab · Birth Sky · Speech Coach · Parent Hub IA · P0-7 · Routine Generation · Amy Coach · Amy Audio  
- Learning engines (Abacus / Phonics / Spelling / Study / Olympiad / Smart Math)  
- DB · API · Analytics · Auth · Firebase · RevenueCat · entitlements · routes · deep links · progress data  

**Law:** Experience only. Living ON → Understand-house leave. Living OFF → legacy rollback.

---

## 1. Before state

Grow **entry** (`GrowLivingStream`) was already one Understand room.

Deep leave still read as edtech products:

| Surface | Pre-state |
|---|---|
| `/abacus` | **Abacus PRO Zone** shell title + empty copy |
| Abacus home | Points medal · 🔥 streak · Daily Adventure · Why families go PRO · Try PRO |
| `/phonics` | **Learning Hub** · Unlock phonics learning · no leave continuity |
| Phonics hub | Today's Reading Adventure · Journey/Adventure Map · stars/achievements |
| Reading Academy | **Reading Academy** Level N theatre |
| Daily Mission | Today's Mission · Flame Day streak |
| Learning journey gate | Unlock All Learning · violet storefront |
| Spelling / Olympiad / Smart Math | Mastery / Zone / Tricks SKU titles via shell |

**Blind House (before):** Did I open an edtech/course application? **YES.**

---

## 2. Abacus audit

| Element | Living ON action |
|---|---|
| Page title | **Beads & counting** (`livingGrowPageTitle("beads")`) |
| Empty copy | Calm age range — no PRO Zone |
| HubModule shell | Eyebrow “Today's growth” + `gw-living-deep` |
| ProgressHeader | Practice notes · Showing up · What we're learning (points data preserved, not shouted) |
| Daily Adventure card | Today's practice · Continue calmly · quiet note (no gems shout) |
| Learn→Pro upsell | PREMIUM_VOICE · Not now · no Try PRO |
| Premium value panel | Continuity includes · not Why families go PRO |

**Engines / scoring / collection unlocks / analytics:** untouched.

---

## 3. Phonics audit

| Element | Living ON action |
|---|---|
| Page title | **Sounds & letters** |
| Loading / empty | Preparing today's practice · calm empty + leave continuity |
| Sticky CTA gate label | `PREMIUM_VOICE.continueCta` (not Unlock phonics learning) |
| Bottom bar | Sanctuary background (not `#0B1220` command deck) |
| Leave | `AmyNestLeaveContinuity` wired |
| Learning Hub model | Today's reading practice · Practice path |
| Reading Academy eyebrow | Sounds & letters |
| Daily Mission | Today's practice · streak as Showing up |
| Stars / pet theatre | Pet demoted; stars → Practice notes |

**Curriculum / mastery / mission data:** untouched.

---

## 4. Deep interior changes

| Asset | Role |
|---|---|
| `grow-living-deep.css` **(new)** | Shared leave sanctuary materials |
| Helpers in `lib/grow/living-room.ts` | Page titles, CTAs, academy/mission eyebrows, premium gate voice, featureId map |
| `HubModulePageShell` | Auto calm titles for Grow leave featureIds + deep CSS |
| `learning-journey-gate.tsx` | Continuity Premium preview when living |
| Sibling pages | Spelling / Olympiad / Smart Math calm titles + empty copy |
| Phonics page | Full leave remanufacture + continuity |

---

## 5. Learning hierarchy

One meaningful practice still leads from Grow open (unchanged Phase 2 recommend).

Deep leave does **not** reopen Math / Abacus / Phonics / Spelling / Study / Olympiad as equal product shelves on the leave page itself — each leave is a single calm practice room with nested capabilities kept nested.

Olympiad remains demoted path (**Challenge later**).

---

## 6. Progress

| Data | Presentation when living |
|---|---|
| Points / streaks / levels / missions / gems | **Logic preserved** |
| XP / coins / flame / medal theatre | **Quieted or relabeled** |
| Parent-facing question | “What are we learning?” / practice notes |

---

## 7. Premium

- Pricing / RC / entitlements / journey lock **unchanged**
- P0-7 **unchanged** (no hard-day file edits)
- Unlock All Learning → `PREMIUM_VOICE.continueCta` + invitation when living
- Abacus Try PRO → Continue with AmyNest / Not now
- Phonics Unlock phonics learning → PREMIUM_VOICE label

---

## 8. Loading

Living phonics: “Preparing today's practice…” — no edtech spinner theatre added.

---

## 9. Empty

Calm age-range messages (Beads & counting / Sounds & letters). Leave continuity on phonics empty. One clear next action: Add Child / Back to rooms.

---

## 10. Error

No PRO error skin invented. Existing unavailable fallback preserved; leave continuity added where living.

---

## 11. Completion

| Before | After (living) |
|---|---|
| Claim gems / Continue quest | Quiet note / Continue calmly |
| Achievement / Adventure finish | Finished today's practice |
| Forced catalogue | Leave to Today Home / Parent Hub / Back to rooms |

---

## 12. Visual consistency

Reuses Understand Grow open sand language + Speech/Health deep grammar (`gw-living-deep-*`). **No separate education design system.**

---

## 13. Accessibility (STATIC ONLY)

| Item | Status |
|---|---|
| 48px+ / `min-h-12` back + primary CTAs | Living shells / phonics / adventure |
| Semantic eyebrow + title | Grow leave headers |
| Dialog roles on upsell | Preserved |
| Reduced motion | Deep CSS progress fill respects preference |
| Dynamic Type / VoiceOver / TalkBack | **NOT claimed** — P0-9 separate |

---

## 14. Performance

No new API / polling / large assets. CSS + conditional presentation only.

---

## 15. Production safety

| Risk | Mitigation |
|---|---|
| Dual face | `VITE_FF_GROW_LIVING_V1=0` restores PRO Zone / Learning Hub / Unlock All |
| Engine drift | Abacus/Phonics engines untouched |
| Route break | Same `/abacus` `/phonics` `/spelling` `/olympiad` `/smart-math-tricks` |
| Cross-portfolio freeze | Health / Birth Sky / Speech / Hub / P0-7 / Routine / Coach / Audio untouched |

---

## 16. Tests

| Suite | Result |
|---|---|
| `lib/grow/living-room.test.ts` (deep helpers) | **PASS** |
| Health living + engine tests | **PASS** |
| Speech living | **PASS** |
| P0-7 hard-day | **PASS** |
| P0-6 parent-hub room + room-living | **PASS** |
| Phonics reading-academy engine test | **PASS** |
| TypeScript | **PASS** |
| Production build | **PASS** |

---

## 17. Build

Kidschedule production build **PASS** (phonics / abacus / olympiad / parenting-hub chunks emitted).

---

## 18. Screenshots

Auth-gated cloud environment blocked signed-in leave capture.

**Code evidence (living ON):** Beads & counting · Sounds & letters · Practice notes · PREMIUM_VOICE gate · leave continuity · no Abacus PRO Zone / Reading Academy / Unlock All on default face.

**Founder device pack:** remaining debt.

---

## 19. Blind test

| Question | Target | Result |
|---|---|---|
| Edtech/course application? | **NO** | **MOSTLY NO** — shell + loudest SKUs remade; some nested lesson chrome may still peek |
| AmyNest helping child learn? | **YES** | **YES** on Abacus / Phonics leave opens |
| Learning > product UI? | **YES** | **YES** — PRO/Academy/Unlock theatre demoted |

---

## 20. Founder score

| Dimension | Score | Note |
|---|---|---|
| Leave house continuity | **8.5** | Blocker SKU titles remade |
| Abacus presentation | **8.5** | PRO Zone / Try PRO / points theatre quieted |
| Phonics presentation | **8** | Academy/Adventure/Mission quieted; leave wired |
| Premium continuity | **9** | Unlock All → PREMIUM_VOICE |
| Rollback safety | **10** | Flag OFF intact |
| Engine safety | **10** | Untouched |

**Overall deep-interior craft:** **8.5 / 10** (was ~3 as edtech suite).

---

## 21. Apple readiness

| Question | Answer |
|---|---|
| Grow leave still a portfolio blocker? | **NO** (living ON) |
| Ready for Final Apple Audit now? | **NOT YET** — Birth Sky Astro deepen + device a11y remain |
| Grow contribution to one-house claim | **PASS** under living defaults |

---

## 22. Remaining debt

1. Authenticated screenshot pack  
2. Study page custom shell deeper remanufacture (P2)  
3. Nested lesson/game chrome inside Abacus/Phonics sessions (P2)  
4. i18n SKU strings when living OFF (intentional rollback)  
5. Birth Sky Amy Astro deepen — next pre-Apple blocker  
6. Final Apple Audit — not started  

---

## 23. Rollback

```bash
VITE_FF_GROW_LIVING_V1=0
```

Restores: Abacus PRO Zone · Learning Hub · Unlock All Learning · Reading Academy · Daily Adventure · Try PRO · Journey/Adventure Map · flame streaks · gems claim copy.

---

## 24. Commit SHA

_Fill after commit:_

| Item | Value |
|---|---|
| Implementation commit | _(pending)_ |

---

## 25. Files touched (experience layer)

- `lib/grow/living-room.ts` (+ test)  
- `components/grow/grow-living-deep.css` **(new)**  
- `components/hub-module-page-shell.tsx`  
- `components/learning-journey-gate.tsx`  
- `pages/abacus.tsx` · `phonics.tsx` · `spelling.tsx` · `olympiad.tsx` · `smart-math-tricks.tsx`  
- `components/abacus-zone.tsx` · `abacus/abacus-premium-upsell.tsx` · `abacus/abacus-daily-adventure.tsx`  
- `phonics-v2/academy/ReadingAcademyHub.tsx` · `ux/PhonicsLearningHub.tsx` · `DailyMissionPanel.tsx`  
- Hub comment only in `parenting-hub.tsx`  

**Not touched:** Health Lab · Birth Sky · Speech · Parent Hub rooms · P0-7 · Routine · Coach · Audio · learning engines.

---

**END — STOP FOR FOUNDER REVIEW**

No Final Apple Audit performed.
