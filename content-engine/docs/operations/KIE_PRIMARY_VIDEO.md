# KIE — Permanent Primary Video Generation

**Status:** Production default  
**Effective:** 2026-08-07  
**Allow-list:** Cost reduction (measured bakeoff winner ~$1.50/Short vs Google ~$16 est.)

## Policy

| Layer | Provider |
|-------|----------|
| **Video (Veo i2v)** | **KIE.ai** (`veo3_fast` @ 1080p) |
| Fallback video | Google Veo (only if KIE fails; `AMYNEST_VIDEO_FALLBACK_GOOGLE≠0`) |
| Narration TTS | Gemini Flash TTS |
| Music | Gemini Lyria |
| Thumbnails / publish | unchanged |

## Env

```
AMYNEST_VIDEO_PROVIDER=kie
AMYNEST_KIE_ENABLED=true
AMYNEST_KIE_VEO_MODEL=veo3_fast
AMYNEST_KIE_VEO_RESOLUTION=1080p
KIE_API_KEY=...
```

Switch back to Google temporarily: `AMYNEST_VIDEO_PROVIDER=google`.

## Code

- Adapter: `content-engine/asset-engine/providers/kie-video/`
- Compose: `creative-composition/compose.ts` → `resolveVideoGenerationProvider()`
- Production runner: `operations/google-production-run.ts` (defaults to KIE)

## Kill-switches

- `AMYNEST_KIE_ENABLED=0` — disables KIE provider construction
- `AMYNEST_VIDEO_PROVIDER=google` — primary Google
- `AMYNEST_VIDEO_FALLBACK_GOOGLE=0` — no Google fallback on KIE error
