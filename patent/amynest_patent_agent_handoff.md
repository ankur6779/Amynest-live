# Patent-agent handoff — Indian Patent Application No. 202611059355

**Status of this package:** TECHNICAL COMPLETE SPECIFICATION DRAFT READY FOR REGISTERED INDIAN PATENT PROFESSIONAL REVIEW  

**Not:** ready to file · not filed with IPO as these drafts · not granted · not examined (unknown) · not a legal opinion.

Prepared 14 September 2026. No source code, i18n, or IPO record was modified.

---

## 1. What you are being handed

| File | Purpose |
|------|---------|
| `patent/amynest_section10_complete_specification_draft.html` | Proposed Section 10 Complete Specification (priority-locked) |
| `patent/amynest_section10_claim_support_matrix.md` | Claim-by-claim support / 3(k) / new-matter flags |
| `patent/amynest_priority_vs_postfiling_feature_matrix.md` | 42-feature + P2 register |
| `patent/amynest_section10_change_log.md` | Why the draft differs from Form 2 / v2 |
| `patent/amynest_section10_self_audit.md` | Second-pass scoring |
| `patent/amynest_patent_filing_record.md` | Earlier CBR extract (still valid; now supplemented by Form 1/2 PDFs) |

**Do not file the HTML as-is without legal settlement of claims, forms, drawings (Schedule II), and new-matter.**

---

## 2. Verified filing facts (do not change)

| Item | Value | Source |
|------|--------|--------|
| Application No. | **202611059355** | CBR / Form 1 office fields blank on printout but CBR assigned |
| CBR | **29076** | CBR |
| Filing date/time | **10 May 2026, 17:07:00** | CBR (Form 1 print timestamp 16:55 same day) |
| Docket | 64202 | CBR |
| Temp | TEMP/E-1/64767/2026-DEL | CBR |
| Form paid | FORM 1 · ₹1,600 | CBR |
| Title | A System and Method for Adaptive Child Development Routine Generation Using Context-Aware Environmental and Caregiver-Oriented Computational Processing | Form 1 §3, Form 2, CBR |
| Applicant | Ankur Raman / “Ankur raman” | Form 1, Form 2, CBR |
| Inventor | same, declaration “true & first inventor”; applicant is inventor’s assignee or legal representative (standard Form 1 wording — **verify** as applicant = inventor) | Form 1 §9(i) |
| Agent | NA — filed by applicant in person | Form 2 |
| Specification type | **Provisional** | Form 1 attachments: “PROVISIONAL SPECIFICATION — AmyNest — Indian Provisional Patent Application.pdf” |
| Drawings filed | Figures 1–4 (4-sheet drawing PDF from same HTML) | drawing PDF |
| Office | New Delhi (Form 1) | Form 1 |

**IMPORTANT:** These facts do not establish grant, examination outcome, or claim acceptance.

Complete specification under **Section 9(1) / Section 10**: due within **twelve months of 10 May 2026**. This draft does not compute or certify the last calendar day; agent must diary the deadline including any IPO holiday rules.

---

## 3. What was actually disclosed on 10 May 2026 (strongest matter)

The strongest clearly enabled technical contribution in Form 2 is **concurrent-safe environmental-state synchronisation** before routine generation:

- explicit user-preference preservation (sync ref + deferred state);
- shared in-flight meteorological/geolocation retrieval;
- duplicate-request suppression;
- late-resolution discard;
- direct payload injection before UI commit;
- pending-action continuity;
- silent failure.

**Recommended lead independent claim family:** Family A (proposed Claims 1 and 5).

Secondary filed families: hybrid generation + deterministic correction of probabilistic outputs; caregiver transformation; meal-option LM enrichment; energy-profile reorder.

---

## 4. What current production does (do not back-date)

Certified (June 2026) path:

`resolveRoutineGenerationInputs` → `generateRuleBasedRoutine` → `runRoutineIntelligencePipeline` → `repairDinnerAnchor`

Optional: `POST /routines/generate-ai` → LM draft → same deterministic pipeline → safety → rules fallback.

P2 examples (Annex A of the HTML): dinner 60/90/120; AQI 0/15/20; country profile tables; meal banks as default; HTTP 422; trustScore; infant &lt;6 skip; named pipeline order.

---

## 5. Decisions only a registered professional should take

