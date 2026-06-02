# Animal World Phase 2 — Migration-Safe Implementation Plan

## Principles

- **Extend, do not rebuild** — `AnimalAudioManager`, quiz, discovery, parent dashboard, favorites, analytics, GCS paths, feature gates (`hub_animal_world`), routes (`/animal-world`), and `animal-world-storage` v1 stats remain unchanged.
- **Additive storage** — new progress lives under `amynest:animal-world:progress:v2`; v1 keys (`amynest:animal-world:stats:v1`, favorites) are still read/written by existing APIs.
- **Catalog backward compatible** — optional `heroRealGcsPath` / `heroCartoonGcsPath`; missing fields fall back to `imageGcsPath` and conventional GCS names (`hero-real.webp`, `hero-cartoon.webp`).

## Folder structure (new / extended)

```
lib/world-engine/                    # NEW — multi-world framework
lib/animal-world/src/
  hear-find-engine.ts                # NEW
  collection.ts                      # NEW
  achievements.ts                    # NEW
  stickers.ts                        # NEW
  parent-insights.ts                 # NEW
  offline-manifest.ts                # NEW
  world-config.ts                    # NEW (Animal World → WorldEngine)
  types.ts                           # EXTENDED modes + progress types
  catalog.ts                         # EXTENDED hero + preload helpers
  quiz-engine.ts                     # EXTENDED discovery phases + category filter

artifacts/kidschedule/src/
  lib/animal-world-progress.ts       # NEW v2 progress
  lib/animal-world-offline-cache.ts  # NEW Cache API + version
  lib/animal-world-audio-manager.ts  # EXTENDED preloadSmart, pool size
  lib/animal-world-audio-warmup.ts   # EXTENDED smart bundles
  lib/animal-world-telemetry.ts      # EXTENDED events
  components/animal-world/
    hear-find-mode.tsx               # NEW
    achievements-panel.tsx           # NEW
    sticker-album.tsx                # NEW
    collection-badge.tsx             # NEW
    parent-insights-charts.tsx       # NEW
    world-motion.tsx                 # NEW
    discovery-mode.tsx               # EXTENDED 2.0 sequence
    animal-detail.tsx                # EXTENDED real/cartoon tabs
    parent-dashboard-panel.tsx       # EXTENDED insights 2.0
    animal-world-experience.tsx      # EXTENDED modes + offline warm
```

## Rollout phases

### Phase A — Ship behind existing gate (now)

1. Deploy lib + web changes; no API route changes required.
2. Upload optional `hero-real.webp` assets per animal when ready (fallback is cartoon `hero.webp`).
3. Monitor client logs for new events: `hear_find_*`, `achievement_unlocked`, `offline_cache_warmed`.

### Phase B — Content scale (when catalog > 50 animals)

1. Bump `animals.json` `version`; offline manifest respects `ANIMAL_WORLD_OFFLINE_CACHE_VERSION`.
2. Run `scripts/upload-animal-world-catalog.mjs` + audio generation as today.
3. Virtualized grid already used in `category-home.tsx`; no grid rewrite needed.

### Phase C — Additional worlds

1. Add catalog package (e.g. `@workspace/vehicle-world`) with same GCS pattern.
2. Instantiate `WorldEngine` with `worldId: "vehicle_world"` and shared UI shell (copy mode components, inject catalog).

## Analytics additions

| Event | When |
|-------|------|
| `hear_find_started` | New Hear & Find round |
| `hear_find_completed` | Answer submitted |
| `hear_find_accuracy` | After attempt (rolling %) |
| `achievement_unlocked` | (reserved — via `mergeUnlockedAchievements`) |
| `sticker_earned` | (reserved — sticker grant hook) |
| `collection_xp` | (reserved) |
| `discovery_session_complete` | Every 6 discovery slides |
| `offline_cache_warmed` | Offline manifest built |

## Data migration

No server migration. Per-child local merge:

1. On first Phase 2 session, `loadAnimalWorldProgress` returns `defaultProgressV2()`.
2. Existing `playCounts` / `soundCounts` continue to drive parent insights and offline prioritization.
3. To backfill mastery from v1 stats (optional script): for each `playCounts` entry, set `animalMastery[id].soundsPlayed = count`.

## Performance targets

- **Smart preload**: `preloadSmart` warms current, adjacent, quiz, and discovery URLs (pool max 24).
- **Offline**: top 50 animals / 200 sounds / 80 images via `buildOfflineManifest`; cache name `animal-world-offline-v2`.
- **Playback**: unchanged `audioManager.playUrl` path; prewarm uses existing global cache.

## QA checklist

- [ ] Explore → detail → sounds, favorites, mute (unchanged)
- [ ] Quiz mode still advances on correct answer
- [ ] Hear & Find: no negative copy; retry on wrong
- [ ] Discovery: speed + category + phase order
- [ ] Parent dashboard: charts + accuracies
- [ ] Stickers / achievements progress bars
- [ ] Real tab falls back to cartoon if `hero-real.webp` missing
- [ ] `hub_animal_world` gate still locks module

## Breaking change risk

**Low** — new modes are additive; `AnimalWorldMode` union extended in TypeScript only. Any external code matching exhaustive mode switches should add new cases.
