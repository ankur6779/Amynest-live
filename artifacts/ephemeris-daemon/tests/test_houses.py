"""Unit tests for Whole Sign HouseEngine + planet placement."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.engine_factory import create_engine  # noqa: E402
from src.engine_port import ComputeInput  # noqa: E402
from src.house_engine import (  # noqa: E402
    HOUSE_SYSTEM_WHOLE_SIGN,
    WholeSignHouseEngine,
    build_planet_house_map,
    compute_houses,
    planet_house_number,
    sign_from_longitude,
)


def test_whole_sign_twelve_houses_exactly_30():
    # Ascendant mid-Leo → House 1 = Leo 120–150
    result = compute_houses(
        julian_day=2451545.0,
        latitude=28.6,
        longitude=77.2,
        ascendant_longitude=135.0,
        house_system=HOUSE_SYSTEM_WHOLE_SIGN,
    )
    assert result.system == "whole_sign"
    assert len(result.cusps) == 12
    assert result.cusps[0].sign == "Leo"
    assert result.cusps[0].house == 1
    assert result.cusps[0].start_longitude_deg == 120.0
    assert result.cusps[0].end_longitude_deg == 150.0
    for c in result.cusps:
        span = c.end_longitude_deg - c.start_longitude_deg
        assert abs(span - 30.0) < 1e-9, (c.house, span)
    # Signs wrap: Leo … Cancer
    assert result.cusps[11].sign == "Cancer"
    assert result.cusps[0].sign == sign_from_longitude(135.0)


def test_ascendant_equals_house_1_sign():
    from src.house_engine import HouseComputeInput

    eng = WholeSignHouseEngine()
    for asc in (0.1, 29.9, 30.0, 179.5, 359.9):
        r = eng.compute_houses(
            HouseComputeInput(
                julian_day=2451545.0,
                latitude=0.0,
                longitude=0.0,
                ascendant_longitude=asc,
            )
        )
        assert r.cusps[0].sign == sign_from_longitude(asc)


def test_planet_house_placement():
    # Asc Leo (120–150) → house 1
    # Sun Virgo 155 → house 2
    # Moon Cancer 100 → house 12
    asc = 140.0
    assert planet_house_number(planet_longitude=140.0, ascendant_longitude=asc) == 1
    assert planet_house_number(planet_longitude=155.0, ascendant_longitude=asc) == 2
    assert planet_house_number(planet_longitude=100.0, ascendant_longitude=asc) == 12
    m = build_planet_house_map(
        {
            "sun": 155.0,
            "moon": 100.0,
            "mercury": 140.0,
            "venus": 200.0,
            "mars": 10.0,
            "jupiter": 50.0,
            "saturn": 80.0,
            "uranus": 220.0,
            "neptune": 280.0,
            "pluto": 310.0,
        },
        ascendant_longitude=asc,
    )
    assert m["sun"] == 2
    assert m["moon"] == 12
    assert m["mercury"] == 1
    assert set(m.values()) <= set(range(1, 13))
    assert len(m) == 10


def test_every_planet_exactly_one_house_via_skyfield():
    eng = create_engine("skyfield")
    eng.load()
    r = eng.compute_chart(
        ComputeInput(
            birth_date="1995-06-15",
            birth_time="08:30",
            time_precision="exact",
            lat=28.6139,
            lon=77.209,
            timezone_offset_minutes=330,
        )
    )
    a = r.astronomy
    assert a["houses"] is not None
    assert a["houses"]["system"] == "whole_sign"
    assert len(a["houses"]["cusps"]) == 12
    assert a["planetHouseMap"] is not None
    assert a["risingSign"] == a["houses"]["cusps"][0]["sign"]
    assert a["ascendant"]["sign"] == a["houses"]["cusps"][0]["sign"]
    for pid, house in a["planetHouseMap"].items():
        assert 1 <= house <= 12, (pid, house)
    assert len(a["planetHouseMap"]) == 10
    for c in a["houses"]["cusps"]:
        assert abs(c["endLongitudeDeg"] - c["startLongitudeDeg"] - 30.0) < 1e-6


def test_missing_birth_time_null_houses():
    eng = create_engine("skyfield")
    eng.load()
    r = eng.compute_chart(
        ComputeInput(
            birth_date="2010-03-21",
            birth_time=None,
            time_precision="unknown",
            lat=28.6,
            lon=77.2,
            timezone_offset_minutes=330,
        )
    )
    a = r.astronomy
    assert r.mode == "day_sky"
    assert a["ascendant"] is None
    assert a["houses"] is None
    assert a["planetHouseMap"] is None
    assert "birthTime" in a["missingInputs"]


def test_snapshot_compat_null_houses_shape():
    """Legacy payload with houses=null remains a valid hydrate shape."""
    legacy = {
        "bodies": [],
        "sunSign": "Leo",
        "moonSign": "Pisces",
        "moonPhase": "full",
        "moonPhaseLabel": "Full Moon",
        "risingSign": None,
        "houses": None,
        "precision": {"timePrecision": "unknown", "placeProvided": False},
    }
    assert legacy["houses"] is None
    assert "planetHouseMap" not in legacy


if __name__ == "__main__":
    test_whole_sign_twelve_houses_exactly_30()
    test_ascendant_equals_house_1_sign()
    test_planet_house_placement()
    test_every_planet_exactly_one_house_via_skyfield()
    test_missing_birth_time_null_houses()
    test_snapshot_compat_null_houses_shape()
    print("OK")
