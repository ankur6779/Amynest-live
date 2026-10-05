# AMYNEST ROUTINE GENERATION PATENT — FINAL PRE-FILING TECHNICAL AUDIT

**Audit type:** Read-only code-to-patent consistency and completeness audit  
**Scope:** Routine Generation invention only  
**Date of audit:** 14 September 2026  
**Auditor role:** Senior patent-technology auditor (technical documentation; not a registered patent agent)  
**Source of truth for implementation:** AmyNest-AI repository as audited  
**Primary patent document:** `patent/amynest_patent_package.html`

**This is not a legal patentability opinion.** It does not certify novelty, non-obviousness, enablement in the legal sense, enforceability, or that any claim will be granted.

---

## 1. Executive Summary

The repository contains a **real, production Routine Generation system** and a **single Indian provisional specification draft**. The draft is internally coherent as a *proposed* invention around concurrent-safe weather detection, hybrid AI + rules, deterministic correction, and meal enrichment. It is **not** an accurate complete description of the **certified production generator**.

The certified production path (frozen June 2026) is:

```
resolveRoutineGenerationInputs()
  → generateRuleBasedRoutine()
  → runIntelligencePipelineOnItems() / runRoutineIntelligencePipeline()
  → repairDinnerAnchor()
```

The patent’s primary narrative, abstract, Figure 3, and several independent claims treat **generative AI + post-hoc deterministic correction** as the generation invention. In production, **rule-based templates are the certified primary path**. The AI route (`POST /routines/generate-ai`) exists as an alternate, gated path. A large deterministic intelligence pipeline (family-intelligence moat, dinner-to-sleep health gaps, AQI outdoor limits, infant exclusive path, country sleep/dinner windows, adaptive completion, energy-profile reordering) is implemented in code and **weakly disclosed or omitted** from the specification.

Category A (concurrent-safe environmental detection on the web generate UI) is the **best-supported** part of the package: dual `weatherTouched` state + ref, in-flight Promise registry, Open-Meteo mapping, late-result discard, wake-confirm re-injection. That mechanism is implemented and described.

Category D over-reaches: wearable, voice-assistant, and offline/local-inference Routine Generation are **NOT FOUND** in code, yet the specification summary states the invention **“is realised across”** those environments. Section 6.10 later lists the same items as future embodiments. That is a filing-critical internal contradiction.

Filing status: **draft only**. Priority date is the placeholder `[Date of Filing of this Provisional]`. No application number, receipt, or Form 1 is in the repository. Product copy nevertheless states **“Provisional Patent Filed”** / **“Patent Pending”**. Those public statements are **not factually supported** by this repository.

**Verdict:** The package is **not** final-submission ready as a disclosure of the *actual* Routine Generation technology. It **can** be handed to a registered patent professional **after** the P0/P1 gaps below are addressed — especially aligning the specification with the certified rules-first pipeline (or clearly labelling AI as an alternate embodiment) and removing present-tense “is realised” language for unimplemented platforms.

**Most important question (Section 26):** **YES, WITH SPECIFIC FIXES.**

---

## 2. Files Audited

### 2.1 Patent and patent-adjacent files

| File | Purpose | Version | Date | Status |
|------|---------|---------|------|--------|
| `patent/amynest_patent_package.html` | Indian Form 2-style **provisional specification draft** (title, field, background, objects, summary, detailed description §§6.1–6.10, indicative claims 1–15 + 5A/5B/8A, abstract, IPO checklist, HTML/SVG Figures 1–4) | None in file (undated draft) | Filing date field = `[Date of Filing of this Provisional]` | **DRAFT — not a filed instrument in this repo** |
| `artifacts/kidschedule/src/components/marketing/patent-pending-pill.tsx` | Marketing UI: “patent-pending” / “provisional patent filed” | Product code | — | **Not a specification** |
| `artifacts/kidschedule/src/components/patent-badge.tsx` | Marketing badges mapping to i18n `patent_pending.*` | Product code | — | **Not a specification** |
| `artifacts/kidschedule/src/i18n/en.json` (`patent_pending.*`, `landing.tech_patent_desc`) | Public “Patent Pending” / “Provisional patent filed” copy | Product i18n | — | **Not a specification; filing-status conflict** |
| `docs/v2/ROUTINE_GENERATION_DEEP_STUDY.md` | Internal product/tech study; notes 15 indicative claims; filing not verifiable | Study | — | Background only |
| `docs/routine-engine/v1-certified-architecture.md` | **Certified production architecture** (June 2026 freeze) | v1.0 Certified | June 2026 | Implementation authority for generation order |
| `docs/routine-engine/ROUTINE_ENGINE_FROZEN_FILES.md` | Frozen file registry for the certified engine | v1.0 | June 2026 | Implementation authority |
| `artifacts/api-server/src/lib/routine-intelligence-pipeline-order.md` | Ordered pipeline passes | Maintainability note | — | Implementation authority |
| `content-engine/golden-scripts/030-routine.md` | Marketing script using “patent-pending” | Content | — | **Not a specification** |
| Acquisition / diligence docs (`docs/AMYNEST_ACQUISITION_*.md`, `docs/AMYNEST_100K_*.md`) | Sale diligence noting draft vs “filed” copy | — | 2026 | Secondary; not patent documents |

**Not found in repository:** Form 1, Form 3, Form 5, Form 28, IPO filing receipt, application number, priority-date confirmation, assignment deed, separate Schedule II drawing sheets, complete specification (Section 10), inventor oath beyond HTML signature block.

**Do not treat the HTML filename as a filed application.** Newest-looking product copy (“filed”) is **not** the legal status of the HTML draft.

### 2.2 Core implementation files (Routine Generation)

| Layer | Files |
|-------|--------|
| UI entry | `artifacts/kidschedule/src/pages/routines/generate.tsx`, `routine-generate-inputs.tsx`, `routine-environment-ui.tsx`, `artifacts/kidschedule/src/pages/routines/index.tsx` |
| Client safety/caregiver | `artifacts/kidschedule/src/lib/routine-item-safety.ts`, `lib/family-routine/src/index.ts` |
| API | `artifacts/api-server/src/routes/routines.ts` (`POST /routines/generate`, `POST /routines/generate-ai`), `artifacts/api-server/src/lib/routine-generate-semaphore.ts` |
| Certified generate | `routine-input-validation.ts`, `routine-templates.ts` (`generateRuleBasedRoutine`, `dateSeed`, `seededShuffle`), `routine-intelligence-pipeline.ts`, `routine-meal-dinner-integrity.ts`, `routine-country-profile.ts` |
| Constraints / weather | `routine-decision-engine.ts` (`applyWeatherToScheduledItems`), `routine-weather-planning.ts`, `routine-environment-intelligence.ts`, `routine-aqi.ts`, `routine-context-engine.ts` |
| Safety | `routine-safety-gate.ts`, `routine-trust-validators.ts`, `routine-meal-options-safety.ts`, `meal-safety.ts`, `artifacts/api-server/src/routes/safety.ts` (`@workspace/safety` — **separate route**) |
| Personalization / feedback | `intelligenceAnalytics.ts` (`applyEnergyCurveToItems`), `routine-adaptive-completion.ts`, `routine-family-intelligence-moat.ts`, `artifacts/api-server/src/services/learningWeights.ts` |
| Age / meals | `routine-age-feeding.ts`, `@workspace/safety` `classifyAgeBand` (used on safety route; age groups also in templates) |

