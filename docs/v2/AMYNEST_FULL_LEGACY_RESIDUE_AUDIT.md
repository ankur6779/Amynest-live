# AmyNest Full Legacy Residue Audit

**Date:** 2026-08-16  
**Scope:** Production application only (`artifacts/kidschedule/src`). Actual router, flags, copy, assets, navigation, states.  
**Mode:** Audit only. No implementation, no cleanup, no flag changes, no asset deletion.  
**Router source of truth:** `artifacts/kidschedule/src/AppCore.tsx` (`<Route path=…>`).  
**Living-universe lock:** FA-02 — `VITE_FF_AMYNEST_LIVING_UNIVERSE` living/unset/1 = all surfaces ON; `mixed` throws in production.

**Law reminder:** This document does not propose engine, API, schema, RevenueCat, Firebase, or auth changes. Residue is classified as visual/copy/route/chrome only.

---

## 1. Executive Summary

AmyNest is **one home at the door**.

The approved living openings (Welcome/Begin, Today Home, Parent Hub Rooms V1, manufactured interiors, living drawer/sidebar, FA-02, P0-6, P0-7, P1 interiors) are coherent. A parent who stays on Today → Rooms → a manufactured interior does **not** enter another company's product.

AmyNest is **not yet one home after leave**.

A tired parent can still walk into another visual universe **without turning flags off**, through:

1. The always-visible **mobile tab bar + Amy FAB** (feature-launcher chrome on every authenticated screen).
2. Living nav **More** destinations that were never remanufactured (`/games`, `/study`, `/insights`, `/progress`, `/kids-control-center`).
3. **Grow → Sounds & letters** leave, which deepens the Hub phonics tile then opens `/phonics` — living title wrapper over an “Unlock 15 Complete Phonics Workbook Sets / Paid Premium” card plus Reading Academy `<details>`.
4. **Direct URLs** that were never redirected (`/rewards`, `/speech-coach/live-session`, `/speech-coach/talk`, `/welcome`, `/worksheet`, `/environment`, `/life-skills`).
5. A **Speech Coach legacy switch** that is independent of FA-02 (`localStorage`, `?speechLegacy=1`, remote config).

**FA-02 still holds.** A production env cannot mix living flags. Per-module `=0` is ignored when the master is living. A normal user cannot get a mixed universe from environment variables.

**Default production path does not show neon Speech cards.** Those appear only if `speech-coach-legacy`, `?speechLegacy=1`, or `speechCoachLegacyVisible` remote config is on.

**P0 count: 0** (nothing that breaks FA-02, auth, or the manufactured openings themselves).  
**P1 count: 8 items** (always-on chrome; More Play/Learning/Insights/Progress; Grow/phonics unlock; speech deep-link/switch; worksheet URL).  
**Another remediation pass is necessary**, but it is a **targeted leave/chrome pass**, not another full portfolio manufacturing campaign.

---

## 2. Route Inventory

Legend:

- **Living** = production default looks like AmyNest home (or approved marketing/system).
- **Legacy** = another product universe if a parent sees it.
- **Mixed** = living wrapper over leftover interior.
- **Dead/dev** = production redirects or `!PROD` only.
- **Reach nav** = living drawer/sidebar (including More).
- **Deep** = typed URL / bookmark / history.
- **CTA** = in-product button/link from an approved surface.

