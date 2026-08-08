# AmyNest — Final Apple Audit

**Status:** FINAL APPLE AUDIT · SCORING GATE · NO IMPLEMENTATION  
**Authority:** Founder Order — Final Apple Audit (authorized)  
**Date:** 2026-08-08  
**Branch:** `cursor/product-execution-model-v2`  
**Verified HEAD:** `bc4828b417053df962db12b9041bd81b59944699`  
**App source:** `artifacts/kidschedule/src`

**Review entry (mandatory):** `/begin` with **living experiences ON**  
**Not review entry:** `/welcome` neon marketing Landing  

**This document supersedes** the earlier craft draft dated 2026-08-07 in this same path. Prior Pre-Final verification (`AMYNEST_PRE_FINAL_REMEDIATION_VERIFICATION.md`) was independently re-checked, not blindly accepted.

**Law:** Audit only. No React · CSS · DB · API · Firebase · RevenueCat · routing · flag · feature changes. Findings are not implementations. This audit does **not** guarantee Apple approval.

---

## Executive Summary

AmyNest, reviewed through **`/begin`** under **default living flags ON**, now presents as **one calm parenting house** at the door and through remade deep interiors (Health Lab · Grow · Birth Sky · Speech · Parent Hub rooms · Routine Generation crown path).

It is **not** a perfect first-party ship.

| Lens | Verdict |
|---|---|
| One coherent application (living ON, `/begin`) | **MOSTLY** |
| Deep interiors still foreign products? | **NO** for the three Pre-Final blockers; **MOSTLY NO** portfolio-wide |
| Premium trustworthy on hard day? | **YES** (P0-7 intact) |
| Accessibility device-certified? | **NO** |
| Ready for uncontrolled App Store “ship to millions”? | **NO** |
| Ready for **controlled** release / Apple review with ops discipline? | **CONDITIONAL** |

### One sentence

> AmyNest is now mostly one parenting home under living `/begin` — emotionally coherent enough for a controlled Apple submission attempt — but device accessibility is uncertified, dual-flag legacy faces remain a production risk, and this audit does not predict Apple’s decision.

### Absolute judgments (preview)

| # | Question | Answer |
|---|---|---|
| 1 | ONE product? | **MOSTLY** |
| 2 | Same home every major destination? | **MOSTLY** |
| 3 | Deep interiors coherent? | **MOSTLY** |
| 4 | Premium trustworthy? | **YES** |
| 5 | Emotionally coherent? | **MOSTLY** → **YES** on living path |
| 6 | Accessibility fully certified? | **NO** (static evidence only · **PARTIAL** supporting craft) |
| 7 | P0 blockers? | **YES** (device a11y cert; dual-universe ops if flags flip) |
| 8 | P1 blockers? | **YES** |
| 9 | Controlled release ready? | **CONDITIONAL** |
| 10 | Recommend Apple submission today? | **CONDITIONAL** |

---

## Review Entry

| Item | Evidence |
|---|---|
| Canonical path | `AppCore.tsx` `path="/begin"` → `FirstExperiencePage` |
| Unsigned / auth timeout | Redirect → `/begin` |
| Visual capture | `/opt/cursor/artifacts/final-apple-begin-primary.webp` |
| Non-review contrast | `/welcome` → neon `LandingPage` (`final-apple-welcome-contrast.webp`) |
| Living flags | All major `VITE_FF_*_LIVING_V1` default ON when unset |

**Verified:** Review must use `/begin`. `/welcome` is a separate neon marketing OS and must not be treated as Apple presentation.

---

## Portfolio Scope

Audited under living ON:

Welcome `/begin` · Signup Keep · Child Discovery · Today Home · Parent Hub (Help / Understand / Care / Moments) · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · Birth Sky · Ask Amy · Guidance · Moments · Talking Amy · Amy Coach · Amy Audio · Routine Generation

Supporting reads: Pre-Final Consistency Audit · Pre-Final Remediation Verification · P0-6 / P0-7 / P0-9 · Speech / Health / Grow / Birth Sky deep reviews · Final Production Readiness · Routine R1–R5 reviews · current implementation.

