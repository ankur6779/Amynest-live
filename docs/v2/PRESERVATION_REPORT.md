# AmyNest V2 — Preservation Report  
## IMPLEMENTATION RULE ZERO — Preserve the Treasury

**Status:** Binding before any further Sprint implementation  
**Date:** 2026-08-01  
**Scope audited:** `artifacts/kidschedule/` (~2655 TS/TSX, ~459 tests, ~2900 public assets), related `lib/*` packages, `artifacts/api-server/` feature APIs, `android/` WebView shell, `artifacts/amynest-capacitor/` iOS shell  
**Method:** Route inventory (`AppCore.tsx`) + feature packages + asset dirs + Phase 9 Migration Blueprint alignment  

---

## Founder Law

> Every line of code represents time.  
> Every asset represents effort.  
> Every feature represents learning.  
> **Preserve the company's knowledge. Change the door. Never burn the house.**

AmyNest V2 is a **renovation**: new Front Door, Today, Ask Amy, For [Child] attention model.  
It is **not** a rewrite, cleanup project, or permission to delete valuable work.

---

## Classification legend

| Class | Meaning | Code fate |
|-------|---------|-----------|
| **PRESERVE** | Keep routes, components, tests, assets, APIs | Unchanged; may gain For [Child] entry |
| **MIGRATE** | Keep implementation; change entry / home / naming | Redirects, nav owner, flags — **no rewrite** |
| **HIDE** | Alive via deep link / treasury search / Account; not Day-0 or tab bar | Routes stay mounted |
| **ARCHIVE** | Experience retired from product attention; code & data retained | Redirect + unreachable UI; **do not delete** |
| **DELETE** | Rare exception — requires six-question written justification | **None authorized in this report** |

**Default answer: PRESERVE.**

---

## Deletion register

| # | Candidate | Authorized? | Justification |
|---|-----------|-------------|---------------|
| — | *(none)* | **NO** | No file or capability meets the six-question bar. Hidden / Archived / Migrate cover every demotion. |

### Six-question gate (must all be answered before any future DELETE)

1. What value does this currently provide?  
2. Can it live under **For [Child]**?  
3. Can it be hidden?  
4. Can it be feature-flagged?  
5. Can it be archived?  
6. Why is deletion the **ONLY** reasonable option?  

If any answer is missing → **cannot delete**.

---

## Executive totals

| Class | Count (capability rows below) |
|-------|-------------------------------|
| PRESERVE | Vast majority (treasury + infra + content + AI + games + health + learning) |
| MIGRATE | Dashboard-as-home, long onboarding default, Assistant→Ask Amy alias, Parenting Hub→For [Child] shell, Explore Free default, V2 nav chrome |
| HIDE | Abacus, Spelling, Olympiad, Recipes, Environment, Kids Control Center, DEV debug/QA routes |
| ARCHIVE (experience only) | Dashboard-as-default-home *experience*, login-wall-before-value for *new* installs, long chat onboarding as *default*, Explore Free as *default*, module zoo home, `/babysitters` stub, unrouted `amy-learning-tutor` page (code kept) |
| DELETE | **0** |

---

# 1. Platform & infrastructure — PRESERVE

| Capability | Key locations | Class |
|------------|---------------|-------|
| Kidschedule SPA shell | `artifacts/kidschedule/src/App.tsx`, `AppCore.tsx`, `main.tsx` | PRESERVE |
| Android WebView + bridges | `android/` (`AuthBridge`, `BillingBridge`, `PushBridge`, …) | PRESERVE |
| Capacitor iOS shell | `artifacts/amynest-capacitor/` | PRESERVE |
| API server (speech, TTS, nutrition, birth-sky, subscription, devices, learning, coach) | `artifacts/api-server/` | PRESERVE |
| Typed API client / OpenAPI | `lib/api-spec`, `lib/api-client-react`, `lib/api-zod` | PRESERVE |
| Audio stack | `src/lib/audio-*`, `amy-voice-*`, `public/audio-pack/` | PRESERVE |
| Paywall / entitlements / RC bridges | paywall contexts, `subscription-*`, `native-billing*` | PRESERVE |
| i18n (en / hi / hinglish) | `src/i18n/` | PRESERVE |
| Analytics taxonomy | `src/lib/analytics*`, `lib/analytics-taxonomy` | PRESERVE |
| Device registration / limits | device contexts + API | PRESERVE |
| Notifications / FCM / prefs | notification settings, native push | PRESERVE |
| Learning runtime / knowledge bridges | `learning-*-bridge`, `lib/learning-*` | PRESERVE |
| V2 flags + registries (Sprint 0) | `src/lib/feature-flags/`, `src/registries/` | PRESERVE |

