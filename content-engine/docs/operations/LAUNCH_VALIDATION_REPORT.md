# AmyNest Production Launch Validation Report

Generated: 2026-07-29T18:18:37.696Z
Validator: v2.0.0

## Result

- **Pass/Fail:** FAIL
- **Evidence certification:** FAIL
- **Recommendation:** reject
- **Overall Launch Score:** 56
- **Title:** Gentle Discipline That Actually Works | AmyNest AI
- **Topic:** parenting-001
- **Render package:** rp_phase6_fixture
- **Final MP4:** /var/folders/hh/kw1ccv157fdgfqxbfn575n1m0000gn/T/amynest-lv-report-TwLeK7/silent.mp4
- **QUALITY_REPORT.json:** /var/folders/hh/kw1ccv157fdgfqxbfn575n1m0000gn/T/amynest-lv-report-TwLeK7/QUALITY_REPORT.json

## Evidence rule

- Final MP4 is the single source of truth.
- Metadata alone can never PASS certification.
- INCONCLUSIVE (missing evidence) blocks publish.
- mediaSignals / hardcoded trust flags are removed.

## Scores

| Dimension | Score |
|---|---:|
| Story | 0 |
| Visual | 100 |
| Audio | 0 |
| Brand | 33 |
| Feature Accuracy | 100 |
| Accessibility | 0 |
| Technical | 58 |
| Campaign | 79 |
| Publishing Readiness | 91 |
| Evidence | 100 |
| **Overall Launch Score** | **56** |

## Launch Rules

- Evidence certification must be PASS
- 95–100 → AUTO APPROVE (only if evidence PASS)
- 90–94 → Manual review (still requires evidence PASS)
- Below 90 / any INCONCLUSIVE / evidence FAIL → Reject

## Blocked reasons

- audio:FAIL — Final MP4 has no usable audio (silent or missing track)
- subtitles:FAIL — OCR found no burned-in subtitle text on sampled frames
- end_card:FAIL — Google Play badge/text not detected on end card
- cta_detection:FAIL — Install/Download CTA not visible on rendered frames
- text_readability:FAIL — Insufficient readable on-screen text detected
- story_quality:FAIL — Missing story beats on video: beginning, conflict, resolution, cta, amynestNatural
- muted_story:FAIL — Muted playback is not understandable (captions/progression/CTA missing)
- brand_mention:FAIL — AmyNest not visible on rendered frames
- compliance:FAIL — Compliance hits: missing-or-tiny-media
- performance:FAIL — Output file too small / missing assets
- metadata:FAIL — Metadata cannot pass while media gates are FAIL/INCONCLUSIVE — final MP4 is source of truth
- AUDIO: Audio (narration + music + loudness) — FAIL: Final MP4 has no usable audio (silent or missing track) (audio/critical/FAIL)
- SUBTITLES: Burned-in subtitles (OCR) — FAIL: OCR found no burned-in subtitle text on sampled frames (accessibility/critical/FAIL)
- END_CARD: End card (icon + badges + CTA) — FAIL: Google Play badge/text not detected on end card (brand/critical/FAIL)
- CTA_DETECTION: CTA detection (on video) — FAIL: Install/Download CTA not visible on rendered frames (brand/critical/FAIL)
- TEXT_READABILITY: Text readability (OCR) — FAIL: Insufficient readable on-screen text detected (accessibility/critical/FAIL)
- STORY_QUALITY: Story quality (final MP4) — FAIL: Missing story beats on video: beginning, conflict, resolution, cta, amynestNatural (story/critical/FAIL)
- MUTED_STORY: Muted story test — FAIL: Muted playback is not understandable (captions/progression/CTA missing) (story/critical/FAIL)
- BRAND_MENTION: AmyNest natural brand mention — FAIL: AmyNest not visible on rendered frames (story/critical/FAIL)
- COMPLIANCE: Compliance (no placeholders/debug/stock) — FAIL: Compliance hits: missing-or-tiny-media (policy/critical/FAIL)
- PERFORMANCE: Performance / output integrity — FAIL: Output file too small / missing assets (technical/critical/FAIL)
- METADATA: Metadata (after media pass) — FAIL: Metadata cannot pass while media gates are FAIL/INCONCLUSIVE — final MP4 is source of truth (business/critical/FAIL)
- FPS: FPS should be 30 (probed 25) (technical/major/FAIL)
- AUDIO_STREAM: Final MP4 must contain a non-silent audio stream (technical/critical/FAIL)

