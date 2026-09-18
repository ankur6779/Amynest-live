# AmyNest Astronomy Deep UI/UX Audit

**Module:** Amy Astronomy (Birth Sky living dashboard — Cosmic Portrait + related surfaces)  
**Branch:** `cursor/amy-astronomy-ui-ux-d285`  
**Scope:** Presentation / layout only. Engines, snapshots, ephemeris, and APIs were not changed.  
**Source assets:** Not edited. The portrait PNG is intact.

---

# Executive Summary

The screenshots were not a single CSS miss. Amy Astronomy was rendering a **complete 1:1 illustration** (`amy-astro-portrait.png`) as if it were a **character cutout inside a circular orbit**.

That mismatch produced:

1. Accidental circular framing and crowded celestial ornaments on the hero.
2. Story-beat text colliding with the top of the artwork on mobile.
3. A second copy of the same illustration forced into a `w-36` / `max-w-[140px]` box, looking tiny in a large empty footer.
4. The Save Memory CTA sitting under the Ask Amy FAB because Astronomy had no shared FAB corridor.

The repair is a **role-based illustration frame** (`hero` / `closing` / `ceremony`), a mobile-first hero that leads with artwork, shared FAB gutter tokens, and layout tests that measure DOM geometry.

---

# Current User Experience

## Map

```
Parent Hub / Understand  (tile: amy-astro-hero.png)
  → /birth-sky  (BirthSkyApp)
    → welcome / setup / formation / reveal
    → dashboard (BirthSkyDashboardPage)
         → DashboardHero (greeting)
         → TodaysSkyCard
         → AmyAstroCosmicPortraitCard   ← screenshots
              → data: buildCosmicPortrait(chart + childName)
              → image: /illustrations/amy-astro/amy-astro-portrait.png
              → frame: AmyAstroCosmicPortrait (presentation=hero|closing)
              → CTA: Save Memory / Ask Amy / Continue
         → DiscoveryNudge, CosmicProgress, segment nav
              → Sky | Astronomy | Tradition | Reflect
```

The screenshots are the **Cosmic Portrait card** on the dashboard (default sky land), not the text-only Astronomy segment (`BirthSkyAstronomySegment`). That segment has no raster artwork.

---

# Image Asset Inventory

| Asset | File | Dims | Ratio | Format | Alpha | Role | Rendering |
|---|---|---|---|---|---|---|---|
| Portrait illustration | `public/illustrations/amy-astro/amy-astro-portrait.png` | 768×768 | 1.00 | PNG 8-bit RGBA | Yes | Module hero + closing | `<img>` `object-fit: contain` |
| Hub launch hero | `public/illustrations/amy-astro/amy-astro-hero.png` | 960×1280 | 0.75 | PNG RGBA | Yes | Parent Hub tile | Hub card (unchanged) |
| Hub icon | `public/illustrations/amy-astro/amy-astro-icon.png` | 1024×1024 | 1.00 | PNG RGB | No | Hub tile icon | Unchanged |
| Section header hero | `section-header-hero.png` | 957×1173 | 0.82 | PNG RGBA | Yes | Hub section | Unchanged |
| Section header icon | `section-header-icon.png` | 1024×1024 | 1.00 | PNG RGB | No | Hub section | Unchanged |
| SVG fallback | `public/amy-astro/child-cosmic-portrait.svg` | viewBox 400×400 | 1.00 | SVG | Yes | Load-error fallback | `<img>` onError |
| Animated emblem | `public/amy-astro/amy-astro-animated.svg` | — | — | SVG | Yes | Optional emblem | Unused by portrait |
| Chapter art | inline SVG in `chapter-illustration.tsx` | 320×180 | 16:9 | SVG | n/a | Insights chapters | inline SVG |
| Micro icons | `portrait-illustrations.tsx` | 64×64 | 1.00 | inline SVG | n/a | Beat / quality glyphs | inline SVG |

## Portrait PNG padding (not defective)

Content bbox `(77, 14, 690, 766)` on 768×768:

- Left/right transparent ~77–78px (~10% each) so ornaments (om, lotus, hamsa, moon, saturn, mandala) can breathe.
- Top 14px, bottom 2px — the cushion sits almost on the bottom edge.
- Opaque pixels ~30%. Padding is **intentional composition**, not a broken asset.
- Decision: **A** (intentional). No tighter crop exists. CSS must not cover-crop. No new raster required.

