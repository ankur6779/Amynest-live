# Routine Engine — Frozen File Registry

**Version:** v1.0 Certified (June 2026)  
**Status:** PRODUCTION FROZEN — change-freeze active

## Certification baseline

- 54-scenario production matrix
- 0 FAIL · 0 health regressions · 0 status regressions
- School-age weekday: 6/6 countries PASS
- UK dinner-gap defect resolved
- India / UAE sleep window tuning · USA dinner window tuning
- Age-aware dinner-to-sleep gap enforcement (60 / 90 / 120 min)

**Accepted non-blocking warnings (documented):** India teen dinner geometry · UAE teen dinner geometry · USA toddler dinner edge case

---

## Tier 1 — Timing & profile geometry (DO NOT MODIFY without recertification)

| File | Responsibility |
|------|----------------|
| `artifacts/api-server/src/lib/routine-country-profile.ts` | Country `wakeWindow`, `sleepWindow`, `dinnerWindow`, school ranges |
| `artifacts/api-server/src/lib/routine-meal-dinner-integrity.ts` | `getMinimumDinnerSleepGap`, `repairDinnerAnchor`, `enforceDinnerBeforeBed` |
| `artifacts/api-server/src/lib/routine-input-validation.ts` | `resolveRoutineGenerationInputs` — wake/sleep/school defaults |
| `artifacts/api-server/src/lib/routine-templates.ts` | `generateRuleBasedRoutine`, meal/sleep anchor templates |
| `artifacts/api-server/src/lib/routine-intelligence-pipeline.ts` | `runRoutineIntelligencePipeline` — final timing passes |

## Tier 1 — Generation entry

| File | Responsibility |
|------|----------------|
| `artifacts/api-server/src/routes/routines.ts` | Production routine generation HTTP path |

> Note: There is no `routine-generation.ts`; generation is split across input validation, templates, pipeline, and routes.

## Tier 2 — Core scheduling & validators (frozen per `.cursor/rules/routine-engine-freeze.mdc`)

| File | Responsibility |
|------|----------------|
| `artifacts/api-server/src/lib/routine-scheduler.ts` | Time allocation, `parseTimeToMins`, schedule validation |
| `artifacts/api-server/src/lib/routine-trust-validators.ts` | Trust dinner/bedtime validators |
| `artifacts/api-server/src/lib/routine-meal-integration.ts` | Integrated meal/dinner flow, `defaultDinnerStart` |
| `artifacts/api-server/src/lib/routine-meal-day-type.ts` | Meal structure finalization |
| `artifacts/api-server/src/lib/routine-safety-gate.ts` | Trust / bedtime / dinner safety gate |
| `artifacts/api-server/src/lib/routine-content-integrity.ts` | Content integrity |
| `artifacts/api-server/src/lib/routine-meal-options-safety.ts` | Meal options safety |
| `artifacts/api-server/src/lib/routine-infant-schedule-validation.ts` | Infant schedule validation |
| `artifacts/api-server/src/lib/routine-aqi.ts` | AQI outdoor rules |
| `artifacts/api-server/src/lib/sleepPredict.ts` | Sleep prediction helpers |

## Tier 3 — Certification tests (must pass when Tier 1–2 change)

| File |
|------|
| `artifacts/api-server/src/lib/routine-meal-dinner-integrity.test.ts` |
| `artifacts/api-server/src/lib/routine-country-profile.test.ts` |
| `artifacts/api-server/src/lib/routine-intelligence-pipeline.test.ts` |
| `artifacts/api-server/src/lib/routine-templates.test.ts` |
| `artifacts/api-server/src/lib/routine-scheduler.test.ts` |
| `artifacts/api-server/src/lib/routine-meal-integration.test.ts` |

---

## Changing frozen files

1. Obtain architecture approval.
2. Set `ROUTINE_ENGINE_CHANGE=true` in CI **or** add PR label `routine-engine-change`.
3. Run `pnpm run check:routine-engine-certification`.
4. Document root cause, regression risk, rollback plan.
5. Full recertification before merge.

**Allowed without thaw:** UI display (`kidschedule` timeline), analytics, premium gates, Amy Coach / Speech Coach / Gaming Hub modules — anything **above** the engine that does not alter timing behavior.
