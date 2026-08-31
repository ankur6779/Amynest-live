# AmyNest notification re-engagement audit

**Date:** 2026-08-31  
**Scope:** Forensic audit of existing push/email notification infrastructure, plus the minimum production-safe re-engagement foundation.  
**Constraint:** Do not redesign interiors, living universe, navigation, pricing, RevenueCat, auth, routine engines, Amy AI, Health Lab, or Speech Coach. Reuse the existing notification stack. Do not build a second delivery system.

**Production sending status (this change):**

| Layer | Status |
|---|---|
| Existing scheduled jobs (routine, nutrition, insights, …) | Unchanged. Still gated by `NOTIFICATIONS_ENABLED`. |
| New re-engagement selector | **DRY-RUN default.** Live send requires `NOTIF_REENGAGEMENT_MODE=live`. |
| Broad re-engagement sending | **BLOCKED** until dry-run output is verified in production. |

---

## 1. Existing notification infrastructure

AmyNest already has a full notification platform. This work extends it; it does not replace it.

### Delivery plane

| Piece | Location | Role |
|---|---|---|
| Dispatch | `artifacts/api-server/src/services/notificationDispatchService.ts` | Prefs, consent, quiet hours, daily cap, FCM (web/Android/iOS), Expo legacy, token prune |
| Claim / rate limit | `notificationClaimService.ts`, `notificationRateLimitService.ts` | Claim-before-send, atomic per-user slot, fingerprint dedup |
| Global scheduler | `notificationGlobalScheduler.ts` | Per-user timezone tick every minute |
| Cron entry | `artifacts/api-server/src/lib/notificationCron.ts` | Starts ticks when `NOTIFICATIONS_ENABLED` is not `false` |
| Content builders | `notificationContentBuilder.ts` | Morning routine, Amy insight, engagement/winback, weekly, etc. |
| Adaptive / outcome | `notificationAdaptiveBridge.ts`, `notificationOutcomeService.ts` | Copy pools, lifecycle, campaign overlay |
| CRM segments | `notificationSegmentService.ts` | Journey steps (feature-flagged, **default off**) |
| Infant / feature / pre-signup | dedicated schedulers | Separate from signed-in re-engagement |
| Engine lib | `lib/notification-engine/` | Decision, fatigue, suppression, lifecycle, re-engagement copy, experiments, i18n |
| Action routing | `lib/action-routing/` | Canonical deep links + Home fallback |

### Persistence

| Table | Purpose |
|---|---|
| `push_tokens` | Device tokens keyed uniquely by token; `userId`, `platform`, `lastSeenAt` |
| `notification_preferences` | Per-category toggles, timezone, quiet hours, intensity cap, locale, consent |
| `notification_log` | Every attempt: status, dedup, deep link, open/dismiss, experiment, segment |
| `notification_fatigue_state` | Consecutive ignores, last opened/sent |
| `notification_outcomes` / outcome events | Downstream action attribution |
| `notification_journey_enrollments` | CRM journey progress |
| `infant_notification_prefs` | Infant-care specific |
| `feature_notification_schedules` | One-off feature reminders |

### Client / native

| Surface | Path |
|---|---|
| Android Play Store (shipped) | `android/` WebView: `PushBridge`, `KidScheduleFcmService`, `NotificationChannels` |
| iOS App Store | Capacitor `artifacts/amynest-capacitor/`: `@capacitor/push-notifications`, `AmyNestFcmBridge.swift` |
| Web / PWA | `use-web-push.ts`, `firebase-messaging-sw.js` |
| Permission UX | `/notify-prompt`, `notification-prompt-modal.tsx` |
| Settings | `/notification-settings` |
| Deep-link tap | `notification-deep-link.ts`, `use-notification-deep-link.ts`, navigation guard |
| Diagnostics | `/notification-diagnostics`, `GET /api/notifications/diagnostics` |

### Kill switches already in production

- `NOTIFICATIONS_ENABLED=false` — disables cron entirely  
- `DISABLE_NOTIFICATION_CRON=1` — same  
- `NOTIF_DECISION_ENGINE=off|shadow|enforce` — expected-value gate (**default `off`**)  
- Segment CRM remote config **`enabled: false`** by default  
- Per-user category toggles + quiet hours + intensity daily cap  

---

## 2. Android status

**Verdict: FCM path is production-wired. End-to-end delivery on hardware is not re-verified in this environment.**

Shipped app is the **WebView wrapper** in `android/` (not Capacitor Android).

