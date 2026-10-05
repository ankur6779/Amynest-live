# FINAL priority vs post-filing feature register

**Application:** 202611059355  
**Filed Form 2:** 37-page provisional, print 08/05/2026 21:43, **IPO filing 10 May 2026**  
**Claim numbers:** hardened / submission 22-claim set.  
Page = Form 2 print `n/37`.

Do **not** use the phrase “post-filing features cannot appear in the complete specification.”

---

## Category A — 10 MAY 2026 PRIORITY CANDIDATE

Fairly supported by the provisional. May be claimed with the 10 May 2026 date.

### Independent Claim 1 (system) — necessary limitations

| Limitation | Provisional support | Page |
|------------|---------------------|------|
| Dual-structure preference state; explicit engagement immediately designates user-selected value as authoritative in the synchronously readable structure | Form 2 §6.2.1; prov. Claims 1(a), 13 | 10–11, 19–20, 24 |
| Detection initiated only where user value is not already authoritative | Form 2 §6.2.1; prov. Claim 5(c) | 10–11, 20–21 |
| At most one shared in-flight detection; no competing operations | Form 2 §6.2.2; prov. Claims 1(b), 5A | 11, 19–21 |
| Geolocation provider with configurable timeout | Form 2 §6.2.4; prov. Claim 1(c) | 12, 19–20 |
| Remote meteorological service; weather code / temperature / precipitation / wind | Form 2 §6.2.4; prov. Claim 1(d) | 12, 19–20 |
| Map received parameters to a fixed outdoor-suitability set | Form 2 §6.2.4; prov. Claim 1(e) | 12, 19–20 |
| After resolve, re-evaluate sync structure; discard derived class so it does not supersede user value | Form 2 §6.2.3; prov. Claim 1(f) | 11–12, 19–20 |
| Designate authoritative class and inject independently of deferred UI commit | Form 2 §6.2.4; prov. Claims 1(g), 5B | 12, 20–21 |

Skip-if-already-authoritative is express in Claim 7(c) and Claim 1(b). It is fairly based on Form 2 §6.2.1 / provisional Claim 5(c) even if original provisional Claim 1 emphasised late-window discard.

### Independent Claim 7 (method)

Same protocol as sequential steps. Support: Form 2 §6.2; provisional Claim 5, including 5(c), 5A, 5B. Pages 10–13, 20–21.

### Independent Claim 10 (secondary hybrid system)

| Limitation | Provisional support | Page |
|------------|---------------------|------|
| Age-band engine and band-specific templates | Form 2 §6.3; prov. Claim 6(a) | 13–14, 22 |
| Date-seeded shuffle | Form 2 §6.4.1; prov. Claim 6(b) | 14, 22 |
| Rule path without GAI, or GAI module | Form 2 §6.4.1–6.4.2; prov. Claim 6(c) | 14–15, 22 |
| Correction on GAI output: wake-time anchoring and school-block exclusion | Form 2 §6.4.3; prov. Claim 6(d) | 15, 22 |

Not Category A if rewritten as later rules-first certified order or as language-model-to-rules fallback architecture.

### Independent Claim 18 (tertiary LM-correction method)

Provisional Claim 14; Form 2 §6.4.3. Pages 15, 24–25. Step (a) is a language-model output. Not Category A if converted to a rule-based artefact.

### Independent Claim 20 (tertiary optional meal method)

Provisional Claim 9; Form 2 §6.7 Phase B. Pages 16–17, 23. Optional, not a default meal-bank architecture.

### Category A dependents (summary)

2 silent fail (§6.2.5); 3 pending-action (§6.2.4); 4 three-way classes (§6.2.4 table); 5 atomic dual update (§6.9); 6 web+native (narrowing of prov. Claim 4); 8 shared in-flight; 9 inject without deferred commit; 11 allergy/cuisine/dedup; 12 energy reorder (predetermined minimum; not “3”); 13 caregiver instruction-note rewrite (§6.6); 14 substitution (§6.5); 15 anti-repetition; 16 template meal anchors (§6.4.1); 17 dual-structure dependent on 7 (prov. 13); 19 substitution after 18; 21 cuisine set (prov. 10); 22 Jain **prompt** (prov. 11; Fig. 4).

---

## Category B — LATER / CURRENT DEVELOPMENT

May appear in the complete specification as a later or current embodiment. **Not** entitled to 10 May 2026 unless fair basis is shown. **Not** recited in Claims 1, 7, 10, 18, or 20.

| Feature | Complete-spec treatment | 10 May claim? |
|---------|-------------------------|---------------|
| Dinner–bed 60/90/120 | §6.16 later/current | No |
| AQI 0/15/20 | §6.16 | No |
| UAE outdoor clock | §6.16 | No |
| Meal banks as default | §6.16; Claim 16 is templates only | Default status No |
| HTTP 422 | §6.16 | No |
| LM→rules fallback as architecture | §6.16 | No |
| trustScore | §6.16 | No |
| Learning weights (prompt-level correlations) | §6.16 | No |
| Infant &lt;6 skip | §6.16 | No |
| Named pipeline order | §6.16 | No |
| Vendor model names | §6.16 | No |
| Capacitor / WebView product names | §6.16; Claim 6 is web+native only | Not as named limitations |
| Production title-prefix caregiver simplification | narrower embodiment of §6.6 | Not broader than filed rewrite policies |
| UI tokens yes/limited/no | embodiment of Claim 4 classes | Same three-way set is A |

---

## Category C — NOT CLAIMED / EXCLUDED

| Item | Reason |
|------|--------|
| Old Claim 12 (correction of a rule-based artefact as a 10 May right) | Figure 3 vs provisional 6(d) claim-shift |
| Old combination Claim 18 (Claim 1 or 10) | Antecedent / multiple dependent |
| Old Claim 24 as an independent | Converted to Claim 17 dependent on 7 |
| Deterministic Jain root parser / code-level Jain enforcement | Not in the provisional as an engine; prompt only |
| Rules-first certified pipeline as the original invention | Post-filing architecture |
| Fake hardware added for Section 3(k) | Not disclosed as essential |
| Wearable / voice / offline as operative Claim 6 platforms | Alternative / not asserted as operative original clients |
| Latency as a Claim 1 limitation | Not used |
| Pending-action or permission-gated I/O inside Claim 1 | Those are Claims 3 and 2 |

---

## Architecture timelines (do not merge)

**FILED 10 May 2026**  
environmental synchronisation → path selector (generative module or rules) → deterministic correction (Figure 3: layer after both paths; generative path may receive the full chain)

**CURRENT PRODUCTION (later / current)**  
resolve inputs → rule-based generation → named intelligence pipeline → dinner-anchor repair; optional generative candidate then deterministic processing and rules fallback
