# Routine Generation — Deep Study (Study Only · No Implementation)

**Status:** STUDY COMPLETE — NO IMPLEMENTATION  
**Date:** 2026-08-08  
**Authority:** Founder Order — Routine Generation Deep Study  
**Mode:** Read-only audit of the existing system  

**ABSOLUTE STOP:** No React · No CSS · No DB · No API · No RevenueCat · No Firebase · No analytics · No feature-flag · No engine rewrite · No patent claims invented · No pricing changes.

**Frozen / LOCKED manufactured surfaces remain untouched** (Welcome through Amy Audio).

---

## 1. Executive Summary

Routine Generation is AmyNest’s **core activation product** and the system where child/parent context, discovery, Today Home, and Amy intelligence converge into a **saved daily schedule**.

### What is true in code today

| Truth | Evidence |
|---|---|
| Production engine is **certified and frozen** (June 2026) | `docs/routine-engine/v1-certified-architecture.md`, `.cursor/rules/routine-engine-freeze.mdc` |
| Certified path is **rule-based + intelligence pipeline**, not open-ended LLM scheduling | `resolveRoutineGenerationInputs → generateRuleBasedRoutine → intelligence pipeline → repairDinnerAnchor` |
| AI path exists as enrichment / alternate generate with heavy post-validation + fallbacks | `POST /api/routines/generate-ai`, `lib/routine-generation-client.ts` |
| Experience layer is **activation / form / SaaS planner**, not a manufactured AmyNest sanctuary room | Founder Portfolio Audit; `/routines/generate` form wizard |
| Monetization is **lifetime free generations** (`routine_generate` × 3) + soft activation deferral | `subscriptionService` / journey / paywall `routines_limit` |
| Patent material in-repo is **one Indian Provisional Specification package** with **15 indicative claims** | `patent/amynest_patent_package.html` |
| Filing number / priority date / grant status | **Not verifiable from available project sources** (placeholders in package) |

### One-line recommendation

**Do not rewrite the engine.** Freeze architecture further. Manufacture only the **experience layer** above the frozen engine after Founder approval of a blueprint — never treat this as another destination module.

---

## 2. Current Architecture

### Verified production generation path (certified)

```
resolveRoutineGenerationInputs()
  → generateRuleBasedRoutine()
  → runIntelligencePipelineOnItems() / runRoutineIntelligencePipeline()
  → repairDinnerAnchor()
```

**Entry:** `artifacts/api-server/src/routes/routines.ts`  
**Certification:** 54-scenario matrix · 0 FAIL · dinner–sleep gaps 60/90/120 min by age · country profiles (IN/AE/US tuned)

### Client dual-path

| Mode | Client | Server |
|---|---|---|
| Standard | `fetchStandardRoutine` | `POST /api/routines/generate` |
| Amy AI | `fetchAmyAiRoutine` (35s timeout, 2 attempts, 8s slow fallback to standard) | `POST /api/routines/generate-ai` (`gpt-4o-mini` JSON) then same pipeline / validators |

### Persistence

Generate returns a **preview** → client `POST /api/routines` saves → unique `(child_id, date)`.

### Layers above the frozen engine (allowed to evolve)

- Kidschedule UI / timeline display  
- Premium / journey gates  
- Analytics / feedback collection  
- Explainability card copy (`adaptations[]`)  
- Amy Coach / other modules  

---

## 3. Architecture Diagram

### Real architecture (verified)

```text
Parent / Child Profile (DB: children + parent profile)
        ↓
Discovery / onboarding outputs (goals, wake/sleep, school, diet…)
        ↓
Today context (date, weekend, timezone) + optional geo/weather
        ↓
Generate UI inputs (mood, caregiver, fridge, special plans, fixed activities)
        ↓
Entitlement / journey gate (routine_generate)
        ↓
┌─────────────────────────────────────────────┐
│ Routine Generation Engine (FROZEN v1.0)     │
│  inputs → rule templates → intelligence     │
│  pipeline → dinner integrity → validators   │
│  optional AI enrich with deterministic      │
│  correction / fallback to standard          │
└─────────────────────────────────────────────┘
        ↓
Routine Object { title, items[], adaptations[] }
        ↓
Validation (trust / fixed-activity / safety)
        ↓
Persistence (routines table · child+date unique)
        ↓
Presentation (/routines/:id · Today Home NRT)
        ↓
Execution (complete / skip / delay items)
        ↓
Feedback / daily signals / personalization snapshots
        ↓
Future adaptation (next generate reads history)
```