What exists:

- FCM service `KidScheduleFcmService` — `onNewToken` + data-only messages  
- Token bootstrap via `FirebaseMessaging.getInstance().token` and `PushBridge.saveToken`  
- JS bridge `window.AndroidPush` / `window.onAndroidToken`  
- Notification channels created at process start (`AmyNestApp` + `NotificationChannels.kt`)  
- Android 13+ `POST_NOTIFICATIONS` requested ~5s after first production page load  
- Tap extras (`deepLink`, `category`, `notificationId`) on cold and warm start  
- Data-only FCM so the native service always attaches a PendingIntent (avoids tray taps with empty extras)

Gaps:

- This Cloud Agent cannot send a real FCM message to a Play-signed device.  
- Auto-prompt at +5s is earlier than “after the parent understands value.” Web `/notify-prompt` is after sign-in; native still asks independently.  
- Capacitor Android tree is **not** the Play Store app — do not implement Play features there.

---

## 3. iOS status

**Verdict: APNs→FCM path is production-wired. Delivery still depends on Firebase Console APNs key (ops). Not hardware-verified here.**

What exists:

- `AppDelegate` registers APNs token onto `Messaging.messaging().apnsToken`  
- `AmyNestFcmBridge` forwards the **FCM** registration token into the WebView  
- Capacitor `PushNotifications` plugin for permission + registration  
- Server rejects 64-char APNs hex tokens (`apns_token_not_deliverable`) and prunes them  
- `isFcmApnsConfigurationError()` downgrades Firebase↔APNs credential failures to warn (not a bad device token)  
- Custom `.caf` sounds in the App Store binary  

Known ops residual (from prior production work): Firebase Console must have a valid APNs auth key. Code cannot fix a missing key.

Foreground vs background:

- Background/killed: APNs alert payload  
- Foreground: Capacitor plugin listeners in `native-push-bridge.ts`  
- This environment cannot exercise a real iPhone

---

## 4. Token architecture

| Question | Answer |
|---|---|
| Associated with AmyNest user IDs? | **Yes.** `POST /api/push/register` upserts `{ userId, token, platform }`. |
| Multiple devices per user? | **Yes.** Unique index is on `token`, not `userId`. One user can have web + Android + iOS rows. Exception: iOS Capacitor keeps **one** `ios-capacitor` token (stale FCM rows for that platform are deleted). |
| Stale tokens removed? | **Yes.** Invalid FCM codes prune immediately. Daily 03:00 UTC sweep deletes `lastSeenAt` older than 60 days. APNs hex tokens pruned. |
| Platforms stored | `ios`, `ios-capacitor`, `android`, `web`, `unknown` |
| Last-seen quality | `lastSeenAt` refreshes on register / conflict update. It is a **proxy** for app presence, not a session clock. A user can be active in the PWA without a token refresh. |
| Anonymous | `POST /api/push/register-anonymous` + later link-to-user (pre-signup). Out of scope for signed-in re-engagement. |

---

## 5. Permission flow

| Surface | When asked | Copy |
|---|---|---|
| Web `/notify-prompt` | After sign-in (can skip) | “Stay on Track with Reminders” / “right on time, every day” — slightly urgency-flavoured |
| Android native | ~5s after first `amynest.in` page | System sheet, no value explanation |
| iOS Capacitor | `requestPermissions()` from web bridge / notify-prompt | System sheet |
| Settings | `/notification-settings` | Per-category opt-out after grant |

Existing UX already has a skip path (“Maybe later”). It does **not** wait until the parent has seen today’s plan.

This foundation updates **web copy** to honest value language. Native Android +5s prompt is documented as a remaining gap (changing it is a Play-store binary change, not required for the dry-run foundation).

Consent: `canDeliverPush()` in the engine + `pushConsentAt` on preferences. GDPR-style regions require explicit consent before dispatch.

---

## 6. Current scheduling capabilities

The global tick evaluates **every user with a push token, every minute**, in **that user’s IANA timezone** (`notification_preferences.timezone`, default `Asia/Kolkata`). DST-safe via `Intl`.

Default local slots (`SCHEDULED_NOTIFICATION_JOBS`):

