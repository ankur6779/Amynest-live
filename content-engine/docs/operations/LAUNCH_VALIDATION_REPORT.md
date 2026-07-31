# AmyNest Production Launch Validation Report

Generated: 2026-07-31T17:14:57.963Z
Validator: v2.0.0

## Result

- **Pass/Fail:** PASS
- **Evidence certification:** PASS
- **Recommendation:** auto_approve
- **Overall Launch Score:** 100
- **Title:** Teach, Practice, Quiz, Doubt — One Tutor That Follows the Child | AmyNest AI
- **Topic:** cta-rerender-golden-002
- **Render package:** rp_cta_g002_2040d95b53633c7d29fed306
- **Final MP4:** /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/amynest-google-golden-002.mp4
- **QUALITY_REPORT.json:** /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/QUALITY_REPORT.json

## Evidence rule

- Final MP4 is the single source of truth.
- Metadata alone can never PASS certification.
- INCONCLUSIVE (missing evidence) blocks publish.
- mediaSignals / hardcoded trust flags are removed.

## Scores

| Dimension | Score |
|---|---:|
| Story | 100 |
| Visual | 100 |
| Audio | 100 |
| Brand | 100 |
| Feature Accuracy | 100 |
| Accessibility | 100 |
| Technical | 100 |
| Campaign | 100 |
| Publishing Readiness | 100 |
| Evidence | 100 |
| **Overall Launch Score** | **100** |

## Launch Rules

- Evidence certification must be PASS
- 95–100 → AUTO APPROVE (only if evidence PASS)
- 90–94 → Manual review (still requires evidence PASS)
- Below 90 / any INCONCLUSIVE / evidence FAIL → Reject

## Blocked reasons

- All critical launch checks passed.

## Evidence gates

- [PASS] `evidence_integrity` conf=1 (probeComplete=true, fileSizeBytes=6874201, workDir=/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/evidence/evidence)
- [PASS] `audio` conf=0.85 (hasAudioStream=true, meanVolumeDb=-21.4, maxVolumeDb=-5.3, silenceRatio=0)
- [PASS] `subtitles` conf=0.8 (subtitleCoverage=1, transcriptOverlap=0.358974358974359, ocrCaptionChars=1127)
- [PASS] `end_card` conf=0.85 (appIconSimilarity=0.7770987741018972, endCardPurpleRatio=0.6455078125, googlePlayTextDetected=true, appStoreTextDetected=true)
- [PASS] `brand_detection` conf=0.8 (logoTextDetected=true, appIconSimilarity=0.7770987741018972, brandVisibleSeconds=2)
- [PASS] `cta_detection` conf=0.85 (ctaTextDetected=true, ctaVisibleSeconds=2.5)
- [PASS] `character_consistency` conf=0.75 (bestSimilarity=0.9022869635338278, bestCharacterId=amy-boy, samplesCompared=10, similarity.amy-ai=0.8270197012947552)
- [PASS] `visual_quality` conf=0.9 (width=1080, height=1920, blackSeconds=0, meanLuma=143.94425455729166)
- [PASS] `motion_quality` conf=0.75 (sceneChangeCount=14, fps=30, freezeSeconds=0)
- [PASS] `text_readability` conf=0.7 (ocrReadableChars=2935, ocrFrames=32)
- [PASS] `story_quality` conf=0.7 (beginning=true, conflict=true, resolution=true, cta=true)
- [PASS] `muted_story` conf=0.75 (captionsReadableMuted=true, visualProgression=true, ctaVisibleMuted=true, visualContinuity=true)
- [PASS] `brand_mention` conf=0.8 (visualMention=true, narrationPresent=true, naturalInVoiceScript=true)
- [PASS] `compliance` conf=0.9 (placeholderDetected=false, todoDetected=false, debugOverlayDetected=false, stockWatermarkDetected=false)
- [PASS] `performance` conf=0.95 (fileSizeBytes=6874201, durationSec=21, hasAudioStream=true, corrupt=false)
- [PASS] `metadata` conf=1 (titlePresent=true, descriptionPresent=true, mediaGatesBlocking=0, renderSubtitleModeClaim=burned-in)

## Improvement Suggestions

- None — ready for upload.

## Failed Checks

_No failed checks._

## All Checks

