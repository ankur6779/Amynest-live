# Section 10 complete-specification draft — change log

**Draft:** `patent/amynest_section10_complete_specification_draft.html`  
**Compared against:** actual filed Form 2 (37-page provisional PDF), filed drawings PDF, Form 1, IPO CBR record, production code, and earlier repo drafts (`amynest_patent_package.html`, v2 HTML, `amynest_final_patent_submission_draft.html`).  
**This log is technical, not a legal opinion.**

Legend: **PRIORITY STATUS** = P0 / P1 / P2 / P3 as defined in the draft. **NEW-MATTER RISK** = LOW / MEDIUM / HIGH / N/A (clarification only).

---

## 1. Filing status and Form 2 identity

**OLD DISCLOSURE**  
Repo previously recorded: filed-document bytes not locally available; provisional vs complete unproven; nearest candidate was 8 May HTML.

**PROBLEM**  
Counsel could not see the actual uploaded specification.

**NEW DRAFT TREATMENT**  
Applicant-supplied PDFs are treated as the filed package: Form 1 attachments expressly list **PROVISIONAL SPECIFICATION** `AmyNest — Indian Provisional Patent Application.pdf`. Form 2 is a 37-page provisional under Section 9. Drawings PDF is sheets of Figures 1–4 from the same HTML print (08/05/2026, 21:43, `amynest_patent_package 2.html`). Priority date remains **10 May 2026** (CBR), not the HTML print date.

**SOURCE SUPPORT**  
Form 1 p.2 attachments; Form 2 cover; CBR 29076.

**PRIORITY STATUS** P0 (facts of filing)  
**NEW-MATTER RISK** N/A  
**CLAIM IMPACT** Complete-spec clock under Section 9(1): twelve months from 10 May 2026.

---

## 2. HTML print date vs IPO filing date

**OLD** Form 2 footer 08/05/2026 21:43.  
**PROBLEM** Risk of stating 8 May as the filing date.  
**NEW** Filing date **10 May 2026** only. 8 May is document-generation date.  
**SOURCE** Form 1 print 10/05/2026 16:55; CBR 17:07:00.  
**PRIORITY STATUS** P0  
**NEW-MATTER RISK** N/A  
**CLAIM IMPACT** None.

---

## 3. LLM-first framing

**OLD DISCLOSURE** Form 2 abstract/summary/Claim 6(d)/14 and Fig. 2 caption emphasise language-model generation plus “AI hallucination correction”. Fig. 3 also shows a path selector and correction “applied to both paths”.

**PROBLEM** Current production is rules-first. Earlier v2/final drafts risked rewriting the 10 May invention as if rules-first had been filed.

**NEW DRAFT TREATMENT**  
Preserve filed hybrid (rules path **and** optional GAI). Redraw Fig. 3 as two parallel filed paths, not AI-only and not June-2026 certified order. Put rules-first primacy in Annex A (P2).

**SOURCE SUPPORT** Form 2 §§6.4.1–6.4.3, Fig. 3.  
**PRIORITY STATUS** Hybrid = P0; rules-first primacy = P2.  
**NEW-MATTER RISK** MEDIUM if Claim 8(d) is path-agnostic (shift from prov. 6(d)). Flagged for agent.  
**CLAIM IMPACT** Claims 8, 14 (old numbering), 19.

---

## 4. Environmental synchronisation elevated

**OLD** Strong in Form 2 but easy to bury under “AI parenting” marketing.  
**PROBLEM** Dilution of the best-enabled technical mechanism.  
**NEW** Family A is the lead independent system/method; §6.2 is the core detailed description; Figs. 2 and 6.  
**SOURCE** Form 2 §6.2, Claims 1–5B, 13.  
**PRIORITY STATUS** P0  
**NEW-MATTER RISK** LOW  
**CLAIM IMPACT** Claims 1–7, 18.

---

## 5. Dinner-gap 60/90/120 and AQI 0/15/20

**OLD** Inserted into v2 / final-submission HTML as if complete-spec subject-matter.  
**PROBLEM** Absent from filed Form 2; engine freeze June 2026 is after 10 May.  
**NEW** Annex A only. Not in body as priority disclosure. Not in proposed claims.  
**SOURCE** Production `getMinimumDinnerSleepGap`, `maxOutdoorMinutesFromAqi`; Form 2 silence.  
**PRIORITY STATUS** P2  
**NEW-MATTER RISK** HIGH if claimed for 10 May priority.  
**CLAIM IMPACT** v2 claims 8B/8C **removed**.

---

## 6. Meal banks as default / “exactly four LLM options”

**OLD** Form 2 Phase B = predetermined number of LM dish names per slot; Fig. 4 example shows four. v2 over-corrected to banks-as-the-invention.  
**PROBLEM** Either treating LM-four as always-default (false in production) or treating banks-as-default as if filed (new matter).  
**NEW** Phase B retained as optional filed method (Claim 14). Template meal anchors as P1 dependent from §6.4.1 (Claim 15). Default-status of banks = P2 annex. No “exactly four”.  
**SOURCE** Form 2 §§6.4.1, 6.7.  
**PRIORITY STATUS** Phase B P0; template anchors P1; default P2.  
**NEW-MATTER RISK** MEDIUM if Claim 15 is pushed as independent.  
**CLAIM IMPACT** 14, 15, 16, 17.

---

## 7. Jain logic

