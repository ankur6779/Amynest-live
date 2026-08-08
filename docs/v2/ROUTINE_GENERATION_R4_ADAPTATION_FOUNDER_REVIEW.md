# Routine Generation R4 — Adaptation / Execution Handoff Founder Review

**Status:** MANUFACTURED — ADJUST vs REBUILD + BEGIN → LIVE  
**Date:** 2026-08-08  
**Authority:** Founder Order — Routine Generation R4 Editing / Adaptation / Execution Handoff  
**Sources of truth (APPROVED):**  
`docs/v2/ROUTINE_GENERATION_DEEP_STUDY.md` · `docs/v2/ROUTINE_GENERATION_R1_EXPERIENCE_BLUEPRINT.md` · `docs/v2/ROUTINE_GENERATION_R2_ENTRY_CONTEXT_FOUNDER_REVIEW.md` · `docs/v2/ROUTINE_GENERATION_R3_RESULT_FOUNDER_REVIEW.md`

**R2 Entry + Context:** FROZEN  
**R3 Result Experience:** FROZEN (handoff wiring only in R4)  
**Engine:** PRODUCTION FROZEN (June 2026) — not thawed

**Implementation Commit SHA:** `7e8d6c559e21dab72cbea42795cb688c7f56bf5c`  
**Docs Commit SHA:** `a3ecabca47dc0cfedead6a3113b096bc85849650`

**STOP after R4.** Wait for Founder approval.  
Do **not** begin R5.  
Do **not** thaw the engine.  
Do **not** modify R2.  
Do **not** run the Final Apple Audit.

---

## Absolute law (verified)

| Frozen | Touched in R4? |
|---|---|
| Engine / intelligence / dinner / AI logic | **NO** |
| DB / API contracts | **NO** |
| RevenueCat / Firebase / Analytics contracts | **NO** |
| Auth / Routing / Deep links | **NO** |
| R2 entry opening / deltas / Build CTA | **NO** |
| R3 result WHAT/WHY/WHEN/HOW core | **Minimal** — Adjust band + handoff note only |

**Rollback:** `VITE_FF_ROUTINE_LIVING_V1=0` restores legacy regenerate labels, sparkle reveal, and removes living Adjust band / detail continuity.

---

## Mission result

R3 said: **“Here it is.”**  
R4 answers: **“Now I can make this fit our real day — without rebuilding everything.”**

- **Adjust this day** = small corrections (details → optional rebuild; post-Begin skip/delay/edit)  
- **Rebuild today's plan** = confirm-gated full regenerate  
- **Begin today** = save → quiet reveal → **Start here** on detail  

No faked pre-save skip/swap. No configuration wizard return as the primary path.

---

## 1. Previous vs New

| | Previous (R3) | New (R4 living ON) |
|---|---|---|
| Secondary actions | Soft note + Rebuild + external “Change details” | **Adjust this day** band (details + post-Begin honesty + fixed commitments) |
| Edit vs Rebuild | Implied | **Explicit separation** + demoted rebuild zone |
| Begin handoff | Save → reveal overlay (“Amy is crafting…”) | Quiet **“Bringing {child}'s plan…”** → **Here it is** |
| Detail first breath | NowHero / timeline | + **Start here** continuity strip + adapt hint |
| Regen menu | “Regenerate rest / full” | **Refresh remaining day** / **Rebuild full day** |
| Pre-save skip/swap | Absent (honest) | Still **FUTURE** — not faked |

---

## 2. Edit Model

| Principle | R4 application |
|---|---|
| No config form return as primary | Adjust opens R2 deltas only when parent chooses |
| Small meaningful actions | Change details · Begin · Refresh remaining · Skip/delay/edit (detail) |
| No CRUD / calendar config | Absent |
| Living = real capabilities | Catalog in `LIVING_ADAPT_CAPABILITIES` |

---

## 3. Adaptation Model

