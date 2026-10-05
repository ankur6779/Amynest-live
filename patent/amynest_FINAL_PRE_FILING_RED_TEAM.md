# AmyNest — Final pre-filing red-team audit

**Indian Patent Application No. 202611059355**  
**Provisional filing date: 10 May 2026**  
**Working draft audited:** `patent/amynest_FINAL_COMPLETE_SPECIFICATION.html` (as revised in this pass for Claim 1 overstatement, Claim 17/18 mix-up, abstract effect language, and priority-date wording)

---

STATUS:  
**NOT LEGAL ADVICE**  
**NOT A PATENTABILITY CERTIFICATION**  
**NO FORMAL PRIOR-ART SEARCH PERFORMED**

This document is a hostile examination-style review of the current complete-specification package. It does not grant, allow, or clear the application for IPO filing.

Priority classes used here:

- **A** — fairly supported by the 10 May 2026 provisional; 10 May date is defensible if claimed as originally disclosed.  
- **B** — may appear in the complete specification as a development/current embodiment, but **not entitled to the 10 May 2026 date** unless counsel finds fair basis in the provisional.  
- **C** — unsupported / new matter relative to the provisional; **should not be claimed** (and if described, must not be dressed as original disclosure).

Do **not** read B as “cannot appear in the complete specification.”

---

## 1. Executive Verdict

Claim 1, read **as written**, is a computer-implemented **system combination** for:

1. dual-structure explicit environmental-preference state;  
2. at-most-one shared in-flight environmental detection;  
3. geolocation + remote meteorological retrieval;  
4. mapping to a fixed outdoor-suitability class set;  
5. post-resolution re-read of the synchronously readable structure;  
6. discard of a late-derived class if the user touched the control during the window;  
7. threading the derived **or** preserved class into the routine-generation call chain **before** a UI synchronisation cycle.

**Claim 1 does not require** pending-action continuity (that is **Claim 3**).  
**Claim 1 does not require** permission-gated I/O, permission denial handling, or silent-fail/null (that is **Claim 2**).  
**Claim 1 does not require** the named classes “suitable / limited / unsuitable” (that is **Claim 4**).  
**Claim 1 does not recite** “reducing UI synchronisation latency” (removed from 1(g); still a residual risk in older commentary).

Earlier package commentary (previous red-team §A/B/F) **overstated Claim 1** by importing Claim 3 pending-action and “permission-gated I/O.” That overstatement is **WEAK advocacy** and would be destroyed in opposition. This audit does not repeat it as a Claim 1 limitation.

**Overall character of the application:** technically the strongest filed mechanism is the environmental-consistency protocol. Legally, the entire claim set remains **software implemented on conventional computers**. Under the Indian CRI framework, Claim 1 is the least-bad 3(k) candidate and is still **3(k)-vulnerable**. Claims 10, 19, 21, and 24 are easier 3(k) / inventive-step targets (planner, LLM wrapper, dual-state abstraction).

**Gate:** the technical package is **READY FOR PATENT AGENT REVIEW**, not ready to file, not examined, not granted.

| Score | /100 |
|-------|------|
| Overall examination-survival quality of this draft | **71** |
| Claim 1 (as written, combination) | **68** |
| Section 3(k) preparedness | **48** |
| Inventive-step preparedness | **42** |
| Formal filing readiness | **38** |

Scores are conservative. They are **not** patentability percentages.

---

## 2. What Is Actually Strong

1. **Written description of the environmental protocol** in Form 2 §6.2 (pp. 10–13/37) and provisional Claims 1 and 5 is detailed: dual state, registry, late discard, payload injection. That is the best-enabled technical story.  
2. **Claim 1 as a combination** is harder to dismiss than weather-mapping alone (Claim 4) or “two pieces of state” alone (Claim 24).  
3. **Honest hybrid generation:** Claim 10(d) still operates on GAI output, matching provisional Claim 6(d)/14, not a back-dated “rules-first certified pipeline.”  
4. **Jain Claim 23** is correctly limited to **prompt constraint**. Production sanitizer does **not** implement Jain root/onion/garlic rules (see §8 below).  
5. **Later production numbers** (dinner 60/90/120, AQI 0/15/20, etc.) are not in the 24 claims.  
6. **Antecedent repair** in Claim 1(f) (“a classification derived…”) and Claim 7(e)–(f) is better than the prior Section 10 draft.  
7. **Figure 3** keeping two filed paths rather than June 2026 production order is the correct priority discipline.

