# Today Home V1 (R8) — Blueprint · Phase 1 Study Only

**Status:** AWAITING FOUNDER APPROVAL — **NO IMPLEMENTATION**  
**Date:** 2026-08-07  
**Branch:** `cursor/product-execution-model-v2`  
**Authority:** Founder Order — Today Home OPEN for study  

| Surface | Status |
|---|---|
| Welcome V3 (`/begin`) | Permanently frozen |
| Signup Keep Experience | Permanently frozen |
| Child Discovery | Permanently frozen |
| Today Home | OPEN — Phase 1 blueprint only |

---

## Mission (locked)

Today Home is **not** a dashboard, control panel, module launcher, or feature catalogue.

It answers **one question only**:

> What is the next right thing for this child, today?

### Today Home Law (Founder — Absolute)

> If the parent has to decide what to do next, Today Home has failed.  
> If Today Home has to decide what to do next, AmyNest has succeeded.

| FAIL | SUCCEED |
|---|---|
| Parent scans options and chooses | Product names one next right thing |
| Equal modules compete | Hierarchy is absolute |
| Home is a menu | Home is a decision already made |

Code DNA: `TODAY_HOME_LAW` · `passesTodayHomeLaw()` in `amynest-philosophy.ts`

Within **three seconds** the parent must know:

1. What matters today  
2. Why it matters  
3. What to do next  

### Absolute hierarchy

```
Today’s Next Right Thing
  ↓
Today’s Progress
  ↓
One supporting insight
  ↓
Everything else
```

Never invert this hierarchy.

### Governing laws

1. Four Pillars — Premium · Product · Production Safety · Conversion  
2. **Today Home Law** — product decides next; parent never chooses among options  
3. Question Tax Law  
4. Reuse Before Rewrite — discover existing capability first  
5. Six Reviews — COMPLETE only if all six pass  
6. Database first — reuse schema; no unnecessary migrations  

---

## 1. Current Home audit

### 1.1 What exists today

| Fact | Reality |
|---|---|
| Canonical route | **`/dashboard`** (no `/today` or `/home` route) |
| Tab label | “Home” → `/dashboard` |
| Post-onboarding landing | Often **`/routines/generate`** (activation), then steady-state `/dashboard` |
| Page | `artifacts/kidschedule/src/pages/dashboard.tsx` |
| Product docs | Today Home previously marked **NOT STARTED** |

### 1.2 Current UI inventory (top → bottom)

| # | Section | Component | Role today |
|---|---|---|---|
| 1 | Availability / sync chrome | banners | Ops |
| 2 | **Weather hero** | `SmartHeroSection` | Greeting + weather metrics + rotating insights |
| 3 | First-value CTA | `FirstValueHeroCard` | No-routine generate CTA (+ FE continuity line) |
| 4 | Activation resume | `ActivationResumeBanner` | Partial routine resume |
| 5 | Retention stack | `RetentionHubSection` / `DailyCheckInCard` | Check-in, streak, stars, coins, goals, winback |
| 6 | Journey | `SevenDayJourneyCard` | 7-day activation tasks |
| 7 | Timeline | `NowNextTimeline` | Routine items Now–Next (closest to “what’s next”) |
| 8 | Children chips | `ChildrenChipBar` | Multi-child filter |
| 9 | Infant shortcut | `InfantDashboardShortcut` | Infant hub |
| 10 | Compact stats | `DashboardCompactStatsRow` | Streak / today % |
| 11 | Amy Coach | `AmyCoachCheckInCard` | Coach session |
| 12 | Coaching + memory | `DashboardCoachingCard`, `AmyFamilyMemoryCard` | Tip + memory |
| 13 | Feature discovery | `FeatureDiscoveryStrip` | Module chips (Birth Sky, Phonics, Study, Games, Hub…) |
| 14 | More insights | `DashboardMoreInsightsSection` | Collapsed scores, behaviors, gaming |

**Hero today = weather card**, not developmental Next Right Thing.

### 1.3 Next Right Thing on Home today

| Mechanism | Exists? | Notes |
|---|---|---|
| Unified post-auth NRT engine on Home | **No** | Gap vs mission |
| FE `decideFirstExperienceNextThing` | Yes | Pre-auth; continuity only on Home |
| Continuity greeting | Yes | `consumeHomeContinuityGreeting()` |
| Timeline “next incomplete item” | Yes | Routine execution, not decide-next |
| Parent Hub `TodaysPath` | Yes | **On Parenting Hub, not Home** |
| Discovery NRT preview | Yes | Child Discovery film only |

### 1.4 Dashboard anti-patterns present (Founder reject list)

