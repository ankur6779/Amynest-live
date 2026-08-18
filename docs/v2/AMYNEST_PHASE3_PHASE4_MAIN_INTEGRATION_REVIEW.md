# AmyNest — Phase 3 + Phase 4 main integration review

**Status:** RELEASE INTEGRATION COMPLETE — STOP  
**Authority:** Founder-approved merge of audited Phase 3 + Phase 4 onto `main`  
**Date:** 2026-08-18  
**Operation:** Fast-forward only. No squash, no rewrite, no product work.

Post-Phase-4 Final Apple Audit (`docs/v2/AMYNEST_FINAL_APPLE_AUDIT_POST_PHASE4.md`) already concluded:

**B. APPLE READY WITH CERTIFICATION DEBT**

This document records the integration. It is **not** a new Apple audit.

---

## Before

| Item | Value |
|---|---|
| `origin/main` SHA | `da20fe25126c2881c513152fff2e45762fae5cf3` |
| Message | `fix(ai): recover Amy AI when Redis connection is closed` |
| Working tree before merge | Clean |
| Safety tag | `pre-phase3-phase4-main-da20fe25` → `da20fe25126c2881c513152fff2e45762fae5cf3` |

---

## Audited candidate

| Item | Value |
|---|---|
| SHA | `5bb33cc0ae87e9b283818ff8a5881f6ad5b947a7` |
| Branch | `cursor/free-premium-phase4-42e5` |
| Relationship | `da20fe25` **is an ancestor** of `5bb33cc0` |
| Commits on main not in candidate | **None** |
| Fast-forward possible | **YES** |

---

## Phase 3

Exact range: `da20fe25` → `d35b06d1` (3 commits)

| SHA | Subject |
|---|---|
| `57866a226c4d3635696e410bd8c1196d4efcac84` | `fix(conversion): Phase 3 free-to-premium remediation` |
| `57ce72edeaad581f6c84a56fefe4d66654fe953f` | `fix(conversion): stamp Talk-with-Amy clock only on converse` |
| `d35b06d1f185782722a4542c32adb7821c38a83a` | `docs: Phase 3 conversion verification and Phase 4 Founder review` |

Branch at integration: `origin/cursor/free-premium-phase3-42e5` = `d35b06d1`.

---

## Phase 4

Exact range: `d35b06d1` → `5bb33cc0` (3 commits)

| SHA | Subject |
|---|---|
| `dee0b1c127cbbc97fe2d866846cce6a6467319c5` | `feat(health-lab): static free preview and premium API gates` **(D3)** |
| `6c32cda77e0683ebfe9404b82216eaa17759a6c9` | `feat(speech-v2): lifetime 90-second first-use allowance` **(D4)** |
| `5bb33cc0ae87e9b283818ff8a5881f6ad5b947a7` | `fix(health-lab): authenticate mutations from the real request` **(D3 compatibility)** |

Branch at integration: `origin/cursor/free-premium-phase4-42e5` = `5bb33cc0`.

No commits were recreated, squashed, cherry-picked, or rewritten.

---

## After

| Item | Value |
|---|---|
| Merge method | `git merge --ff-only 5bb33cc0ae87e9b283818ff8a5881f6ad5b947a7` |
| Merge commit | **None** (fast-forward) |
| NEW_MAIN_SHA | `5bb33cc0ae87e9b283818ff8a5881f6ad5b947a7` |
| Identity with audited candidate | **Exact match** |
| Files changed vs `da20fe25` | 55 (Phase 3 + Phase 4 only) |

---

## Git

| Item | Value |
|---|---|
| local `main` | `5bb33cc0ae87e9b283818ff8a5881f6ad5b947a7` |
| `origin/main` | `5bb33cc0ae87e9b283818ff8a5881f6ad5b947a7` |
| Working tree at push | Clean |
| Safety tag (pre) | `pre-phase3-phase4-main-da20fe25` → `da20fe25` |
| Final release tag | `final-phase4-main-5bb33cc0` → `5bb33cc0` |
| Push | `git push origin main` (non-force): `da20fe25..5bb33cc0` |
| Conflicts | **None** |

Previous safety tags (`pre-final-main-merge-a1d1ecdb`, `pre-seo-integration-fca28c3d`) were not deleted.

---

## Verification

