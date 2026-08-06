# Platform V3 Architecture

**Status:** PROPOSED — awaiting Founder approval  
**Track:** Framework only  
**Supreme law:** [`V3_HOME_CONTRACT.md`](./V3_HOME_CONTRACT.md) — **BINDING · sole survival document** (Death Test: [`FOUNDER_DEATH_TEST.md`](./FOUNDER_DEATH_TEST.md))  
**Authority:** V3 Home Contract (includes Resident · One Memory · Home API) · Nest Presence Completion Certificate · Framework Debt Register · Product Debt Register · Final Pixel Signoff · Room Architecture (feeling law — rooms not redesigned)

**Hard locks (binding):**

| Lock | Rule |
|------|------|
| **V3 Home Contract** | Sole survival document — Home soul; Death Test YES |
| **Founder Death Test** | If a new engineer cannot continue from Contract alone → rewrite Contract |
| **Resident · Memory · Home API** | Embedded in Contract §§III–V |
| Nest Presence Design System | COMPLETE — do not reopen |
| Nest CSS Translation | COMPLETE / LOCKED — no rewrite |
| Design Constitution | LOCKED — no edits |
| Rooms | FROZEN / FOUNDER_REVIEW as prior — **no room redesign** |
| Visual philosophy | Closed |
| Implementation | **Forbidden until this architecture is approved** |

---

## Mission

Start Platform V3.

The remaining debt is **Framework**. Not Design.

Every framework decision must answer:

> **Does this make Nest easier to live inside?**

And under the Home Contract:

> **Does this enter through an existing room as a resident — under one shell, one nav, one atmosphere?**

> **Does this make a better resident — or a bigger building?**

> **Is there still only one Amy — Home memory, engines only reading?**

> **Does the Home define the experience — outside only as adapter?**

Not:

> Does this add features?

> Does this add products?

> Does this engine keep its own Amy?

> Does this SDK / provider define the UX?

---

## Home Contract (binding excerpt)

The Home is permanent. Frameworks are temporary.

Every engine, module, feature, AI capability, or SDK enters through an **existing room**.

No second visual language. No second navigation. No second shell. No second atmosphere.

Capabilities are **residents**, never visitors.

**Rooms** own emotion. **Engines** own execution. **The Home** owns continuity.

Full text: [`V3_HOME_CONTRACT.md`](./V3_HOME_CONTRACT.md).

---

## What Platform V3 is

Platform V3 is the program that replaces **framework limitations** so Nest-owned Home can stay Nest when the parent actually lives inside it — typing, loading, studying, practicing, and moving between rooms.

| Layer | Owner after V3 | Status entering V3 |
|-------|----------------|--------------------|
| Feeling / Rooms | Room Architecture (locked) | COMPLETE as law |
| Presentation tokens | Nest Presence CSS + craft | COMPLETE |
| **Conversation substrate** | **Native Nest Chat (V3)** | Debt F1–F7 |
| **Home shell** | **Single Nest App Shell (V3)** | Debt F10–F12 |
| **Study reveal** | **Nest Coach Engine (V3)** | Debt F8 · Product P7 |
| **Practice moment** | **Nest Mission Engine (V3)** | Debt F9 · Product P8 |
| **Navigation** | **One Home navigation (V3)** | Shell dual-path |

---

## What Platform V3 is not

- Not a CSS Phase 4  
- Not a Constitution rewrite  
- Not a Room Translation / Recovery reopen  
- Not a feature sprint (new modes, new dashboards, new products)  
- Not a Brain / API rewrite unless required to remove framework theatre  
- Not public GA product cutover (P9) — may unblock it later  

Product debts (Class C/D) that are **not** framework substrate remain in [`PRODUCT_DEBT_REGISTER.md`](./PRODUCT_DEBT_REGISTER.md). Platform V3 may **surface** them as engine identity work where they are the same root as F8/F9.

---

## Living test (architecture acceptance)

A parent should be able to:

1. Enter Home once  
2. Move Living → Hearing → Study → Practice without feeling they opened another app  
3. Speak and type in Hearing without keyboard/scroll fighting Nest air  
4. See Study understand them without “AI plan generating” theatre  
5. Keep one Practice moment without checklist DNA  

If any step fails, the architecture is incomplete — not the Design System.

---

## Current substrate (as-is)

| Surface | Nest owns today | Framework still owns | Debt |
|---------|-----------------|----------------------|------|
| Hearing entry | AskAmy Nest shell | Assistant → ChatThread → ChatPlatform | F1–F7 |
| All tabs | Nest Soft Plate / rooms / V2 tab bar | BrandLogo + “AI” pill header | F10 |
| Cold load | V2CalmLoadingShell on Nest paths | MEET AMY splash on classic / Suspense | F11 |
| Study | CoachDiscovery Nest shell | Hand-off → `/amy-coach` + coach-journey | F8 |
| Practice | MissionPlayPage Nest chrome | Real play ≠ Speech Coach; static steps | F9 |
| Navigation | `today_v2` + `new_navigation` Nest land | Dual Home: `/today` vs `/dashboard` | — |

