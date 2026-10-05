# FINAL self-scrutiny report — hostile pass on the FINAL draft

**Target:** `patent/amynest_FINAL_COMPLETE_SPECIFICATION.html` + matrices.  
**Pose:** opposing examiner.  
**Not a legal opinion. Not ready to file.**

---

## Issue-by-issue

### 1. Unsupported claim scope
**SEVERITY: P1**  
**EVIDENCE:** Claim 10 still recites a full hybrid generator. Claim 21 is any constrained LM meal prompt. Claim 14 “adapt instruction text and/or activity selection” may exceed `simplifyForHandler`.  
**CORRECTION:** Keep 10 as second independent (filed). Keep 21 optional and non-lead. Keep 14 narrowed; do not restore “rewrite all notes.”

### 2. New matter
**SEVERITY: P0 if C enters Claim 1; currently P1 residual on Claim 12**  
**EVIDENCE:** Dinner 60/90/120, AQI, banks-default, 422, named pipeline **not** in claims. Claim 12 applies selected constraints to rule-based artefacts citing Fig. 3 — supportable but a shift from provisional Claim 6(d).  
**CORRECTION:** Leave C in Annex. Counsel keep/drop Claim 12. Do not add certified order to Fig. 3.

### 3. Inconsistent terminology
**SEVERITY: P2**  
**EVIDENCE:** “Deterministic correction” vs “constraint/correction processing”; UI yes/limited/no vs suitable/limited/unsuitable.  
**CORRECTION:** Spec maps UI tokens. Claims use filed suitable/limited/unsuitable. Do not call the pipeline an LLM.

### 4. AI overclaim
**SEVERITY: P1 (families C/F), P2 (Claim 1)**  
**EVIDENCE:** Claim 1 has no LLM. Claims 19–23 do. Form 2 Fig. 2 caption still exists historically as “AI hallucination path.”  
**CORRECTION:** Working Claim 1 is Version B. Body states LM is not a safety engine and is vendor-agnostic.

### 5. Deterministic / AI confusion
**SEVERITY: P2**  
**EVIDENCE:** Draft distinguishes GAI module (321), rule path (322), correction (330). Production names `runRoutineIntelligencePipeline` — kept in Annex CI.  
**CORRECTION:** Never describe 330 as “AI.”

### 6. Platform overclaim
**SEVERITY: P1 if restored; P2 as drafted**  
**EVIDENCE:** Claim 6 = web + native mobile. Wearable/voice/offline dashed. Filed §§6.1/6.9 present tense remains a historical inconsistency.  
**CORRECTION:** Do not put wearable in Claim 1/6 without enablement decision.

### 7. Missing antecedent basis
**SEVERITY: P1 Claim 18; P2 others**  
**EVIDENCE:** Claim 1(f) and Claim 7(e)–(f) rewritten to introduce “derived classification.” Claim 18 “module of claim 1” when depending from 10 is awkward.  
**CORRECTION:** Delete or redraft Claim 18 before filing.

### 8. Unclear claim dependencies
**SEVERITY: P1 Claim 18; P2 Claim 12**  
**EVIDENCE:** 18 is “1 or 10.” Multiple dependent claims may be objected to in India depending on practice.  
**CORRECTION:** Split 18 or drop. Claim 12 depends only from 10.

### 9. Insufficient technical effect
**SEVERITY: P1**  
**EVIDENCE:** Opponent will call Claim 1 ordinary async hygiene (red-team F/G).  
**CORRECTION:** Keep the integrated protocol; do not rest on “latency” slogans; do not strip late-discard or injection.

### 10. Section 3(k) weakness
**SEVERITY: P1**  
**EVIDENCE:** Entire invention is software. §7.19 refuses to conclude 3(k) is overcome.  
**CORRECTION:** Counsel CRI analysis. Technical framework is in the spec. No fake case-law.

