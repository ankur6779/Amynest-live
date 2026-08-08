# Speech Coach P0 — Deep Interior Remediation Review

**Status:** IMPLEMENTED — awaiting Founder review  
**Flag:** `VITE_FF_SPEECH_COACH_LIVING_V1` (default ON; OFF = legacy neon face)  
**Frozen:** P0-7 Hard-Day Monetization · Speech engines · API · DB · Firebase · RevenueCat · entitlements · routing

---

## 1. Current-state audit

Before remanufacture, living **entry** was AmyNest house; deep interiors were not:

| Surface | Pre-state |
|---|---|
| `/speech-coach` living entry | Sanctuary (Phase 2) |
| `/speech-coach/live-session` | `#070812` neon + cyan/fuchsia glow chassis |
| `/speech-coach/talk` | Same neon chassis; Upgrade theatre; no leave continuity |
| Pronunciation companion | Neon tokens, confetti, XP glow panel |
| Games | Coins / badge / trophy completion theatre |
| `/speech-coach-v2` + session | Sky/indigo product hub; stars/pts pills; celebration overlay |
| Limit reached | “Unlock / Upgrade Now” theatre |

---

## 2. Neon chassis inventory (remediated under living ON)

| Element | Action |
|---|---|
| `#070812` + blur orbs (Live / Talk) | Removed when living; sanctuary `.sc-living-deep` shell |
| Cyan↔fuchsia progress bars | Cream sanctuary progress |
| Glow mic / Start Live gradient CTAs | Calm mic + “Begin gently” |
| Trophy / points / streak complete | Quiet presence copy |
| Accuracy % theatre (Live) | “Amy heard…” continuity |
| Pronunciation neon panel / confetti | Living palette + confetti off |
| Talk Premium / Free trial badges | Soft minutes note; PREMIUM_VOICE CTAs |
| V2 stars/pts pills + celebration | Presence chip + quiet complete + leave |
| V2 “Unlock Premium / Upgrade Now” | PREMIUM_VOICE + Not now (P0-7) |
| Games coins/badge bar + trophy complete | Hidden / quiet complete + leave |
| Leave continuity | Wired Live · Talk · Pronounce · V2 · Games |

**Living OFF:** legacy neon faces preserved for rollback.

---

## 3. Previous vs New

| Dimension | Previous (deep) | New (living ON) |
|---|---|---|
| Visual identity | Neon speech-training app | Another AmyNest room |
| Progress | XP / points / streak / % | Together / steps / quiet bar |
| Mic / CTA | Glow game chrome | Calm 48px+ targets |
| Completion | Trophy / coins / Amazing work | Gentle practice + leave |
| Premium | Unlock / Upgrade Now | Continue with AmyNest / Not now |
| Exit | Back to module only | Today Home · Parent Hub · today's help |

---

## 4. Entry

Unchanged Phase 2 living entry (sanctuary + quiet paths + deepen). Deepen destinations now inherit deep-interior sanctuary when opened.

---

## 5. Session

**Live** (`live-speech-coach.tsx` + `speech-coach-living-deep.css`):

- Sanctuary shell, calm chips, cream progress
- “Begin gently” / soft mic
- Steps / With you (not Points / Streak)
- Empty: calm “Practice isn’t ready yet”

---

## 6. Conversation / Practice

**Talk** (`conversation-coach.tsx`): living gate added (was ungated neon).

- Sanctuary shell + calm talk copy
- Active: Amy line + “You said…” (not console chat chrome)
- Premium after free talk: PREMIUM_VOICE (not Unlock theatre)
- Leave continuity on ended

**Pronunciation** (`pronunciation-companion.tsx`):

- `SPEECH_LIVING_DEEP_PALETTE` cream materials
- Confetti suppressed
- Soft waveform / progress / start CTA

---

## 7. Progress

| Data | Presentation when living |
|---|---|
| Session scoring / streaks / coins / V2 stars | **Logic preserved** |
| XP / points / streak / coins UI | **Hidden or quieted** |
| Quiet progress | Steps / Together / cream bar |
| Reports / dashboard under More | Still available; not living primary face |

---

## 8. Result

Quiet completion: what happened · what to try · enough for now · leave paths. No browse wall. No game reward theatre.

---

## 9. Premium

- RevenueCat / plans / products / entitlements / quotas **unchanged**
- P0-7 D1–D8 **unchanged** (no P0-7 file edits)
- Talk trial / V2 limit: continuity voice + Not now / leave
- Never “Pay to get help” on living deep face

---

## 10. Loading

No neon spinner / AI magic stages added. Existing truthful mic/status/`aria-live` retained; living empty/loading copy calmer.

---

## 11. Empty

Live empty → calm readiness message + path back. No feature catalogue.

---

## 12. Error

Mic Settings dialogs / STT status messages preserved (truthful). No fake success. Recovery: Open Settings / retry mic / leave.

---

## 13. Completion

Quiet titles/bodies via living helpers. Natural exits to Speech entry, Today Home, Parent Hub.

---

## 14. Exit

`AmyNestLeaveContinuity` on:

- Live complete  
- Pronounce done (existing)  
- Talk ended (**new**)  
- V2 celebration / limit (**new**)  
- Games living complete (**new**)  

---

## 15. Visual Manufacturing

| Asset | Role |
|---|---|
| `speech-coach-living-deep.css` | Shared deep sanctuary materials |
| `SPEECH_LIVING_DEEP_PALETTE` | Pronunciation calm tokens |
| Living helpers in `living-room.ts` | Copy / CTA / complete voice |

