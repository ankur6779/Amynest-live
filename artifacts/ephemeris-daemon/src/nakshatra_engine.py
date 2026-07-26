"""
NakshatraEngine — 27 lunar mansions + pada + Vimshottari lord.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .house_engine import norm360

NAKSHATRA_SPAN_DEG = 360.0 / 27.0  # 13°20'
PADA_SPAN_DEG = NAKSHATRA_SPAN_DEG / 4.0  # 3°20'

# Vimshottari order starting at Ashwini
NAKSHATRA_LORDS = (
    "Ketu",
    "Venus",
    "Sun",
    "Moon",
    "Mars",
    "Rahu",
    "Jupiter",
    "Saturn",
    "Mercury",
)

NAKSHATRA_NAMES = (
    "Ashwini",
    "Bharani",
    "Krittika",
    "Rohini",
    "Mrigashira",
    "Ardra",
    "Punarvasu",
    "Pushya",
    "Ashlesha",
    "Magha",
    "Purva Phalguni",
    "Uttara Phalguni",
    "Hasta",
    "Chitra",
    "Swati",
    "Vishakha",
    "Anuradha",
    "Jyeshtha",
    "Mula",
    "Purva Ashadha",
    "Uttara Ashadha",
    "Shravana",
    "Dhanishta",
    "Shatabhisha",
    "Purva Bhadrapada",
    "Uttara Bhadrapada",
    "Revati",
)

NAKSHATRA_BODIES = (
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "rahu",
    "ketu",
)


@dataclass(frozen=True)
class NakshatraPlacement:
    name: str
    index: int  # 0–26
    pada: int  # 1–4
    lord: str
    longitude_in_nakshatra_deg: float
    start_longitude_deg: float
    end_longitude_deg: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "index": self.index,
            "pada": self.pada,
            "lord": self.lord,
            "longitudeInNakshatraDeg": round(self.longitude_in_nakshatra_deg, 6),
            "startLongitudeDeg": round(self.start_longitude_deg, 6),
            "endLongitudeDeg": round(self.end_longitude_deg, 6),
        }


class NakshatraEngine:
    def lookup(self, chart_longitude_deg: float) -> NakshatraPlacement:
        lon = norm360(chart_longitude_deg)
        idx = int(lon / NAKSHATRA_SPAN_DEG) % 27
        start = idx * NAKSHATRA_SPAN_DEG
        end = start + NAKSHATRA_SPAN_DEG
        within = lon - start
        pada = int(within / PADA_SPAN_DEG) + 1
        if pada < 1:
            pada = 1
        if pada > 4:
            pada = 4
        lord = NAKSHATRA_LORDS[idx % 9]
        return NakshatraPlacement(
            name=NAKSHATRA_NAMES[idx],
            index=idx,
            pada=pada,
            lord=lord,
            longitude_in_nakshatra_deg=within,
            start_longitude_deg=start,
            end_longitude_deg=end if end < 360.0 else 360.0,
        )

    def map_bodies(self, longitudes: dict[str, float]) -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        for body in NAKSHATRA_BODIES:
            if body not in longitudes:
                continue
            out[body] = self.lookup(longitudes[body]).to_dict()
        return out


def get_nakshatra_engine() -> NakshatraEngine:
    return NakshatraEngine()
