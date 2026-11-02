# AmyNest analytics coverage audit

Audit date: 2 Nov 2026 (Asia/Calcutta). Source of routes: `artifacts/kidschedule/src/AppCore.tsx`.

Page entry and exit are automatic. `AnalyticsScreenTracker` is mounted once inside the wouter router and emits `page_view` and `page_exit` for every location change, including the routes below. That is not the same as feature-action coverage.

Unique routes discovered: **129** (136 `<Route path>` declarations, with dev/prod duplicates collapsed).
Routes with a feature name on entry: **66**.
Distinct feature names on those routes: **41**.

## Route table

| Route | Page tracking | Feature on entry | Events | Persistence | Identity | Platforms |
|---|---|---|---|---|---|---|
| `/` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/index.html` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/privacy` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/terms` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/about` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/delete-account` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/billing-dispute` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/support` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/get-app` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/amy` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/parenting-app` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/speech-coach-app` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/child-routine-planner` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/kids-nutrition-app` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/features/:slug` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/guides` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/guides/:slug` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/routine-by-age/:age` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/feeding-plan/:months` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/app` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/download` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/login` | instrumented | auth | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/begin` | instrumented | onboarding | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/welcome` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/sign-in` | instrumented | auth | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/sign-up` | instrumented | auth | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/verify-email` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/reset-password` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/verify` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/auth/callback` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/auth/action` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/auth/apple/callback` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/speech-coach-v2-debug` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/amy-avatar-qa` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/openai-realtime-test` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/openai-realtime-minimal-test` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/dev/child-discovery-film` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/onboarding` | instrumented | onboarding | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/subscription-trial` | instrumented | paywall | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/dashboard` | instrumented | today | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/children` | instrumented | child_profile | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/children/new` | instrumented | child_profile | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/children/:id` | instrumented | child_profile | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/routines` | instrumented | routines | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/routines/generate` | instrumented | routines | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/routines/:id` | instrumented | routines | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/behavior` | instrumented | behavior | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/profile` | instrumented | parent_profile | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/parent-profile` | instrumented | parent_profile | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/notification-settings` | instrumented | settings | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/manage-devices` | instrumented | settings | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/notification-diagnostics` | instrumented | settings | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/notify-prompt` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/babysitters` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/assistant` | instrumented | ask_amy | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/amy-ai-tutor` | instrumented | ask_amy | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/learn-with-amy` | instrumented | ask_amy | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/progress` | instrumented | progress | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/parenting-hub` | instrumented | parent_hub | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/parent-growth` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/debug/learning` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/debug/runtime` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/debug/telemetry` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/phonics/test/play` | instrumented | phonics | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/phonics/test` | instrumented | phonics | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/phonics` | instrumented | phonics | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/life-skills` | instrumented | life_skills | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/speech-coach/live` | instrumented | speech_coach | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/speech-coach/live-session` | instrumented | speech_coach | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/speech-coach/talk` | instrumented | talking_amy | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/speech-coach-v2/session` | instrumented | speech_session | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/speech-coach-v2` | instrumented | speech_coach | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/talking-amy` | instrumented | talking_amy | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/speech-coach` | instrumented | speech_coach | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/parenting-hub/speech-coach/live` | instrumented | speech_coach | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/parenting-hub/speech-coach` | instrumented | speech_coach | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/parenting-hub/talking-amy` | instrumented | talking_amy | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/kids-control-center` | instrumented | kids_control | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/study` | instrumented | study_zone | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/smart-math-tricks` | instrumented | smart_math | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/learning-zone/smart-math-tricks` | instrumented | smart_math | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/abacus` | instrumented | abacus | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/health-lab` | instrumented | health_lab | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/setup/:step` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/app/:segment` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/welcome` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/formation` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/reveal` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/settings` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/privacy` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/app` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/dashboard` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky/setup` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/birth-sky` | instrumented | birth_sky | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/spelling` | instrumented | spelling | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/olympiad` | instrumented | olympiad | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/event-prep` | instrumented | event_prep | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/teacher-os` | instrumented | teacher_os | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/worksheet` | instrumented | worksheets | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/school-morning-flow` | instrumented | school_morning | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/amy-coach` | instrumented | amy_coach | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/amy-coach/progress` | instrumented | amy_coach | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/recipes` | instrumented | recipes | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/nutrition/share/:token` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/nutrition` | instrumented | nutrition | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/audio-lessons` | instrumented | audio_lessons | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/rhymes` | instrumented | rhymes | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/games` | instrumented | gaming_hub | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/animal-world` | instrumented | animal_world | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/discovery-worlds` | instrumented | discovery_worlds | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/answer-to-kids-how` | instrumented | curiosity | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/worlds/:slug` | instrumented | discovery_worlds | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/pricing` | instrumented | paywall | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/referral/:code` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/referrals` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/insights` | instrumented | insights | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/rewards` | instrumented | rewards | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/debug-parity` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/debug/pre-signup` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/dev/phonics-audio-preview` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/dev/rhymes-audio-ab` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/environment` | instrumented | environment | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/feedback` | instrumented | feedback | page_view, page_exit, feature_viewed | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/admin/feedback` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/admin/dashboard` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/admin/infant-parenting` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/admin/growth/:section` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/admin/growth` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |
| `/admin/audio-health` | instrumented | — | page_view, page_exit | `analytics_events` via ingest | device id always; canonical user id after auth | Web, Android WebView, iOS WKWebView |

## Feature actions

| Area | Status | Events | Gap |
|---|---|---|---|
| Today / dashboard | page + feature_viewed | page_view, feature_viewed | Individual card taps still depend on existing button analytics |
| Ask Amy | message metadata | ask_amy_message_sent, ask_amy_response_received | Raw prompts and replies are not stored |
| For [Child] / parenting hub | tile open | feature_open (legacy), feature_started | Not every tile has a completion event |
| Child profile | route entry | feature_viewed | child_created remains the create event; child_profile_created is not a second event |
| Parent profile / settings | route entry | feature_viewed | Individual setting toggles are not all named |
| Onboarding | existing funnel + named step | onboarding_started, onboarding_completed, onboarding_step_completed | Step event fires when the existing funnel reports step_completed |
| Speech Coach | session plus progress and leave | speech_coach_v2_session_start, speech_session_progress, speech_coach_v2_session_complete, speech_session_abandoned, feature_started, feature_completed | Progress fires once per session on the first successful heartbeat. Numeric childId is removed before the event is queued |
| Talking Amy | session when a child profile exists | talking_amy_session_started, talking_amy_first_interaction, talking_amy_session_completed, talking_amy_session_abandoned | Product props omit child id. No session exists without a child profile |
| Games | open, start, finish, result, abandon | game_opened, game_started, game_completed, game_result, game_abandoned | Guests and signed-in players share the event. Abandon fires once after a real start and not after finish |
| Health Lab | tool and assessment | health_lab_tool_opened, health_lab_assessment_started, health_lab_assessment_completed | Score and cheat text stay in client logs |
| Nutrition | hub, plan, save | nutrition_tool_opened, nutrition_plan_generated, nutrition_plan_saved | Meal names are not copied. entry_count is 1 |
| Infant hub | privacy-safe actions | infant_action hub_opened, log_created, milestone_completed, exercise_completed | Growth, cry text, and child id are not copied |
| Discovery | daily adventure completion | discovery_completed | Answer events are not treated as world completion |
| Worksheets | open, download, failure | worksheet_opened, worksheet_downloaded, asset_download, worksheet_generation_failed | Failure sends error_class worksheet_error, not the message |
| Coloring | hub, preview, PDF | coloring_activity_started, coloring_preview_opened, coloring_activity_completed, feature_completed, feature_error | Preview does not send a file id |
| Stories / video | player | story_opened, video_started, video_completed, feature_started, feature_completed, feature_abandoned | Abandon fires when playback started and ended did not. Story text is not stored |
| Study zone | session | learning_activity_started, learning_activity_completed | Module is the mode string. Child id is not copied. Abacus events were not duplicated |
| Birth sky, phonics, and other mapped routes without a completion callback | route entry | feature_viewed | No completion event was invented |
| Paywall / purchase | existing funnel + server truth | paywall_view, checkout_started, purchase_success, upgrade_completed | Client purchase is not proof of payment. RevenueCat webhook via recordServerPurchaseTruth remains authoritative and is deduped by transaction id |
| Subscription cancelled | server, API cancel completion | subscription_cancelled | Play/App Store cancels that never hit the API route are not given a second client event |
| Modals and drawers | API only | feature_interaction modal_open/modal_close | trackModal exists. Individual dialogs were not all wired, so a modal is not a page view and is not yet universally instrumented |
| Scroll | document listener | scroll_milestone 25/50/75/100 | One set per page visit |
| Session | service | session_start, session_end, session_heartbeat, app_background, app_foreground | Heartbeat is 30s and only in the foreground |

## Identity and delivery

| Concern | Status |
|---|---|
| Anonymous events before login | Persisted as `device:{id}` through `/api/analytics/preauth-events` |
| Stitch after Firebase login | `user_id` rewritten in place. Props gain `canonical_user_id`, `firebase_uid`, and `anonymous_device_id`. Timestamps are not rewritten. Rows are not copied, so they are not double-counted |
| Client-supplied canonical user id | Stripped. Server uses the authenticated Firebase uid |
| parent_profiles.id | Not used as canonical identity |
| Offline queue | localStorage. Removed only after HTTP 202 and, when the server returns id lists, only for acknowledged ids |
| WebView reload / process death | Queue is in localStorage. Session id is in sessionStorage and rotates when that storage is gone |
| Duplicate first_open | Still suppressed per user id, including after stitch |

## Platform notes

| Platform | What is covered | What is not |
|---|---|---|
| Web | Shared SDK, page tracker, queue, pre-auth and authed ingest | Native device model is unavailable |
| Android WebView | Same SDK, plus `NativeAnalyticsSpine` first_open before hydration and document-start device id, OS, model, WebView version, and app build | Play Install Referrer behavior is unchanged |
| iOS WKWebView | Same web SDK once the SPA boots, so page and feature events are tracked | There is no native pre-hydration first_open. A duplicate native poster was not added |

## Not claimed

Feature-action coverage is not complete. Routes have page analytics. Meaningful in-screen actions are instrumented where a single existing call site could emit them without a second copy of an event that Growth Intelligence already counts. Buttons, filters, and modals that never called analytics still do not.
