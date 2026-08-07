# AmyNest — Final Production Readiness Audit

**Status:** AUDIT ONLY · NO IMPLEMENTATION  
**Date:** 2026-08-07  
**Authority:** Founder Order — Final Production Readiness Audit  

**Scope:** Entire application — web · iOS Capacitor · Android WebView · API · Postgres · Firebase · RevenueCat · stores.

**Prior binds:**  
`AMYNEST_FINAL_GLOBAL_AUDIT.md` · `AMYNEST_FINAL_VISUAL_REGRESSION.md` · `AMYNEST_FINAL_APPLE_AUDIT.md` ·  
`docs/ops/commercial-launch-billing-qa.md` · App Store review notes · Module living flags

**STOP after this document.**

---

## Absolute answer

# Can AmyNest safely ship to millions of families?

# NO

**Soft launch under watch (thousands):** conditional yes — with ops discipline.  
**Millions of families today:** **no**.

Infrastructure is past prototype. It is not certified for mass concurrent parents, children, AI cost, billing, identity merge, or dual-universe UX.

---

## Domain scorecard

| Domain | Ready? | Grade | One-line |
|---|---|---|---|
| Authentication | **NO** | D+ | Works; no account linking / guest upgrade |
| Google Sign-In | **CONDITIONAL** | C+ | Three bridges (web / iOS / Android) — fragile matrix |
| Apple Sign-In | **CONDITIONAL** | C+ | Present; linking gaps remain |
| Facebook | **CONDITIONAL** | C | Present; ads ID tension with privacy story |
| Email | **CONDITIONAL** | C+ | Works; PII in client logs |
| Forgot Password | **CONDITIONAL** | C+ | Firebase reset; email logged |
| RevenueCat | **NO** | C- | Model correct; ops / sandbox / QA not certified |
| Firebase | **CONDITIONAL** | C | Auth + FCM real; not a hardened data plane |
| Analytics | **NO** | D | Instrumentation yes; consent plane no |
| Feature Flags | **NO** | D+ | Kill switches exist; dual universes default ON |
| Performance | **CONDITIONAL** | C | Lazy routes; Hub/voice weight; load unproven |
| Caching | **CONDITIONAL** | C+ | CDN + SW audio; not full offline product |
| Offline | **NO** | D+ | Partial module sync; not app-wide |
| Database | **NO** | D | Push-schema; almost no FKs; soft tenancy |
| APIs | **CONDITIONAL** | C | Auth solid; patchwork RL; AI debug risk |
| Security | **NO** | D+ | Child isolation app-layer; admin allowlist drift |
| Accessibility | **NO** | D | Reduced-motion yes; Dynamic Type / Hub VO no |
| Regression | **CONDITIONAL** | C- | Tests exist; dual UI = combinatorial bomb |
| Rollback | **CONDITIONAL** | C | Flag + CDN canary; slow build-time kills |
| App Store readiness | **CONDITIONAL** | C | Prior rejections remediated in docs; not clean |
| Play Store readiness | **CONDITIONAL** | C- | Billing QA open; AD_ID / Facebook tension |

---

# Domain findings

---

## 1. Authentication — NO

**Present**  
- Firebase Auth (web + native bridges).  
- Google · Apple · Facebook · Email enabled (`auth-feature-flags.ts`).  
- Password reset via Firebase (`password-reset.ts`, `auth-action-page.tsx`).  
- ID token verify on API (`requireAuth.ts`).  
- Silent refresh on 401 (`auth-recovery.ts`).  
- Sign-out clears caches + RevenueCat identity.  
- Device session helpers (strict mode opt-in).

**Blocks millions**  
| Gap | Why fatal at scale |
|---|---|
| **No account linking** | `account-exists-with-different-credential` → message only. Lost purchases / support hell. |
| **Guest → account upgrade missing** | Anonymous guest cannot cleanly become a paying parent. |
| **Phone OTP off** | `ENABLE_PHONE_OTP = false` |
| **PII in client logs** | Email logged on auth resolve / password reset |
| **Review bypass surface** | Email verification bypass list / patterns |
| **Three-platform auth matrix** | Web · iOS Capacitor · Android WebView — race/timeout debt |

**Forgot Password:** Functional via Firebase. Not million-family hardened (logging, support UX, linking).

---

## 2. Google / Apple / Facebook / Email — CONDITIONAL each

