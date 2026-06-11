# Phonics V3 Server Persistence

## Overview

Phonics V3 progress is **offline-first** with **server-authoritative merge**:

- Local cache (fast reads, offline play)
- Queued writes when offline
- Background sync on reconnect
- Hydrate from server on login / device change / cache clear

## Database Tables

| Table | Content |
|-------|---------|
| `phonics_v3_mastery` | Word/letter/phoneme/family mastery JSON |
| `phonics_v3_fluency` | Streaks, daily snapshots, totals |
| `phonics_v3_story_progress` | Per-story completion + read counts |
| `phonics_v3_missions` | Daily mission tasks |

Migration: `lib/db/migrations/0028_phonics_v3_progress.sql`

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/phonics/v3/progress/:childId` | Fetch all domains |
| POST | `/api/phonics/v3/progress` | Upsert snapshot |
| PATCH | `/api/phonics/v3/progress` | Patch single domain |
| POST | `/api/phonics/v3/progress/sync` | Batch merge sync |

## Merge Rules

- **Mastery:** max dimension counts + union history (never lose history)
- **Fluency:** max totals + merge daily by dateKey
- **Stories:** max readCount / completedAt per story id
- **Missions:** newest dateKey wins; same day → more completed tasks wins

## Client Module

`artifacts/kidschedule/src/lib/phonics-v3/sync.ts`

LocalStorage keys (unchanged for migration):

- `amynest:phonics-v3-mastery:{childId}`
- `amynest:phonics-v3-fluency:{childId}`
- `amynest:phonics-v2-mission:{childId}`
- `amynest:phonics-v3-stories:{childId}`
- `amynest:phonics-v3-sync-queue:{childId}`

## Progress-Loss Scenarios — Resolved

| Scenario | Resolution |
|----------|------------|
| Browser cache clear | Re-hydrate from server on next login |
| New device | GET progress + merge with any local |
| Logout/login | Server bundle restored |
| Profile switch | Per-childId keys + server rows |
| Offline session | Queue → sync on `online` event |
| App reinstall | Server is source of truth after auth |

## Tests

```bash
pnpm --filter @workspace/phonics-v3-progress test
pnpm --filter @workspace/kidschedule exec vitest run src/lib/phonics-v3/sync.test.ts
```
