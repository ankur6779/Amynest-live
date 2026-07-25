"""
HTTP JSON ephemeris daemon — localhost only.

Depends only on EnginePort (via EngineFactory). Never hardcodes Skyfield.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import sys
import time
from typing import Any

from aiohttp import web

from .chart_service import ChartError
from .engine_factory import create_engine
from .engine_port import ComputeInput, EnginePort, EphemerisLoadError
from .house_engine import HOUSE_ROADMAP

LOG = logging.getLogger("ephemeris-daemon")
TELEMETRY = logging.getLogger("ephemeris-daemon.telemetry")

ENGINE: EnginePort | None = None
STARTED_AT = time.time()


def _json_error(status: int, code: str, message: str) -> web.Response:
    return web.json_response(
        {"ok": False, "error": code, "message": message},
        status=status,
    )


def _health_payload(eng: EnginePort | None, *, require_ready: bool) -> dict[str, Any]:
    if eng is None:
        return {
            "ok": not require_ready,
            "ready": False,
            "engine": None,
            "engineVersion": None,
            "kernel": None,
            "loaded": False,
            "uptimeSeconds": round(time.time() - STARTED_AT, 1),
            "chartsComputed": 0,
            "averageLatencyMs": None,
            "memoryMB": None,
            "houseEngineRoadmap": list(HOUSE_ROADMAP),
        }
    h = eng.health()
    body = h.to_dict()
    body["ok"] = h.ready if require_ready else True
    body["status"] = "ready" if h.ready else "not_ready"
    # Compat aliases for older Node parsers
    body["bspKernel"] = h.kernel
    body["engineName"] = h.engine
    body["houseEngineRoadmap"] = list(HOUSE_ROADMAP)
    return body


async def healthz(_: web.Request) -> web.Response:
    body = _health_payload(ENGINE, require_ready=False)
    body["ok"] = True
    body["status"] = "up"
    return web.json_response(body)


async def readyz(_: web.Request) -> web.Response:
    body = _health_payload(ENGINE, require_ready=True)
    if not body.get("ready"):
        return web.json_response(
            {
                **body,
                "ok": False,
                "error": "not_ready",
                "message": "ephemeris kernel not loaded",
            },
            status=503,
        )
    return web.json_response(body)


def _check_auth(request: web.Request) -> web.Response | None:
    token = os.environ.get("BIRTH_SKY_EPHEMERIS_TOKEN", "").strip()
    if not token:
        return None
    header = request.headers.get("Authorization", "")
    expected = f"Bearer {token}"
    if header != expected:
        return _json_error(401, "unauthorized", "invalid token")
    return None


async def compute(request: web.Request) -> web.Response:
    auth_err = _check_auth(request)
    if auth_err is not None:
        return auth_err
    eng = ENGINE
    if eng is None or not eng.ready():
        return _json_error(503, "ephemeris_unavailable", "ephemeris kernel not loaded")
    try:
        body: dict[str, Any] = await request.json()
    except Exception:
        return _json_error(400, "invalid_json", "request body must be JSON")

    try:
        inp = ComputeInput(
            birth_date=str(body.get("birthDate") or ""),
            birth_time=body.get("birthTime"),
            time_precision=str(body.get("timePrecision") or ""),
            lat=body.get("lat"),
            lon=body.get("lon"),
            timezone_offset_minutes=body.get("timezoneOffsetMinutes"),
        )
        if inp.birth_time is not None:
            inp.birth_time = str(inp.birth_time) if inp.birth_time else None
        if inp.lat is not None:
            inp.lat = float(inp.lat)
        if inp.lon is not None:
            inp.lon = float(inp.lon)
        if inp.timezone_offset_minutes is not None:
            inp.timezone_offset_minutes = int(inp.timezone_offset_minutes)

        chart_id = body.get("chartId") or body.get("snapshotId")
        if chart_id is not None:
            chart_id = str(chart_id)

        t0 = time.perf_counter()
        result = eng.compute_chart(inp)
        duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        meta = result.astronomy.get("metadata") or {}
        health = eng.health()
        latency_ms = meta.get("computeLatencyMs", duration_ms)
        cache_hit = bool(meta.get("cacheHit", False))
        TELEMETRY.info(
            "%s",
            json.dumps(
                {
                    "event": "ephemeris_compute",
                    "engine": eng.engine_name(),
                    "kernel": eng.kernel_name(),
                    "kernelFingerprint": meta.get("kernelFingerprint")
                    or health.kernel_fingerprint,
                    "latencyMs": latency_ms,
                    "cacheHit": cache_hit,
                    "chartId": chart_id,
                    "durationMs": duration_ms,
                    "mode": result.mode,
                    "engineVersion": result.engine_version,
                },
                separators=(",", ":"),
            ),
        )
        return web.json_response(
            {
                "ok": True,
                "mode": result.mode,
                "engineVersion": result.engine_version,
                "astronomy": result.astronomy,
            }
        )
    except ChartError as e:
        return _json_error(400, e.code, e.message)
    except EphemerisLoadError as e:
        return _json_error(503, "ephemeris_unavailable", str(e))
    except Exception as e:
        LOG.exception("compute failed")
        return _json_error(500, "compute_failed", str(e))


async def on_startup(app: web.Application) -> None:
    global ENGINE
    try:
        eng = create_engine()
        eng.load()
        ENGINE = eng
        LOG.info(
            "ephemeris ready provider=%s engine=%s kernel=%s",
            os.environ.get("ENGINE_PROVIDER", "skyfield"),
            eng.full_engine_version(),
            eng.kernel_name(),
        )
    except EphemerisLoadError as e:
        LOG.error("failed to load ephemeris: %s", e)
        ENGINE = None


async def on_cleanup(app: web.Application) -> None:
    global ENGINE
    ENGINE = None
    LOG.info("ephemeris daemon shutdown complete")


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/healthz", healthz)
    app.router.add_get("/readyz", readyz)
    app.router.add_post("/v1/compute", compute)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("BIRTH_SKY_EPHEMERIS_LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    host = os.environ.get("BIRTH_SKY_EPHEMERIS_HOST", "127.0.0.1")
    port = int(os.environ.get("BIRTH_SKY_EPHEMERIS_PORT", "5099"))
    app = create_app()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    runner = web.AppRunner(app)
    loop.run_until_complete(runner.setup())
    site = web.TCPSite(runner, host=host, port=port)
    loop.run_until_complete(site.start())
    LOG.info("listening on http://%s:%s", host, port)

    stop = asyncio.Event()

    def _signal_handler() -> None:
        LOG.info("signal received — graceful shutdown")
        stop.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _signal_handler)
        except NotImplementedError:
            signal.signal(sig, lambda *_: _signal_handler())

    try:
        loop.run_until_complete(stop.wait())
    finally:
        loop.run_until_complete(runner.cleanup())
        loop.close()


if __name__ == "__main__":
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
    main()
