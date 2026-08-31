# AmyNest notification re-engagement — production dry-run report

**Verdict: B — KEEP DRY-RUN ONLY**

Live sending was **not** enabled. `NOTIF_REENGAGEMENT_MODE` was not set to `live`. Existing notification delivery was not modified. Product UI was not modified.

---

## 1. Date / time of dry-run

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Time | 17:26 UTC (fixture CLI); 17:23–17:28 UTC (production access attempts) |
| Operator | Cursor Cloud Agent on branch `cursor/notification-reengagement-foundation-78d4` |

## 2. Environment

| Layer | What was used | Result |
|---|---|---|
| Selector CLI | `pnpm notif:reengagement-dry-run` | Ran successfully. **Fixture-only** — does not query a database. |
| Admin HTTP | `GET /api/notifications/reengagement/dry-run` on the public API host | **401 Unauthorized** without a Firebase admin session. Global auth fires before admin check. A fake path also 401s, so this is **not** proof the new route is deployed. |
| Production Postgres | `DATABASE_URL` host is Coolify **internal Docker DNS** (`tcl9udyxcuq2zu598ebj0pfu:5432`) | **Unreachable** from this agent (`ENOTFOUND` / timeout). No production user rows were read. |
| Public site | `https://www.amynest.in` | Cloudflare challenge (403 HTML). Not used. |
| Agent env | `NOTIF_REENGAGEMENT_MODE` unset → code default `dry_run`; `NOTIFICATIONS_ENABLED=true`; `NOTIF_SEGMENTATION_ENABLED` unset → CRM **off**; `NOTIF_DECISION_ENGINE` unset → **off** | No live re-engagement send path was armed in this run. |
| Shipped example env | `.env.development.example` | `NOTIF_REENGAGEMENT_MODE=dry_run` |

**Why production users were not evaluated:** the existing CLI is fixture-only by design (`lib/notification-engine/src/reengagement/cli-dry-run.ts`). The existing admin snapshot `dryRunReengagementSnapshot()` is the production query path, but it requires (a) network to the production DB or a deployed API plus (b) an admin Firebase session. This environment has neither. A new query system was **not** created.

**Safety note (why we did not force a DB query even if DNS had resolved):** `evaluateReengagementForUser` / `dryRunReengagementSnapshot` call `getOrCreatePreferences(userId)`, which **INSERT**s a `notification_preferences` row when missing. That is a write. A true production dry-run should be read-only.

No notification was sent.

---

## 3. Total users evaluated

| Population | Count |
|---|---|
| Real production users (push-token accounts) | **0 — not available** |
| Fixture personas (CLI) | **6** |

Production totals below are therefore **not available**. Fixture counts are labeled as fixtures.

## 4. Eligible users

**Production:** not available.

**Fixtures (n=6):**

| Action | Count | Fixture ids |
|---|---|---|
| Eligible / `would_send` | 3 | `user-new`, `user-week`, `user-month` |
| Delayed | 1 | `user-quiet` |
| Skipped | 2 | `user-active`, `user-denied` |

---

## 5. Candidate distribution

**Production:** not available.

Requested buckets, with fixture winner counts. Extra engine category `ROUTINE_CONTINUITY` is reported separately; it is not in the original request table.

| Candidate | Production | Fixtures (winner) |
|---|---|---|
| UNFINISHED_ACTION | n/a | 1 |
| TODAY_PLAN | n/a | 3 (1 send, 1 delay, 1 skip-with-candidate) |
| CHILD_CONTEXT | n/a | 0 |
| AMY (`AMY_COMPANION`) | n/a | 0 as winner |
| WEEKLY_RECAP | n/a | 0 |
| WINBACK | n/a | 1 |
| GENERIC (`GENERIC_REMINDER`) | n/a | 0 |
| NONE | n/a | 1 |
| DELAYED | n/a | 1 |
| SKIPPED | n/a | 2 |
| ROUTINE_CONTINUITY (extra rung) | n/a | 0 as winner |

Notes:

- `GENERIC_REMINDER` is only added when **no** higher candidate exists and the user is not `ACTIVE_USER`.
- `CHILD_CONTEXT` speech path (`hasSpeechPracticeDue`) is implemented in the engine but the production adapter hard-codes `hasSpeechPracticeDue: false` in `loadFacts()`. That path was not exercised against real users.

