# AmyNest — Final Apple Audit (Re-Run)

**Status:** FINAL APPLE AUDIT · RE-RUN · SCORING GATE · NO IMPLEMENTATION  
**Authority:** Founder Order — Final Apple Audit Re-Run  
**Date:** 2026-08-08  
**Branch:** `cursor/product-execution-model-v2`  
**Verified HEAD:** `72f140134b973a1f5c7bd3e27538313ff55e1e22`  
**App source:** `artifacts/kidschedule/src`

**Review entry (mandatory):** `/begin` with  
`VITE_FF_AMYNEST_LIVING_UNIVERSE=living` (or unset / `1`) → **all 16 living surfaces ON**

**Not review entry:** `/welcome` neon marketing `LandingPage`

**This document supersedes** the prior Final Apple Audit stamped at `8b68e5bd` / application HEAD `bc4828b4`. That prior verdict **must not** be reused: it predated FA-02 living-universe lock (`2ca49cd2`) and FA-02 P1 mixed-mode production hardening (`26b2c05c`).

**Law:** Audit only. No React · CSS · DB · API · Firebase · RevenueCat · Auth · routing · flag · feature changes. Findings are not implementations. This audit does **not** guarantee Apple approval.

---

## Executive Summary

AmyNest, reviewed through **`/begin`** under the **production-intended living universe** (FA-02 master living / all 16 surfaces forced ON), presents as **one calm parenting house** from first impression through remade deep interiors and the Routine Generation crown path.

FA-02 is now **fully hardened**: accidental mixed living/legacy production faces are blocked, and **explicit** `mixed` in production is **rejected** (build fail + resolver throw).

| Lens | Verdict |
|---|---|
| One coherent application (living `/begin`) | **YES** (craft residuals → portfolio **MOSTLY→YES**) |
| Deep interiors foreign products? | **NO** for named Pre-Final blockers; portfolio **MOSTLY→YES** |
| Parent Hub coherent? | **YES** |
| Premium trustworthy on hard day? | **YES** (P0-7 intact) |
| Routine Generation Apple-quality? | **MOSTLY→YES** |
| Production living universe locked? | **YES** |
| Accessibility device-certified? | **NO** |
| Genuine product P0 blockers? | **NO** |
| Ready for uncontrolled “ship to millions”? | **NO** |
| Ready for **controlled** Apple review with accepted cert debt? | **CONDITIONAL → YES under conditions** |

### One sentence

> Under living `/begin` with FA-02 hardened, AmyNest is one coherent parenting product ready for controlled Apple submission **with accepted device-accessibility certification debt** — not a mass-scale or accessibility-certified ship, and not a promise of Apple approval.

### Absolute judgments (preview)

| # | Question | Answer |
|---|---|---|
| 1 | ONE coherent product? | **YES** (living production path) / portfolio craft **MOSTLY→YES** |
| 2 | Deep interiors remain coherent? | **MOSTLY→YES** |
| 3 | Parent Hub coherent? | **YES** |
| 4 | Premium trustworthy? | **YES** |
| 5 | Routine Generation Apple-quality? | **MOSTLY→YES** |
| 6 | Production living universe locked? | **YES** |
| 7 | Accessibility fully device-certified? | **NO** |
| 8 | P0 product blockers? | **NO** |
| 9 | P1 blockers? | **YES** |
| 10 | Controlled release ready? | **CONDITIONAL** |
| 11 | Recommend Apple submission today? | **CONDITIONAL** |

---

## Review Entry

| Item | Evidence |
|---|---|
| Canonical path | `AppCore.tsx` `path="/begin"` → `FirstExperiencePage` |
| Unsigned / auth timeout | Redirect → `/begin` (“Value-before-identity”) |
| Production universe | FA-02: unset / `living` / `1` / `true` → all 16 surfaces ON |
| First-impression copy | “Begin with today” · “One next right thing — formed only from what you share.” (`first-experience.tsx`) |
| Keep → identity | `/sign-up?from=first-experience` — identity protects value |
| Non-review contrast | `/welcome` → neon `LandingPage` (`landing.tsx`) — **excluded from scoring as production first experience** |

**Verified:** Reviewers must use `/begin`. Scoring the neon `/welcome` universe as the production door would be incorrect.

---

## Portfolio Scope

Audited under living universe ON:

