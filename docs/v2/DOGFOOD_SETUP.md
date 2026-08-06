# AmyNest V2 — Internal Dogfood Setup

**Audience:** Engineering / founder closed dogfood  
**Phase:** 4B Conversion Glue  

---

## Required feature flags

Set in the dogfood build env (web Vite / Capacitor env):

```bash
VITE_V2_FF_NEW_FRONT_DOOR=1
VITE_V2_FF_GUEST_MODE_V2=1
VITE_V2_FF_TODAY_V2=1
VITE_V2_FF_PREMIUM_V2=1
VITE_V2_FF_NEW_NAVIGATION=1
VITE_V2_FF_ANALYTICS_V2_CORE=1
```

Optional shells (Ask Amy / For Child) are not required for the conversion glue path.

**Defaults in production remain OFF** — never ship these as prod defaults without a rollout plan.

---

## Required account types

| Journey | Account |
|---------|---------|
| Front Door → Today → Mission → WOW | **Unsigned guest** (local V2 guest session) |
| Premium purchase / restore | **Signed-in, non-anonymous** Firebase account |
| Guest taps Premium | Account-required gate → Sign up / Sign in → return `/premium` |
| Soft-save continue | Guest Front Door complete → Sign up → lands **Today** (Age · Name · Worry kept locally) |

Do **not** use Firebase Anonymous Auth for Premium checkout.

---

## Firebase setup

1. Same Firebase project as the dogfood build (`VITE_FIREBASE_*`).  
2. Email / Google / Apple sign-in enabled for account creation.  
3. **DebugView:** enable debug mode on the device/browser; filter custom events:
   - `v2_mission_started`
   - `v2_mission_completed`
   - `v2_wow_completed`
   - `v2_d1_returned`
   - `v2_practice_day3`
4. Analytics flag must be on (`analytics_v2_core`) or DebugView will stay empty for V2 events.
5. Sink failures may drop events (no offline queue) — UX must never block.

---

## RevenueCat / store sandbox

1. Use RC sandbox / StoreKit / Play license testers as usual for AmyNest.  
2. `premium_v2` uses existing billing bridges — **no RC config changes in this phase**.  
3. Purchase only after a real (non-anonymous) account.  
4. Restore: native iOS/Android app; web restore is not supported (expected).

---

## Happy path smoke (glue)

1. Fresh install → Front Door → COMPLETE → **Continue to Today**  
2. Start mission → Mark complete (try within ~90s of door start for WOW)  
3. Kill app → reopen → **Today** (not COMPLETE loop)  
4. Today → **Continue with Premium** (sole entry) → account message → Sign up → back to Premium  
5. Sign up after Front Door → soft-save → **Today** (no onboarding restart when V2 path applies)

**Founder kit:** [`founder-dogfood-kit/README.md`](./founder-dogfood-kit/README.md)  
**Founder dogfood preparation (observation mode + readiness):** [`founder-dogfood-prep/README.md`](./founder-dogfood-prep/README.md)

---

## Known limitations

- Soft-save keeps Age · Name · Worry in **local guest storage**; it does not create a server child profile.  
- D1 / Day3 North Stars need multi-day returns.  
- Premium commerce analytics emitters are not part of this glue sprint.  
- Guest Ask Amy / For Child **CTAs and tabs** should show the account sheet (Phase 4D); direct deep links may still hit protected routes.  
- Dual legacy `/pricing` may still exist elsewhere when `premium_v2` is off.

---

## Rollback

Unset / set all `VITE_V2_FF_*` to `0` / omit — classic entry and `/pricing` paths return.
