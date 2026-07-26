"""
Shared Vedic enrichment for mock / chart paths (nakshatra, moon profile, dasha).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .dasha_engine import compute_vimshottari_dasha
from .nakshatra_engine import get_nakshatra_engine
from .zodiac import ayanamsa_for_mode, to_chart_longitude, zodiac_label, zodiac_mode


def enrich_vedic_fields(
    *,
    tropical_lons: dict[str, float],
    jd_tt: float,
    birth_utc: datetime | None,
    has_birth_time: bool,
    planet_house_map: dict[str, int] | None,
    phase_id: str,
    phase_label: str,
    signs_fn,
    degree_in_sign_fn,
) -> dict[str, Any]:
    zmode = zodiac_mode()
    ayanamsa_deg, ayanamsa_name = ayanamsa_for_mode(jd_tt, zmode)
    chart_lons = {
        k: to_chart_longitude(v, ayanamsa_deg) for k, v in tropical_lons.items()
    }
    nak_engine = get_nakshatra_engine()
    planet_nakshatra = nak_engine.map_bodies(chart_lons)
    moon_nak = nak_engine.lookup(chart_lons["moon"])
    moon_profile = {
        "sign": signs_fn(chart_lons["moon"]),
        "house": (planet_house_map or {}).get("moon"),
        "nakshatra": moon_nak.name,
        "pada": moon_nak.pada,
        "lord": moon_nak.lord,
        "phase": phase_id,
        "phaseLabel": phase_label,
        "longitudeDeg": round(chart_lons["moon"], 6),
        "degreeInSign": degree_in_sign_fn(chart_lons["moon"]),
    }
    dasha = None
    if has_birth_time and birth_utc is not None:
        dasha = compute_vimshottari_dasha(
            moon_chart_longitude=chart_lons["moon"],
            birth_utc=birth_utc
            if birth_utc.tzinfo
            else birth_utc.replace(tzinfo=timezone.utc),
        )
    return {
        "zodiacMode": zmode,
        "ayanamsa": round(ayanamsa_deg, 6) if ayanamsa_name else None,
        "ayanamsaName": ayanamsa_name,
        "zodiac": zodiac_label(zmode),
        "chartLongitudes": chart_lons,
        "nakshatra": moon_nak.to_dict(),
        "planetNakshatra": planet_nakshatra,
        "moonProfile": moon_profile,
        "dasha": dasha,
    }
