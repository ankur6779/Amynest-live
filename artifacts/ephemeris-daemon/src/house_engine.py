"""
HouseEngine — cusp systems + planet house placement.

Implemented: whole_sign, equal, porphyry, placidus
Factory: get_house_engine / HouseEngineFactory
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Protocol

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

HOUSE_SYSTEM_WHOLE_SIGN = "whole_sign"
HOUSE_SYSTEM_PLACIDUS = "placidus"
HOUSE_SYSTEM_EQUAL = "equal"
HOUSE_SYSTEM_PORPHYRY = "porphyry"

HOUSE_ROADMAP = (
    HOUSE_SYSTEM_WHOLE_SIGN,
    HOUSE_SYSTEM_PLACIDUS,
    HOUSE_SYSTEM_EQUAL,
    HOUSE_SYSTEM_PORPHYRY,
)

DEFAULT_HOUSE_SYSTEM = HOUSE_SYSTEM_WHOLE_SIGN

PLANET_IDS = (
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "rahu",
    "ketu",
)


def norm360(x: float) -> float:
    v = x % 360.0
    return v + 360.0 if v < 0 else v


def mean_obliquity_deg(jd_tt: float) -> float:
    t = (jd_tt - 2451545.0) / 36525.0
    return 23.439291 - 0.0130042 * t


def sign_from_longitude(lon: float) -> str:
    return SIGNS[int(norm360(lon) / 30.0) % 12]


def _shortest_arc(a: float, b: float) -> float:
    """Forward arc from a → b in [0, 360)."""
    return norm360(b - a)


@dataclass(frozen=True)
class HouseCusp:
    house: int
    sign: str
    start_longitude_deg: float
    end_longitude_deg: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "house": self.house,
            "sign": self.sign,
            "startLongitudeDeg": round(self.start_longitude_deg, 6),
            "endLongitudeDeg": round(self.end_longitude_deg, 6),
        }


@dataclass(frozen=True)
class HouseComputeInput:
    julian_day: float
    latitude: float
    longitude: float
    ascendant_longitude: float
    midheaven_longitude: float | None = None
    ramc_deg: float | None = None
    obliquity_deg: float | None = None
    house_system: str = DEFAULT_HOUSE_SYSTEM


@dataclass(frozen=True)
class HouseResult:
    system: str
    cusps: list[HouseCusp]
    fallback_from: str | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "system": self.system,
            "cusps": [c.to_dict() for c in self.cusps],
        }
        if self.fallback_from:
            out["fallbackFrom"] = self.fallback_from
        return out


class HouseEngine(Protocol):
    def system_id(self) -> str: ...

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult: ...


def _cusps_from_starts(starts: list[float], system: str) -> HouseResult:
    if len(starts) != 12:
        raise ValueError("expected 12 cusp starts")
    starts = [norm360(s) for s in starts]
    cusps: list[HouseCusp] = []
    for i in range(12):
        start = starts[i]
        end = starts[(i + 1) % 12]
        # Represent end as start+arc for display when no wrap issues
        arc = _shortest_arc(start, end)
        end_display = start + arc
        if end_display > 360.0:
            end_display = 360.0 if abs(end_display - 360.0) < 1e-9 else end_display
        # Prefer normalized end longitude on ecliptic for consumers
        cusps.append(
            HouseCusp(
                house=i + 1,
                sign=sign_from_longitude(start),
                start_longitude_deg=start,
                end_longitude_deg=end if end != 0.0 or i != 11 else 360.0,
            )
        )
    # Fix house 12 end when wrapping to house 1 at 0
    fixed: list[HouseCusp] = []
    for i, c in enumerate(cusps):
        nxt = starts[(i + 1) % 12]
        end = nxt if nxt != 0.0 or i != 11 else (360.0 if starts[0] == 0.0 else nxt)
        # Always store next cusp longitude (0–360); use 360 only when next is 0 and start>0
        if nxt < 1e-9 and c.start_longitude_deg > 0:
            end_out = 360.0
        else:
            end_out = nxt
        fixed.append(
            HouseCusp(
                house=c.house,
                sign=c.sign,
                start_longitude_deg=round(c.start_longitude_deg, 6),
                end_longitude_deg=round(end_out, 6),
            )
        )
    return HouseResult(system=system, cusps=fixed)


class WholeSignHouseEngine:
    def system_id(self) -> str:
        return HOUSE_SYSTEM_WHOLE_SIGN

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult:
        asc = norm360(float(inp.ascendant_longitude))
        asc_sign_index = int(asc / 30.0) % 12
        starts = [float(((asc_sign_index + h) % 12) * 30) for h in range(12)]
        result = _cusps_from_starts(starts, self.system_id())
        if result.cusps[0].sign != sign_from_longitude(asc):
            raise ValueError("ascendant sign must equal House 1 sign")
        for c in result.cusps:
            span = c.end_longitude_deg - c.start_longitude_deg
            if c.end_longitude_deg == 360.0 and c.start_longitude_deg == 330.0:
                span = 30.0
            elif c.end_longitude_deg < c.start_longitude_deg:
                span = (360.0 - c.start_longitude_deg) + c.end_longitude_deg
            if abs(span - 30.0) > 1e-6:
                raise ValueError(f"whole_sign house {c.house} span not 30°: {span}")
        return result


class EqualHouseEngine:
    """House 1 cusp = exact Ascendant; each next cusp +30°."""

    def system_id(self) -> str:
        return HOUSE_SYSTEM_EQUAL

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult:
        asc = norm360(float(inp.ascendant_longitude))
        starts = [norm360(asc + 30.0 * h) for h in range(12)]
        return _cusps_from_starts(starts, self.system_id())


class PorphyryHouseEngine:
    """Trisect ASC–MC and ASC–IC quadrants."""

    def system_id(self) -> str:
        return HOUSE_SYSTEM_PORPHYRY

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult:
        if inp.midheaven_longitude is None:
            raise ValueError("porphyry requires midheaven_longitude")
        asc = norm360(float(inp.ascendant_longitude))
        mc = norm360(float(inp.midheaven_longitude))
        dsc = norm360(asc + 180.0)
        ic = norm360(mc + 180.0)

        def trisect(a: float, b: float) -> tuple[float, float]:
            arc = _shortest_arc(a, b)
            return norm360(a + arc / 3.0), norm360(a + 2.0 * arc / 3.0)

        # cusps: 1=ASC, 4=IC, 7=DSC, 10=MC; trisect each quadrant
        c2, c3 = trisect(asc, ic)
        c5, c6 = trisect(ic, dsc)
        c8, c9 = trisect(dsc, mc)
        c11, c12 = trisect(mc, asc)

        starts = [asc, c2, c3, ic, c5, c6, dsc, c8, c9, mc, c11, c12]
        return _cusps_from_starts(starts, self.system_id())


class PlacidusHouseEngine:
    """
    Placidus — semi-arc house system.
    Falls back to Porphyry for polar latitudes (|lat| >= 66.5°) or failed iteration.
    """

    def system_id(self) -> str:
        return HOUSE_SYSTEM_PLACIDUS

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult:
        if inp.midheaven_longitude is None or inp.ramc_deg is None:
            raise ValueError("placidus requires midheaven_longitude and ramc_deg")
        lat = float(inp.latitude)
        if abs(lat) >= 66.5:
            return self._porphyry_fallback(inp)

        obl = (
            float(inp.obliquity_deg)
            if inp.obliquity_deg is not None
            else mean_obliquity_deg(inp.julian_day)
        )
        ramc = norm360(float(inp.ramc_deg))
        asc = norm360(float(inp.ascendant_longitude))
        mc = norm360(float(inp.midheaven_longitude))
        dsc = norm360(asc + 180.0)
        ic = norm360(mc + 180.0)

        try:
            # Fractions of diurnal semi-arc from MC (eastern) / IC side (western)
            c11 = self._cusp_from_sa(ramc, lat, obl, fraction=1.0 / 3.0, eastern=True)
            c12 = self._cusp_from_sa(ramc, lat, obl, fraction=2.0 / 3.0, eastern=True)
            c2 = self._cusp_from_sa(ramc, lat, obl, fraction=2.0 / 3.0, eastern=False)
            c3 = self._cusp_from_sa(ramc, lat, obl, fraction=1.0 / 3.0, eastern=False)
        except (ValueError, ZeroDivisionError, OverflowError):
            return self._porphyry_fallback(inp)

        c5 = norm360(c11 + 180.0)
        c6 = norm360(c12 + 180.0)
        c8 = norm360(c2 + 180.0)
        c9 = norm360(c3 + 180.0)
        starts = [asc, c2, c3, ic, c5, c6, dsc, c8, c9, mc, c11, c12]
        return _cusps_from_starts(starts, self.system_id())

    @staticmethod
    def _porphyry_fallback(inp: HouseComputeInput) -> HouseResult:
        fb = PorphyryHouseEngine().compute_houses(inp)
        return HouseResult(
            system=HOUSE_SYSTEM_PORPHYRY,
            cusps=fb.cusps,
            fallback_from=HOUSE_SYSTEM_PLACIDUS,
        )

    @staticmethod
    def _cusp_from_sa(
        ramc: float,
        lat: float,
        obl: float,
        *,
        fraction: float,
        eastern: bool,
    ) -> float:
        """Iterate to Placidus cusp at `fraction` of the diurnal semi-arc."""
        lat_r = math.radians(lat)
        obl_r = math.radians(obl)
        # Initial RA guess
        ra = norm360(ramc + (30.0 if eastern else -30.0) * (3.0 * fraction))
        lon = midheaven_from_ra(ra, obl)
        for _ in range(20):
            lon_r = math.radians(lon)
            sin_dec = math.sin(obl_r) * math.sin(lon_r)
            sin_dec = max(-1.0, min(1.0, sin_dec))
            dec = math.asin(sin_dec)
            tan_lat = math.tan(lat_r)
            tan_dec = math.tan(dec)
            prod = tan_lat * tan_dec
            if abs(prod) > 1.0:
                raise ValueError("placidus undefined (circumpolar)")
            ad = math.asin(prod)
            dsa = (math.pi / 2.0) + ad  # diurnal semi-arc (radians)
            delta = fraction * dsa
            next_ra = math.radians(ramc) + delta if eastern else math.radians(ramc) - delta
            ra = norm360(math.degrees(next_ra))
            lon2 = midheaven_from_ra(ra, obl)
            if abs(((lon2 - lon + 180) % 360) - 180) < 1e-5:
                return norm360(lon2)
            lon = lon2
        return norm360(lon)


def midheaven_from_ra(ra_deg: float, obl_deg: float) -> float:
    """Ecliptic longitude corresponding to equatorial RA (same as MC formula)."""
    ra_r = math.radians(norm360(ra_deg))
    obl_r = math.radians(obl_deg)
    return norm360(
        math.degrees(math.atan2(math.sin(ra_r), math.cos(ra_r) * math.cos(obl_r)))
    )


# --- Factory -----------------------------------------------------------------

_ENGINES: dict[str, HouseEngine] = {
    HOUSE_SYSTEM_WHOLE_SIGN: WholeSignHouseEngine(),
    HOUSE_SYSTEM_PLACIDUS: PlacidusHouseEngine(),
    HOUSE_SYSTEM_EQUAL: EqualHouseEngine(),
    HOUSE_SYSTEM_PORPHYRY: PorphyryHouseEngine(),
}


class HouseEngineFactory:
    @staticmethod
    def create(system: str | None = None) -> HouseEngine:
        return get_house_engine(system)


def get_house_engine(system: str | None = None) -> HouseEngine:
    key = (system or DEFAULT_HOUSE_SYSTEM).strip().lower()
    eng = _ENGINES.get(key)
    if eng is None:
        raise ValueError(f"unsupported house_system={system!r}")
    return eng


def compute_houses(
    *,
    julian_day: float,
    latitude: float,
    longitude: float,
    ascendant_longitude: float,
    house_system: str = DEFAULT_HOUSE_SYSTEM,
    midheaven_longitude: float | None = None,
    ramc_deg: float | None = None,
    obliquity_deg: float | None = None,
) -> HouseResult:
    eng = get_house_engine(house_system)
    return eng.compute_houses(
        HouseComputeInput(
            julian_day=julian_day,
            latitude=latitude,
            longitude=longitude,
            ascendant_longitude=ascendant_longitude,
            midheaven_longitude=midheaven_longitude,
            ramc_deg=ramc_deg,
            obliquity_deg=obliquity_deg,
            house_system=eng.system_id(),
        )
    )


def planet_house_number(*, planet_longitude: float, ascendant_longitude: float) -> int:
    """Whole-sign house number 1–12 for a planet longitude."""
    asc_idx = int(norm360(ascendant_longitude) / 30.0) % 12
    planet_idx = int(norm360(planet_longitude) / 30.0) % 12
    return ((planet_idx - asc_idx) % 12) + 1


def build_planet_house_map(
    planet_longitudes: dict[str, float],
    *,
    ascendant_longitude: float,
) -> dict[str, int]:
    out: dict[str, int] = {}
    for pid in PLANET_IDS:
        if pid not in planet_longitudes:
            continue
        house = planet_house_number(
            planet_longitude=planet_longitudes[pid],
            ascendant_longitude=ascendant_longitude,
        )
        if house < 1 or house > 12:
            raise ValueError(f"planet {pid} house out of range: {house}")
        out[pid] = house
    return out


def map_planets_to_cusp_intervals(
    planet_longitudes: dict[str, float],
    cusps: list[HouseCusp],
) -> dict[str, int]:
    """Place planets into houses by cusp longitude intervals (unequal systems)."""
    starts = [norm360(c.start_longitude_deg) for c in cusps]
    out: dict[str, int] = {}
    for pid, lon in planet_longitudes.items():
        if pid not in PLANET_IDS and pid not in planet_longitudes:
            continue
        L = norm360(lon)
        placed = False
        for i in range(12):
            a = starts[i]
            b = starts[(i + 1) % 12]
            if a <= b:
                if a <= L < b or (i == 11 and L == a):
                    out[pid] = i + 1
                    placed = True
                    break
                # include end of last degree into house 12 when b wraps oddly
                if b < a:  # shouldn't happen in this branch
                    pass
            else:
                # wrap across 0°
                if L >= a or L < b:
                    out[pid] = i + 1
                    placed = True
                    break
        if not placed:
            # Assign to house whose start is closest backward
            best = 1
            best_dist = 999.0
            for i, a in enumerate(starts):
                d = _shortest_arc(a, L)
                if d < best_dist:
                    best_dist = d
                    best = i + 1
            out[pid] = best
    return out


def houses_payload_and_map(
    *,
    julian_day: float,
    latitude: float,
    longitude: float,
    ascendant_longitude: float,
    planet_longitudes: dict[str, float],
    house_system: str = DEFAULT_HOUSE_SYSTEM,
    midheaven_longitude: float | None = None,
    ramc_deg: float | None = None,
    obliquity_deg: float | None = None,
) -> tuple[dict[str, Any], dict[str, int]]:
    result = compute_houses(
        julian_day=julian_day,
        latitude=latitude,
        longitude=longitude,
        ascendant_longitude=ascendant_longitude,
        house_system=house_system,
        midheaven_longitude=midheaven_longitude,
        ramc_deg=ramc_deg,
        obliquity_deg=obliquity_deg,
    )
    if result.system == HOUSE_SYSTEM_WHOLE_SIGN:
        planet_map = build_planet_house_map(
            planet_longitudes, ascendant_longitude=ascendant_longitude
        )
    else:
        planet_map = map_planets_to_cusp_intervals(planet_longitudes, result.cusps)
    _validate_planet_map(planet_map)
    return result.to_dict(), planet_map


def _validate_planet_map(planet_map: dict[str, int]) -> None:
    for pid, house in planet_map.items():
        if house < 1 or house > 12:
            raise ValueError(f"planet {pid} invalid house {house}")