| Route | Purpose | State | Nav | Deep | CTA | Fallback | Legacy visual | Severity |
|---|---|---|---|---|---|---|---|---|
| `/` | Auth gate → `/begin` or `/dashboard` | Living | n/a | yes | yes | yes | no | — |
| `/begin` | Welcome / signup / begin | Living | no | yes | yes | `/` unsigned | no | — |
| `/welcome` | Old `LandingPage` storefront | Legacy marketing | no | **yes** | no | no | store badges, old landing | P2 |
| `/sign-in` `/sign-up` `/verify-email` `/reset-password` | Auth | System | no | yes | yes | yes | functional, not living home | P2 |
| `/login` | Redirect → sign-in | Dead alias | no | yes | no | yes | n/a | — |
| `/verify` `/auth/callback` `/auth/action` `/auth/apple/callback` | Auth callbacks | System | no | yes | IdP | yes | system | — |
| `/onboarding` | Child setup | Living-ish | no | yes | `/` unsigned-done | no | setup chrome | P2 |
| `/subscription-trial` `/subscription-trial-ended` | Trial system | System | no | yes | yes | no | storefront-adjacent | P2 |
| `/dashboard` | Today Home | Living | yes | yes | yes | many | no (TODAY_HOME_V1) | — |
| `/parenting-hub` `#help\|understand\|care\|moments` | Rooms V1 | Living | yes | yes | yes | hash | Explore Free only if roomsV1 off | — |
| `/learn-with-amy` | Redirect → hub | Alias | — | yes | — | yes | n/a | — |
| `/assistant` | Ask Amy / Amy AI | Living companion default | yes | yes | yes | no | chatbot picker only if living off | — |
| `/amy-ai-tutor` | Alias of assistant | Living | More | yes | yes | no | same | — |
| `/speech-coach` | Speech living hub | Living | yes | yes | yes | no | neon cards if speechLegacy | P1 if switch on |
| `/speech-coach/live` | Redirect → live-session | Alias | no | yes | yes | yes | n/a | — |
| `/speech-coach/live-session` | Live session | Mixed/legacy escape | no | **yes** | legacy cards | no | neon if !living or legacy switch | P1 |
| `/speech-coach/talk` | Talk with Amy | Mixed/legacy escape | no | **yes** | legacy cards | no | same | P1 |
| `/speech-coach-v2` `/speech-coach-v2/session` | V2 studio | Mixed | no | yes | interior | no | studio chrome | P2 |
| `/talking-amy` and aliases | Redirect → talk or v2 | Alias | — | yes | — | yes | n/a | — |
| Infant Care (Hub Care door) | Infant living | Living | Rooms Care | hub tile | yes | in-hub | no standalone `/infant-care` route in `AppCore.tsx` | — |
| `/nutrition` | Nutrition living open | Living open; mixed after deepen / More care | More | yes | yes | no | `NutritionTopNav` **not** mounted when living; deepen uses `NutritionSectionPanel`; More care shows score / weekly story / household | P2 after deepen |
| `/nutrition/share/:token` | Shared meal | System | no | yes | yes | no | share chrome | P3 |
| `/health-lab` | Health living home | Living open | yes | yes | yes | no | Shop/coins/XP HUD is the `!living` branch of `HealthLabHome`. Living More can open progress/dashboard | P2 deepen |
| `/parent-growth` | Growth-journey analytics page | Legacy analytics | no | **yes** | no (not in living nav) | no | “Growth journey” dashboard | P2 URL |
| Grow stream | Understand room living Grow | Living open | Rooms | hash/tile | yes | in-hub | Leave `renderDestination("phonics")` then `/phonics` | P1 leave |
| `/phonics` `/phonics/test` `/phonics/test/play` | Phonics | **Legacy edtech** under living title | Grow leave | **yes** | Grow + Hub phonics tile | no | Unlock workbooks + academy; page title becomes “Sounds & letters” when Grow living ON | **P1** |
| `/life-skills` | Life skills standalone | Mixed/legacy tool | Help quiet path is in-hub; this route is separate | **yes** | Dashboard `OnboardingScreen` if zero children | no | Compass / tool chrome | P2 |
| `/birth-sky` + aliases | Birth Sky | Living open | More | yes | yes | aliases | cosmic leftover in assets | P2 |
| `/guidance` `/guidance/:slug` | Guidance | Living | yes | yes | yes | no | no | — |
| `/moments` | Moments | Living | yes | yes | yes | no | no | — |
| `/amy-coach` | Coach living | Living | tab+nav | yes | yes | no | no | — |
| `/amy-coach/progress` | Coach progress | Mixed analytics | no | yes | coach CTA | no | progress chrome | P2 |
| `/audio-lessons` | Amy Audio | Living | yes | yes | yes | no | no | — |
| `/routines` `/routines/generate` `/routines/:id` | Routine | Living generate | yes | yes | yes | no | no | — |
| `/games` | Play / games hub | **Legacy game** | More | **yes** | More Play | no | HUD, unlock, points | **P1** |
| `/rewards` | Stars/points/badges | **Legacy XP** | no | **yes** | games | no | burst, redeem | **P1** |
| `/study` `/smart-math-tricks` `/abacus` `/spelling` `/olympiad` `/event-prep` | Learning suite | **Legacy edtech** | More Learning | **yes** | More | no | study-zone marketplace | **P1** |
| `/progress` | Learning progress | Legacy analytics | More | yes | More | no | dashboard | **P1** |
| `/insights` | Insights | Legacy analytics | More | yes | More | no | dashboard | **P1** |
| `/behavior` | Patterns | Mixed/legacy | More | yes | More | no | tracker | P2 |
| `/environment` | Weather/AQI | Legacy dashboard | no | **yes** | no | no | SaaS dashboard | P2 |
| `/kids-control-center` | Waitlist SaaS | Legacy | More | yes | More | no | interest form | P2 |
| `/worksheet` `/teacher-os` | Worksheet studio | Legacy other-product | no | **yes** | no | teacher-os→worksheet | “LPS Worksheet Studio” | P1 if reached |
| `/school-morning-flow` | Morning flow | Mixed | no | yes | no | no | tool chrome | P2 |
| `/recipes` | Recipes | Mixed | no | yes | nutrition | no | catalogue-ish | P2 |
| `/rhymes` | Rhymes | Mixed | no | yes | audio | no | content library | P2 |
| `/animal-world` `/discovery-worlds` `/answer-to-kids-how` `/worlds/:slug` | Worlds | Mixed/game | no | yes | games? | no | world chrome | P2 |
| `/children` `/children/new` `/children/:id` | Children | System | More | yes | yes | no | list chrome | P2 |
| `/parent-profile` `/profile` | Profile | System | More | yes | yes | alias | account SaaS | P2 |
| `/notification-settings` `/manage-devices` `/notification-diagnostics` `/notify-prompt` | Notify | System | profile | yes | yes | no | settings | P3 |
| `/pricing` | Paywall page | Storefront (needed) | More | yes | yes | no | Crown/Zap theatre | P2 |
| `/referrals` `/referral/:code` | Referrals | System | no | yes | yes | no | growth | P3 |
| `/feedback` | Feedback | System | More | yes | yes | no | form | P3 |
| `/babysitters` | Redirect dashboard | Dead | no | yes | no | yes | n/a | — |
| `/admin/feedback` `/admin/dashboard` `/admin/infant-parenting` `/admin/growth` `/admin/growth/:section` `/admin/audio-health` | Admin | Internal | no | yes | no | no | admin | n/a (not parent) |
| `/answer-to-kids-how/read/:bookId` | Curiosity reader | Mixed | no | yes | curiosity | no | reader chrome | P2 |
| `/privacy` `/terms` `/about` `/delete-account` `/billing-dispute` `/support` | Legal/support | System | footer | yes | yes | no | legal | — |
| `/get-app` `/download` `/amy` `/parenting-app` `/speech-coach-app` `/child-routine-planner` `/kids-nutrition-app` `/features/:slug` `/guides` `/guides/:slug` `/routine-by-age/:age` `/feeding-plan/:months` `/app` | ASO/marketing | Marketing | no | yes | store | aliases | storefront by design | P2 in-app if bookmarked |
| `/debug/*` `/dev/*` `/speech-coach-v2-debug` `/amy-avatar-qa` openai tests | Dev | **Dead in PROD** | no | redirects | no | `/dashboard` | n/a | C |
| `*` | 404 `RouteFailedPage` | System | n/a | yes | n/a | yes | generic fail | P3 |

---

## 3. Legacy Residue Inventory

