#!/usr/bin/env python3
"""Repair Amy robot hub hero PNGs with torso knockout holes.

The holes are transparent gaps between arm and body that read as dark pits on
hub cards. We bridge the silhouette lightly, then inpaint only from skin-tone
neighbors so shadow pixels do not bleed into the torso fill.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ALPHA_THRESH = 16

# Per-asset bridge radius — larger for poses with wider arm-body gaps.
BRIDGE_BY_FILE: dict[str, int] = {
    "talking-amy-hero.png": 40,
    "speech-coach-hero.png": 38,
    "amy-ai-hero.png": 40,
    "command-center-hero.png": 42,
}

TARGETS: list[tuple[str, str]] = [
    (
        "artifacts/kidschedule/public/illustrations/stories/talking-amy-hero.png",
        "artifacts/kidschedule/public/illustrations/stories/talking-amy-hero.png",
    ),
    (
        "artifacts/kidschedule/public/illustrations/stories/speech-coach-hero.png",
        "artifacts/kidschedule/public/illustrations/stories/speech-coach-hero.png",
    ),
    (
        "artifacts/kidschedule/public/illustrations/today-for-you/amy-ai-hero.png",
        "artifacts/kidschedule/public/illustrations/today-for-you/amy-ai-hero.png",
    ),
    (
        "artifacts/kidschedule/public/illustrations/today-for-you/command-center-hero.png",
        "artifacts/kidschedule/public/illustrations/today-for-you/command-center-hero.png",
    ),
]


def is_skin(px: np.ndarray) -> bool:
    r, g, b, a = (int(px[0]), int(px[1]), int(px[2]), int(px[3]))
    if a < ALPHA_THRESH:
        return False
    lum = (r + g + b) / 3
    chroma = max(r, g, b) - min(r, g, b)
    return lum >= 190 and chroma <= 28


def is_fill_source(px: np.ndarray) -> bool:
    r, g, b, a = (int(px[0]), int(px[1]), int(px[2]), int(px[3]))
    if a < ALPHA_THRESH:
        return False
    return (r + g + b) / 3 >= 150


def is_dark_blemish(px: np.ndarray) -> bool:
    r, g, b, a = (int(px[0]), int(px[1]), int(px[2]), int(px[3]))
    if a < ALPHA_THRESH:
        return False
    return (r + g + b) / 3 < 150


def dilate_alpha(alpha: np.ndarray, radius: int) -> np.ndarray:
    img = Image.fromarray((alpha >= ALPHA_THRESH).astype(np.uint8) * 255)
    return np.array(img.filter(ImageFilter.MaxFilter(radius * 2 + 1))) >= 128


def content_bbox(alpha: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(alpha >= ALPHA_THRESH)
    if len(xs) == 0:
        h, w = alpha.shape
        return 0, 0, w - 1, h - 1
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def repair_knockout_holes(rgba: Image.Image, bridge: int) -> Image.Image:
    arr = np.array(rgba.convert("RGBA"), dtype=np.uint8)
    h, w = arr.shape[:2]
    alpha = arr[:, :, 3]
    opaque = alpha >= ALPHA_THRESH
    gap_mask = dilate_alpha(alpha, bridge) & ~opaque
    out = arr.copy()

    neighbors8 = (
        (-1, 0),
        (1, 0),
        (0, -1),
        (0, 1),
        (-1, -1),
        (1, -1),
        (-1, 1),
        (1, 1),
    )

    for _ in range(400):
        if not gap_mask.any():
            break
        progress = False
        ys, xs = np.where(gap_mask)
        for y, x in zip(ys, xs):
            skin_nbrs: list[np.ndarray] = []
            fill_nbrs: list[np.ndarray] = []
            for dx, dy in neighbors8:
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    continue
                if gap_mask[ny, nx] or out[ny, nx, 3] < ALPHA_THRESH:
                    continue
                px = out[ny, nx]
                if is_fill_source(px):
                    fill_nbrs.append(px)
                if is_skin(px):
                    skin_nbrs.append(px)
            src = skin_nbrs or fill_nbrs
            if not src:
                continue
            color = np.mean(src, axis=0).astype(np.uint8)
            color[3] = 255
            out[y, x] = color
            gap_mask[y, x] = False
            progress = True
        if not progress:
            break

    # Tighten any tiny interior stragglers inside the content box.
    minx, miny, maxx, maxy = content_bbox(out[:, :, 3])
    for _ in range(80):
        progress = False
        for y in range(miny, maxy + 1):
            for x in range(minx, maxx + 1):
                if out[y, x, 3] >= ALPHA_THRESH:
                    continue
                skin_nbrs = []
                for dx, dy in neighbors8:
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    px = out[ny, nx]
                    if px[3] >= ALPHA_THRESH and is_skin(px):
                        skin_nbrs.append(px)
                if len(skin_nbrs) >= 3:
                    color = np.mean(skin_nbrs, axis=0).astype(np.uint8)
                    color[3] = 255
                    out[y, x] = color
                    progress = True
        if not progress:
            break

    # Replace dark knockout blemishes inside the body shell with skin tone.
    minx, miny, maxx, maxy = content_bbox(out[:, :, 3])
    for _ in range(120):
        progress = False
        for y in range(miny, maxy + 1):
            for x in range(minx, maxx + 1):
                px = out[y, x]
                if not is_dark_blemish(px):
                    continue
                skin_nbrs = []
                for dx, dy in neighbors8:
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    npx = out[ny, nx]
                    if is_skin(npx):
                        skin_nbrs.append(npx)
                if len(skin_nbrs) >= 3:
                    color = np.mean(skin_nbrs, axis=0).astype(np.uint8)
                    color[3] = 255
                    out[y, x] = color
                    progress = True
        if not progress:
            break

    return Image.fromarray(out, "RGBA")


def trim_padding(rgba: Image.Image, pad: int = 2) -> Image.Image:
    minx, miny, maxx, maxy = content_bbox(np.array(rgba)[:, :, 3])
    return rgba.crop(
        (
            max(0, minx - pad),
            max(0, miny - pad),
            min(rgba.width, maxx + 1 + pad),
            min(rgba.height, maxy + 1 + pad),
        )
    )


def body_transparency_pct(rgba: Image.Image) -> float:
    arr = np.array(rgba.convert("RGBA"))
    h, w = arr.shape[:2]
    cx0, cx1 = int(w * 0.3), int(w * 0.7)
    cy0, cy1 = int(h * 0.35), int(h * 0.75)
    region = arr[cy0:cy1, cx0:cx1]
    return 100.0 * (region[:, :, 3] < ALPHA_THRESH).sum() / region.shape[0] / region.shape[1]


def process(src: Path, dest: Path, bridge: int) -> None:
    before = body_transparency_pct(Image.open(src))
    fixed = trim_padding(repair_knockout_holes(Image.open(src), bridge))
    after = body_transparency_pct(fixed)
    dest.parent.mkdir(parents=True, exist_ok=True)
    fixed.save(dest, "PNG", optimize=True)
    print(
        f"{src.name}: {before:.1f}% -> {after:.1f}% body transparency, "
        f"size {fixed.size[0]}×{fixed.size[1]}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path)
    parser.add_argument("--dest", type=Path)
    parser.add_argument("--bridge", type=int)
    args = parser.parse_args()

    if args.src and args.dest:
        bridge = args.bridge or BRIDGE_BY_FILE.get(args.src.name, 32)
        src = args.src if args.src.is_absolute() else ROOT / args.src
        dest = args.dest if args.dest.is_absolute() else ROOT / args.dest
        process(src, dest, bridge)
        return

    for src_rel, dest_rel in TARGETS:
        src = ROOT / src_rel
        dest = ROOT / dest_rel
        process(src, dest, BRIDGE_BY_FILE.get(src.name, 32))

    print("Done.")


if __name__ == "__main__":
    main()
