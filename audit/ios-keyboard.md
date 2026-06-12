# iOS Keyboard Audit — AmyNest Chat Surfaces

**Audit date:** 2026-06-12  
**Target:** Capacitor iOS (`artifacts/amynest-capacitor/`) + PWA Safari iOS  
**Method:** Static code review + unit tests + Playwright mobile emulation + prior live screenshots  
**Real device IME:** **NOT CERTIFIED** — `scripts/chat-platform-device-certification.json` has zero iOS device entries and no video recordings.

---

## Architecture Summary

| Layer | File | Finding |
|-------|------|---------|
| Capacitor config | `artifacts/amynest-capacitor/capacitor.config.json` L63–66 | `Keyboard.resize: "body"`, `resizeOnFullScreen: true` |
| iOS shell | `ios.contentInset: "automatic"` L30 | WKWebView safe-area automatic |
| Web viewport meta | `artifacts/kidschedule/index.html` L5 | `viewport-fit=cover` enables `env(safe-area-inset-*)` |
| Chat layout hook | `hooks/use-keyboard-chat-layout.ts` L362–365 | iOS sets `KeyboardResize.Body` (not Native) |
| Viewport math | `lib/chat-platform/viewport.ts` L279–297 | Capacitor body-resize: size fixed overlay to `visualViewport.height` |
| Composer safe-area | `components/chat-platform.tsx` L330 | `pb-[calc(1rem+var(--sab,env(safe-area-inset-bottom)))]` |
| CSS ancestor relax | `index.css` L1705–1709 | `html/body/#root:has(.chat-thread-page--keyboard-open) { min-height: 0 }` |

**Design intent (correct for iOS):** With `resize: "body"`, `window.innerHeight` stays full-screen while `visualViewport.height` shrinks under the keyboard. ChatPlatform pins a `position: fixed` shell to the visual viewport (`use-keyboard-chat-layout.ts` L507–520), keeping composer above keyboard without subtracting inset twice.

---

## Checklist Results

### A. Keyboard Open (ChatPlatform routes: `/assistant`, `/onboarding`, `/amy-ai-tutor`, `/learn-with-amy`)

| Check | Status | Evidence |
|-------|--------|----------|
| Keyboard appears | **UNVERIFIED (device)** | No uncut iOS device video; automated run blocked at auth gate |
| Input remains visible | **CODE PASS / DEVICE PENDING** | Unit test `ensureChatPromptVisible` recovers scrolled-out prompt (`chat-platform-visibility.test.ts` L114–154) |
| Send button visible | **CODE PASS / DEVICE PENDING** | Composer send is sibling of textarea in `persistent-composer.tsx` L63–75; fixed overlay pins footer |
| Typing indicator visible | **N/A** | No separate typing indicator component; loading state uses `Loader2` in send button |

### B. Keyboard Close

| Check | Status | Evidence |
|-------|--------|----------|
| Layout restores | **CODE PASS** | `resetKeyboardLayout()` clears CSS vars, resets viewport (`use-keyboard-chat-layout.ts` L252–274) |
| No empty gap | **UNVERIFIED (device)** | 320ms delayed reset (`KEYBOARD_RESET_DELAY_MS`) may leave transient gap — needs device video |
| No clipped content | **UNVERIFIED (device)** | Self-healing scroll at 0/rAF/50/150ms (`visibility.ts`) — unit tested, not device verified |

### C. Orientation

| Check | Status | Evidence |
|-------|--------|----------|
| Portrait | **UNVERIFIED** | `orientationchange` listener triggers deferred sync (`use-keyboard-chat-layout.ts` L314–318) |
| Landscape | **UNVERIFIED** | Same listener; no device recording |

### D. Safe Areas

| Check | Status | Evidence |
|-------|--------|----------|
| iPhone notch | **PARTIAL** | Header is inside ChatPlatform flex column; composer uses `--sab` fallback to `env(safe-area-inset-bottom)` |
| Dynamic Island | **UNVERIFIED** | No iPhone 14/15 Pro device cert |
| Home indicator clearance | **CODE PASS** | Composer bottom padding includes safe-area (`chat-platform.tsx` L330) |

---

## iOS-Specific Issues Detected

### CRITICAL — No real-device keyboard certification

- **Component:** All ChatPlatform surfaces  
- **Route:** `/assistant`, `/onboarding`, `/amy-ai-tutor`, `/learn-with-amy`  
- **Repro:** Run `pnpm run check:chat-platform-certification` — fails (all devices pending)  
- **Evidence:** `scripts/chat-platform-device-certification.json` — no iOS Samsung/Gboard matrix, no `videoUrl`  
- **Impact:** Cannot claim PASS on emoji keyboard, predictive bar, dictation, or hardware keyboard attached

