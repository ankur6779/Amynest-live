# GOOGLE_PROVIDER_REPORT_FINAL

**Date:** 2026-07-31  
**Mode:** Isolated bake-off — production pipeline/defaults/rendering/validators/publishing **unchanged**  
**Golden script:** `golden-001`  
**Master:** `.amynest-assets/provider-bakeoff-final/google/amynest-bakeoff-google-golden-001.mp4`  
**Source baseline:** `.amynest-assets/second-production/amynest-second-production-golden-001.mp4`

---

## Real billed usage

| Metric | Value |
|--------|------:|
| Start balance | **N/A** — Gemini/AI Studio key has **no credit-balance API** |
| End balance | **N/A** |
| Credits consumed | **N/A** |
| **Real billed cost (this bake-off)** | **$0.00 incremental** (no new Veo calls; baseline reused) |
| Historical invoice in repo | **NONE** |
| Retries (this validation) | **0** |
| Failures | **0** |

### Why baseline reuse (not a new Google generation)

1. Same golden script, storyboard, characters, voice, music, CTA, and render path.  
2. Avoids spending unknown Google dollars when the production Short already exists.  
3. Bake-off variable for Google is **re-validated** on the identical artifact validators.

**Invoice gap remains:** true Google USD/short requires Cloud Billing / AI Studio export (still not in workspace).

### Non-billed engine estimate (NOT an invoice — reference only)

Hardcoded provider constants (`$0.75/s` Veo + TTS/music) for a 22s Veo Short ≈ **~$16.57**.  
Do **not** treat as measured billed cost.

---

## Output checks

| Check | Result |
|-------|--------|
| Video duration | **21.0s** |
| Resolution | **1080×1920** |
| Audio present | **YES** |
| Subtitles burned | **YES** |
| Official CTA / end card | **YES** |
| Model (original gen) | `veo-3.1-fast-generate-preview` |

---

## Validator results (same Launch Validator, re-run)

| Field | Value |
|-------|-------|
| Certification | **PASS** |
| Overall score | **100** |
| Blocked reasons | none |

All gates **PASS**.  
Quality report: `.amynest-assets/provider-bakeoff-final/google/QUALITY_REPORT.json`

---

## Quality review

| Dimension | Score (1–5) | Notes |
|-----------|------------:|-------|
| Character consistency | **5** | Production reference; continuity report + gate PASS. |
| Motion quality | **5** | Continuous Veo performances. |
| Camera movement | **5** | Matches director package. |
| Prompt adherence | **5** | Golden-001 arc proven. |
| Facial consistency | **4.5** | Best-known baseline. |
| Artifacts | **4.5** | Acceptable residual Veo drift. |
| Voice / music / subs | **5** | Production tracks. |
| Overall production | **5** | Current production standard. |

---

## Cost analysis

| Unit | Measured billed | Engine EST (non-billed) |
|------|----------------:|------------------------:|
| Cost / Short | **unknown (no invoice)** | ~$16.57 |
| Cost / second | unknown | ~$0.79 |
| Cost / shot | unknown | ~$3.31 |
| 30 Shorts / mo | unknown | ~$497 |
| 100 Shorts / mo | unknown | ~$1,657 |
| 300 Shorts / mo | unknown | ~$4,971 |

---

## Production readiness

- **Already integrated** — highest readiness.  
- Official Google path; strongest long-term API stability expectation.  
- Cost opacity without billing export is the main operational gap vs KIE/you.bot meters.
