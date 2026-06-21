# Billing Entitlement V2 Gate Inventory

Backend premium access must be derived from `subscriptions` through `getOrCreateSubscription()`, `getEntitlements()`, and `isPremiumNow()`. Client checks may decide CTA/paywall presentation only.

| Feature area | Backend gate | Required entitlement source | Certified behavior |
| --- | --- | --- | --- |
| Routine Generation | `routineGenerateGate()` and `assertRoutineCanGenerate()` | `getOrCreateSubscription()` + `isPremiumNow()` | `ACTIVE`, `GRACE_PERIOD`, and `CANCELLED` with future period bypass free limits; `EXPIRED` and `FREE` use journey quota. |
| Amy Coach / AI | `featureGate("ai_query")` / `applyFeatureGate()` | `getOrCreateSubscription()` + `isPremiumNow()` | Premium bypasses daily free quota; free users are quota-bound. |
| Activities / Games | `featureGate()` and game reward service callers | `getOrCreateSubscription()` + `isPremiumNow()` | Premium decisions are server-side; client state does not unlock actions. |
| Learning Hub | `executeLearningLoadMore()` | `getOrCreateSubscription()` + `isPremiumNow()` | Premium receives the paid daily load-more cap; free receives lifetime load-more cap. |
| Parent Hub | `assertHubModuleAccess()` | `getOrCreateSubscription()` + `isPremiumNow()` | Premium bypasses journey/tile quotas; free users use journey and legacy tile limits. |
| Nutrition | Nutrition routes using `featureGate("nutrition_week_plan")` / `featureGate("nutrition_family_ai")` | `applyFeatureGate()` | Premium bypasses nutrition free limits; free users are lifetime quota-bound. |
| Speech Coach | Speech gate middleware and `speechCoachV2UsagePolicy` | `isPremiumNow()` / canonical subscription state | Paid states receive paid limits; trials receive trial limits; expired/free receive no paid unlock. |
| Future Premium Features | `featureGate(feature)` or dedicated service wrapper | `getOrCreateSubscription()` + `isPremiumNow()` | New gates must not read localStorage, React Query, Zustand, or native SDK customer info as authority. |
