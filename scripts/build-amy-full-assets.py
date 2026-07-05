#!/usr/bin/env python3
"""Build production full-body Amy webp assets from the official mascot PNG.

Source: official AmyNest transparent mascot (1024×571). Outputs to
artifacts/kidschedule/public/amy/full/ — all frames share identical body
position; only the mouth region differs on talk-1 / talk-2.
"""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / (
    "artifacts/kidschedule/public/illustrations/character-bible/amy-robot-base.png"
)
OUT_DIR = ROOT / "artifacts/kidschedule/public/amy/full"

# Normalized canvas — tall enough for halo + feet padding.
CANVAS_W = 720
CANVAS_H = 900

# Mouth centre on the normalized canvas (measured from official render).
MOUTH_CX = 360
MOUTH_CY = 392


def is_bg(p: tuple[int, ...]) -> bool:
    r, g, b = p[0], p[1], p[2]
    # Flat gray checker cells (~52 and ~72 on official render).
    if abs(r - g) < 4 and abs(g - b) < 4:
        lum = (r + g + b) / 3
        if lum < 85:
            return True
    return False


def key_background(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_bg((r, g, b)):
                px[x, y] = (r, g, b, 0)
    return rgba


def content_bbox(rgba: Image.Image) -> tuple[int, int, int, int]:
    px = rgba.load()
    w, h = rgba.size
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 16:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    return minx, miny, maxx, maxy


def normalize(rgba: Image.Image) -> Image.Image:
    minx, miny, maxx, maxy = content_bbox(rgba)
    cropped = rgba.crop((minx, miny, maxx + 1, maxy + 1))
    cw, ch = cropped.size
    scale = min((CANVAS_W * 0.82) / cw, (CANVAS_H * 0.78) / ch)
    nw, nh = int(cw * scale), int(ch * scale)
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    ox = (CANVAS_W - nw) // 2
    oy = CANVAS_H - nh - int(CANVAS_H * 0.06)
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def erase_mouth_region(img: Image.Image) -> None:
    """Cover only the thin closed smile before drawing an open mouth."""
    draw = ImageDraw.Draw(img)
    px = img.load()
    skin = px[MOUTH_CX, MOUTH_CY - 24][:3]
    draw.ellipse(
        (MOUTH_CX - 14, MOUTH_CY - 5, MOUTH_CX + 14, MOUTH_CY + 9),
        fill=(*skin, 255),
    )


def draw_mouth(img: Image.Image, openness: int) -> None:
    """Draw mouth opening: 0=closed smile, 1=partial, 2=wide."""
    draw = ImageDraw.Draw(img)
    lip = (72, 52, 108)
    inner = (48, 32, 78)
    if openness == 0:
        return
    if openness == 1:
        draw.ellipse(
            (MOUTH_CX - 9, MOUTH_CY - 1, MOUTH_CX + 9, MOUTH_CY + 10),
            fill=inner,
        )
        draw.arc(
            (MOUTH_CX - 10, MOUTH_CY - 3, MOUTH_CX + 10, MOUTH_CY + 9),
            start=200,
            end=340,
            fill=lip,
            width=2,
        )
        return
    draw.ellipse(
        (MOUTH_CX - 12, MOUTH_CY - 3, MOUTH_CX + 12, MOUTH_CY + 16),
        fill=inner,
    )
    draw.arc(
        (MOUTH_CX - 13, MOUTH_CY - 5, MOUTH_CX + 13, MOUTH_CY + 11),
        start=195,
        end=345,
        fill=lip,
        width=2,
    )


def make_talk_frame(base: Image.Image, openness: int) -> Image.Image:
    if openness == 0:
        return base.copy()
    frame = base.copy()
    erase_mouth_region(frame)
    draw_mouth(frame, openness)
    return frame


def save_webp(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=92, method=6)
    print(f"  saved {path.relative_to(ROOT)}  ({img.size[0]}×{img.size[1]})")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source: {SRC}")

    print(f"Source: {SRC}")
    keyed = key_background(Image.open(SRC))
    base = normalize(keyed)

    save_webp(base, OUT_DIR / "amy-idle.webp")
    save_webp(base.copy(), OUT_DIR / "amy-listening.webp")
    save_webp(base.copy(), OUT_DIR / "amy-thinking.webp")
    save_webp(base.copy(), OUT_DIR / "amy-happy.webp")

    for i, openness in enumerate([0, 1, 2]):
        save_webp(make_talk_frame(base, openness), OUT_DIR / f"amy-talk-{i}.webp")

    print("Done.")


if __name__ == "__main__":
    main()
