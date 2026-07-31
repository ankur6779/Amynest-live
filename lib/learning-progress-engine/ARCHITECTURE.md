# LearningProgressEngine — Architecture Rules

> **Learning Platform Architecture v1.0 FROZEN.**  
> See `docs/learning-platform/v1/FREEZE.md` and ADR-0004 (LPE dual track).  
> No new progression engines. Stewardship only.

These rules apply to **every contributor** (humans and AI assistants) touching
the AmyNest learning surfaces. They are intentionally short.

> **Stewardship Era (canon).** The platform is mature. From here forward, the
> primary responsibility is *stewardship* — keeping AmyNest coherent, humane,
> trustworthy, calm, and emotionally healthy as it grows. Every change must
> pass `reviewStewardship()` (see `stewardship.ts`).

## Single source of truth

- **All** progression, mastery, unlocks, rewards, daily sessions, learning
  memory, skill graph, adaptive routing, comeback missions, AI tutor insights,
  and parent dashboards are derived from `@workspace/learning-progress-engine`.
- The only API write paths that mutate learning state are:
  - `POST /api/learning-progress/complete-activity`
  - `POST /api/learning-progress/session-step`
- All client writes flow through `learning-sync-engine.ts` (queue + retry +
  dedup). UI components must never `fetch` learning endpoints directly.

## Hard rules

| # | Rule |
|---|------|
| 1 | **No parallel progression engines.** If a feature needs progress, derive it from the engine. |
| 2 | **No local unlock logic.** Always call `getUnlocks()` / `composePhase3Status()`. |
| 3 | **No duplicate reward systems.** Coins/stars/XP/badges live in `learning_progress.{coins, stars, badges}` only. Gaming wallet stays separate by design. |
| 4 | **No client-authoritative XP.** The server is the only source of XP credit. The sync engine is a queue, never a calculator. |
| 5 | **All motion derives from `@/lib/experience-system`.** No custom easings, durations, or `framer-motion` transitions inline. |
| 6 | **All companion messaging derives from `living-companion.ts`.** UI never invents Amy lines. |
| 7 | **All visible copy goes through `emotional-copy.ts`** when phrasing needs to be warm/parent-safe. |
| 8 | **Anti-spam is enforced server-side** via `evaluateActivityIngest()` in `learningProgressService`. Client guards are advisory only. |
| 9 | **Notifications use `buildLearningNotification()`** to generate copy; no shame/guilt language ever. |
| 10 | **Reduced motion is respected** via `useReducedMotion()` for every continuous animation or celebration. |
| 11 | **No ad-hoc animations.** Anything new must reuse `fadeUp` / `softScale` / `pageEnter` (with tier-aware `tierTransition()` if it must scale). |
| 12 | **No direct XP / coin / star mutation** in any client or service. Mutations only happen via `recordActivityCompletion()` server-side. |
| 13 | **All rewards flow through the reward bus.** No component subscribes to API responses directly for celebrations. |
| 14 | **All writes go through `learning-sync-engine.ts`.** Direct `fetch` calls to learning endpoints are forbidden. |
| 15 | **All adaptive recommendations must be explainable.** Use `adaptive-routing.ts` reasoning fields; never display unreasoned picks. |
| 16 | **All AI tutor / proactive copy is guardrail-reviewed.** Server pipes Amy replies through `applyAiGuardrails()`; client-generated AI copy must do the same. |
| 17 | **All behavior changes ship behind a flag.** Use `feature-flags.ts` for staged rollout — never hard-release. |
| 18 | **Experiments use `behavior-experiments.ts`.** No custom A/B logic; assignment is deterministic + holdout-aware. |
| 19 | **No addictive loops or guilt retention.** Use `behavior-optimizer.ts` to tune pacing toward calm consistency. |
| 20 | **Performance tier respects device class.** Heavy visual surfaces consult `visualBudget()` / `tierTransition()`. |
| 21 | **Telemetry is non-blocking.** All metrics go through `telemetry-engine.ts` (batched, idle-flushed, no PII). |
| 22 | **Sync queue self-heals.** Apps call `startResilienceWatcher()` once — no manual queue mutation elsewhere. |
| 23 | **No new engines.** The Continuous Optimization Era adds modules — not engines. Every new file is a pure derivation from existing state. |
| 24 | **No new progression systems.** If you need a new signal, derive it from `profile` + `memory` + `skillGraph` + `phase3`. Persistence stays in `learning_progress` + `skill_graph_progress`. |
| 25 | **No new dashboards.** Optimization output renders inside `/debug/learning` only. Parents never see optimizer internals. |
| 26 | **No parallel personalization.** All personalization flows through `behavior-optimizer`, `developmental-pacing`, and `adaptive-routing`. |
| 27 | **All onboarding goes through `buildAdaptiveOnboardingPlan()`.** No ad-hoc first-run flows. |
| 28 | **Premium prompts go through `evaluatePremiumPrompt()`** with the 7-day cooldown honored. No scarcity / urgency / countdown copy. |
| 29 | **All recommendation reasons are warm.** Use `explainRecommendations()`; the raw `reason` from `adaptive-routing` is for internal use only. |
| 30 | **All recommendation sets are audited.** Use `auditRecommendations()` before render — never ship recs flagged as `overload` / `emotional_inconsistency`. |
| 31 | **All AI-facing copy passes through `human-review.ts` snapshots** when staged for release. |
| 32 | **All behavior changes obtain a `ship` verdict** from `buildOptimizationReport()` before wider rollout. `watch` and `hold` block scale-up. |

