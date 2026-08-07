# Parent Hub — Visual Manufacturing Study

**Status:** STUDY ONLY — NO IMPLEMENTATION · NO CSS · NO REACT · NO MODULE MOVES  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Visual Manufacturing Study  

**Constitution:** `docs/v2/PARENT_HUB_CONSTITUTION.md` (four rooms)  
**Surface audited:** `/parenting-hub` · `parenting-hub.tsx` · `parent-hub-premium.ts` · hub section/feature CSS  

---

## Mission

Discover why Parent Hub still feels like a **premium feature catalog**  
instead of **four living rooms**.

Not a redesign. A diagnosis.

---

## Why it feels like a catalog (root cause)

1. **~32 equal feature tiles** across **8 collapsible groups** — same card geometry, same hero illustration slot, same glass recipe.  
2. **No photographic sanctuary** — Hub uses dashboard glass (`parent-hub-premium`); Today Home/Welcome use FE photography. Visual dialect break.  
3. **Emoji + 3D illustration language** dominates; real photography is absent.  
4. **Quick-action chip strip** teaches browsing before intention.  
5. **Feature tile titles** (`clamp` up to ~28px) often **outweigh** group headers — every module shouts “hero.”  
6. **Infant Hub** is a deep module; everything else is a storefront grid — incoherent hierarchy.  
7. **Scroll rhythm** = accordion mall: open group → equal cards → open another group.

Constitution wants: Help · Understand · Care · Moments.  
Visuals still say: Today For You · Learning · Astro · Creativity · Stories · Health · Gaming · Support.

---

## 1. Previous vs New visual philosophy

| | Previous (shipping) | New (Constitution-aligned vision) |
|---|---|---|
| Metaphor | Premium app store / dashboard | Four living rooms in one home |
| Hierarchy | Many equal heroes | **One cinematic hero per room** · list beneath |
| Medium | 3D illustration PNGs + emoji watermarks | **Photography-first** room entry; illustration secondary |
| Surface | Dark glass catalog (`#071126` radials) | Sanctuary continuity with Today Home FE materials |
| Entry chrome | 9 quick chips | Intention doors — not shortcuts to modules |
| Density | Tall feature cards, 2-col grids | Quiet list / secondary rows under one hero |
| Emotion | “Choose a product” | “Enter a feeling” |
| Paywall look | Unlock pills on tiles | Never the first visual of a room |

**New philosophy (study recommendation — not implementation):**  
Each room begins as a **place**, not a **shelf**.

---

## 2. Visual hierarchy audit

### Current weight (top → bottom)

| Block | Weight | Catalog problem |
|---|---|---|
| PageHeader + Ask Amy | Light | OK |
| Child selector | Medium | OK shell |
| Journey Pulse | **Heavy** | Competes as meta-hero before rooms |
| Learning panel / Path | Medium–Heavy | Second meta-hero stack |
| For You header | Light | Catalog section label |
| Quick actions | Light but **behaviorally loud** | Trains mall browsing |
| Infant featured | **Very heavy** | Correct depth; wrong peers |
| 8 group headers (equal) | Medium × 8 | Filing cabinet |
| Expanded feature grids | **Heavy equal cards** | 20+ hero cards energy |
| Bottom Generate CTA | Light | Wrong ownership (Home) |

### What should become HERO (per Constitution)

| Room | Visual hero |
|---|---|
| **Help** | One calm cinematic frame + “What’s hard right now?” |
| **Understand** | One Guidance / meaning photograph + one sentence |
| **Care** | One care-atmosphere photo + next care act |
| **Moments** | One togetherness photo + “Ten minutes with {name}” |

Journey Pulse / Path: **secondary** bridge — never louder than the room hero.  
Ask Amy chip: secondary within Help — not page-global equal to title.

### What should become SECONDARY

