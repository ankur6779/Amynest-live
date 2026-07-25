"""MockEngine — deterministic fixtures for daemon tests (no BSP)."""

from __future__ import annotations

import time
from typing import Any

from .engine_config import engine_name, engine_version, full_engine_version
from .engine_port import (
    ComputeInput,
    ComputeResult,
    EngineHealth,
    EphemerisLoadError,
)
from .house_engine import DEFAULT_HOUSE_SYSTEM, houses_payload_and_map

_MOCK_FINGERPRINT = "sha256:mock-kernel-not-for-production"


class MockEngine:
    def __init__(self) -> None:
        self._ready = False
        self._started = time.time()
        self._charts = 0
        self._latencies: list[float] = []
        self._kernel_fingerprint = _MOCK_FINGERPRINT

    def engine_name(self) -> str:
        return engine_name() if engine_name() != "skyfield-jpl" else "mock"

    def engine_version(self) -> str:
        return engine_version()

    def full_engine_version(self) -> str:
        return full_engine_version(self.engine_name(), self.engine_version())

    def kernel_name(self) -> str:
        return "MOCK"

    def calculation_source(self) -> str:
        return "MockEngine"

    def quality(self) -> str:
        return "medium"

    def ready(self) -> bool:
        return self._ready

    def load(self) -> None:
        self._ready = True
        self._started = time.time()

    def health(self) -> EngineHealth:
        avg = (
            sum(self._latencies) / len(self._latencies) if self._latencies else None
        )
        return EngineHealth(
            ready=self._ready,
            engine=self.engine_name(),
            engine_version=self.engine_version(),
            kernel=self.kernel_name(),
            loaded=self._ready,
            uptime_seconds=time.time() - self._started,
            charts_computed=self._charts,
            average_latency_ms=round(avg, 2) if avg is not None else None,
            memory_mb=None,
            kernel_fingerprint=self._kernel_fingerprint,
        )

    def compute_chart(self, inp: ComputeInput) -> ComputeResult:
        if not self._ready:
            raise EphemerisLoadError("ephemeris_not_ready")
        t0 = time.perf_counter()
        mode = "day_sky" if inp.time_precision == "unknown" or not inp.birth_time else "full"
        place_provided = inp.lat is not None and inp.lon is not None
        missing: list[str] = []
        confidence = 1.0
        if not inp.birth_time or inp.time_precision == "unknown":
            missing.append("birthTime")
            confidence -= 0.28
        elif inp.time_precision == "approximate":
            missing.append("exactBirthTime")
            confidence -= 0.08
        if not place_provided:
            missing.append("birthPlace")
            confidence -= 0.12
        confidence = max(0.0, min(1.0, round(confidence, 2)))
        calc_mode = "topocentric" if mode == "full" and place_provided else "geocentric"
        generated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        rising_sign = None
        houses = None
        planet_house_map = None
        # Deterministic mock ascendant at 10° Aries when time+place exist
        asc_lon = 10.0
        if mode == "full" and place_provided:
            rising_sign = "Aries"
            houses, planet_house_map = houses_payload_and_map(
                julian_day=2451545.0,
                latitude=float(inp.lat),
                longitude=float(inp.lon),
                ascendant_longitude=asc_lon,
                planet_longitudes={"sun": 120.0, "moon": 200.0},
                house_system=DEFAULT_HOUSE_SYSTEM,
            )

        astronomy: dict[str, Any] = {
            "bodies": [
                {"id": "sun", "eclipticLongitudeDeg": 120.0, "sign": "Leo"},
                {"id": "moon", "eclipticLongitudeDeg": 200.0, "sign": "Libra"},
            ],
            "sunSign": "Leo",
            "moonSign": "Libra",
            "moonPhase": "first_quarter",
            "moonPhaseLabel": "First Quarter",
            "risingSign": rising_sign,
            "houses": houses,
            "planetHouseMap": planet_house_map,
            "precision": {
                "timePrecision": inp.time_precision,
                "placeProvided": place_provided,
            },
            "engineVersion": self.full_engine_version(),
            "kernel": self.kernel_name(),
            "kernelFingerprint": self._kernel_fingerprint,
            "generatedAt": generated_at,
            "quality": self.quality(),
            "astronomyConfidence": confidence,
            "missingInputs": missing,
            "calculationMode": calc_mode,
            "planetDegrees": {
                "sun": {"eclipticLongitudeDeg": 120.0, "sign": "Leo", "retrograde": False},
                "moon": {"eclipticLongitudeDeg": 200.0, "sign": "Libra", "retrograde": False},
            },
            "retrograde": [],
            "metadata": {
                "calculationSource": self.calculation_source(),
                "kernel": self.kernel_name(),
                "kernelFingerprint": self._kernel_fingerprint,
                "quality": self.quality(),
                "generatedAt": generated_at,
                "precision": "mock",
                "topocentric": calc_mode == "topocentric",
                "bspKernel": "none",
                "astronomyConfidence": confidence,
                "missingInputs": missing,
                "calculationMode": calc_mode,
                "cacheHit": False,
                "houseSystem": houses["system"] if houses else None,
            },
        }
        ms = (time.perf_counter() - t0) * 1000
        astronomy["metadata"]["computeLatencyMs"] = round(ms, 2)
        self._latencies.append(ms)
        if len(self._latencies) > 500:
            self._latencies = self._latencies[-500:]
        self._charts += 1
        return ComputeResult(
            mode=mode,
            engine_version=self.full_engine_version(),
            astronomy=astronomy,
        )
