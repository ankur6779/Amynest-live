# Routine intelligence pipeline — pass order (maintainability)

Scheduler (`scheduleRoutineItems`) is **not** re-run after the initial placement pass.

## Early (context + schedule)

1. `prepareFamilyIntelligenceInput` — trajectory, predictive hints, enrich `previousDayContext`
2. `buildHistoryFromOutcomeStore` — uses **enriched** context
3. `deriveChildBehaviorSignature` + `deriveBehavioralState`
4. Schedule, meals, weather, difficulty, culture, optimization, realism

## Late (polish only — no full reschedule)

5. `adaptRoutineForEmotion`
6. `runAdaptiveCompletionPass` (continuity → freshness → autonomy)
7. `applyDailyLoadBalancing`
8. `enforceEnergyCurve`
9. Fixed / special preserve
10. `enforceFinalTimelineIntegrity` (includes `resolveScheduleConflicts`)
11. Decision-enforced final
12. `refreshExplainabilityMetadata` (single parent-facing explainability pass)
13. `persistRoutinePersonalizationMemory` + `finalizeFamilyIntelligenceMoat`

Infant exclusive paths (0–6 mo) skip steps 5–12 except sleep validation.

Overlap: timeline overlap resolution runs inside emotion/completion/load and again in final integrity — intentional safety net, not a second scheduler.