File size 609 KB at 768px is reasonable for a hero illustration displayed ≤ 22rem. Hero loads eager; closing uses the same URL (cache) with lazy.

---

# Image Rendering Root Cause

**SYMPTOM**  
Hero artwork felt cropped / crowded; closing artwork felt tiny with empty night sky around it.

**ROOT CAUSE**  
`AmyAstroCosmicPortrait` used one circular cutout recipe for every placement:

- `aspect-square max-w-[280px]` + `inset-[8%]` (art only 84% of the box)
- `object-contain object-bottom` inside `rounded-full`
- CSS orbit rings and sun/moon glyphs drawn **on top of** an illustration that already contains celestial ornaments
- Closing instance wrapped in `w-36` + `max-w-[140px]` (Tailwind conflict; parent 144px won) plus `h-40` ending glow

`object-bottom` is a no-op on a 1:1 image in a 1:1 box, but the **circular inset + competing ornaments + 144px closing box** are the visible bugs. The PNG itself is a complete square illustration.

**FIX**  
Role-based `.amy-astro-portrait-frame`:

- `object-fit: contain; object-position: center`
- No circular crop of the illustration
- No 8% inset shrink
- Sun/Moon encoded as chips **under** the art (hero/ceremony), not orbiting over it
- `hero`: `min(100%, 22rem)` (20rem at ≥1024)
- `closing`: `min(12rem, 56vw)` keepsake seal
- `ceremony`: `min(17.5rem, 72vw)`

**VERIFICATION**  
Playwright measures `naturalWidth/Height`, rendered size, `object-fit`, `object-position`, and hero vs closing width. See **Before / After Measurements**.

---

# Responsive Layout Findings

**SYMPTOM**  
On mobile, story-beat text (“Then they shine”) sat on the artwork. Vertical rhythm was uneven. Closing block had a huge empty glow.

**ROOT CAUSE**  
Hero grid was copy-first (`grid` then portrait). Last beat sat immediately above a 280px orbit whose glyphs used `inset-[-2%]` and `-translate-y-1/2`. Footer used `mt-10` + `h-40` glow.

**FIX**  
`.amy-astro-portrait-hero` is artwork-first on mobile; tablet+ is copy | art. Dividers use shared CSS margins. Ending glow is 5.5rem behind the seal, not 10rem of empty space.

**VERIFICATION**  
Playwright viewports 390×844, 412×915, 768×1024, 1024×1366, 1440×900. No horizontal overflow (`scrollWidth ≤ clientWidth + 1`).

---

# Typography & Content Findings

**SYMPTOM**  
Long reflective copy; hierarchy mixed artwork into the middle of beats.

**ROOT CAUSE**  
IA was already: opener → name → beats → (art) → qualities → reminders → insights → closing. Art was in the wrong slot on mobile.

**FIX**  
Preserve copy. Lead with the illustration on small screens so the module is immediately “Amy Astronomy for this child”. Beats follow as “what this says about Child X”. Closing remains the reflective seal + Save CTA. No body rewrite.

One label inconsistency in the screenshot string:

- Before: “In their birth chart: … These are birth-sky facts for reflection”
- After: “In their birth sky: …”

Voice elsewhere still uses “birth chart” as a technical term with “not a forecast / not today’s live sky” disclaimers. Those were left intact.

---

# FAB / Bottom Navigation Findings

**SYMPTOM**  
Orange Ask Amy FAB covered Save Memory. Bottom nav sat on the lower edge of the portrait card.

**ROOT CAUSE**  
Page-end padding (`app-scroll` 80px + module `2.75rem`) only helps the **end of the page**. Save Memory is a **mid-page** CTA. The FAB is a ~70px circle 8px above the 72px tab bar. Full-width CTAs extend into that corridor.

No shared gutter existed. `.bottom-nav-safe` is `0.25rem` and unused here.

**FIX**  
Shared tokens in `index.css`:

- `--amynest-tabbar-height`
- `--amynest-fab-size`
- `--amynest-fab-gutter`
- `--amynest-module-end-gap`
- `.amynest-fab-avoid` (padding-right on ≤1023px)

