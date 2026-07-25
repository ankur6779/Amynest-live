# Birth Sky Ephemeris Daemon

Persistent Python process behind Node `PythonEphemerisAdapter`.

Node is **engine-agnostic**. This daemon owns `EnginePort` implementations.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | Process up + metrics |
| GET | `/readyz` | Engine loaded |
| POST | `/v1/compute` | Chart compute |

Default bind: `127.0.0.1:5099`

## Engine selection

```bash
export ENGINE_PROVIDER=skyfield   # default
export ENGINE_NAME=skyfield-jpl
export ENGINE_VERSION=1.0.0
export KERNEL_NAME=DE440
```

Future: `ENGINE_PROVIDER=swisseph` (same HTTP / Node).

## Setup

```bash
cd artifacts/ephemeris-daemon
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
bash scripts/fetch-jpl-ephemeris.sh
python -m src.server
```

## Houses

**Whole Sign** is production (`houses.system = "whole_sign"` + `planetHouseMap`).

Requires birth time + place (else `houses` / `planetHouseMap` stay `null`).

Roadmap stubs: Placidus, Equal, Porphyry — see `src/house_engine.py` and `docs/birth-sky-ephemeris.md`.
