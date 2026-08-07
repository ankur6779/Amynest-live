# Parent Hub — Product Truth Audit

**Status:** STUDY ONLY — NO IMPLEMENTATION  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Product Truth Audit  
**Surface:** `/parenting-hub` → `artifacts/kidschedule/src/pages/parenting-hub.tsx`  

**Frozen upstream:** Welcome · Signup · Child Discovery · Today Home  
**This document:** Understanding only. No redesign. No code. No moves. No deletes.

---

## Mission lens (locked)

AmyNest’s promise:

> Help me know and carry out my child’s next right thing today.

Every module is judged against that promise — not against feature completeness, sunk cost, or catalogue ambition.

---

## 1. Current Module Inventory

### 1.1 Shell (above the mall)

| # | Module | Parent sees | Type |
|---|---|---|---|
| S1 | Child selector | Active child switcher | Shell |
| S2 | Hub Journey Pulse | 3-day free journey / soft lock | Activation engine |
| S3 | Today’s Path | Guided path steps for today | In-hub journey |
| S4 | Learning progress panel | Daily session / XP / unlocks / comeback | Learning overlay |
| S5 | Quick actions | Chip shortcuts into groups | Launcher chrome |
| S6 | Bottom CTA | Generate today’s routine | Shortcut |

### 1.2 Group tiles (the mall)

| Group | Modules |
|---|---|
| **Today For You** | Ask Amy AI · Daily Tips · Generate Routine · Tomorrow’s Forecast · Family pulse / Command Center |
| **Infant Hub** (featured &lt;24m) | Cry · Sleep · Milestones · Feeding · Growth · Wellbeing · Health/vax · Doctor · Co-parent (FF) · Sounds · Weekly focus · Amy Suggests · Coaching · Activities |
| **Learning Zone** | Smart Math · Abacus · Phonics · Spelling · Smart Study · Olympiad |
| **Amy Astro** | Birth Sky |
| **Creativity** | Activities (+ nested) · Origami · Art & Craft · Worksheets · Coloring · Fun Sheets · Curiosity library · Event Prep |
| **Stories & Communication** | Story Hub · Talking Amy · Speech Coach · Amy Sound World |
| **Health Zone** | Nutrition Hub · Health Lab |
| **Gaming Hub** | Gaming Rewards |
| **Parent Support** | Articles · Emotional Support · Life Skills · PTM Prep · New Parent Tips |

### 1.3 Orphans / registry ghosts

| Item | Truth |
|---|---|
| Amy Quick Tutor | Defined in `sections[]` — **not** in `WEB_HUB_SECTION_TILE_IDS` → invisible |
| `hub_morning_flow`, `hub_kids_control_center`, `hub_meals_tile`, `hub_ai_meal_generator`, `hub_rewards_shop` | In `PARENT_HUB_FEATURES` — **no live tile** |
| Teacher OS i18n tile | Copy exists — no section |

---

## 2. Module Ownership

| Module | Who is it for? | Primary owner product |
|---|---|---|
| Today’s Path / Hub Journey | Parent | Parent Hub (canonical) |
| Learning progress panel | Parent (watching child) | Learning engine — **surfaced** on Hub |
| Ask Amy AI tile | Parent | Ask Amy (`/assistant`) |
| Daily Tips | Parent | Parent Hub content |
| Generate Routine | Parent | Routines / Today Home |
| Tomorrow’s Forecast | Parent | Future-predictor API |
| Command Center / Family pulse | Parent / Family | Reality + executive dashboards |
| Infant Hub suite | Parent (infant) | Infant product (`@workspace/infant-hub`) |
| Learning Zone tiles | Parent + child | Separate learning routes |
| Birth Sky | Parent | Birth Sky product |
| Creativity suite | Parent + child | Mixed in-hub + routes |
| Story Hub | Parent + child | In-hub media |
| Talking Amy | Child (parent-mediated) | `/talking-amy` |
| Speech Coach | Parent + child | `/speech-coach` |
| Discovery Worlds | Parent + child | `/discovery-worlds` |
| Nutrition | Parent / Family | `/nutrition` |
| Health Lab | Parent + child | `/health-lab` |
| Gaming | Child | `/games` |
| Articles / Emotional / Life Skills / PTM / New Parent Tips | Parent | Parent Hub support |

---

## 3. Previous vs Truth

For each major module:

### Today’s Path + Hub Journey

| Layer | Statement |
|---|---|
| **Originally intended** | Guided 3-day activation into Parent Hub value |
| **Actual today** | Soft paywall engine + path steps; competes emotionally with Today Home NRT |
| **Founder product truth** | Important for Hub monetization history; **not** the child’s next right thing on Home |
| **Recommendation** | Keep as Hub activation spine — **never** as Home hero. Align Path language with Home NRT later |

