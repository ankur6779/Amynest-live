# ADR-0001: Event-driven Learning Runtime

**Status:** Accepted (Architecture v1.0)  
**Date:** 2026-07-31

## Context

Multiple product surfaces need shared adaptivity without each owning mastery math.

## Decision

All LP adaptivity for consumers flows: **Learning Events → Learning Runtime → LearningDecision → adapters**.

## Consequences

- Consumers publish evidence; Runtime decides.
- Rule pack is the extension point for adaptivity.
- No per-world difficulty engines for LP decisions.
