# AmyNest Visual Identity System

**Phase:** PRODUCT MANUFACTURING  
**Status:** BINDING MANUFACTURING BIBLE  
**Form:** Reusable visual operating system — not screens, not pages, not CSS, not implementation

---

## Authority

The following documents are LAW and are not renegotiated here:

- `PRODUCT_EXECUTION_MODEL.md`
- `EXPERIENCE_V3_STORYBOARD.md`
- `VISUAL_MANUFACTURING_V3.md`
- `EXPERIENCE_BOARDS_V3.md`
- `EXPERIENCE_MANUFACTURING_PLAN.md`
- `EXPERIENCE_CINEMATOGRAPHY.md`

This document does not invent new philosophy.  
This document manufactures the **permanent AmyNest Visual Identity System**.

Every future surface must look like it belongs to one premium operating system:

Landing · Discovery · Working · Today · Mission · Ask Amy · Coach · Memory · Premium · Settings

If a designer invents a new color, size, radius, shadow, or material outside this bible — the work is invalid.

---

## Locked Promise

AmyNest helps parents know  
their child’s  
**next right thing**  
**today.**

The identity system exists so that promise feels inevitable across the whole product.

---

## Identity North Star

**Photography + Living Materials.**

Photography carries the human.  
Living materials carry the room.  
Interface serves both.

Hierarchy of matter (from cinematography — unchanged):

1. The child / human moment  
2. Photographic presence  
3. Living materials (support only)  
4. Interface surfaces  
5. Chrome / controls  

Glass never outranks the child.

---

## Rejected Outside This System

| Rejected | Why |
|---|---|
| Candy pastels / kids primaries | Wrong emotional age |
| Startup purple spam | Generic SaaS, not AmyNest |
| Neon / galaxy / particle skies | Entertainment, not parental calm |
| Hard plastic gamification | Breaks trust |
| Random font sizes | Breaks operating-system feeling |
| One-off radii / shadows | Fractures identity |
| Stock-photo warmth | Fake intimacy |
| Mascot / childish illustration | Forbidden by cinematography |
| Glass as spectacle | Material must support, not perform |

---

# 1. Color Tokens

Colors are named by role and hour — not by taste.

## 1.1 Time Atmospheres

The product’s background weather follows cinematography light language.

### Day (neutral operating default)

| Token | Value | Role |
|---|---|---|
| `atmosphere.day.bg` | `#F7F1E8` | Warm paper daylight field |
| `atmosphere.day.bg-elevated` | `#FFFAF3` | Raised day surface |
| `atmosphere.day.ink` | `#1A1714` | Primary day text |
| `atmosphere.day.ink-soft` | `#5C564F` | Secondary day text |
| `atmosphere.day.mist` | `#E8DFD2` | Soft day dividers / quiet fills |
| `atmosphere.day.air` | `#D9E0E4` | Cool air balance |

### Morning

| Token | Value | Role |
|---|---|---|
| `atmosphere.morning.bg` | `#F3E8D8` | Soft cream beginning |
| `atmosphere.morning.key` | `#E8D4B8` | Window-warm key light |
| `atmosphere.morning.cool` | `#6B8494` | Cool air around warmth |
| `atmosphere.morning.ink` | `#1A1714` | Morning authority text |
| `atmosphere.morning.glow` | `#F0E6D6` | Soft luminous wash |

Feeling: possibility without urgency.

### Afternoon

| Token | Value | Role |
|---|---|---|
| `atmosphere.afternoon.bg` | `#F5EFE6` | Steady practical field |
| `atmosphere.afternoon.key` | `#D8C3A8` | Cleaner ambient definition |
| `atmosphere.afternoon.cool` | `#7A8B94` | Balanced cool |
| `atmosphere.afternoon.ink` | `#18151F` | Working clarity |
| `atmosphere.afternoon.focus` | `#C4B5D8` | Quiet focus accent (never loud) |

Feeling: competence. The day is moving; AmyNest steadies it.

### Evening

| Token | Value | Role |
|---|---|---|
| `atmosphere.evening.bg` | `#1A1714` | Deep charcoal room |
| `atmosphere.evening.key` | `#C48A5A` | Amber lamp key |
| `atmosphere.evening.rose` | `#D4A090` | Soft protective rose |
| `atmosphere.evening.ink` | `#F3E8D8` | Evening readable light text |
| `atmosphere.evening.ink-soft` | `#B8A99A` | Secondary evening text |
| `atmosphere.evening.shadow` | `#0E0C0A` | Deepened edges |