Welcome `/begin` · Signup Keep · Child Discovery · Today Home · Parent Hub (Help / Understand / Care / Moments) · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · Birth Sky · Ask Amy · Guidance · Moments · Talking Amy · Amy Coach · Amy Audio · Routine Generation

**Sources of truth re-checked (not blindly assumed):**

- `AMYNEST_PRE_FINAL_REMEDIATION_VERIFICATION.md` — Decision A; Health/Grow/Birth Sky cleared; Speech P1 acceptable; Hub/P0-7 intact; P0-9 OPEN  
- `AMYNEST_PRE_FINAL_APPLE_PORTFOLIO_CONSISTENCY_AUDIT.md`  
- FA-02 lock / verification / hardening reviews (`2ca49cd2` · `fa775176` · `26b2c05c`)  
- P0-6 · P0-7 · P0-9 · Speech / Health / Grow / Birth Sky deep reviews  
- Current HEAD implementation (`amynest-living-universe.ts`, living helpers, Hub rooms, hard-day monetization)

Auth-gated deep leaves verified primarily by **code + remediation evidence**. Authenticated Today Home / Hub full visual re-capture remains limited in this Linux VM (**NOT TESTABLE** fully authenticated).

---

## Currently Accepted Remediations — Verification

| Remediation | Status at HEAD | Evidence |
|---|---|---|
| P0-7 Hard-Day Monetization | **INTACT** | `hard-day-monetization.ts` — MFHO floor 4; soft-continue; no auto-paywall; FOMO suppressed; `PREMIUM_VOICE` |
| P0-6 Parent Hub peer catalogue | **INTACT** | Rooms V1: Help/Understand/Care/Moments; one recommend + quiet paths; no peer mall on living face |
| Speech Coach deep interior | **ACCEPTABLE** (P1 mid-play debt) | `speech-coach-living-deep.css` + living sanctuary; mid-play coins/themes residual |
| Health Lab deep interior | **CLEARED** | `health-lab-living-deep.css`; neon HoldOrb/starfield gated OFF when living |
| Grow deep interior | **CLEARED** | Beads & counting / Sounds & letters; PRO Zone / Unlock theatre gated |
| Birth Sky deep interior | **CLEARED** | `birth-sky-living-deep.css`; Amy Astro chassis behind living OFF only |
| FA-02 Living Universe lock | **VERIFIED** | Master forces 16 surfaces; accidental per-module mix blocked |
| FA-02 mixed-mode hardening | **VERIFIED** | Production + `mixed`/`allow_mixed` → build throw + resolver throw (`26b2c05c`) |

---

## First Impression

**Entry:** `/begin` soft-morning First Experience (living photography rooms).

| Criterion | Result | Evidence |
|---|---|---|
| Calm | **YES** | Soft photography · one intention · whisper kickers |
| Human | **YES** | Mother/child presence before features |
| Trustworthy | **YES** | “formed only from what you share” · privacy-respecting framing |
| Purposeful | **YES** | “Begin with today” · next right thing |
| Parent-first | **YES** | Value before identity; Keep protects progress |
| Premium | **YES** | Restraint · materials · spacing |
| Coherent | **YES** | One continuous day language — not neon SaaS splash |
| CTA legibility | **RISK** | Continue taupe-on-dark — calm aesthetic vs contrast debt (**P1**) |

**Score contribution:** Strong production door. Not neon. Not game. Not helpdesk.

---

## One Product Test

**Question:** Hide the logo. Did I leave the same application when entering another destination?

| Destination | Same application? (living ON) | Notes |
|---|---|---|
| Welcome `/begin` | **YES** | Soft-morning house |
| Today Home | **YES** | One next action |
| Parent Hub Help/Understand/Care/Moments | **YES** | Room streams, not mall |
| Infant Care | **MOSTLY→YES** | Nested care density |
| Speech Coach | **MOSTLY→YES** | Sanctuary; mid-play P1 peek |
| Nutrition | **MOSTLY→YES** | Living open; score theatre can peek |
| Health Lab | **YES** | Care sanctuary deep (blocker cleared) |
| Grow | **YES** | Growth practice (edtech cleared) |
| Birth Sky | **YES** | Understand deep (Astro cleared) |
| Ask Amy / Guidance / Moments | **YES** | Companion / stream |
| Talking Amy / Amy Coach / Amy Audio | **MOSTLY→YES** | Mode/desk residue |
| Routine Generation | **YES** | Today's plan crown path |
| `/welcome` marketing | **NO** | Other OS — **excluded** |

