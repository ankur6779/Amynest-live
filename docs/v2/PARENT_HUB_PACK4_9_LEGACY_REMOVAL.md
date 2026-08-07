# Parent Hub Pack 4.9 — Legacy Chrome Removal (SUBTRACTION BLUEPRINT)

**Status:** BLUEPRINT ONLY — NO IMPLEMENTATION · WAITING FOUNDER APPROVAL  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Pack 4.9 (Legacy Chrome Removal)

**Upstream gate:** Apple Human Interface Final Audit — **APPROVED** · Verdict **NO**  
**Law:** Do not ignore the review.

**Frozen forever:** Welcome V3 · Signup Keep Experience · Child Discovery · Today Home Hero  

**Explicit non-actions this pack:**  
- Do **not** begin Pack 5 Premium Continuity implementation  
- Do **not** redesign rooms, heroes, destinations, or flow  
- Do **not** change pricing · RevenueCat · entitlements · auth  
- Do **not** invent new Hub products  

**Nature of work (when approved):** **Subtraction only.**

---

## Mission

Remove every remaining piece of the old Parent Hub that violates the Constitution **and** the Apple gate — especially everything that appears **before** the four rooms.

> Parent Hub begins with the room.  
> Not with product marketing.

---

## Governing rule (Pack 4.9 absolute)

```text
Nothing may appear above the four rooms
unless it belongs to Today Home.
```

| Allowed above rooms | Forbidden above rooms |
|---|---|
| *(empty by default)* | Science tip header |
| Quiet child identity **only if** required for multi-child naming — subordinated, not a hero | Patent strip |
| | Journey unlock strip |
| | XP · coins · Level · streak · MasteryRing |
| | Pulse widgets |
| | Infant trial / competing banners |
| | Unlock theatre · peek-ahead |
| | Legacy hero stack · For You chrome |
| | Feature mall / quick actions |
| | Duplicate Ask Amy marketing chip |

Constitution §3 previously listed “Hub Journey/Path” as shell/bridge.  
**Apple + this Founder order supersede that placement:** Journey/Path UI must leave the Hub first frame. Journey **data/entitlement backends** may remain — theatre may not.

---

## Previous vs New

