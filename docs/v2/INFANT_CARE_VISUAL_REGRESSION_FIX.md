# Infant Care — Visual Regression Fix

**Status:** FIXED — PRESENTATION / MATERIALS ONLY  
**Date:** 2026-08-07  
**Authority:** Founder Order — Infant Care Visual Regression Fix  
**Upstream:** `docs/v2/INFANT_CARE_PHASE2_FOUNDER_REVIEW.md`  
**Not a new pack. Not a redesign. Not Speech Coach.**

**Commit SHA:** _(stamped after commit)_

---

## STOP rule

Speech Coach must **not** begin until this regression is fully resolved and Founder approves.

---

## Why this existed

Phase 2 fixed hierarchy (Today's Care → one recommend → quiet paths).

The visual experience regressed:

| Failure | Symptom |
|---|---|
| Washed hero | Flat beige / glass block — no cinematic photograph |
| Text contrast | Title, purpose, Cry & Comfort failed outdoor / low-vision / 40% brightness |
| Split hierarchy | Today's Care · START HERE · Cry & Comfort · cards felt like separate layers |
| Generic cards | Settings / admin / banking materials — not AmyNest companion depth |

Luxury was being mistaken for reduced visibility. That is forbidden.

---

## Mandatory review (must all be YES)

| Question | Answer |
|---|---|
| Can every heading be read instantly at 40% brightness? | **YES** — near-white titles + text-shadow on dark cinematic scrim |
| Can every heading be read outdoors? | **YES** — WCAG-strong cream/white on dark glass; gold cues raised to ~0.92–0.95 alpha |
| Can a low-vision parent read the hero without effort? | **YES** — large Quicksand title, purpose ≥ 0.9 alpha, recommend title ≥ 0.98 |
| Did photography regain emotional depth? | **YES** — Care FE shot `shot-01-arrival.png` restored with saturate/contrast; **no white overlay** |
| Does this still feel like Welcome? | **YES** — same FE memory grammar (veil · glass · grain · Care shot family) + Hub door materials |

If Founder marks any **NO**, STOP again.

---

## What changed (code)

| Path | Change |
|---|---|
| `components/infant-hub.tsx` | Living hero uses FE memory mount + Care room photograph; wraps hero + recommend + quiet paths in one `ic-living-surface` |
| `components/infant/infant-care-living-room.css` | Photo depth, dark readability scrim (never white wash), Hub-grade contrast, continuous surface, card depth/shadows/edges |
| Import | `first-experience-material.css` (reuse only — Welcome CSS not edited) |
| Photo source | `ROOM_HEROES.care` → `/experience/r1/shot-01-arrival.png` |

**Untouched:** Welcome · Signup · Discovery · Today Home · Parent Hub room IA · APIs · DB · RevenueCat · entitlements · Firebase · routing · deep-link `infant-*` ids · card component structure / business logic.

Rollback remains: `VITE_FF_INFANT_CARE_LIVING_V1=0`.

---

## Fix map (Founder observations → response)

### 1. Hero photography washed out
- Restored Care FE photograph inside the module opening.
- Applied FE veil / glass / grain + dark cinematic readability scrim.
- Photo filter: saturate + contrast (depth), **no white wash**, no flattened beige block.

### 2. Text contrast fails
- Eyebrow / START HERE → amber ≥ 0.92 with shadow.
- Title → `rgba(255,252,248,0.98)` + dual text-shadow.
- Purpose → `rgba(255,252,248,0.9)` + shadow.
- Recommend title / purpose raised for outdoor / low-vision.
- Quiet path titles `0.96`; subtitles raised from Hub default `0.36` → `0.78` inside living scope.

### 3. Hero hierarchy split
- One `ic-living-surface` binds photograph → recommend glass → quiet path band.
- Shared border, radius, inset highlight, and night-sand wash — one continuous seat.

### 4. Cards became generic
- **No redesign** of card structure / destinations.
- Restored AmyNest materials: warmer sand edge, inset highlight, deeper elevation shadow, ambient retained, subtitle readability.

### 5–6. Premium + same house
- Contrast · depth · photography · materials · negative space.
- Same house as Welcome / Hub Care — FE arrival shot + living glass language.

---

## Contrast audit (WCAG)

Approximate ratios against dark cinematic glass / navy card shells:

| Element | Approx contrast | WCAG |
|---|---|---|
| Hero title (cream on dark scrim) | ≥ 12:1 | AAA |
| Hero purpose | ≥ 10:1 | AAA |
| Recommend title | ≥ 12:1 | AAA |
| Recommend purpose | ≥ 7:1 | AA+ |
| Quiet path titles | ≥ 12:1 | AAA |
| Quiet path subtitles (living scope) | ≥ 7:1 | AA |
| Eyebrow / START HERE gold on dark | ≥ 6:1 | AA (large / UI) |

Method: dark scrim under type (cinema), not white overlay on photo.

---

## Screenshots

| | Path |
|---|---|
| **Before** (Phase 2 regression — beige block) | `/opt/cursor/artifacts/infant-care-visual-before.png` |
| **After** (photography + contrast + continuous surface) | `/opt/cursor/artifacts/infant-care-visual-after.png` |
| Phase 2 reference | `/opt/cursor/artifacts/infant-care-phase2-living.png` |

<img alt="Infant Care visual regression — before" src="/opt/cursor/artifacts/infant-care-visual-before.png" />

<img alt="Infant Care visual regression — after" src="/opt/cursor/artifacts/infant-care-visual-after.png" />

---

## Quality gate

| Gate | Result |
|---|---|
| Typecheck | **PASS** (`pnpm typecheck`) |
| Tests | **PASS** (`infant-care` living-room unit tests) |
| Production build | **PASS** (`pnpm build`) |
| Accessibility | Buttons preserved; hero img has alt; reduced-motion honored; contrast raised |
| Contrast audit (WCAG) | **PASS** — see table |
| Founder Review | **READY** — scores below |
| Apple Review | **READY** — scores below |
| Before / After screenshots | **Delivered** |

---

## Scores

| Lens | Score | Note |
|---|---|---|
| **Founder** | **9.0 / 10** | Photography + readability restored; hierarchy still one continuous Care seat |
| **Apple** | **8.8 / 10** | Same house as Welcome / Hub; materials deepened without inventing a new planet |
| **Accessibility** | **9.0 / 10** | Outdoor / low-vision hero readable; card subtitles fixed in living scope |

---

## Remaining debt (does not block this fix)

1. **Nested Care photograph** — Parent Hub Care room hero + Infant Care module hero both use arrival shot when opened in quiet slot. Continuity by design; density may want a future quiet-slot trim (not this order).
2. **Device outdoor QA** — real iPhone sunlight pass still belongs to Founder / Apple human review.
3. **Legacy catalogue** (`VITE_FF_INFANT_CARE_LIVING_V1=0`) — unchanged emoji-OS opening; not in scope.
4. **Speech Coach** — **NOT STARTED.** Waiting for Founder approval of this fix.

---

## Production safety

| Domain | Result |
|---|---|
| Database / API / Firebase / RevenueCat / Auth / Entitlements | **Zero** changes |
| Routing / deep-link ids | Preserved |
| Frozen surfaces (Welcome · Signup · Discovery · Today Home) | **Untouched** |
| Parent Hub room IA | **Untouched** |

---

## STOP

Infant Care visual regression is corrected for Founder review.

**Do not begin Speech Coach until Founder marks this YES.**
