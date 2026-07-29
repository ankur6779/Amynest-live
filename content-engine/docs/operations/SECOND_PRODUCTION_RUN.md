# SECOND_PRODUCTION_RUN

**Status:** SUCCESS
**Generated:** 2026-07-29T17:39:03.669Z
**Golden Script:** `golden-001` — A Fresh Lesson Every Day — Without the Worksheet Panic

## SUCCESS — marketing Short uploaded UNLISTED

## Validation evidence

| Field | Value |
|---|---|
| Evidence certification | PASS |
| Launch score | 100 |
| QUALITY_REPORT.json | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/QUALITY_REPORT.json |
| Local MP4 | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/amynest-second-production-golden-001.mp4 |
| Upload status | uploaded unlisted |
| Video ID | Ii0Vzfe5Rf0 |
| Video URL | https://youtube.com/shorts/Ii0Vzfe5Rf0 |

## Audio evidence

- Narration asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/audio/narration.wav`
- Music asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/audio/music.wav`
- PASS: hasAudioStream=true, meanVolumeDb=-21.1, maxVolumeDb=-5.1, silenceRatio=0

## Subtitle evidence

- PASS: subtitleCoverage=1, transcriptOverlap=0.36046511627906974, ocrCaptionChars=690

## Brand evidence

- PASS: logoTextDetected=true, appIconSimilarity=0.7717687748220602, brandVisibleSeconds=2

## End-card evidence

- End card asset: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/work/cinematic/cta-premium-plate.png`
- PASS: appIconSimilarity=0.7717687748220602, endCardPurpleRatio=0.808837890625, googlePlayTextDetected=true, appStoreTextDetected=true, ctaTextDetected=true, endCardDurationSec=2.5

## Timeline

| Step | ms | Result | Detail |
|---|---:|---|---|
| golden-script | 44 | PASS | golden-001 — A Fresh Lesson Every Day — Without the Worksheet Panic |
| narration-tts | 1 | PASS | reused /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/audio/narration.wav |
| music-lyria | 0 | PASS | reused /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/audio/music.wav |
| creative-composition | 37404 | PASS | Composed 5 Veo character performances (veo-3.1-fast-generate-preview); rules=three-permanent-characters-only,bible-identity-image-to-video,continuous-veo-performances,no-still-plate-montage,amy-ai-host-every-episode,app-ui-in-device-only,wardrobe-face-proportion-lock,camera-and-character-motion |
| mux-master | 6821 | PASS | /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/amynest-second-production-golden-001.mp4 |
| launch-validator | 32235 | PASS | cert=PASS score=100 |
| youtube-upload | 36750 | PASS | https://youtube.com/shorts/Ii0Vzfe5Rf0 |

## Remaining quality issues

- Veo image-to-video identity lock is first-frame based; residual wardrobe/face drift can appear across shots — tighten with referenceImages when 9:16 support is confirmed.
- App UI inside tablet is prompt-directed (not a live screen recording) — keep UI ≤2s and prefer real device captures later.

## Warnings / errors

- Composition rules: three-permanent-characters-only, bible-identity-image-to-video, continuous-veo-performances, no-still-plate-montage, amy-ai-host-every-episode, app-ui-in-device-only, wardrobe-face-proportion-lock, camera-and-character-motion
