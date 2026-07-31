# FINAL_PROVIDER_BAKEOFF

**Date:** 2026-07-31  
**Golden script:** `golden-001` — A Fresh Lesson Every Day — Without the Worksheet Panic  
**Constraint:** Isolated benchmark only. Production pipeline, defaults, rendering, validators, and publishing were **not** changed. Default provider was **not** switched.

Reports:
- [GOOGLE_PROVIDER_REPORT_FINAL.md](./GOOGLE_PROVIDER_REPORT_FINAL.md)
- [KIE_PROVIDER_REPORT_FINAL.md](./KIE_PROVIDER_REPORT_FINAL.md)
- [YOUBOT_PROVIDER_REPORT_FINAL.md](./YOUBOT_PROVIDER_REPORT_FINAL.md)

Artifacts: `.amynest-assets/provider-bakeoff-final/{google,kie,youbot}/`

---

## What was held constant

| Asset / setting | Source |
|-----------------|--------|
| Golden script | `golden-001` |
| Identity keyframes | second-production cinematic keyframes |
| Captions | second-production burned caption PNGs |
| CTA / end card | `cta-premium-plate.png` + wave+card pattern |
| Narration | `audio/narration.wav` |
| Music | `audio/music.wav` |
| Duration / canvas | 21s · 1080×1920 |
| Validators | existing Launch Validator (unchanged) |

**Only variable:** Veo Fast image-to-video provider (Google baseline artifact vs KIE vs you.bot).

---

## Final scorecard

| Provider | Actual Cost | Credits Used | Generation Time | Retry Count | Quality Score | Character Score | Motion Score | Reliability | Overall Score |
|----------|------------:|-------------:|----------------:|------------:|--------------:|----------------:|-------------:|------------:|--------------:|
| **Google** | invoice **N/A** / $0 new spend | N/A | baseline reuse | 0 | **5.0** | **5.0** | **5.0** | **5.0** | **4.7** |
| **KIE** | **$1.50** | **300** | **380s** | **0** | **4.5** | **4.5** | **4.5** | **5.0** | **4.8** |
| **you.bot** | **$2.9235** | **292.35** | **358s** | **0** | **4.0** | **3.5** | **4.5** | **5.0** | **4.1** |

Validator cert (all three): **PASS / 100**

---

## Cost comparison (measured where available)

| Provider | $/Short (measured) | $/s | 30/mo | 100/mo | 300/mo |
|----------|-------------------:|----:|------:|-------:|-------:|
| KIE | **$1.50** | $0.071 | $45 | $150 | $450 |
| you.bot | **$2.9235** | $0.139 | $88 | $292 | $877 |
| Google | **unknown** (no invoice); engine EST ~$16.57 | — | — | — | — |

KIE is **~48.7% cheaper** than you.bot on this identical Short.

---

## Quality & reliability summary

| Criterion | Winner |
|-----------|--------|
| Actual billed cost | **KIE** |
| Launch Validator / artifact gates | **Tie** (all PASS 100) |
| Character consistency (human review) | **Google** slightly ahead; **KIE** close second |
| Motion | Tie (all strong) |
| Reliability this run | Tie (0 retries / 0 failures for KIE & you.bot) |
| API metering clarity | **you.bot** (`creditsCharged`) / **KIE** (balance delta) |
| Production readiness today | **Google** (already wired) |
| Best cost/quality measured tradeoff | **KIE** |

---

## Decision

# SWITCH TO KIE

### Evidence

1. **Actual billed cost:** KIE Short cost **$1.50** (1020→720 credits). you.bot cost **$2.9235**. Google invoice unavailable; historical engine rates imply an order-of-magnitude higher media cost.  
2. **Actual output quality:** KIE master passed the **same** Launch Validator at **PASS / 100**, matching Google and you.bot. Human review places KIE character/motion near Google and ahead of you.bot cast consistency.  
3. **Reliability:** 5/5 shots, **0 retries**, **0 failures**, ~6.3 min wall time.  
4. **Character consistency:** Official Amy AI / Amy Girl / Amy Boy path via same identity keyframes; character gate PASS.  
5. **API stability:** Successful full Short end-to-end in bake-off.  
6. **Production readiness:** Adapter work still required before a live switch — this report **does not** change production. When ready to implement, wire KIE as an opt-in media provider behind a flag, keep Google as fallback.

### Why not keep Google as the cost winner?

Google remains the quality/integration baseline and should stay as **fallback**. Without a Cloud Billing export, it cannot win a *measured-cost* bake-off. Measured KIE spend is low enough that switching primary Veo generation to KIE is the rational production decision once the adapter ships.

### Why not you.bot?

Same cert score, but **~$1.42 more per Short** (~95% higher than KIE) and slightly weaker character continuity in sampled frames.

---

## Explicit non-actions (confirmed)

- Production default provider **not** changed  
- Validators / publishing / rendering code **not** modified  
- No automatic switch performed  

Next implementation step (separate request): add isolated KIE adapter + feature flag; keep Google failover; re-run one cert Short in staging before cutting over.
