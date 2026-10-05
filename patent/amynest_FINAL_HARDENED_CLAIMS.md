# FINAL hardened claims — App. 202611059355

**Draft:** `patent/amynest_FINAL_COMPLETE_SPECIFICATION.html`  
**Date:** 14 September 2026  
**Not a legal opinion. Not a 3(k) clearance. Not a grant. Not an IPO filing.**

This is the claim architecture to file in the complete specification, subject to remaining formal blockers in `amynest_FINAL_FILING_READINESS.md`.

---

## Mapping: prior 24-claim set → hardened 22-claim set

| Old # | Old role | New # | Action |
|-------|----------|-------|--------|
| 1 | Independent env-sync system | **1** | **HARDENED** (preamble, 1(a) immediate authority, 1(b) no competing ops, 1(f)–1(g) designated value) |
| 2 | Silent fail | **2** | Keep |
| 3 | Pending-action | **3** | Keep (not imported into Claim 1) |
| 4 | suitable/limited/unsuitable | **4** | Keep |
| 5 | Atomic dual update | **5** | Keep |
| 6 | Web + native | **6** | Keep |
| 7 | Independent env-sync method | **7** | **HARDENED** (same relationship; skip-if-authoritative is 7(c)) |
| 8 | Shared in-flight | **8** | Keep |
| 9 | Inject without deferred commit | **9** | Keep (now “designated authoritative classification”) |
| 10 | Independent hybrid | **10** | Keep secondary; 10(c) recites rule path **without** GAI |
| 11 | Allergy / cuisine / dedup | **11** | Keep |
| 12 | Correction also on **rule-based** artefact | — | **DROPPED** (Fig. 3 vs prov. 6(d) claim-shift) |
| 13 | Energy reorder | **12** | Renumber |
| 14 | Caregiver adapt text and/or selection | **13** | **TIGHTENED** to rewrite routine-item instruction notes (§6.6) |
| 15 | Environmental substitution | **14** | Renumber |
| 16 | Anti-repetition | **15** | Renumber |
| 17 | Template meal anchors | **16** | Renumber |
| 18 | Combine Claim 1 modules + Claim 10 engine | — | **DROPPED** (antecedent / multiple dependent) |
| 19 | Independent LM-correction method | **18** | Keep **secondary** independent |
| 20 | Env substitution on LM-correction | **19** | Depends from 18 |
| 21 | Independent meal LM method | **20** | Keep **tertiary** independent |
| 22 | Cuisine set | **21** | Depends from 20 |
| 23 | Jain **prompt** constraint | **22** | Depends from 20; **not** a sanitizer |
| 24 | Independent dual-state coordination | **17** | **CONVERTED** to dependent on Claim 7 |

---

## FINAL INDEPENDENT CLAIMS

**1, 7, 10, 18, 20**

| Independent | Role | File as |
|-------------|------|---------|
| **1** | System: authoritative environmental classification → generation process | **LEAD** |
| **7** | Method counterpart of Claim 1 | **LEAD method** |
| **10** | Hybrid generation; GAI-output correction; rule path without GAI | **SECONDARY** — do not promote |
| **18** | Deterministic correction of LM outputs | **SECONDARY / divisional candidate** |
| **20** | Optional Phase B meal-option LM method | **TERTIARY / divisional candidate** |

---

## CLAIMS DROPPED

| Old claim | Reason |
|-----------|--------|
| **12** | Provisional Claim 6(d) recites correction operative on generative-AI outputs. Figure 3 says a layer is applied to both paths. Claiming selected constraint steps on a **rule-based artefact** as a 10 May right is a claim-shift / fair-basis fight. Figure 3 remains in the description. |
| **18** | Multiple dependent combining Families A and B. Antecedent fails if depending from Claim 10 (“the ambient-condition classification module of claim 1”). Weak technical contribution beyond stacking two independents. |

---

## CLAIMS CONVERTED TO DEPENDENT

| Old claim | New claim | From → to |
|-----------|-----------|-----------|
| **24** | **17** | Independent dual-state method → **dependent on Claim 7** |

Claim 14 was not converted; it was **tightened in place** (now Claim 13).

---

## CLAIM 1 FINAL TECHNICAL CORE

Claim 1 is a coordinated computational protocol that supplies **one** authoritative outdoor-suitability classification as an input to a routine-generation call chain, under concurrent triggers and late-resolving detection.

Functional relationship (all supported by Form 2 §§6.2.1–6.2.4):

