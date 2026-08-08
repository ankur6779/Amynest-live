# Routine Generation R5 — Continuity / Living Presence Founder Review

**Status:** MANUFACTURED — CONTINUITY / LIVING PRESENCE (RE-APPLY)  
**Date:** 2026-08-08  
**Authority:** Founder Order — Routine Generation R5 Continuity Re-Apply  
**Sources of truth (APPROVED):**  
`docs/v2/ROUTINE_GENERATION_DEEP_STUDY.md` · `docs/v2/ROUTINE_GENERATION_R1_EXPERIENCE_BLUEPRINT.md` · `docs/v2/ROUTINE_GENERATION_R2_ENTRY_CONTEXT_FOUNDER_REVIEW.md` · `docs/v2/ROUTINE_GENERATION_R3_RESULT_FOUNDER_REVIEW.md` · `docs/v2/ROUTINE_GENERATION_R4_ADAPTATION_FOUNDER_REVIEW.md`

**R2 Entry + Context:** FROZEN  
**R3 Result Experience:** FROZEN  
**R4 Adaptation / Begin handoff:** FROZEN  
**Engine:** PRODUCTION FROZEN (June 2026) — not thawed

**Baseline HEAD before R5 re-apply:** `9cc4bef2044dabe0576565845ef1c6e6c5977939` (R4 stamp)  
**Implementation Commit SHA:** `7e8e41fdfc095e9946f7fa18da725eefe3980e0f`  
**Docs Commit SHA:** _(filled after docs commit)_

**STOP after R5.** Wait for Founder approval.  
Do **not** begin another Routine Generation phase.  
Do **not** thaw the engine.  
Do **not** run the Final Apple Audit.  
Do **not** redesign Today Home / Welcome / Hub / other manufactured modules.

---

## 1. Recovery context

R5 was implemented in a prior session but **never committed/pushed**.  
The workspace was subsequently re-cloned/reset. Verified before re-apply:

| Fact | Status |
|---|---|
| HEAD | `9cc4bef2` — R4 stamp |
| Working tree | clean |
| `living-execution.ts` | missing |
| R5 Founder Review | missing |
| `RoutineLivingContinuityExits` | missing |
| R5 living presence code | missing |
| Stash / reflog recovery | unavailable |

**Therefore this run re-applied R5 from approved R4 design intent.**  
It does **not** claim prior R5 recovery. No invented prior SHA.

---

## 2. Previous R4 state

R4 (verified/committed) delivered:

- Adjust this day vs Rebuild today's plan
- Begin today → quiet reveal → **Start here** on detail
- Living regen labels (Refresh remaining / Rebuild full)
- Honest FUTURE catalog for unsupported pre-save skip/swap

R4 did **not** manufacture completion / continuity presence. That is R5.

---

## 3. R5 objective

Communicate:

> This routine is not a one-time generated document.  
> It belongs to today's life and can continue with the parent.

Connect naturally with:

1. Today Home  
2. Routine execution  
3. Completion  
4. Future continuity via existing living surfaces  

**Without** creating another dashboard, streaks, XP, coins, or gamification.

---

## 4. What was implemented

| Surface | Change |
|---|---|
| `living-execution.ts` + tests | Presence labels, completion copy, grace skip/miss, continuity exits helpers |
| `routine-living-continuity-exits.tsx` | Calm exits to existing routes only |
| `routine-now-hero.tsx` | Living presence ring (no %), With you now / Coming next / We cared well today |
| `routine-progress-rail.tsx` + `routine-day-arc-strip.tsx` | Soft progress copy; arc aria “Today's gentle rhythm” |
| `routine-celebration.tsx` | Quiet care close — no confetti/points theatre; continuity exits |
| `detail.tsx` | Wire living props; grace skip badges / Let go; past-day rest copy; exits when pending clear |

**Not created:** new history product, dashboard, streaks, XP, coins, new DB/API, new feature flag.

