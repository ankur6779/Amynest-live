"""
Zodiac mode + ayanamsa conversion.

Tropical longitudes are computed once (Skyfield); chart longitudes are derived
here so tropical / sidereal_lahiri share the same astronomy path.
"""

from __future__ import annotations

import os

ZODIAC_TROPICAL = "tropical"
ZODIAC_SIDEREAL_LAHIRI = "sidereal_lahiri"

SUPPORTED_ZODIAC_MODES = (ZODIAC_TROPICAL, ZODIAC_SIDEREAL_LAHIRI)


def zodiac_mode_explicit() -> str | None:
    raw = os.environ.get("ZODIAC_MODE")
    if raw is None or not str(raw).strip():
        return None
    return str(raw).strip().lower()


def zodiac_mode(*, astrology_mode: str | None = None) -> str:
    """
    Resolve chart zodiac.
    Explicit ZODIAC_MODE wins; else Western→tropical, Vedic→sidereal_lahiri.
    """
    explicit = zodiac_mode_explicit()
    if explicit:
        if explicit not in SUPPORTED_ZODIAC_MODES:
            raise ValueError(f"unsupported ZODIAC_MODE={explicit!r}")
        return explicit

    mode = astrology_mode
    if mode is None:
        from .astrology_mode import resolve_astrology_mode

        mode = resolve_astrology_mode()
    from .astrology_mode import ASTROLOGY_WESTERN

    if mode == ASTROLOGY_WESTERN:
        return ZODIAC_TROPICAL
    return ZODIAC_SIDEREAL_LAHIRI


def lahiri_ayanamsa_deg(jd_tt: float) -> float:
    """
    Chitrapaksha (Lahiri) ayanamsa in degrees at Julian Day (TT).

    Uses the Swiss-Ephemeris-aligned Newcomb precession form so tropical→sidereal
    conversion stays a single shared path (no duplicated planet math).
    """
    t = (jd_tt - 2451545.0) / 36525.0  # Julian centuries from J2000.0 TT
    # J2000 Lahiri ≈ 23°51'11.16"
    return 23.8531055556 + (5029.0966 / 3600.0) * t + (1.11113 / 3600.0) * t * t


def ayanamsa_for_mode(jd_tt: float, mode: str | None = None) -> tuple[float, str | None]:
    """
    Return (ayanamsa_degrees, ayanamsa_name).
    Tropical → (0.0, None). Sidereal Lahiri → (deg, "lahiri").
    """
    m = mode or zodiac_mode()
    if m == ZODIAC_TROPICAL:
        return 0.0, None
    if m == ZODIAC_SIDEREAL_LAHIRI:
        return lahiri_ayanamsa_deg(jd_tt), "lahiri"
    raise ValueError(f"unsupported zodiac mode {m!r}")


def to_chart_longitude(tropical_lon_deg: float, ayanamsa_deg: float) -> float:
    """Convert tropical ecliptic longitude → chart longitude for active mode."""
    v = (tropical_lon_deg - ayanamsa_deg) % 360.0
    return v + 360.0 if v < 0 else v


def zodiac_label(mode: str | None = None) -> str:
    m = mode or zodiac_mode()
    if m == ZODIAC_SIDEREAL_LAHIRI:
        return "sidereal"
    return "tropical"