Feeling: wind-down, closure, care.

### Night

| Token | Value | Role |
|---|---|---|
| `atmosphere.night.bg` | `#05040C` | Deep ink void |
| `atmosphere.night.bg-mid` | `#0C0818` | Night mid field |
| `atmosphere.night.violet` | `#2A1F33` | Muted violet dusk |
| `atmosphere.night.key` | `#B8A6D4` | Soft lilac mist point light |
| `atmosphere.night.warm` | `#E8D4B8` | Warm trust point only where needed |
| `atmosphere.night.ink` | `#F4EEE6` | Night primary text |
| `atmosphere.night.ink-soft` | `#9A90A8` | Night secondary text |

Feeling: safety in stillness. No stimulation.

### Atmosphere usage law

| Surface family | Default atmosphere |
|---|---|
| Landing arrival / cinematic moments | Night → Morning |
| Discovery | Morning → Afternoon |
| Working | Afternoon focus |
| Today / Mission | Day or hour-aware |
| Reveal of next right thing | Peak clarity of current hour |
| Done / relief | Evening exhale |
| Coach / Ask Amy (deep care) | Evening or Night |
| Memory | Soft evening held |
| Premium | Night with warm protection light |
| Settings | Day (clarity) or Night (consistency with shell) |

Only one atmosphere drives a moment.  
Do not mix Morning cream ground with Night neon accents.

---

## 1.2 Core Brand Roles (hour-independent)

These roles remap into atmospheres; names stay stable.

### Primary

| Token | Value | Role |
|---|---|---|
| `color.primary` | `#F4EEE6` | Primary action fill on dark rooms |
| `color.primary-ink` | `#12081F` | Text/icon on primary |
| `color.primary-soft` | `#E8D4B8` | Warm primary variant / champagne |
| `color.primary-on-day` | `#1A1714` | Primary action on day rooms |
| `color.primary-on-day-ink` | `#FFFAF3` | Text on day primary |

Primary is invitation, not alarm.

### Secondary

| Token | Value | Role |
|---|---|---|
| `color.secondary` | `#B8A6D4` | Soft lilac secondary accent |
| `color.secondary-deep` | `#6E5B8A` | Deep secondary for day accents |
| `color.secondary-mute` | `#8A7A9E` | Quiet secondary labels |

Secondary never competes with the photographic memory.

### Surface

| Token | Value | Role |
|---|---|---|
| `surface.0` | atmosphere bg | Base room |
| `surface.1` | day `#FFFAF3` / night `rgba(255,255,255,0.04)` | Quiet raised |
| `surface.2` | day `#FFFFFF` / night `rgba(255,255,255,0.06)` | Card body |
| `surface.3` | day `#F0E8DC` / night `rgba(255,255,255,0.09)` | Emphasized panel |
| `surface.inverse` | opposite atmosphere | Rare contrast blocks |

### Glass

| Token | Value | Role |
|---|---|---|
| `glass.fill` | `rgba(255,255,255,0.045)` → `0.02` gradient | Standard glass body |
| `glass.fill-strong` | `rgba(255,255,255,0.08)` | Stronger glass when over busy photo |
| `glass.stroke` | `rgba(255,255,255,0.10)` | Hairline glass edge |
| `glass.stroke-strong` | `rgba(255,255,255,0.22)` | Active / focus glass edge |
| `glass.highlight` | `rgba(255,255,255,0.55)` inset top | Specular edge light |
| `glass.day-fill` | `rgba(26,23,20,0.04)` | Glass on day rooms |
| `glass.day-stroke` | `rgba(26,23,20,0.10)` | Day glass edge |

### Elevation tints

Elevation is mostly shadow + slight surface lift. Color tints:

| Token | Value |
|---|---|
| `elevation.tint-warm` | `rgba(196,138,90,0.08)` |
| `elevation.tint-cool` | `rgba(107,132,148,0.08)` |
| `elevation.scrim` | `rgba(5,4,12,0.55)` |

### Hairline