---

## 5. Continuity model

Smallest useful layer around truth the system already knows:

| Truth | Source | R5 use |
|---|---|---|
| Current routine items + status | Existing detail local/server items | Presence ring, timeline grace |
| Adaptation state | Existing `adjusted` / skipReason / R4 Start-here | Preserve; soften language |
| Completion | Existing no-pending → celebration path | Quiet “Today is done / We cared well” |
| Return to life | Existing routes `/`, Hub, Coach, Audio | Continuity exits |
| History product | Not invented | Absent |

---

## 6. Today Home handoff

- Primary exit: **Today Home** (`/`) via continuity exits  
- Today Home itself **not redesigned**  
- No new DB contract for handoff  
- Existing execution position preserved by existing detail state (no invented resume protocol)

---

## 7. Execution handoff

From R4 Begin → detail Start here, R5 softens the living day:

- Hero: presence language instead of % theatre  
- Progress rail / day arc: rhythm, not KPI  
- Past window pending: grace hint + **Let go** (still existing skip status)  
- Auto-skip toasts / reasons: bedtime-room language when living ON  
- Points/badge **earn side-effects retained** silently; toasts gated off when living ON

---

## 8. Completion

Uses **existing** completion path (`noPendingLeft` → celebration overlay).

Living ON:

- Title: **We cared well today**  
- Body: stayed with the day / child — enough  
- No confetti, no points chip, no “Amazing work!” theatre  
- Continuity exits inside celebration + on detail when pending clear  

Living OFF: legacy celebration retained.

No manufactured persistence beyond existing item status save.

---

## 9. Adaptation continuity

- R4 Start-here strip + adapt hint preserved  
- Existing `adjusted` badges remain  
- Auto-skip reasons remapped for display only when living  
- No invented adaptation persistence layer

---

## 10. Exit model

`RoutineLivingContinuityExits` — existing routes only:

| Exit | Route | Purpose |
|---|---|---|
| Today Home | `/` | Return to the heart of the day |
| Parent Hub | `/parenting-hub` | Quiet rooms when needed |
| Beside you | `/amy-coach` | One calm next conversation |
| Quiet listen | `/audio-lessons` | A few soft minutes |

**Avoided:** Browse more · Explore · See all routines · Feature mall · Upsell.

---

## 11. Visual manufacturing

Inside AmyNest house:

- Welcome / Hub glass surfaces (`HUB_GLASS_SURFACE`, routines accent)  
- R2/R3/R4 living voice continuity  
- Calm motion; reduced-motion path in celebration  
- No dashboard chrome, neon, XP, coins, streaks, SaaS analytics cards

---

## 12. Accessibility

| Check | Status |
|---|---|
| Semantic exits `nav` + labels | YES |
| Celebration `role="dialog"` + aria-label | YES |
| Presence ring aria (no %-only meaning when living) | YES |
| 48px+ exit targets (`min-h-12`) | YES |
| Past-task action min height when living path used | YES |
| Reduced motion (celebration) | YES |
| State not animation-only | Text labels for completion / exits / Let go |

Dynamic Type / VoiceOver device sweep: Founder walk (cloud auth-gated).

---

## 13. Performance

| Risk | Result |
|---|---|
| Extra API waterfalls | None |
| Duplicate generation | None |
| Polling | None |
| Heavy animation | Confetti removed on living path |
| Blocking work | None |

R5 is presentation-only over existing status mutations.

---

## 14. DB review

**No schema / migration / row shape changes.**

---

## 15. API review

**No contract changes.** Status save / earn / badges use existing paths.

---

## 16. Analytics review

**No event renames.** Existing complete/skip/view hooks unchanged.  
Points earn still called; living only suppresses toast theatre.

---

## 17. Engine freeze verification

