# ADR-0004: Learning Progress Engine dual track

**Status:** Accepted (Architecture v1.1 — adaptive authority resolved)  
**Date:** 2026-07-31  
**Updated:** 2026-07-31

## Context

`@workspace/learning-progress-engine` already owns durable hub progression (XP, unlocks, skill graph, parent dashboards) with its own stewardship architecture. Learning Runtime was introduced for cross-world adaptivity. Early v1 still had LPE `difficulty-engine` / `adaptive-routing` feeding hub “Amy recommends,” creating dual adaptive authority.

## Decision

Keep **two Stable tracks**, with a hard split of responsibility:

1. **LP Runtime track** — **sole adaptive authority** for difficulty, hints, nextActivity, recommendations, reviewQueue (hub + world consumers via `adaptive-authority.ts`)
2. **LPE stewardship track** — XP, unlocks, rewards, wallet, skill graph, daily session, parent dashboards (no product adaptivity)

`composePhase3Status` returns neutral difficulty and empty recommendations. Legacy `difficultyAdjustmentEngine` / `buildAdaptiveRecommendations` remain `@deprecated` for tests/analytics only.

Skill Registry is the LPE skill-graph module, snapshotted into Runtime via `LearningPlatformSnapshotHost`.

## Consequences

- No merge of LPE into Runtime in v1
- Hub chips and world queues project Runtime decisions; catalog filters (SATPIN, premium, age) stay local
- World consumers must not grow new engines
- Dual-credit (`reading` → `phonics`) preserves unlock compatibility
