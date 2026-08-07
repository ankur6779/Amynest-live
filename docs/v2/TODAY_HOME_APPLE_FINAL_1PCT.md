# Today Home — Apple Final Polish (Last 1%)

**Status:** Implemented — awaiting Founder gate on Parent Hub  
**Scope:** Craftsmanship only  
**Frozen:** Welcome · Signup · Discovery · Today Home Hero structure · Parent Hub · Child Hub  
**Not modified:** Routing · DB · Firebase · RevenueCat · Analytics · OAuth · Sessions · Feature flags · Business logic  

---

## Fixes delivered

### FIX 01 — Navigation language
| Before | After |
|---|---|
| Tab label `Dashboard` | **Home** |
| Nav description “Overview & summary” | **Today’s next right thing** |
| Tab bar landmark used “Dashboard” | **Main** |
| Protected route label `Dashboard` | **Home** |
| Timeline title “Today’s Timeline” | **Also today** |

### FIX 02 — Timeline subordination
When Today Home V1 is on:
- Timeline marked `subordinate` — softer weight, no orange hero gradient, no duplicate intelligence banner, no progress chip competing with Home progress strip
- Delayed enter animation (respects reduced motion)
- Child chips sit above timeline (context before execution list)
- Hierarchy held: NRT → Why → Begin → Progress → Timeline

### FIX 03 — Photography continuity
- Larger memory mount (closer to Discovery earned/done)
- Warmth / crop / ambient opacity aligned to FE reflection shot
- Same asset: `/experience/r1/shot-05-reflection.png` — no new visual language

### FIX 04 — Apple micro craft
- Begin min-height 48px; focus-visible ring; reduced-motion press scale off
- Safe-area padding on sanctuary content
- Timeline rows min 48px tap height
- `aria-describedby` on Begin → Why today
- Title `text-wrap: balance`

---

## Quality gate

- [x] Unit tests  
- [x] Typecheck  
- [x] Production build  
- [x] Kill switch unchanged  
- [x] No routing / DB / analytics / auth changes  

---

## Final Apple Blind Review

| Lens | Verdict |
|---|---|
| Craft | Pass — materials, targets, motion restraint |
| Hierarchy | Pass — one hero; timeline support |
| Navigation | Pass — speaks Home, not enterprise |
| Continuity | Pass — FE photography + Home-first film |
| Recognition | Pass without logo — ivory/gold sanctuary + NRT language |
| Calm | Pass — no streak/coins on Home |
| Focus | Pass — Begin remains the only primary act |
| Premium | Pass — restraint over widget density |
| Humanity | Pass — product decides; parent acts |
| Longevity | Pass — craft deltas scoped; kill switch intact |

### Would Apple still reject this?

**NO**

Why: The previous blocking reasons (Dashboard language, competing timeline hero, thin photography continuity, micro-craft gaps) are closed. Remaining density under Home (tab bar dialect) is platform chrome, not a second product hero. The experience now reads as one continuous film with a single inevitable action.

### Can Parent Hub manufacturing begin?

**YES** — craft gate for Today Home is clear.  
**Founder must still explicitly open Parent Hub.** This document does not start it.

---

## STOP

Do not implement Parent Hub until Founder Order opens it.
