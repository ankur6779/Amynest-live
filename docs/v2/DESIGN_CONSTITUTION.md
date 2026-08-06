# AmyNest Design Constitution

**Status:** LOCKED — permanent production design language  
**Identity:** Nest Presence *(approved)*  
**Mode:** Unification only — **no new screens · no new concepts · no implementation · no code**  
**Supersedes for craft:** ad-hoc sizes, per-screen materials, and local component invention  
**Companion soul doc:** [`VISUAL_CONSTITUTION.md`](./VISUAL_CONSTITUTION.md) *(emotional DNA — this file freezes the system)*

---

## Preamble

Direction is approved. Individual beautiful screens are frozen.

From this document forward, AmyNest is one product designed by one team.

Every control, every sheet, every glow, every type size must come from this Constitution.  
Local invention that contradicts it is a defect — not “creative variation.”

> **Law of three (unchanged)**  
> One emotional hero · one obvious action · one supporting object.  
> Nothing else competes.

> **Materials (unchanged — four only)**  
> Atmosphere · Soft Plate · Sheet Glass · Bloom.

---

## 0. Inheritance & freeze rule

| Rule | Constitution |
|------|----------------|
| Source of truth | This document + Visual Constitution soul |
| New screens | Must reuse locked systems only |
| New materials | Forbidden without Founder amendment |
| New button styles | Forbidden |
| New card styles | Forbidden |
| New nav patterns | Forbidden |
| New lighting presets | Forbidden beyond Morning · Evening · Night |
| Background invention | Forbidden — continuous home only |
| Implementation | Tokens and components must map 1:1 to these locks |

**Before any future UI ships:**

1. Which type scale? (hero / body / caption / CTA — only)  
2. Which button family member? (primary / secondary / tertiary — only)  
3. Which surface? (atmosphere / soft plate / sheet glass / elevated plate — only)  
4. Which lighting preset? (morning / evening / night — only)  
5. Does anything invent a fifth material, second nav, or peer CTA?

If unclear → not AmyNest yet.

---

## 1. Typography — locked scales

One family. Four roles. No random sizes.

| Role | Token | Optical size (phone) | Weight | Leading | Tracking | Use |
|------|-------|----------------------|--------|---------|----------|-----|
| **Hero** | `type.hero` | **34–40** (one step only per surface; prefer 36) | Light–Regular | 1.12–1.18 | −0.02em | One emotional line. Never two heroes. |
| **Body** | `type.body` | **17** | Regular | 1.50–1.60 | 0 | Primary reading. Fatigue-proof. |
| **Caption** | `type.caption` | **13** | Regular | 1.40 | +0.01em | Whispers, meta, timestamps, child name. Never equals hero. |
| **CTA** | `type.cta` | **16** | Medium | 1.20 | 0 | On bloom / secondary / tertiary only. |

### Type laws

- Exactly **one** hero instance above the fold.  
- Labels use **caption**, never body bold as a fake hierarchy.  
- No badge typography clusters. No small-caps spam (max one whisper label per screen if needed).  
- Numerals for duration (“3 min”) use caption or soft instrument — never scoreboard display.  
- Logo / wordmark: **caption-adjacent or smaller** — never competes with hero.  
- Line length: hero ≤ ~18 chars preferred; body ~28–40 chars on phone.  
- Optical alignment: left edge of hero, body, and bloom share one quiet column — not centered chaos unless Landing ritual requires centered presence.

### Spacing rhythm (type + layout share one ladder)

Base unit: **8**.

| Token | Value | Use |
|-------|------:|-----|
| `space.1` | 8 | Tight internal gaps only |
| `space.2` | 16 | Related elements |
| `space.3` | 24 | Edge air (default screen inset) |
| `space.4` | 32 | Hero → action pause |
| `space.5` | 40 | Chapter separation (minimum) |
| `space.6` | 48 | Chapter separation (preferred) |
| `space.7` | 56 | Major breath / quiet moments |
| `space.8` | 64 | Ritual landings only |

**Law:** Prefer doubling air over densifying. If densifying “fits more features,” refuse.

---

## 2. Buttons — one family

