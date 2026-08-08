# AmyNest — Post P0/P1 Remediation Gap Audit

**Status:** AUDIT ONLY · NO IMPLEMENTATION  
**Date:** 2026-08-08  
**Authority:** Founder Order — Post P0/P1 Remediation Gap Audit  
**Verified HEAD:** `b3b79a648b82aa1eee0dd1c4e3750dc7945e8b49`  
**Audit baseline:** `4893a769`  
**Remediation implementation:** `75d3d4f828594eb46fd5b18ef0319cb1018bc2ea`

**Inputs:**  
`AMYNEST_FINAL_PORTFOLIO_REMEDIATION_AUDIT.md` · `AMYNEST_P0_P1_REMEDIATION_IMPLEMENTATION_MAP.md` · `AMYNEST_P0_P1_REMEDIATION_IMPLEMENTATION_REVIEW.md` · current `artifacts/kidschedule` code

**Law:** Current code is source of truth. Do not invent work. Do not run Final Apple Audit. Do not implement.

**STOP after this document.**

---

# 1. Executive Summary

P0/P1 **SELECT** remediation shipped and verified (TS · tests · build · push · clean tree).

It moved the product **toward** one home on:

- leave exits (slice)
- places-of-life tab labels
- Ask Amy companion chrome default
- Unlock theatre → `PREMIUM_VOICE`
- Speech XP/points theatre silence (living ON)
- Rooms V1 Explore Free badge strip

It did **not** finish the house.

| Lens | After remediation |
|---|---|
| Front door | Still **ONE HOME** |
| Living opens | Still **MOSTLY ONE HOME** |
| Leave / deepen interiors | Still **FEDERATION** (improved exits; foreign bodies remain) |
| Blind logo · complete app | Still **NO** |
| Soft launch under watch | Still conditional **YES** |
| Millions / production ops | Still **NO** |
| Ready to **run** Final Apple Audit as documentation gate | **YES** |
| Ready for Final Apple Audit expecting a shippable YES | **NO** — must-fix list below |

### One sentence

> Remediation cleaned the loudest presentation lies; Apple can still reject the complete app for crisis monetization, uncertified accessibility, neon Speech sessions, Hub peer catalogues, and unfinished leave interiors.

---

# 2. Current Baseline

| Check | Status |
|---|---|
| TypeScript | PASS (verified at remediation) |
| Targeted tests | PASS |
| Production build | PASS |
| Working tree | CLEAN at `b3b79a64` |
| Push | SUCCESS |
| Engines / DB / RC / Firebase | Untouched by remediation |
| Dual living flags | Still present (rollback preserved) |

---

# 3. P0/P1 Remediation Verification

| ID | Claimed | Current code | Verdict |
|---|---|---|---|
| P0-1 slice leave exits | Wired | `AmyNestLeaveContinuity` on Grow shell · assistant companion · Speech complete | **VERIFIED** (coverage incomplete elsewhere) |
| P0-2 Speech XP silence | Living ON | XP/points/streak UI gated; neon `bg-[#070812]` remains | **VERIFIED chrome** · chassis debt remains |
| P0-3 Health living demotion | Already true | Living More demotes shop/XP; legacy OFF intact | **VERIFIED** |
| P0-4 Unlock → PREMIUM_VOICE | Shell + LockedBlock | `hub-module-page-shell.tsx`, `locked-block.tsx` | **VERIFIED** (Grow route gate residual elsewhere) |
| P0-5 Companion default | Living ON | `assistant.tsx` companionMode ← living flag | **VERIFIED chrome** · quotas untouched |
| P1-1 Tab labels | Places of life | `mobile-tab-bar.tsx` + `portfolio-nav-labels.ts` | **VERIFIED** |
| P1-6 Explore Free strip | Rooms V1 | `parenting-hub.tsx` previewBadge gated | **VERIFIED** |

---

# 4. Remaining P0