## Evidence gates

- [PASS] `evidence_integrity` conf=1 (probeComplete=true, fileSizeBytes=47906, workDir=/var/folders/hh/kw1ccv157fdgfqxbfn575n1m0000gn/T/amynest-lv-report-TwLeK7/evidence)
- [FAIL] `audio` conf=0.99 (hasAudioStream=true, meanVolumeDb=-91, maxVolumeDb=-91, silenceRatio=1) — Final MP4 has no usable audio (silent or missing track)
- [FAIL] `subtitles` conf=0.9 (subtitleCoverage=0, transcriptOverlap=0, ocrCaptionChars=0) — OCR found no burned-in subtitle text on sampled frames
- [FAIL] `end_card` conf=0.85 (appIconSimilarity=0.5435367159574275, endCardPurpleRatio=1, googlePlayTextDetected=false, appStoreTextDetected=false) — Google Play badge/text not detected on end card
- [PASS] `brand_detection` conf=0.8 (logoTextDetected=false, appIconSimilarity=0.5435367159574275, brandVisibleSeconds=2)
- [FAIL] `cta_detection` conf=0.85 (ctaTextDetected=false, ctaVisibleSeconds=0) — Install/Download CTA not visible on rendered frames
- [PASS] `character_consistency` conf=0.75 (bestSimilarity=0.7875556919121159, bestCharacterId=amy-ai, samplesCompared=10, similarity.amy-ai=0.7875556919121159)
- [PASS] `visual_quality` conf=0.9 (width=1080, height=1920, blackSeconds=0, meanLuma=45.0625)
- [PASS] `motion_quality` conf=0.75 (sceneChangeCount=2, fps=25, freezeSeconds=0)
- [FAIL] `text_readability` conf=0.7 (ocrReadableChars=0, ocrFrames=29) — Insufficient readable on-screen text detected
- [FAIL] `story_quality` conf=0.7 (beginning=false, conflict=false, resolution=false, cta=false) — Missing story beats on video: beginning, conflict, resolution, cta, amynestNatural
- [FAIL] `muted_story` conf=0.75 (captionsReadableMuted=false, visualProgression=true, ctaVisibleMuted=false, visualContinuity=true) — Muted playback is not understandable (captions/progression/CTA missing)
- [FAIL] `brand_mention` conf=0.8 (visualMention=false, narrationPresent=false, naturalInVoiceScript=true) — AmyNest not visible on rendered frames
- [FAIL] `compliance` conf=0.9 (placeholderDetected=false, todoDetected=false, debugOverlayDetected=false, stockWatermarkDetected=false) — Compliance hits: missing-or-tiny-media
- [FAIL] `performance` conf=0.95 (fileSizeBytes=47906, durationSec=16, hasAudioStream=true, corrupt=false) — Output file too small / missing assets
- [FAIL] `metadata` conf=1 (titlePresent=true, descriptionPresent=true, mediaGatesBlocking=10, renderSubtitleModeClaim=burned-in) — Metadata cannot pass while media gates are FAIL/INCONCLUSIVE — final MP4 is source of truth

## Improvement Suggestions

- Fix the final MP4 (not metadata) and re-run evidence certification.
- Export 30fps H.264 for platform consistency.
- Mux real narration + music — never anullsrc silence.

## Failed Checks

