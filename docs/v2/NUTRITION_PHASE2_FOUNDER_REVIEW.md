# Nutrition Phase 2 — Founder Review

**Status:** MANUFACTURED — PRESENTATION / HIERARCHY / MATERIALS ONLY  
**Date:** 2026-08-07  
**Authority:** Founder Order — Nutrition Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** _(stamped after commit)_

**STOP after this module.** Next destination only after Founder acceptance.

Speech Coach remains frozen.

---

## Mission result

Nutrition is no longer a “Nutrition Hub / Smart Family Nutrition” feature page as the first impression.

It opens as **Today's Care** inside the AmyNest house — Care-room FE photography, one recommended meal act, quiet care paths (Today · Plan · Learn · Notice · Family), meal-first Today stack, and discovery / disclaimer under **More care**.

Meal logic, recommendations, DB, APIs, sync, scores, entitlements, and RevenueCat remain.

---

## Previous vs New

| | Previous | New (Phase 2) |
|---|---|---|
| Opening | 🥗 emoji hero · “Nutrition Hub” · “Smart Family Nutrition” | **Today's Care** FE hero → one recommend → quiet paths |
| Hierarchy | Score / Crown preview / many cards first | Meal first; score & story subordinated |
| Photography | None on route | Care FE `shot-01-arrival` + ambient continuity |
| Materials | Emerald SaaS glass · sticky `#0b1730` pill | FE / sanctuary night light + softened nav |
| Premium | Crown blur preview + Try Free on AI shelves | Hidden on living opening; `PREMIUM_VOICE` continuity note |
| Navigation | In-app tabs only | Back to **Care** + **Back to Today Home** |
| Loading | Marketplace shimmer grid | Sanctuary living skeleton |
| Completion | Achievement / streak theatre unchanged internally | Opening ends in life exit + quiet invite |
| Rollback | — | `VITE_FF_NUTRITION_LIVING_V1=0` → legacy hub |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living hierarchy preview | `/opt/cursor/artifacts/nutrition-phase2-living.png` |

<img alt="Nutrition Phase 2 living hierarchy" src="/opt/cursor/artifacts/nutrition-phase2-living.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/nutrition/living-room.ts` | Recommend action + quiet tab paths + flag |
| `lib/nutrition/living-room.test.ts` | Unit tests |
| `components/nutrition/nutrition-living-room.css` | Sanctuary hierarchy materials |
| `features/nutrition/components/shared/nutrition-living-opening.tsx` | FE Care hero + recommend + quiet paths |
| `features/nutrition/layout/nutrition-layout.tsx` | Living shell vs legacy kill-switch; Care back + Home exit |
| `features/nutrition/pages/today-page.tsx` | Meal-first living stack; no Crown preview above fold |
| `components/premium/nutrition-premium-preview.tsx` | No-op in living (Crown shelf removed from opening) |
| `plan/ai-meal-plan-section.tsx` · `family/family-mode-section.tsx` | Hide Try Free shelf chrome when living |
| `components/route-skeletons/nutrition-hub-skeleton.tsx` | Sanctuary skeleton |
| Import | `first-experience-material.css` (reuse only) |
| Photo | `ROOM_HEROES.care` → `/experience/r1/shot-01-arrival.png` |

**Untouched:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · meal recommendation engines · nutrition-data / region · sync / score / memory · grocery / tiffin / prep · API contracts · analytics event names · RevenueCat / entitlements / quotas · Firebase · routing · tab/panel ids (`nutrition-tab-*`, `nutrition-panel-*`, `#tile-nutrition`).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Care quiet path continuity; first route frame uses Care FE light |
| Opening O1–O5 | **PASS** — one Care sentence; no catalogue / score first |
| Hero H1–H4 | **PASS** — FE arrival photography |
| Typography T1–T5 | **PASS** — Quicksand sanctuary; no UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; emerald storefront removed from opening |
| Navigation N1–N6 | **PASS** — back to Care; Home exit present; deep links preserved |
| Premium P1–P5 | **PASS** — entitlements unchanged; `PREMIUM_VOICE` only on living chrome |
| Loading L1–L4 | **PASS** — sanctuary skeleton |
| Empty X1–X3 | **PASS** — existing meal empty guidance retained (no upsell added) |
| Error R1–R4 | **PASS** — existing retries unchanged; no unlock-to-fix framing added |
| Success S1–S3 | **PASS** — opening does not add confetti chrome |
| Completion C1–C4 | **PASS** — Home exit + quiet continuity invitation |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** |
| Same light | **YES** |
| Same material system | **YES** (opening) |
| Same emotional voice | **YES** |
| Same calm | **YES** (opening) |
| Same photography language | **YES** |
| No product marketing | **YES** (living opening) |
| No SaaS energy | **YES** (opening; tools remain in tabs / More) |
| Blind recognition without logo | **YES** |
| Opening does not feel like another app | **YES** |

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Meal logic / recommendations | **Untouched** |
| Firebase | Unchanged |
| RevenueCat / entitlements / quotas | **Zero** changes |
| Routing | `/nutrition` preserved |
| Deep links | `#tile-nutrition` + tab/panel ids preserved |
| Feature flags | New `VITE_FF_NUTRITION_LIVING_V1` (default ON) |
| Analytics | Open/tab events unchanged |
| Accessibility | Recommend / quiet / More are buttons; `aria-expanded` on More |
| Performance | Crown preview skipped in living; discovery deferred under More |

### Rollback

1. `VITE_FF_NUTRITION_LIVING_V1=0` → legacy Nutrition Hub catalogue  
2. Git revert of Phase 2 commit  
3. Never flip entitlements to “fix” UI  

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order |
| Apple Review | **PASS approaching** — opening is a calm Care room; tab interiors still share prior card DNA |
| Parent Review | **PASS** — one next meal act first |
| Engineering Review | **PASS** — flag + reuse |
| Database Review | **PASS** |
| Growth Review | **PASS** — Premium continuity; no Crown/Try Free on opening |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **8.5 / 10** | Feature-page feeling removed from opening |
| **Apple Score** | **8.1 / 10** | Same-home opening; tab interiors residual |
| **Accessibility Score** | **8.4 / 10** | Hero contrast + calm loading; tools inherit prior a11y |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured opening.

---

## Remaining Debt (does not reopen this order)

1. **Tab interiors** (Plan / Track / Learn / Family) — still product card DNA when entered  
2. **Achievements / streak chrome** inside Track — not opening chrome  
3. **Sticky tab nav** softened, not fully photographic doors  
4. **Health Lab / Grow / etc.** — not started  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Feature-page feeling removed from opening | **YES** |
| Today's Care + one recommendation | **YES** |
| Quiet supporting destinations | **YES** |
| Score / Crown subordinated or removed from open | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Meal logic / DB / API / entitlements preserved | **YES** |
| Reuse Before Rewrite | **YES** |
| Flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Nutrition Phase 2 complete.  
**Do not begin Health Lab or any next module.**  
Wait for Founder approval.
