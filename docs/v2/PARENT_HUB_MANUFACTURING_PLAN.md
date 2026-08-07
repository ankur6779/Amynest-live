# Parent Hub — Manufacturing Plan

**Status:** MANUFACTURING ROADMAP ONLY — NO IMPLEMENTATION · NO REACT · NO CSS · NO PRODUCTION CODE  
**Date:** 2026-08-07  
**Authority:** Founder Order — Parent Hub Manufacturing Plan  

**Approved inputs (locked):**  
- `docs/v2/PARENT_HUB_CONSTITUTION.md` — **APPROVED**  
- `docs/v2/PARENT_HUB_VISUAL_MANUFACTURING_STUDY.md` — **APPROVED**  

**Production gate (required before Pack 1 code):**  
- `docs/v2/PARENT_HUB_PRODUCTION_AUDIT.md` — module Keep/Merge/Move/Hide/Remove table — **must be Founder-approved before implementation**  

**Frozen upstream (do not touch):** Welcome · Signup · Child Discovery · Today Home  

**Route (Production Safety):** keep `/parenting-hub`  

---

## Mission

Create the **manufacturing sequence** — not a redesign.

Engineering must know exactly what gets built **first · second · third · and why**.

We manufacture Parent Hub as **independent shippable packs**.  
After any completed pack (with prior packs), the product may ship safely without waiting for the next pack.

---

## Governing laws (non-negotiable)

| Law | Manufacturing consequence |
|---|---|
| Four Rooms | Help · Understand · Care · Moments only |
| Steady = tone | Never a fifth room |
| Birth Sky ∈ Understand | Never a peer hero outside Understand |
| Gamification forbidden on Hub | Strip Hub points/XP theatre as soon as rooms ship |
| Home ↔ Hub Boundary | Compleable today → Home; thinking → Hub |
| Entry / Exit Law | Intention in; leave-with out; never dead-end mall |
| Reuse Before Rewrite | Extend Infant / Speech / Nutrition / Birth Sky / Ask Amy / Path |
| Zero unnecessary migrations | No new Hub warehouse tables for v1 |
| Value before payment | Never sales-page Hub landing |
| Question Tax | One clear ask per surface |
| Six Reviews | COMPLETE only after Pack 8 |

Code DNA already exists for Home boundary:  
`TODAY_HOME_LAW` · `TODAY_HOME_HUB_BOUNDARY_LAW` · `resolveHomeHubBoundary()` · `passesTodayHomeLaw()`

---

## Release train (why this order)

```text
Gate A0  Production Audit (modules)  →  Keep/Merge/Move/Hide/Remove locked
   ↓
Gate B0  Blueprint freeze (docs)     →  what to build is unambiguous
   ↓
Pack 1   Room shell                  →  four intentions replace eight groups
   ↓
Pack 2   Hero manufacturing          →  one cinematic hero per room
   ↓
Pack 3   Secondary destinations      →  modules become quiet lists / merges
   ↓
Pack 4   Transitions                 →  entry · deep links · exit · Home handoff
   ↓
Pack 5   Premium continuity          →  soft-lock quiet; value before payment
   ↓
Pack 6   Accessibility               →  cognition + targets for exhausted parents
   ↓
Pack 7   Performance                 →  cold open feels like a room, not a mall load
   ↓
Pack 8   Apple polish                →  Six Reviews · craft · COMPLETE
```

**Why not heroes first?**  
Without rooms, a hero is still a catalog banner over eight groups.

**Why not premium first?**  
Paywall polish on a mall makes a prettier store. Rooms + heroes first.

**Why transitions after destinations?**  
A room with a hero and a short list can ship before Path/Home entry wiring is perfect — tab + deep-link safety still required in Pack 1.

**Why a11y / perf / polish last?**  
They refine a correct product shape; they must not invent the shape.

---

## Kill switch (applies to every pack)

| Flag (proposed) | Behavior |
|---|---|
| `VITE_FF_PARENT_HUB_ROOMS_V1` | `=0` / unset-off → **legacy Hub** (`parenting-hub.tsx` current mall) |
| Flag ON | Cumulative packs 1…N that have shipped |

