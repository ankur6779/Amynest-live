# Phase 2 — Routine P0 Hotfix Mode

**Status:** Certified production-ready (see `production-readiness-gate.md`)  
**Unlocked:** 2026-07-03 — analytics Phase 1 deployed; 72h wait waived for production impact

## Scope (P0 only)

| Priority | Item | Status |
|----------|------|--------|
| 1 | Fix routine generation failures | ✅ Client resilience + server fallbacks preserved |
| 2 | Eliminate routine-related crashes | ✅ Defensive item sanitization |
| 3 | Defensive error handling | ✅ Recovery UI on generate page |
| 4 | Retry/fallback for AI failures | ✅ 8s standard fallback + 429/5xx handling |
| 5 | Routine generation analytics | ✅ `routine_generation_started` / `_failed` |
| 6 | No blank screens | ✅ Emergency backup routine + recovery banner |
| 7 | Prevent crashes on AI/backend failure | ✅ `sanitizeRoutineItems` + `safeSimplifyForHandler` |
| 8 | Graceful fallback routines | ✅ Rule-based + client emergency schedule |
| 9 | Phase 1 analytics intact | ✅ All events via `AnalyticsService` |
| 10 | No Routine Engine redesign | ✅ Frozen engine untouched |

## Changes

### Client (`artifacts/kidschedule/src/lib/`)

| Module | Purpose |
|--------|---------|
| `routine-generation-client.ts` | Hardened AI/standard paths, analytics, emergency fallback |
| `routine-generation-analytics.ts` | Started/succeeded/failed tracking |
| `routine-item-safety.ts` | Sanitize items, safe handler simplify, emergency template |

### UI

| Page | Change |
|------|--------|
| `pages/routines/generate.tsx` | Recovery banner, emergency fallback, safe simplify |
| `pages/routines/detail.tsx` | Sanitized items, resilient next-day generation |

### Taxonomy

- `routine_generation_started`
- `routine_generation_failed`

## Out of scope (later phases)

- Routine Engine timing/geometry changes (frozen)
- Phonics / parenting-hub crash fixes (Phase 4)
- API 500 remediation (Phase 3)
- Full routine funnel optimization

## Verification

```bash
pnpm --filter @workspace/kidschedule exec vitest run \
  src/lib/routine-item-safety.test.ts \
  src/lib/routine-generation-client.test.ts \
  src/lib/analytics-validation-report.test.ts

pnpm --filter @workspace/kidschedule run typecheck
```

## Post-P0

Continue collecting analytics 48–72h before later optimization phases.