Exactly three styles. Same silhouette. Same physics.

### Shared anatomy (all buttons)

| Property | Lock |
|----------|------|
| Height | **52** (primary & secondary) · tertiary is text-height, not a short peer pill |
| Horizontal padding | **24** |
| Radius | **26** (pill of the same family — one radius forever) |
| Min width | Comfortable; never skinny icon-only for primary |
| Icon | Optional; **20** optical; same stroke as nav icons |
| Press | Scale **0.97** · opacity hold · immediate (see Motion) |
| Shadow | One soft bloom shadow only — never stacked multi-shadow |
| Glow | One soft bloom halo on primary only; secondary/tertiary: none |

### Styles

| Style | Material | Fill | Text | When |
|-------|----------|------|------|------|
| **Primary** | Bloom | Warm nest bloom fill | Ink on bloom (high legibility) | The one obvious action |
| **Secondary** | Soft Plate | Soft plate fill, no hard border | Ink | Rare alternate of unequal weight — never peers primary |
| **Tertiary** | Atmosphere | None | Mist ink · medium | “Not right now,” dismiss, breath exits |

### Button laws

- Never two primaries in one viewport.  
- Never a bordered outline “ghost” as a fourth style — secondary is the only soft peer.  
- Destructive rarity: still uses primary silhouette with restrained warm-warning bloom — no red SaaS alerts for normal parenting.  
- Loading: same size, calm pulse of opacity — never spinner carnival.  
- Disabled: same shape, 40% opacity — never grey flat system button from another kit.

---

## 3. Cards / surfaces — three styles only

Cards must disappear into atmosphere. No additional designs.

| Style | Material | Opacity / edge | Depth | Use |
|-------|----------|----------------|------|-----|
| **Soft Plate** | Soft Plate | 6–10% light over atmosphere · **no hard border** · optional 1px luminous inner rim ≤8% | Flat settle — almost no shadow | Mission, Coach summary, form fields group, one support object |
| **Sheet Glass** | Sheet Glass | Blur **20–24** · fill 8–12% · thin luminous edge | Rises as sheet, not modal cliff | Account sheet, Premium continuity, soft-save |
| **Elevated Plate** | Soft Plate + one step | Soft Plate + **single** soft shadow (y: 8 · blur: 24 · α ≤ 12%) | One elevation only — never stacked cards climbing | Rare: dialog resting above sheet, or one hero object needing lift |

### Surface laws

- Atmosphere is the default — most content floats with **no** plate.  
- One supporting plate above the fold.  
- Borders: reduced to luminous rim or none. Hard `1px solid` kit borders are forbidden.  
- Opacity: prefer quieter (lower) over milky SaaS cards.  
- Never invent “outlined card,” “stat tile,” “feature grid cell,” or “colored accent bar card.”

---

## 4. Navigation — one system

One bottom navigation for the product shell. No screen invents its own.

| Property | Lock |
|----------|------|
| Placement | Bottom · full-width whisper strip |
| Material | Sheet Glass (same blur family as sheets: **20–24**) |
| Height | **56** content + safe-area |
| Items | Product-defined tabs only — **same count everywhere** that uses shell nav |
| Icon size | **22** optical · one stroke weight |
| Label | Caption scale · active: medium weight · inactive: regular mist |
| Active state | Soft fill plate behind item (**no** underline · **no** bright pill · **no** color bar) |
| Inactive | Mist · no glow |
| Spacing | Equal distribution · icon→label `space.1` |
| Top chrome | No competing logo strip; back only when needed |

### Nav laws

- No per-screen custom tab bars.  
- No 5-item SaaS bars invented for density.  
- Active never uses Bloom glow (Bloom is for action, not chrome).  
- Hide nav only for intentional ritual (Landing / full-sheet) — when hidden, no substitute chrome invents itself.

---

## 5. Lighting — three presets only

Every screen uses exactly one.