**Rule:** Every pack lands behind this flag (or additive subflags that default OFF until the parent flag is ON).  
**Rollback:** set flag OFF → legacy Hub restored. No migration reverse required.

Optional later subflags (only if a pack needs finer control):  
`VITE_FF_PARENT_HUB_HEROES_V1` · `VITE_FF_PARENT_HUB_LISTS_V1` · `VITE_FF_PARENT_HUB_TRANSITIONS_V1`  
Default recommendation: **one parent flag** until Pack 4; split only if Founder orders staged % rollout.

---

## Gate B0 — Blueprint freeze (docs only · before Pack 1 code)

**Not a user-facing ship pack.** Required so Pack 1 does not invent product.

| Field | Content |
|---|---|
| **Goal** | Freeze Previous vs New · room composition · feature→room map · free/premium table · reused modules · flags · Six Reviews checklist into one Blueprint doc engineers can build from |
| **Files** | Create `docs/v2/PARENT_HUB_BLUEPRINT.md` (future). Read-only inputs: Constitution · Visual Study · this Plan. Touch **zero** app code. |
| **Risk** | Open visual questions unresolved → Pack 2 thrash |
| **Rollback** | N/A (docs). Do not start Pack 1 until Founder marks Blueprint APPROVED |
| **Database impact** | None |
| **API impact** | None |
| **Analytics impact** | None (document event names only) |
| **Testing** | Constitution self-sufficiency checklist; Production Safety checklist on paper |
| **Founder review** | Resolve Visual Study open questions: Care infant density after hero · Birth Sky photo vs accent · room-door pattern (four cinematic doors vs intention canvas) |
| **Apple review** | Blueprint first-frame per room must feel like one intention, not App Store |

**Stop rule:** No React until B0 APPROVED.

---

# Pack 1 — Room shell

### Goal

Replace the **eight-group feature mall** with **four room doors** (Help · Understand · Care · Moments).  
Re-home existing destination modules under the correct room.  
Remove Hub-forbidden catalog chrome from the flagged experience.  
Do **not** redesign destination products. Do **not** require cinematic heroes yet.

### Why first

Constitution product truth is four human intentions.  
Until the shell exists, every later pack dresses a mall.

### Files (expected touch surface — discover at build; Reuse Before Rewrite)

| Area | Paths |
|---|---|
| Hub page | `artifacts/kidschedule/src/pages/parenting-hub.tsx` |
| Premium tokens / glass | `artifacts/kidschedule/src/lib/parent-hub-premium.ts` |
| Group headers | `components/hub-section-group-header.tsx` · `today-for-you-group-header.tsx` · `stories-group-header.tsx` · `gaming-hub-group-header.tsx` |
| Feature cards (wrap only) | `hub-premium-feature-card.tsx` · `hub-launch-card.tsx` · `hub-tile-button.tsx` |
| Journey shell demote | `hub-journey-pulse.tsx` · `hub-journey-strip.tsx` · `todays-path.tsx` (Hub usage only) |
| Infant gravity | `infant-hub.tsx` · `infant-hub-premium-section.tsx` → Care room |
| Learning panel demote | `hub-today-learning-panel.tsx` |
| i18n | parent_hub section strings → room labels |
| Flag wiring | env / feature-flag helper (same pattern as `VITE_FF_TODAY_HOME_V1`) |
| DNA / tests | `lib/amynest-philosophy.ts` (+ tests) — room constants if needed; **no** Welcome/Home edits |
| Skeleton | `components/route-skeletons/parenting-hub-skeleton.tsx` |

**Do not rewrite:** Speech Coach · Nutrition · Birth Sky · Ask Amy · Infant engines · destination routes under `/parenting-hub/*`.

### Scope in

- Four room doors as Hub first intention frame (tab open ≠ mall)  
- Feature→room map from Constitution (binding)  
- Hide / omit from Hub IA when flag ON: Gaming group · Command Center / Family pulse stack · Tomorrow’s Forecast peer · Generate Routine Hub hero · Explore What’s Next · quick-action chip mall · tip trilogy as three equal heroes · six equal Learning Zone heroes as peer grid  
- Stop awarding Hub section-open points when flag ON (`HUB_SECTION_REWARD_POINTS` path)  
- Journey/Path → quiet secondary shell (must not rival Home NRT)  
- Age gravity: 0–24m may open into **Care** expanded  
- Keep `/parenting-hub` · `#tile-*` / legacy anchors resolve into a room (best-effort map)

