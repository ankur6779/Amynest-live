# AmyNest Final Production Release Candidate

**Status:** RELEASE CANDIDATE · PRODUCT FROZEN · NO FURTHER MANUFACTURING  
**Date:** 2026-08-15  
**Authority:** Founder Approval — Final AmyNest Production Merge & Release Candidate  
**This is not a Final Apple Audit. This is not device-accessibility certification.**

The ~66K living experience was not redesigned in this operation. This document records the Git integration of the already-approved candidate onto `main`.

---

## Git

| Item | Value |
|---|---|
| Approved product HEAD (pre-main-update) | `a1d1ecdb` |
| Fast-forward merge | `origin/main` `52e7b43d` → `a1d1ecdb` (190 commits, `--ff-only`) |
| Product integration commit on main | `a1d1ecdb` — *docs(v2): 66k × main SEO integration review* |
| Ancestry | `52e7b43d` (SEO) is an ancestor of `main`; 66k layer is on `main` |
| Safety tag (SEO integration) | `pre-seo-integration-fca28c3d` = `fca28c3d` |
| Safety tag (pre-final merge) | `pre-final-main-merge-a1d1ecdb` = `a1d1ecdb` |
| Strategy | Fast-forward only. No history rewrite. No squash. No force push. |

`origin/main` after product push: **`a1d1ecdb`** (confirmed `git fetch` + `git rev-parse origin/main`).

This release-candidate document is a follow-up commit on `main` after that push. It does not change product code.

---

## Product

66K living experience **integrated** on `main` together with main’s SEO/marketing commit `52e7b43d`.

Present and unmodified by this merge operation:

- Parent Hub + four Rooms
- Module Manufacturing Framework
- Infant Care, Speech Coach, Nutrition, Health Lab, Grow, Birth Sky
- Ask Amy, Guidance, Moments, Talking Amy, Amy Coach, Amy Audio
- Routine Generation (living dashboard → R2 → R3) — **frozen**
- P0-6, P0-7
- FA-02 Living Universe production lock

Pre-merge integrity: `git diff pre-seo-integration-fca28c3d..a1d1ecdb` on living product paths (routines, FA-02, Parent Hub, `AppCore`, first-experience) was **empty**. Merge was fast-forward, so those files are identical on `main`.

---

## Production (FA-02)

| Check | Result |
|---|---|
| Default / unset / `living` / `1` | All **16** living surfaces ON |
| Production + `mixed` / `allow_mixed` | **REJECTED** (Vite throw this run) |
| Coherent rollback | `VITE_FF_AMYNEST_LIVING_UNIVERSE=0` (or `legacy` / `false`) + rebuild — **still available** |
| Rollback flags / legacy code | **Not removed** |

`.env.production.example` documents living as the intended production universe and mixed as forbidden.

This run: `VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed` production Vite build failed with:

`FA-02: VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed (or allow_mixed) is forbidden in production.`

---

## Entry

| Route | Role |
|---|---|
| `/begin` | **Production door** → `FirstExperiencePage` (Welcome / Signup / Discovery) |
| Unsigned / auth-timeout | `Redirect to="/begin"` — unchanged |
| `/welcome` | Alternate marketing `LandingPage` — **not** the production door |
| After identity | Today Home → Parent Hub (`/parenting-hub`) → Rooms |
| `/routines` | Living dashboard when FA-02 living |
| `/routines/generate` | Frozen R2 / R3 |

Routing was **not** changed in this merge.

---

## Verification (this run, SHA `a1d1ecdb`)

| Gate | Result |
|---|---|
| Working tree before merge | Clean (accidental Birth Sky cert timestamps from a discarded full Vitest run were reverted, not committed) |
| `origin/main` unique commits before merge | **None** (still `52e7b43d`) |
| `pnpm run typecheck:libs` + kidschedule `typecheck` | **PASS** |
| Relevant living / Hub / P0-6 / P0-7 / Speech / 12 module living-room / Routine R2–R3 / FA-02 Vitest | **28 files / 193 tests PASS** |
| Production `pnpm --filter @workspace/kidschedule run build` | **PASS** `✓ built in 27.77s` |
| FA-02 mixed production build | **REJECTED** (expected) |
| `lib/db` / `lib/api-spec` vs `origin/main` at merge | **No diff** |
| Firebase / RevenueCat filenames in merge delta | **None** |
| Push `origin main` | **52e7b43d..a1d1ecdb** (non-fast-forward-safe normal push; **not** force) |

### Extra test note (not a merge blocker)

`src/__tests__/parent-hub-i18n.test.tsx` was **not** part of the approved 194-test integration gate. Running it in this environment failed 1/30 (`LockedBlock` premium-feature label). **Not fixed** (product freeze; opportunistic test/product edits forbidden). Parent Hub living room tests in the approved gate **PASS**.

A full kidschedule Vitest run was started by mistake, killed, and **not** used as the release gate. It dirtied Birth Sky certification timestamps; those files were restored before merge.

### Routing / Routine smoke (code + existing tests)

- `/begin` → first experience; `/welcome` remains landing.
- Routine living: `isRoutineLivingV1Enabled()` → `RoutineLivingDashboard`; CTAs **Build today's plan** / **Begin today**; `/routines/generate` still registered.
- Known Routine debt **not** fixed: expanded “If you need more” legacy interiors; small product header above frozen R2.

Playwright / real-device UI walkthrough was **not** re-run in this merge-only operation. Visual proof remains the prior SEO-integration check on the same product SHA lineage.

---

## Remaining known debt

**Not certified. Do not claim otherwise.**

- Real-device VoiceOver certification — **outstanding**
- Dynamic Type certification — **outstanding**
- TalkBack / other device certification — **outstanding**
- P0-9 accessibility campaign — not device-certified (`docs/v2/AMYNEST_P0_9_ACCESSIBILITY_CERTIFICATION.md`)
- `/welcome` still a second visual OS (marketing)
- Speech mid-play P1; leave-path federation residuals
- `/begin` CTA contrast debt (FA-06)
- Routine non-P0: “If you need more” interiors; R2 wrapper header
- Question Tax / Boundary helpers test-locked, not AppCore-wired
- Mass-scale ops (auth linking, RevenueCat sandbox, tenancy) outside 66k craft

P0 product blockers for this candidate: **none** (prior audit, still true).

---

## What this is not

- Not an Apple submission approval
- Not millions-scale operational certification
- Not a license to thaw engines, flags, or Routine
- Not a start of another product phase

**Next work is operational only:** real-device QA → production deployment → monitoring → subscription funnel validation.

---

## Final verdict

| # | Question | Answer |
|---|---|---|
| 1 | Is the approved 66K AmyNest living experience now on main? | **YES** |
| 2 | Is main pushed successfully? | **YES** |
| 3 | Is origin/main synchronized? | **YES** (product SHA `a1d1ecdb`; this doc may be a later docs commit) |
| 4 | Did production build pass? | **YES** |
| 5 | Did relevant regression tests pass? | **YES** |
| 6 | Is the production living universe locked? | **YES** |
| 7 | Is `/begin` still the intended production door? | **YES** |
| 8 | Is coherent rollback still available? | **YES** |
| 9 | Did any product behaviour get changed during merge? | **NO** |
| 10 | Is this now the production release candidate? | **CONDITIONAL** — P1 craft residuals and real-device accessibility remain uncertified |
