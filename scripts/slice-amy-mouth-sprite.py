#!/usr/bin/env python3
"""Slice the 3-up Amy mouth sprite into 3 identically-centred square frames.

The three faces in the generated sprite are NOT perfectly evenly spaced, so a
naive even slice makes the head drift left/right between frames. We instead
detect each head's bounding box against the flat background, then crop a
fixed-size square centred on each head's horizontal centre and a shared
vertical centre. Result: swapping frames moves ONLY the mouth.
"""
from PIL import Image

SRC = "scripts/assets/amy-mouth-sprite.png"
OUT = "artifacts/kidschedule/public/amy-3d/amy-talk-{}.webp"

# Pixels within this colour distance of the flat render background become fully
# transparent; the soft band feathers anti-aliased edges so no square box shows.
BG_KEY_THRESHOLD = 55
BG_KEY_SOFT = 40

img = Image.open(SRC).convert("RGB")
W, H = img.size
px = img.load()

# Background colour sampled from a corner.
bg = px[4, 4]

def is_content(p):
    return abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 60

def apply_alpha_key(frame: Image.Image) -> Image.Image:
    rgba = frame.convert("RGBA")
    fpx = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _a = fpx[x, y]
            dist = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
            if dist <= BG_KEY_THRESHOLD:
                fpx[x, y] = (r, g, b, 0)
            elif dist <= BG_KEY_THRESHOLD + BG_KEY_SOFT:
                t = (dist - BG_KEY_THRESHOLD) / BG_KEY_SOFT
                fpx[x, y] = (r, g, b, int(255 * t))
    return rgba

def clear_generated_edge_strips(frame: Image.Image) -> Image.Image:
    """Drop full-height dark edge strips left by neighbouring sprite slices."""
    rgba = frame.convert("RGBA")
    fpx = rgba.load()
    width, height = rgba.size

    def is_strip_col(x):
        opaque = 0
        dark = 0
        for y in range(height):
            r, g, b, a = fpx[x, y]
            if a > 16:
                opaque += 1
                if r + g + b < 60:
                    dark += 1
        return opaque > height * 0.96 and dark > height * 0.96

    def clear_col(x):
        for y in range(height):
            fpx[x, y] = (0, 0, 0, 0)

    x = 0
    while x < width and is_strip_col(x):
        clear_col(x)
        x += 1

    x = width - 1
    while x >= 0 and is_strip_col(x):
        clear_col(x)
        x -= 1

    return rgba

def is_eye(p):
    # Pupils are the darkest near-black/deep-purple blobs sitting inside the
    # bright face. They are identical across all three frames (only the mouth
    # changes), so the midpoint of the eye pixels is the most stable anchor.
    return (p[0] + p[1] + p[2]) / 3 < 70

def is_face(p):
    return (p[0] + p[1] + p[2]) / 3 > 175 and min(p) > 140

