# GOOGLE_PRODUCTION_RUN_REPORT

**Status:** FAILED
**Generated:** 2026-08-06T15:47:35.414Z
**Golden Script ID:** `golden-006` — Hear It. Say It. Get Gentle Feedback.
**Provider policy:** Google AI Studio ONLY (no KIE / you.bot / Runware / Sharpii / OpenAI Images)

## FAILED — production stopped (no upload)

### Root cause

Creative Composition Layer failed — STOP (no slideshow fallback).

**Stopped at:** `creative-composition`

## Google AI Studio usage

| Field | Value |
|---|---|
| Google video model | veo-3.1-fast-generate-preview |
| Google voice model | gemini-3.1-flash-tts-preview |
| Google image model (if needed) | imagen-4.0-fast-generate-001 |
| Video generation duration | 0 ms |
| Video generation cost (AI Studio) | not available from API |
| Images generated | 0 |
| Voice generated | no / reused |
| Total production time | 34110 ms |
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

- Narration asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-006/audio/narration.wav`
- Music asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-006/audio/music.wav`
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
| golden-script | 82 | PASS | golden-006 — Hear It. Say It. Get Gentle Feedback. |
| narration-tts | 0 | PASS | reused /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-006/audio/narration.wav |
| music-lyria | 1 | PASS | reused /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-006/audio/music.wav |
| content-diversity | 5 | PASS | score=92.8 similarity=13.1% locs=mirror-practice-nook/child-bedroom/living-room/playroom |
| creative-composition | 0 | FAIL | Gemini/Veo rate limited during startGeneration: {
  "error": {
    "code": 429,
    "message": "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing. Learn more at https://ai.google.dev/gemini-api/docs/billing#prepay. ",
    "status": "RESOURCE_EXHAUSTED"
  }
}
 |

## Remaining quality issues

- None recorded

## Warnings / errors

- Diversity: Speech · parent-child · mirror-practice-nook, child-bedroom, living-room, playroom, cta-stage
- Gemini/Veo rate limited during startGeneration: {
  "error": {
    "code": 429,
    "message": "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing. Learn more at https://ai.google.dev/gemini-api/docs/billing#prepay. ",
    "status": "RESOURCE_EXHAUSTED"
  }
}

