# Parent Hub Pack 4.9 — Implementation Review

**Status:** IMPLEMENTED — SUBTRACTION ONLY  
**Date:** 2026-08-07  
**Authority:** Founder Order — Implement Pack 4.9 (Experience Unification)  
**Blueprint:** `docs/v2/PARENT_HUB_PACK4_9_LEGACY_REMOVAL.md` (APPROVED)  
**Upstream gate:** Apple Final Audit — NO (approved as judgment)

**Commit SHA:** `bbfde4eb` (`bbfde4eb4bdc8b402ac651781cdc9f936fc256ac`)  

---

## Mission result

Parent Hub Rooms V1 first frame is now the room — one FE emotional universe.

This was **not** a redesign.  
This was **not** a feature pack.  
This was **subtraction**.

---

## Previous vs New

| | Previous (Rooms V1 before 4.9) | New (Pack 4.9) |
|---|---|---|
| First pixels | Science tip header → patent → child glass panel → trial banner → Journey Pulse (XP/coins/Level) → Today’s Path unlock → rooms | Optional quiet multi-child chips → **`ParentHubRoomsShell`** |
| Page material | Purple/pink `.parent-hub-premium` galaxy wash | `.parent-hub-sanctuary` FE night light (Welcome/Discovery/Home grammar) |
| Ask Amy | Header marketing chip + Help destination | Help destination only |
| Gamification chrome | Pulse + reward modal mounted | **Absent** on Rooms V1 |
| Kill switch | `VITE_FF_PARENT_HUB_ROOMS_V1=0` → mall + chrome | **Unchanged** — legacy path still has prior chrome |
| Rooms / flow / photos / destinations / exit | Intact | **Untouched** |

---

## Everything removed (Rooms V1 ON)

| Removed | Mechanism |
|---|---|
| Science Tip header (`PageHeader`) | Not rendered when `roomsV1` |
| Patent strip | Removed with `PageHeader` |
| Ask Amy marketing chip | Removed with `PageHeader` |
| Infant trial banner | Legacy-only branch |
| Journey Pulse (XP · coins · Level · streak · MasteryRing) | Legacy-only branch |
| Today’s Path unlock strip | No longer rendered on Rooms V1 |
| Peek-ahead marketing | Removed with Today’s Path |
| Reward celebration modal | Legacy-only branch |
| Marketing `ChildSelectorPanel` glass above rooms | Replaced by quiet multi-child chips only when `childCount > 1` |
| Purple `.parent-hub-premium` page wash | Swapped for `.parent-hub-sanctuary` |

Contract: `src/lib/parent-hub/legacy-chrome.ts`

---

## Everything retained

| Retained | Notes |
|---|---|
| Four rooms · photography · feelings · intentions | Untouched |
| Pack 3 destinations · Pack 4 flow · exit panel | Untouched |
| Entry Law / Exit Law / Today Home / Welcome / Signup / Discovery | Frozen — not edited |
| Kill switch `VITE_FF_PARENT_HUB_ROOMS_V1` | Intact |
| Journey backend (`useHubJourney` / access locks) | Still fetched for gating — **no theatre** |
| Analytics / Firebase / RevenueCat / OAuth / Auth | Untouched |
| Destination module products after path open | Still mount via `renderDestination` (shelf debt remains — not Pack 5) |

---

## Screenshots

| Artifact | Path |
|---|---|
| First screen (FE photos + sanctuary) | `/opt/cursor/artifacts/parent-hub-pack49-first-screen.png` |
| Apple test (same first frame) | `/opt/cursor/artifacts/parent-hub-pack49-apple-test.png` |
| Live CSS preview (browser) | `/opt/cursor/artifacts/parent-hub-pack49-live-css.png` |
| Rooms shell photography reference (Pack 2, unchanged) | `/opt/cursor/artifacts/parent-hub-pack49-rooms-shell-reference.png` |

<img alt="Pack 4.9 first screen" src="/opt/cursor/artifacts/parent-hub-pack49-live-css.png" />

**Special Apple Test (first screen, destinations hidden):**  
Does this feel like entering the same home Welcome introduced?

### YES

Evidence: FE reflection ambient · photographic doors · warm sand on night glass · “What do you need for {name}?” · “Enter one calm room.” · no science/patent/XP/unlock prologue.