## 6. Segment distribution

**Production:** not available.

| Segment | Production | Fixtures |
|---|---|---|
| NEW_USER | n/a | 1 |
| ACTIVE_USER | n/a | 1 |
| AT_RISK_USER | n/a | 0 |
| INACTIVE_3_DAYS | n/a | 2 |
| INACTIVE_7_DAYS | n/a | 1 |
| INACTIVE_14_DAYS | n/a | 0 |
| INACTIVE_30_DAYS | n/a | 1 |
| RETURNED_USER | n/a | 0 |

---

## 7. Delay / skip reasons

**Production:** not available.

Fixture skip/delay codes:

| Fixture | Action | skipCode | Why |
|---|---|---|---|
| `user-active` | skip | `no_eligible_candidate` | Active user, plan already opened, no unfinished action |
| `user-denied` | skip | `permission_denied` | `permissionGranted: false` |
| `user-quiet` | delay | `quiet_hours` | Local 22:30 inside 22:00–07:00; candidate retained (`TODAY_PLAN`) |

Unit-tested codes not in the 6-persona CLI: `no_token`, `opted_out`, `daily_cap`, `weekly_cap`, `recent_app_open`, `outside_send_window`, `cooldown` (category-level reject, then fall-through).

**Reporting gap:** `formatDryRunRow` sets `cooldown: BLOCK` only when `skipCode === "cooldown"`, but the engine never uses that skip code — it rejects the cooled-down category and may pick the next. Dry-run rows therefore show `Cooldown: PASS` even when a category was cooldown-rejected.

---

## 8. Anti-spam validation

Selector policy (`REENGAGEMENT_POLICY`) is implemented and unit-tested:

| Rule | Engine | Production-adapter evidence | Real-user proof |
|---|---|---|---|
| Max 1 proactive / day | `sentProactiveToday < 1` | Counts only `campaignId === "reengagement"` **or** `dedup_key` containing `_reengagement_` | **Not proven on production users** |
| Max 4 / week | `sentProactiveThisWeek < 4` | Same filter, last 7 days of `sent`/`pending` | **Not proven** |
| Category cooldown | `CATEGORY_COOLDOWN_MS` per category; fall-through allowed | `lastSentByCategory` from re-engagement log rows only | **Not proven** |
| 90-minute recent-open suppression | `lastActiveAt` vs now | `lastActiveAt` = max `push_tokens.lastSeenAt`, **not** an app-open event table | **Not proven**; proxy may miss opens or treat token refresh as an open |
| Quiet hours | delay, keep candidate | Uses existing prefs `quietHoursStart`/`End` | Fixture delay PASS |
| Permission denial | skip | Adapter sets `permissionGranted: true` if **any token row exists**. OS deny is not stored server-side | **Cannot distinguish OS deny from stale token** when a row exists |
| Stale token | dispatch prune exists on send | Dry-run does not prune; live send uses existing FCM failure prune | **Not proven** in this dry-run (no send) |
| Duplicate candidates collapse to one | `eligible.sort` by priority; one winner | Fingerprint is per `(child, reengagement, category, localDate)` | Unit test PASS; production unproven |

**Critical finding vs intended experience:** the 1/day and 4/week caps apply **only to the new re-engagement campaign**. Existing scheduler jobs (morning_routine, parenting_tip, …) **do not** increment `sentProactiveToday`. A user can still receive existing-engine notifications **plus** a re-engagement candidate on the same day.

Existing delivery guard (unchanged): 15/account/day, 3/hour, intensity 3/6/9/12 depending on prefs. Default intensity **balanced = 6/day**. Decision-engine 90-minute gap (`NOTIF_DECISION_ENGINE`) defaults **off**, so it does not suppress the existing scheduler.

---

## 9. Existing scheduler overlap

**Do not fix in this step. Evidence only.**

Both ticks run every minute when `NOTIFICATIONS_ENABLED` is not false:

- `global_notification_tick` → `runGlobalScheduleTick`
- `reengagement_tick` → `runReengagementTick`

Both iterate users with `push_tokens` rows.

### 9.1 Can both systems target the same user on the same day?

