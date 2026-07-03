# UX Improvements — Phase 5

Small, high-impact UX changes. No redesigns, no new popups.

## 1. First success experience

| Change | File | Behavior |
|--------|------|----------|
| Generate paywall bypass | `dashboard.tsx`, `activation-gate.ts` | Users with zero routines always reach `/routines/generate` |
| First routine milestone | `generate.tsx`, `retention-engine.ts` | `first_routine_generated` tracked on save |
| Empty timeline CTA | `dashboard.tsx` (existing) | "Generate today" when no plan |

## 2. Return experience

| Change | File | Behavior |
|--------|------|----------|
| Resume banner | `activation-resume-banner.tsx` | Shows when partial routine progress today |
| Resume persistence | `activation-resume.ts`, `detail.tsx` | Saves after first item completed; clears when done |
| Dismiss | Banner | User can dismiss without losing routine |

## 3. Feature discovery

| Change | File | Behavior |
|--------|------|----------|
| Discovery strip | `feature-discovery-strip.tsx` | Up to 3 unused modules, age-filtered |
| No popups | — | Inline chips only |
| Prioritized modules | Config | Phonics, Story Hub, Smart Study, Gaming, Parent Hub |

## 4. Streaks & habits

| Change | File | Behavior |
|--------|------|----------|
| Streak grace | `routine-streak.ts` | Yesterday counts until today's plan exists |
| Timezone-safe keys | `routine-streak.ts` | Local calendar dates, not UTC ISO drift |

## 5. Trial & premium

| Change | File | Behavior |
|--------|------|----------|
| Paywall deferral | `paywall-context.tsx` | Soft reasons redirect to generate pre-activation |
| Activation redirect | `subscription-event-bridge.tsx` | Handles `amynest:activation-redirect` |
| Analytics | `subscription-analytics.ts` | `paywall_deferred_activation` event |
| Pricing UI | — | **Unchanged** |

## 6. Personalization (existing data)

- Discovery strip uses `child.age` for module filtering
- Paywall copy still uses `childName` from `usePrimaryChild` (unchanged)
- No new profile fields requested

## 7. Notifications

No client changes this phase — audit recommendations in [retention-audit.md](./retention-audit.md).

## UX principles followed

- Never leave user on empty screen without CTA (timeline + journey card)
- Subtle guidance only
- Backward compatible localStorage keys
- Existing subscribers unaffected (premium bypasses locks)
