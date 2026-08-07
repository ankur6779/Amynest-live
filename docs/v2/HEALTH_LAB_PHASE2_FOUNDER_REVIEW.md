# Health Lab Phase 2 — Founder Review

**Status:** MANUFACTURED — PRESENTATION / HIERARCHY / MATERIALS ONLY  
**Date:** 2026-08-07  
**Authority:** Founder Order — Health Lab Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** `3b433240` (`3b433240c42f9963d900312008228f2976e6adcf`)

**STOP after this module.** Next destination only after Founder acceptance.

Nutrition remains frozen.

---

## Mission result

Health Lab is no longer an “Amy Health Lab™” violet space-lab product page as the first impression.

It opens as **Today's Care** inside the AmyNest house — Care-room FE photography, one recommended wellness act (from the existing play-path engine), quiet wellness paths, and XP / shop / world-map / quest chrome under **More wellness**.

Health logic, medical disclaimer content, game engines, APIs, DB, scoring, sync, and entitlements remain.

---

## Previous vs New

| | Previous | New (Phase 2) |
|---|---|---|
| Opening | Sticky Flask · “Amy Health Lab™” · mission/XP adventure hero | **Today's Care** FE hero → one recommend → quiet paths |
| Hierarchy | Magic tray · world map · quests · grown-ups as peers | Quiet wellness first; game chrome under More |
| Photography | Violet gradients · emoji · Amy character | Care FE `shot-01-arrival` + ambient continuity |
| Materials | Purple galaxy shell + particles | FE / sanctuary night light on opening |
| Premium | Storefront title / unlock energy on open | `PREMIUM_VOICE` continuity; entitlements unchanged |
| Voice | “Start Today's Adventure” · Double XP Sunday | Calm Care wellness language on opening |
| Navigation | Module back only | Back to **Care** + **Back to Today Home** |
| Rollback | — | `VITE_FF_HEALTH_LAB_LIVING_V1=0` → legacy lab home |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living hierarchy preview | `/opt/cursor/artifacts/health-lab-phase2-living.png` |

<img alt="Health Lab Phase 2 living hierarchy" src="/opt/cursor/artifacts/health-lab-phase2-living.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/health-lab/living-room.ts` | Recommend + quiet paths + flag |
| `lib/health-lab/living-room.test.ts` | Unit tests |
| `components/health-lab/health-lab-living-room.css` | Sanctuary materials |
| `features/health-lab/components/health-lab-living-opening.tsx` | FE Care hero + recommend + quiet paths |
| `features/health-lab/components/health-lab-home.tsx` | Living layout vs legacy kill-switch |
| `features/health-lab/components/health-lab-shell.tsx` | Transparent shell when living (no violet galaxy wash) |
| `pages/health-lab.tsx` | Care title/icon when living; calmer preview empty/age states |
| Photo | `ROOM_HEROES.care` → `/experience/r1/shot-01-arrival.png` |

**Untouched:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · game physics · scoring · XP math · badges · anti-cheat · motion engine · `HEALTH_LAB_DISCLAIMER` text meaning · API `/api/health-lab/*` · DB `health_lab_progress` · sync · analytics event names · RevenueCat / `canAccessHealthLab` · Firebase · routing · deep-link ids (`health-lab`, `#tile-health-lab`, game ids).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Care quiet path continuity; first home frame uses Care FE light |
| Opening O1–O5 | **PASS** — one Care sentence; no XP/coins/levels as first pixels |
| Hero H1–H4 | **PASS** — FE arrival photography |
| Typography T1–T5 | **PASS** — sanctuary rhythm on opening; no UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; purple galaxy removed from opening shell |
| Navigation N1–N6 | **PASS** — Care back + Home exit; deep links preserved |
| Premium P1–P5 | **PASS** — entitlements unchanged; `PREMIUM_VOICE` on living chrome |
| Loading L1–L4 | **PASS** — existing hydrate path unchanged (no new theatre) |
| Empty X1–X3 | **PASS** — calmer empty/preview copy when living |
| Error R1–R4 | **PASS** — no unlock-to-fix framing added |
| Success S1–S3 | **PASS** — opening does not add confetti; celebrations remain in session flow |
| Completion C1–C4 | **PASS** — Home exit + quiet continuity invitation |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** (opening) |
| Same light | **YES** (opening) |
| Same material system | **YES** (opening) |
| Same emotional voice | **YES** (opening) |
| Same calm | **YES** (opening) |
| Same photography language | **YES** |
| No product marketing | **YES** (living opening) |
| No SaaS energy | **YES** (opening; game interiors residual) |
| Blind recognition without logo | **YES** |
| Opening does not feel like another app | **YES** |

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Health / game logic | **Untouched** |
| Medical disclaimer | Preserved (still shown under More) |
| Firebase | Unchanged |
| RevenueCat / entitlements | **Zero** changes |
| Routing | `/health-lab` preserved |
| Deep links | Preserved |
| Feature flags | New `VITE_FF_HEALTH_LAB_LIVING_V1` (default ON) |
| Analytics | Session/start events unchanged |
| Accessibility | Recommend / quiet / More are buttons; `aria-expanded` on More |

### Rollback

1. `VITE_FF_HEALTH_LAB_LIVING_V1=0` → legacy adventure home  
2. Git revert of Phase 2 commit  
3. Never flip entitlements to “fix” UI  

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts` + existing `health-lab.test.ts`) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (experience only) |
| Apple Review | **PASS approaching** — opening is a calm Care room; game interiors still violet residual |
| Parent Review | **PASS** — one next wellness act first |
| Engineering Review | **PASS** — flag + reuse + engines frozen |
| Database Review | **PASS** |
| Growth Review | **PASS** — Premium continuity; no adventure storefront on open |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **8.4 / 10** | Feature / game-OS opening removed |
| **Apple Score** | **8.0 / 10** | Same-home opening; game interiors residual debt |
| **Accessibility Score** | **8.3 / 10** | Hero contrast + calm hierarchy; interiors inherit prior a11y |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured opening.

---

## Remaining Debt (does not reopen this order)

1. **Game immersive interiors** — still violet/space-lab when a path launches  
2. **Session rewards / celebration overlays** — gamified; not opening chrome  
3. **HubModulePageShell sticky header** — title softened to “Care”; utility chrome still present  
4. **Route premium hard wall** (`canAccessHealthLab`) — entitlement policy unchanged (P1); presentation only  
5. **Grow / Discovery Worlds / etc.** — not started  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Feature / game-OS feeling removed from opening | **YES** |
| Today's Care + one recommendation | **YES** |
| Quiet supporting wellness destinations | **YES** |
| XP / coins / shop subordinated | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Health logic / medical content / API / DB preserved | **YES** |
| Reuse Before Rewrite | **YES** |
| Flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Health Lab Phase 2 complete.  
**Do not begin Grow or any next module.**  
Wait for Founder approval.
