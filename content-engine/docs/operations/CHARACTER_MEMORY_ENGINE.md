# Character Memory Engine

**Version:** 1.0.0  
**Kill-switch:** `AMYNEST_CHARACTER_MEMORY=0` (default **on**)  
**Stack position (additive only):**

```
AI Director
  → Performance Director
  → Character Performance Studio
  → Character Memory Engine   ← this layer
  → Scene prompts / Veo generation
```

No new architecture. No new pipeline. Frozen modules are not rewritten — memory attaches at the edges.

---

## Mission

Direction and acting can be strong while the cut still feels like **independent AI clips**.

Character Memory makes the audience feel they are watching **one continuous animated film**.

Every generated scene inherits the previous approved scene. Nothing resets unless the story intentionally changes it.

---

## What is carried forward

| Domain | Fields |
|--------|--------|
| Character | position, body orientation, eye direction, facial expression, hands, active hand |
| Identity | clothing, hairstyle, accessories (Character Bible locks) |
| Props | ownership, hand, placement (e.g. purple book stays left-hand until story sets it down) |
| Space | room / background |
| Light | time of day, window direction, sunlight, shadows, brightness |
| Camera | momentum, movement, continue-from (no teleport) |
| Emotion | Curious → Thinking → Understanding → Success → Celebration |
| Energy | animation energy / movement speed |

---

## Last-frame memory (generate-time)

```
Scene N
  → generate (image-to-video)
  → freeze representative end frame (local ffmpeg)
  → store as canonical memory
Scene N+1
  → seed FROM Scene N memory (+ Official Character Bible)
  → generate
  → freeze
  …
```

**Cost:** no extra provider passes. Reuses the existing Veo `imagePath` (image-to-video) capability. Last-frame extract is local ffmpeg only.

Files (creative-composition work dir):

- `character-memory/{sceneId}-last.png`
- `character-memory.json`

---

## Reference stack

Whenever generation runs with memory enabled:

1. **Official Character Bible** asset path(s) for the cast  
2. **Previous Scene Memory** last-frame (when the lead character continues)  
3. **Current Scene Objective** (prompt block from Memory Engine)

Policy:

- Same lead character continues → **primary seed = previous last frame**
- Character change / scene 1 → **primary seed = official identity keyframe**; room/lighting/emotion still carry in the memory prompt
- Never generate characters from text alone

`referenceImagePaths` are recorded on the provider request metadata for future multi-ref APIs; today continuity is enforced via primary `imagePath` + memory prompt (no cost increase).

---

## Quality gate (advisory)

Rejects a scene memory plan when:

| Code | Meaning |
|------|---------|
| `identity-drift` / `wardrobe-changed` | Face/hair/clothes/proportions leave the Bible |
| `camera-reset` | Camera teleports instead of continuing momentum |
| `prop-disappeared` | Prop vanishes without story intent |
| `lighting-changed` | Time-of-day / window resets |
| `emotion-jump` | Arc skips or regresses (e.g. sad → celebration) |
| `background-changed` | Room resets without intent |
| `pose-reset` | Hard pose teleport |

### Scores (targets)

| Score | Target |
|-------|--------|
| Character Identity | **> 95%** |
| Scene Continuity | **> 95%** |
| Emotion Continuity | **> 95%** |
| Camera Continuity | **> 95%** |

---

## How continuity improved

### Previous scene memory preserved

Plan-time (`runCharacterMemoryEngine`) builds a chain: each living scene sets `inheritsFromSceneId` and copies wardrobe, props, room, lighting, and camera continue-from unless `intentionalChanges` lists a story reset.

Generate-time (`composeCinematicVisuals`) freezes the last frame after each Veo clip and feeds it as the next shot’s `imagePath` when the lead character continues.

### Identity consistency

Wardrobe/hair/accessories are always re-locked from `getBrandIdentityKit()` Character Bible strings. Drift vs Bible or vs previous pose fails the memory gate. Prompts forbid redesign / age / eye-color / proportion change.

### Camera continuity

Each scene stores `camera.continueFrom`. The next scene’s framing note starts **where the previous push/track ended**. Teleport language is rejected.

### Emotional continuity

Emotion stages are clamped to the Curious → … → Celebration ladder. Jumps of more than one stage are pulled back; regressions are blocked unless the beat intentionally allows emotion change (e.g. celebration).

### Props & lighting stability

Props persist across scenes (example: Girl’s purple book, left hand) until a story beat moves them (transformation → book on desk). Lighting window direction and time of day carry until an intentional lighting change.

---

## Module map

| File | Role |
|------|------|
| `character-memory-engine/engine.ts` | Plan-time entry + kill-switch |
| `character-memory-engine/carry.ts` | Inherit / intentional change rules |
| `character-memory-engine/quality-gate.ts` | Rejects + scores |
| `character-memory-engine/freeze.ts` | Last-frame extract |
| `character-memory-engine/seed.ts` | Bible + memory seed resolution |
| `character-memory-engine/format.ts` | Prompt enrichment |
| `character-memory-engine/from-composition.ts` | Veo bridge |
| `character-memory-engine/runtime.ts` | Generate-time freeze helpers |

**Edge wiring only:**

- `scene-composer/compose.ts` — after Character Studio  
- `creative-composition/performances.ts` — memory prompt block  
- `creative-composition/compose.ts` — last-frame freeze + seed  

Frozen internals of AI Director, Performance Director, Character Performance Studio, planner/validators/publishing are untouched.

---

## Kill-switch

```bash
AMYNEST_CHARACTER_MEMORY=0
```

Disables plan-time enrich and generate-time freeze/seed preference.