| Token | Value | Role |
|---|---|---|
| `hairline.default` | day `rgba(26,23,20,0.10)` / night `rgba(255,255,255,0.10)` | Default separators |
| `hairline.soft` | day `0.06` / night `0.06` | Whisper dividers |
| `hairline.strong` | day `0.18` / night `0.22` | Focus / selected edge |
| `hairline.width` | `1` logical px | Never 2px candy borders |

### Success

| Token | Value | Role |
|---|---|---|
| `color.success` | `#8FA88B` | Quiet sage success |
| `color.success-soft` | `rgba(143,168,139,0.16)` | Success wash |
| `color.success-ink` | `#243028` | Text on success soft |

Success is relief, not celebration green fireworks.

### Warning

| Token | Value | Role |
|---|---|---|
| `color.warning` | `#C49A5A` | Warm amber caution |
| `color.warning-soft` | `rgba(196,154,90,0.16)` | Warning wash |
| `color.warning-ink` | `#3A2A14` | Text on warning soft |

Warning is adult caution — never alarm-red parenting shame.

### Destructive (system necessary, rare)

| Token | Value | Role |
|---|---|---|
| `color.danger` | `#B56868` | Softened rose-danger |
| `color.danger-soft` | `rgba(181,104,104,0.14)` | Danger wash |

Use only for irreversible account/data actions — never for ordinary parenting moments.

### Background

| Token | Role |
|---|---|
| `bg.app` | Active atmosphere bg |
| `bg.room` | Same as atmosphere; the “room” behind content |
| `bg.overlay` | `elevation.scrim` for sheets/modals |
| `bg.photo-veil` | Soft gradient veil so text remains legible over photography without killing the image |

### Typography color roles

| Token | Role |
|---|---|
| `text.primary` | atmosphere ink |
| `text.secondary` | atmosphere ink-soft |
| `text.tertiary` | 55–65% of secondary |
| `text.on-primary` | primary-ink |
| `text.link` | secondary with underline on interaction |
| `text.kicker` | tertiary + tracked uppercase micro |

---

# 2. Typography System

No random font sizes.  
Type is a ladder. Use only the steps below.

## 2.1 Family

| Role | Spec |
|---|---|
| UI / Body | System premium sans (Inter / SF Pro / equivalent product sans) |
| Display optional | Same family — weight and size create prestige, not a novelty display face |
| Mono | Forbidden in parent moments; allowed only in rare engineering/debug surfaces |

Do not introduce decorative serif / script / handwritten kids fonts into product chrome.

## 2.2 Scale

| Role | Size | Line height | Weight | Tracking | Use |
|---|---|---|---|---|---|
| **Display** | 40 / 44 | 1.10 | 600 | -0.02em | Rare cinematic titles only |
| **Hero** | 32 / 34 | 1.15 | 600 | -0.02em | Moment titles (“Begin with today”) |
| **Section** | 24 / 26 | 1.20 | 600 | -0.015em | Section headers inside rooms |
| **Title** | 20 / 22 | 1.25 | 600 | -0.01em | Card / sheet titles |
| **Body** | 16 / 17 | 1.50 | 400–500 | 0 | Primary reading |
| **Body-sm** | 14 / 15 | 1.45 | 400–500 | 0 | Supporting paragraphs |
| **Caption** | 13 | 1.40 | 500 | 0.01em | Hints, meta, based-on lines |
| **Micro** | 11 / 12 | 1.30 | 600 | 0.16–0.22em | Kickers, uppercase labels |
| **Button** | 16 | 1.20 | 700 | 0 | Primary/secondary button labels |

Viewport note:  
Mobile uses the lower size where two are listed.  
Desktop may use the higher.  
Do not invent 18, 19, 21, 28, 36 outside this ladder without system revision.

## 2.3 Weights

| Token | Value | Use |
|---|---|---|
| `font.regular` | 400 | Long reading |
| `font.medium` | 500 | Body emphasis, UI labels |
| `font.semibold` | 600 | Titles, section, hero |
| `font.bold` | 700 | Buttons only (and rare numeric emphasis) |

Never use 800/900. It shouts.

## 2.4 Tracking

| Context | Tracking |
|---|---|
| Display / Hero / Section | Slight negative (-0.015 to -0.02em) |
| Body | 0 |
| Caption | slight positive optional (+0.01em) |
| Micro kickers | +0.16em to +0.22em, uppercase |

