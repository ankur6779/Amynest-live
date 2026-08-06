# P0.5 Before / After — Alive Through Light

**Sprint:** P0.5 Lighting only  
**Presets:** Morning · Evening · Night  
**Not changed:** typography · spacing · navigation · surfaces · hierarchy · components · Brain · motion language

---

## Violation → canonical

| Before | After | Instrument |
|--------|-------|------------|
| No `data-v2-light` | Session preset on document + shell | Atmosphere hour |
| Flat `bg-background` only | Soft key + mist + depth radials | Ambient field |
| Bloom `0 0 24px` neon | Directional y/blur escape vars | Bloom |
| Orb `ring-8 ring-primary/5` | `v2-orb-emit` soft ambient | Orb |
| Orb `bg-primary/10` / `/15` | Soft Plate + emit | Orb body |
| Focus `ring-primary/30` kit | `v2-focus-light` preset RGB/α | Focus |
| Sheet no catch | Inset catch `::after` | Sheet illumination |
| Hero unexplained | Soft top wash `v2-hero-light` | Hero lighting |
| Primary press without light | `v2-bloom-light` on press primary | CTA glow |

---

## Preset model

| Preset | Hours | Key | Bloom | Orb | Feel |
|--------|-------|-----|-------|-----|------|
| **Morning** | 05–11 | High · cooler mist | Fresher · brighter | Warm soft | Clear start |
| **Evening** | 12–18 | Side-warm · dusk | Warm · medium | Warm medium | Held transition |
| **Night** | 19–04 | Low · lunar | Dimmer · quieter | Cool lunar ambient | Regulate · silence |

One believable source family per screen. No fourth mood.

---

## Instrument map

| Instrument | Class / API | Job |
|------------|-------------|-----|
| Field | `v2-light-field` via `v2LitProps` | Nest home illumination |
| Bloom | `v2-bloom-light` | Light escaping CTA |
| Orb | `v2-orb-emit` / `V2_ORB.emit` | Ambient presence |
| Sheet | `v2-sheet-light` | Glass catch |
| Hero | `v2-hero-light` | Hierarchy by light |
| Focus | `v2-focus-light` | Calm rim ≤ preset α |
| Resolve | `resolveV2LightPreset` | Hour → preset |
| Install | `installV2Light` | CSS variable cascade |

---

## Screen lighting (visual)

| Surface | Field | Bloom | Orb | Notes |
|---------|-------|-------|-----|-------|
| Today | Lit shell | Mission CTA | — | Hero wash on greeting |
| Front Door | Lit atmosphere | Continue Bloom | Soft Plate + emit | Hero wash on breath |
| Ask Amy / For Child / Coach / Premium | Lit shell | Primary CTAs | Premium success emit | — |
| Mission Success | Lit shell | CTAs | Soft Plate + emit | — |
| Guest sheet | Document light | Save Bloom | — | Sheet catch inset |

---

## Production drift (locked)

| System | Snapshot held |
|--------|----------------|
| Type | hero 36 · caption 13 |
| Space | 8→64 ladder |
| Nav | h-14 · 22 icon · blur 24 · no shelf |
| Soft Plate | 8% fill · rim 6% · flat · no blur |
| Sheet Glass | blur 24 · elevated shadow (material) |

Only lighting CSS variables and emit classes evolved.

---

## Founder lens

| Before feel | After feel |
|-------------|------------|
| Colored accents pretending to be light | Warmth from a single hour of day |
| Neon orb / Bloom theater | Believable ambient influence |
| Flat kit field | Nest cavity with key + depth |
| Focus as system blue/primary | Focus as soft bloom of the hour |
