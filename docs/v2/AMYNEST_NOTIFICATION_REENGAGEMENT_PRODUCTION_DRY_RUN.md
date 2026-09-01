# AmyNest notification re-engagement — production dry-run report

**Verdict: B — KEEP DRY-RUN ONLY**

**REAL PRODUCTION SNAPSHOT NOT EXECUTED**

Live sending was **not** enabled. `NOTIF_REENGAGEMENT_MODE` was not set to `live`. No product code was changed in this snapshot attempt. No FCM/APNs send was attempted.

Fixture results are in a separate section labeled **FIXTURE ONLY**. They are not production statistics.

---

# REAL PRODUCTION SNAPSHOT

Status: **NOT EXECUTED**

No production user rows were read. No production aggregates exist. Cells below are **not available**, not zero.

## 1. Timestamp

| Field | Value |
|---|---|
| Date | 2026-09-01 |
| Time | 15:52 UTC |
| Operator | Cursor Cloud Agent on branch `cursor/notification-reengagement-foundation-78d4` |

## 2. Production environment

| Check | Result |
|---|---|
| Intended command | `GET /api/notifications/reengagement/dry-run` (existing admin route) |
| Public API `/api/healthz` | 200 `{"status":"ok"}` |
| Admin dry-run without a user session | **401** `Authentication required. Please sign in again.` |
| Firebase CLI / MCP session | **Authenticated User: none** |
| Agent Firebase ID token / admin bearer | **unset** |
| Production Postgres (`DATABASE_URL` Coolify internal DNS) | **DNS failure** (`Name or service not known`) |
| Direct DB snapshot | Not run (unreachable; would also not be the requested HTTP dry-run) |

Legitimate access required: a Firebase ID token whose `userId` is in `ADMIN_USER_IDS`, then `GET /api/notifications/reengagement/dry-run`. This environment has no such signed-in admin session.

Not used (would not be a legitimate admin session): minting a custom token from a service account, weakening `requireAuth`, or calling the database through a new query path.

## 3. Users evaluated

| Metric | REAL PRODUCTION SNAPSHOT |
|---|---|
| Total users evaluated | **NOT EXECUTED** |

## 4. Eligibility

| Metric | REAL PRODUCTION SNAPSHOT |
|---|---|
| Eligible users | **NOT EXECUTED** |
| Would send | **NOT EXECUTED** |
| Suppressed | **NOT EXECUTED** |
| Delayed | **NOT EXECUTED** |
| Skipped | **NOT EXECUTED** |

## 5. Candidate distribution

| Candidate | REAL PRODUCTION SNAPSHOT |
|---|---|
| UNFINISHED_ACTION | **NOT EXECUTED** |
| TODAY_PLAN | **NOT EXECUTED** |
| ROUTINE_CONTINUITY | **NOT EXECUTED** |
| CHILD_CONTEXT | **NOT EXECUTED** |
| AMY (`AMY_COMPANION`) | **NOT EXECUTED** |
| WEEKLY_RECAP | **NOT EXECUTED** |
| WINBACK | **NOT EXECUTED** |
| GENERIC | **NOT EXECUTED** |
| NONE | **NOT EXECUTED** |

## 6. Segment distribution

| Segment | REAL PRODUCTION SNAPSHOT |
|---|---|
| NEW_USER | **NOT EXECUTED** |
| ACTIVE_USER | **NOT EXECUTED** |
| AT_RISK_USER | **NOT EXECUTED** |
| INACTIVE_3_DAYS | **NOT EXECUTED** |
| INACTIVE_7_DAYS | **NOT EXECUTED** |
| INACTIVE_14_DAYS | **NOT EXECUTED** |
| INACTIVE_30_DAYS | **NOT EXECUTED** |
| RETURNED_USER | **NOT EXECUTED** |

## 7. Suppression distribution

| Reason | REAL PRODUCTION SNAPSHOT |
|---|---|
| GLOBAL_DAILY_CAP | **NOT EXECUTED** |
| GLOBAL_WEEKLY_CAP | **NOT EXECUTED** |
| RECENT_NOTIFICATION | **NOT EXECUTED** |
| RECENT_APP_OPEN | **NOT EXECUTED** |
| QUIET_HOURS | **NOT EXECUTED** |
| PERMISSION_DENIED | **NOT EXECUTED** |
| NO_TOKEN | **NOT EXECUTED** |
| STALE_TOKEN | **NOT EXECUTED** |

## 8. Existing scheduler overlap

**Not measured.** No production `notification_log` or dry-run rows were read.

The following production counts are therefore **NOT EXECUTED** (not zero):

| Question | REAL PRODUCTION SNAPSHOT |
|---|---|
| Users with a recent proactive notification | **NOT EXECUTED** |
| Users with 1 proactive notification today | **NOT EXECUTED** |
| Users with 4 proactive notifications in rolling 7 days | **NOT EXECUTED** |
| Users with a notification within 90 minutes | **NOT EXECUTED** |
| Existing scheduler eligibility | **NOT EXECUTED** |
| Re-engagement eligibility | **NOT EXECUTED** |
| Re-engagement candidates that would be suppressed by the global gate | **NOT EXECUTED** |

