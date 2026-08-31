# KIE-Safe Character Memory Design

**Mode:** OFFLINE ANALYSIS ONLY — no API calls, no generation, no production code changes  
**Date:** 2026-08-31  
**Related:** `KIE_SAFETY_CONTROL_TEST_PLAN.md`, `KIE_GENERATED_REFERENCE_PROVENANCE.md`, `CHARACTER_MEMORY_ENGINE.md`

---

## Controlled experiment (input)

Golden 010 · `shot-amy-girl-learn`

| | Refs | Result |
|--|------|--------|
| **BASELINE** | Girl bible `dc09bf…` + Amy bible `6f65f19d…` + memory `9a043e…` | Safety reject — restricted third-party content |
| **CONTROL** | Girl bible + Amy bible (**no** memory) | HTTP 200 · 8s video · −60 credits · task `faf5ca6053fd36e3fb91f194a19ffe4c` |

**Single variable:** presence of generated memory frame in KIE `imageUrls`.

**Human visual inspection of successful CONTROL output:** no AmyAI logo in the 8s clip; Girl+Amy combination correct; appearance/prop/background/multi-character composition normal; no obvious third-party resemblance.

---

## What is proven

| Claim | Confidence |
|-------|------------|
| With the same prompt + Girl/Amy canonical bibles, **adding** memory frame `9a043e…` correlates with third-party safety reject | **PROVEN** (baseline) |
| **Omitting** that memory frame yields successful generation | **PROVEN** (control) |
| Character Memory system also carries rich **non-pixel** continuity (pose, room, light, camera, emotion, wardrobe, props) | **PROVEN** (`SceneCharacterMemory` + `formatMemorySceneBlock`) |
| Canonical bibles are the authoritative identity assets on the KIE wire when present | **PROVEN** (P0 integrity + control) |
| Memory last-frame is produced locally (ffmpeg freeze), then inserted into seed → `imageUrls` | **PROVEN** (`freeze.ts` → `seed.ts` → `compose.ts` → `kie-video/provider.ts`) |

## What is not proven

| Claim | Confidence |
|-------|------------|
| Pixels inside `9a043e…` are inherently “unsafe” or third-party-looking | **Not supported** — contradicted by visual inspection of control *and* by successful 009/012 runs that also used memory frames |
| Memory frame is the **sole** global cause of all KIE safety fails (e.g. Golden 011 host / `4241de…`) | **UNKNOWN** — 011 was not part of this control |
| Removing memory frames will never hurt scene continuity quality | **UNKNOWN** — needs quality review after a safe design ships |
| Ref-count change 3→2 is irrelevant | **UNKNOWN** — inseparable from omitting the memory slot in this experiment |

**Current conclusion (unchanged):**  
Generated memory frame **as a KIE `imageUrls` input** is **STRONGLY INDICATED** as the trigger/context for the 010 learn failure — not that Character Memory as a product concept is unsafe.

---

## 1. Memory usage map (today)

### Creative-composition / KIE path (production Shorts)

| Location | What it does | Class |
|----------|--------------|-------|
| `character-memory-engine/from-composition.ts` `memoryPlanForCompositionShot` | Builds `SceneCharacterMemory` (poses, props, room, lighting, camera, emotion, cast, bible paths) | **A** planning/continuity metadata |
| `from-composition.ts` → `referenceImagePaths` includes `previous.lastFramePath` when present | Records intended visual stack | **C** visual reference (intent) |
| `performances.ts` → `enrichCompositionWithCharacterMemory` | Injects memory into Veo **prompt** via `format.ts` | **B** prompt context |
| `format.ts` `formatMemorySceneBlock` | Textual locks: room, lighting, camera continue, emotion, poses, props, wardrobe | **B** prompt context |
| `compose.ts` `seedForShot` / `resolveGenerationSeed` | Chooses `imagePath` + `referenceImagePaths` for provider | **C** + **D** (feeds KIE) |
| `compose.ts` `attachLastFrameMemory` after each shot | ffmpeg freeze → `character-memory/{sceneId}-last.png` | Local store (**C** source material) |
| `kie-video/provider.ts` merges bible + `referenceImagePaths` + `imagePath` | Uploads into HTTP `imageUrls` | **D** actual KIE imageUrls |
| `kie-video/client.ts` | Posts `prompt` + `imageUrls` (no separate memory API field) | **D** |

### Other Character Memory surfaces (not the 010 learn fail path)

| Location | Class |
|----------|-------|
| `character-memory-engine/engine.ts` + `carry.ts` + `quality-gate.ts` | **A** plan-time package / rejects / scores |
| `scene-composer/compose.ts` `enrichPromptsWithCharacterMemory` | **B** (slideshow/scene-composer prompts) |
| `story-memory-engine/*` | **A/B** story thread consuming memory package |
| Continuity JSON / `character-memory.json` artifacts | **A** evidence / debugging |

