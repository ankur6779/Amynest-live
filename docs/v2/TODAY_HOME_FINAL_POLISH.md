# Today Home V1 — Final Polish (Pre–Parent Hub)

**Status:** Implemented — awaiting Founder approval before Parent Hub  
**Authority:** Founder Order — Final Polish  
**Frozen:** Welcome · Signup · Child Discovery · Today Home Hero structure  
**Kill switch:** `VITE_FF_TODAY_HOME_V1=0`

---

## Debt closed

### DEBT 01 — Post-Discovery continuity (highest)

| Path | Previous | New (Today Home ON) |
|---|---|---|
| Child Discovery `goNext` | `POST_ONBOARDING_ACTIVATION_PATH` → `/routines/generate` | → **`/dashboard`** |
| Legacy onboarding finish | same constant → generate | → **`/dashboard`** |
| Subscription trial exit | same constant → generate | → **`/dashboard`** |
| Guest activation | `GUEST_ACTIVATION_PATH` (= same) | → **`/dashboard`** |
| Returning users (AppCore) | already `/dashboard` | unchanged |
| Home Begin CTA | generate / routine detail | unchanged — **execution after Home** |

**Single source of truth:** `POST_ONBOARDING_ACTIVATION_PATH` in `onboarding-navigation.ts`  
**Rollback:** `VITE_FF_TODAY_HOME_V1=0` restores `/routines/generate`

Required film now:

```
Welcome → Signup → Child Discovery → Today's Home → Begin → Routine
```

Preserved: auth finish transaction, analytics funnels, RevenueCat trial branch (`/subscription-trial` still optional first), Firebase, APIs.

### DEBT 02 — Progress strip

`TodayProgressStrip` — quiet “N of M for today” + thin bar.  
No streak · coins · stars · score · dopamine.  
Secondary under hero. Silent when no plan (`total === 0`).

### DEBT 03 — Sanctuary continuity

`TodayHomeShell` imports frozen `first-experience-material.css` (same pattern as Discovery).  
Photography: existing `/experience/r1/shot-05-reflection.png`.  
No new visual system. Hero hierarchy unchanged.

---

## Do not touch (honored)

Parent Hub · Child Hub · Navigation · Premium · Ask Amy · Routine Engine · DB schema · decide-next engine · Welcome/Signup/Discovery files

---

## Database

Zero tables. Zero migrations.

---

## Quality gate

- [x] Unit tests (navigation path, progress strip, prior Today Home suite)
- [x] Typecheck
- [x] Production build (`pnpm --filter @workspace/kidschedule run build`)
- [x] Kill switch documented
- [x] Existing APIs / auth / analytics additive only

---

## STOP

Do **not** begin Parent Hub until Founder approval.
