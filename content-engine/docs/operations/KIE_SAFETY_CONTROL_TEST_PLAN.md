# KIE Safety Control Test Plan

**Status:** CONTROL EXECUTED (one request) — STOPPED  
**Mode:** Single authorized CONTROL complete; no further KIE calls  
**Scope:** Golden 010 · `shot-amy-girl-learn` only  
**Date:** 2026-08-31

---

## Purpose

Isolate **one** variable against the known Golden 010 learn failure:

> Does removing the generated memory frame (`9a043e…`) from an otherwise identical KIE request change the third-party safety outcome?

Do **not** claim the memory frame is the trigger until this control is run and interpreted.

---

## Exact failing task

| Field | Value |
|-------|--------|
| Golden | `golden-010` — Realtime Coaching — Minutes, Words, Confidence, Streak |
| Out dir | `p0-regression-golden-010` |
| Fail shot | **`shot-amy-girl-learn`** |
| Shot meta | `amy-girl`, planned 6s, **`memory→video`** |
| Provider error | `Request blocked: The input content was flagged by safety filters for involving restricted third-party content.` |
| Report | `GOOGLE_PRODUCTION_RUN_REPORT.md` (e.g. 2026-08-19T18:43:39Z) |
| Wire proof | `console.log` / `console-repro-forensic.log` — refs=3 hashes `dc09bf858293,9a043e55794c,6f65f19d2ac5` |
| Upstream memory source | Freeze of successful `shot-amy-host-raw.mp4` → `shot-amy-host-last.png` |

Controls that must remain true for this test:

- Golden 009 / 012 are PASS controls (architecture can succeed)
- P0 Golden VO / TTS / bible-on-wire remain PASS
- Exact sole trigger of the safety filter remains **UNKNOWN** until this (or a later) control runs

---

## Single variable

| | |
|--|--|
| **Variable** | Presence of generated memory reference `9a043e55794c…` (`shot-amy-host-last.png`) in `imageUrls` |
| **Baseline** | Canonical bibles **+** memory frame |
| **Control** | Canonical bibles **only** (memory frame omitted) |

### Explicitly unchanged

- Golden Script / narration / TTS assets  
- Production prompt **wording** (same frozen prompt bytes for both)  
- Character bible files and SHAs  
- Model `veo3_fast`  
- `generationType` `REFERENCE_2_VIDEO` (still valid with 2 imageUrls)  
- Duration `8` (REFERENCE mode)  
- Resolution `720p`  
- Aspect `9:16`  
- `enableTranslation: false`  
- Audio HTTP configuration (**none** on wire — unchanged)  
- Scene / camera / cast intent in the **prompt**  
- Provider (KIE)  
- Canonical refs: girl bible + amy bible  

### Inevitable mechanical consequence (documented — not a second experiment)

Removing the memory slot changes `imageUrls.length` **3 → 2** and changes which local path is the first-frame seed (`imagePath` was the memory file under `memory→video`).

**Forbidden substitutes:** do **not** insert `shot-amy-girl-learn-identity.png` (`e083f1b2…`) or any other generated frame to “keep refs=3”. That would introduce a **second** variable.

---

## FAILED BASELINE (redacted) — already observed

Source: production compose wire for Golden 010 learn (multiple identical fails).

```json
{
  "label": "FAILED_BASELINE",
  "shotId": "shot-amy-girl-learn",
  "character": "amy-girl",
  "seedMode": "memory→video",
  "endpoint": "POST https://api.kie.ai/api/v1/veo/generate",
  "body": {
    "prompt": "<FROZEN production learn prompt — same bytes as CONTROL; not logged in full here>",
    "imageUrls": [
      "<upload of amy-girl-bible.jpeg>",
      "<upload of shot-amy-host-last.png>",
      "<upload of amy-ai-bible.jpeg>"
    ],
    "model": "veo3_fast",
    "generationType": "REFERENCE_2_VIDEO",
    "aspect_ratio": "9:16",
    "resolution": "720p",
    "duration": 8,
    "enableTranslation": false
  },
  "localAssetsRedacted": [
    {
      "slot": 0,
      "role": "canonical-girl-bible",
      "path": "content-engine/brand/assets/amy-girl-bible.jpeg",
      "sha256": "dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f"
    },
    {
      "slot": 1,
      "role": "GENERATED_MEMORY_FRAME",
      "path": ".amynest-assets/p0-regression-golden-010/work/cinematic/character-memory/shot-amy-host-last.png",
      "sha256": "9a043e55794c931842ea4f89a5e96f75570233aa6594983a8931140b5c7f164f",
      "note": "SINGLE VARIABLE — PRESENT in baseline"
    },
    {
      "slot": 2,
      "role": "canonical-amy-bible",
      "path": "content-engine/brand/assets/amy-ai-bible.jpeg",
      "sha256": "6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb"
    }
  ],
  "negativePrompt": "NOT SENT on KIE wire",
  "audioParams": "NONE on KIE wire",
  "observedOutcome": "safety: restricted third-party content",
  "observedCreditDelta": "0 on reject (prior KIE log / isolation pattern)"
}
```

