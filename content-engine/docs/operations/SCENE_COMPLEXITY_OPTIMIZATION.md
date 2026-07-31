# Scene Complexity Optimization

**Stack (frozen):** AI Director → Performance Director → Character Performance Studio → Scene Composer  
**No new Director layer. No new prompt architecture.**

This pass improves perceived realism by changing **how scenes are cast and paced**, not by adding another prompt stack.

---

## Problem

Too many characters were asked to perform in the same generation. That diluted:

- facial quality
- motion quality
- identity consistency
- overall realism

Busy magical backgrounds and multi-speaker beats compounded the issue.

---

## Rules (enforced in existing layers)

| Mix | Cap | Use |
|-----|-----|-----|
| **~70%** | Max **2** characters | Amy + Girl, Amy + Boy, mentor/learner pairs |
| **~20%** | **1** character | Girl thinking, Boy discovering, Amy smiling |
| **~10%** | **3** characters | Celebration / family / ending only |

Additional hard rules:

- One visual objective per scene
- One active speaker · one active listener · optional reactor
- Never three speaking characters together
- Never trio casts on dialogue-heavy feature beats
- Prefer more short simple scenes over fewer overloaded ones
- Backgrounds stay simple: real homes, reading corners, classrooms, parks

---

## Where it lives (no new architecture)

| Concern | Module |
|---------|--------|
| Cast tier (solo / duo / trio) | `performance-director/casting.ts` |
| Intent cast replace (no merge inflation) | `performance-director/director.ts` |
| Dense short spine + cast hints | `scene-composer/planner.ts` |
| Studio cast cap (respects tier) | `character-performance-studio/studio.ts` |
| Quality gate allows intentional solos | `character-performance-studio/quality-gate.ts` |
| Veo path cast caps | `*-director|studio/from-composition.ts` |
| Simple real environments | `creative-composition/environments.ts` |

Kill-switches unchanged: `AMYNEST_PERFORMANCE_DIRECTOR=0`, `AMYNEST_CHARACTER_STUDIO=0`.

---

## Metrics

### Average characters per shot

Target living-scene average: **~1.8–2.1 characters / shot**.

Typical 6-beat Short after optimization:

| Beat | Cast |
|------|------|
| Hook | 1 (solo) |
| Problem | 2 |
| Emotion | 2 |
| Feature | 2 |
| Transformation | 3 (celebration only) |
| CTA | 2 |

**Average ≈ (1+2+2+2+3+2) / 6 ≈ 2.0**

With denser spines (when min-clip budget allows up to 8 living beats), extra bridge solos pull the average slightly **below 2.0** while keeping trio share near **10%**.

### Average actions per shot

Target: **1 primary action / emotion / camera objective** per shot.

| Before (overloaded) | After |
|---------------------|--------|
| Multi-speaker dialogue + group gesture + prop business | One speaker beat **or** one listen/react beat |
| Several emotions competing in one clip | One dominant emotion |
| Wide “everyone celebrates while teaching” piles | Split across short scenes |

Micro-acting still lands every ~2–3s **for the active character**, not as parallel multi-character choreography.

---

## Why realism improves without increasing cost

Video providers charge primarily by **clip generation** (and total seconds), not by how many characters are named in a prompt.

| Lever | Effect on quality | Effect on API cost |
|-------|-------------------|--------------------|
| Fewer characters / shot | Model capacity goes to face + motion | **Unchanged** (same clip count / duration) |
| One speaker + one listener | Clearer lip/eye ownership | Unchanged |
| Simpler real backgrounds | Less texture/prop hallucination | Unchanged |
| Dense short spine within budget | Cleaner storytelling beats | **~Same** — capped so Veo-style min-clip budgets do not multiply jobs |
| Trio only on celebration | Avoids dialogue mess in 3-casts | Unchanged |

**Cost guard:** Planner prefers denser spines up to **8** living scenes only when `floor(bodyBudget / minClip)` allows. Core arc stays 6 beats for typical 20s Shorts with ~4s minimum clips — so generation count stays in the same band as before. Complexity savings come from **cast density**, not from buying more API calls.

---

## Camera / performance contract (unchanged stack)

Every living scene still receives:

1. AI Director continuity + cut language  
2. Performance Director jobs (speaking / listening / reacting…)  
3. Character Performance Studio face/eye/body craft  

New constraint layered into casting only:

> Never ask the model for multiple actions, multiple speakers, and multiple emotions at once.

---

## Expected outcome

- Higher facial fidelity on Amy / Girl / Boy  
- Cleaner motion (one body story per shot)  
- Stronger character consistency  
- More “filmed short” realism  
- Approximately the same provider spend per Short  
