# Routine Generation R3 — Result / Living Plan Founder Review

**Status:** MANUFACTURED — WHAT / WHY / WHEN / HOW LIVING RESULT  
**Date:** 2026-08-08  
**Authority:** Founder Order — Routine Generation R3 Generated Result / Living Plan Manufacturing  
**Sources of truth (APPROVED):**  
`docs/v2/ROUTINE_GENERATION_DEEP_STUDY.md` · `docs/v2/ROUTINE_GENERATION_R1_EXPERIENCE_BLUEPRINT.md` · `docs/v2/ROUTINE_GENERATION_R2_ENTRY_CONTEXT_FOUNDER_REVIEW.md`

**R2 Entry + Context:** FROZEN (approved)  
**Engine:** PRODUCTION FROZEN (June 2026) — not thawed

**Implementation Commit SHA:** `80eb1bae4d5d7ef403716d9f21172cea4a3eb4b9`  
**Docs Commit SHA:** `10f672c1bd330797e3706a5b5dd55775d5402c5d`

**STOP after R3.** Wait for Founder approval.  
Do **not** begin R4.  
Do **not** thaw the engine.  
Do **not** modify R2 entry experience beyond the post-handoff result seam.  
Do **not** run the Final Apple Audit.

---

## Absolute law (verified)

| Frozen | Touched in R3? |
|---|---|
| Engine rules / intelligence pipeline / dinner integrity / generation logic | **NO** |
| AI/model logic / deterministic correction | **NO** |
| Existing DB contracts / APIs | **NO** |
| RevenueCat / Firebase / Analytics contracts | **NO** |
| Auth / Routing / Deep links | **NO** |
| R2 entry opening / deltas / Build CTA copy helpers | **NO** (entry preserved; result seam only) |

**Rollback:** `VITE_FF_ROUTINE_LIVING_V1=0` restores legacy auto-save / fixed-review chrome (R2+R3 living face OFF).

---

## Mission result

After **Build today's plan**, the parent no longer vanishes into an auto-save jump (living ON).

They see:

> **Here is the living plan Amy shaped for THIS child, for THIS day.**

Hierarchy: **WHAT → HOW (start here) → WHY → WHEN (progressive arc) → Begin today**.

**Not manufactured in R3:** full execution/completion system (detail already owns post-save), family living result, soft pre-save item edit APIs (FUTURE).

---

## 1. Previous vs New

| | Previous (living OFF / pre-R3) | New (living ON) |
|---|---|---|
| After generate (no fixed) | Auto-save → navigate detail | **Living result preview** → Begin saves |
| After generate (fixed) | Emerald “Routine ready” + adaptations + fixed panel; **no day items** | Living result + day arc + WHY + fixed panel nested |
| First breath | Toast / navigate | “**Here it is.**” + shaped-day title |
| WHAT | Implicit / title on detail | Explicit plan identity + step count |
| WHY | Compact card only on fixed path | Verified proofs + existing adaptations card |
| WHEN | None on generate | Morning / Day / Evening arc (collapsed) |
| HOW | None until detail | **Start here** hero action |
| Primary CTA | (auto) or Save on fixed panel | **Begin today** |
| Rebuild | Regenerate on fixed panel | Confirm gate: **Rebuild today's plan** |
| AI / patent theatre | Legacy loading (flag OFF) | R2 truthful handoff → quiet arrival |

---

## 2. Result Experience

**Surface:** `RoutineLivingResult` on `/routines/generate` after successful generate (living ON).

**Files:**
- `lib/routine-generation/living-result.ts` (+ tests)
- `components/routines/routine-living-result.tsx`
- `components/routines/routine-living-room.css` (R3 extensions)
- `pages/routines/generate.tsx` — `handlePostGenerate` living hold + mount

**Seam:** `handlePostGenerate` sets `livingResultState` instead of immediate `commitGeneratedRoutine` when living ON. Save contract unchanged when parent taps **Begin today**.

---

## 3. WHAT / WHY / WHEN / HOW

| Lens | Parent sees | Source |
|---|---|---|
| **WHAT** | “Today's plan for {child} · {date} · N gentle steps” + engine title | `child.name` · `date` · `items.length` · `routine.title` |
| **HOW** | Hero “Start here” — first pending block time + activity | First non-completed/skipped `items[]` |
| **WHY** | 1–4 verified proofs + compact `RoutineAdaptationsCard` | `adaptations[]` + form context (see §5) |
| **WHEN** | Progressive Morning → Day → Evening arc | `items[].time` grouped faithfully |

Progressive disclosure: arc collapsed by default; hero action always visible.

---

## 4. Routine Arc

