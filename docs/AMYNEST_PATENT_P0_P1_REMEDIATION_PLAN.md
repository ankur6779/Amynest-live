# AMYNEST PATENT — P0/P1 GAP RESOLUTION PLAN

**Document type:** Remediation plan for a registered patent professional  
**Based on:** `docs/AMYNEST_ROUTINE_GENERATION_PATENT_FINAL_AUDIT.md` (14 Sep 2026)  
**Primary patent draft:** `patent/amynest_patent_package.html`  
**Date:** 14 September 2026  
**Status of this document:** Analysis and handoff only. **No patent files, claims, drawings, or source code were modified.**

**This is not a legal opinion.** It does not rewrite claims, certify patentability, or authorize public “patent pending” statements.

**Working rule for counsel:** Treat the current HTML package as a **draft**. Do not describe it as filed or as a final specification.

---

## 1. Executive Summary

The audit scored technical readiness **58/100 (Status B — CONDITIONAL)** because the draft discloses a real invention but **tells the wrong primary story**.

| Gap | Problem | Counsel action |
|-----|---------|----------------|
| **P0-1** | Certified production is **rules-first + deterministic intelligence pipeline**. Abstract, objects, Figure 3, Claims 6d/14, and §6.4.3 present **LLM → generation → post-correction** as the core. | Re-center specification on the certified path. Keep LLM as an **alternate item-source** that still enters the **same** pipeline. |
| **P0-2** | Wearable / voice-assistant / offline-local-inference generation are **not implemented**. Spec uses **present tense** (“is realised across”). §6.10 later calls them future. | Convert present-tense platform language to prophetic / alternative-embodiment language. Implemented clients: web + iOS Capacitor web + Android WebView. |

§6.4.1 already describes a rule-based path. The defect is **primacy and claim framing**, not total absence of rules.

**Confirmed AI positioning (from code, not invented):**

```
RULES-FIRST CORE (certified production generate)
+ DETERMINISTIC INTELLIGENCE PIPELINE (runs on both rule and AI item sources)
+ OPTIONAL / ALTERNATE LLM ITEM GENERATION (`POST /routines/generate-ai`)
+ OPTIONAL LLM MEAL-OPTION ENRICHMENT
+ VALIDATION / REPAIR (dinner anchor, trust gate, AQI)
```

**Do not** collapse the code name `runRoutineIntelligencePipeline` into “AI.” That function is deterministic multi-pass orchestration.

**Do not represent the application as filed until filing is actually completed and documented.**

---

## 2. Actual Routine Generation Architecture

Certified production path (June 2026 freeze):  
`docs/routine-engine/v1-certified-architecture.md`

Entry: `artifacts/api-server/src/routes/routines.ts`  
`POST /routines/generate` (standard / certified)  
`POST /routines/generate-ai` (alternate; on failure falls back to the rule path)

### 2.1 End-to-end flow (production)

```
UI INPUT (generate.tsx)
  → optional concurrent-safe weather detect (client)
  → POST /routines/generate
  → resolveRoutineGenerationInputs
  → generateRuleBasedRoutine
  → applyEnergyCurveToItems + environmental enrichments
  → runIntelligencePipelineOnItems
        → runRoutineIntelligencePipeline
              (includes repairDinnerAnchor, weather, culture, completion, energy heuristic, timeline integrity)
  → trust validation (refuse 422 if invalid)
  → JSON output to client
  → user save → persistence
```

Alternate:

```
POST /routines/generate-ai
  → LLM JSON schedule
  → meal attach / weather / energy
  → SAME runIntelligencePipelineOnItems
  → enforceRoutineSafety
  → if invalid or LLM fail → rule-based fallback
```

### 2.2 Stage-by-stage (each with file, function, I/O, next hop)

| Stage | File | Function | Purpose | Input | Output | Next |
|-------|------|----------|---------|-------|--------|------|
| 0. UI collect | `artifacts/kidschedule/src/pages/routines/generate.tsx` | form + `proceedGenerate` / `proceedAiGenerate` | Collect child, date, mood, caregiver, weather, school, fridge, special plans | User + child profile | HTTP body | Optional weather detect, then API |
| 0b. Weather handshake | same | `ensureWeatherDetected`, `detectWeatherOutdoorFromBrowser`, `mapOpenMeteoToWeatherOutdoor` | Concurrent-safe outdoor class; never overwrite tapped chip | Geo + Open-Meteo | `yes` / `no` / `limited` as `weatherForCall` | Injected into generate payload |
| 1. HTTP entry | `artifacts/api-server/src/routes/routines.ts` | `router.post("/routines/generate")` | Auth, parse, occupancy gate | JSON body | Child row + params | Input resolve |
| 2. Input resolve | `artifacts/api-server/src/lib/routine-input-validation.ts` | `resolveRoutineGenerationInputs` | Sanitize/default wake, sleep, school times, weather, mood, fridge, special plans | Raw times + flags | `ResolvedRoutineInputs` | Rule generator |
| 3. Rule generate | `artifacts/api-server/src/lib/routine-templates.ts` | `generateRuleBasedRoutine` | Deterministic day from age-band templates, `dateSeed(date, childName)` shuffle, meal banks, caregiver bonding density | Resolved inputs + child | `{ title, items, adaptations }` | Energy + env enrich |
| 4a. Energy (historical) | `artifacts/api-server/src/services/intelligenceAnalytics.ts` | `applyEnergyCurveToItems` | Swap learning/rest into observed peak/low windows if `sampleCount ≥ 3` | Items + `energyProfile` | Reordered items | Env enrich |
| 4b. Env enrich | environmental enrich module used from `routines.ts` | `applyEnvironmentalEnrichments` | Hydration / UV / indoor suggestions **after** weather+energy | Items + env context | Items + extra adaptations | Pipeline |
| 5. Intelligence pipeline wrapper | `routes/routines.ts` | `runIntelligencePipelineOnItems` | Build `RoutineContext`, call pipeline, surface validation | Items + resolved inputs + country/AQI/allergies | Validated items | Response or 422 |
| 5b. Pipeline core | `artifacts/api-server/src/lib/routine-intelligence-pipeline.ts` | `runRoutineIntelligencePipeline` | Family-intel prepare → behavior state → schedule/meals/weather/culture → emotion → completion → load → energy heuristic → fixed/special preserve → timeline integrity → dinner repair → explainability persist | Scheduled items + context | Polished items + adaptations | Dinner already inside this function |
| 6. Dinner repair | `artifacts/api-server/src/lib/routine-meal-dinner-integrity.ts` | `repairDinnerAnchor`, `getMinimumDinnerSleepGap` | Guarantee dinner exists, country dinner window, **60/90/120 min** dinner-end→bed gap by age | Items + country + sleep + ageMonths | Repaired items | Continues in pipeline; also in `routine-final-integrity.ts` |
| 7. Safety (partial regen / AI finish) | `artifacts/api-server/src/lib/routine-safety-gate.ts` | `enforceRoutineSafety` | AQI outdoor caps + blocking trust (sleep, dinner-before-bed ≥36mo, infant feeding) | Items + AQI + age | `{ valid, items, errors }` | Persist only if valid |
| 8. Output | `routes/routines.ts` | `res.json(GenerateRoutineResponse)` | Return schedule + parent adaptations | Validated artefact | Client preview | User save |
| 9. Persist | `routes/routines.ts` + routines table | save endpoints | Store chosen routine | Confirmed items | DB row | Later generate reads previous day |