Applied to the portrait CTA row. Scroll-margin-bottom on the CTA row so in-view scrolling clears chrome. FAB position was **not** moved.

**VERIFICATION**  
Playwright scrolls Save into view and asserts its bounding box does not overlap the mock FAB or tab bar.

---

# Child Personalization Findings

**SYMPTOM**  
Risk of stale cinema / Save state if the dashboard reused the card instance.

**ROOT CAUSE**  
`memorySaved` initialized once from `continuity.portraitSaved`. Cinema timers keyed on `childName` but Save state was not.

**FIX**  
`key={profile.profileId}` on the dashboard card. Card effect resets Save + expanded sections when `childName` / `profileId` change. Portrait image status resets on `childName`. App already shows a loading screen while `fetchBirthSkyForChild` runs on child id change.

**VERIFICATION**  
Vitest rerender Child 1 → Child 3. Playwright clicks Child 1 → Child 2 and asserts the heading and closing line update.

---

# Accessibility Findings

**SYMPTOM**  
Orbiting decorative glyphs were extra noise; hero portrait was a nested `role="img"` inside a button.

**ROOT CAUSE**  
Frame always exposed `role="img"`. CSS orbits were in the accessibility tree as text glyphs.

**FIX**  
Decorative chips `aria-hidden`. Hero instance inside the control uses `nestedInControl` (no duplicate name). Closing seal keeps `aria-label="Cosmic portrait for {child}"`. Save / Ask Amy / Continue keep visible text + 48px min height. Back control already labeled.

**VERIFICATION**  
Vitest + static IM-7 accessibility suite still covers shell back labels.

---

# Performance Findings

**SYMPTOM**  
Potential double-download of the same portrait and 609 KB PNG on a small closing instance.

**ROOT CAUSE**  
Two `<img>` tags, same URL. Closing was not lazy. Failed loads showed a broken-image icon.

**FIX**  
Same URL (browser cache). Hero `loading="eager"` `fetchPriority="high"`. Closing `loading="lazy"` `fetchPriority="auto"`. `onError` swaps to the SVG fallback. Soft placeholder while loading. Source PNG not recompressed.

---

# Fixes Implemented

1. Reusable `.amy-astro-portrait-frame` with `hero` / `closing` / `ceremony` roles.
2. Illustration strategy: contain + center; no circular crop; no 8% inset.
3. Mobile hero leads with artwork; tablet+ keeps copy | art.
4. Closing is a deliberate smaller seal, not a 144px leftover.
5. Shared FAB gutter tokens; CTA corridor on mobile.
6. Child-switch remount + state reset.
7. Image loading placeholder + SVG fallback.
8. Screenshot copy “birth chart” → “birth sky” in the sky-facts line only.

---

# Files Changed

- `artifacts/kidschedule/src/features/birth-sky/components/cosmic-portrait.tsx`
- `artifacts/kidschedule/src/features/birth-sky/components/cosmic-portrait-card.tsx`
- `artifacts/kidschedule/src/features/birth-sky/components/cinematic-reveal-ceremony.tsx`
- `artifacts/kidschedule/src/features/birth-sky/components/birth-sky-module-shell.tsx`
- `artifacts/kidschedule/src/features/birth-sky/design/amy-astro.css`
- `artifacts/kidschedule/src/features/birth-sky/lib/branding.ts`
- `artifacts/kidschedule/src/features/birth-sky/lib/signature-insight.ts`
- `artifacts/kidschedule/src/features/birth-sky/pages/dashboard/dashboard-page.tsx`
- `artifacts/kidschedule/src/index.css`
- `artifacts/kidschedule/src/playwright/amy-astro-visual-fixture.tsx`
- `artifacts/kidschedule/playwright/specs/amy-astro-portrait-layout.spec.ts`
- `artifacts/kidschedule/playwright.config.amy-astro-portrait.ts`
- `artifacts/kidschedule/package.json`
- Tests: `cosmic-portrait.test.tsx`, `cosmic-portrait-card.test.tsx`, `signature-insight.test.ts`

**Not changed:** PNG/SVG artwork files, API, ephemeris, snapshot pipeline, Astronomy segment math, FAB position.

---

# Tests