- Collapsed room doors (once four rooms replace eight groups)  
- Destination list items under the hero (Speech, PTM, Birth Sky depth, Nutrition…)  
- Child selector · quiet Home link  
- Soft-lock previews (never primary)

### What should disappear (visually from Hub)

- Gaming group visual presence  
- Quick-action “see all” chip mall  
- Equal Learning Zone hero grid  
- Command Center / Forecast card heroes  
- Emoji watermarks competing with photography  
- Bottom Generate CTA as Hub punctuation  
- Explore What’s Next catalog band

### What should merge (visual)

- Tip/article/suggest → one Guidance surface under Understand hero  
- Printables → one Make row under Moments  
- Activities maze → one Presence offer under Moments  
- Eight group headers → **four room doors**

---

## 3. Card audit

### Repeating recipes (catalog engine)

1. Glass frost cards (`HUB_GLASS_SURFACE`, `rounded-[24px]`)  
2. Shaded left-bar shells (`HubShadedCardBody`)  
3. Premium feature cards with **hero PNG + chips** (`HubPremiumFeatureCard`) — min-height ~7.5–9.75rem  
4. Section nav cards with noise, accent bar, watermark emoji  

### Diagnosis

- Same silhouette × many instances = **Apple would call this a grid of apps**  
- Feature title type **larger than room/group type** = inverted hierarchy  
- Hover lift (`hover:-translate-y-0.5`) on every card = storefront energy  
- Soft-lock unlock pills (`Unlock with Premium`) brand tiles as SKUs  

### Manufacturing direction (study)

| Card role | Treatment |
|---|---|
| Room hero | One large cinematic surface — not a tile in a grid |
| Destinations beneath | Compact list rows / quiet secondary cards — **not** clone heroes |
| Shell | Minimal glass; less glow competition |
| Locked | Never a violet “buy” badge as the eye’s first stop |

---

## 4. Photography audit

| Finding | Detail |
|---|---|
| Real photography on Hub | **Absent** |
| Today Home / Welcome | FE `/experience/r1/*.png` sanctuary |
| Hub media | `/illustrations/.../{icon,hero}.png` 3D art |
| Child faces | Initials avatars only |

### Recommendations (study)

| Use photography | Keep non-photo |
|---|---|
| Room entry heroes (Help / Understand / Care / Moments) | Small destination icons (restrained) |
| Care atmosphere (sleep/feed calm) | Lucide for utility actions |
| Moments togetherness | Diagram-like learning tools **inside** destinations |
| Understand / meaning (incl. Birth Sky mood) | — |

**Should every room begin with one cinematic hero image?**  
**YES** — study recommendation. Same emotional grammar as Welcome → Discovery → Home.  
Reuse FE / experience photography; do **not** invent a third illustration system for room heroes.

---

## 5. Illustration audit

| Keep illustration | Retire / demote on Hub |
|---|---|
| Inside destination products (Math, Abacus, Health Lab game worlds) | Equal hero PNGs on every Hub tile |
| Tasteful single mark per list item | Emoji watermarks on every section card |
| — | Mascot drop-shadow heroes competing in 2-col grids |

Illustration remains where a **product world** needs characters.  
Hub rooms should feel like **rooms in a home**, not **boxes of toys**.

---

## 6. Information density

| Signal | Current | Target (rooms) |
|---|---|---|
| Groups | 8 collapsed + Infant module | 4 room doors |
| Tiles | ~32 catalogued | Few secondary items under one hero |
| Scroll | Accordion → grid → accordion | Short room: hero → leave-with → short list → exit |
| Chips | Up to 9 quick actions | 0 mall chips; intention is the entry |
| Nested Activities | Many SubSections | One Presence offer |
| Infant | ~14 section rows | Care room depth (allowed) — still one Care hero first |
| Learning XP / unlocks | Panel density | Strip gamified density (Constitution) |

**Decision fatigue:** High — equal cards force comparison shopping.  
**Negative space:** Insufficient at catalog level; cards fill the breath.  
**Scrolling rhythm:** Staccato store browsing, not cinematic pacing.