### Scope out

- Cinematic photography heroes (Pack 2)  
- List-item demotion / merges UI (Pack 3)  
- Full Entry Law from Home Path (Pack 4)  
- Soft-lock visual quieting (Pack 5)  
- Perf / a11y / Apple craft passes (Packs 6–8)

### Risk

| Risk | Mitigation |
|---|---|
| Half-mall: four rooms still filled with equal hero tiles | Acceptable interim; Pack 2/3 fix hierarchy. Do not block ship. |
| Deep link orphan (`#tile-gaming-rewards`) | Map to room or soft no-op + Home; never 404 |
| Paid user loses Care path | Care room must surface Infant + Nutrition + Health Lab entries |
| Accidental Today Home edit | Code review gate; freeze list in PR template |
| i18n missing room strings | Fallback English; no blank doors |

### Rollback

`VITE_FF_PARENT_HUB_ROOMS_V1=0` → legacy eight-group Hub.  
No DB reverse. Destination deep links unchanged.

### Database impact

**None required.**  
Reuse `parent_hub_journey`, infant_*, birth_sky, nutrition/speech/learning tables as destinations already do.  
Do not DROP gaming tables — IA hide only.

### API impact

**None required for shell.**  
May stop client calls that only feed removed Hub chrome (earn-on-section-open) when flag ON.  
Do not invent room microservices.

### Analytics impact

**Additive only when cheap:** e.g. `parent_hub_room_view` with `room=help|understand|care|moments`.  
Preserve existing `screen_view` `/parenting-hub`.  
Do not delete old section events yet (Pack 4 cleans meaning).

### Testing

- [ ] Flag OFF → pixel/IA parity with legacy Hub (smoke)  
- [ ] Flag ON → exactly four rooms; no Gaming / Forecast / Command Center / Generate Hub hero / chip mall  
- [ ] Each Constitution-mapped destination reachable from its room  
- [ ] Infant cohort defaults Care gravity  
- [ ] Deep link to Speech / Birth Sky / Nutrition / Infant still works  
- [ ] Hub section points not awarded when flag ON  
- [ ] Today Home / Welcome / Discovery untouched  
- [ ] Unit: room membership map (feature → one room)

### Founder review

- First tab open: four intentions, not eight filing cabinets  
- Care still holds infant life  
- Nothing forbidden resurfaces as a “temporary” fifth door  

### Apple review

- Parent can name the purpose of the page in ≤3s (“I pick how I need to be met”)  
- Still may feel dense under doors — OK for Pack 1 if doors are clear  

### Stop after Pack 1 — ship meaning

**YES — shippable.**  
Parents get four rooms + correct re-homing + catalog chrome removed.  
Hierarchy under doors is still tile-heavy until Pack 2/3 — acceptable interim under flag.

---

# Pack 2 — Hero manufacturing

### Goal

Each room begins with **one cinematic photographic hero** (Visual Study APPROVED).  
Inherit FE / Today Home sanctuary materials by **import only** — never edit Welcome CSS/React.

### Why second

Rooms without heroes still read as four smaller catalogs.  
Heroes create place before product.

### Files

| Area | Paths |
|---|---|
| New room hero component(s) | e.g. `components/parent-hub/room-hero.tsx` (name at build; Reuse Before Rewrite — prefer extend `hub-module-page-shell` / Today Home materials patterns) |
| FE photography reuse | Existing `/experience/r1/*.png` (or shared sanctuary assets already used by Today Home) — **import paths only** |
| Hub page composition | `parenting-hub.tsx` — hero slot above room body |
| Premium tokens | `parent-hub-premium.ts` — reduce competing glow under hero |
| Copy / i18n | Room first-seen lines from Constitution emotional table |
| Tests | Hero renders once per room; no 2-col hero grid |

### Scope in

- One hero image + one sentence / leave-with cue per room  
- Help: “What’s hard right now?”  
- Understand: Guidance / meaning photograph + one sentence  
- Care: care-atmosphere + next care act cue  
- Moments: togetherness + “Ten minutes with {name}”  
- Illustration **not** used as room-entry hero  

