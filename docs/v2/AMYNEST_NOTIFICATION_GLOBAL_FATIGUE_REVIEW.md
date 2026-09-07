# AmyNest notification global fatigue review

**Date:** 2026-08-31  
**Branch:** `cursor/notification-reengagement-foundation-78d4`  
**Re-engagement mode:** `NOTIF_REENGAGEMENT_MODE=dry_run` (unchanged; **not live**)  
**Live sends in this task:** none

**Verdict: B — KEEP DRY-RUN ONLY**

The shared proactive gate is implemented at the existing dispatch boundary. Re-engagement live sending stays blocked. A real production user snapshot was still unreachable from this environment.

---

## 1. Existing scheduler architecture

Unchanged entry points. All still call `dispatchNotification`:

| Source | File | Tick |
|---|---|---|
| Global TZ jobs | `notificationGlobalScheduler.ts` | every minute; slots in `schedule-slots.ts` |
| Routine item heads-up | `notificationCron.ts` `routine_item_sweep` | every minute |
| Infant care | `infantNotificationScheduler.ts` | every minute |
| Feature reminders | `featureNotificationScheduler.ts` | olympiad / PTM / sleep |
| CRM journeys | `notificationSegmentService.ts` | inside global tick; default **off** |
| Re-engagement | `reengagementNotificationService.ts` | every minute; send only if mode=`live` |
| Referral reward | `referralService.ts` | event-driven |

Kill switches: `NOTIFICATIONS_ENABLED`, `DISABLE_NOTIFICATION_CRON`. These were **not** changed.

Default intensity cap remains 3 / 6 / 9 / 12 per local day. The new global gate is **stricter** for proactive categories (1/day, 4/week).

---

## 2. Existing fatigue logic

Still present and still used:

- Intensity daily cap in `atomicAcquireDeliverySlot` (3–12)
- Delivery guard: 15/account/day, 3/hour, per-fingerprint cooldown
- `assessFatigue()` (ignore streaks) used only when `NOTIF_DECISION_ENGINE` is not `off` (default **off**)
- Quiet hours, category toggles, consent
- Unique `(user_id, dedup_key)` for same-content dedup

None of these counted **all** proactive sources toward a 1/day product budget. That was the audit gap.

---

## 3. Re-engagement architecture

Unchanged selector in `lib/notification-engine/src/reengagement/`. Adapter `loadFacts()` now counts **all proactive** `notification_log` rows (status `sent`/`pending`, last 7 days), not only `campaignId=reengagement`.

Live dispatch still requires `NOTIF_REENGAGEMENT_MODE=live` and still uses `dispatchNotification` (`category: engagement`, `campaignId: reengagement`).

---

## 4. Global gate location

**Smallest safe point:** `atomicAcquireDeliverySlot` inside `notificationRateLimitService.ts`, called from `dispatchNotification`.

Why here:

- Every producer already goes through dispatch
- Per-user advisory lock + recount is already atomic
- Dedup fingerprints stay per-content; fatigue counts **across** categories
- Suppression logs `notification_log` with `dedup_key=null` (existing `insertOutcomeLogTx` behaviour) so the same job fingerprint is not permanently burned; the scheduler’s once-per-slot-minute retry will see the cap again and not send

`evaluateGlobalProactiveFatigue()` is a pure function in `lib/notification-engine/src/delivery/global-fatigue.ts`.

---

## 5. Proactive vs transactional classification

**No new categories.** Existing `NOTIFICATION_CATEGORIES` only.

### TRANSACTIONAL / REQUIRED (bypass global 1/day, 4/week, 90-min gap)

| Category | Why this is existing, not invented |
|---|---|
| `routine_item` | Already documented time-sensitive; already bypasses intensity daily cap |
| `infant_care` | Separate infant scheduler (feed / nap / vaccine) with its own `maxPerDay` |

Test sends with `bypassDailyCap: true` also skip the global gate (existing test-ping flag).

### PROACTIVE (share the global budget)

`routine`, `nutrition`, `insights`, `weekly`, `engagement`, `good_night`, `parenting_tips`, `story_time`, `phonics`, `learning_activity`, `milestone`

Includes: existing daily jobs, re-engagement, CRM (if enabled), feature reminders that use `learning_activity` / `insights`, referral reward pushes that use `milestone`.

---

## 6. Daily cap

