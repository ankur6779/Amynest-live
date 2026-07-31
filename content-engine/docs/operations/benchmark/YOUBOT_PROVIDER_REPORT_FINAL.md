# YOUBOT_PROVIDER_REPORT_FINAL

**Date:** 2026-07-31  
**Mode:** Isolated bake-off — production pipeline/defaults/rendering/validators/publishing **unchanged**  
**Golden script:** `golden-001`  
**Master:** `.amynest-assets/provider-bakeoff-final/youbot/amynest-bakeoff-youbot-golden-001.mp4`

---

## Real billed usage

| Metric | Value |
|--------|------:|
| Start balance | **550** credits |
| End balance | **257.65** credits |
| Credits consumed (balance delta) | **292.35** |
| Sum of API `creditsCharged` | **292.35** (5 × **58.47**) |
| Credit USD rate (docs) | **$0.01 / credit** |
| **Real billed cost** | **$2.9235** |
| Generation duration | **358.1 s** (~6.0 min) |
| Retries | **0** |
| Failures | **0** |
| Successes | **5 / 5** shots |

### Per-shot (API `creditsCharged` is authoritative)

| Shot | Duration | Elapsed | Queue | Credits charged |
|------|---------:|--------:|------:|----------------:|
| shot-hook | 4s | 62.2s | 0.75s | **58.47** |
| shot-amy-host | 4s | 70.5s | 0.55s | **58.47** |
| shot-amy-girl-learn | 6s | 70.4s | 0.60s | **58.47** |
| shot-amy-boy-celebrate | 4s | 70.6s | 0.64s | **58.47** |
| shot-cta | 4s | 61.6s | 0.54s | **58.47** |

Model: `veo-3-1-fast` · Image-to-video · 9:16 · gen 720p → render pad **1080×1920**  
Note: API billed **flat 58.47 credits** even for the 6s learn shot.

---

## Output checks

| Check | Result |
|-------|--------|
| Video duration | **21.0s** |
| Resolution | **1080×1920** |
| Audio present | **YES** |
| Subtitles burned | **YES** |
| Official CTA / end card | **YES** |

---

## Validator results (same Launch Validator)

| Field | Value |
|-------|-------|
| Certification | **PASS** |
| Overall score | **100** |
| Blocked reasons | none |

All standard gates **PASS**.  
Quality report: `.amynest-assets/provider-bakeoff-final/youbot/QUALITY_REPORT.json`

---

## Quality review

| Dimension | Score (1–5) | Notes |
|-----------|------------:|-------|
| Character consistency | **3.5** | Strong Amy Girl desk scenes; celebrate beat showed higher cast/env drift risk vs Google/KIE in sampled frames despite automated PASS. |
| Motion quality | **4.5** | Fluid motion; good study-desk staging. |
| Camera movement | **4** | Acceptable cinematic framing. |
| Prompt adherence | **4** | Story beats present; some shot-level identity variance. |
| Facial consistency | **3.5** | More variance across cast than KIE/Google samples. |
| Artifacts | **4** | No blocking failures. |
| Voice / music / subs | **5** | Same production audio + caption assets. |
| Overall production | **4** | Cert PASS 100; human continuity slightly behind KIE/Google. |

---

## Cost analysis (measured)

| Unit | Value |
|------|------:|
| Cost / complete Short | **$2.9235** |
| Cost / second (21s) | **$0.1392** |
| Cost / shot (5) | **$0.5847** |
| Est. 30 Shorts / mo | **~$87.70** |
| Est. 100 Shorts / mo | **~$292.35** |
| Est. 300 Shorts / mo | **~$877.05** |

---

## Production readiness

- API returns explicit `creditsCharged` (excellent metering).  
- Stable this run (0 retries).  
- ~**1.95×** more expensive than KIE for the same Short.  
- **Not switched** — decision report only.