### Idealized Founder stack vs reality

The Founder’s proposed stack is **directionally correct**. Reality adds:

- Explicit **entitlement gate before engine**  
- **Dual AI/standard** with fallback, not a single AI oracle  
- **Preview → save** rather than auto-persist on generate  
- **Frozen dinner/sleep geometry** as hard health constraints  

---

## 4. Current UX Audit

### Entry

| Source | Behaviour |
|---|---|
| Today Home Begin | Existing routine → `/routines/:id`; else `/routines/generate?childId=` |
| Tab `/routines` | List / today’s plan |
| Post-onboarding | Today Home V1 → `/dashboard`; kill switch → `/routines/generate` |
| Parent Hub | Legacy generate tile still present in code; Rooms V1 constitution says Home owns Begin |
| Deep links | `/routines/generate`, `/routines`; some notifications emit `/routine` (singular) — client route match **uncertain** |
| Progress / activation banners | Resume / empty CTAs to generate |

### First impression

A **multi-step planner form**: child pick → context inputs (mood, caregiver, weather, school, fridge, special plans, fixed activities) → Generate / Amy AI → loading (including patent-pending copy) → preview → Save → detail.

### What the parent believes Amy is doing

“Amy is inventing my child’s day with AI.”

### What Amy is actually doing technically

1. Gathering profile + today inputs  
2. (Optional) calling LLM for structured plan  
3. Running **deterministic templates + intelligence pipeline + dinner integrity**  
4. Validating / repairing health constraints  
5. Returning adaptations strings for “why this differs”  
6. Waiting for parent to **save**  

**Mismatch:** Marketing / patent loading copy oversells “AI invents the day”; certified truth is **hybrid orchestration with deterministic correction**.

### Abandonment / friction points (from code + prior audits)

- Form length / number of decisions before value  
- Dual Standard vs Amy AI choice can feel like product dialect  
- Loading that surfaces patent theatre  
- Existing-routine override / regenerate complexity  
- Paywall after free generations  
- Documented activation drop (first-value hero notes ~18% dashboard→generate reach historically)

---

## 5. Current UI Audit

| Surface | Character |
|---|---|
| `/routines/generate` | Large form wizard · cards · badges · patent microcopy · family mode branch |
| Loading | Patent-pending loading keys (`patent_pending.loading_*`) |
| Result preview | Item list + adaptations card + save CTA |
| `/routines` | List / today plan · regenerate CTAs |
| `/routines/:id` | Execution timeline · complete/skip · partial regenerate · feedback |
| Today Home | Soft Begin / NRT — closer to house language |
| Visual vs manufactured modules | Still separate “planner app” universe vs Welcome / Hub sanctuary |

---

## 6. Data Flow

### Inputs (verified)

**Request body (GenerateRoutineBody):**  
`childId`, `date`, `hasSchool`, `specialPlans`, `fixedActivities`, `fridgeItems`, `mood`, `caregiver`, `weatherOutdoor`, `region`, wake/school times, `schoolMealMode`, `confirmBlockingFixedActivities`, plus client enrichment (`timezone`, `dayContext`, lat/lng for env).

**Server-loaded profile:**  
Age → age band; wake/sleep/school; goals / parentGoals; energyProfile; diet/allergies/cuisine; fixed activities; country profile; previous routine meals/activities; `child_daily_signals`; learning weights; environmental context.

**Discovery:** Feeds child profile fields used later; does not call the engine directly from Discovery film.