Design cannot close these. Framework must.

---

# Pillar 1 — ChatPlatform → Native Nest Conversation

**Debt:** F1 (P0), F2 (P0), F3–F7, F14  
**Product adjacency:** P5, P6  

## Problem

Hearing Nest ends at the door. Conversation still runs on ChatPlatform / Assistant contracts: keyboard/`adjustResize`/scroll, inline composer height, spinner loading language, topic/interactive tree chrome, mode/quota theatre.

## Target

**One Nest conversation substrate** used by the Hearing Room — and eventually any Nest room that needs Amy’s voice — with:

| Contract | Nest Conversation owns | Must not own |
|----------|------------------------|--------------|
| Keyboard + viewport | Safe-area, scroll lock, composer dock | Third-party chat layout dogma |
| Composer | Nest Soft Plate geometry (craft already exists) | Inline height fighting CSS |
| Thread | Nest message presence (bubbles as care, not chatbot UI kit) | Mode tabs, topic grids as default chrome |
| Loading | Nest **prepare** / reveal | `Loader2` theatre |
| Commerce | Out of thread (Continuity Room) | Quota / upgrade cards in care |

## Architecture decisions (proposed)

1. **Replace, don’t wrap forever**  
   Nest CSS soft-bind maximized ChatPlatform; remaining gap is substrate. V3 owns a **Nest Conversation Host** that ChatPlatform no longer visually constrains.

2. **Brain stays; chrome leaves**  
   Message send/receive, streaming, auth, rate limits may keep existing Brain/API. Presentation + layout ownership moves to Nest Host.

3. **Hearing is the first consumer**  
   AskAmy Nest shell mounts Nest Conversation Host — not AssistantBlackBox as the visual owner.

4. **Modes are product debt**  
   WEB_MODES catalogue (P5) is not required for substrate. Default Hearing = one listening surface. Mode catalogue, if kept, is a product decision outside this pillar’s MVP.

5. **Success metric**  
   Hearing conversation Nest Presence ≥ Nest shell bar (≥95% optical) **including** typing + keyboard + scroll. Closes F1 board gate.

## Out of scope for this pillar

- Redesigning Hearing Room hero / Soft Plate (already Nest)  
- Rewriting Nest CSS  
- Native store paywall (F13 — separate)

## Approval questions

- [ ] Approve Nest Conversation Host as ChatPlatform visual replacement for Hearing?  
- [ ] Approve Brain reuse with chrome severance?  
- [ ] Approve modes deferred (product) vs removed in V3 MVP?

---

# Pillar 2 — App Shell → Single Home Shell

**Debt:** F10 (P1), F11 (P1), F12 (P3)  

## Problem

Nest rooms share craft air, but App Shell still paints **BrandLogo + “AI” pill** above Nest, and cold classic paths show **MEET AMY** splash — a second brand of weather.

## Target

**One Home shell language:**

| Zone | V3 shell |
|------|----------|
| Header | Nest quiet identity (or none) — no SaaS “AI” pill above Nest rooms |
| Loading | Nest prepare only on Nest Home paths; MEET AMY retired from Nest cold start |
| Bottom | Existing Nest tab bar remains the room switcher |
| Native keyboard padding | Align to Nest measure (F12) without redesigning Keep Room |

## Architecture decisions (proposed)

1. **Shell is Nest when Nest flags are on**  
   No dual chrome: Nest Home must not render classic header stack.

2. **Splash is prepare, not brand theatre**  
   Cold nav into Nest uses the same calm prepare language Nest already owns.

3. **Logo is Home, not product strip**  
   Identity may remain; “AI” pill and dashboard header DNA leave Nest Home.

4. **Success metric**  
   Parent never sees non-Nest chrome while living in Nest tabs.

## Out of scope

- Redesigning Threshold / Keep rooms  
- Store SDK sheets (F13)

## Approval questions

- [ ] Approve removal of AI pill / classic logo strip from Nest Home?  
- [ ] Approve MEET AMY retired for Nest paths only (classic dual-path may keep until cutover)?

---

# Pillar 3 — Coach Engine → Reveal Understanding

**Debt:** F8 (P1) · Product P7  

## Problem

Study Nest discovery ends; then parent enters **coach-journey / AI plan generator** feeling — loading theatre, SaaS coach identity. Nest stops at the door.

## Target

**Nest Coach Engine** that:

| Must feel like | Must not feel like |
|----------------|--------------------|
| Being seen for a longer path | “Generating your plan…” |
| Reveal of understanding | Dashboard of modules |
| Continuation of Study Room air | Separate app after Keep |

## Architecture decisions (proposed)

1. **Study owns the whole journey**  
   Discovery → understanding → next steps stay under Nest Study / Coach identity. No hard jump to classic `/amy-coach` chrome as the product surface.

2. **Reveal over generate**  
   Engine may compute; UI presents **prepared understanding**, not spinner theatre. Use Nest prepare / soft reveal contracts.

3. **Brain may remain**  
   Journey logic / goals can reuse coach-journey Brain where sound; **presentation engine** is Nest.

4. **Auth Keep is a threshold, not a product swap**  
   If account is required, return to Study air — not a different coach product.

5. **Success metric**  
   After Nest discovery, parent never feels they left Nest for an AI planner.

## Out of scope

- Changing Study Room Recovery composition (P2 Living Law remains product/intentional)  
- New coach features for feature’s sake

## Approval questions

- [ ] Approve Nest Coach Engine as visual+journey owner after discovery?  
- [ ] Approve classic `/amy-coach` demoted to Brain host or retired from Nest path?

---

# Pillar 4 — Mission Engine → Native Moment Renderer

**Debt:** F9 (P1) · Product P8  

## Problem

Practice Nest MissionPlayPage is Nest chrome with static ritual steps. Real speech engines live elsewhere (`/speech-coach*`). Practice either stays hollow or, if wired later, risks checklist / coach-app DNA.

## Target

**Native Nest moment renderer** for The Practice Room:

| Must feel like | Must not feel like |
|----------------|--------------------|
| One short ritual | Checklist DNA |
| Keep, then leave relieved | Multi-step speech academy |
| Nest Practice air throughout | Separate Speech Coach app |

## Architecture decisions (proposed)

1. **Practice owns the moment**  
   Mission play runtime renders inside Nest Practice — Speech Coach routes are not the Home surface for Nest parents.

2. **Moment ≠ curriculum product**  
   Age×Worry mission selection can remain; the **play surface** is a moment renderer, not a module tree.

3. **Speech capability as capability, not chrome**  
   Mic / scoring / feedback may use speech Brain; UI language is Nest ritual, not speech-coach dashboard.

4. **Success metric**  
   Completing a mission never feels like opening another product.

## Out of scope

- Redesigning Practice Room Nest chrome already FROZEN  
- Full Speech Coach GA product (P8/P9) as a separate app

## Approval questions

- [ ] Approve Nest moment renderer as Practice runtime owner?  
- [ ] Approve Speech Coach UI routes out of Nest Home path (Brain optional)?

---

# Pillar 5 — Navigation → Entire App Inside One Home

**Debt:** Dual `/today` vs `/dashboard` · F10/F11 as symptoms  

## Problem

Flags choose Nest vs classic. Parent can still feel **app switching**: dashboard vs Today, splash vs prepare, logo strip vs Nest tab bar.

## Target

**One Home navigation:**

| Principle | Meaning |
|-----------|---------|
| One land | Nest Home is the only living surface when Nest is on |
| Rooms, not apps | Tab / path changes are room crossings |
| No product swap | Study / Hearing / Practice never open a second shell |
| Classic demotion | `/dashboard` and classic tab bar are escape/legacy — not peer Home |

## Architecture decisions (proposed)

1. **Nest is the Home shell**  
   When Nest flags are on: single shell, single tab language, single prepare language.

2. **Engines mount inside rooms**  
   Conversation, Coach, Mission engines are room interiors — not sibling apps with their own chrome.

3. **Route map is room map**  
   Paths remain technical; emotional model stays Room Architecture. No new room invent. No room redesign — only **where engines attach**.

4. **Success metric**  
   No moment where the parent thinks “I switched apps.”

## Out of scope

- Rewriting Room emotional jobs  
- Public GA cutover of all engines (P9) as a single ship gate — sequenced after pillars

## Approval questions

- [ ] Approve Nest-only Home when Nest flags on (classic not peer)?  
- [ ] Approve engines-as-room-interiors navigation law?

---

# Cross-cutting architecture laws

*Derived from the V3 Home Contract. If any law conflicts with the Contract, the Contract wins.*

## Law 1 — Nest craft is input, not rewrite

Platform V3 **consumes** Nest Presence CSS + craft. It does not invent a second design system (no second visual language / atmosphere). Engines speak Nest tokens; they do not redesign rooms.

## Law 2 — Brain optional, chrome mandatory Nest

Where Brain is sound, keep it. Where chrome breaks Nest, replace chrome. Engines own execution; rooms own emotion.

## Law 3 — Prepare, don’t theatre

Loading = Nest prepare / reveal. No MEET AMY, no `Loader2` as Nest language, no “generating plan” show. Visitors do not announce themselves.

