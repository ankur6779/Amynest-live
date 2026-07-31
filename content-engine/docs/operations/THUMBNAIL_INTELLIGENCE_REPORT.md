# AmyNest Thumbnail Intelligence Report

**Engine:** 2.0.0  
**Layer:** Additive Thumbnail Intelligence (CTR-first + Shorts cover)

> Per-run reports are written next to generated assets as  
> `THUMBNAIL_INTELLIGENCE_REPORT.md` in the output directory.  
> This file documents the schema and targets.

---

## Mission

Shorts often ignore custom uploads and show the first visible frames.

AmyNest treats **thumbnail = live opening frame** so the product looks professional either way.

---

## Chosen variant

| Field | Meaning |
|-------|---------|
| Variant A | Emotion-first |
| Variant B | Character-first |
| Variant C | Feature-first |
| Predicted CTR | Heuristic target **> 10%** |
| Live cover | Push-in + breath + particles (not a frozen plate) |

---

## Metrics (chosen)

| Metric | Target |
|--------|--------|
| Face size % | Characters dominate frame |
| Eye visibility | Instant recognition |
| Headline readability | Readable at **120px** |
| Contrast | High, clean purple stage |
| Mobile preview (120px) | PASS |
| Safe area | Shorts / Reels / TikTok chrome-safe |
| Character visibility | Amy + child relationship |
| Logo / store badges | Present, never dominant |
| First-frame similarity | Thumbnail ≡ opening (**≥ 85**) |

---

## YouTube status

After upload (optional wait 5–10 minutes):

1. Call `videos.list` (read-only)  
2. Detect custom / maxres thumb vs auto first-frame sizes  
3. Record evidence in the per-run report  

If Shorts uses the first frame → **live cover** is the safety net.

---

## Hook alignment

```
Thumbnail → Live opening → Hook → Story
```

One continuous experience. No bait-and-switch.

---

## Cost

- Local still generation + ffmpeg live cover only  
- No extra generative video API calls  
- Optional YouTube **read** for status check  

Kill-switch: `AMYNEST_THUMBNAIL_ENGINE=0`
