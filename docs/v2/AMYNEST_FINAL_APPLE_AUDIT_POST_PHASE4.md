# AmyNest — Final Apple Audit (Post Phase 4)

**Status:** FINAL APPLE AUDIT · POST PHASE 4 CERTIFICATION CHECK · NO IMPLEMENTATION  
**Authority:** Founder Order — Final Apple Audit after Phase 4 D3/D4  
**Date:** 2026-08-18  
**Method:** Audit only. No product, routing, flag, interior, monetization, RevenueCat, pricing, API, schema, auth, Firebase, or AI/model changes.

**This document does not supersede** `docs/v2/AMYNEST_FINAL_APPLE_AUDIT.md` (2026-08-16, HEAD `13d7de55`). It is the post-Phase-4 certification check against that accepted product state plus Founder-approved D3/D4.

**Sources of truth used:**

- `docs/v2/AMYNEST_FINAL_APPLE_AUDIT.md`
- `docs/v2/AMYNEST_PHASE4_MONETIZATION_IMPLEMENTATION_REVIEW.md`
- `docs/v2/AMYNEST_P0_9_ACCESSIBILITY_CERTIFICATION.md`
- Candidate source at HEAD below

---

## What was audited

GitHub `origin/main` at this run is `da20fe25` (`fix(ai): recover Amy AI when Redis connection is closed`). **Phase 3 PR #113 and Phase 4 PR #114 are open and not merged.** Literal GitHub `main` therefore does **not** yet contain D3/D4.

The **production candidate after Phase 4** is the stacked branch `cursor/free-premium-phase4-42e5` at:

| Item | Value |
|---|---|
| Candidate HEAD | `5bb33cc0` (`fix(health-lab): authenticate mutations from the real request`) |
| Contains `origin/main` | **YES** — merge-base with `origin/main` is `da20fe25`; no main commits are missing |
| Phase 3 | PR #113 (`cursor/free-premium-phase3-42e5`) — conversion freeze, stacked under Phase 4 |
| Phase 4 | PR #114 — **D3 Health Lab static preview** + **D4 Speech V2 lifetime first-use only** |

This audit scores **that stacked candidate**, not GitHub `main` alone. Shipping “production main after Phase 4” still requires merging #113 then #114 onto `main`.

**Review entry (mandatory):** `/begin` with living production universe (`VITE_FF_AMYNEST_LIVING_UNIVERSE` unset / `living` / `1`).  
**Not review entry:** `/welcome` (`LandingPage`).

**Method honesty:** Linux VM. TypeScript, targeted Vitest / Node tests, and production builds are executed this run. Authenticated Today Home / Rooms / interiors were **not** recaptured on a signed-in physical device. VoiceOver / TalkBack / Dynamic Type were **not** exercised. Do not treat Playwright or desktop emulation as device certification.

**Law:** Findings are not implementations. This audit does **not** guarantee Apple approval. STOP after this report. Wait for Founder approval.

---

## Executive Summary

The stacked production candidate remains **one calm parenting house** on the normal living journey from `/begin`. Phase 4 did not open a second product universe, did not unfreeze Routine or Amy AI engines, and did not change RevenueCat products, entitlements, or prices.

D3 replaces the generic locked Health Lab door with a static Care-room preview and server-side `isPremiumNow` gates. D4 adds a lifetime 90-second Speech V2 first-use bucket (`speech_coach_v2_first_use_seconds` / `day=lifetime`) without touching `FREE_FEATURE_LIMITS` or premium/trial daily buckets.

Mobile bottom navigation and the Amy AI FAB are **mounted again on living pages** (restored on `main` after the 2026-08-16 audit). Per this order they are **intentional**, not legacy.

**DEVICE ACCESSIBILITY CERTIFICATION = OUTSTANDING.** No signed-in real-device walkthrough exists for VoiceOver, TalkBack, Dynamic Type, physical keyboard / IME, or related device behaviours.