Reuses AmyNest cream / glass / restrained motion — **no new Speech design system**.

---

## 16. Accessibility

| Item | Status |
|---|---|
| `aria-live` mic status | Preserved |
| Progressbar labels | Preserved |
| Mic / CTA `min-h-12` / 48px class targets | Living CTAs |
| Reduced motion (deep CSS) | Progress/mic transitions respect preference |
| Semantic hierarchy | Eyebrow / title / panel |
| Real-device VO/TalkBack cert | **NOT claimed** — manual debt |

---

## 17. Motion

Confetti / neon pulse / glow removed under living. Remaining motion: progress width, mic press — restrained.

---

## 18. Performance

No new API/AI/polling. CSS + conditional classNames only. No duplicate speech engine calls.

---

## 19. P0-7 Regression

| Check | Result |
|---|---|
| P0-7 source files modified? | **NO** |
| D1–D8 values changed? | **NO** |
| `hard-day-monetization` tests | **PASS** |
| Ask Amy soft-continue / Emotional MFHO | Untouched |

---

## 20. DB / API / Firebase Safety

| Item | Status |
|---|---|
| DB | Unchanged |
| API | Unchanged |
| Firebase | Unchanged |
| Speech / AI engines (`@workspace/speech-coach*`) | Unchanged |
| Memory / analytics contracts | Unchanged |
| Auth / routing / deep links | Unchanged |

---

## 21. RevenueCat Safety

Plans · products · entitlements · quotas · billing · RC config — **unchanged**.

---

## 22. Flag Safety

| Flag | Behavior |
|---|---|
| `VITE_FF_SPEECH_COACH_LIVING_V1` unset / true | Manufactured deep interior |
| `=0` / false | Legacy neon faces available |

No extra flags created. Rollback = set flag OFF.

---

## 23. Tests

| Suite | Result |
|---|---|
| `living-room.test.ts` | PASS |
| `living-session.test.ts` (extended) | PASS |
| `show-speech-coach-legacy.test.ts` | PASS |
| `speech-game-rewards.test.ts` | PASS |
| V2 `session-presentation` / `usage-display` | PASS |
| P0-7 `hard-day-monetization` + SubItemGate | PASS |
| kidschedule `tsc --noEmit` | PASS |

Note: unrelated `speech-coach-audio-warmup` static-map miss observed in wider glob; not caused by this remanufacture (map-not-ready env).

---

## 24. Production Build

`pnpm run build` (kidschedule) — **PASS** (`✓ built` + SEO assets).

---

## 25. Screenshots

Auth-gated cloud environment blocked signed-in Speech deep capture.

Captured / documented:

- Onboarding blocker screens under `/opt/cursor/artifacts/` (auth wall)
- Code verification of `data-sc-living-deep` + `.sc-living-deep*` across Live / Talk / Pronounce / V2

**Founder device should confirm:** Entry · Live · Talk · Pronounce practice · Games complete · V2 session · Limit · Leave exits — all sanctuary, not neon.

---

## 26. Blind Test

| Question | Target | Honest score |
|---|---|---|
| Another speech-training app? | NO | **Mostly NO** on living deep (legacy OFF still neon) |
| AmyNest helping with speech? | YES | **YES** |
| Tool vs calm parenting experience? | CALM | **CALM** on living deep |
| Premium = continuation? | YES | **YES** on living Talk/V2 limit |

---

## 27. Founder Score

| Dimension | Score (0–10) | Note |
|---|---|---|
| Visual consistency | **8.2** | Deep now matches entry house; V2 parent dashboard still metric-heavy |
| Product consistency | **8.4** | Capability preserved; face quieted |
| Emotional consistency | **8.6** | Companion voice across deep paths |
| Deep-interior continuity | **8.3** | Live/Talk/Pronounce/V2/Games remediated |
| Premium continuity | **8.5** | P0-7 voice on Talk/V2 limit |
| Trust | **8.4** | No diagnosis / fake confidence claims added |
| Accessibility | **7.8** | Static improvements; no device VO cert |
| Performance | **8.7** | Presentation-only |
| Apple readiness | **8.0** | Neon chassis no longer living primary; residual V2 dashboard / More metrics |

**Do not inflate.** Deep neon is no longer the living default face; Apple blocker for neon chassis is **substantially reduced**, not claimed fully eliminated for every legacy/More surface.

---

## 28. Apple Readiness

| Ask | Answer |
|---|---|
| Living deep feels like AmyNest room? | **YES** |
| Living deep feels like separate neon speech app? | **NO** |
| Ready to claim Final Apple Audit complete? | **NO** — Hub peers / Final Audit still open |

---

## 29. Remaining Debt

1. V2 Parent Dashboard metric SaaS chrome (logic kept; presentation polish later)  
2. Living More → Reports/Dashboard fuchsia chart residual  
3. Affirmation carousel chrome under deepen  
4. Real-device VoiceOver / TalkBack certification  
5. Authenticated visual screenshot pack on Founder device  
6. Parent Hub peer catalogue remediation — **not started**  
7. Final Apple Audit — **not started**

---

## 30. Rollback

```bash
VITE_FF_SPEECH_COACH_LIVING_V1=0
```

Restores legacy neon Live / Talk / Pronounce / V2 / Games presentation. Engines/entitlements untouched.

---

## 31. Commit SHA

_Filled after commit on `cursor/product-execution-model-v2`._

---

## STOP

- Parent Hub remediation **not** started  
- P0-7 **not** modified  
- Routine Generation / Amy Coach / Amy Audio **not** modified  
- Final Apple Audit **not** run  

Awaiting Founder review.
