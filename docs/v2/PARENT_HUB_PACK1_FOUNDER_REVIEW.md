# Parent Hub Pack 1 — Founder Review

**Status:** PACK 1 IMPLEMENTED — AWAITING FOUNDER APPROVAL · **DO NOT START PACK 2**  
**Date:** 2026-08-07  
**Branch:** `cursor/product-execution-model-v2`  
**Flag:** `VITE_FF_PARENT_HUB_ROOMS_V1` (default **ON**; `=0` → legacy mall)

**Authority:** Founder Order — Parent Hub Pack 1 (Room Shell)  
**Locked inputs:** Constitution · Visual Study · Manufacturing Plan · Production Audit · Blueprint APPROVED  

**Frozen untouched:** Welcome · Signup · Child Discovery · Today Home  

---

## Previous vs New

| | Previous (legacy mall) | New (Pack 1 Rooms V1) |
|---|---|---|
| Primary sections | 8 collapsible groups + chips | **Help · Understand · Care · Moments** only |
| First frame | Quick-action chip mall | Intention header + four room doors |
| Infant | Featured bolt-on above groups | **Care** room (+ age gravity opens Care) |
| Generate Routine | Hub tile + bottom CTA | **Removed from Hub** (Home owns Begin) |
| Gaming / Forecast / Command Center | Peer tiles | **Removed from Hub IA** |
| Learning XP panel | Full Hub theatre | **Hidden** — quiet Path only under Journey |
| Room body | N/A | Title · subtitle · **hero placeholder** · destinations · deep-link anchor |
| Module cards | Redesigned? | **No** — existing `section.render()` temporarily inside rooms |
| Photography | N/A | **Not Pack 1** (placeholder only) |

---

## What shipped (architecture only)

1. Four room doors as the only primary Hub sections (flag ON).  
2. Each room: title, quiet subtitle, placeholder hero container, secondary destination container, deep-link container.  
3. Production Audit tile→room map; removed chrome omitted.  
4. Existing modules render temporarily inside mapped rooms — **no feature redesign**.  
5. Deep links `#tile-*` expand the correct room (removed tiles = soft no-op).  
6. Section-open gaming points **stopped** when Rooms V1 ON.  
7. Quiet “Back to Today Home” link replaces Generate bottom CTA.  
8. Lazy room bodies: destinations mount only when a room is open.

---

## Files changed

| Path | Role |
|---|---|
| `artifacts/kidschedule/src/lib/parent-hub/feature-flags.ts` | Kill switch |
| `artifacts/kidschedule/src/lib/parent-hub/feature-flags.test.ts` | Flag tests |
| `artifacts/kidschedule/src/lib/parent-hub/rooms.ts` | Room ids · tile map · removals |
| `artifacts/kidschedule/src/lib/parent-hub/rooms.test.ts` | Map tests |
| `artifacts/kidschedule/src/components/parent-hub/parent-hub-room.tsx` | Room shell |
| `artifacts/kidschedule/src/components/parent-hub/parent-hub-room.test.tsx` | Shell tests |
| `artifacts/kidschedule/src/components/parent-hub/parent-hub-rooms-shell.tsx` | Four-room orchestrator |
| `artifacts/kidschedule/src/pages/parenting-hub.tsx` | Flag branch · navigate · gravity · chrome hide |
| `artifacts/kidschedule/src/i18n/en.json` | `parent_hub.rooms.*` |
| `artifacts/kidschedule/src/components/route-skeletons/parenting-hub-skeleton.tsx` | Four-door skeleton |
| `docs/v2/PARENT_HUB_PACK1_FOUNDER_REVIEW.md` | This review |

**Not changed:** APIs · Firebase · RevenueCat · DB · `/parenting-hub` route · destination product pages · Welcome/Signup/Discovery/Today Home.

---

## DB impact

**None.** Zero migrations. Zero new tables. Zero DROP.  
IA hide only for Gaming/Forecast/Command Center — underlying stores untouched.

---

## API impact

**None.** No new endpoints. No contract changes.  
When Rooms V1 ON: Hub no longer calls `earnGamingPoints` on section/room open.  
Destination APIs (infant, speech, nutrition, birth-sky, assistant) unchanged.

---

## Analytics impact

**Existing events continue** (`screen_view` `/parenting-hub`, destination funnels, infant events, hub-journey).  
**No additive Hub room events** in Pack 1 (not required for architecture).  
Gaming earn-on-open from Hub stops under flag — do not treat as retention loss.

---

## Performance impact

