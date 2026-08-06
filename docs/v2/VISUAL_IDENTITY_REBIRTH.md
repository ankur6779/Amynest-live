# AmyNest V2 — Founder Visual Identity Rebirth

**Status:** Proposal only — **do not implement until Founder approves**  
**Constraint:** Visual design only. No architecture · Brain · routing · Experience · features · logic  
**Flows:** Unchanged. Presentation transform only.

---

## Verdict (before)

AmyNest V2 currently **feels calm in copy** but **looks like a dark SaaS shell**:

- App chrome (logo strip, tab underline, bordered cards)
- Coral/orange system primary CTAs on navy surfaces
- Stacked “dashboard sections” on Today
- Utility typography (`font-semibold` / muted labels)
- Purple marketing DNA still leaking (mascot glow, brand gradients)
- Amy’s orb is premium; the **operating shell around it is not**

Emotional craft (exits, silence, continuity) is ahead of visual craft.  
This proposal closes that gap.

---

## North star

> AmyNest should feel like the quiet hour after the house settles —  
> not like a productivity dashboard for parents.

**References (feel, not copy):**

| Product | Steal |
|---------|--------|
| Apple | One object. Huge type. Air. Materials. |
| Headspace / Calm | Atmosphere as product. Soft light. Ritual. |
| Airbnb | Warm photography language; one hero story. |
| Linear | Ruthless hierarchy; almost no chrome. |
| Arc | Personality without clutter. |
| Explee / Craft / Notion Calendar | Editorial spacing; soft glass; quiet tools. |
| Mobbin premium | Full-bleed hero planes; tactile CTAs. |

**Not this:** EdTech purple, coaching-centre cards, badge clusters, neon glow spam, multi-stat strips.

---

## Audit — current V2 (as lived)

| Dimension | Current state | SaaS tell |
|-----------|---------------|-----------|
| **Composition** | Vertical stack of labeled sections | Dashboard modules |
| **Hierarchy** | Label → title → body → CTA per block | Equal card weight |
| **Typography** | System sans, weight via `semibold` | Tool UI |
| **Illustration** | Orb on Front Door; elsewhere Lucide icons | Empty mid-screen Coach |
| **Lighting** | Flat navy + coral accent | No atmospheric light |
| **Depth** | `border` + `shadow-sm` cards | App kit default |
| **Card language** | Same `V2_CARD` ladder everywhere | Uniform tiles |
| **Spacing** | Better after Wave D (`gap-8`) but still list-like | Feed, not composition |
| **Color** | Dark theme + `primary` coral + purple brand relics | Split personality |
| **Materials** | Card fill + blur sheet | Generic glass |
| **Hero** | Front Door orb strong; Today has no hero plane | Lost after door |
| **Background** | Flat `background` / navy | No weather / time-of-day |
| **Rhythm** | Section · section · section · tab bar | Software scroll |

---

## Design system proposal: “Nest Atmosphere”

### 1. Color — one emotional climate

Replace “dark mode SaaS + coral CTA” with a **parenting dusk** climate:

| Token | Role | Direction |
|-------|------|-----------|
| `--nest-ink` | Near-black warm (ink, not pure #000) | Text |
| `--nest-mist` | Soft lavender-grey for secondary | Quiet labels |
| `--nest-bloom` | Single accent — warm rose-clay or soft apricot | Primary CTA only |
| `--nest-night` | Deep indigo-plum atmosphere (not neon purple) | Background |
| `--nest-glow` | Soft radial light behind Amy / Mission | Depth, not neon |
| `--nest-surface` | Translucent cream-on-night (5–8% white) | Cards / sheets |

**Rules**

- One accent for action. Never orange + purple + cyan competing.
- No rainbow logo chrome in V2 shell (keep brand mark tiny or wordmark only).
- Marketing landing may stay cinematic; **in-app V2 is Nest Atmosphere**.

### 2. Typography — editorial, not UI kit

| Role | Direction |
|------|-----------|
| Display | Soft serif or high-end rounded sans (e.g. family like *Fraunces* / *Newsreader* / *Söhne* tier — final pick in implementation) for H1 only |
| Body | Humanist sans, generous leading (1.45–1.6) |
| Meta | Small caps or tracked uppercase sparingly — max one per screen |
| Numbers | Tabular only where needed; Mission “3 min” as soft pill, not badge spam |

**Hierarchy rule:** One loud line per screen. Everything else whispers.

### 3. Composition — one plane, not a dashboard

First viewport of every V2 screen:

1. Atmosphere background  
2. One hero statement (or Amy presence)  
3. One primary action  
4. Optional one supporting line  

No stats. No chip rows. No “module gallery” above the fold.

### 4. Card language — three materials only

| Material | Use |
|----------|-----|
| **Atmosphere** | No card — text floats on background (Today focus, greetings) |
| **Soft plate** | Mission / Coach — large radius, no hard border, light inner highlight |
| **Sheet glass** | Guest account / Premium gate — blur + thin luminous edge |

Kill equal-height bordered tiles for Play / Learn / Care on For Child — use **illustrated horizons** or soft plates with air between.

### 5. Lighting & depth

- Soft radial “window light” behind Mission hero  
- Sheets rise with opacity, not drop-shadow cliffs  
- Success moment: brief warm bloom (not confetti)  
- Reduced motion: static light, no pulse

### 6. Illustration & Amy

- Amy = **light presence** (orb / soft face light), not header mascot bounce  
- Front Door keeps cinematic orb  
- Today Mission gets a small atmospheric vignette (sleep / speech mood) — still presentation, no new feature  
- Icons: one stroke family (already `V2_ICON_STROKE`); optical size only, no filled neon icons

### 7. Navigation chrome

- Tab bar: frosted strip, **no underline pill**; active = soft fill + label weight  
- Remove or minimize top logo strip on V2 shell (Linear lesson)  
- Safe-area padding as air, not as dashboard frame

### 8. Spacing rhythm

| Zone | Rhythm |
|------|--------|
| Screen edge | 20–24px |
| Hero → action | 28–36px |
| Between major chapters | 40–56px |
| Inside soft plate | 20–24px |

Wider than current list density. Prefer fewer elements over denser packing.

---

## Screen-by-screen redesign (flows unchanged)

### Landing / Home entry
| Before | After |
|--------|--------|
| Marketing purple gradients, badge rows, SaaS feature grid risk | One full-bleed atmosphere; brand as hero; one CTA into Front Door; secondary “Try on Web” quiet |
| `/landing` alias OK | Same route; visual only |

### Front Door
| Before | After |
|--------|--------|
| Strong orb; then age/worry steps feel form-like | Keep orb as sacred hero; steps as **soft choice plates** floating in atmosphere; progress as thin luminous line (not stepper dots) |
| Skip for now | Ghost text, bottom air |

### Today
| Before | After |
|--------|--------|
| “Today's focus” label + greeting + message + mission card + coach card + ask amy + premium = dashboard | **Hero:** atmosphere + one line focus (“Sleep”) as display type; child name as whisper; Mission as only soft plate above fold; Coach / Ask Amy / Premium as quieter chapters below with more air |
| Coral primary CTA | Nest bloom CTA on Mission only |

### Mission (play + success)
| Before | After |
|--------|--------|
| Card + steps list | Full-bleed calm stage; step list as gentle sequence (numbers as soft marks); success = warm light + one sentence (copy stays) |

### Coach
| Before | After |
|--------|--------|
| Headline + empty mid + Continue | Atmosphere vignette for journey theme; soft plate for plan summary; Continue as bloom; “Not right now” as breath |

### Ask Amy
| Before | After |
|--------|--------|
| Header back + prompt cards (bordered) | Intimate reading room: soft prompts as plates; no chatbot chrome until conversation; guest soft-save sheet matches Nest glass |

### For Child
| Before | After |
|--------|--------|
| Hope text + four empty bordered sections | Wonder landscape: hope as hero line; Play / Learn / Care as **illustrated soft horizons** (empty but beautiful — possibility, not hollow SaaS tiles); save CTA quiet at bottom |

### Premium
| Before | After |
|--------|--------|
| Continuity copy good; gate feels modal-card | Continuity as letter on atmosphere; CTA bloom; never pricing-table energy |

### Signup (V2 continuity)
| Before | After |
|--------|--------|
| Auth form + purple glow relics | Nest night background; continuity subline as the hero; form as soft plate; calm busy state already exists — keep |

### Guest sheet
| Before | After |
|--------|--------|
| Standard dialog card | Nest glass sheet; title as care; primary bloom; “Not right now” airy |

---

## Before / after rationale (summary)

| Principle | Before | After | Why |
|-----------|--------|-------|-----|
| Product metaphor | Dashboard | Ritual / nest | Parents don’t “manage”; they arrive |
| Accent | Coral system primary | One nest bloom | Stops EdTech urgency |
| Type | UI sans stack | Display + whisper | Premium products speak in levels |
| Cards | Borders everywhere | Atmosphere + rare plates | Airbnb/Apple air |
| Chrome | Logo + tabs loud | Shell almost invisible | Linear |
| Amy | Mascot / MEET splash | Light presence | Headspace calm |
| Empty | Hollow tiles | Illustrated possibility | For Child trust |

---

## Implementation boundaries (when approved)

**In scope (visual only)**

- CSS tokens for Nest Atmosphere (V2 surfaces)  
- Typography imports for V2 shell  
- Card / sheet / CTA class updates in `v2/craft`  
- Layout chrome (header / tab) presentation on V2 routes  
- Background treatments per screen  
- For Child empty → soft illustrated plates (assets or CSS art — no new features)

**Out of scope**

- Brain, routing, Experience packs, analytics, copy rewrites (unless a word must move for layout)  
- New screens, new CTAs, new flows  
- Redesigning entire classic V1 treasury  

**Rollout suggestion**

1. Tokens + type + chrome  
2. Today + Mission + Front Door  
3. Coach + Ask Amy + For Child + Premium + Signup sheet  
4. Reduced-motion / a11y pass  

---

## Approval checklist

- [ ] North star approved  
- [ ] Nest Atmosphere color direction approved (bloom hue pick)  
- [ ] Display typeface family approved  
- [ ] Today hero composition approved  
- [ ] For Child “illustrated empty” approach approved  
- [ ] Explicit GO to implement Wave 1  

**STOP.** Awaiting Founder approval before any visual code.