Auth-gated deep leaves were verified primarily by **code + prior remediation evidence**; `/begin` was visually inspected live. Authenticated Today Home / Hub screenshots remain limited in this VM.

---

## First Impression

**Entry:** `/begin` Child Discovery (name) with FE photography.

| Criterion | Result | Evidence |
|---|---|---|
| Calm | **YES** | Deep charcoal · one photo · one field · one CTA |
| Trust | **YES** | Soft mother/child photography · privacy-respecting framing |
| Clarity | **YES** | Single intention: child’s first name |
| Parenting purpose | **YES** | Human presence before features |
| Companionship | **MOSTLY** | Quiet presence; Amy not shouting |
| Premium quality | **YES** | Restraint · spacing · materials |
| CTA legibility | **RISK** | Continue button taupe-on-dark — calm but low contrast |

**Score contribution:** Strong door. Not neon. Not SaaS splash.

---

## House Consistency

| Room | Different by PURPOSE? | Different by OTHER APP? |
|---|---|---|
| Welcome `/begin` | Purpose | No |
| Today Home | Purpose (act) | Mild card chrome |
| Parent Hub doors | Purpose (Help/Understand/Care/Moments) | No (P0-6) |
| Help / Understand / Care / Moments streams | Purpose | No |
| Infant / Speech / Nutrition / Health / Grow / Birth Sky opens | Purpose | No under living ON |
| Remade deep leaves | Purpose (practice / understand / care) | Residual density, not foreign OS |
| `/welcome` marketing | **Other OS** | **YES — excluded from review** |

Photography · typography · night/sand materials · quiet cards · cream CTAs · PREMIUM_VOICE · calm loading/completion now recur across remade living surfaces. Different room identity is allowed and present. A second design system remains only behind living OFF / marketing `/welcome`.

---

## Deep Interior Audit

Question: *Does the module become a separate product after deepen?*

| Destination | Entry | Deep | Becomes another product? | Blind (one app?) |
|---|---|---|---|---|
| Infant Care | Living Care | Nested care panels denser | **MOSTLY NO** | MOSTLY |
| Speech Coach | Sanctuary | Sanctuary deep; mid-play coin/theme peek | **MOSTLY NO** | MOSTLY |
| Nutrition | Living open | Score theatre can resurface | **MOSTLY NO** | MOSTLY |
| Health Lab | Care open | Care sanctuary practice (`hl-living-deep`) | **NO** (named neon blocker cleared) | MOSTLY |
| Grow | Understand stream | Beads & counting / Sounds & letters | **NO** (PRO Zone cleared) | MOSTLY |
| Birth Sky | Understand open | Birth Sky deep (`bs-living-deep`) | **NO** (Amy Astro face cleared) | MOSTLY |
| Ask Amy | Companion | Soft-continue help-first | **NO** | MOSTLY |
| Guidance | Living stream | Mild article deepen | **NO** | YES |
| Moments | One-room stream | Quiet | **NO** | YES |
| Talking Amy | Sanctuary open | Mode residue | **MOSTLY NO** | MOSTLY |
| Amy Coach | Beside you | Goal/category desk | **MOSTLY NO** | MOSTLY |
| Amy Audio | Quiet listen | Age/listen desk | **MOSTLY NO** | MOSTLY |
| Routine Generation | Today's plan | Build → Here it is → Begin → Care → Exit | **MOSTLY NO** | MOSTLY |

**Independent verification of Pre-Final remediation conclusions:** **CONFIRMED** under living defaults for Health Lab · Grow · Birth Sky clearances; Speech remains acceptable P1 debt; Hub P0-6 and P0-7 intact.

---

## Parent Hub

| Check | Result |
|---|---|
| Help / Understand / Care / Moments | **RoomLivingStream** / Moments stream |
| One intention + one recommended path | **YES** |
| Quiet secondary (`data-demoted`) | **YES** |
| No peer catalogue / mall / browse loop | **YES** on living peer rooms |
| No gaming / dashboard theatre / Unlock shelf | **YES** on living face |
| P0-6 regression | **NONE found** |

