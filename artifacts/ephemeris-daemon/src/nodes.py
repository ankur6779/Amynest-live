"""
Lunar nodes — Rahu (North) / Ketu (South).

Default: mean node. True node reserved for a future drop-in.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .engine_config import env
from .house_engine import norm360

NODE_MEAN = "mean"
NODE_TRUE = "true"
SUPPORTED_NODE_TYPES = (NODE_MEAN, NODE_TRUE)


def node_type() -> str:
    value = env("NODE_TYPE", NODE_MEAN).lower()
    if value not in SUPPORTED_NODE_TYPES:
        raise ValueError(f"unsupported NODE_TYPE={value!r}")
    return value


@dataclass(frozen=True)
class NodeLongitudes:
    rahu_tropical: float
    ketu_tropical: float
    node_type: str


class NodeEngine(Protocol):
    def compute(self, jd_tt: float) -> NodeLongitudes: ...


class MeanNodeEngine:
    """Meeus / IAU-style mean lunar ascending node (always retrograde by convention)."""

    def compute(self, jd_tt: float) -> NodeLongitudes:
        t = (jd_tt - 2451545.0) / 36525.0
        # Mean longitude of the ascending node (degrees)
        omega = (
            125.0445479
            - 1934.1362891 * t
            + 0.0020754 * t * t
            + (t * t * t) / 467441.0
            - (t**4) / 60616000.0
        )
        rahu = norm360(omega)
        ketu = norm360(rahu + 180.0)
        return NodeLongitudes(rahu_tropical=rahu, ketu_tropical=ketu, node_type=NODE_MEAN)


class TrueNodeEngine:
    def compute(self, jd_tt: float) -> NodeLongitudes:
        raise NotImplementedError(
            "True Node not implemented — set NODE_TYPE=mean (default)"
        )


_ENGINES: dict[str, NodeEngine] = {
    NODE_MEAN: MeanNodeEngine(),
    NODE_TRUE: TrueNodeEngine(),
}


def get_node_engine(kind: str | None = None) -> NodeEngine:
    key = kind or node_type()
    eng = _ENGINES.get(key)
    if eng is None:
        raise ValueError(f"unsupported node type {key!r}")
    return eng


def compute_mean_nodes(jd_tt: float) -> NodeLongitudes:
    return MeanNodeEngine().compute(jd_tt)