**Important:** `repairDinnerAnchor` is **not** a separate HTTP stage after the pipeline on the certified path. It is invoked **inside** `runRoutineIntelligencePipeline` (and again from final integrity / emergency fallback). The certified-architecture one-liner lists it last because it is the last health-geometry guarantee, not because it is a distinct API.

**Do not map** `routine-generate-semaphore.ts` (Redis inflight cap, max 40) to Claim 1b’s “at most one environmental detection.” Different mechanism.

---

## 3. True Technical Invention

### 3.1 Most technically accurate description (implementation as of this audit)

> A computer-implemented child-routine orchestration system that (1) resolves caregiver and child context including a concurrent-safe outdoor-suitability classification; (2) **generates a candidate daily schedule from deterministic age-band templates** (certified primary path) or, alternatively, from a language-model draft; (3) **always** passes the candidate through a **deterministic multi-pass intelligence pipeline** that applies country time-windows, weather/AQI activity substitution, school-block exclusion, caregiver simplification, meal sanitization, historical energy-profile reordering, previous-day adaptation, and **age-banded dinner-to-sleep gap repair**; and (4) **refuses to return or persist** a routine that fails blocking trust validation.

That is a description of **what the code does**. It is **not** a claim draft and **not** a patentability conclusion.

### 3.2 CORE vs OPTIONAL vs ALTERNATIVE vs UNDERDISCLOSED

| Feature | Classification | Why |
|---------|----------------|-----|
| `resolveRoutineGenerationInputs` | **CORE** | Every generate path |
| `generateRuleBasedRoutine` + date-seeded shuffle | **CORE** (certified primary item source) | Frozen production path |
| `runRoutineIntelligencePipeline` (deterministic passes) | **CORE** | Runs on rule **and** AI item sources |
| `repairDinnerAnchor` + 60/90/120 gaps | **CORE** | Certified health geometry |
| Concurrent-safe weather handshake (`generate.tsx`) | **CORE** (client orchestration) | Best-supported Category A |
| Country sleep/dinner windows | **CORE** | `routine-country-profile.ts` frozen |
| Blocking trust validation / refuse-on-fail | **CORE** | 422 on invalid |
| Weather substitution `yes/no/limited` | **CORE** | Pipeline + templates |
| AQI outdoor duration limits | **CORE** (safety), underdisclosed | Inside `enforceRoutineSafety` / pipeline context |
| `POST /routines/generate-ai` LLM schedule | **ALTERNATIVE** item source | Same pipeline afterwards; fallback to rules |
| LLM meal-option enrich (exactly 4 dishes) | **OPTIONAL / ALTERNATIVE** | Rule path uses meal banks; enrich is a focused LLM call |
| `applyEnergyCurveToItems` (historical profile) | **CORE mechanism, gated** | No-op if `sampleCount < 3` |
| `previousDayContext` / adaptive completion / family moat | **CORE adaptation**, underdisclosed | Stateful, not one-shot |
| `simplifyForHandler` caregiver trim | **CORE** for substitute caregivers | Title prefix, not notes rewrite |
| Infant exclusive pipeline skip | **CORE** for 0–6 months | Underdisclosed |
| Wearable / voice / offline local LLM | **NOT IMPLEMENTED** | Prophetic only |
| Smart-home actuation | **NOT IMPLEMENTED** | §6.10 |
| Facial-expression emotion | **NOT IMPLEMENTED** | Mood **form input** exists (different) |
| `@workspace/safety` `validateRoutine` | **OPTIONAL** advisory route | Not the generate choke |
| Redis generate semaphore | **OPERATIONAL**, not invention | Do not claim as env-detect registry |
| Speech synthesis | Mentioned in spec; **not** generate core | Keep optional |
| OpenAI / Open-Meteo | **SUBSTITUTABLE providers** | Spec already service-agnostic — keep |

### 3.3 What AI/LLM actually contributes

| LLM does | LLM does not |
|----------|----------------|
| Draft a candidate schedule on `/generate-ai` | Guarantee safety |
| Fill meal **options** (exactly 4) when enrich runs | Place certified dinner-gap geometry |
| Consume previous-day meals/categories and learning weights **in the prompt** | Run the intelligence pipeline (that is TypeScript) |
| Fail closed: parse failure → unchanged meals; trust fail → throw → **rule fallback** | Replace `generateRuleBasedRoutine` as production default |

**Correct positioning for the specification (factual, not a claim rewrite):**

**RULES-FIRST CORE + DETERMINISTIC INTELLIGENCE/CONSTRAINT PIPELINE + OPTIONAL LLM AUGMENTATION + VALIDATION/REPAIR**

“Intelligence” here means the **named pipeline**, which is **not** generative AI. Counsel should pick vocabulary that does not equate those two.

---

## 4. P0-1 Remediation — Correct the core invention narrative

### 4.1 Locations that incorrectly imply LLM → generation → post-correction as primary

All in `patent/amynest_patent_package.html` unless noted.

