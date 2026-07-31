# Lifecycle, Extension, Plugin, Rule Pack & Content Pack Guides — v1.0

## Lifecycle documentation

### Boot (kidschedule)

`GrowthBootstrap` installs:

1. `installLearningEventBus()`
2. `installKnowledgeGraphDiscoveryBridge()`
3. `installLearningRuntimeBridge()`
4. `installLearningTelemetry()` (silent collectors)
5. DEV: `installAmyRuntimeInspector()`, `installLearningReliabilityHost()`

`LearningPlatformSnapshotHost` supplies child profile + skill graph snapshots into Runtime.

### Consumer session lifecycle (canonical)

```
begin*Session() → *.session_started
  → Runtime guidance applied to presentation
  → mid events (page/chapter/level/word/phoneme…)
  → KG ensure + observations via sink
  → Runtime decision → next guidance
end*Session() → *.session_completed
  → recordActivity(section) → LPE sync
```

### Decision lifecycle

```
LearningEvent
  → normalizeLearningEvent
  → applySignalToState
  → evaluateRules (DEFAULT_RUNTIME_RULES + flags)
  → enrichDecisionPatch (KG/skills/attention snapshots)
  → finalizeDecision
  → optional learning.decision bus emit
  → decision bus → adapters
```

---

## Extension guide

Under freeze, extend only by:

1. **New Runtime rules** in `rule-pack.ts` (or additive pack merge if introduced later)
2. **New event phases** only with schema discussion + `LEARNING_EVENT_SCHEMA_VERSION` bump policy
3. **New consumer adapters** in kidschedule mirroring Speech/Story/Reading/Games
4. **KG seed structure helpers** (`ensure*LearningStructure`) for new concept shapes
5. **Feature flags** on rules (`DEFAULT_FEATURE_FLAGS`)

Do **not** add a new `@workspace/learning-*` engine package without unfreeze ADR.

---

## Plugin guide

“Plugins” in v1 are **host modules**, not a formal plugin runtime:

| Plugin-like module | Role |
|--------------------|------|
| `*-learning-adapter.ts` | Product consumer |
| `learning-*-bridge.ts` | Package host |
| `learning-telemetry-host.ts` | Metrics sink wiring |
| `amy-runtime-inspector` | DEV observability plugin |
| `learning-reliability-host.ts` | DEV chaos plugin |

Contract for a new consumer plugin:

1. Publish only via `learning-events-bridge` builders
2. Consume decisions via `subscribeLearningDecision` / guidance helpers
3. Never compute mastery/difficulty/recommendations locally for adaptivity
4. Call `recordActivity` for durable progression
5. Add tests + migration notes under `lib/learning-events/docs/`

---

## Rule pack guide

**File:** `lib/learning-runtime/src/rule-pack.ts`  
**Export:** `DEFAULT_RUNTIME_RULES`, `DEFAULT_FEATURE_FLAGS`

### Rule shape

- `id`, `priority`, optional `dependsOn`, optional `featureFlag`
- `when`: declarative `RuleCondition` DSL (no arbitrary code)
- `then`: `DecisionPatch` (difficulty, hints, celebration, reviewQueue, recommendation, nextActivity, …)

### Current rule families (implemented)

- Attention break
- Session fail/success streaks
- Speech complete / low score
- Story chapter / vocabulary / session
- Reading page / word / phoneme / session
- Game level / struggle / challenge / session
- Knowledge review / follow recommendation
- Daily mission reward
- Skill weak practice
- Discovery item heard
- Profile younger → short narration
- Baseline continue

### Adding a rule

1. Prefer high priority for safety (struggle/break)
2. Use `dependsOn` for enrich rules
3. Gate experimental rules with `featureFlag`
4. Add/adjust tests in `learning-runtime` tests
5. Document reason strings for parent/inspector readability

---

## Content pack guide

Content is **not** a new engine. Packs are catalogs + KG seeds:

| Content | Where |
|---------|-------|
| Games catalog | `kidschedule/src/lib/games.ts` |
| Daily stories | `@workspace/parent-hub-speak` |
| Phonics curriculum / letter groups | `@workspace/phonics-curriculum` |
| Discovery animals/vehicles/… | world packages |
| KG seed entities | `knowledge-graph` `seed-catalog.ts` (`SEED_CATALOG_VERSION`) |
| Story/Reading/Game concept upserts | `ensure*LearningStructure` |

### Content pack checklist

1. Age / unlock eligibility stays in content layer
2. On first use, call `ensure*LearningNodes` so observations land
3. Publish learning events with stable `entityId` / `conceptId`
4. Do not embed mastery scores in content JSON for Runtime decisions
