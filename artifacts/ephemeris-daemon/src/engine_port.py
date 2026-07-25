"""
EnginePort — astronomy implementation boundary inside the Python daemon.

Node talks HTTP only and never imports a concrete engine.
Swap SkyfieldEngine → SwissEphemerisEngine / MockEngine via EngineFactory.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ComputeInput:
    birth_date: str
    birth_time: str | None
    time_precision: str  # exact | approximate | unknown
    lat: float | None
    lon: float | None
    timezone_offset_minutes: int | None = None


@dataclass
class ComputeResult:
    mode: str  # full | day_sky
    engine_version: str
    astronomy: dict[str, Any]


@dataclass
class EngineHealth:
    ready: bool
    engine: str
    engine_version: str
    kernel: str
    loaded: bool
    uptime_seconds: float = 0.0
    charts_computed: int = 0
    average_latency_ms: float | None = None
    memory_mb: float | None = None
    kernel_fingerprint: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "ready": self.ready,
            "engine": self.engine,
            "engineVersion": self.engine_version,
            "engineVersionFull": f"{self.engine}/{self.engine_version}",
            "kernel": self.kernel,
            "kernelFingerprint": self.kernel_fingerprint,
            "loaded": self.loaded,
            "uptimeSeconds": round(self.uptime_seconds, 1),
            "chartsComputed": self.charts_computed,
            "averageLatencyMs": self.average_latency_ms,
            "memoryMB": self.memory_mb,
        }
        out.update(self.extra)
        return out


class EnginePort(Protocol):
    """Drop-in astronomy engine contract."""

    def engine_name(self) -> str:
        """Opaque name segment, e.g. skyfield-jpl or swisseph."""
        ...

    def engine_version(self) -> str:
        """Semver-like segment, e.g. 1.0.0 (not including name)."""
        ...

    def full_engine_version(self) -> str:
        """name/version for snapshot tagging."""
        ...

    def kernel_name(self) -> str:
        """Display kernel label, e.g. DE440."""
        ...

    def calculation_source(self) -> str:
        """Human label for metadata.calculationSource."""
        ...

    def quality(self) -> str:
        """high | medium | legacy."""
        ...

    def ready(self) -> bool:
        ...

    def load(self) -> None:
        ...

    def health(self) -> EngineHealth:
        ...

    def compute_chart(self, inp: ComputeInput) -> ComputeResult:
        ...


class EphemerisLoadError(RuntimeError):
    pass
