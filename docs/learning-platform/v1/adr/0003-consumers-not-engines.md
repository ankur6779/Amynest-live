# ADR-0003: Product surfaces are consumers, not engines

**Status:** Accepted (Architecture v1.0)  
**Date:** 2026-07-31

## Context

Story, Reading, Games, Speech, and Discovery historically risked owning difficulty / mastery / recommendations.

## Decision

Each surface is a **Learning Platform consumer**:

- Owns presentation (rendering, interactions, physics, narration UI)
- Publishes learning events
- Applies Runtime guidance
- Must not invent parallel adaptivity for LP decisions

Adapters live in kidschedule (`*-learning-adapter.ts`).

## Consequences

- Clear ownership matrix
- Curriculum safety rails (SATPIN, age caps) may still gate content locally
- Local engagement chrome (pets, XP popups, wallet) is allowed if it does not become a recommendation engine
