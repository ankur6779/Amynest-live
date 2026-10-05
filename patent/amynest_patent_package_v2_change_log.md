# AmyNest patent package v2 — change log

**Created:** 14 September 2026  
**New file:** `patent/amynest_patent_package_v2.html`  
**Untouched original:** `patent/amynest_patent_package.html`  
**This file:** `patent/amynest_patent_package_v2_change_log.md`

This is a technical revision record for a registered patent professional. It is not a legal opinion, not a filing receipt, and not a claim that an application has been filed.

---

## 0. What was and was not modified

| Path | Action |
|------|--------|
| `patent/amynest_patent_package_v2.html` | **Created** |
| `patent/amynest_patent_package_v2_change_log.md` | **Created** |
| `patent/amynest_patent_package.html` | **Not modified** |
| Application / backend / frontend / product copy / git / production | **Not modified** |

---

## 1. Audit-to-revision mapping

| Issue ID | Patent section (v1 → v2) | Production source | Current problem (v1) | Revision made | Implementation support | Claim impact | Counsel review required |
|----------|--------------------------|-------------------|----------------------|---------------|------------------------|--------------|-------------------------|
| C0 | Entire package | File mtime 8 May 2026 vs audits 14 Sep | No professional revision existed | New v2 draft; v1 archived in place | n/a | n/a | Yes — this is still a draft |
| P0-1 / G01 | Abstract, §1–4, §6.4.3, Fig 1/3, Claims 6d/14 | `routes/routines.ts` `POST /routines/generate`; `generateRuleBasedRoutine`; `v1-certified-architecture.md` | LLM → generate → post-correct as primary | Rules-first pipeline is primary; LLM is optional path into the **same** pipeline + fallback | FULL | Claim 6, 14, 15 rewritten | Yes — 3(k) / independence |
| P0-2 | §1, §4 fifth aspect, §6.1, §6.2.4, §6.9, Fig 1, Claims 4/12 | kidschedule web; Capacitor iOS; `android/` WebView | Present-tense wearable/voice/offline | Implemented = web + iOS Capacitor web + Android WebView; others §6.18 future only; Fig 1 dashed | FULL | Claims 4, 12 narrowed | Yes — Markush form |
| G03 | Cover / §10.1 | HTML placeholder; no application number | Product said “filed” | v2 states NOT FILED; placeholder date retained; **product copy not edited** | n/a | none | Founder/docs after receipt |
| G04a | v2 §6.10, Fig 7, Claim 8B | `getMinimumDinnerSleepGap`; `repairDinnerAnchor` | Gaps omitted | 60 / 90 / 120 disclosed | FULL | New 8B | Confirm numbers if engine later retuned |
| G04b | v2 §6.8 | `routine-country-profile.ts` | Country windows omitted | US/UK/AU/NZ/AT/AE/IN; IN/AE/US examples from code | FULL | Embodiment | Do not universalize examples |
| G05a | v2 §6.5, Fig 2 | `routine-intelligence-pipeline-order.md` | Pipeline omitted / called “AI” | Ordered passes; scheduler not re-run; infant skip | FULL | Claim 6d | Terminology “intelligence” vs LLM |
| G05b | v2 §6.12, Fig 8 | `routine-family-intelligence-moat.ts` | Moat omitted | Prepare/finalize, heuristic trustScore | FULL | Claim 8D | Not neural net |
| G06 | v2 §6.7, §6.11, Fig 6 | `routine-aqi.ts`; `enforceRoutineSafety`; `routes/safety.ts` | One “LLM correction” safety story | AQI distinct from weather; generate choke vs advisory route | FULL | New 8C | Two stacks |
| G07 | v2 §6.17, Claim 8 | `simplifyForHandler` | “Rewrite instruction notes” | Title prefix / filter / template density / optional prompt | PARTIAL vs v1 claim | Claim 8 narrowed | Wording |
| G08 | v2 §6.12, Claim 8D | `previousDayContext`; pipeline; AI prompt | Prompt-only anti-repetition | Both paths disclosed | FULL | 6e → 8D | |
| G09 | v2 §6.3, Claim 1e | `mapOpenMeteoToWeatherOutdoor` | yes/no vs suitable/unsuitable | Mapping table in spec | FULL | Claim 1e | |
| G10 | v2 §6.2 | `getAgeGroup` vs `classifyAgeBand` | One engine | Two classifiers named; generate vs advisory | FULL | Flag in 6.2 | Do not merge |
| G11 | v2 Figs 1–8 | certified path | Figs 1/3/4 LLM-centric | Eight figures: architecture, certified path, weather, banks, optional LLM+fallback, safety, dinner, feedback | FULL | — | Schedule II sheets still needed |
| G12 | §10.4 | HTML SVG | Not IPO sheets | Explicitly deferred to draftsman | n/a | Formality | Yes |
| G13 | v2 §6.9, Fig 4, Claim 9 | meal banks; EXACTLY 4 enrich prompt | LLM meals as default | Banks default; LLM optional | FULL | Claim 9 rewritten | |
| G14 | Cover, §10.2 | Ankur Raman; AmyWorld; MIT | Entity ambiguity | No invented assignee; counsel flag | n/a | Applicant | **Yes** |
| G15 | §6.4, Claim 6b | `dateSeed(date, childName)` | “child identifier” vs name | Seed uses child **name** | FULL | 6b “including a child name” | |
| G16 | §6.12, Claim 7 | `sampleCount >= 3` | Threshold weak | Numeric 3 disclosed | FULL | Claim 7 | |
| Jain | §6.9, Claim 11 | prompt in `routines.ts`; sanitizer veg branch | Claimed sanitizer roots | Prompt-level roots; sanitizer meat/egg for Jain | PARTIAL | Claim 11 split | **Yes** |
| UAE 18:30 | §6.8, Fig 7 | `enforceUaeOutdoorHardConstraint` | Undisclosed | Disclosed as AE-only | FULL | Embodiment of 8A | |
| Fallback | §6.14, Fig 5, Claim 15 | generate-ai trust fail; emergency fallback | Omitted | Disclosed | FULL | New 15 | |
| Semaphore | §6.3 | `routine-generate-semaphore.ts` | Risk of mapping to Claim 1b | Explicitly **not** Claim 1b | n/a | none | Do not claim |
| Learning weights | §6.12 | `computeLearningWeights` | §6.10 called educational rec “future” | Disclosed as deterministic 14-day correlations; used in LLM prompt | FULL | 8D | Do not call ML training |
| 422 | §6.4, §6.11, Fig 6 | `routine_validation_failed` | Weak | HTTP 422 disclosed | FULL | Claim 6f | |
| Infant skip | §6.5 | `isExclusiveInfantPhase` age &lt; 6 | Weak | Disclosed | FULL | Embodiment | |
| Partial regen | §6.16 | `PARTIAL_REGEN_MIN_AGE_MONTHS = 36` | Omitted | Disclosed | FULL | Embodiment | |

