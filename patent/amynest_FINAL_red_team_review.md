# FINAL red-team review — App. 202611059355

> **SUPERSEDED IN PART.** For Claim 1 limitations, 3(k) scores, and keep/drop recommendations, use `patent/amynest_FINAL_PRE_FILING_RED_TEAM.md`. This file incorrectly treated **pending-action continuity** and **permission-gated I/O** as Claim 1 limitations; those are Claims 3 and 2. Do not repeat that overstatement.

**Question:** What is the strongest argument against this application?  
**Mode:** conceptual opposition. No invented prior-art citations. No patentability conclusion.

**Question:** What is the strongest argument against this application?  
**Mode:** conceptual opposition. No invented prior-art citations. No patentability conclusion.

The working complete-specification draft leads with environmental synchronisation (Claim 1) and keeps hybrid generation as a second independent (Claim 10). An opponent will attack both.

---

## A. Software-only / Section 3(k)

**Strongest attack:** The entire disclosure is a computer program implementing (i) a React-style async/state pattern and (ii) a child-schedule planner with an optional language model. Under Section 3(k) it is a computer program per se and/or an algorithm, and the “technical effects” (fewer duplicate fetches, no stale UI) are ordinary software engineering, not a technical contribution in a patentable field.

**Draft response framework (not a conclusion):** Claim 1 is not “generate a parenting plan.” It is concurrent-operation management of a permission-gated I/O channel plus stale-result protection so a generation payload cannot diverge from an explicit user constraint. Deterministic correction of LM output is control of a probabilistic computational component. Counsel must still apply CRI guidelines / 3(k) case law. **This file does not say 3(k) is overcome.**

**Severity if unaddressed:** P1 (application-killing if Claim 1 is read as “business method of making routines”).

---

## B. Obviousness / aggregation

**Attack:** Dual-state refs + in-flight Promise + weather API + rule templates + LLM + validators is an aggregation of known frontend patterns and known planner/LLM pipelines. No synergistic technical effect beyond stacking.

**Where the draft is strongest against this:** the *combination* in Claim 1 of (touched flag in two stores) + (single in-flight registry) + (post-await re-read and discard) + (inject before UI commit) + (pending-action continuity) as one protocol for a generation payload. An aggregation attack is weaker if those elements are claimed as an integrated consistency protocol, stronger if they are claimed as a laundry list.

**Severity:** P1 conceptual (no search done).

---

## C. AI-wrapper concern

**Attack:** Claim 10/19/21 are “prompt an LLM and regex/validate the JSON.” That is the standard LLM-wrapper pattern. Figure 2’s filed caption even said “AI hallucination correction path.”

**Draft mitigation already applied:** Claim 1 does not require an LLM. Claim 10(d) and Claim 19 stay honest that correction operates on GAI output. Rule-based path is a complete embodiment. Vendor names are not limitations. Do not claim the model guarantees safety.

**Residual risk:** High on Families C and F if they become the lead. Keep Family A as Claim 1.

**Severity:** P1 for Claims 19–23; P2 for Claim 1.

---

## D. Routine-planning prior-art concern

**Attack (conceptual, no documents cited):** Digital parenting calendars, school-bell block-out, age-band activity lists, and meal planners are crowded. Age tables and caregiver tone policies look like content, not invention.

**Mitigation:** Do not lead with age bands or caregiver copy. Keep them dependent (Claims 10(a), 14). Do not claim medical or parenting methods.

**Severity:** P1 if Version A is Claim 1; P2 if Version B remains Claim 1.

---

## E. Environmental API obviousness

**Attack:** “Get GPS, call weather, map to indoor/outdoor” is what every weather app and many calendar apps do. The 3-way table (rain, wind, temperature) is a trivial policy.

**Where the draft must not retreat:** the invention as filed is not the meteorological mapping alone (Claim 4 dependent). It is preference preservation under racing async completion and payload injection before UI commit. If Claim 1 is amended down to “map weather to suitable/limited/unsuitable,” the application collapses into E.