### Outputs

`{ title, items[], adaptations[], fixedActivitiesResult?, success?, fallback? }` → save to `routines`.

### State transitions

```
idle → collecting inputs → generating (standard|ai)
  → validation error | paywall | preview
  → saving → saved detail
  → executing items → completed / feedback
  → regenerate / partial-regenerate (may not burn free quota if same child+date)
```

---

## 7. DB Audit

| Table | Role | Key constraints |
|---|---|---|
| `routines` | Daily plan | Unique `(child_id, date)`; `items` jsonb; `ui_prefs`; `customized`; `adaptations` |
| `routine_journey` | Free journey / generations completed | Unique `user_id` |
| `routine_personalization_snapshots` | Activity keys per child+date | Personalization memory |
| `routine_activity_outcomes` | Completion/skip counts | Adaptation input |
| `routine_feedback` | Write-only signals | `worked_well`, `loved_this`, `too_tiring`, `skipped`, `bedtime_smooth` |
| `child_daily_signals` | Prior-day mood/sleep/completion | Unique `(child_id, date)` |
| `children` | Goals, wake/sleep, school, diet, fixed activities, energy profile | Engine inputs |
| `parent_task_completions` | Companion checklist | Not engine core |

### Migration / risk notes (study only)

- One routine per child per day → regenerate replaces / overrides carefully  
- `customized=true` must continue to protect parent edits  
- No schema change recommended in manufacturing phases without Founder thaw  
- Duplicate prevention = unique index (good)  
- Feedback layer documented as **above** frozen engine  

---

## 8. API Audit

| Method | Route | Notes |
|---|---|---|
| POST | `/api/routines/generate` | Certified path + gate |
| POST | `/api/routines/generate-ai` | OpenAI + pipeline; long timeout |
| GET | `/api/routines` | List |
| GET | `/api/routines/check` | Exists for child+date |
| POST | `/api/routines` | Persist |
| GET | `/api/routines/:id` | Detail |
| PATCH | `/api/routines/:id/items` | Edit / completion |
| PATCH | `/api/routines/:id/ui-prefs` | UI prefs |
| DELETE | `/api/routines/:id` | Delete |
| POST | `/api/routines/:id/partial-regenerate` | Section regen |
| GET | `/api/routine-journey/status` | Free journey |
| POST | `/api/routine-journey/sync-legacy` | Legacy usage migrate |
| POST | `/api/routine-feedback` | Feedback |
| POST | `/api/explain/routine` | Explainability |

**Errors of note:** 402 `routine_locked` · 422 validation / fixed-activity blocking · 429 busy / rate limit.

**Do not change contracts** in experience manufacturing without Founder order.

---

## 9. AI / Engine Audit

### Frozen Tier-1 files (must not change without thaw + recertification)

- `routine-country-profile.ts`  
- `routine-meal-dinner-integrity.ts`  
- `routine-input-validation.ts`  
- `routine-templates.ts`  
- `routine-intelligence-pipeline.ts`  
- `routes/routines.ts`  

### Additional Tier-2 frozen (scheduler, validators, meals, AQI, sleep)

See `docs/routine-engine/ROUTINE_ENGINE_FROZEN_FILES.md`.

### Adjacent intelligence (present; treat carefully)

Examples under `artifacts/api-server/src/lib/`:  
`routine-decision-engine.ts`, `routine-priority-engine.ts`, `routine-optimization-engine.ts`, `routine-context-builder.ts`, `routine-parent-intelligence.ts`, `routine-family-intelligence-moat.ts`, `routine-personalization-memory.ts`, `routine-adaptive-completion.ts`, trust/safety validators, emergency fallback.

### AI behaviour

- Model: `gpt-4o-mini` JSON object mode  
- Prompt includes age, school, diet, mood, goals, fridge, caregiver, weather, infant/parent context  
- Post-AI: deterministic correction / pipeline / validators  
- Client: AI fail → retry → standard; slow (>8s) race to standard; emergency client fallback available  