Scheduler configuration was not changed.

## 9. CRM status

**Not observed on production.** This snapshot did not read production env or CRM enrollments.

This Cloud Agent’s own env has `NOTIF_SEGMENTATION_ENABLED` unset (code default **off**). That is **not** a production CRM measurement.

## 10. Privacy verification

No production payloads were downloaded. No emails, phones, child names, child data, health/speech/behaviour data, push tokens, or credentials are included in this snapshot because **no production rows were returned**.

## 11. Read-only verification

Code review of the existing admin path (no code changed in this attempt):

| Action | `GET /api/notifications/reengagement/dry-run` |
|---|---|
| Auth | `getAuth` + `isAdminUser` (Firebase session; 401 without it) |
| Mode forced | `mode: "dry_run"` |
| Preferences | `getPreferencesIfExists` (SELECT) or in-memory `dryRunDefaultPreferences` — **no INSERT** |
| `dispatchNotification` | **not called** (`dry_run` ≠ `live`) |
| `atomicAcquireDeliverySlot` | **not called** |
| FCM / APNs | **not called** |
| `notification_log` INSERT/UPDATE/DELETE | **not called** on this path |
| `push_tokens` mutation | **not called** (SELECT `userId` / `lastSeenAt` only via `loadFacts`) |
| Outcome / children / routines | SELECT only in `loadOutcomeSignals` / `loadFacts` |

Process logs (`notification_reengagement_dry_run`) are stdout, not table writes.

This verification is of **source behaviour**. It is not a production query audit trail, because the endpoint was never successfully invoked.

## 12. Unexpected findings

1. Public API is up (`/api/healthz` 200) but the dry-run route is unreachable without a signed-in admin.
2. Firebase MCP has **no** authenticated user, so there is no existing admin session to reuse.
3. Production Postgres remains on Coolify internal DNS and is not resolvable from this agent.
4. A service-account JSON is present in agent env; it was **not** used to mint an admin ID token (that would impersonate, not use an existing session).
5. No production statistics were invented.

---

# FIXTURE ONLY

The following numbers are from `pnpm notif:reengagement-dry-run` on **2026-09-01 15:52 UTC**. The CLI does **not** query a database. These are **not** production users.

## Fixture users evaluated

6 synthetic personas.

## Fixture eligibility

| Action | Count | Fixture ids |
|---|---|---|
| Would send (`WOULD_SEND`) | 3 | `user-new`, `user-week`, `user-month` |
| Delayed (`DELAYED_QUIET_HOURS`) | 1 | `user-quiet` |
| Skipped | 2 | `user-active` (`SUPPRESSED_NO_CANDIDATE`), `user-denied` (`SUPPRESSED_PERMISSION`) |

## Fixture segments

| Segment | Count |
|---|---|
| NEW_USER | 1 |
| ACTIVE_USER | 1 |
| AT_RISK_USER | 0 |
| INACTIVE_3_DAYS | 2 |
| INACTIVE_7_DAYS | 1 |
| INACTIVE_14_DAYS | 0 |
| INACTIVE_30_DAYS | 1 |
| RETURNED_USER | 0 |

## Fixture candidates (winner on the row)

| Candidate | Count |
|---|---|
| UNFINISHED_ACTION | 1 |
| TODAY_PLAN | 3 (1 would-send, 1 delay, 1 skip-with-candidate) |
| ROUTINE_CONTINUITY | 0 as winner |
| CHILD_CONTEXT | 0 |
| AMY | 0 as winner |
| WEEKLY_RECAP | 0 |
| WINBACK | 1 |
| GENERIC | 0 |
| NONE | 1 |

## Fixture suppression / delay

| Reason | Count |
|---|---|
| GLOBAL_DAILY_CAP | 0 |
| GLOBAL_WEEKLY_CAP | 0 |
| RECENT_NOTIFICATION | 0 |
| RECENT_APP_OPEN | 0 |
| QUIET_HOURS | 1 |
| PERMISSION_DENIED | 1 |
| NO_TOKEN | 0 |
| STALE_TOKEN | 0 |
| NO_CANDIDATE | 1 |

Fixture history is empty, so global-gate suppressions do not appear. That is **not** evidence about production overlap.

## Fixture lock-screen copy

No child names. `plan_ready` title: “Today's plan is ready.”

## Fixture scheduler overlap

**Not applicable.** Fixtures have no existing scheduler log.

---

# Live sending

Keep blocked. Do not set `NOTIF_REENGAGEMENT_MODE=live`. The founder must separately approve any live test after a real production snapshot exists.

---

# FINAL GATE

**B — KEEP DRY-RUN ONLY**

**REAL PRODUCTION SNAPSHOT NOT EXECUTED**
