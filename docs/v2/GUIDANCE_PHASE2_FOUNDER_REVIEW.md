# Guidance Phase 2 — Founder Review

**Status:** MANUFACTURED — ONE CALM GUIDANCE STREAM  
**Date:** 2026-08-08  
**Authority:** Founder Order — Guidance Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** `c6d88a01` (`c6d88a01179e6e38c4ba25fd2d3269e44e15ac49`)  

**STOP after this module.** Wait for Founder approval.

**Frozen:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub room IA · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · Birth Sky · **Ask Amy**

---

## Mission result

Guidance is no longer a nested tip / article **content catalogue** or blog shelf inside Understand.

It opens as **Today's Guidance** — one calm stream: companionship voice → sacred first sentence → quiet continue paths (For today · New parent · Amy Suggests · Read a little more) → **one lane deepens at a time**.

Daily Tips · Articles · Amy Suggests · New Parent Tips feel like **one continuous guidance stream**, never peer blog tiles and never four content shelves under the open.

Tip pick engines, article corpus, SubItemGate accounting, Hub entitlements, and Infant Care Amy Suggests engines remain reused.

---

## Emotional target

| Forbidden feeling | Required feeling |
|---|---|
| Content catalogue | One calm guidance stream |
| Blog / tip mall | First insight sacred |
| Nested 3-tile expand | Continuous understanding |
| Four shelves under open | Quiet path → one deepen |

---

## Previous vs New

| | Previous | New (this manufacture) |
|---|---|---|
| Opening | Guidance → nested Daily Tips · New Parent · Articles rows | **Today's Guidance** FE hero → I'm here with you → sacred sentence |
| Hierarchy | Peer catalogue / all lane bodies under open | Quiet paths; **deepen one lane only** |
| Photography | Room ambient only | Understand FE `shot-05-reflection` |
| Materials | Glass hub tiles + tip-card mall | Sanctuary stream surface + quiet paths |
| Daily Tips | “Today's Parenting Cards” emoji grid | `presentation="stream"` after deepen |
| Amy Suggests | Only inside Infant Care / always mounted | Quiet stream path; deepen mounts sentence |
| Articles | Compact shelf under open | Deepen only — never blog catalogue first |
| Premium | Try Free on tip/article shelves | Hidden in Pack 5; continuity + `PREMIUM_VOICE` |
| Nested catalogue | `hub-dest-nested-guidance` | **Skipped** when living ON |
| Rollback | — | `VITE_FF_GUIDANCE_LIVING_V1=0` → legacy nested catalogue |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living stream preview | `/opt/cursor/artifacts/guidance-phase2-living.png` |

<img alt="Guidance Phase 2 living stream" src="/opt/cursor/artifacts/guidance-phase2-living.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/guidance/living-room.ts` | Stream lanes + sacred/Amy picks + lane guard (flag reused) |
| `lib/guidance/living-room.test.ts` | Unit tests — no blog/catalogue language |
| `components/guidance/guidance-living-room.css` | Sanctuary + quiet path + deepen materials |
| `components/guidance/guidance-living-stream.tsx` | Companionship open; sacred sentence; path deepen |
| Photo | `ROOM_HEROES.understand` → `/experience/r1/shot-05-reflection.png` |