| Frozen surface | Touched? |
|---|---|
| Engine / intelligence / dinner / AI logic | **NO** |
| DB / API contracts | **NO** |
| RevenueCat / Firebase / Analytics contracts | **NO** |
| Auth / Routing / Deep links | **NO** |
| R2 entry / opening | **NO** |
| R3 result WHAT/WHY/WHEN/HOW | **NO** |
| R4 Adjust / Begin / Start-here | **NO** (detail wiring additive only) |
| `generate.tsx` | **NO** |

`git diff --name-only` vs R4 baseline contains only R5 living presentation files + this review.

---

## 18. Regression verification

| Check | Result |
|---|---|
| TypeScript (`kidschedule` after `typecheck:libs`) | **PASS** |
| Unit tests living-entry + result + adapt + execution | **PASS (27)** |
| Production build | **PASS** |
| Engine / frozen-surface diff | Empty |
| R2 / R3 / R4 living helper files | Untouched |
| `generate.tsx` | Untouched |

---

## 19. Feature flag verification

Flag: **`VITE_FF_ROUTINE_LIVING_V1`** (existing; default ON).

| Mode | Behaviour |
|---|---|
| ON / unset | Living presence, quiet completion, continuity exits, grace copy |
| `=0` / other falsy | Legacy % hero, confetti celebration, points/badge toasts, no continuity exits |

No second Routine Generation flag created.

---

## 20. Tests

```
vitest: living-entry + living-result + living-adapt + living-execution
→ 4 files, 27 tests PASS
```

---

## 21. Production build

```
pnpm --filter @workspace/kidschedule run build
→ PASS (vite production + SEO asset generation)
```

---

## 22. Screenshots

Auth-gated captures not taken in this cloud re-apply run.

**Founder walk:**
1. Today routine hero — presence ring (no %)  
2. Complete / Let go past window — grace language  
3. Day clear — quiet celebration + exits to Home/Hub  
4. Flag `VITE_FF_ROUTINE_LIVING_V1=0` — legacy % / confetti / points  

---

## 23. Founder score

| Lens | Score | Note |
|---|---|---|
| Belongs to today's life (not routine-management app) | **5** | Presence + care close |
| After finishing, returns to life/Home | **5** | Continuity exits; no catalogue |
| No gamification theatre | **5** | Points silent; confetti off |
| Adaptation not lost | **5** | R4 preserved |
| Engine freeze | **5** | Experience only |
| Visual calm / house continuity | **4** | Hub materials reused |

**Blind tests:**

1. Hide logo/name → feels like **today's family life** (target met in manufacturing).  
2. After finishing, Amy sends back to life/Home rather than browse-more → **YES**.

---

## 24. Apple readiness

Directionally stronger continuity; **Final Apple Audit not run** per Founder order.

---

## 25. Remaining debt

| Debt | Notes |
|---|---|
| Live device screenshots / VoiceOver sweep | Manual Founder |
| True cross-session “resume exactly here” product | Not invented — needs capability that does not exist as a dedicated contract |
| Feedback → engine memory | FUTURE (engine frozen) |
| Pre-save soft edit/swap | FUTURE (R4 honesty retained) |

---

## 26. Rollback

```bash
VITE_FF_ROUTINE_LIVING_V1=0
```

Restores legacy % ring, confetti/points celebration, skip guilt copy, and removes continuity exits / living grace labels.  
No DB/API rollback required.

---

## 27. Implementation commit SHA

| Artifact | SHA |
|---|---|
| Baseline (R4 stamp) | `9cc4bef2044dabe0576565845ef1c6e6c5977939` |
| R5 implementation | `7e8e41fdfc095e9946f7fa18da725eefe3980e0f` |
| This Founder Review | _(filled after docs commit)_ |

---

## Final STOP

R5 Continuity / Living Presence manufacturing (re-apply) is complete for Founder review.

**Do not start another Routine Generation phase.**  
**Do not thaw the engine.**  
**Do not redesign Today Home.**  
**Do not run the Final Apple Audit.**

Wait for Founder review.