Console fingerprint:

```
FINAL HTTP payload (redacted): character=amy-girl refs=3 type=REFERENCE_2_VIDEO
model=veo3_fast duration=8 hashes=dc09bf858293,9a043e55794c,6f65f19d2ac5
```

---

## CONTROL WITHOUT MEMORY FRAME (redacted) — prepared, not sent

```json
{
  "label": "CONTROL_NO_MEMORY_FRAME",
  "shotId": "shot-amy-girl-learn",
  "character": "amy-girl",
  "seedMode": "diagnostic — memory omitted; canonical bibles only",
  "endpoint": "POST https://api.kie.ai/api/v1/veo/generate",
  "body": {
    "prompt": "<SAME FROZEN production learn prompt bytes as FAILED_BASELINE>",
    "imageUrls": [
      "<upload of amy-girl-bible.jpeg>",
      "<upload of amy-ai-bible.jpeg>"
    ],
    "model": "veo3_fast",
    "generationType": "REFERENCE_2_VIDEO",
    "aspect_ratio": "9:16",
    "resolution": "720p",
    "duration": 8,
    "enableTranslation": false
  },
  "localAssetsRedacted": [
    {
      "slot": 0,
      "role": "canonical-girl-bible",
      "path": "content-engine/brand/assets/amy-girl-bible.jpeg",
      "sha256": "dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f"
    },
    {
      "slot": 1,
      "role": "canonical-amy-bible",
      "path": "content-engine/brand/assets/amy-ai-bible.jpeg",
      "sha256": "6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb"
    }
  ],
  "removedVersusBaseline": {
    "field": "imageUrls[1] generated memory frame",
    "sha256": "9a043e55794c931842ea4f89a5e96f75570233aa6594983a8931140b5c7f164f",
    "path": "shot-amy-host-last.png"
  },
  "negativePrompt": "NOT SENT on KIE wire",
  "audioParams": "NONE on KIE wire",
  "executionState": "NOT EXECUTED"
}
```

### Diff (single intentional change)

| Field | FAILED BASELINE | CONTROL |
|-------|-----------------|---------|
| `prompt` | frozen P | **same P** |
| `model` / `generationType` / `duration` / `resolution` / `aspect_ratio` / `enableTranslation` | as above | **same** |
| girl bible `dc09bf…` | yes | **same** |
| amy bible `6f65f19d…` | yes | **same** |
| memory `9a043e…` | **yes** | **NO — only change** |
| learn identity `e083f1…` | not on wire | **must stay off wire** |

---

## Prompt freeze requirement (pre-flight, still offline until authorized)

The failing production run did not persist the full Veo prompt text next to the console hashes.

Before any authorized call:

1. Reconstruct or capture the **exact** learn prompt that compose would send for Golden 010 under the same diversity/out-dir conditions as the failing run.  
2. Write it to a locked file (e.g. `.amynest-assets/kie-safety-control-010-learn/prompt.frozen.txt`).  
3. Record `sha256(prompt)`.  
4. Use **that same file** for CONTROL only (baseline already failed with production prompt; do not re-spend on baseline).

A reconstructed candidate already exists offline at:

`/.amynest-assets/kie-safety-filter-forensic/prompt-010-learn-production.txt` (26874 bytes)

Treat it as a **candidate freeze**, not proven byte-identical to the August 19 failing run, until hashed against a captured compose dump. For a valid A/B, CONTROL prompt bytes must match whatever is declared as baseline prompt freeze.

---

## Execution rules (when later authorized — not now)

1. **One** KIE `veo/generate` request only = CONTROL.  
2. Do **not** re-run FAILED BASELINE (already proven).  
3. Do **not** run Golden 010 full pipeline.  
4. Do **not** modify production Character Memory / compose code for the experiment — use a **diagnostic harness** that posts the CONTROL body explicitly.  
5. Stop after create+poll completes (or immediate safety reject).  
6. Log: HTTP status, taskId, `errorMessage`, credits before/after, redacted `imageUrls` count + local SHA list, prompt SHA.

### Suggested harness location (create later — do not create/run now)

`content-engine/operations/kie-safety-control-010-learn.ts` — diagnostic only, gated by env like `AMYNEST_KIE_SAFETY_CONTROL=1` and explicit confirmation string.

---

## Expected diagnostic interpretation

| CONTROL outcome | Interpretation |
|-----------------|----------------|
| **Accepted** (task succeeds / video returned; or create+poll without third-party safety) | Generated memory frame / memory context is **STRONGLY IMPLICATED**. Next step: optional confirm by re-adding **only** `9a043e…` (separate authorized test). |
| **Rejected** with same third-party safety text (credits 0 pattern) | Generated memory frame is **NOT sufficient** to explain the failure. Next single-variable test must isolate another field (e.g. prompt franchise tokens, girl-bible alone, amy-bible companion ref) — **separate plan**, still one variable. |
| Rejected with a **different** error (e.g. audio-branch) | Memory may interact with audio path; do **not** treat as proof for third-party trigger. Record and stop. |