Classification: **A** genuine visible · **B** harmless compatibility · **C** dead/orphaned · **D** intentional living · **E** test/demo only.

| ID | Finding | Class | Severity | Production reachable? |
|---|---|---|---|---|
| R1 | Mobile tab bar + Amy FAB glow on every authenticated screen | A | P1 | **Yes** (always) |
| R2 | `/games` adventure HUD, unlock, daily limit, points | A | P1 | Yes — More “Play” + URL |
| R3 | `/rewards` stars/points/badges/redeem | A | P1 | Yes — URL + games preload |
| R4 | `/phonics` Unlock 15 workbooks + Reading Academy `<details>` | A | P1 | Yes — Grow leave + URL |
| R5 | `/study` and learning-zone suite | A | P1 | Yes — More “Learning” |
| R6 | `/insights` `/progress` analytics dashboards | A | P1 | Yes — More |
| R7 | Speech `?speechLegacy=1` / `localStorage.speech-coach-legacy` / remote config neon cards | A | P1 | Yes if switch on; **default off** |
| R8 | `/speech-coach/live-session` and `/talk` always registered | A | P1 | Yes — deep link |
| R9 | `/worksheet` “LPS Worksheet Studio” | A | P1 | Yes — deep link (not in living nav) |
| R10 | Nutrition living deepen / More care still mounts score, weekly story, household board (`NutritionSectionPanel`). 5-tab `NutritionTopNav` is **not** on the living path | A after deepen | P2 | Yes — after living home action |
| R11 | `/kids-control-center` waitlist SaaS | A | P2 | Yes — More |
| R12 | `/environment` weather dashboard | A | P2 | Yes — URL only |
| R13 | `/welcome` old LandingPage | A | P2 | Yes — URL only (`/` does not go here) |
| R14 | `/pricing` + paywall next-unlocks / Crown / Zap | A/D | P2 | Yes — needed storefront, leftover theatre |
| R15 | Debug overlay `?debug=` / `localStorage.__amynest_debug` | A | P2 | Yes if set; overlay not a product |
| R16 | Health Lab shop/coins/quests/XP HUD | B | P2 | `!living` branch of `HealthLabHome` only. Living More can still open progress + dashboard |
| R17 | Speech neon CSS / TalkWithAmyPage living=false branch | B | — | Off when FA-02 living |
| R18 | Parent Hub `Explore Free` / tile grid | B | — | Off when roomsV1 (production) |
| R19 | `DrawerNavItem` / `PremiumNavItem` / `groupDrawerItems` | C | P3 | Not imported by production UI |
| R20 | FeatureDiscoveryStrip / RetentionHub / phase2 widgets | B | — | Hidden when TODAY_HOME_V1 |
| R21 | Dev routes `DevRouteRedirect` | C | — | `/dashboard` in PROD |
| R22 | Amy Astro illustrations + hub section config | B/C | P3 | Rooms V1 hides section; files remain |
| R23 | ASO marketing pages | D | P2 | Public by design |
| R24 | “Amy is thinking…” Ask Amy wait | D | — | Approved living wait |
| R25 | Hard-day monetization (P0-7) | D | — | Approved |
| R26 | Living nav Home / Rooms / More | D | — | Approved |
| R27 | `playwright-amynest-home-nav.html` fixture | E | — | Not in app router |
| R28 | Dashboard `OnboardingScreen` (“Amy AI Routine Generator”, “Life Skills Mode”) | A | P2 | Yes if `/dashboard` with zero children (`/` itself redirects to `/onboarding`) |
| R29 | `NAV_ITEMS` Kids Control badge `Soon 🚀` | C | P3 | Living nav does not render `item.badge` |
| R30 | No `VITE_FF_LIVING_NAV_V1` flag | D | — | Living drawer is always wired; not a FA-02 surface flag |

---

## 4. Feature Flag Audit

### 4.1 FA-02 master

`artifacts/kidschedule/src/lib/amynest-living-universe.ts`

- Unset / `1` / `true` / `on` / `living` → **all living surfaces forced ON**.
- `legacy` / `0` / `false` / `off` → all OFF (rollback universe).
- `mixed` → **throws in production**. Tests default mixed so per-flag tests still work.
- Per-module `VITE_FF_*_LIVING_V1=0` is **ignored** when master is living.

**Can an environment variable create a mixed universe in production?** No. FA-02 forbids it.

**Does FA-02 still guarantee coherent production behaviour?** Yes, for every flag it owns.

### 4.2 Per-module flags FA-02 owns

Canonical list in `AMYNEST_LIVING_SURFACE_FLAGS`: Today Home, Parent Hub rooms, Child Discovery Film, Infant, Speech, Nutrition, Health Lab, Grow, Birth Sky, Ask Amy, Guidance, Moments, Talking Amy, Amy Coach, Amy Audio, Routine Generation.

There is **no** `VITE_FF_LIVING_NAV_V1` and **no** separate Amy AI flag (Amy AI is Ask Amy companion). Emotional Support is an Ask Amy path, not its own FA-02 flag.

Production living master = all listed surfaces ON.

### 4.3 Switches FA-02 does **not** own (escape hatches)

| Switch | Mechanism | Bypass living? |
|---|---|---|
| `speech-coach-legacy` | `localStorage === "1"` | **Yes** — neon cards on living Speech hub |
| `?speechLegacy=1` | URL query | **Yes** |
| `speechCoachLegacyVisible` | Firebase remote config / `VITE_SPEECH_COACH_LEGACY_VISIBLE` | **Yes** if true (default false) |
| `?debug=` / `__amynest_debug` | query + localStorage | Overlay only |
| `?companion=1` | Ask Amy | Redundant in production (living already forces companion) |
| `localStorage` on FA-02 flags | none | **No** — Vite compile-time |

### 4.4 Answers to the five questions

1. **Can a normal production user accidentally enter a legacy visual universe?**  
   **Yes** — not via FA-02, via **More**, **Grow→Phonics**, **tab bar**, and **un-gated routes**.

