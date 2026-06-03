# Discovery Worlds — Launch Validation Checklist (Manual)

Use with automated report: `pnpm run validate:discovery-worlds`

Record results in the **Device matrix** section. Pass criteria are launch-blocking unless marked optional.

---

## Phase 1 — Real device testing

### Device matrix

| Test | iPhone | iPad | Android phone | Android tablet | Desktop |
|------|:------:|:----:|:-------------:|:--------------:|:-------:|
| Cold open `/discovery-worlds` | | | | | |
| Open `/worlds/vehicles` | | | | | |
| Open Animal World | | | | | |
| Discovery slideshow | | | | | |
| Quiz round (3 taps) | | | | | |
| Hear & Find | | | | | |
| Parent insights tab | | | | | |
| Print report (parent) | | | | | |

### Measurements (record ms or Pass/Fail)

| Metric | Target | Notes |
|--------|--------|-------|
| First load (hub, cold) | < 3s perceived | Spinner → content |
| First load (world live) | < 4s perceived | Mode bar + grid |
| Sound latency (tap → hear) | < 400ms on Wi‑Fi | After first unlock gesture |
| Image latency (card visible) | < 1s | No long emoji-only flash |
| Discovery mode transitions | Smooth, no stuck phase | Speed 1x and 1.5x |
| Quiz tap response | Immediate visual feedback | Correct/incorrect |
| Offline: airplane mode reopen | Cached sounds play | Warm world once online first |
| Offline: discovery mode | Slides advance or clear empty | |

---

## Phase 7 — Offline resilience

Prerequisites: open a world online for 30s, play 3 sounds, wait for background warm.

| Scenario | Pass |
|----------|------|
| Cached sounds play offline | |
| Cached images show (card/thumbnail) | |
| App reopen offline → same world loads | |
| Discovery mode works with cached items | |
| Missing cache → warm empty/error, no crash | |

---

## Phase 8 — Error resilience

| Scenario | Expected | Pass |
|----------|----------|------|
| Block hero.webp (DevTools) | Gradient + emoji fallback | |
| Block one .mp3 | Alert or silent fail + retry works | |
| Throttle network (Slow 3G) | Skeletons, eventual load | |
| Airplane during play | Friendly message, no hang | |
| Clear site data → progress empty state | Hub prompts select child | |

---

## Phase 4 — Parent first impression (< 10 seconds)

On `/discovery-worlds` with active child, parent should immediately see:

- [ ] Overall progress %
- [ ] Stickers / stars count
- [ ] Daily adventure teaser
- [ ] Per-world progress cards
- [ ] Clear “what to do next” copy

Friction log:

1. 
2. 
3. 

---

## Phase 5 — Toddler usability

- [ ] Main taps ≥ 44pt (mode pills, cards, quiz options)
- [ ] Toddler mode: no reading required
- [ ] Back navigation obvious (one tap from detail)
- [ ] No dead-ends without empty-state guidance
- [ ] Contrast readable in bright room (outdoor test)

Confusion log:

1. 
2. 

---

## Phase 6 — Lighthouse (production URL)

Run Chrome Lighthouse (mobile + desktop) on:

- `https://www.amynest.in/discovery-worlds`
- `https://www.amynest.in/worlds/vehicles`

| URL | Performance | Accessibility | Best Practices |
|-----|------------:|--------------:|---------------:|
| Hub | | | |
| Vehicles | | | |

Targets: **> 95** each (SEO ignored).

Note large images, CLS, duplicate API calls, slow audio in report.

---

## Sign-off

| Role | Name | Date | Ship? |
|------|------|------|-------|
| Engineering | | | |
| Product | | | |