---

## Today Home / Hub Boundary

| Law | Runtime |
|---|---|
| Today Home wins when one action is enough | `TodayHomeShell` + NRT (`resolve-today-nrt` / `passesTodayHomeLaw`) when Today Home V1 ON |
| Hub for Help / Understanding / Care / Presence beyond one act | Rooms V1 doors; Hub primarily **pull** (tab / deep link), not “what’s new” forced open |
| Boundary helper | `resolveHomeHubBoundary` in philosophy — documented law; not a single auto-router |

**Verdict:** Entry Law is **structurally obeyed** on living path. Not a browsing/games Hub mall at the door.

---

## Companionship

| Surface | Companion? | Not chatbot/SaaS? |
|---|---|---|
| Ask Amy | **YES** living companion | Soft-continue, not Upgrade theatre |
| Emotional Support | **YES** Help spine | P0-7 MFHO |
| Amy Coach | **YES** “Beside you” | Goal desk residual |
| Talking Amy | **MOSTLY** | Mode residue |
| Speech Coach | **YES** living sanctuary | Mid-game P1 peek |
| Guidance | **YES** | Stream |
| Routine Generation | **YES** “I'm here with {child} for today” | Timed stages, not CoT theatre |

**Verdict:** Living path companionship is real and consistent enough for Apple craft judgment. Flag OFF restores other dialects.

---

## Routine Generation

Core capability. Living path audited carefully.

| Beat | Living ON evidence |
|---|---|
| Entry | “Today's plan” · “Build today's plan” · companionship open |
| Context | Verified chips only (`buildRoutineContextChips`) |
| Loading stages | `ROUTINE_HANDOFF_STAGES` — gathering / placing / fitting / checking (kind day) |
| Truthfulness | Stages thematically map pipeline; UI advances on a **timer** (~2.8s), **not** live engine stage events — better than free-form AI theatre, not instrumented truth |
| Result | “Here it is.” · WHAT · WHY (from adaptations) · WHEN arc · HOW / Start here |
| Begin today | Save + open detail |
| Rebuild | Confirm-gated |
| Execution | Presence language (not XP%) |
| Completion | “We cared well today” |
| Exit | Continuity exits → Today Home / Parent Hub / Coach / Audio |

**Patent honesty (verified only):**

- Repo contains `patent/amynest_patent_package.html` — **one Indian Provisional** package with **indicative claims** (documented as 15 indicative claims / claim numbering including 5A, 5B, 8A).  
- **Do not claim “15 patents.”**  
- Filing number / grant / USPTO: **not verified** in repo.  
- Living path hides patent microcopy; legacy/settings/pricing may still surface `patent_pending.*`.

**Engine:** Hybrid / deterministic correction narrative in prior studies — **not** free-form AI. This audit does not claim otherwise.

**Routine score:** **8.5 / 10**

---

## Premium

| Requirement | Result |
|---|---|
| Continuity / support / confidence / time saved | **YES** on living + hard-day paths (`PREMIUM_VOICE`) |
| Unlock / marketplace / FOMO / sales interruption | **Suppressed** on P0-7 hard-day Help · Emotional MFHO · living Speech limits · Grow living gates |
| Meaningful help before paywall | **YES** — Ask Amy soft-continue; Emotional free floor 4; D3 no auto-paywall |
| P0-7 D1–D8 | **INTACT** (`hard-day-monetization.ts` unchanged by later remediations) |
| Pricing / RevenueCat / entitlements | **Untouched** by remediations (experience presentation only) |

Residuals: Unlock dialect on **living OFF** faces; some Infant activation i18n keys; Zap-styled chrome scraps on some CTAs — **P1/P2**, not P0-7 regression.

**Premium score:** **8.5 / 10**

---

## Trust

