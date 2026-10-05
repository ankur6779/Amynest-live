# PRODUCT FEATURE INVENTORY

**Date:** 2 October 2026  
**Rule:** Source code ≠ production-verified. Live E2E of every module was **not** run for this listing pack.

Live surfaces checked this pass: `https://www.amynest.in/` HTTP 200; `GET /api/health` HTTP 200 `ok: true` (2 Oct 2026).  
Prior partial cert: `docs/sale-readiness/TECH/PRODUCTION_SELLER_CERTIFICATION.md` (24 Sep 2026).

Classes:

| Class | Meaning |
|-------|---------|
| **CURRENT / VERIFIED** | Live or console evidence this diligence, or a named prior cert PASS |
| **CURRENT / NEEDS VERIFICATION** | In shipped app routes/hub; not E2E recertified 2 Oct |
| **DOCUMENTED BUT NOT CURRENT** | Code or copy exists; not a complete shipped experience |
| **PLANNED / V2** | Explicit v2 / waitlist / preview |
| **DEPRECATED** | Archived or not the shipped store binary |

---

## Platforms

| Feature | Class | Evidence |
|---------|-------|----------|
| Web app www.amynest.in | **CURRENT / VERIFIED** | HTTP 200, 2 Oct 2026 |
| API health | **CURRENT / VERIFIED** | `/api/health` 200 `ok: true` |
| Google Play `com.amynest.app` | **CURRENT / VERIFIED** | Production 106 (1.4.63), Console 2 Oct 2026 |
| Apple App Store 6767664343 | **CURRENT / NEEDS VERIFICATION** | App ID verified in diligence; listing not re-opened 2 Oct |
| Android architecture | WebView wrapper `android/` | VERIFIED as shipped Play tree |
| iOS architecture | Capacitor iOS | VERIFIED as shipped iOS tree |
| Capacitor Android | **DEPRECATED** for Play | Not the Play Store app |
| Expo / RN archive | **DEPRECATED** | `archive/amynest-mobile-expo/` |

---

## Core parent product

| Feature | Where | Class | Notes |
|---------|-------|-------|-------|
| Today / Home dashboard | `/dashboard` | **CURRENT / VERIFIED** (prior demo PASS 24 Sep) + **NEEDS VERIFICATION** for all widgets | AQI/environment copy previously PARTIAL |
| Ask Amy | `/assistant` | **CURRENT / NEEDS VERIFICATION** | Route shipped; 24 Sep **NOT TESTED** |
| For [Child] / parenting hub | `/parenting-hub` | **CURRENT / NEEDS VERIFICATION** | Hub groups in code: today, learning, creativity, stories, health, parent, support |
| Child profiles | `/children` | **CURRENT / NEEDS VERIFICATION** | Prior demo showed profiles; not recertified 2 Oct |
| Onboarding | `/onboarding`, `/begin` | **CURRENT / NEEDS VERIFICATION** | |
| Routines list / detail | `/routines`, `/routines/:id` | **CURRENT / NEEDS VERIFICATION** | Core product |
| Routine generation | `/routines/generate` | **CURRENT / NEEDS VERIFICATION** | Subject-matter related to pending patent; **do not say patented** |
| Environment / AQI | `/environment` + dashboard | **CURRENT / NEEDS VERIFICATION** | |
| Progress / insights / rewards | `/progress`, `/insights`, `/rewards` | **CURRENT / NEEDS VERIFICATION** | |
| Pricing / paywall | `/pricing` + RevenueCat | **CURRENT / NEEDS VERIFICATION** | 3 live paid historically; checkout **NOT TESTED** this pass |
| Account / devices / delete | `/parent-profile`, `/manage-devices`, `/delete-account` | **CURRENT / NEEDS VERIFICATION** | Deletion completeness UNVERIFIED |
| Privacy / Terms / Support | public routes | **CURRENT / VERIFIED** as routes; live HTML vs repo **may lag** | |

---

## Learning, speech, health, games