| Gate | Result |
|---|---|
| TypeScript libs | **PASS** |
| kidschedule `tsc` | **PASS** |
| api-server `tsc` | **PASS** |
| Phase 3 freeze tests | **PASS** |
| Phase 4 D3 tests (web freeze + API premium matrix) | **PASS** |
| Phase 4 D4 tests (first-use window/policy/session) | **PASS** |
| P0-7 (hard-day + sub-item-gate) | **PASS** |
| Pricing living display / source | **PASS** |
| FA-02 living universe | **PASS** |
| Navigation / leave-path | **PASS** |
| Routine R2 / R3 / living dashboard | **PASS** |
| Amy AI composer / living-room / latency | **PASS** |
| API D3/D4 + premium-gate | **55 tests PASS** |
| Web Vitest targeted | **22 files / 115 tests PASS** |
| Production web build | **PASS** (`✓ built in 23.32s`) |
| Production API build | **PASS** |

Logs: `/opt/cursor/artifacts/main_integration_typecheck.log`, `main_integration_web_tests.log`, `main_integration_api_tests.log`, `main_integration_web_build.log`, `main_integration_api_build.log`.

No code was modified to make tests pass.

---

## Product safety

| Surface | Confirmation |
|---|---|
| No new product work | **YES** — fast-forward of existing commits only |
| No pricing changes beyond approved Phase 3/4 | **YES** — `pricing-region.ts` unchanged in Phase 4; `INR_PLAN_PRICES` 199 / 999 / 1499 |
| No RevenueCat changes | **YES** |
| No DB/schema changes | **YES** |
| No auth/Firebase changes | **YES** |
| Routine R2/R3 engines | **YES** — Phase 4 did not touch `living-entry.ts` / `living-result.ts`. Phase 3 conversion copy on `pages/routines/index.tsx` is the already-audited Phase 3 scope |
| Amy AI workspace/API/model | **YES** — Phase 4 did not touch the workspace. Phase 3 quota-hint is already-audited conversion freeze |
| P0-7 intact | **YES** |
| FA-02 intact | **YES** |
| Navigation / leave containment | **YES** — Phase 4 did not touch `layout.tsx`, `mobile-tab-bar.tsx`, `living-leave-containment.ts` |
| Health Lab | Only approved D3 (static preview + `isPremiumNow` gates + POST `authChild(req)`) |
| Speech V2 | Only approved D4 (lifetime 90s first-use) |

### D3 on resulting `main`

- Free `/health-lab` still requires `canAccessHealthLab`
- Locked users receive `HealthLabStaticFreePreview` (Care-room when living ON)
- `HealthLabZone` does not mount for locked users
- Locked preview makes no Health Lab API calls
- Progression reads and mutations require `isPremiumNow` after child ownership
- Admin metrics remain admin-only

### D4 on resulting `main`

- Feature `speech_coach_v2_first_use_seconds`
- `day=lifetime` (no UTC reset)
- Account-level `userId`, shared across children
- Page open / start do not consume
- Heartbeat / terminate charge actual ticks
- 90-second first-use threshold
- Existing continuation / paywall remains
- Premium 600s/day unchanged
- Trial 120s/day unchanged

---

## Production flag safety (FA-02)

| Production value | Behaviour |
|---|---|
| unset / `living` / `1` | Living universe (all 16 surfaces ON) |
| `0` / `legacy` | Coherent emergency legacy (all 16 OFF) |
| `mixed` / `allow_mixed` | **REJECTED** (Vite build throw + resolver throw) |

Do **not** deploy or build production with `VITE_FF_AMYNEST_LIVING_UNIVERSE=mixed`.

---

## Apple journey smoke (not a new audit)

From `/begin` on resulting `main`:

| Check | Result |
|---|---|
| `/begin` production door | **YES** (unsigned `/` still redirects to `/begin`) |
| `/welcome` marketing | **YES** (`LandingPage`) |
| One living home | **YES** |
| Navigation coherent | **YES** |
| Mobile bottom navigation retained | **YES** (intentional living chrome) |
| Amy AI FAB retained | **YES** |
| Routine sanctuary | **YES** |
| Pricing intact | **YES** |
| Health Lab D3 intact | **YES** |
| Speech D4 intact | **YES** |
| P0-7 intact | **YES** |
| Legacy containment intact | **YES** |

---

## Accessibility

**DEVICE ACCESSIBILITY CERTIFICATION = OUTSTANDING**

Do **not** claim VoiceOver, TalkBack, Dynamic Type, or physical-device certification. Unchanged from the post-Phase-4 Final Apple Audit.

---

## Stop

MERGE → VERIFY → PUSH → VERIFY REMOTE → TAG → REPORT → STOP.

No further product phase. No UI redesign. No new Apple audit.