| Section | Approx. locus | Current concept | Actual implementation | Required conceptual correction |
|---------|---------------|-----------------|----------------------|--------------------------------|
| Cover title | Title block | “adaptive … using context-aware environmental and caregiver-oriented computational processing” | Accurate at high level | Keep; ensure body matches certified path |
| TOC abstract (page 2) | ~191–196 | “Deterministic correction infrastructure **post-processes outputs from a language model**” as the generation story | Correction/pipeline runs on **rule** output first; LLM is alternate | Lead with template generate + pipeline; LLM post-process as alternate embodiment |
| Same abstract | ~199–202 | Multi-platform including wearable/voice/offline | See P0-2 | |
| §1 Field | ~217–223 | Relates to “hybrid AI processing and … correction of **probabilistic outputs**” as the field | Field is routine orchestration; hybrid is one embodiment | Field = deterministic contextual routine orchestration; hybrid AI as embodiment |
| §2 Background | ~254–257 | Problem framed as **probabilistic AI schedule errors** lacking correction | Production problem is also health geometry, school, AQI, dinner gap **without** an LLM | Keep AI-error problem as **one** background problem; add deterministic scheduling/health-geometry problem |
| §3 Objects | ~301–302 | Object: correct probabilistic outputs of an LLM | Incomplete | Add object: generate age/country-safe routines **without** requiring an LLM |
| §4 Summary, hybrid engine | ~322–323 | Hybrid GAI + rules listed co-equal | Rules are certified primary | State primary/alternate |
| §4 fourth aspect | ~343–347 | Correction **operative on GAI module** | Pipeline operative on **any** candidate including templates | Correction/pipeline operative on candidate schedules from rules **or** GAI |
| §4 fifth aspect | ~350–353 | Realised across wearable/voice/offline | P0-2 | Present tense → prophetic |
| §5 Fig 3 brief | ~371–373 | “Hybrid Generation Pipeline” AI path visually primary | Certified path is rules then pipeline | Figure 3 (or new Fig 2) must show rules-first; AI as parallel optional source |
| §6.1 architecture | ~400–409 | Server “houses … hybrid generation engine” then LLM as generation engine | Server houses **template engine + pipeline**; LLM optional | List template engine and pipeline as first-class; LLM as optional inference service |
| §6.3 age band | ~563–566 | Age guidance “injected into the **prompt supplied to the LLM**” as the transformation | Age primarily selects **template banks**; prompts only on AI path | Templates first; prompt injection as AI-path embodiment |
| §6.4 intro | ~576–579 | Two paths via distinct endpoints — **this part is accurate** | Confirmed `/generate` vs `/generate-ai` | **Keep.** Promote 6.4.1 as production/certified |
| §6.4.1 Rule-based path | ~581–591 | Exists and is mostly accurate | Certified primary | Label as **primary / certified production path**; mention pipeline after assembly (currently omitted here) |
| §6.4.2 AI path | ~592–597 | Accurate as a path | Alternate + fallback | Label **alternate**; disclose fallback to 6.4.1 |
| §6.4.3 Correction | ~599–621 | “**The probabilistic output of the LLM** is post-processed” as the only story | Same transforms run on rule items | State infrastructure runs on **candidate routines regardless of source** |
| §6.7 Phase B | ~685–698 | Meal options **are** an LLM call | True for enrich; false as default day meals | Phase A + meal **banks** as default; Phase B optional/alternate |
| Fig 1 SVG | ~1195–1247 | Boxes: Generative AI Module / Language Model Inference Engine as architecture center | Pipeline + templates are center | Demote LLM box to optional service |
| Fig 3 SVG + caption | ~1382–1486 | Caption: correction provides “deterministic correction of **probabilistic AI outputs**” | Pipeline also corrects rule output | Dual entry: rules **or** AI → shared correction/pipeline |
| Fig 4 Phase B | ~1542 | Constrained prompt → LLM as meal engine | Banks are default | Show bank path + optional LLM enrich |
| Claim 6c–e | indicative claims | Hybrid engine; correction **of GAI**; anti-repetition **into GAI prompt** | 6c partial; 6d/6e AI-centric | Counsel: specification support for rules-first independent generation; do **not** rewrite claims in this plan |
| Claim 9 | meal method | Entire method is LLM prompt | Banks + sanitizer on rule path | Dual embodiment in spec |
| Claim 14 | method | Requires receiving LLM output as step (a) | Valid **only** as AI-path method | Keep as AI-path claim; add spec support for rules-path analogue **without** calling it Claim 14 |
| Abstract (Form 2 box) | ~1058–1072 | Hybrid engine combines GAI with rules; correction as listed | Same primacy problem | Rules + pipeline first sentence; GAI second |
| §3(k) note | ~1112–1116 | Technical effect framed as correction of probabilistic outputs | Also: concurrent weather protocol; dinner-gap repair; duplicate-request suppression | Counsel may rely on **both** classes of technical effect; do not drop Category A |

**What not to do:** Delete AI. The AI path and meal enrich are implemented and should remain as **embodiments**.

**Developer deliverable to counsel:** this section + certified architecture doc.  
**Patent professional deliverable:** re-order specification narrative and figures; decide claim independence later.  
**This plan does not rewrite the patent.**

---

## 5. P0-2 Remediation — Unimplemented platform language

**Implemented clients for Routine Generation UI:**  
- Web browser (`artifacts/kidschedule`)  
- iOS Capacitor shell loading the same bundled web  
- Android **WebView** wrapper (`android/`) loading production web  

**NOT FOUND:** wearable routine generation, smartwatch app, voice-only generation, on-device/offline local LLM inference, smart-home actuation of routine slots.

### 5.1 Statement inventory

