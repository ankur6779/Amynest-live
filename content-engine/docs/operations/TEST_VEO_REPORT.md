# TEST_VEO_REPORT

**Status:** NOT RUN YET

Generate this report with:

```bash
# Coolify / local — GEMINI_API_KEY must be set (Google AI Studio)
# Do NOT put the Gemini key in OPENAI_API_KEY
pnpm amynest:test-veo
```

Outputs:

- Raw Veo clip under `.amynest-assets/veo-test/amynest-veo-test-raw.mp4`
- Final ~10s padded Short: `.amynest-assets/veo-test/amynest-veo-test-final-10s.mp4`
- This report overwritten with prompt, timings, validation, and errors

## Expected Coolify env

```bash
GEMINI_API_KEY=AIza...          # Google AI Studio key (Veo)
OPENAI_API_KEY=sk-...           # GPT scripts only — keep separate
ELEVENLABS_API_KEY=...          # App TTS (optional for Shorts voice later)
AMYNEST_VEO_ENABLED=true
AMYNEST_VEO_MODEL=veo-3.1-generate-preview
```

## Notes

- Veo API clip length is 4/6/8 seconds; AmyNest pads the validation Short to ~10s with an end-card beat.
- Billing must be enabled on the Google Cloud project tied to the AI Studio key.
