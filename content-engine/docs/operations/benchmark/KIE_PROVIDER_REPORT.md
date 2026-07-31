# KIE_PROVIDER_REPORT

**Date:** 2026-07-30  
**Mode:** Isolated benchmark only — production providers/defaults **not** modified  
**Harness:** `content-engine/operations/benchmark/provider-cost-benchmark.mjs`  
**Artifacts:** `.amynest-assets/provider-benchmark/kie/`

---

## Account / balance (real API)

| Checkpoint | Credits |
|------------|--------:|
| Before run | **80.0** (`GET /api/v1/chat/credit`) |
| After run | **20.0** |
| **Consumed (metered)** | **60.0** |

KIE prepaid rate (account docs / pricing): **$0.005 per credit** → metered spend for this run = **60 × $0.005 = $0.30 USD**.

---

## What was generated

| Item | Result |
|------|--------|
| Planned AmyNest Short | 5 shots / 21s (same plan as second-production) |
| Affordable with balance | **1 / 5** shots (80 ÷ ~60) |
| Generated | **`shot-hook` only** (Amy Girl, 4s, 9:16, 720p) |
| Model | `veo3_fast` |
| Mode | Image-to-video (`FIRST_AND_LAST_FRAMES_2_VIDEO`) |
| Identity source | Official AmyNest keyframe `shot-hook-identity.png` |
| Task ID | `5a66dd0bed77bf0548453a7f7e3d2184` |
| Success | **YES** (`successFlag: 1`) |
| Retries | **0** |
| Failures | **0** |
| Wall time | **72.8s** create→ready |
| Output | `.amynest-assets/provider-benchmark/kie/raw/shot-hook.mp4` (720×1280, 4.000s) |
| Native audio on clip | **true** (`hasAudioList: [true]`) |
| Full Short mux | **Not run** — insufficient credits for remaining 4 shots |

---

## API response summary

**Create** `POST https://api.kie.ai/api/v1/veo/generate` → HTTP 200, `taskId` returned.  
**Poll** `GET https://api.kie.ai/api/v1/veo/record-info` → success; `resultUrls[0]` downloaded.

Upload path: `POST https://kieai.redpandaai.co/api/file-base64-upload` → public tempfile URL consumed by Veo.

---

## Quality review (shot-hook vs Google same shot)

Compared frames under `.amynest-assets/provider-benchmark/quality-frames/` (`kie-hook-t*` vs `google-hook-t*`).

| Dimension | Score (1–5) | Notes |
|-----------|------------:|-------|
| Character consistency | **4** | Amy Girl identity holds: purple hoodie, yellow bow, brown side ponytail, brown eyes. Slight pose/expression drift vs Google, still clearly same character. |
| Motion | **4** | Continuous performance (expression + gesture change across t0–t3); not a still plate. |
| Camera | **4** | Vertical 9:16, push-in / desk framing matches brief. |
| Artifacts | **4** | No obvious morphing/extra limbs in sampled frames; desk props readable. |
| Voice | **N/A (clip)** | Clip has native Veo audio; Short narration not remuxed (partial run). |
| Music | **N/A** | Held for full Short (credits blocked). |
| Subtitle quality | **N/A** | Caption burn skipped (partial). |
| Prompt adherence | **4** | Bored/puzzled worksheet beat present. |
| Generation time | **5** | ~73s for 4s clip — fast. |

**Overall shot quality:** competitive with Google Veo Fast for this single beat. Not enough evidence for multi-shot continuity (Amy AI / Amy Boy / CTA).

---

## Cost for a full Short (evidence-based projection)

| Basis | Value |
|-------|------:|
| Measured credits / 4s Fast i2v shot | **60** |
| Shots in AmyNest plan | 5 |
| Projected credits if flat 60/shot | **300** |
| Projected USD @ $0.005/credit | **$1.50** |

**Caveat:** Only a 4s shot was metered. 6s learn shot may bill the same flat credit band (KIE Fast marketing is often per-generation). Re-measure after top-up before locking budget.

---

## Blockers

1. Account had only **80 credits** — cannot complete 5-shot Short.  
2. Need top-up (≥ **300 credits** / ~**$1.50+**) to finish Phase 2 for KIE.  
3. Integration effort for production: new adapter (not present); async poll + file upload + download retention (14 days).

---

## Reliability notes (from KIE docs + this run)

- This run: **stable**, no fallback (`fallbackFlag: false`).  
- Vendor docs admit stability may be slightly below official Google.  
- Media URLs are temporary — must download immediately (done).
