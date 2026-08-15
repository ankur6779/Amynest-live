# AmyNest 66K Experience Layer — Final Production Merge Readiness Audit

**Status:** AUDIT ONLY · NO IMPLEMENTATION · NO MERGE · NO PUSH  
**Authority:** Founder Order — Final Production Merge Readiness Audit  
**Date:** 2026-08-15  
**Branch:** `cursor/product-execution-model-v2`  
**Verified HEAD (pre-doc):** `fa91857e05d38c1bf91a647303d2fb18a28515ad`  
**App source:** `artifacts/kidschedule/src`  
**This is not a Final Apple Audit. This is not a merge.**

**Law of this document:** Current git + current tests + current code beat older prose. No invented evidence. No product changes.

---

## 1. Executive Summary

The product-execution branch carries **408 files / +62,711 / −3,783** versus merge-base `db2094e8` (main `52e7b43d` is **1 commit ahead** of that base). That delta **is** the ~66k AmyNest living experience layer.

Under **`VITE_FF_AMYNEST_LIVING_UNIVERSE` unset / `living` / `1`**, the manufactured living path is **internally coherent** as one parenting house from `/begin` through remade rooms, manufactured modules, Routine living dashboard → R2 → R3, with FA-02 production lock **verified in this run**.

It is **not** a zero-debt ship, **not** device-accessibility certified, and **not** merge-clean against current `origin/main` until the 1-commit SEO/marketing delta is integrated.

| Question | Answer |
|---|---|
| Is the ~66k layer the intended production candidate? | **YES, CONDITIONAL** |
| Can engineering merge it into main *right now* with no git work? | **NO** |
| After Founder approval + integrating main’s 1 SEO commit + keeping `/begin` as the door? | **CONDITIONAL YES** |
| Should product manufacturing continue? | **NO — STOP and prepare merge** |

### Absolute answers (section 16)

| # | Question | Answer |
|---|---|---|
| A | Is the ~66K experience layer complete? | **YES** (campaign complete; documented debt remains) |
| B | Is it internally coherent? | **YES** on living `/begin` production path · **MOSTLY** if `/welcome` is counted |
| C | Are the 21 laws implemented/evidenced? | **PARTIAL** |
| D | Is the living universe production-locked? | **YES** |
| E | Are there P0 product blockers? | **NO** |
| F | Are there P1 blockers? | **YES** |
| G | Are there merge blockers against main? | **YES** (process: 1-commit overlap) |
| H | Safe to merge after Founder approval? | **CONDITIONAL** |
| I | Is real-device accessibility still outstanding? | **YES** |
| J | Should engineering STOP changing the product and prepare the merge? | **YES** |

---

## 2. Exact 66K Experience Layer Scope

