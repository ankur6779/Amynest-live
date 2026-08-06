# P0.5 Completion Report — Alive Through Light

**Sprint:** Production Recovery · P0.5  
**Status:** COMPLETE — **STOP** (do not start P0.6)  
**Authority:** Design Constitution §5 · Founder Philosophy (illuminated, not colored)  
**Constraint honored:** Lighting only — no typography · spacing · navigation · surfaces · hierarchy · components · features · Brain · motion redesign  
**Regression:** [`P0_5_BEFORE_AFTER.md`](./P0_5_BEFORE_AFTER.md)

---

## Objective

Make AmyNest feel alive through **light**, not animation.  
Only three lighting presets: **Morning · Evening · Night**.

---

## Files touched

### Craft (light model)
| File | Change |
|------|--------|
| `craft/v2-lighting.css` | **New** — preset CSS variables · field · bloom escape · orb emit · sheet catch · hero · focus |
| `craft/lighting.ts` | **New** — resolve/install/session · `v2LitProps` · light class tokens |
| `craft/lighting.test.ts` | Preset resolve · emit classes · **production drift check** |
| `craft/constitution.ts` | `V2_GLOW` / `V2_ORB` → light-escape / ambient emit (no neon ring) |
| `craft/interaction.ts` | Primary Bloom light · focus from preset |
| `craft/interaction.test.ts` | Focus/bloom light assertions |
| `craft/constitution.test.ts` | P0.5 glow/preset contract |
| `craft/index.ts` | Export lighting API |

### Surfaces (lighting wire only)
| File | Change |
|------|--------|
| `today/TodayPage.tsx` | `v2LitProps` · hero light |
| `front-door/FrontDoorPage.tsx` | Lit atmosphere · hero · orb Soft Plate + emit |
| `ask-amy/AskAmyPage.tsx` | `v2LitProps` |
| `for-child/ForChildPage.tsx` | `v2LitProps` |
| `today/mission/MissionPlayPage.tsx` | `v2LitProps` |
| `today/mission/MissionSuccess.tsx` | Lit shell · orb Soft Plate + emit |
| `coach-discovery/CoachDiscoveryPage.tsx` | `v2LitProps` |
| `coach-discovery/CoachPrepareProgress.tsx` | `v2LitProps` |
| `premium/PremiumJourney.tsx` | `v2LitProps` · orb emit |
| `premium/AccountRequiredGate.tsx` | `v2LitProps` |
| `guest/GuestAccountRequiredSheet.tsx` | Install light · sheet catch illumination |

---

## Lighting inconsistencies removed

| Before | After |
|--------|-------|
| No lived Morning/Evening/Night | Hour → one session preset on `data-v2-light` |
| Neon Bloom `0 0 24px` even glow | Directional light-escape (y + soft falloff) |
| Orb `ring-8 ring-primary/5` halo | Soft ambient emit (`v2-orb-emit`) |
| Orb color washes `bg-primary/10` / `/15` | Soft Plate body + emit (light, not paint) |
| Kit focus `ring-primary/30` | Preset focus light (`v2-focus-light`) |
| Flat Atmosphere only | Nest field key + mist + depth wash |
| Sheet without catch light | Inset catch via `v2-sheet-light` (elevation untouched) |
| Multiple glow invents | One Bloom · one Orb · one Focus family |

---

## Bloom inconsistencies removed

| Before | After |
|--------|-------|
| Bloom as omnidirectional glow | Light escaping warm surface (downward soft falloff) |
| Fixed opacity / radius invent | Preset vars: intensity · blur · y · warmth RGB |
| Primary press without light story | `V2_PRESS_PRIMARY` includes `v2-bloom-light` |
| Morning/Evening/Night energy identical | Fresher / warm-medium / dimmer quieter |

---

## Remaining atmosphere debt

| Debt | Why deferred |
|------|----------------|
| Tempo overlays (Quiet / Celebration / Unhurried) | Constitution tempo — not a fourth lighting world; later polish |
| Continuous Nest photography / richer field | Marketing vs in-product; lighting wash is the product lock |
| Per-screen forced preset (e.g. sleep always Night) | Hour-based session is correct default; content routing not opened |
| Legacy non-V2 pages still unlit | Outside V2 shell |
| Device PNG dogfood of warmth perception | Founder dogfood |
| Today Law of three / hierarchy still open | Not lighting |

---

## Production drift check

| Locked system | Result |
|---------------|--------|
| Typography (`V2_TYPE` hero 36 / caption 13) | **Unchanged** |
| Spacing ladder (`V2_SPACE_PX` 8→64) | **Unchanged** |
| Navigation (`h-14` · icon 22 · Sheet Glass blur) | **Unchanged** |
| Surfaces (Soft Plate 8% · flat · no blur) | **Unchanged** |
| Components (no new UI kit) | **Unchanged** — light tokens/CSS only |
| Only lighting evolved | **Confirmed** (test: `lighting.test.ts` drift suite) |

---

## Regression

| Check | Result |
|-------|--------|
| Vitest focused lighting slice | **20 files · 88 tests passed** |
| Vitest `src/v2` | **55 files · 399 tests passed** |
| Before/after | [`P0_5_BEFORE_AFTER.md`](./P0_5_BEFORE_AFTER.md) |

---

## Updated production score

| Metric | Post-P0.4 | Post-P0.5 (est.) | Delta |
|--------|----------:|-----------------:|------:|
| Overall Design | ~82–85 | **86–89** | +4 |
| Consistency | ~88–91 | **90–92** | +2 |
| Calm / Warmth | — | **+6–8** | felt, not seen |
| Luxury | — | **+4–5** | believable key light |
| Production Readiness | ~74–77 | **78–81** | +4 |
| Apple-Level | ~66–70 | **72–76** | +6 |

**Rationale:** One light story per hour. Bloom and Orb stop competing as neon. Hierarchy can begin to be explained by light (hero wash) without color tricks. Remaining caps: Today Law of three, Ask Amy reduction, Premium silhouette.

**Verdict unchanged:** ❌ Not Ready (expected). Light is alive; composition hierarchy still open.

---

## Founder observations

| Philosophy | Observation |
|------------|-------------|
| People remember light before color | Field wash + Bloom escape replace primary paint on orbs |
| Illuminated, not colored | Presets shift key / mist / depth / bloom energy — not brand hues |
| Bloom ≠ glow | Directional escape with falloff; no even neon halo |
| Orb emits, never neon | Soft ambient influence; hard ring removed |
| Feel warmth without seeing it | Evening default; Night quieter; Morning higher key |
| No fourth mood | Only Morning · Evening · Night |

Light should explain hierarchy. Never saturation. Never effects carnival.

---

## Founder checklist (P0.5 slice)

- [x] Three lighting presets lived  
- [x] Bloom normalized (escape, not neon)  
- [x] Orb ambient emit (no halo)  
- [x] Atmosphere field illumination  
- [x] CTA Bloom light · focus light · sheet catch · hero wash  
- [x] Drift: type / space / nav / surfaces hold  
- [ ] Today Law of three / hierarchy  
- [ ] Tempo overlays on same presets  
- [ ] Full product (legacy) under Nest light  

---

## STOP

P0.5 complete.  
Do **not** begin P0.6 until Founder directs.