| Lens | Verdict |
|---|---|
| One coherent application (living `/begin`) | **YES** on the normal journey |
| One home at the door | **YES** |
| One home after leave | **YES** on the normal living path |
| Accidental legacy visual universe | **NO** for a normal living user |
| D3 Health Lab locked door | **YES** — static, no zone, no HL API |
| D4 Speech V2 first-use | **YES** — lifetime 90s, account-level |
| Monetization / pricing freeze | **YES** |
| FA-02 / P0-7 | **YES** intact |
| Genuine product P0 | **NO** |
| Genuine product P1 remaining | **NO** |
| Accessibility device-certified | **NO** |
| Ready for uncontrolled ship to millions | **NO** |
| Ready for **controlled** App Store submission | **YES, with certification debt** — after #113 + #114 land on `main` |

### One sentence

> If this stacked living candidate is submitted from `/begin`, an honest senior Apple reviewer should still see one parenting home, with a calm locked Health Lab door and a one-time Speech V2 try — and must not be told the app is VoiceOver / TalkBack / Dynamic Type certified.

---

## Previous certified state vs now

| Item | Final Apple Audit 2026-08-16 (`13d7de55` `main`) | This check (`5bb33cc0` stacked) |
|---|---|---|
| Review door | `/begin` | **Unchanged** |
| FA-02 | Hardened | **Unchanged** |
| P1 leave-path containment | Contained (`1ec739ec`) | **Still contained** |
| Living tab bar + Amy FAB | Not mounted when living | **Restored on `main` as intentional** (do not score as legacy) |
| Phase 3 conversion | Not on that HEAD | **On the stack** (freeze tests still describe the contract) |
| Phase 4 D3/D4 | Not present | **Present and contained** |
| GitHub `main` includes D3/D4 | N/A | **Not yet** (PRs open) |
| P0 / P1 | None | **None found** |
| Device a11y | NOT CERTIFIED | **Still OUTSTANDING** |
| Verdict | **B** | **B** |

---

## 1. Production entry

Unsigned `/` (`HomeRedirect`) still sends unresolved / unsigned users to **`/begin`** (`FirstExperiencePage`). `/welcome` remains a separate `LandingPage` route and is not the production door.

Living home IA still presents one AmyNest home:

| Place | Route / chrome |
|---|---|
| Home / Dashboard | `/dashboard` — living label **Home** |
| Today's plan | `/routines` — living label **Today's plan** |
| Beside you / Amy | Drawer: `/amy-coach` + `/assistant` (**Amy**). FAB → Amy AI. Tab-bar center → living coach |
| Rooms | `/parenting-hub` — Help / Understand / Care / Moments |
| Leave | `AmyNestLeaveContinuity`: Home, Today's plan, Amy, Rooms |

`/welcome` is still a marketing/alternate surface. It is not in living primary IA.

**Result: PASS.** No accidental legacy product universe at the door.

---

## 2. Living universe

| Surface | Result |
|---|---|
| Living Home sanctuary | **Holds** — later `main` polish (`8ed25c35`) is sanctuary, not a catalogue |
| Mobile bottom nav | **Intentional** — `Layout` mounts `MobileTabBar` on non-immersive, non-auth, non-assistant conversation routes, including living Home / plan / Rooms |
| Amy AI FAB | **Intentional** — `AmyFab` embedded in the tab bar; enlarged on `main` (`04c21b4e`) |
| Navigation drawer | **Coherent** — `buildLivingNavSections`: Home, Today's plan, Beside you, Rooms, collapsed More |
| Routine sanctuary | **Holds** — living `/routines`; purple hub wrapper removed on `main` (`b6759412`) |
| Amy AI conversation workspace | **Holds** — blank new chat, history drawer/sidebar, markdown |
| Pricing sanctuary | **Holds** — membership sanctuary from `main` (`abcb34c5` / `f90fd9d4`); Phase 4 did not touch prices |
| Purple legacy on normal living journey | **Not the production face.** Health Lab static preview uses Care-room tokens when living ON; violet styles exist only on living-OFF rollback of that same component |

Helper `shouldShowLegacyMobileTabBar()` still returns `false` when living is ON (comment: “living drawer is the navigation authority”). **`Layout` no longer consults that helper.** This is stale helper text vs current intentional tab bar — **P3 source debt**, not a second universe.

**Result: PASS** (intentional tab bar + FAB scored as living chrome, not leftover).

---

## 3. Leave-path / legacy containment

