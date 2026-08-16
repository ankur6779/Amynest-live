# AmyNest Navigation — Living Remanufacture Review

**Status:** EXPERIENCE-ONLY NAVIGATION REMEDIATION COMPLETE  
**Date:** 2026-08-16  
**Branch:** `main`  
**Authority:** Founder Order — AmyNest navigation remanufacture  

This is **not** a module redesign. This is **not** another Amy AI polish. This is **not** a portfolio audit.

AI prompts, engines, APIs, DB, Firebase, RevenueCat, auth, and entitlements were **not** changed. Approved room interiors were **not** modified. Routes were **not** removed.

---

## 1. Current legacy problems

The mobile drawer (`layout-mobile-menu-sheet`) and desktop sidebar (`premium-desktop-sidebar`) still presented AmyNest as a product catalogue:

| Legacy symptom | Effect |
|---|---|
| Purple / violet glowing square icon tiles (`DrawerNavItem`) | App-launcher chrome, not the living house |
| `"PRIMARY"` / `"LEARNING"` / `"INSIGHTS"` grouping (`NAV_DRAWER_GROUPS`) | Feature-store IA |
| Equal-weight module cards with marketing descriptions | “What features does this app contain?” |
| Header **AmyNest AI / AI for Smart Parenting** + mascot glow | Older application shell |
| **SMART PARENT** badge + oversized profile card | Gamified account chrome |
| Amy AI as “Parenting assistant & chat” + robot tile | AI-product SKU, not companion |
| Routines as “Builder & tracking” | Engine language |
| Birth Sky / Nutrition Hub as primary peers | Rooms flattened into a mall |
| Sign out as a large red/pink card | Competed with destinations |

That language no longer matches Welcome, Today Home, Parent Hub Rooms V1, Amy Coach, Amy Audio, or Amy AI.

---

## 2. Navigation IA before / after

**Before (catalogue):** Primary → Learning → Insights → Account. Every href was a peer tile.

**After (home doors):** existing Parent Hub / Rooms V1 architecture, plus the living places-of-life labels already approved for the tab bar.

| Group | Visible label | Destinations | Weight |
|---|---|---|---|
| Home | *(none)* | Home | Primary |
| Care | *(none)* | Today's plan | Primary |
| Beside you | *(none)* | Beside you, Amy | Primary |
| Rooms | Rooms | Help, Understand, Care, Moments | Room doors over `/parenting-hub` |
| More | More (quiet disclosure) | Leftover / legacy hrefs | Secondary |

Primary destinations are unlabeled on purpose so the drawer does not reintroduce `PRIMARY`-style catalogue headings. Rooms keep a quiet heading because they are rooms in one home. More stays closed until needed, and opens automatically when the current route is a leftover href.

Approved copy reused (not invented):

- Header line: **Today's next right thing** (Visual Identity locked promise)
- Home / Today's plan / Rooms: `portfolio-nav-labels.ts` + founder living names
- Beside you: `livingAmyCoachNavLabel()` / `livingAmyCoachNavDescription()`
- Amy: **Talk whenever you need** + `AmyAIIcon`
- Room titles + feelings: `ROOM_HEROES` (`You are not alone.` / `See your child more clearly.` / `Take care of today.` / `Spend one meaningful moment.`)

---

## 3. Route preservation map

Every current `NAV_ITEMS` / `DEFAULT_MOBILE_MENU` / injected `/study` href remains reachable. `/parenting-hub` is preserved as the Rooms heading plus four hash doors. No new routes.

| Current label (legacy) | Current route | New living label | New hierarchy |
|---|---|---|---|
| Home / Dashboard | `/dashboard` | Home | Home · primary |
| Birth Sky | `/birth-sky` | Birth Sky | More · quiet (also inside Understand) |
| Parenting Hub | `/parenting-hub` | Rooms | Rooms heading → same route |
| *(new presentation)* | `/parenting-hub#help` | Help | Rooms · same hub route |
| *(new presentation)* | `/parenting-hub#understand` | Understand | Rooms · same hub route |
| *(new presentation)* | `/parenting-hub#care` | Care | Rooms · same hub route |
| *(new presentation)* | `/parenting-hub#moments` | Moments | Rooms · same hub route |
| Amy Coach / Beside you | `/amy-coach` | Beside you | Beside you · primary |
| Nutrition Hub | `/nutrition` | Nutrition | More · quiet (also inside Care) |
| Routines | `/routines` | Today's plan | Care · primary |
| Games | `/games` | Play | More · quiet |
| Amy AI | `/assistant` | Amy | Beside you · primary |
| Amy Quick Tutor | `/amy-ai-tutor` | Quick help | More · quiet |
| Kids Control Center | `/kids-control-center` | Kids Control | More · quiet |
| Progress | `/progress` | Progress | More · quiet |
| Insights | `/insights` | Insights | More · quiet |
| Behavior | `/behavior` | Patterns | More · quiet |
| My Recipes | `/recipes` | Recipes | More · quiet |
| Children | `/children` | Children | More · quiet |
| Profile | `/parent-profile` | Account | Family row + More |
| Pricing | `/pricing` | Plans | More · quiet |
| Referrals | `/referrals` | Invite | More · quiet |
| Feedback | `/feedback` | Feedback | More · quiet |
| Learning Zone *(injected)* | `/study` | Learning | More · quiet |

