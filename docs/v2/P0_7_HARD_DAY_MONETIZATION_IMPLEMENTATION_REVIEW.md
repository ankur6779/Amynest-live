# P0-7 — Hard-Day Monetization Implementation Review

**Status:** IMPLEMENTED — awaiting Founder review  
**Policy:** `docs/v2/P0_7_HARD_DAY_MONETIZATION_POLICY.md`  
**Authority:** Founder Decision Lock — P0-7 (D1–D8)

---

## 1. Policy reference

Source of truth: `docs/v2/P0_7_HARD_DAY_MONETIZATION_POLICY.md`

Core law implemented:

> Help first. Continuity next. Never monetize distress.

Meaningful First Help Outcome (MFHO) before Paywall / Upgrade / Unlock / Premium interruption.

---

## 2. D1–D8 implementation mapping

| ID | Locked choice | Implementation |
|---|---|---|
| **D1** | YES | Hard-Day Law treated as binding; experience gates ordered help → continuity |
| **D2** | both | Raised `hub_emotional` free floor to **4** + `SubItemGate` always passthrough for `hub_emotional` |
| **D3** | soft-continue message only | Ask Amy 402 + limit UI: soft message only; **no** auto-paywall; **no** Upgrade/Zap CTA |
| **D4** | Experience-only | AI quotas unchanged (`aiQueriesPerDay=10`, `infantAiQueriesPerDay=3`); no RevenueCat / entitlement schema changes |
| **D5** | Keep + rewrite | Infant floor kept at 3; copy rewritten to continuity voice (no “free baby questions / Upgrade”) |
| **D6** | YES | Hard-day / SubItemGate / Ask Amy limit / Amy Coach locked CTAs use PREMIUM_VOICE / livingGoalLockedCta regardless of living flag |
| **D7** | Hard-day only | PTM season FOMO banner/preview/highlight suppressed on Help/PTM surfaces; season **sort** may remain |
| **D8** | proceed | This implementation |

§14 of the policy document updated to record these locked values.

---

## 3. Previous vs New

| Surface | Previous | New |
|---|---|---|
| Emotional cards | SubItemGate after 2 free → “Premium feature — tap to upgrade” | All 4 cards free + gate bypassed for `hub_emotional` |
| Ask Amy quota exhaust | System Upgrade + Zap (non-companion); auto `amynest:open-paywall` on 402 | Soft-continue message only + leave continuity; no auto-paywall |
| Infant AI exhaust copy | “3 free baby questions. Upgrade…” | “We've shared several baby questions… keep supporting you whenever you're ready.” |
| SubItemGate lock overlay | Unlock theatre badge → paywall only | PREMIUM_VOICE invitation + Continue + **Not now** |
| PTM season | Banner + highlight + “start preparing now” preview | FOMO copy suppressed on hard-day Help path |
| Amy Coach locked goals (living OFF) | “Unlock with Premium” | `livingGoalLockedCta()` continuity voice |
| Speech / meal / health moment copy | “Unlock unlimited…” | Continuity “keep … whenever you're ready” |

---

## 4. Hard-Day flows changed

| Flow | Changed? | Nature |
|---|---|---|
| Ask Amy | YES | Soft-continue presentation |
| Emotional Support | YES | Floor + bypass |
| Speech Coach | YES (copy after value) | Premium moment subtitle voice |
| PTM Prep | YES | FOMO suppress on hard-day Help |
| Infant Care / infant Ask Amy | YES | Copy rewrite (floor kept) |
| Nutrition | YES (copy after value) | Meal plan moment voice |
| Health | YES (copy after value) | Health insight moment voice |
| Amy Coach | YES | Locked CTA voice |
| Guidance | No code path change | Already first-unit freemium; no Unlock theatre found on hard-day entry |
| Routine Generation | No code path change | R5 soft block already compliant |
| Today Home | No code path change | Orient/rest already CORE FREE HELP |
| Parent Hub Help / Care | YES (via Emotional + PTM surfaces) | Leave paths unchanged |

---

## 5. MFHO mapping

