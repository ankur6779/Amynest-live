# AmyNest — Final Visual Regression Audit

**Status:** AUDIT ONLY · NO IMPLEMENTATION  
**Date:** 2026-08-07  
**Authority:** Founder Order — Final Visual Regression Audit  

**Canonical baselines (frozen):**  
Welcome V3 · Child Discovery Film · Today Home · Parent Hub sanctuary rooms  

**Authority CSS / docs:**  
`first-experience-material.css` · `amynest-identity.css` · `parent-hub-living-room.css` · `today-home-sanctuary.css` ·  
`docs/v2/VISUAL_IDENTITY_SYSTEM.md` · `docs/v2/VISUAL_MANUFACTURING_V3.md` · `docs/WELCOME_V3_PRODUCTION_FOUNDATION.md`

**Method:** Compare every reachable surface against the frozen house. Flag typography · photography · spacing · material · contrast · dark/light · premium feel.

**STOP after this document.** No implementation from this order.

---

## Absolute visual verdict

The **front of the house** speaks one language.

Most **doors** now speak that language for three seconds.

Most **rooms behind the doors** still speak other languages.

Visual continuity is a **façade system**, not a finished film.

### Blind visual test (no logo)

> Hide brand marks. Would every screen still feel like the same photographed house Welcome introduced?

# NO

---

## Canonical contract (what “correct” looks like)

| Dimension | Canonical law |
|---|---|
| **Typography** | Quicksand for sanctuary titles (500–700). FE cinematic copy stays medium/whisper. No 800/900. No UNLOCK/PRO shout. Closed size ladder. |
| **Photography** | Only `/experience/r1/shot-0[1–5]-*.png`. Soft morning in a lived room. Memory stack: spill · img · veil · glass · grain. Ambient = blurred FE photo. |
| **Spacing** | 4–8–12–16–20–24–32–40–48–64–96. One hero. One primary CTA. Empty space is identity. |
| **Materials** | Night sanctuary shell (`#100d16 → #05040c → #030208`). Glass fill `rgba(8,6,12,*)`. Warm sand edge `rgba(232,212,184,*)`. FE blur ~14px. Grain ≤ ~0.025. |
| **Contrast** | Act titles ≥ ~0.9 parchment on dark. Body may whisper. Dark cinematic scrim under type on photos — never white wash. |
| **Dark/light** | Frozen film = **dark sanctuary** + soft-morning photo light. Not cream day SaaS. Not neon void. |
| **Premium feel** | Continuity after value. Forbidden: neon, XP, Crown shelf, Try Free theatre, emoji-first heroes, galaxy wash, unlock FOMO. |

North star: *Soft dark air. One warm living light.*

---

# PART A — WHAT PASSES

These surfaces correctly reuse FE sanctuary grammar on the **first frame**.

| Surface | Photography | Materials | Notes |
|---|---|---|---|
| Welcome V3 | R1 film | FE shell | Frozen — reference |
| Discovery Film | Beat→shot map | FE import | Frozen — reference |
| Today Home | `shot-05` ambient + memory | Sanctuary shell | Frozen — reference |
| Parent Hub doors / rooms | Room heroes 01–05 | Hub living CSS | Frozen IA |
| Infant Care living open | Care `shot-01` | Living + contrast fix | PASS open |
| Speech Coach living open | Help `shot-02` | Living CSS | PASS open |
| Nutrition living open | Care `shot-01` | Living CSS | PASS open |
| Health Lab living open | Care FE | Living CSS | PASS open |
| Birth Sky living welcome | Understand `shot-05` | Living CSS | PASS welcome only |
| Guidance living stream | Understand `shot-05` | Living CSS | PASS open |
| Moments living room | Moments `shot-04` | Living CSS | PASS open |
| Grow living stream | Understand `shot-05` | Living CSS | PASS open |
| Ask Amy living stream | Help `shot-02` | Living CSS | PASS open |

**Truth:** Openings were manufactured to match the house. That is real. It is not enough.

---

# PART B — REGRESSIONS BY CATEGORY

---

## 1. Typography regressions