Room hashes reuse `parseParentingHubDeepLink` + existing `roomForLegacyGroup`, so Help/Understand/Care/Moments open the living rooms without a new route.

`AppLink` still strips hashes; the row click restores `#help` / `#understand` / `#care` / `#moments` after navigate (or dispatches `hashchange` when already on the hub).

---

## 4. Components / files changed

| File | Role |
|---|---|
| `artifacts/kidschedule/src/lib/nav-living-ia.ts` | Living hierarchy + route preservation |
| `artifacts/kidschedule/src/lib/nav-living-ia.test.ts` | IA + preservation tests |
| `artifacts/kidschedule/src/components/nav/amynest-home-nav.tsx` | Header, family row, rows, Rooms, More, Sign out |
| `artifacts/kidschedule/src/components/nav/amynest-home-nav.css` | Sanctuary chrome, quieter than rooms |
| `artifacts/kidschedule/src/components/nav/amynest-home-nav.test.tsx` | Chrome / anti-catalogue tests |
| `artifacts/kidschedule/src/components/layout-mobile-menu-sheet.tsx` | Mobile drawer uses living chrome |
| `artifacts/kidschedule/src/components/premium-desktop-sidebar.tsx` | Desktop sidebar uses the same house |
| `artifacts/kidschedule/src/lib/hub-activity-cross-link.ts` | Room-id hashes (`help` / `understand` / `care` / `moments`) |
| `artifacts/kidschedule/src/lib/hub-activity-cross-link.test.ts` | Room-hash cases |
| `artifacts/kidschedule/src/components/app-link.tsx` | Forwards `aria-current` only |
| `artifacts/kidschedule/playwright-amynest-home-nav.html` | Visual fixture (no auth) |
| `artifacts/kidschedule/src/playwright/amynest-home-nav-fixture.tsx` | Renders real living chrome |

Not changed: `NAV_ITEMS` source hrefs, tab bar routes, module interiors, `drawer-nav-item.tsx` / `nav-premium-config.ts` (unused by the living drawer; left in place so other callers are untouched).

---

## 5. Visual system reused

No new navigation design system. The drawer inherits the manufactured evening sanctuary already used by Amy Coach / Amy Audio / Amy AI / Parent Hub:

- Field: `#141018 → #1a1520 → #121018` + cream radial
- Ink: cream `rgba(243, 232, 216, 0.96)` / muted `rgba(184, 169, 154, 0.88)`
- Hairline: `rgba(232, 212, 184, 0.16)`
- Type: Quicksand titles
- Companion mark: `AmyAIIcon` (not a robot tile)
- Pressed state: existing `PRESS_FEEDBACK` on `AppLink`
- Motion: 160ms background ease; overlay `fade-in` / `slide-in-from-left-4`; `prefers-reduced-motion: reduce`

The drawer is intentionally **quieter than the rooms** (no photography, no neon, no glowing tiles).

---

## 6. Mobile verification

Fixture: `/playwright-amynest-home-nav.html?panel=drawer`

| Width | Overflow | Clipped labels | Notes |
|---|---|---|---|
| 320 | none | none | Drawer `min(350px, 85vw)` = 272px; descriptions wrap 2 lines |
| 360 | none | none | |
| 390 | none | none | |
| 430 | none | none | Drawer caps at 350px |
| 320×568 | none | none | Close stays in header; Sign out stays in footer; list scrolls |

Touch targets: close, family row, primary rows, room rows, More summary, Sign out are ≥ 44px. One scroll region (header/footer sticky). Keyboard: Escape still closes the sheet.

Evidence: `nav_drawer_320.png`, `nav_drawer_360.png`, `nav_drawer_390.png`, `nav_drawer_430.png`, `nav_drawer_320_short.png`, `nav_drawer_390_more.png`.

---

