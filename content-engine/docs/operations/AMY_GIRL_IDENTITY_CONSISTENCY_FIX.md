# Amy Girl Canonical Identity Consistency Fix V1

**Date:** 2026-08-31  
**Mode:** Implementation + local tests only — **ZERO KIE calls / ZERO credits**  
**Trigger:** 8s canonical-identity validation fixed Amy (cap/headphones) but Amy Girl still drifted face/hair/bow/proportions frame-to-frame.

---

## 1. Root cause

| Factor | Confidence |
|--------|------------|
| Wire refs for Girl were already correct (Girl bible) after Canonical Identity Fix V1 | **PROVEN** |
| Girl prompt lock was **weak** vs Amy hard lock | **PROVEN** |
| Prompt told Girl to be **“PHOTOREALISTIC human child”** while bible is stylized animated — invited re-interpretation each frame | **STRONGLY INDICATED** |
| Identity text still said “first-frame keyframe” as authority instead of Girl Character Bible | **PROVEN** |
| No immutable Girl visual token / frame-to-frame “same child” language | **PROVEN** |
| Cinematic / Pixar-like language could still leak into character definition in secondary copy | **STRONGLY INDICATED** |

Not caused by: missing Girl bible on wire, memory freeze on wire, or Girl→Amy bible swap (those were already guarded).

---

## 2. Existing behavior (before this fix)

- `resolveGenerationSeed()` already character-ID based (Girl→Girl bible, Amy→Amy bible).
- Girl prompt: short wardrobe lock + **photoreal human child** instruction.
- Memory block: light Girl lock (“do not redesign”).
- No Girl visual token; no pre-send identity manifest assert in compose.

---

## 3. New behavior

- **Hard Girl identity lock** (immutable face/eyes/hair/bow/body/wardrobe; same child every shot/frame).
- **`AMY_GIRL_VISUAL_IDENTITY_TOKEN`** descriptive metadata (bible remains pixel authority).
- Brand-child render path: stylized animated + stable shading — **not** photoreal human redesign.
- Compose prints + asserts **KIE reference manifest** before generate.
- `bibleBindingFor(seed, characterId)` for character-ID lookups.

---

## 4. Character identity authority

| Character | Authority |
|-----------|-----------|
| Amy Girl | Official `amy-girl-bible.jpeg` only |
| Amy AI | Official `amy-ai-bible.jpeg` only |
| Amy Boy | Official `amy-boy-bible.jpeg` only |

Lead / array index / identity keyframe / memory freeze **never** redefine another character.

---

## 5. Reference mapping

Character-ID → own bible via `identityBindings` / `bibleBindingFor`.

Multi-cast KIE wire: cast bibles only. Memory freeze local-only. Girl identity keyframe not used as Amy (or as Girl redesign authority).

---

## 6. Prompt lock

Injected when Girl present:

> AMY GIRL IS THE EXACT SAME CANONICAL CHARACTER SHOWN IN THE SUPPLIED AMY GIRL REFERENCE… CHARACTER IDENTITY IS IMMUTABLE… SHE MUST LOOK LIKE THE SAME CHILD IN EVERY SHOT AND EVERY FRAME.

Plus visual token summary (face/hair/body/wardrobe).

Cinematic style separation expanded: Pixar / DreamWorks / Paddington / Ted / Pikachu → lighting/camera/pacing/environment/emotion **only**.

---

## 7. Memory behavior

Unchanged architecture: pose / eye-line / wardrobe / props / room / lighting / camera / emotion still in prompts. Generated last-frames remain **LOCAL ONLY** (not KIE `imageUrls`).

---

## 8. KIE payload manifest

`buildKieReferenceManifest` / `assertKieReferenceManifestSafe`:

```
AMY_GIRL: { sha256, onWire: true }
AMY_AI:   { sha256, onWire: true }
GENERATED_MEMORY: 0
CROSS_CHARACTER_REFERENCES: 0
```

Missing Girl bible when Girl in cast → **FAIL FAST**.

Logged from `creative-composition/compose.ts` before provider call.

---

## 9. Files / functions changed

| File | Change |
|------|--------|
| `character-memory-engine/identity-lock.ts` | Girl hard lock, visual token, manifest builders |
| `character-memory-engine/format.ts` | Girl token + locks in memory block |
| `character-memory-engine/seed.ts` | `bibleBindingFor()` |
| `creative-composition/performances.ts` | Girl/Boy hard locks; brand-child render stability (no photoreal redesign) |
| `creative-composition/environments.ts` | Girl line → bible-immutable wording |
| `creative-composition/compose.ts` | Manifest log + assert |
| `operations/amy-girl-identity-consistency.p0.test.ts` | **New** CASE A–F + critical forbids |

---

## 10. Regression tests + results

CASE A Girl only · B Girl+Amy · C Girl+Boy · D trio · E Amy lead/Girl companion · F Girl lead/Amy companion · cross-identity forbids · manifest fail-fast · prompt token lock.

```text
node --import tsx/esm --test \
  ./operations/amy-girl-identity-consistency.p0.test.ts \
  ./operations/canonical-identity.p0.test.ts \
  ./operations/kie-safe-character-memory.p0.test.ts \
  ./character-memory-engine/character-memory-engine.test.ts
→ 34 pass / 0 fail
```

---

## Safety

- No KIE generation executed in this task.
- No Golden Script / provider / memory architecture rewrite.
- Paid validation deferred until explicitly authorized.

---

AMY GIRL CANONICAL IDENTITY FIX IMPLEMENTED — ZERO KIE CALLS — ZERO CREDITS SPENT.