## 2.5 Vertical rhythm

All type blocks sit on the spacing system (Section 3).

| Stack | Rhythm |
|---|---|
| Kicker → Hero | 12 |
| Hero → Body | 16 |
| Body → Primary button | 32–40 |
| Section → first content | 20–24 |
| Caption under title | 8 |
| List item stacking | 12 |

Maximum one Hero per major moment.  
If two large titles compete, the film breaks.

## 2.6 Type laws

1. Memory before type (cinematography).  
2. One Hero maximum per moment.  
3. Body never competes with Hero in weight.  
4. Kickers are quiet — never brand spam.  
5. No rainbow text. No gradient letters in product UI.

---

# 3. Spacing System

Everything snaps to:

**4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 96**

| Token | Value | Common use |
|---|---|---|
| `space.1` | 4 | Micro gaps, icon padding |
| `space.2` | 8 | Tight related stacking |
| `space.3` | 12 | List gaps, kicker→title |
| `space.4` | 16 | Standard inner padding unit |
| `space.5` | 20 | Section breathing |
| `space.6` | 24 | Card padding, group gaps |
| `space.8` | 32 | Major block separation |
| `space.10` | 40 | Title stack to action |
| `space.12` | 48 | Large room padding zones |
| `space.16` | 64 | Moment top safe breathing |
| `space.24` | 96 | Cinematic empty field / hero isolation |

### Layout defaults

| Context | Spec |
|---|---|
| Screen horizontal padding | 20 (mobile) / 24 (desktop content column) |
| Content max width (parent moments) | ~448–512 (centered) |
| Card internal padding | 16–24 |
| Stack between cards | 12–16 |
| Bottom action safe area | 24 + device safe inset |
| Top safe breathing | 20–32 + device safe inset |

### Spacing laws

- No 6, 10, 14, 18, 22, 28, 36 as permanent values.  
- Optical exceptions (±1–2) allowed only for icon alignment — not for layout.  
- Empty space is identity. Do not fill gaps with widgets.

---

# 4. Radius System

Corners are brand. Random radii fracture the OS.

| Token | Value | Use |
|---|---|---|
| `radius.xs` | 8 | Tiny chips, micro controls |
| `radius.sm` | 12 | Compact controls, small tags |
| `radius.md` | 14 | Choice rows / compact cards |
| `radius.lg` | 16 | Buttons, inputs, standard cards |
| `radius.xl` | 18 | Panels, glass panels |
| `radius.2xl` | 24 | Sheets, large dialogs, hero frames |
| `radius.3xl` | 32 | Rare cinematic photo wells |
| `radius.pill` | 999 | Only true pills (progress dots, rare chips) — not primary buttons |

### Component radius map

| Component | Radius |
|---|---|
| Panels | `xl` (18) |
| Cards | `lg`–`xl` (16–18) |
| Glass surfaces | `xl` (18) |
| Inputs | `lg` (16) |
| Buttons | `lg` (16) |
| Choice controls | `md` (14) |
| Dialogs | `2xl` (24) |
| Sheets | `2xl` (24) top corners |
| Photo wells | `2xl`–`3xl` |
| Bottom bar container | `2xl` or full-bleed with top hairline (no competing bubble) |
| Avatars | full circle only for people photos |

### Radius laws

- Primary buttons are **rounded rectangles (16)**, not stadium candy — unless a specific system chip requires pill.  
- Do not mix 10/15/20 one-offs.  
- Photo corners may be softer than UI chrome; UI never rounder than the photo well it supports.

---

# 5. Elevation

Elevation expresses depth of room — not drop-shadow fashion.

| Level | Name | Feeling | Use |
|---|---|---|---|
| **0** | Surface 0 | Flat room | App background / atmosphere |
| **1** | Surface 1 | Barely lifted | Quiet grouped areas |
| **2** | Surface 2 | Card rest | Standard cards, lists |
| **3** | Surface 3 | Emphasized panel | Selected / important panels |
| **Floating** | Floating | Held above room | FABs rare; floating helper chips |
| **Modal** | Modal | Above scrim | Dialogs |
| **Glass** | Glass | Translucent lift | Glass panels over photo/atmosphere |

### Elevation recipes (manufacturing intent — not CSS)