| Risk class | Living-path finding | Classification |
|---|---|---|
| Unsupported medical claims | Infant libs retain “never medical diagnosis”; activation “predictions” keys residual | **P1** residual |
| Unsupported AI / fake reasoning | Living Routine avoids CoT / “AI is thinking”; timed handoff stages | **P2** honesty debt (timer ≠ live stage) |
| Scientific overclaim | Birth Sky living: reflective / never fate; no NASA destiny theatre | **none** on living deep face |
| Prediction / astrology certainty | Birth Sky softeners + scrubbers | **none** living open/deep face |
| Diagnosis language | Not introduced by remediations | **none** new |
| Fear/guilt monetization | P0-7 suppresses hard-day FOMO / paywall-before-help | **none** on hard-day Help |
| Fake achievement | Health/Speech living demote XP/trophy theatre | Residuals P1/P2 mid-session |
| Patent exaggeration | Living hides; elsewhere may say patent pending | **P1/P2** if shown as legal fact; **not** “15 patents” |

---

## Accessibility Evidence

### DEVICE CERTIFICATION (authoritative)

From `AMYNEST_P0_9_ACCESSIBILITY_CERTIFICATION.md` + this VM:

| Claim | Status |
|---|---|
| VoiceOver | **NO — not certified** |
| Dynamic Type | **NO — not certified** |
| TalkBack | **NOT TESTED** |
| Real-device touch / contrast / reduced-motion settings | **NO** |
| Overall device certification | **NOT COMPLETE** |

### STATIC ACCESSIBILITY EVIDENCE (supporting only — not certification)

- Leave continuity nav labels  
- Ask Amy soft-continue `role="status"` / `aria-live`  
- Speech living mic live regions  
- 48px / `min-h-11`+ targets on remade CTAs  
- `prefers-reduced-motion` in Speech / Health / Grow / Birth deep CSS  
- Hub room recommend / quiet buttons  

**Do not mark VoiceOver / Dynamic Type / TalkBack / touch = PASS.**

---

## Motion

| Theatre class | Living ON |
|---|---|
| Neon / game motion (Health HoldOrb, starfield) | **Removed / gated OFF** |
| Speech confetti / rewards bar | **Suppressed** when living |
| Birth Sky CTA ripple / constellation completion | **Muted / gated** |
| Constant floating / AI sparkle | Not default on living opens |
| Routine loading | Calm stage list — not patent brain theatre |
| Reduced motion | CSS + component gates present (device setting **not** certified) |

Residual: Speech mid-play theme motion/coins (**P1**); Health finger CTA gradient peek (**P2**).

---

## Visual Legibility

| Surface | Finding | Class |
|---|---|---|
| `/begin` Continue CTA | Low contrast taupe-on-dark (calm aesthetic vs WCAG risk) | **P1** |
| `/begin` input/placeholder | Very subtle borders/placeholder | **P2** / a11y risk |
| FE photography rooms | Strong hierarchy when living | Good |
| Cream/sand on night deep shells | Generally readable; secondary text can go quiet | Monitor |
| Auth-gated Today/Hub | Not fully visually re-captured this run | **NOT TESTABLE** fully authenticated |

No visual score inflation: door is beautiful; contrast debt is real.

---

## Navigation

| Path | Verdict |
|---|---|
| Home / Today | Present |
| Today's plan (Routine) | Living continuity exits |
| Beside you / Rooms | Hub Rooms V1 |
| Back / nested | Module shells + FE backs |
| Deep links | Grow/Hub deep-links into remade leave titles under living ON |
| Exit to life | `AmyNestLeaveContinuity` on Speech / Health / Grow / Birth Sky / Ask Amy / Routine; **gaps** on Infant / Nutrition / Coach / Audio / Talking Amy |

**Dead ends:** No systemic dead end found on remade paths. Leave-continuity gaps remain **P1**.

---

## Production Safety