thirds = [(0, W // 3), (W // 3, 2 * W // 3), (2 * W // 3, W)]
boxes = []          # full-content vertical bbox per third (for side)
eyes = []           # (ex, ey) eye-cluster centroid per face
EYE_BAND = (360, 560)   # vertical band where the eyes live (excludes cap)
for (x0, x1) in thirds:
    miny, maxy = H, 0
    fsx = fn = 0
    for y in range(0, H, 2):
        for x in range(x0, x1, 2):
            p = px[x, y]
            if is_content(p):
                if y < miny: miny = y
                if y > maxy: maxy = y
            if is_face(p):
                fsx += x; fn += 1
    fcx = fsx // fn if fn else (x0 + x1) // 2
    # Refine to the symmetry axis using the two pupils, restricted to a central
    # window around the face so the dark headphones can't drag the centroid.
    sx = sy = n = 0
    for y in range(EYE_BAND[0], EYE_BAND[1], 2):
        for x in range(fcx - 90, fcx + 90, 2):
            if is_eye(px[x, y]):
                sx += x; sy += y; n += 1
    ex = sx // n if n else fcx
    ey = sy // n if n else (EYE_BAND[0] + EYE_BAND[1]) // 2
    eyes.append((ex, ey))
    boxes.append((miny, maxy))
    print(f"region {x0}-{x1}: face_cx={fcx} eye_axis=({ex},{ey}) vbbox=({miny},{maxy})")

exs = [e[0] for e in eyes]

# Measure the FULL head silhouette of the idle frame (frame 0) in a generous
# window around its eye axis (avoids the per-third boundary clipping the head).
# This gives the head's true visual centre so the avatar sits centred in the
# circle. We keep the EYES as the horizontal lock anchor and apply the constant
# head->eye offset to every frame, so the head is centred AND the animation
# stays locked (only the mouth moves).
e0x = exs[0]
# Window must stay clear of the neighbouring face (faces are ~500px apart),
# otherwise the next head contaminates this head's bbox.
win0, win1 = max(e0x - 240, 0), min(e0x + 240, W)
hminx, hminy, hmaxx, hmaxy = win1, H, win0, 0
for y in range(0, H, 1):
    for x in range(win0, win1, 1):
        if is_content(px[x, y]):
            if x < hminx: hminx = x
            if x > hmaxx: hmaxx = x
            if y < hminy: hminy = y
            if y > hmaxy: hmaxy = y
head_cx = (hminx + hmaxx) // 2
head_cy = (hminy + hmaxy) // 2
head_w = hmaxx - hminx
head_h = hmaxy - hminy
offset_x = head_cx - e0x  # head centre relative to the eye axis
side = min(int(max(head_w, head_h) * 1.14), H)
half = side // 2
print(f"exs={exs} head_bbox=({hminx},{hminy},{hmaxx},{hmaxy}) head_c=({head_cx},{head_cy}) "
      f"offset_x={offset_x} side={side}")

# Per-column content density over the full height — used to find the empty
# "valleys" between adjacent faces. We wipe at the valley (true background gap)
# rather than at a measured head edge, so we NEVER slice through Amy's own
# headphone (which would leave a flat vertical sliver) yet fully drop neighbours.
colcount = [0] * W
for x in range(W):
    c = 0
    for y in range(0, H, 2):
        if is_content(px[x, y]):
            c += 1
    colcount[x] = c

def valley(a, b):
    """Column of minimum content density in the open interval (a, b)."""
    best_x, best_c = (a + b) // 2, 10 ** 9
    for x in range(a + 1, b):
        if colcount[x] < best_c:
            best_c, best_x = colcount[x], x
    return best_x

# Original-image cut boundaries for each face: the gap valley on each side
# (or the canvas edge when there is no neighbour on that side).
cuts = []
for i, cx in enumerate(exs):
    lo = valley(exs[i - 1], cx) if i > 0 else 0
    hi = valley(cx, exs[i + 1]) if i < len(exs) - 1 else W
    cuts.append((lo, hi))

for i, ex in enumerate(exs):
    # Horizontal: lock to this frame's eyes, then shift by the (constant) head
    # offset so the head is visually centred. Vertical: centre the head bbox.
    left = ex + offset_x - half
    top = head_cy - half
    # Pad if the crop runs off the canvas so every frame is exactly `side`.
    frame = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sx0, sy0 = max(left, 0), max(top, 0)
    sx1, sy1 = min(left + side, W), min(top + side, H)
    region = img.crop((sx0, sy0, sx1, sy1)).convert("RGBA")
    frame.paste(region, (sx0 - left, sy0 - top))

    # Wipe anything past the background valleys (neighbouring faces) to transparent.
    lo, hi = cuts[i]
    own_l = lo - left   # frame-local left cut (background gap → safe for Amy)
    own_r = hi - left   # frame-local right cut
    fpx = frame.load()
    for y in range(side):
        for x in range(side):
            if x < own_l or x > own_r:
                fpx[x, y] = (0, 0, 0, 0)

    keyed = clear_generated_edge_strips(apply_alpha_key(frame))
    keyed.save(OUT.format(i), "WEBP", quality=92, method=6)
    print(f"saved {OUT.format(i)} left={left} top={top} cut=({lo},{hi}) own=({own_l},{own_r})")
