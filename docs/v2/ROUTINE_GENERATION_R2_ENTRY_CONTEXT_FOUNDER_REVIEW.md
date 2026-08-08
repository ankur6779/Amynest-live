# Routine Generation R2 — Entry + Context Founder Review

**Status:** MANUFACTURED — ENTRY → CONTEXT → READY → BUILD → HANDOFF  
**Date:** 2026-08-08  
**Authority:** Founder Order — Routine Generation R2 Entry + Context Experience Manufacturing  
**Sources of truth (APPROVED):**  
`docs/v2/ROUTINE_GENERATION_DEEP_STUDY.md` · `docs/v2/ROUTINE_GENERATION_R1_EXPERIENCE_BLUEPRINT.md`  
**Also binding:** Module Manufacturing Framework · Parent Hub Constitution · Pack 5 Premium Continuity · AmyNest Philosophy · Routine Engine Freeze (June 2026)

**Implementation Commit SHA:** `0a5ba1e021818a23d2fd27763840a802bf17d3ec`  
**Docs Commit SHA:** `9d843bf0ca5d9b666034c18cb9fdedadcad6a55f`

**STOP after R2.** Wait for Founder approval.  
Do **not** begin R3 result manufacturing.  
Do **not** thaw the frozen engine.  
Do **not** run the Final Apple Audit.

---

## Absolute law (verified)

| Frozen | Touched in R2? |
|---|---|
| Engine rules / intelligence pipeline / dinner integrity / generation logic | **NO** |
| AI/model logic / deterministic correction | **NO** |
| Existing DB contracts / APIs | **NO** |
| RevenueCat / Firebase / Analytics contracts | **NO** |
| Auth / Routing / Deep links | **NO** |
| Existing routine data | **NO** |

R2 is **experience-only** above the adapter boundary on `/routines/generate`.

**Rollback:** `VITE_FF_ROUTINE_LIVING_V1=0` restores the pre-R2 activation form face.

---

## Mission result

`/routines/generate` (single-child living path) no longer opens as a **planner configuration SKU**.

It opens as:

> **Amy already understands enough. Let's build today's plan.**

Primary action: **Build today's plan** → existing `handleAiGenerate` (silent standard fallback preserved).

**Not manufactured in R2:** final routine result / day-arc preview redesign (R3+).

---

## 1. Previous vs New

| | Previous | New (living ON) |
|---|---|---|
| Header | “Generate Routine” + planner subtitle | **Today's plan** + understanding line |
| First-routine chrome | 3-step activation progress | **Hidden** (living) |
| Caregiver | Always-open 4-way grid | Under **Anything different today?** |
| Mode picker | Single vs Family as peer products | Family demoted to quiet link |
| Context | Profile summary wall / Hub promo | Verified **human context chips** + ready moment |
| Questions | Large form always open | **Zero by default**; deltas collapsed |
| Primary CTA | “Generate Smart Amy Routine” + AI subtext | **Build today's plan** |
| Patent / AI theatre | Loading brain + patent strip | **Removed** on living handoff |
| Generating copy | “Amy is thinking” / AI analyzing | Truthful stages from real pipeline moments |
| Flag | None | `VITE_FF_ROUTINE_LIVING_V1` default **ON** |

---

## 2. Entry Experience

**Route (unchanged):** `/routines/generate`  
**Params preserved:** `childId` · `date` · `mood` · `weather` · `caregiver` · `override` · `source`

**Living open:**
- FE photography: `ROOM_HEROES.care` → `/experience/r1/shot-01-arrival.png`
- Companionship: “I'm here with {child} for today.”
- Understanding: “Amy already understands enough about {child}.”
- Purpose: “Let's build today's plan — nothing to configure.”

**Files:**
- `components/routines/routine-living-opening.tsx`
- `components/routines/routine-living-room.css`
- `lib/routine-generation/living-entry.ts`
- `pages/routines/generate.tsx` (presentation branches only)

---

## 3. Context Model

Hierarchy (R1 blueprint):

1. Companionship open  
2. **Known today** chips (read-only, verified)  
3. Ready-to-build moment (Why / Next / Do)  
4. **Anything different today?** (collapsed)  
5. Primary CTA **Build today's plan**  
6. Quiet family link (secondary)

**Default questions:** **ZERO** when `childId` + `date` + school resolution are present.

**Minimum required (engine unchanged):**
- `childId`
- `date`
- `hasSchool` when `schoolQuestionRequired`

If school is unresolved → deltas auto-open with the existing school control.

---

## 4. Questions Removed / Retained