| Risk | Evidence | Class |
|---|---|---|
| Dual living flags (13+ living + Today Home + Rooms) | Default ON; OFF restores legacy neon/edtech/Astro | **P0 ops** if prod face not locked |
| `/welcome` neon still reachable | LandingPage | **P1** if in review; ops quarantine |
| Auth → `/begin` | Correct value-before-identity | Good |
| Sign-in/up links to `/welcome` | Still present | Ops |
| RevenueCat / billing | Remediations experience-only; sandbox/ops not craft-certified (`AMYNEST_FINAL_PRODUCTION_READINESS.md`) | Production **P0/P1 ops** for mass scale |
| Firebase / auth linking / guest upgrade | Prior readiness: gaps remain | Production risk |
| AI abuse / consent / tenancy | Prior readiness concerns remain; not re-litigated as craft blockers here | Report |
| Rollback | Flag OFF preserved intentionally | Good for kill-switch; bad if flipped accidentally in review |

**Craft remediations did not change DB/API/RC/Firebase engines.** Production-at-scale readiness remains **conditional / no for millions** per prior readiness audit.

---

## Category Test

If logo disappeared, could this be mistaken for…?

| Destination | Intentional category | Accidental foreign category (living ON) |
|---|---|---|
| Welcome `/begin` | Parenting | No |
| Today Home / Hub rooms | Parenting | No |
| Infant / Nutrition / Care | Parenting / care | Mild product panels |
| Speech | Parenting practice | Mid-game can peek “kids game” (**P1**) |
| Health Lab | Parenting care practice | Was health-game; **cleared** (craft peeks) |
| Grow | Parenting growth practice | Was edtech; **cleared** (nested desk denser) |
| Birth Sky | Parenting understanding | Was astrology app; **cleared** (panels denser) |
| Ask Amy / Guidance / Moments | Parenting companion | Mild chat residue if OFF |
| Routine | Parenting day plan | No AI demo theatre on living |
| `/welcome` | Marketing AI | Accidental if used as review |

**Portfolio category (living `/begin`):** parenting application — **intentional**.

---

## Emotional Moat

| Moat | Verified evidence | Overclaim avoided |
|---|---|---|
| Product | One-house living path: Home NRT + Rooms + remade deepens | Dual flags still exist |
| Routine Generation | Living crown WHAT/WHY/WHEN/HOW + begin/care/exit | Not magic free-form AI |
| Companionship | Ask Amy + hard-day non-interrupt + Coach beside you | Not every nested chrome |
| Parent-child continuity | Soft-continue · leave exits · routine continuity · name-first `/begin` | Leave gaps remain |
| Personalization | Context chips / WHY from real fields | Not invented Discovery |
| Experience | FE photography sanctuary language | `/welcome` second OS |
| Patent-supported tech | **One provisional package with indicative claims** | **Not “15 patents”**; grant unverified |

---

## Business Readiness

| Question | Answer |
|---|---|
| Would a parent understand the value? | **YES** on `/begin` → Today Home → Routine / Ask Amy / Care |
| Want to return? | **MOSTLY YES** — continuity + companionship; novelty risk if flags OFF |
| Premium feel worth paying? | **MOSTLY YES** when presented as continuity (P0-7) |
| Value before ask? | **YES** on hard-day Help / Emotional / living Routine |
| Recommend to another parent? | **MOSTLY YES** if living face locked |
| Useful beyond first week? | **MOSTLY YES** — Routine + Care + Speech practice + Ask Amy |
| Conversion numbers? | **Not invented** |
| Apple approval assumed from business strength? | **NO** |

---

## Scorecard

