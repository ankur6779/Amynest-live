# AmyNest Learning Platform — Architecture v1.0

**Status:** Production architecture frozen  
**Version:** `1.0.0`  
**Date:** 2026-07-31  

> Only the **implemented** architecture is documented. No invented subsystems.

## Freeze

See **[FREEZE.md](./FREEZE.md)**. Core packages are **Stable**. No new learning engines.

## Document index

| Document | Contents |
|----------|----------|
| [FREEZE.md](./FREEZE.md) | Freeze rules, Stable packages, unfreeze policy |
| [00-ARCHITECTURE-SPEC.md](./00-ARCHITECTURE-SPEC.md) | Spec, system context, dependency graph, ownership matrix |
| [01-PUBLIC-API.md](./01-PUBLIC-API.md) | Public API reference (packages + host bridges) |
| [02-LIFECYCLE-AND-EXTENSION.md](./02-LIFECYCLE-AND-EXTENSION.md) | Lifecycle, extension, plugin, rule pack, content pack guides |
| [03-MIGRATION-VERSIONING.md](./03-MIGRATION-VERSIONING.md) | Migration, versioning, deprecation, compatibility |
| [04-OPERATIONS.md](./04-OPERATIONS.md) | Testing, performance, reliability, security, privacy, release |
| [adr/](./adr/) | Architecture Decision Records |

Consumer migration notes (pre-existing):

- `lib/learning-events/docs/STORY_WORLD_LEARNING_MIGRATION.md`
- `lib/learning-events/docs/READING_WORLD_LEARNING_MIGRATION.md`
- `lib/learning-events/docs/GAMES_WORLD_LEARNING_MIGRATION.md`
- `lib/learning-events/docs/SPEECH_COACH_LEARNING_MIGRATION.md`
- `lib/learning-telemetry/docs/LEARNING_TELEMETRY.md`
- `lib/learning-progress-engine/ARCHITECTURE.md`

---

## Verification checklist (implemented)

| Surface | Status | Location |
|---------|--------|----------|
| Learning Runtime | ✅ | `@workspace/learning-runtime` |
| Learning Events | ✅ | `@workspace/learning-events` |
| Knowledge Graph | ✅ | `@workspace/knowledge-graph` |
| Skill Registry | ✅ (module) | `learning-progress-engine` skill-graph + snapshot host |
| Attention Engine | ✅ (host) | kidschedule `sound-world-attention-*` |
| Telemetry | ✅ | `@workspace/learning-telemetry` + host |
| Reliability | ✅ | `@workspace/learning-reliability` + DEV host |
| Speech Coach | ✅ consumer | `speech-coach-learning-adapter` |
| Story World | ✅ consumer | `story-world-learning-adapter` |
| Reading World | ✅ consumer | `reading-world-learning-adapter` |
| Discovery Worlds | ✅ consumer | mastery → events → KG sink |
| Educational Games | ✅ consumer | `games-world-learning-adapter` |
| Parent Intelligence | ✅ | LPE parent insights + KG insight cards |
| Runtime Inspector | ✅ DEV | `amy-runtime-inspector` |
| Observability | ✅ | Runtime tracer/metrics + telemetry collector |

---

## Production readiness score

**Overall: 88 / 100 — Ready for global launch; adaptive authority unified under Runtime.**

| Domain | Score | Notes |
|--------|------:|-------|
| Core event → decision loop | 92 | Bus, normalize, rules, enrich, emit tested |
| Knowledge Graph | 88 | Seed, observe, recommend, repair; local-first |
| Consumer coverage | 90 | Speech, Story, Reading, Games, Discovery wired |
| Reliability / chaos | 90 | Scored harness (~95/100 historically after flush fix) |
| Telemetry / inspector | 85 | Collectors + DEV dashboards; prod silent |
| Progress / skill graph (LPE) | 88 | Stewardship-only for adaptivity; Phase3 demoted |
| Docs / freeze | 94 | v1.1 adaptive authority + consumer migrations |
| Adaptive authority | 90 | Runtime sole source via `adaptive-authority.ts` |
| Server sync of Runtime decisions | 60 | Runtime is client-host; LPE persists via API |

---

## Remaining technical debt

1. **Presentation micro leftovers** — age-band clamps and content-stage tables in `game-adaptive-progression` still exist as presentation helpers under Runtime difficulty authority; do not grow recommendation engines.
2. **KG ↔ events package decoupling** — wired only in kidschedule host (intentional), harder to reuse outside web shell.
3. **Runtime decisions not server-persisted** — decisions are in-process / decision bus; LPE profile is the durable server record.
4. **`learning-progress-engine` has no package `test` script** — tests exist; CI must invoke via workspace tooling.
5. **Attention is discovery-world-named** — `sound-world-attention-*` used by Story/Reading/Games sessions; rename is cosmetic, not architectural.
6. **Deprecated LPE helpers** — `difficultyAdjustmentEngine` / `buildAdaptiveRecommendations` remain for analytics/tests only; remove in a later cleanup once callers are gone.

---

## Known limitations

- Learning Runtime does **not** replace LPE unlocks, XP, or server anti-spam.
- Knowledge Graph is **local-first** (localStorage); not a multi-device sync authority.
- Attention classification is **heuristic**, not a clinical model.
- Runtime Inspector and Reliability host are **DEV-oriented**; telemetry collectors may run silently in production.
- Android Play Store shell loads web (`android/`); iOS uses Capacitor — LP lives in kidschedule web bundle for both.
- Letter-group / SATPIN unlocks remain curriculum safety rails and may ignore Runtime preferred graphemes when locked.

---

## Future roadmap (allowed under freeze)

| Horizon | Work |
|---------|------|
| Near | Speech migration doc; retire unused local recommend paths behind flags; dual-credit audits |
| Mid | Server-side optional decision audit log; KG sync sketch (plugin, not new engine) |
| Mid | Content packs for reading/games concepts via seed catalog only |
| Long | Architecture v2 only if multi-device KG + server Runtime become product-critical |

**Not on roadmap:** new mastery engines, new recommendation engines, new difficulty engines.

---

## Global launch recommendation

**GO — launch Learning Platform Architecture v1.0.**

Conditions:

1. Treat Runtime + Events + KG as the sole adaptivity path for Speech / Story / Reading / Games / Discovery / hub chips.
2. Steward LPE under its existing ARCHITECTURE.md (no new engines; no product adaptivity).
3. Expand educational content packs (stories, decodables, game copy) without adding engines.
4. Keep chaos + telemetry green in CI / DEV gates before major content launches.

---

## Package stability markers

Each Stable package includes `STABLE.md` pointing here. Schema versions:

| Constant | Package | Value |
|----------|---------|------:|
| `LEARNING_EVENT_SCHEMA_VERSION` | learning-events | 1 |
| `LEARNING_RUNTIME_SCHEMA_VERSION` | learning-runtime | 1 |
| `RUNTIME_TRACE_SCHEMA_VERSION` | learning-runtime | 1 |
| `KNOWLEDGE_GRAPH_VERSION` | knowledge-graph | 1 |
| `SEED_CATALOG_VERSION` | knowledge-graph | 3 |
| `LEARNING_TELEMETRY_SCHEMA_VERSION` | learning-telemetry | 1 |
| `LEARNING_RELIABILITY_SCHEMA_VERSION` | learning-reliability | 1 |