### Scope out

- Demoting tiles to lists (Pack 3) — tiles may remain under hero temporarily  
- Paywall badge redesign (Pack 5)  
- Motion transitions (Pack 4 / 8)

### Risk

| Risk | Mitigation |
|---|---|
| New illustration system creeps in | Forbid new hero art packs; reuse FE photography |
| Hero competes with Journey Pulse | Pulse stays secondary; hero wins first paint |
| Large image weight | Use existing optimized FE assets; lazy below-fold rooms |
| Welcome freeze breach | Import shared assets only; no `/begin` edits |

### Rollback

Flag OFF → legacy.  
Or disable heroes subflag if split; rooms from Pack 1 remain.

### Database impact

**None.**

### API impact

**None.**

### Analytics impact

Optional: `parent_hub_room_hero_impression` `{room}` — additive.

### Testing

- [ ] Exactly one hero per room first paint  
- [ ] No mascot PNG as room hero  
- [ ] FE assets load; broken-image fallback calm  
- [ ] Journey/Path never taller/louder than hero  
- [ ] Welcome / Today Home visual files unchanged on disk (diff guard)

### Founder review

- Feels like four living rooms’ doorways  
- Photography continuity with Home sanctuary  
- Answers Visual Study: every room begins with one cinematic hero — **YES**

### Apple review

- One primary; type quiet; negative space returns  
- Not a collage of lifestyle stock

### Stop after Pack 2 — ship meaning

**YES — shippable.**  
Rooms + heroes; modules may still be cards beneath — hierarchy already improved.

---

# Pack 3 — Secondary destinations

### Goal

Modules become **smaller list items / quiet secondary rows** beneath the room hero.  
Execute Constitution **merges** (Guidance · Presence · Make · one Grow door).  
Still **do not rewrite** destination product internals.

### Why third

Heroes over equal hero-cards = false hierarchy.  
Lists complete the Visual Study pattern: hero → leave-with → short list → exit.

### Files

| Area | Paths |
|---|---|
| Hub composition | `parenting-hub.tsx` |
| Card → row | `hub-premium-feature-card.tsx` / new `room-destination-row.tsx` (only if reuse fails) |
| Sub-tiles | `hub-collapsible-sub-tile.tsx` · `hub-expanded-children.tsx` · `hub-sub-tile-shell.tsx` |
| Activities nest collapse | activities / origami / art / audio entry points → Moments Presence |
| Tips merge | Daily Tips · New Parent Tips · Articles · Infant Amy Suggests → Understand Guidance |
| Learning collapse | Math/Abacus/Phonics/Spelling/Study/Olympiad → ≤1 Grow door |
| Infant Care list | Keep depth under Care hero (Founder B0 choice) |
| i18n | Merge labels · remove trilogy strings from Hub home |
| Tests | Max visible peer rows per room; no 2-col equal hero grid on Hub home |

### Scope in

- Secondary list UI under hero  
- Guidance / Presence / Make / Story / Grow merges **as Hub IA**  
- Soft-lock remains functionally correct (visual quiet → Pack 5)  
- Remove remaining equal-hero grid energy from Hub home when flag ON  

### Scope out

- Rewriting Speech/Nutrition/Birth Sky/Infant **product pages**  
- New recommendation engine  
- Premium copy system (Pack 5)

### Risk

| Risk | Mitigation |
|---|---|
| Merge hides a paid surface | Free/premium table from Blueprint; every premium destination still one tap away |
| Activities deep links break | Alias map old tile ids → Moments Presence row |
| Over-collapse Understand | Birth Sky remains visible door inside Understand |

### Rollback

Flag OFF → legacy.  
List component unused; old grids return with legacy page branch.

### Database impact

**None.** IA disposition only — no DROP TABLE.

### API impact

**None** for merges. Destinations keep their APIs.  
Stop Hub-only calls that fetched tip-trilogy shelves as three peer heroes if obsolete under flag.

### Analytics impact

Map old feature tile clicks → `room` + `destination` props (additive).  
Do not break existing destination funnels inside products.

### Testing