**OLD** Form 2 Claim 11 / Fig. 4 as prompt constraints including roots/onion/garlic.  
**PROBLEM** Production sanitizer does not parse roots; claiming a deterministic Jain engine would be false and possibly new matter.  
**NEW** Claim 17 expressly “constrains the prompt”. Body discloses sanitizer gap.  
**SOURCE** Form 2 Claim 11; `routes/routines.ts`; `routine-meal-options-safety.ts` Jain = meat/egg.  
**PRIORITY STATUS** Prompt P0; sanitizer-roots UNSUPPORTED.  
**NEW-MATTER RISK** HIGH if claim requires deterministic root enforcement.  
**CLAIM IMPACT** 17.

---

## 8. Platform present-tense vs future-proof section

**OLD** Form 2 §§6.1 and 6.9 list wearable/voice/offline as realised; §6.10 lists them as future. Filed Fig. 1 shows them as clients **and** “Future Embodiments”.  
**PROBLEM** Inconsistency; current production does not implement those generation clients.  
**NEW** Operative = web + native mobile. Others dashed / §6.10. Claim 4 narrowed. Prov. Claim 12 omitted as independent.  
**SOURCE** Form 2 §§6.1, 6.9, 6.10; production shells.  
**PRIORITY STATUS** Web/mobile P0; wearable/voice/offline P3 as operative.  
**NEW-MATTER RISK** LOW (narrowing). HIGH if claiming they were implemented on 10 May.  
**CLAIM IMPACT** 4; 12 omitted.

---

## 9. Figure 2 caption vs body

**OLD** Filed Fig. 2 arrowed payload “to Deterministic Correction Layer (AI hallucination correction path)”.  
**PROBLEM** Contradicts Fig. 3 (generation then correction; both paths).  
**NEW** Fig. 2 ends at payload dispatch → Fig. 3. Correction is Fig. 7. Counsel note that this is consistency, not added matter.  
**SOURCE** Form 2 Figs. 2–3, §6.4.  
**PRIORITY STATUS** P0 mechanism; caption fix = clarification.  
**NEW-MATTER RISK** LOW if agent agrees.  
**CLAIM IMPACT** None directly.

---

## 10. Additional Figures 5–7

**OLD** Only Figs. 1–4 filed.  
**PROBLEM** State machine, substitution, and correction chain were textual.  
**NEW** Figs. 5–7 illustrate **only** Form 2 §§6.2, 6.4.3, 6.5. No AQI/dinner/pipeline-order drawings.  
**SOURCE** Those sections.  
**PRIORITY STATUS** P0 subject-matter; new sheets are complete-spec drawings of already-described matter.  
**NEW-MATTER RISK** LOW (illustration of filed text). Schedule II compliance still required.  
**CLAIM IMPACT** Supports 11, 18, 19.

---

## 11. Terminology

**OLD** “AI”, “hybrid”, “intelligence”, “correction” used loosely; later drafts called the pipeline “AI”.  
**NEW** Generative AI module / language-model inference engine = probabilistic. Deterministic rule-based processing = templates. Deterministic constraint/correction processing = post-processing. Never call the pipeline an LLM.  
**SOURCE** Form 2 already distinguished GAI vs rules vs correction.  
**PRIORITY STATUS** P0  
**NEW-MATTER RISK** N/A  
**CLAIM IMPACT** All.

---

## 12. Vendor names

**OLD** Some non-filed PDFs named OpenAI / GPT-4o-mini / Expo. **This Form 2 is provider-agnostic** (correct).  
**NEW** Keep provider-agnostic. Do not add vendors.  
**SOURCE** Form 2 §6.1.  
**PRIORITY STATUS** P0  
**NEW-MATTER RISK** N/A if left out; HIGH if added as limitation.  
**CLAIM IMPACT** None.

---

## 13. Ownership / address / email

**OLD** v1 HTML address 5900/81; CBR 590/81.  
**NEW** Both addresses and both emails quoted; no election. Applicant/inventor Ankur Raman / “Ankur raman”. No AmyWorld assignee.  
**SOURCE** Form 1, Form 2, CBR.  
**PRIORITY STATUS** N/A  
**NEW-MATTER RISK** N/A  
**CLAIM IMPACT** Formalities, not claims.

---

## 14. Public status strings

**OLD** Product copy “Provisional patent filed” / “patent pending” (not edited).  
**NEW** Recommendation only: “Indian Patent Application No. 202611059355 filed on 10 May 2026.” No mass replace.  
**SOURCE** CBR + Form 1.  
**PRIORITY STATUS** N/A  
**NEW-MATTER RISK** N/A  
**CLAIM IMPACT** None.

---

## 15. Earlier repo drafts vs this draft

| Artefact | Role now |
|----------|----------|
| `amynest_patent_package.html` | Historical 8 May HTML — **not overwritten**; nearest local twin of filed Form 2 |
| Filed Form 2 PDF | **Tier 1** priority disclosure |
| `amynest_patent_package_v2.html` | Post-filing technical correction — **must not be called the 10 May document**; over-inserts P2 |
| `amynest_final_patent_submission_draft.html` | Earlier counsel handoff before Form 2 PDF was in hand |
| **This Section 10 draft** | Priority-locked complete-spec **proposal** |

---

## Unresolved counsel questions (also in handoff)

1. Confirm Form 2 PDF ≡ IPO “View Uploaded Documents” bytes.  
2. Elect address 590/81 vs 5900/81; email 6779 vs 5776; capitalisation of “raman”.  
3. Claim 8(d) path-agnostic vs restore GAI-output-only.  
4. Restore wearable/voice/offline in Claim 4 as optional selected environments?  
5. Claim 18 independent vs dependent.  
6. Any P2 feature to include as *non-priority* extra examples in the complete spec?  
7. Assignment / AmyWorld.  
8. Form 5, Form 28, Schedule II drawing sheets, fees for complete spec.  
9. Section 3(k) legal theory — technical framework supplied, no conclusion.  
10. Prior-art search — **not performed**.
