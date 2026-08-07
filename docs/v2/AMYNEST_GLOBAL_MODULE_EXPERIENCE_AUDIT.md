# AmyNest Global Module Experience Audit

**Status:** AUDIT ONLY — NO IMPLEMENTATION · NO REACT · NO CSS · NO PACK 6  
**Date:** 2026-08-07  
**Authority:** Founder Order — AmyNest Global Module Experience Audit  

**Upstream complete:** Parent Hub Packs 1 → 5 (rooms · living flow · Pack 4.9 chrome subtraction · Pack 5 quiet-slot continuity)  

**Frozen forever:** Welcome V3 · Signup Keep · Child Discovery · Today Home  

**Universe law under review:**  
A parent must never feel that opening a destination means opening another application.  
Every destination must feel like another room in the same home.

**Evidence base:** Built code under `artifacts/kidschedule` — room shell FE photography vs hub premium glass vs standalone product pages. Pack 5 quiet-module presentation applies **only inside** Parent Hub room slots; leaving via AppLink restores each module’s native universe.

---

## Executive Summary

Parent Hub (rooms shell) now belongs to the AmyNest home created by Welcome · Discovery · Today Home.

**Most destination modules do not.**

| Layer | Universe today |
|---|---|
| Welcome / Discovery / Today Home / Parent Hub rooms | FE photography + sanctuary materials — **one home** |
| Destination quiet slot (Pack 5) | Continuity *chrome* improved; module *bodies* still hub SaaS glass / emoji / illustration |
| Standalone destination routes | Often a **different product** (Speech Coach violet games, Birth Sky Amy Astro, Talking Amy neon XP, Grow unlock panels, Discovery progress marketplace, Nutrition emoji OS, Health Lab utility shell) |

**Classification of the portfolio:**

- **PASS (companion continuity):** none fully — Parent Hub rooms pass; modules do not yet inherit FE photography/materials end-to-end  
- **Needs hierarchy cleanup:** Ask Amy, Emotional, Guidance, PTM, Life Skills, Story, Make, Presence activities  
- **Needs visual unification:** Infant Care, Nutrition, Curiosity, Event Prep, Origami, Art & Craft  
- **Needs Premium cleanup:** Grow cluster, Health Lab, Discovery Worlds, Speech Coach, Birth Sky launch badges (post-navigate)  
- **Needs manufacturing:** Speech Coach, Talking Amy, Discovery Worlds, Grow (learning zone), Birth Sky standalone, Health Lab, Nutrition standalone  
- **Legacy only:** Olympiad competitive framing, Study unlock theatre, Abacus “PRO” naming — ship only behind Grow merge until remanufactured  

### Final question (preview)

> If every AmyNest logo disappeared today, would every destination still feel like it belongs to AmyNest?

# NO

Highest-impact blockers listed at the end.

---

## Module Inventory

Canonical Pack 3 destinations (and nested members that open modules):

| Room | Destination | Members / tiles |
|---|---|---|
| Help | Ask Amy · Emotional · Speech Coach · PTM Prep · Life Skills | singles |
| Understand | Guidance · Birth Sky · Curiosity · Grow | Guidance: tips / new-parent / articles · Grow: math / abacus / phonics / spelling / study / olympiad |
| Care | Infant Care · Nutrition · Health Lab | singles |
| Moments | Presence · Story · Make | Presence: activities / origami / art-craft / talking-amy / discovery / event-prep · Make: worksheets / coloring / fun-sheets |

**Audit unit:** destination as experienced after path open (Hub quiet slot) **and** after further navigation (standalone), because immersion breaks at either cut.

---

# Per-module audits

Scale: Current / Target maturity **1–10**.  
Feel: **companion** | **tool** | **feature** | **product** | **marketplace**.  
Can ship today = ship as-is without breaking Parent Hub first-frame trust (not “Apple first-party ready”).

---

## HELP

### Ask Amy