| File | Section | Current language | Code status | Risk | Counsel recommendation (not a legal decision) |
|------|---------|------------------|-------------|------|-----------------------------------------------|
| `patent/amynest_patent_package.html` | Page-2 abstract ~202 | “including … wearable, voice-assistant, and offline/local-inference embodiments” | Unimplemented | Present-tense overclaim | **C** (future) or **B** (alt embodiment), not **D** |
| same | §1 Field ~223 | “across … wearable, voice-assistant, and offline-inference platforms” | Unimplemented | Field recites unbuilt platforms | **C** |
| same | §3 Objects ~313–314 | Object: architecture **supporting** those embodiments | Unimplemented | Object vs enablement | **B** or **C**; “supporting” is softer than “is realised” |
| same | §4 fifth aspect ~350–353 | “the invention **is realised across**” those environments with “cross-platform parity” | Unimplemented | **Highest P0-2 risk** | **C**; do not use present-tense “is realised” |
| same | §6.1 ~394–396 | Client environments “include … wearable … local-inference” | Unimplemented | Architecture list as fact | **B/C**; list implemented first; others “may include” |
| same | §6.2.4 ~490–493 | Wearable gets coords from sensor/companion; voice from assistant location | **NOT FOUND** | Present-tense method | **C** |
| same | §6.9 ~716–718 | Functionally identical on wearable/voice/offline | Unimplemented | Identity claim | **C**; identity is true for **web shared across 3 shells** |
| same | §6.10 ~735–749 | Wearable biometrics, voice, offline LLM as “expressly contemplated” | Unimplemented | **Correct prophetic register** | **C retain** (this section is the right pattern) |
| same | Claim 4 | “implemented across two or more **selected from**” list including unimplemented | Web+mobile can satisfy if those two are selected | Depends on construction | **B** for list members; counsel restrict examples or keep Markush with implemented pair |
| same | Claim 12 | Independent multi-platform including same list | Broader | Same | Counsel; spec must not treat all five as built |
| same | Continuation strategy ~1104 | Points to §6.10 as future-proof | OK | Internal conflict with §4 | Make §4 match §6.10 |
| same | Fig 1 SVG ~1257 | Footer: “wearable · voice · smart-home · offline” as peer clients | Unimplemented | Visual present-tense | **C** dashed/future or remove from Fig 1 core |
| Product UI | not patent | n/a | n/a | P0-2 is patent-package; product “AI” claims are filing-status (Section 10) | |

Legend: **A** Remove · **B** Alternative embodiment · **C** Future implementation language · **D** Retain as implemented.

**Recommended default:** **C** for wearable / voice-only / offline-local-inference / smart-home / biometric HRV. **D** only for web + native mobile shells sharing the same kidschedule generate UI. **B** if counsel wants claim 4/12 Markush flexibility without asserting current implementation.

**Do not** convert §6.10 biometric/voice/offline into present-tense to “match” Claims 4/12. That worsens P0-2.

---

## 6. P1 Disclosure Gaps

From the audit gap matrix (G03–G14). Suggested location = where counsel should *consider* adding support. **No replacement specification text is drafted here.**

| ID | Technical feature | Code evidence | Current patent disclosure | Why it matters | Suggested disclosure location | Suggested level of detail |
|----|-------------------|---------------|---------------------------|----------------|------------------------------|---------------------------|
| G03 | Filing-status honesty | HTML priority date placeholder; no application number | Product says “filed” | Advertising / diligence, not IPO form | Outside spec: product copy. Inside spec: keep placeholder until receipt | One factual rule: no “filed” without receipt |
| G04a | Dinner-gap 60 / 90 / 120 min | `getMinimumDinnerSleepGap` in `routine-meal-dinner-integrity.ts`; certified architecture table | Temporal anchoring mentioned; **gaps not stated** | Certified health guarantee; priority for this matter | New § after 6.4 or 6.4.3; new figure (dinner repair) | Algorithm: age bands, min gap, promote/insert dinner, country window, re-run after overlap |
| G04b | Country sleep/dinner windows | `routine-country-profile.ts` (IN/AE/US/UK/AU/NZ/AT) | Not found | Frozen geometry | Same section; table of windows as non-limiting examples | Example values + “profiles may be configured per locale” |
| G05a | Intelligence pipeline pass order | `routine-intelligence-pipeline-order.md`; `runRoutineIntelligencePipeline` | Fig 3 omits ordered passes | Actual differentiator vs “call LLM” | New §6.4.x + Figure (pipeline) | Ordered list of named passes; infant skip 5–12 |
| G05b | Family intelligence moat | `prepareFamilyIntelligenceInput`, `finalizeFamilyIntelligenceMoat` | Not found | Stateful adaptation | Personalization / feedback section | Inputs (history, trustScore, hints) → enrich context → persist |
| G06 | AQI outdoor caps + safety choke vs advisory `@workspace/safety` | `enforceRoutineSafety`, `routine-aqi.ts`; `routes/safety.ts` | Allergy filtering only as “correction of LLM” | Safety is deterministic and path-specific | New safety section; do not merge with 6.4.3 LLM correction | Two-layer: generate gate vs optional parent safety UI |
| G07 | Caregiver transform is `simplifyForHandler` | `lib/family-routine/src/index.ts` | Claim 8 / §6.6 “rewrite instruction notes” | Claim-spec-code mismatch | §6.6 | Disclose: skip categories, max activities, “Easy:”/“Step:” **title** prefix; bonding density in templates; AI prompt append as AI-path only |
| G08 | Anti-repetition on rule path | pipeline freshness/completion; outcome store | Claim 6e: frequencies **into GAI prompt** only | Underclaim of production path | §6.4.1 and 6.4.3 | Prompt injection = AI embodiment; rule path uses history/freshness passes |
| G09 | `yes/no/limited` vs suitable/unsuitable | `mapOpenMeteoToWeatherOutdoor`; spec table already uses unsuitable/limited/suitable | Spec table ~501–517 is close to code thresholds | Construction | §6.2.4 | One mapping sentence: code tokens ↔ claim terms |
| G10 | Two age systems; two safety stacks | `getAgeGroup` vs `classifyAgeBand`; safety-gate vs `@workspace/safety` | One “age-band engine” | Enablement / confusion | §6.3 and safety § | Name both; which is on generate path |
| G11 | Figures wrong emphasis | Figs 1–4 HTML SVG | No pipeline/safety/feedback figures | Examiner/engineer understanding | §5 + drawings | See Section 8 of this plan |
| G12 | Schedule II drawing sheets | Checklist item 6 | SVG in HTML only | Formality for IPO | Drawings set | Counsel/draftsman; developer can export SVG |
| G13 | Meal banks vs LLM 4-option enrich | `generateRuleBasedRoutine` meals; `routes/routines.ts` EXACTLY 4 prompt | Fig 4 / Claim 9 LLM-centric | Production default omitted | §6.7 | Dual phase: banks default; LLM enrich optional; sanitizer always |
| G14 | Applicant Ankur Raman vs AmyWorld / MIT | HTML cover; `package.json` `"license": "MIT"` | No assignee | Ownership diligence | Cover / assignment (not spec body) | Counsel + founder; see §11 |

