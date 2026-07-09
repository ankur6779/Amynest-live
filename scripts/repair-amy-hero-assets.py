#!/usr/bin/env python3
"""Build production Amy hub hero PNGs from regenerated source art."""
from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ALPHA = 16

JOBS = [
    ("talking-amy-hero-regen.png", "artifacts/kidschedule/public/illustrations/stories/talking-amy-hero.png", 8),
    ("speech-coach-hero-regen.png", "artifacts/kidschedule/public/illustrations/stories/speech-coach-hero.png", 10),
    ("amy-ai-hero-regen.png", "artifacts/kidschedule/public/illustrations/today-for-you/amy-ai-hero.png", 10),
    ("command-center-hero-regen.png", "artifacts/kidschedule/public/illustrations/today-for-you/command-center-hero.png", 10),
]

NEIGHBORS4 = ((-1, 0), (1, 0), (0, -1), (0, 1))


def key_checkerboard(img: Image.Image) -> Image.Image:
    """Remove only border-connected perfect-gray checkerboard cells."""
    arr = np.array(img.convert("RGBA"))
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    lum = rgb.mean(axis=2)
    is_bg = (chroma == 0) & (lum >= 190)

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
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    img = Image.fromarray(mask.astype(np.uint8) * 255)
    return np.array(img.filter(ImageFilter.MaxFilter(r * 2 + 1))) > 127


def good(px: np.ndarray) -> bool:
    return int(px[3]) >= ALPHA and int(px[:3].mean()) >= 180


def bridge_gaps(img: Image.Image, bridge: int) -> Image.Image:
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w = arr.shape[:2]
    opaque = arr[:, :, 3] >= ALPHA
    gaps = dilate(opaque, bridge) & ~opaque
    out = arr.copy()

    q: deque[tuple[int, int]] = deque()
    for y, x in zip(*np.where(gaps)):
        for dx, dy in NEIGHBORS4:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and good(out[ny, nx]):
                q.append((y, x))
                break

    while q:
        y, x = q.popleft()
        if not gaps[y, x]:
            continue
        nbrs = [
            out[y + dy, x + dx]
            for dx, dy in NEIGHBORS4
            if 0 <= x + dx < w and 0 <= y + dy < h and good(out[y + dy, x + dx])
        ]
        if not nbrs:
            continue
        c = np.mean(nbrs, axis=0).astype(np.uint8)
        c[3] = 255
        out[y, x] = c
        gaps[y, x] = False
        for dx, dy in NEIGHBORS4:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and gaps[ny, nx]:
                q.append((ny, nx))

    return Image.fromarray(out, "RGBA")


def scrub_dark_specks(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w = arr.shape[:2]
    sil = dilate(arr[:, :, 3] >= ALPHA, 2)
    lum = arr[:, :, :3].astype(np.int16).mean(axis=2)
    out = arr.copy()

    for _ in range(25):
        mask = sil & (out[:, :, 3] >= ALPHA) & (lum < 140)
        ys, xs = np.where(mask)
        if len(xs) == 0:
            break
        changed = False
        for y, x in zip(ys, xs):
            nbrs = [
                out[y + dy, x + dx]
                for dx, dy in NEIGHBORS4
                if 0 <= x + dx < w and 0 <= y + dy < h and good(out[y + dy, x + dx])
            ]
            if len(nbrs) >= 2:
                c = np.mean(nbrs, axis=0).astype(np.uint8)
                c[3] = 255
                out[y, x] = c
                lum[y, x] = int(c[:3].mean())
                changed = True
        if not changed:
            break

    return Image.fromarray(out, "RGBA")


def trim(img: Image.Image) -> Image.Image:
    a = np.array(img)[:, :, 3]
    ys, xs = np.where(a >= ALPHA)
    if len(xs) == 0:
        return img
    pad = 2
    return img.crop((
        max(0, int(xs.min()) - pad),
        max(0, int(ys.min()) - pad),
        min(img.width, int(xs.max()) + 1 + pad),
        min(img.height, int(ys.max()) + 1 + pad),
    ))


def center_stats(img: Image.Image) -> tuple[int, int]:
    a = np.array(img.convert("RGBA"))
    h, w = a.shape[:2]
    r = a[h // 3:2 * h // 3, w // 3:2 * w // 3]
    trans = int((r[:, :, 3] < ALPHA).sum())
    dark = int(((r[:, :, 3] >= ALPHA) & (r[:, :, :3].mean(axis=2) < 120)).sum())
    return trans, dark


def process(src: Path, dest: Path, bridge: int) -> None:
    raw = Image.open(src)
    t0, d0 = center_stats(key_checkerboard(raw))
    img = scrub_dark_specks(bridge_gaps(key_checkerboard(raw), bridge))
    final = trim(img)
    t1, d1 = center_stats(final)
    dest.parent.mkdir(parents=True, exist_ok=True)
    final.save(dest, "PNG", optimize=True)
    print(
        f"{src.name}: center trans {t0}->{t1}, dark {d0}->{d1}, "
        f"size {final.size[0]}x{final.size[1]}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", type=Path)
    parser.add_argument("--dest", type=Path)
    parser.add_argument("--bridge", type=int, default=8)
    args = parser.parse_args()

    if args.src and args.dest:
        src = args.src if args.src.is_absolute() else ROOT / args.src
        dest = args.dest if args.dest.is_absolute() else ROOT / args.dest
        process(src, dest, args.bridge)
        return

    for src_name, dest_rel, bridge in JOBS:
        process(ASSETS / src_name, ROOT / dest_rel, bridge)

    print("Done.")


if __name__ == "__main__":
    main()