| Dimension | Finding |
|---|---|
| Opening (Hub) | TodayForYou glass hero → expand → emoji prompt grid → `/assistant` |
| Standalone | `pages/assistant.tsx` — chat product, not FE sanctuary |
| Photography / materials | Hub illustration glass; assistant = separate UI |
| Premium | Pack 5 quiet; FeatureGate logic intact |
| Feel | **Tool / feature** with companion intent |
| Classification | **Needs hierarchy cleanup** |
| Current → Target | **6.0 → 8.5** |
| Production risk | Low |
| Effort | M |
| Business / Conversion / Retention / Apple | High relief · High convert after value · High retain · Apple: soft NO until assistant inherits home calm |
| Can ship today? | **YES** — core Help path; clean hierarchy later |
| Apple approve module? | **NO** — emoji grid + leave-to-chat breaks same-house |
| Immersion break? | Partial on expand; stronger on `/assistant` |

### Emotional Support

| Dimension | Finding |
|---|---|
| Opening | ParentSupport glass → emoji mood cards → `/assistant` / feedback |
| Standalone | No dedicated page (assistant) |
| Premium | Crisis path must stay free (logic); Pack 5 quiet chrome |
| Feel | **Companion intent** trapped in **feature** chrome |
| Classification | **Needs hierarchy cleanup** (+ light visual unification) |
| Current → Target | **6.5 → 9.0** |
| Risk / Effort | Low / M |
| Impacts | Trust-critical · High retention · Apple: NO until emoji/feature page softens |
| Can ship today? | **YES** — free crisis spine |
| Apple? | **NO** — not yet same calm as rooms |
| Immersion? | Breaks on emoji marketplace of feelings |

### Speech Coach

| Dimension | Finding |
|---|---|
| Opening (Hub) | Stories glass + CTA → `/speech-coach` |
| Standalone | Violet/fuchsia live heroes, emoji session types, badges/XP language |
| Premium | Entitlements + unlock preview copy on page |
| Feel | **Product / marketplace** |
| Classification | **Needs manufacturing** (+ Premium cleanup) |
| Current → Target | **3.5 → 8.5** |
| Risk / Effort | Med / **L** |
| Impacts | High convert if calm · High churn if gamey · Apple: hard NO |
| Can ship today? | **YES** behind Help path with Pack 5 quiet entry — **not** as AmyNest flagship face |
| Apple? | **NO** — different app |
| Immersion? | **Yes, breaks** on route leave |

### PTM Prep

| Dimension | Finding |
|---|---|
| Opening | ParentSupport glass → inline `PtmPrepAssistant` (no leave) |
| Photography | Illustration glass, not FE |
| Feel | **Tool** with companion purpose |
| Classification | **Needs hierarchy cleanup** |
| Current → Target | **6.5 → 8.5** |
| Risk / Effort | Low / S–M |
| Impacts | Seasonal confidence · Medium convert · Apple: soft NO |
| Can ship today? | **YES** |
| Apple? | **NO** (glass feature page, not home room) |
| Immersion? | Mild — stays in Hub |

### Life Skills

| Dimension | Finding |
|---|---|
| Opening | ParentSupport glass → `LifeSkillsZone`; optional `/life-skills` utility page |
| Feel | **Feature / tool** |
| Classification | **Needs hierarchy cleanup** |
| Current → Target | **5.5 → 8.0** |
| Risk / Effort | Low / M |
| Can ship today? | **YES** |
| Apple? | **NO** |
| Immersion? | Mild in Hub; utility page colder |

---

## UNDERSTAND

### Guidance (Daily Tips · New Parent Tips · Articles)

| Dimension | Finding |
|---|---|
| Opening | Glass sections → tip/article bodies with emoji/gradients |
| Feel | **Feature** (content shelf) |
| Classification | **Needs hierarchy cleanup** |
| Current → Target | **6.0 → 8.5** |
| Risk / Effort | Low / M |
| Impacts | Understanding trust · Medium convert · Apple: NO until one-sentence sanctuary |
| Can ship today? | **YES** |
| Apple? | **NO** — tip mall residue |
| Immersion? | Partial |

### Birth Sky

