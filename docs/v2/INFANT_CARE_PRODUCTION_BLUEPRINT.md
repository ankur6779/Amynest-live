# Infant Care — Production Blueprint (Phase 1 Study)

**Status:** STUDY ONLY — NO IMPLEMENTATION · NO REACT · NO CSS · NO DB · NO API  
**Date:** 2026-08-07  
**Authority:** Founder Order — Infant Care Manufacturing (Phase 1 Study)  

**Approved law:**  
`docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  
`docs/v2/AMYNEST_GLOBAL_MODULE_EXPERIENCE_AUDIT.md`  
Parent Hub Constitution · Pack 5 Premium Continuity · AmyNest Philosophy  

**Frozen forever:** Welcome V3 · Signup Keep · Child Discovery · Today Home · Parent Hub room IA  

**Scope of this document:** Determine what must change and what must remain.  
**Not this document:** Redesign · manufacture · ship code.

---

## Executive Summary

Infant Care is the **correct first module** to manufacture.

It is the Care-room recommended destination for 0–24 months, age-featured, **not journey-gated at the door**, and it carries the highest daily willingness-to-pay in the Hub.

**Problem:**  
Parent Hub Care room is the AmyNest home.  
Infant Care **body** is still a dense emoji-tinted accordion **care OS** — a product inside the house, not another room of the house.

**Pack 5** already softened Premium shelf chrome around it.  
It did **not** unify materials, hierarchy, photography language, or density.

| Verdict | |
|---|---|
| Can ship today as functional Care? | **YES** (nested under rooms) |
| Would Apple ship Infant Care as it exists today? | **NO** |
| Manufacture priority | **#1** (Framework + Global Audit) |
| Effort class | **L** (visual unification + hierarchy; logic stays) |
| Production approach | Presentation / hierarchy manufacturing · **Reuse Before Rewrite** for APIs/DB/entitlements |

---

# Current Audit

## Current flow (Rooms V1 — default ON)

```text
Parent Hub open (infant child)
        ↓
Care auto-enter (or Care door)
        ↓
FE sanctuary hero — shot-01-arrival · "Take care of today."
        ↓
Quiet path: Infant Care recommended ("Today's care")
        ↓
.ph-module-quiet + Pack 5 continuity wrapper
        ↓
InfantHub lazy chunk
  → Eyebrow 👶 + title/subtitle
  → Activation flow OR Baby Today (violet glass)
  → Weekly Progress Report
  → ~12–14 accordion premium tiles (all start closed)
  → Safe disclaimer
        ↓
Exit panel (after path open): Back to Home · Continue today · Another room
```

**Evidence:** `parenting-hub.tsx` · `parent-hub-rooms-shell.tsx` · `lib/parent-hub/flow.ts` · `components/infant-hub.tsx`

---

## Entry

| Aspect | Current |
|---|---|
| Room | Care (auto-enter for infants) |
| Recommendation | Infant Care first |
| Door gate | Age &lt; 24m only — **not** journey-locked |
| Deep link | `#tile-infant-hub` / `infant-*` section events |
| Quiet slot | Pack 5 hides Try Free / “1 free plan” badges |

**Framework gap:** Entry into Care room is sanctuary. Entry into InfantHub body is **feature OS**.

---

## Opening screen

| Order | Surface | Universe |
|---|---|---|
| 1 | 👶 title + age subtitle | Utility / product |
| 2 | Activation skeleton / flow **or** Baby Today violet–fuchsia card | SaaS glass |
| 3 | Weekly Progress Report | Dashboard energy |
| 4 | Accordion stack | Feature catalogue |

**First emotional impression:** “Here is a care control panel,” not “Take care of today — one next act.”

---

## Header · Hero · Typography · Spacing

| Dimension | Current |
|---|---|
| Header | Emoji eyebrow + i18n title — not FE photography |
| Hero | No FE photo hero inside InfantHub; Care room hero sits **above** the module |
| Typography | Mixed Hub utility + section titles; badges “Smart” / “Live” |
| Spacing | Dense vertical accordion; high scroll tax |
| Reading rhythm | Catalogue, not one-breath intention |

---

## Photography · Material system