| Provider | Status | Risk |
|---|---|---|
| **Google** | Wired web + Play WebView + iOS | Bridge divergence; timeout races |
| **Apple** | Wired (`apple-auth.ts`) | Required for iOS; linking gaps |
| **Facebook** | Wired; app id hardcoded | Android AdvertiserID collection vs “no tracking” story |
| **Email** | Wired | Verification bypass + log hygiene |

None are “millions certified.” All are “can onboard a soft launch.”

---

## 3. RevenueCat — NO

**Present**  
- Server-owned entitlements (`subscriptionStateService`, `rcCustomerService`).  
- Webhook + idempotency + secret (`POST /subscription/webhook`).  
- Native purchase / restore bridges (Android BillingBridge · iOS Capacitor).  
- Paywall modal + restore.  
- Boot assert for RC V2 config in prod.

**Blocks millions**  
| Gap | Evidence |
|---|---|
| Commercial QA matrix mostly unchecked | `docs/ops/commercial-launch-billing-qa.md` |
| Historical volume tiny | Ops docs ~2 ACTIVE subs — not scale proof |
| SANDBOX not isolated in apply path | Webhook can grant from sandbox if URL shared |
| Dual mental models | Legacy Replit RC client still in tree vs V2 |
| Dual Android trees | `android/` vs `artifacts/kidschedule-android/` |
| Native RC paywall flag default OFF | Custom paywall path still primary |
| Web monetization = Razorpay | Three commercial systems to operate |

**Truth:** Entitlement *architecture* is correct. Money-taking *operations* are not certified.

---

## 4. Firebase — CONDITIONAL

| Surface | Status |
|---|---|
| Auth | Real |
| FCM (native) | Real |
| Web FCM | Often stubbed (`firebase-messaging-sw.js` empty stub in tree) |
| Firestore / RTDB | Not used for product data (Postgres is source of truth — good) |
| Security rules as code | **Absent** (N/A for unused Firestore; Storage unwired) |
| Remote Config | Stub only — no runtime flag plane |
| Admin without full service account | Token verify may run project-ID-only |

**Truth:** Firebase = Auth + push transport. Do not claim a hardened Firebase platform.

---

## 5. Analytics — NO

**Present**  
- Central analytics service + taxonomy.  
- Property PII scrub.  
- Sentry web + API (hashed user, replay masked).  
- Push consent server-side for notifications.

**Blocks millions**  
| Gap | Why |
|---|---|
| No first-party analytics consent gate in main app | EU / kids-adjacent posture fragile |
| Meta Pixel + `_fbc` without consent UX | Ads attribution vs privacy narrative |
| Email in console logs | Bypasses analytics scrub |
| Sentry DSN optional in prod examples | Observability not guaranteed |
| High child-adjacent event volume | Scrub helps; retention policy not productized |

---

## 6. Feature Flags — NO

**Present**  
- Build-time `VITE_FF_*` living flags (Infant · Speech · Nutrition · Health Lab · Birth Sky · Guidance · Moments · Grow · Ask Amy) — **default ON**.  
- Shell flags: Today Home · Parent Hub Rooms · Discovery Film — **default ON**.  
- Per-module kill docs (`=0` + rebuild).  
- Some API twins (e.g. Birth Sky public enabled).

**Blocks millions**  
| Gap | Why |
|---|---|
| Dual universe in every binary | Living + legacy both compiled |
| No runtime kill | Vite bake-in → rebuild / OTA / store |
| No single registry | Flags scattered; `.env.production.example` incomplete |
| Combinatorial QA bomb | Living × legacy × rooms × devices |
| Device limit not strict by default | Soft enforcement |

**Truth:** Flags are engineer rollback levers, not a feature-management system for millions.

---

## 7. Performance — CONDITIONAL

**Present**  
- Aggressive route lazy-loading · Hub lazy destinations · vendor chunks.  
- Living skeletons · Cloudflare CDN · audio edge validators.  
- Lazy images on Hub ambient/doors.

**Blocks millions**  
| Gap | Why |
|---|---|
| `chunkSizeWarningLimit: 1700` culture | Accepts heavy first-party weight |
| Voice controller / pipeline gravity | Large static surfaces |
| Hub megapage inventory | Rooms shell does not delete module mass |
| No proven load test at millions MAU | Soft-launch health ≠ scale |
| Audio p95 elevated in ops notes | Experience risk under load |

---

## 8. Caching — CONDITIONAL

**Present**  
- Cloudflare Pages + API proxy.  
- Service worker: network-first nav · audio cache-first.  
- Hashed assets via CDN.