### Idempotency / caching

- In-memory generation cache ~24h TTL (process-local — multi-instance hits not guaranteed)  
- Regenerating existing child+date **does not burn** free generation quota (gate logic)  
- Unique DB constraint prevents duplicate saved days  

---

## 10. Personalization Audit

| Signal | Used? |
|---|---|
| Age / developmental band | Yes (templates + gaps) |
| Country / region geometry | Yes (frozen profiles) |
| Goals / parent goals | Yes (prompt + intelligence) |
| Mood / caregiver / weather | Yes (UI → payload) |
| Fridge / special plans | Yes |
| Fixed activities | Yes (can block) |
| Prior routine / anti-repetition | Yes |
| Daily signals / energy profile | Yes (server context) |
| Feedback outcomes | Collected; adaptation over time |
| Discovery answers | Via persisted child fields |
| Surveillance of private thoughts | **Not present** — only explicit/shared/completed data |

Safe user-facing explanation should use **`adaptations[]` and known inputs** (“you chose outdoor limited”, “school day”, “shorter sleep yesterday”) — never chain-of-thought.

---

## 11. Patent / Differentiation Evidence

### What exists in the repository

| Asset | Location | What it is |
|---|---|---|
| Provisional Specification package | `patent/amynest_patent_package.html` | Single Indian Provisional Specification (Form 2 style) |
| Title | Same | “A SYSTEM AND METHOD FOR ADAPTIVE CHILD DEVELOPMENT ROUTINE GENERATION USING CONTEXT-AWARE ENVIRONMENTAL AND CAREGIVER-ORIENTED COMPUTATIONAL PROCESSING” |
| Applicant / inventor | Same | Ankur Raman (as written in package) |
| Indicative claims | Same §7 | **15 claim slots** (1–15 including 5A, 5B, 8A) across Categories A–D |
| Drawings | Figures 1–4 | Orchestration, env detection, hybrid pipeline, meal enrichment |
| Product UI badges | `patent-badge.tsx`, i18n `patent_pending.*` | Marketing “Patent Pending” microcopy |
| Engine docs | `docs/routine-engine/*` | Certification / freeze — not a patent filing |

### Critical verification limits

| Question | Answer |
|---|---|
| Are there 15 separately filed patents? | **Not verifiable.** Repo shows **one provisional package with 15 indicative claims**. |
| Application number? | **Not verifiable** (not present). |
| Priority / filing date? | Package shows placeholder `[Date of Filing of this Provisional]`. |
| Granted patents? | **Not verifiable from available project sources.** |
| Is every marketing “patent-pending” claim legally accurate today? | **Not verifiable from available project sources** — treat as product copy until Founder confirms filing status. |

### Indicative claim categories → implementation mapping (evidence-based)

| Category | Theme | Implementation evidence | Status |
|---|---|---|---|
| A (claims ~1–5B) | Concurrent-safe env detection; preference preservation; geo/meteo; outdoor suitability injection | `generate.tsx` Open-Meteo mapping; env UI; payload `weatherOutdoor`; shared in-flight patterns in generate flow | **Partially demonstrable** in client generate UX + payload threading |
| B (claims ~6–8A) | Hybrid AI + deterministic correction; schedule constraints | Frozen rule path + AI path + pipeline + dinner integrity + validators | **Strongly demonstrable** for hybrid correction; AI is not sole authority |
| C (claims ~9–11) | Meal-option enrichment / allergy / cuisine | Meal integration / options safety libs; fridge inputs | **Demonstrable in engine libs** (details in meal modules) |
| D (claims ~12–15) | Multi-platform / async coordination | Web + Capacitor clients; shared API | **Partially demonstrable**; wearable/voice/offline-local embodiments mostly **future / not verified** |

### Differentiation that is real without inventing patents

