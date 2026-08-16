# AmyNest — Final Apple Audit

**Status:** FINAL APPLE AUDIT · SCORING GATE · NO IMPLEMENTATION  
**Authority:** Founder Order — Final Apple Audit  
**Date:** 2026-08-16  
**Branch:** `main`  
**Git HEAD:** `13d7de55` (`13d7de558efe406f6d0ec1e2b4030317c2a9a403`)  
**App source:** `artifacts/kidschedule/src`

**This document supersedes** `docs/v2/AMYNEST_FINAL_APPLE_AUDIT.md` stamped 2026-08-08 at HEAD `72f14013` on `cursor/product-execution-model-v2`. That prior verdict must not be reused: it predated living navigation remanufacture, P1 leave-path containment, and P2/P3 legacy triage on `main`.

**Review entry (mandatory):** `/begin` with living production universe  
(`VITE_FF_AMYNEST_LIVING_UNIVERSE` unset / `living` / `1`) → all 16 living surfaces ON.

**Not review entry:** `/welcome` marketing `LandingPage`.

**Law:** Audit only. No React, CSS, routes, flags, copy, assets, DB, API, Firebase, RevenueCat, auth, analytics, AI, prompts, engines, or P0/P1/P2 repairs. Findings are not implementations. This audit does **not** guarantee Apple approval.

**Method honesty:** This run inspected current `main` HEAD in a Linux VM. TypeScript, targeted Vitest, and production build were executed. Authenticated Today Home / Rooms / interiors were **not** recaptured on a signed-in device. Scoring uses HEAD code + frozen living reviews + P1 containment + P2 triage + this-run gates.

---

## Executive Summary

AmyNest, reviewed as a first-time Apple reviewer would from `/begin` under the production living universe, is **one calm parenting house at the door** and **one house after leave** on the normal living journey.

P1 accidental production escapes (mobile tab bar + Amy FAB, More → Games/Study/Insights/Progress, leftover URLs, phonics unlock theatre, speech live/talk + independent legacy switch, worksheet studio) are **contained**. FA-02 still forbids mixed production. P0-7 Hard-Day Law is intact. Remaining residue is **accepted P2/P3 debt**, not a second production universe.

Device accessibility is **not certified**. That is the honest cap on an unqualified “Apple Ready” claim.

| Lens | Verdict |
|---|---|
| One coherent application (living `/begin`) | **YES** on the normal journey; portfolio **MOSTLY YES** |
| One home at the door | **YES** |
| One home after leave | **YES** on the normal living path |
| Accidental legacy visual universe | **NO** for a normal living user |
| Parent Hub coherent | **YES** |
| Premium trustworthy on a hard day | **YES** (P0-7 intact) |
| Routine Generation Apple-quality | **YES**, with accepted P2 honesty debt on timed stages |
| Amy AI Apple-quality | **YES** as companion, not a ChatGPT clone |
| Navigation Apple-quality | **YES** (living drawer is authority) |
| Living universe production-locked | **YES** |
| Accessibility device-certified | **NO** |
| Genuine product P0 | **NO** |
| Genuine product P1 remaining | **NO** |
| Ready for uncontrolled ship to millions | **NO** |
| Ready for **controlled** App Store submission | **YES, with certification debt** |

### One sentence

> If submitted today as a living-universe production build, reviewed from `/begin`, an honest senior Apple reviewer should understand AmyNest as one parenting home — not a catalogue of leftover products — and should not be blocked by identity federation. They cannot be told the app is VoiceOver / Dynamic Type / TalkBack certified.

---

## Audit Baseline

Frozen and treated as complete (not remanufactured in this audit):

- Living Universe manufacturing + 66K living experience layer
- Amy Coach, Amy Audio, Routine Generation, Amy AI conversation workspace
- Living navigation
- P0-6 Parent Hub · P0-7 Hard-Day · P0-9 accessibility evidence (open cert)
- P1 remediation + P1 leave-path containment
- P2/P3 legacy triage
- FA-02 Living Universe production lock
- Main / SEO integration
- Approved module interiors

Documents used:

- `docs/v2/AMYNEST_FULL_LEGACY_RESIDUE_AUDIT.md`
- `docs/v2/AMYNEST_P1_LEAVE_PATH_REMEDIATION_REVIEW.md`
- `docs/v2/AMYNEST_P2_LEGACY_TRIAGE.md`
- `docs/v2/AMYNEST_PRE_FINAL_REMEDIATION_VERIFICATION.md`
- `docs/v2/AMYNEST_FINAL_PRODUCTION_RELEASE_CANDIDATE.md`
- `docs/v2/AMYNEST_FINAL_VISUAL_REGRESSION.md` (2026-08-07; **superseded for leave/nav** by later P1 work)
- `docs/v2/AMYNEST_P0_9_ACCESSIBILITY_CERTIFICATION.md`
- `docs/v2/AMYNEST_FOUNDER_PORTFOLIO_AUDIT.md`
- `docs/v2/AMYNEST_PRE_FINAL_APPLE_PORTFOLIO_CONSISTENCY_AUDIT.md`

HEAD after those documents: `13d7de55` — P2 triage docs commit on `main` (product containment at `1ec739ec`).

---

## Production Configuration

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `13d7de55` |
| Intended production universe | FA-02 living (unset / `living` / `1`) |
| `.env.production.example` | Documents living default; mixed **forbidden**; rollback `0` / `legacy` |
| Per-module `VITE_FF_*_LIVING_V1=0` under living master | **Ignored** |
| Production + `mixed` / `allow_mixed` | **Rejected** (Vite build throw + resolver throw) |
| Speech `?speechLegacy=1` / `localStorage.speech-coach-legacy` / remote | **Ignored when living ON** |
| Tests | Vitest defaults mixed so per-module tests still work |

Surfaces FA-02 owns (16): Today Home, Parent Hub rooms, Child Discovery Film, Infant, Speech, Nutrition, Health Lab, Grow, Birth Sky, Ask Amy, Guidance, Moments, Talking Amy, Amy Coach, Amy Audio, Routine Generation.

---

## Front Door Review

**Path:** unsigned `/` → `/begin` → `FirstExperiencePage`. Identity Keep → `/sign-up?from=first-experience`. After auth: Today Home `/dashboard` → Parent Hub `/parenting-hub`.

| Question | Answer | Evidence |
|---|---|---|
| Does AmyNest immediately communicate what it is? | **YES** | “Begin with today” / “One next right thing — formed only from what you share.” |
| First experience calm? | **YES** | Soft-morning photography rooms, whisper kickers, one intention |
| Value proposition understandable? | **YES** | Next right thing, formed only from what is shared |
| Parent know what to do next? | **YES** | Continue · child name · age · Keep / Sign in |
| Unnecessary friction? | **LOW** | Value before identity; Sign in is quiet |
| Trustworthy? | **YES** | Privacy-respecting framing; no storefront theatre at the door |
| One coherent product? | **YES** | Not neon SaaS splash; `/welcome` is excluded |

Primary Continue is `.fe-btn-primary`: cream ceramic `#fbf6ee` → `#e6d8c4` with text `#1a120c`, min-height 50px. Prior “taupe-on-dark” P1 is **not** the current button. Contrast of photographic title vs scrim remains **static-only** (not device-certified).

**Front Door score: 8.5 / 10**

---

## Portfolio Review

Living production path, one-home questions (1–10) applied to each required surface.

| Surface | Same home? | Voice / materials | Purpose / next / leave | Another app? |
|---|---|---|---|---|
| Welcome `/begin` | YES | FE photography | Begin with today | NO |
| Signup / Keep | YES | Continuity of FE | Identity protects value | NO |
| Child Discovery | YES | Film / sanctuary | Name, age, context | NO |
| Today Home | YES | One next action | NRT | NO |
| Parent Hub Rooms | YES | Help / Understand / Care / Moments | One recommend + quiet paths | NO |
| Infant Care | YES | Care living | Nested density P2 | MOSTLY NO |
| Speech Coach | YES | Sanctuary; living mid-play coins **off** | Leave continuity present | MOSTLY NO |
| Nutrition | YES | Living opening | Deepen leftover panels P2 | MOSTLY NO |
| Health Lab | YES | Care sanctuary; shop HUD `!living` only | Leave on session complete | NO |
| Grow | YES | Quiet paths | Sounds & letters / Quiet study leaves | MOSTLY NO if Practice library / study body opened |
| Birth Sky | YES | Understand deep | Leave continuity | NO |
| Ask Amy | YES | Companion | Soft-continue; leave | NO |
| Guidance | YES | Stream in Understand | In-hub | NO |
| Moments | YES | Presence stream | In-hub | NO |
| Talking Amy | YES | Sanctuary | Leave continuity | MOSTLY NO |
| Amy Coach | YES | Beside you | Leave continuity | MOSTLY NO |
| Amy Audio | YES | Quiet listen | Leave continuity | MOSTLY NO |
| Amy AI | YES | Same companion as Ask Amy | Drawer/sidebar + leave | NO |
| Routine Generation | YES | Today's plan crown | Own continuity exits | NO |