| Severity | Surface | Path | Break vs canonical |
|---|---|---|---|
| **Critical** | Talking Amy | `pages/talking-amy/index.tsx` | Neon game titles; black Quicksand on wrong planet; achievement shout language |
| **Critical** | Grow leave routes | `hub-module-page-shell.tsx`, `pages/abacus.tsx`, `pages/phonics.tsx` | `font-black` sticky headers; “Abacus PRO Zone”; “Unlock…” CTAs |
| **High** | Birth Sky post-welcome | `features/birth-sky/design/amy-astro.css` | Palatino / Amy Astro display — parallel type planet |
| **High** | `/assistant` (non-companion) | `pages/assistant.tsx` | “Amy AI Assistant” product title + mode SKU labels |
| **High** | Speech neon sessions | `live-speech-coach.tsx`, `pronunciation-companion.tsx` | Game-session type dialect |
| **Medium** | All living openings | `*-living-room.css` titles | Quicksand **700** shout vs FE `fe-title` medium whisper — same house, louder voice |
| **Medium** | Legacy Hub mall | `parenting-hub.tsx` | Emoji section titles · Explore Free · learning SKU names |
| **Medium** | Curiosity | `pages/answer-to-kids-how.tsx` | Bookstore eyebrow / quota type |
| **Low** | Nutrition sticky tabs | `nutrition-layout.tsx` | Journey-tab labels compete with sanctuary hierarchy |

### Typography summary

Living openings **over-bold** the FE whisper.  
Leave-paths invent **new type planets** (PRO, Astro, AI Assistant, neon game).

---

## 2. Photography regressions

| Severity | Surface | Path | Break vs canonical |
|---|---|---|---|
| **Critical** | Talking Amy | `talking-amy/index.tsx` | No FE R1. Neon abstract wash replaces house photography |
| **Critical** | Speech live/talk | `live-speech-coach.tsx`, `pronunciation-companion.tsx` | Dark neon void — not soft-morning room |
| **Critical** | Discovery Worlds | `discovery-worlds-hub.tsx`, world cards | Marketplace / emoji / explorer art — not R1 |
| **Critical** | Grow HubModule routes | `hub-module-page-shell.tsx` + abacus/phonics/study | Light utility shell — photography abandoned |
| **Critical** | `/assistant` | `assistant.tsx` | Flat `bg-background` — no memory, no ambient |
| **High** | Birth Sky after welcome | `amy-astro.css`, reveal/setup | Cosmic void / emblem — parallel brand photography |
| **High** | Health Lab game stages | `health-lab-game-ui.tsx`, `theme.ts` | Violet galaxy `#0a0f2e` — not Care FE |
| **High** | Curiosity | `answer-to-kids-how.tsx` | Icon tile / book covers — not FE still life |
| **High** | Infant deepen | `infant-mode-shortcuts.tsx`, activation flow | Rainbow emoji tiles replace Care photo continuity |
| **Medium** | Nutrition interiors | `today-cards.tsx`, `nutrition-hero.tsx` | Emoji meal shells under living ambient |
| **Medium** | Guidance / Grow deepen | lane + launch cards | Illustration glass cards under FE hero |
| **Low** | Living openings (PASS) | all manufactured | Correct R1 shots — no regression on open |

### Photography summary

The house has five photographs.  
Half the product still refuses to use them.

---

## 3. Spacing regressions

| Severity | Surface | Path | Break vs canonical |
|---|---|---|---|
| **High** | Legacy Hub mall | `parenting-hub.tsx` | Dense tile grids · section stacks · quick chips — fills empty space |
| **High** | Grow HubModule | `hub-module-page-shell.tsx` | Sticky header + child pills + benefit panels — dashboard density |
| **High** | Discovery Worlds | hub + dashboards | Progress strips · streak rows · card grids |
| **Medium** | Nutrition | sticky top nav + tab panels | Five-tab journey mall compresses sanctuary breathing room |
| **Medium** | Speech body | `speech-coach/index.tsx` sections | Games/affirmations stacks under calm hero — second product density |
| **Medium** | Curiosity | book grid + filters | Storefront density |
| **Medium** | Guidance lanes | tip/article bodies | Compact shelf rhythm under stream |
| **Low** | Living openings | various | Generally honor one-hero spacing — PASS open |
| **Low** | Permanent off-ladder values | scattered | Identity forbids 6/10/14/18/22… — residual Tailwind one-offs remain |

