# AmyNest — Final Portfolio Remediation Audit

**Status:** AUDIT ONLY · NO IMPLEMENTATION  
**Date:** 2026-08-08  
**Authority:** Founder Order — AmyNest Final Portfolio Remediation Audit  
**HEAD verified:** `052473f808cb82af9b9d0e601aeee79ee79580f6`  
**Branch:** `cursor/product-execution-model-v2`

**Law:** Judge AmyNest as **one application**, not as a gallery of high-scoring modules.  
**Method:** Read `docs/v2/*` · verify against **current code** under `artifacts/kidschedule` · do not invent moat · do not implement.

**Prior audits (inputs, not gospel):**  
`AMYNEST_FOUNDER_PORTFOLIO_AUDIT.md` · `AMYNEST_FINAL_GLOBAL_AUDIT.md` · `AMYNEST_FINAL_APPLE_AUDIT.md` · `AMYNEST_FINAL_VISUAL_REGRESSION.md` · `AMYNEST_FINAL_PRODUCTION_READINESS.md` · `AMYNEST_GLOBAL_MODULE_EXPERIENCE_AUDIT.md` · Parent Hub Constitution / Visual Manufacturing Study · Module Manufacturing Framework · all Phase 2 Founder Reviews · Routine Generation Deep Study + R1–R5 Founder Reviews

**Critical delta since Founder Portfolio Audit (`b926e8e0`):**  
Amy Coach Phase 2 · Amy Audio Phase 2 · Routine Generation R2–R5 living experience are now **manufactured and committed**. Prior docs that still call those surfaces “unmanufactured” are **stale**. Ship judgment is **not**.

**Frozen for this audit (do not reopen under this order):**  
Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · Birth Sky · Ask Amy · Guidance · Moments · Talking Amy · Amy Coach · Amy Audio · Routine Generation (R1–R5 + engine)

**STOP.** Commit only this document. Do **not** run Final Apple Audit. Do **not** fix anything. Wait for Founder review.

---

# Executive Summary

AmyNest now has:

- a **real front door** (Welcome → Keep → Discovery → Today Home → Hub doors)
- a **broad living-open campaign** across nearly every named destination
- a **manufactured Routine Generation crown path** (R2–R5) that can feel like today’s family life when the living flag stays ON

AmyNest still does **not** behave as **one continuous house** after the second and third taps.

| Lens | Verdict |
|---|---|
| Front door | **ONE HOME** |
| Manufactured openings / living rooms | **MOSTLY ONE HOME** (first frame) |
| Destination interiors + leave-paths | **FEDERATION** |
| Blind logo / whole app | **NO** |
| Premium as continuity | Soft **YES** on quiet opens · **NO** on leave / quota / unlock |
| Exhausted-parent trust after deep use | **Fragile** |
| Routine Generation as core product identity | **YES on living path** · soft **NO** if landed as planner list / flag OFF |
| Apple Design Review — complete application | **NO** |
| Soft launch under watch | Conditional **YES** |
| Ship safely to millions | **NO** |

### One sentence truth

> AmyNest is one calm parenting home **at the door and on living openings** — and still a federation of feature products **inside leave-paths, peer catalogues, dual-flag corpses, and unfinished interiors**.

### Founder test — never left the same home?

**At the door: YES.**  
**Through manufactured first frames: MOSTLY YES.**  
**Through deepen / leave / flag-OFF: NO.**

Manufacturing bought openings and several living rooms.  
It did **not** finish interiors, leave-paths, navigation dialect, dual-universe debt, accessibility certification, or production trust for millions.

---

# Portfolio Map

| Surface | Living flag (default ON) | Open / room | Deepen / leave | Dominant residual feel |
|---|---|---|---|---|
| **Welcome** | FE frozen | **PASS** | **PASS** | Sanctuary film |
| **Signup Keep** | FE frozen | **PASS** | **PASS** | Keep ritual |
| **Child Discovery** | `VITE_FF_CHILD_DISCOVERY_FILM` | **PASS** | Soft PASS | Film (edge resume debt) |
| **Today Home** | `VITE_FF_TODAY_HOME_V1` | **PASS** | Soft PASS | Sanctuary home |
| **Parent Hub** | `VITE_FF_PARENT_HUB_ROOMS_V1` | Doors **PASS** | Room peers Soft **FAIL** | Doors sanctuary · peers mall |
| **Infant Care** | `VITE_FF_INFANT_CARE_LIVING_V1` | Soft **PASS** | Soft **FAIL** | Care OS / nested chrome |
| **Speech Coach** | `VITE_FF_SPEECH_COACH_LIVING_V1` | Soft **PASS** | **FAIL** | Neon / XP sessions (`live-speech-coach`, `pronunciation-companion`) |
| **Nutrition** | `VITE_FF_NUTRITION_LIVING_V1` | Soft **PASS** | Soft **FAIL** | SaaS tabs Today/Plan/Track/Learn/Family |
| **Health Lab** | `VITE_FF_HEALTH_LAB_LIVING_V1` | Soft **PASS** | **FAIL** | XP / quests / shop / game body |
| **Grow** | `VITE_FF_GROW_LIVING_V1` | Soft **PASS** | **FAIL** | Edtech leave apps (`/abacus`, `/phonics`, …) |
| **Birth Sky** | `VITE_FF_BIRTH_SKY_LIVING_V1` | Soft **PASS** | Soft **FAIL** | Amy Astro residue / dashboard wing |
| **Ask Amy** | `VITE_FF_ASK_AMY_LIVING_V1` | Soft **PASS** | Soft **FAIL** | `/assistant` without `?companion=1` = mode desk |
| **Guidance** | `VITE_FF_GUIDANCE_LIVING_V1` | Soft **PASS** | Soft PASS | Tip/article shelf residue |
| **Moments** | `VITE_FF_MOMENTS_LIVING_V1` | **PASS** | Soft **FAIL** | Deepen premium shells · Discovery hidden |
| **Talking Amy** | `VITE_FF_TALKING_AMY_LIVING_V1` | Soft **PASS** | Soft residual | Achievement/mode DNA; neon if flag OFF |
| **Amy Coach** | `VITE_FF_AMY_COACH_LIVING_V1` | Soft **PASS** | Soft residual | Beside you living; win-card / emoji residue |
| **Amy Audio** | `VITE_FF_AMY_AUDIO_LIVING_V1` | Soft **PASS** | Soft residual | Quiet listen living; age-grid under fold |
| **Routine Generation** | `VITE_FF_ROUTINE_LIVING_V1` | **PASS** (R2–R5) | Soft PASS | Crown path when living; planner if OFF / list entry |

