# Parent Hub Pack 4 — Founder Review (Living Flow)

**Status:** PACK 4 IMPLEMENTED — AWAITING FOUNDER APPROVAL · **DO NOT START PACK 5**  
**Date:** 2026-08-07  
**Branch:** `cursor/product-execution-model-v2`  
**Flag:** `VITE_FF_PARENT_HUB_ROOMS_V1` (default ON; `=0` → legacy mall)  
**Depends on:** Pack 1–3 APPROVED · Pack 3.5 must-fix locks applied in flow  

**Frozen untouched:** Welcome · Signup · Child Discovery · Today Home  

---

## Previous vs New

| | Pack 3 | Pack 4 |
|---|---|---|
| Starting point | Equal quiet paths | **ONE recommended path** per room |
| Ending | Easy to linger / browse | **Exit panel** → Home / continue / another room |
| Moments roots | 6 peers | **3** — Presence · Story · Make (browse peers nested) |
| Help crisis | Ask Amy ≈ Emotional | **Ask Amy = Start here**; Emotional secondary |
| Care default | List order | **Today's care** — Infant Care / Nutrition by age |
| Trap risk | Medium | **Low** — return to life is explicit |

---

## User flow

```text
Enter room
  → Emotional hero + intention
  → ONE recommended path (labeled)
  → Optional quiet secondary paths
  → Open destination (existing screen reused)
  → Exit panel: Back to Home · Continue today · Another room
  → Today Home / life
```

Never: endless related modules · chip mall · equal “start here” twins.

---

## Navigation flow

| Step | Behavior |
|---|---|
| Room doors | Four intentions + quiet Home link |
| Enter room | Hero → intention → recommended first |
| Recommendation | Help: Start here (Ask Amy) · Understand: Today's guidance · Care: Today's care · Moments: Try this together |
| Secondary paths | Remaining destinations, quiet |
| Merge open | Nested members (unchanged reuse) |
| After path open | Exit Law panel |
| Back to Home | `/dashboard` (Today Home) |
| Continue today | Clears module; stays in room paths |
| Another room | Returns to doors (only when parent chooses) |
| Deep links | Still enter room + focus tile; exit panel appears |

---

## Recommendation Law (shipped)

| Room | Recommended id | Label |
|---|---|---|
| Help | `ask-amy` | Start here |
| Understand | `guidance` | Today's guidance |
| Care (infant) | `infant-care` | Today's care |
| Care (2+) | `nutrition` | Today's care |
| Moments | `presence` | Try this together |

Exactly one per room. No second “Start here.”

---

## Exit Law (shipped)

After a destination has been opened:

1. **Back to Home** (primary) → Today Home  
2. **Continue today** → clear module, remain in room  
3. **Another room** → doors overview (contextual, not a browse loop)

---

## Pack 3.5 must-fixes addressed

| Lock | Pack 4 action |
|---|---|
| One recommended destination | ✅ |
| Moments root ≤4 | ✅ **3** roots; Talking Amy / Discovery / Event Prep under Presence |
| Help crisis primacy | ✅ Ask Amy recommended; Emotional secondary |
| Soft overlaps | ✅ Nested under Presence (accepted as members, not peers) |

---

## Files changed

| Path | Role |
|---|---|
| `lib/parent-hub/flow.ts` (+ test) | Recommendation + ordering |
| `lib/parent-hub/destinations.ts` (+ test) | Moments Presence nest |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Living flow wiring |
| `components/parent-hub/parent-hub-destination-row.tsx` | Recommend cue |
| `components/parent-hub/parent-hub-exit-panel.tsx` | Exit Law UI |
| `components/parent-hub/parent-hub-living-room.css` | Recommend + exit seating |
| `components/parent-hub/parent-hub-room.test.tsx` | Pack 4 tests |
| `i18n/en.json` | Flow copy |
| `docs/v2/PARENT_HUB_PACK4_FOUNDER_REVIEW.md` | This review |

**Not changed:** DB · API · Firebase · RevenueCat · auth · destination product logic · Welcome/Signup/Discovery/Today Home · photography system.

---

## Performance

| Gate | Result |
|---|---|
| Unit tests | **29 passed** |
| TypeScript | **Pass** (pre-commit) |
| Extra network | None — flow is client IA |
| Module mount | Still only when path selected |

---

## DB impact

**None.**

---

## API impact

**None.**

---

## Analytics impact

**No new taxonomy events required.**  
Existing destination opens + Home navigation (`source=parent-hub-exit-home`) continue.  
Exit/recommend DOM markers available for later Pack instrumentation.

---

## Rollback

```bash
VITE_FF_PARENT_HUB_ROOMS_V1=0
```

Legacy mall restored. No DB reverse.

---

## Known debt

1. Naming opacity (PTM, Birth Sky, Grow, Health Lab) — Pack 8 / rename pass.  
2. Hero↔list composition seam — craft Pack 8.  
3. Grow still nests six skill names — progressive disclosure later.  
4. Opened module chrome may still look product-like — Pack 5 soft-lock / Pack 8.  
5. Help state-split (Emotional when shame/fear) — richer Entry Law later if Founder orders.  
6. Authenticated live Hub QA when API healthy.

---

## Commit SHA

_Pending — filled at commit time._

---

## Quality Gate

### Founder Review
- [ ] One start + one end per room feels inevitable  
- [ ] Exit returns to life — not a browse loop  
- [ ] Approve Pack 4 — **do not start Pack 5 until approved**

### Apple Review
- [x] Single primary action per room  
- [x] Secondary paths deferred  
- [x] Clear way out  

### Parent Review
- [x] “Start here / Today's care / Try this together” human  
- [x] Back to Home always available after a path  

### Engineering Review
- [x] Reuse routes/screens/flags  
- [x] Tests green  

### Database Review
- [x] Zero impact  

### Analytics Review
- [x] No breaking changes  

### Production Safety Review
- [x] Freezes untouched · kill switch · deep links intact  

---

## STOP

**Pack 4 complete for Founder decision.**  
**Do NOT begin Pack 5 until Founder approval.**