1. Age-aware dinner→sleep health geometry (certified)  
2. Country profile windows  
3. Hybrid AI with deterministic correction (not raw LLM schedule)  
4. Caregiver-aware instruction adaptation  
5. Environmental outdoor suitability as first-class input  
6. Fixed-activity blocking integrity  
7. Adaptations explainability strings  
8. One-child-one-day persistence with regenerate rules  

---

## 12. Previous vs Future

| Dimension | CURRENT | AMYNEST WORLD-CLASS DIRECTION |
|---|---|---|
| Architecture | Frozen certified hybrid engine + form UI | Keep engine; experience becomes Home room of intelligence |
| Product | Activation generator / planner SKU | Signature product: “Amy planned today with you” |
| UX | Many decisions before value | One calm begin; progressive disclosure |
| UI | Form wizard + patent loading | Sanctuary film continuing Today Home |
| Visual | Planner / SaaS cards | Same house light as Welcome / Home; signature depth, not neon |
| Interaction | Configure → Generate → Save | Understand → Begin → Live the day |
| Personalization | Rich inputs, uneven explanation | Safe “why” from adaptations + shared inputs |
| Generation | Dual Standard/AI dialect | One quiet generate; engine chooses path |
| Explanation | Adaptations card (good seed) | First-class trust layer, never CoT |
| Progress | Detail completion | Today Home continuity + gentle memory |
| Editing | PATCH items / partial regen | Soft edit without breaking trust |
| Completion | Item statuses + feedback | Celebration without gamification theatre |
| Premium | Lifetime 3 gens → paywall | Continuity after value felt |
| Trust | Patent badges + science tone | Calm competence; legal claims only if verified |
| Performance | Waterfalls + AI latency | Perceived instant via progressive reveal; keep fallbacks |
| Accessibility | Mixed form density | Fatigue-proof hierarchy |

---

## 13. World-Class UX Direction (Conceptual Only)

Parent should understand:

1. **Why this routine** — from safe adaptations + chosen inputs  
2. **What Amy considered** — age, school day, weather suitability, caregiver, goals you shared  
3. **What to do next** — one begin action into today’s first block  
4. **What the child gets** — calm day shaped for them  
5. **What happens next** — Home owns the day; routine adapts tomorrow  
6. **How to change it** — soft edit / regenerate without shame  
7. **How progress is remembered** — completions + signals (already stored)

**Never:** expose chain-of-thought · invent medical certainty · invent surveillance · invent patent numbers.

---

## 14. World-Class Visual Direction (Conceptual Only)

### Inherit from manufactured home

Same FE photography family · sanctuary materials · typography · spacing · motion restraint · Premium continuity · exit philosophy · accessibility.

### Unique to Routine Generation (signature, not new universe)

- Feels like the **heart of the house**, not another room mall tile  
- Generation state = quiet presence (“Amy is shaping today”) not patent theatre  
- Result = living day arc, not spreadsheet of tasks  
- Depth through hierarchy and trust, not neon or XP  

### Avoid

- Generic AI demo  
- SaaS dashboard  
- Long equal form sections as first pixels  
- Patent strip as emotional open  
- Spotify/catalogue energy  

---

## 15. Production Safety

| Domain | Current state | Manufacturing implication |
|---|---|---|
| DB | Stable unique child+date | **No schema change** without Founder thaw |
| API | Stable contracts | Presentation-only preferred |
| Auth / Firebase | Standard protected routes | Untouched |
| RevenueCat | `routine_generate` lifetime 3; `routinesMax` 2 | **No pricing/plan changes** |
| Analytics | Rich lifecycle events | Do not rename casually |
| Feature flags | Today Home / first-value / MRR limit experiment | Do not redefine engine via flag |
| Routing | `/routines*` | Preserve deep links |
| Existing users | Saved routines + journey | Backward compatible only |
| Concurrency | Inflight semaphore 40; AI rate 5/60s | Keep |
| Partial save | Preview then POST | Keep; harden UX around abandonment |
| Payment interrupt | Soft defer until first routine | Keep Boundary Law |
| App kill mid-generate | Client recovery UI exists | Preserve recovery |
| Network loss | Fallbacks / emergency path | Preserve |
| Rollback | Engine freeze + git; UI flag pattern available for future living face | Prefer experience flag, never thaw engine lightly |