---

## One-Home Test

Hide the logo. On the **normal** living journey (Home → Rooms → manufactured interior → leave):

**YES — it is the same application.**

Rooms differ by **purpose** (Help vs Care vs practice vs plan), not by a second design system. FA-02 prevents Living A + Legacy B as a production default.

Craft residuals that keep a portfolio-wide **MOSTLY YES**:

- Grow → Quiet study body still `study-zone-premium` (accepted P2)
- Phonics Practice library `<details>` still holds academy widgets (accepted P2)
- Nutrition deepen / More care leftover panels (accepted P2)
- More → Quick help (`/amy-ai-tutor`) leftover tutor (accepted P2)

These are **chosen secondary paths**, not the door.

---

## Leave-Path Test

`AmyNestLeaveContinuity` now offers Home `/dashboard`, Today's plan `/routines`, Amy `/assistant`, Rooms `/parenting-hub`.

Wired at HEAD on: Speech (game / pronunciation / live / conversation), Nutrition, Infant, Coach, Audio, Talking Amy, Ask Amy / Amy AI history, Health session rewards, Birth Sky, Hub module shell, Phonics, Study living, speech-v2 celebration/limit.

Routine uses its own living continuity (`livingContinuityExits`: Today Home, Parent Hub, Beside you, Quiet listen) — not a second nav wall.

Living drawer remains available after leave. Tab bar / FAB are **not mounted** when living.

**After leave, the parent is still inside AmyNest.**

Prior FA-05 (Infant / Nutrition / Coach / Audio / Talking Amy missing leave continuity) is **cleared**.

---

## Navigation Review

| Check | Result |
|---|---|
| Primary IA | Home, Today's plan, Beside you, Amy, Rooms |
| Rooms | Help, Understand, Care, Moments |
| More | Quiet leftovers only (Birth Sky, Nutrition, Quick help, Children, Patterns, Recipes, Plans, Invite, Feedback, Account) |
| Catalogue / product launcher | **NO** — Games, Learning, Insights, Progress, Kids Control removed from living More |
| Duplicate nav universe | Living drawer/sidebar is authority. Legacy tab bar + FAB **not mounted** when living |
| Confusing labels | Primary IA is living language |
| Deep links | Hash rooms living; leftover product URLs redirect (see Legacy Escape) |

Rollback / mixed still shows the old More list and tab bar (intentional).

**Navigation score: 8.5 / 10**

---

## Legacy Escape Review

Baseline: P1 leave-path containment at `1ec739ec`. Living ON:

| Route / switch | Living production | Class |
|---|---|---|
| `/games` | More hidden; URL → `/dashboard` | ROLLBACK ONLY |
| `/rewards` | URL → `/dashboard` | ROLLBACK ONLY |
| `/insights` `/progress` | More hidden; URL → `/dashboard` | ROLLBACK ONLY |
| `/worksheet` `/teacher-os` | URL → `/parenting-hub` | INTERNAL / ROLLBACK |
| `/speech-coach/live-session` `/talk` | URL → `/speech-coach` | ROLLBACK ONLY |
| `/kids-control-center` | More hidden; URL → `/dashboard` | ROLLBACK ONLY |
| `?speechLegacy=1` / `speech-coach-legacy` / remote | **Ignored when living** | ROLLBACK ONLY |
| `/study` `/phonics` | Grow leaves; living titles | SAFE leave (interior P2) |
| `/welcome` | URL only | ACCEPTED P2 |
| `/environment` | URL only | ACCEPTED P2 |

A normal living user **cannot** accidentally enter Games, Rewards, Insights, Progress, Worksheet Studio, or neon Speech cards.

Direct leftover URLs do not silently create a second production universe for the P1 set.

