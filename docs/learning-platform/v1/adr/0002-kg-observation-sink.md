# ADR-0002: Knowledge Graph as observation sink

**Status:** Accepted (Architecture v1.0)  
**Date:** 2026-07-31

## Context

Concept confidence must accumulate across Speech, Story, Reading, Games, Discovery without circular writes.

## Decision

- `toKnowledgeObservations` maps eligible events → observations.
- Host `kgSink` applies observations and may publish `knowledge.updated` with `busOrigin`.
- `knowledge.updated` never maps back to observations.

## Consequences

- KG package stays free of a dependency on learning-events.
- Wiring lives in kidschedule host.
- Recommendations are derived from graph state, not UI.
