"""
Precision + factory validation for EnginePort implementations.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.chart_service import sign_from_longitude  # noqa: E402
from src.engine_factory import create_engine  # noqa: E402
from src.engine_port import ComputeInput  # noqa: E402


def test_factory_skyfield_default():
    os.environ["ENGINE_PROVIDER"] = "skyfield"
    eng = create_engine()
    eng.load()
    assert eng.ready()
    assert eng.full_engine_version().startswith(eng.engine_name() + "/")
    assert eng.kernel_name() in ("DE440", "DE441")


def test_factory_mock():
    eng = create_engine("mock")
    eng.load()
    r = eng.compute_chart(
        ComputeInput(
            birth_date="2000-01-01",
            birth_time="12:00",
            time_precision="exact",
            lat=0.0,
            lon=0.0,
            timezone_offset_minutes=0,
        )
    )
    assert r.astronomy["quality"] == "medium"
    assert r.astronomy["metadata"]["calculationSource"] == "MockEngine"
    assert r.astronomy["kernelFingerprint"].startswith("sha256:")
    assert r.astronomy["astronomyConfidence"] == 1.0
    assert r.astronomy["calculationMode"] == "topocentric"
    assert eng.health().kernel_fingerprint.startswith("sha256:")
    assert r.astronomy["houses"]["system"] == "whole_sign"
    assert len(r.astronomy["houses"]["cusps"]) == 12
    assert r.astronomy["planetHouseMap"]["sun"] == 5  # Leo vs Aries rising


def test_sun_moon_known_epoch():
    os.environ["ENGINE_PROVIDER"] = "skyfield"
    eng = create_engine()
    eng.load()
    r = eng.compute_chart(
        ComputeInput(
            birth_date="2000-01-01",
            birth_time="12:00",
            time_precision="exact",
            lat=0.0,
            lon=0.0,
            timezone_offset_minutes=0,
        )
    )
    a = r.astronomy
    sun = a["planetDegrees"]["sun"]["eclipticLongitudeDeg"]
    moon = a["planetDegrees"]["moon"]["eclipticLongitudeDeg"]
    assert 279.5 <= sun <= 281.5, sun
    assert a["sunSign"] == "Capricorn"
    assert a["sunSign"] == sign_from_longitude(sun)
    assert a["moonSign"] == sign_from_longitude(moon)
    assert a["quality"] == "high"
    assert a["metadata"]["kernel"] in ("DE440", "DE441")
    assert a["kernel"] == a["metadata"]["kernel"]
    assert a["kernelFingerprint"].startswith("sha256:")
    assert a["metadata"]["kernelFingerprint"] == a["kernelFingerprint"]
    assert a["metadata"]["calculationSource"] == "Skyfield"
    assert a["astronomyConfidence"] == 1.0
    assert a["calculationMode"] == "topocentric"
    assert a["missingInputs"] == []
    assert isinstance(a["metadata"].get("computeLatencyMs"), (int, float))

    ts = eng._ts  # type: ignore[attr-defined]
    eph = eng._eph  # type: ignore[attr-defined]
    t = ts.utc(2000, 1, 1, 12, 0, 0)
    earth = eph["earth"]
    sun_body = eph["sun"]
    _lat, lon, _ = earth.at(t).observe(sun_body).apparent().ecliptic_latlon()
    ref = float(lon.degrees) % 360
    circ = min(abs(sun - ref) % 360, 360 - abs(sun - ref) % 360)
    assert circ < 0.01, (sun, ref, circ)

    r2 = eng.compute_chart(
        ComputeInput(
            birth_date="2000-01-01",
            birth_time="12:00",
            time_precision="exact",
            lat=0.0,
            lon=0.0,
            timezone_offset_minutes=0,
        )
    )
    for key, p in a["planetDegrees"].items():
        other = r2.astronomy["planetDegrees"][key]["eclipticLongitudeDeg"]
        d = min(
            abs(p["eclipticLongitudeDeg"] - other) % 360,
            360 - abs(p["eclipticLongitudeDeg"] - other) % 360,
        )
        assert d < 0.01, (key, d)


def test_determinism_and_warm_latency():
    eng = create_engine("skyfield")
    eng.load()
    inp = ComputeInput(
        birth_date="1995-06-15",
        birth_time="08:30",
        time_precision="exact",
        lat=28.6139,
        lon=77.209,
        timezone_offset_minutes=330,
    )
    eng.compute_chart(inp)
    times = []
    first = None
    for _ in range(20):
        t0 = time.perf_counter()
        r = eng.compute_chart(inp)
        times.append((time.perf_counter() - t0) * 1000)
        if first is None:
            first = r.astronomy["planetDegrees"]["sun"]["eclipticLongitudeDeg"]
        else:
            assert abs(r.astronomy["planetDegrees"]["sun"]["eclipticLongitudeDeg"] - first) < 1e-6
    times_sorted = sorted(times)
    p50 = times_sorted[len(times_sorted) // 2]
    print(f"warm_p50_ms={p50:.2f}")
    assert p50 < 100.0, f"warm p50 {p50:.2f}ms exceeds 100ms"
    h = eng.health()
    assert h.charts_computed >= 21
    assert h.ready is True


def test_day_sky_no_rising():
    eng = create_engine("skyfield")
    eng.load()
    r = eng.compute_chart(
        ComputeInput(
            birth_date="2010-03-21",
            birth_time=None,
            time_precision="unknown",
            lat=None,
            lon=None,
            timezone_offset_minutes=0,
        )
    )
    assert r.mode == "day_sky"
    assert r.astronomy["risingSign"] is None
    assert r.astronomy["ascendant"] is None
    assert r.astronomy["houses"] is None
    assert r.astronomy["planetHouseMap"] is None
    assert r.astronomy["astronomyConfidence"] == 0.6
    assert "birthTime" in r.astronomy["missingInputs"]
    assert "birthPlace" in r.astronomy["missingInputs"]
    assert r.astronomy["calculationMode"] == "geocentric"


if __name__ == "__main__":
    test_factory_skyfield_default()
    test_factory_mock()
    test_sun_moon_known_epoch()
    test_determinism_and_warm_latency()
    test_day_sky_no_rising()
    print("OK")