### Spacing summary

Openings breathe.  
Interiors refill the air with shelves.

---

## 4. Material regressions

| Severity | Surface | Path | Break vs canonical |
|---|---|---|---|
| **Critical** | Talking Amy | neon gradients `#1a0533→#3b0d6b`, fuchsia blurs | Different material planet |
| **Critical** | Speech neon sessions | `#070812`, cyan/fuchsia glow CTAs | Neon glass — not FE glass |
| **Critical** | Discovery Worlds | teal→emerald SaaS cards, Trophy motion | Marketplace materials |
| **Critical** | Health Lab game UI | violet galaxy stages | Space-lab materials |
| **Critical** | Legacy Hub / lz-glass | `hub-premium-feature-card.tsx`, `.lz-glass-panel` | Illustration glass mall (quiet softens, does not erase) |
| **High** | Birth Sky Astro | void/gold/violet cosmic chrome | Parallel brand materials |
| **High** | Grow HubModule | light `bg-background` / `bg-card` | Day SaaS panels — sanctuary abandoned |
| **High** | `/assistant` | flat light chat chrome | Desk materials |
| **High** | Nutrition sticky `#0b1730` pills | layout + day selector | Utility nav materials |
| **High** | Emerald SaaS accents | Nutrition insight, Discovery launch | Foreign accent family |
| **Medium** | Infant violet panels | sleep coaching, Ask Amy CTA | Light violet pills inside Care night |
| **Medium** | Paywall / streak dialogs | `paywall-modal.tsx`, streak shield | Neon portal materials (system chrome) |
| **Low** | Living openings | `rgba(8,6,12)` + warm sand | PASS — match Hub/FE |

### Material summary

Sanctuary glass = warm sand on night ink.  
Foreign glass = neon, emerald, violet galaxy, cream day cards.

---

## 5. Contrast failures

| Severity | Surface | Path | Break vs canonical |
|---|---|---|---|
| **Resolved** | Infant Care living (prior fix) | `infant-care-living-room.css` | Was outdoor-fail; now WCAG-strong cream on dark — **PASS after fix** |
| **High** | Speech neon CTAs | live/talk pages | Neon on near-black — spectacle contrast, not readable calm |
| **High** | Talking Amy | neon on purple void | Glow competition with type |
| **Medium** | FE whisper copy reused poorly | some deepen panels | Soft FE alphas on non-photo light grounds → muddy |
| **Medium** | Light HubModule on Grow | black Quicksand on pale cards | Passes WCAG math; fails sanctuary *feel* (wrong contrast dialect) |
| **Medium** | Curiosity amber icon on light | bookstore header | Loud accent vs soft parchment law |
| **Low** | Living openings | dark scrims under hero type | Generally PASS after Infant pattern |
| **Low** | Assistant muted empty | `text-muted-foreground` | Acceptable desk contrast; wrong world |

### Contrast summary

Manufactured openings mostly fixed readability after Infant Care lesson.  
Neon leave-paths trade readability for spectacle.  
Light SaaS leave-paths pass contrast tests while failing the house.

---

## 6. Dark / light inconsistencies

| Severity | Surface | Path | Break |
|---|---|---|---|
| **Critical** | Grow learning routes | HubModule shell | Hard cut: dark Hub → light utility page |
| **Critical** | `/assistant` | assistant page | Hard cut: dark Help → light chat |
| **Critical** | Curiosity | answer-to-kids-how | Hard cut: dark Understand → light bookstore |
| **High** | Birth Sky Astro interiors | amy-astro CSS | Wrong **night** — cosmic void ≠ sanctuary night |
| **High** | Talking Amy / Speech neon | session pages | Wrong **dark** — neon club ≠ soft dark air |
| **High** | Health Lab game stages | theme `#0a0f2e` | Wrong dark violet |
| **Medium** | Infant deepen light pills | `bg-violet-100` panels | Light chips inside Care night shell |
| **Medium** | Worksheet / Make tools | cream studio themes | Light craft tool after Moments night |
| **Low** | Living openings + Hub + Home | FE shells | Consistent dark sanctuary — PASS |

### Dark/light summary

