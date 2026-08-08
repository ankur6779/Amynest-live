# AmyNest P0-9 — Real Device Accessibility Certification

**Status:** CERTIFICATION EVIDENCE RECORDED — **DEVICE CERTIFICATION NOT COMPLETE**  
**Authority:** Founder Order — P0-9 Real Device Accessibility Certification  
**Date:** 2026-08-08  
**Branch:** `cursor/product-execution-model-v2`  
**Agent environment:** Linux cloud VM (Cursor background agent)

**Frozen surfaces (not modified in this order):**
- P0-6 Parent Hub peer catalogue
- P0-7 Hard-Day monetization
- Speech Coach P0 deep interior
- Routine Generation
- Amy Coach / Amy Audio

**Order constraint:** Certification / evidence only. No product redesign. No silent fixes.

---

## 1. Certification scope

### Primary experience surfaces required

| Surface | Priority (remade on this branch) | Device cert status |
|---|---|---|
| Welcome | High | **NOT TESTED** (no device) |
| Signup | High | **NOT TESTED** |
| Child Discovery | High | **NOT TESTED** |
| Today Home | High | **NOT TESTED** |
| Parent Hub root | **P0-6 remade** | **NOT TESTED** |
| Help / Understand / Care / Moments | **P0-6 remade** | **NOT TESTED** |
| Infant Care | High | **NOT TESTED** |
| Speech Coach (entry + deep) | **Speech P0 remade** | **NOT TESTED** |
| Nutrition | Medium | **NOT TESTED** |
| Health Lab | Medium | **NOT TESTED** |
| Grow | Medium | **NOT TESTED** |
| Birth Sky | Medium | **NOT TESTED** |
| Ask Amy | **P0-7 related** | **NOT TESTED** |
| Guidance | Medium | **NOT TESTED** |
| Moments destinations | Medium | **NOT TESTED** |
| Talking Amy | Medium | **NOT TESTED** |
| Amy Coach | Medium | **NOT TESTED** |
| Amy Audio | Medium | **NOT TESTED** |
| Routine Generation | High (R5 frozen) | **NOT TESTED** |

### What this document may and may not claim

| Allowed as certification? | Source |
|---|---|
| **YES — device certification** | Real iOS VoiceOver / Dynamic Type / reduced motion / touch on physical device |
| **YES — device certification** | Real Android TalkBack on physical device |
| **NO — supporting only** | TypeScript, unit tests, browser, static analysis, source inspection |

Per Founder order: **browser/static checks must not be substituted for device certification.**

---

## 2. Devices

| Platform | Device | Available in this run? |
|---|---|---|
| iOS | Physical iPhone / iPad | **NO** |
| iOS Simulator + VoiceOver | Xcode toolchain | **NO** (`xcrun` / `idevice` absent) |
| Android | Physical device + TalkBack | **NO** |
| Android emulator + TalkBack | `adb` / SDK | **NO** (`ANDROID_HOME` empty; `adb` absent) |
| Host OS | Linux `cursor` kernel 6.12.94+ x86_64 | YES — **not an Apple/Android a11y host** |

**Conclusion:** No qualifying accessibility test device was attached or available.

---

## 3. OS versions

| Item | Value |
|---|---|
| iOS version under test | **N/A — no device** |
| iPadOS version under test | **N/A — no device** |
| Android version under test | **N/A — no device** |
| App build under test | Built artifacts exist on branch (`kidschedule` production build previously PASS) — **not installed to a device in this run** |
| Accessibility settings exercised | **None on device** |

---

## 4. VoiceOver results

### Platform attempt

| Check | Result |
|---|---|
| Real iOS device with VoiceOver enabled | **NOT TESTABLE** |
| Navigation order / headings / CTAs / rooms / Premium / modals / Speech / Routine states | **NOT TESTABLE** |
| Focus trap / lost focus / duplicate labels / decorative-as-control | **NOT TESTABLE** |