---

## 3. Routine Generation Architecture

### 3.1 Technical flow (from code, not from the patent)

```
INPUT (UI form: child, date, mood, caregiver, weather, school, fridge, diet, special plans)
  → CONTEXT (child profile, country, previous-day routine/signals, energyProfile, learningWeights)
  → PROCESSING
       PRIMARY: generateRuleBasedRoutine (templates + dateSeed shuffle)
       ALTERNATE: OpenAI JSON chat (generate-ai) then validators
  → DECISION/GENERATION (intelligence pipeline: family intel, schedule, meals, weather, culture, emotion, load, energy)
  → VALIDATION (trust validators, timeline integrity, dinner anchor)
  → SAFETY (routine-safety-gate: AQI + blocking trust; meal-options sanitizer; client simplifyForHandler)
  → OUTPUT (schedule items + explainability metadata)
  → STORAGE (routines table persist on save)
  → FEEDBACK/ADAPTATION (outcome store, previousDayContext, energyProfile, learningWeights, family intelligence moat)
```

Every node cites source:

| Node | File | Function / class |
|------|------|------------------|
| INPUT UI | `generate.tsx` | form state; `triggerWithWakeCheck`; `proceedGenerate` / `proceedAiGenerate` |
| Env detect | `generate.tsx` | `ensureWeatherDetected`, `detectWeatherOutdoorFromBrowser`, `mapOpenMeteoToWeatherOutdoor` |
| Dual-state flag | `generate.tsx` | `weatherTouched` + `weatherTouchedRef` |
| In-flight registry | `generate.tsx` | `weatherDetectInFlightRef` |
| Wake-confirm re-inject | `generate.tsx` | `pendingAction.weatherForCall`; `handleWakeConfirmSubmit` |
| API standard | `routes/routines.ts` | `router.post("/routines/generate")` |
| API AI | `routes/routines.ts` | `router.post("/routines/generate-ai")` |
| Inflight cap (server) | `routine-generate-semaphore.ts` | Redis max-40 generate gate — **not** the client env-detect registry |
| Input resolve | `routine-input-validation.ts` | `resolveRoutineGenerationInputs` |
| Rule generate | `routine-templates.ts` | `generateRuleBasedRoutine` |
| Date shuffle | `routine-templates.ts` | `dateSeed(date, childName)`, `seededShuffle` |
| Pipeline | `routine-intelligence-pipeline.ts` | `runRoutineIntelligencePipeline` / `runIntelligencePipelineOnItems` |
| Dinner gap | `routine-meal-dinner-integrity.ts` | `repairDinnerAnchor`, `getMinimumDinnerSleepGap` |
| Weather subst. | `routine-decision-engine.ts` | `applyWeatherToScheduledItems` |
| Energy reorder | `intelligenceAnalytics.ts` | `applyEnergyCurveToItems` |
| Caregiver simplify | `lib/family-routine/src/index.ts` | `simplifyForHandler` |
| Meal LLM enrich | `routes/routines.ts` | meal-options prompt (~EXACTLY 4 options/slot) |
| Meal sanitize | `routine-meal-options-safety.ts` | `sanitizeMealOptionsInRoutineItems` |
| Safety choke | `routine-safety-gate.ts` | `runRoutineSafetyGate` |
| Optional safety API | `routes/safety.ts` | `validateRoutine` from `@workspace/safety` |
| Anti-repetition (AI) | `routes/routines.ts` | `previousDayContext` + yesterday meals/categories into prompt |
| Persistence | `routes/routines.ts` + DB routines table | save after UI confirm |
| Adaptation memory | `routine-adaptive-completion.ts` | `persistRoutinePersonalizationMemory` |
| Family moat | `routine-family-intelligence-moat.ts` | `finalizeFamilyIntelligenceMoat` |

### 3.2 What the actual inventive mechanism appears to be (derived from code)

Not a restatement of the patent abstract.

1. **A certified deterministic generator** that builds a full day from age-band templates, country geometry, school windows, and a date+name seeded shuffle — then runs a **multi-pass intelligence pipeline** that mutates items without re-running the scheduler.
2. **Hard health geometry:** dinner-end → bedtime gaps of 60 / 90 / 120 minutes by age, plus sleep-last and infant exclusive paths.
3. **A client-side concurrent-safe weather handshake** so auto-detect cannot overwrite a parent who tapped a chip, and so two generate clicks share one geolocation/meteo call.
4. **Post-generation deterministic sanitizers** (allergies, Jain/diet, AQI outdoor caps, trust validators) that do **not** rely on the LLM to be safe.
5. **Stateful personalization:** previous-day completion/mood/sleep signals, stored `energyProfile` (after ≥3 samples), learning weights, and a family-intelligence “moat” persist — on the **rule path** as well as the AI path.

What makes this different from “ask an LLM to create a parenting routine”:

- The **default production path does not ask an LLM to create the schedule**.
- Constraints are applied by **named, testable TypeScript functions** with a freeze/certification matrix (54 scenarios).
- Safety is a **choke-point after generation**, not a model promise.
- Weather UX is a **specific async-state protocol**, not “the model knows the weather.”

**Patent comparison:** The draft captures (1)’s hybrid *idea* and (3) well; it **under-describes** the certified pipeline, dinner-gap engine, AQI, infant path, country profiles, and family-intelligence loop; it **over-describes** LLM-as-generator and unimplemented clients.

---

## 4. Code-to-Claim Traceability

Status key: **FULLY SUPPORTED** / **PARTIALLY SUPPORTED** / **NOT FOUND** / **AMBIGUOUS**

### Category A

