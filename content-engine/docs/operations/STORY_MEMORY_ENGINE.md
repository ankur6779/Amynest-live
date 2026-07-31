# Story Memory Engine

**Version:** 1.0.0  
**Kill-switch:** `AMYNEST_STORY_MEMORY=0` (default **on**)  
**Position:** Final additive creative layer

```
AI Director
  → Performance Director
  → Character Performance Studio
  → Scene Complexity (casting/planner rules)
  → Character Memory Engine
  → Story Memory Engine   ← this layer
  → Scene prompts / Veo generation
```

No new architecture. No new Director. No new prompt system — only narrative continuity enrichment on the existing prompt path.

---

## Mission

Characters can be consistent while the **story** still feels like separate generated clips.

Story Memory makes the audience feel they are watching **one continuous emotional story**.

Every scene remembers:

- what just happened  
- why it happened  
- what emotional promise was made  
- what must happen next  

Scenes are never planned independently.

---

## Emotional thread

Carried continuously (no skipped steps):

```
Confused (problem)
  → Amy notices (notice)
  → Amy helps (help)
  → Child succeeds (success)
  → Celebration
  → Soft invite (CTA)
```

Jumps of more than one stage are clamped. Regressions (except CTA settle) are rejected.

---

## Visual callbacks

Example object thread:

| Beat | Purple book |
|------|-------------|
| Hook / problem | Opened / in Girl’s hands (seed) |
| Feature | Reappears during learning |
| Transformation | Closed proudly / set down |
| CTA | Soft echo of the win |

Callbacks are story objects — not random new props each clip.

---

## Goal memory

Goals persist until completed — never reset per scene:

| Character | Goal |
|-----------|------|
| Amy AI | Help the child |
| Amy Girl | Understand the lesson |
| Amy Boy | Explore the challenge |

Status advances `active → completed → carried` only when the story earns it.

---

## Ending memory

The CTA / end card must read as the **natural last page** of the story:

- After success / celebration energy  
- Never a bolted-on hard sell  
- Never interrupting unresolved problem / notice beats  

---

## Quality gate

| Reject | Meaning |
|--------|---------|
| `scene-disconnected` | Missing inherit / what-why-next |
| `emotion-reset` | Thread regresses illegally |
| `story-jump` | Skips emotional steps |
| `problem-unsolved` | Problem vanishes without solution path |
| `cta-interrupts` | CTA before help/success, or not marked as natural ending |
| `goal-reset` | Character goal rewritten mid-story |
| `callback-missing` | Seeded visual callback absent on payoff |

### Scores (target **95%+**)

| Score | Measures |
|-------|----------|
| **Narrative Continuity** | Inherit links, no story jumps |
| **Emotional Continuity** | Thread advances without reset |
| **Story Cohesion** | Goals, callbacks, solved problem |
| **Ending Satisfaction** | CTA feels earned, not attached |

---

## How it improves the film

| Before | After |
|--------|--------|
| Each clip invents a micro-plot | Each beat continues the last causal chain |
| Emotion can teleport | Emotion walks the ladder |
| Props appear once and vanish | Visual callbacks pay off |
| Goals rewrite every shot | One active goal until complete |
| CTA feels pasted on | CTA closes the emotional promise |

---

## Module map

| File | Role |
|------|------|
| `story-memory-engine/engine.ts` | Entry + kill-switch |
| `story-memory-engine/thread.ts` | Story chain builder |
| `story-memory-engine/quality-gate.ts` | Rejects + scores |
| `story-memory-engine/format.ts` | Prompt enrichment |
| `story-memory-engine/from-composition.ts` | Veo bridge |

**Edge wiring only:**

- `scene-composer/compose.ts` — after Character Memory  
- `creative-composition/performances.ts` — story block after character memory  
- `creative-composition/compose.ts` — chains `storyMemory` across shots  

Frozen layers (AI Director, Performance Director, Character Studio, Character Memory internals, validators, publishing) are not redesigned.
