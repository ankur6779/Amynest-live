# AmyNest V2 — Optical Alignment

**Status:** Perception audit only — **no implementation · no new components · no redesign**  
**Authority:** [`DESIGN_CONSTITUTION.md`](./DESIGN_CONSTITUTION.md) · companion [`SPATIAL_RHYTHM_AUDIT.md`](./SPATIAL_RHYTHM_AUDIT.md)  
**Lens:** Human eye first. If math says centered but the eye says wrong — **move it**.

---

## Principle

Pixels lie. Perception leads.

- Large type sits optically heavier than small type of the same box.  
- Warm bloom pulls the eye harder than mist ink.  
- Shadows under a card make it feel lower than its box.  
- A logo in the top-left *feels* louder than the same mark at caption weight.  
- True visual center on a phone is slightly **above** geometric mid-height (optical center ≈ 45%, not 50%).

Optical fixes are **nudges** within existing components — padding bias, weight quieting, glow restraint, column lock — never new UI.

---

## Global optical laws (all screens)

| Check | Law |
|-------|-----|
| **Hero optical center** | Hero must own the upper third of the first viewport. Not glued to the status bar. Not pushed under a chip stack. |
| **CTA optical center** | Primary bloom sits in the natural hand/eye rest — after a pause of air, not crammed under copy, not stranded alone at the geometric bottom. |
| **Logo balance** | Wordmark never shares optical weight with the hero. Quieter, smaller, or absent. |
| **Card weight** | One plate may feel “present.” A second plate must feel lighter (opacity / shadow / type), never a twin. |
| **Visual gravity** | One gravity well per viewport (Mission, orb, or sheet title). Everything else orbits quieter. |
| **Whitespace** | Air must look intentional — equal emptiness on left/right column; chapters must not form a “stripe” of same-weight blocks. |
| **Shadow balance** | One soft direction (down / slight away from key light). No heavier shadow on secondary than primary. |
| **Glow balance** | Glow only on Amy presence or the one bloom action. Chrome and secondary cards do not glow. |
| **Typography balance** | One loud line. Captions must optically recede (lighter, not just smaller). Full-width buttons with short labels need optical inset so the word doesn’t feel left-starved or floating. |

### Optical column (in-product default)

Left-aligned Nest column:

```
[ edge air ]
  logo/whisper  ← optically lighter, slightly higher tracking OK
  HERO          ← optical left lock
  body
  soft plate
    bloom CTA   ← same left lock as hero (full-bleed width OK; label optically centered in pill)
[ edge air ]
```

Centered column is reserved for **ritual** surfaces only (Front Door breath, Success honor, some Premium continuity). Even then: logo quieter than hero; CTA optically under the hero’s mass, not under the card’s geometric midline alone.

---

## Screen audits

### 1. Today

| Check | Before (eye) | After (nudge) | Reason |
|-------|--------------|---------------|--------|
| **Hero optical center** | “Today” label + focus chip + greeting + subline + message stack — hero greeting sits **too low** and **too quiet** among peers | Lift greeting optically: quiet label/chip; let headline own the upper band; message one step softer so greeting rises in perception | Chip + five lines bury the emotional center |
| **CTA optical center** | Mission bloom competes with Coach outline CTA of similar width; Ask Amy outline below border feels like a third peer | Mission bloom = sole gravity; Coach CTA optically lighter (ghost/secondary weight); Ask Amy further recessed | Three full-width controls = three centers |
| **Logo balance** | No top logo (good). “Today” meta reads almost as loud as greeting | Meta must whisper — greeting wins the optical duel | Meta currently fights hero |
| **Card weight** | Mission `shadow-md` + ring vs Coach `shadow-sm` — directionally right, but both read as equal **tiles** in a stack | Keep Mission heavier; Coach must feel like a quieter plate (less fill opacity / less edge) so gravity stays on Mission | Twin tiles flatten gravity |
| **Visual gravity** | Border-t before Ask Amy adds a second horizon line — eye stops mid-scroll | Prefer air over a hard rule; one horizon only if needed | Double separator = visual snag |
| **Whitespace** | Left column OK; vertical rhythm feels like a feed of equal blocks | More air above Mission than between later chapters so first viewport has one resting place | Feed ≠ composition |
| **Shadow balance** | Mission ring + shadow can bloom colder/harder than Nest light | Soften ring so shadow falls with room light, not as a UI halo | Ring reads as glow spam |
| **Glow balance** | Focus chip `primary/10` + Mission ring + primary CTAs — multiple warm spots | One warm locus (Mission bloom or focus — not both competing) | Split glow splits attention |
| **Typography balance** | `text-2xl` hero vs mission `text-lg` — mission title can out-shout greeting when card is heavy | Greeting optically larger/lighter weight; mission title strong but secondary to page hero | Card title steals page hero |