---

## 16. Performance

| Risk | Detail |
|---|---|
| AI latency | 35s client timeout; 8s slow fallback to standard |
| Waterfall | Child + entitlements + journey + geo/weather before generate |
| Polling | Job poll defaults ~40s envelope |
| Cache | Process-local 24h — not a distributed guarantee |
| No streaming | Sync JSON / job poll only |
| Concurrent generation | Server semaphore + per-user AI queue |
| Highest risk | Perceived wait on AI path + form time-to-first-value |

---

## 17. Conversion

| Question | Finding |
|---|---|
| Where value becomes obvious? | After a credible day plan appears and Begin works on Home/detail |
| Friction before value? | Long form + dual AI mode + patent loading |
| Paywall location? | After free `routine_generate` uses; reason `routines_limit` |
| Enough value before pay? | Soft deferral protects first activation — good Boundary Law |
| Premium feel? | Risk of interruption if form fails before value; continuity language required later |
| Pricing changes? | **Out of scope** this phase |

---

## 18. Analytics

### Present (non-exhaustive)

`routine_generation_started` · `routine_generated` · `routine_generation_failed` · `routine_cta_clicked` · `routine_generation_completed` · `routine_opened` · `routine_saved` · `routine_shared` · `first_value_achieved` · `today_nrt_shown` / `today_nrt_cta` · `routine_viewed` · `routine_item_completed` · `routine_item_skipped` · `routine_feedback_submitted` · `first_routine_generated` · `routine_limit_reached` · subscription funnel companions.

### Likely gaps (do not add yet)

- Time-to-first-preview  
- Input abandonment by section  
- Standard vs AI path choice rates  
- Fallback rate visibility as product KPI  
- Soft-edit vs full regenerate  
- Explainability card engagement  

---

## 19. Risks

| Risk | Severity |
|---|---|
| Accidental thaw of frozen timing files | **Critical** |
| Experience rewrite that changes payload semantics | High |
| Patent marketing claims without verified filing status | Legal / trust |
| Treating Routine Generation as “just another module” | Strategic |
| AI-only redesign that removes deterministic health gaps | Child-safety |
| Breaking `(child_id, date)` uniqueness / customized flag | Data integrity |
| Paywall before first value | Activation death |
| Hub competing with Home Begin | Product confusion |

---

## 20. What Must Not Change

1. Frozen engine Tier-1 / Tier-2 timing & geometry files (without thaw protocol)  
2. Dinner–sleep gap rules  
3. Country profile certified values (unless recertified launch)  
4. Unique `(child_id, date)`  
5. `customized` respect  
6. RevenueCat plans / pricing / entitlement math  
7. Auth / Firebase  
8. Existing saved routines for users  
9. Deep-link paths `/routines`, `/routines/generate`, `/routines/:id`  
10. Activation defer Boundary Law (Home owns Begin)  
11. Analytics event names (until deliberate migration)  
12. Health / trust validators’ safety outcomes  

---

## 21. What Must Change (Experience Only — After Approval)

1. Opening emotional film (continue Today Home, not planner SaaS)  
2. Decision count before first valuable preview  
3. Remove patent theatre from default emotional open (legal status can live in Settings/About if verified)  
4. Unify Standard vs Amy AI as one calm generate (engine still dual under the hood)  
5. Result as day arc / companionship, not spreadsheet  
6. Premium continuity language after value  
7. Align residual Hub generate chrome with Constitution (Home owns Begin)  
8. Clarify “what Amy considered” via safe adaptations  

**Not in scope until Founder orders:** engine rewrite, new patents narrative, pricing, DB migrations.

---

## 22. Implementation Phases (Plan Only)

