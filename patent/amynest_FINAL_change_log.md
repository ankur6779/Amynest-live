# FINAL change log — Complete Specification draft vs filed Form 2 / earlier drafts

**New file:** `patent/amynest_FINAL_COMPLETE_SPECIFICATION.html`  
**Does not overwrite** filed PDFs, `amynest_patent_package.html`, v2, Section 10 draft, or product code.

Format: OLD → PROBLEM → NEW TREATMENT → SOURCE → PRIORITY → NEW-MATTER → CLAIM IMPACT

---

## 1. Document identity

**OLD:** Section 10 HTML still useful but Claim 8(d) path-agnostic correction was a medium claim-shift; env-sync protocol was shorter.  
**PROBLEM:** Independent scrutiny needs a locked Claim 1 choice, fixed antecedents, and an explicit Version A vs B.  
**NEW:** This FINAL draft. Working Claim 1 = environmental synchronisation (Version B). Version A = independent Claim 10 with GAI-output correction as filed.  
**SOURCE:** Form 2 §§6.2, 6.4; prov. Claims 1 and 6.  
**PRIORITY:** A  
**NEW-MATTER:** LOW for Claim 1; Claim 12 remains B.  
**CLAIM IMPACT:** 1, 7, 10, 12.

---

## 2. LLM-first vs rules-first

**OLD DISCLOSURE:** Form 2 hybrid; Fig. 2 caption “AI hallucination correction path”; later v2/final drafts risked rewriting 10 May as “rules-first certified pipeline.”  
**PROBLEM:** Either erases filed AI or back-dates June 2026 primacy.  
**NEW:** Filed architecture box vs Annex CI production box. Fig. 3 two endpoints. Claim 10(d) operative on GAI outputs (filed). Claim 12 optional both-paths dependent.  
**SOURCE:** Form 2 §6.4; Fig. 3 p. 34/37.  
**PRIORITY:** Hybrid A; primacy C.  
**NEW-MATTER:** MEDIUM only if Claim 12 is over-read.  
**CLAIM IMPACT:** 10, 12, 19.

---

## 3. Environmental synchronisation depth

**OLD:** Listed modules without a numbered protocol.  
**PROBLEM:** Easy to dismiss as “fetch weather.”  
**NEW:** STATE → REQUEST → SHARED OP → RESULT → CLASSIFY → RECONCILE → INJECT → PENDING-ACTION → SILENT FAIL, plus why duplicate retrieval and stale closures are consistency failures.  
**SOURCE:** §6.2 pp. 10–13/37.  
**PRIORITY:** A  
**NEW-MATTER:** LOW  
**CLAIM IMPACT:** 1–9, 24.

---

## 4. Claim 1(f) / method 7(e) antecedent

**OLD:** Section 10 Claim 5(e) said “the derived classification” before introducing it.  
**PROBLEM:** Antecedent-basis attack.  
**NEW:** Claim 1(f) “a classification derived from the detection operation”; Claim 7(e) derives, then (f) discards.  
**SOURCE:** same protocol  
**PRIORITY:** A  
**NEW-MATTER:** N/A (clarity)  
**CLAIM IMPACT:** 1, 7.

---

## 5. Dinner 60/90/120 and AQI 0/15/20

**OLD:** Inserted in v2 as if complete-spec subject-matter.  
**PROBLEM:** Absent from Form 2; freeze June 2026.  
**NEW:** Annex NM / class C only. Not in claims or Fig. 7.  
**SOURCE:** Production vs Form 2 silence.  
**PRIORITY:** C  
**NEW-MATTER:** HIGH if claimed  
**CLAIM IMPACT:** none (excluded).

---

## 6. Meal banks / exactly-four

**OLD:** Form 2 Phase B predetermined N; Fig. 4 example of four; v2 over-corrected to banks-as-invention.  
**PROBLEM:** False default either way.  
**NEW:** Claim 21 optional Phase B; Claim 17 template anchors from §6.4.1; default status C.  
**SOURCE:** §§6.4.1, 6.7.  
**PRIORITY:** Phase B A; default C.  
**NEW-MATTER:** MEDIUM if 17 pushed independent.  
**CLAIM IMPACT:** 17, 21–23.

---

## 7. Jain

**OLD:** Claim 11 / Fig. 4 prompt constraints including roots.  
**PROBLEM:** Sanitizer does not parse roots.  
**NEW:** Claim 23 “constrains the prompt.” Body discloses sanitizer gap.  
**SOURCE:** Form 2 Claim 11; `routine-meal-options-safety.ts`.  
**PRIORITY:** Prompt A; engine UNSUPPORTED.  
**NEW-MATTER:** HIGH if sanitizer-claimed.  
**CLAIM IMPACT:** 23.

