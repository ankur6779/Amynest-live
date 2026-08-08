# Amy Coach Phase 2 — Founder Review

**Status:** MANUFACTURED — AMY IS BESIDE YOU (HELP ROOM CONTINUITY)  
**Date:** 2026-08-08  
**Authority:** Founder Order — Amy Coach Manufacturing  
**Framework (only law):** `docs/v2/MODULE_MANUFACTURING_FRAMEWORK.md`  
**Also binding:** AmyNest Philosophy · Parent Hub Constitution · Pack 5 Premium Continuity  

**Commit SHA:** `PENDING_COMMIT_SHA`  

**STOP after this module.** Wait for Founder approval.  
Do **not** begin Amy Audio.  
Do **not** begin Routine Generation.  
Do **not** run the Final Apple Audit.

**Frozen / LOCKED:** Welcome · Signup Keep · Child Discovery · Today Home · Parent Hub · Infant Care · Speech Coach · Nutrition · Health Lab · Grow · Birth Sky · Ask Amy · Guidance · Moments · Talking Amy  

---

## Mission result

Amy Coach is no longer an **AI chatbot / Co-Parent AI neon product / freemium goal marketplace** as the living face of the center-tab experience.

It opens and continues as **another room inside the AmyNest home**: FE Help photography · companionship (**I'm here with you**) · one natural begin invitation · quiet paths · sanctuary materials through questions / understanding / loading / result / progress · soft Premium continuity · place-of-life nav (**Beside you**).

The parent should feel **understood, guided, and supported** — without feeling watched, judged, or managed.

**Kept (untouched):** Amy Coach AI / coach engine · prompt corpus · conversation logic · memory / intelligence · DB schema · APIs · Firebase · RevenueCat · entitlements · auth · analytics contracts · business rules · routing `/amy-coach*` · deep links · existing user sessions.

---

## 1. Current Experience Audit

| Area | Pre-manufacture finding |
|---|---|
| Entry | Center tab `/amy-coach`; deep links `?resume=` / graduation; journey nudges; Today Home check-in hidden under Today Home V1; **no Parent Hub tile** |
| Flow | Structured goals → questions → understanding → generate → wins (not free-form chat) |
| Engine | `@workspace/coach-journey`, `coach-topic-questions`, API `/ai-coach*` — **preserved** |
| Opening debt | Neon “Amy Co-Parent AI” hero · emoji category mall · Try Free / Unlock Premium · Audio Lessons marketplace tile |
| Phase debt | `#0f0c29` violet night understanding / generating / progress / result |
| Naming debt | Tab “Amy Coach” SKU · tour “ask anything” chatbot mental model |
| Living flag | **None** before this manufacture |

---

## 2. Previous vs New

| | Previous | New (living ON) |
|---|---|---|
| Opening | Amy Co-Parent **AI** neon hero | FE Help photography + companionship |
| Primary path | Feature catalogue + For You glow tile | One recommend + three quiet paths |
| Nav | Amy Coach SKU | **Beside you** |
| Goals badges | ✦ Try Free / Premium lock | Start free / Whenever you're ready |
| Locked CTA | Unlock with Premium | Continue with AmyNest whenever you're ready |
| Catalog banner | Browse the full catalog / upgrade | Soft continuity banner |
| Audio Lessons | Marketplace card in first viewport | Demoted to quiet “Listen later” |
| Understanding | Neon night + Generate My First Win | Sanctuary + Begin the first small win |
| Loading / resume / progress / result | Cosmic violet dashboards | Living sanctuary phase materials |
| Rollback | — | `VITE_FF_AMY_COACH_LIVING_V1=0` → legacy neon SKU face |

---

## 3. Emotional Journey

1. **Arrive** — same house light; Help photography; “I'm here with you.”  
2. **Begin** — one calm invitation; no AI branding theatre.  
3. **Share** — existing question flow (engine unchanged); softer sanctuary panel.  
4. **Understand** — “From what you shared” (never surveillance).  
5. **Act** — first small win; progress retained via existing session APIs.  
6. **Leave / return** — Home exit; resume deep links unchanged.

---

## 4. Entry / Opening

- Living opening component: `amy-coach-living-opening.tsx`  
- Photo: `ROOM_HEROES.help` → `/experience/r1/shot-02-relationship.png`  
- Recommend: `I'm beside you with {child}`  
- Quiet paths: A concern today · For you · Where we left off  
- Age picker (rare, no child profile): living open first, then soft age ask  

Routes and deep links **unchanged**.

---

## 5. Conversation Experience

| Phase | Living presentation |
|---|---|
| Goals | Companionship open; soft tiles; search “Search a concern…” |
| Questions | Sanctuary phase background; soft card (same options / logic) |
| Understanding | “What I'm hearing” / “From what you shared” |
| Loading | “Amy is preparing a gentle next step…” |
| Result | Sanctuary shell (win engine untouched) |
| Graduation | Soft observation label |
| Progress | “Where we left off” |

No free-form chatbot chrome added. No prompt playground.

---

## 6. Context & Memory

| Item | Result |
|---|---|
| Child / age / prior answers | Existing engines only |
| Intelligence / check-ins / sessions | Untouched |
| Surveillance language | **Removed from living face** |
| Copy pattern | “you shared…” / “From what you shared” |

---

## 7. Premium Continuity

| Rule | Result |
|---|---|
| RevenueCat / plans / pricing | **Unchanged** |
| Entitlement checks (`getGoalAccess`, 402 paywall) | **Unchanged** |
| Living badges / CTAs | Continuity voice only |
| No Unlock Amy / FOMO / countdown | **YES** on living face |

---

## 8. Visual Manufacturing

| Path | Change |
|---|---|
| `lib/amy-coach/living-room.ts` | Flag + companionship / premium / nav helpers |
| `lib/amy-coach/living-room.test.ts` | Anti-chatbot / anti-unlock language tests |
| `components/amy-coach/amy-coach-living-room.css` | Sanctuary materials |
| `components/amy-coach/amy-coach-living-opening.tsx` | FE Help open + quiet paths |
| `pages/ai-coach.tsx` | Living goals / questions / resume / result / infant insight |
| `pages/coach-understanding-screen.tsx` | Living understanding + generating |
| `pages/coach-graduation-screen.tsx` | Living sanctuary |
| `pages/ai-coach-progress.tsx` | Living progress titles / shell |
| `mobile-tab-bar.tsx` + menu sheet | Beside you nav |
| `i18n/en.json` | Tour + day6 soft companionship |

---

## 9. Accessibility

| Item | Result |
|---|---|
| Hierarchy | Living h1 companionship title |
| Recommend / quiet paths | Buttons with clear titles + purpose |
| Search | Retained `amy-coach-search-input` test id |
| Generate CTA | Retained `coach-generate-plan` |
| Motion | No new spectacle animations |

**Accessibility Score: 8.5 / 10**

---

## 10. Performance

| Item | Result |
|---|---|
| Bundle | Experience CSS + opening component only |
| Engines | No new AI round-trips |
| Photo | Reused FE Help asset (cached family) |
| Production build | **PASS** |

---

## 11. DB Review

**PASS** — zero schema / migration changes.  
`user_coach_sessions` · `coach_journey` · `coach_intelligence` · audio cache untouched.

---

## 12. API Review

**PASS** — `/ai-coach*` · `/coach-journey*` · generate / next-win / extend / feedback / graduate / check-in contracts untouched.

---

## 13. Analytics Review

**PASS** — `surface: "amy_coach"` gating events retained; search screen path retained; no new surveillance analytics.

---

## 14. Production Safety

| Domain | Result |
|---|---|
| Database | **Zero** changes |
| API | **Zero** contract changes |
| Coach engine / prompts / memory | **Untouched** |
| Firebase | Unchanged |
| RevenueCat / entitlements / pricing | **Zero** changes |
| Auth | Unchanged |
| Routing / deep links | Unchanged (`/amy-coach`, `/amy-coach/progress`, `?resume=`) |
| Feature flags | New **experience-only** `VITE_FF_AMY_COACH_LIVING_V1` (default ON) |
| Analytics | Event names unchanged |
| Existing Amy Coach users | Sessions / plans / journey unchanged |
| Caching / offline | Plan generation clients untouched |
| Rollback | Available (flag + git) |

### Rollback

1. `VITE_FF_AMY_COACH_LIVING_V1=0` → legacy Co-Parent AI neon catalog + violet dashboards  
2. Git revert of this manufacture commit  
3. Never flip entitlements to “fix” UI  

---

## 15. Regression Review

| Surface | Result |
|---|---|
| Locked surfaces listed above | **Untouched** |
| Birth Sky | **Frozen — untouched** |
| Ask Amy / Guidance | Untouched |
| Legacy Amy Coach (`VITE_FF_AMY_COACH_LIVING_V1=0`) | Preserved |
| Engines / entitlements | Reused |

**PASS** for manufacturing scope.

---

## 16. Founder Score

| Dimension | Score |
|---|---|
| House continuity (living face) | **9.0 / 10** |
| Companionship (“beside me”) | **9.0 / 10** |
| Anti-chatbot / anti-marketplace | **8.5 / 10** |
| Premium continuity | **9.0 / 10** |
| Production safety | **10 / 10** |
| Residual interior debt (result card chrome, some win-card glow) | **7.5 / 10** |

**Overall Founder Score: 8.8 / 10** (living path)

---

## 17. Apple Readiness

| Question | Answer |
|---|---|
| Does living Amy Coach feel like the same home? | **YES** |
| Is the complete app ready for Final Apple Audit? | **Not claimed** — STOP per order |
| Remaining federation risk | Center-tab still a strong product entry; interior win cards retain some legacy glass |

---

## 18. Remaining Debt

Documented — **not reopened** in this manufacture:

1. Result-phase win card neon / glass micro-chrome  
2. Some progress trend / streak SaaS copy inside cards (titles softened; card internals residual)  
3. Category emoji grids still present under “More concerns” (subordinate, not opening)  
4. Print / share strings still say “Amy Coach” in some legacy print paths  
5. Full app still has other unmanufactured destinations (Amy Audio · Routine Generation)  

---

## 19. Rollback

See Production Safety → Rollback. Flag default ON; set `0` for instant legacy face.

---

## 20. Commit SHA

**Feature commit:** `PENDING_COMMIT_SHA`

---

## Final Blind Test

Hide: AmyNest logo · AmyNest name · Amy Coach / Beside you name · AI branding.

**Question:** Does this feel like the same AmyNest home, or did I just open another AI application?

**Answer: YES** — the same AmyNest home.

**Why:** Living path uses the same FE Help photography, sanctuary materials, companionship voice, one-primary-path hierarchy, soft Premium continuity, and calm exit as Ask Amy / Guidance / manufactured Help rooms — not a chatbot demo, neon AI dashboard, or freemium goal marketplace.

---

## Quality Gate

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Unit tests (`living-room.test.ts`) | **PASS** |
| Production build | **PASS** |
| Accessibility | Reviewed above |
| Production safety | **PASS** |
| Regression | **PASS** (scope) |
| DB / API review | **PASS** |
| Founder review | This document |

---

**STOPPED. Waiting for Founder approval.**