2. **Can a deep link bypass the living experience?**  
   **Yes** for leftover routes (`/games`, `/rewards`, `/phonics`, `/study`, `/welcome`, `/worksheet`, `/speech-coach/talk`, `/live-session`).  
   **No** for FA-02-gated chrome (Today widgets, Rooms Explore Free, Speech neon **unless** speech legacy switch).

3. **Can a stale localStorage value bypass the production universe?**  
   **Only** `speech-coach-legacy=1` and `__amynest_debug=1`. FA-02 flags are not localStorage.

4. **Can an environment variable create a mixed universe?**  
   **No** in production (throw). Per-module 0 ignored when master living.

5. **Does FA-02 still guarantee coherent production behaviour?**  
   **Yes** for living surfaces it wraps. **No** for routes and chrome it never wrapped (games, rewards, phonics unlock card, tab bar, worksheet).

---

## 5. Navigation Audit

### 5.1 Production navigation (approved)

- Mobile: `LayoutMobileMenuSheet` → `AmynestHomeNav` (`placement="drawer"`).
- Desktop: `PremiumDesktopSidebar` → `AmynestHomeNav` (`placement="sidebar"`).
- IA: `lib/nav-living-ia.ts` — Home, Today's plan, Beside you, Amy, Rooms, More.

Old SaaS grouping (`groupDrawerItems`, `DrawerNavItem`, `PremiumNavItem`) is **not used** by production UI. **C**.

### 5.2 Navigation that was not remanufactured

**`components/mobile-tab-bar.tsx`** is still mounted from `components/layout.tsx` on every authenticated page (`showNav`).

Visible chrome:

- Fixed 72px `app-footer` / `.app-tabbar`.
- Five destinations: Home, Hub, **Amy Coach (gradient circle + mascot glow)**, Speech, Profile.
- `AmyFab` + `amy-fab-avatar__glow`.

This is the strongest **always-on** leftover identity: a feature launcher / game HUD under the living drawer.

### 5.3 Duplicate nav

| Component | Status |
|---|---|
| `AmynestHomeNav` | Production living |
| `DrawerNavItem` | Dead |
| `PremiumNavItem` | Dead |
| `mobile-tab-bar` | **Live** |
| Parent Hub tile catalogue | Hidden when roomsV1 |
| Nutrition `NutritionTopNav` 5 tabs | **Not mounted** on living path (`nutrition-layout.tsx` living branch skips it) |
| Module-local back rows | Living interiors (approved) |

### 5.4 Browser back / query / mobile / desktop

- Living hash rooms: `/parenting-hub#help|understand|care|moments` — living.
- `?speechLegacy=1` — legacy escape.
- `?companion=1` — living-redundant.
- `?debug=` — overlay.
- Desktop sidebar living; mobile has **both** living drawer **and** leftover tab bar.

---

## 6. Deep-Link Escape Audit

| Target | How opened | Verdict |
|---|---|---|
| `/dashboard` | nav, `/`, fallbacks | SAFE |
| `/parenting-hub` | nav, rooms | SAFE (roomsV1) |
| `/begin` | `/` unsigned | SAFE |
| `/welcome` | typed URL / old bookmark | **LEGACY ESCAPE** |
| `/games` | More Play, URL | **LEGACY ESCAPE** |
| `/rewards` | URL, games flow | **LEGACY ESCAPE** |
| `/phonics` | Grow leave, URL | **LEGACY ESCAPE** |
| `/study` and learning suite | More Learning, URL | **LEGACY ESCAPE** |
| `/insights` `/progress` | More, URL | **LEGACY ESCAPE** |
| `/speech-coach/live-session` `/talk` | URL, legacy cards, talking-amy redirect | **LEGACY ESCAPE** |
| `/speech-coach-v2` | URL | Mixed escape |
| `/worksheet` | URL, `/teacher-os` | **LEGACY ESCAPE** |
| `/environment` | URL | **LEGACY ESCAPE** |
| `/kids-control-center` | More, URL | **LEGACY ESCAPE** |
| `/life-skills` | URL; dashboard `OnboardingScreen` if zero children | **LEGACY ESCAPE** |
| `/parent-growth` | URL only | **LEGACY ESCAPE** |
| `/pricing` | More, paywall | SAFE as storefront; leftover theatre P2 |
| `/debug/*` `/dev/*` | URL in PROD | SAFE (redirect dashboard) |
| Speech neon on `/speech-coach` | query / localStorage / remote config | **LEGACY ESCAPE** if armed |
| Feature discovery on Today | TODAY_HOME_V1 off | SAFE in production living |

No hash-based universe switch except parenting-hub rooms (living).

Notification deep links were not fully enumerated in notification payload maps in this pass; any payload pointing at `/games`, `/rewards`, `/phonics`, `/study`, or speech live/talk would be the same LEGACY ESCAPE as a typed URL.

---

## 7. Visual Legacy Audit

| Pattern | Where | Class | Notes |
|---|---|---|---|
| Neon / fuchsia / cyan gradients | Speech live/talk/index, talking-amy CSS | B/A | Off in living default; **A** if speechLegacy |
| Galaxy / cosmic | `/illustrations/amy-astro/*`, `child-cosmic-portrait.svg`, birth-sky assets | B/D | Birth Sky living opening approved; astro hub section hidden in roomsV1 |
| Game HUD | `/games` | A | |
| XP / points / coins / streaks / badges | `/rewards`, games, health-lab shop, speech live `!living` | A/B | |
| Unlock theatre | phonics download card, games unlock, paywall next-unlocks | A | |
| Academy | `ReadingAcademyHub` on `/phonics` | A | |
| PRO zone / learning hub | study-zone, kids-control | A | |
| Chatbot chrome | Ask Amy `!companionMode` | B | Off in production living |
| Marketplace / catalogue | Parent Hub tiles | B | Off roomsV1 |
| Purple global theme | `index.css --primary` is warm orange `14 85% 58%` | D/harmless | Not purple |
| `.app-footer` tab bar | global CSS + live component | A | |
| Amy FAB glow | `components/amy-fab.tsx` (`amy-mascot-glow`) | A | |