## 7. Desktop verification

Same living chrome, not a scaled catalogue. Sidebar `min(320px, 26vw)` / `min-w-[280px]`, larger padding at `lg`. More remains a quiet disclosure. Sign out stays a text action in the footer.

Evidence: `nav_sidebar_desktop.png`, `nav_sidebar_desktop_more.png`.

---

## 8. Accessibility static verification

Claimed statically only. VoiceOver / TalkBack / Dynamic Type device certification is **not** claimed.

| Check | Result |
|---|---|
| Landmark | `<nav aria-label="AmyNest home">` |
| Semantic order | Close / brand → family/account → destinations → Sign out |
| Close | `aria-label="Close menu"`, 44px, outside the scroll |
| Current page | `aria-current="page"` on the active row |
| Rooms | Help / Understand / Care / Moments are links; Rooms heading is the hub door |
| More | Native `<details>` / `<summary>`, 44px, opens when the current href is leftover |
| Sign out | `type="button"`, quiet text, not a destructive card |
| Focus | Cream 2px rings on family, rows, More, Sign out |
| Reduced motion | Row/family transitions disabled |
| Truncation | Labels ellipsis; descriptions 2-line clamp (no horizontal clip at 320) |

---

## 9. Regression results

Living-universe and navigation tests that were run:

- `nav-living-ia`, `amynest-home-nav`, `hub-activity-cross-link`
- `portfolio-nav-labels`
- `parent-hub/rooms`, `room-heroes`, `destinations`, `room-living`, `feature-flags`
- `amy-coach/living-room`, `ask-amy/living-room`
- `safe-navigation`, `navigation-stack`, `nav-back-flows`, `navigation-orchestrator`
- `amynest-living-universe`

No route regressions in those suites. `parent-hub-i18n` was not run (pre-existing skip). Module interiors were not opened.

Drawer open/close, account, and sign-out handlers are the same callbacks as before (`onOpenChange`, `/parent-profile`, existing `signOut`).

---

## 10. TypeScript result

```
pnpm --filter @workspace/kidschedule run typecheck
PASS
```

---

## 11. Test result

```
pnpm --filter @workspace/kidschedule exec vitest run --config vitest.config.ts
  src/lib/nav-living-ia.test.ts
  src/components/nav/amynest-home-nav.test.tsx
  src/lib/hub-activity-cross-link.test.ts
  + living / nav regression files listed in §9

PASS
```

Preservation assertion: every `NAV_ITEMS` and `DEFAULT_MOBILE_MENU` href is present after living grouping.

---

## 12. Production build result

```
pnpm --filter @workspace/kidschedule run build
PASS — ✓ built in 21.94s
```

---

## 13. Blind-test answers

| # | Question | Answer |
|---|---|---|
| 1 | Does this still look like a SaaS feature catalogue? | **NO** |
| 2 | Does it look like an app launcher? | **NO** |
| 3 | Does it look like the same AmyNest home? | **YES** |
| 4 | Are all destinations still reachable? | **YES** (Rooms hashes + More leftover) |
| 5 | Are Home / Today's plan / Beside you clearly prioritized? | **YES** |
| 6 | Are Rooms treated as rooms rather than products? | **YES** |
| 7 | Does Amy AI feel like a companion rather than an AI product? | **YES** (Amy + `AmyAIIcon` + “Talk whenever you need”) |
| 8 | Does navigation work at 320/360/390/430px? | **YES** |
| 9 | Is Sign out visually secondary? | **YES** |
| 10 | Does it feel premium without looking expensive/marketing-heavy? | **YES** |
| 11 | Does opening/closing feel calm? | **YES** (soft fade/slide; no neon) |
| 12 | Does the drawer inherit the current AmyNest living universe? | **YES** |

---

## 14. Screenshots / evidence

Captured from the real React chrome via `/playwright-amynest-home-nav.html` (same components as production drawer/sidebar).

| File | What it shows |
|---|---|
| `nav_drawer_320.png` | 320px home hierarchy, no catalogue, no clip |
| `nav_drawer_360.png` | 360px |
| `nav_drawer_390.png` | 390px |
| `nav_drawer_430.png` | 430px |
| `nav_drawer_320_short.png` | 320×568 — sticky close + Sign out |
| `nav_drawer_390_more.png` | More expanded; leftover routes remain |
| `nav_sidebar_desktop.png` | Desktop sidebar, same house |
| `nav_sidebar_desktop_more.png` | Desktop More expanded |
| `nav_living_quality_gate.log` | Typecheck / tests / build log |

STOP. Navigation remediation only. No further module work.