| ID | Classification | Evidence | Required before Apple? | Fix type |
|---|---|---|---|---|
| **P0-7 Hard-day monetization** | **P0 · APPLE BLOCKER** | Quota 402 + upgrade path still fires on `/assistant` even in companion chrome (`assistant.tsx` limit → `/pricing`); emotional Help still FeatureGate-adjacent; infant “3 free baby questions” copy still in non-companion / system path | **YES** | **BUSINESS POLICY** + experience (not engine invent) |
| **P0-9 Device a11y** | **P0 · CERTIFICATION** | Static: leave `min-h-12`, gate `min-h-11`, aria on leave. Device VO / TalkBack / Dynamic Type **not proven** | **YES** (craft claim) | **MANUAL CERTIFICATION** |
| **P0-6 Hub peer catalogues** | **P0 · SIGNIFICANT** (Apple-relevant) | Moments living skips peer doors; Help (5) / Understand (4) / Care (3) still peer lists (`destinations.ts`, rooms shell) | **YES** for one-product claim | **Hub room remanufacture** (IA frozen — needs Founder order) |
| **P0-8 Dual flags** | **OPERATIONAL / ACCEPTED** until prod-clear | All `VITE_FF_*_LIVING_V1` + Today/Hub rooms flags still present by design | **NO** delete before validation | **Ops / ship-face policy** — analysis only |
| **P0-10 Identity / RC / tenancy** | **OPERATIONAL** | Unchanged from Production Readiness audit | **YES for millions**; **NO for craft-only Final Apple Audit run** | **Backend / ops** |

### P0-7 decomposition (no policy invented)

| Layer | Finding |
|---|---|
| **PRODUCT UX PROBLEM** | Exhausted/hard-day path can still reach a paywall CTA after calm companionship open — trust decay |
| **BUSINESS POLICY DECISION** | Which quotas stay free forever (crisis / emotional / infant Amy)? Founder must decide — not inventable here |
| **TECHNICAL IMPLEMENTATION** | After policy: presentation + gate routing only; entitlements/RC not redesigned in this gap audit |

**Currently monetized / interruptible (evidence):** AI message quota · infant AI quota · Hub FeatureGates on emotional/help tiles · learning leave gates (continuity copy, still gated).

**Crisis/help contexts:** Ask Amy · Emotional · Infant Amy questions · (adjacent) Guidance deepen.

---

# 5. Remaining P1

| Issue | Classification | Evidence | Before Apple? |
|---|---|---|---|
| Speech neon chassis | **P1 · SIGNIFICANT** (near-P0 craft) | `live-speech-coach.tsx` still `#070812` + neon blurs | **Strongly YES** |
| Grow edtech interiors | **P1** | Learning journey gate / abacus·phonics bodies still edtech under shell | Strongly YES |
| Birth Sky Astro deepen | **P1** | Dashboard/settings Astro residual; Hub AmyAstro card DNA | YES |
| Curiosity bookstore | **P1** | Still Understand destination | YES (heal or demote) |
| Discovery Worlds | **P1** | Hidden≠healed; Presence nest + route | YES (heal or remove) |
| Leave continuity incomplete | **P1** | Missing on many leave apps (nutrition, birth-sky, discovery, some learning wraps) | Should |
| Nutrition SaaS tabs | **P1** | Tab dialect residual | Should |
| Talking Amy mode/achievement DNA | **P1** | Living softens; residual peeks | Can soften further |
| Grow “Unlock All Learning” residual gate copy | **P1** | `learning-journey-gate.tsx` reported residual | Should |

---

# 6. P2 / Accepted Debt

