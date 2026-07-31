# GOOGLE_GOLDEN_002_PRODUCTION_RUN

**Status:** SUCCESS
**Generated:** 2026-07-31T16:54:30.238Z
**Golden Script:** `golden-002` — Teach, Practice, Quiz, Doubt — One Tutor That Follows the Child

## SUCCESS — marketing Short uploaded UNLISTED

## Validation evidence

| Field | Value |
|---|---|
| Evidence certification | PASS |
| Launch score | 100 |
| QUALITY_REPORT.json | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/QUALITY_REPORT.json |
| Local MP4 | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/amynest-google-golden-002.mp4 |
| Upload status | uploaded unlisted |
| Video ID | hk2zwEkFvZQ |
| Video URL | https://youtube.com/shorts/hk2zwEkFvZQ |

## Audio evidence

- Narration asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/audio/narration.wav`
- Music asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/audio/music.wav`
- PASS: hasAudioStream=true, meanVolumeDb=-21.4, maxVolumeDb=-5.3, silenceRatio=0

## Subtitle evidence

- PASS: subtitleCoverage=1, transcriptOverlap=0.313953488372093, ocrCaptionChars=871

## Brand evidence

- PASS: logoTextDetected=true, appIconSimilarity=0.7717687748220602, brandVisibleSeconds=2

## End-card evidence

- End card asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/work/cinematic/cta-premium-plate.png`
- PASS: appIconSimilarity=0.7717687748220602, endCardPurpleRatio=0.8359375, googlePlayTextDetected=true, appStoreTextDetected=true, ctaTextDetected=true, endCardDurationSec=2.5

## Timeline

| Step | ms | Result | Detail |
|---|---:|---|---|
| golden-script | 65 | PASS | golden-002 — Teach, Practice, Quiz, Doubt — One Tutor That Follows the Child |
| narration-tts | 15114 | PASS | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/audio/narration.wav |
| music-lyria | 0 | PASS | reused /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/audio/music.wav |
| creative-composition | 46172 | PASS | Composed 5 Veo character performances (veo-3.1-fast-generate-preview); rules=three-permanent-characters-only,bible-identity-image-to-video,continuous-veo-performances,no-still-plate-montage,amy-ai-host-every-episode,app-ui-in-device-only,wardrobe-face-proportion-lock,camera-and-character-motion |
| mux-master | 8201 | PASS | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/amynest-google-golden-002.mp4 |
| launch-validator | 37449 | PASS | cert=PASS score=100 |
| youtube-upload | 40447 | PASS | https://youtube.com/shorts/hk2zwEkFvZQ |

## Remaining quality issues

- Veo image-to-video identity lock is first-frame based; residual wardrobe/face drift can appear across shots — tighten with referenceImages when 9:16 support is confirmed.
- App UI inside tablet is prompt-directed (not a live screen recording) — keep UI ≤2s and prefer real device captures later.

## Warnings / errors

- Composition rules: three-permanent-characters-only, bible-identity-image-to-video, continuous-veo-performances, no-still-plate-montage, amy-ai-host-every-episode, app-ui-in-device-only, wardrobe-face-proportion-lock, camera-and-character-motion