### Still in portfolio gravity (incomplete / orphan)

| Surface | Truth |
|---|---|
| Curiosity | Bookstore / quota — **not healed** |
| Discovery Worlds | Hidden from Moments first frame — **not healed** · XP marketplace |
| PTM / Life Skills | Pack 5 chrome only |
| Story / Make bodies | Softened by Moments room · shelves remain |
| Gaming Hub corpse | Kill-switched · component still shippable if restored |
| Dual living/legacy universes | **13+ dual faces compiled** into one binary |

---

# 1 — Blind One-Product Test

Ignore logo, brand name, module marketing names. Ask only: **same application?**

| Transition | Result | Why |
|---|---|---|
| Welcome → Discovery | **PASS** | Same FE film grammar, light, photography |
| Discovery → Today | **PASS** | Sanctuary handoff; one home breath |
| Today → Parent Hub | **PASS** | Room doors continue house materials |
| Hub → Infant Care | **PARTIAL** | Living open continues house; nested Care OS residual |
| Hub → Speech Coach | **PARTIAL** | Living open continues; live/talk sessions hard-cut to neon game |
| Hub → Nutrition | **PARTIAL** | Living open continues; sticky SaaS tabs reopen tool dialect |
| Hub → Health Lab | **PARTIAL** | Living open continues; More/session XP-shop is another product |
| Hub → Grow | **PARTIAL** | Living educational room continues; leave apps are edtech products |
| Hub → Birth Sky | **PARTIAL** | Living Understand room continues; Astro dashboard wing residual |
| Hub → Ask Amy | **PARTIAL** | Companionship open continues; non-companion `/assistant` is chatbot desk |
| Hub → Guidance | **PARTIAL** | Stream open continues; article shelf residue on deepen |
| Hub → Moments | **PASS** | One emotional room open holds |
| Moments → Talking Amy | **PARTIAL** | Living room continues; achievement/mode DNA still peeks |
| Hub → Amy Coach | **PARTIAL** | Beside you living continues; center-tab still product-suite architecture |
| Hub → Amy Audio | **PARTIAL** | Quiet listen continues; catalogue under fold residual |
| Today → Routine Generation | **PASS** | Living entry “Today's plan” belongs to Today |
| Routine Generation → Today | **PASS** | R5 continuity exits lead back to life/Home (not browse-more) |

### Blind portfolio answer

**NO — not yet one application end-to-end.**  
Front door + many living opens can pass a logo-blind test.  
Leave-paths, peer Hub catalogues, dual-flag corpses, and unfinished interiors fail it.

---

# 2 — Visual Consistency Audit

### Same-house elements (canonical when present)