## File responsibilities (engine)

- `types.ts` — shared shapes only. No logic.
- `mastery.ts` — mastery score, level, phase, XP rules.
- `unlocks.ts` — alphabet/number/freshness gating.
- `daily-freshness.ts` — per-day deterministic picks.
- `daily-session.ts` — 5-step session builder.
- `skill-graph.ts` — skill catalog + per-skill mastery state.
- `learning-memory.ts` — derived learner memory snapshot.
- `re-engagement.ts` — comeback mission generator.
- `rewards.ts` — XP/coin/star/badge events + wallet.
- `difficulty-engine.ts` — adaptive difficulty.
- `adaptive-routing.ts` — recommendations with parent-readable reasons.
- `parent-insights.ts` — growth dashboard composer.
- `ai-tutor-insights.ts` — proactive tutor lines.
- `living-companion.ts` — cross-module Amy presence lines.
- `phase3.ts` — composes all of the above into `Phase3Status`.
- `emotional-copy.ts` — warm parent-facing labels.
- `anti-spam.ts` — repetition / cooldown / diminishing-returns guards.
- `growth-arc.ts` — monthly snapshot derivation (no new state).
- `notifications.ts` — warm notification copy generator.
- `feature-flags.ts` — deterministic rollout / percentage / allowlist.
- `behavior-experiments.ts` — A/B + holdout variant assignment.
- `behavior-optimizer.ts` — session/reward tuning toward calm consistency.
- `recommendation-quality.ts` — scoring + fatigue detection.
- `ai-guardrails.ts` — diagnosis/anxiety/guilt sanitizer for AI copy.
- `family-milestones.ts` — rare meaningful milestone detector.
- `platform-health.ts` — 0..100 operational health score.
- `retention-cohorts.ts` — D1/D7/D30 + comeback success rate.
- `data-lifecycle.ts` — archival/aggregation policy + profile compaction.
- `learning-simulator.ts` — deterministic 30/180-day usage simulator.
- `adaptive-onboarding.ts` — first-3-minute plan (quick / calm / five-min).
- `first-session-flow.ts` — trimmed, success-shaped first session.
- `premium-conversion.ts` — milestone-based, cooldown-aware premium prompts.
- `parent-confidence.ts` — short warm reassurance lines for parents.
- `learning-effectiveness.ts` — retention, recovery, stability from skill snapshots.
- `developmental-pacing.ts` — when to push / reinforce / simplify / slow down.
- `recommendation-explanations.ts` — warm parent-readable why-strings.
- `recommendation-audits.ts` — overload / inconsistency / fatigue drift checks.
- `human-review.ts` — internal QA snapshots for AI + emotional copy.
- `family-journey.ts` — yearly summary + learning memories.
- `optimization-pipeline.ts` — master composer + ship/watch/hold verdict.
- `stewardship.ts` — final principled reviewer; every proposed feature/flag/copy/animation passes through this before shipping.

