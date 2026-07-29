# CTA_DESIGN_GUIDE

**Date:** 2026-07-29  
**Scope:** Final 3–4 second CTA only  
**Non-goals:** Do not change character scenes · validators · publishing architecture  

---

## Brand target

The end card should feel like a **premium mobile app advertisement** (Duolingo / Headspace / Khan Academy Kids / Spotify / Calm) — not a generated poster or sticker collage.

---

## Layout (9:16 · 1080×1920)

| Zone | ~% | Content |
|---|---:|---|
| Top | 10% | Official AmyNest logo with soft glow |
| Center | 40% | Amy AI **left**, standing on floor, looking/pointing toward phone |
| Center-right | — | Large realistic **phone mockup** showing the **real AmyNest home screen** (`dashboard.png`) |
| Mid-lower | — | Headline + subheadline |
| Bottom row | — | Google Play + App Store badges, **same height**, side-by-side |
| Footer | — | `amynest.in` |

### Copy (locked)

- **Headline:** Download AmyNest AI  
- **Subheadline:** Start Your Child's Learning Journey  
- **Footer:** amynest.in  

---

## Design rules

1. **Depth** — gradient air → floor plane → glass card → phone + Amy  
2. **Soft shadows** — phone drop shadow + Amy contact shadow on floor  
3. **Glassmorphism** — translucent rounded card behind the product moment  
4. **Purple gradient** — brand `#461EA8` / `#6A2CFF` lighting language  
5. **Premium lighting** — soft volumetric orb + subtle baked particles  
6. **Safe margins** — no edge-clipped badges or logo  
7. **No overlap** — copy, badges, phone, and Amy occupy separate regions  
8. **Balanced spacing** — equal badge heights; centered bottom row  

---

## Character rules (Amy AI)

| Do | Don’t |
|---|---|
| Fully stage Amy into the CTA room | Paste a transparent PNG sticker |
| Cast a contact shadow on the floor | Float her in empty purple void |
| Stand beside the phone, facing/pointing to it | Cover badges or headline |
| Key the official base (remove baked checkerboard) into the purple stage | Leave checkerboard / medallion vignettes |

**Compositing note:** `amy-ai-base.png` is an RGB asset with a **dark-gray checkerboard baked into pixels** (not real alpha). The plate builder flood-fills border-matching neutrals to alpha before paste.

---

## App presentation

- Phone bezel + notch + screen inset  
- Screen content = **real** AmyNest dashboard / home capture  
  - Source: `artifacts/kidschedule/public/landing/screenshots/dashboard.png`  
- Never fullscreen fake Imagen UI  
- Never invent a new home layout  

---

## Motion (3.5–4.0s)

| Effect | Spec |
|---|---|
| Camera | Slow push-in (gentle crop drift) |
| Glow | Soft brightness pulse (~2.2s period) |
| Particles | Subtle, pre-baked; no chaotic motion |
| Forbidden | Flash cuts, bouncing stickers, spinning badges |

---

## Removed (anti-patterns)

- Transparent PNG backgrounds as the scene  
- Floating character cut-outs  
- Huge stacked store badges dominating the frame  
- Empty purple dead space  
- Text overlapping badges  
- Sticker-like collage energy  

---

## Implementation

| File | Role |
|---|---|
| `creative-composition/cta-premium.ts` | Plate builder + CTA animation |
| `operations/rerender-cta-only.ts` | Rebuild CTA clip only → remux → certify → UNLISTED upload |

### Rebuild command

```bash
cd content-engine
pnpm exec node --import tsx/esm ./operations/rerender-cta-only.ts
```

Scene clips (`shot-hook` … `shot-amy-boy-celebrate`) are **read-only** for this path.

---

## QA checklist

- [ ] Logo readable in top band  
- [ ] Amy AI grounded with shadow, pointing toward phone  
- [ ] Real home UI visible inside phone  
- [ ] Badges equal height, side-by-side, readable  
- [ ] “Google Play” / “App Store” / “Download AmyNest AI” OCR-safe  
- [ ] Footer shows `amynest.in`  
- [ ] Duration 3–4s with slow push-in  
- [ ] No other scene changed  