## Law 4 — Commerce has a Room

Quota / upgrade / store sheets do not live inside care threads. Continuity Room + store policy (F13) remain separate tracks — still residents of Continuity, not a second shell.

## Law 5 — Easier to live inside / resident only

If a change adds capability without reducing dual-shell / dual-app feeling — or enters as a visitor — it is not Platform V3 work.

## Law 6 — Home owns continuity

Shell, navigation, and atmosphere are Home property. No pillar may ship a peer Home.

## Law 7 — Home owns memory (One Memory Law)

There is only one Amy. No room and no engine owns memory. Engines read what the Home already knows. Write paths update Home — never a second Amy. Full text: [`ONE_MEMORY_LAW.md`](./ONE_MEMORY_LAW.md).

## Law 8 — Home is the primary API (Home API Law)

Frameworks, AI providers, billing providers, and SDKs are adapters. Nothing outside the Home may define the user experience. Full text: [`HOME_API_LAW.md`](./HOME_API_LAW.md).

---

# Proposed program sequence (architecture phases — not build yet)

| Phase | Pillars | Why this order | Closes |
|-------|---------|----------------|--------|
| **V3.0** | Architecture approval (this doc) | Founder gate | — |
| **V3.1** | App Shell + Navigation | One Home before deeper engines | F10, F11, nav dual-feel |
| **V3.2** | Nest Conversation (ChatPlatform replace) | Core Hearing presence | F1, F2 (+ F3–F7 as needed) |
| **V3.3** | Nest Coach Engine | Study continuity | F8 · P7 |
| **V3.4** | Nest Mission / moment renderer | Practice continuity | F9 · P8 |
| **V3.5** | Residual framework (F12, F13, F4/F6/F7 polish) | Edge + store policy | Remaining A |

**Rationale for Shell before Chat:** Living inside one Home first makes conversation replacement a room interior, not another app transplant.

**Alternate (Founder may swap):** V3.2 before V3.1 if Hearing typing is the sharper pain — still requires Shell law so Conversation doesn’t ship under AI-pill chrome.

---

# Ownership map (V3)

| Owner | Owns | Does not own |
|-------|------|--------------|
| Nest Conversation Host | Hearing runtime layout, keyboard, composer, thread presence | Room hero redesign; Nest CSS invent |
| Nest App Shell | Header, splash/prepare, Nest/classic chrome gate | Room copy / hierarchy |
| Nest Coach Engine | Study post-discovery journey presentation | Living Room composition (P2) |
| Nest Mission Engine | Practice moment runtime | Speech Coach as separate product chrome |
| Nest Navigation | Single Home land + room crossings | New rooms |
| Nest craft (locked) | Tokens / Soft Plate / prepare / motion | Framework contracts |
| Product (separate) | P1–P10 decisions | CSS manufacturing |

---

# Explicit non-goals (until separate Founder order)

- Nest CSS invent / Phase 4  
- Constitution edits  
- Room redesign or Recovery reopen  
- Visual philosophy workshops  
- Feature additions justified as “engagement”  
- Implementation of any pillar before approval  

---

# Deliverables of this order

| Deliverable | Status |
|-------------|--------|
| Platform V3 Architecture (this document) | **DELIVERED — PROPOSED** |
| Implementation | **STOPPED — awaiting approval** |

---

# Founder approval checklist

Approve or amend before any code:

0. [ ] **V3 Home Contract** accepted as sole survival document ([`V3_HOME_CONTRACT.md`](./V3_HOME_CONTRACT.md))  
0a. [ ] **Founder Death Test** accepted — Home outlives creators; NO → rewrite Contract ([`FOUNDER_DEATH_TEST.md`](./FOUNDER_DEATH_TEST.md))  
0b. [ ] Resident · One Memory · Home API accepted as Contract §§III–V  
1. [ ] Platform V3 mission and locks accepted  
1a. [ ] Engineer could continue this program from Home Contract alone without breaking soul  
2. [ ] Five pillars accepted as the framework program (residents of existing rooms)  
3. [ ] Sequence V3.1 → V3.4 accepted (or alternate named)  
4. [ ] ChatPlatform visual replacement approved for Hearing  
5. [ ] Single Home shell (no AI-pill Nest chrome) approved  
6. [ ] Coach as reveal-understanding Nest engine approved  
7. [ ] Mission as native moment renderer approved  
8. [ ] Navigation = entire app inside one Home approved  
9. [ ] Product debts P5–P9 acknowledged as adjacent, not CSS  

**On approval:** open implementation orders per phase.  
**On amend:** revise this document only — still no implementation until re-approved.

---

## STOP

No implementation.  
No CSS.  
No Constitution.  
No Room edits.

Awaiting Founder architecture approval.
