# Section 10 draft — independent self-audit

**Document audited:** `patent/amynest_section10_complete_specification_draft.html` plus supporting matrices.  
**Auditor role:** second pass after generation (same session, against Form 1/Form 2/drawings PDFs and production code).  
**Not a legal opinion. Not an examination. Not “ready to file”.**

Scores: **PASS** / **CONDITIONAL** / **FAIL**.

---

## Checklist

| # | Item | Score | Notes |
|---|------|-------|-------|
| A | Filing facts | **PASS** | 202611059355 · CBR 29076 · 10 May 2026 · ₹1,600 · Delhi · title match |
| B | Applicant/inventor | **PASS** | Ankur Raman; Form 1 prints “Ankur raman” — flagged, not silently normalised |
| C | Title | **PASS** | Identical to Form 1 §3 / Form 2 / CBR |
| D | Priority date | **PASS** | 10 May 2026 used; 08/05/2026 treated as HTML print date only |
| E | Form 1 / Form 2 reconciliation | **CONDITIONAL** | Provisional type now evidenced on Form 1 attachments. Address 590/81 vs 5900/81 and e-mails 6779 vs 5776 unresolved. Portal byte-identity of the supplied PDFs not independently downloaded in this task |
| F | Filed disclosure | **PASS** | Core §§6.1–6.8 track Form 2; hybrid AI+rules preserved; env-sync not diluted |
| G | Current code | **PASS** | Primary generate path, generate-ai, weather handshake, dinner/AQI/Jain/age split verified in repo; cited as implementation evidence, not as 10 May facts |
| H | Priority support | **CONDITIONAL** | Family A STRONG. Claim 8(d) path-agnostic correction is a possible shift from provisional Claims 6(d)/14 despite Fig. 3 “both paths” |
| I | New matter | **PASS** | Dinner 60/90/120, AQI, banks-as-default, 422, pipeline order, trustScore kept out of priority claims and core body; Annex A labelled |
| J | Claim support | **CONDITIONAL** | 1–7, 9, 11, 16, 19–20 well supported. 8(d), 10, 15, 17 need agent |
| K | Antecedent basis | **CONDITIONAL** | Claim 5(e) “the derived classification”; Claim 8 “both in combination” |
| L | AI terminology | **PASS** | LM = probabilistic interchangeable component; not a safety guarantee; no vendor limitation |
| M | Deterministic terminology | **PASS** | Rules vs constraint/correction vs LM distinguished; pipeline not called an LLM |
| N | Environmental synchronisation | **PASS** | Dual flag, in-flight, late discard, inject, pending-action, silent fail all present |
| O | Figures | **CONDITIONAL** | Figs 1–4 subject-matter aligned; Fig. 2 caption no longer matches filed caption (intentional consistency fix); Figs 5–7 new illustrations of filed text; Schedule II not produced |
| P | Section 3(k) framing | **PASS** | Technical-effect list; explicit refusal to conclude patentability |
| Q | Platform claims | **PASS** | Narrowed; filed inconsistency documented; wearable/voice/offline dashed |
| R | Later-developed features | **PASS** | Dedicated register; not disguised as 10 May disclosure |
| S | Ownership | **CONDITIONAL** | Applicant=inventor on papers; no assignment; AmyWorld/MIT flagged |
| T | Public-status wording | **PASS** | Recommendation only; product copy not edited; no “granted” |
| U | Abstract | **PASS** | 139 words; technical; no marketing; within common 150-word practice — agent to confirm Rule 13(7) as in force |
| V | Technical effects | **PASS** | Tied to env-sync and deterministic control of LM outputs |
| W | Internal consistency | **CONDITIONAL** | Claim 8 path-agnostic vs Claim 19 LM-specific is intentional dual family; Fig. 3 vs production primacy explained |

**FAIL count: 0**

---

## P0 / P1 / P2

### P0 blockers (would forbid calling the *package* a professional handoff)

