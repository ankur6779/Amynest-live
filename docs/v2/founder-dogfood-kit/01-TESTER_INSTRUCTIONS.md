# 1. Tester Instructions

**Time budget:** ~15–20 minutes (path) + under 3 minutes (questions)  
**Build:** V2 dogfood build with flags from `DOGFOOD_SETUP.md`  
**Account for path A:** none (guest) · **Path B (optional):** new email/Google/Apple  

---

## Exactly what to do

### Before you start

1. Install / open the **dogfood build** (not production App Store / Play / www unless told).
2. Prefer a **fresh install** or clear site data / app storage so Front Door appears.
3. Start **screen recording** before the first tap (see Screen Recording Guide).
4. Fill the Observation Sheet as you go (timestamps help).

### Happy path (required — guest)

Do this once without help:

1. Open the app → complete **Front Door** (Age → optional Name → Worry → Continue to Today).
2. On **Today**, read the greeting and message. Do not skip reading.
3. Start **Today’s Mission** (Speech).
4. Follow the steps → tap **Mark complete**.
5. On success, tap **Back to Today** (primary). Optionally tap **Ask Amy** once — if a sheet appears, try **Not now**, then try **Continue** only if you want an account.
6. From Today, open **Continue with Premium** (or equivalent Premium CTA).
7. If you see an account-required message, either:
   - **Stop** (guest path complete), or  
   - **Create an account** and confirm you return to a sensible screen (Today or Premium).
8. Kill the app fully → reopen → confirm you land on **Today** (not Front Door COMPLETE loop).
9. Stop recording. Answer the Top Questions (under 3 minutes).

### Optional second pass (account)

Only if asked:

1. Create account from Premium or Ask Amy sheet.
2. Confirm Age / Name / Worry still feel present on Today.
3. Do **not** attempt real money purchase unless founder says sandbox is ready.

---

## Exactly what not to do

| Do not | Why |
|--------|-----|
| Use production App Store / Play / live site unless invited | Wrong flags / wrong funnel |
| Sign in with a production parent account first | Contaminates guest path |
| Skip Front Door or ask someone to “just open Today” | Misses conversion friction |
| Force Ask Amy / For Child via pasted URL | Dogfood cares about CTAs/tabs, not deep links |
| File bugs about missing Ask Amy AI depth | Out of scope for this dogfood |
| Redesign feedback as “must ship” lists | Capture as notes; gates decide |
| Purchase with real money | Sandbox only if explicitly enabled |
| Test Analytics / DebugView unless asked | Separate from founder feel test |
| “Fix” the app or change env flags | Contaminates the session |
| Compare to a full competitor teardown in session notes | Keep it experiential |

---

## What “good enough” looks like

- You finish Front Door → Mission → back to Today without getting stuck.
- Nothing feels like a dead end (especially Ask Amy / Premium).
- You can say in one sentence what AmyNest did for you today.

---

## If you get stuck

1. Note the screen + what you expected.
2. Screenshot or keep recording.
3. Tap **Not now** / Back to Today if a sheet is open.
4. Do **not** factory-reset mid-session unless the app is unusable — start a new Observation Sheet instead.
5. Message the founder with Bug Report Template filled.