What is **not** strong: Section 3(k), inventive step (no search), formalities, Claim 18, Claim 24 as independent, LLM families as lead claims.

---

## 3. Claim 1 Deep Red-Team

### 3.1 What Claim 1 actually claims (word-by-word)

Preamble: “A computer-implemented computational orchestration system for adaptive routine generation, comprising:”

| Element | Text (compressed) | In provisional Claim 1? | Notes |
|---------|-------------------|-------------------------|--------|
| 1(a) | Explicit user-preference preservation **state flag** = synchronously readable data structure **and** deferred component-state data structure in an asynchronous state-management layer; **both** transitioned to a **touched** state upon explicit user engagement with an **environmental selection control** | YES (prov. 1(a)) | Dual-structure is claimed, not a single flag. “Touched” and “environmental selection control” are UI-idiom words. |
| 1(b) | Registry of pending asynchronous operations; **at most one** active environmental detection; concurrent routine-generation triggers **share** that operation; “providing duplicate request suppression” | YES (prov. 1(b)) | Concurrent-operation suppression **is** a Claim 1 limitation. Result-clause “providing duplicate request suppression” is effect language, not extra structure. |
| 1(c) | Geolocation interface; platform-provided geolocation provider; **configurable timeout** | YES (prov. 1(c)) | Timeout is claimed. **Permission** is not. |
| 1(d) | Environmental data interface; remote meteorological service; **at least one of** weather-condition code, temperature, precipitation, wind | YES (prov. 1(d)) | “At least one of” is broad: a temperature-only embodiment literally infringes. |
| 1(e) | Ambient-condition classification module maps received parameters to **one of a fixed set** of outdoor-suitability classifications | YES (prov. 1(e)) | The three names suitable/limited/unsuitable are **not** in Claim 1. |
| 1(f) | After the asynchronous detection **resolves**, re-evaluate the **synchronously readable** structure; if the flag **transitioned to touched during the asynchronous resolution window**, **discard** a classification derived from the detection and **return a user-selected value** | YES (prov. 1(f)) | Skip-if-already-touched **at invocation** is **not** explicit in Claim 1 (it is Claim 7(c)). Claim 1(f) is late-window discard. |
| 1(g) | Direct payload injection module **threads the derived or preserved classification as a parameter through a routine-generation call chain prior to a user-interface synchronisation cycle** | YES (prov. 1(g) structure) | Provisional 1(g) also said “thereby reducing user-interface synchronisation latency.” That **latency slogan is not in current 1(g)**. “Preserved” has weak antecedent (means the user-selected value from (f)). |

**Not Claim 1:** pending-action / wake-confirm continuity; permission denial; silent fail; atomic dual update; web/native platforms; LLM; dinner/AQI; named 3-way classes.

### 3.2 Nine questions

**1. Narrowest defensible inventive concept**  
A coordinated computational protocol in which: concurrent routine-generation triggers share at most one environmental-detection operation; an asynchronously derived outdoor-suitability classification is revalidated against an explicit user environmental-preference state stored in a synchronously readable structure; a late user change causes discard of the derived class; and the resulting derived-or-user-selected class is supplied as a parameter into the generation call chain without waiting for deferred UI state to commit.

**2. Actual technical problem**  
Inconsistent environmental input to a generation request when (i) concurrent triggers would start duplicate geolocation/meteorological operations, (ii) deferred UI state inside an asynchronous closure may not hold the latest preference, and (iii) a late-resolving detection would otherwise become the generation input after the user has explicitly chosen a different environmental value.

**3. Technical effect (defensible — no benchmarks)**  
- Duplicate environmental-detection operations are suppressed for concurrent generation triggers.  
- A late-derived classification is prevented from superseding an explicit user-selected environmental value.  
- The authoritative classification is available to downstream generation independently of deferred UI commit.

**Not defensible as Claim 1 effect:** “reduces UI synchronisation latency” (not in Claim 1; no measurements). “Permission-gated I/O control” (not in Claim 1). “Pending-action continuity across a dialog” (Claim 3).

**4. Which limitations cooperate to produce that effect**  
**(b)** concurrent suppression; **(a)+(f)** authoritative explicit user state vs late derived class; **(c)+(d)+(e)** produce the derived class from geo/meteo; **(g)** propagates derived-or-preserved class into the generation call chain before UI sync.  
If (b) or (g) is ignored, the claim collapses toward “ignore old async result if user changed preference.”