| User action | Existing capability | Path | Result |
|---|---|---|---|
| Change today's details | Reopen generate deltas | Client form state | Parent can rebuild with new mood/weather/etc. |
| Rebuild today's plan | Full generate (confirm) | generate-ai / generate client | New plan preview |
| Begin today | Create routine | `POST /api/routines` → detail `?reveal=1` | Plan becomes executable |
| Fixed commitments | FixedActivitiesReviewPanel | Regenerate / Save | Weekly blocks honored |
| Skip / complete / delay | Detail item status | `PATCH …/items` | Day moves without full rebuild |
| Inline edit | Detail pencil | `PATCH …/items` (`customized=true`) | Soft correction |
| Refresh remaining day | Partial regenerate | `POST …/partial-regenerate` | Finished kept; rest reshaped |
| Rebuild full day (detail) | Navigate generate override | Existing generate entry | Full replace path |
| Feedback | Write-only signals | `POST /api/routine-feedback` | Stored; **does not steer engine today** |

---

## 4. Edit vs Rebuild

| | Adjust / Edit | Rebuild |
|---|---|---|
| Intent | Fit this plan to the real day | Replace with a substantially different plan |
| Result UI | Adjust band | Demoted rebuild zone + confirm |
| Detail UI | Skip / delay / edit / Refresh remaining | Rebuild full day → generate override |
| Destructive? | No (or local item change) | Yes — confirmation required on result |

---

## 5. Skip / Swap

| Interaction | Status |
|---|---|
| Skip / complete / delay after Begin | **PRESENT** on detail (existing) |
| Swap activity pre-save | **FUTURE** — no routine id / PATCH |
| Swap activity post-save | Soft edit activity text **PRESENT**; structured “swap catalog” **FUTURE** |
| What changed / next | Detail status toasts + Start here / NowHero (existing + R4 continuity) |

---

## 6. Supported Capabilities (PRESENT)

See `LIVING_ADAPT_CAPABILITIES` (`status: "present"`) in `living-result.ts`:

- Begin save + execution handoff  
- Change today's details  
- Rebuild (confirm)  
- Fixed review nest  
- Skip / complete / delay  
- Inline edit  
- Partial regen  
- Feedback write-only  

---

## 7. Unsupported / Future Capabilities

| Capability | Why FUTURE |
|---|---|
| Pre-save skip / swap / soft edit blocks | Needs persisted routine id |
| Feedback → next generate influence | Explicitly write-only today |
| Mid-day auto-rewrite from result screen | Adaptive engine is detail-only |
| Family living adapt | Out of scope |
| Partial-regen for &lt;36 months | Server 422 by design |
| Invented “Amy noticed…” continuity | No verified signal source |

---

## 8. Execution Handoff

```
Living result (R3/R4)
  → Begin today
  → commitGeneratedRoutine / saveGeneratedRoutine
  → /routines/:id?reveal=1
  → RoutineRevealOverlay (quiet living copy)
  → Detail Start here continuity + NowHero + existing execution
```

Contracts preserved. Result is not a dead-end.

---

## 9. Completion Continuity

| Existing | R4 treatment |
|---|---|
| Item complete / skip / delay | Unchanged execution; living copy points parent there |
| `routine_feedback` | Present, write-only — not claimed as memory shaping |
| Daily signals (routines index) | Unchanged — not invented on result |
| Home Begin / NRT | Unchanged |
| Desired “remember this felt heavy” from feedback → generate | **FUTURE** |

---

## 10. Premium

No pricing / RC / entitlement / plan changes.  
No unlock theatre / FOMO / AI upgrade language.  
Begin remains value-first after the plan is visible.

---

## 11. Visual Manufacturing

Same AmyNest house (Care FE / sanctuary / Quicksand).  
Adjust band = calm glass nest; Rebuild visually demoted.  
Detail continuity = glass strip, not settings chrome.

---

## 12. Motion

