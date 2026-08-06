# AmyNest V2 — Founder Emotion Pass  
## Luxury Motion & Premium Feel · Design Director Review

**Status:** APPROVED · Craft implementation landed (reuse `experience-system`)  
**Implementation note:** See Emotion Pass Implementation output in chat / git.  

**Scope:** Visible V2 surfaces (Front Door → Today → Mission → Success → Premium → Sheets → Nav)  
**Frozen:** Architecture · Navigation · Analytics · Premium flow · Features · Redesign of IA  

**Reference craft (not visuals):** Apple HIG · Headspace · Calm · Linear · Arc · Superhuman · Disney emotional motion · Stripe · Notion Calendar  

---

# 1. Overall Emotion Score

| Dimension | Score (/10) | Note |
|-----------|------------:|------|
| Motion Quality | 3.5 | Near-still. Shared `experience-system` tokens unused by V2 |
| Visual Weight | 5.5 | Clear hierarchy on Today; card monoculture elsewhere |
| Emotional Value | 7.0 | Copy leads; chrome does not land the feeling |
| Touch Feel | 4.0 | Button elevate only; chips/nav/cards lack press language |
| Perceived Performance | 6.5 | Instant swaps feel “cheap fast,” not “confident smooth” |
| Premium Feel | 4.5 | Calm restraint yes; luxury craft no |
| **Overall Emotion** | **5.2 / 10** | Strong product bones. Not yet ₹299/month expensive |

**Director read:** A parent who paid would trust the *words*. They would not yet feel the *object*.

---

# 2. Top 50 Premium Polish Opportunities

*Sorted by impact × frequency. Architecture / nav / Premium flow stay frozen — polish only.*

