#!/usr/bin/env python3
"""Build production Amy hub hero PNGs from magenta-backed source art.

Uses solid #FF00FF chroma key (Amy-safe — never punches white body holes),
fills tiny enclosed alpha holes, then normalizes for hub cards.
"""
from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ALPHA = 16
TARGET_H = 820
CANVAS_W, CANVAS_H = 1000, 900

JOBS = [
    ("talking-amy-hero-v2.png", "artifacts/kidschedule/public/illustrations/stories/talking-amy-hero.png"),
    ("speech-coach-hero-v2.png", "artifacts/kidschedule/public/illustrations/stories/speech-coach-hero.png"),
    ("amy-ai-hero-v2.png", "artifacts/kidschedule/public/illustrations/today-for-you/amy-ai-hero.png"),
    ("command-center-hero-v2.png", "artifacts/kidschedule/public/illustrations/today-for-you/command-center-hero.png"),
]


def chroma_key_magenta(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    rgb = arr[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    remove = (
        (r >= 160)
        & (g <= 110)
        & (b >= 160)
        & ((r - g) >= 60)
        & ((b - g) >= 60)
    ) | (
        (r >= 140)
        & (g <= 130)
        & (b >= 140)
        & ((r - g) >= 40)
        & ((b - g) >= 40)
        & (((r + b) / 2 - g) >= 50)
    )
    out = arr.copy()
    out[remove, 3] = 0

    # Soften magenta cast on remaining opaque edge pixels.
    opaque = out[:, :, 3] >= ALPHA
    contam = (
        opaque
        & (r >= 120)
        & (g <= 140)
        & (b >= 120)
        & (((r + b) / 2 - g) >= 35)
    )
    for y, x in zip(*np.where(contam)):
        pr, pg, pb, _pa = out[y, x]
        excess = min(int(pr), int(pb)) - int(pg)
        if excess > 20:
            out[y, x, 0] = max(int(pg) + 20, int(pr) - excess // 2)
            out[y, x, 2] = max(int(pg) + 20, int(pb) - excess // 2)
    return Image.fromarray(out, "RGBA")


def fill_enclosed_holes(img: Image.Image, max_hole: int = 800) -> Image.Image:
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w = arr.shape[:2]
    transparent = arr[:, :, 3] < ALPHA
    external = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if transparent[y, x] and not external[y, x]:
                external[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if transparent[y, x] and not external[y, x]:
                external[y, x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and transparent[ny, nx] and not external[ny, nx]:
                external[ny, nx] = True
                q.append((nx, ny))

    holes = transparent & ~external
    if not holes.any():
        return img

    visited = np.zeros((h, w), dtype=bool)
    out = arr.copy()
    for y, x in zip(*np.where(holes)):
        if visited[y, x]:
            continue
        comp: list[tuple[int, int]] = []
        qq: deque[tuple[int, int]] = deque([(x, y)])
        visited[y, x] = True
        while qq:
            cx, cy = qq.popleft()
            comp.append((cx, cy))
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if 0 <= nx < w and 0 <= ny < h and holes[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    qq.append((nx, ny))
        if len(comp) > max_hole:
            continue
        for cx, cy in comp:
            nbrs = [
                out[ny, nx]
                for nx, ny in (
                    (cx - 1, cy),
                    (cx + 1, cy),
                    (cx, cy - 1),
                    (cx, cy + 1),
                    (cx - 1, cy - 1),
                    (cx + 1, cy - 1),
                    (cx - 1, cy + 1),
                    (cx + 1, cy + 1),
                )
                if 0 <= nx < w and 0 <= ny < h and out[ny, nx, 3] >= ALPHA and int(out[ny, nx, :3].mean()) >= 160
            ]
            if not nbrs:
                nbrs = [
                    out[ny, nx]
                    for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1))
                    if 0 <= nx < w and 0 <= ny < h and out[ny, nx, 3] >= ALPHA
                ]
            if nbrs:
                color = np.mean(nbrs, axis=0).astype(np.uint8)
                color[3] = 255
                out[cy, cx] = color
    return Image.fromarray(out, "RGBA")


def content_bbox(arr: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(arr[:, :, 3] >= ALPHA)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def normalize(img: Image.Image) -> Image.Image:
    arr = np.array(img)
    x0, y0, x1, y1 = content_bbox(arr)
    cropped = arr[y0 : y1 + 1, x0 : x1 + 1]
    ch, cw = cropped.shape[:2]
    target_h = int(CANVAS_H * 0.86)
    scale = min((CANVAS_W * 0.92) / cw, target_h / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = Image.fromarray(cropped, "RGBA").resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    canvas.paste(resized, ((CANVAS_W - nw) // 2, (CANVAS_H - nh) // 2), resized)
    carr = np.array(canvas)
    x0, y0, x1, y1 = content_bbox(carr)
    pad = 2
    trimmed = canvas.crop(
        (max(0, x0 - pad), max(0, y0 - pad), min(CANVAS_W, x1 + 1 + pad), min(CANVAS_H, y1 + 1 + pad))
    )
    if trimmed.height > TARGET_H:
        scale = TARGET_H / trimmed.height
        trimmed = trimmed.resize((int(trimmed.width * scale), TARGET_H), Image.Resampling.LANCZOS)
    return trimmed


def process(src: Path, dest: Path) -> None:
    keyed = chroma_key_magenta(Image.open(src))
    filled = fill_enclosed_holes(keyed)
    final = normalize(filled)
    dest.parent.mkdir(parents=True, exist_ok=True)
    final.save(dest, "PNG", optimize=True)
    print(f"{dest.name}: {final.size[0]}×{final.size[1]}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path)
    parser.add_argument("--dest", type=Path)
    args = parser.parse_args()

    if args.src and args.dest:
        src = args.src if args.src.is_absolute() else ROOT / args.src
        dest = args.dest if args.dest.is_absolute() else ROOT / args.dest
        process(src, dest)
        return

    for src_name, dest_rel in JOBS:
        process(ASSETS / src_name, ROOT / dest_rel)

    print("Done.")


if __name__ == "__main__":
    main()
