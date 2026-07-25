"""Configuration-driven engine identity (no hardcoded Skyfield in callers)."""

from __future__ import annotations

import os


def env(name: str, default: str) -> str:
    return (os.environ.get(name) or default).strip()


def engine_provider() -> str:
    """skyfield | swisseph | mock"""
    return env("ENGINE_PROVIDER", "skyfield").lower()


def engine_name() -> str:
    return env("ENGINE_NAME", "skyfield-jpl")


def engine_version() -> str:
    return env("ENGINE_VERSION", "1.0.0")


def kernel_name() -> str:
    """Display label (DE440 / DE441)."""
    return env("KERNEL_NAME", "DE440")


def full_engine_version(name: str | None = None, version: str | None = None) -> str:
    return f"{name or engine_name()}/{version or engine_version()}"
