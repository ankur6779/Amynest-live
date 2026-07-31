# KIE_QUALITY_OPTIMIZATION_REPORT

**Date:** 2026-07-31  
**Scope:** KIE media-generation quality only (isolated `kie-production-run.ts`)  
**Unchanged:** production pipeline · validators · publishing · story generation · narration · CTA · duration · editing structure  

---

## What changed (KIE runner only)

| Setting | Previous production run | Quality boost (default) | Full Quality mode (opt-in) |
|---------|-------------------------|-------------------------|----------------------------|
| Model | `veo3_fast` | `veo3_fast` | `veo3` (Veo 3.1 Quality) |
| Generation resolution | **720p** (then pad/upscale to 1080) | **Native 1080p** 9:16 | **Native 1080p** 9:16 |
| Prompts | Shared performance prompts | + motion / cinema / lighting / identity boost (KIE-only wrapper) | same boost |
| Encode (KIE mux path) | libx264 default | **CRF 16 · preset slow · high profile** | same |
| FPS (compose) | 30 | **30** | 30 |

### Env controls

```bash
# Default = Fast @ native 1080p + prompt/encode boost (recommended)
pnpm exec node --import tsx/esm ./operations/kie-production-run.ts

# Full Veo Quality (expensive)
AMYNEST_KIE_VEO_QUALITY=1 pnpm exec node --import tsx/esm ./operations/kie-production-run.ts
```

---

## Measured credit costs (live probes, 2026-07-31)

| Mode | Resolution | Duration probed | Credits / shot | USD / shot (@ $0.005) |
|------|------------|----------------:|---------------:|----------------------:|
| Fast (prior prod) | 720p | 4s | **60** | **$0.30** |
| Fast (boost default) | **1080p** | 4s | **65** | **$0.325** |
| Quality | **1080p** | 4s | **255** | **$1.275** |

Probe task IDs: Fast1080 `dbd05cdb…`, Quality1080 `8c573bf9…` (both successFlag=1, response resolution `1080p`).

---

## Cost increase vs previous KIE Short ($1.50 / 300 credits)

| Path | Credits / Short (5 shots) | USD / Short | Delta vs prior |
|------|--------------------------:|------------:|----------------|
| Prior Fast@720p | 300 | $1.50 | baseline |
| **Boost: Fast@1080p** | **~325** | **~$1.625** | **+~8%** / +$0.125 |
| Full Quality@1080p | **~1275** | **~$6.375** | **+325%** / +$4.875 |

**Recommendation:** Use **Fast @ native 1080p + prompt/encode boost** as the production default — highest quality gain per dollar. Reserve `AMYNEST_KIE_VEO_QUALITY=1` for hero creatives when balance ≥ ~1300 credits.

---

## Render / generation time

| Mode | Observed wall time (1×4s probe) | Est. full Short (5 shots) |
|------|--------------------------------:|---------------------------|
| Prior Fast@720p | ~67–76s / shot | ~6.3–7.8 min (prod: 465s gen) |
| Fast@1080p | ~96–112s / shot | **~8–9.5 min** (~**+25–40%**) |
| Quality@1080p | ~96–112s / shot (probe) | **~8–12+ min** (Quality often slower under load) |

Encode path: CRF16/slow adds a small mux overhead vs default x264 (seconds, not minutes).

---

## Visual improvements vs previous production run

Previous Short: https://youtube.com/shorts/pzY4h63ABKQ (Fast@720p → upscaled canvas)

| Area | Expected improvement |
|------|----------------------|
| Resolution | Native **1080×1920** pixels from Veo — less soft faces/edges than 720→1080 pad |
| Motion | Explicit blinks, gestures, hair/cloth, anti-slideshow language in KIE prompts |
| Cinematography | Push-in / dolly / parallax / DoF instructions per shot |
| Lighting | Soft key, consistent shadows, warm grade, controlled contrast |
| Character lock | Stronger “exact first-frame identity” reinforcement (Amy AI / Girl / Boy) |
| Compression | CRF **16** slow encode → fewer blockies on faces/text overlays |

Script, narration, music, CTA plate, captions, duration, validators, publishing: **unchanged**.

---

## Current account status

| Field | Value |
|-------|------:|
| Credits after probes | **~100** |
| Needed for Fast@1080p Short | **~325** |
| Needed for Quality@1080p Short | **~1275** |

**Blocked on balance for a full re-render right now.** Top up, then re-run:

```bash
cd content-engine
# Recommended boost path
pnpm exec node --import tsx/esm ./operations/kie-production-run.ts
```

---

## Isolation checklist

| Requirement | Status |
|-------------|--------|
| Do not change production pipeline | ✅ |
| Do not change validators / publishing / story | ✅ |
| Improve only KIE media quality | ✅ (`operations/kie-production-run.ts`) |
| No duration / narration / CTA / edit structure change | ✅ |
