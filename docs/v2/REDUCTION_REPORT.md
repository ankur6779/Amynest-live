# AmyNest V2 — Luxury Reduction Report

**Status:** Reduction audit only — **no implementation · no redesign · no new visuals**  
**Law:** Beautiful products are created by removing.  
**Stop when:** Removing anything else would reduce clarity.  
**Companions:** [`DESIGN_CONSTITUTION.md`](./DESIGN_CONSTITUTION.md) · [`OPTICAL_ALIGNMENT.md`](./OPTICAL_ALIGNMENT.md) · [`SPATIAL_RHYTHM_AUDIT.md`](./SPATIAL_RHYTHM_AUDIT.md)

---

## Method

For every screen, ask until the answer is no:

1. Can one **element** disappear?  
2. Can one **divider** disappear?  
3. Can one **subtitle** disappear?  
4. Can one **shadow** disappear?  
5. Can one **glow** disappear?  
6. Can one **card** disappear?  
7. Can one **icon** disappear?

Below: what **must go** (luxury reduction). What **must stay** is listed per screen at the stop line.

---

## Global reductions (every shell)

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| Hard `border` on Soft Plates / cards (default) | Constitution: plates dissolve into atmosphere | Surfaces breathe; less SaaS outline | Less “form to fill,” more room to rest |
| Dual elevation (`shadow-md` + `ring` together) | One light story — ring **or** soft shadow, not both | Cleaner silhouette | Less anxious polish |
| Nav upward shelf shadow (`0_-6px_24px`) | Nav is whisper instrument, not a floating dock | Page content no longer crushed | Quieter feet on the ground |
| Nav active **underline pill** | Active = soft fill + label weight only | Less chrome glow | Tab bar stops competing with bloom |
| Nav `border-t` as hard rule | Sheet Glass edge is enough | Softer horizon | Less “app chrome” |
| Decorative Lucide beside titles when label exists | Icon is not the supporting object | Cleaner type column | Less instructional coldness |
| Uppercase tracked eyebrow labels as default | Filing-cabinet smell | Hero rises | Less software, more care |
| Second warm glow when bloom or orb already glows | One locus of light | Single light story | Nervous system calms |

---

## 1. Today

### Round 1–4 removals

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| **“Today” page label** | Tab already says Today; redundant eyebrow | Hero greeting lifts immediately | Arrival feels personal, not labeled |
| **Focus chip chrome** (pill fill / primary wash) | Focus can be a quiet caption line — or fold into greeting; chip is glow spam | One less warm blob | Less “status badge” parenting |
| **Greeting subline** when message repeats the same job | Two soft paragraphs under hero = subtitle pile | One body breath | Less to process when tired |
| **Mission eyebrow “Right now”** | Mission plate + CTA already say now | Cleaner plate | Less coaching-centre signage |
| **Mission `ring-1 ring-primary/10`** | Keep at most one soft shadow; ring is extra glow | Plate quieter | Mission feels held, not highlighted by marketing |
| **Coach eyebrow “Amy Coach · Long-term”** | Headline already carries Coach; “Long-term” is meta | Shorter card | Less curriculum language |
| **Ask Amy `border-t`** | Chapter air is enough | No hard cut | Scroll feels continuous |
| **Ask Amy section title** when CTA label is clear | Title + support + CTA = three lines for one action | One support line + bloom (or bloom alone) | Asking Amy feels easier |
| **Ask Amy support** if CTA is self-explanatory | Subtitle test fails | More air above action | Less persuasion |
| **Premium section title “Keep going with Amy”** | Ghost CTA text can carry the idea | One breath link | Premium doesn’t become a chapter headline |
| **Coach card as equal twin tile** (visual weight) — *reduce weight to near-atmosphere; if empty of unique value in a given state, omit the card entirely* | Law of three: Mission is the support object | First viewport = hero + mission + bloom | Parent isn’t managed by a second product card |

### Stop line (Today)

**Keep:** Greeting (one line) · one Amy message **or** focus whisper (not both competing) · Mission plate with title, short summary, one bloom · optional quieter Coach **only if** it adds a distinct next step · tertiary Premium ghost · tab nav.

Removing Mission summary **or** the single bloom would reduce clarity → stop.

---