**Yes.** There is no shared “already notified today” gate between them. Re-engagement caps ignore non-reengagement `notification_log` rows.

When `NOTIF_REENGAGEMENT_MODE=live`, the global scheduler **skips only** `engagement_sweep` (19:00 local). All other jobs still run: morning_routine 07:30, parenting_tip 09:00, learning_activity 10:30, milestone 11:00, amy_insight 12:30, snack 15:30, phonics 16:00, dinner 18:30, story_time 20:00, good_night 21:00, weekly Sunday 10:00, plus routine_item / infant / feature schedulers.

### 9.2 Can they target the same user within the same hour?

**Yes.** Re-engagement preferred slot is **08:30 local**. Existing `morning_routine` is **07:30** (critical, not smart-shifted). `parenting_tip` is **09:00**. CRM (if later enabled) uses morning hour **08** by default (`NOTIF_CRM_MORNING_HOUR`), i.e. the 08:00 local hour — same hour as 08:30 re-engagement.

`NOTIF_DECISION_ENGINE` default `off` means `MIN_GAP_MINUTES = 90` in `decideNotification` is unused for the existing scheduler.

### 9.3 Does existing `notification_log` participate in the new selector’s suppression?

**Only re-engagement rows.** Filter:

```
campaignId === "reengagement" OR dedup_key contains "_reengagement_"
```

Morning routine, insights, nutrition, etc. do **not** count toward 1/day or 4/week, and do **not** populate `lastSentByCategory` for cooldowns.

Reverse direction: a **live** re-engagement send uses `category: "engagement"`, so it **does** count toward the **existing** intensity daily cap (3–12) and the account guard (15/day).

### 9.4 Are categories globally deduplicated or only re-engagement deduplicated?

**Per fingerprint, not global one-per-day.** `TODAY_PLAN` fingerprint ≠ `morning_routine` job fingerprint. Same user can get both “today’s plan” flavours on the same day.

Within re-engagement, multiple triggers collapse to **one** winner. Dispatch `ON CONFLICT (user_id, dedup_key)` blocks the same fingerprint twice.

### 9.5 Could a user receive existing + re-engagement + CRM in the same day?

**Yes, if CRM is enabled.** Code path: `runSegmentJourneyForUser` runs **before** scheduled jobs in the same tick. Default `NOTIF_SEGMENTATION_ENABLED` / `segmentationMode()` is **off** (`enabled: false`). Pre-signup CRM is a separate anonymous-device path (`NOTIF_PRESIGNUP_SERVER_FCM` default false).

If CRM is later set to `enforce`, default cap is **2 non-critical CRM / day**, morning hour 8 and evening hour 18 — combinable with scheduler jobs and a live re-engagement send.

**Same-day stack (code, not production counts):**

1. Existing scheduler job(s) — up to intensity 3–12, plus routine_item / infant bypasses  
2. Re-engagement (only if mode=`live`) — +1 at 08:30  
3. CRM journey step (only if segmentation enabled) — up to 2/day  

---

## 10. Deep-link validation

No new routes were invented. Destinations vs `artifacts/kidschedule/src/AppCore.tsx`:

| Category / intent | Selector destination | Route exists? |
|---|---|---|
| TODAY_PLAN | `/routines` | **Yes** (`/routines`) |
| UNFINISHED_ACTION (onboarding incomplete) | `/routines/generate` | **Yes** |
| UNFINISHED_ACTION (unfinished lessons) | `/study` | **Yes** |
| UNFINISHED_ACTION (routine opened, not started) | `/routines` | **Yes** |
| CHILD_CONTEXT (missed yesterday) | `/routines` | **Yes** |
| CHILD_CONTEXT (speech due) | `/speech-coach` | **Yes** — **unused in production adapter** (`hasSpeechPracticeDue` always false) |
| AMY_COMPANION | `/assistant` | **Yes** |
| WEEKLY_RECAP | `/progress` | **Yes** |
| WINBACK / GENERIC / hub fallback | `/parenting-hub` | **Yes** (living-room / hub) |
| ROOM (requested) | *no ROOM category* | N/A — hub is `/parenting-hub` |
| Pricing / paywall | never selected | Confirmed in unit tests |

**Mismatch vs the example table (not an invalid route):** `UNFINISHED_ACTION` is **not always** `/routines/generate`. Only incomplete onboarding uses generate. Unfinished lessons go to `/study`.

