# Funnel Improvements — Phase 5

Improvements derived from production `analytics_events` only. Each maps to a shipped change or a monitored follow-up.

## Shipped (this phase)

| Funnel step | Problem (data) | Change | Analytics |
|-------------|----------------|--------|-----------|
| Registered → first routine | 9.9% reach `routine_generated` | Bypass generate paywall when `routineCount === 0` | `routine_generated`, `first_routine_generated` |
| Hub explore → paywall | Paywall before value | Defer soft gates → `/routines/generate` | `paywall_deferred_activation` |
| Return → abandon routine | No resume UX | `ActivationResumeBanner` + local persistence | `navigation` trigger `activation_resume` |
| Feature discovery | 22% analytics coverage | `FeatureDiscoveryStrip` unused modules | `feature_open` source `dashboard_discovery` |
| Morning streak drop | False 0 streak | `computeRoutineStreak` grace day | `streak_updated` should stabilize |

## Monitoring (post-deploy)

| Step | Query / event | Success criterion |
|------|---------------|-------------------|
| Onboarding | `onboarding_funnel_event` by `step` | `onboarding_completed` / `onboarding_started` > 70% |
| Subscription | `subscription_funnel_event` | `paywall_deferred_activation` then later `paywall_opened` |
| Routine completion | `routine_item_completed` / `routine_generated` users | >60% |
| Profile | DB `parent_profiles` / MAU | >85% |

## Top 20 recommendations

1. **P0:** Track `first_routine_generated` → `first_routine_created` conversion weekly
2. **P0:** Segment D1 push: no routine → deep link generate
3. **P1:** Onboarding step abandon heatmap from `onboarding_funnel_event`
4. **P1:** Paywall CTA `button_click` with `analyticsId` on secondary dismiss vs primary
5. **P1:** Resume banner CTR >15% for users with partial completion
6. **P1:** Feature discovery strip: limit 3 chips, rotate by child age
7. **P1:** Notification deep links to `/routines/:id` not hub home
8. **P2:** Reduce `device_header_missing` noise (Phase 1 ongoing) for cleaner funnels
9. **P2:** Trial offer timing after `first_routine_created` not before
10. **P2:** Winback only after 7d inactive with prior routine
11. **P2:** Parent Hub first visit guided path (no modal — inline journey card)
12. **P2:** Phonics entry from discovery for ages 3–7 only
13. **P2:** Gaming rewards chip only after first routine (shipped)
14. **P2:** Smart Study chip for school-age children only (shipped)
15. **P2:** Re-engage 116 subs without profiles via email/in-app banner
16. **P3:** `screen_view` funnel dashboard → generate → detail
17. **P3:** Cohort compare India vs GLOBAL activation
18. **P3:** Android WebView vs iOS Capacitor funnel parity
19. **P3:** Routine completion push at 80% items done
20. **P3:** Admin dashboard for funnel snapshot script output

## Backward compatibility

- All funnel events use existing taxonomy names
- New milestone `first_routine_generated` additive only
- Paywall deferral does not affect premium subscribers (gate checks routine count / milestone only)