### Answer

**MOSTLY → YES** on the production living path.

Residual “different app” feeling comes from **craft density / mid-session peeks**, not from a second visual universe under FA-02 living. Accidental Living A + Legacy B is no longer a production default path.

---

## Deep Interior Audit

For every major destination: Entry → Opening → Core → Deep → Result → Premium → Completion → Exit.

| Destination | Entry | Deep | Becomes another product? | Blind (one app?) |
|---|---|---|---|---|
| Health Lab | Care open | `hl-living-deep` practice | **NO** | **YES** |
| Grow | Understand stream | Beads & counting / Sounds & letters | **NO** | **YES** |
| Birth Sky | Understand open | `bs-living-deep` | **NO** | **YES** |
| Speech Coach | Sanctuary | Sanctuary deep; mid-play coin/theme peek | **MOSTLY NO** | **MOSTLY** |
| Infant Care | Living Care | Nested care panels denser | **MOSTLY NO** | **MOSTLY** |
| Ask Amy | Companion | Soft-continue help-first | **NO** | **YES** |
| Talking Amy | Sanctuary open | Mode residue | **MOSTLY NO** | **MOSTLY** |
| Amy Coach | Beside you | Goal/category desk | **MOSTLY NO** | **MOSTLY** |
| Amy Audio | Quiet listen | Age/listen desk | **MOSTLY NO** | **MOSTLY** |
| Routine Generation | Today's plan | Build → Here it is → Begin → Care → Exit | **NO** | **YES** |
| Nutrition / Guidance / Moments | Living streams | Mild deepen | **NO** | **YES** |

**Independent verification of Pre-Final remediation conclusions:** **CONFIRMED** under FA-02 living for Health Lab · Grow · Birth Sky clearances; Speech remains acceptable P1 debt; Hub P0-6 and P0-7 intact.

---

## Parent Hub

| Check | Result |
|---|---|
| Help / Understand / Care / Moments | **YES** — `PARENT_HUB_ROOM_IDS` + living streams |
| One intention | **YES** |
| One recommended path | **YES** |
| Quiet secondary paths | **YES** (`data-demoted`) |
| No catalogue / mall / gaming / dashboard theatre / browsing loop | **YES** on living Rooms V1 |
| P0-6 regression | **NONE found** |

**Verdict:** Parent Hub is coherent.

---

## Today Home Boundary

| Law | Runtime evidence |
|---|---|
| Today Home wins when one action is enough | `TodayHomeShell` + NRT (`passesTodayHomeLaw` / `resolve-today-nrt`) when Today Home V1 ON |
| Hub for Help / Understanding / Care / Presence | Rooms V1; Hub primarily **pull** (tab / deep link) |
| Browsing is not a valid Hub trigger | No “what's new” mall at the door on living face |
| Boundary helper | `resolveHomeHubBoundary` in philosophy — documented law |

**Verdict:** Entry Law is **structurally obeyed** on the living production path.

---

## Companionship

| Surface | Companion? | Not chatbot / helpdesk / AI demo / SaaS? |
|---|---|---|
| Ask Amy | **YES** | Soft-continue; help before monetization |
| Emotional Support | **YES** | P0-7 MFHO |
| Speech Coach | **YES** | Living sanctuary (mid-play P1) |
| Amy Coach | **YES** | “Beside you” |
| Talking Amy | **MOSTLY** | Mode residue |
| Guidance | **YES** | Stream |
| Routine Generation | **YES** | “I'm here with {child} for today” |

**Verdict:** Amy feels like a companion on the living path — not a SaaS assistant demo.

---

## Routine Generation

Core product — audited seriously. Engine **not** modified or re-scored as implementation.

| Beat | Living ON evidence |
|---|---|
| Entry | Product “Today's plan”; companionship open (`living-entry.ts`) |
| Context | Verified chips only |
| Ready | Ready moment copy (why / next / doNext) |
| Build today's plan | `livingRoutineBuildCta()` → **“Build today's plan”** |
| Generation stages | `ROUTINE_HANDOFF_STAGES` — gathering / placing / fitting / checking |
| Truthfulness | Stages thematically map pipeline; UI advances on a **~2.8s timer**, not live engine events — calm, not CoT theatre; **P2 honesty debt** |
| Here it is | Result reveal |
| WHAT / WHY / WHEN / HOW | `routine-living-result.tsx` + `buildLivingWhyProof` / day arc / Start here |
| Begin today | `livingResultBeginCta()` → **“Begin today”** |
| Rebuild | Confirm-gated |
| Execution | Presence language (not XP%) |
| Completion / Exit | Continuity exits → Today Home / Hub / Coach / Audio |