| Claim | Element | Code | File | Function | Status | Evidence | Notes |
|-------|---------|------|------|----------|--------|----------|-------|
| 1a | Dual touched flag (sync + deferred) | `weatherTouchedRef` + React `weatherTouched` | `generate.tsx` | state + ref | FULLY SUPPORTED | Both flipped on chip touch; ref read inside async | Matches “synchronously readable + deferred component-state” |
| 1b | At most one env-detect op; share in-flight | `weatherDetectInFlightRef` Promise | `generate.tsx` | `ensureWeatherDetected` | FULLY SUPPORTED | Concurrent calls await same Promise | Do **not** conflate with server Redis semaphore |
| 1c | Geolocation + timeout | `navigator.geolocation.getCurrentPosition` | `generate.tsx` | `detectWeatherOutdoorFromBrowser` | FULLY SUPPORTED | `timeoutMs` default 5000 | Browser Geolocation API |
| 1d | Meteorological query | Open-Meteo `forecast` | `generate.tsx` | same | FULLY SUPPORTED | temp, precip, wind, weather_code | Spec correctly says provider-agnostic |
| 1e | Map to outdoor-suitability classes | `yes` / `no` / `limited` | `generate.tsx` | `mapOpenMeteoToWeatherOutdoor` | PARTIALLY SUPPORTED | Three classes exist | Patent vocabulary is suitable / limited / unsuitable |
| 1f | Discard late detect if touched | `if (weatherTouchedRef.current) return weatherOutdoor` | `generate.tsx` | `ensureWeatherDetected` | FULLY SUPPORTED | Comment: “transparency over surgery” | |
| 1g | Inject classification before UI sync | `weatherForCall` threaded through generate | `generate.tsx` | `proceedGenerate` / `proceedAiGenerate` | FULLY SUPPORTED | Payload uses call-arg not waiting for setState | |
| 2 | Failures return null; proceed with existing | catch → `null`; fallback current weather | `generate.tsx` | `detectWeatherOutdoorFromBrowser` | FULLY SUPPORTED | Permission, timeout, abort, network | |
| 3 | Wake dialog; capture + re-inject | `pendingAction.weatherForCall` | `generate.tsx` | `handleWakeConfirmSubmit` | FULLY SUPPORTED | Re-injected after confirm | |
| 4 | Multi-platform including wearable, voice, offline | Web + iOS Capacitor web + Android WebView | kidschedule + shells | same `generate.tsx` bundle | PARTIALLY SUPPORTED | Three shells share web UI | Wearable / voice / local-inference **NOT FOUND** |
| 5a–g | Method form of 1 | same | `generate.tsx` | `ensureWeatherDetected` | FULLY SUPPORTED | Same protocol | |
| 5A | Shared in-flight | same | `generate.tsx` | `weatherDetectInFlightRef` | FULLY SUPPORTED | | |
| 5B | Bypass deferred state; inject payload | `weatherForCall` | `generate.tsx` | proceed* | FULLY SUPPORTED | | |

### Category B

| Claim | Element | Code | File | Function | Status | Evidence | Notes |
|-------|---------|------|------|----------|--------|----------|-------|
| 6a | Age-band engine + templates | age groups, feeding, sleep | `routine-age-feeding.ts`, `routine-templates.ts`, `@workspace/safety` | `getAgeGroup`, `classifyAgeBand`, templates | FULLY SUPPORTED | Distinct banks per band | Two age systems (months bands vs feeding groups) — counsel should not treat as one named engine |
| 6b | Date-seeded shuffle from date + child identifier | `dateSeed(date, childName)` | `routine-templates.ts` | `seededShuffle` | PARTIALLY SUPPORTED | Date + **child name**, not child id | Separate `weekRotationSeed` is ISO-week + salt, not this claim |
| 6c | Hybrid GAI + rule path | `/generate` rules; `/generate-ai` LLM | `routes/routines.ts` | `generateRuleBasedRoutine`; AI chat | PARTIALLY SUPPORTED | Both exist | Certified **primary** is rules, not hybrid-as-equal. Evidence strength: `"ai" \| "hybrid" \| "fallback"` |
| 6d | Deterministic correction of **GAI** outputs (wake anchor, school hours, allergy, cuisine, dedupe) | Many validators; AI path also validated | dinner integrity, school filters, `routine-meal-options-safety.ts`, pipeline | various | PARTIALLY SUPPORTED | Correction runs on **rule outputs too** | Claim wording makes correction “operative on GAI module” — too narrow vs code, too LLM-centric vs certified path |
| 6e | Prior-day category frequencies **into GAI prompt** | `previousDayContext` + previous meals/categories | `routes/routines.ts` ~2018–2095 | prompt builder | PARTIALLY SUPPORTED | Strong on **AI path** | Rule path uses pipeline/outcome store, **not** an LLM prompt |
| 7 | Energy profile peak/low reorder | `energyProfile`, sampleCount ≥ 3 | `intelligenceAnalytics.ts` | `applyEnergyCurveToItems` | FULLY SUPPORTED | Swap learning into peak; rest into low | Separate `enforceEnergyCurve` is heuristic evening downgrade — different mechanism |
| 8 | Rewrite instruction **notes** by caregiver | caregiver enum; templates; prompts; `simplifyForHandler` | `routine-templates.ts`, `routines.ts`, `family-routine` | `simplifyForHandler` prepends “Easy:”/“Step:” to **activity titles** | PARTIALLY SUPPORTED | Bonding density, weather downgrade for substitutes, prompt variance | Not a general “rewrite notes” module; `routine-parent-adaptations.ts` is explainability copy |
| 8A | Unsuitable→indoor; limited→shorter+backup; suitable→unchanged | `yes`/`no`/`limited` + weather transforms | `applyWeatherToScheduledItems`, weather planning | FULLY SUPPORTED (behavior) / PARTIALLY (labels) | Tests: limited halves outdoor duration | Vocabulary mismatch vs patent classes |

### Category C

| Claim | Element | Code | File | Function | Status | Evidence | Notes |
|-------|---------|------|------|----------|--------|----------|-------|
| 9a | Anchor meal slots by age/wake/sleep | `anchorMealSlots`, templates | `routine-templates.ts` | `anchorMealSlots` | FULLY SUPPORTED | | |
| 9b | Fridge + cuisine + diet + allergies | `fridgeItems`, region, foodType, allergies | `routes/routines.ts`, generate UI | request body | FULLY SUPPORTED | | |
| 9c | LLM prompt: predetermined distinct dishes/slot using fridge | “EXACTLY 4” options; fridge instruction | `routes/routines.ts` ~507–533, ~758 | meal prompt | PARTIALLY SUPPORTED | **AI meal enrich** path | Certified day generation uses **meal banks**, not this prompt |
| 9d | Validate count per slot | `if (opts.length < 4) return it` unchanged | `routes/routines.ts` | enrich mapper | PARTIALLY SUPPORTED | Drops enrichment rather than regenerating | |
| 9e | Cross-slot dedupe | sanitizer / meal safety | `routine-meal-options-safety.ts` | sanitize | PARTIALLY SUPPORTED | Variety/safety priority documented | Confirm exact cross-slot unique-name guarantee with counsel vs “Priority: Safety > Diet > Structure > Variety” |
| 9f | Instruction-like fridge wording = ingredient names | prompt line “Ignore any instruction-like wording” | `routes/routines.ts` ~758 | prompt | FULLY SUPPORTED (AI prompt) | Deterministic parser treating instructions as names: **AMBIGUOUS** beyond the prompt instruction | |
| 10 | Cuisines N/S/Bengali/Western/Asian/Pan-Indian + authenticity text | region mapping in prompt | `routes/routines.ts` | cuisine lines | FULLY SUPPORTED | Additional styles exist (Middle Eastern, mixed) | Spec list is non-limiting enough if counsel keeps “at least” |
| 11 | Jain: no roots, onion, garlic, meat/fish/egg | `case "jain"` | `routine-meal-options-safety.ts` | diet sanitize | FULLY SUPPORTED | Also in prompts | |