The product switches **atmosphere mid-sentence**.  
Three incompatible darks (sanctuary · neon · cosmic) plus light SaaS exits.

---

## 7. Premium feel breaks

| Severity | Surface | Path | Break |
|---|---|---|---|
| **Critical** | Talking Amy | streaks, achievements, secrets, neon | Game monetization face |
| **Critical** | Discovery Worlds | explorer streak, XP fly, stickers, Trophy | Progress marketplace |
| **Critical** | Health Lab More | XP, coins, shop, Double XP energy | Care became a game shop |
| **Critical** | Grow unlock routes | PRO Zone, Unlock CTAs, emoji unlock theatre | Edtech coercion |
| **Critical** | Legacy Hub mall | Explore Free, XP wallet, journey pulse | Full premium theatre |
| **High** | Speech neon sessions | spectacle CTAs / session products | Help became a game booth |
| **High** | Nutrition Track | streak / achievement cards | Care scorekeeping |
| **High** | `/assistant` modes + Zap upgrade | mode SKUs + upgrade CTA | AI product desk |
| **High** | Curiosity free-book quota | “X free books left” | Storefront scarcity |
| **Medium** | Launch cards on deepen | glass illustration + residual badges | Pack 5 hides Try Free; card DNA remains |
| **Medium** | Paywall portals | neon gradient modals | Foreign premium dialect |
| **Low** | Living opens + Pack 5 quiet | PREMIUM_VOICE | PASS — continuity voice |

### Premium feel summary

Pack 5 and living opens **quieted the lobby**.  
The product still **sells like a mall** after the first leave.

---

# PART C — SURFACE SCORECARD (VISUAL ONLY)

Scores 1–10 for **visual belonging** to the frozen house (not product completeness).

| Surface | Open | Interior / leave | Worst category |
|---|---|---|---|
| Welcome | 10 | 10 | — |
| Discovery Film | 9.5 | 9.5 | — |
| Today Home | 9.5 | 9 | minor dialect |
| Parent Hub doors/rooms | 9 | 8 | deepen glass DNA |
| Infant Care | 9 | 5.5 | Material / emoji deepen |
| Speech Coach | 8.5 | 3 | Neon sessions |
| Nutrition | 8.5 | 5 | Sticky SaaS / streak |
| Health Lab | 8.5 | 3 | XP / galaxy game |
| Birth Sky | 8.5 | 3.5 | Astro parallel brand |
| Guidance | 8.5 | 6.5 | Shelf lane bodies |
| Moments | 9 | 3 | Talking Amy / Discovery leave |
| Grow | 8.5 | 2.5 | HubModule unlock light |
| Ask Amy + Emotional | 8.5 | 4 | Assistant light desk |
| Talking Amy | 2 | 2 | Neon planet |
| Discovery Worlds | 2.5 | 2.5 | XP marketplace |
| Curiosity | 3.5 | 3.5 | Bookstore |
| `/assistant` direct | 3.5 | 3.5 | Chat SaaS |
| Legacy Hub mall | 2 | 2 | Full mall |

---

# PART D — WORST VISUAL BETRAYALS (ORDERED)

Emotional damage × visual break × frequency:

| Rank | Betrayal | Categories hit |
|---|---|---|
| **1** | Moments calm → Talking Amy neon | Photo · Material · Premium · Dark |
| **2** | Grow calm → Abacus PRO / Unlock light SaaS | Photo · Type · Premium · Dark/light |
| **3** | Speech calm → live/talk neon void | Material · Photo · Premium |
| **4** | Ask Amy calm → `/assistant` light desk | Material · Dark/light · Premium |
| **5** | Care calm → Health Lab XP/shop galaxy | Premium · Material · Photo |
| **6** | Birth Sky soft → Amy Astro cosmos | Photo · Type · Material |
| **7** | Care calm → Nutrition streak / sticky mall | Material · Premium · Spacing |
| **8** | Understand → Curiosity bookstore | Photo · Premium · Dark/light |
| **9** | Rooms kill-switch → emoji Hub mall | All categories |
| **10** | Living open Quicksand shout vs FE whisper | Typography (systemic) |

---

# PART E — SYSTEMIC PATTERNS (NOT ONE-OFF BUGS)

