# LearningProgressEngine — Architecture Rules

These rules apply to **every contributor** (humans and AI assistants) touching
the AmyNest learning surfaces. They are intentionally short.

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

- healthy learning
- calm consistency
- family trust
- emotional safety

NEVER for:

- addictive loops
- guilt retention
- pressure engagement
- compulsive streak behavior

Tuning lives in `behavior-optimizer.ts` and is bounded by these principles —
never tighten reward frequency or shorten comeback windows past the ceilings
in that file.

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