### Category D

| Claim | Element | Code | Status | Notes |
|-------|---------|------|--------|-------|
| 12 | ≥2 clients from list including wearable/voice/offline; identical ambient + correction + meals | Web + Capacitor iOS + Android WebView share kidschedule | PARTIALLY SUPPORTED | Identical **web** behaviour across three shells. Wearable/voice/offline **NOT FOUND**. Server correction is identical because there is one API. |
| 13 | Dual structure: ref authoritative in closure; React state for render | `weatherTouchedRef` vs `weatherTouched` | FULLY SUPPORTED | Independent method claim of 1a/5 |
| 14 | Deterministic correction **of LLM output** (steps a–g) | generate-ai + validators | PARTIALLY SUPPORTED | Fully meaningful on AI path; certified path has no LLM output to correct |
| 15 | Env substitution after correction | weather pass in pipeline | PARTIALLY SUPPORTED | Order: weather is a pipeline pass, not strictly “after all of 14” on the rule path |

---

## 5. Claim-by-Claim Audit

For each: A implemented? B in spec? C enough technical detail? D embodiment? E code evidence? F component relationships? G broader than implementation? H narrower than necessary?

### CLAIM 1
**Status:** FULLY SUPPORTED (with 1e vocabulary caveat)  
**Support:** Spec §6.2 + Figure 2 match `ensureWeatherDetected` closely.  
**Missing:** Code class names `yes/no/limited` vs claim “outdoor-suitability classifications” (map in spec if not already).  
**Risk:** Low technical. Independent claim is **narrow** to a specific React async pattern — good support, possibly narrower than the full engine (H).

### CLAIM 2
**Status:** FULLY SUPPORTED  
**Support:** Spec + code comments describe non-blocking failure.  
**Missing:** None material.  
**Risk:** Low.

### CLAIM 3
**Status:** FULLY SUPPORTED  
**Support:** Wake-confirm + `weatherForCall`.  
**Missing:** None material.  
**Risk:** Low.

### CLAIM 4
**Status:** PARTIALLY SUPPORTED  
**Support:** Spec §6.1 and §6.9 discuss multi-platform; §6.10 says future.  
**Missing:** Any wearable / voice / offline routine-generation embodiment in code.  
**Risk:** **High.** Claim is “implemented across two or more selected from [list including unimplemented].” Web+mobile can satisfy *if* counsel selects those two. Present-tense spec language that the invention **is realised** on wearable/voice/offline is **not** supported. (G) if read as requiring those platforms.

### CLAIM 5 / 5A / 5B
**Status:** FULLY SUPPORTED  
**Support:** Method restatement of Claim 1.  
**Missing:** None material.  
**Risk:** Low. Some overlap with Claim 13.

### CLAIM 6
**Status:** PARTIALLY SUPPORTED  
**Support:** Spec §6.3 hybrid + correction.  
**Missing:** Certified **rules-first** order; intelligence pipeline passes; dinner-gap geometry; that 6d/6e are not LLM-only in production.  
**Risk:** **High.** (G) if “hybrid generation engine” is read as AI being essential. (H) 6d/6e tie correction and anti-repetition to GAI, which **under-claims** the rule-based production path.

### CLAIM 7
**Status:** FULLY SUPPORTED when `energyProfile.sampleCount >= 3`; otherwise no-op  
**Support:** Spec mentions energy-profile re-ordering.  
**Missing:** Threshold of 3 samples; conservative at-most-one-swap; distinction from heuristic `enforceEnergyCurve`.  
**Risk:** Medium — claim does not disclose the sample-count gate (C weak).

### CLAIM 8
**Status:** PARTIALLY SUPPORTED  
**Support:** Spec caregiver module.  
**Missing:** Actual mechanism is template density + `simplifyForHandler` title prefixes + different AI prompts — not a notes rewriter.  
**Risk:** Medium (G) “rewrite instruction notes.”

### CLAIM 8A
**Status:** PARTIALLY SUPPORTED (behavior yes; labels no)  
**Support:** Figure 3 environmental substitution.  
**Missing:** Mapping table `yes=suitable`, `no=unsuitable`, `limited=limited`. Substitute-caregiver forces `limited` even if weather is `yes`.  
**Risk:** Medium terminology; extra deterministic override not in claim.

### CLAIM 9
**Status:** PARTIALLY SUPPORTED  
**Support:** Spec § meal engine + Figure 4.  
**Missing:** Production default is **rule meal banks**; LLM 4-option enrich is a path, not the certified generator.  
**Risk:** High if Claim 9 is treated as *the* meal invention (G on “must use LLM”; H vs banks).

### CLAIM 10
**Status:** FULLY SUPPORTED as “at least” those cuisines  
**Support:** Spec list.  
**Missing:** Other implemented styles.  
**Risk:** Low (H) — additional cuisines could be listed as embodiments.

### CLAIM 11
**Status:** FULLY SUPPORTED  
**Support:** Spec Jain constraints.  
**Missing:** None material.  
**Risk:** Low.

### CLAIM 12
**Status:** PARTIALLY SUPPORTED  
**Support:** Spec multi-platform.  
**Missing:** Wearable/voice/offline.  
**Risk:** **High** same as Claim 4. Broad independent claim.

### CLAIM 13
**Status:** FULLY SUPPORTED  
**Support:** §6.2.  
**Missing:** None material.  
**Risk:** Low. Overlaps Claim 1a.

### CLAIM 14
**Status:** PARTIALLY SUPPORTED  
**Support:** Spec correction infrastructure.  
**Missing:** Certified path has no LLM artefact; correction still runs. Cuisine “canonical-name registry” as a named registry is **AMBIGUOUS** (region banks + sanitizer vs a formal registry).  
**Risk:** Medium–high (G) “method for correction of LLM outputs” as if LLM is required.

### CLAIM 15
**Status:** PARTIALLY SUPPORTED  
**Support:** Figure 3.  
**Missing:** Exact pass order vs pipeline-order.md (weather is not strictly last).  
**Risk:** Medium process-order mismatch.

---

## 6. AI Architecture Audit

