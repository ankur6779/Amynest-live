# Section 10 proposed claim support matrix

**Application:** Indian Patent Application No. 202611059355  
**CBR:** 29076 · **Priority date:** 10 May 2026  
**Filed specification:** Provisional Form 2 (37 pages) — *AmyNest — Indian Provisional Patent Application.pdf*  
**This matrix is not a legally final claim set and is not a patentability opinion.**

Claim numbers below are those of `patent/amynest_section10_complete_specification_draft.html` (proposed Complete Specification), not the provisional’s indicative numbering.

Priority ratings: **STRONG** / **MODERATE** / **WEAK** / **UNSUPPORTED**.

3(k) and prior-art columns are **flags for counsel**, not conclusions. No prior-art search was performed.

---

## Family A — Environmental synchronisation (lead family)

| Claim | Feature | Form 2 support | Production source | Supported? | Priority | Potential 3(k) concern? | Potential prior-art concern? | Needs narrowing? | Counsel action |
|-------|---------|----------------|-------------------|------------|----------|-------------------------|------------------------------|-------------------|----------------|
| **1 (I)** | Dual-state preference flag; in-flight registry; geo; meteo; 3-way classification; late discard; direct payload injection | §4 2nd/3rd aspects; §6.2; Fig. 2; prov. Claim 1 | `artifacts/kidschedule/src/pages/routines/generate.tsx` — `weatherTouched` / `weatherTouchedRef` / `weatherDetectInFlightRef` / `ensureWeatherDetected` / `weatherForCall` | YES | **STRONG** | Argue technical effect on async UI/network coordination, not a business method alone | Weather+calendar apps exist; dual-state + in-flight + late-discard + payload-inject protocol may differentiate — **search not done** | No | Lead independent claim |
| **2** | Silent fail → null; proceed with existing/default | §6.2.5; prov. Claim 2 | same; catch/timeout/deny | YES | **STRONG** | Low | Common pattern | No | Keep |
| **3** | Pending-action re-inject across confirmation dialog | §6.2.4 last para; prov. Claim 3 | `pendingAction.weatherForCall` + wake confirm | YES | **STRONG** | Low | UI dialog patterns | No | Keep |
| **4** | Web + native mobile only; functionally identical classification | Prov. Claim 4 “two or more selected from” *includes* web and native; §6.9 | Web; iOS Capacitor web; Android WebView | YES for selected two | **STRONG** for recited platforms | Platform claim breadth | Crowded | **Yes vs filed list** — wearable/voice/offline omitted deliberately | Confirm omission vs restoring “selected from” longer list as alternatives |
| **5 (I)** | Method of Claim 1 protocol | §6.2; prov. Claim 5 | `ensureWeatherDetected` | YES | **STRONG** | Same as 1 | Same as 1 | Antecedent of “the derived classification” in 5(e) | Optional clarity amendment |
| **6** | Shared in-flight = one detection | §6.2.2; prov. 5A | `weatherDetectInFlightRef` | YES | **STRONG** | Duplicate-request suppression is a technical network effect | Deduping fetches is known | No | Keep |
| **7** | Direct payload injection bypassing deferred state | §6.2.4; prov. 5B | `weatherForCall` argument, not waiting for `setWeatherOutdoor` commit | YES | **STRONG** | Stale-state / UI sync | Frontend patterns | No | Keep |
| **18 (I)** | Dual-structure async coordination method | §6.2.1; prov. Claim 13 | same refs | YES | **STRONG** (may be abstract as standalone) | High 3(k) / mental-act risk if isolated | Async UI state is ubiquitous | **Yes** — consider depending from Claim 5 | Agent: independent vs dependent |

---

## Family B — Adaptive generation / age / hybrid engine

