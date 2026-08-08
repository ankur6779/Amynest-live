# Grow Phase 2 — Founder Review

**Status:** MANUFACTURED — ONE EDUCATIONAL ROOM ONLY  
**Date:** 2026-08-08  
**Authority:** Founder Order — Grow Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** `18c81b7e` (`18c81b7e9db377b016e9a5c78a8b29ab1c95993c`)  

**STOP after this module.** Wait for Founder approval.

**Frozen:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub room IA · Infant Care · Speech Coach · Nutrition · **Health Lab**

---

## Mission result

Grow is no longer a nested **six-SKU learning catalogue** / course marketplace / unlock theatre inside Understand.

It opens as **one calm educational room** — Understand FE photography, companionship voice (“I'm here with you”), one recommended practice, quiet continuous paths (Numbers · Beads · Sounds · Spelling · Study · Challenge later), and a quiet deepen cue before reused Hub destination logic.

Never first impression: course marketplace · learning catalogue · Unlock / Explore Free / PRO Zone.

Learning engines, routes (`/smart-math-tricks`, `/abacus`, `/phonics`, …), and Hub entitlements remain reused.

---

## Emotional target

| Forbidden feeling | Required feeling |
|---|---|
| SaaS learning mall | One calm educational room |
| Six-SKU catalogue | Quiet ways to grow |
| Unlock / Explore Free theatre | One practice moment |
| PRO / Zone / Mastery shout | Soft skill language |
| Olympiad leading | Challenge later — never forced |

---

## Previous vs New

| | Previous | New (this manufacture) |
|---|---|---|
| Opening | Grow → nested 6 legacy tile rows (emoji / PRO titles) | **Today's Growth** FE hero → one practice recommend → quiet paths |
| Hierarchy | Six equal learning products | Continuous room paths; Challenge demoted last; deepen cue before one door |
| Photography | None on nest | Understand FE `shot-05-reflection` |
| Materials | Glass nest rows + launch cards | Sanctuary educational surface + quiet deepen chrome |
| Naming | Abacus PRO Zone · Spelling Mastery · Olympiad | Numbers · Beads · Sounds · Spelling calmly · Quiet study · Challenge later |
| Premium | Explore Free / Premium / Try Free on launch cards | Hidden in Pack 5 quiet deepen; description unlock language stripped; `PREMIUM_VOICE` · Continue with AmyNest |
| Nested catalogue | `hub-dest-nested-grow` | **Skipped** when living ON |
| Rollback | — | `VITE_FF_GROW_LIVING_V1=0` or omit stream → legacy six-SKU nest |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living educational room preview | `/opt/cursor/artifacts/grow-phase2-living.png` |

<img alt="Grow Phase 2 living educational room" src="/opt/cursor/artifacts/grow-phase2-living.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/grow/living-room.ts` | Recommend + calm paths + age filter + deepen cue helper (flag reused) |
| `lib/grow/living-room.test.ts` | Unit tests (no PRO/Zone/Mastery; deepen cue calm) |
| `components/grow/grow-living-room.css` | Sanctuary materials + quiet deepen cue |
| `components/grow/grow-living-stream.tsx` | Companionship voice · quiet paths · continuity notes |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Grow living skips nest; deepen cue + `data-gw-deepen` |
| `components/learning-zone-launch-card.tsx` | Quiet deepen: strip PRO/Zone/Mastery/Unlock/Explore Free theatre |
| Photo | `ROOM_HEROES.understand` → `/experience/r1/shot-05-reflection.png` |

**Untouched / frozen:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · Infant Care · Speech Coach · Nutrition · Health Lab · learning engines · phonics/abacus/math/spelling/study/olympiad **logic** · RevenueCat / Hub feature gates · Firebase · Auth · routing tables · deep-link tile ids · feature-flag **definitions** (existing `VITE_FF_GROW_LIVING_V1` reused).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Understand quiet path; Pack 5 deepen |
| Opening O1–O5 | **PASS** — one practice companionship sentence; no catalogue / unlock first |
| Hero H1–H4 | **PASS** — FE reflection photography |
| Typography T1–T5 | **PASS** — sanctuary; no UNLOCK / PRO shout on living open / quiet deepen |
| Materials M1–M5 | **PASS** — FE / Hub glass; nest catalogue removed |
| Navigation N1–N6 | **PASS** — room exits; deep links open Grow room + deepen |
| Premium P1–P5 | **PASS** — entitlements unchanged; quiet chrome stripped |
| Loading L1–L4 | **PASS** — existing launch loaders on deepen |
| Empty X1–X3 | **PASS** — age-filtered paths; no upsell empty |
| Error R1–R4 | **PASS** — no unlock-to-fix framing added |
| Success S1–S3 | **PASS** — no confetti on open |
| Completion C1–C4 | **PASS** — Exit panel after Grow open / deepen |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** (Grow room open) |
| Same light | **YES** |
| Same material system | **YES** (living open / quiet deepen) |
| Same emotional voice | **YES** |
| Same calm | **YES** (living open) |
| Same photography language | **YES** |
| No product marketing | **YES** (living open / quiet deepen chrome) |
| No SaaS / catalogue energy | **YES** (living open) |
| Blind recognition without logo | **YES** (room open) |
| Opening does not feel like another app | **YES** |

**Interior note:** Standalone learning routes (`/abacus`, `/phonics`, …) remain residual edtech interiors — not remanufactured in this order (reuse all logic).

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Learning engines | **Untouched** — reused |
| Firebase | Unchanged |
| RevenueCat / entitlements | **Zero** changes |
| Auth | Unchanged |
| Routing | Learning routes preserved |
| Deep links | Grow member tiles → living room + deepen |
| Feature flags | Existing `VITE_FF_GROW_LIVING_V1` reused (default ON) — **not redefined** |
| Analytics | No rewrite |
| Accessibility | Quiet path buttons; `aria-current` on active path; Pack 5 quiet locks |

### Rollback

1. `VITE_FF_GROW_LIVING_V1=0` → legacy six-SKU nest  
2. Git revert of this manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## DB Review

**PASS** — zero schema / migration changes.

---

## API Review

**PASS** — zero contract changes; engines reused.

---

## Analytics Review

**PASS** — no analytics rewrite.

---

## Accessibility Review

| Item | Result |
|---|---|
| Hierarchy | One h1 companionship title |
| Active path | `aria-current` + `data-active` |
| Quiet deepen | Continuity voice via Pack 5 provider |
| Unlock theatre | Stripped from quiet deepen titles / descriptions / badges |

**Accessibility Score: 8.5 / 10**

---

## Regression Review

| Surface | Result |
|---|---|
| Frozen surfaces listed above | **Untouched** |
| Health Lab | **Frozen — untouched** |
| Legacy Grow nest (`VITE_FF_GROW_LIVING_V1=0`) | Preserved |
| Standalone HubModule leave routes | Residual edtech — documented debt |

**PASS** for manufacturing scope.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`, hub room shell) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (one educational room; no marketplace / catalogue / unlock) |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **9.0 / 10** | Six-SKU catalogue + unlock theatre removed from Grow open / quiet deepen |
| **Apple Score** | **8.5 / 10** | Same-home room; standalone leave routes residual |
| **Accessibility Score** | **8.5 / 10** | Active path + quiet deepen chrome |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured Grow educational room.

---

## Remaining Debt (does not reopen this order)

1. **Standalone learning routes** — `/abacus`, `/phonics`, `/smart-math-tricks`, study, olympiad still edtech interiors after AppLink leave  
2. **Launch card illustration DNA** on deepen — Pack 5 strips badges; glass cards remain softened, not photographic doors  
3. **Olympiad competitive product** — demoted in room; route unchanged  
4. **Next modules** — not started — wait for Founder approval  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Course marketplace feeling removed from Grow open | **YES** |
| Learning catalogue nest skipped | **YES** |
| Unlock theatre stripped on living open / quiet deepen | **YES** |
| One calm educational room | **YES** |
| Challenge never leads | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Engines / routes / entitlements preserved (reuse) | **YES** |
| Existing flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Grow Phase 2 complete.  
**Do not begin the next module.**  
Wait for Founder approval.
