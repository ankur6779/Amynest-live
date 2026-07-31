# AmyNest Character Performance Studio

**Status:** Production-ready (additive)  
**Version:** `1.0.0`  
**Keeps intact:** AI Director `1.2.0` · Performance Director `2.0.0` · Scene Composer  
**Does not change:** Architecture · providers · rendering · validators · API cost · resolution

Kill-switch: `AMYNEST_CHARACTER_STUDIO=0`

---

## Mission

Continuity + ensemble acting were not enough — clips still read as “AI animation.”

Character Performance Studio turns casts into **professionally directed animated characters** via prompt craft only.

---

## Pipeline (additive)

```
ContentPackage
  → Scene Composer intents
  → AI Director 1.2.0
  → Performance Director v2.0
  → Character Performance Studio 1.0.0
  → prompts → existing providers/render
```

Also enriches creative-composition Veo `performancePrompt()`.

---

## 1. How character acting improved

Every on-screen character receives an **internal goal** and an **intention line**:

| Character | Internal goal |
|-----------|----------------|
| Amy AI | Help · Teach · Encourage · Protect |
| Amy Girl | Understand · Try · Learn · Celebrate |
| Amy Boy | Explore · Discover · Experiment · Have fun |

**Rule:** Every movement comes from intention — never random fidgets without purpose.

Each brief also locks:
- anti-patterns (robot / presenter / blank stare)
- energy verbs tied to that goal
- body postures that serve the intention (kneel, lean, weight shift…)

---

## 2. How emotional realism improved

Emotion is led by the **face**, not generic body loops:

tiny smiles · eyebrow movement · soft surprise · thinking face · confusion · confidence · pride · relief · hope

**Avoid neutral expressions** — enforced in briefs + negative prompts.

**Eyes tell the story:**
- look at the speaker
- look at Amy / partner / object
- maintain contact  
**Never stare into space.**

Dominant face journey is stated per beat (`Lead face journey: …`).

---

## 3. How children’s behaviour became believable

### Amy Girl energy
skip · lean · peek · wave · hug · bounce · giggle · look-around  

Cannot move like a robot — anti-pattern + negative prompt forbid mannequin motion.

### Amy Boy energy
run · point · celebrate · jump lightly · look around · react naturally  

Body language always includes natural posture: lean forward, sit naturally, cross-step, weight shift, soft shoulders, gentle hands.

### Shot density
Average living beat every **2–3 seconds** inside the clip (attention/gesture/posture shifts) — avoids long static “AI holds” without changing provider clip architecture.

---

## 4. How Amy became a mentor instead of a mascot

Amy AI briefs forbid presenter / narrator / floating-logo energy.

Mentor verbs only:
walk beside · kneel · sit with · point softly · celebrate together · high-five · comfort · encourage

She solves with the child — **NO AD MODE**: audience remembers the feeling (hope, comfort, pride), not a promotion.

---

## Visual rhythm

Framing alternates and **never repeats the previous shot**:

wide · medium · close · reaction · over-the-shoulder · tracking

Camera follows emotion with motivation (from Performance Director + Studio notes).

---

## Studio quality gate (additive)

Rejects (prompt-plan level — does **not** modify launch validators):

- posed / no energy verbs  
- no interaction (<2 characters on living beats)  
- eyes unfocused  
- neutral face  
- robotic body  
- narrator/presenter Amy  
- ad-mode missing  
- static shot (no 2–3s density)  
- repeated framing  

Surfaced in compose as regenerate hints when studio quality fails — same pattern as AI Director rejects, without changing `validate.ts`.

---

## Cost

**No increase in API usage.**  
**No resolution increase.**  
Prompt engineering only.

---

## Files

| Path | Role |
|------|------|
| `character-performance-studio/types.ts` | Studio package types |
| `character-performance-studio/intentions.ts` | Goals, face, eyes, body, energy |
| `character-performance-studio/rhythm.ts` | Framing rhythm + shot density + no-ad |
| `character-performance-studio/quality-gate.ts` | Studio rejects |
| `character-performance-studio/format.ts` | Prompt enrichment |
| `character-performance-studio/studio.ts` | Entry |
| `character-performance-studio/from-composition.ts` | Veo bridge |
| `scene-composer/compose.ts` | Additive wire |
| `creative-composition/performances.ts` | Additive Veo enrich |

---

## Verify

```bash
pnpm exec node --import tsx/esm --test ./character-performance-studio/character-performance-studio.test.ts
pnpm exec node --import tsx/esm --test ./performance-director/performance-director.test.ts ./ai-director/ai-director.test.ts
```

Expect studio `1.0.0`, Performance Director `2.0.0`, AI Director `1.2.0`, prompts containing `CHARACTER PERFORMANCE STUDIO`.