### 11. Drawing / spec contradiction
**SEVERITY: P1 (filed Fig. 2 caption vs this draft Fig. 2)**  
**EVIDENCE:** Filed Fig. 2 arrowed to “AI hallucination correction.” This draft Fig. 2 dispatches to generation. Body of Form 2 + Fig. 3 support the draft.  
**CORRECTION:** Agent to confirm caption consistency is not new matter. Do not file SVG as Schedule II without formal sheets.

### 12. Filing-date contamination
**SEVERITY: P0 avoided; P2 vigilance**  
**EVIDENCE:** 08 May print date vs 10 May CBR. Draft uses 10 May. Production June freeze labelled C.  
**CORRECTION:** Keep banners. Never tell IPO this HTML was filed 10 May.

### 13. Later-developed features disguised as original
**SEVERITY: P0 avoided in claims; P2 if Annex is misread**  
**EVIDENCE:** Annex CI / NM labelled. Fig. 3 caption says certified order is not drawn.  
**CORRECTION:** Scrutiny should grep the HTML for “60 minute”, “AQI”, “422”, “trustScore” in claim text — they must not appear. (They appear only in exclusion boxes.)

### 14. Ownership inconsistencies
**SEVERITY: P1**  
**EVIDENCE:** 590/81 vs 5900/81; two e-mails; raman/Raman; no assignment.  
**CORRECTION:** Applicant election. Do not guess in the spec (already quoted both).

### 15. Abstract / spec mismatch
**SEVERITY: P2**  
**EVIDENCE:** Abstract 137 words covers env-sync + hybrid + correction; matches Claim 1 lead + Claim 10 presence. Does not mention dinner/AQI.  
**CORRECTION:** Confirm Rule 13(7). Do not add marketing.

---

## Grep check (this pass)

Priority-claim text must not contain dinner-gap minutes, AQI caps, HTTP 422, trustScore, Capacitor, WebView, OpenAI, GPT. Those strings appear only in labelled C boxes / annex pointers.

---

## Scores (/100)

| Dimension | Score | Note |
|-----------|------:|------|
| 1 Filed disclosure fidelity | 91 | Hybrid preserved; env-sync deepened; C boxed |
| 2 Technical completeness | 88 | Protocol fully drafted; CRM not included |
| 3 Claim support | 84 | 1–11, 13, 15–16, 19–23 strong/moderate; 12, 14, 18, 24 conditional |
| 4 New-matter control | 90 | C out of claims; Claim 12 is the residual |
| 5 Technical-effect clarity | 86 | Protocol effects stated; 3(k) still open |
| 6 Section 3(k) preparedness | 78 | Framework only |
| 7 Drawing accuracy | 85 | Fig. 2/3 corrected vs production; filed caption clash flagged; Schedule II missing |
| 8 Internal consistency | 87 | Version A/B documented; Claim 18 weak |
| 9 Formality readiness | 62 | Address/email/Form 5/28/assignment/Schedule II open |
| 10 Overall draft quality | **86** | Fit for independent scrutiny, not for unsupervised IPO upload |

---

## P0 / P1 / P2

**P0 = 0** (no grant claim; no back-dated dinner/AQI in claims; no “this HTML was filed 10 May”)

**P1 = 12** (3(k); Claim 12; Claim 18; Claim 24; Jain prompt discipline; age-classifier split; caregiver vs production; platforms; Fig. 2 caption; ownership/address/email; Form 5/28/assignment; Schedule II; no prior-art search)

**P2 = 6** (terminology dual names; abstract word-rule confirm; CRM omitted; product copy stale; energy sample=3 not claimed; native-shell product names)

---

## Public-copy findings

See checklist. Product still says “Provisional patent filed” / “Patent Pending” without the application number. **COUNSEL / FINAL COPY REVIEW.** Candidate: `Indian Patent Application No. 202611059355 filed on 10 May 2026.` Files not modified.

---

## Final gate

**A — READY FOR INDEPENDENT SCRUTINY**

Not: patent granted · patent approved · legally patentable · ready to file.

Next phase: independent ChatGPT scrutiny of these `patent/amynest_FINAL_*` files, then corrections, then — only then — any IPO complete-specification filing decision.
