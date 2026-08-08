# Routine Generation — R1 Experience Blueprint

**Status:** BLUEPRINT ONLY — NO IMPLEMENTATION  
**Date:** 2026-08-08  
**Authority:** Founder Order — Routine Generation R1 Experience Blueprint  
**Upstream (APPROVED):** `docs/v2/ROUTINE_GENERATION_DEEP_STUDY.md`  
**Also binding:** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md` · Parent Hub Constitution · Pack 5 Premium Continuity · AmyNest Philosophy · Routine Engine Freeze (June 2026)

**ABSOLUTE STOP:** No React · No CSS · No DB · No API · No engine thaw · No RevenueCat · No Firebase · No analytics implementation · No pricing changes · No invented patent filings.

---

## Executive Summary

Routine Generation must stop feeling like an **activation form / planner SKU** and become:

> **the moment Amy turns everything she understands about this child into a living plan for today.**

### Laws that do not move

| Law | Statement |
|---|---|
| Engine freeze | Certified June 2026 path remains production truth |
| Hybrid truth | Rule templates + intelligence pipeline + dinner integrity; optional AI enrich with deterministic correction |
| Experience above engine | Manufacture presentation / orchestration only |
| Home owns Begin | Today Home is the gravitational centre; Hub never steals generate |
| Truthful explanation | Only safe reasons from real inputs + `adaptations[]` — never CoT |
| Patent honesty | One provisional package with 15 indicative claims in-repo; **not verified as 15 separately filed or granted patents** |

### Signature product shift

| From | To |
|---|---|
| Configure → Generate → Save | Understand situation → Shape today → Begin living |
| Standard vs Amy AI dialect | One calm “Build today’s plan” (engine path remains internal) |
| Patent / AI theatre loading | Meaningful readiness stages from real pipeline moments |
| Spreadsheet preview | Living day arc with WHAT / WHY / WHEN / HOW |
| Unlock after friction | Value first → Premium continuity |

### One-line recommendation

Approve this blueprint → authorize **R2 Entry / Context manufacturing (experience only)** behind a living flag → never thaw the engine.

---

## Experience Architecture

### Boundary diagram

```text
┌──────────────────────────────────────────────────────────────┐
│ FROZEN ENGINE (DO NOT THAW)                                  │
│ resolveRoutineGenerationInputs                               │
│ → generateRuleBasedRoutine                                   │
│ → intelligence pipeline                                      │
│ → repairDinnerAnchor / validators                            │
│ (+ optional generate-ai with correction / fallback)          │
│ APIs: POST /routines/generate · /generate-ai · POST /routines│
└─────────────────────────────▲────────────────────────────────┘
                              │ unchanged contracts
┌─────────────────────────────┴────────────────────────────────┐
│ EXPERIENCE ADAPTER (future presentation layer only)          │
│ - choose default generate path quietly                       │
│ - map payload from known context + minimal deltas            │
│ - translate adaptations[] → parent language                  │
│ - stage truthful generation UI                               │
│ - preserve paywall / journey / save semantics                │
└─────────────────────────────▲────────────────────────────────┘
                              │
┌─────────────────────────────┴────────────────────────────────┐
│ ROUTINE GENERATION EXPERIENCE (to manufacture)               │
│ Entry → Context/Readiness → Generation → Result →            │
│ Understanding → Edit/Adapt → Begin → Execution →             │
│ Completion → Memory / Continuity                             │
└──────────────────────────────────────────────────────────────┘
```

### Adapter responsibilities (conceptual — not implemented)

| May do | Must not do |
|---|---|
| Soften UI; progressive disclosure | Change timing / dinner gaps / templates |
| Prefill from profile / Today / discovery | Invent new required fields |
| Call existing generate endpoints | New API contracts without Founder order |
| Present `adaptations[]` safely | Expose prompts, model names, CoT |
| Keep Standard/AI under one CTA | Remove deterministic correction |
| Living flag rollback | Touch RevenueCat pricing |

### State map (complete)

```text
ENTRY
  → CONTEXT_READY (known context shown; optional deltas)
  → GENERATING
      → SUCCESS_PREVIEW
      → PARTIAL_RECOVERY
      → TIMEOUT_FALLBACK
      → NETWORK_FAIL
      → VALIDATION_BLOCK (fixed activities / trust)
      → PAYWALL (existing gate)
  → UNDERSTANDING (why today)
  → EDIT_SOFT (swap / skip / small change)
  → SAVED
  → BEGIN (Today Home / detail first block)
  → EXECUTING
  → COMPLETED
  → MEMORY (signals / feedback / next day continuity)
