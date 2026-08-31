# GOOGLE_PRODUCTION_RUN_REPORT

**Status:** FAILED
**Generated:** 2026-08-19T18:46:16.373Z
**Golden Script ID:** `golden-011` — Not a Workout App — A Secret Lab in the Sky
**Provider policy:** Video = KIE.ai primary (Google Veo fallback). TTS/music = Gemini. No you.bot / Runware / Sharpii.

## FAILED — production stopped (no upload)

### Root cause

Creative Composition Layer failed — STOP (no slideshow fallback).

**Stopped at:** `creative-composition`

## Google AI Studio usage

| Field | Value |
|---|---|
| Google video model | kie/veo3_fast@720p |
| Google voice model | gemini-3.1-flash-tts-preview |
| Google image model (if needed) | imagen-4.0-fast-generate-001 |
| Video generation duration | 0 ms |
| Video generation cost (AI Studio) | not available from API |
| Images generated | 0 |
| Voice generated | no / reused |
| Total production time | 209396 ms |
| Remaining Google quota | Check Google AI Studio usage dashboard — API does not return remaining quota in this path. |

## Validation evidence

| Field | Value |
|---|---|
| Evidence certification | n/a |
| Launch score | 0 (min 95) |
| Thumbnail score (predicted CTR %) | n/a |
| Thumbnail path | n/a |
| QUALITY_REPORT.json | n/a |
| Local MP4 | n/a |
| Upload status | not attempted — stopped before upload |
| Video ID | n/a |
| Upload URL | n/a |

## Audio evidence

- Narration asset: `/Users/macbook/AmyNestProject/AmyNest-AI-p0-integrity/.amynest-assets/p0-regression-golden-011/audio/narration.wav`
- Music asset: `/Users/macbook/AmyNestProject/AmyNest-AI-p0-integrity/.amynest-assets/p0-regression-golden-011/audio/music.wav`
- _not measured_

## Subtitle evidence

- _not measured_

## Brand evidence

- _not measured_

## End-card evidence

- End card asset: `MISSING`
- _not measured_

## Timeline

| Step | ms | Result | Detail |
|---|---:|---|---|
| golden-script | 43 | PASS | golden-011 — Not a Workout App — A Secret Lab in the Sky |
| narration-tts | 13912 | PASS | reused /Users/macbook/AmyNestProject/AmyNest-AI-p0-integrity/.amynest-assets/p0-regression-golden-011/audio/narration.wav (49.6s; coverage=90%) |
| music-lyria | 0 | PASS | reused /Users/macbook/AmyNestProject/AmyNest-AI-p0-integrity/.amynest-assets/p0-regression-golden-011/audio/music.wav |
| content-diversity | 3 | PASS | score=100.0 similarity=0.0% locs=mirror-practice-nook/apartment-hallway/garden/car-ride |
| creative-composition | 0 | FAIL | Request blocked: The input content was flagged by safety filters for involving restricted third-party content. |

## Remaining quality issues

- None recorded

## Warnings / errors

- KIE credits before: 5572.88
- Audio provider: kie
- Bakeoff: YouTube upload skipped (AMYNEST_SKIP_UPLOAD=1)
- Diversity: Speech · amy-ai-hero · mirror-practice-nook, apartment-hallway, garden, car-ride, cta-stage
- Request blocked: The input content was flagged by safety filters for involving restricted third-party content.