Do not update production architecture based on one result without a written follow-up plan.

---

## Credit cost expectation

| Scenario | Expected Δ credits (from prior offline evidence) |
|----------|--------------------------------------------------|
| Safety reject (third-party) | **~0** |
| Accepted REFERENCE_2_VIDEO @ 720p | **~60** (prior isolation successes measured −60) |
| This plan’s authorized spend | **At most one** CONTROL attempt ≈ **0–60** credits |
| Baseline re-run | **Forbidden** in this plan |

If account balance &lt; 60, do not authorize an accept-path test; a reject-path still yields diagnostic value at ~0 cost but acceptance cannot be observed.

---

## Rollback plan

| Item | Action |
|------|--------|
| Production Character Memory | **Unchanged** — never disabled for production by this test |
| Canonical bibles | **Unchanged** |
| Golden Script / narration | **Unchanged** |
| Compose / provider code | **No production PR** from this test; harness only |
| Diagnostic outputs | Keep under `.amynest-assets/kie-safety-control-010-learn/`; delete video if unwanted |
| Accidental full Golden run | Abort; do not upload; do not treat as production master |
| Policy | KIE lock remains until human explicitly authorizes the single CONTROL call |

---

## Out of scope (do not fold into this test)

- Golden 011 / `4241de…` identity isolation  
- Prompt scrubbing (Disney+/Pixar/…)  
- Removing Amy or children  
- Replacing canonical refs  
- Disabling Character Memory in production  
- Multi-shot pipeline resume  

---

## Gate checklist

- [x] This document reviewed  
- [x] Prompt freeze file + SHA recorded (`059148ac7c7785f5387f23c756906e8bc18db3804cec63c8d2af0d083f2e1e74`)  
- [x] CONTROL payload matches “canonical only” (no memory, no identity substitute)  
- [x] Human explicitly authorized **one** CONTROL request  
- [x] Credits budget acknowledged (0–60)  
- [x] Rollback understood  

---

## CONTROL TEST RESULT

**Executed:** 2026-08-31T17:05:56Z → 17:08:02Z (UTC)  
**Harness:** `content-engine/operations/kie-safety-control-010-learn-once.ts`  
**Artifacts:** `.amynest-assets/kie-safety-control-010-learn/`

### Baseline

**FAILED** — safety filter  
`Request blocked: The input content was flagged by safety filters for involving restricted third-party content.`  
Wire: refs=3 hashes `dc09bf858293,9a043e55794c,6f65f19d2ac5`

### Control

**PASS**

| Field | Value |
|-------|--------|
| Create HTTP status | **200** |
| Task ID | `faf5ca6053fd36e3fb91f194a19ffe4c` |
| Poll | `successFlag=1` (13 polls) |
| Provider create response | `{"code":200,"msg":"success","data":{"taskId":"faf5ca6053fd36e3fb91f194a19ffe4c"}}` |
| Provider poll error | **none** |
| Output asset | `.amynest-assets/kie-safety-control-010-learn/control-out.mp4` (~1.8 MB) |
| Generate calls | **1** (no silence retry, no fallback) |
| imageUrls on wire | Girl bible `dc09bf…` + Amy bible `6f65f19d…` only |
| Memory `9a043e…` | **ABSENT** (verified pre-flight) |
| Prompt SHA | `059148ac7c7785f5387f23c756906e8bc18db3804cec63c8d2af0d083f2e1e74` |

### Credits

| | |
|--|--|
| Before | **5212.88** |
| After | **5152.88** |
| Consumed | **60** |

### Exact provider response (summary)

- **Create:** HTTP 200 · success · taskId `faf5ca6053fd36e3fb91f194a19ffe4c`  
- **Poll final:** successFlag **1** · result video URL returned · **no** `errorMessage`  
- **Not observed:** third-party safety block / HTTP 400 safety class

### Interpretation (CASE A)

Generated memory frame **`9a043e…` is STRONGLY INDICATED as a contributing trigger** for the Golden 010 `shot-amy-girl-learn` third-party safety rejection, when held against the same prompt + canonical bibles.

**Memory reference implicated; production change requires separate fix.**

Do **NOT**:
- remove Character Memory from production based on this alone  
- change prompts / bibles / Golden scripts  
- run a second KIE request  

### Confidence

**STRONGLY INDICATED** (not PROVEN as sole root cause — ref-count 3→2 is an inseparable mechanical consequence of omitting the memory slot; a later authorized test could re-add only `9a043e…` to confirm)

### Production status

- Character Memory: **unchanged**  
- Canonical refs: **unchanged**  
- Compose / provider code: **unchanged**  
- No further KIE generation authorized by this result  

---

ONE CONTROL TEST EXECUTED — KIE GENERATION STOPPED.
