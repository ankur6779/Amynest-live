# Amy Sound World — Progress Integrity Migration Notes

**Date:** 2026-07-31  
**Scope:** Trust / data integrity only. No UX redesign. No API contract changes.

## What changed

1. **Hub “Today’s adventure”** is no longer a hardcoded `vehicle_world` stub with empty items.
   - Tasks are generated from all **live** Discovery Worlds that have catalog content (3–5 tasks).
   - Progress is stored and computed from real play events.

2. **Progress math centralized**
   - Shared streak helper: `@workspace/world-engine` → `computePlayStreak` / `applyPlayStreak`.
   - Animal World session streak and platform world streak both use this helper.
   - Optional cloud sync port: `setDiscoveryProgressSyncPort()` (no-op until wired).

3. **Animal → platform adapter**
   - Favorites, `totalSessionMs`, `streakDays`, and `lastPlayedDate` now flow into hub stats.
   - Legacy favorites key is merged when present.

4. **Cleanup**
   - Removed orphan `discovery-world-preview` page and unused `DiscoveryWorldPreviewRoute`.
   - All five worlds remain `status: "live"`.

## Storage keys (backward compatible)

| Key | Status |
|-----|--------|
| `amynest:animal-world:progress:v2` | Unchanged |
| `amynest:animal-world:stats:v1` | Unchanged (same fields) |
| `amynest:animal-world:favorites:v1:{childId}` | Still read for legacy merge |
| `amynest:discovery-worlds:progress:v2:{worldId}:{childId}` | Unchanged JSON shape (`WorldProgressV2`) |
| `amynest:discovery-worlds:daily:v1:{worldId}:{childId}` | Unchanged per-world daily |
| `amynest:discovery-worlds:stats:v1:{worldId}:{childId}` | Unchanged |
| `amynest:discovery-worlds:hub-daily:v1:{childId}` | **New** hub adventure (additive) |

Existing localStorage payloads continue to load via `{ ...defaults, ...parsed }`. No migration rewrite required.

## Cloud sync readiness

```ts
import { setDiscoveryProgressSyncPort } from "@/lib/discovery-worlds-progress-sync";

setDiscoveryProgressSyncPort({
  pushWorldProgress: async (worldId, childId, progress) => { /* POST */ },
  pullWorldProgress: async (worldId, childId) => { /* GET or null */ },
  pushHubDaily: async (childId, progress) => { /* POST */ },
  pullHubDaily: async (childId) => { /* GET or null */ },
});
```

LocalStorage remains source of truth. Push is fire-and-forget and never blocks play.

## Behavioral notes

- Hub adventure completion updates when kids play **any** world (including Animal World).
- Per-world daily adventure cards are unchanged; they additionally mirror events into the hub adventure.
- Hub parent insights (streak, session minutes, favorites) now include Animal World session stats.

## Rollback

1. Delete `amynest:discovery-worlds:hub-daily:v1:*` keys (optional; harmless if left).
2. Revert the kidschedule + world-engine commits.
3. No server/API rollback needed.

## Verification

```bash
pnpm --filter @workspace/world-engine test
pnpm --filter @workspace/kidschedule exec vitest run \
  src/lib/discovery-worlds-progress.integrity.test.ts \
  src/lib/discovery-worlds-hub-daily.test.ts
```
