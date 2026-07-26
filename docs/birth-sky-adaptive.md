# Birth Sky Adaptive Intelligence Engine

## Architecture

```
Astronomy (unchanged)
  → MeaningEngine (unchanged)
    → DevelopmentEngine (unchanged)
      → AdaptiveEngine (deterministic, no LLM / no ML)
        → AdaptiveSnapshot (versioned)
          → AI Context (structured facts only)
            → LLM
```

## Version

`adaptive-engine/1.0.0` — stored on every `AdaptiveSnapshot`.

Computed at AI assemble time from `DevelopmentSnapshot` + optional anonymized
child history. Missing history → low-confidence baseline (still deterministic).

## Learning profile

Rule-based counters only:

- preferred / completed / repeated / avoided activity types
- engagement trend: rising | stable | falling | unknown

## Engagement patterns

Produces:

- level: high | medium | low
- recommended session length (minutes)
- preferred activity timing (day-part)
- consistency score

## Routine adaptation

From completion vs skip counts + drop-off tags:

- completion rate, drop-off points, streak proxies
- per-routine action: continue | reduce | increase | rotate

## Parent feedback

Structured signals only: helpful · too_difficult · too_easy · child_enjoyed ·
child_ignored → deterministic weight deltas (global + per activity type).

## Privacy guarantees

- No personal identifiers in history (no names, emails, user/child IDs, devices)
- No cross-user learning or external analytics
- Engine rejects history objects containing forbidden keys
- Activity/routine types are sanitized tags only

## AI context

Appends structured facts (not advice):

- `engagement_level`
- `preferred_activity_types`
- `recommended_session_length`
- `routine_health`
- `adaptation_priority`
- `consistency_score`

## Package

`@workspace/birth-sky-adaptive` — depends on `@workspace/birth-sky-development`.

## Downstream

See [birth-sky-conversation.md](./birth-sky-conversation.md) — Conversation
Engine consumes AdaptiveSnapshot (+ Meaning / Development) into a ConversationPlan.

## Future expansion

- Wire live AmyNest routine completion feeds (still anonymized tags)
- Day-of-week timing histograms
- Soft-expire stale feedback windows (still rule-based)  
