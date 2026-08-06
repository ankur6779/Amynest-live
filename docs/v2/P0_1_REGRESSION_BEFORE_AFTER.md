# P0.1 Regression — Before / After (token contract)

**Sprint:** P0.1 Constitution Tokens  
**Mode:** Class-level regression capture (screens consume shared tokens).  
**Note:** Live PNG screenshots require dogfood app with V2 flags; token contract below is the authoritative before→after for this sprint.

---

## Shared shell (Today · Ask Amy · For Child · Premium · Coach · Mission)

| | Before (magic) | After (token) |
|--|----------------|---------------|
| Edge | `px-4` (16) / Front Door `px-5` (20) | `V2_SPACE.edgeX` → `px-6` (24) |
| Vertical | `py-8` / mixed `py-10` | `V2_SPACE.shellY` → `py-8` (32) |
| Chapter | `gap-8` / `gap-10` | `V2_SPACE.chapter` → `gap-12` (48) |
| Clearance | `pb-28` (112) | `V2_SCROLL_CLEARANCE` → `calc(4rem + safe-area)` |
| Column | duplicated per file | `V2_SHELL` |

## CTA

| | Before | After |
|--|--------|-------|
| Height | `h-12` (48) | `h-[52px]` |
| Radius | `rounded-xl` | `rounded-[26px]` |
| Pad | implicit | `px-6` |
| Token | ad-hoc `V2_CTA` string | `V2_BLOOM_CTA` ← Constitution |

## Surfaces

| | Before | After |
|--|--------|-------|
| Card | `CARD_BASE` + variants | `V2_RADIUS.plate` + `V2_BORDER` + `V2_SURFACE_FILL` |
| Soft | `shadow-sm` on CARD_BASE | `V2_SOFT_PLATE` + `V2_ELEVATION.plate` |
| Sheet | `rounded-2xl … backdrop-blur-xl` | `V2_SHEET_GLASS` |
| Panel | premium gradient variant | `V2_ELEVATED_PLATE` |

## Motion / press

| | Before | After |
|--|--------|-------|
| Tap | 80ms | 120ms (`micro`) |
| Card | 200ms | 220ms (`ui`) |
| Sheet | 260ms | 320ms (`page`) |
| Page | 320ms | 320ms |
| Ease | EASE_WARM / EASE_SOFT mix | `V2_EASE` only `[0.22,1,0.36,1]` |
| Press | 0.98 / 0.985 / 0.99 | **0.97** (`V2_PRESS_SCALE`) |
| Disabled | opacity-45 | opacity-40 |

## Navigation

| | Before | After |
|--|--------|-------|
| Height | `h-[64px]` | `V2_NAV.height` → `h-14` (56) |
| Icon | `h-5 w-5` (20) | `V2_ICON.nav` → 22px |
| Icon→label | `gap-1` (4) | `gap-2` (8) |
| Blur | `backdrop-blur-xl` literal | `V2_NAV.blur` |
| Underline | still present | **debt → P0.5** |
| Shelf shadow | still present | **debt → P0.5** |

## Typography tokens (available; selective apply)

| Role | Token | Value |
|------|-------|-------|
| Hero | `V2_TYPE.hero` | 36px |
| Body | `V2_TYPE.body` | 17px |
| Caption | `V2_TYPE.caption` | 13px |
| CTA | `V2_TYPE.cta` | 16px |
| Brand | `V2_TYPE.brandMark` | caption quiet (Front Door wordmark) |

## Surfaces touched

| Surface | Shell tokenized | Notes |
|---------|:---------------:|-------|
| Today | ✓ | `V2_SHELL` |
| Ask Amy | ✓ | `V2_SHELL` |
| For Child | ✓ | `V2_SHELL` + plate pad |
| Premium | ✓ | `V2_SHELL` |
| Account gate | ✓ | `V2_SHELL` |
| Coach discovery | ✓ | `V2_SHELL` |
| Mission Play | ✓ | `V2_SHELL` |
| Mission Success | ✓ | `V2_SHELL` + orb token |
| Front Door | ✓ | `V2_SHELL_RITUAL` + brand/orb |
| Guest sheet | ✓ | `V2_SPACE.sheetPad` |
| Nav | ✓ | height/icon/blur tokens |
| Calm prepare | ✓ | space ladder |
| Coach prepare | ✓ | space ladder |

## Automated regression

```
Test Files  13 passed (13)
Tests       56 passed (56)
```

Includes `constitution.test.ts`, craft interaction/finish, calm-loading, today, ask-amy, for-child, nav, guest sheet, coach, premium.
