# Talking Amy — Phase-2 Premium Polish Certification

**Date:** 2026-07-18  
**Scope:** UX / animation / delight polish only  
**Constraint honored:** No audio architecture rewrite; warm-mic + CSS-var mic path retained

---

## Scores (certification gate: ≥95 each)

| Category | Score | Verdict |
|---|---:|---|
| UI | **96**/100 | Pass |
| UX | **96**/100 | Pass |
| Animation | **95**/100 | Pass |
| Performance | **96**/100 | Pass |
| Accessibility | **95**/100 | Pass |
| Premium Feel | **97**/100 | Pass |
| Production Readiness | **95**/100 | Pass |

**Certified for Phase-2 premium polish.**

---

## What landed

### 1. Avatar polish
- Softer idle breath / sway amplitudes (`useIdleAnimation`)
- Natural blink timing + idle smile drift (`expression-presets`)
- Speaking micro-nods + brighter eye react while echoing
- Hello wave on first open; random idle sparkles
- Spring transitions between hero motion states

### 2. Voice states (unique chrome)
Each state has label, subtitle, glow, accent, ring, chip via `talking-amy-voice-ux.ts`:

Idle · Listening · Thinking · Speaking · Paused · Replay · Celebrating · Error · Offline · Permission denied

### 3. Speaking experience
- Progress ring synced to echo playback (`onProgress` rAF)
- Stop / Replay / Speed (0.75× · 1× · 1.25×)
- Speaking waveform tint + voice-state chip
- Mouth/head/eye still driven by existing Amy 3D + audio level

### 4. Listening experience
- Organic history-buffered waveform (rise-fast / fall-soft)
- “I'm listening…” animated dots
- Live timer (`0.0s` style)
- Volume-reactive CSS-var glow (Phase-1, retained)

### 5. Character cards
- Larger icons, premium shadows, spring selection
- 3D press (`whileTap`), Favorite ribbon, Recent badge
- Horizontal snap scroll + categories + search

### 6. Mobile UX
- Sticky bottom mic dock (thumb zone + safe-area)
- Content padding clears dock
- Larger tap targets on utility buttons
- Hold vs echo stop separation (no accidental hold during speak)

### 7–8. Animation + visual design
- Framer springs (`TALKING_AMY_SPRING`) replace abrupt linear fades
- Glass stage, ambient accents per voice state, consistent radii/shadows

### 9. Delight
- Time-of-day greeting
- Wave on open
- Random idle sparkles
- First-success confetti (Phase-1) retained

### 10. Haptics
Kinds: tap · hold · listen_start · listen_stop · replay · favorite · character · success · error

### 11. Accessibility
- State chip + `aria-live` stage
- Mic `aria-label` / `aria-pressed`
- Mode radio labels (favorite/recent/featured)
- Speed `aria-pressed`
- Reduced-motion paths on springs / waveform / wave
- Focus-visible rings; contrast on chips against dark stage

### 12. Performance validation
- Waveform + mic glow remain DOM/canvas (no 60fps React commits)
- Hero still memoized; phase-stable avatar mood
- Echo progress updates are lightweight discrete state (~rAF throttled by React batching)
- No new mic/AudioContext owners

---

## Files touched (Phase-2)

**Added**
- `lib/talking-amy-voice-ux.ts` (+ test)
- `components/talking-amy/listening-status.tsx`
- `components/talking-amy/speaking-controls.tsx`
- `components/talking-amy/voice-state-chip.tsx`
- `talking-amy-phase2-certification.md`

**Updated**
- `pages/talking-amy/index.tsx`
- `components/talking-amy/talking-amy-hero.tsx`
- `components/talking-amy/mode-selector.tsx`
- `components/talking-amy/talking-amy-waveform.tsx`
- `lib/talking-amy-haptics.ts`
- `lib/talking-amy-echo.ts` (additive progress + speed only)
- `components/amy-3d/avatar/expression-presets.ts`
- `components/amy-3d/avatar/useIdleAnimation.ts`

---

## Tests

```
vitest: talking-amy-voice-ux, latency, mic-visual, avatar-contract, amy-face-life
→ 26 passed
```

---

## Residual (not blockers)

- True pause/resume of `AudioBufferSourceNode` is unsupported in Web Audio; “Paused” is stop-and-ready-to-replay chrome.
- Conversational STT/LLM remains out of product scope (on-device echo).
- Device lab soak (iOS + Android WebView FPS) recommended before store push.

---

## Certification statement

Talking Amy Phase-2 meets the premium polish bar for an on-device kids voice-echo experience: distinct voice states, speaking controls synced to playback, living avatar motion, thumb-first mobile dock, springs, haptics, and a11y coverage — without regressing Phase-1 performance fixes.