`LivingLeaveRedirect` + `LIVING_DIRECT_URL_CONTAINMENT` when living ON:

| Direct URL | Living destination |
|---|---|
| `/games`, `/rewards`, `/insights`, `/progress`, `/kids-control-center` | `/dashboard` |
| `/worksheet`, `/teacher-os` | `/parenting-hub` |
| `/speech-coach/live`, `/speech-coach/live-session`, `/speech-coach/talk`, `/parenting-hub/speech-coach/live` | `/speech-coach` |

`showSpeechCoachLegacyCards()` still returns **false** whenever living is ON (`?speechLegacy=1` / `localStorage` / remote ignored).

There is **no** standalone `/talk` route. `/speech-coach/talk` is contained.

Nav More still filters Games / Insights / Progress / Kids Control / Study from the catalogue list. Direct `/study` remains a Grow leave shell (**accepted P2**, unchanged).

**Result: PASS.** Previously accepted P1 containment still holds. Phase 4 did not reopen leftover URLs.

---

## 4. Phase 4 — D3 Health Lab

Audited implementation (not redesigned):

| Contract | Evidence | Result |
|---|---|---|
| Free `/health-lab` requires `canAccessHealthLab` | `PREMIUM_ROUTE_METADATA` `accessKey: "canAccessHealthLab"` | **PASS** |
| Locked users do not mount `HealthLabZone` | `ProtectedRoute` renders `HealthLabStaticFreePreview`; `health-lab.tsx` still mounts the zone only after entitlement | **PASS** |
| Locked users get `HealthLabStaticFreePreview` | AppCore branch on `canAccessHealthLab` | **PASS** |
| Calm Care-room presentation | Living tokens, Heart motif, `healthLabLivingOpen` companionship | **PASS** |
| Practice list available | First three `HEALTH_LAB_QUIET_PATHS` titles/purposes (not playable) | **PASS** |
| Premium CTA available | `openSubscriptionGate` + `PREMIUM_VOICE.continueCta` | **PASS** |
| Leave path available | Parent Hub + living `AmyNestLeaveContinuity` | **PASS** |
| Locked preview makes no Health Lab API calls | No `fetch` / `authFetch` / `HealthLabZone` in the preview file | **PASS** |
| Progression reads require `isPremiumNow` | GET profile / dashboard / history → `assertHealthLabPremium` after child ownership | **PASS** |
| Mutations require `isPremiumNow` | POST sync / session / quest / badge / streak / shop same gate | **PASS** |
| Child ownership enforced | `authChild` → `verifyChildOwner` **before** premium | **PASS** |
| Admin metrics admin-only | `GET /admin/health-lab/metrics` `isAdminUser` 403; not premium-gated | **PASS** |

POST handlers pass the real `req` into `authChild` so `getAuth` sees Firebase auth. That is the Phase 4 compatibility fix, not an entitlement bypass.

**Deviation vs Founder D3 contract:** **None.**

**P2/P3 note (not a D3 miss):** the same preview file has a non-living violet fallback for FA-02 rollback. Production living does not use it.

---

## 5. Phase 4 — D4 Speech V2

| Rule | Implementation | Result |
|---|---|---|
| Feature `speech_coach_v2_first_use_seconds` | `SPEECH_COACH_V2_FIRST_USE_FEATURE` | **PASS** |
| `day = lifetime` | `SPEECH_COACH_V2_FIRST_USE_DAY` | **PASS** |
| Not in `FREE_FEATURE_LIMITS` | Explicitly omitted; freeze + API tests assert this | **PASS** |
| Account-level `userId`, shared across children | `usage_daily` keyed by `userId` only | **PASS** |
| Page open does not consume | Usage GET / policy peek; new users peek 0 with no increment | **PASS** |
| Start does not consume | `registerActiveSession` does not call `chargeSpeechCoachV2FirstUseSeconds` | **PASS** |
| Heartbeat / terminate charge actual ticks | Charge only in those paths; cap remaining; existing 1–15s tick math | **PASS** |
| After 90s, existing continuation / paywall | `first_use_limit_reached` + limit-reached copy (not “come back tomorrow”) | **PASS** |
| No UTC reset | `day=lifetime`; remaining stays 0 the next calendar day | **PASS** |
| Premium 600s/day | `SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS`; `isFirstUseFree: false`; no lifetime charge | **PASS** |
| Trial 120s/day | `SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS`; first-use not overlaid on active trial | **PASS** |
| Premium/trial buckets not corrupted | Paid/trial return before peek/charge of lifetime row | **PASS** |

