# ADR-0005: Attention engine is host-local

**Status:** Accepted (Architecture v1.0)  
**Date:** 2026-07-31

## Context

Attention signals are needed by Runtime (break suggestions) and multiple consumers, but there is no standalone `@workspace/attention` package.

## Decision

Keep attention as kidschedule host modules:

- `sound-world-attention-engine.ts`
- `sound-world-attention-store.ts`

Publish snapshots via `attention.state_changed` on the Learning Events bus. Runtime rules (e.g. `attention.suggest_break`) consume flags/snapshots.

## Consequences

- No new core package for v1
- Naming remains discovery-world-oriented (cosmetic debt)
- Attention is heuristic engagement signal, not a clinical model
