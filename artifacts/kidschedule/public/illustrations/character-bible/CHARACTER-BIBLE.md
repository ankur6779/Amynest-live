# AmyNest — Official Character Bible

Canonical production reference for every illustration across the app.
**Identity consistency is mandatory. Only poses and props may change. No redesigns are allowed.**

Reference sheets (in this folder):

- `amy-robot-bible.png` / `amy-robot-base.png` — Amy AI robot mascot
- `girl-bible.png` / `girl-base.png` — recurring girl mascot
- `boy-bible.png` / `boy-base.png` — recurring boy mascot

When generating any new illustration, pass the relevant `*-base.png` as a reference image so the character stays on-model.

---

## 1. Amy (AI robot mascot) — LOCKED

- Floating, rounded, minimalist white/lavender body with tiny floating arms + feet
- Deep-purple cap with the `AmyAi` logo
- Integrated glossy purple over-ear headphones
- Large glossy purple eyes, warm/playful/intelligent expression
- Soft-touch semi-matte composite finish, neon-purple rim glow
- **Do not alter.** Only change pose (waving, pointing, presenting) and props.

## 2. Girl mascot — LOCKED

- Warm **brown hair in a ponytail** with a **bright yellow bow**
- **Plain purple hoodie — NO text, NO logo**
- Dark-purple leggings, **purple sneakers** with white soles
- Warm brown eyes, friendly smile, chibi 1:3 head-body proportions
- Only change pose and props (book, brush, food, etc.)

## 3. Boy mascot — LOCKED

- Short tidy **brown hair**
- **Plain purple hoodie — NO text, NO logo**
- Dark-purple pants, **purple sneakers** with white soles
- Same face family + proportions as the girl mascot
- Only change pose and props (controller, telescope, ball, etc.)

---

## Character → card mapping

### Amy robot
Ask Amy AI · Amy Coach · Talking Amy · Speech Coach · AI Routine Generator ·
Tomorrow's Forecast · Command Center · AI Chat · Quick Tutor · Today For You header

### Girl mascot
Learning Zone · Creativity · Story Hub · Nutrition · Health Lab · Parent Support ·
Worksheets · Coloring · Curiosity Library · Daily Tips

### Boy mascot
Gaming Hub · Science / STEM modules · Sports (future) · Coding (future) ·
selected learning modules where appropriate

---

## Rules for every illustration

1. Transparent background (alpha), isolated PNG cutout — **character only**.
2. No scene, no floor, no ground, no cast-shadow plane.
3. No screenshots, no UI panels, no card frames, no cropped previews.
4. No text on clothing.
5. Keep face, hair, outfit, shoes, and proportions identical to the base sheet.
6. Themed props/poses only.

---

## Production canvas spec (normalized — MANDATORY)

Every card illustration in `public/illustrations/**/*-hero.png` is normalized so
each mascot occupies the **same perceived space** inside the card.

- **Canvas:** 1000 × 900 px, transparent RGBA (matches the card art box aspect ≈ 1.11).
- **Character height:** ~86% of canvas height (≈770 px), centered.
- **Padding / visual weight:** uniform across the set; character is centered on its
  own silhouette. Detached floating props (letters, stars, moons, charts) never
  drive the character's scale and must stay fully in-frame (no clipping).
- **Hoodie purple (reference):** mean ≈ `rgb(111, 59, 156)`. Keep new art within a
  small tolerance of this tone.
- New assets must be run through the same normalization before shipping so they
  match the frozen library exactly.

> **Amy robot knockout note:** the Amy robot has a near-white / lavender body, so
> the background remover must run with **enclosed-region removal DISABLED**
> (`remove_bg(..., remove_enclosed=False)`). Otherwise the robot's own white face
> and body get treated as background pockets and punch through as dark holes on the
> card. Girl/boy mascots keep enclosed removal ON.

## Status: FROZEN — production assets ✅

The illustration library is **frozen**. Treat the `*-hero.png` files as final
production assets (incl. the Learning Zone section-header girl mascot).

- Do **not** restyle, recolor, re-crop, or re-scale existing assets.
- Future modules must **reuse these canonical mascots** (Amy robot / girl / boy) —
  do not introduce new character styles.
- To add a card: generate a new pose/prop from the relevant `*-base.png`, remove
  the background, then normalize to the **1000×900 / ~86% character-height** spec
  above so it matches the frozen set.