Talk-with-Amy remains `speech_conversation_first_use` (independent). No schema change.

Peek may **seed** inferred prior V2 seconds (capped at 90) so a downgraded account does not get a fresh demonstration. That is not consuming unused first-use; it is the documented anti-reset seed.

**Deviation vs Founder D4 contract:** **None.**

---

## 6. Monetization safety

Diff of Phase 4 vs Phase 3 does **not** include RevenueCat project files, product IDs, offerings, packages, webhook handlers, or `pricing-region.ts`.

| Check | Result |
|---|---|
| RevenueCat products | **Unchanged** by D3/D4 |
| Entitlements | Still `REVENUECAT_ENTITLEMENT_ID ?? "premium"`; `canAccessHealthLab` still `isPremiumNow` |
| Product IDs / prices / country pricing | **Unchanged** (`INR_PLAN_PRICES` 199 / 999 / 1499) |
| Checkout / restore / cancel copy | Preview + Speech limit-reached keep cancel/restore language; no new checkout |
| P0-7 | Intact. Phase 3 added `ASK_AMY_SOFT_CONTINUE.resetHint` only; Phase 4 did not touch the helper |
| Phase 3 monetization freeze | Still encoded in `free-premium-phase3-freeze.test.ts` (no trial before first routine; no Upgrade/Zap on Ask Amy exhaust) |
| Hidden paywall before value | Health Lab shows practice list + calm room **before** CTA. Speech V2 charges only after real ticks |
| Incorrect free allowance consumption | Start/open do not burn 90s |

**Result: PASS.** D3/D4 did not create products, entitlements, price changes, or a premature storefront.

---

## 7. Routine

Phase 4 vs Phase 3: **no** `routines/` or `routine-generation/` file changes.

Living `/routines`, R2 entry, R3 result, empty/ready-plan, Begin today / Build today's plan, and FA-02 living OFF rollback remain the previously certified surfaces (plus later `main` tab-bar-on-routines, which is intentional chrome).

**Result: FROZEN.** This audit introduced no Routine changes.

---

## 8. Amy AI

Phase 4 vs Phase 3: **no** Ask Amy workspace / quota / assistant file changes.

Workspace still: blank new chat on entry (`open an existing local session instead of a blank new chat` is opt-in), persistent local history, mobile history sheet, desktop sidebar, `markdown: true`, living companion language, composer clipping CSS contract.

Phase 3 on the stack added quota-education copy (`amy-ai-quota-hint.tsx`). That is conversion freeze, not a Phase 4 interior remake, and not an API/model change.

`origin/main` Amy AI Redis recovery (`da20fe25`) is already in the candidate.

**Result: FROZEN** for D3/D4. Companion contract holds.

---

## 9. Accessibility

**DEVICE ACCESSIBILITY CERTIFICATION = OUTSTANDING**

| Check | This run | Allowed as certification? |
|---|---|---|
| VoiceOver (physical iOS) | **NOT TESTED** — no device | **NO** |
| TalkBack (physical Android) | **NOT TESTED** — no device | **NO** |
| Dynamic Type | **NOT TESTED** | **NO** |
| Physical mobile keyboard / IME | **NOT TESTED** | **NO** |
| Focus behaviour / focus rings | Source-only (e.g. leave links `focus-visible:ring`; composer `:focus-visible { outline: none }`) | Supporting only |
| Keyboard viewport / composer | CSS contract tests only | Supporting only |
| Touch targets | Source `min-h-11` / `min-h-12` on some CTAs | Supporting only |
| Text clipping | Composer CSS tests; not device | Supporting only |
| Screen-reader labels | Some `aria-label` / `sr-only` in Amy AI history | Supporting only |
| Signed-in real-device walkthrough | **NONE** | **NO** |
| Playwright / desktop emulation | Not used as cert | **NO** |