## Client responsibilities

- `lib/experience-system.ts` — motion tokens, card variants, spacing, sound, tier helpers.
- `lib/learning-sync-engine.ts` — durable write queue (offline + retry + dedup).
- `lib/learning-reward-bus.ts` — global reward event channel.
- `lib/reduced-motion.ts` — accessibility motion preference.
- `lib/performance-tier.ts` — device-tier detection + visual budget.
- `lib/telemetry-engine.ts` — batched non-blocking client telemetry.
- `lib/resilience-recovery.ts` — sync-queue self-heal + reward desync detection.
- `hooks/use-learning-progress.ts` — single read hook.
- `hooks/use-record-learning-activity.ts` — single write hook (uses sync engine).
- `hooks/use-reward-celebrations.ts` — celebration UI hook (subscribes to bus).
- `hooks/use-learning-sync.ts` — sync bootstrap + resilience watcher.
- `components/learning-progress/*` — presentation only; no progression logic.

## What to do when adding a new module

1. Add a `SectionKey` if you genuinely need one (`types.ts`).
2. Map your activity ids to skills in `skill-graph.ts`.
3. Call `useRecordLearningActivity` from your UI when an activity completes.
4. Surface progress via `ProgressionStrip` / `RewardWalletStrip` / `AmyPresenceStrip`.
5. **Do not** introduce a new wallet, new unlock table, or new analytics event
   namespace. Extend the existing ones.

## Debug & observability

- `/debug/learning?debug=1` — read-only inspector for engine state and sync
  queue diagnostics.
- `learning_progress_anti_spam` log lines mark suppressed activities.
- `learning_progress_analytics` log lines mark all engine analytics events.
- `ai-tutor guardrails:` log lines mark stripped AI violations.
- `scorePlatformHealth()` powers the operational dashboard.

## Behavioral ethics

AmyNest optimizes for:

- calm consistency
- family trust
- healthy learning
- emotional safety
- long-term growth

NEVER for:

- addictive engagement
- urgency pressure
- manipulative retention
- compulsive streak behavior
- feature bloat

Tuning lives in `behavior-optimizer.ts` and `developmental-pacing.ts` and is
bounded by these principles — never tighten reward frequency, shorten comeback
windows, or surface premium prompts past the ceilings in those files.

## Product philosophy (immutable)

AmyNest operates like:

> "A calm, adaptive, emotionally intelligent developmental companion for families."

NOT:

- a worksheet app
- a gamified kids app
- a content platform
- an AI chatbot
- a feature-heavy educational app

The Continuous Optimization Era prepares the platform to:

- **measure real learning effectiveness**, not engagement minutes
- **convert premium through earned moments**, never urgency
- **build parent confidence** through warm acknowledgment
- **explain every recommendation** in one human sentence
- **audit itself** so AI + recommendations + copy never drift
- **continuously tune** through real-world behavior — `optimization-pipeline.ts`
  outputs `ship` / `watch` / `hold` verdicts that gate broader rollouts

## The Stewardship Era — final principles

The platform is mature. The hardest challenge now is **not** making it more
powerful. The hardest challenge is keeping it coherent, humane, trustworthy,
calm, and emotionally healthy as it grows. These 13 principles are part of
the architecture. They are enforced in code by `stewardship.ts` and reviewed
by `reviewStewardship()`.

