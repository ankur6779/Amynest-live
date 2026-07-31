# FINAL_PROVIDER_COMPARISON

**Date:** 2026-07-30  
**Constraint honored:** Production pipeline / providers / defaults **unchanged**.  
**Harness:** `content-engine/operations/benchmark/provider-cost-benchmark.mjs` (isolated)

Related reports:
- [GOOGLE_USAGE_AUDIT.md](./GOOGLE_USAGE_AUDIT.md)
- [KIE_PROVIDER_REPORT.md](./KIE_PROVIDER_REPORT.md)
- [YOUBOT_PROVIDER_REPORT.md](./YOUBOT_PROVIDER_REPORT.md)

---

## Executive verdict

**Keep Google AI Studio (current) as AmyNest production video provider.**

KIE is the strongest **cost challenger** (real metered **60 credits / $0.30** for one successful 4s Amy Girl i2v shot, quality close to Google on that beat), but:

1. Account could not fund a full 5-shot Short.  
2. Multi-character continuity across Amy AI / Amy Girl / Amy Boy / CTA is **unproven** on KIE.  
3. you.bot could not run at all (**50 credits** < ~58 needed for one Veo Fast call).

Do **not** switch production until a full funded bake-off passes character continuity + launch cert.

---

## Phase 4 — Comparison table

Scores 1–5 where measurable; **N/A** where not run.  
Costs: **metered** = from API balance / artifacts; **EST** = non-invoice estimate.

| Provider | Actual billed cost | Video duration tested | Generation time | Retry count | Failure count | Audio quality | Character quality | Overall score |
|----------|-------------------:|----------------------:|----------------:|------------:|--------------:|---------------|------------------:|--------------:|
| **Google AI Studio** (current) | **Invoice UNAVAILABLE** locally; inventory = **70s** Veo-class on disk | Full Short **21s** + prior runs | Proven path; gemini-test video ~92s / shot path varies | 0 logged | 0 logged | **5** (TTS+Lyria cert PASS) | **5** (cert PASS / continuity report) | **5** production-proven |
| **KIE.ai** | **60 credits ($0.30)** metered for 1 shot | **4.0s** (`shot-hook` only) | **72.8s** | 0 | 0 | **4** (native Veo audio on clip; Short mix N/A) | **4** (strong Amy Girl match on sampled frames) | **3.5** promising but incomplete |
| **you.bot** | **$0** (blocked) | **0** | N/A | 0 | 0 (preflight) | N/A | N/A | **0** (not testable) |

### Cost projection for one AmyNest Short (5 Veo performances)

| Provider | Basis | Projected Short media cost |
|----------|-------|----------------------------|
| Google | Engine EST $0.75/s × 22s Veo (+TTS/music) | **~$16.6 EST** (not invoice) |
| KIE | Measured 60 credits/shot × 5 @ $0.005 | **~$1.50** if flat band holds |
| you.bot | List ~58–63 credits/call × 5 @ $0.01 | **~$2.9–$3.2** (unmetered — needs top-up) |

---

## Phase 3 — Quality summary

| Dimension | Google | KIE (1 shot) | you.bot |
|-----------|--------|--------------|---------|
| Character consistency | Excellent (full cast proven) | Strong on Amy Girl hook | Untested |
| Motion | Continuous performances | Continuous on hook | Untested |
| Camera | 9:16 cinematic plan | 9:16 720p OK | Untested |
| Artifacts | Acceptable for publish | Acceptable on samples | Untested |
| Voice | Gemini TTS Kore — cert PASS | Not remuxed in partial run | Untested |
| Music | Lyria — cert PASS | Not remuxed | Untested |
| Subtitles | Burned + OCR PASS | Not burned | Untested |
| Rendering time | Full pipeline minutes | Fast single clip (~73s) | N/A |
| Prompt adherence | High | High on hook | Untested |

Frame evidence: `.amynest-assets/provider-benchmark/quality-frames/`

---

## Phase 5 — Recommendation criteria

| Criterion | Winner today | Why |
|-----------|--------------|-----|
| Cost | **KIE** (when funded) | Metered unit cost far below Google engine EST |
| Quality | **Google** | Full Short cert PASS; multi-character proven |
| Reliability | **Google** | Multiple successful publishes; KIE n=1; you.bot n=0 |
| API stability | **Google** | Official path; KIE docs admit slightly lower stability |
| Integration effort | **Google** | Already wired; KIE/you.bot need new adapters |

### Recommended production provider

**Google AI Studio / Gemini Veo (current).**

### Recommended next action (not a production switch)

1. Top up **KIE ≥ ~300 credits** and **you.bot ≥ ~320 credits**.  
2. Re-run isolated harness for full 5-shot Shorts (`PROVIDER=both`).  
3. Compare launch-validator scores + character continuity across all three masters.  
4. Only then reconsider changing production provider (separate explicit change request).

---

## Isolation checklist

| Requirement | Status |
|-------------|--------|
| Do not modify production pipeline | ✅ |
| Do not modify providers | ✅ |
| Do not change production defaults | ✅ |
| Use real billed usage when available | ✅ KIE credits delta; ❌ Google invoice missing; ❌ you.bot no spend |
| Never treat marketing as billed | ✅ |
| Reports written | ✅ four markdown reports in this folder |

---

## Re-run commands

```bash
# After topping up credits:
cd content-engine
PROVIDER=kie node ./operations/benchmark/provider-cost-benchmark.mjs
PROVIDER=youbot node ./operations/benchmark/provider-cost-benchmark.mjs
```

Google invoice: export from AI Studio / Cloud Billing and drop into this folder to replace ESTIMATE rows in `GOOGLE_USAGE_AUDIT.md`.
