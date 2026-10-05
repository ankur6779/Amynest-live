# Final patent submission draft — change log and certification

**Date:** 14 September 2026  
**Status:** TECHNICAL PATENT SUBMISSION DRAFT READY FOR REGISTERED INDIAN PATENT PROFESSIONAL REVIEW  
**Not:** ready to file as-is · not granted · v2/this draft **was not** filed on 10 May 2026

---

## Files in this package (created)

| File | Role |
|------|------|
| `patent/amynest_final_patent_submission_draft.html` | Proposed technical Form 2 / complete-spec **draft** aligned to production |
| `patent/amynest_patent_filing_record.md` | Verified IPO CBR facts only |
| `patent/amynest_filed_vs_current_claim_traceability.md` | Filed vs code vs proposed claims |
| `patent/amynest_final_patent_submission_change_log.md` | This file |

## Files **not** modified

- All application source code, product copy, i18n, Capacitor, Android, Firebase, RevenueCat  
- `patent/amynest_patent_package.html` (v1)  
- `patent/amynest_patent_package_v2.html`  
- Git history · no commit · no push · no IPO filing

---

## 1. IPO filing evidence (new vs prior audits)

Prior audits (repo-only) said filing **NOT VERIFIED**. Applicant then supplied IPO portal screenshots.

| Item | Value |
|------|--------|
| Application No. | 202611059355 |
| CBR | 29076 · 10 May 2026 17:07 |
| Docket | 64202 |
| Temp | TEMP/E-1/64767/2026-DEL |
| Form on receipt | FORM 1 · ₹1,600 Full |
| Title | Adaptive Child Development Routine Generation Using Context-Aware Environmental and Caregiver-Oriented Computational Processing |
| Applicant | Ankur Raman |

**Grant / examination: not established.**

**FILED FORM 2 NOT IN REPOSITORY.** Download from IPO View Uploaded Documents.

---

## 2. What likely corresponds to the 10 May filing (inference labelled)

| Evidence | Conclusion |
|----------|------------|
| CBR title = v1 HTML title (`patent/amynest_patent_package.html` after commit `1d9617e1e`, 8 May 2026) | **Candidate** local spec |
| Downloads Chrome PDF 8 May 21:24: different title, Complete Spec, `[to be filled by attorney]`, Expo, GPT-4o-mini | **Does not match CBR title**; not proven upload |
| v2 / this final HTML | **14 Sep 2026 — after filing** |

Do **not** back-date pipeline/dinner-gap/AQI disclosures to 10 May.

Certified engine freeze: **June 2026** (after filing). Dinner 60/90/120 and country tables may be **new matter** relative to a May specification.

---

## 3. v1 issues → v2 → this final draft

| v1 issue | v2 | This final draft |
|----------|----|------------------|
| LLM-first narrative | Rules-first | Same + IPO cover |
| Wearable present tense | Future only | Same |
| No application number | Placeholder | **202611059355** on cover; **not** claiming this HTML was filed |
| Dinner/AQI/country/pipeline omitted | Disclosed | Disclosed + filed-vs-later flags |
| Product “filed” vs no receipt | Listed, not edited | Same; wording candidate now has a real number |

---

## 4. Filed vs current (material)

See full table in `amynest_filed_vs_current_claim_traceability.md`.

**Present in nearest filing draft and still implemented:** weather handshake (Claims 1–3, 5, 13); age bands (with two classifiers); hybrid *existence* of AI+rules; energy profile; school block; meal enrich *capability*.

**In filing draft, not current production (if v1 HTML/PDF was uploaded):** wearable/voice/offline “is realised”; Expo mobile; OpenAI GPT-4o-mini as named engine; LLM-first primacy; four AI meals as default method.

**In production / this draft, weak or absent in 8 May HTML:** certified rules-first order; pipeline pass list; dinner 60/90/120; country profile tables; AQI 0/15/20; family-intelligence moat; 422 refuse language; Android WebView vs Expo; meal banks as default.

**Counsel strategy (not decided here):** complete specification / amendment / new matter / divisional — **only after downloading Form 2**.

---

## 5. Technical corrections in the proposed draft (vs v1)

- Core: `resolveRoutineGenerationInputs` → `generateRuleBasedRoutine` → `runRoutineIntelligencePipeline` → `repairDinnerAnchor` → validate  
- LLM optional + same pipeline + rules fallback  
- Pipeline ≠ AI  
- Jain: prompt vs sanitizer  
- Platforms: web / iOS Capacitor / Android WebView  
- Figures 1–8 corrected  

Numbers traced: dinner 60/90/120; AQI 300→0 min, ≥200→15, ≥150→20; energy ≥3 samples; infant &lt;6 mo skip; partial regen 36 mo; UAE outdoor 18:30; IN sleep 21:30–22:30; AE sleep 21:30–23:00; US dinner 17:30–19:30.

---

## 6. Claims requiring counsel attention

**4, 12** — drop unimplemented platforms  
**6, 14** — do not require LLM as core  
**8** — titles/templates not notes rewriter  
**9** — banks default  
**11** — Jain prompt ≠ sanitizer  
**8B, 8C, 8D, 15** — may post-date 10 May disclosure; new-matter analysis  

Indicative claims in the HTML are **not legally final**.

---

## 7. Section 3(k) technical framework (not a conclusion)

