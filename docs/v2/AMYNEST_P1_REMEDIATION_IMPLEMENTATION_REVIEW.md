# AmyNest P1 Remediation — Implementation Review

**Status:** CODE-LEVEL P1 REMEDIATED · DEVICE CERTIFICATION STILL OUTSTANDING  
**Date:** 2026-08-15  
**Branch:** `main`  
**Baseline HEAD:** `ef8b3733`  
**Authority:** Founder Order — P1 debt + real-device QA preparation  
**Map (written first):** `docs/v2/AMYNEST_P1_REMEDIATION_IMPLEMENTATION_MAP.md`

This is **not** a Final Apple Audit. This is **not** VoiceOver / Dynamic Type / TalkBack certification.

---

## 1. P1 baseline

| Item | Value |
|---|---|
| Production candidate | Already on `main` (`ef8b3733`) |
| TypeScript | **PASS** |
| Relevant tests | **28 files / 193 PASS** |
| FA-02 / `/begin` door / Routine freeze | Unchanged going in |
| Documented P1 (Final Apple) | FA-03 `/welcome` · FA-04 Speech mid-play · FA-05 leave gaps · FA-06 `/begin` contrast · P0-9 device matrix |

No extra P1 invented. FA-09 Infant copy, Grow edtech interiors, Curiosity/Discovery remakes **not** in this order.

---

## 2. P1 implementation map

See `docs/v2/AMYNEST_P1_REMEDIATION_IMPLEMENTATION_MAP.md` (created **before** product edits).

---

## 3. `/welcome` remediation (FA-03)

**Classification:** was **B** (reachable from production journey).

| Change | Detail |
|---|---|
| `/begin` welcome secondary | **Not now → `/welcome`** removed. Secondary is **Sign in** → `/sign-in?from=first-experience` |
| Keep local note | No longer links to `/welcome`. Stays on `/begin` |
| Sign-in / Sign-up Keep fatigue | `href="/begin"` (was `/welcome`) |
| Marketing landing | Still neon/SEO surface. Added **Begin with today** → `/begin` (`welcome-enter-begin`) |

`/welcome` is **not** the production door. Landing neon **not** redesigned. Route kept for SEO/marketing.

---

## 4. Speech mid-play remediation (FA-04)

Living ON (`speech-game-flow.tsx`):

- Sanctuary card / cream accent instead of `SPEECH_GAME_THEMES` violet/cyan/amber fills
- Coin strip, star burst, setup star theatre hidden
- Play CTA: “Begin this practice” cream, not gradient game chrome
- Breathing bubble cream (not cyan ping)
- Scoring / coins **logic unchanged**; rewards bar already hidden when living

Living OFF: legacy game chrome preserved.

---

## 5. Leave-path remediation (FA-05)

Mounted existing `AmyNestLeaveContinuity` (Today Home · Parent Hub · Back to rooms) on living faces:

| Surface | File |
|---|---|
| Infant Care | `infant-hub.tsx` |
| Nutrition | `nutrition-layout.tsx` (replaced lone Home link) |
| Amy Coach | `ai-coach.tsx` living goals shell |
| Amy Audio | `audio-lessons.tsx` |
| Talking Amy | `talking-amy/index.tsx` |

No new tabs. No new IA. Grow/Health/Speech/assistant/Birth Sky dashboard already had continuity.

Out of scope this order: Curiosity / Discovery Worlds interiors.

---

## 6. `/begin` accessibility remediation (FA-06)

`first-experience-material.css` only:

- Title/body/quiet type opacity raised on photography
- Opening copy dark scrim (`::after`)
- Primary CTA brighter cream / darker ink `#1a120c`
- `:focus-visible` rings on buttons, choices, name field
- Disabled opacity 0.58 (was 0.4)
- Targets remain ≥50px; reduced-motion block unchanged

**Not claimed:** VoiceOver, Dynamic Type, TalkBack, physical touch, device reduced-motion.

---

## 7. Device QA matrix

| Surface / check | iPhone VO | iPhone DT | iPhone touch | iPhone RM | iPad VO/DT/layout | Android TalkBack | Android font scale | Android touch | Android RM |
|---|---|---|---|---|---|---|---|---|---|
| `/begin` | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED |
| Today Home | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED |
| Parent Hub + rooms | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED |
| Speech living + mid-play | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED |
| Infant / Nutrition / Coach / Audio / Talking Amy leave | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED |
| Bottom nav | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED |
| Modals/sheets | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED | DEVICE REQUIRED |

### STATIC VERIFIED (this VM)

- `/begin` type/CTA/focus CSS; Continue + Sign in visible
- Leave component `min-h-12` + Home/Hub exits
- Production mixed universe still rejected (FA-02 unchanged)
- Reduced-motion CSS present on `/begin` and landing v3 fades