### Classification

**MANUAL DEVICE CERTIFICATION REQUIRED**

### Supporting (non-certifying) static notes only

Prior portfolio work added / retained semantics such as:

- Leave continuity `nav` + aria labels (`AmyNestLeaveContinuity`)
- Soft-continue `role="status"` / `aria-live` on Ask Amy exhaust (P0-7)
- Room living recommend / quiet path buttons with titles (P0-6)
- Speech living deep `aria-live` mic status (Speech P0)

These are **not** VoiceOver certification.

### VoiceOver verdict

**NO — not certified**

---

## 5. TalkBack results

| Check | Result |
|---|---|
| Android device available | **NO** |
| TalkBack primary-path pass | **NOT TESTED** |

Per Founder order: **Do not claim TalkBack certification.**

### Mark

**MANUAL DEVICE CERTIFICATION NOT AVAILABLE**

### TalkBack verdict

**NOT TESTED**

---

## 6. Dynamic Type results

| Check | Result |
|---|---|
| iOS Larger Accessibility sizes on device | **NOT TESTABLE** |
| Welcome / Today Home / Hub / Speech / Infant / Routine / Premium / errors / completion at AX sizes | **NOT TESTABLE** |
| Clipped text / overlapping / hidden CTA / overflow / photography swallowing text | **NOT TESTABLE on device** |

### Classification

**MANUAL DEVICE CERTIFICATION REQUIRED**

### Dynamic Type verdict

**NO — not certified**

---

## 7. Touch target results

| Check | Result |
|---|---|
| Physical tap usability on device | **NOT TESTABLE** |
| Neighbouring accidental taps | **NOT TESTABLE** |

### Supporting (non-certifying) static notes only

Code-level `min-h-12` / `min-h-11` targets exist on several remade controls (leave exits, SubItemGate Not now / Continue, living CTAs). This is **static craft support**, not device verification.

### Touch target verdict

**NO — not device-verified**  
*(static support exists; device PASS not earned)*

---

## 8. Contrast results

| Check | Result |
|---|---|
| Rendered photography overlays / CTA / body / secondary / Premium / error / loading / disabled on device | **NOT TESTABLE** |
| Dark/light transitions on device | **NOT TESTABLE** |

### Classification

**MANUAL DEVICE CERTIFICATION REQUIRED**

Known risk areas requiring device eyes (not claimed as failures without device proof):

- Parent Hub / Moments / Help room photography + text veil
- Speech Coach living deep cream-on-dark sanctuary
- Premium continuity on dark panels

### Contrast verdict

**NO — not certified on device**

---

## 9. Reduced Motion results

| Check | Result |
|---|---|
| System Reduce Motion enabled on iOS/Android device | **NOT TESTABLE** |
| Room / photography / Speech / Talking Amy / Coach / Audio / Routine / modal motion | **NOT TESTABLE** |

### Supporting (non-certifying) static notes only

Speech living deep CSS includes `@media (prefers-reduced-motion: reduce)` for progress/mic transitions. **Not device-certified.**

### Reduced motion verdict

**NO — not certified**

---

## 10. Focus / navigation results

| Check | Result |
|---|---|
| External keyboard / focus order on iOS | **NOT TESTABLE** in this environment |
| Modal focus / return focus after close | **NOT TESTABLE** |
| Paywall focus / dismissal discoverability | **NOT TESTABLE** |

### Classification

**NOT TESTABLE** / **MANUAL DEVICE CERTIFICATION REQUIRED**

---

## 11. Premium accessibility

| Requirement | Device result |
|---|---|
| Understand what is available | **NOT TESTABLE** |
| Understand what Premium provides | **NOT TESTABLE** |
| Continue / Not now where permitted | **NOT TESTABLE** |
| Leave without trap | **NOT TESTABLE** |
| No inaccessible paywall / invisible dismiss | **NOT TESTABLE** |

### Supporting (non-certifying)