| Layer | Universe |
|---|---|
| Care room shell | FE — `/experience/r1/shot-01-arrival.png`, ambient, wash, breath |
| Pack 5 quiet wrapper | Continuity chrome only |
| InfantHub body | Emoji watermarks · per-tile tints · dark glass expand · violet/indigo/orange gradients |
| Ask Amy CTAs | Violet→purple gradient → leave to `/assistant` |

**Framework fail:** M1–M5 — not one material system. Same-home photography language stops at the room shell.

---

## Navigation · Completion · Exit

| Control | Current |
|---|---|
| All rooms | Room shell |
| Back to Home | Exit panel → `/dashboard` |
| Continue today | Clears module, stays in Care |
| Another room | Doors |
| In-module | Accordion expand + scroll; hash section open |
| Module-owned completion | **None** — no calm “care held” ritual inside InfantHub |

**Keep:** Exit Law on room shell.  
**Change:** Opening hierarchy so completion feels earned, not abandoned mid-catalogue.

---

## Premium presentation

| Surface | Current |
|---|---|
| Destination door | Free to enter |
| Core loops (sleep/feed/cry/diaper/growth logs) | Free |
| Sleep Coach | 1 lifetime free plan → gate `infant_sleep_coach` |
| Feeding Plan (≥6m) | 1 lifetime free → `infant_feeding_plan` |
| Baby Expert / Ask Amy | Daily quota `infant_ai_query` (default 3) |
| Quiet Hub chrome | “1 free plan” hidden; PREMIUM_VOICE on LockedBlock elsewhere |
| Inside panels | “Unlock Sleep Coach” / “Unlock Feeding Plan” / “Upgrade to refresh” language still exists in panel CTAs |
| RevenueCat | Existing premium offering — **no infant-specific SKU** |

**Framework:** Entitlements stay. Presentation must become continuity, never unlock theatre.

---

## CTA hierarchy (current)

1. Activation / Baby Today  
2. Accordion discovery (many equal doors)  
3. AI plan generators  
4. Ask Amy (leaves Hub)  
5. Room exit  

**Problem:** Too many peer CTAs — violates one-intention calm.

---

## Loading · Empty · Error · Success

| State | Current patterns |
|---|---|
| Loading | HubLazy “Loading…”, activation skeleton, “Building your plan…” |
| Empty | Baby Today unavailable copy; age ≥24 → silent `null` |
| Error | Hook error text; Hub-level `ApiRetryShell` |
| Success | Plan body + date; weekly focus checkbox; no quiet companionship close |

**Gaps:** Loading can feel AI-theatre; success lacks Steady completion; empty age-out is abrupt.

---

## Feature surface (must remain capable)

Cry · Sleep (predict, wake windows, issues, routine, weekly, AI coach) · Feed · Diaper/burp · Growth · Milestones · Vaccinations · Doctor report · Parent wellbeing · Sounds · Weekly focus · Amy Suggests · Baby cues/coaching · Activities · Activation · Baby Today · Notifications · Co-parent (flag off) · Ask Amy CTAs  

**Manufacturing must not delete Care capability.**  
It must **re-hierarchy** and **re-material** it.

---

# Previous vs New

| Dimension | Current (Previous) | Target (New) | Why necessary | Must never change |
|---|---|---|---|---|
| Entry | Care sanctuary → emoji OS | Care sanctuary → **one next care act** in same light | Framework E/O laws | Care auto-enter for infants; age gate |
| Opening | Title + Baby Today dashboard + accordion mall | One human sentence + **one primary care door** (sleep/feed/cry by context) | Exhausted-parent test | Ability to reach all tools |
| Hero | Room FE only; module emoji | Module opening inherits FE light / sanctuary materials | Same home | FE shot family / camera grammar |
| Materials | Violet/indigo/orange SaaS glass | FE / Parent Hub living materials only | Apple A2/A3 | Business logic panels |
| Hierarchy | 12–14 peer accordions | Progressive disclosure: Today → needed tools → depth | Question Tax / calm | Section deep-link ids (`infant-*`) |
| Premium | Unlock CTA strings inside panels | PREMIUM_VOICE after value | Pack 5 / Framework P laws | Entitlement keys & free tastes |
| Ask Amy | Gradient leave-to-assistant | Continuity into Help/Ask without app-switch shock (scope may be Hub presentation first) | Immersion | Assistant product existence |
| Exit | Room exit panel only | Room exit + quiet in-module “care held / back to life” | Completion C laws | Exit Law Home link |
| Data/API | Full infant stack | **Reuse** — no rewrite | Reuse Before Rewrite | Tables, routes, flags |
| Analytics | Rich infant funnel | Keep events; no rewrite required for Phase 1 study | Growth visibility | Event names stability preferred |
| RC / pricing | Unchanged | Unchanged | Founder safety | SKUs / entitlements |