| Layer | What actually happens |
|-------|----------------------|
| **AI-generated** | `POST /routines/generate-ai`: LLM JSON schedule; meal-option enrich prompt (exactly 4 dishes/slot) via `runOpenAiJsonChat`; caregiver-specific prompt text |
| **Deterministic rules** | `generateRuleBasedRoutine` templates, `dateSeed` shuffle, dinner gaps, school exclusion, weather transforms, AQI caps, Jain/allergy sanitizer, timeline integrity, infant exclusive skips |
| **DB / context retrieval** | Child profile, fridge, previous routine row, `getMostRecentSignal`, `getChildIntelligenceSnapshot`, `computeLearningWeights`, custom recipes |
| **Post-generation validation** | Trust validators, meal-option sanitizer, `enforceFinalTimelineIntegrity`, `repairDinnerAnchor` |
| **Safety enforcement** | `runRoutineSafetyGate` (deterministic). `@workspace/safety` `validateRoutine` is a **separate HTTP route**, not the generate choke point |
| **Scheduling** | `scheduleRoutineItems` once; pipeline **does not** re-run scheduler (`routine-intelligence-pipeline-order.md`) |
| **Feedback / adaptation** | previousDayContext, energyProfile swaps, learning weights in **AI prompt**, adaptive completion pass, family intelligence persist |

**Does the patent accurately represent this?** **No, not as the primary architecture.**

Flagged implications in the draft:

| Implication | Accurate? |
|-------------|-----------|
| LLM performs the invention | **No** — certified path is rules-first |
| Deterministic logic is “AI” | Product marketing says “adaptive AI”; spec mixes “hybrid generation engine” |
| AI independently guarantees safety | **No** — safety is deterministic post-checks |
| System always uses hybrid equally | **No** — AI is alternate endpoint |
| Specific model/provider essential | Spec §6.1 correctly says service-agnostic; **code** currently uses OpenAI JSON chat + Open-Meteo |
| Open-Meteo / OpenAI required | Architecture can substitute; **not** claimed as essential in spec (good) |

---

## 7. Constraint Audit

| Constraint | Implemented? | How it affects generation | Patent accuracy |
|------------|--------------|---------------------------|-----------------|
| Time / wake-sleep anchors | Yes | Templates + `repairDinnerAnchor` | Partial (wake mentioned; dinner-gap 60/90/120 **missing**) |
| School hours | Yes | Exclusion / travel | Disclosed as schedule-consistency |
| Age | Yes | Banks, infant skip of pipeline steps 5–12 | Age-band disclosed; infant exclusive path **weak** |
| User preferences | Yes | Mood, caregiver, fridge, diet | Partial |
| Conflicts | Yes | `resolveScheduleConflicts` in final integrity | Weak in spec |
| Duration | Yes | Weather limited halves outdoor; AQI caps | Limited duration in 8A; AQI **missing** |
| Frequency / anti-repeat | Yes | previous-day categories; freshness pass | Claimed mainly as LLM prompt |
| Dependencies (dinner before bed) | Yes | Trust validators | Partial |
| Safety restrictions | Yes | Gate + meal sanitizer | Partial; over-unified vs two safety systems |
| Unavailable activities | Partial | Weather indoor swap; handler skipCategories | 8A / caregiver |
| Resources (fridge) | Yes | Meal from inventory | Claim 9 |
| Family / substitute caregiver | Yes | Extra bonding vs `simplifyForHandler` | Claim 8 partial |
| Previous routine state | Yes | prev routine + signals + moat | Weak vs actual |
| Country windows | Yes | `routine-country-profile.ts` | **Missing from patent** |
| AQI | Yes | `enforceOutdoorDurationLimits` | **Missing from patent** |

---

## 8. Safety Audit

**What is enforced**

1. **Generate choke:** `routine-safety-gate.ts` — AQI outdoor duration + `runBlockingTrustValidation` (sleep anchor, dinner-before-bed for age ≥36mo, infant feeding/age-safe meals).
2. **Meal sanitizer:** allergies, diet (incl. Jain), structure, variety — deterministic regex/rules.
3. **Client:** `simplifyForHandler` for grandparent/babysitter; `routine-item-safety.ts`.
4. **Optional UI/API:** `POST` safety route using `@workspace/safety` `validateRoutine` (sleep/screen/intensity style checks) — **not** the same module as the frozen dinner-gap engine.

**Where:** Server generate path (gate); pipeline; client post-process.

**Deterministic vs AI:** Safety on the hot path is **deterministic**. LLM is not the safety authority. AI path can fail closed (meal enrich returns items unchanged on parse failure).

**Can generation bypass it?** Partial regenerate endpoints are documented as calling the gate when they skip the full pipeline (`skipAqiEnforcement` semantics). A counsel question: are **all** write paths covered? Tests exist; this audit did not exhaust every endpoint.

**Patent accuracy:** Spec describes “deterministic correction” and allergy filtering. It does **not** clearly separate (a) generate safety gate, (b) `@workspace/safety` advisory validator, (c) meal sanitizer. It does **not** disclose AQI as a safety limiter.

**Over-promise flag:** Product copy (“Amy checks… automatically after each routine”) can be read as a unified guaranteed safety engine. Code is **layered and path-dependent**. The patent should not state that AI output is inherently safe.

---

## 9. Personalization Audit

```
USER/FAMILY DATA (child age, country, school, diet, allergies, fridge, caregiver, mood)
  → PROFILE/CONTEXT (energyProfile, parentGoals, intelligence snapshot, learningWeights)
  → GENERATION (rule templates ± AI prompt)
  → ROUTINE
  → FEEDBACK (complete/skip, signals, outcomes)
  → FUTURE GENERATION (previousDayContext, energy reorder if samples≥3, weights, moat)
```

| Characterisation | Accurate? |
|------------------|-----------|
| One-time personalized | Incomplete — also stateful |
| Stateful | **Yes** |
| Adaptive | **Yes**, with thresholds (e.g. energy samples) |
| Feedback-driven | **Yes** on subsequent days if signals/history exist |
| History-aware | **Yes** |
| Recommendation-driven | Partial (`learningWeights` in AI prompt; educational bias listed as **future** in §6.10 while weights **exist**) |

Patent terms “adaptive,” “personalized,” “context-aware” are used without the sample-count gates, infant skips, or moat persist. **Too vague for counsel to treat as enabling those mechanisms.**

---

## 10. Feedback / Adaptation Audit

| Signal | Implemented? | Changes future routines? |
|--------|----------------|--------------------------|
| Completion / skip | Yes (UI task check; outcome store) | Yes via adaptive completion + previousDayContext |
| Ratings | Not verified as a first-class generate input | — |
| Edits | User can modify before save | Saved artefact; not verified as a preference trainer |
| Regeneration | Yes (`forceOverride`, generate-ai) | New run; in-flight weather shared |
| Adherence % | `activityCompletion` in previousDayContext | Injected into **AI** prompt; rule path uses pipeline |
| Sleep/mood yesterday | `getMostRecentSignal` | AI prompt; pipeline `adaptRoutineForEmotion` |
| History | prev routine meals/categories | AI anti-repetition; freshness pass |
| Preference updates | caregiver/weather/diet each run | Explicit each generate |
| Energy profile | Stored analytics | Reorder after 3 samples |