---

## 2. Source-code traceability (material features)

| Feature | File | Function / constant | In v2 spec |
|---------|------|---------------------|------------|
| Certified order | `docs/routine-engine/v1-certified-architecture.md` | production path | §4, §6.4, Fig 2 |
| Input resolve | `artifacts/api-server/src/lib/routine-input-validation.ts` | `resolveRoutineGenerationInputs` | §6.2 |
| Rules generate | `artifacts/api-server/src/lib/routine-templates.ts` | `generateRuleBasedRoutine`, `dateSeed`, meal banks | §6.4, §6.9, Fig 4 |
| Pipeline | `artifacts/api-server/src/lib/routine-intelligence-pipeline.ts` | `runRoutineIntelligencePipeline` | §6.5 |
| Pipeline order | `artifacts/api-server/src/lib/routine-intelligence-pipeline-order.md` | steps 1–13; infant skip 5–12 | §6.5 |
| Dinner gaps | `artifacts/api-server/src/lib/routine-meal-dinner-integrity.ts` | `getMinimumDinnerSleepGap`, `repairDinnerAnchor` | §6.10, Fig 7, Claim 8B |
| Country profiles | `artifacts/api-server/src/lib/routine-country-profile.ts` | `PROFILES` US/UK/AU/NZ/AT/AE/IN | §6.8 |
| AQI caps | `artifacts/api-server/src/lib/routine-aqi.ts` | `maxOutdoorMinutesFromAqi` 0/15/20 | §6.7, Claim 8C |
| Safety choke | `artifacts/api-server/src/lib/routine-safety-gate.ts` | `enforceRoutineSafety` | §6.11, Fig 6 |
| Meal sanitizer | `artifacts/api-server/src/lib/routine-meal-options-safety.ts` | `sanitizeMealOptionsInRoutineItems` | §6.9 |
| Weather handshake | `artifacts/kidschedule/src/pages/routines/generate.tsx` | `ensureWeatherDetected`, `weatherTouchedRef`, `weatherForCall` | §6.3, Fig 3, Claims 1–5B, 13 |
| Weather map | same | `mapOpenMeteoToWeatherOutdoor` | §6.3 |
| LLM path | `artifacts/api-server/src/routes/routines.ts` | `POST /routines/generate-ai` | §6.13, Fig 5 |
| Fallback | same | trust fail → rules; emergency fallback | §6.14, Claim 15 |
| Family intel | `artifacts/api-server/src/lib/routine-family-intelligence-moat.ts` | `prepareFamilyIntelligenceInput`, `trustScoreFromSignals` | §6.12 |
| Energy | `artifacts/api-server/src/services/intelligenceAnalytics.ts` | `applyEnergyCurveToItems` | §6.12, Claim 7 |
| Learning weights | `artifacts/api-server/src/services/learningWeights.ts` | `computeLearningWeights` | §6.12 |
| Caregiver | `lib/family-routine/src/index.ts` | `simplifyForHandler` | §6.17, Claim 8 |
| UAE outdoor | `artifacts/api-server/src/lib/routine-priority-engine.ts` | `enforceUaeOutdoorHardConstraint` 18:30 | §6.8 |
| Infant exclusive | `artifacts/api-server/src/lib/routine-age-feeding.ts` | `isExclusiveInfantPhase` | §6.5 |
| Generate HTTP | `artifacts/api-server/src/routes/routines.ts` | `POST /routines/generate` | §6.1 |
| Platforms | kidschedule; `artifacts/amynest-capacitor/ios/`; `android/` | web / Capacitor / WebView | §6.1, Claims 4, 12 |

