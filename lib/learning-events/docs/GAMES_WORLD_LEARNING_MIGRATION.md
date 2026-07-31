# Educational Games → Learning Platform consumer (migration notes)

Educational games (Games Hub at `/games`, plus Phonics mini-games) are **Learning Platform consumers**. Games own gameplay, physics, animations, rewards UI, and rendering. They do **not** own difficulty algorithms, mastery scoring for recommendations, review scheduling, or learning adaptation — those come from Runtime / KG.

## Architecture (acyclic)

```
learning-events ← knowledge-graph ← learning-runtime ← kidschedule adapters
```

| Layer | Owns | Does not own |
|-------|------|--------------|
| Games Hub / game components | Play loops, scoring UI, points/wallet chrome, age unlocks | Adaptive difficulty engines, recommendation engines |
| `games-world-learning-adapter` | Session lifecycle, event publish, apply Runtime order / UI difficulty | Mastery math |
| Learning Runtime | Difficulty, hints, celebration, reward priority, review, recommendations | Physics / animations |
| Knowledge Graph | Game nodes, categories, skill evidence | Gameplay |

## Session flow

1. `beginGameSession()` → `game.session_started` (+ attention snapshot)
2. Runtime guidance → Easy/Normal/Hard presentation overlay via `mapRuntimeDifficultyToGameUi`
3. `recordGameLevelStarted` / `recordGameLevelCompleted` (+ optional `challenge_completed`)
4. Knowledge + attention evidence → Runtime decision → preferred next game ids
5. `endGameSession()` → `game.session_completed` + `recordActivity` with mapped SectionKey

## Event types (schema v1, bus-local — no OpenAPI codegen)

| Type | When |
|------|------|
| `game.session_started` | Play session open |
| `game.level_started` | Level / round begins |
| `game.level_completed` | Level finished (**existed**; now has KG observations) |
| `game.challenge_completed` | High score / perfect / challenge finish |
| `game.session_completed` | Session close |

Builders: `gameLearningEvent(phase, …)` in `@workspace/learning-events`.  
Host: `publishGameLearningEvent` in `learning-events-bridge.ts`.

### Deprecation

`publishGameLevelCompleted` remains as a thin wrapper around  
`publishGameLearningEvent("level_completed", …)`. Prefer the phase helper or adapter APIs.

## Progress engine sections (backward compatibility)

There is **no** `"games"` `SectionKey`. Map categories:

| Game category | `recordActivity` section |
|---------------|--------------------------|
| memory | `memory` |
| math | `math` |
| creativity | `creativity` |
| brain / puzzle / focus / action / behavior | `puzzles` |

Metadata includes `learningSection: "games"` for analytics aliasing.  
Learning-events module remains **`games`**.

## What stays local (not Learning Platform)

- **Wallet / unlock / daily limits** — engagement economy
- **`prepareGameSession` micro-stages** — content staging + age safety (3–4 stays Easy); Runtime overlays UI difficulty when a decision exists
- **Local skill % / leaderboard chrome** — hub UX; next-game preference prefers Runtime `preferredGameIds` when present
- **Phonics mini-games** — still call `recordPlay` for phonics progress; additionally emit Games LP challenge events

## Parent surfaces

- Knowledge Summary → `GamesKnowledgeInsightsCard` on parent growth
- Learning Timeline → `getGamesWorldParentInsights().timelineLabels`
- Skill Graph → category-mapped `recordActivity` sections

## Rollout / compatibility

1. **Additive** event types (`session_*`, `level_started`, `challenge_completed`). Existing `game.level_completed` kept.
2. **KG**: `ensureGameLearningStructure` / `ensureGameConcepts`; observations now map for level/challenge/session completed (previously empty).
3. **No DB migration** for learning-events.
4. **No OpenAPI / codegen**.
5. Wire points: `games.tsx`, PhonicsGamesHub via `PhonicsV2`, parent growth + timeline.

## Verification

```bash
pnpm --filter @workspace/learning-events test
pnpm --filter @workspace/learning-runtime test
pnpm --filter @workspace/knowledge-graph test
pnpm --filter @workspace/kidschedule exec vitest run src/lib/games-world-learning-adapter.test.ts
```

## Anti-patterns (do not reintroduce)

- New game-local recommendation / mastery engines for next-level selection
- Computing adaptive difficulty outside Runtime for Learning Platform decisions
- Writing KG from `knowledge.updated` (fan-out only)
- Adding a `"games"` SectionKey without a dedicated progress-engine migration