Additional P1-adjacent items counsel should know (from audit G15–G18, treated as P2 in audit but listed for completeness in §8).

---

## 7. Claim–Code–Specification Matrix

Re-mapped **after** applying the conceptual architecture (rules-first core, LLM alternate). Status is technical support, not legal validity.

**Problem type key:** I = implementation · S = specification support · T = terminology · C = claim scope · E = missing embodiment

| Claim | Code | Specification | Consistent? | Status | Issue |
|-------|------|---------------|-------------|--------|-------|
| 1 | `generate.tsx` dual flag, in-flight Promise, geo, Open-Meteo, discard, `weatherForCall` | §6.2, Fig 2 | **Yes** (T: yes/no vs suitable) | FULLY SUPPORTED | T |
| 2 | catch → null; fallback current weather | §6.2.5 | Yes | FULLY SUPPORTED | — |
| 3 | `pendingAction.weatherForCall` | §6.2.4 wake dialog | Yes | FULLY SUPPORTED | — |
| 4 | Web + iOS web + Android WebView; no wearable/voice/offline | §4 fifth aspect present tense vs §6.10 future | **No** | PARTIALLY SUPPORTED | S, C, E |
| 5 | Method of 1 | §6.2 | Yes | FULLY SUPPORTED | — |
| 5A | Shared in-flight Promise | §6.2.2 | Yes | FULLY SUPPORTED | — |
| 5B | Inject before setState | §6.2.4 injection | Yes | FULLY SUPPORTED | — |
| 6a | Age templates / `getAgeGroup` | §6.3 | Mostly | FULLY SUPPORTED | T (two classifiers) |
| 6b | `dateSeed(date, childName)` | §6.3 shuffle | Partial | PARTIALLY SUPPORTED | T (name vs identifier) |
| 6c | Two endpoints | §6.4.1–6.4.2 | Partial (primacy) | PARTIALLY SUPPORTED | S, C |
| 6d | Pipeline + sanitizers on **both** sources; claim says GAI outputs | §6.4.3 LLM-only | **No** | PARTIALLY SUPPORTED | S, C |
| 6e | Prompt on AI path; pipeline on rule path | §6.4.3 anti-repetition | Partial | PARTIALLY SUPPORTED | S, C |
| 7 | `applyEnergyCurveToItems` sampleCount≥3 | §6.4.4 (mentions min samples) | Mostly | FULLY SUPPORTED | S (threshold 3 not numeric) |
| 8 | `simplifyForHandler` + templates + prompts | §6.6 notes rewrite | Partial | PARTIALLY SUPPORTED | S, C, T |
| 8A | Weather transforms; labels differ | §6.5 | Partial | PARTIALLY SUPPORTED | T; extra caregiver→limited override |
| 9 | LLM enrich exists; banks are default | §6.7 Phase B | Partial | PARTIALLY SUPPORTED | S, C, E (banks) |
| 10 | Cuisine prompt + banks | §6.7 | Mostly | FULLY SUPPORTED | E (extra cuisines optional) |
| 11 | Jain in sanitizer + prompts | §6.7 / diet | Yes | FULLY SUPPORTED | — |
| 12 | Same as 4, independent | §6.1, §6.9 | **No** | PARTIALLY SUPPORTED | S, C, E |
| 13 | `weatherTouchedRef` vs state | §6.2 | Yes | FULLY SUPPORTED | Overlap with 1a |
| 14 | AI path + pipeline | §6.4.3 | Yes **as AI-path method**; not certified path | PARTIALLY SUPPORTED | C (LLM required in claim step a) |
| 15 | Weather pass in pipeline | §6.5 | Partial order | PARTIALLY SUPPORTED | S (order vs pipeline-order.md) |

**NOT SUPPORTED (as implemented):** none of the indicative claims are wholly fictional, but **Claims 4 and 12 are not supported** for wearable/voice/offline members. **Claim 14 is not supported as a description of certified generation.**

**Do not rewrite claims in this plan.** Counsel should decide whether complete-spec independents stay AI-centric, become rules-centric, or split.

---

## 8. Underdisclosed implemented features

**Question:** Should the patent professional know this exists before drafting?

| Feature | Counsel should know? | Why | Do not assume it belongs in a claim |
|---------|----------------------|-----|-------------------------------------|
| 60/90/120 dinner-gap + `repairDinnerAnchor` | **Yes** | Certified freeze; strongest health-geometry mechanism | Independent claim is counsel’s choice |
| Country windows (IN/UAE/US/etc.) | **Yes** | Frozen profile geometry | May be embodiment of “locale profile” |
| AQI exposure modes / outdoor caps | **Yes** | Safety choke; distinct from weather class | |
| Weather detection handshake | **Yes** | Already best-disclosed; keep | Category A |
| Family intelligence moat | **Yes** | Adaptation/persist | May be continuation matter |
| `enforceRoutineSafety` vs `@workspace/safety` | **Yes** | Avoid over-unified “safety engine” | |
| Pipeline pass order + infant skip | **Yes** | True processing invention | |
| Constraint processing (school, fixed activities, special plans) | **Yes** | `mergeFixedActivityPreCheck`; special parse | |
| Contextual generation inputs (mood, caregiver, fridge, goals) | **Yes** | Already partly in §6.4.1 | |
| Personalization `energyProfile` + parentGoals | **Yes** | §6.4.4 exists; add sampleCount=3 | |
| Adaptation / previous-day / completion pass | **Yes** | Claim 6e too narrow | |
| Regeneration / partial regen + age floor 36mo | **Yes** | `PARTIAL_REGEN_MIN_AGE_MONTHS`; safety on partial | |
| Deterministic rules as primary | **Yes** | P0-1 | |
| AI augmentation as alternate + fallback | **Yes** | P0-1 | |
| Validation 422 refuse | **Yes** | Output gate | |
| Repair mechanisms (dinner, overlap, UAE outdoor hard constraint) | **Yes** | `enforceUaeOutdoorHardConstraint` | Locale-specific embodiment |
| Substitute caregiver forces weather `limited` | **Yes** | Extra 8A behavior | |
| `dateSeed` uses **child name** | **Yes** | Claim 6b | |
| Meal-option sanitizer priority stack | **Yes** | Safety>Diet>Structure>Variety | |
| Emergency safe fallback on generate exception | **Yes** | `routine-emergency-fallback.ts` | |
| Learning weights in AI prompt | Optional | §6.10 lists educational rec as **future** while weights exist | Resolve prophetic vs implemented |
| Multi-child `family-routine` helpers | Optional | §6.10 multi-child interlocking **AMBIGUOUS** vs actual | Do not overstate interlocking household scheduler |
| Redis generate cap | No (as invention) | Operational | Do not claim |