| | Previous (Rooms V1 as shipped) | New (Pack 4.9 target) |
|---|---|---|
| First pixels | `PageHeader` → patent → child → trial banner → `HubJourneyPulse` → `TodaysPath` unlock → rooms | **Rooms** (`ParentHubRoomsShell`) |
| Emotional ask | “How am I scoring / what’s my tip mall?” | “What do you need for {name}?” |
| Material | Purple/pink `.parent-hub-premium` wash **plus** FE sanctuary shell | **One** FE/sanctuary system only |
| Gamification | Pulse wallet visible; section points already disabled | **Zero** Hub gamification chrome |
| Journey | Soft-lock strip + peek-ahead above rooms | **No** Journey UI above rooms |
| Header Ask Amy | Marketing chip competing with Help | Removed from above-room stack |
| Kill switch | `VITE_FF_PARENT_HUB_ROOMS_V1=0` → eight-group mall | Keep kill switch; Pack 4.9 changes apply when Rooms V1 ON |
| Destinations after open | Still legacy product shelves (Apple P0#2) | **Out of Pack 4.9 primary scope** — listed as remaining debt |

---

# 1. Everything removed (Rooms V1 ON)

Removal = do not render on the Parent Hub page when `isParentHubRoomsV1Enabled()`.  
Components/files may remain in repo for kill-switch legacy path unless noted.

## 1.1 Pre-room chrome (P0 — Apple blocker #1)

| # | Surface | Evidence today | Disposition |
|---|---|---|---|
| R1 | **Science Tip header** | `PageHeader` — “Parenting Hub” + “Science-backed articles & quick tips” | **Remove** from Rooms V1 stack |
| R2 | **Patent strip** | `patent_pending.hub_trust` under header | **Remove** from Rooms V1 stack |
| R3 | **Header Ask Amy chip** | `PageHeader` → `/assistant` | **Remove** above rooms (Ask Amy remains Help destination) |
| R4 | **Infant trial banner** | `InfantTrialBanner` | **Remove** above rooms (competing banner / sales energy) |
| R5 | **Journey Pulse** | `HubJourneyPulse` — Level · XP · coins · streak · MasteryRing · journey dots | **Remove** entire widget on Rooms V1 |
| R6 | **Journey unlock / Today’s Path strip** | `TodaysPathFromStatus` + `onPeekAhead` / unlock CTA | **Remove** above rooms on Rooms V1 |
| R7 | **Reward celebration modal** | `RewardCelebrationModal` mounted on Hub page | **Remove** mount on Rooms V1 (no Hub reward theatre) |
| R8 | **Legacy learning panel path** | Already gated `!roomsV1` — Confirm stays off | **Keep off** |
| R9 | **Feature mall chrome** | Eight-group mall / `ForYouHeader` / `HubQuickActions` — already `!roomsV1` | **Keep off**; do not reintroduce |
| R10 | **Legacy hero stack** | For-you / group heroes above intention | **Keep off** on Rooms V1 |

## 1.2 Unlock theatre (above-room)

| # | Surface | Disposition |
|---|---|---|
| R11 | Peek-ahead unlock (`hubJourney.peekAheadUnlock`) on Hub | **Remove** from Rooms V1 UI |
| R12 | Journey soft-lock CTA cards above rooms | **Remove** from Rooms V1 UI |
| R13 | Dead `onOpenLearning={() => undefined}` pulse affordance | **Remove** with pulse |

## 1.3 Material language (page chassis)

| # | Surface | Disposition |
|---|---|---|
| R14 | Purple/pink radial `.parent-hub-premium` page wash on Rooms V1 | **Remove / neutralize** — page must not introduce a second planet |
| R15 | `hub-page-enter` / sparkle / progress-fill theatre tied to Hub wallet stack | **Do not drive** Rooms V1 first frame |
| R16 | Accent-bar SaaS section chrome **as page prologue** | **Forbidden** above rooms |

**Material allowlist (only):**

| System | Source |
|---|---|
| Welcome FE materials | `first-experience-material.css` + `/experience/r1/*` |
| Discovery FE continuity | Same shot grammar |
| Today Home memory continuity | Shared FE photography |
| Parent Hub rooms | `parent-hub-living-room.css` + room heroes |

**One material system may remain.**  
No purple Hub galaxy. No edtech wallet glass as prologue.

---

# 2. Everything intentionally kept

## 2.1 Kept and primary

| Keep | Why |
|---|---|
| `ParentHubRoomsShell` | The Hub |
| Four rooms · doors · heroes · feelings · intentions | Constitution + Apple praise |
| Pack 3 destinations + Pack 4 flow recommendation + exit panel | Living flow |
| Quiet “Back to Today Home” inside shell | Exit Law / Boundary Law |
| Rooms V1 feature flag kill switch | Production safety |
| Infant auto-enter Care | Humane; Apple-noted as correct |
| FE photography shots 01/02/04/05 | Craft continuity |
| Existing destination **module products** (Infant Care, Nutrition, Speech, etc.) | Reuse Before Rewrite — opened quietly after a path (shelf **styling** debt is later) |

## 2.2 Kept subordinated (identity only)

| Keep | Rule |
|---|---|
| **Child selector** | Constitution shell identity. **Not** a hero. If multi-child requires it, render as **one quiet control** that does not outrank doors — or fold into the doors headline context (“What do you need for {name}?”). Never a marketing panel. |
| Child name in room copy | Required humanity |

## 2.3 Kept off-page / backend (not Hub chrome)

| Keep | Why |
|---|---|
| Hub Journey API / `parent_hub_journey` data | Entitlement period may still exist — **UI theatre leaves Hub** |
| Feature-usage · content caps · RevenueCat · paywall modal | Pack 5 Continuity policy governs invites later — not this pack |
| Learning XP/wallet systems elsewhere | Forbidden as **Hub** chrome; do not delete product-wide |
| Legacy mall under `VITE_FF_PARENT_HUB_ROOMS_V1=0` | Rollback path until Founder retires kill switch |
| Patent copy in Settings / About (if any) | Not Hub first frame |

## 2.4 Explicitly NOT in Pack 4.9 implementation scope

These remain **documented debt** after Pack 4.9 subtraction of the prologue:

| Debt | Apple ref | Why deferred |
|---|---|---|
| Destination modules still open as Premium product shelves | P0 #2 | Subtraction of module chrome ≠ Pack 5 Premium Continuity policy implementation; requires separate Founder order |
| Nested `web_tiles` emoji member titles | P1 #7 | Label cleanup pack |
| Sanctuary a11y gaps | P1 #8 | Craft pack |
| Room analytics | P2 #9 | Observability pack |
| Pack 4.6 intelligence code | P2 #10 | Already policy-locked; not this pack |

Pack 4.9 clears the **first frame**.  
It does not pretend the second tap is finished.

---

# 3. Target Rooms V1 page stack (after approval + implementation)

```text
[optional: quiet child identity — subordinated]
ParentHubRoomsShell
  └ doors | entered room | quiet paths | exit
[no page-level patent / pulse / path / trial / reward modal]
```

**First question on screen:**  
“What do you need for {name}?”

**Not:**  
“Science-backed articles & quick tips.”

---

# 4. DB impact

| Item | Impact |
|---|---|
| New tables | **None** |
| Migrations | **None** |
| `parent_hub_journey` | **Keep** — stop presenting theatre on Hub; data may still gate access server-side |
| Learning wallet / XP tables | **Keep** — Hub stops displaying them |
| Drop tables | **Forbidden** this pack |

**DB philosophy:** Subtraction of UI is not DROP TABLE.

---

# 5. API impact

| Item | Impact |
|---|---|
| New endpoints | **None** |
| `/api/hub-journey/*` | **Keep** — may still be fetched; Rooms V1 **must not** render pulse/path/unlock from it |
| Learning-progress fetches on Hub | Prefer **stop calling solely for Hub chrome** when Rooms V1 ON (optional cleanup when implementing — no contract break) |
| Assistant / infant / nutrition / speech / birth-sky | **Unchanged** |
| Paywall / RevenueCat | **Unchanged** this pack |

---

# 6. Analytics impact

| Item | Impact |
|---|---|
| Rewrites of existing funnels | **None required** this pack |
| Hub section-visit / points | Already no-op under Rooms V1 — keep no-op |
| Journey pulse impressions | Will naturally drop when UI removed — acceptable |
| New room analytics | **Not** Pack 4.9 (still debt) |
| AppLink sources (`parent-hub-doors-home`, etc.) | Keep |

---

# 7. Production safety

| Control | Plan |
|---|---|
| Feature flag | Changes apply only when `VITE_FF_PARENT_HUB_ROOMS_V1` enabled (default ON) |
| Kill switch | `=0` restores legacy mall **including** prior chrome (acceptable emergency) |
| Scope blast radius | Prefer guard in `parenting-hub.tsx` Rooms V1 branch — avoid deleting shared nutrition tokens used outside Hub prologue |
| Welcome / Discovery / Today Home | **Do not touch** FE CSS source files; Hub may stop importing conflicting page wash |
| No entitlement flips | Soft-lock may still exist server-side; removing unlock strip is UI subtraction, not free Premium |
| No pricing / RC / auth | Absolute |

### Suggested implementation flag (optional, when Founder orders code)

`VITE_FF_PARENT_HUB_LEGACY_CHROME_OFF_V1` — default ON with Rooms V1 — for independent rollback of subtraction without killing rooms.

If Founder prefers zero new flags: gate solely on Rooms V1.

---

# 8. Rollback

| Failure | Rollback |
|---|---|
| Rooms feel too bare / parent confusion | Re-enable quiet child identity only — **not** the pulse |
| Entitlement confusion without Journey strip | Keep server gates; surface continuity later per Pack 5 policy — do **not** restore XP theatre |
| Visual regression | Restore `.parent-hub-premium` class on page wrapper via flag |
| Full emergency | `VITE_FF_PARENT_HUB_ROOMS_V1=0` → legacy mall |

**Rollback never reintroduces XP/coins/Level as “fix.”**

---

# 9. Implementation sketch (for the future pack — not now)

When Founder approves code work, subtraction order:

1. In `ParentingHubPage` Rooms V1 branch: stop rendering `PageHeader`, `InfantTrialBanner`, `HubJourneyPulse`, `TodaysPathFromStatus`, `RewardCelebrationModal`.  
2. Keep `ChildSelectorPanel` only if multi-child — quiet.  
3. Neutralize `PARENT_HUB_PAGE` / `.parent-hub-premium` wash when Rooms V1 (sanctuary-compatible page shell).  
4. Confirm mall / learning panel remain behind `!roomsV1`.  
5. Do **not** edit Welcome/Discovery/Today Home.  
6. Do **not** redesign `ParentHubRoomsShell`.  
7. Tests: Rooms V1 first frame contains doors question; asserts absence of XP/coins/patent/science subtitle/pulse testids.  
8. STOP — do not touch destination FeatureGates (later order).

---

# 10. Apple review (Board re-score forecast)

If Pack 4.9 ships exactly as this blueprint (prologue only):

| Dimension | Audit now | After 4.9 (forecast) |
|---|---|---|
| First impression | Feature browser | **Calm place** (rooms first) |
| Apple Philosophy | 4.5 | **~7.0** |
| Materials | 5.5 | **~7.5** (one planet at page level) |
| Premium | 4.0 | **Still ~4.0** until destination shelf debt cleared |
| Overall maturity | 5.5 | **~6.5–7.0** — freeze still blocked by P0#2 shelf |

**Would Apple approve after Pack 4.9 alone?**  
**Still NO** — until opened destinations stop being product shelves.  
**Would Apple recognise progress?**  
**YES** — first-frame intention would finally match Journal/Health restraint.

---

# 11. Founder review

| Question | Answer |
|---|---|
| Does this obey Apple NO? | **Yes** — attacks highest-impact blocker (pre-room chassis) without redesign theatre |
| Is this subtraction? | **Yes** — no new rooms, no new products, no Pack 5 paywall work |
| Constitution conflict? | Journey-as-shell UI placement **updated by this order**; Journey backend retained |
| Home Boundary? | Strengthened — Hub no longer opens as wallet/tips mall |
| Risk of over-deletion? | Child identity kept subordinated; modules kept; kill switch kept |
| Pack 5? | **Not started** |

### Founder Recommendation

**APPROVE Pack 4.9 blueprint for a future subtraction implementation order.**

Do not implement until Founder says implement.  
Do not treat Pack 4.9 as Production Freeze.  
Do not begin Pack 5 Premium Continuity code.

---

# 12. Scores (blueprint quality)

| Score | Value |
|---|---|
| Subtraction clarity | **9.5 / 10** |
| Constitution alignment | **9 / 10** |
| Apple gate response | **9 / 10** (P0#1); incomplete alone for full YES |
| Production safety | **9 / 10** |
| Scope discipline (no Pack 5 creep) | **10 / 10** |

---

## STOP

No implementation.  
No Pack 5 implementation.  
No redesign.

Wait for Founder approval.
)