---

## 7. Apple HIG review

| Criterion | Verdict |
|---|---|
| Clarity | Fail as Hub — purpose of page unclear beyond “features” |
| Deference | Fail — chrome and cards compete |
| Depth | Partial — glass is craft; hierarchy is flat |
| Consistency | Internal glass consistent; **breaks** FE sanctuary continuity |
| Feedback | Hover/lift OK; unlock CTAs feel App Store |
| Accessibility | 44px targets often OK; density hurts cognition |

**Apple would not** present these as twenty equal hero cards (see Final Question).

---

## 8. AmyNest identity review

| Identity need | Hub today |
|---|---|
| Same home as Welcome/Home | **No** — dashboard dialect |
| Calm companionship | Undermined by points history + unlock pills + chip mall |
| Photography-first moments | Missing |
| One question per surface | Violated by equal modules |
| Steady tone | Absent as visual law |

**Identity risk:** Parent Hub looks like a **different product** bolted under the tab bar.

---

## 9. Founder recommendations

### Recommend APPROVE as visual north star for future blueprint

1. **Four room doors** replace eight group headers visually.  
2. **One cinematic photographic hero per room** — first paint.  
3. **Modules become smaller list items** beneath the hero — not clone heroes.  
4. **Inherit FE / Today Home sanctuary materials** (import-only; no Welcome edit).  
5. **Kill catalog chrome:** quick-action mall, gaming visuals, equal Learning heroes, Generate bottom CTA, Explore band.  
6. **Journey/Path** → quiet secondary under shell — never louder than room hero.  
7. **Illustration** stays inside destinations; Hub entry is photography.  
8. **Soft-lock** must not look like App Store “Get” buttons on first glance.  
9. Do **not** move modules or write CSS in this phase — blueprint later.

### Open Founder visual questions

1. Infant Care: full-bleed Care hero then deep list — or keep module density after hero?  
2. Birth Sky: photographic Understand hero with optional illustration accent inside destination only?  
3. Room doors: four full-width cinematic cards, or one Hub canvas that asks intention then reveals hero?

---

## 10. Visual manufacturing roadmap

**Only after Founder opens blueprint** (no code now):

| Phase | Visual work |
|---|---|
| V0 | Constitution-aligned wire: 4 doors · no module moves yet |
| V1 | Room shell + cinematic hero photography (reuse FE assets) |
| V2 | Demote tiles → secondary lists; remove catalog chrome |
| V3 | Sanctuary material continuity with Home |
| V4 | Soft-lock / paywall visual quieting |
| V5 | Apple craft pass + Six Reviews |

Production Safety: keep `/parenting-hub` · flags · no Welcome CSS edits · Reuse Before Rewrite.

---

## Final question

### Would Apple present these features as 20 equal hero cards?

**NO.**

**Why exactly:**

1. **Equal heroes destroy hierarchy** — Apple elevates one primary, subordinates the rest.  
2. **A catalog is not a human intention** — App Store grids are for shopping apps; Parent Hub is for Help / Understand / Care / Moments.  
3. **Decision fatigue** — twenty hero-sized cards force comparison; exhausted parents need one clear next feeling.  
4. **Craft vs inventory** — repeating glass + illustration slots signals inventory management, not care.  
5. **Photography authority** — Apple’s emotional surfaces lead with one image and quiet type; Hub leads with many mascots.  
6. **Constitution already forbids the mall** — visually shipping twenty equal heroes would violate approved product law even if cards look “premium.”

**Correct Apple-shaped pattern:**  
One room · one cinematic hero · one leave-with · a short secondary list · exit to life/Home.

---

## STOP

**Visual manufacturing study complete.**  
No CSS. No React. No module moves. No implementation.

File: `docs/v2/PARENT_HUB_VISUAL_MANUFACTURING_STUDY.md`

Await Founder review before any visual blueprint or code.