| Intent | MFHO now guaranteed by |
|---|---|
| Emotional distress cards | D2 floor=4 + SubItemGate bypass → card → Ask Amy prompt |
| Ask Amy answer (while free remaining) | Unchanged quotas; answers deliver before any continuity message |
| Ask Amy after exhaust | Soft message + leave (not paywall-before-help); prior answers in-session remain |
| Speech free sessions | Unchanged 3-session floor; post-session copy softened |
| PTM prep | Journey-exempt + FOMO removed on path |
| Infant track / first plan / questions | Floors unchanged; sell framing removed |
| Health / Nutrition / Coach first units | Existing free units; post-value voice softened |

---

## 6. Premium boundary mapping

| Moment | Allowed? | Form |
|---|---|---|
| After Emotional MFHO (other hub SubItemGate sections) | YES | Continuity CTA + Not now |
| Ask Amy after daily floor | Continuity **message only** (D3) — no immediate offer/paywall | Soft-continue text + leave |
| Settings / intentional Pricing | YES | Unchanged products |
| Speech / meal / health after value | YES | Continuity moment copy |
| Amy Coach additional goals after free unit | YES | Continuity CTA voice |
| Before Emotional Amy path | **FORBIDDEN** | Removed |
| Auto-paywall on Ask Amy 402 | **FORBIDDEN** | Removed |

---

## 7. Ask Amy

**Files:** `assistant.tsx`, `en.json`, `hard-day-monetization.ts`

- Quotas/business logic **unchanged** (D4)
- 402 → soft system message; **does not** dispatch `amynest:open-paywall`
- Limit banner → soft-continue only (no Upgrade button / Zap)
- Leave continuity shown when `limitReached` (and companion)
- Infant + adult messages use continuity voice (D5/D6)

---

## 8. Emotional Support

**Files:** `lib/parent-hub-journey` `SECTION_LIFETIME_LIMITS.hub_emotional=4`, `sub-item-gate.tsx` bypass

- Highest sensitivity path no longer monetizes distress before help
- No emotion inference added
- No clinical claims
- Cards still route to existing Ask Amy prompts (explicit selection)

---

## 9. Speech

- Free session floor unchanged (3)
- `premium-moment-copy` `speech_complete` subtitle → continuity voice after session value
- Neon chassis **not** remanufactured (out of scope)

---

## 10. PTM

- `shouldShowPtmSeasonFomoOnHardDayPath()` → `false`
- Season banner + tile highlight + season preview suppressed
- `isPtmSeason` sort boost retained (ordering ≠ FOMO sell)

---

## 11. Infant

- Free AI daily floor kept at **3** (D5)
- Exhaust + paywall marketing copy rewritten (`assistant`, `PAYWALL_INFANT_AI`)
- No “upgrade to unlock free baby questions”

---

## 12. Health / Nutrition

- Free floors unchanged
- Post-value moment copy softened (no Unlock theatre)
- No medical/clinical policy invented

---

## 13. Coach / Guidance

- Amy Coach locked goal CTA always `livingGoalLockedCta()` (D6)
- Guidance: no hard-day Unlock residual found requiring change

---

## 14. Routine Generation

- No change — R5 soft block + rest/leave already MFHO-compliant

---

## 15. Parent Hub

- Emotional + PTM Help surfaces remediated
- Hub shells / leave continuity unchanged
- SubItemGate residual Unlock theatre replaced with PREMIUM_VOICE + Not now for non-MFHO sections

---

## 16. Accessibility

| Check | Status |
|---|---|
| Soft-continue `role="status"` + `aria-live="polite"` | Yes |
| SubItemGate Continue / Not now `min-h-11` touch targets | Yes |
| Not now / leave without trap | Yes (Not now → hub; Ask Amy leave continuity) |
| Paywall clarity | Auto-paywall removed on Ask Amy hard-day exhaust |
| Dynamic Type / VO full device cert | Not re-run (P0-9 still open) — semantics improved on touched surfaces |

---

## 17. RevenueCat safety

| Item | Status |
|---|---|
| Plans / products | **Unchanged** |
| Entitlement keys | **Unchanged** |
| Pricing | **Unchanged** |
| Billing | **Unchanged** |

---

## 18. DB / API / Firebase safety