| Section | Rule |
|---|---|
| Morning | `time` &lt; 12:00 |
| Day | 12:00–17:00 |
| Evening | ≥ 17:00 |
| Empty sections | Omitted |
| Hierarchy | Hero action ≠ equal list rows; arc quieter until opened |
| Flexibility | **Not invented** — no fake skip/move cues pre-save |

Faithful to existing generated `items[]` — no new backend model.

---

## 5. Personalization Source Mapping

| Visible statement | Actual source | Field / API | Fallback |
|---|---|---|---|
| Adaptation chip text | Engine `adaptations[]` via `buildRevealHighlightChips` | `routine.adaptations` | Omit if empty |
| “Shaped around {child}'s school day” | Form school answer | `hasSchool=true` | Omit if null/false |
| “Softer home rhythm for the weekend” | Weekend + no school | `date` · `hasSchool=false` | Omit otherwise |
| “Paced for a {mood} day” | Parent mood (non-normal) | `mood` | Omit if normal/unset |
| “Kept gently indoors” / “Outdoor time kept gentle” | Weather choice | `weatherOutdoor` | Omit if yes/null |
| “Weekly commitments were honored” | Fixed activities applied | `fixedActivitiesResult.fixedActivitiesApplied` | Omit if false |
| “Held your focus: …” | Profile goals | `child.goals` | Omit if empty |
| WHY fallback line | Generic non-claim copy | — | Only when zero proofs |
| “Built with our trusted daily planner” | Client fallback flag | `routine.fallback` | Omit if false |

**Never shown:** CoT · model names · patent · internal scores · “Perfect for your child” · surveillance “Amy noticed…”.

---

## 6. Generation → Result Transition

1. R2 truthful handoff stages (unchanged)  
2. Generate succeeds → toast **“Here's today's plan”**  
3. Scroll to living result — quiet arrival line **“Here it is.”**  
4. No magic particles · no “AI is thinking” · no patent strip  

Empty result: empty sanctuary copy + Rebuild (no fake success).  
Partial (&lt;4 items): honest shorter-plan note.

---

## 7. Editing / Adaptation

| Capability | R3 treatment |
|---|---|
| Soft skip / complete / delay | **After Begin** on detail (existing) — soft note disclosed |
| Inline item edit | Detail (existing) — not faked pre-save |
| Fixed activities adjust | Existing `FixedActivitiesReviewPanel` nested in result when required |
| Change mood/weather/etc. | “Change today's details” → clears preview, reopens R2 deltas |
| Mid-day auto-rewrite | **FUTURE** |
| Pre-save swap block | **FUTURE** (no API) |

---

## 8. Regeneration

| Action | Behavior |
|---|---|
| **Rebuild today's plan** | Confirm alertdialog → clears preview → existing `handleAiGenerate` |
| Fixed panel Regenerate | Existing `proceedAiGenerate` (also clears living preview) |
| Accidental rebuild | Two-step confirm (“Keep this plan” / “Yes, rebuild”) |
| Override semantics | Preserved from `livingResultState.shouldOverride` / `overrideMode` |

---

## 9. Premium

| Untouched | Presentation |
|---|---|
| Pricing · RC · entitlements · billing · plans | Unchanged |
| Paywall errors | Existing `RoutineGenerationPaywallError` path |
| Unlock / FOMO / countdown | **Absent** |
| Begin CTA | Continuity “Save this plan and start…” — value already visible |

---

## 10. Error / Empty / Recovery

| State | Living treatment |
|---|---|
| Empty items | Empty title/body + Rebuild |
| Partial short plan | Honest count note |
| Fallback routine | Soft trusted-planner note |
| Network / timeout / recovery | Existing R2 recovery card (unchanged) |
| Duplicate submit | Existing `isAiGenerating` + Begin disabled while saving |
| Fixed blocking | Panel + inline blocking (unchanged contracts) |
| App kill mid-generate | Return to entry; no false success |

---

## 11. Visual Manufacturing

| Element | Choice |
|---|---|
| House | Care FE photography + sanctuary materials (same as R2) |
| Signature | Hierarchy + choreography — not neon/sparkle |
| Photo | Care arrival supports emotion; **routine remains hero** |
| Motion | Scroll + collapse only; reduced-motion safe |
| Family mode | Still demoted (R2); classic family preview unchanged |

---

## 12. Accessibility

| Requirement | Status |
|---|---|
| Semantic hierarchy | what / how / why / when sections labeled |
| Screen reader | WHY proofs include source in `sr-only`; rebuild `alertdialog` |
| 48px+ targets | Begin CTA · arc toggle · rebuild confirm · adjust link |
| Focus | Result mounts after handoff; confirm actions keyboardable |
| Contrast | Readability veil on photography |
| Without photography | Text hierarchy remains complete |
| Dynamic Type | Clamp / rem-based type |