### DEVICE REQUIRED

All VoiceOver, Dynamic Type, TalkBack, physical 44pt touch, system Reduce Motion, VoiceOver rotor/focus order. **Do not mark PASS.**

---

## 8. Files changed

Experience / tests / docs only:

- `first-experience.tsx`, `first-experience-material.css`
- `landing.tsx`, `sign-in.tsx`, `sign-up.tsx`
- `speech-game-flow.tsx`, `lib/speech-coach/living-room.ts`, `living-session.test.ts`
- `infant-hub.tsx`, `nutrition-layout.tsx`, `ai-coach.tsx`, `audio-lessons.tsx`, `talking-amy/index.tsx`
- `amy-nest-leave-continuity.test.tsx`, `production-door-p1.test.ts`
- `docs/v2/AMYNEST_P1_REMEDIATION_IMPLEMENTATION_MAP.md` + this review

**Not changed:** Routine, FA-02, RevenueCat, DB, API, Firebase, Auth, engines, 21-law modules interiors (except leave mount + Speech mid-play chrome).

---

## 9. Production safety

| Gate | Result |
|---|---|
| FA-02 master | **Untouched** |
| Mixed production | Still forbidden (prior lock) |
| Rollback `VITE_FF_AMYNEST_LIVING_UNIVERSE=0` | **Available** (Speech/leave living gates honor living OFF) |
| `/begin` door | **Preserved** |
| `/welcome` | Alternate + containment; not the door |

---

## 10. Tests

Baseline: 28 files / 193 PASS.  
After: **30 files / 199 PASS** (same living/Hub/P0-6/P0-7/Speech/Routine/FA-02 set **plus** leave component + production-door containment).

---

## 11. Production build

`pnpm --filter @workspace/kidschedule run build` → **PASS** `✓ built in 24.26s`  
TypeScript libs + kidschedule → **PASS**

---

## 12. Visual regression

<img src="/opt/cursor/artifacts/p1_begin_contrast.webp" alt="/begin sanctuary with Continue and Sign in" />

<img src="/opt/cursor/artifacts/p1_welcome_containment.webp" alt="/welcome marketing with Begin with today containment" />

<video src="/opt/cursor/artifacts/p1_begin_and_welcome_containment.mp4" controls></video>

- `/begin`: same photography house; Continue cream; secondary **Sign in** (not neon). Brief existing splash may flash before FE paints (pre-existing; not this P1).
- `/welcome`: still marketing purple; **Begin with today** under Continue.
- Authenticated Speech mid-play / Hub rooms: **not recaptured** (unsigned VM). Code-level living chrome gated.

---

## 13. P1 blind test

| # | Question | Answer |
|---|---|---|
| 1 | Does `/welcome` create a second production universe? | **MOSTLY** — still a marketing OS, but **removed from the living journey**. Production door is `/begin`. |
| 2 | Does Speech Coach mid-play feel like another app? | **NO** on living chrome (code). Visual mid-play **NOT TESTABLE** unsigned. |
| 3 | Can every deep destination leave cleanly? | **MOSTLY** — FA-05 five wired. Curiosity/Discovery still residual (out of this order). |
| 4 | Is `/begin` readable and accessible? | **YES** statically. Device a11y **NOT CERTIFIED**. |
| 5 | Does any P1 remain that materially affects product trust? | **MOSTLY no** for code-verifiable P1. Device certification still blocks a11y claims. |
| 6 | Did any P0 appear during remediation? | **NO** |
| 7 | Did any existing manufactured module regress? | **NO** (openings/interiors not remade; leave added) |

---

## 14. Remaining device-only debt

VoiceOver, Dynamic Type, TalkBack, physical touch, device Reduce Motion, modal/sheet VO, bottom-nav VO — **all DEVICE REQUIRED**. See §7.

---

## 15. Remaining P1 debt

- P0-9 device certification (operational next)
- `/welcome` still a second **marketing** visual OS if someone hits the URL (contained)
- Curiosity / Discovery Worlds leave (not in this Founder list)
- Known Routine non-P0 interiors (frozen)
- Speech mid-play **device** look (unsigned VM)

---

## 16. Rollback verification

Living module flags and master `0` / `legacy` still select legacy Speech game chrome and skip the new living-only leave mounts. FA-02 **not** modified.

---

## 17. Final Founder recommendation

**P0 = 0.**  
**Code-verifiable P1 (FA-03 journey exposure, FA-04 mid-play chrome, FA-05 five leaves, FA-06 `/begin` contrast) = remade.**  
**Device accessibility certification = explicitly outstanding.**

Wait for Founder review. Next work is **real-device QA**, not another Apple audit or module phase.
