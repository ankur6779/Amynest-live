# Reality Validation Engine

Proves that AmyNest recommendations improve real-world family outcomes — not just actions and completions.

## Architecture

```
Recommendation dispatched → User action → Outcome measured (7d window) → Scorecard → Memory confidence → Strategy profile → Self-correction
```

| Layer | Owner |
|-------|--------|
| Core engine | `lib/reality-validation/` |
| Persistence | `intervention_ledger`, `family_strategy_profile`, `family_memory.confidence_score` |
| API | `artifacts/api-server/src/services/realityValidationService.ts` |
| UI | `artifacts/kidschedule/src/components/reality-dashboard/` |

## Schemas

### `intervention_ledger`

Tracks the full chain: recommendation → action → outcome → long-term impact.

- `scorecard`: `success` \| `partial_success` \| `no_impact` \| `negative_impact` \| `pending_validation`
- `baseline_metrics` / `follow_up_metrics` / `metric_deltas`: routine, learning, streak, health
- `confidence_score`, `half_life_days`, experiment fields

### `family_strategy_profile`

Per-family JSON profile:

- Most / least effective interventions
- Response preferences (rewards, coaching, streaks, …)
- Global benchmark percentiles (privacy-safe cohort curves)
- Self-correction suppress rules

### `family_memory` extensions

- `confidence_score`, `sample_size`, `validated_at` — only written after outcome validation

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/reality-validation/dashboard` | Reality dashboard summary |
| `GET /api/reality-validation/strategy-profile` | Family strategy profile |
| `GET /api/reality-validation/analytics` | Chain events + scorecard breakdown |
| `POST /api/reality-validation/amy-evidence` | Amy explains with evidence |
| `POST /api/reality-validation/record` | Log recommendation dispatched |
| `POST /api/reality-validation/:ledgerId/action` | Log user action |

## Migration plan

1. **Phase 0 — Schema** (this PR)
   ```bash
   pnpm db:push
   ```
   Creates `intervention_ledger`, `family_strategy_profile`, extends `family_memory`.

2. **Phase 1 — Shadow mode (week 1–2)**
   - Ledger writes on hub load + notification outcomes
   - No self-correction applied to recommendations yet
   - Monitor `pending_validation` → validated conversion rate

3. **Phase 2 — Validation loop (week 3–4)**
   - 7-day auto-validation on dashboard fetch
   - Validated writes to `family_memory` with confidence
   - Amy evidence answers enabled

4. **Phase 3 — Self-correction (week 5+)**
   - `shouldSuppressInterventionKey()` wired into notification engine + hub ranking
   - Experiments: control vs treatment uplift gates

5. **Phase 4 — Global benchmarks**
   - Replace static cohort curves with aggregated anonymized stats (batch job)

## Rollout strategy

- **Parent Hub**: collapsible "What actually worked" section (Reality Dashboard)
- **Amy chat**: evidence-backed answers for "why" questions
- **Notifications**: bridge attributed outcomes into ledger
- **CI**: `pnpm --filter @workspace/reality-validation test`

## Key integrations

- `notificationOutcomeAttributionService` → `bridgeNotificationOutcome()`
- `amyOperatingService.getHubDashboard()` → dispatches ledger + attaches `realitySummary`
- `memory-system.shouldRepeatIntervention()` → confidence-aware + negative suppression
