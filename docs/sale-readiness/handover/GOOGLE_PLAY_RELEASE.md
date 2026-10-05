# GOOGLE PLAY RELEASE

**Shipped Android app = `android/` WebView wrapper.**  
Do not implement Play features in `artifacts/amynest-capacitor/android/`.

## Behavior

- Loads `https://www.amynest.in` full-screen.
- UA `AmyNestAndroid/1.0` + `window.AmyNestAuthNative`.
- Bridges: `AuthBridge.kt` (Google Sign-In), `PushBridge`, `BillingBridge`.
- OAuth web client ID: `android/app/src/main/res/values/strings.xml` → `amynest_google_web_client_id`.

## Store

Package `com.amynest.app`. RevenueCat Play app `app7b7fc89f20`.  
Installs, ANRs, ratings: **UNVERIFIED this pass**.

## Release

Build the Gradle app in `android/`, upload AAB in Play Console. Signing keystore is **founder-only** — if it is lost, Play updates die.

See also `docs/android-internal-testing.md`.