```

---

## Entry

### Why the parent enters

| Intent | Source |
|---|---|
| Start today’s plan | Today Home Begin / NRT |
| No routine yet for today | Dashboard / first-value |
| Rebuild / override today | Regenerate with `override` |
| Resume activation | Post-onboarding / journey |
| Quiet Hub link (legacy) | Must not compete with Home |

### Already known (do not re-ask by default)

| Known from | Fields |
|---|---|
| Child profile / Discovery | Name, age, wake/sleep, school, goals, parent goals, diet/allergies, cuisine, fixed activities |
| Parent profile | Region/country, household diet |
| Today | Date, weekend/weekday, timezone |
| History | Prior routine, completions, daily signals, energy profile |
| Optional auto | Weather outdoor suitability (existing geo/meteo path) |

### Minimum required before generate

| Required | Notes |
|---|---|
| `childId` | From active child / URL |
| `date` | Default today |
| Entitlement path | Existing gate — presentation only later |

### Optional deltas (progressive, not a wizard wall)

Ask only when missing or parent wants to change:

- Mood today  
- Caregiver today  
- Weather outdoor (or confirm auto)  
- Special plans  
- Fridge items (if meals matter today)  
- School meal mode (school days)  
- Fixed-activity confirmation when blocking  

**Fatigue law:** If profile + today context is sufficient, **one primary CTA** may generate immediately. Deltas live under “Anything different today?”

### Handoffs

| From | To Routine Generation | Must preserve |
|---|---|---|
| Today Home Begin | `/routines/generate?childId=` or deepen | Home light continuity |
| Discovery | Never re-run discovery; use stored fields | Continuity sentence |
| Parent Hub | Quiet link only; Home owns Begin | Constitution R6 |
| Detail regenerate | Same day override semantics | Unique child+date |
| Deep link | Resolve safely; avoid orphan `/routine` singular debt | FUTURE fix if needed |

---

## Context / Readiness

### Screen purpose

Show Amy already understands the situation — then invite a tiny confirmation.

### Hierarchy

1. Companionship line: “I’m here with {child} for today.”  
2. **Known today** chips (read-only): school day / weekend · age season · caregiver default · weather if known  
3. **Anything different today?** (collapsed)  
4. Primary CTA: **Build today’s plan**  
5. Secondary: Where we left off / existing routine continue  

### What remains internal

- Learning weights  
- Pipeline stage names  
- AI vs standard routing  
- Cache keys  
- Semaphore / rate limits  

---

## Generation

### Signature moment

Not “AI thinking.”  
Truthful companionship while the frozen engine works:

> “I’m shaping today around {child} — school, rest, and what you shared.”

### Safe stage language (mapped to real systems — not fake theatre)

| Parent-visible stage (optional progressive lines) | Internal truth | Expose? |
|---|---|---|
| Gathering what we already know | `resolveRoutineGenerationInputs` + profile load | Soft yes |
| Placing meals, rest, and school gently | Templates + dinner integrity | Soft yes (no numbers theatre) |
| Fitting today’s weather and caregiver | weatherOutdoor / caregiver in payload | Soft yes if used |
| Checking the day still feels kind | Trust validators / safety gate | Soft yes |
| Ready | Preview returned | Yes |

**Never show:** model name, prompt, patent-pending loading strip, “magic”, sparkle AI demo, chain-of-thought.

### Path unification

| Parent CTA | Under the hood |
|---|---|
| Build today’s plan | Prefer existing AI path with 8s slow fallback to standard **or** standard-first if Founder later prefers — **decision deferred to manufacturing**; must remain one CTA |

Do not force parent to choose “Standard vs Amy AI.”

### Outcomes

| Outcome | Experience |
|---|---|
| Success | Transition to Result (preview) with calm reveal |
| AI slow | Quietly continue via standard fallback (existing client behaviour) — parent sees continuity, not failure |
| AI fail after retries | Standard path; soft note only if needed (“Built with our trusted daily planner”) |
| Timeout | Same fallback; offer Retry / Continue with standard |
| Network fail | Recovery: Retry · Return Home · keep form state |
| Validation / fixed-activity block | Explain in parent language; fix path without restarting life |
| Paywall | Continuity presentation after value attempt — existing gate logic untouched |
| App kill mid-generate | Return to Context with recovery affordance (existing recovery patterns) |

---

## Result (most important screen)

### Immediate comprehension

| Question | Answer on first breath |
|---|---|
| WHAT | Today’s living plan for {child} |
| WHY | 1–3 safe reasons from `adaptations[]` + known inputs |
| WHEN | Day arc: morning → day → evening (existing timeline grammar) |
| HOW | Begin the first right block |

### Hierarchy

1. **Hero** — FE photography (Today Home / Care family) + companionship  
2. **Routine identity** — title + date + child name  
3. **Why this routine today** — adaptations / trust layer (existing `RoutineAdaptationsCard` / `AmyTrustLayer` as seeds)  
4. **Day arc** — sequence with time structure  
5. **Flexibility cues** — soft edit / skip affordances  
6. **Primary CTA** — Begin today  
7. **Secondary** — Save & refine · Adjust gently  

### Preview vs saved

Keep existing contract: preview → `POST /api/routines` save → detail / Home Begin.  
Experience may auto-save on Begin if already valid — **only if manufacturing can do so without changing API semantics**; otherwise keep explicit save then Begin. Mark auto-save decision for R4 Founder checkpoint.

### Priority & flexibility

- Highlight the **next right block** (Home NRT alignment)  
- Later blocks visible but quieter  
- No gamified priority scores  

---

## Understanding

### Allowed explanation sources

| Visible claim | Allowed source |
|---|---|
| School day shape | `hasSchool` / school times |
| Weekend rhythm | dayContext weekend |
| Caregiver tone | caregiver input |
| Outdoor limited / indoor calm | weatherOutdoor |
| Goals you shared | child.goals / parentGoals |
| Shorter sleep / energy | adaptations + daily signals (only if adaptation string exists) |
| Fridge-aware meals | fridgeItems when provided |
| Fixed commitments honored | fixedActivities result |

### Forbidden

- “Amy knows what your child is thinking”  
- “Amy noticed you struggling” (unless parent explicitly logged a signal and copy is carefully non-surveillance)  
- Model reasoning traces  
- Patent claim numbers in the emotional open  

---

## Editing

### Feel

Small correction — not rebuilding a form.

### Allowed soft moves (existing contracts)

| Move | Mechanism (existing) | Experience |
|---|---|---|
| Complete / skip / delay item | PATCH items statuses | One-tap in execution |
| Edit item content | PATCH items + `customized=true` | Inline soft edit |
| Partial regenerate section | `POST …/partial-regenerate` | “Refresh this part” |
| Full regenerate today | generate with override | Confirm: keep / replace |
| Swap caregiver / mood then regen | Re-enter deltas → generate | Progressive, not wizard |

### Never require

- Re-entering Discovery  
- Re-picking age  
- Choosing AI vs Standard  
- Clearing the whole day to change one block  

---

## Adaptation

### Already supported (mark PRESENT)

| Signal | Effect |
|---|---|
| Item complete / skip | Status + outcomes memory |
| Feedback signals | `routine_feedback` write-only |
| Daily signals / energy | Next generate context |
| Adaptations strings | Why card |
| Customized flag | Protects parent edits on later AI |

### Experience representation (PRESENT)

- After skip: soft “We’ll remember this felt heavy” only if feedback captured  
- After complete: quiet continuity, not confetti storm  
- Next day: Home Begin uses new context without speechifying surveillance  

### FUTURE (do not pretend)

| Capability | Status |
|---|---|
| Live mid-day auto-rewrite of remaining blocks without explicit regen | FUTURE |
| Wearable / voice-driven regen | FUTURE (patent package mentions; not verified as product) |
| Offline local-inference generation | FUTURE |
| Streaming token generation UI | FUTURE (engine is sync/poll) |

---

## Execution

### Primary surface

`/routines/:id` + Today Home NRT / now bar (existing).

### Experience laws

- One current block magnified  
- Past blocks calm  
- Future blocks soft  
- Exit to life / Home always available  
- No XP / coins as emotional frame  

---

## Completion

### When the day is done

| Moment | Continuity (do not modify those systems in manufacturing yet) |
|---|---|
| All meaningful blocks done | Soft “You’ve carried today” |
| Today Home | Tomorrow NRT / rest |
| Amy Coach | Quiet path only if parent wants a concern |
| Amy Audio | Quiet listen later |
| Parent Hub | Rooms for Help / Care / Understand — never steal Begin |
| Next generate | Uses history + signals automatically |

### Memory

Preserve existing: completions, feedback, personalization snapshots, journey progress.  
Experience only changes how memory is spoken — not storage.

---

## Continuity

```text
Welcome → Discovery → Today Home
              ↓
     Routine Generation (signature)
              ↓
     Execution in life / Home
              ↓
     Completion memory
              ↓
     Next day’s Home Begin
