# Parent Hub P0-6 — Peer Catalogue Remediation Review

**Status:** IMPLEMENTED — awaiting Founder review  
**Flag:** `VITE_FF_PARENT_HUB_ROOMS_V1` (ON → remanufactured rooms; OFF → legacy Hub)  
**Frozen:** Speech Coach · P0-7 · Routine Generation · Pack 4.5/4.6 intelligence · engines · routes

---

## 1. Current-state catalogue inventory

| Room | Before (Rooms V1 ON) | After P0-6 |
|---|---|---|
| **Help** | 5 equal `ParentHubDestinationRow` peers | One-room living: Ask Amy recommend + quiet Feelings/Speech/PTM/Life Skills |
| **Understand** | 4 equal peers (Guidance, Birth Sky, Curiosity, Grow) | One-room living: Today's guidance + quiet Birth Sky/Curiosity/Grow |
| **Care** | 3 equal peers (Infant, Nutrition, Health Lab) | One-room living: Today's care + quiet secondary care paths |
| **Moments** | Already one-room (`MomentsLivingStream`) | **Preserved** |

---

## 2. P0-6 root causes

1. Only Moments had a shell early-return skipping peer doors (`data-mo-mode="one-room"`).  
2. Help / Understand / Care mapped all `ROOM_DESTINATIONS` as equal destination rows.  
3. Recommendation was a label on a peer shelf — not a room spine.  
4. Moments law was not applied to sibling rooms.

---

## 3. Before vs After

| Dimension | Before | After |
|---|---|---|
| Post-door UI | Peer product catalogue | One recommend + quiet path list |
| Recommendation | Badge on equal row | Hero CTA spine (`Start here` / `Today's guidance` / `Today's care`) |
| Secondary destinations | Compete visually | Quiet / demoted list treatment |
| Exit | After open | Preserved `ParentHubExitPanel` |
| Premium | Pack 5 quiet | PREMIUM_VOICE invitation only — no Unlock theatre |

---

## 4. Help

- **Intention:** I need help.  
- **Recommend:** Ask Amy (`Start here`) via Ask Amy living stream when available.  
- **Quiet:** Feelings (demoted — no emotional signal competition), Speech, PTM, Life Skills.  
- **No** equal Emotional peer hero.

---

## 5. Understand

- **Intention:** I want to understand.  
- **Recommend:** Today's guidance (Guidance living stream).  
- **Quiet:** Birth Sky (demoted), Curiosity (demoted), Grow.  
- **No** learning marketplace / equal educational product shelf.

---

## 6. Care

- **Intention:** I need to care for them.  
- **Recommend:** Infant Care (0–24m) or Nutrition (else) — `Today's care`.  
- **Quiet:** Remaining care destinations (Health; Infant demoted when not infant).  
- **No** three equal care product cards.

---

## 7. Moments

Preserved Presence · Story · Make living room. Talking Amy / Discovery / Event Prep remain nested — not reopened as peers.

---

## 8. Recommendation model

Unchanged Pack 4 `recommendForRoom`:

| Room | Recommend |
|---|---|
| Help | Ask Amy — Start here |
| Understand | Guidance — Today's guidance |
| Care | Infant Care / Nutrition — Today's care |
| Moments | Presence — Try this together |

No new algorithm. No Pack 4.5/4.6 threshold implementation. Manual room choice still wins.

---

## 9. Density reduction

Removed from Help/Understand/Care entered surfaces:

- Equal feature / peer hero cards  
- Destination row catalogue wall  
- Visual competition between secondary paths  

Destinations remain reachable as **quiet paths** (IA disposition — not deleted).

---

## 10. Visual hierarchy

Reuses Moments sanctuary materials (`moments-living-room.css`):

- Room photography hero + readability veil  
- One recommend CTA  
- Quiet path list (demoted styling for non-lead paths)  
- PREMIUM_VOICE continuity note  

No new visual system. Room doors photography hierarchy unchanged.

---

## 11. Premium treatment

- No pricing / RevenueCat / entitlement changes  
- Continuity invitation only (`PREMIUM_VOICE`)  
- No Unlock / Explore Free / PRO / FOMO shelf badges

---

## 12. Entry law

Today Home still wins when one action is enough. Hub remains Help · Understand · Care · Moments. No What's new / Explore / Browse all / Games / Dashboard added.