| Preset | Emotional job | Atmosphere | Bloom | Key light |
|--------|---------------|------------|-------|-----------|
| **Morning** | Clear start · soft courage | Mist lift · cooler daylight in nest field · faint dawn breath at horizon | Fresher · slightly brighter | Soft high key from above |
| **Evening** | Held transition · wind-down | Nest dusk · warm mid depth · quiet apricot hush | Warm · medium | Side-warm key · single source |
| **Night** | Regulate · protect sleep | Nest night · plum-ink depth · lunar rim | Warmer · dimmer · less contrast punch | Low luminance · cool edge rim |

### Lighting laws

- One believable source per screen.  
- No second accent light competing with Amy presence.  
- Celebration / quiet / weekend are **tempo & density overlays**, not new lighting presets:  
  - *Quiet* → same preset, more Ma, quieter chrome  
  - *Celebration* → same preset, one brief warm bloom pulse (≤1s), then rest  
  - *Unhurried* → same preset, slower motion, larger hero air  
- Forbidden: neon fog, rainbow aurora, multi-card spotlights, iridescent chrome.

---

## 6. Background system — one continuous home

Backgrounds are different **moments** in the same Nest world — not random locations.

| Allowed | Forbidden |
|---------|-----------|
| Nest field (continuous environmental plane) | Random furniture sets per screen |
| Soft radial room light | AI fantasy landscapes |
| Mist / dusk / night weather of the three presets | New “locations” (beach, forest, classroom, space) |
| Abstract nest cavity / soft horizon wash | Loud mesh, wallpaper patterns, dashboard textures |
| Empty Ma as beauty | Collage backgrounds, tiled promo scenes |

### Background laws

- Same world, different hour.  
- Marketing may use richer photography; **in-product** stays Nest field.  
- Never invent a new background to “make this screen special.” Specialness comes from hierarchy and air.

---

## 7. Component library — one language

Every component is a reuse of locked materials + type + motion. Never duplicates.

| Component | Must use |
|-----------|----------|
| **Button** | §2 Primary / Secondary / Tertiary only |
| **Input** | Soft Plate field · body type · caption label · luminous focus rim (Bloom at ≤30% opacity) · height 52 · radius 26 family (or 20 for multi-line sheet fields — one input radius lock: **20** for fields, **26** for buttons) |
| **Modal / Dialog** | Elevated Plate or Sheet Glass · one hero line · one primary · tertiary dismiss |
| **Sheet** | Sheet Glass · rise from bottom · same blur · one primary |
| **Chip** | Soft Plate pill · caption · no border · inactive mist / selected soft plate fill — **not** a second button system |
| **Badge** | Caption whisper only · no solid candy badges · avoid when possible |
| **Toast** | Soft Plate or Sheet Glass strip · body/caption · auto-dismiss calm · no alarm red for info |
| **Progress ring** | Hairline nest track · Bloom progress arc · no gamified trophies |
| **Orb (Amy)** | Presence mark only — idle / listen / guide / celebrate per Visual Constitution; never header toy |

### Component laws

- If a new control is needed, compose from existing materials — do not invent a kit.  
- Icons: one stroke family · optical 20–22 · no filled neon.  
- Dividers: hairline mist ≤8% or none — prefer air.

---

## 8. Motion — one breath

Everything breathes together.

| Token | Lock |
|-------|------|
| **Easing** | `cubic-bezier(0.22, 1, 0.36, 1)` — soft settle (one curve) |
| **Duration family** | Micro **120ms** · UI **220ms** · Page **320ms** · Ritual **480ms** — no others |
| **Spring** | One spring: stiffness soft · damping high · **no bounce overshoot** (or map to duration 220/320 settle) |
| **Fade language** | Opacity 0→1 with **6–8px** rise on enter; reverse on exit — never slide-from-side carnival for core pages |

### Motion classes

| Class | Behavior |
|-------|----------|
| Enter | Fade + slight rise · 220–320 |
| Press | 120 · scale 0.97 |
| Page | 320 · shared settle |
| Sheet | 320–480 · rise with fade |
| Celebration | ≤1000ms one warm bloom pulse · then quiet |
| Ambient | Ultra-slow atmosphere drift optional · **off under reduced motion** |

### Motion laws

- Prefer fewer moving things.  
- Reduced motion: lighting + layout remain; motion stops.  
- No confetti, streak flames, mascot loops, jelly bounce.

