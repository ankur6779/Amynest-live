# Canonical Character Identity Fix V1

**Date:** 2026-08-31  
**Mode:** Implementation only — **ZERO KIE generation / ZERO credits**  
**Based on:** `AMY_IDENTITY_FAILURE_AUDIT.md`

---

## Root cause

Failed validation stack (Girl lead + Amy companion):

| Slot | Asset | Problem |
|------|-------|---------|
| primary `imagePath` | Girl identity keyframe `e083…` | Lead keyframe treated as primary seed |
| refs | Girl bible + Amy bible + Girl identity | **2/3 Girl pixels**; Amy only as multi-panel sheet |
| memory | local freeze | correctly omitted (B+D) |

Canonical Amy bible (`6f65f19d…`) was correct but **not authoritative**. KIE output redesigned Amy into a bareheaded generic robot (no cap / headphones / AmyAI branding).

**Principle violated:** scene lead must not determine companion identity.

---

## Implementation

### Old behavior

```
resolveGenerationSeed():
  imagePath = lead identity keyframe
  referenceImagePaths = [cast bibles…, lead identity keyframe]
```

Girl+Amy learn → `imagePath=Girl identity`, refs include Girl identity + Girl bible + Amy bible.

### New behavior

```
resolveGenerationSeed():
  imagePath = lead CANONICAL BIBLE
  identityBindings = each cast member → own bible (primary/secondary roles)
  referenceImagePaths =
    multi-cast: cast bibles ONLY (lead keyframe local-only)
    single-cast: lead bible + optional env keyframe
  memory freeze: local-only (unchanged B+D)
```

Girl+Amy learn → `imagePath=Girl bible`, refs = `[Girl bible, Amy bible]` — **no Girl identity on wire**.

---

## Identity authority rules

| Character | Authoritative visual | Never |
|-----------|---------------------|-------|
| Amy AI | `amy-ai-bible.jpeg` | Girl/Boy keyframe, memory freeze, generic robot text |
| Amy Girl | `amy-girl-bible.jpeg` | Amy keyframe as Girl identity |
| Amy Boy | `amy-boy-bible.jpeg` | Amy keyframe as Boy identity |

Roles on the KIE wire:

1. **PRIMARY CHARACTER IDENTITY** — lead bible  
2. **SECONDARY CHARACTER IDENTITY** — companion bibles  
3. **ENVIRONMENT REFERENCE** — lead identity keyframe only when single-cast  
4. **SCENE MEMORY** — local freeze only; **never** `imageUrls`

---

## Files / functions changed

| File | Change |
|------|--------|
| `character-memory-engine/seed.ts` | Character-aware `resolveGenerationSeed`; bindings; cross-swap asserts |
| `character-memory-engine/identity-lock.ts` | **New** — Amy/Girl/Boy hard locks + cinematic style separation |
| `character-memory-engine/format.ts` | Inject cast identity locks into memory prompt block |
| `creative-composition/performances.ts` | Hard Amy lock; style separation; remove identity-defining Paddington/Ted soft-robot line |
| `creative-composition/compose.ts` | Always seed via resolver; pass `cast` to provider; logging |
| `asset-engine/providers/kie-video/provider.ts` | Cast bible fail-fast; promote bible over keyframe; strip multi-cast keyframes |
| `asset-engine/providers/gemini-video/provider.ts` | `cast?:` on `GenerateVideoOptions` |
| `operations/canonical-identity.p0.test.ts` | **New** CASE 1–4 + critical regressions |
| Tests updated | `kie-safe-character-memory.p0.test.ts`, `character-memory-engine.test.ts` |

**Unchanged:** Golden Scripts, Character Memory architecture/object, provider selection, KIE model/pricing, bible asset bytes.

---

## Prompt lock

Explicit Amy lock (semantic required):

> AMY AI IS THE EXACT CANONICAL AMYNEST CHARACTER SHOWN IN THE SUPPLIED AMY REFERENCE… DO NOT TURN AMY INTO A GENERIC ROBOT… DO NOT REMOVE HER CAP OR HEADPHONES…

Cinematic style separation:

> Paddington/Ted/Pikachu / soft-robot / Disney+/Pixar language → lighting, camera, pacing, environment, emotion **ONLY** — never character identity.

---

## Reference resolution examples

### CASE 1 — Girl lead + Amy companion

| | Path |
|--|------|
| primary | Girl bible |
| secondary | Amy bible |
| local keyframe | present, **not** on wire |
| memory | local only |

### CASE 2 — Amy lead + Girl companion

| | Path |
|--|------|
| primary | Amy bible |
| secondary | Girl bible |

### CASE 3 — Boy lead + Amy companion

| | Path |
|--|------|
| primary | Boy bible |
| secondary | Amy bible |

### CASE 4 — Amy + Girl + Boy

| | Path |
|--|------|
| primary | Amy bible (lead) |
| secondary | Girl bible, Boy bible |

---

## KIE payload fixture before / after

**Before (failed validation):**

```
imageUrls:
  0 Girl bible dc09bf…
  1 Amy bible  6f65f19d…
  2 Girl identity e083f1b2…   ← removed
```

**After (resolver + resolveKieReferencePaths):**

```
imageUrls:
  0 Girl bible dc09bf…   (PRIMARY)
  1 Amy bible  6f65f19d… (SECONDARY)
generated memory refs: 0
```

---

## Regression coverage

`operations/canonical-identity.p0.test.ts` (+ related suites)

- CASE 1–4 identity bindings  
- Amy never resolves to Girl/Boy keyframe  
- Girl/Boy never resolve to Amy bible as primary  
- Cross-character binding fail-fast  
- OLD vs NEW payload fixture  
- Prompt hard lock + style separation  
- Single-cast env keyframe allowed  

**Local test run:** 39 pass / 0 fail  
(canonical-identity, kie-safe-memory, golden-voice P0, character-memory, performance-director, character-studio)

---

## Safety considerations

- Missing cast bible → **fail fast** (no silent substitute)  
- Memory freeze still stripped from KIE  
- Multi-cast identity keyframes stripped at provider fail-safe  
- Primary keyframe auto-promoted to lead bible if accidentally passed  
- No paid KIE call in this change  

---

CANONICAL IDENTITY FIX IMPLEMENTED — ZERO KIE CALLS.