| Item | Class |
|---|---|
| Dual living flags compiled (defaults ON) | **ACCEPTED DEBT** until production-clear |
| Health Lab / Speech / Coach legacy faces behind `=0` | **ACCEPTED DEBT** (rollback) |
| Living title weight vs FE whisper | **P2** |
| Empty/error composition not standardized | **P2** |
| Gaming Hub corpse component | **P2** dead code |
| Amy Astro menu string cleanup | **P2** |
| Trial spotlight SKU naming | **P2** |
| RG true resume / soft-edit FUTURE | **ACCEPTED DEBT** (engine frozen) |
| Full XL FE ambient on every leave app | **P2/P1** slice done; remainder polish |

**NOT A BLOCKER:** Minor nested Care OS density · Guidance article shelf · Coach/Audio under-fold grids · tab route still `/dashboard` with “Home” label (dialect improved).

---

# 7. Parent Hub Audit (P0-6)

**Locked IA:** Help · Understand · Care · Moments — still four rooms. **Not violated as IA structure.**

**Moments law:** Living Moments stream skips peer product doors — **holds**.

**Help / Understand / Care:** Still **peer destination catalogues** (equal doors after room enter). Quiet paths + one recommendation exist in rooms shell pattern, but peer lists remain the dominant post-door experience for non-Moments rooms.

| Required manufacturing (not done) | Notes |
|---|---|
| Apply Moments one-room law to Help | One companionship spine; Speech/PTM/Life Skills as quiet deepen — not equal peers |
| Apply to Care | Infant / Nutrition / Health as quiet paths under Today's Care |
| Apply to Understand | Guidance primary; Birth Sky / Grow / Curiosity demoted or merged |
| Curiosity / Discovery honesty | Heal or remove from first truth |

**Do not change without Founder Hub remanufacture order** (IA frozen).

---

# 8. Module Interior Audit (XL)

| Surface | Classification | Blind | Note |
|---|---|---|---|
| Welcome / Signup / Discovery / Today | **HOUSE-CONSISTENT** | YES | Frozen front door |
| Parent Hub doors | **HOUSE-CONSISTENT** | YES | |
| Parent Hub peer lists | **SIGNIFICANT DEBT** | NO | P0-6 |
| Infant Care | **MINOR DEBT** | MOSTLY | Nested density |
| Speech open | **MINOR DEBT** | MOSTLY | |
| Speech sessions | **SIGNIFICANT DEBT** → Apple craft risk | NO | Neon chassis |
| Nutrition | **MINOR–SIGNIFICANT** | MOSTLY | SaaS tabs |
| Health Lab open | **HOUSE-CONSISTENT** | MOSTLY | |
| Health Lab deepen | **MINOR DEBT** (living ON) | MOSTLY | Legacy OFF = game OS |
| Grow open | **HOUSE-CONSISTENT** | MOSTLY | |
| Grow leave apps | **SIGNIFICANT DEBT** | MOSTLY | Edtech bodies |
| Birth Sky open | **HOUSE-CONSISTENT** | MOSTLY | |
| Birth Sky deepen | **SIGNIFICANT DEBT** | NO | Astro wing |
| Ask Amy open | **HOUSE-CONSISTENT** | YES | |
| `/assistant` | **MINOR** chrome / **P0** quota | MOSTLY | P0-7 |
| Guidance | **MINOR DEBT** | MOSTLY | |
| Moments | **HOUSE-CONSISTENT** | YES | |
| Talking Amy | **MINOR DEBT** | MOSTLY | |
| Amy Coach | **MINOR DEBT** | MOSTLY | |
| Amy Audio | **MINOR DEBT** | MOSTLY | |
| Routine Generation living | **HOUSE-CONSISTENT** | YES | Crown loop |

**APPLE BLOCKER interiors:** Speech neon sessions (craft) · hard-day paywall (trust) · Hub peers (consistency).

---

# 9. Visual Consistency Audit

