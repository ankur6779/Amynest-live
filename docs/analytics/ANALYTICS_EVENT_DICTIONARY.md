# AmyNest analytics event dictionary

Date: 2 Nov 2026, Asia/Calcutta. Catalog size: 216 names in `@workspace/analytics-taxonomy`.

These definitions are the only meanings used by the certification events. A name is not emitted from a re-render, a route change, or a repeated callback unless a new product action happened.

Identity on every event is the device id before login and the Firebase uid after login. `installation_id` is that device id. `session_id` is the analytics session. A numeric `childId` is not an identity key. The client scrub and the server scrub drop `childId`, `child_id`, `child_name`, diagnosis, and medication before the event is queued or stored. A `child_ref` is written only when the server has `ANALYTICS_CHILD_REF_SECRET` and a legacy payload still contains a child id. Child names, prompts, replies, meal text, measurements, and cry transcripts are not properties of these events.

## Words

| Word | Meaning |
|---|---|
| Started | The user entered the interactive state once for that visit or session. A second render of the same state does not emit again. |
| Completed | The product reached a real finished state: a celebrated turn, a finished game, a saved or generated plan, playback `ended`, or an assessment that finished. |
| Abandoned | The user left after start and before that finished state. Reason `leave` means the screen or session went away. It is not a failure. |
| Failed | The product tried to produce the artifact and returned an error. The property is a short class, not the error text. |
| Not emitted | The product has no such state. No event was invented for it. |

## Feature events

| Event | Fires when | Does not include |
|---|---|---|
| `talking_amy_session_started` | Once per Talking Amy visit after a child profile exists. The screen does not start without one. | Child id |
| `talking_amy_first_interaction` | The first recording start that the microphone accepts | Audio |
| `talking_amy_session_completed` | The first time a turn reaches the celebrate phase | Transcript |
| `talking_amy_session_abandoned` | Unmount after start when celebrate never happened | |
| `game_opened` | The player opens a game intro, including a guest | Title, child id |
| `game_started` | Play begins. One start per open. Opening the intro is not a start. | |
| `game_completed` | `finishGame` sets the session finished before the result event | |
| `game_result` | The same finish, with score, total, and perfect | |
| `game_abandoned` | One event when a started session is left or the page unmounts before finish. A second leave, a rerender, and a completed game do not emit again. | |
| `health_lab_tool_opened` | First dashboard view in the page load. Range changes do not repeat it. | |
| `health_lab_assessment_started` | An assessment session starts. `game_id` only. | Score |
| `health_lab_assessment_completed` | The assessment ends. `outcome` is `completed` or `abandoned`. | Score, shop, cheat text |
| `nutrition_tool_opened` | Hub open or plan tab, once per browser session for that tool | Meal names |
| `nutrition_plan_generated` | Grocery or tiffin generation. `plan_kind` and a count. | Meal names |
| `nutrition_plan_saved` | One local meal outcome is recorded. `entry_count` is 1. | Meal name |
| `infant_action` | `hub_opened` once, or `log_created`, `milestone_completed`, `exercise_completed` | Measurements, notes, cry text, child id |
| `discovery_completed` | The daily adventure reports complete. `outcome` is `complete`. | Child id. A correct answer is not this event. |
| `coloring_preview_opened` | The preview dialog opens | File id, child name |
| `coloring_activity_completed` | The PDF save succeeds. This already existed. | File contents |
| `worksheet_generation_failed` | Worksheet studio reports `worksheet_error` | The error message |
| `story_opened`, `video_started`, `video_completed` | Playback start and the media `ended` event. These already existed. | Story text |
| `feature_abandoned` for stories | Playback started and `ended` did not fire before the player left | |
| `learning_activity_started` | Study zone session start. `module` is the mode string. | Child id |
| `learning_activity_completed` | Study zone session end, with duration | Child id |
| `speech_session_progress` | The first successful Speech Coach heartbeat in that session | Transcript |
| `speech_session_abandoned` | The session started and `finishSession` did not run | |
| `speech_coach_v2_session_start` / `speech_coach_v2_session_complete` | Existing session boundaries. Callers may still pass `childId`. The queued event does not. | |
| `routine_generation_started` | Generation was requested | |
| `routine_generated` | Generation succeeded. This is the saved plan. There is no second `routine_applied` event. | |
| `routine_generation_failed` | Generation failed | Prompt text |

Abacus mode start and completion events already exist. They were not duplicated. Phonics, spelling, olympiad, rhymes, and audio lessons have no single completion callback, so they stay on `feature_viewed` and `page_exit`.

`game_abandoned` is the mid-game leave. `page_exit` still fires when the route changes. A completed game is not abandoned. Guests use the same event. The pre-auth allowlist accepts it, so it is not dropped before login.

## Purchase events

| Class | Event | Counts as paid |
|---|---|---|
| `INITIAL_PURCHASE` + `TRIAL` | `subscription_funnel_event` step `trial_started` | No |
| `INITIAL_PURCHASE` + `PROMOTIONAL` | funnel step `promotional_grant` | No |
| `INITIAL_PURCHASE` + `INTRO` and price > 0 | `purchase_success` `purchase_class` `introductory` | Yes |
| `INITIAL_PURCHASE` + `INTRO` without a positive price | funnel step `introductory_unpriced` | No |
| `INITIAL_PURCHASE` + `NORMAL` | `purchase_success` `purchase_class` `paid` | Yes. `revenue` is `gross_missing` when price is absent. |
| `INITIAL_PURCHASE` with no period type | `purchase_success` `purchase_class` `unknown` | No |
| `RENEWAL` | funnel step `subscription_renewed` | No new conversion |
| `CANCELLATION` reason `CUSTOMER_SUPPORT`, or `REFUND` | funnel step `refund` | No amount is stored |
| Other `CANCELLATION` | funnel step `subscription_cancelled` | No |
| `BILLING_ISSUE` | funnel step `billing_issue` | No |

Gross billed amount is the webhook `price` when RevenueCat sends one. Taxes, store commission, and net proceeds are not collected. A Razorpay list price is not App Store or Play Store proceeds. Historical rows are not rewritten. A missing class stays unknown.

The same RevenueCat event id is inserted once. A replay returns `duplicate: true` and does not write a second analytics row. The same `transaction_id` on `purchase_success` collapses to one row.

## Attribution fields

| Field | Meaning |
|---|---|
| `gclid`, `gbraid`, `wbraid`, `utm_source`, `utm_medium`, `utm_campaign`, `campaign_id` | First touch. A stored click id is not replaced. An empty first touch can still be filled. |
| `first_touch_at` | When that first touch was captured. |
| `last_touch_gclid`, `last_touch_gbraid`, `last_touch_wbraid`, `last_touch_source`, `last_touch_medium`, `last_touch_campaign`, `last_touch_campaign_id`, `last_touch_at` | The latest touch. A conflicting click id lands here. |
| Server `source_metadata.firstTouch` and `source_metadata.lastTouch` | The same split on `user_acquisition_attribution`, without a new migration. |
| `installation_id` | AmyNest device id. Not a Play or Apple install token. |
| `session_id` | Analytics session. |
| Firebase uid | Server identity after authentication. The client cannot set the canonical user id. |

iOS has no SKAdNetwork, AdAttributionKit, or ATT prompt in `artifacts/amynest-capacitor/ios`. Unknown iOS acquisition is `attribution_unknown`. It is not labeled Google Ads.
