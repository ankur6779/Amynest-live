# Infant Care Phase 2 — Founder Review

**Status:** MANUFACTURED — PRESENTATION / HIERARCHY ONLY  
**Date:** 2026-08-07  
**Authority:** Founder Order — Infant Care Manufacturing (Phase 2 Implementation)  
**Blueprint:** `docs/v2/INFANT_CARE_PRODUCTION_BLUEPRINT.md` (APPROVED)  
**Framework:** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  

**Commit SHA:** _(filled at push)_  

**STOP after this module.** Speech Coach not started.

---

## Mission result

Infant Care is no longer a 12–14 accordion feature catalogue as the first impression.

It opens as **Today's Care** — one recommended action, then quiet care paths (Sleep · Feeding · Growth · Health · Milestones), with everything else under **More care**.

Business logic, APIs, DB, entitlements, RevenueCat, routes, and deep-link ids remain.

---

## Previous vs New

| | Previous | New (Phase 2) |
|---|---|---|
| Opening | 👶 title → Baby Today violet card → Weekly Progress → equal accordions | **Today's Care** hero → one recommend CTA → quiet paths |
| Hierarchy | 12–14 peer tiles | Primary 5–6 + More nest |
| Dashboard energy | Baby Today + Weekly Progress lead | Subordinated under **More care** |
| Badges | Smart / Live / Track | Removed on living layout |
| Premium voice | Unlock Sleep Coach / Feeding Plan / Upgrade | `Continue with AmyNest` / continuity copy |
| Materials | Emoji-OS wattage untempered | Living CSS softens watermarks / ambient; FE Care room still wraps |
| Continuity line | — | “We'll continue helping as your child grows.” |
| Rollback | — | `VITE_FF_INFANT_CARE_LIVING_V1=0` → legacy catalogue |

---

## Screenshots

| Artifact | Path |
|---|---|
| Living hierarchy preview | `/opt/cursor/artifacts/infant-care-phase2-living.png` |

<img alt="Infant Care Phase 2 living hierarchy" src="/opt/cursor/artifacts/infant-care-phase2-living.png" />

---

## What shipped (code)

| Path | Change |
|---|---|
| `lib/infant-care/living-room.ts` | Recommend action + quiet destination set + flag |
| `lib/infant-care/living-room.test.ts` | Unit tests |
| `components/infant/infant-care-living-room.css` | Sanctuary hierarchy materials |
| `components/infant-hub.tsx` | Living layout vs legacy kill-switch |
| `infant-sleep-coaching-panel.tsx` | PREMIUM_VOICE CTAs |
| `infant-feeding-plan-panel.tsx` | PREMIUM_VOICE CTAs |
| `weekly-progress-report.tsx` | Continuity Premium copy |

**Untouched:** Welcome · Signup · Discovery · Today Home · Parent Hub rooms · APIs · DB · RC · entitlements · Firebase · routing tables · deep-link `infant-*` ids · care capability components.

---

## Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** migrations / schema changes |
| API | **Zero** contract changes |
| Firebase | Auth-only usage unchanged |
| RevenueCat | **Zero** changes |
| OAuth / Auth | Unchanged |
| Entitlements | Keys & free tastes unchanged |
| Feature flags | New `VITE_FF_INFANT_CARE_LIVING_V1` (default ON); existing infant flags untouched |
| Caching / offline | localStorage + RQ + ai_cache unchanged |
| Deep links | `infant-*` ids preserved; More auto-opens for nested targets |
| Accessibility | Recommend + More use buttons; `aria-expanded` on More; reduced-motion on CTA |
| Performance | Fewer peer tiles above fold; More deferred; chunk still lazy via Hub |

**No production STOP triggers encountered.**

### Rollback

1. `VITE_FF_INFANT_CARE_LIVING_V1=0` → legacy catalogue  
2. Git revert of Phase 2 commit  
3. Never flip entitlements to “fix” UI  

---

## Performance

| Item | Notes |
|---|---|
| First impression | Lighter — hero + ≤6 quiet paths vs 14 peers |
| More care | Mounted only when expanded (except recommend/deep-link open) |
| Lazy InfantHub | Unchanged |
| Risk | Chunk still large internally — acceptable; not expanded by default |

---

## DB Review

**PASS — no changes.** All infant tables remain as before.

---

## API Review

**PASS — no changes.** All `/api/infant-*` and related routes reused.

---

## Analytics Review

**PASS — no rewrite.** `trackInfantHubOpened` and panel events unchanged. Hierarchy does not rename funnels.

---

## Regression Review

| Risk | Status |
|---|---|
| Deep link to wellbeing/sounds/etc. | Mitigated — More auto-opens |
| Cry when not primary | Lives under More; deep link opens More |
| Activation first-run | Still above quiet paths when required |
| Age ≥24 null | Unchanged |
| Pack 5 quiet badges | Still applies around module |
| Legacy mall Rooms off | InfantHub living flag independent; catalogue via living=0 |

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Tests | **PASS** (`living-room.test.ts` + prior quiet tests) |
| Founder Review | **PASS** vs order (no new features, no logic rewrite) |
| Apple Review | **PASS approaching** — hierarchy is a calm room; residual emoji watermarks softened not eliminated |
| Parent Review | **PASS** — one next care act first |
| Engineering Review | **PASS** — flag + reuse |
| Database Review | **PASS** |
| Production Safety | **PASS** |

---

## Scores

| Score | Value | Note |
|---|---|---|
| **Founder Score** | **8.5 / 10** | Mission met; Ask Amy leave still a mild cut |
| **Apple Score** | **8.0 / 10** | No longer a feature catalogue first; same-home materials still share Hub section chrome DNA |

### Apple test answer

> Would Apple still describe this as a feature catalogue — or a calm room inside the AmyNest home?

**A calm room inside the AmyNest home** (first impression).  
Supporting tools remain available without leading.

---

## Remaining Debt

1. Hub section card chrome (watermarks/tints) softened, not fully FE photography heroes inside each path  
2. Ask Amy still navigates to `/assistant` (separate module manufacturing)  
3. Baby Today / Weekly Progress UI still product-shaped when More is opened  
4. Dual sleep storage untouched (correct for Phase 2)  
5. Speech Coach / Nutrition / etc. not started  

---

## Definition of Done (Phase 2)

| Item | Met? |
|---|---|
| Catalogue feeling removed from opening | **YES** |
| Today's Care + one recommendation | **YES** |
| Quiet supporting destinations | **YES** |
| Dashboard subordinated | **YES** |
| Premium continuity voice | **YES** (panels + weekly) |
| No RC / entitlements / API / DB changes | **YES** |
| Reuse Before Rewrite | **YES** |
| Flag + rollback | **YES** |
| Speech Coach not started | **YES** |

---

## STOP

Infant Care Phase 2 complete.  
**Do not begin Speech Coach.**  
Wait for Founder approval.
)
