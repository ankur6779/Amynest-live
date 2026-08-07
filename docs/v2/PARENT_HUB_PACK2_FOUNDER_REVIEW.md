# Parent Hub Pack 2 — Founder Review (Living Room Manufacturing)

**Status:** PACK 2 IMPLEMENTED — AWAITING FOUNDER APPROVAL · **DO NOT START PACK 3**  
**Date:** 2026-08-07  
**Branch:** `cursor/product-execution-model-v2`  
**Flag:** `VITE_FF_PARENT_HUB_ROOMS_V1` (default ON; `=0` → legacy mall)  
**Depends on:** Pack 1 APPROVED  

**Frozen untouched:** Welcome · Signup · Child Discovery · Today Home  

---

## Previous vs New

| | Pack 1 (architecture) | Pack 2 (emotion) |
|---|---|---|
| Metaphor | Accordion sections / admin menus | **Living rooms in one home** |
| Entry | Expand chevron groups | **Enter a photographic door** |
| Hero | Dashed “Pack 2” placeholder | **One FE cinematic photograph + one feeling** |
| Destinations | 2-col marketing feature cards | **Quiet list rows** (module opens only when chosen) |
| Visual system | Dark glass catalog dialect | **Welcome FE materials** (import-only sanctuary) |
| Feeling | “I’m expanding menus” | **“I’m entering a calm room”** |
| Competition | Equal cards shout | **Room is the hero; paths are quiet** |

### Why this now feels like entering a room instead of browsing products

1. **Doors, not accordions** — overview is four photographic doorways with an emotional sentence; there is no chevron filing cabinet.  
2. **One photograph owns the room** — the same house, morning light, materials, and restraint as Welcome / Discovery / Today Home (`/experience/r1/*`).  
3. **One emotional sentence** — Help: *You are not alone.* · Understand: *See your child more clearly.* · Care: *Take care of today.* · Moments: *Spend one meaningful moment.*  
4. **Modules demoted to quiet paths** — titles as list rows; existing module UI appears only after a path is chosen, inside a quiet slot — not a storefront grid of purple posters.  
5. **Same house continuity** — `first-experience-material.css` imported; Hub-only seating in `parent-hub-living-room.css`. Welcome CSS files are not edited.

---

## What shipped

- Photographic room doors overview  
- Entered living room: ambient + cinematic hero + feeling + quiet paths  
- Destination rows (not hero cards)  
- Existing `section.render()` reused when a path is opened (no module logic rewrite)  
- FE asset map only — no new photography pack  
- Lazy hero/door images (`loading="lazy"` / `fetchPriority` disciplined)  
- Deep link still enters the correct room and can focus a path  

---

## Room → photograph (reuse only)

| Room | FE shot | Feeling |
|---|---|---|
| Help | `shot-02-relationship.png` | You are not alone. |
| Understand | `shot-05-reflection.png` | See your child more clearly. |
| Care | `shot-01-arrival.png` | Take care of today. |
| Moments | `shot-04-transition.png` | Spend one meaningful moment. |

---

## Screenshots

> Live `/parenting-hub` remains auth/API-gated in this environment. Screenshots use the Pack 2 living-room structure with **real FE photography** from `http://127.0.0.1:3000/experience/r1/`, matching shipped `ParentHubRoomsShell` / `ParentHubRoomHero` / destination rows. Unit tests + production build verify the React implementation.

<img alt="Pack 2 — photographic room doors" src="/opt/cursor/artifacts/screenshots/parent-hub-pack2-doors.png" />

<img alt="Pack 2 — Help living room entered" src="/opt/cursor/artifacts/screenshots/parent-hub-pack2-help-entered.png" />

<img alt="Pack 2 — Care living room entered" src="/opt/cursor/artifacts/screenshots/parent-hub-pack2-care-entered.png" />

---

## Files