**Untouched / frozen:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · Ask Amy · tip hash / localStorage pick · `/api/ai/rewrite-tip` · articles corpus / age filter · SubItemGate accounting · Infant Care Amy Suggests engines · RevenueCat / `hub_tips` / `hub_articles` entitlements · Firebase · Auth · routing tables · deep-link destination ids · feature-flag **definitions** (existing `VITE_FF_GUIDANCE_LIVING_V1` reused).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Understand quiet path; Hub slot; Pack 5 quiet |
| Opening O1–O5 | **PASS** — companionship + sacred sentence; no catalogue first |
| Hero H1–H4 | **PASS** — FE reflection photography |
| Typography T1–T5 | **PASS** — sanctuary rhythm; no UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; tip mall chrome removed from open |
| Navigation N1–N6 | **PASS** — room exit + Home exit; deep links map to stream |
| Premium P1–P5 | **PASS** — entitlements unchanged; continuity voice |
| Loading L1–L4 | **PASS** — calm lane fallback copy |
| Empty X1–X3 | **PASS** — existing tip/article empties retained |
| Error R1–R4 | **PASS** — no unlock-to-fix framing added |
| Success S1–S3 | **PASS** — no confetti / XP on open |
| Completion C1–C4 | **PASS** — Exit panel after Guidance open |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** |
| Same light | **YES** |
| Same material system | **YES** (stream) |
| Same emotional voice | **YES** |
| Same calm | **YES** |
| Same photography language | **YES** |
| No product marketing | **YES** (living stream) |
| No SaaS / catalogue / blog energy | **YES** (living open) |
| Blind recognition without logo | **YES** |
| Opening does not feel like another app | **YES** |

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Tip / article engines | **Untouched** (presentation variants only) |
| Firebase | Unchanged |
| Auth | Unchanged |
| RevenueCat / entitlements / quotas | **Zero** changes (`hub_tips`, `hub_articles` preserved) |
| Routing | Unchanged — Guidance remains Hub merge destination |
| Deep links | `guidance` / `daily-tips` / `new-parent-tips` / `articles` → living stream when ON |
| Feature flags | Existing `VITE_FF_GUIDANCE_LIVING_V1` reused (default ON) — **not redefined** |
| Analytics | No rewrite |
| Accessibility | Quiet paths with `aria-current`; sacred sentence button; lane `data-section-id` on deepen |

### Rollback

1. `VITE_FF_GUIDANCE_LIVING_V1=0` → nested Guidance catalogue  
2. Git revert of this manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## DB Review

**PASS** — zero schema / migration changes.

---

## API Review

**PASS** — tip rewrite / article clients untouched.

---

## Analytics Review

**PASS** — no analytics rewrite.

---

## Accessibility Review

| Item | Result |
|---|---|
| Hierarchy | One h1 companionship title + sacred sentence |
| Quiet paths | Buttons with `aria-current` |
| Deepen | One lane body; status fallback while lazy-loading |

**Accessibility Score: 8.6 / 10**

---

## Regression Review

| Surface | Result |
|---|---|
| Frozen surfaces listed above | **Untouched** |
| Ask Amy | **Frozen — untouched** |
| Legacy Guidance nest (`VITE_FF_GUIDANCE_LIVING_V1=0`) | Preserved |
| Tip / article engines | Reused |

**PASS** for manufacturing scope.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`, hub room shell) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (one calm stream; no blog/catalogue) |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **9.0 / 10** | Four sources merged; catalogue/blog dump removed from open |
| **Apple Score** | **8.5 / 10** | Same-home stream; article/tip interiors residual after deepen |
| **Accessibility Score** | **8.6 / 10** | Quiet paths + sacred deepen |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured Guidance stream.

---

## Remaining Debt (does not reopen this order)

1. **Articles compact interior** — still has some shelf chrome inside the deepened lane  
2. **New Parent Tips Ask Amy CTA** — soft button retained (Ask Amy frozen; do not redesign)  
3. **Infant Amy Suggests full panel** — remains in Infant Care; Guidance lane is presentation reuse  
4. **Next modules** — not started — wait for Founder approval  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Content catalogue / blog feeling removed | **YES** |
| One calm guidance stream | **YES** |
| Daily Tips · Articles · Amy Suggests · New Parent Tips merged | **YES** |
| Sacred first sentence | **YES** |
| One-lane deepen (not four shelves under open) | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Tip / article engines preserved | **YES** |
| Existing flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Guidance Phase 2 complete.  
**Do not begin the next module.**  
Wait for Founder approval.
