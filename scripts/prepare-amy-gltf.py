#!/usr/bin/env python3
"""Copy Tripo Amy GLB into kidschedule and rename animation clips for runtime.

Heuristic mapping from motion analysis on the Tripo export (NlaTrack* names).
Re-run after replacing the source GLB if clip indices change.

Usage:
  python3 scripts/prepare-amy-gltf.py [source.glb]
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "AMY+3d+character.glb"
OUT = ROOT / "artifacts/kidschedule/public/amy-3d/amy.glb"

# Tripo export → semantic clip names consumed by useAmyGltfActions.
CLIP_RENAMES: dict[str, str] = {
    "NlaTrack.013": "idle",
    "NlaTrack.012": "wave",
    "NlaTrack.004": "warmup",  # ~2.8s speech intro before talk loop
    "NlaTrack.005": "talk",  # sing-style head bob (~9s)
    "NlaTrack.010": "celebrate",
    "NlaTrack.008": "listening",
    "NlaTrack.003": "thinking",
}


def read_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise SystemExit(f"Not a GLB: {path}")
    offset = 12
    json_doc: dict | None = None
    bin_chunk: bytes | None = None
    while offset < len(data):
        chunk_len, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_len]
        offset += chunk_len
        if chunk_type == 0x4E4F534A:
            json_doc = json.loads(chunk.decode("utf-8"))
        elif chunk_type == 0x004E4942:
            bin_chunk = chunk
    if json_doc is None or bin_chunk is None:
        raise SystemExit("GLB missing JSON or BIN chunk")
    return json_doc, bin_chunk


def write_glb(path: Path, json_doc: dict, bin_chunk: bytes) -> None:
    json_bytes = json.dumps(json_doc, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_chunk)
    out = bytearray()
    out += struct.pack("<4sII", b"glTF", 2, total_len)
    out += struct.pack("<II", len(json_bytes), 0x4E4F534A)
    out += json_bytes
    out += struct.pack("<II", len(bin_chunk), 0x004E4942)
    out += bin_chunk
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(out)


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    if not src.exists():
        raise SystemExit(f"Missing source GLB: {src}")

    doc, bin_chunk = read_glb(src)
    anims = doc.get("animations", [])
    renamed = 0
    for anim in anims:
        old = anim.get("name", "")
        if old in CLIP_RENAMES:
            anim["name"] = CLIP_RENAMES[old]
            renamed += 1

    write_glb(OUT, doc, bin_chunk)
    print(f"Source: {src}")
    print(f"Output: {OUT} ({OUT.stat().st_size:,} bytes)")
    print(f"Animations: {len(anims)} total, {renamed} renamed:")
    for anim in anims:
        marker = " *" if anim.get("name") in CLIP_RENAMES.values() else ""
        print(f"  - {anim.get('name')}{marker}")


if __name__ == "__main__":
    main()