- Vitest: portrait presentations, PNG error fallback, child-name update, sky-facts copy
- Playwright: `playwright.config.amy-astro-portrait.ts` (DOM geometry)
- Typecheck: birth-sky / kidschedule as run in this change

---

# Playwright Viewports

| Name | Size |
|---|---|
| mobile_390 | 390×844 |
| mobile_412 | 412×915 |
| tablet_768 | 768×1024 |
| tablet_1024 | 1024×1366 |
| desktop_1440 | 1440×900 |

---

# Before / After Measurements

Empirical Playwright DOM measurements (natural image 768×768, `object-fit: contain`, `object-position: 50% 50%`).

| Viewport | Hero rendered | Closing | Save box | FAB box | Overflow X | Save ∩ FAB | Save ∩ tab |
|---|---|---|---|---|---|---|---|
| 390×844 | 316×316 | 192×192 | 239×48 (right 276) | 70×70 (left 310) | no | no | no |
| 412×915 | 338×338 | 192×192 | 261×48 (right 298) | 70×70 (left 332) | no | no | no |
| 768×1024 | 208×208 (2-col) | 192×192 | 110×48 | 70×70 | no | no | no |
| 1024×1366 | 224×224 (2-col) | 192×192 | 137×48 | 70×70 | no | no | no |
| 1440×900 | 224×224 (2-col) | 192×192 | 137×48 | 70×70 | no | no | no |

| Surface @ 390×844 | Before | After (measured) |
|---|---|---|
| Hero frame | 280px max, art 84% ≈ 235px, circular inset | 316×316, fills art box 100% |
| Hero object-fit | contain / **bottom** | contain / **center** (`50% 50%`) |
| Hero crop | circular inset + orbit overlap + beat text on art | square contain, ornaments intact, beats below |
| Closing frame | 144px (`w-36`) | 192×192 |
| Ending glow | 10rem empty (`h-40`) | 5.5rem behind seal |
| Save vs FAB | overlap (full-width CTA) | Save right 276, FAB left 310 |

Vitest: 6/6 passed (`cosmic-portrait`, `cosmic-portrait-card`, `signature-insight`).  
Playwright: 7/7 passed (`amy-astro-portrait-layout.spec.ts`).  
Kidschedule `tsc --noEmit`: passed.

---

# Remaining Issues

- Parent Hub still uses `amy-astro-hero.png` (3:4 cutout). Out of this module’s interior scope.
- Insights chapter SVGs are a different art system; not the screenshot bug.
- Live child-switch against a signed-in API session is not exercised here (fixture + dashboard `key` cover the UI contract). Direct `/birth-sky/app/astronomy` remains a text segment without this illustration.
- 609 KB PNG could later gain a 2x/1x srcset; quality was not reduced in this pass.
- When the closing CTA cluster is centered in the mobile viewport, the tiny disclaimer line under the buttons can still pass through the FAB corridor. Save / Ask Amy / Continue do not.

---

## Issue register

### 1. Hero illustration treated as a circular cutout
SYMPTOM: Artwork looked cropped and ornaments collided with CSS orbits and nearby text.  
ROOT CAUSE: `inset-[8%]` + `rounded-full` + overlay glyphs on a complete square PNG.  
FIX: Role-based contain/center frame; chips below the art.  
VERIFICATION: Playwright object-fit/position + rendered/art width ≥ 0.92.

### 2. Closing illustration too small
SYMPTOM: Same art looked lost in empty space.  
ROOT CAUSE: `w-36` / `max-w-[140px]` + `h-40` glow.  
FIX: Closing role `min(12rem, 56vw)`; quieter glow.  
VERIFICATION: Closing width > 148px and < hero width.

### 3. FAB covering Save
SYMPTOM: Orange FAB overlapped Save Memory.  
ROOT CAUSE: Mid-page full-width CTA vs fixed FAB corridor.  
FIX: Shared `--amynest-fab-gutter` + `.amynest-fab-avoid`.  
VERIFICATION: Bounding boxes do not overlap.

### 4. Child copy could go stale
SYMPTOM: Save / expanded state could survive a child change.  
ROOT CAUSE: State initialized once; no card key.  
FIX: `key={profile.profileId}` + reset effect.  
VERIFICATION: Vitest + Playwright child switch.