```

Hub remains a quiet neighbour — never the owner of generate.

---

## Premium

### Untouched

RevenueCat · plans · pricing · `routine_generate` lifetime count · `routinesMax` · soft activation deferral.

### Presentation direction

| Never | Prefer |
|---|---|
| Unlock theatre | Continue with AmyNest whenever you're ready |
| FOMO / countdown | We’ve shaped today — we can keep supporting you |
| Paywall before first felt plan | Value first (Boundary Law) |
| “Limited AI magic” | Continuity of care |

Study note: paywall reason remains `routines_limit` / `routine_locked` — copy only in later R7.

---

## Visual Direction

### Inherit (house)

Same FE `/experience/r1/` light · sanctuary materials · Quicksand hierarchy · spacing breath · motion restraint · Premium voice · a11y · exit to Home.

References: Welcome · Discovery · Today Home · Parent Hub · manufactured modules through Amy Audio.

### Signature (crown jewel — not new universe)

| Element | Direction |
|---|---|
| Photography | Today Home / Care arrival-relationship shots as hero |
| Generation transition | Soft veil + companionship lines — no neon |
| Day arc | Spatial storytelling: morning wash → day → evening calm |
| Cards | Living blocks, not SaaS rows |
| Why card | Quiet glass, not intelligence dashboard |
| Progress | Gentle fill / check — no XP |
| Empty / error | Companionship recovery |
| Patent UI | **Absent from emotional open**; legal status only in Settings/About if Founder verifies filing |

### Forbidden visual debt

Neon · 3D gimmicks · AI sparkle · patent strip · galaxy purple · equal form walls · dashboard KPI chrome.

---

## Interaction Direction

| Principle | Application |
|---|---|
| Progressive disclosure | Deltas under fold |
| One primary action | Build / Begin |
| Restraint | No mode pickers as peers |
| Truthful wait | Stage lines only if tied to real work |
| Fatigue | ≤3 seconds to understand why we’re here |
| Touch | Large Begin / complete targets |
| Reduced motion | Respect OS; no ceremony traps |

---

## Accessibility

| Requirement | Blueprint rule |
|---|---|
| Hierarchy | One h1 companionship / routine identity |
| Generation status | `aria-live` polite for stage changes |
| Controls | Accessible names on Begin, edit, skip, retry |
| Contrast | Sanctuary text on photography with readability veil |
| Focus | Trap-free sheets; return focus after generate |
| Motion | Prefer CSS opacity/transform; honor `prefers-reduced-motion` |
| Errors | Text + recovery actions, not color alone |

---

## Performance

| Concern | Experience strategy (no engine thaw) |
|---|---|
| AI latency | One CTA; silent fallback at 8s (existing) |
| Waterfall | Prefetch child/entitlements/journey before CTA when on Home |
| Perceived wait | Progressive truthful stages; skeleton day arc optional |
| Payload | Unchanged |
| Retry storms | Keep client max attempts; no new polling loops |
| Cache | Do not rely on process-local cache for UX promises |

---

## Patent / Differentiation Mapping

**Honesty line (unchanged from Deep Study):**  
Repository contains `patent/amynest_patent_package.html` — one Indian Provisional Specification with **15 indicative claims**. These are **NOT verified as 15 separately filed or granted patents.** Application number / priority date / grant status: **NOT VERIFIABLE** from available project sources.

| Concept (indicative) | Current engine / product mechanism | Visible consequence | Experience representation |
|---|---|---|---|
| Concurrent-safe env detection + preference preservation | Generate UI geo/meteo + weatherOutdoor; user override must win | Outdoor suitability influences day shape | Soft chip “Outdoor looks limited today” / parent can change |
| Hybrid AI + deterministic correction | generate-ai + pipeline + validators + dinner repair; standard fallback | Day stays health-safe even if AI slow/fails | One Build CTA; no AI vs Standard picker |
| Schedule constraints / school blocks | Templates + validators + fixed activities | School and commitments respected | Why: “School day shape” / fixed blocks visible |
| Caregiver-adaptive instructions | caregiver payload + family-routine tone | Wording fits who’s with the child | Chip “With {caregiver} today” |
| Meal enrichment / allergy / fridge | Meal libs + fridgeItems + diet | Safer meal options | Optional fridge delta; never claim medical certainty |
| Multi-platform orchestration | Web + Capacitor clients sharing API | Same plan across devices | Continuity — not a feature badge |
| Wearable / offline local inference | Mentioned in package future embodiments | — | **NOT VERIFIABLE / FUTURE** |
| Filing / grant status | Placeholders in package | — | **NOT VERIFIABLE** — do not claim in UI |

**Differentiation without exposing internals:** show outcomes parents feel (rest before bed, school honored, weather-aware, caregiver-aware, goals you shared) — never claim numbers or model traces.

---

## Production Safety

| Domain | Risk if manufacturing drifts | Blueprint control |
|---|---|---|
| Engine | Accidental thaw | Code freeze + CI checks remain |
| DB | Schema / uniqueness break | **DB impact = 0** |
| API | Contract drift | Call existing endpoints only |
| Duplicate day | Double save | Keep child+date unique + override UX |
| Partial generation | Orphan preview | Clear recovery; don’t silent-save invalid |
| Timeout / network | Abandoned parent | Retry / Home / fallback |
| App termination | Lost draft | Preserve input state |
| Existing routines | Overwrite without consent | Confirm replace |
| Customized | AI stomps edits | Honor `customized` |
| RevenueCat | Logic change | Presentation only |
| Firebase / Auth | Regression | Untouched |
| Analytics | Rename breaks funnels | No event renames in R2–R6 without order |
| Feature flags | Engine via flag | Living experience flag only (future) |
| Rollback | Stuck bad UX | `VITE_FF_ROUTINE_LIVING_V1=0` pattern (when introduced) |

---

## DB / API Impact

| Layer | R1–R11 manufacturing default |
|---|---|
| DB | **Zero** migrations |
| API | **Zero** contract changes |
| Engine files | **Zero** edits |
| Entitlements | **Zero** logic changes |
| Analytics implementation | **Zero** until ordered |
| Client experience files | Allowed later under phases |

---

## Analytics

### Keep emitting (do not rename yet)

Existing generation / save / complete / paywall / first-value events from Deep Study §18.

### FUTURE telemetry (do not add yet)

- Time from entry → preview  
- Delta-panel open rate  
- Silent fallback rate (product KPI)  
- Why-card engagement  
- Soft-edit vs full regenerate  

---

## Risks

### Top 5 production risks

1. Thawing frozen timing / dinner integrity  
2. Breaking child+date uniqueness or customized protection  
3. Changing entitlement burn rules while redesigning CTA  
4. Auto-save Begin that creates invalid/duplicate routines  
5. Deep-link / Hub chrome regressing Home ownership  

### Top 5 UX risks

1. Still feeling like a form wizard  
2. Fake AI theatre replacing patent theatre  
3. Too many deltas before first plan  
4. Why-card inventing surveillance  
5. Result as spreadsheet, not living day  

---

## Implementation Phases

| Phase | Goal | Likely files | Engine | DB | API | Analytics | Risk | Rollback | Testing | Founder review |
|---|---|---|---|---|---|---|---|---|---|---|
| **R1** | This blueprint | `docs/v2/ROUTINE_GENERATION_R1_EXPERIENCE_BLUEPRINT.md` | 0 | 0 | 0 | 0 | Low | N/A | Doc | **This document** |
| **R2** | Entry / context living open | `pages/routines/generate.tsx` presentation · living helpers/CSS · Today Home bridge copy only if needed | 0 | 0 | 0 | 0 | Med | Living flag OFF | Unit + a11y | Yes |
| **R3** | Generation experience | generate loading/stages presentation · unify CTA | 0 | 0 | 0 | 0 | Med | Flag | Fallback path tests | Yes |
| **R4** | Result experience | preview / adaptations presentation · day arc hierarchy | 0 | 0 | 0 | 0 | Med | Flag | E2E smoke generate→preview | Yes |
| **R5** | Editing / adaptation UX | detail soft edit chrome · partial regen copy | 0 | 0 | 0 | 0 | Med | Flag | customized regression | Yes |
| **R6** | Execution / completion | detail + Home continuity copy | 0 | 0 | 0 | 0 | Med | Flag | NRT / complete flows | Yes |
| **R7** | Premium continuity | paywall moment copy only | 0 | 0 | 0 | 0 | High if logic touched | Flag | Gate tests | Yes |
| **R8** | Visual polish | materials/photo/motion restraint | 0 | 0 | 0 | 0 | Low | Flag | Visual regression vs Home | Yes |
| **R9** | Accessibility | live regions, focus, contrast | 0 | 0 | 0 | 0 | Low | Flag | a11y checklist | Yes |
| **R10** | Performance perception | prefetch / progressive reveal | 0 | 0 | 0 | 0 | Med | Flag | Slow-network smoke | Yes |
| **R11** | Production hardening | recovery, offline empty, deep-link hygiene | 0 | 0* | 0* | optional later | Med | Flag | Chaos paths | Yes + Apple note |

\*Any API/DB need = **STOP and report** — out of experience scope.

---

## Definition of Done

Routine Generation manufacturing is **not** done when UI is merely beautiful.

DONE requires all of:

| Gate | Criterion |
|---|---|
| Architecture | Engine frozen; adapter above only |
| Personalization | Every visible claim sourced |
| Explanation | Truthful; no CoT; no surveillance |
| UX | Tired parent understands WHAT/WHY/WHEN/HOW in one breath |
| Visual | Same AmyNest house; signature depth without neon |
| Accessibility | Live regions, focus, contrast, reduced motion |
| Performance | Fallback silent; no retry storms |
| Production safety | Unique day, customized, entitlements intact |
| Conversion | Value before paywall pressure; continuity voice |
| Continuity | Home owns Begin; Hub quiet |
| Patent honesty | No invented filings/grants; no claim theatre in open |
| No invented capability | FUTURE marked where engine cannot |

---

## Founder Questions

### 1. What is the single signature moment?

The calm beat when today’s living plan appears — and the parent understands Amy shaped **this day for this child** — not the loading spinner.

### 2. What should the parent remember after generating a routine?

“Amy already knew enough, asked almost nothing, and gave us a kind plan we can begin.”

### 3. What makes this fundamentally different from a generic AI planner?

Certified hybrid orchestration with health geometry, caregiver/environment/school integrity, deterministic correction, and Home continuity — not chat→LLM→checklist.

### 4. What demonstrates differentiation without exposing internals?

Visible consequences: school-shaped day, weather-aware outdoor choice, caregiver tone, dinner safely before rest, goals you shared reflected in adaptations.

### 5. What must remain completely invisible?

Prompts, model identity, pipeline code paths, patent claim numbers, CoT, entitlement math internals, cache/semaphore mechanics.

### 6. What should be editable?

Today’s deltas (mood/caregiver/weather/plans/fridge), individual blocks (soft), skip/complete, partial refresh, full day replace with consent.

### 7. What should never require manual configuration?

Age, discovery baseline, country geometry, dinner–sleep health rules, AI vs Standard path choice, re-onboarding.

### 8. Top 5 production risks?

Engine thaw · uniqueness/`customized` break · entitlement burn change · unsafe auto-save · Home/Hub ownership regression.

### 9. Top 5 UX risks?

Form relapse · fake AI theatre · delta fatigue · surveillance copy · spreadsheet result.

### 10. What would make this look like a SaaS planner?

Multi-step configuration wall, dual mode toggle, KPI dashboard, unlock badges, patent strip, dense tables.

### 11. What would make this feel like AmyNest’s crown jewel?

Same house light as Today Home; one Build; truthful wait; living day arc; safe why; Begin into life; Premium as continuity; intelligence felt as care.

---

## Final Recommendation

| Item | Decision |
|---|---|
| R1 Blueprint | **Ready for Founder approval** |
| Engine | **Remain frozen** |
| Next | On approval → **R2 Entry / Context** experience-only manufacturing |
| Patent UI | Keep out of emotional open until filing status verified by Founder |
| Success metric | Time-to-understanding + Begin into life — not “more AI” |

### STOP

No implementation performed.  
Commit contains **only** this blueprint.

**Waiting for Founder approval before Routine Generation manufacturing.**