---

# Emotional Journey

### Exhausted parent test

| Feeling | Current | Target |
|---|---|---|
| Safe | Partial — Care room yes; module overwhelms | Yes — one held next step |
| Supported | Yes if they find the right accordion | Yes immediately |
| Less anxious | Risk of catalogue anxiety | Relief first |
| More confident | After successful log/plan | After first calm act |
| Another application? | **Often yes** inside InfantHub | **Never** |

### Target journey (emotional)

```text
Arrive in Care light
  → "What should I care for now?"
  → One clear act (log / soothe / plan)
  → Quiet success
  → Optional deeper tools
  → Home / life
  → (only then) continuity Premium if value felt
```

---

# Database Review

| Table | Role | Manufacturing impact |
|---|---|---|
| `infant_care_logs` | Feed / diaper / burp | **Keep — no migration** |
| `nap_sessions` | Sleep logs | **Keep** |
| `cry_sessions` | Cry insight | **Keep** |
| `infant_growth_measurements` | Growth | **Keep** |
| `infant_milestone_progress` | Milestones | **Keep** |
| `infant_wellbeing_checkins` | Parent wellbeing | **Keep** |
| `vaccination_logs` | Health | **Keep** |
| `infant_notification_prefs` | Prefs | **Keep** |
| `infant_product_analytics_events` | Analytics warehouse | **Keep** |
| `child_caregivers` | Co-parent | **Keep** (flag off) |
| `ai_cache` | Coach plan cache | **Keep** |
| `feature_usage` / daily usage | Entitlement counters | **Keep — no entitlement rewrite** |

**Phase 1 manufacturing:** **Zero schema changes** unless a later Founder order proves a gap.  
**Risk:** Dual sleep sources (server naps vs `localStorage amynest:sleep:*`) — do not “fix” casually.

---

# API Review

| Area | Endpoints (prefix) | Impact |
|---|---|---|
| Care logs | `/api/infant-care/*` | Reuse |
| Today / activation | `/api/infant-today/*`, `/api/infant-activation/*` | Reuse |
| Growth / wellbeing / milestones | `/api/infant-growth/*`, `infant-wellbeing/*`, `infant-milestones/*` | Reuse |
| Sleep coach / weekly | `/api/infant-sleep/*` | Reuse |
| Feeding plan | `/api/infant-feeding/*` | Reuse |
| Cry / sleep predict | `/api/cry-insight/*`, `/api/sleep-predict/*` | Reuse |
| Vaccinations / doctor | `/api/vaccinations/*`, `/api/infant-doctor-report/*` | Reuse |
| Notifications / caregivers | `/api/infant-notifications/*`, `/api/child-caregivers/*` | Reuse |
| Admin analytics | `/api/admin/infant-parenting-analytics` | Untouched |

**Client:** `lib/infant-care-api.ts` — Firebase Bearer auth.  
**Phase 1:** **Zero API contract changes.** Presentation-only manufacturing.

---

# Analytics Review

| Funnel (existing) | Events |
|---|---|
| Open → Today → First log → Cry → Weekly | `infant_hub_opened`, `baby_today_viewed`, `first_log_created`, `cry_analysis_completed`, `weekly_report_viewed` |
| Coach / plan | CTA viewed, generated, upgrade prompt |
| Quota | `infant_ai_quota_reached` |

**Phase 1:** No analytics rewrite.  
Optional later: additive sanctuary events (room → primary act) — **not** required to start manufacturing.  
Do not rename existing events without Growth Review.

---

# Performance Review