| System | Status after remediation |
|---|---|
| FE sanctuary photography | Strong on door + living opens |
| Sanctuary materials | Strong on opens |
| Unlock violet theatre | **Reduced** on LockedBlock / HubModule shell |
| Explore Free badges | **Reduced** when Rooms V1 ON |
| Neon Speech night | **Still active** on sessions |
| Astro cosmic deepen | **Still active** |
| Blue Hub glass in leave continuity | Mild residue (`AmyNestLeaveContinuity` uses card glass — calm, not neon) |
| Navy dashboard vs sanctuary | Softened by “Home” label; route still `/dashboard` |
| Gamification theatre | Silenced on Speech living + Health living; legacy OFF retains |

**Alternate universes remaining:** Neon Speech · Astro Birth Sky · Edtech Grow leave · Curiosity bookstore · Discovery XP world · dual-flag corpses.

---

# 10. Product Consistency Audit

| Feel | Still present? | Where |
|---|---|---|
| SaaS / tool | Soft YES | Nutrition tabs · some deepen |
| AI demo / chatbot | Soft residual | Non-living assistant; quota wall |
| Dashboard | Soft YES | Birth Sky deepen; legacy Home OFF |
| Marketplace / catalogue | **YES** | Hub peers · Curiosity · Discovery |
| Game | **YES** | Speech neon · Health legacy · Discovery |
| Separate application | **YES** | Speech sessions · Grow leave · Birth Sky deepen |

Five questions: door/opens largely **PASS**; Hub peers / Speech sessions / Grow leave / Birth Sky deepen **PARTIAL–FAIL**.

---

# 11. Premium Audit

| Required feeling | After remediation |
|---|---|
| Continuity / support / confidence | Stronger on shell/LockedBlock/`PREMIUM_VOICE` |
| Unlock theatre | **Reduced** on primary leave shell |
| FOMO / Explore Free | **Reduced** Rooms V1 |
| Hard wall on hard day | **Still present** (P0-7) — soft copy ≠ free path |
| Feature restriction feel | Still via quotas/gates (policy) |

**No pricing / RC / entitlement changes recommended by this audit.**  
**Experience/policy problem:** monetizing care adjacency after companionship open.

---

# 12. Accessibility Certification Gap

| Provable now | Not provable here |
|---|---|
| Leave exits semantic `nav` + labels | VoiceOver full Hub/module pass |
| `min-h-12` / `min-h-11` on touched CTAs | TalkBack Android pass |
| Reduced-motion paths exist in places | Dynamic Type clamp/overflow on all rooms |
| Unit tests for voice contracts (partial) | Real-device certification |

**Honest status:** Code improvements ≠ certification.  
**Class:** **CERTIFICATION** — required before Apple craft claim.

---

# 13. Production / Operations Gap (P0-10)

| Domain | Class | Notes |
|---|---|---|
| Account linking / guest upgrade | **OPERATIONAL** | Still missing |
| RevenueCat ops / restore / sandbox | **OPERATIONAL** | Model ≠ certified ops |
| Tenancy / child isolation | **OPERATIONAL** | Soft app-layer |
| Consent / analytics plane | **OPERATIONAL** | |
| Dual flags ship face | **OPERATIONAL** | Keep until validated |
| Auth edge cases | **OPERATIONAL** | Soft launch conditional |

These are **not UI manufacturing**. Separate workstream from Final Apple craft audit — but millions ship depends on them.

---

# 14. Business / Conversion Gap

| Question | Honest answer |
|---|---|
| Understand what AmyNest does? | **YES** at door |
| Why useful / return tomorrow? | Soft **YES** via Today + RG living |
| Why subscribe? | Soft — continuity taught; hard-day wall may punish trust |
| Value early enough? | Soft **YES** on living paths |
| Hide too much behind Premium? | Soft **YES** on AI quota / learning gates |
| Optimize premium feel over experience? | Improved; crisis path still risks it |

No verified conversion metrics in this audit.

---

# 15. Navigation / Flag Gap

### Navigation

