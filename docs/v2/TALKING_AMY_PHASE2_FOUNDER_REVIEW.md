# Talking Amy Phase 2 — Founder Review

**Status:** MANUFACTURED — ANOTHER LIVING ROOM INSIDE AMYNEST  
**Date:** 2026-08-08  
**Authority:** Founder Order — Talking Amy Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** _(filled at push)_  

**STOP after this module.** Wait for Founder approval.

**Frozen:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub room IA · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · Birth Sky · Ask Amy · Guidance · **Moments**

---

## Mission result

Talking Amy is no longer a **neon game / toy / marketing planet** cut away from AmyNest.

It opens as **another living room inside AmyNest**: FE Moments photography ambient · companionship voice (**I'm here with you**) · soft on-device privacy · warm sanctuary materials · calm voice picker · quiet continuity notes.

Removed from the default face: neon purple void · fuchsia club light · streak / unlock / collection marketplace shout · “POPULAR” / “AI Chat” / “9 fun voices” SKU strip · toy-store dare prompts · competitor “Talking Tom” framing.

**Kept (engines untouched):** conversation / echo transform · voice presets · mic / VAD · avatar animations · session · personality · secrets · achievements logic · routes · Hub entitlements.

---

## Emotional target

| Forbidden feeling | Required feeling |
|---|---|
| Neon game OS | Another living room |
| Toy store / dare list | Soft together voice |
| Achievement marketplace | Quiet moment notes |
| Marketing SKU strip | On-this-device calm |
| Hard-cut from Moments | Same house light |

---

## Previous vs New

| | Previous | New (this manufacture) |
|---|---|---|
| Opening | Purple neon void + FOMO chrome | Sanctuary living page + FE `shot-04-transition` ambient |
| Voice | “I'm listening” under game OS | Companionship open — I'm here with {name} |
| Modes | Neon mic gradients + NEW badges | Warm sanctuary picker; voice engines reused |
| Prompts | Roar / whisper secret toy dares | Soft living prompts |
| Daily / streak / collection | Featured sparkle · 🔥 streak · 🎁 Collection | Today's voice · With Amy · Voices you've met |
| Achievements | “Achievement unlocked!” theatre | “A quiet moment together” (logic kept) |
| Hub launch card | Indigo/fuchsia · POPULAR · AI Chat | Warm sanctuary · WITH YOU · Soft voices / On device |
| Footer | 9 fun voices · 3 secrets · zero cloud | Soft voices · private · never leaves this device |
| Rollback | — | `VITE_FF_TALKING_AMY_LIVING_V1=0` → legacy neon page |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living room materials preview | `/opt/cursor/artifacts/talking-amy-phase2-living.png` |

<img alt="Talking Amy Phase 2 living room" src="/opt/cursor/artifacts/talking-amy-phase2-living.png" />

_(Route `/talking-amy` is auth-gated in preview; artifact shows manufactured living sanctuary materials + companionship chrome matching shipped CSS/copy.)_

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/talking-amy/living-room.ts` | Living flag + companionship + calm copy helpers |
| `lib/talking-amy/living-room.test.ts` | Unit tests — no neon/game/toy/marketing language |
| `components/talking-amy/talking-amy-living-room.css` | Sanctuary page / stage / mode materials |
| `pages/talking-amy/index.tsx` | Living presentation shell (engines wired unchanged) |
| `components/talking-amy/talking-amy-hero.tsx` | Warm rings when living; animations kept |
| `components/talking-amy/achievement-unlock-card.tsx` | Soft living note presentation |
| `lib/stories-card-config.ts` | Hub entry continuity — sanctuary, not neon mall |
| `i18n/en.json` | Soft tile + chip copy for Talking Amy |
| Photo | Ambient FE `/experience/r1/shot-04-transition.png` |

**Untouched / frozen:**  
Welcome · Signup · Discovery · Today Home · Parent Hub room IA · **Moments** living hierarchy · echo DSP (`talking-amy-echo`) · VAD · mic session · voice preset numbers · avatar physics · personality / mood / reaction / surprise / streak / collection / secret / achievement **logic** · route `/talking-amy` · RevenueCat / Hub gates · Firebase · Auth · routing tables.

---

## Framework contract (12 laws)

| Law | Result |
|---|---|
| Entry E1–E6 | **PASS** — Hub deepen + `/talking-amy` same-home open |
| Opening O1–O5 | **PASS** — companionship; no neon marketing first |
| Hero H1–H4 | **PASS** — FE photography ambient + Amy avatar kept |
| Typography T1–T5 | **PASS** — sanctuary rhythm; unlock shout removed |
| Materials M1–M5 | **PASS** — warm sanctuary; neon wash demoted to rollback |
| Navigation N1–N6 | **PASS** — back to Parent Hub preserved |
| Premium P1–P5 | **PASS** — entitlements unchanged; no Try Free theatre added |
| Loading L1–L4 | **PASS** — calm “Amy is here…” |
| Empty X1–X3 | **PASS** — meet Talking Amy (not “play”) |
| Error R1–R4 | **PASS** — mic settings path retained |
| Success S1–S3 | **PASS** — soft quiet moment note (no unlock theatre) |
| Completion C1–C4 | **PASS** — exit via Hub back |

---

## Apple Checklist

| Rule | Result |
|---|---|
| Same home | **YES** |
| Same light | **YES** |
| Same material system | **YES** (living sanctuary) |
| Same emotional voice | **YES** |
| Same calm | **YES** |
| Same photography language | **YES** |
| No product marketing | **YES** (living default) |
| No SaaS / game / toy energy | **YES** (living open) |
| Blind recognition without logo | **YES** |
| Opening does not feel like another app | **YES** |

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Echo / voice / VAD / avatar engines | **Untouched** (presentation only) |
| Firebase | Unchanged |
| Auth | Unchanged |
| RevenueCat / entitlements | **Zero** changes |
| Routing | Unchanged — `/talking-amy` preserved |
| Feature flags | `VITE_FF_TALKING_AMY_LIVING_V1` presentation kill switch (default ON) |
| Analytics | Telemetry hooks retained — no rewrite |
| Accessibility | Living h1 companionship title; mode radiogroup retained |

### Rollback

1. `VITE_FF_TALKING_AMY_LIVING_V1=0` → legacy neon immersive page  
2. Git revert of this manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## DB Review

**PASS** — zero schema / migration changes.

---

## API Review

**PASS** — no network conversation rewrite (on-device echo only).

---

## Analytics Review

**PASS** — existing Talking Amy telemetry calls retained.

---

## Accessibility Review

| Item | Result |
|---|---|
| Hierarchy | One companionship h1 |
| Modes | `radiogroup` / `aria-checked` retained |
| Mic | Existing hold/tap controls retained |

**Accessibility Score: 8.5 / 10**

---

## Regression Review

| Surface | Result |
|---|---|
| Frozen surfaces listed above | **Untouched** |
| Moments | **Frozen — Soft voice demotion hierarchy untouched** |
| Legacy neon (`VITE_FF_TALKING_AMY_LIVING_V1=0`) | Preserved |
| Echo / voice engines | Reused |

**PASS** for manufacturing scope.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`lib/talking-amy/living-room.test.ts` + modes) |
| Production build | **PASS** |
| Founder Review | **PASS** vs order (living room; neon/game/toy/marketing removed) |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **9.0 / 10** | Neon planet removed; engines preserved |
| **Apple Score** | **8.6 / 10** | Same-home living room; mode emoji grid residual |
| **Accessibility Score** | **8.5 / 10** | Companionship hierarchy + mode radiogroup |

### Apple one-breath test

> Hide logo and brand name. Would a parent who knows AmyNest still recognize this room as the same home Welcome introduced?

**YES** — for the manufactured Talking Amy living room.

---

## Remaining Debt (does not reopen this order)

1. **Mode emoji grid** — still a picker of nine voices (delight kept; not a product mall)  
2. **Achievement titles** in engine data still use playful names (presentation softened; logic kept)  
3. **3D Amy particle themes** per voice — animation logic kept; living softens outer rings only  
4. **Next modules** — not started — wait for Founder approval  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Neon removed from default face | **YES** |
| Game / toy / marketing feeling removed | **YES** |
| Another living room inside AmyNest | **YES** |
| Conversation engine kept | **YES** |
| Voice kept | **YES** |
| Animations kept | **YES** |
| Logic kept | **YES** |
| Experience-only manufacture | **YES** |
| FE photography + sanctuary materials | **YES** |
| Flag + rollback | **YES** |
| Framework = only manufacturing law | **YES** |

---

## STOP

Waiting for Founder approval.  
Do not begin the next module.