**Flags**

- Patent **claims** anti-repetition via **GAI prompt** — implemented on AI path; **rule path adaptation is under-disclosed**.
- Patent **does not** adequately disclose `persistRoutinePersonalizationMemory` / `finalizeFamilyIntelligenceMoat`.
- §6.10 lists emotional-state and educational recommendation as **future**; mood input and `computeLearningWeights` are **present**. Inverse of the wearable problem.

---

## 11. Figure Audit

Existing in `patent/amynest_patent_package.html` (HTML/SVG, not verified as IPO Schedule II 1:1 sheets):

| Figure | Existing? | Sufficient? | Missing? | Why needed? |
|--------|-----------|-------------|----------|-------------|
| 1 System architecture | Yes | Partial | Wearable/voice/offline drawn as peer clients | Overstates unimplemented clients; omits certified pipeline box |
| 2 Env detect | Yes | **Yes** for Category A | — | Best figure-to-code match |
| 3 Hybrid + correction | Yes | Partial | Rules-first as primary; pipeline pass list | Implies AI ∥ rules equally; misses dinner-gap / AQI |
| 4 Meal enrichment | Yes | Partial for LLM path | Meal **banks** as certified default | Figure 4 is LLM-centric |
| Pipeline / constraint engine | No | — | **Recommend** | Material to actual invention |
| Safety/validation choke | No | — | **Recommend** | Distinct from “correction of LLM” |
| Personalization/adaptation | No | — | **Recommend** | Moat + energy + previous-day |
| Feedback loop | No | — | **Recommend** | Counsel enablement of “adaptive” |
| Context acquisition | Partial in Fig 2 | Weather only | Child/country/school/fridge | Optional if spec text is expanded |

IPO checklist item 6 requires printed Schedule II sheets. **SVG-in-HTML ≠ verified formal drawings.**

---

## 12. Terminology Audit

| Term in claim | Term in specification | Term in code | Consistent? | Recommendation |
|---------------|----------------------|--------------|-------------|----------------|
| outdoor-suitability / suitable / limited / unsuitable | same | `yes` / `no` / `limited`; explainability uses “unsuitable” | **No** | One mapping table |
| explicit user-preference preservation state flag | same | `weatherTouched` + `weatherTouchedRef` | Concept yes; names no | Disclose both |
| registry of pending asynchronous operations | in-flight retrieval | `weatherDetectInFlightRef` | Yes conceptually | Do not confuse with `routineGenerateGate` Redis cap |
| generative artificial intelligence module | language model inference engine | `runOpenAiJsonChat` / generate-ai | Partial | Provider-agnostic OK; do not imply primary path |
| age-band classification engine | same | `getAgeGroup` vs `classifyAgeBand` | Two implementations | Disclose both or pick one |
| child identifier | child identifier | `childName` in `dateSeed`; `childId` in API | **No** | Name vs id |
| caregiver-adaptive instruction transformation | same | `simplifyForHandler`, caregiver prompts | Partial | “notes” vs activity title prefix |
| deterministic correction infrastructure | same | many files, not one class | Vague | Name the choke (`routine-safety-gate` + pipeline) |
| canonical-name registry | cuisine authenticity | region meal banks + sanitizer | **AMBIGUOUS** | Define or drop |
| intelligent / personalized / adaptive / optimized / safe / context-aware / dynamic / AI-powered | used in spec/marketing | specific functions | **Vague** | Define operationally |
| Patent Pending / Provisional Patent Filed | draft placeholder date | i18n | **Contradicts filing evidence** | See §16 |
| AmyNest / AmyWorld / Ankur Raman | Applicant Ankur Raman | Brand AmyWorld; `package.json` MIT | Ownership inconsistency | Counsel |
| handler vs caregiver | caregiver | `HandlerKey` = `CaregiverKey` | Aliased in code | Disclose alias |

---

## 13. Contradictions

1. **Certified production is rules-first; patent/abstract/Figure 3 are LLM-hybrid-first.**
2. **Summary/§6.1:** invention **is realised** on wearable, voice, offline. **§6.10:** those are **future** embodiments. **Code:** NOT FOUND.
3. **§6.10 future:** emotional-state, educational recommendation, multi-child. **Code:** mood, `learningWeights`, `family-routine` / multi-child helpers exist (scope of “interlocking household routines” **AMBIGUOUS**).
4. **Claim 6d/14:** correction of **LLM** outputs. **Code:** correction of **rule** outputs on the certified path.
5. **Claim 6e:** prior-day frequencies **into GAI prompt**. **Code:** also pipeline/outcome on rule path; AI-only for the prompt mechanism.
6. **Claim 8A labels** vs **code `yes/no/limited`**.
7. **Safety:** patent one “correction infrastructure”; code two+ systems (`routine-safety-gate` vs `@workspace/safety`).
8. **Product i18n:** “Provisional patent filed.” **Patent HTML:** unfilled date. **Repo:** no receipt.
9. **Drawings checklist:** Schedule II sheets. **Package:** HTML SVG only.
10. **Server semaphore** (max 40 generates) is unrelated to Claim 1b “at most one environmental detection” — risk of mis-citation if anyone maps them.
11. **Patent agent:** “NA (filed by applicant in person)” while document itself says Complete Spec should be reviewed by a registered agent.
12. **Root `package.json` license MIT** vs “proprietary patent-pending” product copy — IP-message conflict for diligence (not a claim-construction issue).

---

## 14. Overclaim Risks

| Claim | Why too broad vs evidence | Code support | Potential risk | Patent-counsel question |
|-------|---------------------------|--------------|----------------|-------------------------|
| 4, 12 | List includes wearable/voice/offline; “functionally identical” | Web/iOS/Android WebView only | Written-description / factual inaccuracy if those environments are treated as implemented | Restrict “selected from” to web + native mobile for this filing? Treat others as prophetic? |
| 6, 14 | LLM framed as generation/correction core | Rules-first certified | Priority date may attach to a different architecture than production | Should independent generation claim be rules-first with AI as embodiment? |
| 8 | “Rewrite instruction notes” | Title prefixes + prompts | Claim not enabled as stated | Narrow to simplify/filter/prefix? |
| 9 | Method requires LLM prompt + exact option counts | Banks are certified meals | Overclaim vs production default | Split embodiments: bank vs LLM enrich? |
| Abstract | “hybrid generation engine combines GAI with rule-based path” as the system | AI optional | Examiner/diligence reads AI as essential | Recast hybrid as alternate embodiment |

No claim rewrites are provided.

---

## 15. Undisclosure Risks

