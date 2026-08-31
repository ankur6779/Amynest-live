# KIE Safety-Filter Forensic — Offline Audit

**Mode:** KIE CREDIT PROTECTION — offline evidence only  
**Date:** 2026-08-31  
**Scope:** Golden 009 / 010 / 011 / 012  
**Status:** Diagnosis only — no fix implemented — no new provider calls in this audit

---

## Executive finding

KIE/Veo rejects some Golden 010 and 011 compose shots with:

> Request blocked: The input content was flagged by safety filters for involving restricted third-party content.

P0 integrity (Golden VO, TTS completeness, KIE refs on wire) remains **PASS**. The failure is a **provider safety classification** during Veo generation/poll for specific shots — not a local TTS/mux/ref-wiring regression.

**Exact single-component trigger:**  
**UNKNOWN — MORE PROVIDER TESTING REQUIRED**

Existing evidence **narrows** candidates (girl-reference sensitivity appears real but non-exclusive; continuity-frame + prompt combinations differ on failing shots) but **does not prove** one deterministic input field as the sole cause without further paid testing (forbidden in this mode).

---

## 1. Proven facts

| Fact | Confidence | Evidence source |
|------|------------|-----------------|
| Provider error text is the third-party safety message | **PROVEN** | `GOOGLE_PRODUCTION_RUN_REPORT.md` for golden-010 (2026-08-19T18:43:39Z) and golden-011 (2026-08-19T18:46:16Z); isolation case `ref-C-girl-only-minimal` poll `errorMessage` |
| Rejected safety path consumed **0** local credit delta on that task | **PROVEN** | Isolation `ref-C`: `creditDeltaTotal: 0`; user KIE log: credits consumed = 0 |
| Create HTTP from AmyNest client was **200** with `taskId` before safety message | **PROVEN** | Isolation cases: `createHttpStatus: 200`, then poll `successFlag` fail with safety text. User-facing “HTTP 400” is consistent with KIE/Google dashboard classification of the blocked generation, not necessarily our create status code |
| Golden 010 fails deterministically on **`shot-amy-girl-learn`** | **PROVEN** | `p0-regression-golden-010/console.log` + `console-repro-forensic.log` — hook + host succeed; learn fails twice |
| Golden 011 fails deterministically on **`shot-amy-host`** | **PROVEN** | `p0-regression-golden-011/console.log` + `console-repro-forensic.log` — hook succeeds; host fails twice |
| Canonical bible hashes on wire for failing shots | **PROVEN** | Logs: Amy `6f65f19d2ac5…`, Girl `dc09bf858293…`, Boy `1cc38ca7b1f5…` |
| KIE HTTP body has **no** TTS URL, captions, negativePrompt, or audio flags | **PROVEN** | `kie-video/client.ts` `requestBody` = `prompt`, `imageUrls`, `model`, `generationType`, `aspect_ratio`, `resolution`, `duration`, `enableTranslation: false` |
| Local narration is **not** the Veo request audio | **PROVEN** | Same client; TTS completes before compose (49s+ WAV on disk for 010/011) |
| Golden 009 and 012 produced full masters with same bible hashes | **PROVEN** | `PRODUCTION_INTEGRITY_FIX_REPORT.md`; complete shot payload sequences in `p0-fix-golden-009` / `p0-regression-golden-012` consoles |
| Prompt templates name Disney+ / Pixar / Paddington / Ted / Detective Pikachu / Netflix / Apple TV | **PROVEN** | `performances.ts`; counted in saved probe prompts for 009–012 |
| Those third-party **prompt** tokens appear in successful **and** failing goldens | **PROVEN** | Offline counts on `kie-010-011-forensic/prompt-*-*.txt` — similar counts across 009/010/012 learn and 011/012 host |

---

## 2. Existing KIE error

### Production (010 / 011)

```
Request blocked: The input content was flagged by safety filters
for involving restricted third-party content.
```

| Field | Golden 010 | Golden 011 |
|-------|------------|------------|
| Stop stage | `creative-composition` | `creative-composition` |
| Fail shot | `shot-amy-girl-learn` (amy-girl, 6s, memory→video) | `shot-amy-host` (amy-ai, 6s, identity→video) |
| Wire type | `REFERENCE_2_VIDEO` | `REFERENCE_2_VIDEO` |
| Model | `veo3_fast` | `veo3_fast` |
| Duration on wire | 8 | 8 |
| Resolution (env) | 720p | 720p |
| Aspect | 9:16 | 9:16 |
| refs | 3 | 3 |
| Report timestamps | 2026-08-19T18:43:39.263Z | 2026-08-19T18:46:16.373Z |

