# FINAL filing record + formalities checklist

**Document type:** verified facts + checklist. Does not file, amend, or grant anything.  
**Hardened claims / gate:** `patent/amynest_FINAL_HARDENED_CLAIMS.md`, `patent/amynest_FINAL_FILING_READINESS.md`.

**FORMAL FILING = FAIL** until address/email reconciliation, Form 5, Form 28 (if used), assignment (if any), Schedule II sheets, complete-spec fee, and portal-byte identity are actually resolved. This checklist does **not** invent those answers.

Complete specification under Section 9(1)/10: within twelve months of 10 May 2026. This checklist **does not invent** the last calendar day (holidays / Rules as in force). **REQUIRES REVIEW.**

---

## Verified filing record

| Field | Value | Source |
|--------|--------|--------|
| Application | **202611059355** | CBR / portal screenshots previously supplied |
| CBR | **29076** | CBR |
| CBR date | **10 May 2026**, 17:07:00 | CBR |
| Docket | **64202** | CBR |
| Reference | **TEMP/E-1/64767/2026-DEL** | CBR |
| Form paid | FORM 1 · Full · **₹1,600** | CBR |
| Title | A System and Method for Adaptive Child Development Routine Generation Using Context-Aware Environmental and Caregiver-Oriented Computational Processing | Form 1 §3, Form 2, CBR |
| Applicant | Ankur Raman / “Ankur raman” | Form 1, Form 2, CBR |
| Inventor | Ankur Raman / “Ankur raman” | Form 1, Form 2 |
| Filed by | Applicant in person (agent NA) | Form 2 |
| Specification type | **Provisional** (Section 9) | Form 1 attachments: “PROVISIONAL SPECIFICATION — AmyNest — Indian Provisional Patent Application.pdf” |
| Drawings filed | Figures 1–4 | Drawing PDF (4 sheets from same HTML print) |
| Office | New Delhi | Form 1 |
| HTML print time on Form 2 | 08/05/2026 21:43 | Form 2 footer — **not** the filing date |

**Filed application; grant/examination outcome not established by the supplied evidence.**

Never: patented / granted / approved.

Complete specification under Section 9(1)/10: within twelve months of 10 May 2026. This checklist does not certify the last calendar day (holidays). **REQUIRES REVIEW.**

Portal byte-identity of the applicant-supplied PDFs vs IPO “View Uploaded Documents”: **REQUIRES REVIEW** (treated as the filed material subject to that confirmation).

---

## OWNERSHIP_AND_FORMALITIES_REVIEW

Do not silently normalise.

| Item | Value A | Value B | Status |
|------|---------|---------|--------|
| House no. | Form 1 / CBR: **590/81** | Form 2: **5900/81** | **REQUIRES REVIEW** |
| PIN | Form 1: 226014 | Form 2: none | **REQUIRES REVIEW** |
| E-mail | Form 1: **ankur6779@gmail.com** | CBR extract: **ankur5776@gmail.com** | **REQUIRES REVIEW** |
| Name | Form 1: Ankur **raman** | Form 2: Ankur **Raman** | **REQUIRES REVIEW** |
| Mobile | Form 1: 8577989433 | — | VERIFIED on Form 1 print only |
| Assignee / AmyWorld / AmyNest Inc. | Not on Form 1/2 | Repo brand / MIT `package.json` | **MISSING** assignment. Do not assert corporate ownership |
| Inventor declaration dates/signatures | Blank on Form 1 print | — | **MISSING** on the print; complete as required for complete spec |
| Form 1 §9(i) “applicant is inventor’s assignee” boilerplate | Present (standard form) | Applicant appears to be inventor | **REQUIRES REVIEW** that this does not imply a third party |

---

## Forms / Schedule II checklist

