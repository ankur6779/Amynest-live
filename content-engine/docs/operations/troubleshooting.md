# Troubleshooting Guide

## Bootstrap fails on secrets

Symptom: `Missing required secrets: ...`  
Fix: set the listed env vars, then re-run `pnpm amynest:doctor`.

## Health not ready

Run `pnpm amynest:health` and inspect unhealthy checks:

- `storage` — fix `AMYNEST_DATA_DIR` permissions
- `disk` — free space below `minimumDiskFreeMb`
- `youtube` / `openai` — missing credentials for non-mock providers
- `scheduler` — bootstrap did not initialize scheduler

## Workflow stuck failed

```bash
pnpm amynest:workflow-status
pnpm amynest:resume --workflow <id>
```

## Duplicate uploads

Recovery sets `preventDuplicateUpload` when a unit already has a published artifact. If a provider still creates duplicates, verify idempotency keys in the publishing provider configuration.

## Metrics empty

Metrics aggregate telemetry events. Run at least one workflow (`pnpm amynest:daily-short`) then `pnpm amynest:metrics`.