### Prior isolation (already completed before credit lock — not re-run)

Task `18e93824f51b0aafd6b55cc6ff5ce7f3` (`ref-C-girl-only-minimal`): same safety text; create 200; Δ credits 0.

---

## 3. Golden 009 vs 010 vs 011 vs 012 comparison

### Outcome matrix

| Golden | Topic | P0 VO/TTS/refs | Master | Fail shot | Provider class |
|--------|-------|----------------|--------|-----------|----------------|
| **009** | Speech Parent Guidance | PASS | **PASS** (~48s) | — | — |
| **010** | Speech Coach V2 | PASS | **NONE** | `shot-amy-girl-learn` | third-party safety |
| **011** | Amy Health Lab™ | PASS | **NONE** | `shot-amy-host` | third-party safety |
| **012** | Health Lab Balance & Freeze | PASS | **PASS** (~48s) | — | — |

### Shared wire constants (all four)

- `model=veo3_fast`
- `generationType=REFERENCE_2_VIDEO` for multi-ref shots
- `duration=8` on REFERENCE mode
- `enableTranslation=false`
- Canonical girl/amy/boy bible SHAs identical when those assets appear
- Negative prompt: **not sent** on KIE wire
- Audio HTTP params: **none**

### Failing vs successful shot payloads

#### Learn shot (010 fail vs 009/012 success)

| | 009 learn (OK) | 010 learn (FAIL) | 012 learn (OK) |
|--|----------------|------------------|----------------|
| character | amy-girl | amy-girl | amy-girl |
| refs | 3 | 3 | 3 |
| ref[0] | girl bible `dc09bf…` | girl bible `dc09bf…` | girl bible `dc09bf…` |
| ref[1] | memory `09a6bdac…` | memory **`9a043e55…`** | memory `7ae34c50…` |
| ref[2] | amy bible `6f65f19d…` | amy bible `6f65f19d…` | amy bible `6f65f19d…` |
| mode | memory→video | memory→video | memory→video |

**Exact difference on wire (learn):** only the **scene-memory last-frame hash** (generated continuity PNG), not the canonical bibles.

#### Host shot (011 fail vs 009/012 success)

| | 009 host (OK) | 011 host (FAIL) | 012 host (OK) |
|--|---------------|-----------------|---------------|
| character | amy-ai | amy-ai | amy-ai |
| refs | 3 | 3 | 3 |
| ref[0] | amy bible `6f65f19d…` | amy bible `6f65f19d…` | amy bible `6f65f19d…` |
| ref[1] | identity `71881865…` | identity **`4241de9b…`** | identity `acc493d9…` |
| ref[2] | girl bible `dc09bf…` | girl bible `dc09bf…` | girl bible `dc09bf…` |

**Exact difference on wire (host):** the **identity keyframe hash** (pipeline-generated), not the canonical amy/girl bibles.

#### Counter-evidence: girl bible is not globally blocked

| Evidence | Result |
|----------|--------|
| 010 `shot-hook` | refs=2 includes girl bible → **succeeded** (audio-branch retry once, then OK) |
| 011 `shot-hook` | refs=2 includes girl bible → **succeeded** |
| 009 / 012 full pipelines | multiple shots with girl bible → **succeeded** |
| Prior matrix `010-learn-C-refs1-full` (base plan prompt + girl bible only) | **ok: true** (task `5876ce2ae3626403fcf633e15b869c71`) |
| Isolation `ref-C-girl-only-minimal` | girl bible only → **third-party safety** (Δc=0) |

→ Girl bible can pass or fail depending on request context / time. **Not a permanent hard block.**

---

## 4. Exact differences (summary)

What is **the same** on failing and successful runs:

- Canonical Amy / Girl / Boy bible SHA-256
- Model, REFERENCE duration 8, 9:16, translation off
- Presence of Disney+/Pixar/Paddington/Pikachu/Netflix-style tokens in performance prompts
- Child characters on screen in successful Shorts
- No narration WAV in Veo body