---

## 8. Copy Legacy Audit

### Living approved (do not flag)

- Today's next right thing  
- A calmer next hour  
- Help / Understand / Care / Moments  
- Talk whenever you need  
- Stay with this / Keep going for now (P0-7)  
- Amy is thinking… (Ask Amy wait, approved)  
- Quiet next-step premium (hard-day law)

### Legacy user-facing (production reachable)

| Copy | Surface | Class |
|---|---|---|
| Unlock 15 Complete Phonics Workbook Sets / Paid Premium | `/phonics` | A P1 |
| Adventure / Let's Play / Daily limit reached / Played today | `/games` | A P1 |
| Your stars / points / badges / redeem | `/rewards` | A P1 |
| LPS Worksheet Studio | `/worksheet` | A P1 |
| Explore Free | Parent Hub if roomsV1 off | B |
| Upgrade / Unlock Premium / next unlocks | `paywall-modal.tsx` | A/D P2 |
| Live Session / Talk with Amy (neon cards) | Speech if legacy switch | A P1 |
| Kids Control Center / join waitlist | `/kids-control-center` | A P2 |
| Feature discovery / “more to explore” | Today if TODAY_HOME off | B |

### Internal / developer (do not treat as product debt)

- `livingUniverse`, `FA-02`, `HUB_REMOVED_TILE_IDS`, `showSpeechCoachLegacyCards`, test titles, CMS keys, code comments.

---

## 9. Premium / Monetization Audit

**Do not change monetization. Audit only.**

| Surface | Before value | After value | Unlock theatre | Forced upgrade | Not now | Hard-day | Continuity |
|---|---|---|---|---|---|---|---|
| Ask Amy | Companion workspace | Soft continue at quota | No auto-paywall (P0-7) | No | Stay with this | **Holds** | Yes |
| Emotional Support | Letter first | Free floor 4 | No | No | Keep going | **Holds** | Yes |
| Speech | Living hub | Paywall possible on live/premium voice | Legacy cards if switch | Not default | Paywall has dismiss | PREMIUM_VOICE skipped on hard-day | Mixed |
| Infant | Living Hub Care door | AccessGate | Quiet | No | Yes | n/a | Yes |
| Nutrition | Living open | Deepen / More care | Low | No | Yes | n/a | Open is clean; deepen mixed |
| Health | Living home | More wellness → progress/dashboard | Shop hidden on living first frame | No | — | n/a | Open is clean |
| Coach | Living | Progress/paywall | Low | No | Yes | n/a | Open is clean |
| Guidance | Living | AccessGate | Quiet | No | Yes | n/a | Yes |
| Routine | Living generate | AccessGate | Quiet | No | Yes | n/a | Yes |
| Birth Sky | Living | Premium deepen | Low | No | Yes | n/a | Open is clean |
| Grow | Living stream in Understand | **Phonics unlock card on `/phonics`** | **Yes on leave** | Card is storefront | — | n/a | **Breaks on leave** |
| Moments | Living | — | No | No | — | n/a | Yes |
| Talking Amy | Redirect to talk | Same as speech talk | If legacy | — | — | n/a | Mixed |
| Amy AI | Companion | Same as Ask Amy | P0-7 | No | Yes | Holds | Yes |
| `/pricing` | Storefront | Packages | Crown/Zap/next-unlocks | Page is the store | Back | n/a | Needed; theatre P2 |
| Games/Rewards | Play first | Daily limit / points | **Yes** | Limit card | — | n/a | Game product |

Hard-day law **still holds** on Ask Amy and Emotional Support. It does not protect `/games`, `/phonics` unlock, or `/pricing` theatre — those were never in P0-7 scope.

---

## 10. Loading / Error / Empty State Audit

| State | Example | Verdict |
|---|---|---|
| Ask Amy wait “Amy is thinking…” | `ai-chat-core` | **D** truthful living (approved) |
| Speech live connecting | live session | **A/C** leftover if route opened |
| Games generating/unlock | games hub | **C** legacy |
| Health Lab shop load | shop view | **C** leftover |
| Routine generating | living generate | **A** truthful |
| Nutrition generating | living then deepen | **A** then mixed |
| `RouteFailedPage` 404 | catch-all | **D** acceptable system; not living prose |
| Unauthorized / auth expired | auth pages | **D** system |
| No child | dashboard/onboarding | **D** |
| API/AI failure | various | Mixed; many still generic cards (**P2**) |
| Payment failure | paywall | System |
| Empty Parent Hub | rooms empty copy | Living |
| Empty Today | living home | Living |
| Premium locked | AccessGate | Living quiet on manufactured modules |

Wait-state grades requested:

- Truthful living waits: **A** (routine, Ask Amy, manufactured interiors).  
- Misleading AI theatre: not found as a default production first frame.  
- Legacy waits: games/rewards/speech live if those routes opened (**C**).  
- Acceptable system: auth, 404, billing (**D**).

---

## 11. Asset Audit

**Do not delete.** Report only.

| Asset | Referenced from | Production reachable | State | Severity |
|---|---|---|---|---|
| `/illustrations/amy-astro/*` | `lib/amy-astro-card-config.ts` | Only if astro hub section shown (roomsV1 hides) | Isolated | P3 |
| `public/amy-astro/child-cosmic-portrait.svg` | birth-sky / astro | Birth Sky living may still use cosmic art | Mixed D/A | P2 |
| Amy FAB mascot + glow | `mobile-tab-bar`, `amy-fab.tsx` | **Always** (mobile nav) | Legacy chrome | P1 |
| Speech neon CSS | speech pages | Living off / legacy switch on | Isolated unless switch | P1 if switch |
| Games artwork in `pages/games.tsx` | `/games` | Yes | Legacy | P1 |
| Rewards burst | `pages/rewards.tsx` | Yes via URL | Legacy | P1 |
| Phonics workbook marketing card | `PhonicsDownloadCard` | Yes via Grow | Legacy | P1 |
| Store badges on `/welcome` | `LandingPage` | URL only | Legacy marketing | P2 |
| `playwright-amynest-home-nav.html` | tests | No | E | — |