| Reject | Present? |
|---|---|
| Feature shortcuts / mall | Yes — `FeatureDiscoveryStrip` |
| Statistics first | Partial — weather metrics + score/stars/coins |
| Multiple competing cards | Yes — retention + journey + timeline + coach + discovery |
| Gamification (coins/stars/score) | Yes — retention hub |
| Widget wall / scroll to find focus | Yes |

---

## 2. Previous vs New

### 2.1 Emotional contract

| | Previous (`/dashboard`) | New (Today Home) |
|---|---|---|
| Metaphor | Command center / widget wall | Quiet film: one focus for this child today |
| First 3 seconds | Weather + many cards | **NRT named** — what / why / do |
| Parent feeling | “Where do I tap?” | “I know what to do now.” |
| Secondary content | Competes equally | Supports NRT only |

### 2.2 Impact matrix

| Dimension | Previous → New | Notes |
|---|---|---|
| **Emotional** | Confusion → calm certainty | Hierarchy locked |
| **Technical** | Aggregate dashboard | Compose existing decide/execute surfaces; do not rewrite engines |
| **Performance** | 5× 30s polls + weather geo | Fewer eager queries; NRT-first paint |
| **Conversion** | Diffuse CTAs | One primary action → completion |
| **Database** | Read-heavy multi-domain | Prefer existing reads; no new tables for V1 |
| **Engineering** | Large `dashboard.tsx` | Reuse components; retire competing chrome behind flags |

### 2.3 Screen-level previous vs new (proposed)

| Beat | Previous | New | Why |
|---|---|---|---|
| Hero | Weather metrics | **Today’s NRT card** (title, why, CTA) | Mission |
| Progress | Scattered % / streaks | **One progress strip** tied to NRT/routine | Hierarchy #2 |
| Insight | Many tips | **One supporting insight** | Hierarchy #3 |
| Child switch | Chip bar mid-page | Quiet child context (if multi-child) | Support NRT |
| Weather | Hero | Optional supporting insight or deferred | Not the focus |
| Retention coins/stars | Prominent | Retire from primary Home or bury | Anti-dashboard |
| Feature strip | Primary scroll | Retire from Home | Feature mall |
| Timeline | Mid-page | Becomes NRT execution path or merges into NRT CTA | One focus |

---

## 3. Emotional journey (proposed)

> Phase 1 design only. Prefer keeping route `/dashboard` for Production Safety (deep links, tab bar, analytics `dashboard_view`) while the experience becomes **Today Home** emotionally.

| Moment | Parent feeling | On screen |
|---|---|---|
| Open (≤3s) | Oriented | Child name + today’s NRT title |
| Why | Trust | One line: based on age / today / continuity / routine truth |
| Act | Capable | Single primary CTA → execute (routine step / generate / continue) |
| After act | Progress | Soft progress (done / remaining) — not scores |
| Secondary | Supported | One insight only (weather OR coach OR infant — never all) |
| Defer | Unburdened | Everything else behind quiet “More” or other tabs |

Photography / materials: inherit Welcome + Discovery sanctuary language (Reuse Before Rewrite — existing `fe-shell` / materials). **Do not invent a third visual system.**

---

## 4. Database review

### 4.1 Reuse (no new tables for V1)

| Need | Table / store | Columns / keys | How it serves NRT |
|---|---|---|---|
| Child identity | `children` | `id`, `name`, `age`, `age_months`, `education_stage`, wake/sleep | Whose today |
| Goals | `children.parent_goals` | jsonb codes | Soft priority of NRT |
| Today’s plan | `routines` | `date`, `items[]` status/time/activity | Execute / progress |
| Family adaptations | `routines.adaptations` | jsonb | Why line |
| Check-in habit | `user_retention` | streak, goals | Optional progress — not hero |
| Journey | `user_activation_journey` | day state | Activation only if no routine yet |
| Continuity / FE NRT | **localStorage** continuity | `nextThing`, `emotionalContext` | Day-0 bridge until server NRT |
| Signals (supporting) | `child_daily_signals` | mood, focus, sleep… | Insight — not required for V1 hero |
| Hub path | `parent_hub_journey` | path state | Reuse logic; surface on Home later if needed |

### 4.2 Card → data map (proposed V1)

| Card | Table | Columns | API | Logic | Analytics | Improves NRT? |
|---|---|---|---|---|---|---|
| NRT Hero | continuity + `children` + optional `routines` | name, age*, nextThing / first incomplete item | GET children, GET routines, local continuity | Reuse `decideFirstExperienceNextThing` / discovery preview adapter + routine next item | `dashboard_view`, new additive `today_nrt_shown` | **Primary** |
| Progress | `routines.items` | status counts | GET routines | % complete today | existing routine events | Shows follow-through |
| One insight | env **or** family intel **or** infant | context-specific | existing env / intelligence APIs | Pick one by age | existing | Supports why |
| Child switch | `children` | id, name | GET children | Select context | — | Correct child’s NRT |