| # | Opportunity | Impact | Screens |
|---|-------------|--------|---------|
| 1 | Unified motion language for all V2 surfaces (one system) | Critical | All |
| 2 | Today “wake up” — progressive section reveal (Mission → Premium → Ask Amy) | Critical | Today |
| 3 | Mission Success entrance — calm ring-close feel (no confetti) | Critical | Success |
| 4 | Guest account sheet: enter/exit spring + scrim fade (not instant mount) | Critical | Sheet |
| 5 | Bottom nav magnetic indicator glide (layout spring, no bounce) | Critical | Nav |
| 6 | Button press depth system (scale + shadow + release timing) | Critical | All CTAs |
| 7 | Unifyate Front Door teal/stone vs Today shadcn primary palette fork | High | FD ↔ Today |
| 8 | Front Door step transitions (crossfade / soft advance, not hard swap) | High | Front Door |
| 9 | Age/Worry chip press compression + selected settle | High | Front Door |
| 10 | Mission play → success phase choreography (focus handoff) | High | Mission |
| 11 | Tab icon subtle breath on select (opacity/weight, never bounce) | High | Nav |
| 12 | Restore legacy-quality press on V2 tabs (`PRESS_FEEDBACK` class of feel) | High | Nav |
| 13 | Account Required gate: aspirational panel, not empty utility stack | High | Premium gate |
| 14 | Premium ready state: quieter aspiration (depth, not sales density) | High | Premium |
| 15 | Card lift language (one soft shadow interpolation recipe) | High | Mission / Premium |
| 16 | Greeting line soft settle on Today open | High | Today |
| 17 | Mission “Mark complete” → ritual press (confidence, not task-app) | High | Mission |
| 18 | Reduced-motion path for every choreographed moment | High | All |
| 19 | Haptics map: light / success / selection (iOS + Android) | High | Key moments |
| 20 | Loading language: replace bare “Loading…” with confident quiet pulse | Med-High | Premium |
| 21 | Skeleton language aligned to experience-system (not default pulse) | Med-High | Ask Amy shells |
| 22 | Overlay scrim: fade + blur consistency (sheet vs future modals) | Med-High | Sheet |
| 23 | Progress bar on Front Door: eased fill with step meaning | Med | Front Door |
| 24 | Brand presence: AmyNest as quiet hero signal on first viewport | Med | Front Door |
| 25 | Remove “form wizard” density feel on Age/Worry lists | Med | Front Door |
| 26 | Mission steps card → stage presence (still readable, less checklist) | Med | Mission |
| 27 | Success check mark: soft scale-in + ring settle (Fitness-ring calm) | Med | Success |
| 28 | “Back to Today” as intentional return, not default primary dump | Med | Success |
| 29 | Premium plan card selection: magnetic settle, not color flash only | Med | Premium |
| 30 | Offline / error Premium states: branded calm, not system alert leftover | Med | Premium |
| 31 | Typography vertical rhythm audit (8pt cadence, reading comfort) | Med | Today / FD |
| 32 | Header quieting: guest chrome already quieter — extend calm spacing | Med | Layout + Today |
| 33 | Empty / waiting states: intentional stillness with brand breath | Med | Loading |
| 34 | Focus transitions: one element owns attention per beat | Med | All |
| 35 | Interruptions: sheet open cancels in-flight page reveals cleanly | Med | Sheet + Today |
| 36 | Desktop hover: card/nav lift only where mouse exists | Med | Desktop |
| 37 | Ripple philosophy: prefer depth over Material ink | Med | Android |
| 38 | Glass/blur only on nav + sheet scrim — nowhere else flashy | Med | Nav / Sheet |
| 39 | Soft noise/grain optional on Front Door wash only (barely there) | Low-Med | Front Door |
| 40 | Glow: forbid decorative glow; allow 1 success ring only | Low-Med | Success |
| 41 | Morning vs night open: ambient tint shift (subtle, not theme flip) | Low-Med | Today |
| 42 | Return tomorrow acknowledgment (quiet, once) | Low-Med | Today |
| 43 | Account created soft confirmation (not toast spam) | Low-Med | Post-auth |
| 44 | Premium unlocked ceremony (calm, 1.2s max) | Low-Med | Premium success |
| 45 | Kill static `scale-105` without transition on nav icons | Low | Nav |
| 46 | Standardize `rounded-xl` / `rounded-2xl` radius ladder | Low | All |
| 47 | Shadow token ladder (0 / rest / lift / modal) — no ad-hoc | Low | All |
| 48 | Remove developer placeholder energy (inspector visual noise in dogfood) | Low | Dev chrome |
| 49 | Align Front Door CTA color to brand primary tokens | Low | Front Door |
| 50 | Document “never animate for cool” checklist in PR review | Process | Team |

---

# 3. Motion Design System

## Philosophy

> **Motion explains state. Stillness protects trust.**  
> Prefer one confident move over three decorative ones.  
> If a parent cannot feel *why* it moved, delete it.

Communication verbs only:

| Verb | Meaning | Example |
|------|---------|---------|
| **Arrive** | Content earns its place | Today sections stagger in |
| **Focus** | Attention moves here | Mission CTA settles after reveal |
| **Succeed** | Closure without celebration noise | Success ring soft-closes |
| **Transition** | Place changes with continuity | Front Door step advance |
| **Hierarchy** | What matters rises | Mission lifts above Premium |

## Durations

| Token | ms | Use |
|-------|---:|-----|
| `instant` | 0 | Reduced-motion fallback snaps |
| `micro` | 120 | Button press / release |
| `ui` | 180 | Chips, tabs, color settles |
| `content` | 250 | Section reveal, sheet content |
| `scene` | 320–400 | Page/section wake, success enter |
| `ambient` | 600–900 | Rare breath loops (icons, never bounce) |

*Align mentally with existing app `MOTION_MS` (120 / 180 / 250) — V2 should finally consume one language.*

## Easing

| Name | Curve intent | Use |
|------|--------------|-----|
| `enter` | Ease-out, slight deceleration | Arrivals |
| `exit` | Ease-in, shorter | Dismissals |
| `settle` | Soft ease-out | Selection magnets |
| `press` | Near-linear down, ease-out up | Buttons |

Avoid elastic / overshoot on parent-facing surfaces.