Kill-switch: `AMYNEST_CHARACTER_MEMORY=0` disables the layer (default **on**). Design goal: keep it **on**, change **what reaches KIE imageUrls**.

---

## 2. Minimum continuity without sending last-frame to KIE

Already available on `SceneCharacterMemory` (**PROVEN** in types + format):

| Continuity need | Field(s) today | Can survive without KIE last-frame? |
|-----------------|----------------|-------------------------------------|
| Pose / body position | `poses[].position`, `bodyOrientation` | **Yes** → prompt |
| Eye-line | `poses[].eyeDirection` (+ shot `eyeLine`) | **Yes** → prompt |
| Wardrobe / hair / accessories | `poses[]` + `wardrobeFor()` bible locks | **Yes** → prompt + **canonical bible pixels** |
| Prop | `props[]` | **Yes** → prompt |
| Room | `room` | **Yes** → prompt |
| Lighting direction / mood | `lighting.*` | **Yes** → prompt |
| Camera direction / continue-from | `camera.*` | **Yes** → prompt |
| Emotional / action state | `emotion.*`, `animationEnergy` | **Yes** → prompt |
| Cast | `characters[]` | **Yes** → bible stack selection |
| Exact pixel match to prior clip end | `lastFramePath` only | **No** without visual ref — trade scene morph risk for KIE safety |

**Identity** must remain: Official Character Bible (+ optional local identity keyframe), **not** Veo-invented last frames as identity authority.

---

## 3. Canonical reference authority

| Character | Bible asset | Role |
|-----------|-------------|------|
| Amy AI | `amy-ai-bible.jpeg` | Authoritative identity for KIE |
| Amy Girl | `amy-girl-bible.jpeg` | Authoritative identity for KIE |
| Amy Boy | `amy-boy-bible.jpeg` | Authoritative identity for KIE |

Local `writeIdentityKeyframe` uses **base** assets (`amy-*-base.png`) for a 9:16 env wash — staging seed, **not** a replacement for bible identity.

**Policy (design):** Character Memory must **never** replace canonical identity in `imageUrls`. Last-frames are continuity hints at most; bibles remain mandatory.

---

## 4. Generated frame → KIE insertion path

```
Scene N: KIE (or Veo) generates clip
    → attachLastFrameMemory / freezeLastFrame (local ffmpeg)
    → character-memory/{sceneId}-last.png
    → previousMemory.lastFramePath

Scene N+1: resolveGenerationSeed
    IF lead character ∈ previousMemory.characters AND lastFrame exists:
        imagePath = lastFrame          ← PRIMARY visual seed
        referenceImagePaths = […bibles, lastFrame]
        usedPreviousFrame = true
    ELSE:
        imagePath = identity keyframe
        referenceImagePaths = […bibles, identity, optional lastFrame]

compose → kie.generateVideo({ imagePath, referenceImagePaths, prompt })

kie-video/provider.ts:
    mergedRefs = [requiredBible(s), …referenceImagePaths, imagePath]
    → upload each → HTTP imageUrls[]
```

**Every place last-frame enters KIE `imageUrls` today:**

1. As **`imagePath`** when `usedPreviousFrame === true` (lead continues) — **primary insertion**  
2. As a member of **`referenceImagePaths`** in the same branch  
3. Optionally as an extra ref when lead **changes** (identity primary, previous frame still appended if present)

Golden 010 learn hit path (1)+(2): host freeze `9a043e…` became learn primary + mid stack slot.

---

## 5. Strategy comparison (not executed)

### Strategy A — Canonical refs only + textual memory context

| | |
|--|--|
| Mechanism | Keep memory engine for prompt enrichment; KIE `imageUrls` = cast bibles only (or bible + identity keyframe). Never send last-frame. |
| Identity continuity | Strong (bibles) |
| Scene continuity | Medium — text-only carry |
| KIE safety risk | Lowest relative to baseline (matches CONTROL shape) |
| Complexity | Low–medium (`seed.ts` + prompt wording) |
| Cost | Same or slightly lower (fewer uploads) |
| Expected quality | May increase shot-to-shot morph vs today |

### Strategy B — Canonical refs + memory metadata + generated frame **not** sent to KIE

| | |
|--|--|
| Mechanism | Full `SceneCharacterMemory` + `formatMemorySceneBlock` remain; freeze still written locally; **`resolveGenerationSeed` never puts `lastFramePath` into `imagePath` / `referenceImagePaths` for KIE**. Primary visual = bible(s) + identity keyframe. |
| Identity continuity | Strong |
| Scene continuity | Better than A (structured locks already in prompt) |
| KIE safety risk | Low for the 010 class (**STRONGLY INDICATED** by CONTROL) |
| Complexity | Low — localized seed policy |
| Cost | Neutral |
| Expected quality | Good compromise |

