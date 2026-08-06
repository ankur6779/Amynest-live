# Production Translation — Landing

**Sprint:** Production Translation · Screen 1 — Landing  
**Mode:** Visual translation only — no features · no routes · no architecture · no redesign exploration  
**Authority:** Design Constitution (frozen) · P0.7 Reality Check (Landing P0)  
**Scope:** V2 Front Door path (`shouldEnterFrontDoor()` → Nest Presence). Legacy marketing path unchanged when Front Door is off.

---

## Current problems (before)

| Problem | Lived feel |
|---------|------------|
| Purple fog + rainbow wordmark + shimmer H1 | AI startup landing |
| Neon avatar ring + Meet AMY glass card | Product catalogue / chatbot pitch |
| Dual peer CTAs + store badges + QR in first fold | SaaS install wall |
| Quicksand black display, not Constitution type | Alignment drift from Nest |
| Purple glass cards / hover purple lift | Generic AI website |
| Nav Bloom “Get the app” | Corporate chrome |
| Opacity Law of Three only | Theater, not calm place |

Target: a tired parent feels **“I’ve arrived somewhere calm.”**

---

## Visual translation decisions

| Layer | Decision |
|-------|----------|
| **Atmosphere** | Nest field via `v2LitProps` + `V2_ATMOSPHERE` + session lighting. Purple blobs removed. |
| **First viewport** | Single column · Amy presence (orb emit, no neon) · Constitution hero type · one Bloom **Try on Web** · one trust caption. |
| **Law of Three** | Hero = promise + Amy · Primary = Try on Web · Support = trust line. Badges / age line / Get-app / stores / QR / Meet AMY copy **recede** below primary breath. |
| **Typography** | `V2_TYPE` hero / body / caption / brandMark / cta on Nest path. Rainbow / Quicksand black display retired on Nest. |
| **Materials** | Soft Plate for cards / age / mid panels. Atmosphere default. No purple glass hover theater. |
| **CTA** | Bloom (`bg-primary` + `v2-bloom-light`). Secondary Soft Plate whisper. Nav Get-app demoted to caption whisper. |
| **Motion** | Fade rise → Constitution 8px · page duration · slower float. Shimmer / purple glow ring off Nest path. |
| **Eyebrows** | Caption whisper + icon — not uppercase glass pills. |
| **Kept** | Logo · all CTA destinations · all sections · all content · StoreBadgeRow / DesktopQr / AmyLandingAvatar / InfantParentingSection. |

---

## Before vs After hierarchy

### First viewport (V2 path)

| Role | Before | After |
|------|--------|-------|
| Emotional hero | H1 rainbow + badges + Meet AMY + neon Amy | Amy presence + calm H1 (`V2_TYPE.hero`) |
| Primary action | Try on Web **and** Get-app peers (purple CTA) | **Try on Web** Nest Bloom only |
| Supporting trust | Fragmented (age line · store strip · QR · Meet AMY) | One line: Free to start · Child-safe · Privacy-first |
| Recedes | Dimmed only | Badges · age line · Get-app · stores · QR · Meet AMY copy — below primary, whisper/recede weight |
| Nav | Rainbow mark + Bloom Get-app | Brand whisper + caption Sign-in / Get-app |

### Below fold

| Element | Before | After |
|---------|--------|-------|
| Age band | Purple glass | Soft Plate · selected Soft Plate denser |
| Marquee | Purple wash | Whisper Soft chips |
| Spotlights / modes / stages / tech / stories | Purple glass + gradient icons | Soft Plate · muted icon wells · Constitution type |
| Mid / final CTAs | Purple amy-cta | Nest Bloom · secondary Soft Plate |
| Download band | Purple gradient panel | Soft Plate · no rainbow “everywhere” |
| Footer | Rainbow wordmark | Brand whisper |

---

## Regression summary

| Check | Result |
|-------|--------|
| Routes / hrefs | Unchanged (`/front-door`, `/get-app`, `/sign-in`, stores, footer links) |
| Analytics locations | Unchanged (`hero_cta`, `mid_cta`, `footer_cta`, age/store events) |
| Sections present | All retained including InfantParentingSection |
| Non-V2 marketing path | Still dark purple landing (Front Door off) |
| Typecheck | `tsc --noEmit` clean for kidschedule |

---

## Remaining debt

1. **InfantParentingSection** — still own marketing chrome (not Nest-owned).  
2. **Tall viewports** — receded hero cluster (badges/stores) can still enter the first screen; further fold push may need spacing-only pass later.  
3. **Age section** — can still compete on short devices after scroll; not removed (content kept).  
4. **Signup** — still purple neon (next translation screen — not this sprint).  
5. **Brand path** — Landing Nest → Signup neon discontinuity remains until Signup translates.  
6. **Legacy path** — non-Front-Door Landing still AI marketing (intentional dual path).  
7. **Emoji age chips** — retained (content); still slightly product-y.  
8. **Mid-page Bloom density** — multiple Bloom CTAs down-page (functional keep); first fold is singular.

---

## Estimated score after translation

| Metric | P0.7 TRUE (Landing-weighted) | After Landing translation (est.) |
|--------|-----------------------------:|---------------------------------:|
| Landing local calm | ~40 | **78** |
| Landing Apple-bar | ~35 | **72** |
| Overall product (still blocked by Signup / Today / etc.) | **66** | **69** |
| Brand continuity guest path | ~45 | **62** (Signup still breaks) |

Landing is no longer the automatic Apple stop — **Signup** and **Today** still are.

---

## Founder confidence

| Question | Answer |
|----------|--------|
| Product or calm place? | **Calm place** on first breath (V2 path). Below fold still a long marketing journey — quieter, not deleted. |
| Does the hero breathe? | **Yes** — orb emit · Constitution rise · single Bloom. |
| Unnecessary UI in fold? | **Mostly gone** — peers recede; not deleted. |
| Can 30% disappear? | Visually yes in fold; content retained below. |
| CTA inevitable? | **Try on Web** is the only Bloom in the first breath. |
| Ship Landing alone? | Ready for internal Nest review of **entry**; not full Nest Presence ship until Signup matches. |

**Founder confidence (Landing entry):** **7.5 / 10**  
**Founder confidence (full guest path):** **5 / 10** (Signup untouched)

---

## STOP

Landing translation complete.  
**Do not continue to Signup.**