**5. Why this is more than generic frontend state management**  
Generic “two pieces of state” is Claim 24, not Claim 1. Claim 1 requires those structures to **gate an environmental-detection result** that is **coalesced across concurrent generation triggers** and then **injected as generation-call-chain input** before UI commit. The technical relationship is: *authoritative user environmental state controls whether an asynchronously derived outdoor-suitability class may enter downstream generation.*  
**Caveat (honest):** a skilled frontend engineer will still call (a)+(b) “ref + in-flight Promise.” That is the core 3(k)/obviousness collision. Distinctiveness, if any, is the **downstream coupling to a generation payload**, not the dual-state pattern in isolation.

**6. Strongest likely Section 3(k) objection**  
Computer program per se / algorithm: the claim recites data structures, a registry, a mapping function, and a UI synchronisation cycle on a general-purpose computer. No control of a technical process outside information handling. CRI analysis: no technical contribution beyond ordinary computer operation (state flags, request coalescing, conditional assignment). “Adaptive routine generation” in the preamble is a business/parenting purpose, which **hurts** 3(k) (computer program + business method).

**7. Strongest likely inventive-step objection**  
**NO FORMAL PRIOR-ART SEARCH PERFORMED.** Conceptually: combine (i) known weather/outdoor-suitability fetch, (ii) known single-flight/request coalescing, (iii) known “ignore stale async response if user has since changed the control,” (iv) known “pass a parameter into an API call rather than waiting for re-render.” The dual-structure is a common stale-closure workaround. The generation-payload coupling may be argued as an obvious application of that workaround to a scheduler.

**8. Wording that makes Claim 1 look like a mere software/UI workflow**  
- “asynchronous state-management layer”  
- “deferred component-state data structure”  
- “touched state” / “environmental selection control”  
- “user-interface synchronisation cycle”  
- preamble “adaptive routine generation” (parenting/business flavour)  
- 1(b) “providing duplicate request suppression” (result language)

**9. Wording already supported by the provisional that could clarify the technical relationship without new matter**  
From Form 2 §6.2.1 and §6.2.4 (not new):

- Identify the synchronously readable structure as **authoritative within an asynchronous closure** (Form 2 §6.2.1).  
- Tie 1(f) discard **to the value that 1(g) injects** (the discarded derived class is not the injected parameter).  
- Prefer Form 2’s enablement reason for injection: the classification reaches the orchestration engine **even where the frontend has not yet committed corresponding state** — **not** “latency.”  
- Do **not** add hardware, permission APIs, or pending-action into Claim 1 to “fix” 3(k).

### 3.3 Three tests

**TEST A — TOO NARROW: CONDITIONAL FAIL**  
A competitor can implement the same principle with one authoritative store (no dual structure), a mutex/lock instead of a “registry,” or a different UI framework, and argue non-infringement of 1(a)/1(b) form. Dual-state is partly React-shaped. **Risk: design-around by renaming storage.**  
**Counsel:** consider a dependent that the two structures are one embodiment, and keep 1(a) but do not let the whole case rest on “ref + useState.”

**TEST B — TOO ABSTRACT: CONDITIONAL FAIL under 3(k) stripping**  
An examiner applying 3(k) often ignores “non-technical” context and reduces the claim to: *if the user changes a preference, ignore an old async result; also don’t start two fetches.* Elements (c)–(e) and “routine-generation call chain” may be treated as insignificant post-solution activity (get weather, then schedule). The combination is the only answer; it is not a complete answer.

**TEST C — TECHNICAL RELATIONSHIP: PASS as a combination claim**  
Claim 1 **does** require, together:  
- authoritative explicit user state (a, f);  
- deferred asynchronous environmental result (b, d, e, f);  
- concurrent-operation suppression (b);  
- late-resolution revalidation (f);  
- stale-result discard (f);  
- direct downstream payload propagation before UI synchronisation (g).  

Pending-action is **not** part of this Test C for Claim 1.

**Claim 1 score 68/100:** combination is real and enabled; 3(k) and obviousness remain open; 1(a) dual-structure is a design-around magnet; preamble is unhelpful.

---

## 4. Section 3(k) Analysis