**Patent honesty:** Repo contains one Indian Provisional package with indicative claims. **Do not claim “15 patents.”** Living path avoids patent theatre.

**Routine score:** **8.5 / 10**

---

## Premium

| Requirement | Result |
|---|---|
| Continuity / support / confidence / time / deeper help | **YES** — `PREMIUM_VOICE` |
| Unlock / marketplace / FOMO / sales interruption | **Suppressed** on hard-day + living gates |
| Meaningful help before monetization | **YES** — P0-7 Hard-Day Law |
| P0-7 D1–D8 | **INTACT** |
| Pricing / RevenueCat / entitlements | Untouched by FA-02 / craft remediations |

**Premium score:** **8.5 / 10** — trustworthy.

---

## Trust / Truth

| Risk class | Living-path finding | Class |
|---|---|---|
| Unsupported medical / diagnosis claims | Disclaimers retained; no new diagnosis theatre found | **none new** |
| Unsupported AI / fake reasoning | Living Routine avoids “AI is thinking”; timer stages | **P2** honesty |
| Scientific overclaim | Birth Sky reflective / never fate on living face | **none** living deep |
| Astrology certainty | Softeners on living Birth Sky | **none** living open/deep |
| Fear/guilt monetization | P0-7 suppresses | **none** hard-day Help |
| Patent exaggeration | Living hides; elsewhere may say patent pending | **P2** if overclaimed; **not** “15 patents” |
| Fake loading claims | Timed handoff ≠ live pipeline events | **P2** / ACCEPTED DEBT |

No invented concerns. Only evidence-backed residuals above.

---

## Visual System

Compared against Welcome `/begin` · Today Home · Parent Hub living materials.

| Question | Answer |
|---|---|
| Variation due to room PURPOSE? | **YES** — Help vs Understand vs Care vs practice vs plan |
| Variation due to DIFFERENT DESIGN SYSTEM? | **NO** under FA-02 living; **YES** only on `/welcome` marketing or intentional coherent legacy rollback (`master=0`) |

Photography · typography · night/sand materials · quiet cards · cream CTAs · calm loading/completion recur across remade living surfaces. Nested density ≠ second OS.

---

## Accessibility

### DEVICE CERTIFICATION (authoritative)

From `AMYNEST_P0_9_ACCESSIBILITY_CERTIFICATION.md` + this VM (no iOS/Android a11y host):

| Claim | Status |
|---|---|
| VoiceOver | **NOT CERTIFIED** |
| Dynamic Type | **NOT CERTIFIED** |
| TalkBack | **NOT TESTED** |
| Real-device touch targets | **NOT CERTIFIED** |
| Real-device reduced motion | **NOT CERTIFIED** |
| Overall device certification | **NOT COMPLETE** |

### STATIC EVIDENCE (supporting only — not certification)

- Leave continuity nav labels on remade paths  
- Ask Amy soft-continue `role="status"` / `aria-live`  
- Speech living mic live regions  
- 48px / `min-h-11`+ targets on remade CTAs  
- `prefers-reduced-motion` in Speech / Health / Grow / Birth deep CSS  
- Hub room recommend / quiet buttons  

**Do not mark VoiceOver / Dynamic Type / TalkBack / touch = PASS.**  
**Do not hide this limitation.**

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

Residual: Speech mid-play theme/coins (**P1**); Health finger CTA gradient peek (**P2**).

---

## Navigation

| Path | Verdict |
|---|---|
| Home / Today | Present |
| Today's plan | Living continuity exits |
| Beside you / Rooms | Hub Rooms V1 |
| Back / nested | Module shells + FE backs |
| Deep links | Enter remade leave titles under living ON |
| Browser/mobile back | Present on FE / module shells |
| Exit to life | `AmyNestLeaveContinuity` on Speech / Health / Grow / Birth Sky / Ask Amy / Routine; **gaps** on Infant / Nutrition / Coach / Audio / Talking Amy |

**Dead ends:** No systemic dead end on remade paths. Leave-continuity gaps remain **P1**.

