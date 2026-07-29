# CREATIVE_COMPOSITION_AUDIT

**Date:** 2026-07-29  
**Scope:** Creative Composition Layer only  
**Not changed:** architecture · validators · providers  

---

## Problem diagnosed

The prior Short passed engineering evidence gates but failed as a marketing film because the composition layer treated assets as slides:

| Failure | What the old runner did |
|---|---|
| Raw character PNGs | Full-screen Ken Burns on Amy Girl / Amy AI bible plates |
| Amy AI as decoration | Bible sheet floated as a static plate, not a presenter performance |
| Screenshot-as-scene | UI / end assets risked reading as fullscreen graphics |
| Weak CTA | Small badges, icon-centered hierarchy, no Amy invite performance |
| Slideshow feel | Image montage + flash cuts ≈ Canva, not a premium ad |

---

## Creative Composition Layer (new)

Module: `content-engine/creative-composition/`

Wired into: `operations/second-production-run.ts` (replaces PNG slideshow assembly)

### Rules enforced in code

1. **No raw PNG scenes** — bible sheets are never the primary fullscreen plate  
2. **Characters live in environments** — Imagen generates kitchen / living room / bedroom / study / magic world plates with locked Amy identity  
3. **Amy AI is a presenter** — dedicated welcome / guide / invite-download performances  
4. **Screenshots are secondary** — UI only inside a phone mockup for ≤2.6s  
5. **Premium CTA** — logo → headline → subhead → large Play/App Store badges (~30% CTA band) → website → Amy AI waving  
6. **Cinematic hook first** — Veo live motion cold-open (worksheets / struggle), never a PNG open  
7. **Depth + camera** — every shot has continuous push/pan/zoom crop motion  
8. **Anti-slideshow** — live Veo + environment-integrated characters + device framing  

---

## Shot-by-shot upgrade

| Shot | Role | Before | After | Why cinematic |
|---|---|---|---|---|
| 1 | Hook (2.4s) | Amy Girl bible Ken Burns | **Veo live** problem/hook clip + caption | Real motion cold-open; unfinished-learning emotion; camera push |
| 2 | Conflict (3.6s) | Static bible / weak B-roll | **Veo live** emotion/problem clip | Struggle beat with continuous action before product |
| 3 | Amy presenter (4.8s) | Floating Amy AI PNG | **Imagen living-room plate** — Amy AI welcoming inside designed space + pan | Amy performs as guide, midground in depth, matching light |
| 4 | Feature device (2.6s) | Risk of fullscreen UI | **Phone mockup** over magical environment | UI is a prop in-world; ≤3s; never primary world |
| 5 | Hope (3.8s) | Bible plate montage | **Imagen child-bedroom plate** — Amy Girl in environment + slow zoom | Foreground character, midground room, background depth |
| 6 | CTA (3.8s) | Small badges + icon pad | **Premium CTA stage**: official AmyNest app icon logo, “Download AmyNest AI”, “Start Your Child's Learning Journey”, large Play/App Store badges (~30% CTA band), www.amynest.in, Amy AI waving (soft-blended into purple stage) | Clear hierarchy; badges dominate CTA band; invite performance |

---

## Why this feels like a premium animated advertisement

1. **Story grammar of ads** — situation → friction → guide → product glimpse → hope → invite  
2. **World-building** — every character beat is staged in a designed room/world, not a void  
3. **Performance** — Amy AI welcomes, points, and invites; she is not a watermark  
4. **Device literacy** — the app appears the way parents recognize apps (in a phone), briefly  
5. **CTA craft** — store badges are large and readable; headline outranks decoration  
6. **Motion discipline** — continuous camera drift / live Veo prevents PowerPoint stillness  

---

## Re-render gate

Re-render proceeds only through Creative Composition Layer.  
There is **no slideshow fallback**. If composition fails, production STOPs.

Validators remain fail-closed and unmodified. Providers unchanged (Imagen / Veo / TTS / Lyria).

---

## Post-render creative fixes (same layer)

| Issue found on first cinematic upload | Fix in Creative Composition Layer |
|---|---|
| Store badges rendered as white squares (qlmanage square-pad) | Autocrop badge rasters to content bounds before CTA paste |
| Device shot used a prior CTA marketing plate as “UI” | `uiScreenshotPath` cleared — synthesize Study Zone lesson card inside phone mockup only |

Re-render required after these composition fixes.