- [ ] No 2-column equal hero feature grid on Hub home (flag ON)  
- [ ] Guidance is one surface; tip trilogy gone from Hub home  
- [ ] Moments: Presence · Story · Make (not activity warehouse)  
- [ ] Understand: ≤1 Grow door + Birth Sky + Guidance  
- [ ] Legacy `#tile-*` ids resolve  
- [ ] Question Tax: room home does not ask multiple competing questions  

### Founder review

- Hub home no longer feels like SKU shelves  
- Merges match Constitution feature→room map  

### Apple review

- Secondary list deference under one hero  
- Dense Care infant list allowed only after Care hero  

### Stop after Pack 3 — ship meaning

**YES — shippable.**  
Full visual IA of rooms (shell + hero + lists). Transitions from Home may still be incomplete.

---

# Pack 4 — Transitions

### Goal

Manufacture **Entry Law · Exit Law · deep-link room resolution · Home handoff**.  
Hub opens for intention; leaves with a next try; never a dead-end mall.  
Align Path/Journey bridge so it never rivals Today Home NRT.

### Why fourth

The room can exist before every entry path is perfect.  
Once lists exist, transitions have a real place to land.

### Files

| Area | Paths |
|---|---|
| Boundary DNA | `lib/amynest-philosophy.ts` · tests (`resolveHomeHubBoundary`, entry helpers if added) |
| Hub journey UX | `lib/hub-journey-ux.ts` · `hooks/use-hub-journey.ts` · `components/todays-path.tsx` · `hub-journey-pulse.tsx` |
| Navigation | `AppCore.tsx` routes (deep link room query/hash only; keep `/parenting-hub`) · `mobile-tab-bar.tsx` (label/entry only if needed) |
| Dashboard → Hub | `pages/dashboard.tsx` — **only** Hub entry points that violate Entry Law (remove browse invite); **do not** alter Today Home Hero structure |
| Birth Sky referrer | `features/birth-sky/**` referrer=`parenting_hub` room=understand |
| Infant entry | Care-direct for body loops (Constitution R9) |
| Analytics taxonomy | Hub intention / leave-with events |
| Tests | Entry/Exit matrix from Constitution |

### Scope in

- R1–R10 Entry Law behaviors for Hub open reasons  
- Exit: primary → Today Home / Begin; never stranded  
- Deep links open a **room**, not catalogue  
- Path may surface Hub only for understanding/care/presence — never “generate routine”  
- Remove Hub browse CTAs that teach mall entry from Home (without redesigning Home Hero)  
- Intention → room → leave-with analytics  

### Scope out

- RevenueCat / pricing changes  
- Child Hub  
- Welcome / Discovery  

### Risk

| Risk | Mitigation |
|---|---|
| Touching dashboard breaks Today Home freeze | Diff-scoped PR; Hero components off-limits; only Hub link/browse chrome |
| Over-blocking tab open | Tab may open Hub (R4) — first frame is intention (Pack 1), not forbidden |
| Ambiguous action+understanding | Split: Home action first (R8) |

### Rollback

Flag OFF → legacy entry + mall.  
Boundary helpers remain pure functions (safe).

### Database impact

**None required.**  
No `room_visits` table for v1. Client intention + existing analytics suffice.

### API impact

Reuse `/api/hub-journey/*`.  
Stop Hub calls that only served Forecast/Command Center/gaming earn when those surfaces stay removed.  
Generate/routine APIs remain Home-owned.

### Analytics impact

| Prefer | Avoid as success |
|---|---|
| `parent_hub_intention` · `parent_hub_room_view` · `parent_hub_leave_with` · return-to-Home | Section-open points · mall CTR · gaming earn |

Preserve destination product events.

### Testing

- [ ] Completable single action → stays on Today Home (boundary tests)  
- [ ] Help/Care/Understand/Moments beyond action → Hub room  
- [ ] Tab open → four doors / room, not quick-action mall  
- [ ] Deep link Birth Sky → Understand  
- [ ] Infant body loop → Care  
- [ ] Exit control returns to Home/Begin  
- [ ] Path never pushes Generate Routine into Hub  
- [ ] Browse / “what’s new” entry points removed or inert when flag ON  

### Founder review