---

## Performance

| Item | Result |
|---|---|
| Pre-room React tree | Smaller on Rooms V1 (pulse/path/header/reward unmounted) |
| Learning/journey hooks | Still called (presentation-only pack; zero feature rewrites) — acceptable; optional future idle |
| FE ambient motion | Unchanged; `prefers-reduced-motion` respected in living-room + FE CSS |
| Bundle | No new product modules; +small CSS + chrome contract |

---

## Build

| Check | Result |
|---|---|
| `tsc -p artifacts/kidschedule` | **PASS** |
| Vitest Pack 4.9 + rooms/flow/flags | **PASS** (12 tests) |
| Pre-commit codegen/typecheck | Runs on commit |

---

## Tests

| File | Coverage |
|---|---|
| `src/lib/parent-hub/legacy-chrome.test.ts` | Forbids all pre-room marketing surfaces; multi-child identity rule |
| `src/components/parent-hub/parent-hub-room.test.tsx` | Rooms flow unchanged |
| `src/lib/parent-hub/flow.test.ts` / `feature-flags.test.ts` | Regression |

---

## DB

**Zero changes.** No migrations. No drops. Journey tables untouched.

---

## API

**Zero changes.** No new endpoints. No contract edits. Hub Journey may still be requested; Rooms V1 does not render unlock theatre from it.

---

## Analytics

**Zero rewrites.** Hub section point awards already no-op under Rooms V1. Pulse impressions naturally drop. No new sanctuary funnel events in this pack (still debt).

---

## Rollback

| Lever | Effect |
|---|---|
| `VITE_FF_PARENT_HUB_ROOMS_V1=0` | Full legacy mall + prior chrome |
| Git revert of Pack 4.9 commit | Restores pre-room stack on Rooms V1 |
| Never rollback by re-adding XP theatre as “fix” | Absolute |

---

## Code touch list

| Path | Change |
|---|---|
| `artifacts/kidschedule/src/pages/parenting-hub.tsx` | Rooms V1 first-frame subtraction; sanctuary page class; quiet child identity |
| `artifacts/kidschedule/src/components/parent-hub/parent-hub-living-room.css` | `.parent-hub-sanctuary` + quiet child chips |
| `artifacts/kidschedule/src/lib/parent-hub/legacy-chrome.ts` | Chrome contract |
| `artifacts/kidschedule/src/lib/parent-hub/legacy-chrome.test.ts` | Contract tests |
| `docs/v2/PARENT_HUB_PACK4_9_IMPLEMENTATION_REVIEW.md` | This review |
| `docs/v2/PARENT_HUB_APPLE_FINAL_AUDIT_AFTER_PACK49.md` | Apple re-audit |

**Not touched:** Welcome · Discovery · Today Home · room heroes · destinations · flow · RevenueCat · auth · Firebase · APIs · DB.

---

## Quality Gate

### Founder Review — PASS (implementation vs order)

- Subtraction only · rooms/flow/photos kept · no Pack 5 · no freeze violations  

### Apple Review — FIRST FRAME PASS · PRODUCT NOT YET

- First screen home-continuity: **YES**  
- Full Hub first-party approval: still blocked by destination product shelves (see re-audit)

### Parent Review — PASS (first breath)

- Tired parent reaches “What do you need for {name}?” without wallet/tips tax  

### Engineering Review — PASS

- Flag-scoped · kill switch retained · presentation layer only  

### Database Review — PASS

- Zero schema impact  

### Analytics Review — PASS (no rewrite)

- No funnel rewrite; intentional non-addition  

### Production Safety Review — PASS

- Zero DB/API/auth/RC/Firebase/routing/feature rewrites  

---

## Remaining debt (explicit — not this pack)

1. Opened destinations still mount legacy Premium / Try Free shelves (Apple prior P0#2)  
2. Nested `web_tiles` emoji member titles  
3. Sanctuary a11y polish  
4. Room analytics  
5. Pack 4.6 intelligence code (policy locked)  
6. Pack 5 Premium Continuity implementation — **await Founder**

---

## STOP

Pack 4.9 implementation complete.  
Apple Final Audit re-run delivered separately.  
**Do not begin Pack 5** until Founder approval.
)