| Signal | Result |
|---|---|
| Production `vite build` | **Pass** |
| Room bodies | Mount only when expanded (no preload of all four destination trees) |
| Destination lazy imports | Unchanged (`HubLazyContent` / existing lazy modules) |
| Bundle | parenting-hub chunk builds cleanly; no new heavy deps |

---

## Screenshots

> **Note:** Live `/parenting-hub` was auth/API-gated in this environment (`localhost:5000` unavailable → onboarding redirect). Screenshots document the Pack 1 **room shell structure** matching shipped `ParentHubRoom` / `ParentHubRoomsShell` (title, subtitle, hero placeholder, destinations). Architecture also verified by unit tests + production build.

<img alt="Pack 1 — four room doors" src="/opt/cursor/artifacts/screenshots/parent-hub-pack1-rooms-collapsed.png" />

<img alt="Pack 1 — Help room open with hero placeholder" src="/opt/cursor/artifacts/screenshots/parent-hub-pack1-room-help-open.png" />

<img alt="Pack 1 — Care room open (infant gravity)" src="/opt/cursor/artifacts/screenshots/parent-hub-pack1-room-care-open.png" />

---

## Testing

| Gate | Result |
|---|---|
| TypeScript (`tsc -p tsconfig.json --noEmit`) | **Pass** |
| Unit: rooms map · flag · room shell · deep-link parse | **20 passed** |
| Production build | **Pass** |
| Navigation / rooms flag branch | Wired; legacy path preserved behind `=0` |
| Deep links | `navigateHub` maps tile→room; removed tiles soft no-op |
| Existing features | `section.render()` reused inside rooms — no rewrite |
| Freeze regression | Welcome / Signup / Discovery / Today Home **absent from diff** |

---

## Known debt (explicit — not Pack 1)

1. Equal feature cards still appear inside rooms (Pack 3 lists / merges).  
2. Hero is placeholder text — Pack 2 photography.  
3. Tip trilogy + six Learning launchers still peer tiles under Understand (Pack 3 merge).  
4. Activities nest not yet Presence (Pack 3).  
5. Entry Law from Home Path incomplete (Pack 4).  
6. Soft-lock still may look App Store-ish (Pack 5).  
7. Live authenticated screenshot pass pending healthy API (QA).  
8. Additive `parent_hub_room_view` analytics deferred (Pack 4).

---

## Rollback

```bash
VITE_FF_PARENT_HUB_ROOMS_V1=0
```

Restores eight-group mall + quick actions + bottom Generate CTA + learning panel.  
No DB reverse. Destination deep-link URLs unchanged.

---

## Commit SHA

_Pending — filled at commit time as `PACK1_COMMIT_SHA`._

---

## Mandatory reviews

### Founder Review

- [ ] Four rooms are the only primary sections  
- [ ] No Pack 2 photography / no module redesign shipped  
- [ ] Care holds Infant + Nutrition + Health Lab  
- [ ] Forbidden chrome gone (Gaming, Forecast, Command Center, Generate Hub CTA, chips)  
- [ ] Approve Pack 1 **or** return notes — **do not start Pack 2 until approved**

### Apple Review

- [x] Not twenty equal hero cards as page structure — four intentions  
- [x] Hierarchy started (doors > placeholders > temporary modules)  
- [ ] Full craft deferred (Pack 8) — Pack 1 is architecture  

**Verdict (engineering):** Architecture pass. Craft incomplete by design.

### Parent Review

- [x] First question is human (“What do you need?”) not “browse features”  
- [x] Rooms named in parent language  
- [ ] Density under open room still catalog-like — known Pack 3 debt  

### Engineering Review

- [x] Flag + rollback  
- [x] Reuse Before Rewrite on modules  
- [x] Route `/parenting-hub` preserved  
- [x] Tests + typecheck + build green  

### Database Review

- [x] Zero migrations  
- [x] Zero schema changes  

### Analytics Review

- [x] No breaking taxonomy deletes  
- [x] No required new events for Pack 1  
- [x] Hub gaming earn-on-open disabled under flag  

### Production Safety Review

- [x] Auth / Firebase / RevenueCat untouched  
- [x] APIs untouched  
- [x] Deep links soft-safe  
- [x] Freezes untouched  
- [x] Kill switch present  

---

## Quality Gate

| Pillar | Pack 1 |
|---|---|
| Premium | Architecture only — polish later |
| Product | Four rooms live under flag |
| Production Safety | Pass |
| Conversion | Generate removed from Hub; Home link quiet |

**Pack 1 COMPLETE for Founder decision.**  
**Pack 2 MUST NOT begin until Founder approval.**

---

## STOP
