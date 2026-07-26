"""
Chart calculations from a loaded Skyfield ephemeris (no network).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from skyfield.api import Time

from .angles import (
    angle_payload,
    descendant_longitude,
    imum_coeli_longitude,
    mean_obliquity_deg,
    midheaven_longitude,
    ramc_deg,
)
from .aspect_engine import get_aspect_engine
from .astrology_mode import (
    ASTROLOGY_WESTERN,
    resolve_astrology_mode,
    resolve_house_system,
)
from .dasha_engine import compute_vimshottari_dasha
from .engine_port import ComputeInput
from .house_engine import houses_payload_and_map
from .nakshatra_engine import get_nakshatra_engine
from .nodes import get_node_engine
from .western_profile import build_western_birth_profile
from .zodiac import (
    ayanamsa_for_mode,
    to_chart_longitude,
    zodiac_label,
    zodiac_mode,
)

SIGNS = (
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
)

PHASES = (
    ("new", "New Moon", 22.5),
    ("waxing_crescent", "Waxing Crescent", 67.5),
    ("first_quarter", "First Quarter", 112.5),
    ("waxing_gibbous", "Waxing Gibbous", 157.5),
    ("full", "Full Moon", 202.5),
    ("waning_gibbous", "Waning Gibbous", 247.5),
    ("last_quarter", "Last Quarter", 292.5),
    ("waning_crescent", "Waning Crescent", 337.5),
    ("new", "New Moon", 360.0),
)

# Skyfield / DE440 target names (prefer planet body, else barycenter).
BODY_SPECS: list[tuple[str, tuple[str, ...]]] = [
    ("sun", ("sun", "10")),
    ("moon", ("moon", "301")),
    ("mercury", ("mercury", "199")),
    ("venus", ("venus", "299")),
    ("mars", ("mars barycenter", "mars", "4")),
    ("jupiter", ("jupiter barycenter", "jupiter", "5")),
    ("saturn", ("saturn barycenter", "saturn", "6")),
    ("uranus", ("uranus barycenter", "uranus", "7")),
    ("neptune", ("neptune barycenter", "neptune", "8")),
    ("pluto", ("pluto barycenter", "pluto", "9")),
]


def _resolve_body(eph, names: tuple[str, ...]):
    last_err: Exception | None = None
    for name in names:
        try:
            return eph[name]
        except Exception as e:  # KeyError / ValueError from spice
            last_err = e
            continue
    raise ChartError(
        "ephemeris_body_missing",
        f"kernel missing body aliases {names}: {last_err}",
    )


class ChartError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def norm360(x: float) -> float:
    v = x % 360.0
    return v + 360.0 if v < 0 else v


def sign_from_longitude(lon: float) -> str:
    return SIGNS[int(norm360(lon) / 30.0) % 12]


def degree_in_sign(lon: float) -> float:
    return round(norm360(lon) % 30.0, 6)


def phase_from_elongation(elong: float) -> tuple[str, str]:
    e = norm360(elong)
    for pid, label, mx in PHASES:
        if e < mx:
            return pid, label
    return "new", "New Moon"


def parse_utc(inp: ComputeInput) -> datetime:
    if not inp.birth_date or not isinstance(inp.birth_date, str):
        raise ChartError("missing_birth_date", "birthDate is required")
    parts = inp.birth_date.split("-")
    if len(parts) != 3:
        raise ChartError("invalid_birth_date", "birthDate must be YYYY-MM-DD")
    try:
        y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError as e:
        raise ChartError("invalid_birth_date", "birthDate must be YYYY-MM-DD") from e

    day_sky = inp.time_precision == "unknown" or not inp.birth_time
    if day_sky:
        # Representative local noon as UTC-adjusted noon (offset applied)
        offset = inp.timezone_offset_minutes or 0
        local_noon = datetime(y, m, d, 12, 0, 0, tzinfo=timezone.utc)
        return local_noon - timedelta(minutes=offset)

    time_parts = inp.birth_time.split(":")
    if len(time_parts) < 2:
        raise ChartError("invalid_birth_time", "birthTime must be HH:MM")
    try:
        hh, mm = int(time_parts[0]), int(time_parts[1])
        ss = int(time_parts[2]) if len(time_parts) > 2 else 0
    except ValueError as e:
        raise ChartError("invalid_birth_time", "birthTime must be HH:MM") from e

    offset = inp.timezone_offset_minutes
    if offset is None:
        offset = 0
    local_as_utc = datetime(y, m, d, hh, mm, ss, tzinfo=timezone.utc)
    return local_as_utc - timedelta(minutes=offset)


def _ecliptic_lon_deg(eph, earth, body, t: Time) -> float:
    """Geocentric apparent ecliptic longitude (degrees), of-date."""
    astrometric = earth.at(t).observe(body)
    lat, lon, _distance = astrometric.apparent().ecliptic_latlon()
    return float(lon.degrees)


def _is_retrograde(eph, earth, body, t: Time, ts) -> bool:
    """True when geocentric ecliptic longitude is decreasing (approx)."""
    dt_days = 0.5
    t0 = ts.tt_jd(t.tt - dt_days)
    t1 = ts.tt_jd(t.tt + dt_days)
    lon0 = _ecliptic_lon_deg(eph, earth, body, t0)
    lon1 = _ecliptic_lon_deg(eph, earth, body, t1)
    # shortest signed delta
    delta = ((lon1 - lon0 + 540) % 360) - 180
    return delta < 0


def _ascendant_lon(t: Time, lat: float, lon_deg: float, wgs84) -> float:
    """Tropical ascendant longitude (degrees) via LST + obliquity formula."""
    import math

    # Local sidereal time (hours) → RAMC in degrees
    gast_hours = float(t.gast)
    lst_hours = (gast_hours + lon_deg / 15.0) % 24.0
    ramc = lst_hours * 15.0
    # Mean obliquity of date (IAU-ish deg)
    t_cent = (float(t.tt) - 2451545.0) / 36525.0
    eps = 23.439291 - 0.0130042 * t_cent
    lat_r = math.radians(lat)
    eps_r = math.radians(eps)
    ramc_r = math.radians(ramc)
    y = -math.cos(ramc_r)
    x = math.sin(ramc_r) * math.cos(eps_r) + math.tan(lat_r) * math.sin(eps_r)
    asc = math.degrees(math.atan2(y, x))
    return norm360(asc)


def _confidence_for_input(inp: ComputeInput, *, place_provided: bool, mode: str) -> tuple[float, list[str], str]:
    """Return (astronomyConfidence, missingInputs, calculationMode)."""
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
    if mode == "full" and place_provided:
        calc_mode = "topocentric"
    else:
        calc_mode = "geocentric"
    return confidence, missing, calc_mode


def build_astronomy(
    *,
    eph,
    ts,
    inp: ComputeInput,
    engine_version: str,
    bsp_kernel: str,
    wgs84,
    quality: str = "high",
    calculation_source: str = "Skyfield",
    kernel_label: str = "DE440",
    kernel_fingerprint: str = "",
) -> tuple[dict[str, Any], str]:
    precision = inp.time_precision
    if precision not in ("exact", "approximate", "unknown"):
        raise ChartError("invalid_time_precision", "timePrecision invalid")

    mode = "day_sky" if precision == "unknown" or not inp.birth_time else "full"

    if inp.lat is not None and (inp.lat < -90 or inp.lat > 90):
        raise ChartError("invalid_coordinates", "lat out of range")
    if inp.lon is not None and (inp.lon < -180 or inp.lon > 180):
        raise ChartError("invalid_coordinates", "lon out of range")

    place_provided = inp.lat is not None and inp.lon is not None
    # Full sky with place: require coords for rising; without place rising=null
    if mode == "full" and place_provided and (inp.lat is None or inp.lon is None):
        raise ChartError("invalid_coordinates", "lat/lon required when placeProvided")

    astronomy_confidence, missing_inputs, calculation_mode = _confidence_for_input(
        inp, place_provided=place_provided, mode=mode
    )

    utc = parse_utc(inp)
    t = ts.from_datetime(utc)
    jd_tt = float(t.tt)
    earth = _resolve_body(eph, ("earth", "399"))

    # Optional per-request override via ComputeInput is not on the dataclass;
    # daemon may set ASTROLOGY_MODE env. Region AUTO defaults preserve Vedic.
    astro_mode = resolve_astrology_mode()
    zmode = zodiac_mode(astrology_mode=astro_mode)
    house_system = resolve_house_system(astro_mode)
    ayanamsa_deg, ayanamsa_name = ayanamsa_for_mode(jd_tt, zmode)

    tropical_lons: dict[str, float] = {}
    retro_flags: dict[str, bool] = {}
    for key, eph_names in BODY_SPECS:
        body = _resolve_body(eph, eph_names)
        tropical_lons[key] = _ecliptic_lon_deg(eph, earth, body, t)
        retro = False
        if key not in ("sun", "moon"):
            retro = _is_retrograde(eph, earth, body, t, ts)
        retro_flags[key] = retro

    # Moon phase uses tropical elongation (astronomical, zodiac-independent)
    elong = norm360(tropical_lons["moon"] - tropical_lons["sun"])
    phase_id, phase_label = phase_from_elongation(elong)

    # Nodes (tropical), then convert with the same ayanamsa path
    nodes = get_node_engine().compute(jd_tt)
    tropical_lons["rahu"] = nodes.rahu_tropical
    tropical_lons["ketu"] = nodes.ketu_tropical
    retro_flags["rahu"] = True  # mean node is always retrograde by convention
    retro_flags["ketu"] = True

    chart_lons = {
        k: to_chart_longitude(v, ayanamsa_deg) for k, v in tropical_lons.items()
    }

    planet_degrees: dict[str, dict[str, Any]] = {}
    bodies: list[dict[str, Any]] = []
    retrograde: list[str] = []
    planets: dict[str, dict[str, Any]] = {}

    for key, lon in chart_lons.items():
        sign = sign_from_longitude(lon)
        retro = bool(retro_flags.get(key, False))
        if retro and key not in retrograde:
            retrograde.append(key)
        entry = {
            "id": key,
            "eclipticLongitudeDeg": round(lon, 6),
            "degreeInSign": degree_in_sign(lon),
            "sign": sign,
            "retrograde": retro,
        }
        bodies.append(
            {
                "id": key,
                "eclipticLongitudeDeg": round(lon, 6),
                "sign": sign,
            }
        )
        planet_degrees[key] = {
            "eclipticLongitudeDeg": round(lon, 6),
            "degreeInSign": degree_in_sign(lon),
            "sign": sign,
            "retrograde": retro,
        }
        planets[key] = entry

    # Earth (heliocentric ecliptic lon of Earth ≈ opposite Sun + small)
    earth_lon = norm360(chart_lons["sun"] + 180.0)

    rising_sign = None
    ascendant = None
    midheaven = None
    imum_coeli = None
    descendant = None
    houses = None
    planet_house_map = None
    topocentric = False
    if mode == "full" and place_provided:
        topocentric = True
        gast = float(t.gast)
        obl = mean_obliquity_deg(jd_tt)
        ramc = ramc_deg(gast_hours=gast, longitude_deg=float(inp.lon))
        asc_tropical = _ascendant_lon(t, float(inp.lat), float(inp.lon), wgs84)
        mc_tropical = midheaven_longitude(ramc, obl)
        asc_lon = to_chart_longitude(asc_tropical, ayanamsa_deg)
        mc_lon = to_chart_longitude(mc_tropical, ayanamsa_deg)
        dc_lon = descendant_longitude(asc_lon)
        ic_lon = imum_coeli_longitude(mc_lon)
        rising_sign = sign_from_longitude(asc_lon)
        ascendant = angle_payload(asc_lon)
        midheaven = angle_payload(mc_lon)
        descendant = angle_payload(dc_lon)
        imum_coeli = angle_payload(ic_lon)
        houses, planet_house_map = houses_payload_and_map(
            julian_day=jd_tt,
            latitude=float(inp.lat),
            longitude=float(inp.lon),
            ascendant_longitude=asc_lon,
            planet_longitudes=chart_lons,
            house_system=house_system,
            midheaven_longitude=mc_lon,
            ramc_deg=ramc,
            obliquity_deg=obl,
        )

    # Aspects (shared chart longitudes + angles when present)
    aspect_lons = dict(chart_lons)
    if ascendant:
        aspect_lons["ascendant"] = float(ascendant["eclipticLongitudeDeg"])
    if midheaven:
        aspect_lons["mc"] = float(midheaven["eclipticLongitudeDeg"])
    aspects = get_aspect_engine().compute(aspect_lons)

    nak_engine = get_nakshatra_engine()
    planet_nakshatra = nak_engine.map_bodies(chart_lons)
    moon_nak = nak_engine.lookup(chart_lons["moon"])
    nakshatra = moon_nak.to_dict()

    moon_profile = {
        "sign": planet_degrees["moon"]["sign"],
        "house": (planet_house_map or {}).get("moon"),
        "nakshatra": moon_nak.name,
        "pada": moon_nak.pada,
        "lord": moon_nak.lord,
        "phase": phase_id,
        "phaseLabel": phase_label,
        "longitudeDeg": round(chart_lons["moon"], 6),
        "degreeInSign": degree_in_sign(chart_lons["moon"]),
    }

    dasha = None
    if mode == "full" and inp.birth_time:
        dasha = compute_vimshottari_dasha(
            moon_chart_longitude=chart_lons["moon"],
            birth_utc=utc if utc.tzinfo else utc.replace(tzinfo=timezone.utc),
        )

    western_profile = None
    if astro_mode == ASTROLOGY_WESTERN:
        western_profile = build_western_birth_profile(
            planet_degrees=planet_degrees,
            ascendant=ascendant,
            midheaven=midheaven,
            planet_house_map=planet_house_map,
            house_system=houses["system"] if houses else house_system,
            zodiac_mode=zmode,
            aspects=aspects,
        )

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    astronomy: dict[str, Any] = {
        "bodies": bodies,
        "sunSign": planet_degrees["sun"]["sign"],
        "moonSign": planet_degrees["moon"]["sign"],
        "moonPhase": phase_id,
        "moonPhaseLabel": phase_label,
        "risingSign": rising_sign,
        "houses": houses,
        "planetHouseMap": planet_house_map,
        "precision": {
            "timePrecision": precision,
            "placeProvided": place_provided,
        },
        "engineVersion": engine_version,
        "kernel": kernel_label,
        "kernelFingerprint": kernel_fingerprint or None,
        "generatedAt": generated_at,
        "quality": quality,
        "astronomyConfidence": astronomy_confidence,
        "missingInputs": missing_inputs,
        "calculationMode": calculation_mode,
        "astrologyMode": astro_mode,
        "zodiacMode": zmode,
        "ayanamsa": round(ayanamsa_deg, 6) if ayanamsa_name else None,
        "ayanamsaName": ayanamsa_name,
        "sun": planets["sun"],
        "moon": planets["moon"],
        "mercury": planets["mercury"],
        "venus": planets["venus"],
        "mars": planets["mars"],
        "jupiter": planets["jupiter"],
        "saturn": planets["saturn"],
        "uranus": planets["uranus"],
        "neptune": planets["neptune"],
        "pluto": planets["pluto"],
        "rahu": planets["rahu"],
        "ketu": planets["ketu"],
        "ascendant": ascendant,
        "midheaven": midheaven,
        "imumCoeli": imum_coeli,
        "descendant": descendant,
        "planetDegrees": planet_degrees,
        "retrograde": retrograde,
        "aspects": aspects,
        "nakshatra": nakshatra,
        "planetNakshatra": planet_nakshatra,
        "moonProfile": moon_profile,
        "dasha": dasha,
        "westernBirthProfile": western_profile,
        "metadata": {
            "julianDay": jd_tt,
            "utcIso": utc.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "topocentric": topocentric,
            "bspKernel": bsp_kernel,
            "earthLongitudeDeg": round(earth_lon, 6),
            "quality": quality,
            "calculationSource": calculation_source,
            "kernel": kernel_label,
            "kernelFingerprint": kernel_fingerprint or None,
            "generatedAt": generated_at,
            "precision": "jpl_local",
            "astronomyConfidence": astronomy_confidence,
            "missingInputs": missing_inputs,
            "calculationMode": calculation_mode,
            "houseSystem": houses["system"] if houses else None,
            "astrologyMode": astro_mode,
            "zodiacMode": zmode,
            "zodiac": zodiac_label(zmode),
            "ayanamsa": round(ayanamsa_deg, 6) if ayanamsa_name else None,
            "ayanamsaName": ayanamsa_name,
            "nodeType": nodes.node_type,
        },
    }
    return astronomy, mode
