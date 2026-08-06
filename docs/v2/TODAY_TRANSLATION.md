# Today Translation — Nest Presence from Day One

**Mode:** Translation only. No code. No mockups. No redesign exploration.  
**Frozen:** Constitution · Product · Features · Brain · Architecture · Routes  
**Surface:** `TodayPage` · `MissionSection` · `CoachDiscoveryCard` · Ask Amy / Premium entries  
**Jury rule:** Apple · Headspace · Airbnb · Linear — if **all four say NO → DELETE.**

---

## Day One question

Is this a dashboard? Or today's parenting companion?

**Today, as shipped, is a dashboard.**

It stacks Focus chip · Greeting · Message · Mission Soft Plate · Coach Soft Plate · Ask Amy chapter · Premium chapter — then quieted with opacity and called Law of Three. A Nest Presence Today would be a companion: one held moment, one step, one Amy breath. Not a home of equal modules.

If Today had been designed from Day One as Nest Presence, this stacked chapter list would not exist.

---

## Audit by object family

### Focus

| Current | Decision | WHY |
|---------|----------|-----|
| Focus banner chip: “Today's focus: {Worry}” as `V2_CHIP` + `data-v2-law="hero"` | **MERGE** | Worry *is* the emotional hero — but a caption chip is an instrument, not a companion presence. Merge focus into the greeting/message hero line. Do not keep a status pill as hero. |
| Focus as separate optical hero above H1 | **DELETE** (as layout role) | Two heroes (chip + greeting) = dashboard header. |
| Worry memory itself (product truth) | **KEEP** | Amy remembering why we are here is Nest. Form changes; memory stays. |

### Greeting

| Current | Decision | WHY |
|---------|----------|-----|
| H1 “Today's step for {name}” / “Here's today's activity” | **MERGE** | Keep the care of naming the child; merge with focus so one headline holds name + concern + day. “Activity” is SaaS. |
| Greeting as `text-2xl` peer when focus exists | **DELETE** (as second hero) | Peer weight fights Law of Three. One hero only. |
| Subline “For your {age} child.” | **WHISPER** or **DELETE** | Age context is product-true but rarely needed on the daily breath; whisper if kept, never a second line of chrome. |
| Eyebrow “Today” (`text-sm`) | **WHISPER** | Orienting label OK if mist; never competes. |

### Focus Banner (explicit)

| Current | Decision | WHY |
|---------|----------|-----|
| Soft Plate chip banner | **DELETE** | Template instrument. Apple/Linear NO as hero object. |
| Copy pattern “Today's focus: Sleep” | **MERGE** into hero prose | Keep meaning; kill filing-cabinet label. |

### Support objects

