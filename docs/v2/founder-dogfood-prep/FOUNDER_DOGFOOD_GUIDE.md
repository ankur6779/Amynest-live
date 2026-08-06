# Founder Dogfood Guide

**Mission:** Observe how real parents use Amy. Do not improve the product in this sprint.  
**Audience:** Founder + closed internal observers  
**Mode:** Presentation V2 surfaces only — Brain / Experience Packs remain OFF

---

## 1. Session setup

### Flags (dogfood build — still OFF in production defaults)

```bash
VITE_V2_FF_NEW_FRONT_DOOR=1
VITE_V2_FF_GUEST_MODE_V2=1
VITE_V2_FF_TODAY_V2=1
VITE_V2_FF_PREMIUM_V2=1
VITE_V2_FF_NEW_NAVIGATION=1
VITE_V2_FF_ASK_AMY_V2=1
VITE_V2_FF_FOR_CHILD_V2=1
```

Do **not** enable Brain / Decision / Experience Resolver packs for this wave unless the session explicitly tests those engines.

Full env notes: [`../DOGFOOD_SETUP.md`](../DOGFOOD_SETUP.md)

### Happy path to observe

1. Fresh session → Landing / Front Door  
2. Age → Name? → Worry → Continue to Today  
3. Today → Mission → complete or leave  
4. Coach card / Coach plan  
5. Ask Amy (note: may hit account gate — record what happens)  
6. For Child tab (note: may hit sign-in — record what happens)  
7. Premium (guest → account continuity)  
8. Signup → return path  

---

## 2. Founder Observation Mode (developer-only)

**No parent UI.** Capture stays in the browser. No analytics backend.

### Enable (DEV only)

| Method | How |
|--------|-----|
| Query | Append `?founderObserve=1` |
| Storage | `localStorage.setItem('__amynest_founder_observe','1')` then reload |
| Console | `window.__AMYNEST_FOUNDER_OBS__.enable()` |

Disable: `?founderObserve=0` or `.disable()`

### Inspect

```js
window.__AMYNEST_FOUNDER_OBS__.getSummary()
window.__AMYNEST_FOUNDER_OBS__.exportJson()
```

### Captured signals

| Signal | Meaning |
|--------|---------|
| `firstMeaningfulAction` | First button / link / control interaction |
| `timeToFirstMissionMs` | Open → first `/today/mission` |
| `timeToCoachMs` | Open → first Coach surface |
| `timeToAskAmyMs` | Open → first Ask Amy surface |
| `timeBeforeLeavingTodayMs` | First leave from `/today` |
| `firstHesitationMs` | First idle > 5 seconds |
| `screenSequence` | Ordered screen labels |
| `exitPoint` | Last screen + leave reason |

Console prints once when active:  
`[AmyNest Founder Observation] active — window.__AMYNEST_FOUNDER_OBS__.getSummary()`

---

## 3. Dogfood checklist (every session)

Answer after each founder/parent session:

| # | Question | Y / N / Partial | Notes |
|---|----------|-----------------|-------|
| 1 | Did Amy remember me? | | Age / name / worry / return |
| 2 | Did Amy understand my concern? | | Worry → Today / CTAs |
| 3 | Was today's next step obvious? | | Mission clarity |
| 4 | Did I ever feel lost? | | Where? |
| 5 | Did any screen feel like software instead of care? | | Which? |
| 6 | Did I hesitate? | | Match Observation `firstHesitationMs` |
| 7 | Which screen felt slow? | | |
| 8 | Which screen felt unnecessary? | | |
| 9 | Which screen felt magical? | | |

Paste Observation summary JSON under Notes when available.

---

## 4. Founder Heatmap framework

For **every screen** in the session, mark one:

| Mark | Meaning |
|------|---------|
| 🟢 Immediate | Knew what to do without thinking |
| 🟡 Slight hesitation | Paused, then figured it out |
| 🔴 Confusing | Wrong action, backtrack, or gave up |

### Screen grid (copy per session)

| Screen | 🟢 / 🟡 / 🔴 | First action taken | Ignored | Notes |
|--------|--------------|--------------------|---------|-------|
| Landing | | | | |
| Front Door — Breath | | | | |
| Front Door — Age | | | | |
| Front Door — Name | | | | |
| Front Door — Worry | | | | |
| Today | | | | |
| Mission | | | | |
| Mission Success | | | | |
| Coach | | | | |
| Ask Amy | | | | |
| For Child | | | | |
| Premium | | | | |
| Guest account sheet | | | | |
| Signup | | | | |
| Post-signup return | | | | |

No code required for the heatmap — observation only.

---

## 5. After the session

1. Fill Emotion Friction Log → [`EMOTION_FRICTION_LOG.md`](./EMOTION_FRICTION_LOG.md)  
2. If watching a parent → [`PARENT_OBSERVATION_GUIDE.md`](./PARENT_OBSERVATION_GUIDE.md)  
3. File bugs with priority from [`RISK_MATRIX.md`](./RISK_MATRIX.md)  
4. Do **not** implement fixes in this sprint unless Founder opens a fix wave  

**STOP after observation.** Discover reality first.
