# CHARACTER_CONTINUITY_REPORT

**Date:** 2026-07-31  
**Golden script:** golden-002 — Teach, Practice, Quiz, Doubt — One Tutor That Follows the Child  
**Status:** SUCCESS  
**Video:** https://youtube.com/shorts/hk2zwEkFvZQ  
**Certification:** PASS  

## Objective

Render golden-002 (Amy AI Tutor) as a continuous **character-performance episode** starring only Amy AI, Amy Girl, and Amy Boy — not an Imagen still montage.

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
5. **CTA** — Final beat is a live Amy AI Veo wave with badge/logo overlay — Amy performs the invite.

## Remaining quality limitations

- Veo image-to-video identity lock is first-frame based; residual wardrobe/face drift can appear across shots — tighten with referenceImages when 9:16 support is confirmed.
- App UI inside tablet is prompt-directed (not a live screen recording) — keep UI ≤2s and prefer real device captures later.
- Veo may still invent environment detail or slight costume drift between independent clips; true multi-reference locking across 9:16 should be re-tested when API constraints allow.
- Native Veo audio is stripped in mux in favor of Gemini TTS narration + Lyria music for brand voice control.

## Evidence paths

- Continuity JSON: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/work/cinematic/continuity.json`
- Final MP4: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/amynest-google-golden-002.mp4`
- Quality report: `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/google-production-golden-002/QUALITY_REPORT.json`
