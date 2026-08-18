# GOOGLE_PRODUCTION_RUN_REPORT

**Status:** FAILED
**Generated:** 2026-08-18T18:54:28.971Z
**Golden Script ID:** `golden-009` — A Parent View Built for Caregivers — Not Just Kids
**Provider policy:** Video = KIE.ai primary (Google Veo fallback). TTS/music = Gemini. No you.bot / Runware / Sharpii.

## FAILED — production stopped (no upload)

### Root cause

Creative Composition Layer failed — STOP (no slideshow fallback).

**Stopped at:** `creative-composition`

## Google AI Studio usage

| Field | Value |
|---|---|
| Google video model | kie/veo3_fast@720p |
| Google voice model | google/gemini-3-1-flash-tts |
| Google image model (if needed) | imagen-4.0-fast-generate-001 |
| Video generation duration | 0 ms |
| Video generation cost (AI Studio) | not available from API |
| Images generated | 0 |
| Voice generated | yes |
| Total production time | 278101 ms |
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

- Narration asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/p0-fix-golden-009/audio/narration.wav`
- Music asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/p0-fix-golden-009/audio/music.wav`
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
| golden-script | 36 | PASS | golden-009 — A Parent View Built for Caregivers — Not Just Kids |
| narration-tts | 76564 | PASS | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/p0-fix-golden-009/audio/narration.wav (45.3s; coverage=88%; google/gemini-3-1-flash-tts) |
| music-lyria | 69540 | PASS | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/p0-fix-golden-009/audio/music.wav (kie-suno/V4) |
| content-diversity | 5 | PASS | score=92.0 similarity=14.5% locs=balcony/cafe/apartment-hallway/car-ride |
| creative-composition | 0 | FAIL | The Google model was unable to generate audio for this request. Please try a different prompt. |

## Remaining quality issues

- None recorded

## Warnings / errors

- KIE credits before: 6826.51
- Audio provider: kie
- Bakeoff: YouTube upload skipped (AMYNEST_SKIP_UPLOAD=1)
- Diversity: Speech · question · balcony, cafe, apartment-hallway, car-ride, cta-stage
- The Google model was unable to generate audio for this request. Please try a different prompt.