### 4.3 Migrations

**Phase 2 recommendation: zero new tables / zero columns** for Today Home V1.

Only revisit schema if a durable server-side “today decision” must replace local continuity — separate Founder decision.

---

## 5. API review

### 5.1 Currently called by `/dashboard` (preserve compatibility)

| API | Keep for V1? |
|---|---|
| `GET /api/children` | Yes |
| `GET /api/routines` | Yes |
| `GET /api/dashboard/summary` | Optional / defer (stats-first) |
| `GET /api/dashboard/recent-routines` | Defer from primary Home |
| `GET /api/dashboard/behavior-stats` | Defer |
| `GET /api/environment/context` | Optional one insight |
| `GET /api/retention/status` + check-in POSTs | Defer from hero; optional progress |
| `GET /api/journey/status` | Only if no routine (activation) |
| `GET /api/subscription` | Yes (generate paywall) |
| Coach / feature-usage / infant-activation | Secondary only |

### 5.2 Existing APIs to reuse (not rewrite)

| Capability | Reuse |
|---|---|
| Decide NRT | `decideFirstExperienceNextThing` + `buildDiscoveryNrtPreview` |
| Continuity greeting | `consumeHomeContinuityGreeting` / `loadFirstExperienceContinuity` |
| Today’s Path (full loop) | Parent Hub `TodaysPath` + hub-journey APIs — **port composition, don’t fork logic** |
| Family intelligence headline | `resolveFamilyIntelligenceSurface` (already on timeline) |
| Infant today | `GET /api/infant-today/:childId` when age &lt; 24m |
| Finish / generate | Existing `/routines/generate` + routine detail |

### 5.3 New APIs

**None required for V1** if Home composes existing reads + client decide-next adapter.

---

## 6. Analytics review

### Preserve

| Event | Role |
|---|---|
| `dashboard_view` | Home open (keep name for dashboards; add props) |
| `home_visible` startup funnel | Entry |
| `routine_cta_clicked` / `routine_started` | Primary CTA |
| Retention events | If retention remains secondary |

### Additive (recommended, non-breaking)

| Prop / event | Purpose |
|---|---|
| `today_home_v1: true` | Segment craft rollout |
| `today_nrt_shown` | NRT hero painted |
| `today_nrt_cta` | Primary action |
| `nrt_source`: `continuity` \| `routine_item` \| `decide_next` \| `hub_path` | Science |

### Do not break

Growth SQL expecting `dashboard_view` / routine CTA names.

---

## 7. Existing components to reuse

| Component / module | Reuse how |
|---|---|
| `decideFirstExperienceNextThing` / `nrt-preview.ts` | NRT title/why engine |
| `DiscoveryNrtPreviewCard` / FE materials (`fe-shell`) | Visual language for NRT hero |
| `FirstValueHeroCard` | Activation when no routine — reshape as NRT CTA |
| `NowNextTimeline` | Progress / execute under NRT (simplify) |
| `consumeHomeContinuityGreeting` | Why line day-0 |
| `TodaysPath` (Parent Hub) | Logic reference / extract shared builder |
| `resolveFamilyIntelligenceSurface` | One insight |
| `InfantDashboardShortcut` / infant-today | Infant insight path |
| `useListChildren`, `useListRoutines`, subscription hooks | Data |
| Dashboard priority flags | Rollout / hide redundant widgets |

**Reuse Before Rewrite:** extract shared “resolve today’s NRT for child” helper from existing decide-next + routine next-item — do not invent a third recommendation engine.

---

## 8. Components to retire from primary Home

| Component | Action | Reason |
|---|---|---|
| Weather-as-hero (`SmartHeroSection` metrics wall) | Demote or replace hero | Competes with NRT |
| `FeatureDiscoveryStrip` on Home | Remove from primary | Feature mall |
| Retention coins/stars/score grid | Hide on Home (flag) | Gamification / stats-first |
| `DashboardMoreInsightsSection` default open | Keep collapsed elsewhere or remove | Overload |
| Gaming rewards row | Out of Home | Module competition |
| Multiple equal CTAs | Collapse to one primary | Product pillar |

Retire via **feature flags** first — do not delete files until conversion proves out (Production Safety).

---

## 9. Production risks