---

## FA-02 Production Lock

| Contract | Status at HEAD |
|---|---|
| unset / living / 1 / true → living (all 16 ON) | **YES** |
| 0 / false / legacy → coherent legacy (all 16 OFF) | **YES** |
| mixed → DEV/TEST only | **YES** |
| production + mixed / allow_mixed → **REJECTED** | **YES** — Vite build assert + resolver throw (`26b2c05c`) |
| Accidental mixed via per-module flags under living/legacy master | **IMPOSSIBLE** |
| 16 surfaces covered | **YES** (`AMYNEST_LIVING_SURFACE_FLAGS.length === 16`) |

**Production living universe locked:** **YES**

Do not modify the lock in this audit.

---

## Production Safety

| Risk | Evidence | Class |
|---|---|---|
| Accidental mixed living/legacy face | **Closed** by FA-02 + hardening | Cleared |
| Explicit production mixed | **Rejected** | Cleared |
| Coherent emergency rollback | `master=0` + rebuild | Intentional / good |
| `/welcome` neon still reachable | LandingPage; FE “Not now” can escape here | **P1** ops if used as review |
| Auth → `/begin` | Correct | Good |
| RevenueCat / billing / Firebase / auth linking / guest | Prior readiness gaps for **mass scale**; remediations experience-only | **Ops / controlled-release debt** |
| AI abuse / consent / tenancy | Prior readiness concerns remain; not craft blockers | Report |
| DB / API / Auth / Analytics contracts | Untouched by FA-02 | Safe from this change set |
| Deep links | Enter living helpers under master living | Good |

**Craft remediations + FA-02 did not change DB/API/RC/Firebase engines.**  
Mass-scale production readiness remains **conditional / no for millions**.

---

## Business Readiness

| Question | Answer |
|---|---|
| Does the product demonstrate value? | **YES** — `/begin` → Today Home → Routine / Ask Amy / Care |
| Value proposition clear? | **YES** |
| Premium feel justified? | **MOSTLY→YES** as continuity (P0-7) |
| Meaningful value before monetization? | **YES** on hard-day Help / Emotional / living Routine |
| Encourage repeat use? | **MOSTLY→YES** |
| Would a parent recommend it? | **MOSTLY→YES** under living face |
| Conversion statistics? | **Not invented** |
| Apple approval assumed? | **NO** |

---

## Emotional Moat

| Moat | Verified evidence | Overclaim avoided |
|---|---|---|
| Routine Generation | Living WHAT/WHY/WHEN/HOW + Begin today + continuity | Not free-form AI magic |
| Companionship | Ask Amy + hard-day non-interrupt + Coach beside you | Not every nested chrome |
| Parent-child continuity | Soft-continue · leave exits · name-first `/begin` | Leave gaps remain |
| Personalization | Context chips / WHY from real fields | Not invented Discovery |
| Experience | FE photography sanctuary + one-house living lock | `/welcome` second OS excluded |
| Technical / patent-supported | **One provisional package with indicative claims** | **Not “15 patents”**; grant unverified |

---

## Scorecard

| Dimension | Score | Evidence |
|---|---|---|
| First Impression | **8.5** | `/begin` calm photography door; CTA contrast risk |
| Visual Identity | **8.5** | Living house materials under FA-02; `/welcome` excluded |
| Product Identity | **8.5** | Parenting app under living `/begin` |
| House Consistency | **8.5** | Rooms differ by purpose; universe locked coherent |
| Deep Interior Consistency | **8.0** | Named blockers cleared; Speech/nested residuals |
| Navigation | **7.5** | Life exits on remade paths; leave gaps elsewhere |
| Companionship | **8.5** | Ask Amy / Coach / Routine / Speech living |
| Routine Generation | **8.5** | Living crown path; timed stages honesty deduct |
| Premium Experience | **8.5** | P0-7 D1–D8 + PREMIUM_VOICE |
| Trust | **8.0** | Living clean; timer/patent residuals P2 |
| Accessibility | **3.0** | Device cert **NOT COMPLETE**; static only |
| Motion | **8.0** | Theatre suppressed living; Speech mid-play P1 |
| Parent Clarity | **8.5** | What/why/next clear on Home/rooms/Routine |
| Business Readiness | **8.0** | Value path clear; no fake metrics |
| Production Safety | **8.0** | FA-02 hardened; `/welcome` + mass-scale ops residual |
| **Apple Readiness** | **8.0** | Craft coherent; capped by a11y certification debt |

