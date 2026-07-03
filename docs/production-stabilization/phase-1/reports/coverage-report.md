# Analytics Coverage Report

Generated: 2026-07-03T07:39:54.970Z

## Summary
- Routes in AppCore: **110**
- Automatic screen tracking: **100%** (AnalyticsScreenTracker on all routes)
- Phase 1 events wired: **16/16**
- Taxonomy events registered: **84**

## Wired Phase 1 Events
- screen_view
- screen_leave
- button_click
- navigation
- feature_open
- feature_complete
- session_end
- first_open
- search_query
- search_no_results
- asset_download
- subscription_funnel_event
- onboarding_funnel_event
- growth_funnel_event
- performance_metric
- error_captured

## Instrumentation gaps (code-level)
- None — all Phase 1 events have client wiring

## Note
Production analytics coverage >95% requires deploy + 48h traffic in `analytics_events`.