"""
SkyfieldEngine — concrete EnginePort using local NASA JPL BSP.
Hidden behind EngineFactory; Node never imports this module.
"""

from __future__ import annotations

import hashlib
import os
import time
from pathlib import Path
from typing import Any

from skyfield.api import Loader, wgs84
from skyfield.jpllib import SpiceKernel

from .chart_service import build_astronomy
from .engine_config import engine_name, engine_version, full_engine_version, kernel_name
from .engine_port import (
    ComputeInput,
    ComputeResult,
    EngineHealth,
    EphemerisLoadError,
)


def _memory_mb() -> float | None:
    try:
        import resource

        rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        if rss > 10_000_000:  # likely bytes (macOS)
            return round(rss / (1024 * 1024), 1)
        return round(rss / 1024, 1)
    except Exception:
        return None


def _sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return f"sha256:{h.hexdigest()}"


class SkyfieldEngine:
    def __init__(self, data_dir: str | Path | None = None) -> None:
        self._data_dir = Path(
            data_dir
            or os.environ.get("BIRTH_SKY_EPHEMERIS_DATA_DIR")
            or Path(__file__).resolve().parent.parent / "data"
        )
        self._loader: Loader | None = None
        self._eph = None
        self._ts = None
        self._kernel_file = ""
        self._kernel_fingerprint = ""
        self._ready = False
        self._started = time.time()
        self._charts = 0
        self._latencies: list[float] = []
        self._kernel_warm = False

    def engine_name(self) -> str:
        return engine_name()

    def engine_version(self) -> str:
        return engine_version()

    def full_engine_version(self) -> str:
        return full_engine_version(self.engine_name(), self.engine_version())

    def kernel_name(self) -> str:
        configured = kernel_name()
        if self._kernel_file:
            stem = Path(self._kernel_file).stem.upper()
            if configured and configured.upper() in ("DE440", "DE441"):
                return configured.upper()
            return stem or configured
        return configured

    def calculation_source(self) -> str:
        return "Skyfield"

    def quality(self) -> str:
        return "high"

    def ready(self) -> bool:
        return self._ready and self._eph is not None and self._ts is not None

    def kernel_fingerprint(self) -> str:
        return self._kernel_fingerprint

    def load(self) -> None:
        if self._ready:
            return
        self._data_dir.mkdir(parents=True, exist_ok=True)
        kernel_path = self._resolve_kernel_path()
        self._loader = Loader(str(self._data_dir), verbose=False)
        self._ts = self._loader.timescale(builtin=True)
        self._eph = SpiceKernel(str(kernel_path.resolve()))
        self._kernel_file = kernel_path.name
        self._kernel_fingerprint = _sha256_file(kernel_path)
        if "441" in kernel_path.name:
            os.environ.setdefault("KERNEL_NAME", "DE441")
        else:
            os.environ.setdefault("KERNEL_NAME", "DE440")
        self._ready = True
        self._kernel_warm = True
        self._started = time.time()

    def _resolve_kernel_path(self) -> Path:
        preferred = os.environ.get("BIRTH_SKY_JPL_KERNEL", "").strip()
        candidates = []
        if preferred:
            candidates.append(self._data_dir / preferred)
        kn = kernel_name().upper()
        if kn == "DE441":
            candidates.extend(
                [self._data_dir / "de441.bsp", self._data_dir / "de440.bsp"]
            )
        else:
            candidates.extend(
                [self._data_dir / "de440.bsp", self._data_dir / "de441.bsp"]
            )
        for path in candidates:
            if path.is_file() and path.stat().st_size > 0:
                return path
        raise EphemerisLoadError(
            "No local JPL BSP found. Run scripts/fetch-jpl-ephemeris.sh "
            f"to place de440.bsp (or de441.bsp) in {self._data_dir}"
        )

    def health(self) -> EngineHealth:
        avg = (
            sum(self._latencies) / len(self._latencies) if self._latencies else None
        )
        return EngineHealth(
            ready=self.ready(),
            engine=self.engine_name(),
            engine_version=self.engine_version(),
            kernel=self.kernel_name(),
            loaded=self.ready(),
            uptime_seconds=time.time() - self._started,
            charts_computed=self._charts,
            average_latency_ms=round(avg, 2) if avg is not None else None,
            memory_mb=_memory_mb(),
            kernel_fingerprint=self._kernel_fingerprint or None,
        )

    def compute_chart(self, inp: ComputeInput) -> ComputeResult:
        if not self.ready():
            raise EphemerisLoadError("ephemeris_not_ready")
        assert self._eph is not None and self._ts is not None
        t0 = time.perf_counter()
        astronomy, mode = build_astronomy(
            eph=self._eph,
            ts=self._ts,
            inp=inp,
            engine_version=self.full_engine_version(),
            bsp_kernel=self._kernel_file,
            wgs84=wgs84,
            quality=self.quality(),
            calculation_source=self.calculation_source(),
            kernel_label=self.kernel_name(),
            kernel_fingerprint=self._kernel_fingerprint,
        )
        ms = (time.perf_counter() - t0) * 1000
        self._latencies.append(ms)
        if len(self._latencies) > 2000:
            self._latencies = self._latencies[-2000:]
        self._charts += 1
        astronomy.setdefault("metadata", {})
        astronomy["metadata"]["cacheHit"] = bool(self._kernel_warm)
        astronomy["metadata"]["computeLatencyMs"] = round(ms, 2)
        return ComputeResult(
            mode=mode,
            engine_version=self.full_engine_version(),
            astronomy=astronomy,
        )


def get_engine() -> Any:
    from .engine_factory import create_engine

    eng = create_engine()
    eng.load()
    return eng