`docs/v2/AMYNEST_P0_9_ACCESSIBILITY_CERTIFICATION.md` remains: **DEVICE CERTIFICATION NOT COMPLETE**. This run produced **no new device evidence**.

Do not soften this finding. Verdict **A** is forbidden.

---

## 10. Apple reviewer journey (blind test from `/begin`)

Authenticated interiors were **not** recaptured on a device this run. Answers use living production source + prior accepted audit + D3/D4 inspection.

| # | Question | Answer |
|---|---|---|
| 1 | One coherent parenting product? | **YES** on the normal living journey |
| 2 | One clear home? | **YES** — `/dashboard` Home |
| 3 | First meaningful action obvious? | **YES** — Begin with today → Keep / child context → next right thing |
| 4 | Leaving a room still inside AmyNest? | **YES** — continuity Home / Today's plan / Amy / Rooms |
| 5 | Accidental legacy universe? | **NO** for normal use; leftover URLs redirect |
| 6 | Premium surfaces trustworthy? | **YES** — value then continue; P0-7 holds |
| 7 | Pricing coherent? | **YES** — membership sanctuary; prices frozen |
| 8 | Routine native to AmyNest? | **YES** |
| 9 | Amy AI native to AmyNest? | **YES** as companion |
| 10 | Health Lab locked/free makes sense? | **YES** — calm preview, not an empty 402 wall and not a playable free zone |
| 11 | Speech V2 first-use makes sense? | **YES** — one-time try; Premium continues 10 minutes/day; not a daily 90s and not a store trial |
| 12 | Monetization boundaries clear? | **YES** |
| 13 | Any P0? | **NO** |
| 14 | Any P1? | **NO** |
| 15 | Remaining P2/P3 acceptable? | **YES** (same accepted debt + stale tab-bar helper) |
| 16 | Accessibility actually device-certified? | **NO** |

---

## 11. Regression gates

Executed this run against candidate `5bb33cc0`. **No code was changed to make tests pass.**

| Gate | Result |
|---|---|
| TypeScript libs (`pnpm run typecheck:libs`) | **PASS** (pre-commit on this docs branch) |
| kidschedule `tsc` | **PASS** (pre-commit) |
| api-server `tsc` | **PASS** |
| Living / FA-02 / nav / leave-path / speech-legacy | **PASS** (included in 22 files / 115 tests) |
| Routine R2 / R3 / living dashboard | **PASS** |
| Amy AI composer / living-room / latency | **PASS** |
| Health Lab D3 freeze (Vitest) + API premium matrix | **PASS** (API: 39 D3/D4 tests, 0 fail, 0 skip, including DB enforcement) |
| Speech D4 matrix | **PASS** (lifetime, peek, register, heartbeat, premium 600, trial 120, not in `FREE_FEATURE_LIMITS`) |
| P0-7 hard-day (web) | **PASS** (`hard-day-monetization` + `sub-item-gate.hard-day`) |
| FA-02 living universe | **PASS** |
| Phase 3 freeze | **PASS** |
| Phase 4 freeze | **PASS** |
| Pricing living display / source | **PASS** |
| `isPremiumNow` premium-gate | **PASS** (16 tests) |
| Production web build (`pnpm run build:web`) | **PASS** (`✓ built in 23.11s`) |
| Production API build | **PASS** (`[build] OK`) |
| P0 cost-safety **route wiring** | **PASS** (3 tests) |
| P0 cost-safety **integration** | **Cancelled by parent** — Node `--experimental-test-module-mocks` pending event loop. Pre-existing harness issue (same as Phase 4 review). Not treated as a Phase 4 product failure. |

Logs: `/opt/cursor/artifacts/post_p4_web_targeted_tests.log`, `post_p4_api_d3d4_tests.log`, `post_p4_premium_gate_tests.log`, `post_p4_p0_cost_tests.log`, `post_p4_api_typecheck.log`, `post_p4_api_build.log`, `post_p4_web_build.log`.

---

## 12. FA-02 / safety

| Config | Behaviour |
|---|---|
| unset / `living` / `1` | One living universe; all 16 portfolio surfaces ON; per-module `=0` ignored |
| `0` / `legacy` / `false` | One coherent emergency legacy universe; all 16 OFF |
| Production + `mixed` / `allow_mixed` | **Rejected** — Vite `assertAmynestLivingUniverseBuildEnv` throws; resolver throws |
| Vitest / MODE=test | Defaults mixed so per-module tests still work |