| Item | Status |
|---|---|
| Tab places-of-life labels | **Fixed** |
| Routes still product paths (`/dashboard`, `/routines`) | **Accepted dialect** (labels heal) |
| Leave continuity | **Partial** — not portfolio-wide |
| Browse loops | Curiosity / Discovery / Hub peers remain |

### Dual flags (P0-8) — analysis only

| Flag family | Required now? | Safe to remove? |
|---|---|---|
| Module `VITE_FF_*_LIVING_V1` (13) | **YES** — rollback | **NO** before production validation |
| `VITE_FF_PARENT_HUB_ROOMS_V1` | **YES** | **NO** |
| `VITE_FF_TODAY_HOME_V1` | **YES** | **NO** |
| `VITE_FF_CHILD_DISCOVERY_FILM` | **YES** | **NO** |
| `VITE_FF_ROUTINE_LIVING_V1` | **YES** | **NO** |

**Recommendation:** Keep all living/rooms flags. Plan a later **production-clear** order to delete corpses after soak — not now.

---

# 16. Top 10 Remaining Risks

1. Hard-day / emotional AI quota paywall (trust · Apple humanity)  
2. Accessibility uncertified (Apple craft)  
3. Speech neon session chassis (another app)  
4. Hub Help/Care/Understand peer catalogues (not one product)  
5. Grow edtech leave interiors  
6. Birth Sky Astro deepen  
7. Curiosity + Discovery unhealed  
8. Dual-universe accidental flag flip  
9. Production identity linking / RC ops  
10. Incomplete leave-continuity coverage on remaining leave apps  

---

# 17. Top 10 Strengths

1. Front-door film still excellent  
2. Living opens broadly manufactured  
3. Moments one-room law proven  
4. Routine Generation living R2–R5 crown loop  
5. Unlock theatre materially reduced on primary leave shell  
6. Places-of-life tab labels  
7. Ask Amy companion chrome default  
8. Speech XP theatre silenced when living  
9. Leave continuity pattern established (reusable)  
10. Remediation honesty — STOP items not faked  

---

# 18. Scorecard

| Dimension | Score | One-sentence reason |
|---|---|---|
| Visual Identity | **7.4** | Door/opens strong; neon/Astro/edtech leave still split the film |
| Product Identity | **7.0** | Home philosophy clearer; peers + leave bodies still federate |
| Emotional Consistency | **6.5** | Companion voice stronger; hard-day paywall breaks it |
| Premium Experience | **5.8** | Continuity copy improved; quota walls remain |
| Trust | **5.8** | Door trusted; crisis monetization still fatal |
| Accessibility | **4.8** | Touch/label gains; device cert missing |
| Navigation | **6.8** | Labels healed; leave coverage incomplete; peers remain |
| Module Consistency | **5.5** | Opens aligned; interiors uneven |
| Routine Generation | **8.3** | Living crown path still strongest core loop |
| Conversion Readiness | **6.0** | Value early on living path; trust risk on walls |
| Production Safety | **4.8** | Ops blockers unchanged |
| Apple Readiness | **5.9** | Closer on chrome; not shippable complete app |

---

# 19. Must-Fix Before Apple

### MUST FIX BEFORE FINAL APPLE AUDIT  
*(for any chance of a non-reject craft verdict)*

| Issue | Severity | Evidence | Fix type |
|---|---|---|---|
| Hard-day monetization (P0-7) | **P0** | Quota → pricing CTA on care path | Business policy + UX |
| Device a11y cert (P0-9) | **P0** | Uncertified VO/DT/TalkBack | Manual certification |
| Speech neon session chassis | **P0/P1 craft** | `#070812` live sessions | Experience remanufacture (engine frozen) |
| Hub peer catalogues (P0-6) | **P0** | Help/Care/Understand peers | Hub remanufacture order |

### SHOULD FIX BEFORE FINAL APPLE AUDIT