## Springs

| Spring | Feel | Use |
|--------|------|-----|
| `magnetic` | Low bounce, medium stiffness | Tab indicator |
| `sheet` | Heavier, damped | Bottom sheet |
| `softScale` | Tiny overshoot ≤1.02 then settle | Success mark only |

## Momentum & gestures

- Sheet: drag-to-dismiss optional later; for now scrim + button with fade  
- Nav: indicator tracks selection with layout continuity  
- No parallax on scroll for V2 dogfood surfaces  

## Gesture / micro response

| Input | Response |
|-------|----------|
| Finger down | Compress 0.97–0.98, shadow down |
| Finger up | 120ms release to rest |
| Select | Magnetic settle 180ms |
| Cancel / Not now | Exit faster than enter (respect time) |

## Focus transitions

One hero focus per beat. Never animate headline + card + CTA + nav together.

## Interruptions

- Opening sheet freezes page reveals  
- Route change cancels in-flight staggers  
- Never queue delight behind a gate  

## Reduced motion

If `prefers-reduced-motion: reduce`:

- Crossfades → opacity 0→1 in ≤120ms or instant  
- No springs, no ambient breath  
- Keep haptics optional / off if system reduce is on  

## Haptics (iOS + Android)

| Event | Haptic |
|-------|--------|
| Primary button press | Light impact |
| Chip / tab select | Selection |
| Mission complete | Soft success (once) |
| Sheet open | Light |
| Purchase success | Success (native) |
| Error | Warning (rare) |

Never haptic on scroll or ambient loops.

---

# 4. Micro Interaction System

## Buttons

| Phase | Spec |
|-------|------|
| Rest | Clear elevation ladder step 0 |
| Press | Scale 0.97–0.98 · shadow collapses · 80–120ms |
| Hold | No jitter |
| Release | Ease-out to 1.0 · 120–160ms |
| Ripple | **Prefer none** on iOS; Android: constrained opacity wash, not Material ink flood |

## Cards

| State | Spec |
|-------|------|
| Rest | Border + soft shadow token `rest` |
| Press (if tappable) | Compress 0.99 · shadow → `press` |
| Desktop hover | Lift 1–2px · shadow → `lift` · 180ms |
| Mission complete badge | Soft tint settle, no bounce |

## Mission completion (no confetti)

1. CTA press depth  
2. Brief focus hold (≤200ms)  
3. Success panel arrives: opacity + 8–12px rise + check ring soft-scale  
4. Copy readable immediately (never wait on animation to show meaning)  
5. Total ceremony ≤ ~700ms  

Think **Apple Fitness ring close** — calm certainty.

## Nav

- Indicator: layout spring, magnetic  
- Icon: weight/opacity breath ≤3%  
- **Never bounce**  

## Sheets

- Enter: 280–320ms sheet spring from bottom  
- Scrim: fade 200ms  
- Exit: 200ms (faster)  

## Typography / rhythm

- Maintain Today hierarchy: Mission weight > Premium > Ask Amy  
- Vertical cadence: 8 / 16 / 24 / 32 — avoid random `gap-5`/`gap-6` mixes without reason  
- Eye path: eyebrow → headline → one sentence → primary action  

---

# 5. Premium Visual Language

## Principles

1. **Quiet materials** — depth over decoration  
2. **One atmosphere per journey** — Front Door wash may differ; Today/Mission/Premium must feel one family  
3. **Glass only where chrome floats** — tab bar, sheet scrim  
4. **Glow is earned** — success ring only  
5. **No flash** — if it could be a Framer template, cut it  

## Allowed

| Material | Where |
|----------|--------|
| Soft vertical wash | Front Door; optional dawn/dusk Today tint |
| Backdrop blur | Tab bar, sheet overlay |
| Soft primary wash | Success / Premium success panels |
| Hairline borders | Cards at rest |
| Shadow ladder | Rest / Lift / Modal |

## Forbidden (for this pass)