| Phase | Goal | Likely files | DB | API | Analytics | Risk | Rollback | Tests | Reviews |
|---|---|---|---|---|---|---|---|---|---|
| **R0** | Architecture freeze acknowledgement | Study + freeze docs only | 0 | 0 | 0 | Low | N/A | Freeze checks | Founder |
| **R1** | Experience blueprint (no code) | `docs/v2/ROUTINE_GENERATION_*_BLUEPRINT.md` | 0 | 0 | 0 | Low | N/A | Doc review | Founder |
| **R2** | Living opening + one primary begin | `pages/routines/generate.tsx` presentation · new living helpers/CSS | 0 | 0 | 0 | Med | `VITE_FF_ROUTINE_LIVING_V1=0` (if introduced) | Unit + a11y | Founder |
| **R3** | Generation state calm (no patent theatre) | generate loading UI only | 0 | 0 | 0 | Med | Flag | Visual | Founder |
| **R4** | Result experience (day arc) | preview + detail chrome | 0 | 0 | 0 | Med | Flag | E2E smoke | Founder + Apple readiness note |
| **R5** | Editing / adaptation soft UI | detail edit presentation | 0 | 0* | 0 | Med | Flag | Regression | Founder |
| **R6** | Completion / Home continuity | detail + Today Home copy bridges | 0 | 0 | 0 | Med | Flag | NRT tests | Founder |
| **R7** | Premium continuity presentation | paywall moments copy only | 0 | 0 | 0 | High if logic touched | Flag | Gate tests | Founder |
| **R8** | Visual polish / house match | CSS/materials | 0 | 0 | 0 | Low | Flag | Visual | Founder |
| **R9** | Accessibility / fatigue | labels, focus, hierarchy | 0 | 0 | 0 | Low | Flag | a11y | Founder |
| **R10** | Performance perception | progressive reveal; no engine thaw | 0 | 0 | optional later | Med | Flag | Perf smoke | Founder |
| **R11** | Production hardening | recovery copy; offline empty | 0 | 0 | 0 | Med | Flag | Chaos paths | Founder / Apple |

\*API impact remains **zero** unless a production blocker is found — then **STOP and report**.

Each phase: Goal · Files · DB=0 · API=0 · Analytics=0 (unless ordered) · Risk · Rollback · Tests · Founder review · Apple note.

---

## 23. Definition of Done (Before Implementation May Start)

Implementation must **not** begin until Founder confirms:

1. **Architecture freeze accepted** — engine remains certified path  
2. **Experience blueprint approved** — R1 document signed off  
3. **Patent communication policy** — what may be said in-product vs Settings only  
4. **Scope lock** — experience-only; no pricing; no DB; no API contract changes  
5. **Success metrics** — time-to-preview; activation; trust; not “more AI”  
6. **Rollback flag strategy** agreed  
7. **Home owns Begin** remains absolute  
8. **No CoT / no surveillance language** law accepted  
9. **Apple readiness** criteria for this surface defined  
10. **This Deep Study** accepted or amended by Founder  

---

## 24. Founder Questions

### 1. What is genuinely special about the current Routine Generation?

Hybrid **deterministic health geometry + intelligence pipeline + optional AI with correction**, caregiver/environment/fridge/school awareness, adaptations explainability, and certified country/age dinner–sleep integrity — not a generic chat planner.

### 2. What is technically complex?

Input resolution across profile/today/env; dual generate paths; validators; dinner repair; fixed-activity blocking; journey entitlements; family mode; regenerate vs customize; client fallbacks.

### 3. What is technically fragile?

AI latency/fallback races; process-local cache; geo/weather async vs user preference; Hub vs Home generate chrome; `/routine` singular deep links; form complexity causing activation drop.

### 4. What parts appear to represent the patent-related differentiation?

From the provisional package + code: concurrent-safe environmental orchestration; hybrid AI with deterministic correction; caregiver-adaptive instructions; meal enrichment; multi-platform orchestration narrative. **Claims are indicative in one provisional package — not verified as 15 granted patents.**

### 5. What cannot currently be verified?

