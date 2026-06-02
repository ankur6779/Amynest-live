# Migration Plan: Animal World → Discovery Worlds Platform

## Non-negotiables

- Do **not** remove or rename `/animal-world`, `hub_animal_world`, or `/api/animal-world-library`.
- Do **not** migrate Animal World localStorage to platform keys until an explicit cutover phase.
- Extract shared code only when a diff produces **zero** change to Animal World user-visible behavior.

## Phase 0 — Done (this increment)

- [x] `@workspace/world-engine` — shared types, modes, hear-find, discovery, rewards, achievements, stickers, offline, registry
- [x] `@workspace/discovery-worlds` — Animal World read-only adapter
- [x] World packages with `manifest.json` stubs (vehicle, nature, home, instrument)
- [x] `/api/worlds-library` for `worlds/*` assets (Animal proxy unchanged)
- [x] `/discovery-worlds` hub + `/worlds/:slug` preview routes (new; Animal route untouched)
- [x] Platform storage/telemetry helpers (`discovery-worlds-progress`, `discovery-worlds-telemetry`)

## Phase 1 — Content upload (ops)

1. Upload MP3/WebP to GCS using paths in each world `manifest.json`.
2. Bump `version` in manifest when catalog changes.
3. Run smoke test: `GET /api/worlds-library/worlds/vehicles/road/car/engine-01.mp3`.

Animal World upload path unchanged (`scripts/upload-animal-world-catalog.mjs`).

## Phase 2 — First non-animal live world (e.g. Vehicle)

1. Copy **new** `VehicleWorldExperience` component tree (do not move Animal files).
2. Wire `VehicleWorldAudioManager` as a thin wrapper over `audioManager` (same as Animal).
3. Use `buildPlatformHearFindQuestion(getAllVehicles())` etc. from world-engine.
4. Set registry status `vehicle_world` → `live`.
5. Add feature gate `hub_vehicle_world` in features API (mirror `hub_animal_world`).

## Phase 3 — Optional Animal World alignment (zero behavior change)

Only additive exports:

- Call `getAnimalWorldPlatformEngine()` from parent hub for “completed worlds” summary.
- Dual-write progress to platform keys (behind flag) for cross-world dashboard.

**Do not** delete `animal-world-progress.ts` until dual-write is verified in production.

## Phase 4 — GCS path unification (optional, long-term)

If `worlds/animals/` is desired:

1. Copy objects `animal-world/` → `worlds/animals/` in GCS.
2. Add dual-path validation in API (serve either prefix).
3. Switch catalog JSON paths in a major version bump.
4. Keep `animal-world-library` route as alias for 2+ releases.

## Phase 5 — Nature relax/sleep modes

Nature registry already includes `relax` and `sleep` in `modesForWorld("nature_world")`. Implement UI only in Nature shell (looping ambient playback, no TTS).

## Verification checklist

- [ ] Animal World: explore, quiz, hear-find, discovery, stickers, parent, favorites, mute
- [ ] Animal analytics events still `animal_world:*`
- [ ] New worlds return 400 on `animal-world/` path via worlds-library (correct separation)
- [ ] Hub lists 5 worlds; Animal opens `/animal-world`
- [ ] Preview worlds log `discovery_worlds:{id}:world_opened`

## Achievement mapping

| Platform ID | World | Animal World equivalent |
|-------------|-------|-------------------------|
| `animal_world_explorer` | animal_world | Animal Explorer |
| `animal_expert` | animal_world | Sound Detective (similar metric) |
| `vehicle_master` | vehicle_world | — |
| `nature_listener` | nature_world | — |
| `home_helper` | home_sounds_world | — |
| `music_explorer` | instrument_world | — |

Animal World keeps its in-package `ANIMAL_WORLD_ACHIEVEMENTS` until parent dashboard reads platform achievements only.