P0-7 Hard-Day Law presentation: soft-continue message, Not now / leave continuity, PREMIUM_VOICE — **code present; device VO/focus not proven.**

### Premium a11y verdict

**MANUAL CERTIFICATION REQUIRED**

---

## 12. Routine Generation accessibility

| State | Device result |
|---|---|
| Build today's plan | **NOT TESTABLE** |
| Generation / Here it is / Start here / Begin today | **NOT TESTABLE** |
| Rebuild confirmation / execution / completion | **NOT TESTABLE** |
| Exit to Home | **NOT TESTABLE** |

**No Routine Generation logic modified.**

### Verdict

**MANUAL CERTIFICATION REQUIRED**

---

## 13. Speech Coach accessibility

| State | Device result |
|---|---|
| Session start / mic / conversation / practice | **NOT TESTABLE** |
| Completion / Premium continuity / error-retry | **NOT TESTABLE** |
| Control labels + state announcements under VoiceOver | **NOT TESTABLE** |

**No Speech engine modified.**

Prior computer-use attempt (Speech P0) hit **auth/onboarding wall** before deep Speech surfaces — not a VoiceOver pass.

### Verdict

**MANUAL CERTIFICATION REQUIRED**

---

## 14. Parent Hub accessibility

| State | Device result |
|---|---|
| Four rooms / recommend / quiet paths / transitions / back / exit / Premium | **NOT TESTABLE** |
| Hierarchy understandable with VO / without relying on photography alone | **NOT TESTABLE** |

**P0-6 not modified in this order.**

### Verdict

**MANUAL CERTIFICATION REQUIRED**

---

## 15. Infant Care accessibility

| State | Device result |
|---|---|
| Today's Care / recommend / Sleep / Feeding / Growth / Health / Milestones / More / Premium | **NOT TESTABLE** |
| Nested navigation accessibility | **NOT TESTABLE** |

### Verdict

**MANUAL CERTIFICATION REQUIRED**

---

## 16. Failure inventory

| ID | Finding | Surface | Evidence type | Severity |
|---|---|---|---|---|
| A11Y-ENV-01 | No iOS device / Simulator VoiceOver tooling in certification environment | All | Environment | **P0 — blocks accessibility release claim** |
| A11Y-ENV-02 | No Android device / TalkBack tooling | All Android | Environment | **P0 for Android claim** / **NOT TESTED** |
| A11Y-ENV-03 | Dynamic Type AX sizes not exercised on device | All listed | Environment | **P0 — blocks DT certification** |
| A11Y-ENV-04 | Reduced Motion system setting not exercised on device | Motion-heavy modules | Environment | **P1 before Apple craft claim** |
| A11Y-ENV-05 | Physical touch-target verification not performed | CTAs / rooms / Speech / Routine | Environment | **P1** |
| A11Y-ENV-06 | Contrast of photography overlays not measured on device | Hub / Moments / Speech living | Environment | **P1** |
| A11Y-PROD-01 | No new product defect proven on device (because no device pass occurred) | — | N/A | **NOT TESTABLE** |

**No silent product fixes performed.**  
**No P0/P1 product defect remediation started** (none device-proven; environment blocked testing).

---

## 17. P0 / P1 / P2 classification

| Class | Items |
|---|---|
| **P0 — blocks accessibility release** | A11Y-ENV-01, A11Y-ENV-02 (for any Android claim), A11Y-ENV-03 |
| **P1 — must fix/complete before Apple a11y craft claim** | A11Y-ENV-04, A11Y-ENV-05, A11Y-ENV-06 + full VO matrix on remade surfaces |
| **P2 — polish** | None device-proven |
| **PASS** | None for real-device certification |
| **NOT TESTABLE** | All VoiceOver / TalkBack / DT / contrast / reduced-motion / focus matrices in §4–15 |
| **MANUAL CERTIFICATION REQUIRED** | Full Founder/QA device matrix below |

---