| Current | Decision | WHY |
|---------|----------|-----|
| Amy message (“Amy remembers… Today's step is ready.”) | **KEEP** | Sole “Amy is with you” support — Law of Three Support. |
| Message at `text-sm` invent type | **MERGE** into Constitution body/support role | Keep words; kill undersized SaaS caption feel. |
| `buildMissionWhyLine` (exists, unused on page) | **MERGE** or leave unused | Do not add a fourth support line on Today. Why belongs inside Mission or Message — not another chapter. |

### Mission

| Current | Decision | WHY |
|---------|----------|-----|
| One Speech mission (product) | **KEEP** | The day's step. Primary action destination. |
| Mission Soft Plate card | **KEEP** (as the one plate) or **MERGE** into Atmosphere | One object may sit in Soft Plate; it must not look like Card #1 of N. Prefer Atmosphere + Bloom if the plate twins Coach. |
| Eyebrow “Right now” uppercase | **DELETE** | Filing cabinet. Unanimous NO. |
| Mission title | **KEEP** | Names the step. |
| Meta “2 min · easy” | **WHISPER** or **DELETE** | Product meta; anxiety/instrument. Whisper duration only if useful; difficulty label is gamification — **DELETE**. |
| Mission summary | **KEEP** · **WHISPER** weight | Explains the step; support under title, not a second headline. |
| Primary CTA → `/today/mission` | **KEEP** | The one Bloom. Inevitable. |
| Completed chip “Completed today” + check | **KEEP** · **WHISPER** | Status after care — quiet, not trophy. |
| Twin Soft Plate weight vs Coach | **DELETE** democracy | Mission alone may feel plated; Coach must not match silhouette. |

### Coach

| Current | Decision | WHY |
|---------|----------|-----|
| Coach as product capability / route | **KEEP** (capability) | Long-term care exists — not deleted as product. |
| Coach Soft Plate card on Today (peer of Mission) | **DELETE** from Today home | Same card language as Mission = dashboard. All four juries: do not put long-term next to today's one step as a second module. |
| Eyebrow “Amy Coach · Long-term” | **DELETE** | Domain taxonomy on home. |
| Outline secondary CTA on Today | **DELETE** (from Today) | Second button language on home. |
| Coach discovery elsewhere (success, dedicated path) | **WHISPER** / relocate | Return-to-care can offer Coach after Mission — not as Today chapter #2. |

*Translation:* Coach does not disappear from AmyNest. It disappears from the Today *dashboard stack*.

### Ask Amy

| Current | Decision | WHY |
|---------|----------|-----|
| Ask Amy entry route `/ask-amy` | **KEEP** (capability) | Help must remain reachable. |
| Ask Amy as Today section (title + support + outline CTA) | **DELETE** from Today home | Third chapter. Recede opacity ≠ companion. Sleep-deprived parent sees another button. |
| Worry-flavored Ask Amy copy | **MERGE** into Mission support or nav Help | Meaning can live; the section cannot. |
| Outline `GuestAccountCta` on Today | **DELETE** (from Today) | Fourth button language. Nav already has Help. |

*Translation:* Ask Amy is Help — whisper in nav / after need — not a home module.

### Premium

| Current | Decision | WHY |
|---------|----------|-----|
| Premium route `/premium` | **KEEP** (capability) | Continuity product frozen. |
| Premium section on Today (“Keep going with Amy” + ghost CTA) | **DELETE** from Today home | Conversion chapter on the daily companion. Headspace/Apple NO. |
| Continuity ask after soft-save / signup moments | **WHISPER** elsewhere | Premium is a letter at the right time — not a fifth home button. |

### Cards

| Current | Decision | WHY |
|---------|----------|-----|
| Mission Soft Plate | **KEEP** (one) or Atmosphere merge | The day's object — only plate allowed on home. |
| Coach Soft Plate | **DELETE** from Today | Twin card = dashboard. |
| Focus chip-as-card | **DELETE** | Instrument card. |
| Stack of Soft Plates | **DELETE** | Manufacturing defect of “Nest card feed.” |

### Hierarchy / Law of Three

| Current claimed | Lived reality | Decision |
|-----------------|---------------|----------|
| Hero = Focus chip | Chip is not emotional hero | **MERGE** hero into one greeting/focus breath |
| Primary = Mission CTA | Correct intent | **KEEP** |
| Support = Amy message | Correct intent | **KEEP** |
| Coach / Ask Amy / Premium = opacity recede | Still visible chapters = dashboard | **DELETE** from Today composition |
| `data-v2-law` + `opacity-70/80` | Theater | **DELETE** as strategy — edit the page, don't dim the warehouse |

**Law of Three lived (after translation):**

| Role | Survives |
|------|----------|
| Emotional hero | One line: child + concern + today (merged greeting/focus) |
| Primary action | Mission Bloom only |
| Supporting object | Amy message only |

Everything else off Today home.

---

## Full element table

| Current element | Decision | WHY |
|-----------------|----------|-----|
| Shell Atmosphere + lighting | **KEEP** | Nest field. |
| Eyebrow “Today” | **WHISPER** | Orient only. |
| Focus chip banner | **DELETE** | Instrument hero. |
| Focus meaning (worry) | **MERGE** into hero | Memory without chip. |
| Greeting H1 | **MERGE** with focus | One hero headline. |
| Greeting age subline | **WHISPER** / **DELETE** | Rarely needed daily. |
| Amy message | **KEEP** | Support. |
| Mission card / step | **KEEP** | Companion's one ask. |
| “Right now” eyebrow | **DELETE** | Taxonomy. |
| Duration · difficulty meta | **WHISPER** duration / **DELETE** difficulty | Less product, more care. |
| Mission summary | **KEEP** | Step clarity. |
| Mission Bloom CTA | **KEEP** | Only primary. |
| Completed today badge | **WHISPER** | Quiet status. |
| Coach Soft Plate on Today | **DELETE** | Dashboard twin. |
| Coach product / routes | **KEEP** | Elsewhere, earned. |
| Ask Amy Today section | **DELETE** | Chapter #3. |
| Ask Amy route / nav Help | **KEEP** | Whisper access. |
| Premium Today section | **DELETE** | Conversion on home. |
| Premium route | **KEEP** | Continuity elsewhere. |
| Outline / ghost CTA variants on Today | **DELETE** | Button democracy. |
| Content-reveal stagger of 4–5 chapters | **DELETE** | Motion that announces a feed. |
| Opacity Law of Three | **DELETE** | Not hierarchy. |

---

## Decision tally

| Decision | Meaning |
|----------|---------|
| **DELETE** | Focus chip-as-hero · “Right now” · difficulty meta · Coach card on Today · Ask Amy section · Premium section · outline/ghost CTAs · opacity theater · chapter stagger-as-feed |
| **KEEP** | Atmosphere · worry memory · Amy message · one Mission · Mission Bloom · routes/capabilities for Coach/Ask Amy/Premium off-home |
| **MERGE** | Greeting + focus into one hero · Mission as sole plate/object · why-line into message/mission if needed |
| **WHISPER** | “Today” label · age subline · duration · completed badge · Coach/Ask Amy/Premium *elsewhere* |

---

## Surviving Today (almost empty)

A tired parent opens Today and sees:

1. Soft Nest light  
2. One calm hero line (name + what matters today)  
3. One Amy breath (message)  
4. One step (mission) with one Bloom  

No Coach card. No Ask Amy block. No Premium block. No focus pill. No second Soft Plate.

Help and long-term care remain in the product — not as home dashboard tiles.

---

## Verdict

| Question | Answer |
|----------|--------|
| Dashboard or companion? | **Now: dashboard. After translation: companion.** |
| Would Apple keep this Today? | **NO** — stacked modules. |
| Would Headspace keep it? | **NO** — too many asks. |
| Would Airbnb keep it? | **NO** — feels like an app home, not a hosted morning. |
| Would Linear keep it? | **NO** — opacity hierarchy is unfinished craft. |

---

## What Today would feel like if AmyNest had never been a SaaS product

You open the day and the room is quiet. Amy has not laid out a control panel. She remembers what keeps you up — and your child's name — in one soft line. Under that, one short reassurance that she is with you. Then one clear step for right now, and one warm action to begin.

No second card for a long-term program. No third door into chat. No fourth ask to save progress. Those doors exist when the moment earns them — after a step, in Help, when continuity matters — not as furniture on the daily home.

Today is not where you manage AmyNest. Today is where Amy meets you.

---

## STOP

Translation complete. No code. No mockups. No next screen.