| Risk | Severity | Mitigation |
|---|---|---|
| Tab/deep link `/dashboard` breakage | High | Keep route; change composition |
| `dashboard_view` dashboard regressions | Medium | Keep event; additive props |
| Removing retention check-in hurts D1 habit | Medium | Flag; A/B; move to quiet secondary |
| Weather hero removal feels “less alive” | Low | Ambient photography from FE materials |
| Multi-child wrong NRT | High | Preserve child selection before NRT |
| Polling load (5×30s) | Medium | Reduce polls; NRT-first fetch |
| Paywall on generate | Keep | Existing subscription gate |
| FE continuity missing for old users | Medium | Fallback: routine next item → decide-next from child age |
| Welcome/Discovery/Signup edits | Critical | **Forbidden** |

---

## 10. Performance review

| Current issue | V1 guidance |
|---|---|
| 5 queries polled every 30s | Prefer children + routines (+ continuity) first; defer stats/behavior |
| Weather geo + Nominatim on hero | Do not block first paint; optional insight |
| Heavy retention nest | Lazy / secondary |
| Disabled `PostDashboardPrefetch` | Keep disabled until NRT path stable |
| Large `dashboard.tsx` | Split Today composition module; leave legacy behind flag |

**Target:** NRT hero interactive &lt; 3s on mid mobile; LCP photography from cached FE assets.

---

## 11. Conversion opportunities

| KPI | Mechanism |
|---|---|
| Daily Opens | Clear reason to return — named NRT |
| Routine Completion | One CTA into execute path |
| Day-1 Retention | Continuity → Home NRT → complete |
| Day-7 Retention | Progress strip without guilt/FOMO |
| Subscription | Value visible before paywall; generate still gated |

If a widget does not move one of these → **do not ship it on Home**.

---

## 12. Founder recommendations

### Recommend APPROVE for Phase 2 direction

1. **Keep route `/dashboard`**; manufacture Today Home experience in place.  
2. **Hero = Today’s NRT** (reuse decide-next + continuity + routine next item).  
3. **Hierarchy enforced** in layout and flags.  
4. **Zero new tables** for V1.  
5. **Reuse Before Rewrite:** shared resolver; port Hub Today’s Path ideas without forking.  
6. **Retire feature mall / coins hero** behind flags.  
7. **Do not touch** Welcome, Signup Keep, Child Discovery, or rewrite routine/NRT engines.  
8. **Rollout flag** e.g. `VITE_FF_TODAY_HOME_V1` (default off until Founder ship).  

### Recommend REJECT

- Any composition where the parent must decide what to do next (**Today Home Law FAIL**)  
- New “Home 2” parallel route without kill switch  
- New recommendation microservice for V1  
- Dashboard of equal modules  
- Scores/coins as primary Home language  
- Weather metrics as the emotional hero  

### Open Founder questions

1. Is weather allowed as the **single** supporting insight, or must insight be developmental only?  
2. Should retention check-in remain on Home at all in V1, or move to a secondary surface?  
3. Post-Discovery users: is continuity NRT enough until first routine exists, or must Home always deep-link generate?

---

## 13. Rollback strategy

1. Feature flag off → previous dashboard composition.  
2. No DB migrations → no data rollback.  
3. Analytics additive → old queries still work.  
4. Do not delete retired components until flag graduation.

---

## 14. Estimated implementation phases

| Phase | Scope | Ship gate |
|---|---|---|
| **1 — This doc** | Study only | Founder approve blueprint |
| **2 — Today Hero** | NRT hero + why + one CTA; hide feature strip/coins via flag; keep route | Six Reviews + quality gate |
| **3 — Progress + one insight** | Progress strip; single insight picker | Conversion check |
| **4 — Performance** | Cut polls; defer non-NRT queries | Perf budget |
| **5 — Graduate** | Remove legacy flag paths after proof | Founder freeze Today Home |

**STOP after Phase 1 until Founder approval.**

---

## Appendix A — Systems to preserve (non-negotiable)

Auth · Child Profile · Parent Profile · Routine Engine · Next Right Thing Engine (`decide-next`) · Analytics · RevenueCat · Firebase · Notifications · Feature Flags · Existing APIs · Existing sessions · Production users  

## Appendix B — Quality gate (Phase 2 — not started)

- [ ] Build / Tests / Performance  
- [ ] Existing APIs / DB / Analytics / Firebase / RevenueCat  
- [ ] Existing users / Mobile / Desktop / Accessibility  
- [ ] Welcome / Signup / Discovery untouched  
- [ ] Six Reviews PASS  

---

## STOP

**Phase 1 deliverable complete.**

No production code.  
No schema migrations.  
No Home UI manufacturing.

Await Founder approval before Phase 2 implementation.
