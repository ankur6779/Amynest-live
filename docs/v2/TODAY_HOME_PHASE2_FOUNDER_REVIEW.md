# Today Home V1 — Phase 2 Founder Review

**Status:** Implemented — awaiting Six Reviews / Ship decision  
**Surface:** Home Hero on `/dashboard`  
**Kill switch:** `VITE_FF_TODAY_HOME_V1=0` → legacy weather-hero dashboard  

Frozen: Welcome V3 · Signup Keep · Child Discovery  
**Do not continue to Parent Hub.**

---

## Today Home Law (absolute)

> If the parent has to decide what to do next, Today Home has failed.  
> If Today Home has to decide what to do next, AmyNest has succeeded.

Gate: `passesTodayHomeLaw()` · `TODAY_HOME_LAW`

---

## Previous vs New

| | Previous | New (flag ON) |
|---|---|---|
| Hero | Weather metrics + rotating tips | **Today’s Next Right Thing** |
| Why | Buried / optional | **Why today** line under title |
| CTA | Diffuse (generate / check-in / timeline) | **One Begin** |
| Insight | Many widgets | **One** supporting insight (or silence) |
| Weather | Always hero | Speaks **only** if it changes recommendation |
| Retention | Streaks / coins / check-in before value | **Hidden** on Home |
| Feature mall | FeatureDiscoveryStrip | **Hidden** on Home |
| Stats / coach wall | Compact stats + more insights | **Hidden** on Home |
| Continuity | Soft line in FirstValue card | Flows into NRT hero (“Amy already prepared today”) |
| Route | `/dashboard` | `/dashboard` (unchanged) |

Hierarchy manufactured:

1. Today’s Next Right Thing  
2. Why today  
3. Begin  
4. One supporting insight  
5. Existing timeline + child chips (execution support)

---

## Production Safety

| System | Status |
|---|---|
| Auth / session | Untouched |
| Child / Parent profiles | Untouched |
| Routine Engine | Untouched — read next incomplete item only |
| NRT Engine (`decide-next`) | Reused via `buildDiscoveryNrtPreview` |
| Continuity | Reused `loadFirstExperienceContinuity` |
| Analytics | Additive `today_nrt_shown` / `today_nrt_cta` + existing `routine_cta_clicked` |
| Firebase | Untouched |
| RevenueCat / paywall | Generate path still gated |
| Notifications | Untouched |
| Feature flags | New kill switch only |
| Welcome / Signup / Discovery | **Not edited** |
| Parent Hub / Child Hub / Nav / Premium | **Not redesigned** |
| Existing users | Flag off restores previous Home composition |

---

## Database Review

| Need | Source | Migration |
|---|---|---|
| Child | `GET /api/children` | **None** |
| Today items | `GET /api/routines` | **None** |
| Continuity NRT | localStorage FE continuity | **None** |
| Weather insight | `GET /api/environment/context` (optional) | **None** |
| Family why | routine `adaptations` (existing) | **None** |

**Zero new tables. Zero new columns.**

---

## Analytics Review

| Event | Role |
|---|---|
| `dashboard_view` | Preserved |
| `today_nrt_shown` | New — NRT impression |
| `today_nrt_cta` | New — Begin / rest |
| `routine_cta_clicked` source=`today_nrt_hero` | Preserved funnel twin |
| `routine_started` (subscription) | Still fires via CTA helper |

---

## Performance

| Change | Effect |
|---|---|
| Weather geo + Nominatim off hero path | Hero no longer blocked on GPS |
| Env context for insight | Optional, stale 10m, no geo required |
| Retention / stats / more-insights UI | Not mounted when flag ON (less main-thread work) |
| Resolver | Pure sync — no new network for NRT itself |

Target held: NRT title/why/Begin without waiting on weather.

---

## Conversion

| KPI | Mechanism |
|---|---|
| Routine Starts | Single Begin → routine detail or generate |
| Routine Completion | Routine-next source = incomplete item |
| Day-1 / Day-7 | Continuity → Home without emotional reset |
| Subscription | Paywall preserved on generate; value shown first |

Widgets that do not move these KPIs were removed from primary Home (retention wall, feature strip, stats, coach mall).

---

## Founder Review (self)

| Criterion | Notes | Score |
|---|---|---|
| Mission | One question answered | 94 |
| Today Home Law | Product decides next | 95 |
| Continuity | Discovery → Home bridge | 90 |
| Restraint | No dashboard / no gamification hero | 93 |
| Freeze obedience | Welcome/Signup/Discovery untouched | 98 |

**Founder Score (self): 94 / 100**

---

## Apple Craft Review (self)

| Criterion | Notes |
|---|---|
| One hero | Yes |
| Luxury spacing | Glass card, calm hierarchy |
| Photography | Deferred — reuses dashboard materials (no third visual system) |
| Motion | Existing ContentReveal only |
| SaaS feeling | Rejected feature mall / stats wall |

**Apple Score (self): 88 / 100** — Phase 3 may inherit FE sanctuary photography if Founder wants deeper craft; Phase 2 prioritized law + hierarchy over a new visual system.

---

## Remaining Debt

1. Progress strip (hierarchy “today’s progress”) — not in Phase 2 scope (Hero only)  
2. FE photography materials on Home hero — optional Phase 3  
3. Server-durable “today decision” table — explicitly deferred (zero migrations)  
4. Timeline still visible below hero — execution support; may further quiet in Phase 3  
5. Post-onboarding still often lands `/routines/generate` before Home — activation path unchanged  

---

## Rollback

```bash
VITE_FF_TODAY_HOME_V1=0
```

Restores SmartHeroSection + retention + legacy widget composition. No DB rollback.

---

## Files touched (Phase 2)

| File | Role |
|---|---|
| `lib/today-home/feature-flags.ts` | Kill switch |
| `lib/today-home/resolve-today-nrt.ts` | NRT resolver (reuse engines) |
| `lib/today-home/supporting-insight.ts` | One insight / weather silence |
| `lib/today-home/telemetry.ts` | Additive analytics |
| `components/today-home/today-home-hero.tsx` | Hero UI |
| `pages/dashboard.tsx` | Wire hero; hide competitors when flag ON |
| `lib/analytics-taxonomy/.../first-value-events.ts` | `today_nrt_*` schemas |
| Tests | flag · resolver · insight · philosophy law |

---

## STOP

Phase 2 Home Hero complete for Founder Review.

**Do not continue to Parent Hub.**