---

## 9. Figure Plan

Existing Figs 1–4 should be **revised**, not merely supplemented. Only technically supported figures are recommended.

| Proposed figure | Purpose | Components | Data flow | Code evidence | Spec reference |
|-----------------|---------|------------|-----------|---------------|----------------|
| **Fig 1 — System architecture (revise)** | Show real clients + server modules | Clients: Web, iOS web shell, Android WebView. Server: input resolver, **rule generator**, intelligence pipeline, meal banks, safety gate. Optional: LLM inference, meteo API. Future (dashed): wearable/voice/offline | Client → API gateway → core modules → DB | `generate.tsx`; `android/`; Capacitor iOS; `routes/routines.ts` | §6.1 |
| **Fig 2 — Certified Routine Generation pipeline (new; was missing)** | P0-1 visual | Boxes matching certified one-liner + energy enrich + 422 gate | Linear: resolve → templates → enrich → pipeline → dinner repair (inside pipeline) → validate → output | certified architecture; `routines.ts` generate | New §6.4 intro |
| **Fig 3 — Input / context resolution (revise current Fig 2)** | Keep Category A | Dual flag, in-flight registry, geo, meteo, mapping, discard, inject, wake-confirm | Trigger → flag check → share/detect → inject `weatherForCall` | `ensureWeatherDetected` | §6.2 |
| **Fig 4 — Rule-based generation (new)** | Certified item source | Age band → template pools → dateSeed shuffle → anchors (meals/sleep/school) → caregiver bonding | Time cursor wake→sleep | `generateRuleBasedRoutine`, `dateSeed` | §6.4.1 |
| **Fig 5 — Alternate LLM path + shared pipeline (revise current Fig 3)** | Stop implying LLM is primary | Two sources (rules \| LLM) **merge** into **one** pipeline; fallback arrow LLM→rules | `/generate-ai` → pipeline → safety; fail → `/generate` equivalent | `runIntelligencePipelineOnItems` on both; `ai_routine_failed_trust_validation` | §6.4.2–6.4.3 |
| **Fig 6 — Constraint + safety (new)** | P1 G06 | Weather subst, school block, AQI, meal sanitizer, trust validators, refuse-on-fail | Candidate → constraints → `enforceRoutineSafety` → valid? | `routine-safety-gate.ts`, `routine-aqi.ts`, `routine-meal-options-safety.ts` | new safety § |
| **Fig 7 — Dinner anchor / temporal repair (new)** | P1 G04 | Age→gap 60/90/120; country dinner window; promote/insert; overlap re-repair | Items + sleepMins + country → repaired dinner | `repairDinnerAnchor` | new dinner § |
| **Fig 8 — Feedback / personalization (new)** | P1 G05/G08 | previousDayContext, energyProfile, learningWeights (AI), moat persist | Outcome store → next generate | `routine-adaptive-completion.ts`, `intelligenceAnalytics.ts`, `routine-family-intelligence-moat.ts` | new adaptation § |

**Current Fig 4 (meals):** keep as **Fig 9 or 4B** only if it shows **banks + optional LLM enrich + sanitizer**. Do not keep LLM-only Phase B as the meal figure.

**Not recommended as separate figures:** Redis semaphore; Firebase; RevenueCat; TTS.

**Formality:** IPO Schedule II 1:1 numbered sheets still required (audit G12). HTML SVG is a draft aid only.

---

## 10. Terminology Plan

Do not edit files in this pass. Preferred concept is for counsel’s glossary.

| Current term (mixed) | Preferred technical concept | Code term | Patent term | Issue |
|----------------------|----------------------------|-----------|-------------|-------|
| Intelligence / AI / adaptive AI | Split: (1) deterministic pipeline (2) GAI module | `runRoutineIntelligencePipeline` vs `runOpenAiJsonChat` | “hybrid generation engine”, “AI-powered” | Same word, two systems |
| Hybrid generation | Two **item sources**, one pipeline | `/generate` vs `/generate-ai` | Co-equal hybrid | Primacy |
| Deterministic correction infrastructure | Shared post-candidate pipeline + sanitizers + dinner repair | pipeline + `repairDinnerAnchor` + `enforceRoutineSafety` | “correction of probabilistic AI outputs” | Implies LLM required |
| Outdoor-suitability suitable/limited/unsuitable | Three-class outdoor policy | `yes` / `limited` / `no` | suitable / limited / unsuitable | Map explicitly |
| Child identifier | Seed material | `childName` in `dateSeed`; `childId` in API | child identifier | Name ≠ id |
| Instruction notes rewrite | Caregiver simplification | `simplifyForHandler` (`activity` prefix) | instruction notes | Wrong artefact |
| Age-band classification engine | Developmental age grouping | `getAgeGroup` and `classifyAgeBand` | one engine | Two implementations |
| Canonical-name registry | Cuisine/meal validation | region banks + sanitizer | registry | AMBIGUOUS named artefact |
| Ambient-condition classification module | Client weather handshake | `ensureWeatherDetected` | module | OK if mapped |
| Registry of pending async ops | In-flight Promise | `weatherDetectInFlightRef` | registry | Do not confuse with Redis gate |
| Native mobile | iOS Capacitor + Android WebView | two shells | native mobile | Android is WebView, not Capacitor |
| Patent pending / provisional filed | Draft specification in repo | n/a | placeholder date | **False if stated as filed** |
| Handler / caregiver | Caregiver identity | `HandlerKey` = `CaregiverKey` | caregiver | Disclose alias |
| Personalized / optimized / safe / context-aware | Operational definitions | named functions | adjectives | Too vague without mechanics |

---

## 11. Filing-Status Cleanup

**Repository evidence of filing:** **None.**  
`patent/amynest_patent_package.html` priority date = `[Date of Filing of this Provisional]`.  
No application number, receipt, Form 1, or IPO acknowledgement in the repo.

### Explicit recommendation

