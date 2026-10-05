# Filed vs current vs proposed — claim / disclosure traceability

**Application:** Indian Patent Application No. 202611059355  
**CBR:** 29076 (10 May 2026)  
**This file is not a legally final claim set.**

**FILED DOCUMENT NOT LOCALLY AVAILABLE.** Column A uses: (i) CBR title; (ii) nearest repo draft `patent/amynest_patent_package.html` (8 May 2026, same title as CBR); (iii) Downloads Chrome PDF only where it differs. **Do not treat Column A as the IPO upload until counsel downloads Form 2.**

Legend for filing-date relevance:

| Code | Meaning |
|------|---------|
| IN-FILING | Described in 8 May repo HTML (likely nearest filed spec) |
| IMPL-LATER | Implemented in production; **weak or absent** in 8 May HTML — complete-spec / amendment / new-matter strategy for counsel |
| FILED-STALE | In 8 May HTML or Downloads PDF; **not** current production |
| BOTH | In nearest filing draft and still implemented |
| COUNSEL | Legal decision |

---

## A. Independent / key claims

| Claim | A. Filed / nearest 8 May HTML | B. Current implementation | C. v2 / this draft concept | D. Proposed final concept for counsel | E. Source-code evidence | F. Filing-date relevance | G. Counsel |
|-------|-------------------------------|---------------------------|----------------------------|----------------------------------------|-------------------------|--------------------------|------------|
| 1 | Dual sentinel, in-flight Promise, geo, meteo, discard, inject | Same in `generate.tsx` | Same | Keep; map yes/limited/no ↔ suitable/limited/unsuitable | `ensureWeatherDetected` | BOTH | Low |
| 2 | Fail-null | Yes | Yes | Keep | same | BOTH | Low |
| 3 | Wake-confirm re-inject | Yes `weatherForCall` | Yes | Keep | `pendingAction` | BOTH | Low |
| 4 | v1 HTML: web, native, **wearable, voice, offline** as selectable | Web + iOS Capacitor web + Android WebView only | Narrowed to implemented three | **Narrow** to implemented clients; prophetic others | shells + kidschedule | FILED-STALE on wearable/voice/offline | **Needs narrowing** |
| 5 / 5A / 5B | Method of 1 | Yes | Yes | Keep | generate.tsx | BOTH | Low |
| 6c hybrid | GAI + rules **co-equal**; AI path named | Rules-first certified; AI alternate | Rules primary + optional LLM | **Do not require LLM** | `POST /routines/generate` vs `generate-ai` | FILED-STALE primacy; BOTH paths exist | **3(k) + independence** |
| 6d correction | Operative on **GAI outputs** | Pipeline on **rule** output too | Pipeline on any candidate | Correction/pipeline independent of LLM | `runRoutineIntelligencePipeline` | IMPL-LATER as primary story; BOTH as machinery | **Rewrite vs filed 6d** |
| 6e anti-repeat | Into **GAI prompt** | Prompt (AI) + pipeline (rules) | Both | Disclose both; don’t require prompt | `previousDayContext` | PARTIAL IN-FILING | Narrow/split |
| 7 energy | Historical peak/low | `applyEnergyCurveToItems` sampleCount≥3 | Same + numeric 3 | Keep | intelligenceAnalytics.ts | BOTH | Low |
| 8 caregiver | Rewrite **instruction notes** | Title prefix `simplifyForHandler` + templates + AI prompts | Narrowed | Don’t claim general notes rewriter | family-routine | PARTIAL | **Needs narrowing** |
| 8A weather subst. | unsuitable/limited/suitable | yes/no/limited | Mapped | Keep with mapping | weather transforms | BOTH | Low |
| 8B dinner gaps | **Absent** from 8 May HTML | 60/90/120 certified June 2026 | New claim concept | Enablement for complete spec | `getMinimumDinnerSleepGap` | **IMPL-LATER** (engine freeze June 2026 **after** 10 May filing) | **New matter / priority** |
| 8C AQI caps | **Absent** | 0 / 15 / 20 min | New | Complete spec candidate | `maxOutdoorMinutesFromAqi` | **IMPL-LATER** | Same |
| 8D previous-day | Prompt-centric in v1 | Pipeline + prompt | Both | Keep dual | routines.ts + pipeline | PARTIAL | |
| 9 meals | LLM exactly-N options as **the method** | **Banks default**; LLM enrich optional | Banks + optional LLM | Don’t make LLM mandatory | `generateRuleBasedRoutine` meal banks | FILED-STALE default | **Needs narrowing** |
| 10 cuisines | At least N/S/Bengali/Western/Asian/Pan-Indian | Those + more | Keep “at least” | Keep | routines.ts | BOTH | Low |
| 11 Jain | Prompt: no roots/onion/garlic | Prompt: yes; sanitizer: meat/egg with veg branch | Split disclosure | **Do not claim deterministic root parser** | `routines.ts` prompt; `routine-meal-options-safety.ts` | PARTIAL | **P1** |
| 12 platforms | Wearable/voice/offline list | Three web shells | Narrowed | Narrow | android/ + capacitor | FILED-STALE extras | **Needs narrowing** |
| 13 dual state | Yes | Yes | Yes | Keep | weatherTouchedRef | BOTH | Low |
| 14 LLM correction method | Step (a) **receive LLM output** | Valid only on AI path | Candidate from rules **or** LLM | Don’t require LLM as step (a) | generate-ai vs generate | FILED-STALE as production method | **Needs rewrite** |
| 15 fallback | Not in v1 claims | AI fail → rules | New 15 | Complete-spec candidate | generate-ai trust fail | **IMPL-LATER as claim** (behavior may pre-exist; not in v1 claims) | Counsel |
| — OpenAI GPT-4o-mini | Named in **Downloads PDF** / early HTML | `runOpenAiJsonChat` helper; vendor not essential | Substitutable | **Do not claim vendor** | routines-ai | FILED-STALE if named in upload | Strip vendor |
| — Expo mobile | Named in Downloads PDF | Not production Android | Not claimed as implemented | Alternative/historical | archive Expo | FILED-STALE if in upload | |