| Factor | Current | Manufacturing note |
|---|---|---|
| Lazy InfantHub chunk | Yes | Keep |
| Eager imports inside chunk | Dense (cry/sleep/feed/…) | Hierarchy may defer mount of deep panels |
| Accordions default closed | Helps first paint | Keep progressive disclosure |
| Audio catalogs | Heavy when Sounds opened | Keep lazy-on-open discipline |
| AI plan polling | Async | Keep; calm loading copy |
| React Query | today 60s / activation 30s | Keep |

**Risk if materials change:** CSS shared with Hub section chrome; quiet-slot CSS; deep-link ids; entitlement key strings.

---

# Feature flags · Firebase · RevenueCat · Offline · Caching

| System | Current | Manufacturing stance |
|---|---|---|
| `VITE_FF_PARENT_HUB_ROOMS_V1` | Default ON | Keep — rollback lever |
| `VITE_FF_INFANT_V2` | Default true | Keep |
| `VITE_FF_INFANT_PREMIUM` | Default true | Keep — do not flip entitlements |
| `VITE_FF_CO_PARENT` | Default false | Keep off |
| Firebase | Auth token for infant APIs only | No Firebase domain rewrite |
| RevenueCat | Shared premium offering | **No RC / pricing changes** |
| Offline | Hybrid localStorage + server | Do not collapse dual stores without study |
| Cache | RQ + `ai_cache` + local keys | Preserve keys |

---

# Production Safety

| Risk | Severity | Mitigation |
|---|---|---|
| Visual refactor breaks deep-link section ids | High | Freeze `infant-*` ids |
| Entitlement string rename breaks paywall | Critical | Never rename `infant_sleep_coach` / `infant_feeding_plan` / `infant_ai_query` in Phase 1 |
| Accidental API/DB migration | Critical | Presentation-only scope |
| Dual sleep storage divergence | Medium | Do not “unify storage” in Phase 1 without Founder order |
| Quiet-slot regression (Try Free returns) | Medium | Keep Pack 5 provider; panels read quiet context |
| Age-gate mismatch (Hub vs component) | High | Keep &lt;24m aligned |
| Performance regression (eager expand-all) | Medium | Do not default-open all sections |
| Ask Amy leave feels like app switch | Medium | Scope: Hub presentation first; assistant continuity later |

### Rollback strategy

| Lever | Effect |
|---|---|
| Module manufacturing feature flag (recommended when coding) | Instant UI rollback |
| `VITE_FF_PARENT_HUB_ROOMS_V1=0` | Legacy mall; infant featured |
| `VITE_FF_INFANT_PREMIUM=0` | Removes coach/plan/Ask Amy CTAs |
| Git revert of manufacturing PR | Full restore |
| **Never** rollback by changing entitlements/pricing | Absolute |

**Zero assumptions:** No silent schema, no silent RC, no silent route table edits.

---

# Apple Review

### Does Infant Care feel like…?

| | Current |
|---|---|
| Feature page? | **Yes** (accordion catalogue) |
| SaaS product? | **Yes** (violet Baby Today, unlock CTAs, dashboard report) |
| Dashboard? | **Partially** (Weekly Progress + Baby Today) |
| Another room in the AmyNest home? | **No** — room shell yes; module body no |

### Same-home checklist (current)

| Apple rule | Pass? |
|---|---|
| Same home | **NO** |
| Same light | **NO** (inside module) |
| Same material system | **NO** |
| Same emotional voice | Partial (Pack 5 chrome); panel unlock strings fail |
| Same calm | **NO** (density) |
| Same photography language | **NO** (emoji OS) |
| No product marketing | Partial |
| No SaaS energy | **NO** |

---

# Founder Review

| Question | Answer |
|---|---|
| Right first module? | **YES** — Care WTP · daily · stays in Hub |
| Redesign product logic? | **NO** — hierarchy + materials + Premium voice |
| Touch freezes? | **NO** |
| Pricing / RC / entitlements? | **NO** |
| Ship Hub without Infant manufacturing? | Acceptable short-term; Apple continuity claim **not** allowed |
| Parent trust? | Exhausted parents need one next act — catalogue fails them |

---

# Manufacturing Phases (proposed — not scheduled)

