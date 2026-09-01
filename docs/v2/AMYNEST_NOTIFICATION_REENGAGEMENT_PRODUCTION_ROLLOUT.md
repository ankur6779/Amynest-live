# AmyNest notification re-engagement — production rollout

**Date:** 2026-09-01  
**Operator:** Cursor Cloud Agent (`cursor/notification-reengagement-foundation-78d4`)  
**Founder approval:** YES for single-user canary, required production runtime work, limited live test **after** a successful canary. **NOT** a broad blast.

This document does **not** include test-account email, push tokens, or credentials.

Safety caps remain: 1 proactive/user/day, 4/rolling 7 days, 90-minute gap, quiet hours, permission/token checks, existing dedup, privacy-safe lock-screen copy. Transactional categories (`routine_item`, `infant_care`) stay outside the global proactive budget.

`NOTIF_REENGAGEMENT_MODE` was **not** set to `live`.

---

## CANARY

| Field | Status |
|---|---|
| Approved | YES |
| Target resolved | YES (Firebase Admin `getUserByEmail`; uid hash `b4d77e2ad9d8`) |
| Selector on production | **NO** — `GET /api/notifications/reengagement/dry-run` is 404 on live Coolify API |
| Agent SSH / Coolify token | **NO** — `HETZNER_SSH_KEY` / `COOLIFY_TOKEN` not injected into this VM |
| Direct production Postgres | **NO** — Coolify internal DNS + firewalled `:5432` |
| `/api/notifications/test` | **Not used** |
| Sends | **0** |

### What was added in this branch (not yet on production)

- `GET /api/notifications/reengagement/dry-run?userId=` — one-uid selector, send window and quiet hours apply
- `POST /api/notifications/reengagement/canary` — admin + `{ confirm: "single-user-canary", userId }` — runs `evaluateReengagementForUser` then `dispatchNotification` **only if** `finalAction === WOULD_SEND`. Does not flip global live mode. Optional `NOTIF_CANARY_USER_IDS`.

Coolify API auto-deploys via **Git webhook on `main`**, not this PR branch (`deploy-production.yml`). This agent will not merge the PR.

Clock at last check: ~22:21 Asia/Kolkata. Account quiet hours are 22:00–07:00. After deploy, a window-respecting selector is expected to return **DELAYED_QUIET_HOURS** until morning — that must not be forced.

### CANARY: **BLOCKED**

Not PASSED (nothing dispatched). Not NOT ELIGIBLE (selector did not run on production).

---

## LIMITED LIVE TEST

**NOT STARTED.**

Requires a passing single-user canary first. Global `NOTIF_REENGAGEMENT_MODE=live` was not set. No cohort was enabled. No broadcast.

When started later, the smallest cohort is users who already have push tokens and whom the selector marks `WOULD_SEND` at the preferred local slot — still 1/day, 4/week, 90-minute gap, quiet hours, permission, token, recent-open, dedup. No manual overrides.

---

## MONITORING

Not measured on a live send (send count 0).

Planned metrics after a real send: eligible users, attempted, dispatch success, device delivery where available, opens, open rate, deep-link completion, routine/Amy/plan return, 1-day and 7-day return, unsubscribe/disable, suppression rate, stale-token rate, error rate, duplicate rate.

`notification_opened` is **not** treated as purchase conversion.

---

## EXPANSION DECISION

Do not scale. No safety issue from a send (there was no send). Expansion gate is not applicable.

If live sending is ever on and a safety issue appears: set `NOTIF_REENGAGEMENT_MODE=dry_run` and stop.

---

## Production safety

| Control | Status |
|---|---|
| Pricing / RevenueCat / auth / UI | unchanged |
| Notification architecture | existing `dispatchNotification` only |
| Scheduler architecture | unchanged (fatigue gate still only on this undeployed branch) |
| Broad blast | not started |
| Caps / quiet hours / privacy | not bypassed |

---

# SCOREBOARD

CANARY: **BLOCKED**  
LIMITED LIVE: **NOT STARTED**  
SAFETY: **PASS** (no send; caps and dry_run held)  
DELIVERY: **NOT VERIFIED**  
OPEN: **NOT VERIFIED**  
PURCHASE: **NOT CLAIMED**  

**FINAL: STOP**

Unblock: (1) inject `HETZNER_SSH_KEY` into a **new** Cloud Agent VM, or merge/deploy this branch to Coolify `main` so the canary route exists; (2) run admin `GET .../dry-run?userId=` then `POST .../canary` only if `WOULD_SEND`; (3) wait out quiet hours rather than forcing. Separate Founder check before any limited live cohort.