### Ask Amy AI (tile)

| Layer | Statement |
|---|---|
| **Originally intended** | Instant parenting answers in Hub |
| **Actual today** | Prompt launcher into `/assistant` |
| **Truth** | Shortcut, not a Hub product |
| **Recommendation** | SUPPORTING — keep as portal; do not rebuild chat inside Hub |

### Daily Tips

| Layer | Statement |
|---|---|
| **Originally intended** | Daily age-aware guidance |
| **Actual today** | Tip cards; overlaps New Parent Tips + Infant Amy Suggests + Articles |
| **Truth** | Content shelf with low “do this now” force |
| **Recommendation** | OPTIONAL — merge into one guidance stream or kill duplicates |

### Generate Routine

| Layer | Statement |
|---|---|
| **Originally intended** | Hub entry to day’s plan |
| **Actual today** | Duplicate of Today Home Begin / Routines |
| **Truth** | Living in Hub because Hub was once the centre of gravity |
| **Recommendation** | SUPPORTING shortcut only — Home owns the decision |

### Tomorrow’s Forecast

| Layer | Statement |
|---|---|
| **Originally intended** | Predictive calm for tomorrow |
| **Actual today** | API prediction card; rare “must open Hub” moment |
| **Truth** | Interesting science demo; weak daily habit |
| **Recommendation** | OPTIONAL — delay or fold into one insight elsewhere |

### Command Center / Family pulse

| Layer | Statement |
|---|---|
| **Originally intended** | Family executive overview |
| **Actual today** | Nested dashboards (reality + executive + journey) — **dashboard feeling** |
| **Truth** | Violates calm / anti-dashboard philosophy if elevated |
| **Recommendation** | DISTRACTION as Hub hero energy — demote hard or merge into one quiet status |

### Infant Hub

| Layer | Statement |
|---|---|
| **Originally intended** | Complete infant care OS |
| **Actual today** | Deepest real product inside Hub; logs, sleep, feeding, growth |
| **Truth** | For 0–24m parents this **is** often the next right thing domain |
| **Recommendation** | CORE for infant cohort — category-defining if focused |

### Learning Zone (Math / Abacus / Phonics / Spelling / Study / Olympiad)

| Layer | Statement |
|---|---|
| **Originally intended** | Learning mall inside parenting |
| **Actual today** | Almost all are **launchers** to other apps |
| **Truth** | Parent Hub is a directory, not a learning product |
| **Recommendation** | OPTIONAL catalogue — survive as destinations; Hub should not pretend they are “today” |

### Birth Sky

| Layer | Statement |
|---|---|
| **Originally intended** | Cosmic identity / emotional differentiation |
| **Actual today** | Separate product behind flags |
| **Truth** | Brand-memorable; weak daily NRT |
| **Recommendation** | OPTIONAL / delayed for Hub redesign — keep product, don’t centre Hub |

### Creativity suite (Activities, Origami, Art, Worksheets, Coloring, Fun Sheets, Curiosity, Event Prep)

| Layer | Statement |
|---|---|
| **Originally intended** | Enrichment & printable value |
| **Actual today** | Content mall; Activities alone nests many sub-products |
| **Truth** | High inventory, fragmented “what now?” |
| **Recommendation** | Merge ruthlessly; keep 1–2 that earn daily use; rest OPTIONAL |

### Story Hub / Talking Amy / Speech Coach / Sound World

| Layer | Statement |
|---|---|
| **Originally intended** | Communication & bonding |
| **Actual today** | Mixed media + coach product + fun voices |
| **Truth** | Speech Coach can be CORE for language anxiety; Talking Amy is toy-adjacent |
| **Recommendation** | Speech Coach SUPPORTING→CORE for speech use-cases; Talking Amy OPTIONAL |

### Nutrition / Health Lab

| Layer | Statement |
|---|---|
| **Originally intended** | Health verticals |
| **Actual today** | Thin Hub tiles → thick destinations; Infant feeding overlaps Nutrition |
| **Truth** | Real parent need — wrong packaging as equal Hub tiles |
| **Recommendation** | SUPPORTING destinations; Infant feeding stays with Infant |

### Gaming Hub

| Layer | Statement |
|---|---|
| **Originally intended** | Engagement / rewards loop |
| **Actual today** | Points for opening Hub sections + mini-games |
| **Truth** | Dopamine infrastructure — conflicts with calm companionship & Today Home Law |
| **Recommendation** | DISTRACTION inside Parent Hub — strongest delete/demote candidate |