All selected paths are existing authenticated app routes. Conditional availability (feature flags, child required) was not production-sampled.

---

## 11. Privacy validation

Sampled payloads: fixture CLI titles/bodies + `rawCopy()` / `sanitizeLockScreenCopy()`.

| Risk | Result |
|---|---|
| Speech difficulties on lock screen | **PASS** — clinical terms rewritten; speech-due copy is generic “next step”; adapter never sets speech-due |
| Health information | **PASS** — sanitizer matches `health issue`, `medication`, `diagnos`, etc. |
| Behavioural concerns | **PASS** — `behavioural/behavioral/behavior problem` rewritten |
| Sensitive child clinical detail | **PASS** for listed clinical patterns |
| Private family information | **PASS** on sampled copy — no addresses, no school names, no diagnoses |
| Email / phone / tokens in dry-run row | **PASS** — rows use internal `userId` only; tokens not printed |

**Residual (not a FAIL on the clinical list):** `plan_ready` TODAY_PLAN copy may include a **child first name** (`{name}'s plan is ready`). First names are allowed by `safeChildFirstName`. That is lock-screen PII, not clinical.

**Privacy audit: PASS** (clinical / health / behaviour / family secrets). Residual first-name on lock screen is by current policy.

---

## 12. Analytics validation

When a candidate is selected, dry-run / dispatch attach:

| Field | Source | Present? |
|---|---|---|
| notification_id / fingerprint | `contentFingerprint(childId, "reengagement", category, localDate)` | Yes on candidates |
| notification_type / category | `c.category` + dispatch `category: "engagement"` | Yes |
| destination | `c.copy.deepLink` | Yes |
| variant | `c.copy.variant` (`plan_ready` \| `next_right_thing`) | Yes |
| attribution id | FCM data `fingerprint`; `campaign: reengagement`; `POST /api/notifications/opened` | Wired in code |

Open path: tap → `use-notification-deep-link` → `recordNotificationOpened({ fingerprint, category, destination })` → `POST /api/notifications/opened` → `notification_log.opened_at` + fatigue `lastOpenedAt`. Does **not** call `trackSubscriptionEvent`, Firebase `purchase`, or `recordNotificationOutcome`.

Business outcomes (routine completed, `subscription_started`, …) stay on `POST /api/notifications/outcome` — separate.

Taxonomy: `notification_opened` is mapped to **growth**, not a purchase conversion event.

**Analytics validation: PASS in code.** Not proven on a real production open (no send).

Gap: client `recordNotificationOpened` does not currently send `experiment_variant` in the POST body; variant lives on the log row from send-time `outcomeMeta`.

---

## 13. A/B distribution

Experiment id: `reengagement_copy_v1`. Assignment: `assignExperimentVariant(userId, experimentId, variants)` — hash of `userId:reengagement_copy_v1`, not per-request random.

| Check | Result |
|---|---|
| Same user, two calls | Identical (`user-week` → `plan_ready` twice) |
| Fixture `user-denied` | `next_right_thing` |
| Synthetic `user-0`…`user-199` | `plan_ready`: **100**, `next_right_thing`: **100** |

**Production A/B counts: not available.**

| Variant | Production | Fixtures with a copy variant on the row | Synthetic n=200 |
|---|---|---|---|
| plan_ready | n/a | 3 (`user-new` assignment, `user-week`, `user-quiet`) | 100 |
| next_right_thing | n/a | 1 (`user-denied`) | 100 |

`UNFINISHED_ACTION` / `WINBACK` copy does not change wording by variant, but the variant is still assigned and stored when sent.

No random per-request assignment.

---

## 14. Representative anonymized examples

Internal fixture ids only. No email, phone, child records, or tokens.

### Example A — unfinished wins

- User: `user-new`
- Segment: `NEW_USER` (free)
- Candidate: `UNFINISHED_ACTION`
- Reason: `unfinished_flow`
- Action: `would_send`
- Deep link: `/routines/generate`
- Scheduled local: `08:30` (UTC fixture)
- Cooldown / recent-open / token / permission: PASS
- Title: “Your next step is still here”
- Body: “You can pick this up whenever you're ready — no rush.”

### Example B — today’s plan