---

## 13. Exit law

`ParentHubExitPanel`: Back to Home · Continue today · Another room. Path completion still triggers exit after deepen.

---

## 14. Accessibility

| Item | Status |
|---|---|
| Semantic eyebrow / h1 / quiet labels | Yes |
| Recommend + quiet path buttons | Yes |
| Demoted quiet paths marked `data-demoted` | Yes |
| Photography readability veil | Yes (Moments materials) |
| 48px+ targets on recommend CTA | Via Moments `.mo-recommend-btn` |
| Device VO/TalkBack cert | **Not claimed** |

---

## 15. Performance

Presentation-only streams + shell branch. No new API/AI/polling.

---

## 16. DB / API / Firebase safety

Unchanged. No module/route/engine deletions. Destinations remain in `ROOM_DESTINATIONS` for deep links / kill-switch peer path.

---

## 17. RevenueCat safety

Unchanged.

---

## 18. Flag safety

| Flag | Behavior |
|---|---|
| `VITE_FF_PARENT_HUB_ROOMS_V1` ON | Rooms shell + P0-6 one-room living for Help/Understand/Care |
| OFF | Legacy Hub mall path intact |
| `renderRoomLivingStream` omitted | Peer catalogue kill-switch inside Rooms V1 (tests / rollback) |

No new feature flags created.

---

## 19. Tests

| Suite | Result |
|---|---|
| `room-living.test.ts` | PASS |
| `parent-hub-room.test.tsx` (incl. P0-6 Help/Understand/Care) | PASS |
| Parent Hub lib tests | PASS |
| Moments living tests | PASS |
| P0-7 hard-day tests | PASS |
| Speech living-session tests | PASS |
| `tsc --noEmit` | PASS |

---

## 20. Production build

`pnpm run build` (kidschedule) — **PASS**.

---

## 21. Screenshots

Auth-gated environment — signed-in Hub room screenshots not captured in this run.

Founder device should confirm:

1. Hub root — four room doors  
2. Help — Ask Amy spine, quiet secondaries  
3. Understand — Guidance spine  
4. Care — Today's care spine  
5. Moments — unchanged one-room  
6. Exit panel after deepen  

---

## 22. Blind test

| Question | Target | Honest |
|---|---|---|
| Do I see a catalogue? | NO | **NO** on Help/Understand/Care living (peer rows removed) |
| Understand each room's purpose? | YES | **YES** |
| One obvious first thing? | YES | **YES** |
| Secondary paths quiet? | YES | **YES** |
| Tired parent browsing loop? | NO | **NO** (exit panel + quiet deepen) |

---

## 23. Founder score

| Dimension | Score | Note |
|---|---|---|
| Visual consistency | **8.4** | Same Moments sanctuary house |
| Product consistency | **8.6** | Four intentions · one spine each |
| IA consistency | **8.8** | Moments law applied to siblings |
| Density | **8.5** | Peer shelves removed |
| Recommendation clarity | **8.7** | Locked Pack 4 labels |
| Premium continuity | **8.5** | Invitation only |
| Accessibility | **7.8** | Static only |
| Apple readiness | **8.2** | Hub no longer feature mall under Rooms V1 |

---

## 24. Apple readiness

Hub Rooms V1 now reads as **four living rooms**, not a peer catalogue. Final Apple Audit **not** run / not claimed.

---

## 25. Remaining debt

1. Authenticated visual screenshot pack on Founder device  
2. Device VoiceOver/TalkBack certification (separate)  
3. Legacy Hub (Rooms V1 OFF) still mall — intentional rollback  
4. Curiosity honesty polish (still quiet Understand path)  
5. Final Apple Audit — not started  

---

## 26. Rollback

1. `VITE_FF_PARENT_HUB_ROOMS_V1=0` → full legacy Hub  
2. Or omit `renderRoomLivingStream` → peer catalogue inside Rooms V1  

Engines / destinations data retained either way.

---

## 27. Commit SHA

**Implementation commit:** `411588228cbabae35ea7871bd2f7133fb275c830`  
**Branch:** `cursor/product-execution-model-v2`

---

## STOP

- Accessibility certification — **not started**  
- Final Apple Audit — **not started**  
- Speech Coach — **not modified**  
- P0-7 — **not modified**  
- Routine Generation — **not modified**  

Awaiting Founder review.