---

## FA-02 Review

| Question | Answer |
|---|---|
| unset / living / 1 → living | **YES** |
| 0 / legacy → coherent rollback | **YES** |
| mixed → production rejected | **YES** |
| Can production accidentally become mixed? | **NO** via env. Per-module `=0` ignored when master is living |
| Can stale localStorage bypass FA-02? | **NO** for universe flags (compile-time). Speech legacy localStorage **cannot** mix neon into living |
| Can per-module flags override living master? | **NO** |
| Can deep links bypass FA-02 chrome? | They cannot mix universes. Contained leftover URLs redirect; Grow leaves keep living shells |

FA-02 remains authoritative.

---

## Premium / Hard-Day Review

Premium voice: continuity, support, confidence, time saved, deeper care (`PREMIUM_VOICE`).

| Surface | Help before pay? | Not now? | Distress monetized first? |
|---|---|---|---|
| Ask Amy | Soft-continue at quota; no auto-paywall | **YES** | **NO** |
| Emotional Support | Free floor 4 MFHO | **YES** | **NO** |
| Speech | Living hub first; paywall after gated live/premium | Dismiss exists | **NO** on default hub |
| Infant | AccessGate quiet | **YES** | **NO** |
| Nutrition / Health / Grow / Birth Sky / Coach / Guidance / Routine / Moments / Talking Amy / Amy AI | Living open first; continuity invitation | **YES** | **NO** |

P0-7 D1–D8 **INTACT** (`hard-day-monetization.ts`). RevenueCat / entitlements / quotas **untouched** by this audit.

Paywall “Here's what unlocks next” (including Games) remains **accepted P2 theatre on an already-open paywall**, not on Today / Rooms first frames.

**Premium score: 8.5 / 10**

---

## Routine Review

Engine frozen. Experience-only judgment.

| Beat | Living evidence |
|---|---|
| Dashboard | Today's plan companionship |
| Context | Verified chips only |
| Ready | Why / next |
| Build | “Build today's plan” |
| Loading | Calm stages; UI timer ~2.8s — **P2 honesty debt** (not live engine events) |
| Result | WHAT / WHY / WHEN / HOW |
| Begin | “Begin today” |
| Rebuild | Confirm-gated |
| Execution | Presence language, not XP% |
| Completion | “Cared” — not 100% theatre |
| Leave | Today Home / Parent Hub / Beside you / Quiet listen |

Differentiated and premium as a **day plan**, not a generic generator. Timer stages are calm, not chain-of-thought theatre, and not a claim that the UI is streaming the engine.

**Routine score: 8.5 / 10**

---

## Amy AI Review

Ask Amy companion workspace (`/assistant`). Amy nav row is the living companion entry. Glowing FAB is not mounted in living.

| Check | Result |
|---|---|
| Blank new chat | Companion workspace, not a SaaS picker (living) |
| History | Side panel + leave continuity |
| Mobile drawer / desktop sidebar | Living IA; Amy is primary |
| Composer | Recent clip fix on `main` (`f496ac7a`); layout tests exist |
| Long responses / markdown | Existing bubble renderer |
| Loading | “Amy is thinking…” — approved truthful wait |
| Slow / error | Soft-continue / retry paths; P0-7 |
| Identity | Amy, not a generic assistant brand |
| ChatGPT clone? | **NO** on the living path |
| Still AmyNest? | **YES** |

Not redesigned in this audit.

**Amy AI score: 8.0 / 10**

---

## Visual Review

Compared to Welcome `/begin` · Today Home · Parent Hub living materials.

| Feel | On normal living journey? | If yes, where |
|---|---|---|
| Neon | **NO** default | Speech neon gated; Health HoldOrb gated |
| SaaS dashboard | **NO** via More | `/environment` URL only |
| Game HUD | **NO** | `/games` redirected |
| Astrology app | **NO** on living Birth Sky open | Cosmic art is Birth Sky by design |
| Edtech marketplace | **NO** first frame | Study body / phonics Practice library if opened (P2) |
| AI demo | **NO** | Ask Amy companion |
| Nutrition SaaS | **NO** opening | Deepen leftover panels P2 |
| Product catalogue | **NO** | More quiet, not Games/Study mall |
| Another company | **NO** | Worksheet LPS redirected |