**Gaps**  
- Not a full offline-first cache strategy.  
- SW does not make the parenting spine offline-capable.

---

## 9. Offline — NO

**Present**  
- Offline banner/gate fragments.  
- Partial sync patterns (Health Lab / Birth Sky / some learning).

**Gaps**  
- Not an offline product for the whole house.  
- Capacitor + Capgo OTA is patch-oriented, not offline parenting.

**Millions truth:** Parents on bad networks will hit walls. Unacceptable as “safe for millions” without a defined offline contract.

---

## 10. Database — NO

**Present**  
- Postgres · large schema (~114 tables) · many indexes.  
- Pool + statement timeout.  
- Selective field encryption (e.g. Birth Sky).  
- GDPR deletion service paths.  
- Startup verify of critical tables.

**Blocks millions**  
| Gap | Why fatal |
|---|---|
| **No real migrate runner** | `drizzle-kit push` culture; `db:migrate` is data copy, not versioned schema |
| **Almost no foreign keys** | Soft `child_id` links — orphan / IDOR class risk |
| **Tenancy is app convention** | `assertChildOwnership` not universal; not RLS |
| **`children.userId` nullable** | Edge ownership ambiguity |
| **SSL `rejectUnauthorized: false`** | Accepts untrusted DB certs |
| **Most child PII not field-encrypted** | Name / DOB / allergies / photos |
| **Pool defaults** | Soft-launch sized, not millions-proven |

---

## 11. APIs — CONDITIONAL

**Present**  
- Global `requireAuth` after public mounts.  
- Device registration gate (killable).  
- CORS allowlist.  
- Distributed Redis rate limits on AI/auth/selected routes (fail closed if Redis down).  
- Health endpoints.  
- Some AI cost guards (speech/spelling/abacus tests).

**Blocks millions**  
| Gap | Why |
|---|---|
| No global API rate limiter | Patchwork only |
| Pre-auth AI debug token mints if env flipped | OpenAI Realtime cost nuke |
| Large public surface | TTS/static audio, libraries, OTA, webhooks |
| Inconsistent error contracts | Client chaos |
| Ad-hoc ownership checks by route | IDOR class |

---

## 12. Security — NO

**Present**  
- Env secrets · boot checks · sanitized prod errors.  
- Admin UID allowlists.  
- Auth whoami gated in prod.  
- JSON body limits · request timeouts.

**Blocks millions**  
| Gap | Why |
|---|---|
| Child isolation without FK/RLS | One bug = cross-family data |
| Admin allowlist copy-pasted across routers | Drift / missed gate |
| CAPTCHA only on phone OTP (off) | Email/AI abuse under-defended |
| No helmet/CSP on API | Baseline hardening gap |
| Capacitor `limitsNavigationsToAppBoundDomains: false` | Navigation escape risk |
| Android AD_ID + Facebook advertiser collection | Privacy narrative conflict with iOS “no tracking” |
| Enumerable serial child IDs | Soft tenancy risk amplifier |

---

## 13. Accessibility — NO

(Also Apple HIG audit Accessibility **4.5**.)

| Present | Missing |
|---|---|
| Reduced-motion widely | Dynamic Type clamped (`text-size-adjust: 100%`) |
| Some focus rings / 48px Home targets | Hub `aria-expanded` / `aria-current` / live regions |
| Infant contrast fix | Living path `aria-pressed` / VO choreography |

**Millions truth:** Shipping without Dynamic Type + Hub VO is not “safe” for families with accessibility needs — and it fails Apple Design Review craft.

---

## 14. Regression — CONDITIONAL

**Present**  
- Large vitest suites (kidschedule + API).  
- Deploy workflow runs typecheck + selected suites before Pages.  
- Founder Review kill-switch docs per living module.

**Blocks millions**  
| Gap | Why |
|---|---|
| Dual living/legacy universes | Must QA both forever |
| Known flaky / incomplete gates admitted in AGENTS culture | Confidence ≠ volume of tests |
| Product craft still fails blind-logo / Apple ship tests | Regression green ≠ experience safe |
| API Coolify deploy not same gate as Pages workflow | Split deploy risk |

---

## 15. Rollback — CONDITIONAL

| Lever | Reality |
|---|---|
| `VITE_FF_*_LIVING_V1=0` | Rebuild / OTA / store — **slow** |
| Rooms / Today Home flags | Same bake-in constraint |
| CDN canary / phonics rollback docs | Real for some surfaces |
| DB schema rollback | **Weak** — push culture, not migrate/down |
| RevenueCat / entitlement | Webhook idempotency helps; sandbox poison risk |

