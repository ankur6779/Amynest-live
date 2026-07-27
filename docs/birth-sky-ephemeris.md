# Birth Sky Ephemeris Architecture (engine-agnostic)

## Architecture

```
Kidschedule UI
  → Node api-server (public API)
    → EphemerisPort (ResilientEphemerisPort)
      → primary: PythonEphemerisAdapter (retry once)
          → HTTP JSON http://127.0.0.1:5099
            → Python ephemeris-daemon
              → EngineFactory(ENGINE_PROVIDER)
                → SkyfieldEngine | SwissEphemerisEngine (future) | MockEngine
      → fallback: amynest-astro-lite (deterministic Node) when daemon unavailable
  → append-only sky_snapshots (opaque engineVersion)
UI / AI hydrate snapshots — never recompute on read
```

**Rule:** Node never imports or names Skyfield / Swiss / JPL for the primary path. Only the Python daemon selects that engine. The lite adapter is a first-run safety net so Create never hard-fails on daemon blips; lite snapshots remain readable forever.

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

## Vedic Intelligence Foundation

Built on the same Skyfield tropical compute path — **no duplicated planet math**.

| Concern | Module | Notes |
|---------|--------|-------|
| Zodiac mode | `zodiac.py` | `ZODIAC_MODE=tropical\|sidereal_lahiri` (default **sidereal_lahiri**) |
| Lahiri ayanamsa | `zodiac.py` | Chart lon = tropical − ayanamsa |
| Rahu / Ketu | `nodes.py` | Mean node default (`NODE_TYPE=mean`); true node stub |
| Nakshatra | `nakshatra_engine.py` | 27 mansions × 4 padas + Vimshottari lords |
| Moon profile | `chart_service` | sign, house, nakshatra, pada, lord, phase |
| Vimshottari | `dasha_engine.py` | Mahadasha + antardasha + remaining balance at birth |

### Sidereal (Lahiri)

1. Compute tropical longitudes (Skyfield / DE440).
2. Subtract Lahiri ayanamsa for chart longitudes, signs, houses, nakshatras.
3. Moon phase still uses tropical elongation.

### Nodes

- Rahu = mean lunar ascending node; Ketu = Rahu + 180°.
- Both marked retrograde by convention.
- Never estimated when birth data missing for houses; nodes themselves are always computable from JD.

### Dasha

Requires birth **time**. If unavailable → `dasha: null` (never estimated).

### Snapshot compatibility

Legacy snapshots without `rahu` / `nakshatra` / `dasha` / `zodiacMode` hydrate unchanged. New writes include Vedic metadata.

### Future roadmap (non-goals now)

True Node · Yogas · Transits · Horoscope / prediction · Compatibility engines.

## Western Astrology Foundation

Western and Vedic share the same Skyfield + DE440 tropical compute path.

| Concern | Module | Notes |
|---------|--------|-------|
| AstrologyMode | `astrology_mode.py` | `vedic` \| `western` \| `auto` (region) |
| Zodiac defaults | `zodiac.py` | Western→tropical, Vedic→sidereal (unless `ZODIAC_MODE` set) |
| Houses | `house_engine.py` | Whole Sign, Placidus, Equal, Porphyry via `HouseEngineFactory` |
| Angles | `angles.py` | ASC, MC, IC, DC |
| Aspects | `aspect_engine.py` | conj / opp / square / trine / sextile / quincunx |
| Western profile | `western_profile.py` | sun/moon/ASC/MC, element, modality, aspect summary |

### Mode selection

| Env | Default | Behavior |
|-----|---------|----------|
| `ASTROLOGY_MODE` | `auto` | `auto` → region map |
| `ASTROLOGY_REGION` | `IN` | `IN`→vedic, others→western |
| `HOUSE_SYSTEM` | (derived) | Override: `whole_sign` \| `placidus` \| `equal` \| `porphyry` |
| `ZODIAC_MODE` | (derived) | Explicit override of tropical / sidereal_lahiri |

Defaults preserve AmyNest India / Vedic behavior when unset.

### House defaults

- Vedic → Whole Sign  
- Western → Placidus (Porphyry fallback near poles)

### Snapshot compatibility

Legacy rows without `astrologyMode` / `aspects` / `midheaven` / `westernBirthProfile` hydrate unchanged. Vedic fields remain on western charts (coexistence); `westernBirthProfile` is null in Vedic mode.

### Western non-goals (future)

Synastry · Composite · Solar return · Progressions · Horary · Electional · Transit predictions.

## Meaning Engine

See [birth-sky-meaning.md](./birth-sky-meaning.md).

New snapshots attach `astronomy.meaningSnapshot` (`meaning-engine/1.0.0`) after
ephemeris compute — astronomy math unchanged.

## Development Intelligence Engine

See [birth-sky-development.md](./birth-sky-development.md).

`DevelopmentSnapshot` (`development-engine/1.0.0`) is computed at AI assemble time
from MeaningSnapshot + age / goals / routines — astronomy and Meaning Engine
unchanged.

## Adaptive Intelligence Engine

See [birth-sky-adaptive.md](./birth-sky-adaptive.md).

`AdaptiveSnapshot` (`adaptive-engine/1.0.0`) is computed after Development from
anonymized child history — no identifiers, no cross-user learning.

## Conversation Intelligence Engine

See [birth-sky-conversation.md](./birth-sky-conversation.md).

`ConversationPlan` (`conversation-engine/1.0.0`) is computed after Adaptive from
snapshots + user intent — LLM receives structured flow, not free-form planning.

## Explainability / Evidence Engine

See [birth-sky-evidence.md](./birth-sky-evidence.md).

`EvidenceSnapshot` (`evidence-engine/1.0.0`) reconstructs rule traces after
Conversation — omitted from LLM context unless `DEBUG_EXPLAINABILITY=true`.

## AI Evaluation Framework

See [ai-evaluation.md](./ai-evaluation.md).
Production ops: [birth-sky-production-handbook.md](./birth-sky-production-handbook.md).

Quality gates for the intelligence pipeline (min score 90/100) — does not modify
engine behavior. CI: `.github/workflows/ai-evaluation-gates.yml`.

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