| Question / chrome | Living treatment |
|---|---|
| Standard vs AI picker | **Removed** as peer choice — one CTA |
| First-routine 3-step wizard chrome | **Removed** |
| Always-open caregiver grid | **Retained** under deltas |
| Profile summary wall | **Demoted** (chips replace) |
| Parenting Hub promo on generate | **Hidden** (Home owns gravity) |
| Completeness bar / style preview | **Hidden** on living |
| Patent microcopy under CTA | **Hidden** on living |
| Mood / weather / special / fridge / advanced | **Retained** under deltas |
| School day (when required) | **Retained** — only mandatory extra ask |
| Fixed activities / blocking / review | **Retained** (always visible) |
| Family mode | **Retained** via quiet link; classic UI when entered |

---

## 5. Context Source Mapping

Every visible personalization claim is traceable. Unverified claims are **not displayed**.

| Statement (example) | Source | Existing field / API | Fallback |
|---|---|---|---|
| “School day” | Form `hasSchool` (often auto from profile schoolDays) | `hasSchool` · `child.schoolDays` · school times | Omit rhythm chip if `hasSchool === null` |
| “Weekend at home” / “Day at home” | `date` weekday + `hasSchool=false` | `date` · `hasSchool` · age / `isSchoolGoing` | Omit if unknown |
| “School Age” / stage label | Age group helper | `child.age` · `child.ageMonths` → `getAgeGroup` | Omit if no age |
| Focus chip text | Discovery / profile goals | `child.goals` or `child.parentGoals` | Omit if empty |
| “Mom” / caregiver | Handler state | `caregiver` / `handlerType` (URL · last · default) | Always present once handler defaulted |
| “Outdoor-friendly” | Weather choice / auto meteo | `weatherOutdoor` | Omit only if null (default usually set) |
| “Plan already exists” | Routines check | `GET` routines check → `existingRoutine.exists` | Continuity from prior routine count if no exist flag |
| “Building on your days” | Prior routines list length | `useListRoutines` length / `priorRoutineCountRef` | Omit if zero |

**Never shown:** DB field names · engine stage codes · AI metadata · internal scores · patent language · pipeline / CoT.

Implementation: `buildRoutineContextChips()` in `living-entry.ts` (+ unit tests).

---

## 6. Build CTA

| Surface | Living copy |
|---|---|
| Inline primary | **Build today's plan** |
| Override | **Rebuild today's plan** |
| Subtext | “Amy uses what she already knows about {child}” |
| Sticky mobile | Same titles/subtext |
| Under the hood | `handleAiGenerate(overrideMode)` — **unchanged** client path |

**Forbidden CTAs avoided:** Generate AI Routine · Generate with AI · Create Magic Routine · Optimize my child · Unlock Routine · Start Premium Routine.

Double-tap: existing `isAiGenerating` guard retained.

---

## 7. Generation Handoff

When CTA fires:

1. Existing validity + existing-routine block checks  
2. `ensureWeatherDetected()` (existing)  
3. Wake-time gate (existing)  
4. `proceedAiGenerate` → `fetchAmyAiRoutine` (35s, retries, **8s slow → standard**)  
5. Paywall / fixed-activity / recovery paths **unchanged**

**Living handoff UI (truthful stages only):**
- Gathering what we already know  
- Placing meals, rest, and school gently  
- Fitting today’s weather and caregiver  
- Checking the day still feels kind  

Mapped to real pipeline moments (R1). **No** model names, patent strip, brain sparkle, or fake “AI thinking” theatre.

`aria-live="polite"` on stage list; reduced motion keeps stage index static.

**Not faked:** generation progress percentages, invented engine telemetry.

---

## 8. Visual Manufacturing

| Element | Choice |
|---|---|
| House | Welcome / Today Home / Care FE materials |
| Photo | Care arrival (`ROOM_HEROES.care`) |
| Shell | Sanctuary surface — hierarchy + context clarity |
| Uniqueness | Context storytelling, not neon/sparkle |
| Family | Demoted quiet text link |
| Result preview | **Untouched** (R3) |

---

## 9. Accessibility

| Requirement | R2 status |
|---|---|
| Dynamic Type | Inherits app text styles / clamp titles |
| VoiceOver / TalkBack | Context chips include `sr-only` full statements; ready moment labeled |
| 48px+ targets | Back, caregiver, deltas trigger, CTA (`min-h-12` / premium CTA ≥68) |
| Focus order | Open → chips → deltas → CTA |
| Semantic labels | Context band + ready moment `aria-label`s |
| Reduced motion | Handoff stage rotation disabled |
| Contrast | Photography readability veil retained |
| CTA clarity | “Build today's plan” + loading SR text against double-tap |

---

