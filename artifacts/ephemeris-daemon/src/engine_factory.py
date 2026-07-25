"""
EngineFactory — configuration-driven EnginePort selection.

ENGINE_PROVIDER=skyfield → SkyfieldEngine
ENGINE_PROVIDER=swisseph → (future) SwissEphemerisEngine
ENGINE_PROVIDER=mock → MockEngine
"""

from __future__ import annotations

from .engine_config import engine_provider
from .engine_port import EnginePort, EphemerisLoadError
from .mock_engine import MockEngine


def create_engine(provider: str | None = None) -> EnginePort:
    p = (provider or engine_provider()).lower()
    if p in ("skyfield", "skyfield-jpl", "jpl"):
        from .skyfield_engine import SkyfieldEngine

        return SkyfieldEngine()
    if p in ("mock", "test"):
        return MockEngine()
    if p in ("swisseph", "swiss", "swiss-ephemeris"):
        raise EphemerisLoadError(
            "ENGINE_PROVIDER=swisseph is not implemented yet. "
            "Add SwissEphemerisEngine and bind it here — Node/HTTP unchanged."
        )
    raise EphemerisLoadError(f"Unknown ENGINE_PROVIDER={p!r}")