| Dimension | Finding |
|---|---|
| Opening (Hub) | AmyAstro glass launch → `/birth-sky` |
| Standalone | Amy Astro cinematic (gold, emblem) — crafted but **not FE home** |
| Premium | Explore Free suppressed in quiet; depth/export gates remain |
| Feel | **Product** (beautiful parallel universe) |
| Classification | **Needs manufacturing** (unify to home — or deliberate “wing of the house” craft) |
| Current → Target | **5.0 → 8.5** |
| Risk / Effort | Med / **L** |
| Impacts | High meaning retention · Medium convert · Apple: NO as continuity; maybe YES as intentional wing if framed |
| Can ship today? | **YES** as destination — continuity debt accepted |
| Apple? | **NO** for same-home test |
| Immersion? | **Breaks** — cinematic cut |

### Curiosity (Answer to Kids How)

| Dimension | Finding |
|---|---|
| Opening | Creativity glass → `/answer-to-kids-how` book marketplace chrome |
| Feel | **Marketplace / product** |
| Classification | **Needs visual unification** (+ Premium cleanup) |
| Current → Target | **4.5 → 8.0** |
| Risk / Effort | Med / M |
| Can ship today? | **YES** with quiet entry |
| Apple? | **NO** |
| Immersion? | Breaks on route |

### Grow (Math · Abacus · Phonics · Spelling · Study · Olympiad)

| Dimension | Finding |
|---|---|
| Opening (Hub) | LearningZone glass launches (Pack 5 strips badges) |
| Standalone | HubModule sticky headers · “Unlock All Learning” · XP/unlocks · PRO/leaderboard language |
| Feel | **Marketplace / edtech product** |
| Classification | **Needs manufacturing** + **Premium cleanup** · Olympiad/Study lean **Legacy only** until rebuilt |
| Current → Target | **3.0 → 8.0** |
| Risk / Effort | High / **XL** |
| Impacts | High education convert · High immersion risk · Apple: hard NO |
| Can ship today? | **YES** nested under Grow — **do not** lead Hub with these |
| Apple? | **NO** |
| Immersion? | **Severe break** after AppLink |

---

## CARE

### Infant Care

| Dimension | Finding |
|---|---|
| Opening | Multi-accordion InfantHub · emoji watermarks · tinted shells (stays in Hub) |
| Photography | Not FE; Care room ambient is FE behind it |
| Premium | “1 free plan” hidden in quiet; entitlements intact |
| Feel | **Product / care OS** (useful, dense) |
| Classification | **Needs visual unification** (+ hierarchy) |
| Current → Target | **5.5 → 9.0** |
| Risk / Effort | Med / **L** (highest Care willingness-to-pay) |
| Impacts | **Highest** business + retention · Apple: NO until sanctuary care |
| Can ship today? | **YES** — daily necessity |
| Apple? | **NO** — emoji OS ≠ home room |
| Immersion? | Partial (stays in Hub) but dense feature stack |

### Nutrition

| Dimension | Finding |
|---|---|
| Opening (Hub) | HealthZone glass + content; CTA `/nutrition` |
| Standalone | Emoji-forward NutritionHero + tabs + achievements |
| Premium | Continuity copy in Hub; page still product |
| Feel | **Product** |
| Classification | **Needs visual unification** + manufacturing for standalone |
| Current → Target | **4.5 → 8.5** |
| Risk / Effort | Med / L |
| Impacts | High Care convert · Apple: NO |
| Can ship today? | **YES** |
| Apple? | **NO** |
| Immersion? | Breaks on `/nutrition` |

### Health Lab

| Dimension | Finding |
|---|---|
| Opening | Launch glass → `/health-lab` sticky “Amy Health Lab™” |
| Premium | Hard entitlement wall historically; Pack 5 quiet badge only |
| Feel | **Product / SaaS lab** |
| Classification | **Needs Premium cleanup** + **manufacturing** |
| Current → Target | **3.5 → 8.0** |
| Risk / Effort | Med–High / L |
| Impacts | Trust risk if wall-first · Apple: hard NO |
| Can ship today? | **YES** only after Care trust (policy) — presentation still SaaS |
| Apple? | **NO** |
| Immersion? | **Breaks** |

---

## MOMENTS

### Presence — Activities

| Classification | **Needs hierarchy cleanup** |
| Current → Target | **5.5 → 8.0** |
| Feel | Feature shelf of activities |
| Can ship today? | **YES** |
| Apple? | **NO** |
| Immersion? | Mild in Hub; `/audio-lessons` colder |

