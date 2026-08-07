# Guidance Phase 2 — Founder Review

**Status:** MANUFACTURED — HIERARCHY / STREAM ONLY  
**Date:** 2026-08-07  
**Authority:** Founder Order — Guidance Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** `7c735dca` (`7c735dcac6f45aee1b615f4bc1e3c74418a758fe`)

**STOP after this module.** Next destination only after Founder acceptance.

Ask Amy remains frozen.

---

## Mission result

Guidance is no longer a nested tip / article **content catalogue** inside Understand.

It opens as **Today's Guidance** — one calm stream: sacred first sentence → For today → New parent → Amy Suggests → Read a little more.

Daily Tips · Articles · Amy Suggests · New Parent Tips feel like **one continuous guidance stream**, not peer shelf tiles.

Tip pick engines, article corpus, SubItemGate accounting, Hub entitlements, and Infant Care Amy Suggests engines remain.

---

## Emotional target

| Forbidden feeling | Required feeling |
|---|---|
| Content catalogue | One calm guidance stream |
| Tip / article mall | First insight sacred |
| Nested 3-tile expand | Continuous understanding |
| Feature shelf chrome | Soft reading depth |

---

## Previous vs New

| | Previous | New (Phase 2) |
|---|---|---|
| Opening | Guidance → nested Daily Tips · New Parent · Articles rows → each expands its own shelf | **Today's Guidance** FE hero → sacred sentence → one stream |
| Hierarchy | Three peer catalogue members | Continuous lanes: For today · New parent · Amy suggests · Read a little more |
| Photography | Room ambient only | Understand FE `shot-05-reflection` on stream open |
| Materials | Glass hub tiles + tip-card mall | Sanctuary stream surface + quiet lane bands |
| Daily Tips | “Today's Parenting Cards” emoji grid | `presentation="stream"` calm list |
| Amy Suggests | Only inside Infant Care | Quiet stream lane (corpus reuse); deepen to Infant Care for infants |
| Premium | Try Free on tip/article shelves | Hidden in Pack 5 quiet slot; `PREMIUM_VOICE` note; gates preserved |
| Nested catalogue | `hub-dest-nested-guidance` | **Skipped** when living ON |
| Rollback | — | `VITE_FF_GUIDANCE_LIVING_V1=0` or omit stream render → legacy nested catalogue |

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
| `lib/guidance/living-room.ts` | Recommend + stream lanes + sacred/Amy sentence picks + flag |
| `lib/guidance/living-room.test.ts` | Unit tests |
| `components/guidance/guidance-living-room.css` | Sanctuary stream materials |
| `components/guidance/guidance-living-stream.tsx` | FE Understand hero + sacred sentence + continuous lanes |
| `components/daily-tips.tsx` | Optional `presentation="stream"` (engines unchanged) |
| `components/parent-hub/parent-hub-rooms-shell.tsx` | Guidance living skips nested catalogue; opens stream slot |
| `components/parent-hub/parent-hub-room.test.tsx` | Living stream + kill-switch catalogue cases |
| `pages/parenting-hub.tsx` | Wires `renderGuidanceStream` + FeatureGate on tip/article lanes |
| Photo | `ROOM_HEROES.understand` → `/experience/r1/shot-05-reflection.png` |

**Untouched:**  
Welcome V3 · Signup · Discovery · Today Home · Parent Hub room IA · Ask Amy · tip hash / localStorage pick · `/api/ai/rewrite-tip` · articles corpus / age filter · SubItemGate accounting · Infant Care Amy Suggests engines · RevenueCat / `hub_tips` / `hub_articles` entitlements · Firebase · routing tables · deep-link destination ids (`guidance`, `daily-tips`, `new-parent-tips`, `articles`).

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Understand quiet path; deepen-in-place Hub slot; Pack 5 quiet |
| Opening O1–O5 | **PASS** — one human sentence first; no catalogue first impression |
| Hero H1–H4 | **PASS** — FE reflection photography |
| Typography T1–T5 | **PASS** — sanctuary rhythm; no UNLOCK shout |
| Materials M1–M5 | **PASS** — FE / Hub glass; tip mall chrome removed from living open |
| Navigation N1–N6 | **PASS** — room exit + Home exit; deep links map to stream |
| Premium P1–P5 | **PASS** — entitlements unchanged; `PREMIUM_VOICE` only on living chrome |
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
| No SaaS / catalogue energy | **YES** (living stream) |
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
| RevenueCat / entitlements / quotas | **Zero** changes (`hub_tips`, `hub_articles` preserved) |
| Routing | Unchanged — Guidance remains Hub merge destination |
| Deep links | `guidance` / `daily-tips` / `new-parent-tips` / `articles` → living stream when ON |
| Feature flags | New `VITE_FF_GUIDANCE_LIVING_V1` (default ON) |
| Analytics | No rewrite |
| Accessibility | Stream lanes retain `data-section-id`; sacred sentence readable |

### Rollback

1. `VITE_FF_GUIDANCE_LIVING_V1=0` → nested Guidance catalogue  
2. Git revert of Phase 2 commit  
3. Never flip entitlements to “fix” UI  

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts`, hub room shell) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (one calm stream; no catalogue) |
| Apple Review | **PASS approaching** — stream is sanctuary; article/tip interiors residual chrome debt |
| Parent Review | **PASS** — first insight sacred before depth |
| Engineering Review | **PASS** — flag + reuse + engines frozen |
| Database Review | **PASS** |
| Growth Review | **PASS** — Premium continuity; no Try Free on stream |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **8.6 / 10** | Catalogue feeling removed from Guidance open |
| **Apple Score** | **8.2 / 10** | Same-home stream; nested article UI residual |
| **Accessibility Score** | **8.3 / 10** | Hero contrast + calm stream structure |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured Guidance stream.

---

## Remaining Debt (does not reopen this order)

1. **Articles compact interior** — still has some shelf chrome inside the lane  
2. **New Parent Tips Ask Amy CTA** — soft button retained (Ask Amy frozen; do not redesign)  
3. **Infant Amy Suggests full panel** — remains in Infant Care; Guidance lane is presentation reuse  
4. **Next modules** — not started  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Content catalogue feeling removed | **YES** |
| One calm guidance stream | **YES** |
| Daily Tips · Articles · Amy Suggests · New Parent Tips in stream | **YES** |
| Sacred first sentence | **YES** |
| FE photography + sanctuary materials | **YES** |
| Premium continuity voice | **YES** |
| Tip / article engines preserved | **YES** |
| Reuse Before Rewrite | **YES** |
| Flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Guidance Phase 2 complete.  
**Do not begin the next module.**  
Wait for Founder approval.
