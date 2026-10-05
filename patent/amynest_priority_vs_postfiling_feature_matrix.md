# Priority vs post-filing feature matrix

**Application:** 202611059355  
**Filed Form 2:** 37-page provisional, print 08/05/2026 21:43, IPO filing **10 May 2026**  
**Production snapshot:** September 2026 (certified routine engine freeze: June 2026)

Classification used in the Section 10 draft:

| Code | Meaning |
|------|---------|
| **P0** | Directly disclosed in filed Form 2 |
| **P1** | Reasonably derivable / embodiment — agent review before relying for 10 May priority |
| **P2** | Post-filing implementation — **not** presented as original priority disclosure |
| **P3** | Future / speculative (Form 2 §6.10 or not implemented) |

Proposed Section 10 treatment: **core body + claims use P0/P1 only**. P2/P3 appear in labelled annexes, dashed figures, or alternative-embodiment paragraphs.

---

## Traceability (requested 42 topics)

| # | Feature | Form 2 locus | Priority-supported? | Current production | Source (implementation evidence) | Section 10 treatment | Claim relevance | New-matter risk |
|---|---------|--------------|---------------------|--------------------|----------------------------------|----------------------|-----------------|-----------------|
| 1 | Ambient-condition classification | §6.2, §6.2.4, Fig. 2 | **YES P0** | Implemented (UI yes/limited/no ⇔ suitable/limited/unsuitable) | `generate.tsx` `mapOpenMeteoToWeatherOutdoor` | Core §6.2.4 | 1, 5 | Low |
| 2 | Geolocation | §6.2.4 | **YES P0** | Browser geolocation; native shell location | `detectWeatherOutdoorFromBrowser` | Core | 1(c) | Low |
| 3 | Environmental/weather query | §6.2.4 | **YES P0** | Remote meteo (Open-Meteo class API — vendor not claimed) | same | Core | 1(d) | Low |
| 4 | Suitable / limited / unsuitable | §6.2.4 table | **YES P0** | Same three classes, different UI labels | same | Core + mapping note | 11 | Low |
| 5 | Explicit user-preference preservation | §6.2.1 | **YES P0** | `weatherTouched` + `weatherTouchedRef` | `generate.tsx` | Core §6.2.1; Fig. 6 | 1(a)(f), 18 | Low |
| 6 | Sync reference + deferred state | §6.2.1, §6.9 | **YES P0** | ref + React state | same | Core | 1, 5, 18 | Low |
| 7 | Shared in-flight retrieval | §6.2.2 | **YES P0** | `weatherDetectInFlightRef` | same | Core | 1(b), 6 | Low |
| 8 | Duplicate-request suppression | §6.2.2 | **YES P0** | Shared Promise | same | Core | 6 | Low |
| 9 | Late-resolution race handling | §6.2.3 | **YES P0** | Discard if touched during await | same | Core Fig. 6 | 1(f), 5(e) | Low |
| 10 | Direct payload injection | §6.2.4 | **YES P0** | `weatherForCall` into payload before UI commit | `buildGeneratePayload` | Core | 7 | Low |
| 11 | Async confirmation / pending-action continuity | §6.2.4 | **YES P0** | `pendingAction.weatherForCall` | wake confirm | Core | 3 | Low |
| 12 | Silent failure / fallback | §6.2.5 | **YES P0** (weather) | Null → existing/default weather | `ensureWeatherDetected` | Core Claim 2 | 2 | Low if kept weather-scoped |
| 13 | Age-band classification | §6.3 table 0–11 / 12–35 / 36–59 / 60–119 / 120–180 | **YES P0** for that table | Multiple classifiers (see below) | `age-groups.ts` matches table; `classifyAgeBand` and feeding `getAgeGroup` **differ** | Core uses **filed table only**; discrepancy flagged | 8(a) | **P1** if claiming other cut-points |
| 14 | Date-seeded shuffle | §6.3, §6.4.1 | **YES P0** | Seeded shuffle in templates | `routine-templates.ts` | Core | 8(b) | Low |
| 15 | Rule-based generation | §6.4.1 | **YES P0** | Primary `POST /routines/generate` | `generateRuleBasedRoutine` | Core as **a** path, not as later “certified primacy” | 8(c), 15 | Claiming *primacy* = **P2** |
| 16 | AI generation | §6.4.2 | **YES P0** | `POST /routines/generate-ai` | `routines.ts` | Core as optional path; no vendor | 8(c), 14, 19 | Low |
| 17 | Deterministic correction | §6.4.3, Fig. 3 | **YES P0** | Intelligence pipeline + validators (richer than filed list) | `runRoutineIntelligencePipeline` | Core limited to filed transformations | 8(d), 12, 19 | Reciting named 13-pass order = **P2** |
| 18 | Temporal anchoring | §6.4.3 | **YES P0** | Wake cascade / time rebase | pipeline / scheduler | Core | 8(d), 19(b) | Extending to dinner-gap minutes = **P2** |
| 19 | School-block exclusion | §6.4.3 | **YES P0** | School window enforcement | pipeline | Core | 8(d), 19(c) | Low |
| 20 | Environmental substitution | §6.5 | **YES P0** | Indoor swap / duration cut / passthrough | weather transforms | Core Fig. 5 | 11, 20 | AQI overlay = **P2** |
| 21 | Anti-repetition | §6.4.3 | **YES P0** | Prior-day categories in prompt + some post-check | `previousDayContext` | Core | 13 | Low |
| 22 | Allergy/diet filtering | §6.4.3, §6.7 | **YES P0** | Prompt + sanitizer (meat/egg for veg/Jain) | `routine-meal-options-safety.ts` | Core | 12, 17, 19(d) | Jain roots as sanitizer = **UNSUPPORTED** |
| 23 | Cuisine validation | §6.4.3, Claim 10 | **YES P0** | Prompt + some validation | routines meal guidance | Core | 16, 19(e) | Low |
| 24 | Cross-slot deduplication | §6.4.3, §6.7 | **YES P0** | Dedup on enrich path | meal enrich | Core | 14(d), 19(f) | Low |
| 25 | Energy-profile re-ordering | §6.4.4 | **YES P0** | `applyEnergyCurveToItems`; no-op if `sampleCount < 3` | `intelligenceAnalytics.ts` | Core; number 3 is P1 | 9 | Reciting 3 = P1 |
| 26 | Caregiver-adaptive transformation | §6.6 | **YES P0** as rewrite policies | Title prefix + templates + prompts — **narrower** | `simplifyForHandler` | Core with honesty note | 10 | Over-claiming full NL rewrite = risk |
| 27 | Meal-slot anchoring | §6.7 Phase A; §6.4.1 anchors | **YES P0** | Both banks and enrich | templates + meals | Core | 14(a), 15 | Low |
| 28 | AI meal-option generation | §6.7 Phase B; Fig. 4 | **YES P0** as Phase B | Optional; **not default** | generate-ai / meal enrich | Core as optional; “exactly 4” not essential | 14 | Claiming always-4-default = false + P2 emphasis |
| 29 | Ingredient-aware generation | §6.7 interpolation example | **YES P0** | Prompt interpolation | routines | Core | 14(b)(c) | Low |
| 30 | Regional cuisine | §6.7, Claim 10 | **YES P0** | Multiple regions including filed set | routines | Core | 16 | Low |
| 31 | Jain constraints | Claim 11, Fig. 4, §6.7 food style | **YES P0 as prompt** | Prompt: roots/onion/garlic; sanitizer: meat/egg | `routines.ts`; `routine-meal-options-safety.ts` | Core prompt-only; P1 flag | 17 | Deterministic Jain engine = **UNSUPPORTED** |
| 32 | Reward points / engagement | §6.8 | **YES P0** | Category weighting exists | points utilities | §6.8 optional; not in independent claims | — | Low |
| 33 | Web/mobile architecture | §§6.1, 6.9, Claim 4 | **YES P0** | Web + iOS Capacitor + Android WebView | `artifacts/kidschedule`; `artifacts/amynest-capacitor`; `android/` | Operative platforms | 4 | Naming Capacitor/WebView is implementation evidence, not new matter |
| 34 | Wearable | §6.1 present tense **and** §6.10 future | **REVIEW P3** | **NOT FOUND** as generation client | — | Dashed alternative | omitted from Claim 4 | Claiming as operative = false enablement |
| 35 | Voice assistant | same | **REVIEW P3** | NOT FOUND as generation client | TTS exists as rendering, not voice-gen | Alternative | omitted | Same |
| 36 | Offline/local inference | §6.1 / §6.10 | **REVIEW P3** | NOT FOUND | — | Alternative | omitted | Same |
| 37 | Smart-home | §6.10 only | **P3** | NOT FOUND | — | §6.10 | none | Do not claim |
| 38 | Biometric inputs | §6.10 | **P3** | NOT FOUND for generation | — | §6.10 | none | Do not claim |
| 39 | Emotional-state inference | §6.4 mood input **P0**; facial/biometric inference **P3** | SPLIT | Caregiver mood input: yes. Facial analysis: NOT FOUND | generate payload mood | Mood as input in §6.4; inference in §6.10 | 8 inputs | Do not claim facial ML |
| 40 | Multi-child orchestration | §6.10 | **P3** | Multi-child profiles exist; interlocking household conflict-resolution as described is not the certified generate path | — | §6.10 | none | Do not claim interlocking scheduler |
| 41 | Travel mode | §6.10 | **P3** | NOT verified as Form 2 module | — | §6.10 | none | Do not claim |
| 42 | Educational recommendation integration | §6.10 | **P3** | Learning-weight correlations mainly prompt-level, not a learning-platform ingest | `learningWeights.ts` | Annex; not §6.10 expansion as if implemented | none | Do not claim trained recommender |

