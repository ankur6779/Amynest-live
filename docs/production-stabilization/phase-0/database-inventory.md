# Database Inventory — AmyNest AI

**ORM:** Drizzle (`lib/db/`)  
**Connection:** `lib/db/src/index.ts` via `DATABASE_URL`  
**Schema index:** `lib/db/src/schema/index.ts` (105 exported modules)  
**Total tables:** 136

## Summary

| Metric | Count |
|--------|------:|
| Schema files | 107 |
| Drizzle tables | 136 |
| Exported modules | 105 |
| Not exported | 2 (`conversations`, `messages`) |
| SQL migrations | 44 |
| Manual SQL | 7 |

## Tables by domain

### Identity & billing (19)

`parent_profiles`, `onboarding_profiles`, `children`, `child_caregivers`, `user_identity_aliases`, `user_devices`, `push_tokens`, `subscriptions`, `usage_daily`, `billing_audit_events`, `revenuecat_webhook_events`, `razorpay_webhook_events`, `referrals`, `gift_tokens`, `admin_premium_grants`, `user_feedback`, `feature_feedback`, `feature_usage`, `babysitters`

### Analytics & observability (5)

`analytics_events`, `infant_product_analytics_events`, `crash_events`, `crash_regressions`, `crash_deploy_baselines`, `crash_fingerprint_status`, `release_intelligence_runs`, `file_risk_history`, `debug_logs`

### Routines (6)

`routines`, `routine_feedback`, `routine_journey`, `routine_personalization_snapshots`, `routine_activity_outcomes`, `user_custom_activities`, `behaviors`

### Journeys & activation (4)

`user_activation_journey`, `parent_hub_journey`, `coach_journey`, `hub_journey` (via parent_hub_journey)

### Notifications (6)

`notification_preferences`, `notification_log`, `notification_fatigue_state`, `notification_outcome_events`, `notification_campaign_progress`, `feature_notification_schedules`, `infant_notification_prefs`

### Learning zone (25+)

`learning_progress`, `skill_graph_progress`, `phonics_*` (8 tables), `spelling_*` (4), `abacus_progress`, `olympiad_*`, `life_skills_progress`, `daily_puzzle_progress`, `health_lab_progress`, `gaming_wallet`, `story_*`, `*_downloads` (4)

### Infant care (10)

`infant_care_logs`, `infant_milestone_progress`, `infant_growth_measurements`, `infant_wellbeing_checkins`, `cry_sessions`, `nap_sessions`, `vaccination_logs`, `nutrition_*` (3)

### Speech (12)

`speech_progress`, `speech_practice_log`, `speech_expert_waitlist`, `speech_conversation_memory`, `speech_coach_v2_*` (8 tables)

### AI & cache (8)

`ai_cache`, `ai_content_cache`, `tts_cache`, `static_audio_registry`, `coach_audio_cache`, `coach_win_generations`, `user_coach_sessions`, `user_ai_messages`

### Family intelligence (10+)

`family_intelligence_snapshots`, `family_digital_twin`, `family_goals`, `family_memory`, `amy_decision_log`, `amy_daily_briefings`, `intervention_ledger`, `nba_decision_logs`, etc.

## Production row counts (2026-07-03 audit)

| Table | Rows (approx) |
|-------|--------------:|
| `analytics_events` | 5,909 |
| `notification_log` | 2,760 |
| `subscriptions` | 169 |
| `user_devices` | 137 |
| `infant_product_analytics_events` | 335 |
| `crash_events` | 111 |
| `parent_profiles` | 53 |
| `onboarding_profiles` | 52 |
| `children` | 58 |
| `feature_usage` | 41 |
| `routines` | 36 |
| `billing_audit_events` | 193 |
| `user_feedback` | 1 |
| `routine_feedback` | 0 |

## Orphan table analysis

### Strong orphans (no application read/write in services/routes)

| Table | Schema file | Notes |
|-------|-------------|-------|
| `conversations` | `conversations.ts` | Not exported from schema index |
| `messages` | `messages.ts` | FK to conversations; template remnant |
| `phonics_audio_assets` | `phonics_audio_assets.ts` | Scripts + `ensureStartupTables` only |
| `validation_runs` | `validation_runs.ts` | Boot-time CREATE only |

### Soft orphans (lib-only access, no direct routes)

| Table | Consumer |
|-------|----------|
| `system_meta_state` | `metaLearningService.ts` |
| `phonics_content_cache` | `phonicsContentAi.ts` |
| `health_lab_progress` | `healthLabProgressService.ts` |

### Data integrity issues (audit)

| Issue | Count |
|-------|------:|
| Subscriptions without `parent_profiles` | 116 |
| `device_header_missing` analytics noise | 4,125 events |
| `subscription_reconciliation_failed` | 28 billing audit events |

## Indexes on analytics spine

```sql
-- analytics_events
analytics_events_event_created_idx (event_name, server_ts)
analytics_events_user_created_idx (user_id, server_ts)
analytics_events_category_created_idx (event_category, server_ts)
```

## Phase 1 schema changes (planned, not applied)

Extend `analytics_events.props` usage for:
- `screen`, `button_id`, `from_route`, `to_route`
- `app_version`, `os`, `browser`, `build`, `country`, `language`
- `child_age`, `subscription_state`

**No new tables for Phase 1** — extend taxonomy + existing `analytics_events` columns (`platform`, `app_version` already exist but unpopulated).

## Deletion policy (Phase 0)

**Do not delete** any tables. Orphan candidates documented for future review only.
