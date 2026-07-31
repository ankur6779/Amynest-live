# Story World → Learning Platform consumer (migration notes)

Story World is a **consumer** of Learning Runtime, Knowledge Graph, and Learning Events. The narrative engine only tells stories; it does **not** own difficulty, recommendations, mastery, review queues, or attention adaptation.

## Architecture (acyclic)

```
learning-events ← knowledge-graph ← learning-runtime ← kidschedule adapters
```

| Layer | Owns | Does not own |
|-------|------|--------------|
| Story Hub / Daily Story Studio | Playback, resume index, narration UI | Mastery, adaptive difficulty, recommendations |
| `story-world-learning-adapter` | Session lifecycle, event publish, apply Runtime order | Scoring / next-item algorithms |
| Learning Runtime | Difficulty, hints, narration length, celebration, review, recommendations | Story text / video |
| Knowledge Graph | Nodes/edges for stories, words, categories, relationships | UI storytelling |

## Session flow

1. `beginStorySession()` → `story.session_started` (+ optional attention snapshot)
2. Runtime decision cached → guidance (difficulty, hints, narration length, celebration, review, preferred story ids)
3. `recordStoryChapterStarted` / `recordStoryChapterCompleted` → chapter + concept + vocabulary events; KG structure seeded
4. Runtime updates → next chapter order via `adaptStoryQueueFromRuntime` (idle / session start only; catalog frozen while playing)
5. `endStorySession()` → `story.session_completed` + host `recordActivity({ section: "stories" })`

## Event types (schema v1, bus-local — no OpenAPI codegen)

| Type | When |
|------|------|
| `story.session_started` | Session open |
| `story.chapter_started` | Chapter / clip begins |
| `story.chapter_completed` | Chapter finished |
| `story.concept_discovered` | Category / moral concepts from chapter |
| `story.vocabulary_learned` | Title-derived or explicit vocab tokens |
| `story.session_completed` | Session close |

Builders: `storyLearningEvent(phase, …)` in `@workspace/learning-events`.  
Host: `publishStoryLearningEvent` in `learning-events-bridge.ts`.

### Deprecation

`publishStoryChapterCompleted` remains as a thin wrapper around  
`publishStoryLearningEvent("chapter_completed", …)`. Prefer the phase helper or the adapter APIs.

## What stays local (not Learning Platform)

- **Resume index** (`story_flow_v1_{childId}`) — UX continuity only
- **Daily Story age pool** — content eligibility by age months, not mastery
- **Local XP/streak UI** in Daily Story Studio — engagement chrome; skill credit still goes through `recordActivity` / Runtime path when `childId` is present

## Parent surfaces

Story contribution appears via shared platform data (no Story-owned mastery):

- Knowledge Summary / recommendations → `StoryKnowledgeInsightsCard` on parent growth
- Learning Timeline labels → `getStoryWorldParentInsights().timelineLabels` in study curriculum visibility
- Skill Graph / Parent Dashboard → `recordActivity({ section: "stories" })` (existing progress engine)

## Rollout / compatibility

1. **Additive** event types and Runtime rules (`story.*` in rule-pack). Existing consumers ignore unknown types safely.
2. **KG**: `ensureStoryLearningStructure` / `ensureStoryConcepts` upserts story/word/category nodes; observations from `toKnowledgeObservations` for completed/discover/vocab/session events.
3. **No DB migration** required for learning-events (client bus + localStorage offline queue).
4. **No OpenAPI / codegen** step for these events.
5. Wire points: `story-hub.tsx`, `daily-story-section.tsx` (+ `childId` from parenting hub), parent growth + timeline.

## Verification

```bash
pnpm --filter @workspace/learning-events test
pnpm --filter @workspace/learning-runtime test
pnpm --filter @workspace/knowledge-graph test
pnpm --filter @workspace/kidschedule exec vitest run src/lib/story-world-learning-adapter.test.ts
```

## Anti-patterns (do not reintroduce)

- Local Story World difficulty / recommendation engines
- Duplicating mastery scores in Story Hub
- Reordering the playing catalog on every Runtime tick (freeze for the session)
- Writing KG from `knowledge.updated` (fan-out only; `busOrigin` blocks loops)
