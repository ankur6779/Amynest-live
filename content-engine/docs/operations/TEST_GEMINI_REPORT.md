# TEST_GEMINI_REPORT

**Status:** NOT RUN YET

```bash
# Requires GEMINI_API_KEY (Google AI Studio)
pnpm amynest:test-gemini
# optional:
pnpm amynest:test-gemini -- --skip-music --output-dir .amynest-assets/gemini-test
```

This command verifies the Gemini media stack:

1. API key + model probes  
2. Script (`gemini-3.6-flash`)  
3. Image (`imagen-4.0-fast-generate-001`)  
4. Veo clip (`veo-3.1-fast-generate-preview`)  
5. TTS (`gemini-3.1-flash-tts-preview`)  
6. Render engine pass-through  
7. Final ~10s MP4 export  

OpenAI remains available as script fallback via `fallbackProvider=openai`.