---

# 2. Hero path (Speech) — PRESERVE · attention MIGRATE later

| Capability | Routes / paths | Class | Notes |
|------------|----------------|-------|-------|
| Speech Coach (modes) | `/speech-coach*` | PRESERVE | Front Door / Today Mission entry later = MIGRATE *entry only* |
| Speech Coach V2 | `/speech-coach-v2*` | PRESERVE | |
| Talking Amy | `/talking-amy` | PRESERVE | WOW / practice |
| Amy voice / TTS stack | `src/lib/amy-voice-*`, TTS APIs | PRESERVE | |

---

# 3. Companion shells — MIGRATE attention, PRESERVE code

| Capability | Routes | Class | Migration intent |
|------------|--------|-------|------------------|
| Dashboard | `/dashboard` | **MIGRATE** | Code stays; default-home → Today when flagged; experience “dashboard-as-home” → ARCHIVE |
| Parenting Hub | `/parenting-hub` | **MIGRATE** | Becomes For [Child] treasury index / alias — **do not delete hub code** |
| Assistant | `/assistant` | **MIGRATE** | Alias → Ask Amy; implementation stays |
| Onboarding (long chat) | `/onboarding` | **MIGRATE** | New installs → Front Door; incomplete → bridge; code retained |
| Subscription trial interstitial | `/subscription-trial*` | **MIGRATE** | Not default post-onboard; Account/Plan remains |
| Bottom nav / module zoo home | nav config | **MIGRATE** | Tabs → Today · Ask Amy · For [Child]; modules remain under treasury |

---

# 4. Treasury — For [Child] — PRESERVE (discoverable)

These are **significant engineering / content / AI / parent value**. They must remain reachable via For [Child], deep links, and progressive reveal. **Never delete because they are not on the Front Door.**

| Capability | Routes / packages | Class |
|------------|-------------------|-------|
| Games hub + game UIs | `/games`, `src/components/games/` | PRESERVE |
| Gaming wallet / rewards | `/rewards`, gaming-wallet libs, API | PRESERVE |
| Discovery Worlds + live worlds | `/discovery-worlds`, `/worlds/:slug`, `lib/world-engine`, sibling world packages | PRESERVE |
| Animal World | `/animal-world`, `public/animal-world-audio/` | PRESERVE |
| Phonics / Reading Academy | `/phonics*`, phonics-v2/v3, curricula packages | PRESERVE |
| Study Zone | `/study` | PRESERVE |
| Smart Math Tricks + Math Playground | `/smart-math-tricks`, `smart-math-visual/`, `math-playground/` | PRESERVE |
| Worksheet Studio | `/worksheet`, `features/worksheet-studio/` | PRESERVE |
| Teacher OS | `/teacher-os` | PRESERVE |
| Nutrition hub + share | `/nutrition`, `/nutrition/share/:token`, `features/nutrition/` | PRESERVE |
| Infant suite (sleep, feeding, milestones, sounds) | infant components/libs, sleep audio | PRESERVE |
| Health Lab | `/health-lab`, `features/health-lab/` | PRESERVE |
| Birth Sky / Amy Astro | `/birth-sky*`, `features/birth-sky/`, birth-sky libs + certification | PRESERVE |
| Routines (+ forecast/household/explain) | `/routines*` | PRESERVE |
| School Morning Flow | `/school-morning-flow` | PRESERVE |
| Behavior tracker | `/behavior` | PRESERVE |
| Life skills | `/life-skills` | PRESERVE |
| Event / PTM prep | `/event-prep` | PRESERVE |
| Amy Coach | `/amy-coach*` | PRESERVE |
| Amy AI Tutor | `/amy-ai-tutor` | PRESERVE |
| Audio lessons | `/audio-lessons` | PRESERVE |
| Rhymes | `/rhymes` | PRESERVE |
| How? library | `/answer-to-kids-how*` | PRESERVE |
| Daily story / content bank / coloring / fun sheets / art-craft / origami | components + `public/origami-assets/`, content-bank | PRESERVE |
| Progress / Insights / Parent growth | `/progress`, `/insights`, `/parent-growth` | PRESERVE |
| Family executive dashboard widgets | `family-executive-dashboard/` | PRESERVE |
| Referrals | `/referrals`, `/referral/:code` | PRESERVE |
| Children profiles | `/children*` | PRESERVE |
| Pricing / premium flows | `/pricing` | PRESERVE |
| Parent profile / Account | `/parent-profile`, devices, notification settings | PRESERVE |
| Feedback | `/feedback` | PRESERVE |
| Marketing / SEO / legal / get-app | `/privacy`, `/terms`, guides, ASO landings, etc. | PRESERVE |
| Admin ops | `/admin/*` | PRESERVE (ops; not in parent nav) |