| Job | Local time | Category |
|---|---|---|
| morning_routine | 07:30 | routine (marked critical) |
| parenting_tip | 09:00 | parenting_tips |
| learning_activity | 10:30 | learning_activity |
| milestone_alert | 11:00 | milestone |
| amy_insight | 12:30 | insights (critical) |
| snack_time | 15:30 | nutrition |
| phonics_reminder | 16:00 | phonics |
| dinner_suggestion | 18:30 | nutrition |
| engagement_sweep | 19:00 | engagement |
| story_time | 20:00 | story_time |
| good_night | 21:00 | good_night (critical) |
| weekly_report | Sunday 10:00 | weekly (critical) |

Plus per-minute `routine_item` (t−5), infant care, feature reminders, pre-signup CRM.

**This is far more aggressive than the re-engagement policy (max 1 proactive / day, 3–4 / week).** Intensity caps are 3 / 6 / 9 / 12 per day (balanced = 6). Delivery-guard hard caps: 15/account/day, 5/child/day, 3/hour.

Quiet hours default **22:00–07:00** local, overnight-aware.

Smart delivery can shift **non-critical** slots to `preferredEngagementHour`.

Decision engine (`NOTIF_DECISION_ENGINE`) can suppress low-EV sends but defaults **off**, so production currently relies on caps + prefs + quiet hours only.

Timezone is stored and used. It is only as good as client updates to `/api/notifications/categories`.

---

## 7. Existing analytics

| Event | Where | Notes |
|---|---|---|
| `notification_opened` | taxonomy + client tap | Props: `category`, `campaign`. **No stable notification id.** |
| `return_after_push` | taxonomy | Hours since push |
| `winback_opened` | taxonomy | Winback level |
| Server `notification_sent_total` | in-process metrics store | Count only |
| `notification_log.openedAt` | DB | Open attributed to **most recent unopened send**, not the tapped id |
| `notification_log.dismissedAt` | DB | `POST /api/notifications/dismissed` |
| Deep-link events | `deep_link_opened` via `/api/notifications/deep-link-event` | Path + category |
| Outcome events | `/api/notifications/outcome` | Meaningful action after open |
| Experiment columns | `experiment_id`, `experiment_variant` on log | Copy/timing experiments exist |
| Pre-signup events | separate growth events | Not signed-in re-engagement |

Gaps vs required funnel:

- `notification_scheduled` / `notification_sent` / `notification_delivered` not in product taxonomy  
- Open is **not** reliably attributable to the notification that caused it  
- FCM delivery receipts are **not** consumed (no reliable `delivered` on all platforms)  
- `notification_open` must not be counted as conversion — outcome table already exists for that, but client open payload is thin  

---

## 8. Existing deep links

Canonical routes live in `lib/action-routing/src/registry.ts`. Notification taps resolve through `buildNotificationActionPayload` → invalid/stale paths **fall back to Parent Hub** (`/parenting-hub`), not a new page.

| Intent | Existing route |
|---|---|
| Today’s plan / routines | `/routines`, `/routines/:id`, `/routines/generate` |
| Amy | `/assistant` |
| Rooms / hub | `/parenting-hub` |
| Speech | `/speech-coach` |
| Learning | `/study` → hub learning zone |
| Weekly recap | `/progress` |
| Home fallback | `/parenting-hub` (`/` redirects there) |

Tap handling:

- App killed / backgrounded: Android extras + iOS data payload → `window.onNotificationTap` / Capacitor listener → `dispatchNotifDeepLink`  
- App already open: same custom event; navigation guard blocks auto-nav unless `userInteraction`  
- Logged out: notify-prompt / sign-in redirect; pending tap is buffered  
- Stale target: action-routing `usedFallback`  

Session expiry is a client auth concern; deep-link does not mint a session.

---

## 9. Existing gaps (vs this brief)

1. **No single-candidate selector.** Multiple jobs can qualify and send the same day (up to intensity cap).  
2. **Frequency too high** for “Amy remembered you” (6–12/day possible).  
3. **No INACTIVE_30_DAYS** (lifecycle stops at 14d).  
4. **Requested segment names** (NEW_USER, AT_RISK_USER, RETURNED_USER, …) exist only as *related* lifecycle/CRM enums, not as the product taxonomy.  
5. **No dry-run / audit mode** answering “who would get what, and why, right now.”  
6. **Open attribution** uses “latest send,” not the tapped fingerprint.  
7. **Lock-screen copy** often includes the child’s first name; some builders could imply unfinished “problems.” Speech/health wording is not systematically blocked.  
8. **`daysSinceLastActive`** is derived from push-token `lastSeenAt`, not app-session — recent-open suppression is coarse.  
9. **Today’s-plan “opened”** is not a first-class event; builders infer from routine completion / journey task.  
10. **Decision engine and CRM journeys default off** — intelligence is mostly unused in production.  
11. **Email is not a push fallback.** Resend exists for weekly recap email and admin alerts only.  
12. **Permission asked early** on Android (+5s) and with slightly FOMO web copy.  
13. **Hardware FCM/APNs** not verifiable in this environment.  
14. **Existing `buildReengagementCopy`** already exists but is not the live selector; engagement_sweep uses a different winback table (`user_retention`).