**Framework (not a case-by-case opinion):** Patents Act, 1970, s.3(k) (computer program per se, algorithm, business method). CGPDTM CRI Guidelines: look for a **technical problem**, **technical solution**, and **technical contribution / technical effect** beyond a computer program as such. Indian jurisprudence has required more than a business result implemented in software. This audit **does not** apply named holdings as if they decide this file, and **does not** conclude that 3(k) is overcome.

| Question | Conservative answer for Claim 1 |
|----------|----------------------------------|
| Technical problem? | Yes, if framed as inconsistent generation-input under concurrent async I/O — **not** “better parenting.” |
| Technical solution? | Software protocol on a conventional client. No special hardware. |
| Technical effect? | Consistency of the generation input; suppression of duplicate detections. **Not** latency numbers. **Not** a physical process. |
| Contribution beyond ordinary computer operation? | **OPEN / WEAK.** Request coalescing and stale-response ignore are ordinary. Coupling to a generation payload is the only arguable extra, and may still be “use of a computer.” |

**3(k) score: 48/100**

Meaning: Claim 1 is the **best** 3(k) vehicle in the set and is still likely to draw a 3(k) objection. Claims 10/19/21/24 score **lower** (planner, LLM wrapper, abstract dual-state). Do not tell the agent “technical effect saves the case.”

Preamble “adaptive routine generation” invites a **business-method** overlay. Counsel should consider a preamble closer to “environmental-state synchronisation for a computer-implemented generation request” if fair basis is accepted (Form 2 second aspect supports that framing).

---

## 5. Inventive-Step Attack Surface

**NO FORMAL PRIOR-ART SEARCH PERFORMED.** No patent numbers, papers, or dates are cited. The following are **category** risks.

| Category | Danger to |
|----------|-----------|
| Weather-aware child/outdoor activity systems | Claims 1(c)–(e), 4, 15, 20 |
| Adaptive parenting / school-block planners | 10, 11, 19 |
| Asynchronous UI state / stale-response prevention | 1(a)(f), 7, 24 |
| Request coalescing / single-flight | 1(b), 8 |
| Optimistic vs authoritative client state | 1(a)(g), 9, 24 |
| Outdoor-suitability classification tables | 4, 15 |
| AI/rule hybrid planners | 10, 12 |
| LLM personalised routine generation | 10, 19 |
| Meal recommendation + inventory + diet | 21–23 |
| Caregiver / role-based instruction | 14 |

**Plausible combinations (skilled person, conceptual):**

- **Claim 1:** weather fetch + single-flight + ignore-stale-if-user-edited + pass parameter into API.  
- **Claim 7:** same as method.  
- **Claim 10:** age-banded templates + optional LLM + wake-time rebase + school-hour exclusion.  
- **Claim 19:** LLM JSON + validators (wrapper).  
- **Claim 21:** LLM meal names + inventory + diet prompt + dedup.  
- **Claim 24:** ref vs state — textbook.

**Inventive-step readiness: 42/100** — no search, crowded categories, combination story untested.

---

## 6. Claim-by-Claim Matrix