**Portfolio craft mean (ex-a11y):** ~8.3  
**With honest a11y:** readiness capped by certification debt — not by product federation.

---

## Top 10 Remaining Issues

| ID | Surface | Severity | Evidence | Apple impact | Required action |
|---|---|---|---|---|---|
| FA-01 | Portfolio a11y | **ACCEPTED CERT DEBT** / NOT TESTABLE here | P0-9: VoiceOver/Dynamic Type/TalkBack **not tested** | Guideline risk **if claimed** | Real-device certification before any a11y claim |
| FA-02 | ~~Dual-universe accidental mix~~ | **CLEARED** | FA-02 lock + P1 hardening (`26b2c05c`) | Was review inconsistency risk | Keep master living for review builds |
| FA-03 | `/welcome` neon Landing | **P1** (P0 only if used as review) | `LandingPage` purple/pink OS | Reviewer confusion if wrong door | Keep review on `/begin`; quarantine marketing path |
| FA-04 | Speech mid-play coins/themes | **P1** | `speech-game-flow.tsx` ungated play chrome | Craft inconsistency mid-session | Living suppress mid-play (future Founder order) |
| FA-05 | Leave continuity gaps | **P1** | Infant / Nutrition / Coach / Audio / Talking Amy lack `AmyNestLeaveContinuity` | Nested trap feel | Extend leave continuity |
| FA-06 | `/begin` CTA contrast | **P1** | Taupe Continue on charcoal | HIG contrast risk | Contrast tune (later) |
| FA-07 | Production scale (auth linking / RC ops / tenancy) | **Ops debt** (not craft P0 for controlled review) | Prior production readiness | Support risk at millions | Ops certification separate from craft |
| FA-08 | Nested Grow / Birth Sky / Health panel density | **P2** | Lesson desks · astronomy panels · motifs | Mild | Optional quieting |
| FA-09 | Infant activation prediction/unlock i18n | **P1** | Activation copy keys | Trust residue | Copy pass (later) |
| FA-10 | Patent microcopy outside living Routine | **P2** | pricing/profile/legacy | Trust/legal tone if overclaimed | Provisional-honesty wording only |

---

## P0 / P1 / P2 Matrix

| Severity | Items |
|---|---|
| **P0 product blockers** | **None** under living `/begin` + FA-02 hardened |
| **ACCEPTED CERTIFICATION DEBT** | FA-01 device a11y cert OPEN (VoiceOver / Dynamic Type / TalkBack / real-device settings) |
| **P1** | FA-03 `/welcome` if in path · FA-04 Speech mid-play · FA-05 leave gaps · FA-06 `/begin` contrast · FA-09 Infant activation copy |
| **P2** | FA-08 panel density · FA-10 patent microcopy · Health craft peeks · Routine timer stages |
| **Ops debt (controlled ≠ millions)** | FA-07 auth linking / RC sandbox / tenancy / AI abuse scale |
| **CLEARED since prior Final Apple** | Accidental / explicit production mixed universe (FA-02 + hardening) |
| **NOT TESTABLE** | Full authenticated Hub/Today visual pass · physical a11y devices in this VM |

---

## Accepted Debt

| Debt | Class |
|---|---|
| **P0-9 device accessibility certification incomplete** | **ACCEPTED CERTIFICATION DEBT** — operational limitation of this environment; must not be claimed as PASS |
| Health Lab finger CTA gradient / reactor mid-HUD peek | **ACCEPTED DEBT** / P2 |
| Grow nested lesson chrome | **ACCEPTED DEBT** / P2 |
| Birth Sky Sky/Patterns data density | **ACCEPTED DEBT** / P2 |
| Speech P1 mid-play (acceptable; do not reopen without order) | **P1** accepted for controlled release |
| Routine timed (not instrumented) handoff stages | **ACCEPTED DEBT** / P2 honesty |
| Coherent legacy rollback via master=`0` | **Intentional** emergency face (rebuild required) |
| Authenticated Hub/Today screenshot pack incomplete in VM | **NOT TESTABLE** fully this run |

---

## Final Questions

