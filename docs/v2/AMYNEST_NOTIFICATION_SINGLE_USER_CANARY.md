# AmyNest notification — single-user canary

**Verdict: C — CANARY BLOCKED — PRODUCTION RUNTIME UNAVAILABLE**

**Canary approved: YES** (Founder, 2026-09-01 — this one account only; not broad live re-engagement)

No notification was sent. Broad re-engagement was not enabled. `NOTIF_REENGAGEMENT_MODE` was not set to `live`. Existing scheduler behaviour was not changed. No other user was targeted.

This document does **not** include the test account email, push tokens, or authentication secrets.

---

## 1. Test date / time

| Field | Value |
|---|---|
| Date | 2026-09-01 |
| Attempt 1 | 15:58–16:00 UTC |
| Attempt 2 (Founder-approved send) | 16:08–16:15 UTC |
| Local time at selector-check (account timezone) | 21:44 Asia/Kolkata |
| Operator | Cursor Cloud Agent on branch `cursor/notification-reengagement-foundation-78d4` |

## 2. Target resolved

**YES.** Existing Firebase Admin `adminAuth().getUserByEmail` resolved the requested authorized test account. Uid was not guessed.

| Field | Value |
|---|---|
| Lookup mechanism | Existing `adminAuth().getUserByEmail` |
| Resolved | Yes |
| Disabled | false |
| Email verified | false |
| Stable internal identifier (SHA-256 prefix of uid) | `b4d77e2ad9d8` |
| Guessed uid | **No** |
| Target is `ADMIN_USER_IDS` | No |

Attempt 2 used the existing smoke-test path (`createCustomToken` + Identity Toolkit exchange) to obtain a Firebase ID token for **this uid only**, then called the live Coolify API. That is the same helper as `scripts/render-to-coolify/mint-smoke-firebase-token.sh`. It is not a second notification sender.

## 3. Production runtime

| Path | Result |
|---|---|
| Agent `DATABASE_URL` (Coolify internal Docker DNS) | Unreachable (`ENOTFOUND` / timeout) |
| Coolify host Postgres proxy `:5432` | Timed out from this agent (SSH `:22` and Coolify UI `:8000` reachable; no SSH key / Coolify token in this environment) |
| Live Coolify API (`/api/healthz`) | **200** `{"status":"ok"}` |
| `GET /api/healthz/env` with existing `x-health-secret` | **200**, profile PROD, `NOTIFICATIONS_ENABLED=true`, scheduler owner on Coolify |
| `GET /api/notifications/categories` as the resolved user | **200** (production DB reachable **through** this API) |
| `GET /api/notifications/reengagement/dry-run` as allowlisted admin | **404** — handler not deployed on production api-server |
| `GET /api/notifications/diagnostics` | **500** generic fallback |
| `GET /api/notifications/history` | **500** generic fallback |
| `GET /api/notifications/analytics` | **500** generic fallback |

Production HTTP is up. The **re-engagement selector and single-user selector-copy dispatch are not on that runtime.** Deploying this branch to get them would also ship the global fatigue gate and would change existing scheduler volume — that deploy was **not** done.

`POST /api/notifications/test` exists on production and can target the authenticated user via `dispatchNotification`, but it uses hardcoded test copy, bypasses daily cap / quiet hours / category / consent, and does not run the selector. It was **not** called.

## 4. Selector result

**Not executed.** Production has no `evaluateReengagementForUser` HTTP handler. Agent cannot open production Postgres. Partial reconstruction from other APIs was **not** used to authorize a send.

Clock-only observation (not a selector `finalAction`): at 21:44 Asia/Kolkata the policy send window is 08:00–20:00, so a window-respecting run would not be `WOULD_SEND`. Quiet hours for this account are 22:00–07:00 (not yet active at 21:44). This was **not** treated as an official skip code.

| Expected `finalAction` | Observed |
|---|---|
| WOULD_SEND | not run |
| DELAYED_QUIET_HOURS | not run |
| DELAYED_SEND_WINDOW | not run (clock is outside window; selector did not confirm) |
| SUPPRESSED_GLOBAL_DAILY_CAP | not run |
| SUPPRESSED_GLOBAL_WEEKLY_CAP | not run |
| SUPPRESSED_RECENT_NOTIFICATION | not run |
| SUPPRESSED_RECENT_APP_OPEN | not run |
| SUPPRESSED_PERMISSION | not run |
| SUPPRESSED_NO_TOKEN | not run |
| SUPPRESSED_STALE_TOKEN | not run |
| NONE | not run |

