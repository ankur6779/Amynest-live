# Parent Hub Pack 5 — Destination Experience Unification (Implementation Review)

**Status:** IMPLEMENTED — PRESENTATION LAYER ONLY  
**Date:** 2026-08-07  
**Authority:** Founder Order — Implement Pack 5 (Destination Experience Unification)  
**Upstream:** Pack 4.9 APPROVED · Apple re-audit after 4.9 · Pack 5 Premium Continuity study  

**Commit SHA:** `526a5296` (`526a5296ffcf045b11803c90fb464260e0350751`)  

**Explicit non-actions:** No Pack 6 · No RevenueCat redesign · No module product redesign · No pricing · No DB/API/auth/Firebase/routing/analytics rewrites  

---

## Mission result

Every destination opened from a Parent Hub room now mounts inside a **quiet continuity slot** (`ph-module-quiet` + `ParentHubQuietModuleProvider`).

Premium remains.  
Entitlements remain.  
Gates remain.

Presentation hierarchy changes so Premium says:

> “We can continue helping.” / `Continue with AmyNest`

Never:

> “Unlock this feature.” / “Try Free” / “Explore Free” storefront energy

---

## Previous vs New

| | Previous (after Pack 4.9) | New (Pack 5) |
|---|---|---|
| First frame | Sanctuary rooms | Unchanged |
| Destination open | Legacy mall module: Try Free · Premium badges · feature chips · violet “Unlock with Premium” · journey unlock theatre | Same module **logic**, quiet presentation: badges/chips hidden · PREMIUM_VOICE continuity · FE-toned invite |
| Emotional cut | Room → software feature landing | Room → continued conversation in same house |
| RevenueCat / entitlements | Unchanged | Unchanged |
| Routes / APIs / DB | Unchanged | Unchanged |

---

## Mechanism

1. `ParentHubQuietModuleProvider` wraps `renderDestination` in `ParentHubRoomsShell`  
2. Consumers read `useParentHubQuietModule()`:
   - `LockedBlock` → PREMIUM_VOICE + warm continuity pill  
   - `JourneyUnlockCta` → invitation + Continue with AmyNest  
   - `TryFreeBadge` → null  
   - `HubPremiumFeatureCard` → no preview badges / try-free / chips  
   - `HubLaunchCard` · Discovery Worlds · infant plan pills → shelf chrome suppressed  
3. CSS safety net in `.ph-module-quiet` hides residual badges / chip shelves / SaaS glow  

Legacy mall (`VITE_FF_PARENT_HUB_ROOMS_V1=0`) keeps prior storefront chrome.

---

## Every destination reviewed

### HELP

| Destination | Shelf chrome removed / subordinated | Continuity |
|---|---|---|
| Ask Amy | Marketing badge chips suppressed in quiet card path | Room → calm ask |
| Emotional | Try Free / FeatureGate unlock theatre → PREMIUM_VOICE | Crisis still free via logic; presentation calm |
| Speech Coach | Try Free / Premium badges hidden; continuity CTA | Practice without storefront |
| PTM Prep | Same | Prepared, not sold |
| Life Skills | Same | Teach-today path |

### UNDERSTAND

| Destination | Shelf chrome | Continuity |
|---|---|---|
| Guidance (tips/articles/new-parent) | Badges/chips/unlock theatre quieted | One clearer sentence energy |
| Birth Sky | “Explore Free” suppressed in quiet | Meaning door, not promo |
| Curiosity | Try Free suppressed | How they think |
| Grow (learning merge) | Premium / Explore Free / chips suppressed | Quiet skills |

### CARE

| Destination | Shelf chrome | Continuity |
|---|---|---|
| Infant Care | “1 free plan” pills hidden in quiet | Care continues |
| Nutrition | Unlock marketing copy → continuity sentence; badges quiet | Meal help without storefront |
| Health Lab | Premium badge / Try Free quieted; gate still entitlements | Wellness after trust (logic unchanged) |

### MOMENTS

| Destination | Shelf chrome | Continuity |
|---|---|---|
| Presence (activities/origami/art/talking amy/discovery/event) | Try Free · Open CTA · progress/streak strip hidden for Discovery in quiet | Ten minutes together |
| Story | Badges quieted | Shared story |
| Make | Badges/chips quieted | Side-by-side make |

---

## Destination hierarchy (unchanged IA)

```text
Room door
  → Intention
  → One recommendation + quiet paths
  → Path open
      → ph-module-quiet (Pack 5 continuity surface)
      → existing destination product (logic)
      → Exit panel (Back to Home / Continue today / Another room)
```

No new destinations. No route changes.

---

## Premium continuity