**Today verdict:** Gravity is almost right (Mission) but the header stack and peer CTAs pull the eye into a dashboard.

---

### 2. Ask Amy

| Check | Before | After | Reason |
|-------|--------|-------|--------|
| **Hero optical center** | Back icon + title in one row — title is **optically left-shifted** and undersized vs Today greeting; feels like utility chrome | Optical: title as page hero; back as whisper affordance (lighter, not competing in the same weight band) | Header row makes care feel like settings |
| **CTA optical center** | Full-width Start under a list of equal prompt cards — CTA feels **late and heavy**; prompts steal center | Let Start sit after a clear air pause; prompts slightly quieter so bloom is the rest point | List gravity > action gravity |
| **Logo balance** | N/A | — | — |
| **Card weight** | Every prompt is equal Soft/card weight — a wall of twins | Same component, but optical hierarchy via quieter type or softer fill on non-hover; no new component | Equal cards = no journey |
| **Visual gravity** | Conversation shell: top bar + black box — gravity unclear | Presence should settle in the conversation field, not the chrome bar | Chrome-first reads SaaS |
| **Whitespace** | Prompt gaps feel tight; right/left OK | Open vertical air above Start | CTA too close optically |
| **Shadow / glow** | Card borders + primary CTA — OK if borders quiet | Prefer luminous rim over hard border so glow stays on bloom | Hard borders add false weight |
| **Typography** | Heading `text-xl` vs Today `text-2xl` — Ask Amy feels like a child screen | Same optical hero band as Today (perception parity) | Hierarchy drift between tabs |

**Ask Amy verdict:** Mathematically tidy; optically a **tool header + list**. Nudge toward care hero + one action.

---

### 3. For Child

| Check | Before | After | Reason |
|-------|--------|-------|--------|
| **Hero optical center** | Title + hope line — OK start; then three equal section cards pull gravity **down and flat** | Hero owns first beat; section plates must feel like quiet shelves, not three heroes | Equal tiles kill center |
| **CTA optical center** | Guest save CTA under border — feels tacked on, optically low and tense | Air pause then single bloom; no border horizon fighting it | CTA floats under a cut line |
| **Card weight** | Three identical min-height cards — perfect math, wrong eye | Keep one component; vary optical density (first slightly present, others quieter) **or** more air so they don’t form a brick | Imbalanced only if identical — here they’re identically heavy |
| **Visual gravity** | No single well — three wells | One well: the child’s name in the hero | Name is the emotional center |
| **Whitespace** | Gaps feel arbitrary (20px habit) — stripes | Intentional shelves with shared left lock | Uneven perceived rhythm |
| **Shadow / glow** | Standard card chrome | Near-dissolve into atmosphere | Cards should disappear |
| **Typography** | Section titles compete with page H1 | Page H1 wins; section titles one full step quieter | Twin headline weights |

**For Child verdict:** Classic optical failure — **equal card gravity**.

---

### 4. Coach Discovery

| Check | Before | After | Reason |
|-------|--------|-------|--------|
| **Hero optical center** | Centered empty/prepare states — geometric center; orb/copy can sit **slightly low** in the viewport | Bias content block a touch **up** (optical center ~45%) | Dead-vertical center feels sunk |
| **CTA optical center** | Stacked full-width actions of similar weight | One bloom; others tertiary breath — optically recessed | Peer CTAs = dual centers |
| **Card weight** | Offer cards + Today Coach card | Today Coach must stay lighter than Mission forever | Weight inversion risk |
| **Glow** | Prepare rows with border state changes | Active row: soft fill, not neon border glow | Border glow = SaaS select |
| **Typography** | Centered headers good for ritual; list screens should return to left column | Ritual center only while preparing; list = left lock | Centered lists feel unanchored |

