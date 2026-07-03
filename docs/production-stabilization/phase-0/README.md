# Phase 0 — Production Backup & Inventory

**Status:** Complete (analysis only — no deletions)  
**Date:** 2026-07-03  
**Source of truth:** Production Analytics Audit (2026-07-03)  
**Product Health Score at start:** 41 / 100

## Purpose

Establish a complete baseline before the 13-phase production stabilization program. This phase inventories architecture, dependencies, analytics, APIs, database, and migrations. It identifies orphans, duplicates, and dead code candidates **without deleting anything**.

## Deliverables

| Document | Description |
|----------|-------------|
| [architecture-report.md](./architecture-report.md) | System topology, services, deployment, client shells |
| [dependency-map.md](./dependency-map.md) | Monorepo packages and cross-package dependencies |
| [analytics-map.md](./analytics-map.md) | Event pipelines, tables, gaps, duplicates |
| [api-inventory.md](./api-inventory.md) | ~115 route modules, ~400+ endpoints |
| [database-inventory.md](./database-inventory.md) | 136 tables, schema files, orphan analysis |
| [migration-inventory.md](./migration-inventory.md) | 44 SQL migrations + 7 manual SQL files |
| [verification-report.md](./verification-report.md) | Orphans, duplicate APIs, dead services, unused UI |

## Production baseline (from audit)

| Metric | Current |
|--------|--------:|
| MAU | 148 |
| DAU | 27 |
| D1 retention | 7.0% |
| D7 retention | 2.8% |
| Crash-affected users | 4.05% |
| Analytics coverage | ~22% |
| Registered profiles | 53 |
| Paid ACTIVE (RevenueCat) | 2 |

## Phase 0 rules observed

- No code changes to production paths
- No table drops or migrations
- No feature removals
- No duplicate system creation

## Next phase

**Phase 1 — Analytics Foundation** awaits approval. Scope: unified `screen_view` / navigation / button instrumentation, extend `@workspace/analytics-taxonomy`, fix `growth_analytics` client-log rejection, persist onboarding/subscription funnels to `analytics_events`.

## Approval checkpoint

Confirm Phase 0 inventory is acceptable before proceeding to Phase 1 implementation.