Await Founder order before any phase starts.

### Phase 1A — Hierarchy (Hub body)

- One opening intention sentence in Care light  
- One primary “care for now” path (contextual sleep/feed/cry)  
- Secondary tools progressive — not 14 peer doors  
- Preserve all capabilities behind calm disclosure  
- Preserve `infant-*` deep links  

### Phase 1B — Materials unification

- Retire emoji watermark OS as opening grammar  
- Inherit FE / Parent Hub living materials inside quiet slot  
- Subordinate violet/orange SaaS gradients  
- Keep Care room photography continuity into module opening  

### Phase 1C — Premium presentation

- Replace Unlock / Upgrade panel CTAs with `PREMIUM_VOICE`  
- Keep free tastes + entitlement checks  
- No RC / pricing / entitlement changes  

### Phase 1D — States & completion

- Calm loading / empty / error / success  
- Quiet completion → Home / life  
- Ask Amy CTA without marketing gradient shock (Hub scope)  

### Explicit non-goals (Phase 1)

- No new infant tables  
- No API redesign  
- No assistant full manufacturing  
- No co-parent launch  
- No Nutrition/Health Lab in this order  
- No Pack 6 Hub changes  

---

# Definition of Done (Infant Care)

Infant Care manufacturing is COMPLETE only when:

1. Module Manufacturing Framework checklists all PASS  
2. Apple Checklist = YES (same home / light / materials / voice / calm / photography)  
3. Exhausted parent test = safe · supported · less anxious · more confident — **not** another app  
4. All care capabilities still reachable  
5. Zero DB/API/RC/auth/Firebase/routing regressions  
6. Pack 5 quiet law intact  
7. Entitlement keys unchanged; free core loops unchanged  
8. Flag + rollback verified  
9. Implementation review filed (`docs/v2/INFANT_CARE_MANUFACTURING_REVIEW.md` when coded)  
10. Founder explicit acceptance  

---

# Estimated effort

| Band | Scope | Size |
|---|---|---|
| **S** | Premium copy-only inside panels | Days |
| **M** | Hierarchy reshape in InfantHub (keep components) | ~1 manufacturing slice |
| **L** | Hierarchy + FE material unification + states/completion | **Recommended Phase 1** |
| **XL** | + storage unification + assistant continuity + new IA | Out of Phase 1 |

**Recommended estimate for Founder-ordered Phase 1 manufacturing:** **L**  
Primary risk: visual/hierarchy regression — not data.

---

# FINAL QUESTION

## Would Apple ship Infant Care as it exists today?

# NO

### Blockers ordered by production impact

1. **Opening hierarchy is a feature catalogue** (12–14 peer accordions) — fails exhausted-parent calm and Apple density restraint  
2. **Material universe split** — FE Care room vs emoji-tint SaaS glass body — fails same home / same light / same materials  
3. **Dashboard-first energy** — Baby Today violet card + Weekly Progress before one care act — SaaS, not sanctuary  
4. **Premium unlock theatre inside panels** — “Unlock Sleep Coach / Feeding Plan / Upgrade to refresh” — fails Premium continuity law (entitlements OK; voice not)  
5. **No module photography language** — emoji watermarks as identity — fails same photography grammar  
6. **Ask Amy gradient leave** — feels like launching another app from Care  
7. **Success/completion under-designed** — parent exits via Hub panel without “care held” close  
8. **Dual sleep storage complexity** — production risk if manufacturing tries to “fix data” instead of experience  
9. **Chunk density / performance** — acceptable with closed accordions; fails if manufacturing expands everything by default  

---

## What must remain (absolute)

- Age gate 0–24m · Care recommendation · deep-link section ids  
- All care logging and insight capabilities  
- Activation + Baby Today **data** (presentation may change)  
- API routes · DB tables · analytics event family  
- Entitlement keys · free tastes · RevenueCat offering  
- Pack 5 quiet-module provider  
- Room Exit Law · Home Boundary · Today Home freezes  
- `FF_INFANT_*` kill switches  

---

## STOP

No implementation.  
No React · CSS · DB · API · RevenueCat · Firebase · routing changes.

Wait for Founder approval before Infant Care manufacturing begins.
)