### Strategy C — Canonical refs + generated frame only under a strict condition

| | |
|--|--|
| Mechanism | Send last-frame only if e.g. single-character, no logo OCR, hash allowlist, or “same env / low entropy” gate. |
| Identity continuity | Variable |
| Scene continuity | Higher when allowed |
| KIE safety risk | Medium — policy opaque; needs more paid tests (**forbidden now**) |
| Complexity | High |
| Cost | Higher ops + occasional rejects |
| Expected quality | Potentially highest when gate is right — unproven |

### Strategy D — Generated frame local-only (validation / QA), never KIE

| | |
|--|--|
| Mechanism | Keep freeze + chain for `character-memory.json`, continuity scores, human QA, optional fingerprinting; never upload last-frame. |
| Identity continuity | Strong (bibles) |
| Scene continuity | Same as B for generation; stronger for post-hoc audit |
| KIE safety risk | Same low as B |
| Complexity | Low (mostly documentation + seed change; freeze already exists) |
| Cost | Neutral |
| Expected quality | Same as B for video; better debugability |

**Strategy A ⊂ B ⊂ (B+D).** C is a later optimization after B is proven in production quality review.

---

## Recommended strategy

**Primary: Strategy B, implemented together with Strategy D’s local freeze retention.**

Keep Character Memory **on** for:

- planning metadata  
- prompt continuity locks  
- local last-frame freeze for audit / future gates  

Stop Character Memory from:

- setting `imagePath` to generated last-frame  
- including `lastFramePath` in KIE `referenceImagePaths` / `imageUrls`

KIE visual stack becomes:

1. Canonical bible(s) for cast (authoritative identity)  
2. Local identity keyframe (env wash + base) as first-frame seed when needed  
3. **No** Veo-generated memory PNG on the wire  

Aligns with CONTROL success without deleting the memory subsystem.

---

## Risks

| Risk | Notes | Confidence |
|------|-------|------------|
| More visual jump between shots | Expected tradeoff; mitigate with stronger prompt continue-from language already in `format.ts` | **STRONGLY INDICATED** |
| 011 host failure unrelated to memory frames | Host fail used identity keyframe, not last-frame — **separate** investigation | **PROVEN** different insertion class |
| Overfitting to one control | One shot, one golden; treat as **STRONGLY INDICATED**, not universal law | — |
| Accidental production disable of all memory | Avoid `AMYNEST_CHARACTER_MEMORY=0` as the fix — that removes prompt continuity too | — |
| Ref-count side effect | CONTROL used 2 refs; production often uses 3 — monitor | **UNKNOWN** significance |

---

## Exact future implementation plan (do not execute in this task)

1. **Spec freeze** — this document + control result as acceptance baseline.  
2. **Seed policy change** (single module focus: `character-memory-engine/seed.ts`):  
   - Always prefer `identityKeyframePath` as `imagePath` for KIE.  
   - `referenceImagePaths` = unique(cast bibles + identity keyframe) only.  
   - Keep `usedPreviousFrame` **semantic** for logging/prompt (“continuity from prior scene”) even if pixels are not sent — or rename to `usedPreviousMemoryContext` in a follow-up.  
3. **Prompt hygiene** (`format.ts`): change wording that implies a visual “Previous Scene Memory frame” is in the reference stack when it is text-only for KIE.  
4. **Retain** `attachLastFrameMemory` / freeze files for local QA (Strategy D).  
5. **Provider / bible fail-closed** behavior unchanged.  
6. **Do not** remove Character Memory kill-switch default-on; do not strip canonical refs.  
7. **Validation (later, separately authorized):**  
   - Unit tests: seed never includes `*-last.png` in paths destined for KIE.  
   - One Golden 010 learn dry-run / limited paid confirm under explicit authorization.  
   - Quality compare frames vs pre-change masters (009/012).  
8. **011** remains a separate workstream (identity / diversity / prompt) — not solved by this memory-wire change alone.

**Out of scope for that future PR:** provider switch, Golden script edits, narration changes, removing Amy/children, disabling Character Memory entirely.

---

## Summary table

| Layer | Keep? | Send to KIE imageUrls? |
|-------|-------|-------------------------|
| Canonical Amy / Girl / Boy bible | **Yes** | **Yes** |
| Identity keyframe (local PIL) | **Yes** | **Yes** (as seed, not identity authority over bible) |
| Textual Character Memory block | **Yes** | N/A (prompt only) |
| Generated last-frame PNG | **Yes locally** | **No** (recommended) |

---

KIE LOCKED — ZERO API CALLS — DESIGN ONLY.