- Life asks → room opens → leave holding something → Home  
- Hub never competes with Home NRT  

### Apple review

- Continuity: rooms appear when needed; not an exploration lobby  

### Stop after Pack 4 — ship meaning

**YES — shippable.**  
Product law for entry/exit is live. Premium visuals may still feel App Store-ish until Pack 5.

---

# Pack 5 — Premium continuity

### Goal

Soft-lock and paywall **presentation** on Hub matches Constitution monetization:  
value before payment; never Unlock pills as first eye-stop; Care → Help → Understand → Moments willingness order.  
**No pricing / RevenueCat redesign** unless Founder orders.

### Why fifth

Rooms must earn trust before paywall craft matters.  
Quieting SKU badges prevents heroes/lists from reading as a store.

### Files

| Area | Paths |
|---|---|
| Gates | `hub-module-gate-wrap.tsx` · `sub-item-gate.tsx` · `try-free-badge.tsx` |
| Paywall reasons | `contexts/paywall-context.tsx` · `subscription-paywall-personalization.ts` · `paywall-modal.tsx` (Hub reasons only) |
| Journey gate | `todays-path.tsx` peek/premium CTAs on Hub |
| Feature card lock UI | `hub-premium-feature-card.tsx` / destination rows from Pack 3 |
| Tests | Crisis paths free; no sales-page Hub landing |

### Scope in

- Visual quieting of soft-locks on Hub home / room lists  
- Ensure Emotional Support / seasonal PTM / fair free AI / Speech first sessions remain reachable without wall theatre  
- Health Lab / Nutrition AI: trust-then-ask framing (no Hub sales landing)  
- `hub_journey` paywall reason copy = continuity, not “Unlock the Hub”  

### Scope out

- Price changes · SKU redesign · new subscription tiers  
- Rewriting RevenueCat products  

### Risk

| Risk | Mitigation |
|---|---|
| Accidentally free-unlocking paid destinations | Keep existing entitlement checks; change **presentation + order**, not entitlements, unless Blueprint says otherwise |
| Paywall modal regression on Home | Scope Hub sources only; regression test dashboard paywall |

### Rollback

Flag OFF → legacy badges/gates.  
Entitlements unchanged → no billing rollback.

### Database impact

**None.**

### API impact

Reuse existing paywall / RevenueCat hooks.  
No new billing endpoints.

### Analytics impact

Preserve paywall funnel events; add `room` prop where missing.  
Do not use Hub unlock CTR as primary success.

### Testing

- [ ] Hub first paint never dominated by Unlock pills  
- [ ] Crisis Help paths free per Monetization table  
- [ ] Entitlements still enforced on true premium destinations  
- [ ] No “Unlock the Hub” sales landing  
- [ ] Home paywall flows unchanged  

### Founder review

- Feels like continuity invite after trust — not a storefront  

### Apple review

- No App Store “Get” energy on room heroes  

### Stop after Pack 5 — ship meaning

**YES — shippable.**  
Product + monetization presentation aligned. A11y/perf/polish remain.

---

# Pack 6 — Accessibility

### Goal

Exhausted parents can use four rooms with Dynamic Type, VoiceOver/TalkBack basics, contrast, and 44pt targets — without reclaiming catalog density.

### Why sixth

Shape is correct; cognition and access must match Steady tone.

### Files

| Area | Paths |
|---|---|
| Room shell / hero / rows | Pack 1–3 components |
| Focus order | `parenting-hub.tsx` |
| i18n aria | room labels · leave-with · locks |
| Skeleton | `parenting-hub-skeleton.tsx` |
| Tests | a11y smoke · focus traps absent |

### Scope in

- Semantic headings: Hub → Room → Hero → List  
- 44×44 targets on doors, rows, exits  
- Contrast on glass/photography overlays  
- `prefers-reduced-motion` respected (no required motion)  
- Screen-reader names for rooms and lock state  

### Scope out

- Full localization audit beyond Hub rooms  
- Redesign for tablet marketing layouts  

### Risk

| Risk | Mitigation |
|---|---|
| Photo hero crushes contrast | Gradient scrim + tested type color |
| List rows too small after demotion | Min height targets mandatory |

### Rollback

