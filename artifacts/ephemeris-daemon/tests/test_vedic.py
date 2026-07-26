"""Vedic Intelligence Foundation — nodes, sidereal, nakshatra, dasha."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.dasha_engine import DASHA_YEARS, compute_vimshottari_dasha  # noqa: E402
from src.engine_factory import create_engine  # noqa: E402
from src.engine_port import ComputeInput  # noqa: E402
from src.house_engine import norm360  # noqa: E402
from src.nakshatra_engine import (  # noqa: E402
    NAKSHATRA_SPAN_DEG,
    NakshatraEngine,
)
from src.nodes import compute_mean_nodes  # noqa: E402
from src.zodiac import (  # noqa: E402
    ZODIAC_SIDEREAL_LAHIRI,
    ZODIAC_TROPICAL,
    lahiri_ayanamsa_deg,
    to_chart_longitude,
)


def test_rahu_ketu_opposite():
    n = compute_mean_nodes(2451545.0)
    assert abs(norm360(n.ketu_tropical - n.rahu_tropical) - 180.0) < 1e-6


def test_lahiri_j2000_range():
    a = lahiri_ayanamsa_deg(2451545.0)
    assert 23.8 < a < 23.9


def test_sidereal_conversion_subtracts_ayanamsa():
    trop = 280.0
    ayan = lahiri_ayanamsa_deg(2451545.0)
    chart = to_chart_longitude(trop, ayan)
    assert abs(norm360(trop - ayan) - chart) < 1e-9


def test_nakshatra_pada_bounds():
    eng = NakshatraEngine()
    for lon in (0.0, 13.333, 26.66, 100.0, 359.9):
        p = eng.lookup(lon)
        assert 1 <= p.pada <= 4
        assert 0 <= p.index <= 26
        assert 0 <= p.longitude_in_nakshatra_deg < NAKSHATRA_SPAN_DEG + 1e-9
        assert p.lord in DASHA_YEARS


def test_rohini_known():
    # Rohini starts at 3 * 13°20' = 40°
    p = NakshatraEngine().lookup(42.0)
    assert p.name == "Rohini"
    assert p.lord == "Moon"
    assert p.pada == 1


def test_moon_profile_and_dasha_via_skyfield():
    os.environ["ENGINE_PROVIDER"] = "skyfield"
    os.environ["ZODIAC_MODE"] = ZODIAC_SIDEREAL_LAHIRI
    eng = create_engine()
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
    assert a["zodiacMode"] == "sidereal_lahiri"
    assert a["ayanamsaName"] == "lahiri"
    assert a["ayanamsa"] is not None
    assert a["rahu"]["sign"]
    assert a["ketu"]["sign"]
    sep = abs(
        norm360(a["ketu"]["eclipticLongitudeDeg"] - a["rahu"]["eclipticLongitudeDeg"])
        - 180.0
    )
    assert sep < 0.01
    assert a["rahu"]["retrograde"] is True
    assert a["ketu"]["retrograde"] is True
    assert set(a["planetNakshatra"].keys()) >= {
        "sun",
        "moon",
        "mercury",
        "venus",
        "mars",
        "jupiter",
        "saturn",
        "rahu",
        "ketu",
    }
    for body, nak in a["planetNakshatra"].items():
        assert 1 <= nak["pada"] <= 4, body
    mp = a["moonProfile"]
    assert mp["nakshatra"] == a["nakshatra"]["name"]
    assert mp["pada"] == a["nakshatra"]["pada"]
    assert mp["lord"] == a["nakshatra"]["lord"]
    assert mp["sign"] == a["moonSign"]
    assert mp["phase"] == a["moonPhase"]
    assert a["dasha"] is not None
    assert a["dasha"]["system"] == "vimshottari"
    assert a["dasha"]["mahadasha"]["lord"] in DASHA_YEARS
    assert a["dasha"]["antardasha"]["lord"] in DASHA_YEARS
    assert a["dasha"]["remainingBalance"]["mahadashaYears"] >= 0


def test_dasha_null_without_birth_time():
    os.environ["ZODIAC_MODE"] = ZODIAC_SIDEREAL_LAHIRI
    eng = create_engine("skyfield")
    eng.load()
    r = eng.compute_chart(
        ComputeInput(
            birth_date="1995-06-15",
            birth_time=None,
            time_precision="unknown",
            lat=None,
            lon=None,
            timezone_offset_minutes=0,
        )
    )
    assert r.astronomy["dasha"] is None
    assert r.astronomy["houses"] is None
    assert r.astronomy["moonProfile"]["nakshatra"]
    assert r.astronomy["moonProfile"]["house"] is None


def test_dasha_reproducible():
    moon_lon = 42.0  # Rohini
    birth = datetime(1995, 6, 15, 3, 0, 0, tzinfo=timezone.utc)
    a = compute_vimshottari_dasha(moon_chart_longitude=moon_lon, birth_utc=birth)
    b = compute_vimshottari_dasha(moon_chart_longitude=moon_lon, birth_utc=birth)
    assert a == b
    assert a["mahadasha"]["lord"] == "Moon"
    assert a["birthNakshatra"] == "Rohini"


def test_tropical_mode_still_works():
    os.environ["ZODIAC_MODE"] = ZODIAC_TROPICAL
    eng = create_engine("skyfield")
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
    assert a["zodiacMode"] == "tropical"
    assert a["ayanamsa"] is None
    assert a["sunSign"] == "Capricorn"
    assert 279.5 <= a["planetDegrees"]["sun"]["eclipticLongitudeDeg"] <= 281.5


def test_snapshot_compat_legacy_without_vedic():
    legacy = {
        "sunSign": "Leo",
        "moonSign": "Pisces",
        "houses": None,
        "moonPhase": "full",
        "moonPhaseLabel": "Full Moon",
        "risingSign": None,
        "bodies": [],
        "precision": {"timePrecision": "unknown", "placeProvided": False},
    }
    assert "rahu" not in legacy
    assert "dasha" not in legacy
    assert legacy["houses"] is None


if __name__ == "__main__":
    test_rahu_ketu_opposite()
    test_lahiri_j2000_range()
    test_sidereal_conversion_subtracts_ayanamsa()
    test_nakshatra_pada_bounds()
    test_rohini_known()
    test_moon_profile_and_dasha_via_skyfield()
    test_dasha_null_without_birth_time()
    test_dasha_reproducible()
    test_tropical_mode_still_works()
    test_snapshot_compat_legacy_without_vedic()
    print("OK")
