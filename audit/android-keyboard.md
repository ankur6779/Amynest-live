# Android Keyboard Audit — AmyNest Chat Surfaces

**Audit date:** 2026-06-12  
**Target:** Play Store Android WebView (`android/` + `artifacts/kidschedule-android/`)  
**Note:** User requested "Capacitor Android" — the shipped Play Store app is **not** Capacitor; it loads `https://www.amynest.in` in a WebView with native IME bridges. Capacitor Android tree is not production.  
**Method:** Static code review + unit tests + Playwright Pixel 5 UA + prior live screenshots  
**Real device IME (Gboard/Samsung):** **NOT CERTIFIED** — all 5 entries in `scripts/chat-platform-device-certification.json` are `pending`.

---

## Architecture Summary

| Layer | File | Finding |
|-------|------|---------|
| Manifest | `android/app/src/main/AndroidManifest.xml` L51 | `android:windowSoftInputMode="adjustResize"` |
| Native shell | `artifacts/kidschedule-android/.../MainActivity.kt` L113 | `setDecorFitsSystemWindows(false)` — neutralizes naive adjustResize |
| WebView shrink | MainActivity.kt L303–309 | `webView.setPadding(..., keyboardPx)` mirrors Chrome resize |
| Native bridge event | MainActivity.kt L313–330 | Dispatches `amynest-keyboard-inset` + sets `--auth-keyboard-inset-native` |
| Safe area injection | MainActivity.kt L247–264 | Sets `--sab` from navigation bar insets |
| Web guard | `use-keyboard-chat-layout.ts` L51–64 | `guardAndroidLayoutOwnership()` strips conflicting `--vv-height` |
| Viewport math | `lib/chat-platform/viewport.ts` L226–237 | Native inset OR visualViewport height — never double-count |
| Unit tests | `chat-platform-visibility.test.ts` L57–110 | adjustResize broken vs working WebView shrink paths |

**Design intent (correct for edge-to-edge Android):** Because `setDecorFitsSystemWindows(false)` prevents OS window resize, native code physically shrinks the WebView content box. ChatPlatform reads either the native inset or measured `visualViewport` and pins a fixed overlay when inset > 0.

---

## Checklist Results

### A. Keyboard Open

| Check | Status | Evidence |
|-------|--------|----------|
| Keyboard appears (Gboard) | **UNVERIFIED** | Device cert `samsung-gboard` status: pending |
| Keyboard appears (Samsung Keyboard) | **UNVERIFIED** | Device cert `samsung-samsung-keyboard` status: pending |
| Input remains visible | **CODE PASS / DEVICE PENDING** | Fixed overlay when `keyboardInset > 0` (`use-keyboard-chat-layout.ts` L507–520) |
| Send button visible | **CODE PASS / DEVICE PENDING** | Composer in `.chat-thread-input` with `z-index: 2` when keyboard open (`index.css` L1691–1695) |
| Typing indicator | **N/A** | Loader in send button only |

### B. Keyboard Close

| Check | Status | Evidence |
|-------|--------|----------|
| Layout restores | **CODE PASS** | Native JS clears `--auth-keyboard-inset-native` (MainActivity.kt L322–328) |
| No empty gap | **UNVERIFIED** | WebView padding reset when `keyboardPx == 0`; 320ms web reset delay may flash gap |
| No clipped footer | **UNVERIFIED** | Requires Samsung/Android 15 device video |

### C. Orientation

| Check | Status | Evidence |
|-------|--------|----------|
| Portrait | **UNVERIFIED** | `orientationchange` → deferred sync |
| Landscape | **UNVERIFIED** | No device recording |

### D. Safe Areas

| Check | Status | Evidence |
|-------|--------|----------|
| Gesture navigation bar | **CODE PASS** | `--sab` injected from `navigationBars()` inset, capped 72px (MainActivity.kt L251–253) |
| 3-button nav | **CODE PASS** | Same inset listener |
| Composer above gesture bar | **CODE PASS** | Composer padding uses `--sab` (`chat-platform.tsx` L330) |

---

## Android-Specific Issues Detected

### CRITICAL — Zero Android device keyboard certification

- **Evidence:** `scripts/chat-platform-device-certification.json` — Samsung/Xiaomi/Oppo/Vivo all `pending`, empty `videoUrl`  
- **Gate:** `pnpm run check:chat-platform-certification` fails release  
- **Impact:** Cannot verify Gboard vs Samsung Keyboard resize differences, Android 15 edge-to-edge regressions

### CRITICAL — adjustResize ineffective without native WebView padding (documented, mitigated in code)

- **File:** `MainActivity.kt` L270–288  
- **Issue:** Edge-to-edge shell means IME draws over content unless WebView padding applied  
- **Mitigation:** Native padding + `amynest-keyboard-inset` event  
- **Residual risk:** If native bridge fails silently, web falls back to visualViewport (`viewport.ts` L226–237) — **UNVERIFIED on real Samsung devices**