| # | I/D | Prov. support | Complete spec | 10 May date defensible? | 3(k) | Inv. step | Clarity | Fair basis | New matter | Main attack | Rec. |
|---|-----|---------------|---------------|-------------------------|------|-----------|---------|------------|------------|-------------|------|
| 1 | I-sys | YES | YES | YES (A) | **HIGH** | **HIGH** | LOW–MED (“preserved”) | YES | LOW | 3(k) + obvious async hygiene | **KEEP** as lead; tighten 1(g)–1(f) link; do not add hardware |
| 2 | D:1 | YES | YES | YES | MED | MED | LOW | YES | LOW | Ordinary error handling | **KEEP** |
| 3 | D:1 | YES | YES | YES | MED | MED | LOW | YES | LOW | UI dialog pattern | **KEEP** (do not read into Claim 1) |
| 4 | D:1 | YES | YES | YES | MED | **HIGH** | LOW | YES | LOW if AQI added | Obvious weather table | **KEEP**; never add AQI |
| 5 | D:1 | YES §6.9 | YES | YES | HIGH | HIGH | LOW | YES | LOW | Atomic UI update | **KEEP** or **DEPEND** only |
| 6 | D:1 | PARTIAL (subset of prov. 4) | YES | YES for web+native | MED | MED | LOW | YES (narrowing) | LOW | Enablement of “functionally identical” | **KEEP** |
| 7 | I-meth | YES | YES | YES | **HIGH** | **HIGH** | LOW | YES | LOW | Same as Claim 1 | **KEEP** as method of 1 |
| 8 | D:7 | YES | YES | YES | MED | HIGH | LOW | YES | LOW | Single-flight known | **KEEP** |
| 9 | D:7 | YES | YES | YES | MED | MED | LOW | YES | LOW | Bypass setState | **KEEP** |
| 10 | I-sys | YES | YES | YES | **HIGH** | **HIGH** | LOW | YES | LOW unless rules-first order recited | Planner + LLM wrapper | **KEEP** as **second** independent; do not lead |
| 11 | D:10 | YES | YES | YES | HIGH | HIGH | LOW | YES | LOW | Validator laundry list | **KEEP** |
| 12 | D:10 | **PARTIAL** (Fig. 3 vs prov. 6(d) GAI-only) | YES | **OPEN** | HIGH | HIGH | LOW | **PARTIAL** | MED | Claim-shift to post-filing pipeline | **REWRITE** or **DROP** |
| 13 | D:10 | YES | YES | YES | HIGH | HIGH | LOW | YES | MED if “3” recited | Energy heuristic | **KEEP** (no numeric 3) |
| 14 | D:10 | PARTIAL vs production; YES vs §6.6 policies | YES | YES if kept to filed rewrite/bonding | HIGH | HIGH | MED | PARTIAL if broader than notes | LOW–MED | Presentation / not implemented as full rewriter | **REWRITE** |
| 15 | D:10 | YES | YES | YES | MED | **HIGH** | LOW | YES | LOW | Obvious indoor swap | **KEEP** |
| 16 | D:10 | YES | YES | YES | HIGH | HIGH | LOW | YES | LOW | Prompt variety | **KEEP** |
| 17 | D:10 | YES §6.4.1 | YES | YES for **templates**, not “banks as default” | HIGH | HIGH | LOW | YES | **C** if claimed as default banks | Template meals obvious | **KEEP** as dependent only |
| 18 | D:1 or 10 | PARTIAL | PARTIAL | UNCLEAR | HIGH | HIGH | **HIGH** | WEAK | LOW | Multiple dependent + antecedent | **DROP** |
| 19 | I-meth | YES | YES | YES | **HIGH** | **HIGH** | LOW | YES | LOW | LLM wrapper | **KEEP** only as secondary / **MOVE TO DIVISIONAL** |
| 20 | D:19 | YES | YES | YES | MED | HIGH | LOW | YES | LOW | Same as 15 | **KEEP** |
| 21 | I-meth | YES | YES | YES as optional Phase B | **HIGH** | **HIGH** | LOW | YES | LOW | LLM meal wrapper | **MOVE TO DIVISIONAL** or keep buried |
| 22 | D:21 | YES | YES | YES | HIGH | HIGH | LOW | YES | LOW | Cuisine list | **KEEP** if 21 kept |
| 23 | D:21 | YES as **prompt** | YES as prompt | YES as prompt | HIGH | HIGH | LOW | NO if sanitizer | **C** if deterministic Jain engine | Prompt-only diet | **KEEP** wording; **DROP** if rewritten as code filter |
| 24 | I-meth | YES (prov. 13) | YES | YES | **HIGH** | **HIGH** | MED | YES | LOW | Abstract dual-state | **DEPEND** from 7 or **DROP** as independent |

---

## 7. Priority vs Post-Filing Analysis

| Feature | Class | May appear in complete spec? | 10 May claim? |
|---------|-------|------------------------------|---------------|
| Dual-state + in-flight + late discard + inject | **A** | Yes | Yes (Claims 1, 7) |
| Pending-action continuity | **A** | Yes | Claim **3** only |
| Silent fail / permission denial | **A** | Yes | Claim **2** only |
| Hybrid AI + rules + GAI correction | **A** | Yes | Claims 10, 19 |
| Template meal anchors | **A** | Yes | Claim 17 |
| Meal **banks as default** | **B** | Yes, as later/current embodiment | **No** as 10 May |
| Dinner 60/90/120; AQI 0/15/20; UAE clock | **B** | Yes, labelled later development | **No** |
| HTTP 422; named pipeline order; trustScore; learning weights; infant &lt;6 skip | **B** | Yes, labelled | **No** |
| LM→rules fallback as architecture | **B** | Yes, labelled | **No** as independent 10 May claim |
| Capacitor / WebView product names | **B** | Yes as examples of web/native | **No** as limitations |
| Vendor model names | **B/C** | Avoid as limitation | **No** |
| Deterministic Jain **root** sanitizer | **C** | Must not be described as existing code | **No** |
| Rules-first *certified order* as the original invention | **C** if claimed as 10 May | Describe as current implementation | **No** |

