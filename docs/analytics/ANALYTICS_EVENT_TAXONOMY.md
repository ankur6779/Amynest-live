# AmyNest analytics event taxonomy

The catalog lives in `@workspace/analytics-taxonomy` and is the allowlist for ingest. Current size: **216** event names. Unknown names are rejected and counted. Lifecycle definitions are in `ANALYTICS_EVENT_DICTIONARY.md`.

Product-spine names added for this work (24):

| Event | When it fires |
|---|---|
| `page_view` | SPA location change, once per visit |
| `page_exit` | Leave that location, with active foreground milliseconds |
| `feature_viewed` | Entering a route that maps to a feature |
| `feature_started` | Hub feature-usage open, story playback start |
| `feature_interaction` | `trackModal` and other explicit interactions |
| `feature_completed` | Story playback ended, explicit completion |
| `feature_abandoned` | Explicit abandon API |
| `feature_error` | Explicit feature error API |
| `app_background` / `app_foreground` | Document visibility |
| `session_heartbeat` | Every 30s in the foreground |
| `scroll_milestone` | 25, 50, 75, 100 once per visit |
| `onboarding_step_completed` | Existing onboarding funnel reports a completed step |
| `first_feature_used` | Once per install, on the first feature start or completion |
| `ask_amy_message_sent` | Ask Amy send, length only |
| `ask_amy_response_received` | Ask Amy result, latency and success |
| `story_opened` / `video_started` / `video_completed` | Story player |
| `worksheet_opened` | Hub worksheet feature id |
| `worksheet_downloaded` | PDF save tagged as a worksheet |
| `coloring_activity_started` | Hub coloring feature id |
| `coloring_activity_completed` | Coloring PDF saved |
| `subscription_cancelled` | Server, after the cancel API completes |
| `game_abandoned` | A started game is left before `finishGame` |

## Names that already existed and were not duplicated

| Requested name | Existing event |
|---|---|
| `app_first_open` | `first_open` |
| `signup_started` / `signup_completed` | `pre_signup_signup_started` / `pre_signup_signup_completed` |
| `onboarding_started` / `onboarding_completed` | same names |
| `child_profile_created` | `child_created` |
| `first_plan_generated` | same name |
| `paywall_viewed` | `paywall_view` and legacy `premium_paywall_viewed` |
| `begin_checkout` | `checkout_started` |
| `purchase_success` | same name, plus `upgrade_completed` from the server |
| `subscription_activated` | `subscription_active` |
| `screen_view` / `screen_leave` | kept valid for old clients; new navigation emits `page_view` / `page_exit` |

`screen_view` remains a legal event so already-shipped clients keep ingesting. New page traffic uses `page_view`. Dashboard SQL accepts both.

## Properties that must not be sent

Passwords, bearer tokens, raw Ask Amy prompts or replies, child names, numeric child ids, payment credentials, and health narrative fields. The client queue and server ingest drop those keys even if a caller passes them. A pseudonymous `child_ref` is added only when `ANALYTICS_CHILD_REF_SECRET` is set on the server.

Every accepted client event also carries `event_id`, `installation_id` (the durable device id), `session_id`, `device_id`, platform, app version, and first-touch attribution fields when they are already stored on the device. `installation_id` is not a separate Play or App Store install token. Zod schemas still strip unknown feature fields; the server copies the spine allowlist back onto the stored props.