What **differs** on the failing shots:

| Diff | 010 | 011 |
|------|-----|-----|
| Continuity / identity PNG hash | memory `9a043e55…` | identity `4241de9b…` |
| Golden dialogue / diversity-applied spoken lines | Speech Coach V2 beats | Health Lab “exercise / adventure” beats |
| Diversity playlist metadata | Speech · feature-ui | Speech · amy-ai-hero *(Health seed miscategorized as Speech playlist — metadata only; not proven in Veo body)* |
| Fail shot role | learn (girl lead) | host (Amy lead + girl bible as companion ref) |

---

## 5–7. Candidate safety triggers

### Candidate A — `amy-girl-bible.jpeg` alone is classified as third-party IP

| | |
|--|--|
| **Supporting** | Isolation `ref-C-girl-only-minimal`: minimal silent prompt + girl bible only → same safety text, Δc=0. Asset is a multi-panel 3D child character sheet (checkerboard). |
| **Against** | 009/012 masters; 010/011 hooks; prior matrix girl-only success with different prompt; isolation `ref-G-girl-boy` **passed** with girl+boy. |
| **Confidence** | **STRONGLY INDICATED** as a *sensitive* asset under some request contexts — **not PROVEN** as sole/always trigger |

### Candidate B — Specific generated continuity frames (`9a043e…` / `4241de…`) tip the classifier

| | |
|--|--|
| **Supporting** | Only wire-hash difference vs successful 009/012 counterparts on the failing shot. 010 memory shows Amy+girl physical contact + AmyAi logo on cap. 011 identity is clean Amy portrait with AmyAi logo. |
| **Against** | No offline A/B that swaps only that PNG while holding prompt fixed (would require new KIE calls). 011 fails even though identity looks “clean.” |
| **Confidence** | **STRONGLY INDICATED** as the primary *wire-visible* differentiator — trigger mechanism **UNKNOWN** |

### Candidate C — Prompt third-party brand names (Disney+, Pixar, Paddington, Ted, Detective Pikachu, Netflix, Apple TV)

| | |
|--|--|
| **Supporting** | Explicit restricted-franchise language in `performancePrompt()`; production diversified prompts for 010/011 contain many such tokens. |
| **Against** | Same template family and similar token counts in **successful** 009/012 prompts; isolation third-party fail occurred with a **minimal** prompt containing **none** of those brands (`ref-C`). |
| **Confidence** | **UNKNOWN** as primary cause; **PROVEN** present; **PROVEN** insufficient alone |

### Candidate D — Audio / TTS / “audio-branch”

| | |
|--|--|
| **Supporting** | Hook on 010 had recoverable “unable to generate audio”; user historically saw audio-branch language. |
| **Against** | Final 010/011 report errors are **third-party safety**, not audio-branch. HTTP body has no audio fields. TTS WAV not uploaded to Veo. Isolation third-party case used **SILENT VIDEO ONLY** suffix. |
| **Confidence** | Audio as the **third-party** trigger: **disproven for the failing class**. Separate audio-branch failures: **PROVEN** possible on other shots |

### Candidate E — “Children are blocked” / “Amy is blocked”

| | |
|--|--|
| **Against** | Isolation: Amy-only PASS; Boy-only PASS; Girl+Boy PASS; production hooks with girl PASS; 009/012 full child pipelines PASS. |
| **Confidence** | **disproven** as blanket rules |

### Candidate F — Health / medical / exercise wording (011)

| | |
|--|--|
| **Supporting** | 011 seed/dialogue includes exercise / motion wellness language. |
| **Against** | 012 is also Health Lab and **PASS**; 010 is Speech and **FAIL**. |
| **Confidence** | Category alone **disproven** |

### Candidate G — Non-deterministic / opaque Google safety behind KIE

| | |
|--|--|
| **Supporting** | Same girl bible: PASS and FAIL across tasks; create 200 then safety; Δc=0 on reject; contradictory isolation vs matrix girl-only outcomes. |
| **Against** | Fail shots for 010/011 are **repeatable** on the same continuity hashes in production resumes. |
| **Confidence** | **STRONGLY INDICATED** that classifier is **context-sensitive / opaque**; exact policy rule **UNKNOWN** |

### Candidate H — Branded AmyNest / AmyAi text in reference images