| Item | Value |
|---|---|
| Current branch | `cursor/product-execution-model-v2` |
| Current HEAD | `fa91857e` |
| `origin/main` HEAD | `52e7b43d` Reposition AmyNest SEO and marketing as global-first |
| Merge-base | `db2094e8` fix(sound-worlds): stop Android dark overlay freeze (#99) |
| Ahead / behind (`origin/main...HEAD`) | **main 1 ahead · branch 186 ahead** |
| Diff vs merge-base | **408 files · +62711 · −3783 · 237 added · 0 deleted · 171 modified** |
| Working tree at audit start | **Clean** (tracked to `origin/cursor/product-execution-model-v2`) |

**In scope (this 66k):** Product Execution Model → R1 film → Welcome/Signup/Discovery → Today Home → Parent Hub four rooms → Module Manufacturing Framework → 12 module living rooms → Routine R1–R5 + dashboard visual remediation → P0/P1/P0-6/P0-7 → FA-02 lock + mixed reject → docs/v2 campaign.

**Out of scope:** The larger pre-existing kidschedule/API/engine corpus. Not cleaned, not rewritten, not deleted. Compatibility only.

**Not counted as product manufacturing:** `da8173d9` same-origin Vite **dev** API proxy (local/mobile tunnel). Production API contracts unchanged.

---

## 3. Git / Commit Map

```text
FOUNDATION
  269a4006 Product Execution Model
  → Experience V3 boards / visual manufacturing / R1 cinematography
  → 82289084 / cb15ac22 Welcome V3
  → c0969495 / 375a7317 Signup keep
  → 1fd47d25 Question Tax · cf08e3b3 Six Reviews · 596a9765 Reuse
  → bc2024ec / 19fc7db4 Child Discovery
  → 626cd95e Today Home Law · ce772a35 Today Home Hero
  → e06e649b Home↔Hub boundary · 0e03195c Entry Law

ROOMS
  bdd16b32 Constitution
  6e33e434 Pack 1 Room Shell
  c93bc6c7 Pack 2 Living Rooms
  b801b396 Pack 3 Destinations
  579b351c Pack 4 Living Flow
  9bffd1c6 Pack 5 Premium Continuity (study)
  bbfde4eb Pack 4.9 chrome subtraction
  526a5296 Pack 5 destination unification

MODULE MANUFACTURING
  8d38d38f Global Module Experience Audit
  88f969a7 MODULE_MANUFACTURING_FRAMEWORK
  16f26477 Infant Care blueprint

MODULES (Phase 2 manufacture)
  Infant Care 41433545 (+ e6259681 visual fix)
  Speech Coach 50557ad3 / afdfb50d
  Nutrition a27e6f3b / b8abc864
  Health Lab 3b433240 / 81a85fdf
  Grow 3dc47079 / 18c81b7e
  Birth Sky 9bfb2c65 / 27dec4c6
  Ask Amy 6856759a / cf982fce
  Guidance 7c735dca / c6d88a01
  Moments 8398d31b / 1253621d
  Talking Amy 14d7240b
  Amy Coach 11922b54
  Amy Audio e482ed9a

ROUTINE
  79f74df2 / 92c85892 R1 study+blueprint
  0a5ba1e0 R2 · 80eb1bae R3 · 7e8d6c55 R4 · 7e8e41fd R5
  bb6184ab living /routines dashboard (post–Final Apple)
  fa91857e dashboard review doc

P0/P1
  75d3d4f8 P0/P1 select remediation
  2bd53139 P0-7 hard-day
  58dc053f Speech P0 deep
  41158822 P0-6 Hub peers
  89a15eed Health Lab P0 · 97e3e474 Grow P0 · 8e4a97ab Birth Sky P0
  ba2f071a P0-9 a11y evidence (NOT certified)

FA-02
  2ca49cd2 living universe lock
  26b2c05c production mixed REJECT
  fa775176 / 72f14013 verification + stamp

FINAL REMEDIATIONS (after Final Apple re-run a124753e)
  c5840500 stamp
  da8173d9 DEV API proxy (unrelated to product face)
  bb6184ab / fa91857e Routine dashboard visual remediation
```

**Commits after previous Final Apple Audit (`a124753e`):** 4 — stamp, dev proxy, dashboard impl, dashboard docs.

**Documentation-only vs implementation:** Roughly half the 186 commits are `docs(v2)` stamps/reviews. Implementation lives in `feat`/`fix`/`Manufacture` commits listed above.

**Unrelated:** `da8173d9` (dev proxy). Main-only: `52e7b43d` SEO/marketing (not on this branch).

**Experimental / uncommitted:** None at audit start.

---

## 4. 21-Law Compliance Matrix

**Honesty gate:** No repository file enumerates a numbered “Law 1–21” list. The 21 rules below are the **named Founder-absolute laws/rules already created** (philosophy, pillars, constitution, manufacturing framework, Pack 5, P0-7, FA-02). Nothing new was invented.

| # | Law | Source | Implementation | Test/Evidence | Production status | Gap |
|---|---|---|---|---|---|---|
| 1 | Four Pillars — Premium | `docs/PRODUCTION_MANUFACTURING_PILLARS.md` | FE sanctuary, living rooms, photography | Phase 2 / P0 reviews; Apple re-run | **Policy + craft** | `/welcome` still neon marketing |
| 2 | Four Pillars — Product | same | Today Home NRT; Hub rooms; module openings | `resolve-today-nrt.ts` uses `passesTodayHomeLaw` | **Enforced on Home** | Some leave apps still SKU |
| 3 | Four Pillars — Production Safety | same | Routes preserved; engines frozen in orders | This diff: **0 SQL**; RC/Firebase files **not** in 66k | **Observed** | Notification copy only (`notificationContentBuilder.ts`) |
| 4 | Four Pillars — Conversion | same | Value-before-identity `/begin` | First-experience + signup keep | **Craft** | Growth metrics not re-measured this audit |
| 5 | Question Tax Law | `amynest-philosophy.ts` · `docs` | `mayAskParentQuestion` | `amynest-philosophy.test.ts` | **Test-locked axioms** | Gate **not called** from Discovery/forms (only tests) |
| 6 | Six Reviews Manufacturing Law | `docs/AMYNEST_MANUFACTURING_LAW.md` · philosophy | `isManufacturingComplete` | philosophy tests | **Process law** | Not a runtime product gate |
| 7 | Reuse Before Rewrite | philosophy | Campaign reused engines/APIs | Diff: no new schema/API surface | **Observed on this layer** | Helper `mayCreateNewImplementation` test-only |
| 8 | Today Home Law | philosophy · `TODAY_HOME_BLUEPRINT.md` | `passesTodayHomeLaw` in `resolve-today-nrt.ts` | philosophy + today-home flags | **Production-enforced** | — |
| 9 | Home ↔ Hub Boundary | philosophy · Entry Law doc | `resolveHomeHubBoundary` | philosophy tests | **Axioms locked** | **Not wired** into AppCore / dashboard Hub opens |
| 10 | Entry Law R1–R10 | `docs/v2/PARENT_HUB_ENTRY_LAW.md` | Hub rooms first-frame; tab allowed (R4) | Pack 4/4.9/P0-6 reviews | **IA enforced when living** | No single runtime “forbid browse Hub” function |
| 11 | Exit Law | Constitution §6 · Pack 4 | Exit panel; “Back to Today Home” on rooms/modules | Pack 4 review; Hub shell copy | **Mostly** | Leave-gap P1 (Final Apple FA-05) still named |
| 12 | Four Rooms Law | Constitution | Pack 1 shell Help/Understand/Care/Moments | `rooms.test.ts`, P0-6 `room-living` | **Production-enforced** (living) | Legacy mall if master=`legacy` |
| 13 | Premium Continuity | Pack 5 study · `PREMIUM_VOICE` | Quiet invite; Pack 5 unification | Pack 5 review; living flags hide Explore Free | **Living path** | Legacy Hub tiles still *contain* Explore Free behind `!roomsV1` |
| 14 | Hard-Day Law + MFHO | `P0_7_HARD_DAY_MONETIZATION_POLICY.md` | `hard-day-monetization.ts`; SubItemGate bypass D2 | `hard-day-monetization.test.ts`, `sub-item-gate.hard-day.test.tsx` | **Production-enforced** | Quotas unchanged by design (D4) |
| 15 | Living Universe (FA-02) | `amynest-living-universe.ts` | Vite assert + resolver throw on prod mixed | `amynest-living-universe.test.ts` **this run PASS** | **Production-enforced** | `mixed` allowed in DEV/TEST only |
| 16 | One Home / Universe Law | `MODULE_MANUFACTURING_FRAMEWORK.md` | Living CSS/materials; 16 surface flags | Final Apple re-run; module living tests **this run** | **Living path YES** | `/welcome` second OS |
| 17 | Voice contract (Notice/Guide/Remember/Support) | `amynest-philosophy.ts` `FORBIDDEN_VOICE_PATTERNS` | Push copy rewrite in notification builder | philosophy tests | **Partial runtime** | Not every string in the 66k is scanned at build |
| 18 | Value-before-identity | Welcome V3 / `/begin` | Unsigned → `/begin` | AppCore + Final Apple | **Production-enforced** | FE “Not now” can still reach `/welcome` (P1) |
| 19 | Gamification forbidden on Hub | Constitution | Pack 4.9 subtraction; P0-6 streams | P0-6 tests | **Living Hub** | `/rewards` `/games` routes still exist (not Hub first frame) |
| 20 | Module Manufacturing 12-contract (E/O/H/T/M/N/P/L/X/R/S/C) | Framework §1 | Per-module living rooms + P0 deep interiors | 12 `living-room.test.ts` files **this run PASS** | **Openings + named P0 interiors** | Deep leave apps / Curiosity / Discovery Worlds residual |
| 21 | Apple same-home A1–A8 | Framework §2 | Living materials; no unlock theatre on living opens | Final Apple; visual grep this audit | **Living `/begin` MOSTLY→YES** | Speech mid-play; `/welcome`; Routine supporting interiors |

**C = PARTIAL** because several Founder-absolute gates are **documented + unit-tested** but **not all are runtime-wired** (Question Tax, Boundary helper), and Apple/One-Home still have named P1 residuals.

---

## 5. Living Universe Verification

**Master:** `VITE_FF_AMYNEST_LIVING_UNIVERSE` in `artifacts/kidschedule/src/lib/amynest-living-universe.ts`

| Input | Expected | Verified |
|---|---|---|
| unset / `living` / `1` / `true` | all 16 surfaces ON | Code + `amynest-living-universe.test.ts` this run |
| `0` / `false` / `legacy` | all OFF | same |
| `mixed` / `allow_mixed` in production | **REJECT** (Vite throw + resolver throw) | `assertAmynestLivingUniverseBuildEnv` in `vite.config.ts` L218–225; tests this run |
| Vitest `MODE=test` + unset | mixed (kill-switch tests) | tests this run |

**16 portfolio flags:** Today Home, Parent Hub Rooms, Child Discovery Film, Infant Care, Speech, Nutrition, Health Lab, Grow, Birth Sky, Ask Amy, Guidance, Moments, Talking Amy, Amy Coach, Amy Audio, Routine.

**Welcome `/begin` + Signup keep** are not in the 16; they are always the manufactured first-experience path (not FA-02-switched).

| Check | Result |
|---|---|
| Silent per-module bypass in living mode | **No** — `resolvePortfolioLivingFlag` returns `true` for all when mode=living |
| localStorage / browser override of master | **Not found** |
| Production example documents mixed as forbidden | **Yes** `.env.production.example` L99–108 (commented; unset ⇒ living) |
| Accidental mixed production face | **Blocked** |

This audit **did not modify FA-02**.

---

## 6. Portfolio Surface Matrix

Verification against **current HEAD + living tests this run + prior Founder/P0 reviews**. Modules were **not reopened**.

| Surface | Living entry | Visual shell | Deep interior | Premium voice | Load/empty/error/success/exit | Legacy leakage | Known debt |
|---|---|---|---|---|---|---|---|
| Welcome `/begin` | Always FE | Sanctuary film | n/a | Value first | Continue / Not now | **`/welcome` neon if escaped** | Contrast P1; Not now → marketing |
| Signup | Keep ritual | Sanctuary | — | Identity protects value | Keep | Cold `/sign-up` without `from=first-experience` colder | Frozen |
| Child Discovery | `VITE_FF_CHILD_DISCOVERY_FILM` | Film | — | — | Completes to Home | Flag-off form | Frozen edge |
| Today Home | `TODAY_HOME_V1` | Hero + Begin | Timeline support | Free NRT | Begin | Flag-off dashboard dialect | Split chrome vs drawer |
| Parent Hub | `PARENT_HUB_ROOMS_V1` | 4 rooms | P0-6 streams | Pack 5 | Exit Home | `!roomsV1` Explore Free still in source | Leave-gap P1 |
| Infant Care | living v1 | Care FE | Hub-mounted | Continuity | Back Home | Hub chrome DNA | Activation copy P1 |
| Speech Coach | living v1 | Sanctuary | P0 deep remade | Pack 5 | Back Home | Mid-play coins/themes | **P1 accepted** |
| Nutrition | living v1 | Care room | Phase 2 + tabs residual | Continuity | Back Home | SaaS tab DNA if deepened | Residual |
| Health Lab | living v1 | Care | P0 practice sanctuary | Continuity | Back Home | Prior XP/shop **remade** | Residual leave |
| Grow | living v1 | Understand stream | P0 leave sanctuary | Continuity | Back Home | Edtech leave apps residual | Residual |
| Birth Sky | living v1 | Understand | P0 sanctuary | Continuity | Back Home | Amy Astro wing residual | Residual |
| Ask Amy | living v1 | Help companion | `/assistant` still a desk | P0-7 soft-continue | Home | SaaS desk if fully left | Accepted |
| Guidance | living v1 | Stream | Shelf residue | Quiet | Home | Tip shelf | Soft |
| Moments | living v1 | Room | Nested premium shells | Quiet | Home | Discovery Worlds hidden not healed | Soft |
| Talking Amy | living v1 | Living room | Mode names residual | Quiet | Home | Flag-off neon | Residual |
| Routine Generation | living v1 + dashboard `bb6184ab` | Care photo room | R2/R3 frozen | Continuity | Begin today | Supporting “If you need more” | **Documented, not P0** |
| Amy Coach | living v1 | Beside you | Phase 2 | Continuity | Home | SKU residue | Soft |
| Amy Audio | living v1 | Presence listen | Phase 2 | Quiet | Home | Library colder path | Soft |

---

## 7. One-Home Blind Test

Forget logo, name, URL. Judge **living production path** (`/begin`, FA-02 living).

| # | Question | Verdict |
|---|---|---|
| 1 | Does this feel like one application? | **MOSTLY** → **YES** on `/begin` living house · **NO** if `/welcome` Landing is the first impression |
| 2 | Does every room feel like another room in the same home? | **MOSTLY** |
| 3 | Remaining foreign-product feelings | See failures |

**Remaining failures (do not soften):**

| Destination | Feels like | Severity |
|---|---|---|
| `/welcome` `LandingPage` | Separate marketing OS / purple SaaS | **P1** (P0 only if used as review door) |
| Speech mid-play | Game chrome peek | **P1 accepted** |
| `/assistant` full desk | Chatbot product | **P1 leave** |
| Curiosity / Discovery Worlds / `/games` `/rewards` | Marketplace / game / XP (not Hub first frame) | **P1/P2 residual** |
| Grow leave apps (phonics/abacus/study) | Edtech apps | **P1 residual** (P0 deep remade; leave not fully one house) |
| Birth Sky Amy Astro deepen | Astrology wing | **P1 residual** |
| Routine “If you need more” | Old planner interiors | **P2 documented** |
| Desktop sidebar / some drawers | Split dialect vs living rooms | **P2** |

---

## 8. Premium / Hard-Day Verification

Policy: continuity / support / confidence / time saved — **not** unlock/FOMO/PRO catalogue.

| Check | Result |
|---|---|
| `PREMIUM_VOICE` | Locked in philosophy; used by hard-day helpers |
| P0-7 D1–D8 | Implementation review `2bd53139`; tests this run **PASS** |
| MFHO before monetization on hard-day | D2 Emotional SubItemGate bypass + Ask Amy soft-continue **no Upgrade CTA** |
| Pricing / RevenueCat / entitlements / quotas | **Not modified** in 66k (D4 explicit) |
| Living Hub Explore Free | Gated off when `roomsV1` |
| Source still contains Explore Free / Try PRO | **Yes** — legacy branches (`parenting-hub.tsx` `!roomsV1`; `abacus-premium-upsell.tsx` `living ? PREMIUM_VOICE : "Try PRO"`; playwright Astro fixture) |

P0-7 remains **intact**. This audit did not modify it.

---

## 9. Routine Freeze Verification

| Step | Status |
|---|---|
| `/routines` living dashboard | **Present** `isRoutineLivingV1Enabled()` → `RoutineLivingDashboard` (`bb6184ab`) |
| CTA Build today's plan | **Yes** (empty) / Begin today (has plan) |
| → `/routines/generate` | Hand-off unchanged |
| R2 context + Build today's plan | **Untouched** this audit; R2 tests PASS |
| R3 Here it is + Begin today | **Untouched**; R3 tests PASS |
| Engine / API / DB | **No engine files in 66k schema diff** |
| Purple living shell on dashboard | **Removed** on living path |
| Navigation | Living `/routines` uses tab chrome Home · Today's plan · Beside you · Rooms |
| Premium | No new paywall |

**Documented debt (not P0):** expanded “If you need more” legacy interiors; small product header above frozen R2 generate. **Not fixed (order).**

**Do not start another Routine phase.**

---

## 10. Production Safety

Unexpected 66k changes outside pure UI (flag, do not repair):

| Area | 66k change? | Note |
|---|---|---|
| DB schema / SQL migrations | **None** | `git diff --name-only` no `.sql` / schema |
| API routes / contracts | **None** except notification **copy** | `notificationContentBuilder.ts` voice rewrite (deep links `/dashboard` `/routines` `/parenting-hub` **preserved**) |
| Firebase | **None** in file list | |
| RevenueCat / entitlements / billing | **None** | |
| Auth | **None** | |
| Routine generation engine | **None** (experience only) | |
| AI engines | **None** in this delta | |
| Deep-link IDs | **Preserved** (aliases kept, e.g. `/birth-sky/dashboard` → BirthSky) | |
| `vite.config.ts` | FA-02 assert + **dev** API proxy | Production assert is safety; proxy is DEV |
| `.env.production.example` | FA-02 comments | Unset still defaults living |

**No unexpected engine thaw found.**

---

## 11. Routing / Deep-Link Verification

`AppCore.tsx` still registers (non-exhaustive, verified present):

`/begin` · `/sign-up` · `/dashboard` · `/routines` · `/routines/generate` · `/routines/:id` · `/parenting-hub` · `/assistant` · `/speech-coach` (+ live / v2) · `/talking-amy` · `/health-lab` · `/birth-sky*` including `/dashboard` alias · `/nutrition` · `/amy-coach` · `/audio-lessons` · `/phonics` · `/abacus` · `/smart-math-tricks` (legacy `/learning-zone/smart-math-tricks` redirect) · `/discovery-worlds` · `/games`

Infant Care remains **Hub-mounted** (`infant-hub` tile), not a deleted route.

**No routing rewrite in this audit.** Living surfaces wrap existing IDs.

---

## 12. Accessibility Evidence

Source: `docs/v2/AMYNEST_P0_9_ACCESSIBILITY_CERTIFICATION.md` — **DEVICE CERTIFICATION NOT COMPLETE**.

| Check | This VM |
|---|---|
| VoiceOver | **NOT CERTIFIED** |
| Dynamic Type | **NOT CERTIFIED** |
| TalkBack | **NOT CERTIFIED** |
| Real touch targets | **NOT CERTIFIED** |
| Reduced motion | Source has `prefers-reduced-motion` in living CSS — **not device-certified** |

**Do not claim PASS.** I = **YES** outstanding.

---

## 13. Visual Regression

Search of living **production path** (not a CSS rewrite). Exact leftover locations:

| Pattern | Where | Living exposure |
|---|---|---|
| Purple product wash `rgba(168,85,247)` / `#a855f7` | `index.css` (landing, hub-premium L3509, neon utilities) | **Legacy + `/welcome`**. Living rooms use sanctuary CSS; generate living overrides `.parent-hub-premium.routine-living-shell` |
| Explore Free | `parenting-hub.tsx` when `!roomsV1`; launch-card types; `amy-astro-ui-polish-fixture.tsx` | **Off** when FA-02 living |
| Try PRO | `abacus-premium-upsell.tsx` non-living branch | **Off** when living |
| Try Free badge | `try-free-badge.tsx`; Speech `!living && tryFree` | **Off** living Speech |
| parent-hub-premium purple | Shared class still used by generate wrapper | Overridden on `routine-living-shell` |
| XP / streak theatre | Games/rewards/discovery worlds routes | **Not Hub first frame**; still in app |
| Routine SaaS tabs | `pages/routines/index.tsx` **legacy branch** | Living uses dashboard; supporting details still legacy |

**Living `/begin` house:** no new purple dashboard found on Routine living fixture (prior visual QA). Global CSS still contains the old universe for rollback + marketing.

---

## 14. Test / Build Evidence

**This audit run (2026-08-15). Failures: none. Did not fix anything.**

| Gate | Result |
|---|---|
| `pnpm run typecheck:libs` | **PASS** |
| `@workspace/kidschedule` `typecheck` | **PASS** |
| Philosophy + FA-02 + P0-7 + Hub rooms + 12 module living-room tests + Routine R2/R3/R4/R5 dashboard + Speech living | **28 files / 165 tests PASS** then **+2 files / 29 tests PASS** (`rooms.test.ts`, `amy-speech-mode.test.ts`) |
| Production `pnpm --filter @workspace/kidschedule run build` | **PASS** `✓ built in 23.77s` |
| Full kidschedule `pnpm test` (audio identity scripts included) | **Not run in full** — relevant living/Hub/Routine/P0-7/FA-02 subset run instead |
| Playwright e2e / real devices | **Not run** |

---

## 15. Main Branch Compatibility

| | |
|---|---|
| Merge-base | `db2094e8` |
| Branch unique | 186 commits, +62,711 lines |
| Main unique | **1 commit** `52e7b43d` SEO/marketing global-first |
| Overlap files | `artifacts/kidschedule/index.html` · `src/i18n/en.json` · `src/pages/landing.tsx` |
| Files deleted on branch | **0** |
| Shared globals touched on branch | `AppCore.tsx`, `index.css`, `layout.tsx`, `vite.config.ts`, `en.json`, `landing.tsx`, `parenting-hub.tsx`, dashboard, routines |

**High-conflict files (expect merge attention):** `landing.tsx`, `index.html`, `en.json` (main SEO vs Welcome/experience edits).

---

## 16. Merge Risk Map

### P0

None in the 66k experience layer as a **product** freeze. No schema break, no RC/auth rewrite, no engine thaw, no deleted routes.

### P1

- **Git:** Must integrate `origin/main` `52e7b43d` before merge or conflict on marketing/SEO files.
- **`/welcome` neon** still reachable (reviewer/ops if wrong door).
- Speech mid-play game peek; leave-path federation residuals (Ask Amy desk, Grow leave, Astro wing).
- `/begin` CTA contrast debt (Final Apple FA-06).
- Device a11y **uncertified** if submission claims a11y.

### P2

- Routine supporting interiors; generate leftover header.
- Dual CSS universes compiled (living default; legacy for `master=0`).
- Desktop nav dialect vs living rooms.
- Dev API proxy commit is harmless in production if `VITE_USE_SAME_ORIGIN_API` unset.
- Notification copy change is voice-only (deep links same).

---

## 17. Remaining Debt

Accepted, **not fixed here:**

1. P0-9 real-device accessibility  
2. `/welcome` second visual OS  
3. Speech mid-play P1  
4. Leave continuity gaps (assistant desk, Grow leave, Astro, Curiosity/Discovery Worlds)  
5. Routine “If you need more” + R2 wrapper header  
6. Question Tax / Boundary helpers not runtime-wired  
7. Mass-scale ops (auth linking, RC sandbox, tenancy) — **outside 66k craft**  
8. Main SEO commit not on this branch  

---

## 18. Founder Decision

The ~66k living experience layer is **the production candidate for main**, under conditions:

1. Founder accepts P1 craft residuals + a11y **not certified**.  
2. Review/production door remains **`/begin`**, never `/welcome`.  
3. FA-02 stays **living** (or unset) in production builds; never `mixed`.  
4. Integrate **`origin/main`** (SEO commit) then merge — do not force-overwrite marketing files blindly.  
5. **No further module/Routine/P0-7/FA-02/Apple manufacturing** before merge.

**Do not** treat this as Apple approval, millions-scale certification, or a11y certification.

---

## 19. Recommended Next Step

**STOP product changes.**

1. Founder: approve CONDITIONAL merge of the 66k layer.  
2. Engineering: rebase/merge `origin/main` resolving `landing.tsx` / `index.html` / `en.json` **without** restoring neon as the production door.  
3. Rebuild production with FA-02 living (unset or `living`).  
4. Do **not** start another Routine phase, module phase, or Final Apple Audit unless Founder orders.

---

## Appendix — Commands actually run

```text
git rev-parse / merge-base / rev-list --left-right --count origin/main...HEAD
git diff --shortstat db2094e8..HEAD          # 408 files, +62711, -3783
git log db2094e8..HEAD
pnpm run typecheck:libs && kidschedule typecheck
vitest: 30 files / 194 tests PASS (living + Hub + P0-7 + Routine + Speech living)
pnpm --filter @workspace/kidschedule run build   # PASS 23.77s
```

**Working tree after this document is added:** dirty until the audit file is committed. **This audit did not push.**