| Claim | Feature | Form 2 support | Production source | Supported? | Priority | Potential 3(k)? | Potential prior-art? | Needs narrowing? | Counsel action |
|-------|---------|----------------|-------------------|------------|----------|-----------------|----------------------|-------------------|----------------|
| **8 (I)** | Age bands; date-seeded shuffle; hybrid rules **and** GAI; constraint processing on artefact (wake anchor + school-block) | §6.3, §6.4, Fig. 3 | `generateRuleBasedRoutine`; `POST /routines/generate-ai`; school-block / wake cascade in pipeline | YES as hybrid | **MODERATE–STRONG** | Algorithm / software per se; scheduling | Child schedulers, LLM planners | **Yes** — Claim 8(d) does not require GAI output (shift from prov. 6(d)). Fig. 3 “both paths” is the support theory | Confirm claim-shift vs restore “operative on GAI outputs” |
| **9** | Energy-profile reorder when min samples exist | §6.4.4; prov. 7 | `applyEnergyCurveToItems` (`sampleCount < 3` no-op) | YES | **STRONG** (do not recite “3”) | Heuristic | Circadian/energy scheduling | Recite “predetermined minimum”, not 3 | Keep |
| **12** | Allergy, cuisine registry, cross-slot dedup on Claim 8 artefact | §6.4.3 | meal safety / dedup on AI path; banks/templates on rules path | PARTIAL on rules path | **STRONG** as to GAI artefacts; **MODERATE** if applied to banks | Same as 8 | Recipe filters | Optional | If Claim 8 stays path-agnostic, confirm enablement for template meals |
| **13** | Anti-repetition prompt and/or post-check | §6.4.3; prov. 6(e) | `previousDayContext` in prompts + pipeline | YES | **STRONG** / P1 for “and/or post-processing” | Low | Variety rules | No | Keep |

---

## Family C — Deterministic correction of probabilistic outputs

| Claim | Feature | Form 2 support | Production source | Supported? | Priority | Potential 3(k)? | Potential prior-art? | Needs narrowing? | Counsel action |
|-------|---------|----------------|-------------------|------------|----------|-----------------|----------------------|-------------------|----------------|
| **19 (I)** | Receive LM output; temporal anchor; school-block; allergy; cuisine; dedup; return artefact | §6.4.3; prov. Claim 14 | `POST /routines/generate-ai` then pipeline / validators | YES on AI path | **STRONG** | Deterministic post-processing of LM output may be argued as technical control of a probabilistic component | LLM+guardrail pipelines are crowded | Do **not** change (a) to “rule-based artefact” without direction | Keep as LLM-specific family as filed |
| **20** | Then environmental substitution | §6.5; prov. 15 | weather transforms | YES | **STRONG** | Combined with 19 | Outdoor/indoor swap apps | No | Keep |
| **11** | Unsuitable→indoor table; limited→shorter+note; suitable→passthrough | §6.5; prov. 8A | UI `yes/limited/no` mapped to same three classes | YES | **STRONG** | Lookup-table substitution | Weather activity apps | Map UI tokens in spec only | Keep |

---

## Family D — Caregiver-adaptive transformation

| Claim | Feature | Form 2 support | Production source | Supported? | Priority | Potential 3(k)? | Potential prior-art? | Needs narrowing? | Counsel action |
|-------|---------|----------------|-------------------|------------|----------|-----------------|----------------------|-------------------|----------------|
| **10** | Caregiver identity → adapt instruction text and/or activity selection | §6.6; prov. 8 | `simplifyForHandler` title prefixes; template bonding density; LM caregiver prompts | PARTIAL vs “rewrite notes” | **MODERATE** | Presentation / content | Role-based UI copy | **Yes** — already narrowed vs provisional | Do not claim a general NL rewriter |

---

## Family E — Meal-option enrichment