| Feature | Where | Class | Notes |
|---------|-------|-------|-------|
| Speech coach | `/speech-coach` (+ talk/live) | **CURRENT / NEEDS VERIFICATION** | Premium-gated in metadata |
| Speech Coach v2 | `/speech-coach-v2` | **PLANNED / V2** or newer path — **NEEDS VERIFICATION** | Do not market as a separate certified product |
| Talking Amy | `/talking-amy` | **CURRENT / NEEDS VERIFICATION** | |
| Phonics / study / spelling / abacus / olympiad | respective routes | **CURRENT / NEEDS VERIFICATION** | |
| Amy AI tutor / Amy Coach | `/amy-ai-tutor`, `/amy-coach` | **CURRENT / NEEDS VERIFICATION** | |
| Health Lab | `/health-lab` | **CURRENT / NEEDS VERIFICATION** | Premium-gated; 24 Sep **NOT TESTED** |
| Nutrition hub | `/nutrition` | **CURRENT / NEEDS VERIFICATION** | Premium-gated |
| Gaming Hub | `/games` | **CURRENT / NEEDS VERIFICATION** | 24 Sep **NOT TESTED** |
| Audio lessons / rhymes | `/audio-lessons`, `/rhymes` | **CURRENT / NEEDS VERIFICATION** | GCS/TTS dependency |
| Birth Sky / astronomy | `/birth-sky` | **CURRENT / NEEDS VERIFICATION** | Live health payload `birthSkyPublicEnabled: true` 2 Oct — flag on, module not E2E |
| Life skills / event prep / school morning | routes present | **CURRENT / NEEDS VERIFICATION** | |

---

## Hub content modules (parenting-hub tiles)

Shipped as **hub sections**, not always standalone URLs.

| Feature | Hub tile / component | Class | Notes |
|---------|----------------------|-------|-------|
| Printable worksheets | `worksheets` / `PrintableWorksheets` | **CURRENT / NEEDS VERIFICATION** | Template licenses UNKNOWN |
| Coloring books | `coloring-books` / `ColoringBooks` | **CURRENT / NEEDS VERIFICATION** | Media rights UNKNOWN |
| Art / craft | `art-craft`, `origami-studio` | **CURRENT / NEEDS VERIFICATION** | |
| Curiosity / “answer to kids how” | `answer-to-kids-how` + `/answer-to-kids-how` | **CURRENT / NEEDS VERIFICATION** | |
| Stories / daily story / discovery worlds | stories group + `/discovery-worlds` | **CURRENT / NEEDS VERIFICATION** | GCS catalogs possible |
| Videos / reels | GCS catalog referenced in ops scripts | **CURRENT / NEEDS VERIFICATION** | Object inventory **not done** |
| Fun sheets / activities | creativity group | **CURRENT / NEEDS VERIFICATION** | |

---

## Infant

| Feature | Where | Class | Notes |
|---------|-------|-------|-------|
| Infant hub / shortcuts on dashboard and parenting hub | components `InfantHub`, `InfantModeShortcuts` | **CURRENT / NEEDS VERIFICATION** | Prior cert: infant profile visible, module not opened |
| Infant v2 flag | `FF_INFANT_V2` | **PLANNED / V2** overlay possible | Do not assume all infant UI is v2 |
| Admin infant parenting | `/admin/infant-parenting` | Ops/admin — **not** a consumer feature | |

---

## Explicitly not a current full product

| Feature | Class | Notes |
|---------|-------|-------|
| Kids Control Center | **PLANNED / V2** | `/kids-control-center` is interest/feedback, not a shipped child OS |
| Teacher OS | **DOCUMENTED BUT NOT CURRENT** as core listing feature | Legacy redirect in AppCore |
| Debug / QA / realtime test routes | **DOCUMENTED BUT NOT CURRENT** | Redirected or stripped in production builds |
| Admin Growth OS | Internal — **do not market** | `/admin/growth` |

---

## Buyer takeaway

A buyer acquires a **broad shipped parenting app**, not a single chatbot. Diligence should include a **logged-in demo** of Today, routine generate, Ask Amy, hub tiles (coloring/worksheets/stories), speech, Health Lab, games, paywall, and infant shortcuts. Listing copy must not claim every tile was recertified on 2 Oct 2026.