### HIGH — Surfaces outside ChatPlatform use `100dvh` without keyboard handling

- **Component:** `conversation-coach.tsx`  
- **Route:** `/speech-coach/talk`  
- **Code:** L748, L751 — `min-h-dvh overflow-hidden` custom layout  
- **Evidence:** `audit/screenshots/final-live-cert/conversation_coach.png` — mic button near bottom; keyboard-open behavior untested  
- **Impact:** If user triggers text field (e.g. child selector rename) or system keyboard during mic permission dialog, layout may not resize

### HIGH — Amy Coach search inputs bypass ChatPlatform

- **Component:** `ai-coach.tsx`  
- **Route:** `/amy-coach`  
- **Code:** L1887, L1977, L2200 — plain `<input type="text">` with no keyboard hook  
- **Evidence:** `audit/screenshots/final-live-cert/parent-amy-coach.png` — search bar visible mid-page  
- **Impact:** iOS keyboard likely covers search results or CTA buttons below fold

### MEDIUM — Debug overlay still ships in production bundle

- **Component:** `chat-platform.tsx` L7–210  
- **Trigger:** `?chatDebug=1` or `localStorage amynest:chat-debug`  
- **Impact:** Does not affect users but indicates keyboard diagnostics not yet removed pre-release

### MEDIUM — Capacitor iOS vs PWA Safari divergence untested

- **Issue:** Same web bundle; iOS Capacitor uses `@capacitor/keyboard` listeners; PWA Safari does not  
- **Evidence:** `keyboardDidShow/Hide` only registered when `isCapacitorNative()` (`use-keyboard-chat-layout.ts` L358–377)  
- **Impact:** PWA may rely solely on `visualViewport` events — usually sufficient on iOS 15+ but unverified on real devices

### LOW — `100vh`/`100dvh` avoided in chat but used elsewhere

- Chat shells use measured px + `--vv-height` (good)  
- Auth shell still uses `100dvh` fallback (`index.css` L1403–1406) — separate from chat

---

## Capacitor Keyboard Plugin Verification

| Item | Status | Location |
|------|--------|----------|
| Plugin registered | PASS | `capacitor.config.json` L96 `KeyboardPlugin` |
| Resize mode Body on iOS | PASS | `use-keyboard-chat-layout.ts` L362–365 |
| `keyboardDidShow` listener | PASS | L366–368 |
| `keyboardDidHide` listener | PASS | L369–372 |
| Listener cleanup on unmount | PASS | L394–395 |
| Duplicate listener risk | PASS | `cancelled` guard + handle.remove() |
| Memory leak (CSS vars) | PASS | `clearChatViewportCssVars()` on cleanup L396 |

---

## Emoji / Predictive / Dictation / Hardware Keyboard

| Keyboard type | Status | Notes |
|---------------|--------|-------|
| Emoji keyboard | **NOT TESTED** | Requires physical iPhone recording |
| Predictive bar (QuickType) | **NOT TESTED** | Adds ~40px inset variance; multi-pass scroll (50/150ms) designed for this but unverified |
| Dictation keyboard | **NOT TESTED** | May change viewport height mid-session |
| Hardware keyboard (iPad / Magic Keyboard) | **NOT TESTED** | `keyboardInset` may be 0 while field focused — reset logic checks `isTextField(document.activeElement)` L282–285 |

---

## Screenshots & Videos

| Asset | Path | Notes |
|-------|------|-------|
| Conversation Coach idle (live cert) | `audit/screenshots/final-live-cert/conversation_coach.png` | Voice UI; no keyboard |
| Amy Coach search (live cert) | `audit/screenshots/final-live-cert/parent-amy-coach.png` | Search input visible |
| Auth gate (this audit) | `audit/chat-keyboard-audit/screenshots/capacitor-ios-iphone13-assistant-idle.png` | Sign-in page — chat routes require auth |
| iOS keyboard-open video | **MISSING** | Required by release gate |

---

## iOS Keyboard Score: **74 / 100**

**Band:** Noticeable issues — architecture is ChatGPT-grade on paper; zero real-device keyboard evidence blocks production sign-off.

**To reach 90+:** Complete `scripts/chat-platform-device-certification.json` with uncut iPhone recordings for onboarding + assistant + long history + orientation change; migrate Amy Coach search into ChatPlatform or auth keyboard shell.
