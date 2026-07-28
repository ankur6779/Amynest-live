# CLI Reference

## Workflow (Phase 7)

| Command | Description |
|---------|-------------|
| `pnpm amynest:daily-short` | Generate daily Shorts batch |
| `pnpm amynest:generate-one` | Generate one video |
| `pnpm amynest:retry` | Retry failed video unit |
| `pnpm amynest:publish-only` | Publish from checkpoint |
| `pnpm amynest:render-only` | Render from checkpoint |

## Operations (Phase 10)

| Command | Description |
|---------|-------------|
| `pnpm amynest:doctor` | Validate install, config, secrets, health |
| `pnpm amynest:health` | Ready/live/detailed health JSON |
| `pnpm amynest:workflow-status` | List persisted workflow statuses |
| `pnpm amynest:resume` | Resume failed/interrupted workflows |
| `pnpm amynest:backup` | Create backup manifest |
| `pnpm amynest:restore --backup <id>` | Restore a backup |
| `pnpm amynest:logs` | Stream structured JSON logs |
| `pnpm amynest:metrics` | Display runtime metrics |

Shared flags: `--memory`, `--data-dir`, `--backup-dir`, `--workflow`.