| Item | Status |
|---|---|
| DB schema | **Unchanged** |
| API contracts | **Unchanged** |
| Firebase architecture | **Unchanged** |
| Auth | **Unchanged** |
| Routine engine | **Unchanged** |
| AI / prompt corpus | **Unchanged** |
| Analytics contracts | **Unchanged** |
| Server `FREE_LIMITS` AI quotas | **Unchanged** |
| Client `subscription-defaults` AI quotas | **Unchanged** |

**Note:** `hub_emotional` lifetime free floor `2 → 4` is **client section-usage presentation** (localStorage SubItemGate), explicitly required by D2. It is not a RevenueCat entitlement or AI quota change.

---

## 19. Regression tests

| Suite | Result |
|---|---|
| `hard-day-monetization.test.ts` | PASS |
| `sub-item-gate.hard-day.test.tsx` | PASS |
| `hub-support-utils.test.ts` | PASS |
| `use-section-usage.test.ts` | PASS |
| `amynest-philosophy.test.ts` | PASS |
| `locked-block.quiet.test.tsx` | PASS |
| `amy-coach/living-room.test.ts` | PASS |
| Ask Amy / paywall / parent-hub / feature-usage suites (16 files) | PASS (71 tests) |
| kidschedule `tsc --noEmit` | PASS |
| Production `pnpm run build` | PASS |

---

## 20. Production build

`artifacts/kidschedule` production build completed successfully (`✓ built` + SEO asset generation).

---

## 21. Screenshots

Headless cloud agent environment — **interactive device screenshots not captured** in this run.

Founder / QA should visually confirm on device:

1. Emotional Support — all four cards open without lock overlay  
2. Ask Amy at quota 0 — soft message, no Zap/Upgrade, leave exits present  
3. Infant Ask Amy exhaust — continuity copy (no “3 free baby questions”)  
4. Parent Hub Support during Sep–Nov — no PTM season FOMO banner  
5. Amy Coach locked goal (living OFF) — continuity CTA, not “Unlock with Premium”

---

## 22. Remaining debt

| Item | Notes |
|---|---|
| Speech neon chassis | Separate P0 — not started |
| Parent Hub peer catalogue (P0-6) | Not started |
| Final Apple Audit | Not started |
| P0-9 device a11y certification | Still open |
| Dual living flag deletion (P0-8) | Not started |
| Optional quota tune | Deferred by D4 |
| Intentional Pricing entry after Ask Amy soft-continue | Parent can still open Pricing from Settings / other CTAs; Ask Amy exhaust itself does not offer CTA (D3 message-only) |
| Other i18n locales | EN primary strings updated; other locales may still carry older Upgrade phrasing until translation pass |

---

## 23. Rollback

| Change | Rollback |
|---|---|
| Emotional floor + bypass | Revert `SECTION_LIFETIME_LIMITS.hub_emotional` + SubItemGate MFHO early return |
| Ask Amy soft-continue | Restore prior 402 paywall dispatch + Upgrade button (**not recommended** — violates Hard-Day Law) |
| Infant / paywall copy | Restore previous marketing strings |
| PTM FOMO suppress | Set `shouldShowPtmSeasonFomoOnHardDayPath` to season-gated `true` |
| SubItemGate PREMIUM_VOICE overlay | Restore badge overlay |

**Rollback principle:** Never restore paywall-before-help on Emotional Support or Ask Amy hard-day MFHO paths.

---

## 24. Commit SHA

_Filled after commit:_ see git history for `P0-7` hard-day monetization implementation commit on `cursor/product-execution-model-v2`.

---

## Final Test answers

| Question | Answer |
|---|---|
| Did the parent receive meaningful help before Amy asked them to subscribe? | **YES** on remediated hard-day paths (Emotional always; Ask Amy while floor remains; soft-continue after exhaust without subscribe demand) |
| Does Premium feel like continuation rather than payment for help? | **YES** where Premium still appears (continuity voice / after value) |
| Can the parent safely say Not now? | **YES** — SubItemGate Not now; Ask Amy leave continuity; no trap paywall on exhaust |

---

## STOP

- Speech neon remediation **not** started  
- Parent Hub catalogue remediation **not** started  
- Final Apple Audit **not** run  

Awaiting Founder review.
