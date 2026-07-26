# Birth Sky Development Intelligence Engine

## Architecture

```
AstronomyData (unchanged)
  → MeaningEngine → MeaningSnapshot (unchanged)
    → DevelopmentEngine (deterministic, no LLM)
      → DevelopmentSnapshot (versioned)
        → AI Context (normalized developmental facts)
          → LLM
```

Ephemeris, Vedic/Western, houses, aspects, nakshatra, dasha, and Meaning Engine
are **not** modified. Development is an additive layer.

## Version

`development-engine/1.0.0` — stored on every `DevelopmentSnapshot`.

Computed at AI context assembly time (needs age, goals, routines). Legacy clients
without development fields keep Meaning + raw fallbacks.

## Age stages

| Band | Id |
|------|-----|
| 0–6 months | `infant_0_6` |
| 6–12 months | `infant_6_12` |
| 1–2 years | `toddler_1_2` |
| 2–3 years | `toddler_2_3` |
| 3–5 years | `preschool_3_5` |
| 5–8 years | `school_5_8` |
| 8–12 years | `school_8_12` |
| 12–18 years | `teen_12_18` |

Each stage carries deterministic capability tags.

## Domains

Scored 0–1 from stage baselines + Meaning concepts + milestones + routines:

Emotional regulation · Communication · Social interaction · Learning style ·
Attention · Creativity · Motor development · Sleep tendencies · Routine
adaptability · Curiosity · Confidence

## Parent goals → priorities

Supported goals: better sleep, better focus, confidence, emotional resilience,
learning habits, communication, friendship, self regulation.

Goals boost related domains in priority ranking (higher need + goal weight wins).

## Routine alignment

Evaluates present routines against stage-critical kinds. Returns:

- `strengths`
- `missingOpportunities`
- `suggestedImprovements`
- `priorityRanking` (`keep:` / `add:` tags)

## AI context

When development is present, prompts receive:

- `development_engine`, `development_stage`
- `learning_profile`, `emotional_profile`
- `top_priorities`, `recommended_parent_actions`
- `avoid_patterns`, `routine_strengths`, `routine_gaps`

## Package

`@workspace/birth-sky-development` — depends on `@workspace/birth-sky-meaning`.

## Downstream

See [birth-sky-adaptive.md](./birth-sky-adaptive.md) — Adaptive Engine consumes
DevelopmentSnapshot + anonymized usage history.

## Future expansion

- Pull live AmyNest routines / parentGoals from child profile  
- Age-band activity localization  
- Milestone catalog depth  
- Synastry-aware co-parent tips (later sprint)  