**Max 1 proactive notification per user per local calendar day** (prefs timezone, default `Asia/Kolkata`).

Counts `notification_log` rows with status `sent` or `pending` in `PROACTIVE_NOTIFICATION_CATEGORIES` whose `sent_at` falls on that local date.

Different fingerprints / categories do **not** bypass this.

**Production effect on the existing scheduler (once this ships):** after the first proactive send of the day (typically `morning_routine` at 07:30 local), later jobs (`parenting_tip` 09:00, `learning_activity` 10:30, … `good_night` 21:00) are **suppressed** with `reason=global_daily_cap`. Previously default intensity allowed **6/day**.

---

## 7. Weekly cap

**Max 4 proactive notifications per rolling 7 days** (absolute `now - 7d`, not calendar week).

**Production effect:** a user who received a proactive send on four of the last seven days is blocked until an older send ages out, even if today’s local daily count is 0.

---

## 8. Minimum gap

**90 minutes** between proactive sends (`recent_notification`).

Same-day this is usually redundant with the daily cap. It matters across midnight (e.g. last send 22:30, next local day 00:40).

Transactional sends do not update this gap for the purpose of *being blocked*, and they do not count as proactive — a feed reminder does not consume the daily slot.

---

## 9. Recent-app-open handling

Same existing signal: `push_tokens.lastSeenAt` (max across devices). **No new telemetry table.**

If the freshest `lastSeenAt` is within 90 minutes, proactive dispatch is suppressed (`recent_app_open`). Re-engagement selector uses the same field as `lastActiveAt`.

Limitation (unchanged): PWA activity without a token refresh is invisible.

Stale tokens: if **every** token’s `lastSeenAt` is ≥ 60 days (same window as `pruneStaleTokens`), dispatch returns `no_tokens` / `stale_token` and does not send.

---

## 10. Privacy behaviour

Re-engagement lock-screen copy no longer interpolates child names.

`plan_ready` TODAY_PLAN title is **“Today's plan is ready.”** not `"{name}'s plan is ready."`  
CHILD_CONTEXT no longer says “a small step for {name}”.

Clinical sanitizer unchanged. Tests assert `John` never appears in any re-engagement category title/body.

Personalization stays in-app.

---

## 11. Dry-run mutation audit

| Path | Writes? |
|---|---|
| `GET /api/notifications/reengagement/dry-run` | **No.** `readOnly: true`. Uses `getPreferencesIfExists` + in-memory schema defaults if missing. |
| `dryRunReengagementSnapshot` | **No.** |
| `runReengagementTick` when mode ≠ `live` | **No** preference insert. Logs only. |
| `evaluateReengagementForUser` when `live` | Still `getOrCreatePreferences` (unchanged production pref behaviour outside dry-run). |
| `pnpm notif:reengagement-dry-run` | Fixture-only; no database. |

Suppressed/throttled **sends** (live dispatch) still insert `notification_log` rows with `dedup_key=null` — that is delivery accounting, not the admin dry-run.

---

## 12. Production user snapshot

**Not available from this Cloud Agent.**

| Attempt | Result |
|---|---|
| Postgres `DATABASE_URL` host `tcl9udyxcuq2zu598ebj0pfu` | DNS `Name or service not known` |
| `GET /api/notifications/reengagement/dry-run` | **401** (no Firebase admin session) |
| Fixture CLI | 6 personas, no send |

| Metric | Production | Fixtures |
|---|---|---|
| Total users evaluated | n/a | 6 |
| Eligible / WOULD_SEND | n/a | 3 |
| Delayed | n/a | 1 (`DELAYED_QUIET_HOURS`) |
| Suppressed / skipped | n/a | 2 (`SUPPRESSED_NO_CANDIDATE`, `SUPPRESSED_PERMISSION`) |
| Candidate mix | n/a | UNFINISHED_ACTION 1, TODAY_PLAN 3 (incl. delay/skip), WINBACK 1 |
| Segments | n/a | NEW_USER 1, ACTIVE 1, INACTIVE_3 2, INACTIVE_7 1, INACTIVE_30 1 |
| Global fatigue hits | n/a | 0 in fixtures (empty history) |

Do not treat fixture counts as production distribution.

---

## 13. Scheduler overlap

After this gate **and** if re-engagement were live:

1. **Same user, same day:** only **one** proactive send. The first successful proactive dispatch wins. Later scheduler jobs, CRM, and re-engagement are suppressed (`global_daily_cap`).
2. **Same hour:** 90-minute gap would also block a second proactive even if daily cap were higher.
3. **`notification_log`:** all proactive categories now participate in the new counts (not only re-engagement).
4. **Dedup:** fingerprints still distinguish morning_routine vs TODAY_PLAN; **fatigue does not care** — they share the budget.
5. **Existing + re-engagement + CRM same day:** **no**, not as *sends*. Two of the three are suppressed after the first proactive. CRM remains default off.

**Priority caveat:** re-engagement’s internal unfinished → plan → … chain is unchanged. Cross-system, **first-in-time at dispatch wins**. `morning_routine` at 07:30 local will usually consume the daily slot before re-engagement at 08:30. A limited live re-engagement test would therefore often be `SUPPRESSED_GLOBAL_DAILY_CAP` for users who still receive morning routine. That is expected with this smallest gate; it is not a second selector.

Transactional `routine_item` / `infant_care` can still stack on top of the one proactive.

---

## 14. CRM overlap

`NOTIF_SEGMENTATION_ENABLED` default **off**. If later set to `enforce`, CRM uses `category: engagement` (proactive) and is covered by the same gate. Max 2 CRM/day in segment config cannot exceed the global 1 proactive/day.

---

## 15. Tests

| ID | Coverage | Where |
|---|---|---|
| A | Scheduler send blocks re-engagement (daily cap) | `global-fatigue.test.ts` + dispatch DB test (skipped without Postgres) |
| B | Re-engagement send blocks scheduler | `global-fatigue.test.ts` |
| C | 60-minute gap | `global-fatigue.test.ts` + `foundation.test.ts` |
| D | 2-hour gap allowed | `global-fatigue.test.ts` |
| E | 4 in 7 days blocks | `global-fatigue.test.ts` |
| F | Different categories share count | `global-fatigue.test.ts` |
| G | `routine_item` / `infant_care` bypass | `global-fatigue.test.ts` |
| H | Quiet hours delay | `foundation.test.ts` |
| I | Permission denied | `foundation.test.ts` |
| J | Stale token | `global-fatigue.test.ts` + `foundation.test.ts` |
| K | Child name absent from lock-screen copy | `foundation.test.ts` |
| L | Dry-run prefs SELECT does not insert | `notificationDispatch.test.ts` (skipped without Postgres) |

`pnpm --filter @workspace/notification-engine test`: **166 pass**, 1 pre-existing fail (`anti-repetition blocks duplicate theme same day` — not this change).

Fixture CLI: `WOULD_SEND` / `DELAYED_QUIET_HOURS` / `SUPPRESSED_*`; title **Today's plan is ready** (no child name).

---

## 16. Build results

| Check | Result |
|---|---|
| `pnpm run typecheck:libs` | pass |
| `pnpm --filter @workspace/api-server typecheck` | pass (`NODE_OPTIONS=--max-old-space-size=8192`) |
| Engine tests | 166 pass / 1 pre-existing fail |
| API `notificationDispatch.test.ts` | 3 pass / 11 skip (no local Postgres) |
| Live FCM | not sent |

---

## 17. Remaining risks

1. **No real production snapshot** — cannot quote eligible volume under the new gate.
2. **Merging this PR changes existing production proactive volume** from intensity 3–12/day to **1/day and 4/week** as soon as the API deploys, even while re-engagement stays dry-run. Monitor disable/unsubscribe after deploy.
3. **First-in-time vs re-engagement priority** — morning_routine will usually win the daily slot.
4. **Referral `milestone` pushes** are classified proactive and can be delayed a day if a scheduler job already sent.
5. **`lastSeenAt` is a proxy** for app open; OS permission deny is still not stored server-side.
6. **Admin dry-run still requires a Firebase admin session** to hit production HTTP.
7. Intensity cap remains as a second line (usually redundant for proactive).

`NOTIF_REENGAGEMENT_MODE` was **not** set to `live`.

---

## FINAL VERDICT

**B — KEEP DRY-RUN ONLY**

Do not enable live re-engagement. Do not start a broad campaign. After a read-only production snapshot (admin session + this gate deployed or evaluated in dry-run rows’ `globalDailyCount`), a later limited test could be considered; this task stops here.