| Dimension | Score | Evidence |
|---|---|---|
| First Impression | **8.5** | `/begin` calm photography door; CTA contrast risk |
| Visual Identity | **8.0** | Living house materials; `/welcome` excluded |
| Product Identity | **8.0** | Parenting app under living `/begin` |
| House Consistency | **8.0** | Rooms differ by purpose; remade deepens aligned |
| Deep Interior Consistency | **7.5** | Named blockers cleared; residuals MOSTLY |
| Navigation | **7.0** | Life exits on remade paths; leave gaps elsewhere |
| Companionship | **8.0** | Ask Amy / Coach / Routine / Speech living |
| Routine Generation | **8.5** | Living crown path; timed stages honesty deduct |
| Premium Experience | **8.5** | P0-7 D1–D8 + PREMIUM_VOICE |
| Trust | **8.0** | Living clean; Infant keys / patent elsewhere residual |
| Accessibility | **3.0** | Device cert **NOT COMPLETE**; static only |
| Motion | **8.0** | Theatre suppressed living; Speech mid-play P1 |
| Parent Clarity | **8.0** | What/why/next clear on Home/rooms/Routine |
| Business Readiness | **7.5** | Value path clear; no fake metrics |
| Production Safety | **6.5** | Dual flags · billing/auth scale gaps · `/welcome` |
| **Apple Readiness** | **7.0** | Craft mostly; a11y + ops conditions |

**Portfolio craft mean (ex-a11y):** ~8.0  
**With honest a11y:** readiness capped.

---

## Top 10 Remaining Issues

| ID | Surface | Severity | Evidence | Why it matters | Apple impact | Required action |
|---|---|---|---|---|---|---|
| FA-01 | Portfolio a11y | **P0 CERT** | P0-9: VoiceOver/Dynamic Type/TalkBack **not tested** | Cannot claim accessible Apple-ready UI | Rejection / guideline risk if claimed | Real-device certification pass |
| FA-02 | Living flags / dual universe | **P0 ops** | All `VITE_FF_*_LIVING_V1` kill-switches restore neon/edtech/Astro | Reviewer or prod flip → federation returns | Inconsistent review build | Lock living ON for review + prod face |
| FA-03 | `/welcome` neon Landing | **P1** (P0 if used as review) | `LandingPage` purple/pink OS | Wrong door = wrong product | Reviewer confusion | Keep review on `/begin`; quarantine marketing path |
| FA-04 | Speech mid-play coins/themes | **P1** | `speech-game-flow.tsx` ungated play chrome | Undercuts sanctuary mid-session | Craft inconsistency | Living suppress mid-play (Founder order later) |
| FA-05 | Leave continuity gaps | **P1** | Infant / Nutrition / Coach / Audio / Talking Amy lack `AmyNestLeaveContinuity` | Exit-to-life weaker | Nested trap feel | Extend leave continuity |
| FA-06 | `/begin` CTA contrast | **P1** | Visual capture: taupe Continue on charcoal | Calm vs readable | HIG contrast risk | Contrast tune (later) |
| FA-07 | Production scale (auth linking / RC ops / tenancy) | **P0/P1 ops** | `AMYNEST_FINAL_PRODUCTION_READINESS.md` | Soft-launch vs millions | Ops/support risk | Ops certification (not craft remake) |
| FA-08 | Nested Grow / Birth Sky panel density | **P2** | Lesson desks · astronomy/tradition panels | Density ≠ foreign OS | Mild | Optional quieting |
| FA-09 | Infant activation prediction/unlock i18n | **P1** | Activation copy keys | Trust residue | Trust | Copy pass (later) |
| FA-10 | Patent microcopy outside living Routine | **P2/P1** | pricing/profile/legacy | Overclaim risk if read as “15 patents” | Trust/legal tone | Keep provisional-honesty wording |

---

## Accepted Debt

| Debt | Class |
|---|---|
| Health Lab finger CTA gradient / reactor mid-HUD peek | **ACCEPTED DEBT** / P2 |
| Grow nested lesson chrome | **ACCEPTED DEBT** / P2 |
| Birth Sky Sky/Patterns data density · keepsake HTML legacy brand | **ACCEPTED DEBT** / P2 |
| Speech P1 mid-play (acceptable for this gate; not reopen without order) | **P1** accepted for controlled release |
| Routine timed (not instrumented) handoff stages | **ACCEPTED DEBT** / P2 honesty |
| Dual-flag OFF faces as intentional rollback | **ACCEPTED DEBT** (ops must not flip) |
| Authenticated Hub/Today screenshot pack incomplete in VM | **NOT TESTABLE** fully this run |

---

## P0 / P1 / P2 Matrix