1. An explicit environmental choice is designated **immediately** as authoritative in a synchronously readable data structure (deferred structure remains for UI re-rendering).
2. An asynchronous environmental detection result is **conditionally** obtained: detection is initiated only where a user-selected value is not already authoritative.
3. Concurrent generation triggers **share at most one** in-flight detection and are prevented from creating competing detection operations.
4. When the asynchronous result resolves, the system **re-evaluates** the synchronously readable structure.
5. A stale derived classification is **discarded** and is prevented from superseding the explicit user-selected value if that value became authoritative during the window.
6. The **designated** authoritative value (user-selected if authoritative, otherwise derived) is injected into the generation call chain **independently of** whether deferred UI state has been committed.

**Not in Claim 1:** pending-action continuity (Claim 3); permission-gated I/O / silent fail (Claim 2); named suitable/limited/unsuitable (Claim 4); UI-latency as a limitation; hardware; vendor models.

---

## Hostile examiner tests (Claim 1)

### A. Breadth / design-around — CONDITIONAL FAIL

A competitor can use a single authoritative store (no dual structure), a mutex instead of a “registry,” or a different UI framework, and argue non-infringement of 1(a)/1(b) form. Dual-state is still partly a stale-closure workaround. Hardening reduced UI-idiom words (“touched flag”) but did not eliminate the design-around. Do not rest the whole case on “ref + useState.”

### B. Abstraction / 3(k) — CONDITIONAL FAIL (best defensible position)

An examiner applying CRI analysis can still strip the claim to: *ignore an old async result if the user changed a preference; also don’t start two fetches; pass a parameter into a scheduler.* Elements (c)–(e) may be treated as insignificant post-solution activity (get weather). The combination is the only answer; it is not a complete answer. **No hardware was added.** Preamble is now “supplying an authoritative environmental classification to a routine-generation process,” not “adaptive routine generation,” to avoid a business-method overlay. That is framing, not a 3(k) clearance.

### C. Technical-effect — PASS as a combination (no benchmarks)

Supported effects (Form 2, no measurements):

- suppression of duplicate concurrent environmental-detection operations;
- prevention of a stale asynchronously derived classification from superseding an explicit user-selected environmental value;
- supply of that same designated classification to downstream generation independently of deferred UI commit;
- prevention of inconsistent environmental inputs between deferred UI state and the generation computation;
- preservation of state consistency across an asynchronous resolution boundary.

**Not used as primary Claim 1 effect:** “reduces UI synchronisation latency.”

### D. Provisional-support — PASS for the Claim 1 combination

| Relationship element | Form 2 / prov. |
|----------------------|----------------|
| Immediate authority of explicit choice in sync structure | §6.2.1; prov. 1(a), 13 |
| Conditional detection (skip if already authoritative) | §6.2.1; prov. 5(c) |
| At-most-one shared in-flight | §6.2.2; prov. 1(b), 5A |
| Geo + timeout + remote meteo | §6.2.4; prov. 1(c)(d) |
| Map to fixed outdoor-suitability set | §6.2.4; prov. 1(e) |
| Late re-evaluation + discard | §6.2.3; prov. 1(f) |
| Inject designated value independently of deferred commit | §6.2.4; prov. 1(g), 5B |

Skip-if-already-authoritative is explicit in **Claim 7(c)** (method) and in **Claim 1(b)** (detection initiated only where not already authoritative). It is fairly based on the provisional description even if original provisional Claim 1 recited late-window discard more prominently than skip-at-start.

### E. Clarity — PASS

- “The derived classification” in 1(f) is the classification derived in 1(e).
- 1(g) injects the **designated** authoritative classification (output of the preservation test), not an undefined “preserved” value.
- Pending-action and permission I/O are not mixed into Claim 1.
- Named 3-way classes remain Claim 4.

---

## CLAIM 1 3(k) POSITION

**Strongest defensible argument**

Claim 1 is not a parenting business method and is not “if the user changes a preference, ignore an old response.” It is a client-side I/O-and-state protocol that (i) coalesces concurrent geolocation/meteorological operations, (ii) maintains an execution-turn-authoritative preference structure against a deferred UI structure, (iii) revalidates after asynchronous resolution, and (iv) forces the generation call chain to consume the same designated classification that the protocol just decided, without waiting for a UI commit that may still be stale. The technical problem is inconsistent generation-input under concurrent async I/O. The mechanism is the cooperating set of 1(a)–(g). The effect is deterministic, non-racing environmental input to a downstream computational process.