| Item | Status |
|------|--------|
| Form 1 (provisional filing) | **VERIFIED** (applicant PDF + CBR fee) |
| Form 2 provisional specification (37 pp.) | **VERIFIED** as supplied PDF — portal match **REQUIRES REVIEW** |
| Filed drawings Figs 1–4 | **VERIFIED** as supplied PDF — Schedule II compliance (size, margins, numbering) **REQUIRES REVIEW** |
| Complete specification (this draft) | Draft only — **MISSING** as an IPO upload |
| Claims (22 hardened claims) | Draft only — **MISSING** as filed complete-spec claims. See `amynest_FINAL_HARDENED_CLAIMS.md` |
| Abstract (141 words) | Draft only — Rule 13(7) confirmation **REQUIRES REVIEW** |
| Additional Figs 5–7 | Draft SVG — **MISSING** as Schedule II sheets |
| Form 5 declaration of inventorship | **MISSING** (provisional note said deferrable to complete spec) |
| Form 3 statement of foreign filings | **NOT APPLICABLE — VERIFY** (Form 1 convention/PCT blanks) |
| Form 26 / POA if agent appointed | **NOT APPLICABLE — VERIFY** (filed in person; complete spec may use an agent) |
| Form 28 small entity / startup | **MISSING** (₹1,600 consistent with natural-person provisional; not proof of Form 28) |
| Natural-person status | **REQUIRES REVIEW** (applicant is a natural person on the papers) |
| Assignment | **MISSING** |
| Priority convention / PCT | None on Form 1 — **NOT APPLICABLE — VERIFY** |
| Fee/payment evidence (provisional) | **VERIFIED** ₹1,600 CBR |
| Complete-spec additional fee | **MISSING** (not paid in this task) |
| Sequence listing / biological | **NOT APPLICABLE — VERIFY** |
| Startup DPIIT / MSME docs | **MISSING** if Form 28 will be used |

Do not fabricate missing forms.

---

## Public patent-status strings (NOT modified)

Candidate wording for **COUNSEL / FINAL COPY REVIEW** only:

> Indian Patent Application No. 202611059355 filed on 10 May 2026.

Do not use patented / granted / approved. “Provisional patent filed” is not grant.

| Location | Current text (abridged) | Recommended action |
|----------|-------------------------|-------------------|
| `artifacts/kidschedule/src/i18n/en.json` `landing.tech_patent_desc` | “Provisional patent filed for adaptive environmental orchestration…” | Replace only after counsel sign-off |
| `en.json` `landing.hero_sub` | “patent-pending adaptive AI engine” | Same |
| `en.json` `patent_pending.*` (footer_label, about_tech, settings_note, powered_by, microcopy_*, loading_2, ai_badge, hub_trust, onboarding_card) | “Patent Pending Technology” / “Provisional Patent Filed” | Same |
| `en.json` `meta_description`, `badge_patent`, `solution_heading`, `trust_patent`, `step2_badge`, footer | “patent pending” / “Patent Pending AI Parenting Platform” | Same |
| `patent-pending-pill.tsx` `PATENT_TRUST_LINE` | “patent-pending … provisional patent filed” | Same |
| `patent-badge.tsx` | uses `patent_pending.*` keys | Same |
| `cinematic-landing/sections.tsx` | “patent-pending adaptive AI” | Same |
| `social-landing.tsx` footer | “Patent Pending” | Same |
| `environment.tsx`, `parent-profile.tsx`, `onboarding.tsx`, `routines/index.tsx`, `routines/generate.tsx`, `parenting-hub.tsx`, `parent-command-center.tsx`, `spotlight-tour.tsx` | i18n patent_pending keys | Same |
| `artifacts/amynest-splash/.../Scene1.tsx`, `Scene6.tsx` | “Patent Pending Technology” | Same |
| `content-engine/golden-scripts/030-routine.md` | “described as patent-pending” | Same |
| `content-engine/brand/feature-discovery.ts` | keyword “patent pending” | Same |
| App Store listing (external; diligence docs) | “patent-pending” | Same |
| String `202611059355` in **product** copy | **Not found** | May add after counsel approval |

Product/i18n files were **not** edited in this task.