---

## 13. Performance

| Concern | Mitigation |
|---|---|
| Extra API waterfalls | **None** — uses in-memory generate result |
| Duplicate generation | Cleared on rebuild only; double-tap guards retained |
| Image | Reuses Care FE asset; `fetchPriority="low"` on result hero |
| Heavy animation | None |
| Polling | None |

Appears as soon as existing engine/adapter returns.

---

## 14. DB Review

**No schema changes. No migrations. No routine row shape changes.**  
Save still `POST /api/routines` via existing `saveGeneratedRoutine`.

---

## 15. API Review

**No contract changes.**  
Generate / generate-ai / check / create / fixed-activity paths unchanged.

---

## 16. Analytics Review

**No event renames.**  
`routine_generated` and related hooks still fire on existing save success path.

---

## 17. Production Safety

| Check | Status |
|---|---|
| Engine unchanged | YES |
| DB / API / RC / Firebase / Analytics / Auth / Routing | YES |
| Feature flag intact | `VITE_FF_ROUTINE_LIVING_V1` |
| Existing routines / users | Unaffected (preview-before-save only when living) |
| Living OFF rollback | Auto-commit + legacy fixed chrome restored |
| R2 entry | Preserved (opening hidden only while result visible) |

---

## 18. Regression Review

| Check | Result |
|---|---|
| TypeScript | PASS |
| Unit tests (`living-result` + `living-entry`) | PASS (15) |
| Production build | PASS |
| Frozen engine path diff | Empty |
| Living OFF | Legacy post-generate behavior |
| Living ON + no fixed | Result → Begin → save → detail |
| Living ON + fixed | Result + fixed panel → save/regenerate |
| Double-submit / rebuild confirm | Guarded |
| Change today's details | Clears preview, reopens deltas |

---

## 19. Screenshots

Live authenticated captures not taken in this cloud run.

**Founder walk — capture:**
1. Arrival “Here it is” + WHAT (`routine-living-result`)  
2. Start-here hero + WHY proofs  
3. Expanded day arc  
4. Rebuild confirm gate  
5. Flag OFF legacy path  

---

## 20. Founder Score

| Lens | Score (1–5) | Note |
|---|---|---|
| Signature clarity (Amy shaped this day) | **5** | Quiet arrival + child/day identity |
| Tired-parent next action (&lt; few seconds) | **5** | Start-here hero |
| Trust / source honesty | **5** | Mapped proofs only |
| Progressive disclosure | **4** | Arc collapsed; adaptations compact |
| Visual house + restraint | **4** | Care FE; no sparkle |
| Engine freeze discipline | **5** | Experience hold only |
| Edit/adapt completeness | **3** | Truthful deferral to detail; pre-save soft edit FUTURE |

**Blind tests**
1. Generic AI routine vs Amy shaped this child's day → **Amy shaped this child's day**  
2. Tired parent understands next action in a few seconds → **YES**

---

## 21. Apple Readiness

| Area | Note |
|---|---|
| Experience direction | Core product face now has living result — still not Final Apple Audit |
| A11y foundations | Present; full device audit deferred |
| Performance | No new network cost on reveal |
| Policy / AI theatre | Removed from living result path |
| Final Apple Audit | **NOT RUN** — Founder order |

---

## 22. Remaining Debt

| Debt | Phase |
|---|---|
| Execution / completion living manufacture | R4+ (detail already strong) |
| Family living result | Later |
| Soft pre-save item edit / swap | FUTURE (needs API) |
| Auto-save-on-Begin without explicit preview | Founder checkpoint (R1 deferred) |
| Live CI screenshots | Manual Founder walk |
| Recovery copy living polish | Later |

---

## 23. Rollback

```bash
VITE_FF_ROUTINE_LIVING_V1=0
```

Restores: R2 OFF + R3 OFF — Generate form, auto-commit after generate, legacy fixed-review banner, AI/patent loading chrome.

No DB/API rollback required.

---

## 24. Commit SHA

| Artifact | SHA |
|---|---|
| R3 implementation | `80eb1bae4d5d7ef403716d9f21172cea4a3eb4b9` |
| This Founder Review | `10f672c1bd330797e3706a5b5dd55775d5402c5d` |

---

## Final STOP

R3 Result / Living Plan manufacturing is complete for Founder review.

**Do not start R4.**  
**Do not thaw the engine.**  
**Do not modify R2.**  
**Do not run the Final Apple Audit.**