---

## Additional current mechanisms (not in the original 42)

| Feature | Form 2? | Production | Treatment | New-matter |
|---------|---------|------------|-----------|------------|
| Dinner–bed 60 / 90 / 120 min | **NO** | `getMinimumDinnerSleepGap`; freeze June 2026 (**after** 10 May) | Annex A only | **P2 HIGH** |
| Country dinner/sleep windows (US/UK/AU/NZ/AT/AE/IN tables) | **NO** as tables | `routine-country-profile.ts` | Annex A | **P2** |
| AQI 0 / 15 / 20 min outdoor cap | **NO** | `maxOutdoorMinutesFromAqi` | Annex A | **P2 HIGH** |
| UAE no outdoor before 18:30 | **NO** | `enforceUaeOutdoorHardConstraint` | Annex A | **P2** |
| `repairDinnerAnchor` as named last step | **NO** | certified architecture | Annex A; may be argued as later temporal-anchoring embodiment **only with agent approval** | **P2** |
| HTTP 422 `routine_validation_failed` | **NO** | generate choke | Annex A | **P2** |
| LM failure → rules fallback | **NO** (weather silent-fail only) | `generate-ai` fallback | Annex A | **P2** |
| Family moat / trustScore | **NO** | heuristic 0–100 | Annex A | **P2** |
| Infant exclusive skip &lt;6 months | **NO** (infant is 0–11) | `isExclusiveInfantPhase` | Annex A | **P2** |
| Meal banks as **default** | Template pools **P0**; default-status **NO** | banks default | Claim 15 P1; default flag P2 | **P2** for “default” |
| Redis generate semaphore max 40 | **NO** | `routine-generate-semaphore.ts` | Do not map to Claim 1(b) | Different mechanism |