Flag OFF → legacy.  
A11y fixes that also help legacy may stay if harmless (prefer flag-scoped classnames).

### Database impact

**None.**

### API impact

**None.**

### Analytics impact

**None.**

### Testing

- [ ] Keyboard to room → hero CTA → first destination → exit  
- [ ] VoiceOver/TalkBack labels make sense without sight  
- [ ] Reduced motion: no essential info in motion only  
- [ ] Large text does not clip leave-with  

### Founder review

- Steady tone includes access — no guilt when slow  

### Apple review

- HIG accessibility baseline for primary navigation surfaces  

### Stop after Pack 6 — ship meaning

**YES — shippable.**

---

# Pack 7 — Performance

### Goal

Hub cold open feels like entering a room — not downloading a mall.  
Keep infant Care / Ask Amy / Birth Sky destinations fast once entered (reuse lazy boundaries).

### Why seventh

Correct IA with slow first paint still feels cheap.

### Files

| Area | Paths |
|---|---|
| Route lazy | `AppCore.tsx` ParentingHub lazy (already) |
| Hub internal lazy | `HubLazyContent` patterns in `parenting-hub.tsx` |
| Hero images | Pack 2 assets — size/priority (`fetchpriority` only on active room hero) |
| Infant / heavy modules | Keep deferred until Care open |
| Audio warmup | `parent-hub-audio-warmup.ts` — do not block first paint |
| Skeleton | `parenting-hub-skeleton.tsx` matches room shell |
| Tests | Bundle/smoke budgets as available in CI |

### Scope in

- First paint: shell + active room hero only  
- Defer off-room destination JS  
- Avoid hydrating all four rooms’ deep trees at once  
- Prefetch destination only on intent (row press / hover where safe)  

### Scope out

- Backend perf projects  
- Rewriting Infant Hub data layer  

### Risk

| Risk | Mitigation |
|---|---|
| Over-lazy causing empty flashes | Skeleton matches room doors |
| Prefetch thrash on list scroll | Prefetch on explicit intent only |

### Rollback

Flag OFF → legacy.  
Lazy boundaries that help legacy may remain if safe.

### Database impact

**None.**

### API impact

No new endpoints. May reduce spurious Hub prefetch calls.

### Analytics impact

Optional perf marks — not success metrics.

### Testing

- [ ] Flag ON cold open: interactive room doors without waiting all destination chunks  
- [ ] Care infant expand does not jank Hub home forever  
- [ ] No regression in destination open time for Speech/Birth Sky  
- [ ] Memory: collapsing rooms releases what architecture allows  

### Founder review

- Feels instant and calm on mid-tier phones  

### Apple review

- Perceived performance = craft  

### Stop after Pack 7 — ship meaning

**YES — shippable.**

---

# Pack 8 — Apple polish

### Goal

Final craft pass: hierarchy, negative space, scrolling rhythm, Steady tone, copy quietness.  
Run **Six Reviews**. Mark manufacturing **COMPLETE** only if all pass.

### Why last

Polish cannot invent rooms. It proves the manufactured product.

### Files

| Area | Paths |
|---|---|
| Room hero / lists / shell | Pack 1–3 surfaces |
| Motion | subtle room enter only if it deepens calm |
| Copy | i18n final pass |
| Docs | `docs/v2/PARENT_HUB_APPLE_HIG_AUDIT.md` (future, at polish time) · Six Reviews record |
| DNA | Confirm gamification still impossible on Hub |
| Tests | Visual checklist · regression |

### Scope in

- Hierarchy audit vs Visual Study  
- Remove leftover catalog residue discovered in QA  
- Sanctuary continuity with Home materials  
- Six Reviews: Beauty · Emotion · Trust · Conversion · Engineering · Production Safety  
- Founder COMPLETE sign-off artifact  

### Scope out

- New features · Child Hub · pricing changes  
- Welcome/Home redesign  

### Risk

| Risk | Mitigation |
|---|---|
| Polish reintroduces mall chips “for discovery” | Constitution forbiddens checklist in PR |
| Scope creep into destination redesign | Destinations out of scope |

### Rollback

Flag OFF → legacy.  
COMPLETE not declared if rolled back.

### Database impact