### HIGH — Amy Coach search `<input>` outside keyboard stack

- **Component:** `ai-coach.tsx` L1887, L1977, L2200  
- **Route:** `/amy-coach`  
- **Evidence:** `audit/screenshots/final-live-cert/parent-amy-coach.png`  
- **Repro:** Open Amy Coach → tap "Search all goals" → Gboard opens → search results likely hidden  
- **Root cause:** No `useKeyboardChatLayout`, no native inset listener on this page

### HIGH — Abacus tutor raw `<textarea>` outside ChatPlatform

- **Component:** `abacus-zone.tsx` L1240–1247  
- **Route:** `/abacus`  
- **Issue:** 3-row textarea + ask button in scrollable page shell — no fixed composer  
- **Expected failure mode:** Keyboard covers "Ask Amy" button on Android WebView

### HIGH — Conversation Coach `min-h-dvh` voice UI

- **Component:** `conversation-coach.tsx` L748–751  
- **Route:** `/speech-coach/talk`  
- **Evidence:** `audit/screenshots/final-live-cert/conversation_coach.png` — mic near bottom  
- **Issue:** No keyboard/inset handling; mic + End buttons may shift under IME if keyboard triggered

### MEDIUM — Double-count guard exists but untested on Samsung Android 15

- **Code:** `guardAndroidLayoutOwnership()` strips `--vv-height` when native inset present (`use-keyboard-chat-layout.ts` L51–64)  
- **Telemetry:** `android_keyboard_layout_conflicts` event  
- **Status:** Logic present; no production telemetry review in this audit

### MEDIUM — SplashScreen immersive mode interaction

- **Config:** `capacitor.config.json` L50–51 `splashFullScreen: true`, `splashImmersive: true`  
- **Note:** Applies to Capacitor iOS build; Android WebView uses separate MainActivity immersive UI  
- **Risk:** Immersive + edge-to-edge increases keyboard overlap sensitivity — mitigated by WebView padding

### LOW — `adjustPan` correctly absent

- **Search:** Zero `adjustPan` matches repo-wide  
- **Status:** PASS — pan mode would break ChatGPT-style bottom-anchored composer

---

## Gboard vs Samsung Keyboard

| Scenario | Gboard | Samsung Keyboard | Evidence |
|----------|--------|------------------|----------|
| Fresh install onboarding chat | PENDING | PENDING | device-cert JSON |
| Long chat history scroll | PENDING | PENDING | device-cert JSON |
| Text input focus/blur 50× | PENDING | PENDING | Not run |
| Predictive bar height changes | PENDING | PENDING | Multi-pass scroll designed (50/150/300/500/800ms) but unverified |
| Floating keyboard mode | PENDING | PENDING | Not in cert matrix |

---

## adjustResize / adjustPan / Fullscreen / Gesture Nav

| Setting | Value | Verified |
|---------|-------|----------|
| windowSoftInputMode | adjustResize | Manifest PASS |
| setDecorFitsSystemWindows | false | MainActivity.kt PASS |
| WebView bottom padding on IME | yes | Code PASS / device PENDING |
| adjustPan | not used | PASS |
| Gesture navigation `--sab` | injected | Code PASS |
| Fullscreen immersive | yes (MainActivity) | UNVERIFIED impact on keyboard |

---

## Listener Cleanup & Event Storms

| Listener | Registered | Cleaned up | File |
|----------|-------------|------------|------|
| `amynest-keyboard-inset` | yes | yes | `use-keyboard-chat-layout.ts` L352, L393 |
| `visualViewport` resize/scroll | yes | yes | L326–327, L389–390 |
| Capacitor keyboardDidShow/Hide | Android Capacitor only | yes | L366–395 |
| focusin/focusout on chat root | yes | yes | L455–484 |
| Self-healing timers | yes | `healRef.cancel()` | visibility.ts L304–307 |

**Event storm risk:** LOW in code — `scheduleSelfHealingVisibility` can fire 6+ passes when `forcePromptVisibilityMode` enabled; gated by remote config kill switch.

---

## Screenshots & Videos

| Asset | Path |
|-------|------|
| Amy Coach search UI | `audit/screenshots/final-live-cert/parent-amy-coach.png` |
| Conversation Coach | `audit/screenshots/final-live-cert/conversation_coach.png` |
| Auth blocked assistant | `audit/chat-keyboard-audit/screenshots/capacitor-android-pixel5-assistant-idle.png` |
| Android keyboard-open video | **MISSING** |

---

## Android Keyboard Score: **71 / 100**

**Band:** Noticeable issues — native WebView padding architecture is sound and unit-tested, but Gboard/Samsung/device-matrix certification is 0/5 complete and three major chat-adjacent surfaces bypass ChatPlatform entirely.

**To reach 90+:** Record uncut device videos per `scripts/chat-platform-device-certification.json`; wire Amy Coach search + Abacus tutor through ChatPlatform or dedicated keyboard shell; validate Android 15 Samsung edge-to-edge on physical hardware.
