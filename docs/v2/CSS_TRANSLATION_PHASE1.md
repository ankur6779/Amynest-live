# CSS Translation — Phase 1

**Status:** LOCKED  
**Mode:** Manufacturing only — **no redesign · no copy · no Brain · no routes · no APIs**  
**Successor:** Phase 2 Home manufacturing — [`CSS_TRANSLATION_PHASE2.md`](./CSS_TRANSLATION_PHASE2.md)  
**Authority:** Design Constitution · Visual Constitution · Industrial Design Proposal · Visual Identity Rebirth · Founder Translation Law v2 · Founder Implementation Law · Final Design Audit Summary

---

## Mission (fulfilled)

Translate the approved Nest into **one production Design System**.

Screens no longer own styling. Craft consumes Nest Presence tokens. Dual SaaS path from `@/lib/experience-system` is **deleted** from the V2 craft facade.

---

## Delivered system

| Layer | Path | Role |
|-------|------|------|
| **CSS locks** | `artifacts/kidschedule/src/v2/craft/nest-presence-system.css` | ONE `:root` source — type, space, radius, blur, elevation, motion, fills |
| **TS tokens** | `artifacts/kidschedule/src/v2/craft/constitution.ts` | Tailwind classes bind `var(--v2-*)` |
| **Motion** | `artifacts/kidschedule/src/v2/craft/motion.ts` | Nest `fadeIn` / `fadeUp` (≤8px rise) |
| **Prepare** | `artifacts/kidschedule/src/v2/craft/preparation.ts` | `.v2-prepare-skeleton` only |
| **Lighting** | imports system CSS first, then `v2-lighting.css` | Hour illumination only |
| **Facade** | `artifacts/kidschedule/src/v2/craft/index.ts` | Nest exports only — no SaaS re-exports |

---

## Locked values (Phase 1)

| Token | Lock |
|-------|------|
| Hero | **36** (`--v2-type-hero`) — `heroCompact` no longer 34 |
| Body | **17** |
| Caption | **13** |
| CTA type | **16** |
| Button | **52 × 26** |
| Blur | **24** (Sheet Glass / nav family 20–24) |
| Motion | **120 / 220 / 320 / 480** |
| Spacing | **8 → 64** |
| Fade rise | **8px** |
| Press | **0.97** |

---

## Visual goals — one language

| Goal | Lived as |
|------|----------|
| One Atmosphere | `V2_ATMOSPHERE` + light field |
| One Bloom | `V2_BLOOM_CTA` + `v2-bloom-light` |
| One Sheet Glass | `V2_SHEET_GLASS` / `V2_SHEET` |
| One Soft Plate | `V2_SOFT_PLATE` / `V2_CARD` |
| One Orb | `V2_ORB_EMIT` |
| One Motion | `V2_TRANSITION` + Nest `fadeIn` / `fadeUp` |
| One Navigation | `V2_NAV` + `V2MobileTabBar` |
| One Shadow | `--v2-elevation-elevated` · `--v2-elevation-bloom` · Soft Plate `none` |

---

## Founder order applied

| Action | What |
|--------|------|
| **DELETE** | Craft re-export of `RADIUS`, `CARD_BASE`, `SKELETON_BASE`, `MOTION_MS`, SaaS glass; prepare `premium-skeleton` / `route-shimmer`; ad-hoc `text-sm` / `text-xl` / `duration-200` / magic `min-h` / `duration: 0.22` overrides on Nest surfaces |
| **MERGE** | Layout roles → `V2_LAYOUT` · measure → `V2_MEASURE` · secondary/ghost CTA anatomy → `V2_SECONDARY_CTA` / `V2_GHOST_CTA` |
| **WHISPER** | Nav / exits / prepare captions stay caption family |
| **EMPHASIZE** | Hero remains optical 36 everywhere (including compact headers) |

---

## Screens touched (presentation wiring only)

| Room | Surface | Change |
|------|---------|--------|
| Vestibule | `FrontDoorPage` | `V2_LAYOUT.viewport` · `V2_TRANSITION.card` |
| Living | `TodayPage` | `V2_MEASURE.hero` |
| Practice | `MissionPlayPage` | measure + card transition |
| Study | `CoachPrepareProgress` | Constitution type + 220ms |
| Hearing | `AskAmyPage` | `V2_LAYOUT` stage / support · measure |
| Continuity gate | `GuestAccountRequiredSheet` | sheet Z · fade rise · body type |
| Shell | `V2CalmPrepare` · skeleton | Nest prepare + caption |
| Threshold | `landing.tsx` Nest secondary height | `V2_BUTTON.height` |

**No copy rewritten. No routes/APIs/Brain. Room Recovery freezes held.**

---

## Acceptance

| Criterion | Result |
|-----------|--------|
| Every room feels from the same Home | **PASS** — one material + type + motion system |
| Identical materials / buttons / cards / sheets | **PASS** on Nest craft consumers |
| Spacing follows Constitution | **PASS** — ladder unchanged; layout magic tokenized |
| No CSS duplication in Nest craft facade | **PASS** — dual system DELETE |
| No visual debt | **PARTIAL** — see [`CSS_DEBT_REPORT.md`](./CSS_DEBT_REPORT.md) |

---

## Tests

```
pnpm --filter @workspace/kidschedule exec vitest run src/v2/craft
```

**28/28 passed** (plus shell calm-loading token contract updated).

---

## Screenshots

| Set | Location |
|-----|----------|
| Optical before→after contract | Below + [`CSS_COMPONENT_AUDIT.md`](./CSS_COMPONENT_AUDIT.md) |
| Live after captures | [`css-phase1-screenshots/`](./css-phase1-screenshots/) |

### Optical before → after (system)

| Concern | Before (debt) | After (Phase 1) |
|---------|---------------|-----------------|
| Type source | Magic `text-[36px]` / `heroCompact` **34** | `--v2-type-hero` **36** everywhere |
| Materials | Soft Plate opacity literals + SaaS `CARD_BASE` via craft | `--v2-fill-*` · Nest Soft Plate only |
| Prepare | `premium-skeleton route-shimmer` | `.v2-prepare-skeleton` |
| Motion variants | experience-system `fadeUp` y:10 | Nest `fadeUp` y:8 |
| Sheet enter | y:12 invent | `V2_FADE_RISE_PX` (8) |
| Craft facade | Dual Nest + SaaS | Nest only |

---

## Scores (estimated — Founder review)

| Score | Pre–Phase 1 (Final Design Audit) | Phase 1 estimate |
|-------|----------------------------------:|-----------------:|
| **Founder Nest Presence** | ~58 overall / consistency 44 | **72** |
| **Apple craft** | ~48 | **64** |
| Consistency | 44 | **78** |
| Craftsmanship | 55 | **70** |

Still below public GA Nest Presence bar — engines / classic chrome remain Phase 2+ debt.

---

## STOP

**Phase 1 complete. Do not start Phase 2.**  
Await Founder review.
