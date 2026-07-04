# Production migration checklist: `0045_user_retention`

Apply before enabling the retention dashboard widgets in production. Without this table, `GET /api/retention/status` returns **HTTP 500** and retention widgets stay hidden (fail-safe).

## Migration file

`lib/db/migrations/0045_user_retention.sql`

## Pre-flight

- [ ] Confirm you are connected to **production** Postgres (not dev).
- [ ] Take a manual backup or verify Render automated backups are current.
- [ ] Note current deploy version / API service ID for rollback reference.

## Apply migration

From a machine with `DATABASE_URL` pointing at production:

```bash
DATABASE_URL="<production-connection-string>" pnpm db:push
```

Or run the SQL directly against production:

```bash
psql "$DATABASE_URL" -f lib/db/migrations/0045_user_retention.sql
```

## Verify table

```sql
SELECT to_regclass('public.user_retention');
-- Expected: user_retention

\d user_retention
-- Expected columns: user_id (PK), current_streak, longest_streak, last_active_date,
--   last_checkin_date, shield_used_month, total_stars, total_coins, parent_xp,
--   daily_goals, goals_date, achievements, preferences, resume_items,
--   inactive_days, winback_level, weekly_summary_cache, created_at, updated_at
```

## Verify indexes

```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'user_retention'
ORDER BY indexname;
```

Expected:

- `user_retention_pkey` (on `user_id`)
- `user_retention_user_idx`
- `user_retention_last_active_idx`

## Verify API (authenticated)

Replace `<token>` with a valid Firebase ID token for a test user:

```bash
curl -sS -H "Authorization: Bearer <token>" \
  "https://api.amynest.in/api/retention/status?routineCompletionPct=0" | jq .
```

Expected **HTTP 200** with shape:

```json
{
  "ok": true,
  "state": {
    "currentStreak": 0,
    "longestStreak": 0,
    "totalStars": 0,
    "totalCoins": 0,
    "parentXp": 0,
    "dailyGoals": {
      "routine": false,
      "story": false,
      "activity": false,
      "speech": false
    },
    "achievements": [],
    "inactiveDays": 0,
    "winbackLevel": 0
  },
  "shieldAvailable": true,
  "canUseShield": false,
  "parentingScore": 0,
  "goalsComplete": 0,
  "goalsTotal": 4,
  "checkedInToday": false,
  "resumeItems": [],
  "preferences": {},
  "weeklySummary": null,
  "trialPremiumFeature": null
}
```

Must **not** return:

- HTTP 500 `{ "error": "server_error" }`
- HTTP 200 with `{ "ok": true }` and no `state`

## Verify client

- [ ] Open `/dashboard` on production (web or Android WebView).
- [ ] Dashboard loads without AppErrorBoundary.
- [ ] Retention check-in card appears for signed-in users (after API 200).
- [ ] If API still failing, retention section is hidden and dashboard remains usable.

## Rollback

If migration causes issues:

1. Retention routes can be disabled by reverting the frontend deploy (widgets fail-soft).
2. To remove the table (last resort):

```sql
DROP TABLE IF EXISTS user_retention;
```

Only drop if no production rows need preserving.

## Related cron

After migration, confirm weekly summary cron is scheduled (`retentionWeeklyCron.ts`) and logs show no DB errors on Sunday runs.
