# AmyNest P0/P1 Remediation — Implementation Review

**Status:** MANUFACTURED — EXPERIENCE-LAYER SELECT ONLY  
**Date:** 2026-08-08  
**Authority:** Founder Order — AmyNest Portfolio P0/P1 Remediation  
**Audit baseline:** `4893a7690ef57c165ed96981128c8cc34cad7f9a`  
**Implementation map:** `docs/v2/AMYNEST_P0_P1_REMEDIATION_IMPLEMENTATION_MAP.md`  
**HEAD before coding:** `4893a769`  
**Implementation Commit SHA:** 

**STOP after this pass.** Do **not** run Final Apple Audit. Do **not** start another manufacturing phase.

---

## 1. Audit baseline

| Field | Value |
|---|---|
| Portfolio audit | `docs/v2/AMYNEST_FINAL_PORTFOLIO_REMEDIATION_AUDIT.md` |
| Commit | `4893a769` |
| Method | Evidence-backed SELECT only; STOP on business/engine/Hub IA/ops |

---

## 2. P0 findings selected

| ID | Implemented |
|---|---|
| **P0-1 (slice)** | Shared leave continuity exits (Today Home · Parent Hub) on Grow leave shell, Ask Amy companion, Speech session complete |
| **P0-2** | Speech living ON: hide XP/points/streak theatre; calm complete copy; leave exits |
| **P0-3** | Verified living Health Lab already demotes shop/XP in More — no engine change; residual debt = legacy OFF only |
| **P0-4** | Grow/`HubModulePageShell` Unlock theatre → `PREMIUM_VOICE`; leave continuity added |
| **P0-5** | Ask Amy living ON → companion chrome by default (modes/Zap off); leave continuity; **quotas untouched** |

---

## 3. P1 findings selected

| ID | Implemented |
|---|---|
| **P1-1** | Bottom tabs places-of-life: Home · Today's plan · Beside you · Rooms (routes unchanged) |
| **P1-6** | Rooms V1: stop passing Explore Free / Premium theatre `previewBadge` on Hub launch cards |
| **P1-11 (slice)** | Covered by Speech/Grow unlock chrome silence |

Also: RG R5 Today Home exit href aligned to `/dashboard` (direct sanctuary land).

---

## 4. Findings intentionally NOT touched (STOP + report)

| ID | Reason |
|---|---|
| **P0-6** Hub peer catalogues | Requires Parent Hub **IA remanufacture** (frozen four-room IA) |
| **P0-7** Hard-day monetization | Requires **business/entitlement/quota** policy — not presentation |
| **P0-8** Dual-flag corpse delete | Flags remain **required rollback** until production-cleared |
| **P0-9 certification** | Improved touch targets/labels on touched surfaces; **device VO/DT not certified** |
| **P0-10** Identity/RC/tenancy/consent | Backend/ops |
| **P1-2..5, 7–10, 12** | Deferred per map (IA risk, engine policy, XL ambient, or infra proof) |
| **P2/P3** | Explicitly out of scope |

---

## 5. Previous vs New

| Surface | Previous | New (living / rooms ON) |
|---|---|---|
| Bottom tabs | Dashboard / Routines / Parenting Hub SKU | Home / Today's plan / Beside you / Rooms |
| `/assistant` | Companion only with `?companion=1`; else mode desk + Zap | Living ON → companion chrome default |
| Grow leave shell | Unlock with Premium / Unlock All Learning | `PREMIUM_VOICE` continuity + leave exits |
| LockedBlock mall | Violet Unlock theatre | Continuity CTA portfolio-wide |
| Speech sessions | XP / points / streak shout | Living: presence language; scoring silent |
| Hub launch badges | Explore Free / Premium props compiled | Rooms V1: theatre badges not passed |
| Leave apps | Often module-only back | Calm Today Home + Parent Hub exits |
| RG continuity Today | `href: "/"` | `href: "/dashboard"` |

---

## 6. Files changed

**New**
- `artifacts/kidschedule/src/components/amy-nest-leave-continuity.tsx`
- `artifacts/kidschedule/src/lib/portfolio-nav-labels.ts` (+ test)
- `artifacts/kidschedule/src/lib/speech-coach/living-session.test.ts`
- `docs/v2/AMYNEST_P0_P1_REMEDIATION_IMPLEMENTATION_MAP.md`
- `docs/v2/AMYNEST_P0_P1_REMEDIATION_IMPLEMENTATION_REVIEW.md`

**Modified**
- `mobile-tab-bar.tsx`
- `assistant.tsx`
- `hub-module-page-shell.tsx`
- `locked-block.tsx` (+ quiet test)
- `parenting-hub.tsx` (badge props only)
- `live-speech-coach.tsx`
- `pronunciation-companion.tsx`
- `speech-coach/living-room.ts`
- `routine-generation/living-execution.ts` (+ test)

---

## 7. Visual changes