> **Do not represent the application as filed until filing is actually completed and documented.**  
> Do not use “patent pending,” “provisional patent filed,” “patent filed,” “application filed,” or “patented” in product, store, or marketing copy until a filing receipt (application number + date) exists.  
> “Patented” is not supported under any current repo evidence.

### Affected locations (product / docs — not to be edited in this task)

| Location | Example copy |
|----------|----------------|
| `artifacts/kidschedule/src/i18n/en.json` | `landing.hero_sub`, `landing.tech_patent_desc` (“Provisional patent filed…”), `patent_pending.*` (footer_label, about_tech, settings_note “Provisional Patent Filed”, powered_by, microcopy_*, loading_2, ai_badge, hub_trust, onboarding_card), `meta_description`, `badge_patent`, `solution_heading`, `trust_patent`, `step2_badge`, footer strings |
| `artifacts/kidschedule/src/components/marketing/patent-pending-pill.tsx` | “Patent-Pending Adaptive AI”; `PATENT_TRUST_LINE` “provisional patent filed” |
| `artifacts/kidschedule/src/components/patent-badge.tsx` | Maps to `patent_pending.*` |
| `artifacts/kidschedule/src/pages/routines/generate.tsx` | loading_2, microcopy_planning |
| `artifacts/kidschedule/src/pages/routines/index.tsx` | microcopy_routine |
| `artifacts/kidschedule/src/pages/environment.tsx` | footer_label, about_tech, settings_note, ai_badge |
| `artifacts/kidschedule/src/pages/onboarding.tsx` | powered_by |
| `artifacts/kidschedule/src/pages/parenting-hub.tsx` | hub_trust |
| `artifacts/kidschedule/src/pages/parent-profile.tsx` | settings_note, about_tech |
| `artifacts/kidschedule/src/pages/social-landing.tsx` | “Patent Pending” footer |
| `artifacts/kidschedule/src/components/marketing/cinematic-landing/sections.tsx` | “Powered by patent-pending adaptive AI” |
| `artifacts/kidschedule/src/components/parent-command-center.tsx` | loading_1 |
| `artifacts/kidschedule/src/components/spotlight-tour.tsx` | “Patent Pending” badge |
| `artifacts/kidschedule/public/__nav_preview.html` | “Patent Pending” |
| `artifacts/kidschedule/scripts/social-assets-manifest.json` | footer / badge |
| `artifacts/amynest-splash/src/components/video/video_scenes/Scene6.tsx` | “Patent Pending Technology” |
| `content-engine/golden-scripts/030-routine.md`, `seeds.ts` | “described as patent-pending” |
| `content-engine/brand/feature-discovery.ts` | keyword “patent pending” |
| App Store listing (not in this HTML package; cited in diligence docs) | “patent-pending” |
| Acquisition docs | Describe the **conflict**; they should not be used as evidence of filing |

**Owner after filing:** Founder + documentation/product, **only after** counsel confirms receipt.

The **patent HTML itself** is internally honest (placeholder). Do not “fix” it by inserting a fake date.

---

## 12. Ownership Checklist (for counsel — no legal conclusions)

| # | Item | Repo evidence | Counsel to verify |
|---|------|---------------|-------------------|
| 1 | Inventor | HTML: Ankur Raman | Inventorship vs contributors/contractors |
| 2 | Applicant | HTML: Ankur Raman, natural person, Lucknow address | Whether entity (AmyWorld) should be applicant |
| 3 | Assignee | **None in package** | Assignment deed needed? |
| 4 | AmyWorld | Product legal copy / App Store seller “Amyworld” (diligence docs) | Relationship to applicant |
| 5 | AmyNest | Product brand | Trademark vs patent applicant |
| 6 | Source-code ownership | Workspace `package.json` `"license": "MIT"` | Whether MIT notice conflicts with “proprietary” marketing |
| 7 | Contractor / employee inventors | Not in repo | Written assignments |
| 8 | IP assignment | **Not in repo** | |
| 9 | Third-party code | OpenAI client, Open-Meteo, Firebase, RevenueCat, Capacitor, Android WebView | Licenses; invention vs dependencies |
| 10 | AI provider dependencies | `runOpenAiJsonChat`; substitutable per spec §6.1 | Keep claims provider-agnostic |
| 11 | Patent agent | “NA (filed by applicant in person)” vs note that complete spec should be agent-reviewed | Filing strategy |
| 12 | Form 28 / small entity / startup | Mentioned as optional in checklist | Eligibility |

---

## 13. Remediation Priority

### P0 — MUST FIX BEFORE PATENT PROFESSIONAL FINAL REVIEW

| ID | Problem | Evidence | Recommended action | Owner |
|----|---------|----------|-------------------|--------|
| P0-1 | LLM→generate→correct told as primary invention | Abstract, §1–4, §6.4.3, Fig 1/3, Claims 6d/14 vs certified path | Re-center spec + figures on rules-first + shared pipeline; AI as alternate + fallback | **Patent professional** (draft). **Developer** supplies architecture cites (this doc + frozen files). **Founder** confirms production default remains `/routines/generate` |
| P0-2 | Present-tense unimplemented platforms | §4 fifth aspect, §6.1, §6.2.4, Fig 1 footer vs §6.10 and no code | Align all present-tense platform lists with web + iOS web + Android WebView; move wearable/voice/offline/smart-home to §6.10 prophetic | **Patent professional**. **Developer** confirms no wearable/voice/offline generate code |

### P1 — SHOULD FIX BEFORE FINAL DRAFT

