# Migration, Versioning, Deprecation & Compatibility — v1.0

## Migration guide

### Adopting Architecture v1.0 (already on main)

No DB migration is required for Learning Events / Runtime / client KG.

1. Ensure `GrowthBootstrap` installs bus → KG → runtime → telemetry.
2. Mount `LearningPlatformSnapshotHost` for skill/profile snapshots.
3. Wire product surfaces through adapters (Speech/Story/Reading/Games) or discovery mastery ingest.
4. Keep `recordActivity` for durable LPE credit.

### Consumer migrations (detailed)

| Consumer | Doc |
|----------|-----|
| Story World | `lib/learning-events/docs/STORY_WORLD_LEARNING_MIGRATION.md` |
| Reading World | `lib/learning-events/docs/READING_WORLD_LEARNING_MIGRATION.md` |
| Games | `lib/learning-events/docs/GAMES_WORLD_LEARNING_MIGRATION.md` |
| Speech | Adapter implemented; dedicated MD still owed (debt) |
| Discovery | Mastery deltas → `publishMasteryDeltaEvents` / KG observations |

### Progress section aliases

| Product | `recordActivity` section | Notes |
|---------|--------------------------|-------|
| Reading World | `reading` | Dual-credits `phonics` |
| Stories | `stories` | |
| Games | `puzzles` / `memory` / `math` / `creativity` | No `games` SectionKey |
| Speech | `speech` | |
| Phonics tile play | `phonics` | Legacy path remains valid |

### LocalStorage keys (client)

Do not rename without migration helpers:

- KG: `amynest:knowledge-graph:v1:{childId}`
- Events offline / applied: `amynest:learning-events:*`
- Consumer resume keys (story flow, daily session, etc.) remain consumer-owned

---

## Versioning policy

| Artifact | Policy |
|----------|--------|
| Architecture | `MAJOR.MINOR` — freeze at `1.0`; breaking core changes require `2.0` |
| Event envelope | `LEARNING_EVENT_SCHEMA_VERSION` — bump on breaking payload changes |
| Runtime decision | `LEARNING_RUNTIME_SCHEMA_VERSION` |
| Trace frames | `RUNTIME_TRACE_SCHEMA_VERSION` |
| KG document | `KNOWLEDGE_GRAPH_VERSION` + `SEED_CATALOG_VERSION` |
| Telemetry / reliability | Respective `*_SCHEMA_VERSION` |

**Additive** event types and rules are allowed in `1.x` without MAJOR bump if unknown types are ignored safely (current bus behavior).

**Breaking** changes (rename required fields, remove event types, change decision meaning) require:

1. ADR
2. Schema version bump
3. Dual-read period where practical
4. Architecture minor or major per freeze policy

---

## Deprecation policy

1. Mark APIs `@deprecated` with replacement in JSDoc.
2. Keep thin wrappers for ≥ one release train (example: `publishGameLevelCompleted`, `publishStoryChapterCompleted`).
3. Do not remove Stable public exports without Architecture review.
4. Consumer-local adaptive helpers may be soft-deprecated in favor of Runtime overlays; removal is optional cleanup, not a new engine.

---

## Compatibility guarantees

### Guaranteed (v1.0)

- Existing `LEARNING_EVENT_TYPES` remain publishable.
- `game.level_completed` remains valid (now with KG mapping).
- `section: "phonics"` callers continue to work alongside `section: "reading"`.
- Offline queue flush preserves monotonic seq (post-chaos fix).
- `knowledge.updated` never writes KG observations.
- Feature-flagged rules can be disabled without code deploy (flags set at host).

### Not guaranteed

- Bit-identical Runtime decisions across package upgrades when rule pack changes (behavior may improve).
- Multi-device KG sync.
- Server persistence of every `LearningDecision`.
- Stable DEV-only inspector UI layouts.

### Platform shells

- **iOS:** Capacitor bundle of kidschedule.
- **Android Play:** WebView → production site; same web LP code path.
- Do not implement Play features in archived Capacitor Android tree.