- Confetti, streaks, points bursts  
- Multi-layer neon glow  
- Purple-on-white SaaS cliché stacks as “premium”  
- Aggressive paywall urgency (timers, scarcity badges)  
- Bounce / elastic marketing motion  

## Palette craft debt

Front Door currently speaks **stone/teal/amber**; Today/Premium speak **token primary/muted**.  
Before luxury lands, **one brand voice** must win — same confidence as Headspace: recognizable without shouting.

---

# 6. Per-Screen Recommendations

### Front Door — Luxury 6.0

| Axis | /10 | Note |
|------|----:|------|
| Motion | 4 | Progress only; steps hard-cut |
| Weight | 7 | Breath step is the best composition in V2 |
| Emotion | 8 | Copy is already premium |
| Touch | 4 | Chips are dead under finger |
| Perf feel | 7 | Fast, but unchoreographed |
| Premium | 6 | Atmosphere yes; wizard residue yes |

**Do:** Soft step advance · chip press · brand presence · unify color to system  
**Don't:** Add illustration collage or playful bounce  

### Today — Luxury 5.0

| Axis | /10 |
|------|----:|
| Motion | 2 |
| Weight | 7 |
| Emotion | 7 |
| Touch | 4 |
| Perf feel | 6 |
| Premium | 4 |

**Do:** Wake-up stagger · greeting settle · mission card as hero object  
**Don't:** Dashboard card spam or simultaneous fade-all  

### Mission Play — Luxury 4.0

| Axis | /10 |
|------|----:|
| Motion | 2 |
| Weight | 5 |
| Emotion | 5 |
| Touch | 4 |
| Perf feel | 6 |
| Premium | 3 |

**Do:** Stage presence for steps · ritual complete CTA · phase handoff to success  
**Don't:** Gamification chrome  

### Mission Success — Luxury 6.5

| Axis | /10 |
|------|----:|
| Motion | 2 |
| Weight | 8 |
| Emotion | 8 |
| Touch | 4 |
| Perf feel | 5 |
| Premium | 6 |

**Do:** Ring-close entrance · keep copy · calm return  
**Don't:** Confetti, badge showers, streaks  

### Premium / Account Required — Luxury 4.0

| Axis | /10 |
|------|----:|
| Motion | 3 |
| Weight | 5 |
| Emotion | 4 |
| Touch | 4 |
| Perf feel | 5 |
| Premium | 4 |

**Do:** Aspirational stillness · plan magnetic select · gate as invitation panel  
**Don't:** Sales urgency, dense feature laundry lists as motion  

### Guest Account Sheet — Luxury 3.5

| Axis | /10 |
|------|----:|
| Motion | 1 |
| Weight | 5 |
| Emotion | 5 |
| Touch | 4 |
| Perf feel | 3 |
| Premium | 3 |

**Do:** Real sheet choreography · scrim · Continue as confident primary  
**Don't:** Instant mount/unmount  

### Bottom Navigation — Luxury 3.5

| Axis | /10 |
|------|----:|
| Motion | 2 |
| Weight | 5 |
| Emotion | 3 |
| Touch | 3 |
| Perf feel | 5 |
| Premium | 3 |

**Do:** Magnetic indicator · press · icon breath  
**Don't:** Bounce, FAB circus, re-architecture  

### Buttons / Cards / Headers / Loading / Empty

| Surface | Score | Fix direction |
|---------|------:|---------------|
| Buttons | 5 | Depth system over elevate wash alone |
| Cards | 4 | One lift language; kill monoculture boredom |
| Headers | 6 | Quiet already; improve rhythm |
| Loading | 3 | Confident pulse, never blank “Loading…” |
| Empty space | 7 | Protect Breath / Success air — don't fill |

---

# 7. Quick Wins (1 day)

*Craft only. No IA change.*

