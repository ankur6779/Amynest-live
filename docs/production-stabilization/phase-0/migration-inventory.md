# Migration Inventory — AmyNest AI

## Migration systems (dual path)

AmyNest uses **two schema deployment paths**:

1. **Drizzle push** — `pnpm db:push` from `lib/db/drizzle.config.ts` (primary for dev + many prod tables)
2. **Numbered SQL migrations** — `lib/db/migrations/0001–0044` via `pnpm db:migrate` (`scripts/migrate-database`)
3. **Manual repair SQL** — `lib/db/sql/*.sql` (idempotent ops scripts)
4. **Boot-time ensure** — `api-server` `ensureStartupTables.ts` (creates missing tables on startup)

## Numbered migrations (44 files)

| # | File | Action |
|---|------|--------|
| 0001 | `static_audio_registry.sql` | CREATE `static_audio_registry` |
| 0002 | `infant_milestone_progress.sql` | CREATE infant milestones |
| 0003 | `tts_content_sha256.sql` | ALTER `tts_cache` |
| 0004 | `child_content_learning_profiles.sql` | CREATE |
| 0005 | `nba_decision_logs.sql` | CREATE |
| 0006 | `child_personality_profiles.sql` | CREATE |
| 0007 | `child_prediction_snapshots.sql` | CREATE |
| 0008 | `family_learning_graphs.sql` | CREATE |
| 0009 | `global_learning_graph.sql` | CREATE |
| 0010 | `system_meta_state.sql` | CREATE |
| 0011 | `gaming_wallet.sql` | CREATE |
| 0012 | `olympiad_scores.sql` | CREATE |
| 0013 | `story_gcs_mirror.sql` | ALTER `story_content` GCS columns |
| 0014 | `user_activation_journey.sql` | CREATE |
| 0015 | `coach_audio_cache.sql` | CREATE |
| 0016 | `parent_hub_journey.sql` | CREATE |
| 0017 | `ai_content_cache.sql` | CREATE |
| 0018 | `coach_journey.sql` | CREATE |
| 0019 | `routine_journey.sql` | CREATE |
| 0020 | `learning_progress.sql` | CREATE |
| 0021 | `phase3_skill_graph.sql` | CREATE `skill_graph_progress` + ALTER learning_progress |
| 0022 | `olympiad_child_stats.sql` | CREATE |
| 0023 | `speech_conversation_memory.sql` | CREATE |
| 0024 | `routine_personalization.sql` | CREATE snapshots + outcomes |
| 0025 | `routine_feedback.sql` | CREATE |
| 0026 | `analytics_events.sql` | CREATE unified analytics spine |
| 0027 | `routines_child_date_unique.sql` | Dedupe + unique index |
| 0028 | `phonics_v3_progress.sql` | CREATE 4 phonics_v3 tables |
| 0029 | `phonics_v3_retention.sql` | CREATE retention table |
| 0030 | `push_sounds_enabled.sql` | ALTER notification_preferences |
| 0031 | `user_devices.sql` | CREATE |
| 0032 | `user_devices_metadata.sql` | ALTER browser, os, app_version |
| 0033 | `nutrition_daily_log.sql` | CREATE |
| 0034 | `nutrition_household.sql` | CREATE meal memory + caregiver share |
| 0035 | `speech_coach_v2.sql` | CREATE v2 sessions tables |
| 0036 | `speech_coach_v2_active_sessions.sql` | CREATE active + monthly usage |
| 0037 | `speech_coach_v2_token_usage.sql` | CREATE token/cost usage |
| 0038 | `billing_entitlement_v2.sql` | ALTER subscriptions + billing_audit |
| 0039 | `premium_download_bank.sql` | ALTER subscriptions download bank |
| 0040 | `worksheet_downloads.sql` | CREATE |
| 0041 | `user_identity_aliases.sql` | CREATE |
| 0042 | `user_custom_activities.sql` | CREATE |
| 0043 | `subscription_cancellation_constraints.sql` | Data repair + CHECK constraints |
| 0044 | `hub_download_ledgers.sql` | CREATE coloring + funsheet + worksheet downloads |

## Manual SQL (`lib/db/sql/`)

| File | Purpose |
|------|---------|
| `onboarding_core_schema.sql` | Idempotent repair: children, parent_profiles, subscriptions, onboarding_profiles |
| `phonics_curriculum_schema.sql` | phonics_curriculum_progress, daily_plans, content_cache |
| `tts_cache.schema.sql` | Full tts_cache CREATE |
| `tts_cache_add_audio_url.sql` | ALTER tts_cache audio_url |
| `push_tokens.schema.sql` | push_tokens CREATE + alters |
| `razorpay_webhook_events.schema.sql` | Razorpay webhook table |
| `children_add_fixed_activities.sql` | ALTER children fixed_activities JSONB |

## Migration coverage gap

~96 tables exist via Drizzle push **without** numbered migrations. Core tables (children, routines, phonics, infant, subscriptions) predate the migration series.

**Production state:** Render Postgres `amynest_db_jnen` at migration **0044** + push drift.

## Planned migrations (future phases)

| Phase | Migration | Description |
|-------|-----------|-------------|
| 1 | `0045_analytics_context_columns.sql` (optional) | Ensure `app_version`, `platform` indexed; no breaking changes |
| 1 | None required if props JSONB sufficient | screen/button/nav via `props` |
| 3 | Fix via code only | hub-journey, learning-progress 500s |
| 7 | Billing reconciliation | May need constraint fixes, not new tables |

## Migration commands

```bash
# Push schema drift (dev)
DATABASE_URL=... pnpm db:push

# Run numbered migrations (prod)
pnpm db:migrate

# Repair core tables (manual)
psql $DATABASE_URL -f lib/db/sql/onboarding_core_schema.sql
```

## Rollback policy

- Migrations are **forward-only** in production
- Phase 0: **no migrations applied**
- Each phase commit includes migration only when schema change required