IPO application number, exact filing date, whether provisional was filed, complete-spec status, grant status, and whether “15 patents” means 15 filings vs 15 claims.

### 6. What should NEVER be rewritten?

Frozen Tier-1/2 engine files; dinner–sleep gaps; child+date uniqueness; customized protection; entitlement math; auth; existing user routines.

### 7. What must be redesigned completely?

The **experience face** of `/routines/generate` (form/SaaS/patent theatre → AmyNest signature intelligence moment). Not the engine.

### 8. What should be preserved exactly?

Certified generation path, validators, save model, Today Home Begin ownership, soft paywall deferral to first routine, adaptations field, resume/regenerate semantics.

### 9. What is the biggest UX problem?

Too many decisions and product dialect before the parent feels Amy shaped today — plus patent/AI theatre mismatch with technical truth.

### 10. What is the biggest architecture risk?

Thawing or bypassing the frozen health geometry in a “simpler AI rewrite.”

### 11. What is the biggest production risk?

Breaking saved-day uniqueness / customized routines / entitlement accounting during an experience rewrite that accidentally touches save/gate logic.

### 12. What would make this look like a generic AI routine generator?

Chat prompt → LLM day plan → no health geometry · no caregiver/env · no deterministic correction · “Ask AI for a schedule” chrome.

### 13. What would make it unmistakably AmyNest?

Same house light as Today Home; one calm Begin; safe “why” from real inputs; living day arc; hybrid trust; Premium continuity; child-specific care without surveillance.

### 14. How to make patent-related differentiation visible without exposing proprietary CoT?

Show **outcomes parents feel**: weather-aware outdoor choice preserved, caregiver tone, dinner safely before bed, school blocks respected, meals that respect allergies/fridge — labeled as care decisions, not claim numbers or model traces.

### 15. What must be true before implementation begins?

See §23 Definition of Done — especially Founder approval of this study + R1 blueprint + patent communication policy + experience-only scope lock.

---

## 25. Final Recommendation

| Decision | Recommendation |
|---|---|
| Engine | **KEEP FROZEN** — do not rewrite |
| Study | **COMPLETE** — this document |
| Next allowed step | Founder approval → **R1 Experience Blueprint only** |
| Manufacturing | **NOT STARTED** |
| Patent language in UI | Pause spectacle until filing status confirmed by Founder |
| Positioning | Core signature product of AmyNest — manufacture as Home intelligence, not a module mall tile |

### STOP

No production implementation performed.  
No React/CSS/DB/API/RevenueCat/Firebase/analytics/feature-flag changes in this commit.  

**Waiting for Founder approval before ANY Routine Generation manufacturing.**

---

## Appendix A — Key File Index

| Area | Paths |
|---|---|
| Generate UI | `artifacts/kidschedule/src/pages/routines/generate.tsx`, `routine-generate-inputs.tsx`, `routine-environment-ui.tsx` |
| List / detail | `pages/routines/index.tsx`, `detail.tsx` |
| Client gen | `lib/routine-generation-client.ts`, `lib/routine-generation-analytics.ts` |
| API | `artifacts/api-server/src/routes/routines.ts` |
| Freeze docs | `docs/routine-engine/v1-certified-architecture.md`, `ROUTINE_ENGINE_FROZEN_FILES.md` |
| Patent package | `patent/amynest_patent_package.html` |
| DB | `lib/db/src/schema/routines.ts`, `routine_journey.ts`, `routine_feedback.ts`, `routine_personalization.ts`, `child_daily_signals.ts` |
| Today Home | `lib/today-home/resolve-today-nrt.ts`, `pages/dashboard.tsx` |
| Activation | `lib/activation-gate.ts`, `lib/first-value-*` |

## Appendix B — Entry Map (condensed)

`/routines` · `/routines/generate` · `/routines/:id` · Today Home Begin · post-onboarding (flagged) · Parent Hub legacy tile · journey/notifications · progress empty · activation resume · marketing `/routine-by-age/:age` · `/child-routine-planner`