| | |
|--|--|
| **Supporting** | Amy bible sheet: “OFFICIAL AMYNEST AI CHARACTER BIBLE”, AmyAi on cap; memory/host frames show AmyAi logo. |
| **Against** | Amy-only isolation PASS; 009/012 use same amy bible successfully. |
| **Confidence** | Present (**PROVEN**); sole trigger (**UNKNOWN** / weakly indicated) |

---

## Asset metadata (existing, unchanged)

| Role | File | SHA-256 (full) | Dims | Notes (visual, offline) |
|------|------|----------------|------|-------------------------|
| Amy bible | `amy-ai-bible.jpeg` | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` | 1376×768 | Multi-panel sheet; AmyNest AI headers; AmyAi logo on cap |
| Girl bible | `amy-girl-bible.jpeg` | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` | 1376×768 | Multi-panel child sheet; purple hoodie; **no clothing logos** |
| Boy bible | `amy-boy-bible.jpeg` | `1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee` | 1376×768 | Multi-panel child sheet; AmyNest instruction text on sheet; no clothing logos |
| 010 memory | `shot-amy-host-last.png` | `9a043e55794c931842ea4f89a5e96f75570233aa6594983a8931140b5c7f164f` | 720×1280 | Amy+girl contact; AmyAi on cap |
| 011 identity | `shot-amy-host-identity.png` | `4241de9b84cf83a32ef29be93874b2a5a99d36c68d2111a8287175bcee990274` | 1080×1920 | Single Amy portrait; AmyAi on cap |

Do **not** assert third-party character likeness without KIE policy confirmation.

---

## Prior isolation table (already recorded — not re-executed)

| Component | 400/third-party safety? | Evidence |
|-----------|-------------------------|----------|
| No refs (TEXT_2_VIDEO) | No (audio fail) | `ref-A` task `b782da73…` Δc=0 |
| Amy only | No — **PASS** | `ref-B` Δc=-60 |
| Girl only | **YES** | `ref-C` task `18e93824…` Δc=0 |
| Boy only | No — **PASS** | `ref-D` Δc=-60 |
| Amy+Girl | No (audio fail) | `ref-E` Δc=0 |
| Amy+Boy | No — **PASS** | `ref-F` Δc=-60 |
| Girl+Boy | No — **PASS** | `ref-G` Δc=-60 |
| All 3 refs | Create accepted; poll incomplete when job stopped | `ref-H` task `9aa202c0…` create Δc=-60 |
| Original production prompt (010/011) vs minimal | Production prompt isolation **not finished** before credit lock | Incomplete |
| Audio ON vs OFF (HTTP fields) | N/A — **no audio fields exist** on wire | Client source |
| Silence suffix | Used on isolation; third-party still hit on girl-only | `ref-C` |

Prior matrix (base plan, not diversified production prompt): `010-learn-A/B/C` all **ok:true** including girl-only — conflicts with `ref-C`, reinforcing non-determinism / prompt-context sensitivity.

---

## Confidence summary

| Claim | Label |
|-------|-------|
| 010/011 blocked by KIE safety “restricted third-party content” | **PROVEN** |
| Failure is mid-compose Veo, after refs uploaded | **PROVEN** |
| P0 Golden/TTS/ref-wiring still good | **PROVEN** |
| Exact sole trigger identified | **UNKNOWN — MORE PROVIDER TESTING REQUIRED** |
| Girl bible is a sensitive input | **STRONGLY INDICATED** |
| Continuity/identity PNG difference correlates with fail shots | **STRONGLY INDICATED** |
| Prompt franchise names alone cause the fail | **UNKNOWN** (insufficient; contradicted by controls) |
| Audio/TTS parameters cause the fail | **disproven** for this error class |
| Children/Amy globally blocked | **disproven** |

---

## What remains unknown (requires paid testing — **not** done here)

1. Whether swapping only `9a043e…` / `4241de…` for a known-good memory/identity PNG clears 010/011  
2. Whether scrubbing Disney+/Pixar/Pikachu tokens alone clears production diversified prompts  
3. Why girl-only sometimes passes and sometimes safety-blocks  
4. Whether KIE dashboard “HTTP 400” maps 1:1 to create vs poll  

---

## Mandatory lock statement

KIE GENERATION LOCKED — NO CREDITS SPENT DURING THIS AUDIT.
