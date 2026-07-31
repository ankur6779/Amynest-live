# AmyNest Cinematic Realism Program

**Scope:** Direction and prompting only.  
**Unchanged:** Architecture, validators, providers, rendering, publishing, Golden Scripts, resolution (720p), cost path.

**Versions**
- Creative Composition plan/prompt layer: `2.1.0`
- AI Director package: `1.2.0` (scene continuity spine)

---

## Mission

AmyNest Shorts should feel like **animated family stories** (Pixar short / DreamWorks TV / Cocomelon cinematic beats / Duolingo mascot storytelling) — not AI promotional slideshows.

Parents should emotionally connect within the **first 3 seconds**.

---

## 1. How lip sync was improved

### Problem
Narration played while characters looked silent (or mouthed randomly). Immersion broke immediately.

### Direction fix (no TTS/provider change)
Each Veo beat now carries **lip ownership**:

| Field | Meaning |
|-------|---------|
| `speechMode: "speaking"` | On-screen character is the speaker — jaw/lips must articulate the beat line |
| `speechMode: "listening"` | Character listens — mouth mostly closed; nods, blinks, eye track |
| `speechMode: "reacting"` | Emotion mouth only — no dialogue flaps |

`spokenLine` is taken from the caption/VO beat so the model has a concrete line to mouth when speaking.

**Beat map (default cinematic plan)**
- Hook (Amy Girl) → **reacting** (struggle face, not fake talking)
- Amy AI mentor entrance → **speaking** (host line)
- Amy Girl learn → **listening** (mentor / lesson; attentive face)
- Amy Boy celebrate → **speaking** (hope/joy line)
- CTA Amy AI → **speaking** (download invite)

Prompts explicitly forbid:
- silent talking heads
- mouth closed while speaking
- random lip flaps on non-speakers

AI Director prompt enrichment adds the same **LIP OWNERSHIP** rules for the composer path.

> Note: Native Veo audio is still replaced by brand TTS in mux (unchanged). Realism comes from **matching visible mouth intent to who owns the line**, not from a new lip-sync API.

---

## 2. How characters became emotionally believable

### Problem
Scenes felt generated — poses without feeling.

### Direction fix
Every shot now requires:
- `emotionBeat` — what the face/body must land
- `eyeLine` — where attention goes
- Micro-acting language: blinks, breath, weight shifts, soft sighs, smile timing

AI Director emotion map + micro-actions now emphasize:
- shared glances
- listening nods
- celebrate-together looks
- relief in the eyes, not slapstick

Negative prompts reject mannequin faces, robotic stillness, and stock “AI cartoon” energy.

---

## 3. How Amy AI became a mentor instead of a narrator

### Problem
Amy AI felt like an outside voice-over / floating sticker.

### Direction fix
- Host beat moves into the **study-desk world** (same emotional space as the child), not a disconnected living-room announcer stage.
- Blocking language: **child height** — kneel, lean, sit beside; open palm; point gently; warm smile.
- Explicit rule in prompts + AI Director: **Amy supports, never lectures; lives inside the story.**
- CTA still invites download, but as the **same mentor** who helped — not a hard-sell announcer.

---

## 4. How Amy Girl and Amy Boy became realistic children

### Problem
Kids read as generic AI cartoons.

### Direction fix
Dedicated **REAL CHILD BEHAVIOR** block on every child performance prompt:
- natural blinking
- tiny head tilts
- breathing in the shoulders
- hand fidgets / pencil pauses
- looking around, then settling focus
- thinking pauses, curiosity, real smile timing

Relationship blocking:
- Girl struggles alone in the cold open, then **listens to mentor**
- Boy **shares the win** with off-screen sister/mentor eye-line (not only camera posing)

Environments stay **believable homes** (study desk, bedroom, living room) — fantasy overload discouraged.

---

## 5. How camera direction now feels cinematic

### Problem
Static / ad-like framing.

### Direction fix
Expanded composition cameras: tracking, over-shoulder, close-up, reaction, medium, wide, dolly (plus existing push/pan/orbit/zoom).

Default plan cameras:
| Beat | Camera |
|------|--------|
| Hook | close-up (emotion in 3s) |
| Mentor Amy | tracking entrance |
| Learn | over-the-shoulder into tablet |
| Celebrate | soft orbit |
| CTA | slow dolly invite |

AI Director shot language:
- Problem / CTA movements prefer **slow-dolly / push** over locked `static-hold` (end-card may still settle).
- Framing text stresses filmed depth, partner eye contact, and anti-slideshow energy.

Still **720p** — compute spent on direction/prompting, not pixels.

---

## 6. Scene continuity spine (AI Director `1.2.0`)

Every short is directed as **one continuous scene** across cuts.

### Tracked per beat (prompt-locked)
Character position · Eye direction · Body orientation · Hand position · Object placement · Lighting direction · Emotion arc · Speech state · Camera momentum · Movement speed · Amy pose · Screen direction L→R

### Cut language (preferred)
Match cut · Motivated cut · Action cut · Eyeline cut · L-cut · J-cut  

**Avoid:** random angle jumps, random zooms, character teleport, camera resets, prop hand-swaps, emotion whiplash.

### Acting / object locks
- If looking left → next shot **begins** looking left (unless eyeline motivates along the same axis).
- If Amy kneels → **remain kneeling** until success/celebration motivates a rise.
- Pencil/book/cup/toy/desk stay **same hand, same side, same orientation** unless a visible micro-action moves them.

### Emotion arc (never random)
`Curious → Thinking → Understanding → Success → Celebration`

Implementation: `ai-director/scene-continuity.ts` + enriched `formatDirectorSceneBlock` (`CONTINUITY STATE` + `CUT IN/OUT`).

---

## What we did **not** change

- Workflow architecture / phases  
- Launch validators  
- Video / TTS / music providers  
- Mux / render pipeline  
- Publishing / YouTube path  
- Golden Script seeds or text  
- Default resolution (720p)  

---

## Files touched (direction layer)

| File | Change |
|------|--------|
| `creative-composition/types.ts` | v2.1.0 — speechMode, spokenLine, emotionBeat, interaction, eyeLine, richer cameras |
| `creative-composition/plan.ts` | Story-directed beat map (mentor, lip ownership, relationships) |
| `creative-composition/performances.ts` | Lip sync / child realism / mentor / filmed camera prompt builder |
| `creative-composition/environments.ts` | Grounded home spaces; anti-fantasy-overload language |
| `ai-director/*` | v1.1.0 — mentor blocking, lip ownership in format, micro-actions, shot language, film objective |

---

## How to verify on next production

1. Run an existing Golden Short production (reuse Veo only if you intentionally want old clips — set `AMYNEST_REUSE_VEO=0` for fresh directed takes).
2. Watch first 3s: Amy Girl struggle should feel emotional, not product-ad.
3. Amy AI entrance: in the study world, child-height mentor, mouth moving on host line.
4. Learn beat: Girl mostly listening; eyes between mentor space and tablet.
5. Celebrate: Boy shares joy off-screen, then camera.
6. CTA: mentor invite with speaking mouth; badges readable.

No significant API cost increase expected — same models and 720p; only prompts and shot plans changed.