| Issue | Fix type |
|---|---|
| Grow edtech leave interiors | Shared leave shell deepen |
| Birth Sky Astro deepen residual | Understand shell through dashboard |
| Curiosity / Discovery honesty | Heal or remove from first truth |
| Leave continuity on remaining leave apps | Wire existing component |
| Grow journey-gate Unlock residual copy | Presentation |

---

# 20. Can Defer

| Bucket | Items |
|---|---|
| **CAN DEFER** | Empty/error standardization · Gaming corpse deletion · FE whisper title weights · Coach/Audio under-fold polish · Nutrition tab rename polish |
| **OPERATIONAL** | P0-8 flag corpse deletion · P0-10 identity/RC/tenancy/consent · runtime kill switches |
| **MANUAL CERTIFICATION** | Full VO/TalkBack/DT matrix beyond core path |
| **ACCEPTED DEBT** | Dual flags until soak · engine FUTURE (RG soft-edit/memory) · legacy `=0` faces |

---

# 21. Final Recommendation

### Final Founder questions

**If we froze the product today and gave it to Apple's reviewer, exact rejection/question reasons:**

1. **Not one continuous application** after Hub peers / Speech neon / Grow leave / Birth Sky deepen  
2. **Humanity / trust** — emotional/hard-day path still leads to upgrade  
3. **Accessibility** — sanctuary craft claimed without device certification  
4. **Gamification / neon / Astro dialects** still reachable as other product categories  
5. **Premium interruption** after calm companionship (even with softer CTA copy)

**If those must-fix issues are fixed, is the product ready for the FINAL APPLE AUDIT?**

# YES

Meaning: ready to **run** Final Apple Audit as the next formal craft gate with a plausible path to a non-reject complete-app judgment.

**Run Final Apple Audit today without must-fix?**  
Technically possible as a documentation audit — it would almost certainly conclude **NO ship**. Prefer fixing the MUST FIX list first so the Final Apple Audit measures a coherent house, not a known-broken federation.

### Absolute guidance

| Action | Now? |
|---|---|
| Implement more SELECT chrome without Hub/Speech/crisis orders | **Low ROI** — stop façade-only |
| Founder order: crisis/hard-day free policy (P0-7) | **YES — next** |
| Founder order: Hub Moments-law for Help/Care/Understand (P0-6) | **YES — next** |
| Founder order: Speech session interior remanufacture | **YES — next** |
| Device a11y certification pass (P0-9) | **YES — parallel** |
| Delete dual flags (P0-8) | **NO** |
| Backend ops (P0-10) | Parallel ops track |
| Final Apple Audit | **After MUST FIX** |
| New module manufacturing phase | **NO** |

---

## Decision Matrix (summary)

| Issue | Severity | Evidence | Required before Apple? | Fix type |
|---|---|---|---|---|
| P0-7 Hard-day monetization | P0 | assistant quota → pricing | YES | Policy + UX |
| P0-9 Device a11y | P0 | Uncertified | YES | Certification |
| P0-6 Hub peers | P0 | destinations + rooms shell | YES | Hub remanufacture |
| Speech neon chassis | P0/P1 | live-speech `#070812` | YES | Experience |
| Grow edtech interiors | P1 | leave bodies | SHOULD | Experience |
| Birth Sky Astro deepen | P1 | dashboard/settings | SHOULD | Experience |
| Curiosity / Discovery | P1 | still in graph | SHOULD | Heal/remove |
| Leave continuity gaps | P1 | partial wiring | SHOULD | Wire existing |
| P0-8 Dual flags | Ops/Accepted | flags present | NO delete now | Ops later |
| P0-10 Production ops | Ops | linking/RC/tenancy | Millions YES / craft NO | Backend |

---

## Document control

| Field | Value |
|---|---|
| Type | Gap audit only |
| Implementation | **NONE** |
| Allowed commit | This file only |
| Next | Founder prioritization of MUST FIX orders |

**Do not run Final Apple Audit yet.**  
**Wait for Founder review.**