| Element | Canonical source |
|---|---|
| Photography | `/experience/r1/shot-0[1–5]-*.png` FE memory stack |
| Materials | Night sanctuary + warm sand glass (`first-experience-material.css`, Hub living, Today sanctuary) |
| Typography | Quicksand sanctuary titles; FE whisper hierarchy |
| Voice | Companionship (“I'm here with you”) · `PREMIUM_VOICE` |
| Open pattern | One recommend + quiet paths · no Try Free shelf in Hub quiet slot |

### Competing visual systems still alive

| System | Surfaces | Severity |
|---|---|---|
| FE sanctuary film | Welcome · Discovery · Today · Hub doors · living opens | Canonical |
| Hub premium glass mall | Peer destination lists · launch cards · Explore Free badges | **P1** |
| Neon / violet game night | Speech live/talk · Talking Amy flag-OFF · legacy Coach/Audio | **P0** |
| Cosmic Astro wing | Birth Sky dashboard/settings residual | **P1** |
| Light SaaS tool chrome | Nutrition tabs · `/assistant` non-companion · HubModule leave shells | **P0–P1** |
| Gamification OS | Health Lab XP/quests · Discovery Worlds · points theatre flag-OFF RG | **P0** |
| Edtech unlock | Grow leave apps · LockedBlock · “Unlock with Premium” | **P0** |

### Major inconsistencies (sample — not exhaustive)

| CURRENT | EXPECTED | SEVERITY | EVIDENCE | REMEDIATION (do not implement) |
|---|---|---|---|---|
| Speech live `#070812` neon + XP bar | Same house care session | **P0** | `live-speech-coach.tsx`, `pronunciation-companion.tsx` SessionXPBar | Remanufacture session interiors as Help-room continuity; hide XP theatre |
| Health Lab XP / Golden Challenge / shop | Care room deepen | **P0** | `health-lab-home.tsx`, celebration/rewards | Care deepen grammar; demote game OS behind living |
| Grow leave `/abacus` `/phonics` unlock shells | Quiet educational deepen | **P0** | `hub-module-page-shell.tsx`, learning pages | Shared leave shell inheriting Understand FE; strip PRO/Unlock shout |
| `/assistant` mode SKU tabs + Zap upgrade | Companionship conversation | **P0** | `assistant.tsx` WEB_MODES; Zap when `!companionMode` | Default companion chrome; never mode mall as first truth |
| Hub peer catalogues after doors | One recommend per room (Moments standard) | **P0** | `parenting-hub.tsx` / `destinations.ts` Help·Care·Understand lists | Apply Moments one-room law to sibling rooms |
| Bottom tabs: Dashboard / Routines / Amy Coach SKU / Parenting Hub | Places of life | **P1** | `mobile-tab-bar.tsx` | Rename/reframe to Home · Today’s plan · Beside you · Rooms (living already softens Coach) |
| Dual living/legacy faces compiled | One shippable face | **P0** | 13 `VITE_FF_*_LIVING_V1` + Hub/Today flags | Runtime kill or delete corpses before Apple |
| Photography abandoned after AppLink | FE ambient continues | **P1** | Leave apps drop R1 shots | Shared leave shell with FE ambient mandatory |

---

# 3 — Experience Consistency

Every destination must answer: Why here? What do? Why now? What next? How leave?

| Destination | Five questions on open | On deepen / leave |
|---|---|---|
| Welcome → Today → Hub doors | **Answered** | — |
| Manufactured living opens | **Mostly answered** | Often reopen catalogue / tool / game |
| Speech / Health / Grow leave | Soft | **Fail** — another product grammar |
| Ask Amy non-companion | Soft | **Fail** — chatbot desk |
| Curiosity / Discovery | Soft/hidden | **Fail** — marketplace |
| Routine Generation living | **Answered** through R5 | Continuity exits answer leave |

### Still behaves like…

| Feel | Surfaces |
|---|---|
| Feature catalogue | Help / Care / Understand peer lists; Curiosity; legacy Hub mall |
| Tool / SaaS | Nutrition tabs; `/assistant` modes; some deepen chrome |
| Dashboard | Health deepen; Birth Sky dashboard wing; legacy Home if Today flag OFF |
| Marketplace | Explore Free cards; Discovery Worlds; audio age Explore residue |
| Game | Speech sessions; Health XP; Talking Amy achievements residual |
| Astrology app | Birth Sky Astro residual strings/settings |
| Planner app | Routines list / living OFF RG path |
| AI demo / chatbot | Non-companion assistant; legacy Coach neon |
| Audio app | Amy Audio living OFF / deep catalogue |

---

# 4 — AmyNest House Law

| Inheritance | Door | Living opens | Deepen / leave / flag-OFF |
|---|---|---|---|
| Same home | **YES** | Soft **YES** | **NO** |
| Same light | **YES** | Soft **YES** | **NO** (neon / cosmic / clinic / light SaaS) |
| Same photography | **YES** | Soft **YES** | **NO** (optional / abandoned) |
| Same materials | **YES** | Soft **YES** | **NO** (three+ night dialects) |
| Same typography | Soft YES | Soft YES | Soft **NO** (PRO / XP / Assistant shout) |
| Same emotional voice | **YES** | Soft YES | Soft **NO** |
| Same calm | **YES** | Soft YES | **NO** |
| Same trust | Soft YES | Soft YES | Soft **NO** (quota / walls) |
| Same Premium philosophy | Soft YES | Soft YES (quiet) | **NO** (unlock theatre) |
| Same exit philosophy | Soft YES | Soft YES (Hub exit panel / RG R5) | Soft **NO** (AppLink app-switch) |

**Violations (exact):** Speech neon sessions · Health game body · Grow unlock leave · `/assistant` Zap desk · Birth Sky Astro wing · Curiosity bookstore · Discovery XP · dual-flag corpses · Hub Explore Free badges outside quiet slot · tab SKU dialect.

---

# 5 — Parent Fatigue Test

Tired parent · phone · one hand · limited attention.

| Surface | 3-second clarity | Notes |
|---|---|---|
| Welcome | **YES** | Film decides |
| Signup Keep | **YES** | Keep ritual |
| Child Discovery | **YES** | Film not form |
| Today Home | **YES** | One breath / act |
| Parent Hub doors | **YES** | Four rooms |
| Hub peer lists | **NO** | Too many equal SKUs |
| Infant Care living | Soft **YES** | Nested density residual |
| Speech living open | Soft **YES** | Deepen becomes game OS |
| Nutrition living | Soft **YES** | Tabs compete |
| Health living | Soft **YES** | Deepen gamifies |
| Grow living | Soft **YES** | Leave is edtech maze |
| Birth Sky living | Soft **YES** | Setup length residual |
| Ask Amy living | Soft **YES** | Leave can become desk |
| Guidance | Soft **YES** | Stream holds |
| Moments | **YES** | One room |
| Talking Amy living | Soft **YES** | Mode picker residual |
| Amy Coach living | Soft **YES** | Goal grid residual |
| Amy Audio living | Soft **YES** | Age grid under fold |
| Routine Generation living | **YES** | Build → Here it is → Begin → care → Home |

**Fatigue truth:** Amy is clear for ~3 seconds on the door and living opens.  
She becomes noisy after catalogues, tabs, XP, unlock, and mode desks.

---

# 6 — Product Hierarchy

### Intended stack

```text
Today Home
   ↓
Parent Hub (Help · Understand · Care · Moments)
   ↓
Modules (rooms)
   ↓
Routine Generation (crown intelligence loop)
   ↓
Amy intelligence (beside / ask / talk / coach / audio)
   ↓
Secondary / legacy
```

### Distortions still present

| Distortion | Evidence |
|---|---|
| Feature malls | Hub peer destination catalogues |
| Duplicate entry points | Today CTA · Routines tab · Hub · deep links · first-value flags |
| Competing heroes | Living open vs nested launch cards vs leave app heroes |
| Duplicate CTAs | Recommend + Explore Free + Unlock + Zap |
| Browse loops | Curiosity · Discovery · learning leave apps |
| Dead ends | Some leave apps lack calm exit-to-life ritual |
| Orphan features | Discovery Worlds hidden-not-healed; Gaming corpse |
| Legacy navigation | Bottom tabs product suite; `/dashboard` naming |
| Duplicate recommendations | Quiet recommend + catalogue tiles still co-present in rooms |

---

# 7 — Premium / Conversion Audit

**No pricing / RevenueCat / entitlement changes in this audit.**

### Experience question

Does the parent feel meaningful value before payment?

| Path | Feeling |
|---|---|
| Living opens + Pack 5 quiet slot | Continuity · support · confidence · time saved |
| Leave-paths / quota / unlock | Unlock theatre · FOMO · marketplace · hard wall |

### Violations

| Class | Finding |
|---|---|
| **P0 trust** | Hard-day / emotional adjacency still monetizable via assistant quota (“Upgrade to continue”) |
| **P0 trust** | Infant “3 free baby questions” framing residual |
| **P1 conversion** | Calm open → unlock leave teaches bait |
| **P1 conversion** | Explore Free / Try Free / Unlock with Premium still compiled outside quiet slot |
| **P2 polish** | Crown / Zap chrome residual; trial spotlight SKU naming |

### Balance judgment

| Risk | Status |
|---|---|
| Too generous to convert | Soft risk on living opens without clear next paid continuity |
| Too restrictive to build trust | **YES** on emotional/crisis-adjacent quota walls |
| Correctly balanced | Soft YES only when quiet continuity is the only face |

---

# 8 — Routine Generation Portfolio Audit

**Engine:** PRODUCTION FROZEN — not thawed.  
**Experience:** R1 blueprint · R2 entry/context · R3 result WHAT/WHY/WHEN/HOW · R4 adapt/begin · R5 continuity — **manufactured** (`7e8e41fd` + docs).

| Stage | Living ON | Living OFF / alternate entry |
|---|---|---|
| Entry | Today's plan | Generate Routine planner dialect |
| Context | Child / day deltas as life | Form residue |
| Build / Generation | Engine frozen · quiet craft | Legacy sparkle theatre |
| Result WHAT/WHY/WHEN/HOW | Living plan room | Older result chrome |
| Adaptation | Adjust vs Rebuild honesty | Regen labels |
| Execution | Presence ring · grace | % / points toast theatre |
| Completion | We cared well today | Confetti / points |
| Continuity | Exits to Home/Hub/Coach/Audio | Weak leave |
| Today handoff | R5 exits + existing state | Possible |

### Crown-jewel test

| Question | Answer |
|---|---|
| Feels like AmyNest’s crown jewel? | **YES on living path** — strongest manufactured continuity loop in the portfolio |
| Still looks like a planner? | Soft **YES** on `/routines` list / flag OFF / % theatre |
| Differentiation without exposing internals? | **YES** — experience layer; engine frozen |
| Inherits the house? | Soft **YES** (Hub materials + living voice); not FE film photography throughout |
| Stronger identity than ordinary modules? | **YES** when living ON — only surface with full Build→Live→Complete→Home story |

**Do not modify the frozen engine.** Remaining RG debt is FUTURE soft-edit / engine memory / true resume contract — not P0 for Apple façade, but P1 for crown completeness.

---

# 9 — AI Experience Audit

| Surface | Living face | Residual risk |
|---|---|---|
| Ask Amy | Companionship room | Non-companion `/assistant` = chatbot / mode desk / Zap |
| Amy Coach | Beside you room | Goal emoji grid / win-card residual; flag-OFF neon |
| Talking Amy | Living room | Achievement/mode DNA; neon corpse |
| Birth Sky | Understand room | Astro product wing residual |
| Routine Generation | Life intelligence | Planner if OFF |
| Speech Coach | Help open | Session AI feels like game toy |

### Required AI feeling vs current

| Required | Portfolio today |
|---|---|
| Trustworthy | Soft YES on living · fragile on quota walls |
| Calm | Soft YES on opens · NO on neon/XP |
| Human | Soft YES companionship voice |
| Context-aware | Soft YES where child context present |
| Consistent | **NO** across AI surfaces |
| Appropriately bounded | Soft YES engines · **NO** when upgrade interrupts care |

**None should feel like:** AI demo · generic LLM wrapper · magic theatre · toy.  
**Still can:** non-companion assistant · Speech XP sessions · Talking Amy achievement theatre · Astro certainty residue.

---

# 10 — Accessibility Audit

**Do not certify what was not device-verified in this run.**

| Area | Status | Evidence class |
|---|---|---|
| Reduced motion | Partially present | Code paths in living/celebration/tabs |
| Semantic labels on living opens | Partially present | Founder reviews + living components |
| 48px+ targets | Partially improved | RG exits / some living CTAs |
| Dynamic Type | **Not certified** | Prior Apple audit score ~4.5 |
| VoiceOver / TalkBack Hub | **Not certified** | Prior audits admit incomplete |
| Photography-only meaning | Risk | Living opens often photo+text; leave apps vary |
| Motion-only state | Risk residual | Celebrations / neon sessions |
| Color-only status | Risk residual | Progress / XP / badges |

### Accessibility debt

| Priority | Debt |
|---|---|
| **P0** | Dynamic Type + Hub/module VO pass not proven — cannot claim Apple craft |
| **P1** | Focus order / leave-app semantics inconsistent |
| **P2** | Photography dependence / grain contrast edge cases |

---

# 11 — Performance Audit

| Risk | Finding |
|---|---|
| Initial load | Lazy routes help; Hub megapage + voice weight remain |
| Navigation | AppLink leave loads foreign module universes |
| Images | FE R1 reuse good on opens; leave apps reload other assets |
| API waterfalls | Hub / intelligence / learning progress still heavy |
| Generation latency | RG engine frozen — experience must not add waterfalls (R5 claim: no new) |
| AI calls | Assistant / Coach / Speech / Birth Sky cost + failure UX uneven |
| Animation | Carnival residual on game/health/legacy |
| Offline | Partial module sync — not app-wide |
| Memory | Voice / three.js / large maps still in bundle graph |

**No destructive tests run.** Portfolio risk = **CONDITIONAL** for soft launch · **NO** for millions concurrency proof.

---

# 12 — Production Safety Audit

(Binds `AMYNEST_FINAL_PRODUCTION_READINESS.md`; verified flags/routes still present.)

| Domain | Verdict | Notes |
|---|---|---|
| Auth / OAuth / sessions | **P0** for millions | No account linking / guest upgrade |
| Firebase | CONDITIONAL | Auth+FCM real; not hardened data plane |
| RevenueCat ops | **P0** | Model present; ops/QA not certified |
| Entitlements | CONDITIONAL | Logic present; leave-path theatre undermines trust |
| DB / tenancy | **P0** | Soft child isolation / push-schema debt |
| API | CONDITIONAL | Auth solid; patchwork RL / AI debug risk |
| Feature flags | **P0** | Dual universes default ON; no runtime kill |
| Routing / deep links | CONDITIONAL | Many aliases; Home=`/dashboard` dialect |
| Existing users/data | Soft YES | Engines preserved by manufacturing law |
| Rollback | CONDITIONAL | Flag `=0` restores legacy faces (also restores mall/neon) |
| AI / network / partial state | CONDITIONAL | Uneven recovery UX |
| App termination | Soft YES | Resume helpers exist in places; not universal |

---

# 13 — Legacy / Dual-Universe Audit

| Surface | File / component | Current state | Risk | Recommended remediation |
|---|---|---|---|---|
| Dual living flags (13+) | `lib/**/living-room.ts`, RG `living-entry.ts`, Hub/Today flags | Both faces compiled; default living ON | **P0** regression bomb | One shippable face; runtime kill or delete corpses |
| Explore Free / Premium badges | `parenting-hub.tsx`, launch cards | Still live outside quiet slot | **P1** | Moments-standard room opens; strip badges |
| Try Free badge | `try-free-badge.tsx` | Quiet-suppressed only in quiet provider | **P1** | Never reach leave theatre |
| Unlock with Premium | `locked-block.tsx`, `hub-module-page-shell.tsx` | Live on leave | **P0** | Continuity language only after value |
| Speech neon sessions | `live-speech-coach.tsx`, `pronunciation-companion.tsx` | Live | **P0** | Interior manufacture |
| Health XP/shop | `health-lab-home.tsx` et al. | Live | **P0** | Care deepen manufacture |
| Talking Amy neon corpse | `talking-amy/index.tsx` audit-block | Flag OFF restores | **P0** | Delete or hard-disable in ship builds |
| Birth Sky Astro | `features/birth-sky/**` residual | Softened living · wing remains | **P1** | Finish Understand shell through dashboard |
| Curiosity bookstore | `answer-to-kids-how` | Untouched | **P1** | Manufacture or demote/hide honestly |
| Discovery Worlds XP | Presence nest / hub tiles | Hidden ≠ healed | **P1** | Heal or remove from graph |
| Gaming Hub corpse | `gaming-hub-launch-card.tsx` | Not in rooms IA; still present | **P2** | Delete dead code |
| Points / coins / earnGamingPoints | `detail.tsx`, Hub | Side-effects remain (RG living silences toast) | **P1** | Keep side-effects silent portfolio-wide or retire theatre |
| Old nav labels | `mobile-tab-bar.tsx` | Dashboard / Routines / Parenting Hub | **P1** | Places-of-life labels |
| Amy Astro menu residue | layout menu / AppCore labels | Residual | **P2** | Rename to Birth Sky / Understand |

---

# 14 — Navigation Audit

| Question | Answer |
|---|---|
| Does navigation communicate one product? | Soft **NO** — rooms philosophy vs product-suite tabs |
| Historical architecture exposed? | **YES** — `/dashboard`, Routines list, Parenting Hub SKU, many leave routes |

### Findings

| Issue | Evidence |
|---|---|
| Home destination dialect | `/` → `/dashboard` (`AppCore.tsx` HomeRedirect) while product truth is Today Home sanctuary |
| Tab SKU names | Dashboard · Routines · Amy Coach · Parenting Hub |
| Living soft rename only Coach | Beside you when `VITE_FF_AMY_COACH_LIVING_V1` |
| Deep links many | Resume / companion / goal / birth-sky aliases |
| Module exits uneven | Hub exit panel strong; leave apps weak |
| Routine exits improved | R5 continuity exits |
| Premium exits | Paywall / Zap / Unlock interrupt life flow |
| Browse loops | Curiosity · Discovery · learning leave |
| Dead / legacy routes | Games, rewards, debug, admin, gaming corpse |

---

# 15 — Category Moat

### REAL / EVIDENCED

1. Front-door film continuity (Welcome → Keep → Discovery → Today → Hub doors)  
2. FE photography grammar when present  
3. Companionship voice + one-recommend living opens  
4. Moments as one emotional room (standard not yet applied to sibling rooms)  
5. Pack 5 quiet-module premium continuity law  
6. Routine Generation living loop (context → plan → adapt → execute → complete → Home) above a frozen intelligence engine  
7. Child-context personalization already wired into generation / coach / care paths (engine-level, not just UI)  
8. Exit-to-life ritual emerging (Hub panels · RG R5)

### POTENTIAL (not yet portfolio-true)

- Cross-module memory that parents can *feel* as one Amy  
- Routine adaptation learning from execution feedback (engine frozen; FUTURE)  
- True leave-path inheritance (shared shell)  
- Single shippable face (no dual universes)

### MARKETING CLAIM (do not treat as moat)

- “One AI parenting OS” while leave-paths still speak other apps  
- “Apple-ready craft” while a11y unverified and interiors foreign  
- “Premium continuity” while Zap/Unlock/Explore Free remain reachable

**If UI were copied tomorrow:** the hard-to-copy part is the **door + living recommend philosophy + frozen routine intelligence behind R2–R5**. The federation interiors are copyable feature products.

---

# 16 — Business Readiness

| Funnel stage | Status |
|---|---|
| Activation | Strong door · Today Home |
| First value | Soft strong via Routine CTA / living opens |
| Day-1 value | Soft YES if parent stays on living path |
| Day-3 value | Fragile after leave betrayal |
| Routine creation | Strong (living RG) |
| Routine execution | Improved (R5) |
| Module discovery | Over-abundant (mall risk) |
| Premium exposure | Too early on leave / quota; too quiet sometimes on value |
| Conversion readiness | Soft — emotion converts; pressure undoes |
| Retention potential | High if interiors join house; low if trust decays |
| Parent trust | Door YES · portfolio NO |
| Recommendation potential | Yes for door · hesitate after neon/XP leave |
| Family expansion | Blocked by identity linking gaps |

### Where users are lost

1. Hub peer catalogue overwhelm  
2. Leave-path “another app” betrayal  
3. Emotional path → upgrade wall  
4. Dual-flag / legacy accident  
5. Production identity / billing friction at scale  

---

# 17 — Apple Readiness Precheck

**This is NOT the Final Apple Audit.**

| Dimension | Precheck |
|---|---|
| Craft | Door/opens strong · leave weak |
| Consistency | Façade system |
| Clarity | Opens clear · catalogues noisy |
| Deference | Soft YES living · NO XP/unlock |
| Materials / Photography / Type / Motion | Split house |
| Accessibility | Not certified |
| Trust / Premium | Quiet open / hard sell later |
| Navigation | Product suite residual |
| One-product coherence | **NO** |

### Apple reviewer perception

> ONE PRODUCT — or MULTIPLE APPS UNDER ONE SHELL?

# MULTIPLE APPS UNDER ONE SHELL

(with an excellent lobby and many excellent first frames)

---

# 18 — Screenshot / Visual Evidence

| Evidence class | Status |
|---|---|
| Prior Founder Review screenshots | Exist for many Phase 2 opens; may be stale for deepen |
| Auth-gated live captures this run | **Not taken** (cloud audit) |
| Code-as-truth verification | **Done** for flags, leave paths, tabs, RG R5, assistant companion mode, Speech XP, Health living gate |

**Visual regressions vs approved opens:** living opens largely hold; interiors/leave still regress to foreign systems (unchanged debt, not new regression from R5).

---

# 19 — Scoring

Scores judge the **complete application**, not manufactured openings alone.  
Updated vs Founder Portfolio for RG / Coach / Audio manufacturing — **not** inflated into ship readiness.

| Dimension | Score / 10 | Note |
|---|---|---|
| Visual Identity | **7.2** | Door 9.5 · leave ~3.5 |
| Product Identity | **6.8** | Home philosophy clearer; federation remains |
| Emotional Consistency | **6.2** | Opens aligned · deepen breaks |
| Navigation | **6.0** | Rooms strong · tabs SKU |
| UX Clarity | **6.5** | 3s YES on opens · NO on catalogues |
| Parent Fatigue | **6.0** | Door calm · mall fatigue |
| Accessibility | **4.5** | Not certified |
| Performance | **6.0** | Soft-launchable · unproven at scale |
| Premium Experience | **5.2** | Quiet continuity vs leave unlock |
| Trust | **5.6** | Door trusted · quota/walls remain |
| AI Experience | **6.3** | Companionship opens · desk/game residual |
| Routine Generation | **8.2** | Living R2–R5 crown path (flag ON) |
| Cross-module Continuity | **5.0** | Meta failure for Apple |
| Production Safety | **4.8** | Millions blockers remain |
| Conversion Readiness | **5.8** | Emotion converts · pressure undoes |
| Apple Readiness | **5.6** | Complete app NO |
| Business Maturity | **5.2** | Soft launch conditional |
| Founder Confidence | **6.4** | Framework proven · interiors unpaid |
| **Overall Product Readiness** | **5.8** | Not Apple-complete |

### Composite scores

| Composite | Score | Meaning |
|---|---|---|
| **Front Door Score** | **9.0** | Welcome→Today→Hub doors shippable film |
| **Core Product Score** | **7.6** | Today + living RG + Hub doors + key living opens |
| **Complete Portfolio Score** | **5.8** | Federation after second/third tap |

---

# Top 10 Blockers

1. **Not one application after the second/third tap** — Design Review continuity failure  
2. **Leave-path betrayal** — Speech neon/XP · Health game · Grow unlock · `/assistant` Zap · Birth Sky Astro · Discovery XP  
3. **Help / Care / Understand still peer product catalogues** — Moments standard not applied  
4. **Premium interruption after calm open** — bait pattern  
5. **Emotional / hard-day path monetizable** — trust/humanity failure  
6. **Accessibility uncertified vs sanctuary claims** — Apple craft  
7. **Dual living/legacy universes compiled** — two products in one binary  
8. **Navigation product-suite dialect** — Dashboard / Routines / Parenting Hub SKU  
9. **Photography/materials optional after deepen** — hard cuts  
10. **Production millions blockers** — identity linking · RC ops · consent · tenancy · child isolation  

---

# Top 10 Strengths

1. Front-door film is real and frozen  
2. Manufacturing framework works for openings  
3. FE photography + sanctuary materials when present  
4. Companionship voice is a felt philosophy  
5. Moments one-room standard exists  
6. Pack 5 quiet-module premium law exists  
7. Routine Generation living R2–R5 is a true crown loop  
8. Amy Coach / Amy Audio living rooms joined the house  
9. Exit-to-life rituals emerging (Hub · RG R5)  
10. Reuse-before-rewrite held — engines frozen while experience healed  

---

# Top 10 Highest-ROI Fixes

1. **Shared leave-path shell** inheriting FE light/photo/materials for Speech · Health · Grow · Assistant · Birth Sky  
2. **Apply Moments one-room law** to Help · Care · Understand peer catalogues  
3. **Default companion chrome** for Ask Amy; kill Zap theatre on care paths  
4. **Strip XP/unlock theatre** from Speech sessions + Health deepen (keep silent side-effects if required)  
5. **Runtime kill dual universes** (or remove corpses from ship builds)  
6. **Places-of-life tab labels** + Home=`Today` unit of language  
7. **Emotional path free / non-monetized** (trust)  
8. **Curiosity demote/heal** + Discovery heal-or-remove  
9. **Dynamic Type + VO certification pass** on door + Hub + RG + top 5 rooms  
10. **Account linking + guest upgrade + RC ops certification** (production trust)

---

# Prioritized Remediation Backlog

**One consolidated backlog. Do not implement from this document.**

## P0 — must fix before Apple / production claim

| ID | Problem | Surface | Evidence | Why it matters | Recommended solution | Dependencies | Risk | Size |
|---|---|---|---|---|---|---|---|---|
| P0-1 | Not one app after deepen | Portfolio | Blind test PARTIAL/FAIL leave | Apple consistency | Finish interiors via shared leave shell | Framework + FE assets | High if half-done façades | **XL** |
| P0-2 | Speech neon/XP sessions | Speech Coach | `live-speech-coach.tsx`, SessionXPBar | Another app under icon | Remanufacture session as Help continuity; silence XP UI | Speech engines frozen | Medium | **L** |
| P0-3 | Health game/XP/shop deepen | Health Lab | `health-lab-home.tsx` rewards | Gamification betrayal | Care deepen grammar; demote game OS | Health engine frozen | Medium | **L** |
| P0-4 | Grow unlock leave apps | Grow leave | `hub-module-page-shell`, learning pages | Edtech store in home | Shared Understand leave shell; strip PRO/Unlock | Learning engines frozen | Medium | **L** |
| P0-5 | Assistant mode desk / Zap | Ask Amy leave | `assistant.tsx` WEB_MODES | Chatbot + monetized care | Companion default; continuity Premium only | Entitlements unchanged | High trust | **M** |
| P0-6 | Hub peer catalogues | Help/Care/Understand | `destinations.ts`, Hub lists | Feature mall after doors | Moments one-room law | Hub IA frozen (4 rooms) | Medium | **L** |
| P0-7 | Hard-day monetization | Ask Amy / Emotional | quota upgrade copy | Humanity failure | Free crisis-adjacent path | Business policy | High | **M** |
| P0-8 | Dual universes ship | All living flags | 13+ `VITE_FF_*_LIVING` | Regression / wrong face | One shippable face + runtime kill | Ops | High | **L** |
| P0-9 | A11y uncertified | Portfolio | prior Apple 4.5 | Cannot claim craft | Device VO/DT pass on core path | QA devices | Medium | **L** |
| P0-10 | Identity / RC / tenancy / consent | Production | Production readiness | Millions unsafe | Linking · guest upgrade · RC QA · consent · child isolation | Backend/ops | Very high | **XL** |

## P1 — major product-quality

| ID | Problem | Surface | Size |
|---|---|---|---|
| P1-1 | Tab / Home dialect still product suite | `mobile-tab-bar`, `/dashboard` | **M** |
| P1-2 | Birth Sky Astro dashboard wing residual | Birth Sky deepen | **M** |
| P1-3 | Nutrition SaaS tab dialect | Nutrition layout | **M** |
| P1-4 | Curiosity bookstore untouched | Understand | **M** |
| P1-5 | Discovery Worlds hidden ≠ healed | Moments/Presence | **M** |
| P1-6 | Explore Free badges outside quiet slot | Hub launch cards | **S** |
| P1-7 | Photography abandoned after AppLink | Leave apps | **M** |
| P1-8 | Talking Amy achievement/mode residual | Talking Amy | **M** |
| P1-9 | Coach/Audio under-fold catalogue residue | Coach · Audio | **S** |
| P1-10 | RG true resume / soft-edit FUTURE honesty | Routine Generation | **L** (engine policy) |
| P1-11 | Points theatre elsewhere still audible | Hub / games / health | **M** |
| P1-12 | Offline / performance proof gaps | Portfolio | **L** |

## P2 — polish

- Gaming Hub dead code deletion  
- Amy Astro menu string cleanup  
- Living title weight vs FE whisper  
- Empty/error microcopy unification  
- Celebration residual carnival on non-living paths  
- Trial spotlight SKU naming  

## P3 — future enhancement

- Feedback → routine engine memory (requires thaw policy)  
- Family living adapt  
- Cross-module felt memory productization  
- True offline parenting day  
- Broader internationalization craft pass  

---

# Founder Questions

### 1. Is AmyNest now ONE application?

**NO** — not end-to-end.  
**YES** for the front door and many living first frames.  
**NO** for deepen / leave / flag-OFF / peer catalogues.

### 2. Which surfaces still feel like another company?

Speech neon sessions · Health Lab game body · Grow leave unlock apps · `/assistant` mode desk · Birth Sky Astro wing · Curiosity bookstore · Discovery Worlds XP · legacy Hub mall · dual-flag corpses.

### 3. Which surface is currently the weakest?

**Tie for weakest leave-paths:** Speech Coach sessions · Health Lab deepen · Grow leave apps · non-companion `/assistant`.  
If forced to one: **Speech neon/XP sessions** (most violently “another app”).

### 4. Which surface is currently the strongest?

**Front door film** (Welcome → Today → Hub doors).  
Among manufactured products: **Routine Generation living R2–R5** as the strongest core loop; **Moments** as the strongest room-standard.

### 5. Is Routine Generation worthy of being the core product?

**YES** — on the living path it is the clearest AmyNest crown jewel (life → plan → adapt → care → Home).  
Guardrail: keep living ON; do not let `/routines` list or flag-OFF planner dialect become the public face.

### 6. What is the single biggest conversion problem?

**Trust decay after calm open** — value taught as continuity, then interrupted as unlock/quota/marketplace on leave.

### 7. What is the single biggest Apple problem?

**Not one continuous application after the second/third tap** (leave-path federation).

### 8. What is the single biggest accessibility problem?

**Dynamic Type + VoiceOver/TalkBack not certified** on Hub/module core paths despite sanctuary craft claims.

### 9. What is the single biggest production risk?

**Identity linking / guest upgrade absence + dual-universe binary + soft child tenancy** (support hell × wrong face × data risk).

### 10. What should we fix BEFORE Final Apple Audit?

P0-1 through P0-9 at minimum (one-app leave shell · Speech/Health/Grow/Assistant interiors · Hub one-room law · emotional path trust · dual-universe kill · a11y certification).  
P0-10 may gate **millions ship**, but Apple craft audit still requires P0-1…P0-9.

### 11. What should we deliberately NOT touch?

- Frozen engines (Routine · Speech · Health · Birth Sky · Coach · Audio playback · tip/meal engines)  
- Welcome · Signup · Discovery · Today Home · Parent Hub IA (four rooms)  
- RevenueCat pricing / entitlements / Firebase auth contracts  
- Already-approved living opens (do not reopen as “quick CSS”)  
- Final Apple Audit itself — **not yet**

### 12. After the P0/P1 fixes, is the product ready for Final Apple Audit?

# YES

**Meaning:** ready to **run** Final Apple Audit as the next formal gate — **not** a claim that Apple would ship today, and **not** a claim that millions production is cleared (P0-10).

If “fixes” mean only more openings while leave-paths stay foreign: **NO**.

---

# Final Recommendation

1. **Treat manufacturing openings as complete enough.** Stop buying more façades.  
2. **Pay the interior + leave-path debt** with a shared house shell and Moments-standard room law.  
3. **Kill dual universes** before any Apple claim.  
4. **Protect Routine Generation living** as the core product face.  
5. **Certify accessibility** on the door + Hub + RG + top rooms.  
6. **Separate** Apple craft readiness from millions production readiness — both required, different owners.  
7. **Do not run Final Apple Audit until P0-1…P0-9 are truly fixed** (not restated).  
8. **Do not implement from this document.** Wait for Founder prioritization.

### Absolute answers

| Question | Answer |
|---|---|
| One coherent AmyNest home today? | **NO** (door YES · house NO) |
| Soft launch under watch? | Conditional **YES** |
| Millions today? | **NO** |
| Final Apple Audit now? | **NO — STOP** |
| After true P0/P1 remediation, run Final Apple Audit? | **YES** |

---

## Document control

| Field | Value |
|---|---|
| Type | Portfolio remediation audit |
| Implementation | **NONE** |
| Allowed commit | This file only |
| Next step | Founder review · prioritized remediation orders · then Final Apple Audit |

**STOP.**