---

## 9. Color roles (locked spirit — not a dump)

| Role | Spirit | Use |
|------|--------|-----|
| **Ink** | Warm near-black | Primary text |
| **Mist** | Soft secondary | Caption, inactive, tertiary |
| **Nest night / dusk / mist-lift** | Atmosphere by lighting preset | Background field only |
| **Bloom** | Warm rose-clay / soft apricot | Primary action + rare presence glow |
| **Glow** | Restrained light | Amy orb / celebration pulse only |

Forbidden: purple-pink-cyan soup · success-green gamification · urgency red for normal steps · competing accents.

---

## 10. Brand mark

| Rule | Lock |
|------|------|
| Loudness | Quieter than hero — always |
| Placement | Edge whisper or absent |
| Competition | Never beside hero at equal weight |
| Rainbow / neon logo chrome | Forbidden in product shell |

---

## 11. Visual consistency audit (frames → canonical)

Audit of approved polish family vs this lock. Inconsistencies are **resolved to the lock** — not preserved as “options.”

| Dimension | Inconsistency observed across frames | Canonical replacement |
|-----------|--------------------------------------|------------------------|
| **Typography** | Hero sizes varied; some screens secondary lines too loud | One hero 36 · body 17 · caption 13 · CTA 16 |
| **Spacing** | Uneven chapter air; some SaaS packing | Ladder 8 → prefer 48 between chapters |
| **Glow** | Bloom glow strength varied; some chrome glowed | Glow on primary Bloom + Amy only |
| **Blur** | Sheet vs nav blur mismatched | Blur **20–24** for all Sheet Glass |
| **Glass** | Some plates read as heavy cards | Soft Plate 6–10% · no hard border |
| **Shadow** | Multi-depth cards in older concepts | Soft Plate flat · Elevated one shadow only |
| **Radius** | Mixed pill / card radii | Buttons **26** · plates large soft (**28**) · fields **20** |
| **Color** | Coral SaaS / purple relics in older paths | Nest Bloom + Nest atmosphere only |
| **Lighting** | Fantasy rooms / hardware phone mock / weekend as separate world | Morning · Evening · Night only · phone UI · continuous home |
| **Hierarchy** | Logo / tabs / dual CTAs competing | Law of three · quiet logo · one primary |
| **Navigation** | 5-item / underline / invent-per-screen | One whisper Sheet Glass nav · soft fill active |
| **Ask Amy** | Hardware phone frame vs in-app UI | In-app Nest Presence only |
| **Premium** | Pricing-table energy risk | Continuity letter + one Bloom · Soft Plate support |
| **Landing** | Cinematic OK; must still use same type/button/light locks | Same scales · same Bloom · one lighting preset |

**Resolution law:** When two approved frames disagree, the quieter, more unified choice wins.

---

## 12. Screen checklist (ship gate)

Every screen before ship:

- [ ] One lighting preset (Morning / Evening / Night)  
- [ ] One hero type · body/caption only elsewhere  
- [ ] One primary Bloom · secondary/tertiary only as unequal support  
- [ ] Surfaces from Soft Plate / Sheet Glass / Elevated only — or pure Atmosphere  
- [ ] Nav is the system nav (or intentionally hidden for ritual)  
- [ ] Background is Nest continuous home — not a new place  
- [ ] Motion uses the one easing + duration family  
- [ ] Logo quieter than headline  
- [ ] No fifth material · no duplicate component · no peer CTAs  

---

## 13. Amendment

This Design Constitution changes only by **Founder decree**.

Craft tokens, React components, and native shells are implementations of these locks.  
They do not redefine the language.

Soul and emotion remain in [`VISUAL_CONSTITUTION.md`](./VISUAL_CONSTITUTION.md).  
**System and craft locks live here.**

---

## Closing

AmyNest is Nest Presence — held, quiet, warm, inevitable.

One type ladder.  
One button family.  
Three surfaces.  
One nav.  
Three lights.  
One home.  
One breath.

Every future screen inherits this — or it is not AmyNest.

**STOP.** Design language frozen. No implementation. No new concepts. No new screens.
