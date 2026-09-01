# AmyNest notification — single-user canary

**Verdict: C — CANARY BLOCKED — INFRASTRUCTURE/SAFETY ISSUE**

No notification was sent. Broad re-engagement was not enabled. `NOTIF_REENGAGEMENT_MODE` was not set to `live`. Existing scheduler behaviour was not changed. No other user was targeted.

This document does **not** include the test account email, push tokens, or authentication secrets.

---

## 1. Test date / time

| Field | Value |
|---|---|
| Date | 2026-09-01 |
| Time | 15:58–16:00 UTC |
| Operator | Cursor Cloud Agent on branch `cursor/notification-reengagement-foundation-78d4` |

## 2. User resolved successfully

**Yes — identity only.** Existing Firebase Admin `adminAuth().getUserByEmail` resolved the requested authorized test account.

| Field | Value |
|---|---|
| Lookup mechanism | Existing `adminAuth().getUserByEmail` (`artifacts/api-server/src/lib/firebase-admin.ts`) |
| Resolved | Yes |
| Disabled | false |
| Email verified | false |
| Stable internal identifier (SHA-256 prefix of uid) | `b4d77e2ad9d8` |
| Guessed uid | **No** |

The uid was **not** guessed. Lookup was not written to application logs beyond this one-off process stdout.

**Stopped before eligibility:** production Postgres used by `dispatchNotification` / `evaluateReengagementForUser` is on Coolify internal Docker DNS (`tcl9udyxcuq2zu598ebj0pfu:5432`). From this agent that hostname does not resolve. Push tokens, `notification_log`, and preferences therefore cannot be read or written through the existing dispatch path.

No HTTP impersonation, custom-token mint, or new sender was added to work around that.

## 3. Dry-run result

**Not executed** (database unreachable).

| Expected `finalAction` | Observed |
|---|---|
| WOULD_SEND | not run |
| DELAYED_QUIET_HOURS | not run |
| SUPPRESSED_GLOBAL_DAILY_CAP | not run |
| SUPPRESSED_GLOBAL_WEEKLY_CAP | not run |
| SUPPRESSED_RECENT_NOTIFICATION | not run |
| SUPPRESSED_RECENT_APP_OPEN | not run |
| SUPPRESSED_PERMISSION | not run |
| SUPPRESSED_NO_TOKEN | not run |
| SUPPRESSED_STALE_TOKEN | not run |
| NONE | not run |

Because dry-run was not `WOULD_SEND`, **no send was forced**.

## 4. Selected candidate

**Not available.** Selector did not run.

| Field | Value |
|---|---|
| Segment | not run |
| Candidate | not run |
| Priority | not run |
| Destination | not run |
| Notification type | not run |
| Experiment variant | not run |
| Timezone | not run |
| Permission state | not run |
| Push-token state | not run |
| Global daily count | not run |
| Global weekly count | not run |
| Last proactive notification | not run |
| Recent-open state | not run |
| finalAction | not run |

Notification preferences were **not** modified.

## 5. Deep link

**Not selected.** No send.

## 6. Dispatch result

**Not attempted.** Existing `dispatchNotification` requires the production database (tokens, claim slot, `notification_log`). That API can target exactly one `userId`, but this environment cannot reach the database. Instructions: stop rather than improvise a second sender.

`NOTIF_REENGAGEMENT_MODE` remains unset here (code default `dry_run`). It was **not** set to `live`.

## 7. Device-delivery evidence

**None.** No FCM/APNs request was made.

Do not treat this as delivery. There is no “DISPATCH VERIFIED” either.

## 8. Open / deep-link evidence

**None.** No notification existed to tap.

Tester checklist (for a future canary that actually sends):

- notification appears
- title/body match selector copy
- no sensitive lock-screen data
- tap opens the selector destination
- app closed / backgrounded / already open

Do not send a second notification for another app state unless explicitly approved.

## 9. Duplicate check

**N/A — no send.** No retry loop was started.

## 10. Global fatigue check

**Not measured.** No `notification_log` read or write.

## 11. Other-user safety check

No dispatch ran. No campaign tick was enabled. No other user was passed to `dispatchNotification`.

## 12. Analytics attribution

**Not verified on a send.** There was no `notification_id`, category, destination, or variant on a live payload.

Open is not treated as purchase/conversion in existing code (`POST /api/notifications/opened` vs subscription analytics). That path was not exercised.

## 13. Privacy check

No lock-screen payload was generated for this account in this run. No email, tokens, or child data were committed.

## 14. Limitations

1. Firebase Admin can resolve the test account; this Cloud Agent **cannot** reach production Postgres.
2. Public API `/api/healthz` is up, but there is **no** existing authenticated single-user re-engagement dry-run/send HTTP that this agent can call without minting a user session.
3. Eligibility, quiet hours, tokens, and global fatigue all live in the database. Without it, a canary would be a guess. Guessing is forbidden.
4. Device delivery on hardware was not attempted.

---

## Production safety after this attempt

| Control | Status |
|---|---|
| `NOTIF_REENGAGEMENT_MODE` | not `live` |
| Broad re-engagement | not enabled |
| Scheduler config | unchanged |
| Sends this run | **0** |
| Founder multi-user live test | **not started** |

---

# FINAL VERDICT

**C — CANARY BLOCKED — INFRASTRUCTURE/SAFETY ISSUE**

Not A: nothing was delivered.  
Not B: eligibility was not evaluated (not a selector skip).  
Not D: dispatch was not accepted.

Keep `NOTIF_REENGAGEMENT_MODE=dry_run`. Do not send to any other user. Stop and wait for Founder approval and a runtime that can use existing `dispatchNotification` against production data for this one uid.
