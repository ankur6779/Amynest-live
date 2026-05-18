# ⚠️ ARCHIVED — amynest-mobile (Expo)

This Expo React Native app has been **archived** and is no longer actively maintained.

## Why archived?

The project has moved to a **single-codebase strategy**:

- The web app (`artifacts/kidschedule`) is now the source of truth for all UI and features.
- **Android** is served via the native WebView wrapper in `kidschedule-android/` (Gradle project).
- **iOS** is served via the Capacitor shell in `artifacts/amynest-capacitor/`.

This gives one codebase → two native apps, eliminating the overhead of keeping
a separate Expo codebase in sync with every web change.

## Status

- Code is preserved here as a reference.
- No new features will be added to this directory.
- **Removed from `pnpm-workspace.yaml`** — `pnpm install` / `build` / `typecheck` no longer touch Expo deps.
- Root `dev:mobile` prints an error pointing at PWA + Capacitor.
- Replit validation workflows for this folder are no-ops.
- If you need to restore: re-add `artifacts/amynest-mobile` to the workspace and reinstall.

## Migration reference

| Expo feature | Replacement |
|---|---|
| Push notifications | `@capacitor/push-notifications` (iOS) + FCM bridge (Android) |
| Camera / mic | Capacitor permissions via Info.plist |
| Navigation | Web app routing (wouter) inside WebView/WKWebView |
| Offline | PWA service worker in kidschedule |
| Payments | RevenueCat web SDK (iOS) + Razorpay web (Android) |

---

*Archived: May 2026*