1. Sheet enter/exit + scrim fade  
2. Button press scale + release timing on V2 primary CTAs  
3. Today section opacity/translate stagger (Mission → Premium → Ask Amy)  
4. Success panel soft enter + check scale-in  
5. Nav indicator transition (even CSS `transform` glide if spring later)  
6. Chip `:active` compression on Front Door  
7. Kill static nav `scale-105` without transition  
8. Premium “Loading…” → quiet pulse pattern  
9. `prefers-reduced-motion` hard cuts for the above  
10. One haptic on Mission complete (native bridge if already available)

---

# 8. Medium Wins (1 week)

1. Full V2 motion tokens wired (durations/easing/springs)  
2. Front Door step choreography + palette unification  
3. Mission play → success focus handoff  
4. Account Required / Premium aspiration panel treatment  
5. Card shadow ladder + desktop hover lift  
6. Haptics map across select / success / sheet  
7. Skeleton system parity with app experience tokens  
8. Morning/night ambient tint (subtle)  
9. Interruptible animation controller (cancel on navigate/sheet)  
10. Dogfood build: hide runtime inspector chrome  

---

# 9. World-Class Wins (future)

*Still not redesign of product — craft ceiling.*

1. Disney-grade emotional continuity across multi-day return  
2. Mission as living stage (presence without Speech-engine scope creep)  
3. Premium unlock as memorable 1.2s ceremony parents describe later  
4. Predictive calm: system feels like it anticipated the next thumb  
5. Cross-surface material system (glass/depth) equal to Arc/Linear discipline  
6. Founder-grade motion QA checklist in every release gate  

---

# 10. Micro Delights (quiet, adult)

| Moment | Delight (craft) | Avoid |
|--------|-----------------|-------|
| Mission completed | Soft ring settle + light haptic | Confetti |
| Today's message | Line settles after greeting | Typewriter gimmick |
| Greeting | Name lands with warmth, no bounce | “Hey buddy” energy |
| Returning tomorrow | One quiet acknowledgment | Streak pressure |
| Premium unlocked | Breath + check, then stillness | Sales fireworks |
| Account created | Soft confirmation, return intact | Modal stack |
| Morning open | Cooler wash / clearer air | Loud animation |
| Night open | Warmer, dimmer wash | Dark-mode flash |

---

# 11. Founder Verdict

### If Steve Jobs, Jony Ive, Headspace’s design team, and Disney’s interaction designers reviewed this build…

#### They would praise

- **Emotional honesty in copy** — “Take a breath.” / “That was a real step.” / parent-facing Today greeting  
- **Restraint** — no confetti, no streak carnival, Ask Amy demoted correctly  
- **Clear hierarchy intent** on Today (Mission → Premium → Ask Amy)  
- **Front Door Breath composition** — rare calm in mobile onboarding  
- **Product courage to freeze architecture** and ask for craft, not features  

#### They would reject

- **Motion vacuum** dressed up as minimalism — stillness without choreography feels unfinished, not Zen  
- **Two visual dialects** (Front Door teal world vs shadcn Today) — luxury brands speak one material language  
- **Instant sheet / hard step cuts** — communicate “engineer mounted a div,” not “object arrived”  
- **Nav that regressed** vs the app’s own richer tab craft — parents feel the downgrade in their thumb  
- **Transactional Premium / account gates** — Headspace would call this *uncared-for*  
- **Template card stacks** — Stripe-level products earn every border  

#### Verdict line

> **Ship the words. Elevate the object.**  
> At ₹299/month, AmyNest must feel held — not merely correct.  
> Current score **5.2 / 10**. With Quick + Medium wins, a credible **8+** is available without touching architecture, navigation IA, analytics, or Premium flow logic.

---

## Remove list (feel, not features)

| Feels like | Where sensed |
|------------|--------------|
| Template SaaS sections | Today / Premium stacks |
| Material/Bootstrap sheet | Guest account instant modal |
| Shadcn default card | Mission / plan cards |
| Onboarding wizard | Age/Worry chip lists |
| Developer dogfood chrome | Runtime inspector in parent view |
| Framer-demo absence | No motion at all on Success |

---

**STOP.** No implementation from this pass. Review → prioritize Quick Wins → only then authorize a craft sprint under freeze rules.
