# Architecture Freeze — Learning Platform v1.0

**Status:** FROZEN  
**Effective:** 2026-07-31  
**Architecture version:** `1.0.0`

## Freeze declaration

AmyNest Learning Platform **Architecture v1.0 is frozen**.

Do **not** create any new core learning engines.

Future development may only happen through:

| Allowed | Forbidden |
|---------|-----------|
| Runtime rules (`DEFAULT_RUNTIME_RULES` / feature flags) | Parallel learning engines |
| Host plugins / bridges (kidschedule adapters) | Duplicate adaptive systems |
| Consumers (Speech, Story, Reading, Games, Discovery) | Duplicate recommendation systems |
| Content packs / catalogs | Duplicate mastery systems |
| AI prompts (guardrailed) | New `@workspace/learning-*` core packages without ADR + unfreeze |
| Telemetry tuning (thresholds, alerts) | Rewriting narrative/game engines to own adaptivity |

## Stable core packages

| Package | Stability |
|---------|-----------|
| `@workspace/learning-events` | **Stable** |
| `@workspace/learning-runtime` | **Stable** |
| `@workspace/knowledge-graph` | **Stable** |
| `@workspace/learning-telemetry` | **Stable** |
| `@workspace/learning-reliability` | **Stable** |
| `@workspace/learning-progress-engine` | **Stable** (stewardship track; see ADR-0004) |

Skill Registry is **not** a separate package — it is `SkillGraphEngine` inside `learning-progress-engine`, fed into Runtime via `LearningPlatformSnapshotHost`.

Attention Engine is **host-local** (`sound-world-attention-*` in kidschedule), publishing via Learning Events.

## Unfreeze policy

Only a written ADR that:

1. Names the gap that cannot be solved via rules / plugins / consumers / content
2. Proves no duplicate of Runtime / KG / LPE authority
3. Is approved by platform ownership

may unfreeze a core package for a **minor** additive change. Major rewrites require Architecture v2.0.

See [README.md](./README.md) for readiness score, debt, and launch recommendation.
