# AmyNest Thumbnail Engine 2.0

**Version:** 2.0.0  
**Kill-switch:** `AMYNEST_THUMBNAIL_ENGINE=0` (default **on**)

Additive **Thumbnail Intelligence** layer — does **not** modify production pipeline, rendering, publishing architecture, or validators.

---

## Mission

Optimize for YouTube Shorts reality: custom thumbs may be ignored.

**Thumbnail = live first 1.5–2s** so auto-selected previews still look like an animated film open.

---

## v2 intelligence

| Feature | Behavior |
|---------|----------|
| A/B/C variants | Emotion / Character / Feature — pick highest predicted CTR |
| Live cover | Push-in + breath + floating particles (not a frozen still) |
| Hierarchy | Characters → emotion → headline → logo → badges |
| Safe areas | Shorts / Reels / TikTok chrome-safe margins |
| Metrics | Face %, eyes, readability, contrast, 120px mobile, chrome visibility |
| YouTube status | Optional `videos.list` after wait — custom vs first-frame evidence |
| Hook alignment | Thumbnail → open → hook → story (no bait-and-switch) |

---

## Outputs

- `thumbnail.jpg` / `.webp` / `-preview.png` / `-mobile-120.png`
- `variant-A|B|C.*`
- `thumbnail-cover.mp4` (live)
- `video-with-thumbnail-cover.mp4`
- `THUMBNAIL_REPORT.md`
- `THUMBNAIL_INTELLIGENCE_REPORT.md`

---

## Usage

```bash
node --import tsx/esm content-engine/thumbnail-engine/cli.ts \
  --out=./out --title="Speak Better" --video=./final.mp4

# Delayed Shorts status check (5–10 min):
node --import tsx/esm content-engine/thumbnail-engine/cli.ts \
  --out=./out --title="Speak Better" \
  --video-id=VIDEO_ID --access-token=TOKEN --status-wait-ms=300000
```

`pnpm run youtube:upload` remains additive and picks up generated `thumbnail.jpg` + live cover.

See also:

- [THUMBNAIL_INTELLIGENCE_REPORT.md](./THUMBNAIL_INTELLIGENCE_REPORT.md)
- [THUMBNAIL_LEARNING_ENGINE.md](./THUMBNAIL_LEARNING_ENGINE.md) — CTR feedback loop (additive; does not modify this engine)