---

## Architecture timeline (do not merge)

```
FILED 10 May 2026 (Form 2):
  env sync → path selector (AI | rules) → deterministic correction
             (Fig. 3: correction applied to both; AI may get full chain)

PRODUCTION after June 2026 certification:
  resolveRoutineGenerationInputs
    → generateRuleBasedRoutine          [primary]
    → runRoutineIntelligencePipeline
    → repairDinnerAnchor
  optional: generate-ai → same pipeline → safety → rules fallback
```

The Section 10 body preserves the **filed** hybrid. Current primacy is implementation evidence in Annex A, not a rewritten priority invention.

---

## Age-classifier discrepancy (P1)

| Classifier | Cut-points | Used for |
|------------|------------|----------|
| Form 2 §6.3 (priority) | 0–11 / 12–35 / 36–59 / 60–119 / 120–180 | Written description |
| `artifacts/kidschedule/src/lib/age-groups.ts` | infant&lt;12 / toddler&lt;36 / preschool&lt;60 / early_school&lt;120 / pre_teen | App grouping — **aligned** with Form 2 |
| `routine-age-feeding.ts` `getAgeGroup` | &lt;6 / &lt;12 / &lt;36 / else child | Feeding / infant skip |
| `@workspace/safety` `classifyAgeBand` | infant&lt;18 / … / school&lt;132 / tween | Advisory safety route — **not** generate choke |

**P1 — COUNSEL / TECHNICAL RECONCILIATION REQUIRED** before any claim recites numeric age cut-points other than the Form 2 table.