Old purple icon sets and robot treatments may still exist under `public/`; they are **not** on Today/Rooms first frames. Unreferenced files are **C** until a route loads them.

---

## 12. Component Duplication Audit

| Concern | Living (production) | Leftover still reachable | Dead |
|---|---|---|---|
| Navigation | `AmynestHomeNav` | `mobile-tab-bar` | `DrawerNavItem`, `PremiumNavItem` |
| Headers | Living page headers | Module-local toolbars (nutrition tabs, games hero) | Feature discovery strip (flagged off) |
| Drawers | Living sheet | — | old grouped drawer |
| Cards | Living doors / AmyNestCard | Game tiles, phonics unlock card, reward cards | Hub tiles when roomsV1 |
| Premium gates | AccessGate, P0-7 Ask Amy | `paywall-modal` next-unlocks, phonics paid card | — |
| Loading | Living copy | Games/speech live | — |
| Amy identity | Companion + living headers | FAB glow, Coach tab circle | — |
| Composer | Ask Amy companion | — | chatbot picker default off |
| Room shell | Rooms V1 | — | Explore Free grid |
| Leave continuity | Manufactured leave rows | Grow→phonics, More→games/study | — |

---

## 13. CSS Audit

| CSS | Reachable production | Isolated fallback | Dead | Harmless |
|---|---|---|---|---|
| `index.css` warm `--primary` | yes | | | **harmless / living** |
| `.app-footer` / `.app-tabbar` | **yes** | | | leftover |
| `amynest-home-nav.css` | yes | | | living |
| `index.css` `.amy-mascot-glow` / `.amy-fab-avatar__glow` | **yes** (tab FAB) | | | leftover global |
| Speech neon classes | only live/talk or legacy cards | living hub avoids | | |
| `pages/games.tsx` inline/hero | `/games` | | | leftover |
| Health lab shop CSS | shop view | living home avoids | leftover | |
| `overflow: hidden` on layout/sheets | yes (drawers) | | | typical; not certified |
| Safe-area on tab bar | yes | | | leftover chrome uses it |
| Legacy breakpoints | various | | | P3 |

Global purple background: **not found**. Primary token is warm.

---

## 14. Responsive Audit

**Static / browser evidence only. No physical device certification.**

Prior living-nav fixture (`playwright-amynest-home-nav.html`) verified 320 / 360 / 390 / 430 + desktop for **drawer/sidebar only**.

This audit does **not** recertify every leftover interior.

Static risks:

| Width | Risk | Surface |
|---|---|---|
| 320–430 | Tab bar 72px + FAB steals south territory | All authenticated mobile |
| 320 | Games hero / unlock cards likely cramped | `/games` |
| 320 | Phonics unlock card + academy details | `/phonics` |
| 320 | Nutrition deepen panels / More care | `/nutrition` |
| Desktop | Living sidebar OK; leftover pages still tool-shaped | study, insights, worksheet |
| Keyboard | Not statically proven | composers |

Do not treat this section as a ship certificate.

---

## 15. Accessibility Static Audit

**STATIC NOTES vs DEVICE NOT CERTIFIED.**

| Check | Static note |
|---|---|
| Heading hierarchy | Living nav uses `p` eyebrow + list; rooms use living titles. Leftover games/rewards/phonics not re-audited here. |
| Button names | Living nav items have `aria-current`. FAB has an accessible name in `AmyFab`. |
| Dialog titles | Paywall / sheets exist; not recertified. |
| Focus order | Living nav is a `nav` landmark. Tab bar is a second landmark — **duplicate nav** for AT users (P2 a11y smell). |
| Keyboard | Drawer sheet focus trap depends on existing sheet. Not device-certified. |
| Focus visibility | Not measured. |
| Touch targets | Living nav items 44px. Tab bar items exist; FAB is large. |
| Contrast | Warm primary on white living surfaces likely OK; neon speech if switch on likely fail. **Not measured in this pass.** |

**DEVICE NOT CERTIFIED.** No VoiceOver / TalkBack / keyboard-device claims.

---

## 16. Auth / System Screen Audit

| Screen | Route | Feels like AmyNest home? | Severity |
|---|---|---|---|
| Begin / welcome living | `/begin` | Yes (approved) | — |
| Old landing | `/welcome` | No — store landing | P2 |
| Sign in / sign up / verify / reset | `/sign-in` etc. | System forms | P2 |
| Onboarding | `/onboarding` | Setup, not home | P2 |
| Profile / account | `/parent-profile` | Account SaaS | P2 |
| Notification settings / devices | `/notification-settings` | Settings | P3 |
| Pricing | `/pricing` | Storefront | P2 |
| Trial ended | `/subscription-trial-ended` | Billing | P2 |
| Sign out | profile | System | — |
| Session expired | auth | System | P3 |
| Unauthorized | route guards | System | P3 |
| Error boundary / 404 | `RouteFailedPage` | Generic | P3 |
| Admin | `/admin/*` | Internal | n/a |

System screens are allowed to be quieter than Today Home. They should not look like a **second product**. `/welcome` and `/pricing` theatre are the main identity leaks in this band.

---

## 17. P0 Findings

**None.**

Rationale (do not inflate):

- FA-02 holds. Mixed env cannot ship.
- Manufactured openings remain living.
- Speech neon is **not** default-on.
- Hard-day law holds on Ask Amy / Emotional Support.
- No auth/payment/engine break is in scope of this visual audit.

A Firebase remote-config flip of `speechCoachLegacyVisible` would be an **ops P0** if someone enabled it in production. Code default is false. Treat as a **release-config rule**, not a code P0.

---

## 18. P1 Findings

Must treat as identity-breaking if a parent can walk there from production chrome or a plausible URL.

