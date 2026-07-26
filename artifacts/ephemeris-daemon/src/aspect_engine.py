"""
AspectEngine — major Ptolemaic aspects (+ quincunx) with orbs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .house_engine import norm360

ASPECT_BODIES = (
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
    "ascendant",
    "mc",
)

# name → (angle_deg, default_orb_deg)
ASPECT_DEFS: dict[str, tuple[float, float]] = {
    "conjunction": (0.0, 8.0),
    "sextile": (60.0, 6.0),
    "square": (90.0, 7.0),
    "trine": (120.0, 7.0),
    "quincunx": (150.0, 3.0),
    "opposition": (180.0, 8.0),
}


@dataclass(frozen=True)
class AspectHit:
    planet_a: str
    planet_b: str
    aspect: str
    angle: float
    orb: float
    exactness: float  # 1.0 = exact, 0.0 = at orb edge

    def to_dict(self) -> dict[str, Any]:
        return {
            "planetA": self.planet_a,
            "planetB": self.planet_b,
            "aspect": self.aspect,
            "angle": self.angle,
            "orb": round(self.orb, 4),
            "exactness": round(self.exactness, 4),
        }


def _sep(a: float, b: float) -> float:
    d = abs(norm360(a) - norm360(b)) % 360.0
    return d if d <= 180.0 else 360.0 - d


class AspectEngine:
    def compute(
        self,
        longitudes: dict[str, float],
        *,
        bodies: tuple[str, ...] = ASPECT_BODIES,
    ) -> list[dict[str, Any]]:
        ids = [b for b in bodies if b in longitudes]
        hits: list[AspectHit] = []
        for i, a in enumerate(ids):
            for b in ids[i + 1 :]:
                sep = _sep(longitudes[a], longitudes[b])
                for name, (angle, max_orb) in ASPECT_DEFS.items():
                    orb = abs(sep - angle)
                    if orb <= max_orb:
                        exactness = 1.0 - (orb / max_orb) if max_orb > 0 else 1.0
                        hits.append(
                            AspectHit(
                                planet_a=a,
                                planet_b=b,
                                aspect=name,
                                angle=angle,
                                orb=orb,
                                exactness=max(0.0, exactness),
                            )
                        )
                        break
        hits.sort(key=lambda h: (-h.exactness, h.orb, h.planet_a, h.planet_b))
        return [h.to_dict() for h in hits]


def get_aspect_engine() -> AspectEngine:
    return AspectEngine()


def aspect_summary_lines(aspects: list[dict[str, Any]], *, limit: int = 12) -> list[str]:
    """Human labels for AI facts, e.g. 'Sun Trine Jupiter'."""
    out: list[str] = []
    for a in aspects[:limit]:
        pa = str(a["planetA"]).replace("_", " ").title()
        pb = str(a["planetB"]).replace("_", " ").title()
        asp = str(a["aspect"]).title()
        out.append(f"{pa} {asp} {pb}")
    return out