Previous wording “cannot appear in the complete specification” / “excluded from the priority claim set” was **too blunt**. Corrected in the working HTML this pass.

---

## 8. AI / LLM Claim Analysis

Provisional **does** disclose: constrained LM generation (§6.4.2); deterministic correction of probabilistic outputs (§6.4.3); caregiver transformation (§6.6); meal Phase B (§6.7); ingredient inventory; cuisine/diet/allergy; cross-slot dedup. That is **A**.

Examiner characterisation that will stick:

> LLM wrapper + known personalization constraints (age, diet, allergy, region) + known rule validation (time rebase, school hours, dedup).

Claims **19** and **21** are this characterisation almost verbatim. They are **WEAK** as lead claims. They are **supported**. Support ≠ strength.

Claim **10** is slightly better because it includes a **rule-based path that can generate without the LM**, but 10(d) still makes correction GAI-output-specific, so the “technical” part of 10 is still wrapper-like.

Do not make “AI personalization” sound inventive. It is not, on this record, without a search that this audit did not perform.

---

## 9. Formal Filing Gaps

| Item | Finding |
|------|---------|
| Form 1 | VERIFIED as supplied; portal byte-match REQUIRES REVIEW |
| Form 2 provisional | VERIFIED as supplied 37-page PDF |
| Form 3 | NOT APPLICABLE — VERIFY (no convention/PCT on Form 1) |
| Form 5 | MISSING |
| Form 28 | MISSING |
| Assignment / AmyWorld | MISSING |
| Complete-spec fee | MISSING |
| Schedule II drawings | MISSING (SVG is not Schedule II) |
| Applicant spelling | Ankur Raman vs Ankur raman — REQUIRES REVIEW |
| Address | Form 1/CBR **590/81** vs Form 2 **5900/81** — **do not guess**; counsel vs IPO upload |
| Email | Form 1 **ankur6779@gmail.com** vs CBR extract **ankur5776@gmail.com** — **do not guess** |
| Figures 1–4 vs 5–7 | 5–7 illustrate filed text; still need formal sheets |
| Abstract | 142 words after this pass; Rule 13(7) confirm |
| Claims | 24 drafted; 18 should be dropped before agent finalises |
| Declaration dates/signatures | Blank on Form 1 print |

**Formal filing readiness: 38/100.** The complete-specification **draft** can be reviewed. The **IPO package** cannot be filed on this record.

---

## 10. Exact Corrections Recommended

Already applied in `amynest_FINAL_COMPLETE_SPECIFICATION.html` this pass:

- Stop treating pending-action / silent-fail as Claim 1 strengths.  
- Fix “Claim 18 recites template anchors” (that is Claim 17).  
- Replace “excluded from the complete spec” flavour with A/B/C date segregation.  
- Abstract: drop “reduced interface-synchronisation latency”; 142 words.

Still for the agent (do not invent hardware):

1. **Claim 1(g):** explicitly inject the **output of (f)** (derived unless discarded, else user-selected).  
2. **Claim 1 preamble:** consider dropping “adaptive routine generation” for 3(k), if fair basis accepted.  
3. **Claim 1(b):** “providing duplicate request suppression” can be deleted; the “at most one / share” structure already says it.  
4. **Claim 12:** rewrite to cite Figure 3 without implying the June 2026 named pipeline, or drop.  
5. **Claim 14:** align to Form 2 §6.6 (“rewrite routine-item instruction notes” / bonding-density), or admit production is a narrower embodiment in the spec only.  
6. **Claim 18: delete.**  
7. **Claim 24:** rewrite as dependent on Claim 7.  
8. **Claims 19 and 21:** keep in the document as secondary/divisional candidates; do not lead.  
9. **Claim 23:** freeze “constrains the prompt.” Production `routine-meal-options-safety.ts` `case "jain"` uses the same meat/egg tests as vegetarian — **not** a root/onion/garlic sanitizer.  
10. Formalities: reconcile 590/81 vs 5900/81 and the two emails against **IPO uploaded records**.  
11. Commission a **real** prior-art search before complete-spec claims are locked.  
12. Schedule II drawings; Form 5; fee.

---

## 11. Claims to Keep