### Articles / Emotional / Life Skills / PTM / New Parent Tips

| Layer | Statement |
|---|---|
| **Originally intended** | Trust & support library |
| **Actual today** | Emotional + PTM are journey-exempt (honestly useful); Articles/Tips overlap |
| **Truth** | Emotional Support earns trust; PTM is seasonal CORE; tips/articles are library |
| **Recommendation** | Emotional + PTM SUPPORTING/CORE; merge tip/article streams |

---

## 4. Product Classification

Place **every** module in **one** bucket only.

### CORE

| Module | Why |
|---|---|
| **Infant Hub** (0–24m) | Real care loops: sleep, feed, cry, growth — closest to “what now?” for infants |
| **Today’s Path** (as Hub spine, not Home) | Only coherent “do this in Hub today” object for Hub activation |
| **PTM Prep** (seasonal) | Specific parent crisis with clear use moment |

### SUPPORTING

| Module | Why |
|---|---|
| Ask Amy (portal) | Trust + guidance; belongs as assistant, Hub only launches |
| Emotional Support | Journey-exempt for a reason — parent regulation |
| Speech Coach | High-stakes skill help when language is the anxiety |
| Nutrition (destination) | Meals matter; Hub is door, not kitchen |
| Generate Routine (shortcut) | Serves NRT execution — Home owns decision |
| Life Skills | Can support today’s practice if tied to Path |
| Learning progress panel | Explains child’s learning state — secondary |

### OPTIONAL

| Module | Why |
|---|---|
| Daily Tips / New Parent Tips / Articles | Content shelves; merge or thin |
| Tomorrow’s Forecast | Nice prediction; rare habit |
| Birth Sky | Differentiator product; not daily Hub core |
| Learning Zone launchers | Destination catalogue |
| Story Hub / Curiosity / Event Prep | Enrichment |
| Health Lab | Destination; age-gated |
| Creativity printables (worksheets, coloring, fun sheets, art, origami) | Value exists; Hub overload |
| Discovery Worlds / Talking Amy | Playful; not NRT |
| Activities mega-nest | Keep only if collapsed to one clear “do with child” |

### DISTRACTION

| Module | Why |
|---|---|
| **Gaming Hub + section visit points** | Scores/points compete with calm; trains mall browsing |
| **Command Center / Family pulse as presented** | Dashboard of dashboards — anti-AmyNest |
| Quick-action chip wall (9 chips) | Feature mall chrome |

### REMOVE (from Hub surface — not necessarily destroy products)

| Module | Why |
|---|---|
| Amy Quick Tutor (orphan) | Already dead in UI — clean registry |
| Registry ghosts (`hub_morning_flow`, kids control, meals tiles, rewards shop) | Lie in allow-list; confuse manufacturing |
| Duplicate tip streams | Parents don’t need three tip products |

**Note:** REMOVE from Hub ≠ delete the underlying product. Many are destinations that should live outside a parenting mall.

---

## 5. Delete Candidates

Honest “if it disappeared tomorrow” test:

| Module | Parents notice? | Today worse? | Sub ↓? | Retention ↓? | Identity loss? | Verdict |
|---|---|---|---|---|---|---|
| Gaming Hub on Parent Hub | Mild (kids) | **No** for NRT | Unclear / maybe vanity metrics | Maybe engagement vanity | **No** — may **gain** calm identity | **Delete from Hub** |
| Command Center nest | Power users | No for most | No | No | No | **Delete or gut** |
| Tomorrow’s Forecast | Few | No | No | No | No | **Delay / remove from Hub** |
| Talking Amy | Some kids | No | No | Slight play | No | Demote |
| Olympiad / Abacus / Math launchers | Learning segment | No for daily NRT | Maybe niche | Niche | No as Hub tiles | Keep products; **remove Hub equal-billing** |
| Tip trilogy (Daily / New Parent / Articles overlap) | Low | No | No | No | No | **Merge → one** |
| Amy Quick Tutor | **No** (invisible) | No | No | No | No | **Remove dead code path** |
| Section visit gaming points | No consciously | No | No | Trains wrong habit | Hurts calm identity | **Delete mechanic** |
| Infant Hub | **Yes** (0–24m) | **Yes** | Yes for that cohort | Yes | Yes for infant AmyNest | **Keep** |
| Emotional Support | Quiet yes | Trust worse | Soft | Soft | Soft | **Keep** |
| Today’s Path | Activation yes | Hub empty | Activation risk | Day 1–3 risk | Hub identity | **Keep (Hub-scoped)** |
| Speech Coach | Speech-anxious parents | Yes for them | Segment | Segment | Differentiator | **Keep product** |
| Birth Sky | Brand lovers | No daily | Maybe brand | Low daily | Some brand magic | Keep product; **don’t centre Hub** |