- [PASS] `evidence.evidence_integrity` GATE_EVIDENCE_INTEGRITY: Evidence integrity — evidence PASS
- [PASS] `evidence.audio` GATE_AUDIO: Audio (narration + music + loudness) — evidence PASS
- [PASS] `evidence.subtitles` GATE_SUBTITLES: Burned-in subtitles (OCR) — evidence PASS
- [PASS] `evidence.end_card` GATE_END_CARD: End card (icon + badges + CTA) — evidence PASS
- [PASS] `evidence.brand_detection` GATE_BRAND_DETECTION: Brand / logo detection — evidence PASS
- [PASS] `evidence.cta_detection` GATE_CTA_DETECTION: CTA detection (on video) — evidence PASS
- [PASS] `evidence.character_consistency` GATE_CHARACTER_CONSISTENCY: Character consistency (bible match) — evidence PASS
- [PASS] `evidence.visual_quality` GATE_VISUAL_QUALITY: Visual quality — evidence PASS
- [PASS] `evidence.motion_quality` GATE_MOTION_QUALITY: Motion quality — evidence PASS
- [PASS] `evidence.text_readability` GATE_TEXT_READABILITY: Text readability (OCR) — evidence PASS
- [PASS] `evidence.story_quality` GATE_STORY_QUALITY: Story quality (final MP4) — evidence PASS
- [PASS] `evidence.muted_story` GATE_MUTED_STORY: Muted story test — evidence PASS
- [PASS] `evidence.brand_mention` GATE_BRAND_MENTION: AmyNest natural brand mention — evidence PASS
- [PASS] `evidence.compliance` GATE_COMPLIANCE: Compliance (no placeholders/debug/stock) — evidence PASS
- [PASS] `evidence.performance` GATE_PERFORMANCE: Performance / output integrity — evidence PASS
- [PASS] `evidence.metadata` GATE_METADATA: Metadata (after media pass) — evidence PASS
- [PASS] `tech.resolution` RESOLUTION: Resolution must be 1080x1920 (probed 1080x1920)
- [PASS] `tech.duration` DURATION: Duration must match target (~21s); probed=21s
- [PASS] `tech.fps` FPS: FPS should be 30 (probed 30)
- [PASS] `tech.audio-stream` AUDIO_STREAM: Final MP4 must contain a non-silent audio stream
- [PASS] `tech.bitrate` BITRATE: Export should meet target quality bitrate / file size
- [PASS] `tech.playable-mp4` NOT_PLAYABLE_MP4: Final file must be a playable H.264 MP4 (probe must succeed)
- [PASS] `tech.package-claims-untrusted` CLAIMS_UNTRUSTED: Render package subtitleMode/watermark claims are ignored — OCR/probe decide
- [PASS] `feature.no-hallucinations` FEATURE_HALLUCINATION: Content must not invent unsafe or nonexistent capabilities
- [PASS] `feature.real-only` UNREAL_FEATURE: Only real AmyNest features may be promoted
- [PASS] `feature.correct-names` WRONG_FEATURE_NAME: Feature names must match product language
- [PASS] `feature.ui-references` BAD_UI_REFERENCE: UI references must match AmyNest screens
- [PASS] `platform.multi-safe` PLATFORM_UNSAFE: Package meets multi-platform vertical delivery spec
- [PASS] `platform.youtube-shorts` YOUTUBE_SHORTS: Must be YouTube Shorts safe (≤60s, 9:16)
- [PASS] `platform.instagram-reels` INSTAGRAM_REELS: Must be Instagram Reels safe
- [PASS] `platform.facebook-reels` FACEBOOK_REELS: Must be Facebook Reels safe
- [PASS] `platform.tiktok-safe-area` TIKTOK_SAFE_AREA: TikTok UI safe area must be respected
- [PASS] `platform.caption-safe-area` CAPTION_SAFE_AREA: Captions must stay in platform-safe zones
- [PASS] `policy.moderation` POLICY_VIOLATION: Content passes AmyNest safety moderation
- [PASS] `policy.child-safe` NOT_CHILD_SAFE: Content must remain child-safe
- [PASS] `policy.family-safe` FAMILY_SAFE: Package must remain family-safe for parent-audience distribution
- [PASS] `policy.no-misleading` MISLEADING_PROMISE: No misleading medical/outcome promises
- [PASS] `policy.copyright` COPYRIGHT_RISK: Avoid copyrighted IP references in promo copy
- [PASS] `business.not-duplicate` DUPLICATE_TOPIC: Must not republish a duplicate topic accidentally
- [PASS] `business.campaign-balance` CAMPAIGN_IMBALANCE: Campaign / series balance should remain healthy
- [PASS] `business.editorial-fit` EDITORIAL_MISFIT: Topic should respect editorial intelligence scoring
- [PASS] `business.seasonal` SEASONAL_WEAK: Seasonal relevance should be considered
- [PASS] `business.publish-slot` NO_PUBLISH_SLOT: A publishing slot / schedule must be available

## Publishing Recommendation

AUTO APPROVE — upload may proceed.