- **AUDIO** (audio/critical/FAIL): Audio (narration + music + loudness) — FAIL: Final MP4 has no usable audio (silent or missing track)
- **SUBTITLES** (accessibility/critical/FAIL): Burned-in subtitles (OCR) — FAIL: OCR found no burned-in subtitle text on sampled frames
- **END_CARD** (brand/critical/FAIL): End card (icon + badges + CTA) — FAIL: Google Play badge/text not detected on end card
- **CTA_DETECTION** (brand/critical/FAIL): CTA detection (on video) — FAIL: Install/Download CTA not visible on rendered frames
- **TEXT_READABILITY** (accessibility/critical/FAIL): Text readability (OCR) — FAIL: Insufficient readable on-screen text detected
- **STORY_QUALITY** (story/critical/FAIL): Story quality (final MP4) — FAIL: Missing story beats on video: beginning, conflict, resolution, cta, amynestNatural
- **MUTED_STORY** (story/critical/FAIL): Muted story test — FAIL: Muted playback is not understandable (captions/progression/CTA missing)
- **BRAND_MENTION** (story/critical/FAIL): AmyNest natural brand mention — FAIL: AmyNest not visible on rendered frames
- **COMPLIANCE** (policy/critical/FAIL): Compliance (no placeholders/debug/stock) — FAIL: Compliance hits: missing-or-tiny-media
- **PERFORMANCE** (technical/critical/FAIL): Performance / output integrity — FAIL: Output file too small / missing assets
- **METADATA** (business/critical/FAIL): Metadata (after media pass) — FAIL: Metadata cannot pass while media gates are FAIL/INCONCLUSIVE — final MP4 is source of truth
- **FPS** (technical/major/FAIL): FPS should be 30 (probed 25)
- **AUDIO_STREAM** (technical/critical/FAIL): Final MP4 must contain a non-silent audio stream

## All Checks

- [PASS] `evidence.evidence_integrity` GATE_EVIDENCE_INTEGRITY: Evidence integrity — evidence PASS
- [FAIL] `evidence.audio` AUDIO: Audio (narration + music + loudness) — FAIL: Final MP4 has no usable audio (silent or missing track)
- [FAIL] `evidence.subtitles` SUBTITLES: Burned-in subtitles (OCR) — FAIL: OCR found no burned-in subtitle text on sampled frames
- [FAIL] `evidence.end_card` END_CARD: End card (icon + badges + CTA) — FAIL: Google Play badge/text not detected on end card
- [PASS] `evidence.brand_detection` GATE_BRAND_DETECTION: Brand / logo detection — evidence PASS
- [FAIL] `evidence.cta_detection` CTA_DETECTION: CTA detection (on video) — FAIL: Install/Download CTA not visible on rendered frames
- [PASS] `evidence.character_consistency` GATE_CHARACTER_CONSISTENCY: Character consistency (bible match) — evidence PASS
- [PASS] `evidence.visual_quality` GATE_VISUAL_QUALITY: Visual quality — evidence PASS
- [PASS] `evidence.motion_quality` GATE_MOTION_QUALITY: Motion quality — evidence PASS
- [FAIL] `evidence.text_readability` TEXT_READABILITY: Text readability (OCR) — FAIL: Insufficient readable on-screen text detected
- [FAIL] `evidence.story_quality` STORY_QUALITY: Story quality (final MP4) — FAIL: Missing story beats on video: beginning, conflict, resolution, cta, amynestNatural
- [FAIL] `evidence.muted_story` MUTED_STORY: Muted story test — FAIL: Muted playback is not understandable (captions/progression/CTA missing)
- [FAIL] `evidence.brand_mention` BRAND_MENTION: AmyNest natural brand mention — FAIL: AmyNest not visible on rendered frames
- [FAIL] `evidence.compliance` COMPLIANCE: Compliance (no placeholders/debug/stock) — FAIL: Compliance hits: missing-or-tiny-media
- [FAIL] `evidence.performance` PERFORMANCE: Performance / output integrity — FAIL: Output file too small / missing assets
- [FAIL] `evidence.metadata` METADATA: Metadata (after media pass) — FAIL: Metadata cannot pass while media gates are FAIL/INCONCLUSIVE — final MP4 is source of truth
- [PASS] `tech.resolution` RESOLUTION: Resolution must be 1080x1920 (probed 1080x1920)
- [PASS] `tech.duration` DURATION: Duration must match target (~16s); probed=16s
- [FAIL] `tech.fps` FPS: FPS should be 30 (probed 25)
- [FAIL] `tech.audio-stream` AUDIO_STREAM: Final MP4 must contain a non-silent audio stream
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

REJECT — do not upload. Fix final MP4 evidence failures and re-validate.

