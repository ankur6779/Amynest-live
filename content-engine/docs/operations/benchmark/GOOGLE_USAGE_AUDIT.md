# GOOGLE_USAGE_AUDIT

**Date:** 2026-07-30  
**Scope:** Local AmyNest Short / Gemini / Veo artifacts under `.amynest-assets/`  
**Production pipeline:** untouched  

## Billing data availability

| Source | Present locally? |
|--------|------------------|
| Google AI Studio invoice / CSV export | **NO** |
| Google Cloud Billing export | **NO** |
| API-returned billed USD on Veo/Imagen/TTS calls | **NO** |
| Engine `costEstimateUsd` (hardcoded list rates) | YES — **not billed** |

**Verdict:** Actual Google billed dollars are **not available in this repo**. This audit reports **real generation inventory** from local usage logs/artifacts. Dollar figures below marked **ESTIMATE (non-billed)** use engine constants only and must not be treated as invoices.

To get true billed spend: open Google AI Studio / Cloud Billing for the project tied to `GEMINI_API_KEY` and export usage for 2026-07-28 → 2026-07-29.

---

## Phase 1 — Real usage inventory (from local artifacts)

### Successful generation runs

| Run | Evidence | Videos | Images | Audio | Failures in local logs |
|-----|----------|--------|--------|-------|------------------------|
| `gemini-test` | `TEST_GEMINI_REPORT.md`, `provider-logs.json` | ≥2 Veo 8s attempts + final mux | 1 Imagen (`imagen-4.0-fast-generate-001`) | 1 Gemini TTS | `failures: []` |
| `first-production` | compose MP4s under `video/` | **4 × 8s** Veo-class clips | keyframes (local/Pillow) | narration/music path | not logged as failures |
| `second-production` | `work/cinematic/veo/*-raw.mp4` | **5** Veo Fast i2v clips (4+4+6+4+4s) | 5 identity keyframes (local) | narration.wav + music.wav (Gemini TTS + Lyria; reused on final mux) | final cert **PASS 100** |

### Video seconds generated (probed on disk)

| Asset class | Clips | Total seconds |
|-------------|------:|-------------:|
| first-production `compose-*.mp4` | 4 | **32.0** |
| gemini-test `veo-hero-clip-*.mp4` | 2 | **16.0** |
| second-production Veo raws | 5 | **22.0** |
| **Sum of candidate paid Veo outputs on disk** | **11** | **70.0** |

Notes:
- Muxed masters / caption burns / flash cuts are **re-encodes**, not additional Veo billable generations.
- `second-production` final timeline shows creative-composition ~37s wall time → Veo raws were **reused** on that particular mux (`AMYNEST_REUSE_VEO`); the 5 raws themselves were generated earlier the same day.
- Retries: **no structured retry counter** in Google provider logs. gemini-test `failures: []`. Two hero clips suggest **1 extra** exploratory Veo generation beyond the kept test path.

### Request / success summary (observable)

| Metric | Value | Confidence |
|--------|------:|------------|
| Total Veo-class clips on disk | 11 | High (filesystem) |
| Successful generations (have playable MP4) | 11 | High |
| Failed generations logged | 0 | Medium (only gemini-test has explicit failure array) |
| Documented retries | 0 explicit | Low — Google may have internal retries not logged |
| Images generated (paid Imagen evidence) | ≥1 (`gemini-test`) | High |
| Narration TTS evidence | ≥2 (`gemini-test`, `second-production`) | High |
| Music (Lyria) evidence | ≥1 (`second-production/audio/music.wav`) | High |

---

## Cost — billed vs estimate

### Actual billed amount

**UNAVAILABLE** — no invoice or meter export in workspace.

### Engine estimate constants (NON-BILLED — do not use as invoice)

From `content-engine/asset-engine/providers/gemini-*`:

| Unit | Hardcoded estimate |
|------|--------------------|
| Veo / second | **$0.75** (`estimateVeoCostUsd`) |
| Imagen | **$0.04** (ultra $0.08) |
| Gemini TTS | **$0.02** flat |
| Lyria music | **$0.05** flat |

### Average cost (ESTIMATE only, if applying engine rates to observed seconds)

| Unit | Calculation | ESTIMATE USD |
|------|-------------|-------------:|
| Per image | Imagen constant | **$0.04** |
| Per 8s video | 8 × $0.75 | **$6.00** |
| Per narration | TTS constant | **$0.02** |
| Complete AmyNest Short (second-production shape: 22s Veo + TTS + music) | 22×0.75 + 0.02 + 0.05 | **~$16.57** |
| Complete Short if 4×8s (first-production shape) | 32×0.75 + audio | **~$24.07** |
| gemini-test written estimate | report field | **$6.06** (8s Veo + image + TTS) |

**These are not invoices.** Replace with Cloud Billing export before any production cost decision that requires true spend.

---

## Reliability / quality reference (Google production Short)

| Field | Value |
|-------|-------|
| Master | `.amynest-assets/second-production/amynest-second-production-golden-001.mp4` |
| Duration | **21.0s** (probed) |
| Model | `veo-3.1-fast-generate-preview` |
| Launch cert | **PASS / 100** |
| YouTube | https://youtube.com/shorts/Ii0Vzfe5Rf0 |
| Character path | Official bases → identity keyframes → image-to-video |

---

## Gaps to close for a true Google bill audit

1. Export AI Studio / Cloud Billing for the Gemini project (date range covering gemini-test + both productions).  
2. Optionally enable provider logging of operation names + response IDs per Veo call.  
3. Re-run this audit with invoice line items replacing ESTIMATE rows.