None.

The draft does not: allege grant; treat v2 as the 10 May filing; insert dinner/AQI numbers into priority claims; name OpenAI as the invention; claim wearable/voice/offline as currently implemented; or invent missing statutory forms as complete.

### P1 — agent must resolve before filing

1. Confirm applicant PDFs ≡ IPO uploaded bytes.  
2. Address 590/81 vs 5900/81.  
3. E-mail ankur6779 vs ankur5776.  
4. Name capitalisation / Form 1 inventor-assignee boilerplate.  
5. Claim 8(d) claim-shift vs Fig. 3.  
6. Jain Claim 17 prompt-only vs any deterministic reading.  
7. Age-band table vs feeding/safety classifiers.  
8. Caregiver Claim 10 vs `simplifyForHandler`.  
9. Claim 15 (template meals) P1 scope.  
10. Claim 5 antecedent; Claim 18 independence.  
11. Schedule II drawings (filed 1–4 + new 5–7).  
12. Form 5 / Form 28 / assignment / complete-spec fees.  
13. Section 3(k) legal theory and **prior-art search (not done)**.  
14. Whether any P2 item may appear as a *labelled non-priority* example.

### P2 — documented, not blocking this technical draft

1. P2 production mechanisms exist and are catalogued.  
2. Product/i18n patent strings not updated (by instruction).  
3. Computer-readable-medium claim family not drafted.  
4. HTML-to-PDF print is convenience only; IPO requires prescribed formats.  
5. Numeric energy sample count 3 not used as a claim limitation.

**P0 = 0 · P1 = 14 · P2 = 5**

---

## Dimension scores (0–100)

| Dimension | Score | Comment |
|-----------|------:|---------|
| 1 Production implementation accuracy | 90 | Handshake, generate vs generate-ai, Jain split, age split, platforms checked |
| 2 Filed-document reconciliation | 92 | Form 1/2/drawings now in hand; portal byte-check still agent |
| 3 Specification accuracy | 88 | Hybrid preserved; P2 boxed; Claim 8(d) is the residual tension |
| 4 Claim support | 82 | Family A strong; 8/10/15/17 conditional |
| 5 AI architecture accuracy | 92 | Optional LM; not the core; not a safety engine |
| 6 Safety disclosure | 85 | Filed allergy/school-block/env substitution; AQI/422 not back-dated |
| 7 Personalization disclosure | 84 | Energy profile, caregiver, prior-day as filed; trustScore/learning-weights P2 |
| 8 Figure accuracy | 84 | Fig. 3 fixed; Fig. 2 caption diverges from filed caption on purpose; Schedule II open |
| 9 Section 3(k) technical readiness | 78 | Framework only; no case-law application |
| 10 Filing-record accuracy | 94 | Provisional now evidenced; fee/CBR/title consistent |
| 11 Ownership documentation | 70 | Papers name natural person; no assignment file |
| 12 Counsel handoff readiness | 90 | Decisions listed; not “ready to file” |

**Overall technical readiness: 86 / 100**

(Previous handoff without Form 2 PDF scored ~83 with weaker reconciliation. This pass improves filing-document identity and priority locking; claim-shift conservatism keeps the overall short of the 90s.)

---

## Final gate

**A — READY FOR REGISTERED PATENT PROFESSIONAL FINAL REVIEW**

Equivalent statement required by the brief:

**TECHNICAL COMPLETE SPECIFICATION DRAFT READY FOR REGISTERED INDIAN PATENT PROFESSIONAL REVIEW.**

**Not** “ready to file”. **Not** “patent granted”. **Not** “the v2 / this HTML was filed on 10 May 2026”.

If the agent rejects Claim 8(d)’s path-agnostic wording, revert independent Family B correction language to provisional Claim 6(d)/14 (GAI outputs only) — a one-paragraph specification/claim edit, not a rewrite of Family A.