| Path | Role |
|---|---|
| `lib/parent-hub/room-heroes.ts` (+ test) | Room → FE photo + feeling |
| `components/parent-hub/parent-hub-room-hero.tsx` | Cinematic hero (FE memory grammar) |
| `components/parent-hub/parent-hub-destination-row.tsx` | Quiet path row |
| `components/parent-hub/parent-hub-living-room.css` | Hub sanctuary seating (not Welcome edit) |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Doors ↔ entered living room |
| `components/parent-hub/parent-hub-room.test.tsx` | Pack 2 shell tests |
| `pages/parenting-hub.tsx` | `activeRoom` / `focusTileId` wiring |
| `i18n/en.json` | Feeling + living-room copy |
| ~~`parent-hub-room.tsx`~~ | Removed Pack 1 accordion shell |
| `docs/v2/PARENT_HUB_PACK2_FOUNDER_REVIEW.md` | This review |

**Not changed:** DB · API · Firebase · RevenueCat · auth · Welcome/Signup/Discovery/Today Home source · destination product logic.

---

## DB impact

**None.**

---

## API impact

**None.**

---

## Analytics impact

**None required.** Existing Hub / destination events continue. No new events mandatory for Pack 2.

---

## Performance

| Gate | Result |
|---|---|
| Production `vite build` | **Pass** |
| Hero assets | Reused FE PNGs only — no new asset pack |
| Loading | Door thumbs + ambient lazy; entered hero `fetchPriority="high"` |
| Destinations | Module tree mounts only when a quiet path is selected |
| Bundle | No new heavy dependencies |

---

## Accessibility

- Room doors and destination rows are real `<button>` controls  
- Hero images have descriptive `alt`  
- Ambient photography `aria-hidden`  
- `prefers-reduced-motion` honored for door/row transitions  
- Entered room has “All rooms” exit control  

---

## Rollback

```bash
VITE_FF_PARENT_HUB_ROOMS_V1=0
```

Restores legacy eight-group mall. No DB reverse.

---

## Testing

| Gate | Result |
|---|---|
| TypeScript | **Pass** |
| Unit (parent-hub rooms/heroes/shell) | **Pass** |
| Production build | **Pass** |
| Freeze surfaces in diff | **Absent** |

---

## Known debt (Pack 3+)

1. Quiet path still reveals legacy module chrome inside the slot — Pack 3 can further quiet/merge lists (Guidance / Presence / Make).  
2. Soft-lock pills may still appear inside opened modules (Pack 5).  
3. Entry Law from Home Path (Pack 4).  
4. Authenticated live Hub screenshot pass when API is healthy.

---

## Commit SHA

`c93bc6c75876ecae2cc9c5ae083d9dedfcb0a4b8`

---

## Quality Gate

### Founder Review

- [ ] Feels like entering a calm room — not expanding menus  
- [ ] Photography matches Welcome house language  
- [ ] Modules are quiet paths, not equal hero cards  
- [ ] Approve Pack 2 **or** return notes — **do not start Pack 3 until approved**

### Apple Human Interface Review

- [x] One primary photograph per entered room  
- [x] Deference: paths quieter than hero  
- [x] Continuity with FE sanctuary materials  
- [ ] Full Six Reviews craft = Pack 8  

**Engineering verdict:** Emotion / hierarchy pass for Pack 2 scope.

### Parent Review

- [x] Emotional sentence is human, not SaaS  
- [x] No chip mall / Gaming / Generate storefront on Rooms V1  
- [ ] Opened module may still show legacy card chrome — known debt  

### Engineering Review

- [x] Reuse Before Rewrite (FE assets + module render)  
- [x] Flag rollback  
- [x] Tests + build green  

### Performance Review

- [x] Lazy assets · no new photography pack · selective module mount  

### Accessibility Review

- [x] Buttons · alts · exit control · reduced motion  

### Production Safety Review

- [x] Zero DB/API/auth/billing changes  
- [x] Freezes untouched  
- [x] Route `/parenting-hub` preserved  

---

## STOP

**Pack 2 complete for Founder decision.**  
**Do NOT begin Pack 3 until Founder approval.**