| Level | Shadow character | Edge | Fill |
|---|---|---|---|
| 0 | none | none | atmosphere |
| 1 | very soft short shadow | hairline.soft optional | surface.1 |
| 2 | soft medium shadow + optional warm tint | hairline.default | surface.2 |
| 3 | deeper soft shadow | hairline.strong optional | surface.3 |
| Floating | larger soft shadow, still breath-soft | hairline.default | surface.2/3 |
| Modal | deep soft shadow over scrim | hairline.soft | surface.2 or glass |
| Glass | inset highlight + soft outer shadow | glass.stroke | glass.fill |

### Elevation laws

- Shadows are soft, large, low-contrast — never hard black rectangles.  
- No neon colored glows.  
- Selected state prefers **edge light + fill change** over violent shadow jumps.  
- Ambient living elevation (subtle idle breath) may exist on glass/cards — never bounce.

---

# 6. Material Library

All materials are reusable system assets.  
Do not invent a new material per feature.

## 6.1 Solid

| Token | Description |
|---|---|
| `material.solid-day` | Opaque warm paper / ivory surfaces |
| `material.solid-night` | Opaque deep ink panels |
| `material.solid-primary` | Primary action solid (ivory on night / ink on day) |

Use for: buttons, high-legibility blocks, settings clarity.

## 6.2 Glass

| Token | Description |
|---|---|
| `material.glass` | Soft translucent panel; supports photo/atmosphere |
| `material.glass-strong` | Higher opacity when content needs protection |

Glass is a frame. If it becomes the subject, remove it.

## 6.3 Translucent

| Token | Description |
|---|---|
| `material.translucent` | Lighter than glass; used for subtle washes, choice resting states |

## 6.4 Blur

| Token | Description |
|---|---|
| `material.blur-soft` | Light frost for glass |
| `material.blur-strong` | Stronger frost over photography for legibility sheets |

Blur exists for legibility and depth — not as a trendy garnish.

## 6.5 Noise

| Token | Description |
|---|---|
| `material.noise-film` | Extremely subtle film grain over photographic atmospheres |
| `material.noise-paper` | Whisper paper tooth on day rooms |

Noise is felt, not seen as texture spam.  
Never heavy grunge.

## 6.6 Shadow

Use Elevation recipes only.  
Named aliases:

- `shadow.1` · `shadow.2` · `shadow.3` · `shadow.floating` · `shadow.modal` · `shadow.glass-outer`

## 6.7 Highlight

| Token | Description |
|---|---|
| `material.highlight-top` | Soft inset top light on glass/buttons |
| `material.highlight-warm` | Champagne specular on living materials |

## 6.8 Reflection

| Token | Description |
|---|---|
| `material.reflection-soft` | Barely-there environment reflection on glass edges |

Reflection must stay adult and quiet.  
No mirror disco.

## 6.9 Edge Light

| Token | Description |
|---|---|
| `material.edge-light` | 1px luminous edge for selected glass / focus |
| `material.edge-light-warm` | Warm edge for evening/night trust moments |

Edge light = focus and selection language across the OS.

### Material stacking law

Per moment, prefer **one** dominant material idea:

- Photo + soft glass support  
OR  
- Solid day clarity  
OR  
- Night glass room  

Do not stack glass + heavy noise + strong reflection + loud edge light simultaneously.

---

# 7. Photography Rules

Photography is a first-class identity material.

## 7.1 Where photography is ALLOWED

| Surface | Photography role |
|---|---|
| Landing / arrival | Hero memory |
| Discovery | Optional evolving human detail / threshold |
| Working | Usually none or extremely soft atmospheric still — signals lead |
| Today | One daily memory possible |
| Mission / next right thing | Strongly allowed — earned photographic truth |
| Ask Amy / Coach | Allowed as quiet care atmosphere or gesture crop |
| Memory | Allowed as continuity proof |
| Premium | Allowed as protection / heirloom warmth |
| Empty states | Allowed if it carries one memory |

## 7.2 Where photography is FORBIDDEN

| Surface | Why |
|---|---|
| Dense settings forms | Clarity > cinema |
| Legal / billing tables | Trust through clarity |
| Error diagnostics | Do not romanticize failure |
| Tiny icons / favicons | Wrong scale — becomes sticker |
| Behind competing charts | Noise |
| As wallpaper under crowded dashboards | Child/human memory dies |