Every numeric threshold in v2 was traced before inclusion: dinner 60/90/120; energy sampleCount 3; AQI 150/200/300 and 20/15/0 minutes; weather code/temp/wind/precip cutovers; infant &lt;6 months; partial regen 36 months; UAE 18:30; IN sleep 21:30–22:30; AE sleep 21:30–23:00; US dinner 17:30–19:30; rainy outdoor 10 min.

---

## 3. Claim support matrix (v2 indicative claims)

Status vs **production code + v2 specification**.

| Claim | Status | Notes | Counsel |
|-------|--------|-------|---------|
| 1 | FULLY SUPPORTED | Dual flag, in-flight, geo, meteo, map, discard, inject | Low |
| 2 | FULLY SUPPORTED | Fail-null | Low |
| 3 | FULLY SUPPORTED | Wake-confirm re-inject | Low |
| 4 | FULLY SUPPORTED **as narrowed** | Web + iOS shell + Android WebView only | Markush / future platforms |
| 5, 5A, 5B | FULLY SUPPORTED | Method of 1 | Low |
| 6 | FULLY SUPPORTED **as rewritten** | Rules primary; pipeline not LLM; optional GAI | Independence / 3(k) |
| 7 | FULLY SUPPORTED | sampleCount ≥ 3 | Low |
| 8 | PARTIALLY → **narrowed**; now FULLY SUPPORTED to titles/templates/prompts | Not a general notes rewriter | Confirm wording |
| 8A | FULLY SUPPORTED | plus AQI/UAE as “other constraints” | Low |
| 8B | FULLY SUPPORTED | New; 60/90/120 | If engine freeze changes, update |
| 8C | FULLY SUPPORTED | New; AQI caps | Low |
| 8D | FULLY SUPPORTED | Previous-day both paths | Do not call neural net |
| 9 | FULLY SUPPORTED **as rewritten** | Banks default; LLM optional | Independence of meal claim |
| 10 | FULLY SUPPORTED | “at least” cuisines | Low |
| 11 | PARTIALLY SUPPORTED | Prompt Jain roots vs sanitizer meat/egg | **Do not overclaim sanitizer** |
| 12 | FULLY SUPPORTED **as narrowed** | Implemented pair/triple of clients | Same as 4 |
| 13 | FULLY SUPPORTED | Ref vs state | Overlap with 1a |
| 14 | FULLY SUPPORTED **as rewritten** | Candidate from rules **or** LLM | Was LLM-only |
| 15 | FULLY SUPPORTED | New; fallback | Low |

v1 Claims 4, 6c/6d, 9, 12, 14 are **not silently preserved**.

---

## 4. Figures corrected

| Figure | v1 problem | v2 |
|--------|------------|-----|
| 1 | Wearable/voice/offline as peers; LLM as architecture centre | Implemented three clients; LLM and meteo optional dashed; future dashed |
| 2 (new) | Missing certified pipeline | Rules-first linear flow |
| 3 | Was Fig 2; OK | Kept weather handshake, relabelled |
| 4 | LLM meals default | Banks primary; LLM enrich dashed |
| 5 (was 3) | AI ∥ rules co-equal; “correction of probabilistic AI” | Optional LLM → same pipeline → fallback |
| 6 (new) | Missing safety | AQI + trust + sanitizer + 422 |
| 7 (new) | Missing dinner | 60/90/120 + country + UAE 18:30 |
| 8 (new) | Missing feedback | Outcomes, energy, weights, moat |

Formal Schedule II sheets: **not produced** (P1 formality).

---

## 5. Filing-status correction

v2 cover and §10.1 state this is **not a filed application**. Placeholder date **not** replaced with an invented date. Application number: none.

**Product/marketing copy was not edited** (per task). Still unsupported until a receipt exists:

- `artifacts/kidschedule/src/i18n/en.json` — `landing.tech_patent_desc`, `patent_pending.*`, meta/badge/footer strings
- `artifacts/kidschedule/src/components/marketing/patent-pending-pill.tsx` — including `PATENT_TRUST_LINE`
- `patent-badge.tsx`; generate/index/environment/onboarding/hub/profile/social-landing; cinematic landing; command-center; spotlight-tour; `__nav_preview.html`; splash Scene6; social-assets-manifest; content-engine golden scripts; App Store listing (external)

**Separate remediation task** for founder/docs after counsel confirms filing.

---

## 6. Ownership issues remaining (unchanged facts)

- Inventor/applicant in drafts: Ankur Raman (copied, not independently verified as complete inventorship).
- Assignee: **none** in repo.
- Product brand: AmyNest / AmyWorld.
- Workspace `package.json` license field: MIT.
- No assignment deed in repo.
- **Do not assume company applicant.** Counsel + founder.

---

## 7. Unresolved issues after v2

### P0 (specification vs code)

**None identified** for the v2 technical disclosure relative to the traced production engine. Residual P0s are **process**, not missing architecture:

- This document is still **unfiled**.
- Indicative claims are not agent-finalised.
- Product UI still says “filed/pending” (out of document scope).

### P1

| ID | Issue | Owner |
|----|-------|-------|
| P1-a | IPO Schedule II drawing sheets | Patent professional / draftsman |
| P1-b | Final claim language, 3(k), independence, Markush | Patent professional |
| P1-c | Claim 11 Jain: prompt vs sanitizer | Patent professional |
| P1-d | Applicant entity / assignment / MIT notice | Legal + founder |
| P1-e | Strip or update product patent-pending copy | Founder + documentation **after** receipt or on counsel instruction |
| P1-f | Two age classifiers — claim naming | Patent professional |
| P1-g | Learning weights consumed mainly on LLM prompt — do not imply they reweight template shuffle unless later wired | Patent professional |

### P2

- Claim 1 / 5 / 13 overlap.
- Extra cuisines/diets as optional lists.
- Redis generate semaphore (explicitly excluded from invention).
- HTML pagination vs Form 2 print layout.

---

## POST-REVISION CERTIFICATION

Performed against production code, `docs/routine-engine/v1-certified-architecture.md`, v2 HTML, and prior audit/remediation plans. Not a legal patentability opinion. Prior-art search not performed.

| Gate | Score /100 | Notes |
|------|------------|-------|
| 1. Technical implementation accuracy | 92 | Engine described as implemented; Jain sanitizer/prompt split called out |
| 2. Code ↔ specification alignment | 90 | Primacy, pipeline, dinner, AQI, platforms corrected |
| 3. Code ↔ claims alignment | 82 | Indicative claims rewritten; counsel must finalise; Claim 11 still split |
| 4. AI/LLM architecture accuracy | 93 | Optional + same pipeline + fallback; not core generator |
| 5. Safety accuracy | 88 | Two stacks distinguished; no “AI makes it safe” |
| 6. Personalization disclosure | 85 | Signals, energy ≥3, moat, weights; not neural net |
| 7. Figure accuracy | 86 | Eight figures match architecture; not Schedule II |
| 8. Terminology accuracy | 90 | Pipeline ≠ LLM; glossary in §6 intro |
| 9. Ownership accuracy | 70 | No invented assignee; ambiguity flagged, not resolved |
| 10. Filing-status accuracy | 95 | Draft explicitly unfiled; product copy still stale **outside this file** |

**Overall technical readiness of v2 disclosure: 88 / 100**

P0 (spec↔code): **0**  
P1: **7**  
P2: **4**

### Classification of readiness (do not conflate)

| Kind | Status |
|------|--------|
| **Technical readiness** | **TECHNICAL DRAFT READY FOR REGISTERED PATENT PROFESSIONAL / PATENT COUNSEL REVIEW** |
| **Claim / legal readiness** | **NOT READY** — indicative claims only; 3(k), inventorship, assignment, Schedule II |
| **Filing readiness** | **NOT READY** — not filed; no application number; do not say patent pending from this repo |

**Do not declare “ready to file.”**

### Known remaining contradictions

- Product UI vs v2 cover on filing status (product not edited).
- v1 HTML still exists and still contains the old LLM-first narrative — **do not file v1**.
- Heuristic `trustScore` is not a statistical confidence interval; spec says so.

### Why P0 (spec↔code) is 0

v2 no longer states that an LLM is the primary generator, no longer states wearable/voice/offline generation is realised, discloses dinner gaps, AQI caps, country profiles, pipeline order, fallback, and implemented clients. Remaining issues are counsel/formality/ownership/product-copy — P1, not specification-to-code falsehoods.
