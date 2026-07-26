"""MockEngine — deterministic fixtures for daemon tests (no BSP)."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from .engine_config import engine_name, engine_version, full_engine_version
from .engine_port import (
    ComputeInput,
    ComputeResult,
    EngineHealth,
    EphemerisLoadError,
)
from .house_engine import DEFAULT_HOUSE_SYSTEM, houses_payload_and_map, sign_from_longitude
from .nodes import compute_mean_nodes
from .vedic_enrich import enrich_vedic_fields
from .zodiac import to_chart_longitude


def _degree_in_sign(lon: float) -> float:
    return round((lon % 360.0) % 30.0, 6)


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
        jd_tt = 2451545.0

        tropical = {
            "sun": 120.0,
            "moon": 200.0,
            "mercury": 120.0,
            "venus": 120.0,
            "mars": 120.0,
            "jupiter": 120.0,
            "saturn": 120.0,
            "uranus": 120.0,
            "neptune": 120.0,
            "pluto": 120.0,
        }
        nodes = compute_mean_nodes(jd_tt)
        tropical["rahu"] = nodes.rahu_tropical
        tropical["ketu"] = nodes.ketu_tropical

        rising_sign = None
        houses = None
        planet_house_map = None
        ascendant = None
        asc_tropical = 10.0
        vedic_pre = enrich_vedic_fields(
            tropical_lons=tropical,
            jd_tt=jd_tt,
            birth_utc=None,
            has_birth_time=False,
            planet_house_map=None,
            phase_id="first_quarter",
            phase_label="First Quarter",
            signs_fn=sign_from_longitude,
            degree_in_sign_fn=_degree_in_sign,
        )
        ayan = vedic_pre["ayanamsa"] or 0.0
        chart_lons = vedic_pre["chartLongitudes"]

        if mode == "full" and place_provided:
            asc_lon = to_chart_longitude(asc_tropical, ayan)
            rising_sign = sign_from_longitude(asc_lon)
            ascendant = {
                "sign": rising_sign,
                "eclipticLongitudeDeg": round(asc_lon, 6),
                "degreeInSign": _degree_in_sign(asc_lon),
            }
            houses, planet_house_map = houses_payload_and_map(
                julian_day=jd_tt,
                latitude=float(inp.lat),
                longitude=float(inp.lon),
                ascendant_longitude=asc_lon,
                planet_longitudes=chart_lons,
                house_system=DEFAULT_HOUSE_SYSTEM,
            )

        birth_utc = None
        if mode == "full" and inp.birth_time:
            birth_utc = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        vedic = enrich_vedic_fields(
            tropical_lons=tropical,
            jd_tt=jd_tt,
            birth_utc=birth_utc,
            has_birth_time=bool(mode == "full" and inp.birth_time),
            planet_house_map=planet_house_map,
            phase_id="first_quarter",
            phase_label="First Quarter",
            signs_fn=sign_from_longitude,
            degree_in_sign_fn=_degree_in_sign,
        )
        chart_lons = vedic["chartLongitudes"]

        def body(key: str) -> dict[str, Any]:
            lon = chart_lons[key]
            return {
                "id": key,
                "eclipticLongitudeDeg": round(lon, 6),
                "degreeInSign": _degree_in_sign(lon),
                "sign": sign_from_longitude(lon),
                "retrograde": key in ("rahu", "ketu"),
            }

        planet_degrees = {k: body(k) for k in chart_lons}
        bodies = [
            {
                "id": k,
                "eclipticLongitudeDeg": planet_degrees[k]["eclipticLongitudeDeg"],
                "sign": planet_degrees[k]["sign"],
            }
            for k in ("sun", "moon")
        ]
        retrograde = ["rahu", "ketu"]

        astronomy: dict[str, Any] = {
            "bodies": bodies,
            "sunSign": planet_degrees["sun"]["sign"],
            "moonSign": planet_degrees["moon"]["sign"],
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
            "zodiacMode": vedic["zodiacMode"],
            "ayanamsa": vedic["ayanamsa"],
            "ayanamsaName": vedic["ayanamsaName"],
            "sun": planet_degrees["sun"],
            "moon": planet_degrees["moon"],
            "rahu": planet_degrees["rahu"],
            "ketu": planet_degrees["ketu"],
            "ascendant": ascendant,
            "planetDegrees": planet_degrees,
            "retrograde": retrograde,
            "nakshatra": vedic["nakshatra"],
            "planetNakshatra": vedic["planetNakshatra"],
            "moonProfile": vedic["moonProfile"],
            "dasha": vedic["dasha"],
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
                "zodiacMode": vedic["zodiacMode"],
                "zodiac": vedic["zodiac"],
                "ayanamsa": vedic["ayanamsa"],
                "ayanamsaName": vedic["ayanamsaName"],
                "nodeType": "mean",
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