---

## B. Architecture features (not only claim numbers)

| Feature | A Filed/nearest HTML | B Production | C v2/final draft | D Proposed wording | E Evidence | F Relevance | G Counsel |
|---------|----------------------|--------------|------------------|--------------------|------------|-------------|-----------|
| Rules-first certified path | Described as **a** path, not primary | Primary `POST /routines/generate` | Primary | Lead with rules-first | certified architecture June 2026 | IMPL-LATER **primacy** (certification **after** filing) | Amendment strategy |
| Deterministic pipeline order | “Correction of LLM” | 13-pass software pipeline | Full order | Name software pipeline | pipeline-order.md | IMPL-LATER detail | New matter risk on *ordered* passes |
| Dinner 60/90/120 | Not in 8 May HTML | Frozen June 2026 | Disclosed | Complete spec | dinner-integrity.ts | **IMPL-LATER** | High |
| Country profiles US/UK/AU/NZ/AT/AE/IN | Not as tables | Yes | Yes | Examples not medical advice | country-profile.ts | IMPL-LATER tables | |
| AQI 0/15/20 | No | Yes | Yes | Distinct from weather | routine-aqi.ts | IMPL-LATER | |
| Family moat / trustScore | No | Heuristic 0–100 | Yes | Not neural net | family-intelligence-moat.ts | IMPL-LATER | |
| Meal banks default | Under-disclosed; AI 4-option emphasised | Banks default | Corrected | Banks default | routine-templates.ts | FILED-STALE emphasis | |
| LLM fallback to rules | Weak | Yes | Claim 15 | Disclose | generate-ai | IMPL-LATER as claim | |
| Wearable/voice/offline **is realised** | Present tense in 8 May HTML | NOT FOUND | Future only | Prophetic | — | FILED-STALE | Limit claims 4/12 |
| Infant skip &lt;6 mo | Weak | Yes | Yes | Embodiment | isExclusiveInfantPhase | IMPL-LATER detail | |
| HTTP 422 refuse | Weak | Yes | Yes | Keep | routes | IMPL-LATER explicit | |
| Two age classifiers | One “engine” | Generate: &lt;12/36/60/120; Safety lib: &lt;18/36/60/132 | Flagged | Don’t merge | age-groups vs classifyAgeBand | BOTH exist; **thresholds differ** | **P1** |
| Learning weights | Educational rec as future in later HTML | 14-day correlations → **LLM prompt** | Prompt-level | Say prompt-level | learningWeights.ts | IMPL-LATER | Don’t call ML training |

---

## C. Section 3(k) / prior-art (technical flags only — no legal conclusion)

| Theme | Potential 3(k) concern? | Potential prior-art concern? | Counsel action |
|-------|-------------------------|------------------------------|----------------|
| Concurrent-safe weather handshake (shared Promise, dual flag, late discard, payload inject) | Argue technical effect on async UI/network, not business method alone | Calendar+weather apps exist; **specific dual-state protocol** may differentiate | Prior-art search **not performed** |
| Rules+pipeline+refuse-invalid | Algorithm / software per se risk | Scheduling engines exist | Frame as constrained control of a delivered artefact |
| Dinner-gap numbers | Medical/parenting advice vs technical geometry | Pediatric feeding timing is public knowledge; **machine-enforced repair + 422** is the system | Don’t claim the minutes as a medical invention |
| Optional LLM | Mere use of LLM | Generative scheduling is crowded | Keep LLM **out** of independent generation claim |
| AQI outdoor caps | Policy table | AQI apps exist | Combine with routine constraint engine |
| Age bands | Mental act / scheme | Standard child-dev bins | Tie to template selection in a computer system |

**Do not state “novel” or “no prior art exists.” Prior-art search not performed.**

---

## D. Age-classifier discrepancy (P1)

| Classifier | File | Thresholds | Used on |
|------------|------|------------|---------|
| Generate `AgeGroup` | `routes/routines.ts` / `age-groups.ts` | infant &lt;12; toddler &lt;36; preschool &lt;60; early_school &lt;120; else pre_teen | Certified generate path |
| Feeding `getAgeGroup` | `routine-age-feeding.ts` | &lt;6; &lt;12; &lt;36; else child | Meals/infant path |
| `classifyAgeBand` | `lib/safety/src/engine.ts` | infant &lt;18; toddler &lt;36; preschool &lt;60; school &lt;132; tween | Advisory `validateRoutine` — **not** generate choke |

**P1 — COUNSEL / TECHNICAL RECONCILIATION REQUIRED** before claiming a single “age-band classification engine.”

---

## E. Jain / diet (P1)

| Layer | What is encoded |
|-------|-----------------|
| A Prompt | Jain: no meat/fish/eggs **and** no onion/garlic/root vegetables (`routes.ts` diet constraint; also `meals.ts`) |
| B Sanitizer | Jain shares **vegetarian** meat/fish/egg exclusion; **not** a dedicated root-vegetable regex |
| C Other | Vegan, eggetarian, pescatarian, gluten, high-protein rules exist in sanitizer |
| D Outside prompt | No separate “Jain engine” class |

Claims must not allege a deterministic Jain root-vegetable filter unless later implemented.
