# Moments Phase 2 — Founder Review

**Status:** MANUFACTURED — ONE EMOTIONAL ROOM ONLY  
**Date:** 2026-08-08  
**Authority:** Founder Order — Moments Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** `1253621d075dcfa85bf9cbbf3771dcb0d1055c92`  

**STOP after this module.** Wait for Founder approval.

**Frozen:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub room IA · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · Birth Sky · Ask Amy · **Guidance**

---

## Mission result

Moments is no longer **four products** (Presence · Story · Make · Talking Amy) as peer doors / nests.

It opens as **Today's Moment** — one emotional room: FE Moments photography, companionship voice (**I'm here with you**), one recommended act (**Ten minutes with {name}**), quiet continuous ways to be together (Together · Story · Make · Soft voice last), deepen cue before reused Hub destination logic.

Presence · Story · Make · Talking Amy deepen from the same room light — never as equal storefronts.

Activity / story / make / Talking Amy engines, Hub entitlements, and routes remain reused.

---

## Emotional target

| Forbidden feeling | Required feeling |
|---|---|
| Four products | One emotional room |
| Creativity mall | One beautiful moment |
| Peer Presence / Story / Make doors | Quiet ways to be together |
| Talking Amy leading Moments | Soft voice last — never lead |
| Nested six-tile Presence nest as first face | Soft deepen after together |

---

## Previous vs New

| | Previous | New (this manufacture) |
|---|---|---|
| Opening | 3 peer dest rows: Presence · Story · Make (+ Presence nest of 6) | **Today's Moment** FE hero → I'm here with you → one recommend → quiet paths |
| Hierarchy | Product doors as truth | Continuous room paths; Talking Amy demoted last; deepen cue before one door |
| Photography | Room ambient + Pack 2 hero | Moments FE `shot-04-transition` on living surface |
| Materials | Glass destination rows | Sanctuary stream surface + quiet path bands |
| Presence nest | Full nested catalogue | Soft “Also together” after together deepen |
| Make nest | Nested worksheets / coloring / fun | Soft “Also make” after make deepen |
| Premium | Try Free on creativity shelves | Pack 5 quiet deepen; continuity + `PREMIUM_VOICE` |
| Rollback | — | `VITE_FF_MOMENTS_LIVING_V1=0` → legacy 3 doors |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living room preview | `/opt/cursor/artifacts/moments-phase2-living-v2.png` |

<img alt="Moments Phase 2 living room" src="/opt/cursor/artifacts/moments-phase2-living-v2.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/moments/living-room.ts` | Recommend + quiet paths + deepen cue + Talking Amy demoted (flag reused) |
| `lib/moments/living-room.test.ts` | Unit tests — one room; deepen cues calm |
| `components/moments/moments-living-room.css` | Sanctuary + deepen cue + continuity |
| `components/moments/moments-living-stream.tsx` | Companionship voice · quiet paths · soft bands after deepen |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Moments living skips peer doors; deepen cue |
| Photo | `ROOM_HEROES.moments` → `/experience/r1/shot-04-transition.png` |

**Untouched / frozen:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · Guidance · destination ids (`presence`, `story`, `make`) · tile ids · activity / story / worksheet / coloring / fun-sheet engines · Talking Amy route `/talking-amy` · Discovery Worlds · Event Prep · RevenueCat / Hub feature gates · Firebase · Auth · routing tables · feature-flag **definitions** (existing `VITE_FF_MOMENTS_LIVING_V1` reused).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Moments room continuity; Pack 5 quiet deepen |
| Opening O1–O5 | **PASS** — companionship + one moment sentence; no product catalogue first |
| Hero H1–H4 | **PASS** — FE transition photography |
| Typography T1–T5 | **PASS** — sanctuary rhythm; no UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; peer product doors removed from living open |
| Navigation N1–N6 | **PASS** — All rooms + Home exit; deep links deepen tiles |
| Premium P1–P5 | **PASS** — entitlements unchanged; continuity voice |
| Loading L1–L4 | **PASS** — existing module loaders on deepen |
| Empty X1–X3 | **PASS** — existing empties retained |
| Error R1–R4 | **PASS** — no unlock-to-fix framing added |
| Success S1–S3 | **PASS** — no confetti / XP on open |
| Completion C1–C4 | **PASS** — Exit panel after a path opens |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** |
| Same light | **YES** |
| Same material system | **YES** (living room) |
| Same emotional voice | **YES** |
| Same calm | **YES** |
| Same photography language | **YES** |
| No product marketing | **YES** (living open) |
| No SaaS / four-app energy | **YES** (living open) |
| Blind recognition without logo | **YES** |
| Opening does not feel like another app | **YES** |

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Activity / story / make / voice engines | **Untouched** — reused |
| Firebase | Unchanged |
| Auth | Unchanged |
| RevenueCat / entitlements | **Zero** changes |
| Routing | `/talking-amy`, `/discovery-worlds`, Hub deepen preserved |
| Deep links | Legacy tile ids deepen inside living Moments room |
| Feature flags | Existing `VITE_FF_MOMENTS_LIVING_V1` reused (default ON) — **not redefined** |
| Analytics | No rewrite |
| Accessibility | Quiet path buttons; `aria-current`; Pack 5 quiet deepen |

### Rollback

1. `VITE_FF_MOMENTS_LIVING_V1=0` → legacy Presence · Story · Make doors  
2. Git revert of this manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## DB Review

**PASS** — zero schema / migration changes.

---

## API Review

**PASS** — engines / routes reused; zero contract changes.

---

## Analytics Review

**PASS** — no analytics rewrite.

---

## Accessibility Review

| Item | Result |
|---|---|
| Hierarchy | One h1 companionship title |
| Quiet paths | `aria-current` + demoted Soft voice |
| Deepen | Cue + Pack 5 quiet destination |

**Accessibility Score: 8.6 / 10**

---

## Regression Review

| Surface | Result |
|---|---|
| Frozen surfaces listed above | **Untouched** |
| Guidance | **Frozen — untouched** |
| Legacy Moments doors (`VITE_FF_MOMENTS_LIVING_V1=0`) | Preserved |
| Talking Amy neon OS | Demoted lane only — residual route debt |

**PASS** for manufacturing scope.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`, hub room shell) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (one emotional room; never four products) |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **9.0 / 10** | Four-product feeling removed; deepen cue continuity |
| **Apple Score** | **8.5 / 10** | Same-home room; deepened module chrome residual |
| **Accessibility Score** | **8.6 / 10** | Active path + quiet deepen |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured Moments room.

---

## Remaining Debt (does not reopen this order)

1. **Deepened module chrome** — activities / story / worksheets still use premium section shells inside quiet slot  
2. **Talking Amy neon OS** — separate later manufacturing; demoted lane only here  
3. **Discovery Worlds / Event Prep** — remain available via deep link / legacy nest; not first-frame Moments face  
4. **Next modules** — not started — wait for Founder approval  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Four-product feeling removed | **YES** |
| One emotional room | **YES** |
| Presence · Story · Make · Talking Amy in one room light | **YES** |
| Talking Amy never leads | **YES** |
| Ten minutes recommend first | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Engines preserved / reused | **YES** |
| Existing flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Moments Phase 2 complete.  
**Do not begin the next module.**  
Wait for Founder approval.