Because the result was not `WOULD_SEND`, **no send was forced.**

## 5. Selected candidate

**Not available.**

| Field | Value |
|---|---|
| Segment | not run |
| Candidate / notification category | not run |
| Priority | not run |
| Destination / deep link | not run |
| Experiment variant | not run |
| Timezone (prefs API) | `Asia/Kolkata` |
| Quiet hours (prefs API) | `22:00`–`07:00` |
| Engagement opt-in (prefs API) | true |
| Preferred hour (prefs API) | 9 |
| Push consent timestamp | null |
| Permission state | unknown (diagnostics 500) |
| Push-token state | web-only status `registered: false`; iOS/Android token state unknown |
| Global daily count | unknown (history 500) |
| Global weekly count | unknown (history 500) |
| Last proactive notification | unknown |
| Recent-open state | unknown |
| finalAction | not run |

Notification preferences were **not** PATCHed. `GET /api/notifications/categories` is an existing read that lazily creates defaults on first request; the returned preferred hour (9) and daily cap (12) match a configured account rather than a blank insert. No preference fields were written by this agent.

## 6. Deep link

**Not selected.** No send.

## 7. Dispatch result

**Not attempted.** No FCM/APNs request.

`NOTIF_REENGAGEMENT_MODE` remains unset in this agent (code default `dry_run`) and was **not** set to `live` on production.

## 8. Device-delivery status

**None.** No dispatch. Do not treat this as delivery.

## 9. Notification-open status

**None.** No notification existed to tap.

Tester checklist (when a later canary actually sends):

- notification appears
- title/body match selector copy
- no sensitive lock-screen data
- tap opens the selector destination
- app closed / backgrounded / already open

Do not send a second notification for another app state unless explicitly approved.

## 10. Duplicate check

**N/A — no send.** No retry. No second path.

## 11. Global fatigue check

**Not measured.** `notification_log` could not be read (history/analytics 500). No slot was claimed.

## 12. Other-user safety check

| Check | Result |
|---|---|
| Exactly one AmyNest user targeted for send | Yes — send count **0**; only this uid was authenticated for reads |
| No other user targeted | Confirmed |
| No global campaign activated | Confirmed |
| `NOTIF_REENGAGEMENT_MODE` remains `dry_run` | Confirmed (not set to `live`) |
| Existing scheduler enabled/modified | **No** |

## 13. Analytics attribution

**Not verified on a send.** No `notification_id`.

Open is not treated as purchase/conversion in existing code (`POST /api/notifications/opened` vs subscription analytics).

## 14. Privacy check

No lock-screen payload was generated. No email, tokens, child names, or credentials were committed.

## 15. Limitations

1. Founder approved a single-user send. This agent reached the live Coolify API with an authorized Firebase session for that uid and the allowlisted admin uid.
2. Direct production Postgres (internal DNS and host `:5432` proxy) is not usable from this agent. SSH to the Coolify host requires a key this environment does not have.
3. The re-engagement dry-run/send path from this branch is **not deployed** (404). Shipping this PR to production would also apply the global 1/day fatigue gate to the existing scheduler; that was not done.
4. `POST /api/notifications/test` was not used: wrong copy, bypasses selector and caps.
5. A second FCM sender was not added.
6. Token, fatigue, and recent-open state could not be proven (diagnostics/history 500). Guessing is forbidden.

---

## Production safety after this attempt

| Control | Status |
|---|---|
| Founder single-user canary approval | YES |
| `NOTIF_REENGAGEMENT_MODE` | not `live` |
| Broad re-engagement | not enabled |
| Scheduler config | unchanged |
| Sends this run | **0** |
| Founder multi-user live test | **not started** |

---

# FINAL VERDICT

**C — CANARY BLOCKED — PRODUCTION RUNTIME UNAVAILABLE**

Not A: nothing was delivered.  
Not B: the selector did not return a suppression code (it is not on production).  
Not D: dispatch was not accepted.

Keep `NOTIF_REENGAGEMENT_MODE=dry_run`. Do not send to any other user.

See `docs/v2/AMYNEST_NOTIFICATION_REENGAGEMENT_PRODUCTION_ROLLOUT.md`. This branch adds admin `POST /api/notifications/reengagement/canary`. Live Coolify still 404s that route. Account quiet hours are 22:00–07:00 Asia/Kolkata.

After the route is deployed, wait for separate Founder approval before any multi-user/live cohort.