| Claim | Feature | Form 2 support | Production source | Supported? | Priority | Potential 3(k)? | Potential prior-art? | Needs narrowing? | Counsel action |
|-------|---------|----------------|-------------------|------------|----------|-----------------|----------------------|-------------------|----------------|
| **14 (I)** | Slot anchor; inventory; constrained LM prompt; dedup; sanitise inventory wording | §6.7; Fig. 4; prov. 9 | Optional AI meal enrich; **not** production default | YES as optional method | **STRONG** as filed optional path | Prompt engineering | Recipe LM apps | Do not claim “exactly N=4”; do not claim this is the default | Keep as optional family; do not lead the application with it |
| **15** | Rule-based path inserts meal anchors from template pools | §6.4.1 | `generateRuleBasedRoutine` meal banks/templates | YES as templates | **MODERATE / P1** | Algorithm | Meal planners | Do not claim later catalogues or “banks are default” | OK as dependent; not a P2 default-status claim |
| **16** | Cuisine set at least N/S Indian, Bengali, Western, Asian, Pan-Indian | Prov. 10; §6.7 | routines meal guidance | YES | **STRONG** | Low | Regional cuisine lists | “At least” is correct | Keep |
| **17** | Jain: prompt excludes meat/fish/egg + roots + onion/garlic | Prov. 11; Fig. 4 | Prompt in `routes/routines.ts`; sanitizer Jain branch = meat/egg only (`routine-meal-options-safety.ts`) | YES as **prompt**; NO as deterministic root engine | **STRONG** prompt / **UNSUPPORTED** if rewritten as sanitizer | Content filtering | Dietary rules | **Yes** — keep “constrains the prompt” | **P1** — do not claim a Jain root parser |

---

## Deliberately omitted (do not treat as forgotten)

| Omitted concept | Why omitted from priority claims | If counsel wants it |
|-----------------|----------------------------------|---------------------|
| Provisional Claim 12 (functional identity across wearable/voice/offline + meal engine + correction) | Mixes families; present-tense unimplemented platforms | Narrowed overlap is Claim 4 |
| Dinner gaps 60/90/120 | **P2** — June 2026 freeze, absent from Form 2 | Non-priority embodiment or later filing |
| AQI 0/15/20 | **P2** | Same |
| LLM→rules fallback independent claim | Form 2 silent-fail is weather-only | P2 / agent direction |
| HTTP 422 refuse | Not in Form 2 | P2 |
| Vendor / GPT-4o-mini | Form 2 is provider-agnostic (correctly) | Never add |
| CRM / computer-readable medium | Not requested as mandatory; Indian practice varies | Agent to add if appropriate |

---

## Antecedent-basis / clarity notes (not legal conclusions)

- Claim 5(e) “the derived classification” — add “if derived” if examiner objects.
- Claim 8 “or from both in combination” — clarify whether sequential (LM then rules) is intended; production AI path is LM draft then deterministic pipeline, which is combination **P1**.
- Claim 14(c) “a predetermined number” — do not lock to four.
- Claim 17 must not pick up sanitizer roots that do not exist in code or in a deterministic engine in Form 2.

---

## Mapping: provisional indicative claims → this draft

| Provisional | This draft | Change |
|-------------|------------|--------|
| 1, 2, 3 | 1, 2, 3 | Substantively retained |
| 4 | 4 | Narrowed to web + native mobile |
| 5, 5A, 5B | 5, 6, 7 | Retained |
| 6 | 8 (+12, 13) | Hybrid retained; correction not forced to GAI-only in independent (agent must confirm) |
| 7 | 9 | Retained; no numeric sample count |
| 8 | 10 | Narrowed transformation language |
| 8A | 11 | Retained |
| 9 | 14 | Optional enrichment; dropped mandatory “exactly N validation” step as essential |
| 10, 11 | 16, 17 | Retained; 17 flagged prompt-only |
| 12 | *omitted as independent* | Overbreadth / unimplemented platforms |
| 13 | 18 | Retained; consider depending from 5 |
| 14, 15 | 19, 20 | Retained as LLM-output family |
| — | 15 | New dependent from §6.4.1 template meals — P1 |
| v2 8B, 8C, 8D, 15-fallback | **not used** | P2 new-matter risk |
