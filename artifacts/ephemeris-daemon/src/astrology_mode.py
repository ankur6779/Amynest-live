"""
AstrologyMode — vedic | western | auto (region-based).

Does not change Node APIs; resolved from daemon env / optional compute hint.
"""

from __future__ import annotations

import os

from .engine_config import env

ASTROLOGY_VEDIC = "vedic"
ASTROLOGY_WESTERN = "western"
ASTROLOGY_AUTO = "auto"

SUPPORTED_ASTROLOGY_MODES = (ASTROLOGY_VEDIC, ASTROLOGY_WESTERN, ASTROLOGY_AUTO)

# ISO-ish country codes treated as Vedic-default under AUTO
_VEDIC_REGIONS = frozenset({"IN", "IND", "INDIA", "NP", "NPL", "LK", "LKA", "BD", "BGD"})


def astrology_region() -> str:
    """Region for AUTO. Default IN preserves AmyNest Vedic/sidereal defaults."""
    return env("ASTROLOGY_REGION", "IN").upper()


def astrology_mode_raw() -> str:
    return env("ASTROLOGY_MODE", ASTROLOGY_AUTO).lower()


def resolve_astrology_mode(*, override: str | None = None) -> str:
    """
    Resolve concrete mode (vedic|western).
    override: optional per-request hint (does not require API route changes).
    """
    raw = (override or astrology_mode_raw()).strip().lower()
    if raw not in SUPPORTED_ASTROLOGY_MODES:
        raise ValueError(f"unsupported ASTROLOGY_MODE={raw!r}")
    if raw == ASTROLOGY_AUTO:
        region = astrology_region()
        if region in _VEDIC_REGIONS:
            return ASTROLOGY_VEDIC
        return ASTROLOGY_WESTERN
    return raw


def default_house_system_for_mode(mode: str) -> str:
    from .house_engine import HOUSE_SYSTEM_PLACIDUS, HOUSE_SYSTEM_WHOLE_SIGN

    if mode == ASTROLOGY_WESTERN:
        return HOUSE_SYSTEM_PLACIDUS
    return HOUSE_SYSTEM_WHOLE_SIGN


def resolve_house_system(astrology_mode: str) -> str:
    explicit = (os.environ.get("HOUSE_SYSTEM") or "").strip().lower()
    if explicit:
        return explicit
    return default_house_system_for_mode(astrology_mode)