| Severity | Items |
|---|---|
| **P0** | FA-01 device a11y cert OPEN · FA-02 living-flag face lock (ops) · FA-07 production-scale ops (for millions / unchecked billing) |
| **P1** | FA-03 `/welcome` if in path · FA-04 Speech mid-play · FA-05 leave gaps · FA-06 `/begin` contrast · FA-09 Infant activation copy |
| **P2** | FA-08 panel density · FA-10 patent microcopy elsewhere · Health craft peeks · Routine timer stages |
| **ACCEPTED DEBT** | Intentional flag-OFF rollback · nested density after remade SKUs |
| **NOT TESTABLE** | Full authenticated Hub/Today visual pass · physical a11y devices in this VM |

---

## Final Apple Decision

1. **Is AmyNest ONE product?** → **MOSTLY**  
2. **Does every major destination feel like the same home?** → **MOSTLY**  
3. **Are deep interiors coherent?** → **MOSTLY**  
4. **Is Premium trustworthy?** → **YES**  
5. **Is the product emotionally coherent?** → **MOSTLY** (living path → **YES**)  
6. **Is accessibility fully certified?** → **NO** (static **PARTIAL** only)  
7. **Are there P0 blockers?** → **YES** (a11y cert + ops face-lock / scale)  
8. **Are there P1 blockers?** → **YES**  
9. **Ready for controlled release?** → **CONDITIONAL**  
10. **Recommend submission to Apple today?** → **CONDITIONAL**

### Conditions for CONDITIONAL submission / controlled release

1. Review build **locks living flags ON**  
2. Apple reviewers enter **`/begin`**, never `/welcome`  
3. Do **not** claim VoiceOver / Dynamic Type / TalkBack certification  
4. Do **not** claim “15 patents” — only provisional package honesty if mentioned  
5. Treat as **soft / controlled** release — not “millions” certification  
6. Founder accepts Speech P1 + leave-gap P1 as known debt  

### What this audit is not

- Not a guarantee Apple will approve  
- Not a mass-scale production certification  
- Not an accessibility device certification  
- Not an implementation order  

---

## Founder Recommendation

**Proceed to controlled Apple review preparation under conditions above — or pause for P0-9 device certification first if accessibility claims are required in the submission narrative.**

Craft trajectory since Pre-Final:

| Was (Pre-Final) | Now (Final Apple) |
|---|---|
| Health / Grow / Birth Sky deepen = foreign products | **Cleared under living ON** |
| Federation deep interior | **MOSTLY one house** |
| Premium hard-day risk | **P0-7 trustworthy** |
| Ready for Final Apple scoring gate | **Executed** |

**Recommended next Founder choices (do not implement here):**

A. Authorize device a11y certification sprint (P0-9) before submission  
B. Authorize controlled submission with living face locked + no a11y overclaim  
C. Authorize narrowly scoped P1 craft (Speech mid-play · leave continuity · `/begin` contrast) before submission  

---

## Screenshots

| Artifact | Role |
|---|---|
| `/opt/cursor/artifacts/final-apple-begin-primary.webp` | Canonical `/begin` review entry |
| `/opt/cursor/artifacts/final-apple-begin.webp` | Alternate `/begin` capture |
| `/opt/cursor/artifacts/final-apple-welcome-contrast.webp` | **Non-review** neon `/welcome` contrast only |
| `/opt/cursor/artifacts/final-apple-signin.webp` | Auth surface |
| `/opt/cursor/artifacts/final-apple-today-auth-required.webp` | Auth gate evidence |

<img alt="Final Apple Audit — /begin review entry" src="/opt/cursor/artifacts/final-apple-begin-primary.webp" />

---

## Commit SHA

**Audit document commit:** `0602ee65e56dbeee6bd91fdf572dc0fb8e266091`  
**Verified application HEAD:** `bc4828b417053df962db12b9041bd81b59944699`

---

## STOP

No implementation. No findings executed.

**Audit → document → commit → push → STOP.**

Await Founder review before any remediation of FA-01…FA-10.