---

## 6. Merge Candidates

| Merge | Survive as | Kill / absorb |
|---|---|---|
| Daily Tips + New Parent Tips + Articles + Infant Amy Suggests | **One Guidance stream** (“For you today”) | Separate tip malls |
| Ask Amy tile + Emotional mood cards | **Ask Amy** with emotional entry states | Parallel emotional mini-apps |
| Activities nest + Origami + Art + Story-in-Activities + Daily Story | **One Co-play today** | Nested accordion maze |
| Worksheets + Fun Sheets + Coloring | **One Printables** | Three print products |
| Nutrition tile + Infant feeding (boundary) | Infant feeding in Infant Hub; Nutrition for solids/family | Double feeding UX |
| Learning Zone six launchers | **Learning** single door by age | Six equal heroes |
| Generate Routine Hub CTA + bottom CTA + Home Begin | **Home Begin** primary; Hub one quiet link | Triple generate chrome |
| Command Center + Reality + Executive + Learning streak | **One quiet family status** or nothing | Dashboard stack |
| Sound World five feature IDs | One Discovery Worlds door | Five hub_* flags as fake modules |

---

## 7. Database Impact

| Module | Tables / stores | Safe to remove from Hub UI? | Merge/delay? |
|---|---|---|---|
| Hub Journey / Path | `parent_hub_journey` | **No** without activation redesign | Keep |
| Learning progress | `learning_progress` / child learning | Yes for Hub surfacing; engine stays | Delay Hub prominence |
| Feature usage | `feature_usage` (+ allow-list) | Yes — stop tracking ghosts | Clean allow-list |
| Gaming | `gaming_wallet` | Yes remove Hub earn-on-open | Demote |
| Infant | `infant_*` (care, growth, milestones, wellbeing, analytics) | **No** for infant cohort | Keep |
| Birth Sky | `birth_sky` schema | Yes from Hub tile | Delay |
| Nutrition | `nutrition_*` | Yes Hub tile; product stays | Keep destination |
| Speech | `speech_*` | Yes Hub tile; product stays | Keep destination |
| Forecast | future-predictor (API/cache) | Yes | Delay |
| Color/fun/worksheets | respective APIs / Drive | Yes | Merge printables |
| Continuity / Home | localStorage FE continuity | Untouched | N/A |
| Tips/Articles | mostly content packs | Yes | Merge content |

**Zero migrations required for truth study. Removals should be UI/IA first — not DROP TABLE.**

---

## 8. API Impact

| API family | Hub use | If Hub thins |
|---|---|---|
| `/api/hub-journey/*` | Path + pulse | Keep until activation redesigned |
| `/api/learning-progress/*` | Panel | Can stop calling from Hub |
| `/api/feature-usage/*` | Gates / try-free | Keep; prune feature IDs |
| `/api/gaming-rewards/*` | Points on section open | **Stop calling** if points die |
| `/api/future-predictor` | Forecast tile | Optional |
| Infant APIs | Infant Hub | Keep |
| Nutrition / speech / birth-sky / study routes | Launchers | Unaffected if destinations remain |
| Children / routines list | Child selector + routine ready | Keep |

Production risk of Hub IA thin-out: **Low** if destinations stay routed.  
Risk of deleting Infant or Journey without replacement: **High**.

---

## 9. Analytics Impact

| Signal | Truth |
|---|---|
| `screen_view` `/parenting-hub` | Vanity if Hub is a mall — high opens ≠ value |
| Feature-usage `hub_*` | Measures browsing + try-free, not NRT completion |
| Infant events | Real product analytics — preserve |
| Gaming earn events | Engagement theatre — do not treat as retention truth |
| Learning progress events | Real if child learns — weakly attributed via Hub |
| Missing: Hub → Home NRT completion | Gap — Hub rarely proves it improved today’s next right thing |

**Recommendation:** After any redesign, instrument **Hub → Begin/NRT act**, not section opens.

---

## 10. Conversion Impact

| Module | Activation | Daily use | Retention | Trust | Subscription |
|---|---|---|---|---|---|
| Today’s Path / Journey | **High** (by design) | Med | Med (D1–3) | Med | **High** (soft lock) |
| Infant Hub | High for infants | **High** | **High** | High | High |
| Ask Amy / Emotional | Med | Med | Med | **High** | Soft |
| Speech / Nutrition / Learning destinations | Segment | Segment | Segment | Med | Segment premium |
| Gaming / Command Center / tip mall | Fake activation | Browse | Vanity | **Low / harm** | Weak / wrong |
| Birth Sky | Brand | Low daily | Low | Novelty | Soft |
| Generate Routine in Hub | Steals Home’s job | Dup | Dup | Confuses centre of gravity | Indirect |