## 2. Ask Amy

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| **Back arrow icon** when “Back to today” text exists — *or* icon-only with aria-label, not both | Duplicate affordance | Cleaner header | Less tool UI |
| **Conversation `border-b` chrome bar** | Exit can be tertiary text without a ruled header | Field opens | Chat feels less like a ticket desk |
| **Hard borders on every prompt card** | Soft plate / atmosphere rows enough | List softens | Prompts feel like invitations |
| **Prompt cards as heavy cards** — prefer text rows on atmosphere | Equal card wall | Air returns | Less “pick a ticket” |
| One of: **long support paragraph** vs **redundant Start** energy — if prompts + Start both shout, quiet the support | Subtitle pile | Clearer action | Less explanation shame |

### Stop line (Ask Amy)

**Keep:** Hero line · short support **or** prompt list (prefer prompts) · one Start bloom · conversation field when open · way back.

Removing all prompts **and** Start would strand the parent → stop.

---

## 3. For Child

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| **Empty section cards** (Play / Learn / Care / Helping…) when they are hollow titles only | Cards without content are SaaS shelves | Huge air; hero dominates | Hope without fake inventory |
| **Card chrome** if a section must remain as a label | Labels can live on atmosphere | No tile grid | Less unfinished-product feel |
| **Guest `border-t`** | Air separates enough | Continuous page | Save moment feels softer |
| **Guest preamble paragraph** if CTA already says save-for-{name} | Subtitle + CTA duplicate | Cleaner close | Less nagging |

### Stop line (For Child)

**Keep:** “For {name}” · hope line · one quiet save path for guests · nav.  
Hollow category cards: **remove until real content exists** — empty cards reduce clarity by pretending structure.

---

## 4. Coach Discovery

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| **Eyebrow “Amy Coach” / “Amy Coach · Long-term”** | Redundant with journey context | Hero rises | Less product labeling |
| **Ready-state body** if headline + Continue are enough | Subtitle test | Calmer gate | Less persuasion before trust |
| **Prepare progress row borders** on inactive steps | Hairline or none | Softer ritual | Waiting feels gentler |
| **Secondary full-width ghost styled like a peer button** — keep as breath text, not twin | Two buttons = two decisions | One obvious action | Relief |

### Stop line (Coach)

**Keep:** One headline · one Continue bloom · “Not right now” breath · essential challenge mention in body **once**.

---

## 5. Mission Play + Success

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| **Arrow icon** next to “Back to today” text | Duplicate | Cleaner | Less utility |
| **Uppercase “Speech” eyebrow** | Domain meta; title is enough | Hero title lifts | Less curriculum |
| **Steps wrapped in a heavy card** — list can sit on atmosphere | One less box | Play feels open | Doing > packaging |
| **Success uppercase “Today’s step”** | Honor title is enough | Cleaner ritual | Less trophy ceremony |
| **Success `ring-8` glow** around check | One soft mark; ring is second glow | Quieter honor | Celebration without fireworks |
| **Success Check icon** if headline already honors the step — *optional remove; keep only if presence mark is the emotional hero* | Icon vs title competition | Type-led honor | Adult, not sticker |
| **Coach bridge paragraph** when Coach CTA already says it | Duplicate subtitle | Tighter landing | Less upsell after care |

### Stop line (Mission)

**Keep:** Mission title · steps (clarity) · Mark complete bloom · Success honor line · one next action · Not right now / Back breath.

Removing steps would reduce clarity → stop.

---

## 6. Premium + Account gate

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| **WifiOff icon** on offline — copy is enough | Decorative status icon | Calmer alert | Less error-screen shame |
| **Check circle chrome** on already-premium if headline carries it | Optional presence only | Less badge energy | Continuity, not trophy |
| **Plan `badge` (“Best value”)** | Commerce sticker | Cleaner plans | Less funnel pressure |
| **Selected plan `shadow-sm` + primary border** — soft fill alone | Dual selection glow | Quieter choose | Less checkout anxiety |
| **Destructive-border error card** treatment | Soft plate + honest copy | Same family as rest of app | Failure feels held |
| **Account gate extra support lines** beyond one hero + one reason | Subtitle pile | Clearer sheet/gate | Less wall-of-text guilt |

### Stop line (Premium)

**Keep:** Continuity headline · one support · plan choice **or** single path · one bloom · restore/retry when needed · Not right now.

Removing price/plan clarity when multiple plans exist would reduce clarity → stop.