1. **Byte identity:** Download IPO → Application 202611059355 → View Uploaded Documents and confirm the supplied Form 1 / Form 2 / drawings PDFs match the portal. This package treated the applicant-supplied PDFs as the filed material **subject to that confirmation**.
2. **Claim 8(d):** path-agnostic correction (Fig. 3 support) vs restore provisional Claim 6/14 “operative on GAI outputs”.
3. **Claim 4:** keep narrowed web+native vs restore “selected from” including wearable/voice/offline as alternatives.
4. **Claim 18:** independent vs dependent on Claim 5 (3(k) / abstractness).
5. **Claim 17 Jain:** keep prompt-only.
6. Whether to include **any P2 feature** in the complete specification as a *non-priority* additional example (risk: examiner treating it as added matter).
7. **Section 3(k)** legal theory — technical effects listed in HTML §6.12; **no conclusion is offered**.
8. **Prior art / inventive step** — **no search performed**.
9. **Ownership:** no assignment to AmyWorld/AmyNest in Form 1/2. MIT/repo licence is irrelevant to ownership of the application.
10. **Address / email / name capitalisation** (below).
11. Forms: Form 2 complete spec, claims, abstract, drawings Schedule II, Form 5, Form 3 if applicable, Form 28 if claiming small entity/startup, fees.
12. Public product wording (do not instruct engineering until you approve).

---

## 6. Formal discrepancies (agent verification)

| Item | Source A | Source B | Action |
|------|----------|----------|--------|
| House number | Form 1 / CBR: **590/81** | Form 2: **5900/81** | Do not guess |
| PIN | Form 1: 226014 | Form 2: none | Confirm |
| E-mail | Form 1: **ankur6779@gmail.com** | CBR extract: **ankur5776@gmail.com** | Confirm |
| Name | Form 1: Ankur **raman** | Form 2: Ankur **Raman** | Confirm |
| Inventor declaration date/signature | Form 1 blanks on the print | — | Complete on complete-spec filing as required |
| Assignee | Form 1 inventor declaration uses assignee language | Applicant = inventor | Confirm no unintended third-party assignee |

---

## 7. Forms / Schedule II checklist

Mark **complete** only if evidence exists.

| Item | Status |
|------|--------|
| Form 1 (provisional filing) | **Evidenced** (applicant PDF + CBR fee) |
| Form 2 provisional specification | **Evidenced** (37-page PDF) — still confirm ≡ IPO upload |
| Drawings Figs 1–4 as filed | **Evidenced** (drawing PDF) — **not** proven Schedule II compliant (margins, numbering, 30cm×21cm, etc.) |
| Complete specification (this draft) | **Draft only** |
| Proposed claims / abstract | **Draft only** |
| Figures 5–7 | **Draft only** — not filed; Schedule II sheets required if used |
| Form 5 inventorship | **Not evidenced** (provisional note said deferrable) |
| Form 3 foreign filing | **Not evidenced** — if applicable |
| Form 28 small entity/startup | **Not evidenced** (₹1,600 is consistent with natural-person provisional; not proof of Form 28) |
| Assignment | **Not evidenced** |
| Priority convention / PCT | None on Form 1 |
| Fee for complete spec | **Not paid** (this task) |
| English translations / biological / sequence | N/A on current facts |

---

## 8. Public-facing patent status (do not change product copy in this task)

Conservative candidate for **your** approval:

> Indian Patent Application No. 202611059355 filed on 10 May 2026.

Do not use patented / granted / approved. “Provisional patent filed” is not equivalent to grant. Locations of current product strings are listed in `patent/amynest_final_patent_submission_change_log.md` (earlier pass); they were not re-edited.

---

## 9. Suggested review order

1. Confirm portal uploads.  
2. Read Form 2 §§6.2 and 6.4 + Figures 1–4.  
3. Read this draft §§6.2, 6.4, 6.12, Annex A, Claims 1, 5, 8, 14, 17, 19.  
4. Decide new-matter / claim-shift issues.  
5. Commission prior-art and 3(k) analysis.  
6. Produce Schedule II drawings and statutory forms.  
7. File Complete Specification before the Section 9(1) deadline.

---

## 10. Contact facts on the papers (not verified beyond the PDFs)

Mobile on Form 1: 8577989433  
Form 1 e-mail: ankur6779@gmail.com  

Do not treat repository git authors or company brand as applicants.