### Presence — Origami Studio

| Classification | **Needs visual unification** |
| Current → Target | **5.0 → 7.5** |
| Feel | Feature |
| Can ship today? | **YES** |
| Apple? | **NO** |

### Presence — Art & Craft

| Classification | **Needs visual unification** |
| Current → Target | **5.0 → 7.5** |
| Feel | Feature |
| Can ship today? | **YES** |
| Apple? | **NO** |

### Presence — Talking Amy

| Dimension | Finding |
|---|---|
| Standalone | Neon dark immersive · achievements · streaks · secret modes |
| Feel | **Marketplace / game product** |
| Classification | **Needs manufacturing** |
| Current → Target | **3.0 → 8.0** |
| Risk / Effort | High / **L** |
| Can ship today? | **YES** nested — never lead Moments |
| Apple? | **NO** — immersion **breaks hard** |

### Presence — Discovery Worlds (Amy Sound World)

| Dimension | Finding |
|---|---|
| Hub quiet | Progress/stickers/streak shelf hidden (Pack 5) |
| Standalone | Explorer % · stickers · stars · streak restored |
| Feel | **Marketplace** |
| Classification | **Needs manufacturing** + Premium/progress cleanup |
| Current → Target | **3.5 → 8.0** |
| Risk / Effort | High / L |
| Can ship today? | **YES** nested |
| Apple? | **NO** |
| Immersion? | **Breaks** after leave |

### Presence — Event Prep

| Classification | **Needs hierarchy cleanup** (+ light visual) |
| Current → Target | **5.0 → 7.5** |
| Feel | Feature with “New” badge energy |
| Can ship today? | **YES** |
| Apple? | **NO** |

### Story

| Classification | **Needs hierarchy cleanup** |
| Current → Target | **6.0 → 8.5** |
| Feel | Feature library (stays nearer companion if quiet) |
| Can ship today? | **YES** |
| Apple? | **NO** until story open feels like room light |
| Immersion? | Mild |

### Make (Worksheets · Coloring · Fun Sheets)

| Classification | **Needs hierarchy cleanup** |
| Current → Target | **5.5 → 8.0** |
| Feel | Tool / content shelf |
| Note | `/worksheet` studio is a **different** product — not this tile |
| Can ship today? | **YES** |
| Apple? | **NO** |

---

# Current vs Target (summary table)

| Module | Current | Target | Class | Ship today |
|---|---|---|---|---|
| Ask Amy | 6.0 | 8.5 | Hierarchy | YES |
| Emotional | 6.5 | 9.0 | Hierarchy | YES |
| Speech Coach | 3.5 | 8.5 | Manufacturing | YES* |
| PTM Prep | 6.5 | 8.5 | Hierarchy | YES |
| Life Skills | 5.5 | 8.0 | Hierarchy | YES |
| Guidance | 6.0 | 8.5 | Hierarchy | YES |
| Birth Sky | 5.0 | 8.5 | Manufacturing | YES* |
| Curiosity | 4.5 | 8.0 | Visual unify | YES* |
| Grow (cluster) | 3.0 | 8.0 | Manufacturing / Legacy | YES* nested |
| Infant Care | 5.5 | 9.0 | Visual unify | YES |
| Nutrition | 4.5 | 8.5 | Visual + mfg | YES* |
| Health Lab | 3.5 | 8.0 | Premium + mfg | YES* careful |
| Presence / Activities | 5.5 | 8.0 | Hierarchy | YES |
| Origami / Art | 5.0 | 7.5 | Visual | YES |
| Talking Amy | 3.0 | 8.0 | Manufacturing | YES* nested |
| Discovery Worlds | 3.5 | 8.0 | Manufacturing | YES* nested |
| Event Prep | 5.0 | 7.5 | Hierarchy | YES |
| Story | 6.0 | 8.5 | Hierarchy | YES |
| Make | 5.5 | 8.0 | Hierarchy | YES |

\*Ship nested under rooms — do not lead Hub / do not claim first-party Apple continuity.

---

# Priority Matrix (highest → lowest)

Rebuild / unify order by **business impact × immersion break × Apple risk**:

| Rank | Module | Why first |
|---|---|---|
| **1** | **Infant Care** | Highest Care WTP · daily · stays in Hub · emoji OS blocks sanctuary |
| **2** | **Speech Coach** | Help convert · standalone feels like another app |
| **3** | **Nutrition** | Care convert · standalone product cut |
| **4** | **Health Lab** | Trust + Premium wall debt · SaaS lab |
| **5** | **Grow cluster** | Understanding mall · unlock theatre · XL surface |
| **6** | **Discovery Worlds** | Moments marketplace · XP/progress |
| **7** | **Talking Amy** | Neon game universe · Moments betrayal risk |
| **8** | **Birth Sky** | Parallel cinematic craft — unify or officially “wing” |
| **9** | **Ask Amy + Assistant** | Help spine · emoji → chat cut |
| **10** | **Emotional** | Trust spine · emoji feature page |
| **11** | **Guidance** | First insight sacred · tip shelf residue |
| **12** | **Curiosity** | Book marketplace chrome |
| **13** | **Story** | Moments joy · nearer pass with cleanup |
| **14** | **Make** | Side-by-side tool shelf |
| **15** | **PTM / Life Skills** | Help tools · lower frequency |
| **16** | **Presence activities / origami / art / event** | Nested Moments features |

---

# Production Readiness Matrix

| Module | Prod risk | Effort | Business | Conversion | Retention | Apple | Ship today |
|---|---|---|---|---|---|---|---|
| Ask Amy | L | M | H | H | H | Soft NO | YES |
| Emotional | L | M | H | M | H | Soft NO | YES |
| Speech Coach | M | L | H | H | M | Hard NO | YES* |
| PTM | L | S | M | M | M | Soft NO | YES |
| Life Skills | L | M | M | L | M | Soft NO | YES |
| Guidance | L | M | H | M | H | Soft NO | YES |
| Birth Sky | M | L | M | M | H | Hard NO | YES* |
| Curiosity | M | M | M | L | M | Hard NO | YES* |
| Grow | H | XL | H | H | M | Hard NO | YES* |
| Infant Care | M | L | **H** | **H** | **H** | Hard NO | YES |
| Nutrition | M | L | H | H | H | Hard NO | YES* |
| Health Lab | H | L | M | M | M | Hard NO | Cautious |
| Talking Amy | H | L | M | L | M | Hard NO | YES* |
| Discovery | H | L | M | M | M | Hard NO | YES* |
| Story | L | M | M | M | H | Soft NO | YES |
| Make | L | M | M | M | M | Soft NO | YES |
| Presence nest peers | L–M | M | M | L | M | Soft NO | YES |

---

# Global Findings

### Still another visual universe
Speech Coach · Talking Amy · Birth Sky (Amy Astro) · Discovery Worlds · Grow standalone pages · Nutrition page · Health Lab page · Curiosity books page

### Still feel like SaaS
Health Lab · Grow unlock panels · HubModule sticky utility headers · Nutrition achievements · Discovery progress dashboard

### Still feel like feature pages
Ask Amy emoji grid · Emotional mood grid · Guidance tips/articles · PTM/Life Skills glass expands · Story/Make shelves · Presence activity nest

### Break emotional continuity hardest
1. Leave Hub → Speech / Talking Amy / Discovery / Grow / Birth Sky / Nutrition / Health Lab  
2. Expand into emoji/XP shelves inside Hub (Ask Amy, Emotional, Infant, Study)

### Already meet AmyNest philosophy (partial)
- **Parent Hub rooms** (doors/heroes/exit) — PASS for home  
- Pack 5 quiet-slot **Premium voice** — PASS for continuity language  
- PTM / Story / Guidance — **closest** module intents; chrome still feature-grade  
- No destination yet fully inherits FE photography + materials + calm end-to-end

### Rebuild first
**Infant Care → Speech Coach → Nutrition → Health Lab → Grow → Discovery → Talking Amy → Birth Sky → Ask Amy/Assistant → Emotional → Guidance**

---

# Apple Human Interface Review (portfolio)