If the photo cannot be the one memory, do not use a photo.

## 7.3 Cropping

| Rule | Spec |
|---|---|
| Prefer gesture over full body | Hands, doorway, shoes, shared object |
| Faces | Optional; never stock smile; never forced eye contact |
| Crop | Intimate, editorial, specific |
| Aspect | Soft well inside `radius.2xl`–`3xl`; avoid random collage tiles |
| Scale | One subject. Large enough to feel. |

## 7.4 Light on photography

Match atmosphere hour:

- Morning: window side light  
- Afternoon: cleaner ambient  
- Evening: lamp warmth  
- Night: single point warmth, vast dark air  

Grade: Portra-like warmth + teal/charcoal shadows.  
Fine grain allowed.  
No HDR crunch. No influencer gloss.

## 7.5 Negative space

Photography must breathe.  
Do not edge-to-edge wallpaper a busy UI.  
Prefer photo well or soft-masked top field with quiet lower UI.

## 7.6 Depth

Photo sits behind glass/support materials.  
Text sits in protected quiet zones (veil if needed).  
Controls never cut through a face or the emotional center of the crop.

## 7.7 Never stock feeling

Forbidden casting/art direction:

- Perfect white nurseries  
- Overjoyed leaping families  
- Floating babies on white seamless  
- AI-smooth skin / surreal eyes  
- Generic “parenting stock” search results  

Required:

- Lived-in rooms  
- Specific objects  
- Quiet in-between moments  
- Art-directed reality  

---

# 8. Illustration Rules

Illustration is secondary to photography in the hybrid system.

## 8.1 Allowed only when it supports discovery

Illustration may appear when:

- A question needs a gentle conceptual scene  
- Abstraction communicates orientation better than a photo  
- A transitional discovery beat needs a small emotional diagram  

Illustration is not decoration.

## 8.2 Forbidden

| Forbidden | Why |
|---|---|
| Mascots | Identity is not a character toy |
| Childish cartoons | Wrong emotional age |
| Big-eye characters | Entertainment grammar |
| Sticker packs in chrome | Fractures OS |
| Explainer comic panels as default UI | Turns product into content site |
| AI-art fantasy | Breaks trust |

## 8.3 Allowed illustration qualities

- Adult editorial restraint  
- Limited palette from this token system  
- Large negative space  
- Soft gouache / restrained line  
- Small, precious, centered — not full-bleed chaos  
- Gesture and relation, not punchline comedy  

## 8.4 Hierarchy with photography

If photography can tell the truth, prefer photography.  
Illustration should not appear on the same moment as a photographic hero unless illustration is microscopic support (almost never).

---

# 9. Component Identity

Every component must be immediately recognizable as AmyNest —  
quiet, warm, precise, adult.

## 9.1 Buttons

| Variant | Identity |
|---|---|
| Primary | Solid primary fill; bold 16; radius lg; soft shadow; compress on press; no bounce |
| Secondary / Quiet | Glass or translucent; hairline; light text/ink; calm hover edge |
| Tertiary | Text-only; secondary color; no chrome |
| Disabled | Opacity drop; no shadow; no press |

Laws:

- One primary per moment view.  
- Buttons are invitations, never climaxes.  
- Never rainbow CTAs. Never sticker badges on buttons.

## 9.2 Cards

| Variant | Identity |
|---|---|
| Solid card | Surface 2, radius lg/xl, shadow 2, hairline optional |
| Glass card | Glass fill + blur + edge + glass shadow |
| Memory card | May host photo well + quiet caption |
| Choice card | Compact; selected = edge light + fill lift |

Laws:

- Cards hold one idea.  
- No kitchen-sink cards with 8 actions.

## 9.3 Fields / Inputs

| Spec | Identity |
|---|---|
| Shape | radius lg |
| Rest | glass/translucent or surface.1 + hairline |
| Focus | edge light / stroke-strong; soft elevation increase |
| Text | body 16 |
| Placeholder | text.tertiary |
| Error | warning/danger soft wash + caption |

Fields feel holdable — not web-form harsh.

## 9.4 Progress