| # | Question | Answer |
|---|---|---|
| 1 | Is AmyNest one coherent product? | **YES** (living production path); portfolio craft **MOSTLY→YES** |
| 2 | Do deep interiors remain coherent? | **MOSTLY→YES** |
| 3 | Is Parent Hub coherent? | **YES** |
| 4 | Is Premium trustworthy? | **YES** |
| 5 | Is Routine Generation Apple-quality? | **MOSTLY→YES** |
| 6 | Is the production living universe locked? | **YES** |
| 7 | Is accessibility fully device-certified? | **NO** |
| 8 | Are there P0 blockers? | **NO** (product); certification debt named separately |
| 9 | Are there P1 blockers? | **YES** |
| 10 | Is AmyNest ready for controlled release? | **CONDITIONAL** |
| 11 | Would you recommend Apple submission TODAY? | **CONDITIONAL** |

### Conditions for CONDITIONAL submission / controlled release

1. Review / production face uses FA-02 **living** (unset / `living` / `1`) — never `mixed`  
2. Apple reviewers enter **`/begin`**, never `/welcome`  
3. Do **not** claim VoiceOver / Dynamic Type / TalkBack / real-device a11y certification  
4. Do **not** claim “15 patents” — provisional package honesty only if mentioned  
5. Treat as **soft / controlled** release — not “millions” certification  
6. Founder accepts Speech P1 + leave-gap P1 + `/begin` contrast P1 as known debt  

### What this audit is not

- Not a guarantee Apple will approve  
- Not a mass-scale production certification  
- Not an accessibility device certification  
- Not an implementation order  

---

## Final Verdict

# APPLE READY WITH ACCEPTED CERTIFICATION DEBT

### Certification limitations (must remain visible)

1. **P0-9 real-device accessibility certification is NOT COMPLETE**  
   - VoiceOver: **NOT CERTIFIED**  
   - Dynamic Type: **NOT CERTIFIED**  
   - TalkBack: **NOT TESTED**  
   - Real-device touch targets / reduced motion: **NOT CERTIFIED**  
2. Static / browser / unit evidence is **supporting only** and must not be substituted for device certification.  
3. Mass-scale billing / auth-linking / tenancy ops remain **outside** this craft readiness verdict.

### Genuine product blockers preventing APPLE READY?

**None** under the production living universe + `/begin` review path after FA-02 hardening.

### Cleared since prior Final Apple Audit

| Prior issue | Now |
|---|---|
| FA-02 dual-universe ops as P0 (accidental / explicit production mixed) | **CLEARED** — master lock + production mixed rejected |
| Named deep-interior federation (Health / Grow / Birth Sky) | **Remain cleared** (re-verified) |

---

## Founder Recommendation

**Authorize controlled Apple review preparation under the conditions above**, while treating P0-9 as explicit accepted certification debt — **or** pause for a real-device accessibility certification sprint first if the submission narrative requires a11y claims.

| Option | Meaning |
|---|---|
| **A** | Device a11y certification sprint (P0-9) before submission |
| **B** | Controlled submission now: living face locked · `/begin` only · no a11y overclaim · accepted cert debt |
| **C** | Narrow P1 craft (Speech mid-play · leave continuity · `/begin` contrast) before submission |

Craft trajectory:

| Was (prior Final Apple @ pre-FA-02) | Now (re-run @ HEAD `72f14013`) |
|---|---|
| Apple Readiness ~7.0 · CONDITIONAL | **Apple Readiness ~8.0 · READY WITH ACCEPTED CERT DEBT** |
| Dual-universe production risk P0 | **Locked + mixed production rejected** |
| Deep interiors MOSTLY | **MOSTLY→YES** (named blockers remain cleared) |
| P0 product + ops face-lock | **No product P0**; cert debt named |

---

## Screenshots / visual notes

Prior captures remain useful contrast references where present under `/opt/cursor/artifacts/` (`final-apple-begin-primary.webp`, `final-apple-welcome-contrast.webp`). This re-run did not require new product implementation or UI changes; authenticated Hub/Today full re-capture remains **NOT TESTABLE** in this VM.

---

## Commit SHA

**Verified application HEAD:** `72f140134b973a1f5c7bd3e27538313ff55e1e22`  
**FA-02 hardening implementation:** `26b2c05ce8fe8d9cc10fad1dd2e7a95ac90e2bab`  
**Audit document commit:** `a124753e911d6e08817cd6dd9cd885a01cfb8d44`

---

## STOP

No implementation. No findings executed.

**Audit → document → commit → push → STOP for Founder review.**
