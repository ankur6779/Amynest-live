# Recovery Guide

## What recovery covers

- Process crash / container restart
- Power failure
- Transient network failure
- Provider failure after partial progress

## How it works

1. Workflow state is persisted under `dataDirectory/workflows`
2. Checkpoints mark completed phases (`ContentGenerated` → `Published`)
3. `pnpm amynest:resume` prepares recoverable workflows and resumes from the latest checkpoint
4. Completed publish artifacts prevent duplicate uploads
5. Completed phases are never regenerated

## Commands

```bash
pnpm amynest:workflow-status
pnpm amynest:resume
pnpm amynest:resume --workflow <workflowId>
pnpm amynest:backup
pnpm amynest:restore --backup <backupId>
```

## Backup contents

- Workflow state
- Learning store
- Analytics reports
- Campaign plans
- Publishing history
