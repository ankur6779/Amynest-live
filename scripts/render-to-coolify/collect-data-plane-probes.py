#!/usr/bin/env python3
"""Merge SSH probe files into data-plane-probes.json for the TS audit."""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


def plane(value: str) -> str:
    if not value:
        return "MISSING"
    v = value.lower()
    if re.search(r"render\.com|dpg-|red-d85|onrender", v):
        return "RENDER"
    if re.search(r"tcl9udy|g7jotuf|188\.245|sslip", v):
        return "COOLIFY"
    if re.search(r"amynest-836ff|amynest-audio", v):
        return "SHARED"
    return "OTHER"


def classify_env_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        if "=" not in line or line.startswith("#"):
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        out[key] = plane(val.strip())
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--worker-env", required=True)
    ap.add_argument("--coolify-env", required=True)
    ap.add_argument("--render-redis", required=True)
    ap.add_argument("--coolify-redis-keys", required=True)
    ap.add_argument("--coolify-db-rows", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    render_redis: dict = {}
    try:
        render_redis = json.loads(Path(args.render_redis).read_text() or "{}")
    except json.JSONDecodeError:
        render_redis = {}

    coolify_keys = Path(args.coolify_redis_keys).read_text().strip() or "0"
    coolify_rows_raw = Path(args.coolify_db_rows).read_text().strip()

    out: dict = {
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "worker": classify_env_file(Path(args.worker_env)),
        "coolify_backend": classify_env_file(Path(args.coolify_env)),
        "render_redis": render_redis,
        "coolify_redis": {"bull_keys": int(coolify_keys) if coolify_keys.isdigit() else 0},
    }
    if coolify_rows_raw.isdigit():
        out["coolify_db_total_rows"] = int(coolify_rows_raw)

    worker = out["worker"]
    coolify = out["coolify_backend"]
    out["stateful_plane_certified"] = (
        worker.get("DATABASE_URL") == "COOLIFY"
        and worker.get("REDIS_URL") == "COOLIFY"
        and coolify.get("DATABASE_URL") == "COOLIFY"
        and coolify.get("REDIS_URL") == "COOLIFY"
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2) + "\n")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