1. **Opening theatre vs interior debt** — Every Phase 2 module bought a calm first frame and left the body foreign.  
2. **Three night dialects** — Sanctuary · neon club · cosmic void. Only sanctuary is legal.  
3. **Hard light exits** — HubModule, Assistant, Curiosity abandon night without a transition ritual.  
4. **lz-glass / premium card DNA** — Pack 5 strips badges; illustration glass remains the deepen default.  
5. **Quicksand inflation** — Living titles shout; FE titles whisper. Same family, wrong volume.  
6. **Photography optional** — Leave-paths treat R1 as decorative, not law.  
7. **Dual flag universes** — Living OFF restores mall/neon/legacy faces → permanent visual fork.

---

# PART F — CHECKLIST BY FLAG TYPE

### Typography
- [ ] No PRO / Zone / Mastery / Assistant / UNLOCK as first type  
- [ ] Quicksand reserved for sanctuary acts — not sticky SaaS headers  
- [ ] FE whisper weights respected on cinematic copy  
- [ ] No Palatino/Astro parallel display without Founder wing order  

### Photography
- [ ] Only R1 shots on emotional opens  
- [ ] Memory stack complete when photo is hero  
- [ ] No neon void / emoji hero / icon tile as opening substitute  
- [ ] Ambient = blurred FE photo, not brand wash  

### Spacing
- [ ] One hero · one primary CTA  
- [ ] No dense mall grids as first impression  
- [ ] Sticky nav does not crush sanctuary breathing room  

### Materials
- [ ] Night ink + warm sand glass only  
- [ ] No neon / emerald SaaS / violet galaxy / cream day panels on Help·Understand·Care·Moments paths  
- [ ] Grain subtle; blur ~14; no glow competing with photo  

### Contrast
- [ ] Act titles outdoor-readable on dark glass  
- [ ] No white wash over FE photos  
- [ ] Neon spectacle not used as “contrast solution”  

### Dark / light
- [ ] No hard cut dark Hub → light utility without intentional transition  
- [ ] No second night dialect (neon / cosmic) on primary paths  

### Premium feel
- [ ] No XP / streak / Crown / Try Free / Explore Free as first face  
- [ ] No achievement unlock theatre on Moments / Care / Help opens  
- [ ] Premium voice = continuity after value only  

---

# PART G — HONEST PORTFOLIO SCORES (VISUAL)

| Score | Value | Note |
|---|---|---|
| Front door visual continuity | **9.5 / 10** | Welcome→Discovery→Home→Hub doors |
| Manufactured opening continuity | **8.5 / 10** | Real; Quicksand volume drift |
| Destination interior continuity | **3.5 / 10** | Federation of materials |
| Leave-path continuity | **2.5 / 10** | Hardest visual breaks |
| Blind-logo visual YES everywhere | **NO** | Unchanged |
| Contrast readiness (living opens) | **8 / 10** | After Infant Care fix |
| Premium quiet (living opens) | **8 / 10** | Pack 5 + living |
| Premium quiet (portfolio) | **3 / 10** | Neon/XP/unlock alive |

---

## Final visual lines

| Lens | Truth |
|---|---|
| **Apple** | The lobby photographs as one product. The exits do not. |
| **Exhausted parent** | Soft light at the door. Neon and desks inside. |
| **Engineering** | Living CSS copies FE tokens; leave-paths never imported the law. |
| **Growth** | Calm open sells trust; foreign materials spend it. |

---

## Final question

## If every logo disappeared, would every screen still look like the same AmyNest house?

# NO

### Visual blockers that still kill YES

1. Talking Amy neon planet  
2. Grow HubModule light unlock SaaS  
3. Speech neon sessions  
4. Discovery Worlds XP marketplace  
5. Health Lab galaxy / XP shop  
6. Birth Sky Amy Astro interiors  
7. `/assistant` light chatbot desk  
8. Curiosity bookstore light mall  
9. Legacy Hub mall kill-switch face  
10. Systemic hard dark→light exits + Quicksand shout drift  

---

## STOP

No implementation.  
No CSS campaigns from this order.  
No reopening of frozen Welcome · Discovery · Today Home · Parent Hub room IA.

Wait for Founder approval.