Possible technical effects to discuss with counsel:

- duplicate environmental-request suppression and late-async overwrite prevention;  
- deterministic dinner-to-sleep geometry and refuse-to-deliver (HTTP 422) independent of model sampling;  
- AQI outdoor duration caps as machine-enforced constraints;  
- shared pipeline over two item sources (rules or LLM) with fallback.

Whether this is “technical contribution” vs “algorithm/computer program per se” is **counsel’s decision**. This package does **not** assert patentability.

Prior-art search: **not performed.** Do not say no prior art exists.

---

## 8. Ownership / applicant

CBR applicant: **Ankur Raman**. Assignee: **none in repo or CBR**. AmyWorld / MIT license: unresolved. Address 590/81 vs 5900/81. **Applicant/Inventor/Assignee legal verification required.**

---

## 9. Schedule II / forms gaps

| Item | Complete? |
|------|-----------|
| Form 1 fee CBR | Evidence of **payment** (screenshot) — form PDF not in repo |
| Form 2 as filed | **No** — IPO download required |
| This draft as proposed complete spec | Draft only |
| Claims as filed | Unknown |
| Schedule II drawings | **No** |
| Form 5 / 28 / POA | **No** |
| Assignment | **No** |

---

## 10. Public-facing patent-status strings (not edited)

Suggested candidate (counsel/product): `Indian Patent Application No. 202611059355 filed`  
Do **not** mass-replace in this task.

| Location | Current copy |
|----------|----------------|
| `artifacts/kidschedule/src/i18n/en.json` `landing.tech_patent_desc` | “Provisional patent filed…” |
| `landing.hero_sub`, `hero_badge_patent` | patent-pending adaptive AI |
| `patent_pending.*` (footer_label, about_tech, settings_note “Provisional Patent Filed”, powered_by, microcopy_*, loading_2, ai_badge, hub_trust, onboarding_card) | Patent Pending / filed |
| `meta_description`, `badge_patent`, `solution_heading`, `trust_patent`, `step2_badge` | Patent Pending |
| `patent-pending-pill.tsx` `PATENT_TRUST_LINE` | “provisional patent filed” |
| `patent-badge.tsx` | i18n map |
| generate.tsx, routines/index, environment, onboarding, parenting-hub, parent-profile, social-landing, cinematic-landing, parent-command-center, spotlight-tour | patent_pending keys / “Patent Pending” |
| `public/__nav_preview.html` | Patent Pending |
| `artifacts/amynest-splash/.../Scene6.tsx` | Patent Pending Technology |
| `social-assets-manifest.json` | Patent Pending |
| `content-engine/golden-scripts/030-routine.md`, `seeds.ts` | patent-pending |
| App Store listing (external) | patent-pending (diligence docs) |
| Acquisition markdown | previously said filing unverified — now superseded by CBR for **status**, not for 12,000-family claims |

String `202611059355` was **not** in product copy.

---

## 11. Unresolved counsel questions

1. Download and archive Form 2 for 202611059355.  
2. Provisional vs complete? If provisional, Complete Spec calendar.  
3. New matter: June 2026 dinner/AQI/pipeline vs May 2026 filing.  
4. Claim 4/6/9/11/12/14 narrowing.  
5. 3(k) and prior art.  
6. Assignment / AmyWorld / MIT.  
7. Address 590 vs 5900.  
8. Public copy wording.  
9. Schedule II sheets.  
10. Two age classifiers.

---

## POST-REVISION CERTIFICATION

| Gate | /100 | Note |
|------|------|------|
| 1. Production implementation accuracy | 92 | Matches certified engine; Jain/age flags |
| 2. Filed-document reconciliation | 70 | CBR verified; **Form 2 missing locally** — correctly flagged, not fabricated |
| 3. Specification accuracy | 90 | Rules-first draft |
| 4. Claim support | 80 | Indicative; 8B/8C may post-date filing |
| 5. AI architecture accuracy | 93 | Optional LLM |
| 6. Safety disclosure | 88 | Two stacks |
| 7. Personalization disclosure | 85 | Heuristics / prompt weights |
| 8. Figure accuracy | 86 | SVG not Schedule II |
| 9. Section 3(k) technical readiness | 75 | Framework only |
| 10. Filing-record accuracy | 94 | Screenshot-limited; no invented exam status |
| 11. Ownership documentation | 55 | CBR name only |
| 12. Counsel handoff readiness | 88 | Agent can see filed vs current vs proposed |

**Overall: 83 / 100**

### P0 / P1 / P2

**P0 = 0** for this *package* (no fabricated Form 2; no “granted”; no “v2 was filed 10 May”).

**P1 = 10** — download Form 2; spec type/deadline; new-matter on 8B/8C/pipeline; claims 4/6/9/11/12/14; 3(k)/prior art; assignment; Schedule II; public copy; age classifiers; Jain sanitizer.

**P2 = 4** — claim overlap 1/5/13; HTML pagination; Redis semaphore exclusion; extra cuisines.

If Form 2 were silently invented, that would be P0. It was not.

---

## Final status

**TECHNICAL PATENT SUBMISSION DRAFT READY FOR REGISTERED INDIAN PATENT PROFESSIONAL REVIEW**

Not ready to file/amend at IPO without: uploaded-spec comparison, claim finalisation, drawings, and counsel legal analysis.