| ID | Problem | Evidence | Recommended action | Owner |
|----|---------|----------|-------------------|--------|
| G03 | Public “filed / pending” | i18n + pills vs placeholder | Strip or hold copy until receipt | **Founder** + **Documentation** after **Legal** says file/receipt exists |
| G04 | Dinner gap + country windows omitted | `getMinimumDinnerSleepGap`; country profile | Disclose algorithm + example tables | **Patent professional**; **Developer** fact-check numbers |
| G05 | Pipeline + family moat omitted | pipeline-order.md; moat module | New section + Fig 2/8 | **Patent professional** |
| G06 | Safety architecture underspecified | safety-gate vs `@workspace/safety` | Separate safety disclosure | **Patent professional** |
| G07 | Claim 8 vs simplifyForHandler | family-routine | Align spec §6.6 to actual transform | **Patent professional** (no claim rewrite here) |
| G08 | Anti-repetition prompt-only | routines.ts vs pipeline | Disclose both embodiments | **Patent professional** |
| G09 | yes/no vs suitable/unsuitable | mapOpenMeteo vs spec table | Mapping sentence | **Patent professional** |
| G10 | Dual age/safety modules | two stacks | Name and locate | **Developer** annotates; **Patent professional** drafts |
| G11 | Figures | Figs 1–4 | Execute figure plan §8 | **Patent professional** + draftsman; **Developer** can export flows |
| G12 | Schedule II sheets | HTML SVG only | Formal drawings | **Patent professional** / draftsman |
| G13 | Meal banks vs LLM enrich | templates vs EXACTLY 4 prompt | Dual embodiment in §6.7 | **Patent professional** |
| G14 | Applicant vs AmyWorld / MIT | cover + package.json | Entity/assignment review | **Legal/CA** + **Founder** |

### P2 — OPTIONAL IMPROVEMENT

| ID | Problem | Evidence | Recommended action | Owner |
|----|---------|----------|-------------------|--------|
| G15 | Seed uses child **name** | `dateSeed` | Spec “name or other identifier” | Patent professional |
| G16 | Energy sampleCount numeric 3 | `applyEnergyCurveToItems` | One sentence | Patent professional |
| G17 | Extra cuisines/diets | Middle Eastern, mixed, high-protein | Optional embodiment list | Patent professional |
| G18 | Caregiver forces `limited` weather | `generateRuleBasedRoutine` | Sentence under 8A/§6.5 | Patent professional |
| G19 | Vague adjectives | marketing + spec | Glossary | Patent professional |
| G20 | Claim 1/5/13 overlap | indicative claims | Complete-spec hygiene | Patent professional |
| — | §6.10 “future” items that exist (mood, learningWeights) | code vs 6.10 | Reclassify implemented vs prophetic | Patent professional + Developer |
| — | UAE outdoor hard constraint | pipeline | Locale embodiment | Patent professional |
| — | Emergency fallback generator | `routine-emergency-fallback.ts` | Optional embodiment | Patent professional |
| G21–G24 | Formatting / Redis / TTS / “15 patents” confusion | audit | Cosmetic | Documentation |

---

## 14. Patent Counsel Handoff Checklist

**Goal:** Developer/founder fix **facts** → professional reviews → professional drafts specification/claims/drawings → **then** file.

Do **not** describe the current HTML as final.

### A. Facts locked (Developer / Founder) — before counsel spends drafting time

- [ ] Confirm certified production endpoint remains `POST /routines/generate` (rules-first).
- [ ] Confirm `/routines/generate-ai` remains alternate with pipeline + safety + rule fallback.
- [ ] Confirm no wearable, voice-assistant, or on-device LLM routine generator ships.
- [ ] Confirm dinner gaps 60 / 90 / 120 and country window table are still the freeze (June 2026 docs).
- [ ] Confirm AQI is enforced on safety/partial paths as documented.
- [ ] Provide counsel: this plan, the final audit, `docs/routine-engine/v1-certified-architecture.md`, `ROUTINE_ENGINE_FROZEN_FILES.md`, `routine-intelligence-pipeline-order.md`.
- [ ] Do **not** change engine behavior “to match the patent.” Match the **patent to the engine**.

### B. Specification / drawings (Patent professional)

- [ ] Rewrite primacy: rules + pipeline first; LLM alternate (P0-1).
- [ ] Convert unimplemented platforms to prophetic language; fix Fig 1 (P0-2).
- [ ] Add dinner-gap, country profiles, pipeline order, AQI/safety split, meal banks, caregiver actual mechanism, rule-path adaptation (P1).
- [ ] Mapping table `yes/no/limited` ↔ suitable/limited/unsuitable.
- [ ] Execute figure plan (revise 1–4; add pipeline, safety, dinner, feedback as needed).
- [ ] Produce Schedule II drawing sheets.
- [ ] Keep meteorological/LLM providers substitutable.
- [ ] Do not add new matter that is **not** in the draft **or** the code if the goal is this priority document — counsel to manage Indian provisional new-matter/priority practice.

### C. Claims (Patent professional only — this plan does not draft)

- [ ] Review whether independent generation claims should be rules-first with AI dependent, or split (Category B vs AI-path Claim 14).
- [ ] Review Claim 4/12 Markush vs implemented pair (web + mobile).
- [ ] Review Claim 8 artefact (notes vs titles).
- [ ] Review Claim 9 LLM-only method vs banks.
- [ ] Indicative claims in the provisional are not mandatory under Section 9 — counsel to decide what to include at filing.

### D. Filing status & public copy (Founder + Legal + Documentation)

- [ ] **Do not represent the application as filed until filing is actually completed and documented.**
- [ ] After receipt: store application number + date in a diligence folder (not necessarily in the public app).
- [ ] Until then: strip or hold all product “patent pending / provisional filed” strings listed in §11.
- [ ] Never use “patented.”

### E. Ownership (Legal/CA + Founder)

- [ ] Confirm inventor(s) and applicant entity vs AmyWorld.
- [ ] Assignment if company is to own the application.
- [ ] Reconcile MIT license notice vs proprietary marketing.
- [ ] Third-party / contractor IP.

### F. Stop / go

| Gate | Go only if |
|------|------------|
| Hand to professional for **drafting** | This plan + audit + frozen engine docs attached; P0 facts confirmed |
| Professional **final review for filing** | P0-1 and P0-2 text/figures corrected in the **next** specification draft (not this HTML as-is) |
| **File** | Counsel-approved spec; drawings; forms; applicant identity |
| **Say patent pending / filed publicly** | Filing receipt in hand |

**Current HTML package: not ready to file as the disclosure of the production Routine Generation system.**  
**Current HTML package: ready to give counsel as a draft plus this remediation plan.**

---

## 15. Document control

| Item | Value |
|------|--------|
| Audit | `docs/AMYNEST_ROUTINE_GENERATION_PATENT_FINAL_AUDIT.md` |
| This plan | `docs/AMYNEST_PATENT_P0_P1_REMEDIATION_PLAN.md` |
| Patent draft (unmodified) | `patent/amynest_patent_package.html` |
| Code / claims / drawings / git | **Unchanged by this task** |

Prior-art search: **not performed** (same as the audit).
