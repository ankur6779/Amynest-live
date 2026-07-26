"""
Chart angles — Ascendant helpers, Midheaven (MC), IC, Descendant (DC).
"""

from __future__ import annotations

import math
from typing import Any

from .house_engine import mean_obliquity_deg, norm360, sign_from_longitude

# Re-export for callers
__all__ = [
    "mean_obliquity_deg",
    "ramc_deg",
    "midheaven_longitude",
    "descendant_longitude",
    "imum_coeli_longitude",
    "angle_payload",
]


def ramc_deg(*, gast_hours: float, longitude_deg: float) -> float:
    lst_hours = (gast_hours + longitude_deg / 15.0) % 24.0
    return lst_hours * 15.0


def midheaven_longitude(ramc: float, obliquity_deg: float) -> float:
    """Tropical MC longitude from RAMC and obliquity."""
    ramc_r = math.radians(norm360(ramc))
    eps_r = math.radians(obliquity_deg)
    x = math.sin(ramc_r)
    y = math.cos(ramc_r) * math.cos(eps_r)
    return norm360(math.degrees(math.atan2(x, y)))


def descendant_longitude(asc_lon: float) -> float:
    return norm360(asc_lon + 180.0)


def imum_coeli_longitude(mc_lon: float) -> float:
    return norm360(mc_lon + 180.0)


def angle_payload(lon: float) -> dict[str, Any]:
    return {
        "sign": sign_from_longitude(lon),
        "eclipticLongitudeDeg": round(lon, 6),
        "degreeInSign": round(norm360(lon) % 30.0, 6),
    }