---

## 7. Guest Account Sheet

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| Heavy scrim drama (if darker than needed) | Soft dim enough | Sheet feels hosted | Less modal arrest |
| Extra sheet shadow if blur + edge already lift | One material story | Lighter sheet | Softer ask |
| Anything beyond title · one body · bloom · Not right now | Law of three | Inevitable action | Trust, not trap |

### Stop line (Sheet)

**Keep:** Title · one body · Continue · Not right now. Removing Not right now would reduce emotional clarity (trapped) → stop.

---

## 8. Front Door

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| **Loud “AmyNest” wordmark weight** — keep whisper or rely on ritual alone | Logo fights “Take a breath.” | Hero owns the room | Brand as host, not billboard |
| **Progress bar fill glow** (or entire bar if step count is obvious) | Chrome before presence | Breath orb + line first | Ritual > onboarding meter |
| **Orb `ring-8`** if orb fill already breathes | Double glow | Softer presence | Less pulse anxiety |
| **Hard borders on age/worry tiles** | Soft plate / fill selection | Choices feel human | Less form |
| **Duplicate helper under choices** when labels are clear | Subtitle test | Faster path | Less homework |

### Stop line (Front Door)

**Keep:** One emotional line per step · choices **or** name field · one continue · skip where allowed · quiet presence mark on breath.

Removing the breath line or choice labels would reduce clarity → stop.

---

## 9. Navigation + Calm prepare

| Removed | Why | Visual gain | Emotional gain |
|---------|-----|-------------|----------------|
| Active **underline indicator** | Soft fill enough | Whisper nav | Page CTA wins |
| Loud nav **drop shadow** | See global | Air above nav | Less bunker |
| Hard **border-t** | See global | Seamless | Nest, not browser chrome |
| Prepare **skeleton blocks** when a single quiet line is enough | Fake content is still clutter | True calm | Waiting without theater |
| Extra pulse ornaments beyond one soft mark | Glow law | Stillness | Amy preparing, not loading |

### Stop line (Nav / Prepare)

**Keep:** Three tabs with labels · one calm prepare message. Removing tab labels would reduce clarity → stop.

---

## Reduction tally (by type)

| Type | Count proposed removed / quieted | Highest-value cuts |
|------|--------------------------------:|--------------------|
| Dividers / rules | 5+ | Today Ask Amy `border-t` · For Child guest rule · Ask Amy conversation bar · Nav `border-t` |
| Subtitles / eyebrows | 12+ | “Today” · “Right now” · “Speech” · “Amy Coach · Long-term” · Success “Today’s step” · Premium section title |
| Shadows | 4+ | Mission ring+md stack · Nav shelf · Plan selected shadow · Sheet double lift |
| Glows | 5+ | Focus chip wash · Mission ring · Success ring-8 · Orb ring-8 · Nav underline |
| Cards | 4+ hollow or heavy | For Child empty shelves · Ask Amy prompt tiles · Mission steps card · Coach twin weight |
| Icons | 4+ | Back arrows when text exists · WifiOff · optional Success check · decorative title icons |
| Elements | Several | Focus chip-as-chrome · plan badges · progress meter prominence · peer ghost-as-button energy |

---

## What we refuse to remove

These survive every round — removing them **hurts** clarity or care:

| Keep | Why |
|------|-----|
| One emotional hero line | Without it, no Nest Presence |
| One obvious bloom action | Without it, parent freezes |
| Mission steps (Play) | Clarity of what to do |
| “Not right now” breath | Emotional exit = trust |
| Tab labels | Wayfinding |
| Guest sheet body (one line of why) | Soft-save without trap |
| Hope line on For Child (until real content) | Empty without hope = abandonment |

---

## Emotional outcome (after reduction)

| Before | After |
|--------|-------|
| Labeled, sectioned, dual-glow parenting SaaS | One room, one light, one next step |
| Cards explaining the product to itself | Atmosphere + essential object |
| Chrome competing with care | Care first; chrome whispers |

**Visual gain (aggregate):** −30% perceived UI (aligns with Industrial Design oath).  
**Emotional gain (aggregate):** Held · quieter · inevitable — Nest Presence without costume.

---

## Closing

Add nothing.  
Remove until the product feels inevitable.  
Then stop.

**STOP.** Reduction report complete. No implementation.
