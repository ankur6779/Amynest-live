# Birth Sky Ephemeris Architecture (engine-agnostic)

## Architecture

```
Kidschedule UI
  → Node api-server (public API)
    → EphemerisPort (PythonEphemerisAdapter)   ← engine-agnostic
      → HTTP JSON http://127.0.0.1:5099
        → Python ephemeris-daemon
          → EngineFactory(ENGINE_PROVIDER)
            → EnginePort
              → SkyfieldEngine | SwissEphemerisEngine (future) | MockEngine
  → append-only sky_snapshots (opaque engineVersion)
UI / AI hydrate snapshots — never recompute on read
```

**Rule:** Node never imports or names Skyfield / Swiss / JPL. Only the Python daemon selects an engine.

## EngineFactory

| `ENGINE_PROVIDER` | Implementation |
|-------------------|----------------|
| `skyfield` (default) | `SkyfieldEngine` |
| `mock` | `MockEngine` (tests) |
| `swisseph` | reserved — not implemented yet |

Identity env vars:

| Variable | Example | Role |
|----------|---------|------|
| `ENGINE_NAME` | `skyfield-jpl` | Snapshot name segment |
| `ENGINE_VERSION` | `1.0.0` | Snapshot version segment |
| `KERNEL_NAME` | `DE440` | Metadata kernel label |

Generated `engineVersion`: `{ENGINE_NAME}/{ENGINE_VERSION}` → `skyfield-jpl/1.0.0`

## Health

- `GET /healthz` — process up + stats (may be not ready)
- `GET /readyz` — BSP/engine loaded

Example fields: `ready`, `engine`, `engineVersion`, `kernel`, `kernelFingerprint`, `loaded`, `uptimeSeconds`, `chartsComputed`, `averageLatencyMs`, `memoryMB`, `houseEngineRoadmap`.

## AstronomyData quality metadata

New writes include:

- `engineVersion`: e.g. `skyfield-jpl/1.0.0`
- `kernel`: `DE440` / `DE441`
- `kernelFingerprint`: `sha256:…` of the local BSP at load time (P0 — preserves exact kernel identity across DE440 updates / DE441)
- `quality`: `high` | `medium` | `legacy`
- `astronomyConfidence`: `0–1` (lower when birth time/place missing)
- `missingInputs`: e.g. `["birthTime"]`, `["birthPlace"]`, `["exactBirthTime"]`
- `calculationMode`: `topocentric` | `geocentric`
- `metadata.calculationSource`: e.g. `Skyfield`, `SwissEphemeris`, `AmyLite`, `MockEngine`
- `metadata.kernel` / `metadata.kernelFingerprint` (mirrored)
- `metadata.generatedAt`, `precision`, `cacheHit`, `computeLatencyMs`

Legacy `amynest-astro-lite` snapshots remain immutable and hydrate without these fields.

## Engine telemetry

After each chart compute the daemon and api-server emit a JSON log line:

```json
{
  "event": "ephemeris_compute",
  "engine": "skyfield-jpl",
  "kernel": "DE440",
  "latencyMs": 42,
  "cacheHit": true,
  "chartId": "<snapshot-id>",
  "durationMs": 41
}
```

Daemon logs may omit `chartId` unless the client sends `chartId` / `snapshotId` in the compute body. Node logs include `chartId` after persist.

## HouseEngine

Implemented in `artifacts/ephemeris-daemon/src/house_engine.py`.

| System | Status |
|--------|--------|
| `whole_sign` | **Production** (default) |
| `placidus` | Stub / roadmap |
| `equal` | Stub / roadmap |
| `porphyry` | Stub / roadmap |

### Whole Sign algorithm

1. Take Ascendant longitude (requires birth time + place).
2. House 1 = entire Ascendant tropical sign (`floor(asc/30)*30` → `+30°`).
3. Houses 2–12 = next signs in order; each spans exactly 30°.
4. Planet house = `((planet_sign_index - asc_sign_index) mod 12) + 1`.

### AstronomyData fields (new writes)

```json
{
  "houses": {
    "system": "whole_sign",
    "cusps": [
      { "house": 1, "sign": "Leo", "startLongitudeDeg": 120, "endLongitudeDeg": 150 }
    ]
  },
  "planetHouseMap": { "sun": 3, "moon": 11, "mercury": 2 }
}
```

If birth time (or place) is missing: `ascendant`, `houses`, and `planetHouseMap` are `null`. Never estimated.

### Snapshot compatibility

- Historical snapshots with `houses: null` hydrate unchanged (immutable).
- New snapshots may include `houses` + `planetHouseMap`.
- UI / Node EphemerisPort stay engine-agnostic — only Python daemon computes houses.

### Future systems

Drop in a new `HouseEngine` class, register in `_ENGINES`, implement `compute_houses`. Planet interval placement for non–whole-sign systems can extend `houses_payload_and_map` without Node changes.

## Swiss migration steps (future)

1. Implement `SwissEphemerisEngine` conforming to `EnginePort`
2. Register in `EngineFactory` for `ENGINE_PROVIDER=swisseph`
3. Set `ENGINE_NAME=swisseph` `ENGINE_VERSION=1.0.0`
4. Deploy daemon — **no Node / EphemerisPort / UI changes**

## Dev

```bash
pnpm run dev:ephemeris          # ENGINE_PROVIDER=skyfield by default
pnpm run dev:api
# or
pnpm run dev:api:with-ephemeris
```

## Docker

Backend image starts daemon + API via `scripts/start-api-with-ephemeris.sh`.