## 10. Performance

| Risk | Mitigation |
|---|---|
| New photography | Reuses existing FE Care asset (already in app) |
| Context loading | Pure client derive from already-loaded child / form state — **no new API** |
| Extra DB queries | **None** |
| Pre-generation work | **None** beyond existing weather ensure on CTA |
| Waterfalls | Avoided — chips from in-memory state |

---

## 11. Production Safety

| Item | Status |
|---|---|
| Route `/routines/generate` | Unchanged |
| Entry points (Today Home, Hub, deep link params) | Unchanged |
| Generation trigger | Same `handleAiGenerate` |
| Payload (`enrichRoutinePayload` / buildGeneratePayload) | Unchanged |
| API `POST /routines/generate-ai` (+ standard fallback) | Unchanged |
| DB writes (`POST /routines` save path) | Unchanged (post-handoff; not redesigned) |
| Analytics event names | Unchanged |
| Feature flag | `VITE_FF_ROUTINE_LIVING_V1` default ON |
| RevenueCat gate | Unchanged presentation hook (`RoutineGenerationPaywallError`) |
| Rollback | Flag `=0` |

---

## 12. DB Review

**No schema changes. No migrations. No routine row shape changes.**

---

## 13. API Review

**No contract changes.** Client continues to call existing generate / generate-ai / check / create endpoints with the same payload fields.

---

## 14. Analytics Review

**No event renames / new required properties.** Existing `routine_generated`, first-value, funnel, retention hooks remain on the same save/generate paths.

---

## 15. Regression Review

| Check | Result |
|---|---|
| TypeScript (`pnpm typecheck`) | PASS |
| Unit tests (`living-entry.test.ts`) | PASS (8) |
| Production build (`pnpm build`) | PASS |
| Frozen engine paths diff | Empty (no thaw) |
| Living OFF | Legacy form + dual mode + patent loading restored |
| Living ON single | Opening + chips + one CTA + handoff |
| Double-submit | `isAiGenerating` early return preserved |
| Missing school | Deltas auto-open; CTA disabled until valid |
| Existing routine | Deltas auto-open; override / view preserved |
| Family mode | Reachable via quiet link; classic family UI |

---

## 16. Founder Score

| Lens | Score (1–5) | Note |
|---|---|---|
| Emotional clarity | **5** | Understanding → build, not configure |
| Trust / source honesty | **5** | Chips only when verified |
| Fatigue | **5** | Zero default questions when sufficient |
| Visual house continuity | **4** | Care FE + sanctuary; crown-jewel restraint |
| Engine freeze discipline | **5** | Experience adapter only |
| Handoff honesty | **4** | Truthful stages; result still legacy until R3 |
| Blind test readiness | **4** | Entry yes; result phase not yet manufactured |

**Blind test target:**  
> “Does this feel like Amy understood enough about my child to build today's plan, rather than asking me to configure another planner?”  
**Expected on living entry:** **YES.**

---

## 17. Remaining Debt

| Debt | Owner phase |
|---|---|
| Result / day-arc / WHY card manufacturing | **R3** |
| Soften recovery copy (“Try Amy again” / standard dual) | Later experience polish |
| Family mode living treatment | Out of R2 scope (demoted only) |
| Premium paywall copy continuity (R7) | Later — gate logic untouched |
| Live device screenshots in CI | Manual Founder walk |
| Orphan `/routine` singular deep-link debt | FUTURE (noted in R1) |

---

## 18. Rollback

```bash
VITE_FF_ROUTINE_LIVING_V1=0
```

Restores: Generate Routine header · first-routine progress · always-open caregiver · Single/Family peer toggle · AI CTA + patent microcopy · brain/sparkle loading.

No DB rollback required. No API rollback required.

---

## 19. Screenshots

Live authenticated screenshots were not captured in this cloud run (auth-gated `/routines/generate`).

**Founder walk — capture:**
1. Living open + context chips + ready moment (`data-testid="routine-living-surface"`)  
2. Collapsed deltas + **Build today's plan** (`routines-generate-ai-btn`)  
3. Handoff stages while generating (`rg-handoff-card` / stage list)  
4. Flag OFF legacy form for rollback proof  

---

## 20. Commit SHA

| Artifact | SHA |
|---|---|
| R2 implementation | `0a5ba1e021818a23d2fd27763840a802bf17d3ec` |
| This Founder Review | `9d843bf0ca5d9b666034c18cb9fdedadcad6a55f` |

---

## Final STOP

R2 Entry + Context manufacturing is complete for Founder review.

**Do not start R3.**  
**Do not thaw the engine.**  
**Do not run the Final Apple Audit.**
