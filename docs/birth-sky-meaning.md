# Birth Sky Meaning Engine

## Architecture

```
AstronomyData (Skyfield / Vedic / Western — unchanged)
  → MeaningEngine (deterministic rules, no LLM)
    → MeaningSnapshot (versioned semantic blocks)
      → AI Context (normalized parenting facts)
        → LLM
```

Ephemeris, house, aspect, nakshatra, and dasha engines are **not** modified.
Meaning is an additive layer.

## Version

`meaning-engine/1.0.0` — stored on every `MeaningSnapshot` and attached as
`astronomy.meaningSnapshot` on new sky snapshots.

Legacy snapshots without `meaningSnapshot` still hydrate; meaning is computed
on the fly at AI assemble time.

## Rule engine

Rules read planet/sign/house/aspect/nakshatra/dasha/mode and emit concept tags
(not paragraphs), e.g.:

| Input | Concepts |
|-------|----------|
| Sun in Leo | confidence, leadership, self-expression, visibility |
| Moon in Cancer | emotional attunement, predictable routines |
| Sun house 5 | playful expression, recognition |

## Merge & conflict resolution

- Duplicate concepts merge; confidence takes max (+ small boost for multi-source).
- Tags ranked by confidence per category (cap 8).
- Known contradictions (e.g. fast-paced vs gentle pace) are **recorded** in
  `conflicts` and **both kept** — never deleted silently.
  Higher confidence is ranked first (`prefer_higher_confidence`) or both
  coexist when scores are close.

## Child-development layer

Concept → parenting tip map (deterministic), e.g.:

- leadership → Give opportunities to make choices  
- curiosity → Encourage exploration with safe boundaries  
- emotional attunement → Provide predictable routines and soft check-ins  

## AI context

When meaning is present, prompts receive:

- `learning_style`, `communication_style`, `creative_strength`
- `attention_pattern`, `emotional_profile`, `social_profile`
- `strengths`, `comfort_needs`, `motivation_style`, `curiosity_pattern`
- `parenting_guidance`

Plus minimal sky anchors (sun/moon/phase/rising). Raw lon/aspect dumps are omitted.

## Package

`@workspace/birth-sky-meaning` — shared by api-server + kidschedule.

## Downstream

See [birth-sky-development.md](./birth-sky-development.md) — Development Engine
consumes MeaningSnapshot + age / goals / routines.

## Future expansion

- Richer nakshatra / dasha catalogs  
- Yoga-aware rules  
- Age-band parenting tip variants  
- Synastry meaning (after synastry sprint)  