---

### 5. Mission Play + Success

| Check | Before | After | Reason |
|-------|--------|-------|--------|
| **Hero optical center (Play)** | Back control with negative margin — **floats** left of the column | Align back to the same optical column as title (no hanging icon) | Floating chrome |
| **CTA optical center (Play)** | Primary at end of steps — OK if air above; steps list can weigh heavier than CTA | Soften list weight so bloom remains the closer | List gravity |
| **Success — hero** | Check orb + rings centered — good ritual; uppercase label above title **steals** a beat | Whisper label; title is the honor line | Meta over hero |
| **Success — CTA** | CTA block below panel — can feel detached (two gravity wells: panel vs buttons) | Optically couple: panel mass → air → bloom as one landing, not a separate dock | Split composition |
| **Glow** | `ring-8` on success mark — warm, but easy to overglow next to panel gradient | One bloom pulse then rest; ring quieter than Mission page CTA | Glow competition |
| **Shadow** | Panel elevated — OK for honor; don’t add second shadow under CTAs | CTAs flat on atmosphere | Double elevation |
| **Typography** | Body `max-w-sm` centered — good line length; title tracking-tight OK | Keep; ensure short lines don’t look sparse/left-ragged in center | Optical rag |

---

### 6. Premium + Account gate

| Check | Before | After | Reason |
|-------|--------|-------|--------|
| **Hero optical center** | Centered “Keep going with Amy” — fine; support line can optically **equal** the hero | Support must fall away (mist, smaller perceived mass) | Two-line hero |
| **CTA optical center** | Plan rows + purchase CTAs — selected plan shadow + primary create **two warm centers** | Selection = soft plate only; purchase = sole bloom | Dual gravity |
| **Card weight** | Loading / offline / success / error cards use different visual mass | One plate language; state via type and one icon, not heavier borders (esp. destructive) | Imbalanced states |
| **Logo** | None — good | — | — |
| **Glow** | Success check circle `primary/15` + CTA | Icon quieter than Continue bloom | Icon must not outglow action |
| **Account gate** | Centered plate — title/CTA OK; busy stack can sink optically | Bias plate content slightly up inside the card | Sunk center |
| **Typography** | Plan price baseline row — price can optically overpower continuity story | Price as instrument; story remains hero | Commerce weight |

---

### 7. Guest Account Sheet

| Check | Before | After | Reason |
|-------|--------|-------|--------|
| **Hero optical center** | Sheet title left-aligned — good; sits a hair **high/cramped** under sheet top radius | Slightly more top air so title optically rests in the sheet’s upper third | Cramped top |
| **CTA optical center** | Primary + ghost stacked — ghost too close optically equals a second button | More air; ghost as breath (lighter, not full twin width energy) | Peer pair |
| **Card / sheet weight** | Scrim + sheet shadow — sheet should feel lifted once | One soft lift; scrim calm, not dramatic | Heavy modal theater |
| **Glow** | None extra — good | Keep glow off sheet chrome | — |
| **Whitespace** | Title→body→actions feel short of pause | Optical pause before bloom | CTA too close |

---

### 8. Front Door

| Check | Before | After | Reason |
|-------|--------|-------|--------|
| **Logo balance** | “AmyNest” `text-base font-semibold` **above** progress — **competes with** “Take a breath.” | Quieter wordmark (caption band); hero owns the room | Constitution: logo never competes |
| **Hero optical center** | Breath: orb centered, then left-aligned H1 under it — **axis break** (center orb / left type) | Either center the breath ritual as one axis, or left-lock orb with type — pick one optical story | Split axis feels accidental |
| **CTA optical center** | “I’m ready” full width under left-aligned copy — CTA center ≠ copy mass | Align bloom under the optical mass of the headline block (same column story) | CTA feels laterally orphaned |
| **Glow** | Orb `ring-8` + progress `bg-primary` fill — two warm instruments | Progress hairline quiet; orb is the only glow | Dual glow |
| **Visual gravity** | Progress bar under logo pulls eye to chrome before breath | Soften/thin progress; delay gravity to orb + line | Chrome-first |
| **Whitespace** | Top cluster logo+bar tight vs large hero below — top-heavy chrome, then air | Quieter top; hero rises into optical center of the step | Hero too low relative to chrome |
| **Typography** | Breath H1 strong; later steps similar — good. Age/worry tiles equal weight | Selected tile: soft fill, not heavy border glow | Selection weight |
| **Shadow** | Choice tiles bordered — flat is OK | Avoid selected shadow heavier than primary CTA | Inverted gravity |