| Question | Answer |
|---|---|
| Would Apple approve Parent Hub rooms? | **Approaching YES** (post 4.9/5 first frame + quiet slot) |
| Would Apple approve the destination portfolio? | **NO** |
| Why? | Opening most destinations still becomes a software feature / parallel product with different light, materials, motion, and voice |
| Same photography? | **Only room shell** — modules use illustrations/emoji/neon/cinematic Astro |
| Same calm? | **No** after many AppLinks |
| Same material system? | **No** — `lz-glass` / HubModule / Astro / neon ≠ FE sanctuary |
| Same emotional voice? | Pack 5 improved Hub gates; deep modules still unlock/XP/PRO |

**Per-module Apple YES/NO:** see tables above — **zero full YES** for end-to-end destination immersion today.

---

# Founder Review

| Question | Answer |
|---|---|
| Did Pack 5 finish the Hub shelf P0? | **Yes** (presentation) |
| Is the product one home yet? | **No** — home lobby exists; wings are still other buildings |
| Should we ship Parent Hub now? | **Yes as Hub** — with destinations nested and expectations set |
| Should we claim Apple first-party continuity? | **No** until manufacturing order clears top breakers |
| Pack 6? | **Not authorized** by this audit |

### Founder Recommendation

1. **APPROVE this audit** as the map for future manufacturing orders.  
2. **Do not open Pack 6** until Founder picks a module from the priority matrix.  
3. Next manufacturing should be **one module at a time**, FE-universe inheritance only — no redesign of Parent Hub rooms.  
4. Prefer **Infant Care** or **Speech Coach** as first manufactured wing (impact × break).  
5. Keep Pack 5 quiet-slot law permanent for all Hub opens.

---

# Roadmap (recommended — not scheduled)

```text
Phase 0 (done)     Parent Hub rooms + Pack 4.9 + Pack 5 quiet continuity
Phase 1            Infant Care visual unification (stay in Hub)
Phase 2            Speech Coach home-continuity manufacturing
Phase 3            Nutrition + Health Lab Care wing
Phase 4            Grow Premium cleanup → then manufacturing
Phase 5            Moments: Discovery + Talking Amy
Phase 6            Birth Sky wing decision (unify vs intentional wing)
Phase 7            Help spine: Ask Amy + Emotional + Guidance hierarchy
Phase 8            Story / Make / Presence polish
```

No dates. No Pack numbers until Founder orders.

---

# Recommended manufacturing order

1. Infant Care  
2. Speech Coach  
3. Nutrition  
4. Health Lab  
5. Grow (Premium cleanup first, then surface)  
6. Discovery Worlds  
7. Talking Amy  
8. Birth Sky  
9. Ask Amy (+ Assistant continuity)  
10. Emotional Support  
11. Guidance  
12. Curiosity  
13. Story  
14. Make  
15. PTM Prep  
16. Life Skills  
17. Presence nested peers (activities / origami / art / event)

---

# FINAL QUESTION

## If every AmyNest logo disappeared today, would every destination still feel like it belongs to AmyNest?

# NO

### Blockers ordered by business impact

1. **Infant Care** still reads as emoji care OS — blocks highest daily Care trust/revenue continuity  
2. **Speech Coach** standalone is another app — burns Help conversion after Hub calm  
3. **Nutrition / Health Lab** Care wing becomes SaaS product pages — breaks exhausted-parent sanctuary  
4. **Grow unlock / learning marketplace** — Understanding becomes edtech store  
5. **Discovery Worlds + Talking Amy** — Moments becomes XP/game mall  
6. **Birth Sky Amy Astro cut** — meaning wing feels like a different brand  
7. **Ask Amy / Emotional emoji feature grids** — Help expands into tip/mood marketplace  
8. **Guidance tip/article shelf** — first insight competes with content mall  
9. **Curiosity book marketplace chrome** — soft identity becomes storefront  
10. **Story / Make / Presence tool shelves** — lower urgency but still not home rooms  
11. **Hub premium illustration glass** as default module chrome — structural universe split vs FE photography  
12. **AppLink leave without shared exit ritual** — transitions feel like app-switching  

---

## STOP

No implementation.  
No Pack 6.  
No Performance / Accessibility / DB / API / RevenueCat / Firebase work from this order.

Wait for Founder approval.
)
