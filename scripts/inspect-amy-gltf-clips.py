#!/usr/bin/env python3
"""Inspect every animation clip in the Amy GLB: per-clip bone motion analysis.

For each clip prints: name, duration, animated bones, and per-bone-group motion
amplitude (max rotation angle from rest, max yaw twist, translation range).
Used to pick the semantic clip mapping in scripts/prepare-amy-gltf.py.

Usage:
  python3 scripts/inspect-amy-gltf-clips.py [source.glb]
"""
from __future__ import annotations

import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "AMY+3d+character.glb"

COMPONENT_FMT = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
COMPONENT_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE_COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise SystemExit(f"Not a GLB: {path}")
    offset = 12
    json_doc = None
    bin_chunk = None
    while offset < len(data):
        chunk_len, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_len]
        offset += chunk_len
        if chunk_type == 0x4E4F534A:
            json_doc = json.loads(chunk.decode("utf-8"))
        elif chunk_type == 0x004E4942:
            bin_chunk = chunk
    return json_doc, bin_chunk


def read_accessor(doc: dict, bin_chunk: bytes, idx: int) -> list[tuple[float, ...]]:
    acc = doc["accessors"][idx]
    view = doc["bufferViews"][acc["bufferView"]]
    base = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    n = TYPE_COUNT[acc["type"]]
    fmt = COMPONENT_FMT[acc["componentType"]]
    size = COMPONENT_SIZE[acc["componentType"]]
    stride = view.get("byteStride") or (n * size)
    out = []
    for i in range(count):
        off = base + i * stride
        vals = struct.unpack_from(f"<{n}{fmt}", bin_chunk, off)
        if acc["componentType"] != 5126:
            # normalized quantized values
            maxv = float(2 ** (8 * size - (1 if fmt.islower() else 0)) - 1)
            vals = tuple(v / maxv for v in vals)
        out.append(vals)
    return out


def quat_angle_deg(q: tuple[float, ...]) -> float:
    w = max(-1.0, min(1.0, abs(q[3])))
    return math.degrees(2 * math.acos(w))


def quat_yaw_twist_deg(q: tuple[float, ...]) -> float:
    x, y, z, w = q
    mag = math.hypot(y, w)
    if mag < 1e-8:
        return 0.0
    return abs(math.degrees(2 * math.atan2(y / mag, abs(w) / mag)))


def quat_rel(a, b):
    """b * inverse(a) — rotation from a to b."""
    ax, ay, az, aw = a
    # inverse of unit quat = conjugate
    ix, iy, iz, iw = -ax, -ay, -az, aw
    bx, by, bz, bw = b
    return (
        bw * ix + bx * iw + by * iz - bz * iy,
        bw * iy - bx * iz + by * iw + bz * ix,
        bw * iz + bx * iy - by * ix + bz * iw,
        bw * iw - bx * ix - by * iy - bz * iz,
    )


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    doc, bin_chunk = read_glb(src)
    nodes = doc.get("nodes", [])
    node_name = lambda i: nodes[i].get("name", f"node{i}")

    print(f"GLB: {src}")
    print(f"Nodes: {len(nodes)}  Animations: {len(doc.get('animations', []))}\n")

    for anim in doc.get("animations", []):
        name = anim.get("name", "?")
        samplers = anim["samplers"]
        duration = 0.0
        # bone -> {rot_max, yaw_max, rot_range(vs first frame), trans_range}
        info: dict[str, dict] = {}
        for ch in anim["channels"]:
            samp = samplers[ch["sampler"]]
            times = read_accessor(doc, bin_chunk, samp["input"])
            duration = max(duration, times[-1][0] if times else 0.0)
            target = ch["target"]
            bone = node_name(target["node"])
            path = target["path"]
            vals = read_accessor(doc, bin_chunk, samp["output"])
            rec = info.setdefault(
                bone, {"rot_max": 0.0, "yaw_max": 0.0, "rot_travel": 0.0, "trans": 0.0, "paths": set()}
            )
            rec["paths"].add(path)
            if path == "rotation" and vals:
                first = vals[0]
                for q in vals:
                    rel = quat_rel(first, q)
                    rec["rot_travel"] = max(rec["rot_travel"], quat_angle_deg(rel))
                    rec["yaw_max"] = max(rec["yaw_max"], quat_yaw_twist_deg(rel))
                    rec["rot_max"] = max(rec["rot_max"], quat_angle_deg(q))
            elif path == "translation" and vals:
                first = vals[0]
                for v in vals:
                    d = math.dist(first, v)
                    rec["trans"] = max(rec["trans"], d)

        print(f"=== {name}  ({duration:.2f}s, {len(info)} bones) ===")
        # group summary: significant movers sorted by rot_travel
        movers = sorted(info.items(), key=lambda kv: -kv[1]["rot_travel"])
        for bone, rec in movers:
            if rec["rot_travel"] < 2.0 and rec["trans"] < 0.01:
                continue
            print(
                f"  {bone:<24} travel={rec['rot_travel']:6.1f}deg  yawTwist={rec['yaw_max']:6.1f}deg  trans={rec['trans']:.3f}"
            )
        print()


if __name__ == "__main__":
    main()
