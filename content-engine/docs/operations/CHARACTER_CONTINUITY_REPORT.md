# CHARACTER_CONTINUITY_REPORT

**Date:** 2026-07-29  
**Golden script:** golden-001 — A Fresh Lesson Every Day — Without the Worksheet Panic  
**Status:** SUCCESS  
**Video:** https://youtube.com/shorts/Ii0Vzfe5Rf0  
**Certification:** PASS  

## Objective

Render golden-001 as a continuous **character-performance episode** starring only Amy AI, Amy Girl, and Amy Boy — not an Imagen still montage.

## Provider policy

- Video engine: **google-veo** (unchanged)
- Daily model: `veo-3.1-fast-generate-preview` (via media stack tier)
- Identity lock: official character **base** assets → 9:16 keyframes → Veo **image-to-video**
- Validators / publishing pipeline: unchanged

## Shot-by-shot continuity

| Shot | Character | Provider | Model | Image-to-video |
|---|---|---|---|---|
| shot-hook | amy-girl | google-veo | `veo-3.1-fast-generate-preview` | yes (identity keyframe) |
| shot-amy-host | amy-ai | google-veo | `veo-3.1-fast-generate-preview` | yes (identity keyframe) |
| shot-amy-girl-learn | amy-girl | google-veo | `veo-3.1-fast-generate-preview` | yes (identity keyframe) |
| shot-amy-boy-celebrate | amy-boy | google-veo | `veo-3.1-fast-generate-preview` | yes (identity keyframe) |
| shot-cta | amy-ai | google-veo | `veo-3.1-fast-generate-preview` | yes (identity keyframe) |

## Character consistency observations

1. **Cast lock** — Plan casts only Amy Girl (hook + learn), Amy AI (host + CTA), Amy Boy (celebrate). No random children were requested in prompts.
2. **Identity seed** — Each shot starts from an official base keyframe staged into a matching environment wash (first frame for Veo, not a slideshow plate).
3. **Performance language** — Prompts describe motion (wave, tap, celebrate, blink, camera push/pan) and instruct the model not to redesign face/hair/clothes.
4. **App presentation** — Study Zone UI is prompted as a brief in-tablet prop on the Amy Girl learn beat, never as a fullscreen screenshot scene.
5. **CTA** — Final beat opens with a live Amy AI Veo wave (~1.5s), then a solid OCR-readable premium end card (~2.5s) with official logo, large store badges, and explicit “Google Play” / “App Store” text.
6. **Evidence gates** — Launch Validator certification **PASS**, including `character_consistency` and `end_card` (validators unchanged).
7. **Series casting** — Hook + learn = Amy Girl; host + CTA = Amy AI; celebrate = Amy Boy — same three permanent mascots only.

## Remaining quality limitations

- Veo image-to-video identity lock is first-frame based; residual wardrobe/face drift can appear across shots — tighten with referenceImages when 9:16 support is confirmed.
- App UI inside tablet is prompt-directed (not a live screen recording) — keep UI ≤2s and prefer real device captures later.
- Veo may still invent environment detail or slight costume drift between independent clips; true multi-reference locking across 9:16 should be re-tested when API constraints allow.
- Native Veo audio is stripped in mux in favor of Gemini TTS narration + Lyria music for brand voice control.

## Evidence paths

- Continuity JSON: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/work/cinematic/continuity.json`
- Final MP4: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/amynest-second-production-golden-001.mp4`
- Quality report: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/second-production/QUALITY_REPORT.json`