---

## 8. Platforms

**OLD:** Present-tense wearable/voice/offline plus §6.10 future.  
**PROBLEM:** Enablement vs current clients.  
**NEW:** Claim 6 web+native only; others dashed.  
**SOURCE:** §§6.1, 6.9, 6.10.  
**PRIORITY:** Web/mobile A; others D as operative.  
**NEW-MATTER:** LOW (narrowing).  
**CLAIM IMPACT:** 6; prov. 12 omitted.

---

## 9. Figures 2 and 3

**OLD:** Fig. 2 caption routed to AI correction; Fig. 3 already had path selector.  
**PROBLEM:** Caption/body clash; later drafts might draw rules-first.  
**NEW:** Fig. 2 ends at payload → Fig. 3. Fig. 3 both filed paths. Figs 5–7 = filed text only.  
**SOURCE:** §§6.2, 6.4, 6.5.  
**PRIORITY:** A subject-matter; new sheets are complete-spec drawings of filed text.  
**NEW-MATTER:** LOW if agent agrees caption consistency is not added matter.  
**CLAIM IMPACT:** supports 1, 15, 19.

---

## 10. Combination Claim 18

**NEW** bridging dependent combining Families A+B.  
**PROBLEM:** Awkward antecedent if depending from 10.  
**TREATMENT:** Flagged REVIEW.  
**PRIORITY:** B  
**NEW-MATTER:** LOW  
**CLAIM IMPACT:** 18 — consider delete.

---

## 11. Formalities / ownership

Unchanged from Form 1 vs Form 2 vs CBR discrepancies (590/81 vs 5900/81; emails; name case). Not normalised.  
**CLAIM IMPACT:** none.

---

## 12. Public copy

Not edited. Recommended wording only (see scrutiny report).

---

## 13. Hardening pass (14 September 2026)

**OLD:** 24-claim working set; Claim 1 listed modules; old Claim 12 both-paths dependent; old Claim 18 combination; old Claim 24 independent; caregiver “adapt text and/or selection”; latency still in some commentary.

**PROBLEM:** Examiner can reduce Claim 1 to ordinary async UI hygiene; Claim 12 is a claim-shift; Claim 18 antecedent fails; Claim 24 is a 3(k) magnet; Claim 23 could be misread as a Jain sanitizer.

**NEW:** 22-claim hardened set. Claim 1/7 express the authoritative-classification protocol (immediate user authority; conditional detection; no competing in-flight ops; late re-eval; stale derived cannot supersede; inject designated value independently of deferred UI commit). Old 12 and 18 **dropped**. Old 24 → Claim 17 dependent on 7. Caregiver → instruction-note rewrite. Jain frozen as prompt. Claim 10(c) recites rule path without GAI. Abstract 141 words; no latency as Claim 1 effect. New files: `amynest_FINAL_HARDENED_CLAIMS.md`, `amynest_FINAL_FILING_READINESS.md`.

**SOURCE:** Form 2 §§6.2.1–6.2.4, 6.4, 6.6, 6.7; prov. Claims 1, 5, 6, 9, 11, 13, 14.

**PRIORITY:** A for Claim 1 combination and remaining A claims; B/C later embodiments remain segregated.

**NEW-MATTER:** LOW for Claim 1 relationship language (fairly based on §6.2). HIGH if old 12 reintroduced or Jain sanitizer claimed.

**CLAIM IMPACT:** 1–22 hardened set. Independents: 1, 7, 10, 18, 20.

---

## Files this draft does not replace

`amynest_patent_package.html` (8 May local twin) · filed PDFs · v2 · `amynest_section10_*` · `amynest_final_patent_submission_*` (lowercase earlier handoff) · product/source code.

`amynest_FINAL_PRE_FILING_RED_TEAM.md` and `amynest_FINAL_red_team_review.md` are **historical audits** of the pre-hardening 24-claim set. Scores and claim numbers in those files are superseded by `amynest_FINAL_FILING_READINESS.md` and `AMYNEST_FINAL_SUBMISSION_STATUS.md`.

---

## 14. Submission-draft production (19 September 2026)

**OLD:** Hardened 22-claim working HTML still contained audit banners, claim-side commentary, and annex source paths.  
**NEW:** Clean Form 2 complete specification; claims section is claims only; later/current features in §6.16; submission HTML/PDF created.  
**CLAIM IMPACT:** none — 22-claim freeze held.
