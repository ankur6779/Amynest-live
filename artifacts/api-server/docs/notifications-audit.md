# Notification delivery audit (Task #215)

This document captures the full delivery pipeline for routine and AMY Insight
notifications across the PWA (KidSchedule) and the Expo native app
(AmyNest mobile), and the changes shipped in this task to make delivery
reliable.

## Pipeline overview

```
                    ┌────────────────────────────┐
   schedule (cron)  │  notificationCron.ts        │
   user action ────►│  - morning_routine 07:30    │
                    │  - amy_insight     12:30    │
                    │  - routine_item_sweep */1 m │   <-- new in #215
                    │  - token_sweep     03:00    │   <-- new in #215
                    └─────────────┬──────────────┘
                                  ▼
                    ┌────────────────────────────┐
                    │ notificationContentBuilder  │
                    │ - buildMorningRoutine       │
                    │ - buildAmyInsight (dynamic) │   <-- updated in #215
                    │ - buildRoutineItem          │   <-- new in #215
                    └─────────────┬──────────────┘
                                  ▼
                    ┌────────────────────────────┐
                    │ notificationDispatchService │
                    │ - prefs / category gate     │
                    │ - quiet hours / daily cap   │
                    │ - dedup window              │
                    │ - Expo push (mobile)        │
                    │ - FCM web push (browser)    │
                    │ - prune invalid tokens      │   <-- new in #215
                    └─────────────┬──────────────┘
                                  ▼
                    ┌────────────────────────────┐
                    │ notification_log + tickets  │
                    └────────────────────────────┘
```

## Token registration

| Surface           | Provider | Stored as `platform` | Hook / file |
| ----------------- | -------- | -------------------- | ---------- |
| AmyNest mobile    | Expo     | `ios` / `android`     | `usePushRegistration` (mobile `_layout.tsx`) |
| KidSchedule (PWA) | FCM web  | `web`                 | `useWebPush` + `firebase-messaging-sw.js` |

All tokens are written to `push_tokens` with `lastSeenAt` refreshed on every
app foreground.

## Per-category schedule

| Category       | Default schedule              | Builder                |
| -------------- | ----------------------------- | ---------------------- |
| `routine`      | 07:30 user-local              | `buildMorningRoutine`  |
| `routine_item` | every minute, fires t-5 min   | `buildRoutineItem`     |
| `nutrition`    | 15:30 + 18:30 user-local      | `buildSnackTime` / `buildDinnerSuggestion` |
| `insights`     | 12:30 user-local              | `buildAmyInsight` (dynamic) |
| `engagement`   | 19:00 user-local              | `buildEngagement`      |
| `good_night`   | 21:00 user-local              | `buildGoodNight`       |
| `weekly`       | Sunday 10:00 user-local       | `buildWeeklyReport`    |

## Failure handling & token health

* **FCM rejection codes** (`messaging/registration-token-not-registered`,
  `messaging/invalid-registration-token`, `messaging/invalid-argument`) →
  the offending row is deleted from `push_tokens`.
* **Expo ticket errors** (`DeviceNotRegistered`, `InvalidCredentials`) →
  the matching Expo token is deleted (positional ticket→token mapping).
* **Stale sweep** — daily 03:00 local cron deletes any token with
  `last_seen_at < now() - 60 days`.
* **Diagnostics endpoint** — `GET /api/notifications/diagnostics` returns
  the current registered tokens, last 10 deliveries, quiet-hours state,
  and the daily cap so users can self-diagnose.

## Dedup & rate-limit guarantees

* `notification_log.dedup_key` has a partial unique index, so the same
  `dedupKey` cannot be inserted twice for the same user (race-free).
* `routine_item` reminders use `routine_item:{routineId}:{itemIndex}:{date}`
  so even if the per-minute cron fires twice (e.g. process restart) only
  one reminder is delivered per item per day.
* Daily cap defaults to the user's `notification_preferences.daily_cap` and
  the dispatch service short-circuits with `status="throttled"` once the
  cap is reached.

## Settings parity

| Toggle | Web | Mobile |
| ------ | --- | ------ |
| Routine reminders | ✓ | ✓ |
| **Per-task reminders (new)** | ✓ | ✓ |
| Nutrition suggestions | ✓ | ✓ |
| Amy AI insights | ✓ | ✓ |
| Friendly nudges | ✓ | ✓ |
| Good-night message | ✓ | ✓ |
| Weekly report | ✓ | ✓ |
| Recent deliveries (new) | ✓ | ✓ |
| Open system notification settings | n/a | ✓ |

## Test coverage (this task)

* `notificationDispatch.test.ts` — token pruning, stale sweep, no-tokens
  short-circuit, category-disabled gate.
* `notificationContent.test.ts` — `buildRoutineItem` deterministic dedup
  key + body content.
* `notificationCron.test.ts` — `timeStringToMinutes` AM/PM parsing.

## Manual smoke checklist (recommended before each release)

1. From the PWA, open Settings → Notifications → enable browser push,
   then "Send test" on each category. Confirm a FCM web push lands.
2. From the mobile app, do the same. Confirm an APNS / FCM push lands.
3. Add a routine item 6 minutes from now. Wait 1 minute. Confirm the
   per-task reminder fires once on both surfaces.
4. Hit `GET /api/notifications/diagnostics` (authenticated). Confirm
   tokens, recent deliveries and quiet-hours state are correct.
5. Force an FCM `messaging/registration-token-not-registered` (e.g. by
   uninstalling the PWA in one browser); the next dispatch should remove
   the row from `push_tokens` (visible in `/diagnostics`).