---

# 5. Hidden treasury — HIDE (keep mounted)

| Capability | Routes | Class | Why not delete |
|------------|--------|-------|----------------|
| Abacus | `/abacus` | HIDE | Substantial UI + lib; deep link / later reveal |
| Spelling | `/spelling` | HIDE | Catalog + audio; deep link |
| Olympiad | `/olympiad` | HIDE | Package intact |
| Recipes | `/recipes` | HIDE | Nutrition-adjacent value |
| Environment / AQI | `/environment` | HIDE | Helper tool; not Home |
| Kids Control Center | `/kids-control-center` | HIDE | Preview; deep link OK |
| DEV debug / realtime QA / audio A-B | `/debug/*`, `/dev/*`, realtime test pages | HIDE | Engineering value; prod-gated |

---

# 6. Archived experiences — ARCHIVE (code retained)

| Experience | What changes | What is preserved |
|------------|--------------|-------------------|
| Dashboard-as-default-home | Stop landing here for V2 cohorts | Dashboard page, widgets, tests, APIs |
| Login-wall-before-value (new installs) | Front Door / guest first | Auth system, soft save |
| Long chat onboarding as **default** | Bridge / Front Door | Onboarding page code for legacy resume |
| Explore Free interstitial as **default** | Not forced after Door | Trial/pricing pages |
| Module zoo / icon tray as Home | Nav chrome only | Every module route |
| `/babysitters` redirect stub | Remains redirect or → Today | No product rebuild |
| `amy-learning-tutor.tsx` (unrouted) | Not remounted without registry | File + chat-platform types kept until explicit sunset |

**User content and entitlements are never archived.**

---

# 7. Assets — PRESERVE

| Asset domain | Location (approx) | Class |
|--------------|-------------------|-------|
| World visuals | `public/world-visuals/` (~899) | PRESERVE |
| Audio pack | `public/audio-pack/` (~656) | PRESERVE |
| Discovery worlds audio | `public/discovery-worlds-audio/` (~500) | PRESERVE |
| Animal world audio | `public/animal-world-audio/` (~422) | PRESERVE |
| Illustrations / promo / landing | `public/illustrations/`, `promo/`, `landing/` | PRESERVE |
| Origami / infant sleep / Amy 3D / astro | respective `public/` dirs | PRESERVE |
| Data manifests (phonics, spelling, rhymes, static-audio, infant) | `src/data/` | PRESERVE |
| Activity images | `src/assets/activity-images/` | PRESERVE |
| Certification / Playwright harnesses | kidschedule cert + playwright configs | PRESERVE |

---

# 8. Already out of production edit scope

| Area | Status | Class |
|------|--------|-------|
| `archive/amynest-mobile-expo/` | Archived Expo — read-only reference | ARCHIVE (do not revive or delete for V2) |
| Capacitor Android tree (not shipped Play app) | Not the Play Store app | PRESERVE as-is; do not invent Play features there |

---

# 9. Sprint binding (Rule Zero → execution)

| Sprint work | Allowed under Rule Zero |
|-------------|-------------------------|
| Flags, registries, Front Door, Today, nav | **Add** shells; **redirect** homes; **hide** peer tabs |
| For [Child] | **Index** existing modules — do not rewrite Games/Nutrition/Birth Sky/etc. |
| Ask Amy | Discover via Tool Registry; **handoff into** preserved modules |
| Premium V2 | New surfaces; **keep** RC/entitlement/billing code |
| Cleanup | Only after public stability + written DELETE register — **not** MVP |

**Forbidden without new Preservation Amendment:**  
Deleting feature folders, asset packs, tests, i18n keys, API routes, or games “because they are not Speech.”

---

# 10. Sign-off checklist

- [x] Codebase capability audit completed  
- [x] Every major surface classified  
- [x] Deletion register empty (0 authorized)  
- [x] Default = PRESERVE  
- [x] Aligns with Phase 9 Migration Blueprint + naming amendment (For [Child])  
- [ ] Founder / Staff ack before Sprint 1 code changes that touch entry/nav  

---

**End of Preservation Report.**  
Change the door. Keep the house.
