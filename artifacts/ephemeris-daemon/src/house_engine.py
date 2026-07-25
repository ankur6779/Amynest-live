"""
HouseEngine — production house cusp + planet placement boundary.

Implemented: whole_sign
Roadmap stubs: placidus, equal, porphyry

Node never imports this module; chart_service calls via factory helpers.
"""

from __future__ import annotations

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
)


def norm360(x: float) -> float:
    v = x % 360.0
    return v + 360.0 if v < 0 else v


def sign_from_longitude(lon: float) -> str:
    return SIGNS[int(norm360(lon) / 30.0) % 12]


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
            "startLongitudeDeg": self.start_longitude_deg,
            "endLongitudeDeg": self.end_longitude_deg,
        }


@dataclass(frozen=True)
class HouseComputeInput:
    julian_day: float
    latitude: float
    longitude: float
    ascendant_longitude: float
    house_system: str = DEFAULT_HOUSE_SYSTEM


@dataclass(frozen=True)
class HouseResult:
    system: str
    cusps: list[HouseCusp]

    def to_dict(self) -> dict[str, Any]:
        return {
            "system": self.system,
            "cusps": [c.to_dict() for c in self.cusps],
        }


class HouseEngine(Protocol):
    def system_id(self) -> str: ...

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult: ...


class WholeSignHouseEngine:
    """
    Whole Sign Houses:

    - House 1 = entire Ascendant sign (sign start → +30°)
    - Each subsequent house = next tropical sign (+30°)
    - Planet house = ((planet_sign_index - asc_sign_index) mod 12) + 1
    """

    def system_id(self) -> str:
        return HOUSE_SYSTEM_WHOLE_SIGN

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult:
        asc = norm360(float(inp.ascendant_longitude))
        asc_sign_index = int(asc / 30.0) % 12
        cusps: list[HouseCusp] = []
        for house in range(1, 13):
            sign_index = (asc_sign_index + house - 1) % 12
            start = float(sign_index * 30)
            end = start + 30.0
            # Keep span exactly 30°; use 360 for the Aries→0 wrap edge of Pisces house
            end_out = 360.0 if end >= 360.0 else end
            cusps.append(
                HouseCusp(
                    house=house,
                    sign=SIGNS[sign_index],
                    start_longitude_deg=round(start, 6),
                    end_longitude_deg=round(end_out, 6),
                )
            )
        for c in cusps:
            span = c.end_longitude_deg - c.start_longitude_deg
            if abs(span - 30.0) > 1e-9:
                raise ValueError(f"whole_sign house {c.house} span not 30°: {span}")
        if cusps[0].sign != sign_from_longitude(asc):
            raise ValueError("ascendant sign must equal House 1 sign")
        if len(cusps) != 12:
            raise ValueError("whole_sign must return exactly 12 houses")
        return HouseResult(system=self.system_id(), cusps=cusps)


class PlacidusHouseEngine:
    def system_id(self) -> str:
        return HOUSE_SYSTEM_PLACIDUS

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult:
        raise NotImplementedError("HouseEngine placidus not implemented — roadmap only")


class EqualHouseEngine:
    def system_id(self) -> str:
        return HOUSE_SYSTEM_EQUAL

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult:
        raise NotImplementedError("HouseEngine equal not implemented — roadmap only")


class PorphyryHouseEngine:
    def system_id(self) -> str:
        return HOUSE_SYSTEM_PORPHYRY

    def compute_houses(self, inp: HouseComputeInput) -> HouseResult:
        raise NotImplementedError("HouseEngine porphyry not implemented — roadmap only")


_ENGINES: dict[str, HouseEngine] = {
    HOUSE_SYSTEM_WHOLE_SIGN: WholeSignHouseEngine(),
    HOUSE_SYSTEM_PLACIDUS: PlacidusHouseEngine(),
    HOUSE_SYSTEM_EQUAL: EqualHouseEngine(),
    HOUSE_SYSTEM_PORPHYRY: PorphyryHouseEngine(),
}


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
) -> HouseResult:
    """Facade matching the HouseEngine sprint contract."""
    eng = get_house_engine(house_system)
    return eng.compute_houses(
        HouseComputeInput(
            julian_day=julian_day,
            latitude=latitude,
            longitude=longitude,
            ascendant_longitude=ascendant_longitude,
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


def houses_payload_and_map(
    *,
    julian_day: float,
    latitude: float,
    longitude: float,
    ascendant_longitude: float,
    planet_longitudes: dict[str, float],
    house_system: str = DEFAULT_HOUSE_SYSTEM,
) -> tuple[dict[str, Any], dict[str, int]]:
    result = compute_houses(
        julian_day=julian_day,
        latitude=latitude,
        longitude=longitude,
        ascendant_longitude=ascendant_longitude,
        house_system=house_system,
    )
    if result.system != HOUSE_SYSTEM_WHOLE_SIGN:
        raise NotImplementedError(
            f"planet house map for {result.system} not implemented"
        )
    planet_map = build_planet_house_map(
        planet_longitudes, ascendant_longitude=ascendant_longitude
    )
    _validate_planet_map(planet_map)
    return result.to_dict(), planet_map


def _validate_planet_map(planet_map: dict[str, int]) -> None:
    for pid, house in planet_map.items():
        if house < 1 or house > 12:
            raise ValueError(f"planet {pid} invalid house {house}")