`.env.production.example` still documents the same lock. Phase 4 did not add a third visual universe. Health Lab locked preview uses living Care tokens when FA-02 living is ON.

Rollback remains coherent: rebuild with `VITE_FF_AMYNEST_LIVING_UNIVERSE=0`.

**Result: INTACT.**

---

## Summary table

| Area | Result | Evidence | Blocker? |
|---|---|---|---|
| Production door | **PASS** | `/` unsigned → `/begin`; `/welcome` is `LandingPage` | No |
| Living universe | **PASS** | FA-02 + sanctuary Home / Routine / Rooms / pricing | No |
| Navigation | **PASS** | Drawer IA + intentional tab bar + Amy FAB | No |
| Leave paths | **PASS** | `LivingLeaveRedirect` map unchanged | No |
| Routine | **FROZEN** | Phase 4 diff excludes routine files | No |
| Amy AI | **FROZEN** | Phase 4 diff excludes workspace; companion contract present | No |
| Health Lab D3 | **PASS** | Static preview; no zone; `isPremiumNow` on reads/mutations | No |
| Speech D4 | **PASS** | Lifetime 90s, userId, charge on ticks only | No |
| Monetization | **PASS** | No new RC products/entitlements | No |
| Pricing | **PASS** | `pricing-region.ts` untouched vs `main` | No |
| P0-7 | **PASS** | Hard-Day helpers intact | No |
| FA-02 | **PASS** | Mixed production still rejected | No |
| Legacy containment | **PASS** | Games/Rewards/Insights/Progress/worksheet/teacher-os/speech live/talk | No |
| Accessibility | **OUTSTANDING** | No real-device VoiceOver/TalkBack/Dynamic Type evidence | **Certification debt** (not P0/P1 product) |
| Apple reviewer journey | **PASS with debt** | One house from `/begin`; a11y not certifiable | Certification debt |

---

## P0 findings

**None.**

---

## P1 findings

**None.**

Do not reopen contained leave-paths or the restored living tab bar / FAB as P1.

---

## P2 / P3 debt that remains

Accepted from the 2026-08-16 audit (unchanged by Phase 4):

- Grow Quiet `/study` interior
- Phonics Practice library academy widgets
- `/welcome` marketing bookmark
- `/environment` leftover
- Nutrition deepen leftover panels
- Paywall next-unlocks theatre
- More Quick help / Patterns / Recipes
- Routine timed loading stages (honesty)
- Infant nested density; some module desk residue

New / noted this check (not blockers):

- `shouldShowLegacyMobileTabBar` comment/helper is stale vs intentional living tab bar (**P3**)
- Health Lab static preview violet fallback exists for living-OFF rollback (**P3**, not the production living face)
- GitHub `main` does not yet contain Phase 3/4 — **ops merge condition**, not a product P1
- Phase 3 conversion copy (quota education, trial routing freeze) sits under this candidate — already Founder-scoped; not a Phase 4 interior

---

## Required final answers

1. **Is the product still one coherent AmyNest experience?**  
   **YES** on the normal living journey from `/begin`.

2. **Is `/begin` still the correct production door?**  
   **YES.** `/welcome` is not.

3. **Are P0 blockers present?**  
   **NO.**

4. **Are P1 blockers present?**  
   **NO.**

5. **Did Phase 4 introduce any regression?**  
   **NO product regression found** in D3/D4 scope. Phase 4 vs Phase 3 touches Health Lab preview/gates, Speech V2 first-use, and tests/docs only.

6. **Is D3 correctly implemented and contained?**  
   **YES.**

7. **Is D4 correctly implemented and contained?**  
   **YES.**

8. **Did monetization remain frozen?**  
   **YES** (no new products/entitlements; Phase 3 freeze still encoded).

9. **Did pricing remain frozen?**  
   **YES.**

10. **Did Routine remain frozen?**  
    **YES** (Phase 4 did not change it).

11. **Did Amy AI remain frozen?**  
    **YES** (Phase 4 did not change workspace/API/model).

12. **Is legacy containment still intact?**  
    **YES.**

