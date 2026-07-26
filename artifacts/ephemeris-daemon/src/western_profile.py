"""WesternBirthProfile — reusable chart summary for AI / clients."""

from __future__ import annotations

from typing import Any

from .aspect_engine import aspect_summary_lines

ELEMENTS = {
    "Aries": "fire",
    "Leo": "fire",
    "Sagittarius": "fire",
    "Taurus": "earth",
    "Virgo": "earth",
    "Capricorn": "earth",
    "Gemini": "air",
    "Libra": "air",
    "Aquarius": "air",
    "Cancer": "water",
    "Scorpio": "water",
    "Pisces": "water",
}

MODALITIES = {
    "Aries": "cardinal",
    "Cancer": "cardinal",
    "Libra": "cardinal",
    "Capricorn": "cardinal",
    "Taurus": "fixed",
    "Leo": "fixed",
    "Scorpio": "fixed",
    "Aquarius": "fixed",
    "Gemini": "mutable",
    "Virgo": "mutable",
    "Sagittarius": "mutable",
    "Pisces": "mutable",
}

_PROFILE_BODIES = (
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


def build_western_birth_profile(
    *,
    planet_degrees: dict[str, dict[str, Any]],
    ascendant: dict[str, Any] | None,
    midheaven: dict[str, Any] | None,
    planet_house_map: dict[str, int] | None,
    house_system: str | None,
    zodiac_mode: str,
    aspects: list[dict[str, Any]],
) -> dict[str, Any]:
    def body(key: str) -> dict[str, Any] | None:
        p = planet_degrees.get(key)
        if not p:
            return None
        return {
            "sign": p.get("sign"),
            "longitudeDeg": p.get("eclipticLongitudeDeg"),
            "house": (planet_house_map or {}).get(key),
            "retrograde": bool(p.get("retrograde")),
        }

    signs = []
    for key in _PROFILE_BODIES:
        p = planet_degrees.get(key)
        if p and p.get("sign"):
            signs.append(str(p["sign"]))
    if ascendant and ascendant.get("sign"):
        signs.append(str(ascendant["sign"]))

    element_counts = {"fire": 0, "earth": 0, "air": 0, "water": 0}
    modality_counts = {"cardinal": 0, "fixed": 0, "mutable": 0}
    for s in signs:
        element_counts[ELEMENTS.get(s, "fire")] += 1
        modality_counts[MODALITIES.get(s, "cardinal")] += 1

    dominant_element = max(element_counts, key=lambda k: element_counts[k])
    dominant_modality = max(modality_counts, key=lambda k: modality_counts[k])

    # Hemisphere / quadrant distribution by house
    dist = {
        "angular": 0,  # 1,4,7,10
        "succedent": 0,  # 2,5,8,11
        "cadent": 0,  # 3,6,9,12
    }
    for h in (planet_house_map or {}).values():
        if h in (1, 4, 7, 10):
            dist["angular"] += 1
        elif h in (2, 5, 8, 11):
            dist["succedent"] += 1
        else:
            dist["cadent"] += 1

    return {
        "sun": body("sun"),
        "moon": body("moon"),
        "ascendant": (
            {
                "sign": ascendant.get("sign"),
                "longitudeDeg": ascendant.get("eclipticLongitudeDeg"),
            }
            if ascendant
            else None
        ),
        "mc": (
            {
                "sign": midheaven.get("sign"),
                "longitudeDeg": midheaven.get("eclipticLongitudeDeg"),
            }
            if midheaven
            else None
        ),
        "dominantElement": dominant_element,
        "dominantModality": dominant_modality,
        "elementCounts": element_counts,
        "modalityCounts": modality_counts,
        "houseSystem": house_system,
        "zodiacMode": zodiac_mode,
        "planetDistribution": dist,
        "aspectSummary": aspect_summary_lines(aspects, limit=12),
        "aspectCount": len(aspects),
    }
