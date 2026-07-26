"""
Vimshottari dasha — mahadasha + antardasha at birth (never estimated).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from .nakshatra_engine import (
    NAKSHATRA_LORDS,
    NAKSHATRA_SPAN_DEG,
    NakshatraEngine,
    NakshatraPlacement,
)

# Full Vimshottari cycle = 120 years
DASHA_YEARS: dict[str, float] = {
    "Ketu": 7.0,
    "Venus": 20.0,
    "Sun": 6.0,
    "Moon": 10.0,
    "Mars": 7.0,
    "Rahu": 18.0,
    "Jupiter": 16.0,
    "Saturn": 19.0,
    "Mercury": 17.0,
}

_LORD_ORDER = list(NAKSHATRA_LORDS)
_DAYS_PER_YEAR = 365.2425


@dataclass(frozen=True)
class DashaResult:
    payload: dict[str, Any]


def _years_to_delta(years: float) -> timedelta:
    return timedelta(days=years * _DAYS_PER_YEAR)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _antardasha_years(maha_lord: str, antar_lord: str) -> float:
    return DASHA_YEARS[maha_lord] * DASHA_YEARS[antar_lord] / 120.0


def _lords_from(start_lord: str) -> list[str]:
    i = _LORD_ORDER.index(start_lord)
    return _LORD_ORDER[i:] + _LORD_ORDER[:i]


class VimshottariDashaEngine:
    def compute(
        self,
        *,
        moon_chart_longitude: float,
        birth_utc: datetime,
        moon_nakshatra: NakshatraPlacement | None = None,
    ) -> dict[str, Any]:
        nak = moon_nakshatra or NakshatraEngine().lookup(moon_chart_longitude)
        progress = nak.longitude_in_nakshatra_deg / NAKSHATRA_SPAN_DEG
        progress = min(1.0, max(0.0, progress))
        maha_lord = nak.lord
        maha_full = DASHA_YEARS[maha_lord]
        elapsed_years = progress * maha_full
        balance_years = maha_full - elapsed_years

        maha_start = birth_utc - _years_to_delta(elapsed_years)
        maha_end = birth_utc + _years_to_delta(balance_years)

        # Walk antardashas from mahadasha start to locate birth instant
        antar_lord = maha_lord
        antar_start = maha_start
        antar_end = maha_end
        cursor = maha_start
        for lord in _lords_from(maha_lord):
            span = _antardasha_years(maha_lord, lord)
            end = min(cursor + _years_to_delta(span), maha_end)
            if cursor <= birth_utc <= end:
                antar_lord = lord
                antar_start = cursor
                antar_end = end
                break
            cursor = end

        remaining_maha = max(0.0, (maha_end - birth_utc).total_seconds() / (_DAYS_PER_YEAR * 86400))
        remaining_antar = max(
            0.0, (antar_end - birth_utc).total_seconds() / (_DAYS_PER_YEAR * 86400)
        )

        return {
            "system": "vimshottari",
            "mahadasha": {
                "lord": maha_lord,
                "startUtc": _iso(maha_start),
                "endUtc": _iso(maha_end),
                "fullYears": maha_full,
                "balanceYearsAtBirth": round(balance_years, 6),
            },
            "antardasha": {
                "lord": antar_lord,
                "startUtc": _iso(antar_start),
                "endUtc": _iso(antar_end),
            },
            "remainingBalance": {
                "mahadashaYears": round(remaining_maha, 6),
                "antardashaYears": round(remaining_antar, 6),
            },
            "birthNakshatra": nak.name,
            "birthNakshatraLord": nak.lord,
            "birthPada": nak.pada,
        }


def compute_vimshottari_dasha(
    *,
    moon_chart_longitude: float,
    birth_utc: datetime,
) -> dict[str, Any]:
    return VimshottariDashaEngine().compute(
        moon_chart_longitude=moon_chart_longitude,
        birth_utc=birth_utc,
    )