| Kind | Identity |
|---|---|
| Discovery step micro | Quiet micro kicker (“1 of 3”) — not loud progress bars |
| Working assembly | Signals appearing one by one — not determinate candy bar |
| Mission progress | Soft sage/quiet track if needed; never game XP |

Forbidden: confetti progress, streak flames, loud percentages as identity.

## 9.5 Sheets

| Spec | Identity |
|---|---|
| Top radius | 2xl |
| Material | solid elevated or glass-strong |
| Scrim | elevation.scrim |
| Handle | optional quiet hairline pill |
| Motion feel | discovered rise — no spring circus |

## 9.6 Dialogs

| Spec | Identity |
|---|---|
| Radius | 2xl |
| Width | constrained, centered |
| Elevation | modal |
| Actions | primary + quiet; destructive rare |
| Tone | adult clarity |

## 9.7 Navigation

| Spec | Identity |
|---|---|
| Presence | Secondary to the moment memory |
| Labels | Caption/micro clarity |
| Active | Edge light / soft fill — not neon underline candy |
| Density | Few destinations; no feature mall |

Navigation must never be the first-seen element of a major moment.

## 9.8 Bottom bar

| Spec | Identity |
|---|---|
| Material | glass-strong or solid night/day surface |
| Edge | top hairline or soft shadow only |
| Icons | Simple, adult, monochrome/soft secondary |
| Active | Quiet luminous, not cartoon fill |

Bottom bar is a servant.  
It must not visually overpower Today’s memory.

## 9.9 Top bar

| Spec | Identity |
|---|---|
| Height | calm; spacing-aligned |
| Title | title/section — not display |
| Actions | tertiary / quiet icon buttons |
| Transparency | may be glass over photo if legibility holds |

Top bar never carries marketing.

## 9.10 Shared component laws

1. If it looks like a generic SaaS kit, restyle to tokens.  
2. If it looks like a kids app, kill it.  
3. If glass competes with content, reduce glass.  
4. Selected = edge light + material lift.  
5. Pressed = compress / shadow settle. Never bounce.  
6. Every component should still feel AmyNest in a monochrome screenshot.

---

# 10. Manufacturing Checklist

A designer should build 100 screens without inventing anything.

## 10.1 Before designing any moment

- [ ] Which atmosphere hour? (Morning / Afternoon / Evening / Night / Day)  
- [ ] What emotion leaves? What emotion arrives?  
- [ ] What is the **one** visual memory? (not type, not button, not icon)  
- [ ] Does photography lead, with materials only supporting?  
- [ ] Is illustration unnecessary? If used, does it only support discovery?

## 10.2 Token obedience

- [ ] Colors only from this bible  
- [ ] Type only from the scale ladder  
- [ ] Spacing only from 4–96 system  
- [ ] Radius only from radius tokens  
- [ ] Elevation only from defined levels  
- [ ] Materials only from the material library  

## 10.3 Cinematography obedience

- [ ] Begins soft: atmosphere → memory → meaning → action  
- [ ] Nothing pops / bounces / surprises  
- [ ] Glass does not outrank the child  
- [ ] Reveal feels discovered  
- [ ] Completion is relief, not celebration  

## 10.4 Component obedience

- [ ] One primary button  
- [ ] Cards hold one idea  
- [ ] Nav/bottom bar remain servants  
- [ ] Selected state uses edge light language  
- [ ] No feature-mall density  

## 10.5 Surface family check

Ask: if this moment is placed beside Landing, Today, Coach, Memory, Premium —  
does it feel like the **same operating system**?

If not, it is not manufactured. It is freelanced.

## 10.6 Final premium test

Remove all copy mentally.

Still feel:

- trust  
- warmth  
- premium calm  

If only the words were carrying quality, the identity failed.

---

# System Summary

AmyNest is one visual operating system:

| Pillar | Law |
|---|---|
| Color | Hour-aware atmospheres + stable roles |
| Type | Closed ladder, no random sizes |
| Space | 4–96 snap |
| Radius | Closed set |
| Elevation | 0 → Modal + Glass |
| Material | Solid / Glass / Translucent / Blur / Noise / Shadow / Highlight / Reflection / Edge Light |
| Photo | Human memory leader |
| Illustration | Discovery support only |
| Components | Immediately AmyNest |
| Checklist | No invention outside the system |

Manufacture from this bible.  
Do not invent around it.