| # | Principle | Doctrine |
|---|-----------|----------|
| 1 | **Protect simplicity** | As intelligence grows, simplicity must increase. If a change reduces clarity, do not ship it. |
| 2 | **Preserve one coherent system** | No local unlock / reward / motion / emotional / personalization / onboarding logic — everything derives from the shared platform. |
| 3 | **Optimize for trust** | Reliability, honesty, explainability, calmness, restraint, safety, and consistency always over engagement spikes. |
| 4 | **Amy is human-calm, not human-dependent** | Amy is warm, observant, supportive — not needy, guilt-inducing, dependency-forming, or overly humanized. Amy supports the family; Amy does not replace the family. |
| 5 | **Respect quietness** | Silence is part of premium UX. Not every session, milestone, return, or recommendation needs copy, glow, or sound. |
| 6 | **Long-term growth** | Never optimize for daily addiction or compulsive streaks. Optimize for sustainable, multi-year family growth. |
| 7 | **Feature discipline — depth over breadth** | Prefer refinement, polish, recommendation quality, and onboarding quality over new modules, dashboards, gamification, or AI surfaces. |
| 8 | **Emotional safety** | Never ship guilt copy, fear copy, shame loops, comparison pressure, anxiety amplification, or developmental diagnosis language. |
| 9 | **Explainability** | Every recommendation and behavior remains understandable, reviewable, debuggable, and auditable. No black-box behavioral systems. |
| 10 | **Performance as a feature** | Smoothness is part of trust — protect battery, low-end Android, reduced motion, accessibility, and sync resilience. Never sacrifice stability for visual novelty. |
| 11 | **Philosophy protection** | The product philosophy is part of the architecture. A feature that conflicts with the philosophy is wrong. |
| 12 | **Measure what matters** | Parent confidence, healthy retention, skill stability, recommendation usefulness, emotional trust, long-term family value — never compulsive engagement, session inflation, or artificial streak pressure. |
| 13 | **True product identity** | AmyNest is a calm, adaptive, emotionally intelligent developmental companion for families. Every future decision must reinforce this identity. |

### How stewardship is enforced

- **Code path.** New features, flags, experiments, copy, animations,
  notifications, metrics, dashboards, and personalization paths pass through
  `reviewStewardship(proposal)`. The reviewer returns one of:
  - `ship` — respects the platform; safe to roll out behind a flag.
  - `revise` — fixable; must address the listed flags first.
  - `reject` — violates a core principle; the proposal is wrong as stated.
- **Doctrine constant.** `STEWARDSHIP_DOCTRINE` ships the 13 principles as
  immutable strings — UI / docs / PR bots can read them rather than restate.
- **Block conditions** (auto-`reject`): new engines, new dashboards, local
  unlock/reward/motion/personalization logic, compulsion mechanics,
  unexplainable behavior, guardrail-violating copy, urgency/comparison copy.
- **Revise conditions**: missing feature flag, missing performance budget,
  opaque algorithmic copy, missing shared-system wiring.

### The final stewardship rule

> The platform is already sophisticated enough. The hardest challenge now is
> not making it more powerful — it is keeping it coherent, humane,
> trustworthy, calm, and emotionally healthy as it grows.
>
> That responsibility is now part of the product itself.

## Scale readiness

- Telemetry is batched + sampled; never per-event network calls.
- Recent activity logs are bounded (≤ 200 in the engine, ≤ 80 on the client).
- Profile rows beyond the retention windows in `data-lifecycle.ts` get
  compacted via `compactProfile()`.
- Sync queue is bounded (`MAX_QUEUE = 50`), with stale-entry pruning by the
  resilience watcher.
- All animations check `useReducedMotion()` and `visualBudget()` before
  spawning particles / blurs / shadows.

## Emotional safety

- No guilt messaging (`"You missed your streak"` → `"Your rhythm is still here"`).
- No urgency / fear / shame language anywhere.
- Notifications are opt-in, low frequency, and skip themselves when the child
  already learned today.
- Celebrations follow `rewardIntensity()` — small wins stay quiet.
- AI replies pass through `applyAiGuardrails()` and stripped violations are
  logged for review.