**None.**

### API impact

**None.**

### Analytics impact

Confirm success dashboard uses intention/leave-with — not mall CTR.

### Testing

- [ ] Visual Study checklist green  
- [ ] Constitution forbiddens absent  
- [ ] Entry/Exit/Boundary tests green  
- [ ] Freeze surfaces untouched  
- [ ] Six Reviews document signed  

### Founder review

- “Four living rooms” — not premium feature catalog  
- Approve COMPLETE or return notes  

### Apple review

- Would Apple ship this as twenty equal hero cards? **Still NO — and we didn’t.**  
- One room · one hero · one leave-with · short list · exit  

### Stop after Pack 8 — ship meaning

**YES — shippable as manufacturing COMPLETE** (when Six Reviews pass).

---

## Cumulative ship matrix

| Stop after | User-visible outcome | Safe? |
|---|---|---|
| B0 only | Docs; legacy Hub still live | YES (no code) |
| Pack 1 | Four rooms · chrome removed · tiles remain | YES |
| Pack 2 | + cinematic heroes | YES |
| Pack 3 | + secondary lists · merges | YES |
| Pack 4 | + Entry/Exit/deep-link law | YES |
| Pack 5 | + quiet premium continuity | YES |
| Pack 6 | + a11y baseline | YES |
| Pack 7 | + performance | YES |
| Pack 8 | + Apple craft · Six Reviews · COMPLETE | YES |

**Never skip Pack 1.** Packs 2–8 assume Pack 1.  
“Stop after any pack” means stop after finishing pack **N** (with 1…N−1), not skipping ahead.

---

## Production Safety (every pack)

No pack may break:

Auth · Verify · Forgot · Sessions · Firebase · RevenueCat · Analytics · Feature flags · Existing users · Deep links · Tab `/parenting-hub` · Infant/Speech/Nutrition/Birth Sky destinations · Today Home · Welcome · Signup · Child Discovery  

**PR gate checklist (every pack):**

1. Flag default preserves legacy until intentional ON  
2. Freeze paths absent from diff  
3. Reuse Before Rewrite noted for touched modules  
4. Rollback instruction in PR body  
5. DB migrations = **none** unless Founder emergency (v1 expects none)  

---

## Explicitly out of this manufacturing train

- Child Hub  
- Welcome / Signup / Discovery / Today Home Hero edits  
- RevenueCat product / price redesign  
- New Hub recommendation microservice  
- New `room_visits` warehouse  
- Rewriting Infant / Speech / Nutrition / Birth Sky / Ask Amy engines  
- Reintroducing Gaming / Forecast / Command Center / Generate-as-Hub-hero  

---

## Engineering priority inside rooms (when sequencing work inside a pack)

Per Constitution frequency: **Care (infant) P0 · Help P0 · Moments P1 · Understand P1**.

Inside Pack 1–3, manufacture Care + Help doors to ship quality before Moments/Understand polish if time-constrained — still ship all four doors present.

---

## Final question

### Can engineering stop after any pack and still safely ship?

**YES.**

**Why exactly:**

1. **Single kill switch** — `VITE_FF_PARENT_HUB_ROOMS_V1` restores legacy Hub; no migration to reverse.  
2. **Cumulative, not entangled** — each pack adds a complete layer (shell → hero → lists → transitions → premium → a11y → perf → polish) that does not require the next layer to avoid breakage.  
3. **Destination products untouched** — Speech / Care / Birth Sky / Nutrition keep working even if Hub IA stops mid-train.  
4. **Production Safety preserved every pack** — route, auth, entitlements, freezes.  
5. **Interim honesty** — Pack 1 may still show tiles under rooms; that is a known acceptable interim, not a half-deploy crash.  
6. **COMPLETE ≠ shippable** — Packs 1–7 may ship safely under flag; Pack 8 is required only to declare manufacturing COMPLETE under Six Reviews.

---

## STOP

**Manufacturing plan complete. No implementation. No React. No CSS. No production code.**

File: `docs/v2/PARENT_HUB_MANUFACTURING_PLAN.md`

Next (only after Founder approval of this plan): **Gate A0 Production Audit** → **Gate B0 Blueprint** → then Pack 1.