1. **Always-on mobile tab bar + Amy FAB glow** — second navigation universe under the living drawer. `components/mobile-tab-bar.tsx`, `components/layout.tsx`, `components/amy-fab.tsx`.
2. **`/games` via More “Play”** — game HUD, unlock, points. `pages/games.tsx`, `lib/nav-living-ia.ts` More.
3. **`/rewards` via URL / games** — XP/stars/badges. `pages/rewards.tsx`.
4. **`/phonics` via Grow leave** — “Unlock 15 Complete Phonics Workbook Sets”. `pages/phonics-learning.tsx`, `PhonicsDownloadCard`, `ReadingAcademyHub`.
5. **`/study` (+ spelling/olympiad/abacus/event-prep) via More “Learning”** — edtech suite.
6. **`/insights` and `/progress` via More** — analytics dashboards.
7. **Speech legacy escape independent of FA-02** — `showSpeechCoachLegacyCards()`, `/speech-coach/live-session`, `/speech-coach/talk`.
8. **`/worksheet` LPS Worksheet Studio** — another-company chrome if URL opened (not in living nav; still a deep-link P1).

Nutrition 5-tab `NutritionTopNav` is **not** production-living. Nutrition deepen / More care leftover panels are **P2**. Health Lab shop HUD is **not** on the living first frame.

---

## 19. P2 / P3 Findings

**P2**

- `/welcome` old `LandingPage`.
- `/kids-control-center` waitlist.
- `/environment` dashboard (URL only).
- `/pricing` Crown/Zap/next-unlocks theatre (function needed).
- Debug overlay in production if armed.
- Health Lab shop/dashboard views still in zone (`!living` HUD; living More can open progress/dashboard).
- Dashboard `OnboardingScreen` if `/dashboard` is opened with zero children.
- Nutrition deepen / More care leftover panels.
- Coach `/amy-coach/progress` analytics.
- ASO marketing pages (intentional storefront; odd if opened inside the signed-in app).
- Profile/settings SaaS tone.
- Duplicate tab-bar landmark (a11y).
- Generic error cards on some leftover routes.

**P3**

- Dead `DrawerNavItem` / `PremiumNavItem`.
- Amy Astro assets still in repo.
- 404 prose not living-voiced.
- Unreferenced illustrations.
- Test fixtures (`playwright-amynest-home-nav.html`).

---

## 20. Exact Evidence / File References

| Evidence | File |
|---|---|
| Router | `artifacts/kidschedule/src/AppCore.tsx` |
| FA-02 | `artifacts/kidschedule/src/lib/amynest-living-universe.ts` |
| Living nav IA | `artifacts/kidschedule/src/lib/nav-living-ia.ts` |
| Living nav UI | `artifacts/kidschedule/src/components/nav/amynest-home-nav.tsx` |
| Tab bar | `artifacts/kidschedule/src/components/mobile-tab-bar.tsx` |
| Layout mounts tab bar | `artifacts/kidschedule/src/components/layout.tsx` |
| Speech legacy switch | `artifacts/kidschedule/src/pages/speech-coach/show-speech-coach-legacy.ts` |
| Speech remote config | `artifacts/kidschedule/src/features/speech-coach-v2/lib/remote-config.ts` |
| Games | `artifacts/kidschedule/src/pages/games.tsx` |
| Rewards | `artifacts/kidschedule/src/pages/rewards.tsx` |
| Phonics unlock | `artifacts/kidschedule/src/pages/phonics-learning.tsx` (PhonicsDownloadCard) |
| Rooms hide games tile | `HUB_REMOVED_TILE_IDS` includes `gaming-rewards` |
| Today hides discovery | `TODAY_HOME_V1` in dashboard |
| Debug overlay | `artifacts/kidschedule/src/contexts/debug-context.tsx` |
| Dev redirect | `DevRouteRedirect` in AppCore |
| Worksheet copy | `WorksheetStudioAccessGate` / worksheet page |
| Paywall theatre | `artifacts/kidschedule/src/components/paywall-modal.tsx` |
| Hard-day | `artifacts/kidschedule/src/lib/hard-day-monetization.ts` |
| Nutrition living vs tabs | `artifacts/kidschedule/src/features/nutrition/layout/nutrition-layout.tsx` (living skips `NutritionTopNav`) |
| Health living vs shop HUD | `artifacts/kidschedule/src/features/health-lab/components/health-lab-home.tsx` (`if (living)` opening; shop in `!living` branch) |
| Grow leave deepen | `artifacts/kidschedule/src/components/parent-hub/parent-hub-rooms-shell.tsx` (`renderDestination(growDeepenTileId)`) |
| Phonics living title + leftover card | `artifacts/kidschedule/src/pages/phonics.tsx` + `PhonicsDownloadCard` |
| Zero-child dashboard | `OnboardingScreen` in `artifacts/kidschedule/src/pages/dashboard.tsx` |
| Life skills route | `artifacts/kidschedule/src/pages/life-skills.tsx` |
| Amy FAB glow | `artifacts/kidschedule/src/components/amy-fab.tsx` (`amy-mascot-glow`) |
| Amy Astro config | `artifacts/kidschedule/src/lib/amy-astro-card-config.ts` |

---

## 21. Recommended Fix Order

Audit only — this is a **suggested sequence**, not work authorised by this document.

1. Decide living-nav **More** policy: hide or wrap leave destinations that are still other products (`/games`, `/study`, `/insights`, `/progress`, `/kids-control-center`).
2. Remanufacture or gate **mobile tab bar + FAB** so south chrome matches the living drawer.
3. Gate or remanufacture **Grow → `/phonics`** unlock card + academy details.
4. Redirect or wrap **`/rewards`**, **`/speech-coach/live-session`**, **`/speech-coach/talk`**, **`/welcome`**, **`/worksheet`**.
5. Kill or FA-02-own the **speech legacy switch** (query / localStorage / remote config).
6. Quiet **paywall next-unlocks** theatre (P2; do not retouch P0-7).
7. Leave dead components and unused assets until a dedicated cleanup; do not delete in a product pass.