| Motion | Use |
|---|---|
| Reveal craft → arrival | Shortened living timing; reduced-motion skips craft |
| Status changes | Existing detail transitions |
| Forbidden | Confetti / XP / neon / AI sparkle on living reveal |

---

## 13. Accessibility

| Requirement | Status |
|---|---|
| Adjust band semantics | `aria-labelledby` |
| Rebuild confirm | `role="alertdialog"` |
| Reveal | `aria-live="polite"` |
| Detail continuity | `aria-live="polite"` Start here |
| 48px+ targets | Adjust details / Begin / regen trigger `min-h-11` |
| Reduced motion | Reveal craft skipped when preferred |
| Change not animation-only | Text labels for Adjust / Rebuild / Start here |

---

## 14. Performance

No new API waterfalls, polling, or duplicate generates.  
Rebuild / Begin retain existing double-submit guards.  
Reveal craft shorter on living path.

---

## 15. DB Review

**No schema / migration / row shape changes.**

---

## 16. API Review

**No contract changes.** All actions use existing endpoints.

---

## 17. Analytics Review

**No event renames.** Existing complete/skip/generate/save hooks unchanged.

---

## 18. Production Safety

| Check | Status |
|---|---|
| Engine unchanged | YES |
| R2 unchanged | YES |
| R3 core preserved | YES (Adjust band additive) |
| DB / API / RC / Firebase / Analytics / Auth / Routing | YES |
| Feature flag | `VITE_FF_ROUTINE_LIVING_V1` |
| Existing routines / users | Intact |
| Rollback | Flag `=0` |

---

## 19. Regression Review

| Check | Result |
|---|---|
| TypeScript | PASS |
| Unit tests (living-entry + result + adapt) | PASS (21) |
| Production build | PASS |
| Frozen engine diff | Empty |
| Living OFF | Legacy reveal + regenerate labels |
| Begin → detail | Continuity strip + execution |
| Rebuild confirm | Still two-step |
| Pre-save skip | Not exposed (honest) |

---

## 20. Screenshots

Auth-gated captures not taken in this cloud run.

**Founder walk:**
1. Result Adjust band + Begin + demoted Rebuild  
2. Begin → quiet reveal → Start here on detail  
3. Adjust day menu: Refresh remaining vs Rebuild full  
4. Flag OFF legacy path  

---

## 21. Founder Score

| Lens | Score | Note |
|---|---|---|
| Fit real day without rebuild | **5** | Adjust band + post-Begin honesty |
| Configure everything again? | **5** | NO — deltas only on demand |
| Start now? | **5** | Begin → Start here |
| Honesty (no faked skip) | **5** | FUTURE catalog explicit |
| Visual calm | **4** | House continuity |
| Engine freeze | **5** | Experience only |

**Tired-parent tests:** Can I make this fit? **YES.** Configure again? **NO.** Start now? **YES.**

---

## 22. Apple Readiness

Directionally stronger handoff; **Final Apple Audit not run** per Founder order.

---

## 23. Remaining Debt

| Debt | Phase |
|---|---|
| Pre-save soft edit / swap | FUTURE |
| Feedback → engine memory | FUTURE |
| Family living adapt | Later |
| Completion living manufacture (R5?) | Later |
| Live screenshots in CI | Manual |

---

## 24. Rollback

```bash
VITE_FF_ROUTINE_LIVING_V1=0
```

Restores legacy reveal sparkle/crafting copy, “Regenerate” menu labels, and removes living Adjust band / detail continuity. No DB/API rollback.

---

## 25. Commit SHA

| Artifact | SHA |
|---|---|
| R4 implementation | `7e8d6c559e21dab72cbea42795cb688c7f56bf5c` |
| This Founder Review | `a3ecabca47dc0cfedead6a3113b096bc85849650` |

---

## Final STOP

R4 Adaptation / Execution Handoff manufacturing is complete for Founder review.

**Do not start R5.**  
**Do not thaw the engine.**  
**Do not modify R2.**  
**Do not run the Final Apple Audit.**