**Truth:** You can roll back chrome with pain. You cannot instantly kill a bad living room in a native binary without OTA/store. You cannot confidently roll back schema at 114 tables.

---

## 16. App Store readiness — CONDITIONAL

**Present**  
- Extensive review notes remediating prior rejections (1.5, 2.5.4, 3.1.2, 5.1.x…).  
- PrivacyInfo `NSPrivacyTracking = false`; ATT not used.  
- Purpose-string permissions.  
- Capgo OTA constrained as patch-only for guideline posture.

**Blocks clean ship**  
| Gap | Why |
|---|---|
| Checklist still has open boxes | Icons / PrivacyInfo membership / ASC metadata |
| Design Review craft = **NO** | `AMYNEST_FINAL_APPLE_AUDIT.md` |
| Billing device matrix unsigned | Commercial launch QA |
| Emotional AI quota UX | Trust / guideline adjacency risk |
| Background modes history of rejection | Must stay disciplined |

**Truth:** Can re-submit with ops care. Not “safely millions-ready App Store product.”

---

## 17. Play Store readiness — CONDITIONAL

**Present**  
- Android WebView shell · Play Billing bridge · FCM.  
- INTERNET / notifications / BILLING permissions expected.

**Blocks clean ship**  
| Gap | Why |
|---|---|
| `AD_ID` + Facebook AdvertiserID collection | Conflicts with parenting/kids privacy story |
| Dual Android project trees | Ship-the-wrong-binary risk |
| Billing QA matrix open | Same as RC |
| WebView auth bridge complexity | Support load at scale |

---

# Cross-cutting kill shots (ordered)

If only ten things block “millions of families,” they are:

1. **Database:** push-schema + almost no FKs + soft child tenancy  
2. **Identity:** no account linking / guest upgrade  
3. **Billing ops:** RC architecture without certified commercial matrix / sandbox isolation  
4. **AI cost abuse:** patchwork RL + pre-auth debug mint risk  
5. **Security / child data:** app-layer isolation only; privacy narrative iOS≠Android  
6. **Analytics consent:** Meta Pixel + no main-app consent plane  
7. **Feature-flag dual universes:** default-ON living + legacy forever  
8. **No runtime kill / slow rollback** on native  
9. **Offline / scale performance unproven**  
10. **Product craft still fails Apple/blind-logo ship tests** — experience risk is also production risk (refunds, reviews, trust)

---

## What *is* production-shaped (credit without optimism)

- Firebase token verify on API  
- Server-owned RevenueCat entitlement model + webhook idempotency  
- CORS allowlist · some distributed AI rate limits (fail closed)  
- Coolify + Cloudflare + backups culture (ops docs)  
- Sentry plumbing (when DSN set)  
- GDPR deletion service paths  
- Living-module kill-switch documentation  
- Prior App Store rejection remediations captured in review notes  

These are necessary. They are not sufficient for millions.

---

## Soft launch vs millions

| Claim | Allowed? |
|---|---|
| “We can soft-launch to thousands under watch” | **Conditional YES** |
| “We can safely ship to millions of families today” | **NO** |
| “Billing is certified for mass IAP” | **NO** |
| “Child data isolation is DB-enforced” | **NO** |
| “We have one product face in production” | **NO** (dual universes) |
| “Apple/Play would rubber-stamp” | **NO** |

---

## Final production lines

| Lens | Truth |
|---|---|
| **SRE** | Runs. Not load-certified. Schema evolution is a liability. |
| **Security** | Soft tenancy + admin drift + AI cost escapes. |
| **Commerce** | Entitlement brain correct; money path uncertified. |
| **Identity** | Signs in. Does not merge lives. |
| **Product ops** | Two UIs in every binary. |
| **Stores** | Submittable with scars — not mass-safe. |

---

## Final question

# Can AmyNest safely ship to millions of families?

# NO

**Not never. Not today.**

Safe claim: soft launch under watch, with billing QA closed, sandbox isolated, linking built, tenancy hardened, consent plane shipped, dual universes killed, and load proven.

Unsafe claim: millions-ready now.

---

## STOP

No implementation.  
No infra campaigns from this order.  
No reopening of frozen Welcome · Signup · Discovery · Today Home · Parent Hub room IA.

Wait for Founder approval.
