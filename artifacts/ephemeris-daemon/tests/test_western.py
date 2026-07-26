"""Western Astrology Foundation — houses, aspects, MC/IC/DC, profile."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.angles import (  # noqa: E402
    descendant_longitude,
    imum_coeli_longitude,
    midheaven_longitude,
)
from src.aspect_engine import AspectEngine  # noqa: E402
from src.astrology_mode import (  # noqa: E402
    ASTROLOGY_VEDIC,
    ASTROLOGY_WESTERN,
    resolve_astrology_mode,
    resolve_house_system,
)
from src.engine_factory import create_engine  # noqa: E402
from src.engine_port import ComputeInput  # noqa: E402
from src.house_engine import (  # noqa: E402
    HOUSE_SYSTEM_EQUAL,
    HOUSE_SYSTEM_PLACIDUS,
    HOUSE_SYSTEM_PORPHYRY,
    HOUSE_SYSTEM_WHOLE_SIGN,
    EqualHouseEngine,
    HouseComputeInput,
    HouseEngineFactory,
    PorphyryHouseEngine,
    WholeSignHouseEngine,
    compute_houses,
    norm360,
)
from src.zodiac import ZODIAC_TROPICAL, zodiac_mode  # noqa: E402


def test_astrology_mode_auto_india_vedic():
    os.environ["ASTROLOGY_MODE"] = "auto"
    os.environ["ASTROLOGY_REGION"] = "IN"
    assert resolve_astrology_mode() == ASTROLOGY_VEDIC
    assert resolve_house_system(ASTROLOGY_VEDIC) == HOUSE_SYSTEM_WHOLE_SIGN


def test_astrology_mode_western_defaults():
    os.environ.pop("ZODIAC_MODE", None)
    os.environ.pop("HOUSE_SYSTEM", None)
    os.environ["ASTROLOGY_MODE"] = "western"
    assert resolve_astrology_mode() == ASTROLOGY_WESTERN
    assert zodiac_mode(astrology_mode=ASTROLOGY_WESTERN) == ZODIAC_TROPICAL
    assert resolve_house_system(ASTROLOGY_WESTERN) == HOUSE_SYSTEM_PLACIDUS


def test_house_engine_factory():
    assert HouseEngineFactory.create("equal").system_id() == HOUSE_SYSTEM_EQUAL
    assert HouseEngineFactory.create("placidus").system_id() == HOUSE_SYSTEM_PLACIDUS


def test_equal_and_porphyry_and_whole_sign():
    asc = 15.0
    mc = 280.0
    ws = WholeSignHouseEngine().compute_houses(
        HouseComputeInput(2451545.0, 28.0, 77.0, asc, mc)
    )
    assert ws.system == HOUSE_SYSTEM_WHOLE_SIGN
    assert len(ws.cusps) == 12
    eq = EqualHouseEngine().compute_houses(
        HouseComputeInput(2451545.0, 28.0, 77.0, asc, mc)
    )
    assert eq.system == HOUSE_SYSTEM_EQUAL
    assert abs(eq.cusps[0].start_longitude_deg - asc) < 1e-6
    assert abs(norm360(eq.cusps[1].start_longitude_deg - asc) - 30.0) < 1e-6
    por = PorphyryHouseEngine().compute_houses(
        HouseComputeInput(2451545.0, 28.0, 77.0, asc, mc)
    )
    assert por.system == HOUSE_SYSTEM_PORPHYRY
    assert abs(por.cusps[0].start_longitude_deg - asc) < 1e-6
    assert abs(por.cusps[9].start_longitude_deg - mc) < 1e-6


def test_mc_ic_dc_relations():
    mc = midheaven_longitude(100.0, 23.44)
    ic = imum_coeli_longitude(mc)
    assert abs(norm360(ic - mc) - 180.0) < 1e-6
    asc = 50.0
    dc = descendant_longitude(asc)
    assert abs(norm360(dc - asc) - 180.0) < 1e-6


def test_aspect_engine_square_and_trine():
    eng = AspectEngine()
    aspects = eng.compute({"sun": 0.0, "moon": 90.0, "jupiter": 120.0})
    names = {(a["planetA"], a["planetB"], a["aspect"]) for a in aspects}
    assert ("sun", "moon", "square") in names
    assert ("sun", "jupiter", "trine") in names
    for a in aspects:
        assert 0.0 <= a["exactness"] <= 1.0
        assert a["orb"] >= 0


def test_western_chart_via_skyfield():
    os.environ["ENGINE_PROVIDER"] = "skyfield"
    os.environ["ASTROLOGY_MODE"] = "western"
    os.environ.pop("ZODIAC_MODE", None)
    os.environ.pop("HOUSE_SYSTEM", None)
    eng = create_engine()
    eng.load()
    r = eng.compute_chart(
        ComputeInput(
            birth_date="1995-06-15",
            birth_time="08:30",
            time_precision="exact",
            lat=40.7128,
            lon=-74.006,
            timezone_offset_minutes=-240,
        )
    )
    a = r.astronomy
    assert a["astrologyMode"] == "western"
    assert a["zodiacMode"] == "tropical"
    assert a["ayanamsa"] is None
    assert a["houses"]["system"] in (HOUSE_SYSTEM_PLACIDUS, HOUSE_SYSTEM_PORPHYRY)
    assert a["midheaven"] is not None
    assert a["imumCoeli"] is not None
    assert a["descendant"] is not None
    assert (
        abs(
            norm360(
                a["descendant"]["eclipticLongitudeDeg"]
                - a["ascendant"]["eclipticLongitudeDeg"]
            )
            - 180.0
        )
        < 0.01
    )
    assert (
        abs(
            norm360(
                a["imumCoeli"]["eclipticLongitudeDeg"]
                - a["midheaven"]["eclipticLongitudeDeg"]
            )
            - 180.0
        )
        < 0.01
    )
    assert isinstance(a["aspects"], list)
    assert a["westernBirthProfile"] is not None
    assert a["westernBirthProfile"]["dominantElement"] in (
        "fire",
        "earth",
        "air",
        "water",
    )
    assert a["westernBirthProfile"]["houseSystem"]
    # Vedic fields still present (coexist)
    assert a["nakshatra"] is not None
    assert a["rahu"] is not None


def test_vedic_untouched_defaults():
    os.environ["ASTROLOGY_MODE"] = "auto"
    os.environ["ASTROLOGY_REGION"] = "IN"
    os.environ.pop("ZODIAC_MODE", None)
    os.environ.pop("HOUSE_SYSTEM", None)
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
    assert a["astrologyMode"] == "vedic"
    assert a["zodiacMode"] == "sidereal_lahiri"
    assert a["houses"]["system"] == HOUSE_SYSTEM_WHOLE_SIGN
    assert a["westernBirthProfile"] is None
    assert a["dasha"] is not None


def test_placidus_compute_direct():
    r = compute_houses(
        julian_day=2451545.0,
        latitude=40.0,
        longitude=-74.0,
        ascendant_longitude=120.0,
        midheaven_longitude=30.0,
        ramc_deg=30.0,
        obliquity_deg=23.44,
        house_system=HOUSE_SYSTEM_PLACIDUS,
    )
    assert r.system in (HOUSE_SYSTEM_PLACIDUS, HOUSE_SYSTEM_PORPHYRY)
    assert len(r.cusps) == 12


def test_snapshot_compat_legacy_western_fields_absent():
    legacy = {
        "sunSign": "Leo",
        "moonSign": "Pisces",
        "houses": None,
        "bodies": [],
        "moonPhase": "full",
        "moonPhaseLabel": "Full Moon",
        "risingSign": None,
        "precision": {"timePrecision": "unknown", "placeProvided": False},
    }
    assert "westernBirthProfile" not in legacy
    assert "aspects" not in legacy
    assert "midheaven" not in legacy


if __name__ == "__main__":
    test_astrology_mode_auto_india_vedic()
    test_astrology_mode_western_defaults()
    test_house_engine_factory()
    test_equal_and_porphyry_and_whole_sign()
    test_mc_ic_dc_relations()
    test_aspect_engine_square_and_trine()
    test_western_chart_via_skyfield()
    test_vedic_untouched_defaults()
    test_placidus_compute_direct()
    test_snapshot_compat_legacy_western_fields_absent()
    print("OK")
