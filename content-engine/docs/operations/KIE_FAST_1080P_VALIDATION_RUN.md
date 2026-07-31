# KIE_PRODUCTION_RUN

**Status:** FAILED
**Generated:** 2026-07-30T19:22:22.756Z
**Provider used:** kie.ai (`veo3_fast`)
**Golden Script:** `golden-001` — A Fresh Lesson Every Day — Without the Worksheet Panic

## FAILED — production stopped (no upload)

## Summary

| Field | Value |
|---|---|
| Provider | kie.ai |
| Model | `veo3_fast` |
| Launch score / cert | 0 / n/a |
| Quality report | n/a |
| Credits before | 100 |
| Credits after | n/a |
| Credits consumed | n/a |
| Actual billed cost | n/a |
| Generation duration | 0 ms |
| Rendering duration | 0 ms |
| Upload duration | 0 ms |
| Total production time | 397 ms |
| Local MP4 | n/a |
| Upload status | not attempted — stopped before upload |
| Video ID | n/a |
| Final YouTube URL | n/a |
| Reused bakeoff raws | no |
| Quality mode | Veo 3.1 Fast @ 1080p (native, quality-boosted prompts) |
| Generation resolution | 1080p |
| FPS | 30 |

## Timeline

| Step | ms | Result | Detail |
|---|---:|---|---|
| youtube-oauth | 397 | PASS | token ready |
| golden-script | 0 | PASS | golden-001 — A Fresh Lesson Every Day — Without the Worksheet Panic |

## Failure

- Stopped at: `preflight`
- Root cause: Top up KIE before quality production run (~$1.13 more at $0.005/credit).
- Errors:
  - Insufficient KIE credits: 100 (need ~325 for Veo 3.1 Fast @ 1080p (native, quality-boosted prompts))

## Isolation notes

- Production pipeline / validators / rendering / publishing code: **unchanged**
- Media provider override for this run only: **KIE.ai veo3_fast @ 1080p**
- Assets reused: golden-001 keyframes, captions, CTA plate, narration, music
- Quality boost: native resolution + motion/cinema prompt boost + CRF16 encode (KIE runner only)
