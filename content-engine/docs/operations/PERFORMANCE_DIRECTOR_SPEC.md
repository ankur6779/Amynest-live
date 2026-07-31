# AmyNest Performance Director v2.0

**Status:** Production-ready (additive)  
**Depends on:** AI Director `1.2.0` (unchanged)  
**Does not change:** Architecture, validators, providers, rendering, resolution, API cost path

Kill-switch: `AMYNEST_PERFORMANCE_DIRECTOR=0`

---

## Mission

AI Director 1.2.0 gave **continuity**.

Performance Director v2.0 gives **performances**.

Characters must pass the living-character test: actors in a scene, not animated assets holding poses.

---

## Pipeline (additive)

```
approved ContentPackage
  → plan intents
  → AI Director 1.2.0          (continuity / cuts / emotion arc)
  → Performance Director v2.0  (acting / ensemble / speaking beats)
  → scene / Veo prompts
  → existing providers + render (unchanged)
```

Creative-composition Veo path also enriches `performancePrompt()` with the same acting blocks.

---

## 1. How every character behaves like an actor

Each living scene gets a **cast sheet**:

| Job | Meaning |
|-----|---------|
| speaking | Mouth + eyes + gesture own the line |
| listening | Eyes track speaker; mouth soft/closed; nods |
| reacting | Smile, bounce, glance, small laugh |
| moving | Weight shift / body turn / motivated steps |
| thinking | Pause, search eyes, pencil hover |
| waiting | Soft presence ready to enter — not frozen dead |

**Rule:** Never let every character stand still. Someone always has a living job.

### Micro-acting clock
Every **2–3 seconds** the plan schedules at least one:

blink · smile · head tilt · hand gesture · breath · weight shift · body turn · look to partner · small laugh · thinking pause · child glance

These are prompt-mandated — **no extra model calls**.

### Relationships
- **Amy AI** = mentor (teach, encourage, celebrate, comfort) — never outside narrator  
- **Amy Girl** = learns (curiosity, pauses, understanding)  
- **Amy Boy** = explores / celebrates  

### Group scenes
Living beats prefer **2+ characters** (Amy+Girl, Amy+Boy, or all three).  
Target: **≥70%** group scenes among living beats (measured on the Performance package).

---

## 2. How speaking / listening / reactions are coordinated

### When Amy AI speaks
- Amy AI: mouth + eye focus + mentor gesture  
- Amy Girl: listens  
- Amy Boy: reacts  

### When Amy Girl speaks
- Amy Girl: mouth moves  
- Amy AI: watches  
- Amy Boy: reacts  

### When Amy Boy speaks
- Amy Boy: mouth moves  
- Amy Girl: watches  
- Amy AI: smiles / celebrates with eyes  

### When narration is external
- **Nobody fakes speaking**  
- Show listening, reactions, motivated actions only  
- Aligns with AI Director `speechState: listening` on struggle/hope beats  

Ensemble jobs are written into every scene prompt under:

`PERFORMANCE DIRECTOR v2.0 — MANDATORY ACTING`

---

## 3. Perceived lip sync without increasing model cost

We **do not** add a lip-sync model, audio-driven viseme pass, or higher resolution.

### Strategy
1. **Split dialogue into speaking beats** (caption / narration line on that scene).  
2. **Generate the shot around that beat** (prompt names the speaker + line energy).  
3. **Match duration to visible mouth intent** (short line, medium performance window).  
4. If phoneme-perfect sync is unlikely:  
   - prefer **over-the-shoulder** or **medium** framing  
   - avoid extreme mouth close-ups that expose mismatch  
5. For external VO: **zero fake mouths** — listening faces instead.

### Cost
Same Veo/TTS/music providers · same 720p default · **zero extra API calls** — only denser performance direction in prompts.

---

## 4. Emotion + camera

Each scene has **one dominant emotion**:

Curiosity · Confusion · Hope · Achievement · Joy · Pride · Relief

Camera line is **motivated by that emotion** (no random zoom language). Continuity / cut grammar remains AI Director’s job.

---

## Files

| Path | Role |
|------|------|
| `performance-director/types.ts` | Package + scene performance types |
| `performance-director/casting.ts` | Speaker/listener/reactor/group casting |
| `performance-director/micro-acting.ts` | 2–3s micro-acting schedule |
| `performance-director/format.ts` | Prompt enrichment |
| `performance-director/director.ts` | Entry + intent cast expansion |
| `performance-director/from-composition.ts` | Veo creative-composition bridge |
| `scene-composer/compose.ts` | Additive wire after AI Director |
| `creative-composition/performances.ts` | Additive Veo prompt enrich |

---

## Verify

```bash
pnpm exec node --import tsx/esm --test ./performance-director/performance-director.test.ts
pnpm exec node --import tsx/esm --test ./ai-director/ai-director.test.ts
```

Expect:
- AI Director still `1.2.0`
- Performance Director `2.0.0` attached on compose
- Prompts contain `PERFORMANCE DIRECTOR v2.0` + `MICRO-ACTING`
- Group ratio ≥ 70% on living scenes
