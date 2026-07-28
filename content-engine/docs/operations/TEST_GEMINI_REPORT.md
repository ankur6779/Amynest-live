# TEST_GEMINI_REPORT

**Status:** PASS
**Production recommendation:** READY
**Started:** 2026-07-28T18:50:38.788Z
**Finished:** 2026-07-28T18:54:42.900Z
**Total generation time:** 244111 ms
**Render duration:** 2424 ms
**Cost estimate:** $6.06

## Models used

| Role | Model |
|------|-------|
| Script | `gemini-3.6-flash` |
| Image | `imagen-4.0-fast-generate-001` |
| Video | `veo-3.1-fast-generate-preview` |
| Voice | `gemini-3.1-flash-tts-preview` |
| Music | `(disabled)` |

## Model health / latency

| Model | OK | Latency | Message |
|-------|----|---------|---------|
| `gemini-3.6-flash` | true | 390 ms | reachable |
| `imagen-4.0-fast-generate-001` | true | 274 ms | reachable |
| `veo-3.1-fast-generate-preview` | true | 188 ms | reachable |
| `gemini-3.1-flash-tts-preview` | true | 197 ms | reachable |

## Prompt

```
Cinematic AmyNest advertisement scene.
Scene: A warm sunrise fills a modern child's bedroom. Soft curtains glow. A smiling young child happily completes a morning routine using the AmyNest app on a tablet while a mother watches proudly from nearby. Subtle floating dust particles in golden light. Premium Pixar-quality realism with natural facial expressions.
Subject: A caring parent and young child sharing a calm morning routine with the AmyNest app
Action: The child happily completes a simple morning habit on a tablet while a parent watches proudly nearby.
Camera: Gentle cinematic dolly-in, smooth stabilized motion, subtle parallax.
Lighting: Soft golden-hour cinematic lighting, warm key light from a window, gentle fill, natural skin tones, no harsh flash.
Mood: Warm, premium, emotionally safe parenting atmosphere
Color palette: Warm sunrise amber, soft cream, deep teal accents, natural skin tones
Composition: Vertical 9:16 framing, subject centered with safe margins for captions, shallow depth of field, premium mobile-ad composition
Lens: 35mm cinematic lens look, soft bokeh, subtle filmic contrast, high-end commercial grade
Animation style: Premium Pixar-quality realism, natural facial micro-expressions, gentle motion, subtle floating dust motes / light particles, no jitter, no morphing artifacts
Duration: 8 seconds continuous shot
Aspect ratio: 9:16
Brand finish: end with a premium AmyNest logo moment and the line "Build Better Habits Every Day".
Safety: Family-safe content only. No medical claims, no fear tactics, no violence, no suggestive content. No readable competitor logos. No distorted faces or unnatural anatomy. No on-screen text except a clean end-card moment if naturally framed. Keep depictions wholesome, respectful, and age-appropriate.

Validation scene extras:
Golden sunrise. Modern child bedroom. Happy young child smiling.
Mother encouraging gently. Tablet displaying AmyNest.
Soft cinematic lighting. Natural movement. Slow dolly camera.
Floating dust particles. Warm family atmosphere.
End card: AmyNest logo + "Build Better Habits Every Day" + Play Store badge.
```

## Script

```
Every great habit starts with one small step.
Help your child build confidence every day with AmyNest.
```

## Provider latency

- scriptMs: **2033 ms**
- imageMs: **10781 ms**
- videoMs: **92082 ms**
- ttsMs: **8838 ms**
- renderMs: **2424 ms**

## Generation status

- Image generation: OK
- Video generation: OK
- TTS narration: OK
- Render pipeline: OK
- Final MP4: OK

## Final MP4 metadata

| Field | Value |
|-------|-------|
| Path | `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/gemini-test/amynest-gemini-test-final-10s.mp4` |
| File size | 5752542 bytes |
| Resolution | 1080x1920 |
| Duration | 10.00s |
| FPS | 30 |
| Vertical 9:16 compatible | true |
| Corrupt | false |

## Downloaded assets

| Asset | Path |
|-------|------|
| Image | `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/gemini-test/images/hero.png` |
| Video | `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/gemini-test/video/amynest-gemini-test-raw.mp4` |
| TTS | `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/gemini-test/tts/narration.wav` |
| Music | `n/a` |
| Final MP4 | `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/gemini-test/amynest-gemini-test-final-10s.mp4` |
| Render package | `rp_f8fe76c83d1e` |

## API quota

- No quota headers returned by provider responses in this run.

## Validation checklist

- Script generated: true
- Image generated: true
- Video generated: true
- Voice generated: true
- Final MP4: true
- Target ~10s / 1080x1920: PASS

## Classified failures

- None

## Errors

- None

## Warnings

- Render pipeline wrote: /Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/gemini-test/sb_amynest-veo-test-001_15_bd215ab83cc8/job_18522576d6bd.mp4

## Notes

- Gemini media stack remains opt-in (`AMYNEST_GEMINI_ENABLED=true`) until READY.
- OpenAI remains available as script fallback.
- Veo API clips are 4/6/8s; final Short is padded toward ~10s with end-card.
- `GEMINI_API_KEY` must stay separate from `OPENAI_API_KEY`.