Do **not** reopen manufactured interiors (Today, Rooms, Infant, Speech hub, Nutrition opening, Health opening, Grow opening, Birth Sky opening, Ask Amy, Guidance, Moments, Coach, Audio, Amy AI, Routine, living drawer IA, FA-02, P0-7).

---

## 22. Final Blind House Verdict

If a tired parent sees the screen without context, does it feel like the same AmyNest home?

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Accidentally another visual universe? | **YES** | More → Play `/games`; More → Learning `/study`; Grow → `/phonics`; tab bar on every page |
| 2 | Deep link bypass living? | **YES** (routes). **NO** (FA-02 flags) | `/rewards`, `/welcome`, `/worksheet`, speech live/talk, `?speechLegacy=1` |
| 3 | Any screen still look like SaaS? | **YES** | `/insights`, `/progress`, `/parent-profile`, `/kids-control-center`, `/environment`, `/pricing` |
| 4 | Any screen still look like a game? | **YES** | `/games`, `/rewards`; FAB glow; Health shop if opened |
| 5 | Any screen still look like an astrology app? | **SOFT YES** | Amy Astro assets if section shown; Birth Sky leftover cosmic art vs living opening |
| 6 | Any screen still look like an edtech marketplace? | **YES** | `/phonics` unlock + academy; `/study` suite |
| 7 | Any screen still look like a nutrition SaaS? | **AFTER DEEPEN / MORE CARE** | Living open is home; `NutritionTopNav` off. Score / weekly story / household appear under More care; deepen uses `NutritionSectionPanel` |
| 8 | Any screen still look like a chatbot/AI demo? | **NO on default** `/assistant`. **YES** if living off or speech talk neon | Production living forces companion |
| 9 | Any screen still look like a subscription storefront? | **YES** | `/pricing`, paywall modal, phonics Paid Premium card |
| 10 | Any screen still look like another company built it? | **YES** | `/worksheet` “LPS Worksheet Studio”; `/welcome` old landing; games/rewards |

---

## 23. What is already clean

Do not remanufacture these. They are the production candidate.

- Welcome / Signup / Begin (`/begin`)
- Today Home (`/dashboard`, TODAY_HOME_V1)
- Parent Hub Rooms V1 (`/parenting-hub` + hashes)
- Infant Care
- Speech Coach **living hub** (not live/talk routes)
- Nutrition **living opening**
- Health Lab **living home**
- Grow **living opening** (leave is not)
- Birth Sky **living opening**
- Ask Amy / Amy AI companion workspace
- Guidance
- Moments
- Talking Amy **redirect + living wrappers when flags on**
- Amy Coach living
- Amy Audio living
- Routine Generation living
- Living drawer / sidebar (`AmynestHomeNav`)
- FA-02 production lock
- P0-6 Parent Hub remediation
- P0-7 Hard-Day Monetization
- P1 manufactured interiors listed in the founder order

FA-02, P0-7, engines, APIs, DB, RevenueCat, Firebase, auth: **clean for this audit’s purposes** (not in visual residue scope to reopen).

---

## 24. What must NOT be touched

If a later pass is authorised, it still must not:

- Modify engines, scoring, generation, audio pipelines, speech recognition, nutrition scoring, health science, birth-sky calculation, routine engine.
- Modify APIs, DB, Firebase, RevenueCat, auth, analytics contracts.
- Turn FA-02 into mixed.
- Reopen P0-7 policy.
- Delete assets “because they look old” without a reachability pass.
- Refactor dead `DrawerNavItem` as a product change.
- Restyle manufactured living openings to match leftover pages.
- Use this audit as permission to implement.

---

# FINAL OUTPUT (A–G)

### A. Remaining genuine legacy P0 / P1

- **P0:** none in code defaults.
- **P1:** tab bar + FAB; `/games`; `/rewards`; `/phonics` unlock/academy; `/study` suite; `/insights` `/progress`; speech live/talk + speechLegacy switch; `/worksheet` LPS branding.

### B. Legacy safely isolated behind rollback

- Speech neon CSS and Talk/Live **living=false** branches (FA-02 living ON).
- Parent Hub Explore Free / tile catalogue (`roomsV1`).
- Today FeatureDiscoveryStrip / RetentionHub / phase2 widgets (`TODAY_HOME_V1`).
- Ask Amy chatbot mode picker (`companionMode` forced on).
- Health Lab shop/coins/quests HUD (`!living` branch of `HealthLabHome`).
- Nutrition 5-tab `NutritionTopNav` (living branch does not mount it).
- Full living-off universe if master is `legacy` (intentional rollback).

### C. Dead / orphaned legacy

- Dev/debug routes redirected in PROD.
- `DrawerNavItem`, `PremiumNavItem`, `groupDrawerItems` unused by production UI.
- `/babysitters` → dashboard.
- `playwright-amynest-home-nav.html` fixture.
- Hub tiles in `HUB_REMOVED_TILE_IDS` (including `gaming-rewards` on Rooms — **More still exposes Play**).

### D. Cosmetic P2 / P3

- `/welcome` bookmark, ASO pages, `/environment`, kids-control waitlist, paywall unlock preview, debug overlay, profile SaaS tone, 404 voice, unused astro assets, dead nav components.

### E. Is AmyNest now genuinely ONE HOME?

**At the door: yes.  
After More / Grow leave / tab bar / leftover URLs: no.**

### F. Can legacy residue still reach production?

**Yes.** A parent on a production living build, with FA-02 ON and no speech-legacy switch, can still open `/games`, `/study`, `/phonics`, `/insights`, `/progress`, `/rewards`, `/worksheet`, and always sees the tab bar/FAB.

### G. Is another remediation pass actually necessary?

**Yes — a targeted leave-path and chrome pass.**  
**No — not another full-universe manufacturing of already approved interiors.**

STOP. Audit complete. No implementation.