**Remaining vulnerability (why this is not certified)**

The entire protocol executes as software on a conventional client. Request coalescing and stale-response ignore are ordinary computer techniques. There is no control of a technical process outside information handling, no special hardware, and no measured physical effect. CRI analysis may still conclude “computer program per se / algorithm.” The preamble change and relationship language improve the **argument**; they do not change the **nature** of the implementation.

**Do not say:** patentable; 3(k) cleared; guaranteed.

---

## Claim 10 / 18 / 20 — AI families

An examiner **can** characterise:

> LLM generation + known personalization constraints + known deterministic correction.

That characterisation fits **Claim 18** and **Claim 20** almost verbatim. It fits the GAI limb of **Claim 10**. The only filed technical distinction in Claim 10 is that the **rule-based path can produce a routine artefact without invoking the generative module** (§6.4.1). That distinction is recited in 10(c). It is **not** enough to promote Claim 10 over Claim 1. Generic AI personalization is not treated as inventive on this record.

Do not rewrite 10(d) or 18(a) onto a rule-based artefact (that would reintroduce dropped old Claim 12).

---

## Per-claim internal register (hardened set)

| # | I/D | Prov. support | Complete spec | Technical contribution | 3(k) | Inventive-step | Clarity | Recommendation |
|---|-----|---------------|---------------|------------------------|------|----------------|---------|----------------|
| 1 | I-sys | YES | YES | Coordinated env-input protocol | HIGH remaining | HIGH remaining | PASS | **FILE as lead** |
| 2 | D:1 | YES | YES | Non-blocking degradation | MED | MED | PASS | FILE |
| 3 | D:1 | YES | YES | Continuity across confirm dialogue | MED | MED | PASS | FILE (not into Claim 1) |
| 4 | D:1 | YES | YES | 3-way map | MED | HIGH (obvious table) | PASS | FILE; never add AQI |
| 5 | D:1 | YES §6.9 | YES | Atomic dual update | HIGH | HIGH | PASS | FILE (thin) |
| 6 | D:1 | YES (narrowing of prov. 4) | YES | Web+native identity | MED | MED | PASS | FILE |
| 7 | I-meth | YES | YES | Method of Claim 1 | HIGH | HIGH | PASS | **FILE as lead method** |
| 8 | D:7 | YES | YES | Shared in-flight | MED | HIGH | PASS | FILE |
| 9 | D:7 | YES | YES | Inject without deferred commit | MED | MED | PASS | FILE |
| 10 | I-sys | YES | YES | Hybrid; rule path w/o GAI; GAI correction | HIGH | HIGH | PASS | FILE **secondary only** |
| 11 | D:10 | YES | YES | Allergy/cuisine/dedup on GAI output | HIGH | HIGH | PASS | FILE |
| 12 | D:10 | YES | YES | Energy reorder if min samples | HIGH | HIGH | PASS | FILE; no “3” |
| 13 | D:10 | YES §6.6 | YES | Rewrite instruction notes by profile | HIGH | HIGH | PASS | FILE tightened |
| 14 | D:10 | YES | YES | Indoor swap / duration | MED | HIGH | PASS | FILE |
| 15 | D:10 | YES | YES | Prior-day prompt + post-check | HIGH | HIGH | PASS | FILE |
| 16 | D:10 | YES §6.4.1 | YES | Template meal anchors | HIGH | HIGH | PASS | FILE; not banks-as-default |
| 17 | D:7 | YES prov. 13 | YES | Dual-structure authority vs render | HIGH if independent | HIGH | PASS | FILE as **dependent** |
| 18 | I-meth | YES | YES | LM validator chain | HIGH | HIGH | PASS | FILE secondary **or divisional** |
| 19 | D:18 | YES | YES | Then substitution | MED | HIGH | PASS | FILE if 18 filed |
| 20 | I-meth | YES as optional Phase B | YES | Constrained meal LM | HIGH | HIGH | PASS | FILE tertiary **or divisional** |
| 21 | D:20 | YES | YES | Cuisine set | HIGH | HIGH | PASS | FILE if 20 filed |
| 22 | D:20 | YES as **prompt** | YES as prompt | Jain prompt exclusions | HIGH | HIGH | PASS | FILE prompt-only; **never sanitizer** |

---

*End of hardened-claims memo. No commit. No push. No IPO filing.*