**Keep as the lead family:** 1, 2, 3, 4, 6, 7, 8, 9.  
**Keep Claim 5** as a thin dependent.  
**Keep Claim 10** as a **second** independent (filed hybrid), not as Claim 1.  
**Keep** 11, 13, 15, 16, 17 (dependent only), 20.  
**Keep 23** only as prompt-constraint.

---

## 12. Claims to Rewrite

| Claim | Rewrite |
|-------|---------|
| 1(g) / 1(f) link | Make injected value = result of the preservation test |
| 1 preamble | Optional 3(k) de-parenting |
| 12 | Fig. 3 fair-basis only, or drop |
| 14 | Match §6.6; do not claim a general NL rewriter |
| 24 | Dependent on 7 |

---

## 13. Claims to Drop / Move to Divisional

| Claim | Action |
|-------|--------|
| **18** | **DROP** |
| **19** | KEEP in specification as secondary **or MOVE TO DIVISIONAL** (LLM wrapper) |
| **21–22** | **MOVE TO DIVISIONAL** (meal LM family) preferred; if retained, do not lead |
| **24** as independent | **DROP** independence |

---

## 14. Counsel Questions

1. Lead with Claim 1 (Version B) or Claim 10 (Version A)? **This audit: Claim 1.**  
2. Accept Claim 12’s Fig. 3 theory or drop to avoid a claim-shift argument?  
3. Claim 24 dependent vs deleted?  
4. 3(k) preamble change?  
5. Divisional for meal/LLM families?  
6. Which address and email match the IPO upload?  
7. Assignment to any company?  
8. Include later developments (dinner/AQI) in the **description** as non-priority embodiments? (Permissible as B; **not** as 10 May claims.)  
9. Prior-art search vendor and timing relative to the Section 9(1) complete-spec deadline (12 months from 10 May 2026).  
10. Form 5 / Form 28 / agent appointment.

---

## 15. Final Filing Gate

### Decision matrix

| Head | Result |
|------|--------|
| A. Technical disclosure readiness | **PASS** (for agent review) |
| B. Provisional-support readiness | **CONDITIONAL PASS** (Claim 12 PARTIAL; 14/18 weak) |
| C. Priority-date segregation | **CONDITIONAL PASS** (corrected this pass; still must not re-import C into claims) |
| D. Claim clarity | **CONDITIONAL PASS** (18 fail; 1(g) “preserved”; 24 abstract) |
| E. Section 3(k) preparedness | **OPEN** |
| F. Inventive-step preparedness | **OPEN** (no search) |
| G. Formal filing readiness | **FAIL** (forms, drawings, identity, fees) |
| H. Patentability conclusion | **OPEN** — **do not use “patentable” or “guaranteed grant”** |

### Package status

**READY FOR PATENT AGENT REVIEW**

**Not** ready to file with IPO.  
**Not** granted. **Not** approved. **Not** 3(k)-cleared. **Not** inventive-step cleared.

---

## Scores (repeat)

1. Overall: **71 / 100**  
2. Claim 1: **68 / 100**  
3. 3(k): **48 / 100**  
4. Inventive-step readiness: **42 / 100**  
5. Formal filing readiness: **38 / 100**

### Top 10 remaining risks

1. Section 3(k) on Claim 1 as ordinary software/UI state + fetch coalescing.  
2. Inventive step without a search (async hygiene + weather API).  
3. Claim 1 design-around via single-store / non-“registry” implementations (Test A).  
4. Examiner stripping Claim 1 to “ignore stale async result” (Test B).  
5. LLM-wrapper attack on Claims 10(d)/19/21 if they are treated as the invention.  
6. Claim 12 claim-shift / new-matter argument.  
7. Claim 18 antecedent / multiple dependent.  
8. Claim 23 mistaken for a deterministic Jain sanitizer (it is **not**, in code).  
9. Address 590/81 vs 5900/81 and email 6779 vs 5776.  
10. Complete-spec deadline / missing Form 5, Schedule II, fees.

### Claims that should be changed before sending to the patent agent

**Must change:** **18 (drop).** **24 (depend or drop independence).**  
**Should change:** **12 (rewrite/drop), 14 (rewrite), 1(f)–(g) linkage, 1 preamble (optional).**  
**Do not change into sanitizer:** **23.**  
**Do not promote to Claim 1:** **10, 19, 21.**

---

*End of red-team. No commit. No push. No IPO filing.*