- Unlock violet shout → calm continuity CTA on leave/learning shell  
- Premium benefits panel → invitation voice (no “Unlock All Learning”)  
- Speech complete: trophy/points optional when living OFF only  
- No new visual planet; reuse card/border/sanctuary patterns  

---

## 8. Navigation changes

- Tab **labels only** (routes identical)  
- Leave continuity links: `/dashboard`, `/parenting-hub` (+ optional continue to module open)  
- No new tabs, no Explore more, no dashboard product  

---

## 9. Legacy residue removed (ACTIVE USER-FACING only)

| Residue | Classification | Action |
|---|---|---|
| Unlock with Premium (shell/locked) | ACTIVE | Softened to PREMIUM_VOICE |
| Explore Free badges (rooms V1) | ACTIVE props | Not passed when rooms ON |
| Speech XP/points UI (living ON) | ACTIVE | Hidden/renamed |
| Dual living flags | ROLLBACK PATH | **Preserved** |
| Health XP legacy branch | LEGACY BUT REACHABLE via flag OFF | Untouched (rollback) |
| Hub peer catalogues | ACTIVE IA | **STOP** — not remanufactured |

---

## 10. Flag behaviour

| Flag | Behaviour |
|---|---|
| Living / Rooms / Today defaults ON | Continuity chrome applied |
| `=0` | Legacy SKU labels / XP theatre / Explore Free props / non-companion assistant path restored |
| No flags deleted | Dual-universe rollback preserved |

---

## 11–15. DB / API / Firebase / RevenueCat / Analytics

| Domain | Change |
|---|---|
| DB | **None** |
| API | **None** |
| Firebase | **None** |
| RevenueCat / entitlements / pricing | **None** — gates still call `openSubscriptionGate` |
| Analytics | **None** — existing gate events retained |

---

## 16. Accessibility

| Change | Status |
|---|---|
| Leave exit targets `min-h-12` | YES |
| Locked/gate CTA `min-h-11` | YES |
| Semantic `nav` + aria-labels on leave exits | YES |
| Dynamic Type / VO device certification | **NOT claimed** — Founder device pass still required |

---

## 17. Performance

No new API waterfalls, polling, or generation work. Leave exits are static links.

---

## 18. Regression tests

```
vitest: portfolio-nav-labels · living-session · living-execution · locked-block.quiet
       · amynest-philosophy · living-entry/result/adapt
→ PASS (45 tests in targeted run)
TypeScript kidschedule → PASS
```

---

## 19. Production build

```
pnpm --filter @workspace/kidschedule run build → PASS
```

---

## 20. Rollback

```bash
# Per-surface living/rooms flags =0 restore prior chrome
VITE_FF_SPEECH_COACH_LIVING_V1=0
VITE_FF_ASK_AMY_LIVING_V1=0
VITE_FF_PARENT_HUB_ROOMS_V1=0
VITE_FF_ROUTINE_LIVING_V1=0
VITE_FF_TODAY_HOME_V1=0
# LockedBlock / HubModulePageShell PREMIUM_VOICE is always-on presentation;
# revert commit to restore Unlock theatre copy if required.
```

---

## 21. Remaining P0/P1 debt

| Debt | Notes |
|---|---|
| P0-1 full XL interior remanufacture | Slice only — neon Speech chassis / Grow leave bodies still foreign materials |
| P0-6 Hub one-room law | Needs Founder Hub remanufacture order |
| P0-7 Crisis path free | Needs business order |
| P0-8 Dual universe kill | Needs production-clear order |
| P0-9 Device a11y cert | Manual Founder |
| P0-10 Production millions | Ops/backend |
| P1 Nutrition tabs / Birth Sky wing / Curiosity / Discovery | Deferred |

---

## 22. Founder score

| Lens | Score | Note |
|---|---|---|
| One-home leave ritual | **4/5** | Exits added; interiors still foreign |
| Unlock theatre removal | **5/5** | Shell + LockedBlock |
| Speech XP silence (living) | **4/5** | Labels silenced; neon chassis remains |
| Ask Amy companion default | **5/5** | Chrome only; quotas untouched |
| Nav places-of-life | **5/5** | Labels only |
| Honesty (no fake IA/engine fixes) | **5/5** | STOP items reported |

**Blind retest (manufacturing judgment):**  
Closer to one home on leave/nav/premium voice. Speech neon chassis and Hub catalogues still prevent a full YES.

**Tired-parent leave without browse loop:** **YES** on touched leave shells (Home/Hub exits; no Explore more).

---

## 23. Implementation commit SHA

| Artifact | SHA |
|---|---|
| Audit baseline | `4893a7690ef57c165ed96981128c8cc34cad7f9a` |
| This remediation |  |

---

## Final STOP

P0/P1 **SELECT** experience-layer remediation is complete for Founder review.

**Do not run Final Apple Audit.**  
**Do not start another module manufacturing phase.**  
**Do not thaw engines.**  

Wait for Founder review on remaining STOP items (P0-6/7/8/10 and XL interiors).
