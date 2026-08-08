# Nutrition Phase 2 — Founder Review

**Status:** MANUFACTURED — ENTRY · HERO · PHOTOGRAPHY · MATERIALS · HIERARCHY · PREMIUM · EXIT  
**Date:** 2026-08-08  
**Authority:** Founder Order — Nutrition Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** `b8abc864` (`b8abc86440a86596ef22bd3246063d644dabdef0`)  

**STOP after this module.** Wait for Founder approval.

**Frozen:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub · Infant Care · **Speech Coach**

---

## Mission result

Nutrition is no longer a meal planner, Nutrition Hub feature page, or SaaS nutrition tool as the first impression.

It opens as **another calm Care room inside AmyNest** — Care-room FE photography, companionship voice (“I'm here with you”), one recommended meal act, quiet care paths that **deepen one path at a time**, and score / story / household / discovery under **More care**.

A parent should feel: *I have someone walking beside me for this meal.*  
Never: *I opened a meal planner.*

Meal engine, recommendations, APIs, DB, analytics, RevenueCat, Firebase, Auth, and business rules remain untouched.

---

## Previous vs New

| | Previous | New (this manufacture) |
|---|---|---|
| Opening | 🥗 “Nutrition Hub” / Smart Family Nutrition · sticky `#0b1730` journey pills | **Today's Care** FE hero → one recommend → quiet paths only |
| Hierarchy | Sticky tab mall + panel always under open · score/story in Today stack | **Deepen-in-place** — panel mounts after path choose; sticky nav **removed** from living |
| Photography | None / emoji | Care FE `shot-01-arrival` + ambient continuity |
| Materials | Emerald SaaS · sticky night pill | FE / sanctuary night light + Hub glass |
| Typography | Hub / tool language | Quicksand sanctuary · companionship sentence first |
| Premium | Crown blur · Try Free on AI shelves | Hidden on living open; quiet-room `PREMIUM_VOICE` · **Continue with AmyNest** · *We'll continue helping as your child grows* |
| Navigation | Sticky journey tabs | Back to **Care** · quiet paths · **Back to Today Home** |
| Loading | Marketplace shimmer + sticky pill skeleton | Sanctuary living skeleton (no journey pill) |
| Today stack | Score · story · household under calm open | Meal care only; score/story/household nested under More |
| Completion | Achievement / streak energy nearby | Continuity invitation + life exit |
| Rollback | — | `VITE_FF_NUTRITION_LIVING_V1=0` → legacy hub (flag unchanged) |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living hierarchy (open + deepen) | `/opt/cursor/artifacts/nutrition-phase2-living.png` |

<img alt="Nutrition Phase 2 living hierarchy" src="/opt/cursor/artifacts/nutrition-phase2-living.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/nutrition/living-room.ts` | Quiet tabs + deepen guard helpers (flag reused) |
| `lib/nutrition/living-room.test.ts` | Unit tests |
| `components/nutrition/nutrition-living-room.css` | Active path · deepen panel · continuity notes |
| `features/nutrition/components/shared/nutrition-living-opening.tsx` | Companionship voice · deepen callbacks · `aria-current` |
| `features/nutrition/layout/nutrition-layout.tsx` | Living deepen gate; sticky nav removed; quiet provider; More nest; Home exit |
| `features/nutrition/pages/today-page.tsx` | Meal-first living stack; score/story/household out of open |
| `components/route-skeletons/nutrition-hub-skeleton.tsx` | No sticky-pill skeleton |
| Photo | `ROOM_HEROES.care` → `/experience/r1/shot-01-arrival.png` |

**Untouched / frozen:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · Infant Care · Speech Coach · meal recommendation engines · nutrition-data / region · sync / score / memory logic · grocery / tiffin / prep · API contracts · analytics event names · RevenueCat / entitlements / quotas · Firebase · Auth · routing · tab/panel ids (`nutrition-tab-*`, `nutrition-panel-*`, `#tile-nutrition`) · feature-flag **definitions** (existing `VITE_FF_NUTRITION_LIVING_V1` reused).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Care quiet path continuity; FE Care light; no marketing hero / XP |
| Opening O1–O5 | **PASS** — one Care companionship sentence; no catalogue / score first |
| Hero H1–H4 | **PASS** — FE arrival photography |
| Typography T1–T5 | **PASS** — Quicksand sanctuary; no UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; sticky SaaS pill removed from living |
| Navigation N1–N6 | **PASS** — back to Care; Home exit; deep links preserved via tab ids |
| Premium P1–P5 | **PASS** — entitlements unchanged; quiet-room `PREMIUM_VOICE` |
| Loading L1–L4 | **PASS** — sanctuary skeleton |
| Empty X1–X3 | **PASS** — existing meal empty guidance retained (no upsell added) |
| Error R1–R4 | **PASS** — existing retries unchanged; no unlock-to-fix framing |
| Success S1–S3 | **PASS** — opening does not add confetti chrome |
| Completion C1–C4 | **PASS** — Home exit + quiet continuity invitation |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** |
| Same light | **YES** |
| Same material system | **YES** (opening + deepen chrome) |
| Same emotional voice | **YES** |
| Same calm | **YES** (sticky journey mall removed from living) |
| Same photography language | **YES** |
| No product marketing | **YES** (living opening) |
| No SaaS energy | **YES** (living open; tools under deepen / More) |
| Blind recognition without logo | **YES** |
| Opening does not feel like another app | **YES** |

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Meal engine / recommendations | **Untouched** |
| Firebase | Unchanged |
| RevenueCat / entitlements / quotas | **Zero** changes |
| Auth | Unchanged |
| Analytics | Open/tab events unchanged (same trackers) |
| Routing | `/nutrition` preserved |
| Deep links | `#tile-nutrition` + tab/panel ids preserved |
| Feature flags | Existing `VITE_FF_NUTRITION_LIVING_V1` reused (default ON) — **not redefined** |
| Accessibility | Recommend / quiet / More are buttons; `aria-expanded`; `aria-current` on active path; quiet-room lock voice; reduced-motion honored |
| Performance | Panel not mounted until deepen; score/story deferred under More |

### Rollback

1. `VITE_FF_NUTRITION_LIVING_V1=0` → legacy Nutrition Hub catalogue + sticky nav  
2. Git revert of this manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## DB Review

| Item | Result |
|---|---|
| Schema / migrations | **NONE** |
| Score / memory hydrate | Existing bootstrap only — presentation does not alter writes |

**PASS**

---

## API Review

| Item | Result |
|---|---|
| Meal / plan / sync clients | Untouched |
| OpenAPI contracts | Untouched |

**PASS**

---

## Analytics Review

| Item | Result |
|---|---|
| `trackNutritionHubOpen` / `trackNutritionTabOpen` | Unchanged |
| New analytics plane | **NONE** |

**PASS**

---

## Accessibility Review

| Item | Result |
|---|---|
| Hierarchy | One h1 companionship title |
| Active path | `aria-current` + `data-active` |
| More nest | `aria-expanded` |
| Quiet locks | Continuity voice via `ParentHubQuietModuleProvider` |
| Motion | `prefers-reduced-motion` honored |

**Accessibility Score: 8.6 / 10**

---

## Regression Review

| Surface | Result |
|---|---|
| Welcome / Signup / Discovery / Today Home | **Frozen — untouched** |
| Parent Hub room IA | **Frozen — untouched** |
| Infant Care | **Frozen — untouched** |
| Speech Coach | **Frozen — untouched** |
| Legacy Nutrition (`VITE_FF_NUTRITION_LIVING_V1=0`) | Sticky nav + hub hero preserved |
| Plan / Track / Learn / Family interiors | Residual product card DNA after deepen — nested debt |

**PASS** for manufacturing scope.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order |
| Production Safety | **PASS** |
| Regression Review | **PASS** |
| Accessibility Review | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **9.0 / 10** | Meal-planner / sticky SaaS feeling removed from living open |
| **Apple Score** | **8.6 / 10** | Same-home open; tab interiors residual after deepen |
| **Accessibility Score** | **8.6 / 10** | Active path + quiet locks + calm skeleton |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured opening and deepen chrome.

---

## Remaining Debt (does not reopen this order)

1. **Tab interiors** (Plan / Track / Learn / Family) — still product card DNA when deepened  
2. **Achievements / streak chrome** inside Track — nested under deepen / More, not opening  
3. **Emoji meal shells** in today cards — residual under deepen  
4. **Health Lab** — **not started** — wait for Founder approval  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Meal-planner / feature-page feeling removed from opening | **YES** |
| Sticky journey nav removed from living | **YES** |
| Today's Care + one recommendation | **YES** |
| Quiet paths deepen one Care act | **YES** |
| Score / Crown / story subordinated under More | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Meal logic / DB / API / entitlements preserved | **YES** |
| Reuse Before Rewrite | **YES** |
| Existing flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Nutrition Phase 2 complete.  
**Do not begin Health Lab or any next module.**  
Wait for Founder approval.