The Aug 7 visual regression “façade only / blind test NO” **does not describe current `main` after P1**. Openings and leave chrome were remade. Secondary deepen interiors still vary in density.

---

## Accessibility Review

### DEVICE CERTIFICATION (authoritative)

From `AMYNEST_P0_9_ACCESSIBILITY_CERTIFICATION.md` + this Linux VM (no iOS/Android a11y host):

| Claim | Status |
|---|---|
| VoiceOver | **NOT CERTIFIED** |
| Dynamic Type | **NOT CERTIFIED** |
| TalkBack | **NOT TESTED** |
| Real-device touch targets | **NOT CERTIFIED** |
| Real-device reduced motion | **NOT CERTIFIED** |
| Overall device certification | **NOT COMPLETE** |

### STATIC EVIDENCE (supporting only — not certification)

- Living nav landmark; leave continuity `aria-label`
- Ask Amy soft-continue `role="status"` / `aria-live`
- Speech living mic live regions (prior evidence)
- Remade CTAs `min-h-11` / 48–50px (FE primary 50px)
- `prefers-reduced-motion` in Speech / Health / Grow / Birth deep CSS
- Birth Sky accessibility unit tests exist (not device cert)

**Do not mark VoiceOver / Dynamic Type / TalkBack / touch = PASS.**

**Accessibility score: 3.0 / 10** (honest: static only)

---

## Trust Review

| Question | Answer |
|---|---|
| Would a parent trust this with their family? | **YES** on the living path — help before pay, formed-from-what-you-share, hard-day unblocked |
| Misleading experience? | **NO** if reviewed from `/begin`. **YES** if `/welcome` is used as the door (ops condition) |
| Privacy / consent | Birth Sky consent / disclaimers retained; no new diagnosis theatre found |
| AI transparency | “Amy is thinking…” truthful wait; Routine stages are calm, not fake live CoT |
| Child/family context | Discovery + named child in rooms |
| Error / loading | System 404 generic; remade waits living |

No invented policy violations. Patent: one Indian provisional package — **do not claim “15 patents.”**

**Trust score: 8.0 / 10**

---

## Production Safety Review

| Area | Result |
|---|---|
| Route integrity | `/begin` door; leftover P1 URLs redirect when living; rollback routes remain registered |
| Feature flags | FA-02 lock + mixed production rejection |
| Rollback | `0` / `legacy` coherent |
| Auth | Unsigned → `/begin`; engines/Firebase not modified by containment |
| API / DB / RevenueCat / Firebase / analytics | Untouched by P1 containment / this audit |
| Deep links | Contained leftover set; Grow leaves intentional |
| Error boundaries | Present; crash overlay off on production hosts |
| Environment | `.env.production.example` documents living / forbids mixed |

Mass-scale ops (auth linking, RevenueCat sandbox, tenancy, AI abuse at millions) remain **ops debt**, not a craft P0 for controlled review.

**Production Safety score: 8.5 / 10**

---

## Business Maturity

| Question | Answer |
|---|---|
| Daily use | **YES** — Today Home + Routine + Rooms |
| Subscription justified as continuity | **YES** (P0-7); paywall theatre leftover P2 |
| Repeat use | **YES** |
| Multiple children | **YES** (child identity + lists) |
| Long-term family relationship | **MOSTLY YES** — companionship + leave home |
| Recommend to another parent | **MOSTLY YES** under living face |
| Revenue estimate | **Not invented** |

Not a toy. Not mass-ops certified.

**Business Maturity score: 8.0 / 10**

---

## Apple Simulation

Simulated reviewer: install → `/begin` → signup/Keep → child context → Home → Rooms (Help / Care / Understand / Moments) → Amy → Routine → Premium after value → back → More quiet → loading/empty/error.

| Would they… | Answer |
|---|---|
| Understand the product? | **YES** — next right thing for this child today |
| Be confused? | **LOW** if they stay on living IA. More Quick help is a leftover tutor. `/welcome` confuses only if they bookmark it |
| See unfinished work? | Secondary deepen (study body, phonics details) can look denser / older |
| See something misleading? | **NO** on `/begin` + living. Do not claim a11y certification |
| See a different app? | **NO** on the normal path. Grow Quiet study / expanded Practice library can feel mixed |

Authenticated Hub visual recapture in this VM: **NOT TESTED**. Code + P1/P2 evidence used.