**Front Door verdict:** Strongest emotional material; weakest **logo/axis** optical discipline.

---

### 9. Navigation + Calm prepare

| Check | Before | After | Reason |
|-------|--------|-------|--------|
| **Nav — visual gravity** | Active underline pill + primary color — chrome glows | Soft fill only; no underline bloom (Constitution) | Nav must never outglow page CTA |
| **Nav — balance** | Three tabs mathematically even — labels of different length (“Quick help” vs “Today”) make icons feel **optically uneven** | Bias icon/label as one unit; accept optical center per tab, not perfect string center | Long labels shift weight |
| **Nav — shadow** | Upward `shadow-[0_-6px_24px…]` — heavy shelf | Softer lift so content doesn’t feel crushed | Shadow too loud |
| **Safe area** | Content clearance vs home indicator — if last CTA sits in the “danger band,” it feels **low** even if padded | Optical: last bloom rests above the nav’s visual mass, not kissing it | CTA too low |
| **Calm prepare** | Centered stack — geometric mid; can feel **sunk** | Bias block upward to optical center | Dead center = heavy |
| **Prepare glow** | Pulse bar | Softer than any page bloom | Loading must not outshine destination |

---

## Cross-cutting defect list

| Symptom | Where it shows | Optical move |
|---------|----------------|--------------|
| Mathematically centered, visually low | Coach prepare · Calm loading · Premium center stacks | Nudge block **up** ~optical 45% |
| Hero too low | Today (chip stack) · Front Door (under loud logo/bar) | Quiet chrome above; let hero rise |
| Hero too high | Rare; over-large top safe + tiny content | Keep top air; don’t pin hero to status bar |
| CTA too close | Sheets · Ask Amy · For Child guest · Success dock | Air pause; tertiary lighter |
| Floating objects | Ask Amy/Mission back icons · nav 4px gaps | Lock to column; no negative hang |
| Uneven spacing (felt) | Today vs Ask Amy chapter air | Same breath — see Spatial Rhythm |
| Imbalanced cards | For Child trio · Mission vs Coach | One heavy, others dissolve |
| Visual tension | Borders + rings + underlines + primary chips | One warm locus |
| Logo over hero | Front Door wordmark | Caption quiet |
| Glow imbalance | Mission ring + chip + CTA + nav underline | Bloom + Amy only |
| Shadow imbalance | Nav shelf · Mission md vs everything sm | One light direction; primary ≥ secondary |
| Typography imbalance | Utility headers · uppercase labels · plan prices | One loud line; instruments whisper |

---

## Optical checklist (ship gate)

Before any future presentation pass ships:

- [ ] Squint test: **one** dark/warm mass in the first viewport  
- [ ] Hero sits in upper optical band (not geometric mid, not under chrome)  
- [ ] Logo/wordmark loses to headline  
- [ ] Primary bloom is the only glowing control  
- [ ] Secondary plates feel lighter than the supporting object  
- [ ] No hanging icons outside the column  
- [ ] Centered rituals keep a **single vertical axis**  
- [ ] Left-lock screens share one quiet left edge (hero · body · plate)  
- [ ] Last CTA clears nav optically, not only mathematically  
- [ ] Shadows fall with the room’s key light — one story  

---

## Relationship to other locks

| Doc | Job |
|-----|-----|
| Design Constitution | What materials & scales exist |
| Spatial Rhythm Audit | Which ladder values spacing uses |
| **Optical Alignment (this)** | Where the eye believes things sit — nudge even when math is “correct” |

Spacing can be on-ladder and still optically wrong.  
Optical nudges must still land on the spacing ladder when implemented later.

---

## Closing

Math centers boxes.  
Parents see weight, light, and calm.

Move what feels wrong.  
Do not invent components.  
Do not redesign features.

**STOP.** Optical audit complete. No implementation.