| Surface | Rooms V1 quiet module | Legacy mall |
|---|---|---|
| LockedBlock CTA | `Continue with AmyNest` | Unlock with Premium |
| LockedBlock aria | `We can support you further whenever you're ready.` | Unlock aria |
| Journey soft CTA | PREMIUM_VOICE invitation + continue | Continue Journey to unlock |
| Try Free / Explore Free / Premium pills | Hidden | Visible |
| Feature chips | Hidden | Visible |
| Entitlement checks | **Same** | Same |
| `openSubscriptionGate` | Same reasons; quieter `source` tags | Prior sources |

---

## Apple findings

### Apple Test

> When entering a destination, does it still feel like the same house, same light, same companion, same conversation — or a software feature?

**Board reading after Pack 5:**  
**Mostly the same house** for the destination *chrome*.  
Module *interiors* (full Nutrition/Health/Infant apps) can still deepen into product UI after navigation into nested routes — that is outside this presentation pack’s Hub quiet slot.

| Prior P0 after 4.9 | After Pack 5 |
|---|---|
| Destination Premium shelves in Hub quiet slot | **CLEARED** (presentation) |
| Premium interruption copy (“Unlock…”) in slot | **CLEARED** → continuity voice |
| Full nested product pages after AppLink leave Hub | Remains (out of Hub slot scope) |

### Forecast scores (complete Hub)

| Dimension | After 4.9 | After 5 |
|---|---|---|
| Premium | 4.0 | **7.0** |
| Apple Philosophy | 7.0 | **7.5** |
| Trust | 7.0 | **7.5** |
| Overall maturity | 7.0 | **7.5 / 10** |

**Would Apple approve for first-party today?**  
**Not yet a full YES** — nested destination *routes* (leaving Hub into standalone product pages) can still feel like another app.  
**Hub quiet-slot shelf blocker:** addressed.

---

## Remaining blockers

1. **Deep destination routes** (e.g. full Health Lab / Nutrition / Discovery Worlds pages) still use their own chrome after AppLink navigation — separate Founder order if required  
2. Nested merge member titles may still show legacy `web_tiles` emoji names  
3. Sanctuary a11y polish (`aria-expanded`, focus move)  
4. Room analytics still absent  
5. Pack 4.6 intelligence not implemented (policy locked — OK)

---

## Production readiness score

| Gate | Result |
|---|---|
| Founder Review | **PASS** — subtraction/presentation of shelf energy; Premium kept |
| Apple Review | **PASS on Hub slot** · full first-party still contingent on deep routes |
| Parent Review | **PASS** — less interruption after path open |
| Engineering Review | **PASS** — context-scoped; kill switch / mall intact |
| Database Review | **PASS** — zero schema |
| Production Safety | **PASS** — zero DB/API/Firebase/RC/auth/routing/analytics rewrites |
| Accessibility | **PASS with debt** — continuity CTAs labeled; prior a11y debt remains |
| Performance | **PASS** — no new network; lighter visual chrome |

**Production readiness (Hub Rooms V1 surface):** **7.5 / 10**  
**Production Freeze:** Still not claimed — deep-route chrome + Founder Pack 6 gate.

---

## Tests / Build

| Check | Result |
|---|---|
| `quiet-module-context.test.tsx` | PASS |
| `locked-block.quiet.test.tsx` | PASS |
| `parent-hub-room.test.tsx` (incl. Pack 5 slot) | PASS |
| `tsc` kidschedule | PASS |

---

## Code touch list

| Path | Role |
|---|---|
| `lib/parent-hub/quiet-module-context.tsx` | Context |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Provider wrap |
| `components/parent-hub/parent-hub-living-room.css` | Quiet slot materials |
| `components/locked-block.tsx` | Continuity CTA |
| `components/journey-preview-overlay.tsx` | Continuity invite |
| `components/try-free-badge.tsx` | Hide in quiet |
| `components/hub-premium-feature-card.tsx` | Suppress shelf badges/chips |
| `components/hub-launch-card.tsx` | Suppress shelf badges |
| `components/discovery-world/discovery-worlds-hub-launch-card.tsx` | Suppress Open/progress theatre |
| `components/infant/infant-*-panel.tsx` | Hide “1 free plan” in quiet |
| `pages/parenting-hub.tsx` | Nutrition locked preview copy |
| Tests + this review | Quality gate |

**Not touched:** Welcome · Signup · Discovery · Today Home · RevenueCat · entitlements · APIs · DB · Firebase · auth · routing tables · Pack 6.

---

## Rollback

| Lever | Effect |
|---|---|
| Revert Pack 5 commit | Restores shelf chrome in quiet slot |
| `VITE_FF_PARENT_HUB_ROOMS_V1=0` | Legacy mall (includes storefront) |
| Provider `active={false}` (if ever needed) | Surgical quiet off |

Entitlements never flipped — rollback cannot “accidentally grant Premium.”

---

## STOP

Pack 5 destination unification complete.  
Do **not** begin Pack 6.
)
