# KIE_PROVIDER_REPORT_FINAL

**Date:** 2026-07-31  
**Mode:** Isolated bake-off — production pipeline/defaults/rendering/validators/publishing **unchanged**  
**Golden script:** `golden-001`  
**Master:** `.amynest-assets/provider-bakeoff-final/kie/amynest-bakeoff-kie-golden-001.mp4`

---

## Real billed usage

| Metric | Value |
|--------|------:|
| Start balance | **1020** credits |
| End balance | **720** credits |
| Credits consumed | **300** |
| Credit USD rate (account) | **$0.005 / credit** |
| **Real billed cost** | **$1.50** |
| Generation duration | **380.1 s** (~6.3 min) |
| Retries | **0** |
| Failures | **0** |
| Successes | **5 / 5** shots |

### Per-shot timing (create → ready)

| Shot | Duration | Elapsed | Queue accept |
|------|---------:|--------:|-------------:|
| shot-hook | 4s | 67.3s | 0.65s |
| shot-amy-host | 4s | 67.2s | 0.56s |
| shot-amy-girl-learn | 6s | 75.6s | 0.58s |
| shot-amy-boy-celebrate | 4s | 75.7s | 0.59s |
| shot-cta | 4s | 67.4s | 0.64s |

Model: `veo3_fast` · Image-to-video · 9:16 · gen 720p → render pad **1080×1920**

---

## Output checks

| Check | Result |
|-------|--------|
| Video duration | **21.0s** |
| Resolution | **1080×1920** |
| Audio present | **YES** (production narration + music remux) |
| Subtitles burned | **YES** (reused production caption plates) |
| Official CTA / end card | **YES** (premium plate + Amy AI wave) |

---

## Validator results (same Launch Validator)

| Field | Value |
|-------|-------|
| Certification | **PASS** |
| Overall score | **100** |
| Blocked reasons | none |

Gates: evidence_integrity, audio, subtitles, end_card, brand_detection, cta_detection, character_consistency, visual_quality, motion_quality, text_readability, story_quality, muted_story, brand_mention, compliance, performance, metadata — **all PASS**.

Quality report: `.amynest-assets/provider-bakeoff-final/kie/QUALITY_REPORT.json`

---

## Quality review (human + evidence)

| Dimension | Score (1–5) | Notes |
|-----------|------------:|-------|
| Character consistency | **4.5** | Amy Girl / Amy AI / Amy Boy identifiable; wardrobe + yellow bow / Amy AI cues hold. |
| Motion quality | **4.5** | Continuous performances; not still-plate. |
| Camera movement | **4** | Push-in / pan / orbit intent present. |
| Prompt adherence | **4.5** | Worksheet → host → Study Zone → celebrate → CTA arc intact. |
| Facial consistency | **4** | Minor Veo drift possible; validator character gate PASS. |
| Artifacts | **4** | No blocking artifacts; env sometimes softer than Google. |
| Voice quality | **5** | Same production Gemini TTS track. |
| Music quality | **5** | Same production Lyria track. |
| Subtitle quality | **5** | Same burned caption assets; OCR PASS. |
| Overall production | **4.5** | Launch-ready at cert 100. |

---

## Cost analysis (measured)

| Unit | Value |
|------|------:|
| Cost / complete Short | **$1.50** |
| Cost / second (21s) | **$0.0714** |
| Cost / shot (5) | **$0.30** |
| Est. 30 Shorts / mo | **$45** |
| Est. 100 Shorts / mo | **$150** |
| Est. 300 Shorts / mo | **$450** |

---

## Production readiness

- API stable on this run (0 retries, 0 failures).  
- Requires upload + poll adapter (not in production yet).  
- Media URLs temporary — download immediately (done in harness).  
- **Not switched** — decision report only.