---

## P0 Findings

**None.**

Nothing at HEAD breaks FA-02, auth door, Hard-Day Law, or the manufactured living openings.

---

## P1 Findings

**None remaining as accidental production identity / trust blockers.**

Cleared since the Aug 8 Apple audit:

| Prior ID | Prior P1 | Now |
|---|---|---|
| FA-03 `/welcome` as review door | P1 | **P2 / ops condition** — not in nav; `/begin` is the door |
| FA-04 Speech mid-play coins | P1 | **Cleared on living** — coins/stars gated `living ? null` |
| FA-05 Leave continuity gaps | P1 | **Cleared** — continuity on Infant / Nutrition / Coach / Audio / Talking Amy / Speech / Health / Birth Sky / Ask Amy |
| FA-06 `/begin` taupe CTA | P1 | **Cleared as stated** — cream ceramic button, dark text `#1a120c` |
| Tab bar + FAB / More catalogues / leftover URLs | (later residue audit P1) | **Contained** `1ec739ec` |

Do not reopen these as P1 without new evidence.

---

## P2 / P3

Accepted (see `AMYNEST_P2_LEGACY_TRIAGE.md`):

- `/study` interior still study-zone under a living title
- Phonics Practice library academy widgets behind `<details>`
- `/welcome` marketing bookmark
- `/environment` URL dashboard
- Nutrition deepen / More care leftover panels
- Health Lab shop HUD rollback-only; grown-up dashboard third click
- Paywall next-unlocks theatre (includes Games)
- Debug panel only if `?debug=` / stale `__amynest_debug`
- More Quick help / Patterns / Recipes
- Dead `DrawerNavItem` / unused astro files
- Generic 404 voice
- Routine timed loading stages (honesty)
- Infant nested density; Speech/Coach/Audio desk residue

**P3:** dead nav components, unused assets — no user impact.

---

## Certification Debt

| Item | Status |
|---|---|
| VoiceOver | **NOT CERTIFIED** |
| Dynamic Type | **NOT CERTIFIED** |
| TalkBack | **NOT TESTED** |
| Real-device reduced motion / touch | **NOT CERTIFIED** |
| Signed-in device walkthrough this run | **NOT TESTED** |
| Mass-scale ops (RC sandbox, auth linking, tenancy) | **NOT THIS AUDIT** |

---

## Scorecard

| Dimension | Score | Evidence |
|---|---|---|
| Front Door | **8.5** | `/begin` calm; cream Continue; `/welcome` excluded |
| Product Identity | **8.5** | Parenting home, not a feature launcher |
| Visual Identity | **8.0** | Living house; secondary deepen density remains |
| One-Home Consistency | **8.5** | Normal journey one house; FA-02 locked |
| Deep Interior Consistency | **8.0** | Named interiors remade; study/phonics details P2 |
| Leave Continuity | **8.5** | Living IA exits on portfolio leaves |
| Navigation | **8.5** | Drawer authority; no living tab bar/FAB |
| Premium Experience | **8.5** | P0-7 intact; paywall theatre P2 |
| Trust | **8.0** | Help-first; timer/patent residuals P2 |
| Accessibility | **3.0** | Device cert **NOT COMPLETE** |
| Motion | **8.0** | Theatre gated living |
| Routine Experience | **8.5** | Crown path; timed stages P2 |
| Amy AI Experience | **8.0** | Companion, not clone |
| Production Safety | **8.5** | FA-02 + P1 URL containment |
| Business Maturity | **8.0** | Daily-use product; not millions-ops certified |
| Apple Review Readiness | **8.0** | Coherent product; capped by certification debt |

**Portfolio craft mean (ex-a11y):** ~8.3  
**Overall Apple Readiness:** **8.0** — certification debt, not identity federation, is the cap.

Do not inflate. This is not 9+. This is not a fail.

---

## Previous vs Current