- User: `user-week`
- Segment: `INACTIVE_7_DAYS`
- Candidate: `TODAY_PLAN`
- Reason: `today_plan_ready_unopened`
- Deep link: `/routines`
- Variant: `plan_ready`
- Title: “John's plan is ready” (fixture first name)
- Body: “A calmer day starts with one small step.”

### Example C — win-back when nothing higher qualifies

- User: `user-month`
- Segment: `INACTIVE_30_DAYS`
- Candidate: `WINBACK`
- Reason: `winback_32d`
- Deep link: `/parenting-hub`

### Example D — skip / delay gates

- `user-active`: skip `no_eligible_candidate`
- `user-quiet`: delay `quiet_hours`, candidate still `TODAY_PLAN`
- `user-denied`: skip `permission_denied`

Priority unit test (not a production user): unfinished lesson + today’s plan + win-back eligibility → winner **`UNFINISHED_ACTION`**, not `TODAY_PLAN` or `WINBACK`.

---

## 15. Unexpected behaviour

1. **Production user snapshot could not be taken** from this environment (fixture CLI; unreachable DB; unauthenticated admin API).
2. **Admin dry-run is not read-only** — `getOrCreatePreferences` can insert prefs.
3. **1/day and 4/week do not include the existing scheduler.** Combined frequency can exceed the new policy without any selector bug.
4. **OS permission deny is not observable** if a `push_tokens` row exists (`permissionGranted` forced true).
5. **Recent-open uses token `lastSeenAt`**, not a dedicated app-open event.
6. **Cooldown is invisible in dry-run row** (`skipCode` never `"cooldown"`).
7. Extra priority rung **`ROUTINE_CONTINUITY`** sits between child context and Amy.
8. Speech / ROOM categories from the example table are not first-class winners in this taxonomy (`ROOM` absent; speech unused in adapter).
9. `UNFINISHED_ACTION` deep link is context-dependent (`/routines/generate` vs `/study` vs `/routines`).
10. This Cloud Agent’s `DATABASE_URL` points at production-shaped Coolify DNS but cannot resolve it; `NOTIFICATIONS_ENABLED=true` in the agent env is irrelevant because the API/cron here is not the production process and mode defaults to dry_run.

---

## 16. Risk assessment

| Risk | Severity | Live-send implication |
|---|---|---|
| Unknown real eligible volume / category mix | High | Cannot size a cohort |
| Existing scheduler + re-engagement same day / same morning window | High | Intended 1 proactive/day is **not** a global cap |
| CRM stacking if flag later enabled | Medium | Third channel same day |
| Permission/token false positives | Medium | Could “would_send” users who cannot receive or already denied OS permission |
| Dry-run endpoint writes prefs | Medium | Do not run snapshot as a casual prod probe without a read-only path |
| First name on lock screen (`plan_ready`) | Low | Policy-allowed residual PII |
| Selector itself (priority, quiet hours, caps, A/B, privacy sanitizer) | Low | Covered by 27 unit tests + fixture CLI |

**Live sending should remain blocked.** `NOTIF_REENGAGEMENT_MODE` must stay `dry_run` (or `off`).

A limited live test is **not** recommended until:

1. A real production snapshot is obtained (admin dry-run with Firebase admin, against a **read-only** evaluation path).
2. Overlap with the existing scheduler is either explicitly accepted as additive, or later constrained (out of scope here).

---

## 17. Whether live sending should remain blocked

**Yes. Keep blocked.**

Do not set `NOTIF_REENGAGEMENT_MODE=live`.  
Do not enable broad sending.  
Do not treat fixture counts as production distribution.

---

## FINAL GATE

**B — KEEP DRY-RUN ONLY**

Not A: zero real production users were evaluated; scheduler overlap would still add a notification on top of the existing 3–12/day engine.  
Not C: the selector works as specified on fixtures and tests; this step was ordered **not** to change the existing scheduler. The blocker is operational proof + overlap policy, not a broken selector.

No controlled live rollout is recommended from this report. If a later real snapshot is green **and** overlap is accepted, the smallest test would still be: tiny cohort, short duration, max 1 re-engagement/day, max 4/week, monitor opens / return sessions / meaningful actions / disable rate / duplicate complaints — still not broad production sending.
