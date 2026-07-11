# Growth OS v2 — Autonomous Growth Operations

Transforms the **Growth Observatory** into an autonomous operating system. No new dashboards — operations surface inside `/admin/growth/observatory`.

## Architecture

```
Growth Observatory (measurement)
        │
        ▼
growth-os-v2/                    ← autonomous operations layer
  ├── change-detection.ts          Phase 1: yesterday vs 7d vs 30d
  ├── correlation-engine.ts        Phase 2: evidence chains
  ├── priority-scoring.ts          Phase 3: weighted opportunity rank
  ├── regression-intelligence.ts   Phase 4: pre/post app_version
  ├── experiment-decisions.ts      Phase 5: too_early | continue | ship | rollback
  ├── action-queue.ts              Phase 6: founder task list
  ├── weekly-brief.ts              Phase 7: weekly executive review
  ├── knowledge-base.ts            Phase 8: incident/experiment history
  ├── safety.ts                    Phase 9: NOT ENOUGH EVIDENCE gates
  └── alert-bridge.ts              Sync observatory alerts → GOS workflows
        │
        ▼
growth_os_state.payload            Persistent KB + alert workflows
```

## API Endpoints

| Endpoint | Returns |
|----------|---------|
| `GET /api/admin/growth/operations` | Full `GrowthOperationsPayload` |
| `GET /api/admin/growth/weekly-brief` | `{ review, actionQueue }` |
| `GET /api/admin/growth/gos/observatory` | Observatory + daily brief + **operations** |
| `GET /api/admin/growth/gos/operations` | Operations only |

## Scoring Model

**Priority score** (0–100):

```
raw = businessImpact×0.20 + confidence×0.20 + revenue×0.15 + retention×0.15
    + activation×0.15 + technicalRisk×0.05 + userNorm×0.10
priorityScore = raw / effortWeight(S=1, M=1.5, L=2.5)
```

**Change detection thresholds:**
- |change| ≥ 10%
- affected users ≥ 15
- Otherwise: ignored as noise

## Safety

Central `validateEvidence()` — recommendations require verified telemetry, ≥15 users, ≥60% confidence.

When insufficient: **NOT ENOUGH EVIDENCE** — no action queued.