| Item | Aug 8 audit (`72f14013`) | This audit (`13d7de55` `main`) |
|---|---|---|
| Review door | `/begin` | `/begin` |
| FA-02 | Hardened | **Still hardened** |
| One home after leave | P1 gaps | **YES** on normal path |
| Tab bar / FAB | Live leftover (later residue audit) | **Not mounted living** |
| More catalogues | Present | **Contained** |
| Legacy URLs | Escapes | **Redirect living** |
| Speech legacy switch | Independent of FA-02 | **Ignored living** |
| P1 count | Several | **Zero remaining identity P1** |
| P2 | Craft | **Triaged accepted debt** |
| A11y | NOT CERTIFIED | **Still NOT CERTIFIED** |
| Verdict | **C CONDITIONAL — P1 REQUIRED** | **B APPLE READY WITH CERTIFICATION DEBT** |

---

## Final Questions

| # | Question | Answer |
|---|---|---|
| 1 | One coherent product? | **YES** (normal living journey) / portfolio **MOSTLY YES** |
| 2 | One home at the door? | **YES** |
| 3 | One home after leave? | **YES** on the normal living path |
| 4 | Can a normal user enter a legacy visual universe? | **NO** |
| 5 | Any P0 blockers? | **NO** |
| 6 | Any P1 blockers? | **NO** |
| 7 | Remaining P2/P3 acceptable? | **YES** |
| 8 | Premium trustworthy? | **YES** |
| 9 | Hard-Day Law intact? | **YES** |
| 10 | Routine Apple-quality? | **YES** (P2 timer honesty) |
| 11 | Amy AI Apple-quality? | **YES** as companion |
| 12 | Navigation Apple-quality? | **YES** |
| 13 | Living universe production-locked? | **YES** |
| 14 | Rollback coherent? | **YES** |
| 15 | Accessibility device-certified? | **NO** |
| 16 | Ready for controlled App Store submission? | **YES, with certification debt** |

---

## Final Verdict

# B. APPLE READY WITH CERTIFICATION DEBT

### Exact reasons (do not soften)

1. **Device accessibility is not certified.** VoiceOver, Dynamic Type, and TalkBack were **not** tested on a real device. Claiming they pass would be misleading.
2. **This run did not recapture a signed-in Apple reviewer walkthrough on a physical device.** Scoring of authenticated interiors relies on HEAD code + frozen living reviews + P1/P2 documents.
3. **Submission must use the living production universe** (unset / `living` / `1`) and **must be reviewed from `/begin`**, not `/welcome`.
4. **Accepted P2 remains:** Grow Quiet study interior, phonics Practice library widgets, More Quick help, paywall next-unlocks, `/welcome` bookmark. These are not P1 accidental universes.
5. **This is not a mass-scale operational certification** (RevenueCat sandbox, auth linking, tenancy).

This is **not** A (unqualified Apple Ready).  
This is **not** C (P1 remediation required) — P1 accidental escapes are contained.  
This is **not** D (not ready).

---

## Submission Conditions

If the Founder submits this candidate:

1. Ship a **living** production web/native build. Do not ship `mixed`.
2. App Review notes: first screen is **`/begin`**. Do not send `/welcome` as the product door.
3. **Do not claim** VoiceOver, Dynamic Type, or TalkBack certification.
4. Treat remaining P2 as known debt, not a secret.
5. Rollback remains `VITE_FF_AMYNEST_LIVING_UNIVERSE=0` / `legacy` + rebuild.

---

## This-run verification

| Gate | Result |
|---|---|
| TypeScript `pnpm --filter @workspace/kidschedule run typecheck` | **PASS** |
| Targeted living / FA-02 / P0-7 / nav / leave / speech-legacy / routine / module living-room / Amy AI tests | **32 files / 178 tests PASS** |
| Production `pnpm --filter @workspace/kidschedule run build` | **PASS** (`✓ built in 23.95s`) |
| Known skip | `parent-hub-i18n` (pre-existing; not reopened) |
| FA-02 mixed production | Still forbidden by resolver + documented Vite throw (unit-tested) |
| Visual device recapture | **NOT TESTED** this run |
| VoiceOver / Dynamic Type / TalkBack | **NOT CERTIFIED** |

---

## Founder Decision

This audit answers:

> If we submitted the current production candidate to Apple, what would an honest senior Apple reviewer conclude?

They would understand a **calm parenting home**. They would not stumble into Games, Rewards, Worksheet Studio, or neon Speech by normal use. They would not be told the app is accessibility-certified. They would see craft leftovers only if they open Grow Quiet study, expand Phonics Practice library, or More → Quick help.

**Wait for Founder approval.** No implementation. No follow-up remediation from this order.

STOP.
