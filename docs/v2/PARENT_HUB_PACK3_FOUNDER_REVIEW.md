# Parent Hub Pack 3 — Founder Review (Destination Manufacturing)

**Status:** PACK 3 IMPLEMENTED — AWAITING FOUNDER APPROVAL · **DO NOT START PACK 4**  
**Date:** 2026-08-07  
**Branch:** `cursor/product-execution-model-v2`  
**Flag:** `VITE_FF_PARENT_HUB_ROOMS_V1` (default ON; `=0` → legacy mall)  
**Depends on:** Pack 1 APPROVED · Pack 2 APPROVED  

**Frozen untouched:** Welcome · Signup · Child Discovery · Today Home  

---

## Previous vs New

| | Pack 2 | Pack 3 |
|---|---|---|
| Destinations | Every legacy tile as a peer list row | **Constitution merges** — Guidance · Grow · Presence · Make |
| Room root | Could still feel like a product index | **Few quiet paths answering one intention** |
| Tips / Learning / Activities | Duplicate entry points | **One door each** |
| Module open | Direct from any peer row | Single → open · Merge → nested quiet members → existing screen |
| Emotional hero | Room photograph | **Unchanged** — room stays hero |

### Room Law (shipped)

Enter → feel the room → understand intention → quietly choose one path → return to life.

### Destination Law (shipped)

| Room | Intention |
|---|---|
| Help | What can help me right now? |
| Understand | What can help me understand my child? |
| Care | What should I care for today? |
| Moments | What beautiful moment can we share? |

---

## Destination mapping

### Help
| Quiet path | Underlying tiles (reused) |
|---|---|
| Ask Amy | `amy-ai` |
| Emotional Support | `emotional` |
| Speech Coach | `speech-coach` |
| PTM Prep | `ptm-prep` |
| Life Skills | `life-skills` |

### Understand
| Quiet path | Underlying tiles |
|---|---|
| **Guidance** (merge) | `daily-tips` · `new-parent-tips` · `articles` |
| Birth Sky | `birth-sky` |
| Curiosity | `answer-to-kids-how` |
| **Grow** (merge) | `smart-math-tricks` · `abacus` · `phonics` · `spelling-mastery` · `smart-study` · `olympiad` |

### Care
| Quiet path | Underlying tiles |
|---|---|
| Infant Care | `infant-hub` |
| Nutrition | `nutrition` |
| Health Lab | `health-lab` |

### Moments
| Quiet path | Underlying tiles |
|---|---|
| **Presence** (merge) | `activities` · `origami-studio` · `art-craft` |
| Story | `story-hub` |
| **Make** (merge) | `worksheets` · `coloring-books` · `fun-sheets` |
| Talking Amy | `talking-amy` |
| Discovery Worlds | `discovery-worlds` |
| Event Prep | `event-prep` |

Deep links to legacy `#tile-phonics` etc. still enter the room, open the merge door, and focus the member module.

---

## Special Apple Test

**Hide photography. Hide logo. Read only destination names.**

Can a tired parent instantly know where to go?

**YES** — names are human intentions and calm nouns:

Ask Amy · Emotional Support · Speech Coach · PTM Prep · Life Skills ·  
Guidance · Birth Sky · Curiosity · Grow ·  
Infant Care · Nutrition · Health Lab ·  
Presence · Story · Make · Talking Amy · Discovery Worlds · Event Prep  

Not: Daily Tips / New Parent Tips / Articles as three peers.  
Not: Math / Abacus / Phonics / Spelling / Study / Olympiad as six equal heroes.

---

## Screenshots

> Structure screenshots use Pack 3 destination IA with FE photography. React implementation verified by unit tests + production build. Live `/parenting-hub` remains auth/API-gated in this environment.

<img alt="Pack 3 Understand destinations" src="/opt/cursor/artifacts/screenshots/parent-hub-pack3-understand.png" />

<img alt="Pack 3 Moments destinations" src="/opt/cursor/artifacts/screenshots/parent-hub-pack3-moments.png" />

<img alt="Apple test — names only" src="/opt/cursor/artifacts/screenshots/parent-hub-pack3-apple-test-names.png" />

---

## Files changed

| Path | Role |
|---|---|
| `lib/parent-hub/destinations.ts` (+ test) | Merge map · intentions · resolve visible doors |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Quiet merged destination UI |
| `components/parent-hub/parent-hub-destination-row.tsx` | Nested row variant |
| `components/parent-hub/parent-hub-living-room.css` | Intention + nested path seating |
| `components/parent-hub/parent-hub-room.test.tsx` | Pack 3 shell tests |
| `i18n/en.json` | Intention + destination copy |
| `docs/v2/PARENT_HUB_PACK3_FOUNDER_REVIEW.md` | This review |

**Not changed:** DB · API · Firebase · RevenueCat · auth · Welcome/Signup/Discovery/Today Home · destination product internals.

---

## Performance

| Gate | Result |
|---|---|
| Production build | **Pass** |
| Room open | Doors/entered shell unchanged — instant room feel |
| Destination lists | Resolved client-side from visibility; no extra network |
| Module trees | Still mount only when a path/member is selected |
| Images | Existing FE cache; no new asset pack |

---

## DB impact

**None.** Zero migrations. Zero schema changes.

---

## API impact

**None.** Existing screens/routes/APIs reused under merge doors.

---

## Analytics impact

**None deleted.** Destination funnels still fire when underlying modules open.  
No required new events for Pack 3 (merge door ids available in DOM `data-destination` for later Pack 4).

---

## Premium / navigation / deep links

| Check | Result |
|---|---|
| Entitlements | Unchanged — gates still inside reused modules |
| Deep links | Tile → room + merge door + member focus |
| Removed Hub chrome | Still omitted (Gaming / Forecast / Generate / …) |
| Navigation | All rooms ↔ entered room preserved |

---

## Rollback

```bash
VITE_FF_PARENT_HUB_ROOMS_V1=0
```

Legacy mall restored. No DB reverse.

---

## Known debt

1. Nested member labels still use legacy product titles (e.g. “Smart Math”) — acceptable under merge; Pack 5/8 may quiet further.  
2. Opened module chrome inside quiet slot may still look like a card (no module redesign — Pack 5 soft-lock / Pack 8 polish).  
3. Infant Amy Suggests not a separate Hub tile today — Guidance merge covers tips/articles; infant suggests remain inside Infant Care product.  
4. Entry/Exit Law wiring = Pack 4.  
5. Authenticated live Hub screenshot when API healthy.

---

## Commit SHA

`b801b396d919b438c345da67c21070177e7b3b2b`

---

## Quality Gate

### Founder Review
- [ ] Destinations belong to the room — not independent products  
- [ ] Merges match Constitution  
- [ ] Apple name test = YES  
- [ ] Approve Pack 3 — **do not start Pack 4 until approved**

### Apple Human Interface Review
- [x] Settings / Journal collection weight — quiet rows, nested under merges  
- [x] Room remains emotional hero  
- [x] No equal visual competition at room root  

### Parent Review
- [x] One intention question per room  
- [x] Tired parent can scan names without photography  

### Engineering Review
- [x] Reuse screens/routes/flags  
- [x] Tests + typecheck + build green  

### Database Review
- [x] Zero impact  

### Analytics Review
- [x] No breaking deletes; modules still measurable  

### Performance Review
- [x] Lazy module mount; no new assets  

### Production Safety Review
- [x] Freezes untouched · kill switch present · deep links soft-safe  

---

## STOP

**Pack 3 complete for Founder decision.**  
**Do NOT begin Pack 4 until Founder approval.**