**If a module doesn’t move these needles, it is inside Parent Hub because history put it there — not because parents need a mall.**

---

## 11. Founder Philosophy Review

Five Principles applied:

### Understand
**Violators:** Command Center, tip trilogy, six equal Learning tiles — more information than next right thing.  
**Honourers:** Infant “what now” loops, Path (when single), Ask Amy when question is earned.

### Trust First
**Violators:** Soft-lock surprise after browsing; gaming points for opening sections.  
**Honourers:** Emotional Support exemption; journey-exempt PTM.

### Remember Kindly
**Honourers:** Infant logs, learning progress, Path memory.  
**Risk:** Reality/executive dashboards that feel like scoring the parent.

### Life Continues
**Violators:** Hub as restarting a feature catalogue every visit.  
**Honourers:** Path continuity; Infant today cards.

### Calm Companionship
**Hard violators:** Gaming Hub, points, Command Center dashboard stack, quick-action chip wall.  
**Honourers:** Emotional Support, restrained Ask Amy entry, Infant coaching tone (when quiet).

---

## 12. Cursor’s Honest Opinion

Not what was designed. Not what protects old work.

### I would delete from Parent Hub (surface)

1. **Gaming Hub + earn-points-on-section-open** — trains the wrong nervous system for AmyNest.  
2. **Command Center / Family pulse stack** — a dashboard pretending to be care.  
3. **Tomorrow’s Forecast as a peer tile** — clever, not necessary.  
4. **Orphan Quick Tutor + registry ghosts** — lying inventory.  
5. **Equal-billing for six Learning launchers** — directory spam.

### I would merge

- All tip/article/suggest streams → **one Guidance**.  
- Printables → **one Print**.  
- Activities maze → **one Co-play today**.  
- Ask Amy + Emotional entries → **one Assistant door**.

### Pretending to be important

- Gaming Rewards  
- Command Center  
- Quick Actions chip strip  
- “Explore What’s Next” early-access dump  
- Hub section visit scoring  

### Underrated

- **Emotional Support** (quiet trust)  
- **PTM Prep** (real calendar pain)  
- **Infant Hub depth** (actual product, not a tile)  
- **Speech Coach** as anxiety relief (if not buried in Stories)

### Could become category-defining

1. **Infant Hub** — if AmyNest is brave enough to say: for 0–24m, Parent Hub *is* infant care, not a mall with infant bolted on.  
2. **A Path that serves Home’s NRT** — Hub as “carry out & deepen today,” never as competing hero.  
3. **Ask Amy as calm companion** — not a prompt grid competing with ten chips.

### Brutal summary

Parent Hub today is a **feature mall with a journey paywall**, not a parenting instrument.

Today Home finally answers “what should I do?”  
Parent Hub still answers “what else can you browse?”

Until Hub subordinates itself to that promise, manufacturing a prettier mall will fail the Four Pillars — especially Product and Conversion.

---

## 13. Final Recommendation

### Do now (study conclusions — still no code)

1. Treat Parent Hub as **secondary to Today Home** forever.  
2. Accept **Infant Hub** and **Hub Journey/Path** as the only non-negotiable Hub-native cores (cohort + activation).  
3. Accept most Learning/Health/Astro/Gaming tiles as **destination doors**, not Hub substance.  
4. Mark Gaming points + Command Center as **philosophy debt**.  
5. Merge guidance/print/co-play before any visual redesign.

### Blueprint (only after Founder approval)

When Founder opens Parent Hub manufacturing:

1. Blueprint a **thin Hub**: Path + Guidance + cohort core (Infant or Learning door) + Ask Amy + seasonal PTM.  
2. Everything else: deep link, Previous Stage, or removal from Hub IA.  
3. Reuse Before Rewrite — do not rebuild Infant, Speech, Nutrition, Birth Sky.  
4. Zero unnecessary migrations; prune feature allow-list carefully.

### Explicit non-actions

- No Parent Hub redesign in this order  
- No feature moves  
- No deletes in production  
- No Child Hub work  

---

## STOP

**Product truth study complete.**

File: `docs/v2/PARENT_HUB_PRODUCT_TRUTH_AUDIT.md`

Await Founder review before any Parent Hub blueprint or implementation.