---

## 10. Recommended architecture (implemented)

Keep **one** dispatch path (`dispatchNotification`). Add a **pure selector** in `@workspace/notification-engine` and a thin API adapter.

```
loadOutcomeSignals + prefs + tokens
        ↓
decideReengagement()   ← deterministic, testable, no I/O
        ↓
DRY-RUN log / admin endpoint / CLI
        ↓  only if NOTIF_REENGAGEMENT_MODE=live
dispatchNotification(category=engagement, campaign=reengagement)
        ↓
existing FCM + notification_log + analytics
```

Flags:

| Env | Values | Default |
|---|---|---|
| `NOTIF_REENGAGEMENT_MODE` | `off` \| `dry_run` \| `live` | `dry_run` |

When `live`, skip job `engagement_sweep` so win-back is not double-sent. Other transactional/critical slots (routine_item, infant, time-sensitive routine) stay on their existing rules.

---

## 11. Notification taxonomy

Exactly one candidate may send. Priority (highest first):

| Priority | Category | When it is allowed | Deep link |
|---|---|---|---|
| 1 | `UNFINISHED_ACTION` | Onboarding incomplete, journey task open, unfinished lesson, routine opened but not started | matching existing route, else `/parenting-hub` |
| 2 | `TODAY_PLAN` | A real plan/routine exists for today and has not been completed | `/routines` |
| 3 | `CHILD_CONTEXT` | Real missed-routine / due step only — never invented | `/routines` or speech/learning route if that is the evidence |
| 4 | `AMY_COMPANION` | At-risk or unfinished, not for active daily users | `/assistant` |
| 5 | `WEEKLY_RECAP` | Sunday local, user has something to look back on | `/progress` |
| 6 | `WINBACK` | Inactive 3 / 7 / 14 / 30+ days | `/parenting-hub` or last unfinished route |
| 7 | `GENERIC_REMINDER` | Last resort; almost never if a better candidate exists | `/parenting-hub` |

Lock-screen copy is **neutral**. No speech problems, health issues, or behaviour labels. First name is allowed only with non-sensitive “plan / next step” wording.

A/B experiment `reengagement_copy_v1`: `plan_ready` vs `next_right_thing` (hash of `userId`). Primary metrics: return session, meaningful action, D1/D7 reactivation — **not** open rate alone.

---

## 12. Segmentation

Deterministic mapping from existing `OutcomeSignals` (no new tables):

| Segment | Rule |
|---|---|
| `NEW_USER` | Account age ≤ 7 days and not yet activated (no first routine and no first learning) |
| `ACTIVE_USER` | Last active &lt; 3 days and activated |
| `AT_RISK_USER` | Last active 1–2 days **or** churn risk elevated while still “in window,” with prior habit |
| `INACTIVE_3_DAYS` | 3–6 days since last active |
| `INACTIVE_7_DAYS` | 7–13 days |
| `INACTIVE_14_DAYS` | 14–29 days |
| `INACTIVE_30_DAYS` | ≥ 30 days |
| `RETURNED_USER` | Last active ≤ 1 day after a lapse (streak broken / prior inactivity) |

Account flavor (subscription source of truth = existing `subscriptions` row via `loadOutcomeSignals`): `free` | `trial` | `premium` | `cancelled`.

Activity flavors (non-exclusive tags, not send keys): routine / Amy / speech / learning user — used only to pick a truthful deep link, never to upsell.

**No premium upsell** on this path. Monetization journeys stay behind the existing CRM flag (still off).

---

## 13. Frequency policy (proactive re-engagement only)

| Gate | Value |
|---|---|
| Max proactive / local day | **1** |
| Max proactive / local week | **4** |
| Per-category cooldown | unfinished/today/child 24h; Amy 72h; weekly 6d; winback 5d |
| Quiet hours | User prefs (default 22:00–07:00 local) |
| Send window | 08:00–20:00 local (prefer 08:30 or `preferredEngagementHour`) |
| Recent app-open suppression | Skip if last active &lt; 90 minutes (when timestamp known) or `daysSinceLastActive === 0` for winback/generic/Amy |
| Opt-out | `engagementEnabled === false` or missing consent |
| OS permission / no token | Skip |
| Dedup | Fingerprint `account_reengagement_{category}_{localDate}` unique in `notification_log` |

