# P0.3 Before / After — Whisper Navigation

**Sprint:** P0.3 Navigation only  
**Authority:** Design Constitution §4  
**Not changed:** hierarchy · typography · spacing · lighting · motion · features · materials outside nav chrome

---

## Violation → canonical

| Before | After | Role |
|--------|-------|------|
| Underline `*-indicator` active bar | Soft fill `bg-foreground/[0.06]` | Tab active |
| Tab bar shelf shadow / `border-t` | `border-0` · `shadow-none` · Sheet Glass | Bottom bar |
| Labels Quick help · For Child | **Help** · **Child** | Caption whisper |
| Mixed back: text vs icon, gap invent | `V2_NAV_BACK` + `V2_NAV_ICON` (22) · icon-only | Top back |
| Sheet “Not right now” ad-hoc ghost | `V2_NAV_DISMISS` | Sheet dismiss |
| Coach / Premium / Mission tertiary ghost | `V2_NAV_DISMISS` | Modal / gate close |
| Front Door progress `h-1.5` + `bg-primary` | `V2_NAV_PROGRESS_*` light mist | Progress |
| Front Door skip `V2_PRESS_GHOST` only | `V2_NAV_DISMISS` | Soft skip |
| Safe-area inconsistent | `V2_NAV.safeBottom` on bar | Bottom strip |
| Height invent / 64px era | Content **56** (`h-14`) + safe-area | Bottom strip |
| Blur invent per screen | `backdrop-blur-[24px]` via `V2_NAV.blur` | Sheet Glass |

---

## Instrument map (one language)

| Instrument | Token / class | Visual |
|------------|---------------|--------|
| Bottom bar | `V2_NAV_BAR` | Sheet Glass · blur 24 · no shelf |
| Tab item | `v2NavTabClass(active)` | Soft fill / mist |
| Icon | `V2_NAV_ICON` | 22 · one stroke |
| Label | `V2_TYPE.caption` | Caption only |
| Back | `V2_NAV_BACK` | Ghost tertiary · icon |
| Dismiss / skip / not now | `V2_NAV_DISMISS` | Ghost · muted |
| Progress | `V2_NAV_PROGRESS_TRACK` / `FILL` | Light, not Bloom |

---

## Screen chrome (visual)

| Surface | Bottom nav | Top back | Dismiss / exit | Progress |
|---------|------------|----------|----------------|----------|
| Today / Ask Amy / For Child (shell) | Whisper strip | — | — | — |
| Ask Amy | Strip (when visible) | Icon-only back | Back to suggestions = dismiss | — |
| Mission Play | Hidden / ritual | Icon-only back | — | — |
| Mission Success | — | — | Tertiary Ask Amy = dismiss; Back to today = journey CTA | — |
| Guest sheet | — | — | Not right now = dismiss | — |
| Coach discovery | — | — | Not now / Back today = dismiss | Prepare steps (content, not chrome) |
| Account gate | — | — | Back today = dismiss | — |
| Front Door | Hidden (ritual) | — | Skip for now = dismiss | Light progress bar |

---

## Out of scope (audited, not modified)

| Item | Why |
|------|-----|
| Ask Amy page copy “Quick help …” | Content / hierarchy — not nav chrome |
| Today Premium ghost CTA | Feature entry, not navigation dismiss |
| Mission Success primary “Back to today” | Journey CTA weight — not furniture |
| For Child / Today `border-t` separators | Hierarchy / materials (later P0) |
| Landing / Signup | Not V2 shell-owned |

---

## Founder lens

| Before feel | After feel |
|-------------|------------|
| Navigation announces itself (underline, shelf, long labels, Bloom progress) | Navigation is quiet furniture |
| Active = color / underline | Active = light soft fill |
| Back invented per screen | One back whisper |
| Dismiss buttons inconsistent | One dismiss breath |

Parents should notice the journey — not the navigation.