| Implementation | Current disclosure | Potential gap | Evidence |
|----------------|-------------------|---------------|----------|
| Certified pipeline order (13+ passes) | Figure 3 high-level hybrid | **Large** | `routine-intelligence-pipeline-order.md`, `routine-intelligence-pipeline.ts` |
| Dinner-to-sleep 60/90/120 | Not found as such | **Large** — certified health guarantee | `routine-meal-dinner-integrity.ts`, certified architecture doc |
| Country sleep/dinner windows | Not found | Medium–large | `routine-country-profile.ts` |
| AQI outdoor caps | Not found | Medium | `routine-aqi.ts`, safety gate |
| Infant exclusive path (skip steps 5–12) | Weak age-band only | Medium | pipeline-order.md |
| Family intelligence moat persist | Not found | Medium | `routine-family-intelligence-moat.ts` |
| `energyProfile` sampleCount ≥ 3 | Energy module named, threshold not | Small–medium | `applyEnergyCurveToItems` |
| Dual generate endpoints | Hybrid mentioned | Medium — which is production | `routes/routines.ts` |
| `@workspace/safety` vs generate gate | One correction story | Medium | `routes/safety.ts` vs `routine-safety-gate.ts` |
| Android WebView vs Capacitor iOS | “native mobile” | Small if embodiments stay generic | `android/` vs `artifacts/amynest-capacitor/` |
| Substitute caregiver forces weather `limited` | 8A only weather classes | Small | `generateRuleBasedRoutine` |
| Fixed activities / special events preserve | Not found | Small–medium | pipeline late passes |
| Redis generate semaphore | Not claimed (good) | n/a | Do not accidentally claim it as 1b |

If these are omitted from the **provisional**, later complete-spec additions may **not** inherit this filing’s priority for that matter. That is a counsel issue, not a novelty opinion.

---

## 16. Ownership / Filing Status Audit

### Filing

| Claim (public or in-package) | Evidence | Verified? | Safe to state publicly? |
|------------------------------|----------|-----------|-------------------------|
| Provisional specification exists as draft | `patent/amynest_patent_package.html` | **Yes** (file exists) | Yes: “draft specification in repo” |
| Provisional **filed** | Placeholder `[Date of Filing of this Provisional]`; no application number | **No** | **No** |
| Patent pending | Product i18n, pills, App Store (cited in other diligence docs) | **Not verified as a filing** | **No**, based on this repo |
| Application / filing number | None | **No** | **No** |
| Priority date | Placeholder | **No** | **No** |
| Patent number / grant | None | **No** | **No** |
| Inventor | Ankur Raman (HTML) | Named in draft only | Name-in-draft only |
| Applicant | Ankur Raman | Named in draft | Not “AmyNest Inc.” / AmyWorld as applicant |
| Assignee | None in package | **No assignment in repo** | Do not state corporate ownership of this application |
| Patent agent | NA, applicant in person | As drafted | Complete spec note contradicts DIY positioning |

### Ownership consistency (flag for counsel — no legal conclusion)

- Applicant/inventor: **Ankur Raman** (natural person, Lucknow address).
- Product brand / legal copy elsewhere: **AmyWorld** / App Store seller “Amyworld”.
- Repository license field: **MIT** at workspace root.
- No IP assignment from contractors, no company-as-applicant, no employee invention record in repo.
- Third-party code (OpenAI client, Open-Meteo, Firebase, RevenueCat, Capacitor plugins) is **not** assigned in this package.

Counsel should reconcile **who owns the application** vs **who owns the product** vs **open-source license notice**.

---

## 17. Third-Party Dependency Audit

| Dependency | Role in Routine Generation | Is it the invention? | Substitutable in architecture? | Patent treatment |
|------------|----------------------------|----------------------|--------------------------------|------------------|
| OpenAI (`runOpenAiJsonChat`) | AI generate + meal enrich | No | Yes (spec already service-agnostic) | Do not lock claims to OpenAI |
| Open-Meteo | Client weather | No | Yes | Named in code; spec abstract is correct |
| Browser Geolocation | Coordinates | No | Platform provider | Claim 1c OK |
| Firebase | Auth/product, not generate core | No | n/a | Do not claim |
| RevenueCat | Billing | No | n/a | Do not claim |
| Redis | Generate concurrency cap | Operational | Yes | Do not map to Claim 1b |
| Capacitor / Android WebView | Shells | Client environments | Other shells possible | “native mobile” OK if generic |

Spec §6.1 already states meteorological / LLM / TTS providers are illustrative. **Keep that.** Avoid marketing that “Patent-Pending Adaptive AI” implies a specific vendor.

---

## 18. Gap Matrix