## 18. Screenshots / evidence

| Artifact | Relevance |
|---|---|
| `/opt/cursor/artifacts/speech-auth-blocker-onboarding.png` | Shows prior auth wall — **not** VO evidence |
| `/opt/cursor/artifacts/speech-onboarding-child-name.png` | Onboarding visual — **not** VO evidence |
| `/opt/cursor/artifacts/speech-coach-living-verification-report.md` | Code verification of Speech living — **supporting only** |

**No VoiceOver rotor screenshots. No Dynamic Type screenshots. No TalkBack recordings.**

---

## 19. Unavailable tests

| Test | Reason unavailable |
|---|---|
| iOS VoiceOver full matrix | No iPhone/iPad / no Xcode VO host |
| iOS Dynamic Type AX sizes | No iOS device |
| iOS Reduce Motion | No iOS device |
| Android TalkBack | No Android device / no `adb` |
| Physical touch accuracy | No touch device under test |
| Installed TestFlight / device build exercise | Not performed in this agent run |
| Authenticated module deep paths under VO | Requires device + signed-in build |

---

## 20. Certification limitations

1. This run executed inside a **Linux cloud agent** without Apple or Android accessibility hosts.  
2. Prior static a11y craft on the branch is **supporting evidence only**.  
3. Auth/onboarding previously blocked unauthenticated browser exploration of remade modules — even browser VO substitutes were incomplete; **browser is still not device certification**.  
4. Founder Order forbids claiming certification from TypeScript / unit tests / browser / static analysis / source inspection.  
5. Therefore P0-9 **cannot be closed** by this document alone.

### Required Founder / QA matrix (to close P0-9)

**Minimum iOS device pack (physical):**

1. iPhone with latest supported iOS used by AmyNest  
2. VoiceOver ON — Welcome → Signup/Discovery → Today Home → Parent Hub (Help/Understand/Care/Moments) → Ask Amy → Speech Coach session → Routine Generation → Infant Care → Premium Not now / leave  
3. Dynamic Type → Accessibility sizes on Hub rooms, Today Home, Speech, Routine, Premium  
4. Reduce Motion ON — room transitions, Speech, Routine completion  
5. Record device / OS / build / PASS-FAIL per surface  

**Android (if shipping Android):**

1. Physical device + TalkBack  
2. Equivalent primary path  
3. If unavailable at ship time: keep **NOT TESTED** and do not claim TalkBack

---

## 21. Final accessibility verdict

### Answers (Founder-required)

| # | Question | Answer |
|---|---|---|
| 1 | Is iOS VoiceOver certified? | **NO** |
| 2 | Is Dynamic Type certified? | **NO** |
| 3 | Is Android TalkBack certified? | **NOT TESTED** |
| 4 | Are touch targets verified (on device)? | **NO** |
| 5 | Is reduced motion verified (on device)? | **NO** |
| 6 | Are there any P0 accessibility blockers? | **YES** — device certification environment unavailable; P0-9 remains open (A11Y-ENV-01/03). No device-proven product P0 defect list yet because testing could not run. |
| 7 | Are there any P1 accessibility blockers? | **YES** — incomplete device matrix (motion, touch, contrast, full VO path) blocks honest Apple a11y craft claim. |

### Overall

**P0-9 REAL DEVICE ACCESSIBILITY CERTIFICATION: NOT COMPLETE**

Honest outcome for Founder:

> AmyNest still requires a **human device certification pass** on physical iOS (and Android if claimed) before accessibility can be marked certified. This agent run produced **evidence of non-availability**, not a false PASS.

---

## STOP

- Final Apple Audit — **not run**  
- P0-6 / P0-7 / Speech Coach / Routine Generation / Amy Coach / Amy Audio — **not modified**  
- No accessibility remediation code — **none** (no device-proven product defects to remediate)  
- Deliverable = this certification evidence document only  

Awaiting Founder review and assignment of real-device QA.