Transactional / time-sensitive existing jobs (`routine_item`, infant care, critical routine) are **not** rewritten by this policy.

---

## 14. Privacy / safety policy

- Lock screen must never expose health, speech diagnosis, behaviour “problems,” or therapy context.  
- Prefer: “Amy has something ready for today.” / “Your next step is ready.”  
- Child first name is allowed only with calm, non-clinical wording.  
- Analytics payloads: ids, category, destination, variant — **no** child name, no body text.  
- Dry-run ops output may include copy for humans verifying tone; it is not an analytics event.

---

## 15. Test matrix

Covered by unit tests in `lib/notification-engine/src/reengagement/` (pure, no FCM):

User state: new, activated, active, inactive 3/7/14/30, returned.  
Account: free, trial, premium, cancelled.  
Gates: permission denied, no token, duplicate candidates, cooldown, quiet hours, recent open, multiple triggers (exactly one winner).  
Copy: no sensitive lock-screen phrases; fallback Home path.

Not covered here (environment limits): real Android/iOS foreground/background/killed, real FCM/APNs, production token volume.

---

## 16. Production rollout plan

1. **Ship foundation with `NOTIF_REENGAGEMENT_MODE=dry_run`.** Existing cron unchanged.  
2. Run `pnpm notif:reengagement-dry-run` (fixtures) and `GET /api/notifications/reengagement/dry-run` (admin, live users) in staging.  
3. Inspect: one candidate per user, frequency gates, deep links, privacy copy.  
4. Confirm Android/iOS test devices still receive **existing** (non-reengagement) test pushes.  
5. Only then set `NOTIF_REENGAGEMENT_MODE=live` for a small allowlist (future; not in this PR).  
6. Watch: sent → opened (attributed) → session → outcome. Unsubscribe/disable rate. Do not treat open as conversion.  
7. Keep `live` off if dry-run shows spam, wrong timezone, or sensitive copy.

---

## Answers to the original 18 questions

1. **Android FCM production-ready?** Code path yes; hardware not verified in this run.  
2. **iOS APNs/FCM production-ready?** Code path yes; APNs key is ops; hardware not verified.  
3. **Tokens bound to user IDs?** Yes.  
4. **Multiple devices?** Yes (iOS Capacitor collapsed to one FCM token).  
5. **Stale tokens removed?** Yes (invalid + 60-day sweep + APNs hex).  
6. **Permissions handled correctly?** Functional; timing is early on Android; web copy updated.  
7. **Dedup?** Yes (`notification_log` unique `(userId, dedupKey)` + fingerprints).  
8. **Timezone stored?** Yes, default Asia/Kolkata.  
9. **Schedule in parent local TZ?** Yes.  
10. **Active / inactive / reactivated?** Partially via lifecycle + token lastSeen; this foundation adds the requested segments.  
11. **Deep link to room/action?** Yes, via action-routing; fallback Parent Hub.  
12. **Opens tracked?** Yes, weakly attributed; this foundation passes fingerprint/id.  
13. **Delivery/failure/open tracked?** Sent/fail in log; delivery receipts not reliable; open/dismiss endpoints exist.  
14. **Prevent repeat same notification?** Yes, fingerprint + cooldown; new policy tightens proactive.  
15. **Preference system?** Yes, 13 category toggles + quiet hours + intensity.  
16. **FCM/APNs failure?** Prune invalid tokens; APNs config errors logged as warn; status `failed`. No email fallback.  
17. **Email fallback?** Weekly recap email only — **not** used as push fallback.  
18. **Reuse?** Dispatch, tokens, prefs, log, quiet hours, deep links, outcome signals, experiments, FCM bridges.

---

## What this change adds vs leaves alone

**Adds:** audit doc, re-engagement selector, frequency policy, privacy copy, A/B hook, dry-run CLI + admin route, attributed open payload, taxonomy events, tests.  

**Does not add:** campaign manager, new UI, live broadcast, email fallback, native permission timing change, living-universe edits.

**SAFE TO ENABLE (production notification sending of the *new* path):** **No.**  
**Broad re-engagement sending:** **BLOCKED** (`dry_run` default).