| ID | Gap | Severity | Evidence | Claim/Section | Fix required | Filing impact |
|----|-----|----------|----------|---------------|--------------|---------------|
| G01 | Certified rules-first + intelligence pipeline vs LLM-hybrid primary narrative | **P0** | `v1-certified-architecture.md` vs abstract / Fig 3 / Claim 6 | Spec §§4, 6.3; Claims 6, 14 | Disclose production order as primary embodiment; AI as alternate | Priority may attach to the wrong architecture |
| G02 | Present-tense “is realised” on wearable / voice / offline vs §6.10 future vs NOT FOUND | **P0** | Spec ~350–396, 729–749; no wearable generate code | §§4, 6.1; Claims 4, 12; Fig 1 | Prophetic language only; implemented = web + iOS web + Android WebView | Factual inconsistency in the filing package |
| G03 | Public “Provisional patent filed” / patent-pending vs placeholder date, no receipt | **P1** | `en.json` `tech_patent_desc`, `settings_note`; HTML line 138 | Product vs cover | File then evidence, or strip copy | Not IPO form-fatal; **diligence and advertising** fatal |
| G04 | Dinner-gap 60/90/120 and country windows omitted | **P1** | `routine-meal-dinner-integrity.ts`, `routine-country-profile.ts` | Spec 6.x missing | Add embodiment | New matter / priority risk if added only later |
| G05 | Intelligence pipeline passes and family-intelligence moat omitted | **P1** | pipeline-order.md; `routine-family-intelligence-moat.ts` | Spec / figures | Add flow + short algorithm | Same |
| G06 | AQI / outdoor safety vs “LLM correction” story | **P1** | `routine-safety-gate.ts`, `routine-aqi.ts` | Safety disclosure | Separate safety figure/section | Same |
| G07 | Claim 8 notes-rewrite vs `simplifyForHandler` | **P1** | `lib/family-routine/src/index.ts` | Claim 8 | Align claim language to actual transform | Enablement of Claim 8 |
| G08 | Claim 6e anti-repetition as prompt-only | **P1** | `routes/routines.ts` vs pipeline | Claim 6e | Disclose rule-path adaptation | Underclaim + mismatch |
| G09 | Suitability vocabulary mismatch | **P1** | `mapOpenMeteoToWeatherOutdoor` | Claims 1e, 8A | Mapping table | Construction risk |
| G10 | Two age classifiers / two safety stacks unnamed | **P1** | `@workspace/safety` vs templates vs safety-gate | §§6, safety | Name modules and call order | Enablement |
| G11 | Figures: no pipeline / safety / feedback; Fig 1 overstates clients | **P1** | HTML Figs 1–4 | §5 drawings | Add 1–2 figures; fix Fig 1 | Checklist + understanding |
| G12 | Schedule II formal drawing sheets not in repo | **P1** | Checklist item 6 vs SVG-in-HTML | Filing checklist | Produce IPO-compliant sheets | Formality |
| G13 | Claim 9 LLM meals vs certified meal banks | **P1** | `generateRuleBasedRoutine` meal banks vs EXACTLY 4 prompt | Claim 9 / Fig 4 | Dual embodiment | Overclaim production |
| G14 | Applicant Ankur Raman vs AmyWorld / MIT | **P1** | HTML cover; `package.json` license | Ownership | Counsel assignment / applicant entity | Diligence, not claim text |
| G15 | `dateSeed` uses child **name** not id | **P2** | `routine-templates.ts` | Claim 6b | “identifier including name or id” | Minor |
| G16 | Energy sampleCount ≥ 3 not disclosed | **P2** | `applyEnergyCurveToItems` | Claim 7 | One sentence | Enablement polish |
| G17 | Extra cuisines / diets not listed | **P2** | `routes/routines.ts` | Claim 10 | Optional embodiments | Underdisclosure |
| G18 | Substitute caregiver forces `limited` weather | **P2** | `generateRuleBasedRoutine` | 8A | Optional sentence | Completeness |
| G19 | Vague adjectives (intelligent, AI-powered, safe) | **P2** | Spec + i18n | Throughout | Operational definitions | Prosecution vocabulary |
| G20 | Claim 1/5/13 overlap | **P2** | Indicative claims | Cat A / D | Counsel claim hygiene | Later complete spec |
| G21 | HTML print CSS vs legal Form 2 pagination | **P3** | `amynest_patent_package.html` | Formality | Agent formatting | Cosmetic |
| G22 | “15 patents” confusion in older studies | **P3** | deep study Qs | External | Means 15 indicative claims | Communication |
| G23 | Redis generate gate unused in claims | **P3** | `routine-generate-semaphore.ts` | — | Do not map to 1b | Confusion avoidance |
| G24 | TTS mentioned in architecture; not core generate | **P3** | Spec §6.1 | Fig 1 | Keep as optional | Scope creep |

**P0 = 2 · P1 = 12 · P2 = 6 · P3 = 4** (G03 counted P1: it does not block *filing the draft*, it blocks *truthful public filing claims*.)

---

## 19. Final Readiness Score

========================================  
AMYNEST ROUTINE GENERATION PATENT AUDIT  
========================================

Technical implementation: **PASS** (the product engine exists and is certified)

Code-to-claim consistency: **CONDITIONAL PASS** (Cat A strong; Cat B/C/D mixed)

Specification support: **CONDITIONAL PASS** (Cat A good; certified engine weak)

Terminology consistency: **CONDITIONAL PASS**

Figure completeness: **CONDITIONAL PASS** (4 figures exist; wrong emphasis)

AI architecture disclosure: **FAIL** (primary vs alternate inverted)

Safety disclosure: **CONDITIONAL PASS**

Personalization disclosure: **CONDITIONAL PASS**

Feedback/adaptation disclosure: **CONDITIONAL PASS**

Ownership consistency: **CONDITIONAL PASS**

Filing-status claims: **FAIL** (draft vs “filed”)

**Overall technical readiness: 58 / 100**

P0 gaps: **2**  
P1 gaps: **12**  
P2 gaps: **6**  
P3 gaps: **4**

**FINAL STATUS: B. CONDITIONAL — FIX P0/P1 GAPS BEFORE FINAL REVIEW**

**Technical disclosure quality (engineer-reproduction test, not legal enablement):** **Partial.** A skilled engineer could reproduce Category A from the spec + Figure 2. They could **not** reproduce the certified June 2026 generator (dinner gaps, pipeline order, country profiles, AQI gate, infant skips, family moat) from the patent package alone.

**Prior-art search:** **not performed.**

### Potentially differentiating technical features (not a patentability conclusion)

| Feature | Technical mechanism | Why it may differ from “LLM writes a routine” | Code evidence | Patent disclosure |
|---------|---------------------|-----------------------------------------------|---------------|-------------------|
| Dual-state weather handshake | Ref + React state; shared in-flight Promise; discard if touched; inject `weatherForCall` | Specific concurrent UX protocol | `generate.tsx` `ensureWeatherDetected` | **Well disclosed** |
| Rules-first certified pipeline | Templates → intelligence passes → dinner repair | Deterministic health geometry + freeze tests | certified architecture; pipeline | **Weak / inverted** |
| Energy-profile slot swap | Historical windows; ≥3 samples; at most one swap | Observed behaviour, not prompt flavour | `applyEnergyCurveToItems` | Named, underspecified |
| Meal-option sanitizer | Priority Safety>Diet>Structure>Variety | Post-LLM deterministic food safety | `routine-meal-options-safety.ts` | Partial (Claim 9) |
| Previous-day + moat | Signals + persist | Stateful, not one-shot | `previousDayContext`, family moat | Partial / missing |

---

## 20. Final Recommendation

1. **Do not treat this HTML package as filed.** Do not say “patent pending” or “provisional filed” until a receipt with application number exists.
2. **Before handing to a registered patent professional for filing review, fix P0:**  
   - Rewrite the generation story so the **certified rules-first pipeline** is an explicit embodiment (preferably the primary one).  
   - Make wearable / voice / offline **prophetic only**, consistent with §6.10; Figure 1 should not present them as shipped peers.
3. **Strongly fix P1:** dinner-gap geometry, pipeline passes, AQI safety gate vs advisory `@workspace/safety`, Claim 8/9/6e alignment, suitability vocabulary, formal drawings, applicant vs AmyWorld.
4. **Keep** Category A (Claims 1–3, 5, 5A, 5B, 13) — it is the best code-to-spec match in the package.
5. **Do not broaden claims in this audit.** Counsel should decide whether independent generation claims should be rules-centric with AI as a dependent embodiment.
6. This audit **did not** modify patent files, source code, claims, or git history.

---

## 26. Most important question (explicit)

**Based ONLY on the repository and patent documents, is the Routine Generation disclosure internally complete and technically consistent enough to hand to a registered patent professional for final filing review?**

### YES, WITH SPECIFIC FIXES

A registered professional can review this package **today** as a **draft**, but it is **not** internally complete or consistent enough to file *as the disclosure of the production Routine Generation system* without addressing G01 and G02 (and preferably the P1 block). Category A is filing-quality technically. The certified engine is not. Public filing-status language is unsupported.

Hand to counsel with this audit attached; do not certify the current HTML as final-submission ready.