13. **Is FA-02 intact?**  
    **YES.**

14. **Is P0-7 intact?**  
    **YES.**

15. **Is real-device accessibility certified?**  
    **NO. DEVICE ACCESSIBILITY CERTIFICATION = OUTSTANDING.**

16. **What P2/P3 debt remains?**  
    The 2026-08-16 accepted list, plus stale tab-bar helper text, Health Lab rollback violet, and the unmerged PR stack on GitHub `main`.

17. **Is the current build suitable for controlled App Store submission?**  
    **YES, with certification debt**, provided the submitted binary is this **living** stacked candidate (or `main` after #113 and #114 merge), reviewed from `/begin`, and accessibility is **not** claimed.

18. **What, if anything, must happen before submission?**  
    - Merge Phase 3 (#113) then Phase 4 (#114) to production `main` if the store binary is cut from `main`.  
    - Ship FA-02 living (unset / `living` / `1`). Never `mixed`.  
    - App Review notes: first screen is `/begin`.  
    - **Do not claim** VoiceOver, TalkBack, or Dynamic Type certification.  
    - Optional (not a P0/P1 gate): real-device accessibility certification if the Founder wants verdict A.  
    - Do not start another product phase from this audit.

---

## Final verdict

# B. APPLE READY WITH CERTIFICATION DEBT

Not **A** — real-device accessibility certification is not evidenced.  
Not **C** — no P0/P1 product blocker found after D3/D4.  
Not **D** — the living journey remains one AmyNest house.

### Exact reasons (do not soften)

1. **Device accessibility is not certified.** VoiceOver, TalkBack, Dynamic Type, physical keyboard/IME, and a signed-in device walkthrough were not performed.
2. **This run did not recapture authenticated interiors on a physical device.** Reviewer answers for signed-in rooms rely on source + prior accepted audit + D3/D4 inspection.
3. **Submission must use the living production universe** and **must be reviewed from `/begin`.**
4. **GitHub `main` still needs #113 then #114** before it *is* this candidate.
5. **Accepted P2 remains** (study interior, phonics library widgets, `/welcome` bookmark, etc.).

---

## Submission conditions (if Founder proceeds)

1. Cut the store/web binary from this stacked living candidate, or from `main` only after Phase 3 + Phase 4 merge.
2. App Review: first screen `/begin`. Do not send `/welcome` as the product door.
3. Do not claim VoiceOver / Dynamic Type / TalkBack certification.
4. Treat remaining P2 as known debt.
5. Rollback remains `VITE_FF_AMYNEST_LIVING_UNIVERSE=0` / `legacy` + rebuild.

---

## Founder decision

This audit answers:

> After Phase 4 D3/D4, if we submitted the current production candidate to Apple, what would an honest senior Apple reviewer conclude?

They would still understand a **calm parenting home**. They would see a locked Health Lab as a quiet Care room with a continue path, and Speech V2 as a one-time try rather than a daily free quota. They would not stumble into Games, Rewards, Worksheet Studio, or speech-live legacy by normal use. They cannot be told the app is accessibility-certified.

**Wait for Founder approval.** No implementation. No follow-up product phase. No UI polish pass. No Phase 4 modification.

---

## This-run verification

| Gate | Result |
|---|---|
| `pnpm run typecheck:libs` | **PASS** |
| `pnpm --filter @workspace/kidschedule run typecheck` | **PASS** |
| `pnpm --filter @workspace/api-server typecheck` | **PASS** |
| Targeted web Vitest (living, FA-02, nav, leave, Routine R2/R3, Amy AI, D3/D4 freeze, P0-7, Phase 3 freeze, pricing) | **22 files / 115 tests PASS** |
| API D3/D4 + usage policy | **39 tests PASS** |
| `subscription-premium-gate` | **16 tests PASS** |
| P0 cost wiring | **PASS** |
| P0 cost integration | **cancelledByParent** (pre-existing Node harness) |
| `pnpm run build:web` | **PASS** |
| `pnpm --filter @workspace/api-server build` | **PASS** |
| Visual device recapture | **NOT TESTED** this run |
| VoiceOver / Dynamic Type / TalkBack | **NOT CERTIFIED** |

STOP.
