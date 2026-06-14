# Routine Engine v1.0 — Certified Architecture

**Status:** Frozen  
**Certification date:** June 2026  
**Decision:** Approved for production · timing logic change-freeze active

---

## What is certified

The AmyNest **rule-based + intelligence pipeline** routine generator produces age- and country-aware daily schedules with enforced dinner-to-sleep health gaps and localized meal/sleep windows.

### Health guarantees (frozen)

| Age band | Minimum dinner-end → bedtime gap |
|----------|----------------------------------|
| Toddlers (< 48 mo) | 60 minutes |
| Children (48–155 mo) | 90 minutes |
| Teens (≥ 156 mo) | 120 minutes |

Enforced in `routine-meal-dinner-integrity.ts` via `getMinimumDinnerSleepGap()` and `repairDinnerAnchor()`.

### Profile geometry (frozen June 2026)

| Country | Tuned field | Value |
|---------|-------------|-------|
| India | `sleepWindow` | 9:30 PM – 10:30 PM |
| UAE | `sleepWindow` | 9:30 PM – 11:00 PM |
| USA | `dinnerWindow` | 5:30 PM – 7:30 PM |

### Production path

```
resolveRoutineGenerationInputs()
  → generateRuleBasedRoutine()
  → runIntelligencePipelineOnItems() / runRoutineIntelligencePipeline()
  → repairDinnerAnchor() (final dinner integrity)
```

Entry: `artifacts/api-server/src/routes/routines.ts`

---

## Certification results

| Metric | Result |
|--------|--------|
| Scenario matrix | 54 (6 countries × 3 ages × 3 day types) |
| FAIL | 0 |
| Health regressions | 0 |
| Status regressions | 0 |
| School-age weekday PASS | 6/6 countries |
| Overall PASS rate | 83.3% (9 accepted warnings) |

### Accepted warnings (non-blocking)

1. **India teen** — dinner may start slightly before 8:00 PM window floor (120 min gap geometry).
2. **UAE teen** — same pattern.
3. **USA toddler** — dinner end may exceed 7:30 PM window cap on some paths.

Tracked as **optional profile tuning** (Phase 2), not engine defects.

---

## Change policy

### Frozen — do not modify without recertification

- Timing logic (gap enforcement, dinner repair, sleep/meal anchors)
- `routine-country-profile.ts` geometry
- Core generation: input validation, templates, intelligence pipeline

See [ROUTINE_ENGINE_FROZEN_FILES.md](./ROUTINE_ENGINE_FROZEN_FILES.md).

### Future changes allowed when

- New country launch (profile addition + certification)
- Pediatric guideline update (documented source + gap rule review)
- Major personalization redesign (architecture review)
- Verified production issue (reproducible, user-impacting)
- Explicit architecture review approval

### Continue evolving independently (not frozen)

- Amy Coach, Speech Coach, Gaming Hub
- Premium / Family Plan / subscription gates
- Analytics, parent feedback, retention features
- Kidschedule **display** layer (`routine-timeline-ui.ts`, etc.)
- API routes that do not alter schedule timing

---

## CI & developer workflow

| Command | Purpose |
|---------|---------|
| `pnpm run check:routine-engine-freeze` | Block PRs that touch frozen files without approval |
| `pnpm run check:routine-engine-certification` | Run certification test suite |

**Thaw PRs:** set `ROUTINE_ENGINE_CHANGE=true` in workflow or add label `routine-engine-change`.

---

## Version history

| Version | Date | Notes |
|---------|------|-------|
| **v1.0 Certified** | June 2026 | Age-aware dinner gap · IN/AE/US profile tuning · production freeze |
