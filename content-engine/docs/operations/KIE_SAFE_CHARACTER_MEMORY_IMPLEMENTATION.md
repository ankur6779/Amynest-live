# KIE-Safe Character Memory — Implementation Report

**Date:** 2026-08-31  
**Strategy:** B + D (approved design: `KIE_SAFE_CHARACTER_MEMORY_DESIGN.md`)  
**Mode:** Implementation + offline regression only — **no paid KIE / no video generation**

---

## Summary

Character Memory stays fully enabled for planning, continuity state, prompt context, local last-frame freezes, and continuity validation.

**Generated last-frame memory images are no longer sent to KIE as `imagePath` / `referenceImagePaths` / `imageUrls`.**

KIE visual identity remains: canonical Amy / Amy Girl / Amy Boy Character Bible references (+ identity keyframes). Missing canonical bible **fails the shot** — never silently substitutes a memory freeze.

---

## Files changed

| File | Change |
|------|--------|
| `content-engine/character-memory-engine/seed.ts` | Seed policy: `imagePath` = identity keyframe; refs = bibles + identity only; `localMemoryFreezePath` retained; `usedPreviousFrame` = semantic continuity |
| `content-engine/character-memory-engine/format.ts` | Prompt wording: continuity is textual / local-only; no “Previous Scene Memory frame” as KIE visual stack claim |
| `content-engine/character-memory-engine/types.ts` | Comment: refs are canonical-only for provider handoff |
| `content-engine/asset-engine/providers/kie-video/client.ts` | `isGeneratedMemoryFramePath()` + fail-safe strip in `resolveKieReferencePaths()`; reject memory as required ref |
| `content-engine/asset-engine/providers/kie-video/provider.ts` | Strip memory from merge; reject memory as primary `imagePath`; redacted logging; abort if memory still on wire |
| `content-engine/creative-composition/compose.ts` | Log: Character Memory enabled, local freeze present/absent, canonical count, generated memory refs = 0 |
| `content-engine/character-memory-engine/character-memory-engine.test.ts` | Updated seed expectations for KIE-safe policy |
| `content-engine/operations/golden-voice.p0.test.ts` | Extra strip / detector assertion |
| `content-engine/operations/kie-safe-character-memory.p0.test.ts` | **New** B+D regression suite (items 1–8) |
| `content-engine/docs/operations/KIE_SAFE_CHARACTER_MEMORY_IMPLEMENTATION.md` | This report |

## Functions changed

| Function | Behavior |
|----------|----------|
| `resolveGenerationSeed()` | Never puts `lastFramePath` into `imagePath` or `referenceImagePaths` |
| `isGeneratedMemoryFramePath()` | **New** — detects `character-memory/*-last.png` (and similar) |
| `resolveKieReferencePaths()` | Strips memory frames; fails if required ref is a memory frame or bible missing |
| `KieVideoProvider.generateVideo()` | Fail-safe primary path + merge filter + logging + assert wire count = 0 memory |
| `formatMemorySceneBlock()` | Wording only (no new prompt layer / architecture) |

**Unchanged (intentionally):** `attachLastFrameMemory` / `freezeLastFrame`, `SceneCharacterMemory` fields, Character Memory engine planning, Performance Director, providers/models/pricing, Golden Scripts, TTS.

---

## Old vs New KIE imageUrls (behavioral proof)

Golden 010 · `shot-amy-girl-learn` shape (from forensic / control):

### OLD (pre-change — caused safety reject in baseline)

```
imageUrls local paths (order conceptually):
  1. amy-girl-bible.jpeg     (canonical)   hash dc09bf…
  2. shot-amy-host-last.png  (GENERATED MEMORY)  hash 9a043e…  ← removed
  3. amy-ai-bible.jpeg       (canonical)   hash 6f65f19d…
```

Provider received **3** refs including generated memory freeze as visual reference.

### NEW (post-change — matches CONTROL success shape)

```
imageUrls local paths:
  1. amy-girl-bible.jpeg     (canonical)
  2. amy-ai-bible.jpeg       (canonical)  and/or identity keyframe
  — generated memory refs: 0
```

**Only behavioral change on the KIE wire:** generated memory frame removed from provider references.  
Canonical Character Bible refs remain. Prompt still carries full Character Memory continuity block.

Unit evidence (`kie-safe-character-memory.p0.test.ts`):

- `oldKieImagePaths.includes(freeze)` → true  
- `newKieImagePaths.includes(freeze)` → false  
- `newKieImagePaths.filter(isGeneratedMemoryFramePath).length === 0`

---

## Memory continuity evidence (still on)

| Concern | Status |
|---------|--------|
| `isCharacterMemoryEnabled()` default | **enabled** |
| Prompt injects pose / eye-line / wardrobe / props / room / lighting / camera / emotion | **yes** (`formatMemorySceneBlock`) |
| Local last-frame freeze (`attachLastFrameMemory`) | **unchanged** — still written under `character-memory/{sceneId}-last.png` |
| `seed.localMemoryFreezePath` / `usedPreviousFrame` | **set** when lead continues (audit / logging) |
| Continuity JSON / `character-memory.json` | **unchanged** write path |
| KIE `imageUrls` memory count | **always 0** (seed + fail-safe) |

---

## Logging (redacted)

On each KIE-bound shot:

```
Character Memory: enabled
Local memory freeze: present|absent
KIE canonical refs: <n>
KIE generated memory refs: 0
```

Compose tag: `[memory-context→video; KIE refs=canonical-only]` when prior freeze exists.

---

## Tests

```text
node --import tsx/esm --test \
  ./operations/kie-safe-character-memory.p0.test.ts \
  ./operations/golden-voice.p0.test.ts \
  ./character-memory-engine/character-memory-engine.test.ts
→ 21 pass / 0 fail
```

Coverage mapped to requirements:

1. Character Memory remains enabled  
2. Memory state reaches prompts  
3. Local last-frame freeze metadata retained  
4. Generated memory frame **not** in KIE paths  
5. Canonical Amy/Girl/Boy refs remain  
6. Missing canonical reference fails  
7. P0 Golden Script integrity intact (009–012)  
8. TTS / golden voice completeness intact  

---

## Risk assessment

| Risk | Notes |
|------|--------|
| More visual jump shot-to-shot | Expected tradeoff; mitigated by existing textual CONTINUE locks |
| Golden 011 host fail | Separate class (identity keyframe path) — **not** fixed by this change alone |
| Accidental reintroduction of memory on wire | Fail-safe strip + abort if count ≠ 0 |
| Overfitting to one CONTROL | Treat as STRONGLY INDICATED; quality review on next authorized paid run |

---

## Paid generation

**Not executed.** No KIE API calls. No credits spent.

Future authorized run should re-confirm OLD vs NEW `imageUrls` on a live dry-log before spend.

---

KIE SAFE MEMORY IMPLEMENTED — NO PAID GENERATION EXECUTED.
