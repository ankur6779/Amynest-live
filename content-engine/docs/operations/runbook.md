# Operational Runbook

## Daily

1. Confirm container/timer is healthy
2. Review overnight notifications (publish success / failures)
3. If failure: `pnpm amynest:workflow-status` → `pnpm amynest:resume`

## Weekly

1. `pnpm amynest:backup`
2. Review diagnostics / metrics
3. Confirm learning store and campaign plans are updating

## Incident

1. Capture `pnpm amynest:health` JSON
2. Capture `pnpm amynest:logs`
3. Resume failed workflows
4. If state corrupt: restore latest backup
5. Notify on-call via configured webhook/Telegram

## Change management

1. Deploy with mock providers first if validating infra
2. Switch providers via env vars only
3. Keep `secretValidationMode=strict` in production