**Severity:** P1 if Claim 1 is narrowed to the table; P2 if the protocol remains intact.

---

## F. Synchronisation-mechanism distinctiveness

**Best argument for distinctiveness (technical, not legal):**  
Stale-closure dual-state + single-flight registry + late-discard + pre-commit payload injection + pending-action re-inject, all on the generation trigger path.

**Best argument against:** This is textbook “use a ref because setState is async” plus “dedupe fetches with a module-level Promise,” which any frontend engineer would do. Written description is detailed, but skill-in-the-art may be high.

**Scrutiny task:** Can the combination be characterised as more than ordinary async hygiene? Claim 1’s “thereby reducing UI synchronisation latency” language was removed from independent 1(g) in this FINAL (injection is stated as a structural step). Do not rest patentability on a latency slogan.

**Severity:** P1 — this is the case.

---

## G. Technical-effect sufficiency

**Attack:** Effects are “fewer network calls” and “UI shows what the user picked.” Insufficient technical effect.

**Filed effects to preserve:** duplicate permission suppression; concurrent-execution conflict minimisation; non-override of explicit constraints by late I/O; payload/UI desynchronisation avoidance; non-blocking fail-open; machine school-block and wake-anchor on LM output.

**Do not inflate:** battery life percentages, “first in the world,” medical outcomes.

**Severity:** P1.

---

## H. Claim breadth

| Claim | Breadth attack |
|-------|----------------|
| 1 | Still a fairly long combination — good against breadth, bad against 3(k) “mere instructions.” |
| 10 | Hybrid generator + two correction steps — broad planner. |
| 18 | Combination of 1 and 10 — unclear; drop candidate. |
| 21 | Any LM meal prompt with inventory — wrapper-broad. |
| 24 | Dual-state method without the rest of the protocol — too abstract. |

**Severity:** P1 for 10, 21, 24; P2 for 1 if left as a combination.

---

## I. Written-description support

**Attacks that work:**  
- Wearable/voice/offline as operative (filed present tense vs §6.10). Draft already dashed them.  
- Jain deterministic engine (Fig. 4 looks like a filter; code is prompt). Claim 23 says prompt.  
- Claim 12 both-paths correction (Fig. 3 yes; summary fourth aspect is GAI-only). Flagged.  
- Claim 18 antecedent.

**Attacks that should fail if draft is followed:** dinner/AQI/banks-default as 10 May matter — they are not in the claims.

**Severity:** P1 for 12, 18, 23 if wording slips; P0 if C features re-enter Claim 1.

---

## J. Enablement

**Attack:** Dual-state + in-flight is enabled for a web JS client; “functionally identical on native mobile” is asserted; wearable/voice geo sources are prophetic.

**Mitigation:** Claim 6 limited to web + native mobile. Native mobile may host the same web implementation (implementation evidence C). Wearable enablement is not claimed as operative.

**Remaining:** skilled person can perform §6.2 from the protocol + table. Age-band table is enabled. LM prompt constraints are enabled as prompts, not as a guaranteed parser.

**Severity:** P2 if Claim 6 stays narrow; P1 if wearable restored as mandatory.

---

## Composite “strongest case against”

1. **3(k):** computer program for scheduling children, no technical contribution beyond software.  
2. **In the alternative, obvious aggregation** of weather fetch, async dedupe, and an LLM planner with validators.  
3. **If applicant relies on AI claims:** LLM wrapper.  
4. **If applicant relies on weather table alone:** obvious environmental API.  
5. **Formalities:** address/email inconsistency; no assignment; complete spec drawings not Schedule II.

The draft’s best defence is to **keep Claim 1 as the integrated environmental-consistency protocol**, keep AI in subordinate families, and keep class C out of the priority claims.

**This red-team review does not find the application hopeless or allowable.** It identifies the arguments independent scrutiny should try to break.
