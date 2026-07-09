#!/usr/bin/env python3
"""Build production Amy hub hero PNGs from regenerated source art.

Removes checkerboard via border-connected zero-chroma flood (Amy-safe), trims,
and normalizes height for hub cards.
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

JOBS = [
    ("talking-amy-hero-regen.png", "artifacts/kidschedule/public/illustrations/stories/talking-amy-hero.png"),
    ("speech-coach-hero-regen.png", "artifacts/kidschedule/public/illustrations/stories/speech-coach-hero.png"),
    ("amy-ai-hero-regen.png", "artifacts/kidschedule/public/illustrations/today-for-you/amy-ai-hero.png"),
    ("command-center-hero-regen.png", "artifacts/kidschedule/public/illustrations/today-for-you/command-center-hero.png"),
]


def key_checkerboard(img: Image.Image) -> np.ndarray:
    arr = np.array(img.convert("RGBA"))
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    is_bg = (rgb.max(axis=2) - rgb.min(axis=2) == 0) & (rgb.mean(axis=2) >= 190)

    remove = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg[y, x] and not remove[y, x]:
                remove[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg[y, x] and not remove[y, x]:
                remove[y, x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and is_bg[ny, nx] and not remove[ny, nx]:
                remove[ny, nx] = True
                q.append((nx, ny))

    out = arr.copy()
    out[remove, 3] = 0
    return out


def trim(arr: np.ndarray, pad: int = 2) -> np.ndarray:
    ys, xs = np.where(arr[:, :, 3] >= ALPHA)
    return arr[max(0, ys.min() - pad): ys.max() + 1 + pad, max(0, xs.min() - pad): xs.max() + 1 + pad]


def normalize_height(img: Image.Image, target_h: int = TARGET_H) -> Image.Image:
    w, h = img.size
    if h <= target_h:
        return img
    scale = target_h / h
    return img.resize((int(w * scale), target_h), Image.Resampling.LANCZOS)


def process(src: Path, dest: Path) -> None:
    arr = trim(key_checkerboard(Image.open(src)))
    img = normalize_height(Image.fromarray(arr.astype(np.uint8), "RGBA"))
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)
    print(f"{dest.name}: {img.size[0]}×{img.size[1]}")


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
