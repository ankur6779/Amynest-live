# AmyNest P1 Remediation — Implementation Map

**Status:** MAP ONLY (written before product code)  
**Date:** 2026-08-15  
**HEAD at map time:** `ef8b3733` (`main`)  
**Authority:** Founder Order — P1 debt remediation + real-device QA preparation  
**Source of P1 items:** Final Apple Audit FA-03 · FA-04 · FA-05 · FA-06 + P0-9 device matrix (evidence only)

Do **not** invent extra P1. Do **not** remake modules. Do **not** thaw engines.

---

## P1-WELCOME — FA-03 `/welcome` neon OS

| | |
|---|---|
| **Current code** | `pages/landing.tsx` purple/pink marketing; `AppCore` `/welcome` → `LandingPage`; production journey links: `first-experience.tsx` welcome **Not now** + keep **Continue without an account**; `sign-in.tsx` / `sign-up.tsx` fatigue exits |
| **Current behaviour** | `/begin` is the door, but parents can **leave the living house into neon** from FE and Keep-mode auth |
| **Classification** | **B — reachable from the production user journey** (not isolated-only) |
| **Expected** | Production path never dumps into neon. `/welcome` may remain an alternate/SEO surface. `/begin` stays the door. |
| **Files** | `first-experience.tsx`, `sign-in.tsx`, `sign-up.tsx`, `landing.tsx` |
| **Smallest safe fix** | Retarget FE/auth exits to `/begin` or `/sign-in?from=first-experience` (no `/welcome`). On `/welcome`, add a containment link to `/begin` (“Begin with today”). Do **not** redesign neon; do **not** delete landing. |
| **Test/evidence** | Grep production journey for `setLocation("/welcome")` / `href="/welcome"` = gone except landing route. Visual: `/begin` sanctuary vs `/welcome` still marketing but points home. |

---

## P1-SPEECH — FA-04 Speech mid-play coins/themes

| | |
|---|---|
| **Current code** | `speech-game-flow.tsx` living **completion** already quiet; **setup + mid-play** still uses `SPEECH_GAME_THEMES` violet/cyan cards, coin strip, `StarsBurst`, gradient Play CTA, cyan `BreathingBubble`. Rewards bar already hidden when living. |
| **Current behaviour** | Opening is sanctuary; a games session peeks a second app |
| **Expected** | Living ON: same sanctuary materials mid-play; coins/XP/theme theatre hidden (data/scoring **kept**). Living OFF: legacy unchanged. |
| **Files** | `speech-game-flow.tsx`, `lib/speech-coach/living-room.ts` (+ existing `living-session.test.ts`) |
| **Smallest safe fix** | Gate theme card/accent, coin strip, star burst, setup star theatre, gradient CTA, cyan bubble behind `isSpeechCoachLivingV1Enabled()`. No engine/API/route changes. |
| **Test/evidence** | Living chrome helpers have no violet/coin strings; living-session tests; visual Speech games play. |

---

## P1-LEAVE — FA-05 leave continuity gaps

| | |
|---|---|
| **Current code** | `AmyNestLeaveContinuity` exists (Today Home · Parent Hub · optional continue). Wired on Speech complete, HubModulePageShell (Grow/Health/Abacus…), assistant, phonics, Birth Sky dashboard. **Missing (Final Apple):** Infant Care living, Nutrition living, Amy Coach living open, Amy Audio, Talking Amy. |
| **Current behaviour** | Those five deep destinations use ad-hoc Back / single Home links, not the shared leave ritual |
| **Expected** | Parent always sees Today Home · Parent Hub · optional Continue today / rooms. No new tabs, no browse loop, no new IA. |
| **Files** | `infant-hub.tsx`, `nutrition-layout.tsx`, `ai-coach.tsx` (living goals shell), `audio-lessons.tsx`, `talking-amy/index.tsx` |
| **Smallest safe fix** | Mount existing `AmyNestLeaveContinuity` on living faces only. Nutrition: replace lone “Back to Today Home” with the shared nav (Home already included). |
| **Out of scope** | Curiosity/Discovery Worlds remake, Grow edtech interiors, Astro dashboard remake (not this Founder P1 list; Grow/Astro already have continuity on shell/dashboard). |
| **Test/evidence** | Component still exposes `leave-exit-today-home` / `leave-exit-parent-hub`. Manual living pages show the nav. |

---

## P1-BEGIN — FA-06 `/begin` CTA / contrast / a11y polish

| | |
|---|---|
| **Current code** | `first-experience-material.css`: title `rgba(244,238,230,0.78)`, body `0.40`, primary cream `#f7f1e8` / ink `#12081f`, quiet ghost `white/82`, copy spill only (no dark scrim under opening type), focus ring absent on `.fe-btn` |
| **Current behaviour** | Calm photography door; type and taupe CTA compete with the photograph (HIG contrast risk) |
| **Expected** | Readable title/body/CTA on photography; visible focus; disabled still distinguishable; 48px+ targets kept; reduced-motion already present. **No device certification claim.** |
| **Files** | `first-experience-material.css` (experience CSS only) |
| **Smallest safe fix** | Raise type opacity; add opening copy scrim; stronger primary ink vs cream; `:focus-visible` ring; slightly less-faded disabled. Do not change photography, copy, or routing. |
| **Test/evidence** | Visual `/begin`. Device VO/DT/TalkBack = **DEVICE REQUIRED**. |

---

## P1-DEVICE — P0-9 matrix (no code certification)

Static code checks only + a real-device matrix in the review. Cloud VM **never** marks VoiceOver / Dynamic Type / TalkBack / physical touch **PASS**.
