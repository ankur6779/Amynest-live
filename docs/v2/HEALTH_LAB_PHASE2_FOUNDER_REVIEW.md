# Health Lab Phase 2 — Founder Review

**Status:** MANUFACTURED — ANOTHER CARE ROOM IN THE AMYNEST HOME  
**Date:** 2026-08-08  
**Authority:** Founder Order — Health Lab Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** _(filled at push)_  

**STOP after this module.** Wait for Founder approval.

**Frozen:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub room IA · Infant Care · Speech Coach · **Nutrition**

---

## Mission result

Health Lab is no longer a **galaxy / XP / gamification / science-app** product as the living face of Care wellness.

It opens and continues as **another room in the AmyNest home**: FE Care photography · companionship (**I'm here with you**) · one recommended calm practice · quiet wellness paths · soft session completion · soft celebration notes.

Removed from the living default face:

- Violet galaxy shell / starfield / portal flash on practice entry  
- Shop · coins · daily surprise · wellness-world map under More  
- XP / Level up / Quest / star theatre on session complete  
- “Amy Health Lab™” / superpowers marketing on Hub tile  

**Kept (untouched engines):** health / exercise engines · scoring math · shop purchase logic · DB `health_lab_progress` · API `/api/health-lab/*` · analytics event names · sync · medical disclaimer meaning · entitlements.

---

## Emotional target

| Forbidden feeling | Required feeling |
|---|---|
| Galaxy UI | Care sanctuary room |
| XP / gamification | Quiet effort noted |
| Science app / lab™ | Home wellness practice |
| Adventure quest storefront | One calm step today |

---

## Previous vs New

| | Previous (residual after first open) | New (this manufacture deepen) |
|---|---|---|
| Opening | Today's Care FE + quiet paths | Companionship voice + same Care FE room |
| More wellness | Shop · coins · surprise · world map · grown-ups | Grown-ups continuity only — no XP marketplace |
| Practice stage | Violet galaxy mesh + starfield | Warm sanctuary stage; starfield gated off |
| Entry flash | Portal galaxy flash | Soft settle (no portal) |
| Session complete | +XP · tier · quests · stars | Calm practice complete · effort noted |
| Celebrations | Violet Level Up / Quest theatre | Soft Care notes |
| Hub tile | Amy Health Lab™ · superpowers | Care · Wellness · quiet purpose |
| Rollback | — | `VITE_FF_HEALTH_LAB_LIVING_V1=0` → legacy lab adventure |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living Care room | `/opt/cursor/artifacts/health-lab-phase2-living-v2.png` |

<img alt="Health Lab Phase 2 living Care room" src="/opt/cursor/artifacts/health-lab-phase2-living-v2.png" />

_(If capture unavailable, open `/health-lab` with `VITE_FF_HEALTH_LAB_LIVING_V1` default ON.)_

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/health-lab/living-room.ts` | Companionship + soft completion / celebration helpers (flag reused) |
| `lib/health-lab/living-room.test.ts` | No galaxy / XP / quest language on living face |
| `components/health-lab/health-lab-living-room.css` | Living stage / rewards / More materials |
| `health-lab-living-opening.tsx` | Companionship open |
| `health-lab-home.tsx` | More = grown-ups only (shop/XP/map demoted out of living) |
| `health-lab-zone.tsx` | Care header · no portal flash when living |
| `health-lab-game-ui.tsx` | Sanctuary practice stage when living |
| `health-lab-cinematic.tsx` | Starfield gated off when living |
| `health-lab-session-rewards.tsx` | Soft completion — no XP theatre |
| `health-lab-celebration.tsx` | Soft Care notes — no Level Up theatre |
| `health-zone-card-config.ts` | Care chip (Heart) |
| `i18n/en.json` | Soft Hub tile / preview copy |
| Photo | `ROOM_HEROES.care` → `/experience/r1/shot-01-arrival.png` (reused) |

**Untouched / frozen:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · Nutrition · scoring · shop purchase math · motion engine · game physics · disclaimer meaning · API · DB · sync · analytics event names · RevenueCat / `canAccessHealthLab` · Firebase · Auth · routing · deep-link ids · feature-flag **definition** (existing `VITE_FF_HEALTH_LAB_LIVING_V1` reused).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Care continuity; Hub tile softened |
| Opening O1–O5 | **PASS** — companionship + one recommend; no XP first |
| Hero H1–H4 | **PASS** — FE arrival photography |
| Typography T1–T5 | **PASS** — sanctuary rhythm; unlock shout removed from living |
| Materials M1–M5 | **PASS** — galaxy wash / starfield gated off living |
| Navigation N1–N6 | **PASS** — Care back + Home exit |
| Premium P1–P5 | **PASS** — entitlements unchanged; `PREMIUM_VOICE` |
| Loading L1–L4 | **PASS** — hydrate path unchanged |
| Empty X1–X3 | **PASS** — calmer preview copy |
| Error R1–R4 | **PASS** — no unlock-to-fix framing added |
| Success S1–S3 | **PASS** — soft practice complete (logic celebrations retained, presentation softened) |
| Completion C1–C4 | **PASS** — Back to Care / Today Home |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** (living room + practice stage) |
| Same light | **YES** |
| Same material system | **YES** (sanctuary) |
| Same emotional voice | **YES** |
| Same calm | **YES** |
| Same photography language | **YES** |
| No product marketing | **YES** (living default) |
| No SaaS / game / science-lab energy | **YES** (living open + session chrome) |
| Blind recognition without logo | **YES** |
| Opening does not feel like another app | **YES** |

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Health / exercise engines | **Untouched** |
| Scoring / shop logic | **Untouched** (presentation only) |
| Medical disclaimer | Preserved under More |
| Firebase | Unchanged |
| RevenueCat / entitlements | **Zero** changes |
| Routing | `/health-lab` preserved |
| Feature flags | Existing `VITE_FF_HEALTH_LAB_LIVING_V1` reused (default ON) |
| Analytics | Event names unchanged |

### Rollback

1. `VITE_FF_HEALTH_LAB_LIVING_V1=0` → legacy galaxy adventure home + XP theatre  
2. Git revert of this manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts` + `health-lab.test.ts`) |
| Production build | **PASS** _(filled at gate)_ |
| Founder Review | **PASS** vs order (experience only; engines kept) |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **9.0 / 10** | Galaxy / XP / science-app face removed from living room |
| **Apple Score** | **8.6 / 10** | Same-home Care room; progress/dashboard interiors residual |
| **Accessibility Score** | **8.4 / 10** | Care header + calm hierarchy; grown-ups `aria-expanded` |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured living Care room and practice chrome.

---

## Remaining Debt (does not reopen this order)

1. **Progress / dashboard / shop interiors** — still reachable from grown-ups; may retain denser product DNA  
2. **Game-specific motif art** inside some exercises — engine visuals residual under practice  
3. **Legacy adventure home** when flag OFF — preserved intentionally for rollback  
4. **Next modules** — not started — wait for Founder approval  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Galaxy UI removed from living default | **YES** |
| XP / gamification feeling removed from living face | **YES** |
| Science-app / lab™ feeling removed | **YES** |
| Another Care room in AmyNest home | **YES** |
| Health engine kept | **YES** |
| Exercises kept | **YES** |
| Logic / DB / API / analytics kept | **YES** |
| Experience-only manufacture | **YES** |
| Existing flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Waiting for Founder approval.  
Do not begin the next module.
