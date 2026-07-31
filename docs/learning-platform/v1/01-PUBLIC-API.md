# Public API Reference — Architecture v1.0

Stable exports for frozen packages. Prefer these entrypoints; do not deep-import internals in new code.

## `@workspace/learning-events`

| Export | Role |
|--------|------|
| `LEARNING_EVENT_SCHEMA_VERSION` | Envelope version (`1`) |
| `LEARNING_EVENT_TYPES` / `LEARNING_MODULES` | Catalogs |
| `createLearningEventBus` / `publishLearningEvent` / `subscribeLearningEvents` | Bus |
| `learningItemEvent` | Generic modality items |
| `speechPracticeEvent` | Speech started/completed |
| `storyLearningEvent(phase)` | Story phases |
| `readingLearningEvent(phase)` | Reading phases |
| `gameLearningEvent(phase)` | Game phases |
| `attentionStateEvent` | Attention snapshot |
| `knowledgeUpdatedEvent` | Fan-out (no KG re-entry) |
| `toKnowledgeObservations` | Event → KG observation DTOs |
| `toAnalyticsCompatible` | Flat analytics projection |
| `createLocalStorageOfflineQueue` / `createMemoryOfflineQueue` | Offline |

## `@workspace/learning-runtime`

| Export | Role |
|--------|------|
| `LEARNING_RUNTIME_SCHEMA_VERSION` | `1` |
| `createLearningRuntime` | Main factory |
| `DEFAULT_RUNTIME_RULES` / `DEFAULT_FEATURE_FLAGS` | Rule pack |
| `normalizeLearningEvent` | Event → `NormalizedSignal` |
| `enrichDecisionPatch` / `finalizeDecision` | Decision assembly |
| `toLearningDecisionEvent` | Emit `learning.decision` |
| Trace: `RUNTIME_TRACE_SCHEMA_VERSION`, `RuntimeTracer` | Observability |
| Types: `LearningDecision`, `RuntimeRule`, snapshots | Contracts |

`LearningRuntime` methods (conceptual): `processEvent`, `setSnapshots`, `setFeatureFlags`, `setTracer`, `setMetricsObserver`.

## `@workspace/knowledge-graph`

| Export | Role |
|--------|------|
| `KNOWLEDGE_GRAPH_VERSION` / `SEED_CATALOG_VERSION` | Versions |
| `createKnowledgeGraphApi` / `createMemoryPersistence` | API |
| `ensureStoryConcepts` / `ensureReadingConcepts` / `ensureGameConcepts` | Structure upserts |
| `recordObservations` / `recommend` / `summarize` / `weakPhonemes` | Learning ops |
| `observationsFromMasteryDelta` / `observationsFromSpeechAttempt` | Adapters |
| Ontology helpers (`phonemeId`, `wordId`, …) | IDs |

## `@workspace/learning-telemetry`

| Export | Role |
|--------|------|
| `LEARNING_TELEMETRY_SCHEMA_VERSION` | `1` |
| Collector / alerts / health / format report | Ops |

## `@workspace/learning-reliability`

| Export | Role |
|--------|------|
| `LEARNING_RELIABILITY_SCHEMA_VERSION` | `1` |
| Harness, scenarios, verify, heal, score, CLI `chaos` | Reliability |

## `@workspace/learning-progress-engine`

| Export area | Role |
|-------------|------|
| `recordActivityCompletion` / `buildLearningProfile` / `getUnlocks` | Progression |
| `SkillGraphEngine` / skill trees | Skill registry module |
| Parent insights / reports / phase3 | Parent intelligence |
| Stewardship / anti-spam / XP / unlocks | Hub stewardship (not world Runtime) |
| Adaptive difficulty / recommendations | Learning Runtime only (`adaptive-authority` projector) |

Full stewardship rules: `lib/learning-progress-engine/ARCHITECTURE.md`.

## Host bridges (kidschedule — not separate packages)

| Module | Public surface |
|--------|----------------|
| `learning-events-bridge` | `installLearningEventBus`, `publish*`, sinks |
| `learning-runtime-bridge` | `installLearningRuntimeBridge` |
| `learning-decision-bus` | `subscribeLearningDecision` |
| `knowledge-graph-client` | `getKnowledgeGraph`, `ensure*LearningNodes`, ingest |
| `*-learning-adapter` | `begin*Session`, `record*`, `end*Session`, `get*ParentInsights` |
| `GrowthBootstrap` | Install order for bus → KG → runtime → telemetry |

## Event type catalog (v1)

Speech: `speech.practice_started`, `speech.practice_completed`  
Story: `story.session_started|chapter_started|chapter_completed|concept_discovered|vocabulary_learned|session_completed`  
Reading: `reading.session_started|page_started|word_completed|page_completed|phoneme_practiced|new_word|session_completed`  
Games: `game.session_started|level_started|level_completed|challenge_completed|session_completed`  
Shared: `learning.item_*`, `attention.state_changed`, `knowledge.updated`, `learning.decision`, `daily_mission_completed`
